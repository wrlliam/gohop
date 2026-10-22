import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

import { db } from "~/server/db";
import { redirects, view } from "~/server/db/schema";
import { DAY_MS, getWindow, type RangeKey } from "~/lib/analytics";

/**
 * All time bucketing is done in UTC. Timestamps are stored as unix seconds
 * (Drizzle `integer({ mode: "timestamp" })`), hence the 'unixepoch' modifier.
 */

// Booleans are stored as 0/1, so SUM() counts the true rows.
const flagSum = (col: SQLiteColumn) =>
  sql<number>`coalesce(sum(${col}), 0)`.mapWith(Number);

const dayBucket = sql<string>`strftime('%Y-%m-%d', ${view.createdAt}, 'unixepoch')`;
const hourBucket = sql<string>`strftime('%H', ${view.createdAt}, 'unixepoch')`;

/* -------------------------------------------------------------------------- */
/* Scopes: which rows of `link_view` a query looks at                          */
/* -------------------------------------------------------------------------- */

/** Every view on any link owned by this user. */
export const userScope = (userId: string): SQL =>
  inArray(
    view.linkId,
    db
      .select({ id: redirects.id })
      .from(redirects)
      .where(eq(redirects.createdById, userId)),
  );

/** Views on a single link. */
export const linkScope = (linkId: number): SQL => eq(view.linkId, linkId);

/* -------------------------------------------------------------------------- */
/* Links                                                                       */
/* -------------------------------------------------------------------------- */

/** Fetch a link by code, but only if the user owns it. */
export async function getOwnedLink(userId: string, code: string) {
  const [link] = await db
    .select()
    .from(redirects)
    .where(and(eq(redirects.code, code), eq(redirects.createdById, userId)))
    .limit(1);
  return link ?? null;
}

/** One row per link with stats for the selected range (zero-filled). */
export async function getLinkRows(userId: string, range: RangeKey) {
  const { from, to } = getWindow(range);
  return db
    .select({
      id: redirects.id,
      code: redirects.code,
      name: redirects.name,
      redirectedLink: redirects.redirectedLink,
      isActive: redirects.isActive,
      expiresAt: redirects.expiresAt,
      lastViewedAt: redirects.lastViewedAt,
      allTimeViews: redirects.viewCount,
      views: count(view.id),
      unique: countDistinct(view.visitorHash),
      billable: flagSum(view.isBillable),
      bots: flagSum(view.isBot),
    })
    .from(redirects)
    .leftJoin(
      view,
      and(
        eq(view.linkId, redirects.id),
        gte(view.createdAt, from),
        lt(view.createdAt, to),
      ),
    )
    .where(eq(redirects.createdById, userId))
    .groupBy(redirects.id)
    .orderBy(desc(count(view.id)), desc(redirects.createdAt));
}

/** Daily view counts per link, for the sparklines in the links table. */
export async function getSparklines(userId: string, range: RangeKey) {
  const { from, to, days } = getWindow(range);
  const rows = await db
    .select({ linkId: view.linkId, date: dayBucket, views: count() })
    .from(view)
    .where(
      and(userScope(userId), gte(view.createdAt, from), lt(view.createdAt, to)),
    )
    .groupBy(view.linkId, dayBucket);

  const out = new Map<number, number[]>();
  for (const row of rows) {
    const series = out.get(row.linkId) ?? new Array<number>(days).fill(0);
    const idx = Math.round(
      (Date.parse(`${row.date}T00:00:00Z`) - from.getTime()) / DAY_MS,
    );
    if (idx >= 0 && idx < days) series[idx] = row.views;
    out.set(row.linkId, series);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Totals + deltas                                                             */
/* -------------------------------------------------------------------------- */

export type Totals = {
  views: number;
  unique: number;
  billable: number;
  bots: number;
};

async function totalsBetween(
  scope: SQL,
  from: Date,
  to: Date,
): Promise<Totals> {
  const [row] = await db
    .select({
      views: count(),
      unique: countDistinct(view.visitorHash),
      billable: flagSum(view.isBillable),
      bots: flagSum(view.isBot),
    })
    .from(view)
    .where(and(scope, gte(view.createdAt, from), lt(view.createdAt, to)));
  return row ?? { views: 0, unique: 0, billable: 0, bots: 0 };
}

/** Current range and the equally long range before it. */
export async function getSummary(scope: SQL, range: RangeKey) {
  const w = getWindow(range);
  const [current, previous] = await Promise.all([
    totalsBetween(scope, w.from, w.to),
    totalsBetween(scope, w.prevFrom, w.from),
  ]);
  return { current, previous };
}

/* -------------------------------------------------------------------------- */
/* Time series                                                                 */
/* -------------------------------------------------------------------------- */

export type TimeseriesPoint = {
  date: string; // YYYY-MM-DD (UTC)
  views: number;
  unique: number;
  billable: number;
};

/** Daily series with every day in the range present, even if it had no hits. */
export async function getTimeseries(
  scope: SQL,
  range: RangeKey,
): Promise<TimeseriesPoint[]> {
  const { from, to, days } = getWindow(range);
  const rows = await db
    .select({
      date: dayBucket,
      views: count(),
      unique: countDistinct(view.visitorHash),
      billable: flagSum(view.isBillable),
    })
    .from(view)
    .where(and(scope, gte(view.createdAt, from), lt(view.createdAt, to)))
    .groupBy(dayBucket)
    .orderBy(dayBucket);

  const byDate = new Map(rows.map((r) => [r.date, r]));
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(from.getTime() + i * DAY_MS)
      .toISOString()
      .slice(0, 10);
    const r = byDate.get(date);
    return {
      date,
      views: r?.views ?? 0,
      unique: r?.unique ?? 0,
      billable: r?.billable ?? 0,
    };
  });
}

/** Views per hour of day (UTC), index 0-23. */
export async function getHourly(scope: SQL, range: RangeKey) {
  const { from, to } = getWindow(range);
  const rows = await db
    .select({ hour: hourBucket, views: count() })
    .from(view)
    .where(
      and(
        scope,
        eq(view.isBot, false),
        gte(view.createdAt, from),
        lt(view.createdAt, to),
      ),
    )
    .groupBy(hourBucket);

  const counts = new Array<number>(24).fill(0);
  for (const r of rows) counts[Number(r.hour)] = r.views;
  return counts;
}

/* -------------------------------------------------------------------------- */
/* Breakdowns                                                                  */
/* -------------------------------------------------------------------------- */

const dimensions = {
  country: view.country,
  city: view.city,
  referrerDomain: view.referrerDomain,
  utmSource: view.utmSource,
  utmCampaign: view.utmCampaign,
  browser: view.browser,
  os: view.os,
  deviceType: view.deviceType,
} as const;

export type Dimension = keyof typeof dimensions;

export type BreakdownRow = { label: string; views: number };

/**
 * Top values of one dimension. Bots are excluded by default so the numbers
 * describe real people; pass `includeBots` for the device split.
 */
export async function getBreakdown(
  scope: SQL,
  range: RangeKey,
  dimension: Dimension,
  opts: {
    limit?: number;
    includeBots?: boolean;
    fallback?: string;
    format?: (raw: string) => string;
  } = {},
): Promise<BreakdownRow[]> {
  const { limit = 6, includeBots = false, fallback = "Unknown", format } = opts;
  const { from, to } = getWindow(range);
  // nullif folds empty strings into NULL so they share one "unknown" bucket
  const label = sql<string | null>`nullif(${dimensions[dimension]}, '')`;

  const rows = await db
    .select({ label, views: count() })
    .from(view)
    .where(
      and(
        scope,
        includeBots ? undefined : eq(view.isBot, false),
        gte(view.createdAt, from),
        lt(view.createdAt, to),
      ),
    )
    .groupBy(label)
    .orderBy(desc(count()))
    .limit(limit);

  return rows.map((r) => ({
    label: r.label ? (format ? format(r.label) : r.label) : fallback,
    views: r.views,
  }));
}

/* -------------------------------------------------------------------------- */
/* Recent activity                                                             */
/* -------------------------------------------------------------------------- */

export async function getRecentViews(linkId: number, limit = 15) {
  return db
    .select({
      id: view.id,
      createdAt: view.createdAt,
      country: view.country,
      city: view.city,
      referrerDomain: view.referrerDomain,
      browser: view.browser,
      os: view.os,
      deviceType: view.deviceType,
      isUnique: view.isUnique,
      isBot: view.isBot,
      isBillable: view.isBillable,
    })
    .from(view)
    .where(eq(view.linkId, linkId))
    .orderBy(desc(view.createdAt), desc(view.id))
    .limit(limit);
}
