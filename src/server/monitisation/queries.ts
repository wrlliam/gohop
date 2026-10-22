import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "~/server/db";
import {
  ledgerEntry,
  payout,
  payoutAccount,
  platformSettings,
  redirects,
  revenuePeriod,
  view,
} from "~/server/db/schema";

/** Fee/hold/minimum settings. Creates the row with defaults on first use. */
export async function getSettings() {
  const existing = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.id, 1),
  });
  if (existing) return existing;

  await db.insert(platformSettings).values({ id: 1 }).onConflictDoNothing();
  const created = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.id, 1),
  });
  return created!;
}

export async function getBalances(userId: string) {
  const nowSec = Math.floor(Date.now() / 1000);

  const [row] = await db
    .select({
      available: sql<number>`coalesce(sum(case when ${ledgerEntry.availableAt} <= ${nowSec} then ${ledgerEntry.amountMinor} else 0 end), 0)`,
      pending: sql<number>`coalesce(sum(case when ${ledgerEntry.availableAt} > ${nowSec} then ${ledgerEntry.amountMinor} else 0 end), 0)`,
      lifetime: sql<number>`coalesce(sum(case when ${ledgerEntry.type} = 'earning' then ${ledgerEntry.amountMinor} else 0 end), 0)`,
    })
    .from(ledgerEntry)
    .where(eq(ledgerEntry.userId, userId));

  return {
    available: Number(row?.available ?? 0),
    pending: Number(row?.pending ?? 0),
    lifetime: Number(row?.lifetime ?? 0),
  };
}

/**
 * Rough estimate for the open (not yet finalised) period, using the previous
 * period's revenue per billable view. Clearly an estimate: real revenue varies.
 */
export async function getEstimate(userId: string, feeBps: number) {
  const last = await db.query.revenuePeriod.findFirst({
    orderBy: desc(revenuePeriod.endsAt),
  });
  if (!last || last.totalBillableViews === 0) return null;

  const [row] = await db
    .select({ n: count() })
    .from(view)
    .innerJoin(redirects, eq(view.linkId, redirects.id))
    .where(
      and(
        eq(redirects.createdById, userId),
        eq(view.isBillable, true),
        gte(view.createdAt, last.endsAt),
      ),
    );

  const perView = last.grossRevenueMinor / last.totalBillableViews;
  const gross = Math.floor((row?.n ?? 0) * perView);
  const fee = Math.floor((gross * feeBps) / 10_000);
  return { minor: gross - fee, views: row?.n ?? 0 };
}

/** Every link the user owns with what it has earned them, best first. */
export async function getLinkEarnings(userId: string) {
  const earned = sql<number>`coalesce(sum(${ledgerEntry.amountMinor}), 0)`;

  const rows = await db
    .select({
      id: redirects.id,
      code: redirects.code,
      name: redirects.name,
      isActive: redirects.isActive,
      monetisationEnabled: redirects.monetisationEnabled,
      billableViews: redirects.billableViewCount,
      earnedMinor: earned,
    })
    .from(redirects)
    .leftJoin(
      ledgerEntry,
      and(
        eq(ledgerEntry.linkId, redirects.id),
        eq(ledgerEntry.type, "earning"),
      ),
    )
    .where(eq(redirects.createdById, userId))
    .groupBy(redirects.id)
    .orderBy(desc(earned), desc(redirects.billableViewCount));

  return rows.map((r) => ({ ...r, earnedMinor: Number(r.earnedMinor) }));
}

export async function getPayouts(userId: string, limit = 10) {
  return db
    .select()
    .from(payout)
    .where(eq(payout.userId, userId))
    .orderBy(desc(payout.createdAt))
    .limit(limit);
}

export async function getPayoutAccount(userId: string) {
  return db.query.payoutAccount.findFirst({
    where: eq(payoutAccount.userId, userId),
  });
}
