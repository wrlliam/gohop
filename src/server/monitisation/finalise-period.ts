import { and, count, eq, gt, gte, lt } from "drizzle-orm";
import { db } from "~/server/db";
import {
  ledgerEntry,
  redirects,
  revenuePeriod,
  view,
} from "~/server/db/schema";
import { getSettings } from "~/server/monitisation/queries";

type Input = {
  startsAt: Date;
  endsAt: Date;
  /** What Google actually reported for this window, in minor units. */
  grossRevenueMinor: number;
};

/**
 * Closes a revenue period: splits the real revenue between links in proportion
 * to their billable views, takes the platform fee, and writes ledger rows that
 * unlock after the hold period. Run it once per period, after you can see the
 * final figure in your AdSense reports.
 */
export async function finalisePeriod({
  startsAt,
  endsAt,
  grossRevenueMinor,
}: Input) {
  if (!(endsAt > startsAt)) throw new Error("endsAt must be after startsAt");
  if (!Number.isInteger(grossRevenueMinor) || grossRevenueMinor < 0) {
    throw new Error("grossRevenueMinor must be a non-negative integer");
  }

  const settings = await getSettings();

  const overlap = await db.query.revenuePeriod.findFirst({
    where: and(
      lt(revenuePeriod.startsAt, endsAt),
      gt(revenuePeriod.endsAt, startsAt),
    ),
  });
  if (overlap) throw new Error(`Overlaps existing period #${overlap.id}`);

  // Billable views per link. Views on links with monetisation switched off were
  // never marked billable, so they are excluded automatically.
  const rows = await db
    .select({
      linkId: view.linkId,
      userId: redirects.createdById,
      n: count(),
    })
    .from(view)
    .innerJoin(redirects, eq(view.linkId, redirects.id))
    .where(
      and(
        eq(view.isBillable, true),
        gte(view.createdAt, startsAt),
        lt(view.createdAt, endsAt),
      ),
    )
    .groupBy(view.linkId, redirects.createdById);

  const totalViews = rows.reduce((sum, r) => sum + r.n, 0);
  const availableAt = new Date(Date.now() + settings.holdDays * 86_400_000);

  return db.transaction(async (tx) => {
    const [period] = await tx
      .insert(revenuePeriod)
      .values({
        startsAt,
        endsAt,
        grossRevenueMinor,
        totalBillableViews: totalViews,
        feeBps: settings.platformFeeBps,
      })
      .returning({ id: revenuePeriod.id });

    const entries =
      totalViews === 0
        ? []
        : rows
            .map((r) => {
              // BigInt avoids overflow on revenue * views.
              const gross = Number(
                (BigInt(grossRevenueMinor) * BigInt(r.n)) / BigInt(totalViews),
              );
              const fee = Math.floor(
                (gross * settings.platformFeeBps) / 10_000,
              );
              return {
                userId: r.userId,
                linkId: r.linkId,
                periodId: period!.id,
                type: "earning" as const,
                amountMinor: gross - fee,
                grossMinor: gross,
                feeMinor: fee,
                feeBps: settings.platformFeeBps,
                billableViews: r.n,
                availableAt,
              };
            })
            .filter((e) => e.grossMinor > 0);

    for (let i = 0; i < entries.length; i += 100) {
      await tx.insert(ledgerEntry).values(entries.slice(i, i + 100));
    }

    const distributed = entries.reduce((s, e) => s + e.amountMinor, 0);
    const platformKeeps = grossRevenueMinor - distributed;

    return {
      periodId: period!.id,
      creators: new Set(entries.map((e) => e.userId)).size,
      links: entries.length,
      totalBillableViews: totalViews,
      distributedToCreatorsMinor: distributed,
      platformKeepsMinor: platformKeeps, // fees + rounding remainder
    };
  });
}
