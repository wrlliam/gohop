import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import { and, count, eq, gte, isNull, or, sql } from "drizzle-orm";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { redirects, view } from "~/server/db/schema";
import {
  getClientIp,
  hashVisitor,
  verifyImpression,
} from "~/lib/links/finger-print";

// --- Tune these ------------------------------------------------------------
const MIN_AGE_MS = 1_000; // confirmation can't arrive faster than a real page could show an ad
const MAX_AGE_MS = 10 * 60_000; // ...or long after the lookup
const PER_IP_PER_LINK_PER_DAY = 1; // billable views from one IP on one link, per 24h
const PER_IP_PER_DAY = 10; // billable views from one IP across all links, per 24h
const OWNER_IP_WINDOW_MS = 30 * 86_400_000; // owner's signed-in IPs are remembered this long
const DAY_MS = 86_400_000;
// ---------------------------------------------------------------------------

export type ImpressionOutcome = "billable" | "not_billable" | "invalid";

/**
 * Called when the visitor's browser says an ad was shown. Decides, once and
 * only once per view, whether the view counts towards earnings.
 */
export async function confirmImpression(
  req: NextRequest,
  viewId: number,
  token: string,
): Promise<ImpressionOutcome> {
  const [row] = await db
    .select({
      id: view.id,
      linkId: view.linkId,
      viewerId: view.viewerId,
      visitorHash: view.visitorHash,
      ipHash: view.ipHash,
      isBot: view.isBot,
      isBillable: view.isBillable,
      createdAt: view.createdAt,
      impressionAt: view.impressionAt,
      ownerId: redirects.createdById,
      monetised: redirects.monetisationEnabled,
    })
    .from(view)
    .innerJoin(redirects, eq(view.linkId, redirects.id))
    .where(eq(view.id, viewId))
    .limit(1);

  if (!row) return "invalid";
  if (!verifyImpression(row.id, row.visitorHash, token)) return "invalid";

  // Already decided: repeat beacons can't change the result.
  if (row.impressionAt) return row.isBillable ? "billable" : "not_billable";

  // Must come from the same browser/network that did the lookup.
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "";
  if (hashVisitor(ip, userAgent) !== row.visitorHash) return "invalid";

  const age = Date.now() - row.createdAt.getTime();
  if (age < MIN_AGE_MS || age > MAX_AGE_MS) return "invalid";

  // --- Eligibility ---------------------------------------------------------
  let eligible = !row.isBot && row.monetised && !!row.ipHash;

  // Owner viewing their own link: signed in now, signed in at lookup, or seen
  // signed in from this device or IP recently.
  if (eligible) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (row.viewerId === row.ownerId || session?.user?.id === row.ownerId) {
      eligible = false;
    }
  }
  if (eligible) {
    const ownerSince = new Date(Date.now() - OWNER_IP_WINDOW_MS);
    const ownerSeen = await db.query.view.findFirst({
      where: and(
        eq(view.viewerId, row.ownerId),
        gte(view.createdAt, ownerSince),
        or(eq(view.visitorHash, row.visitorHash), eq(view.ipHash, row.ipHash!)),
      ),
    });
    if (ownerSeen) eligible = false;
  }

  // --- Decide + record atomically -------------------------------------------
  const since = new Date(Date.now() - DAY_MS);

  const billable = await db.transaction(async (tx) => {
    let ok = eligible;

    if (ok) {
      const base = and(
        eq(view.ipHash, row.ipHash!),
        eq(view.isBillable, true),
        gte(view.createdAt, since),
      );
      const [perLink] = await tx
        .select({ n: count() })
        .from(view)
        .where(and(base, eq(view.linkId, row.linkId)));
      const [perIp] = await tx.select({ n: count() }).from(view).where(base);

      if (
        (perLink?.n ?? 0) >= PER_IP_PER_LINK_PER_DAY ||
        (perIp?.n ?? 0) >= PER_IP_PER_DAY
      ) {
        ok = false;
      }
    }

    // Only the first confirmation wins.
    const claimed = await tx
      .update(view)
      .set({ impressionAt: new Date(), isBillable: ok })
      .where(and(eq(view.id, row.id), isNull(view.impressionAt)))
      .returning({ id: view.id });
    if (claimed.length === 0) return null;

    if (ok) {
      await tx
        .update(redirects)
        .set({ billableViewCount: sql`${redirects.billableViewCount} + 1` })
        .where(eq(redirects.id, row.linkId));
    }
    return ok;
  });

  return billable ? "billable" : "not_billable";
}
