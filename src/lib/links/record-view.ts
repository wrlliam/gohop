import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { redirects, view } from "~/server/db/schema";
import type { LinkRow } from "~/lib/links/resolve-link";

function getVisitorHash(ip: string, userAgent: string): string {
  const salt = process.env.VISITOR_HASH_SALT;
  if (!salt) throw new Error("VISITOR_HASH_SALT is not set");
  return crypto
    .createHash("sha256")
    .update(ip + userAgent + salt)
    .digest("hex");
}

export function getClientIp(req: NextRequest): string {
  // Only trust x-forwarded-for if your reverse proxy overwrites it.
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1"
  );
}

/**
 * Records a view and bumps the counters in one atomic step.
 * Returns false (and records nothing) if the link is no longer usable:
 * inactive, expired, or at its max uses. The limit check lives in the UPDATE's
 * WHERE clause, so concurrent requests can't slip past maxUses.
 */
export async function recordView(
  req: NextRequest,
  link: LinkRow,
  viewerId: string | null,
): Promise<boolean> {
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
  const visitorHash = getVisitorHash(ip, userAgent);

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
  const isBillable =
    !isBot &&
    isUnique &&
    link.monetisationEnabled &&
    viewerId !== link.createdById;

  return db.transaction(async (tx) => {
    const updated = await tx
      .update(redirects)
      .set({
        viewCount: sql`${redirects.viewCount} + 1`,
        uniqueViewCount: isUnique
          ? sql`${redirects.uniqueViewCount} + 1`
          : redirects.uniqueViewCount,
        billableViewCount: isBillable
          ? sql`${redirects.billableViewCount} + 1`
          : redirects.billableViewCount,
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
          or(isNull(redirects.expiresAt), gt(redirects.expiresAt, new Date())),
        ),
      )
      .returning({ id: redirects.id });

    if (updated.length === 0) return false;

    await tx.insert(view).values({
      linkId: link.id,
      viewerId,
      visitorHash,
      referrer,
      referrerDomain,
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
      userAgent,
      deviceType,
      isUnique,
      isBot,
      isBillable,
    });

    return true;
  });
}
