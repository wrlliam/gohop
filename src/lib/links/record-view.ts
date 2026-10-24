import type { NextRequest } from "next/server";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { redirects, view } from "~/server/db/schema";
import type { LinkRow } from "~/lib/links/resolve-link";
import {
  getClientIp,
  hashIp,
  hashVisitor,
  signImpression,
} from "~/lib/links/finger-print";

// Re-exported so existing imports keep working.
export { getClientIp };

export type RecordedView = {
  viewId: number;
  /** Null when this view can never become billable (bot, or monetisation off). */
  impressionToken: string | null;
};

/**
 * Records a view and bumps the view/unique counters in one atomic step.
 * Returns null (and records nothing) if the link is no longer usable:
 * inactive, expired, or at its max uses.
 *
 * Views are NEVER billable here. A view only becomes billable later, when the
 * visitor's browser confirms an ad was actually shown (see confirm-impression.ts).
 */
export async function recordView(
  req: NextRequest,
  link: LinkRow,
  viewerId: string | null,
): Promise<RecordedView | null> {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "";
  const referrer = req.headers.get("referer") ?? null;

  let referrerDomain: string | null = null;
  if (referrer) {
    try {
      referrerDomain = new URL(referrer).hostname;
    } catch {
      referrerDomain = null;
    }
  }

  const params = req.nextUrl.searchParams;
  const visitorHash = hashVisitor(ip, userAgent);
  const ipHash = hashIp(ip);

  const isBot = /bot|crawler|spider|crawling|lighthouse|pingdom/i.test(
    userAgent,
  );
  const deviceType = isBot
    ? "bot"
    : /mobile/i.test(userAgent)
      ? "mobile"
      : /tablet/i.test(userAgent)
        ? "tablet"
        : "desktop";

  const existingView = await db.query.view.findFirst({
    where: (v) => and(eq(v.linkId, link.id), eq(v.visitorHash, visitorHash)),
  });
  const isUnique = !existingView;

  return db.transaction(async (tx) => {
    const updated = await tx
      .update(redirects)
      .set({
        viewCount: sql`${redirects.viewCount} + 1`,
        uniqueViewCount: isUnique
          ? sql`${redirects.uniqueViewCount} + 1`
          : redirects.uniqueViewCount,
        lastViewedAt: new Date(),
      })
      .where(
        and(
          eq(redirects.id, link.id),
          eq(redirects.isActive, true),
          or(
            isNull(redirects.maxUses),
            lt(redirects.viewCount, redirects.maxUses),
          ),
          or(
            isNull(redirects.expiresAt),
            eq(redirects.expiresAt, new Date(0)), // 0 = never expires
            gt(redirects.expiresAt, new Date()),
          ),
        ),
      )
      .returning({ id: redirects.id });

    if (updated.length === 0) return null;

    const [row] = await tx
      .insert(view)
      .values({
        linkId: link.id,
        viewerId,
        visitorHash,
        ipHash,
        referrer,
        referrerDomain,
        utmSource: params.get("utm_source"),
        utmMedium: params.get("utm_medium"),
        utmCampaign: params.get("utm_campaign"),
        userAgent,
        deviceType,
        isUnique,
        isBot,
        isBillable: false,
      })
      .returning({ id: view.id });

    const canEarn = link.monetisationEnabled && !isBot;
    return {
      viewId: row!.id,
      impressionToken: canEarn ? signImpression(row!.id, visitorHash) : null,
    };
  });
}
