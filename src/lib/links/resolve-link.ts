import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { redirects } from "~/server/db/schema";

export type LinkRow = typeof redirects.$inferSelect;

export type ResolvedLink =
  | { status: "not_found" }
  | { status: "expired" }
  | { status: "limit_reached" }
  | { status: "password_required"; link: LinkRow }
  | { status: "ok"; link: LinkRow };

/**
 * Looks a link up by its short code and says why it can't be used, if it can't.
 * (Leave your existing getActiveLink alone if other code depends on it.)
 */
export async function resolveLink(slug: string): Promise<ResolvedLink> {
  const link = await db.query.redirects.findFirst({
    where: eq(redirects.code, slug),
  });

  // Inactive links look identical to missing ones, so owners can't be probed.
  if (!link?.isActive) return { status: "not_found" };

  // A stored value of 0 (1 Jan 1970) means "never expires" in this app; only a
  // real, past date counts as expired.
  const expiresMs = link.expiresAt?.getTime() ?? 0;
  if (expiresMs > 0 && expiresMs <= Date.now()) {
    return { status: "expired" };
  }

  if (link.maxUses !== null && link.viewCount >= link.maxUses) {
    return { status: "limit_reached" };
  }

  if (link.password) return { status: "password_required", link };

  return { status: "ok", link };
}
