import { sql } from "drizzle-orm";
import "server-only";
import { db } from "~/server/db";
import { redirects } from "~/server/db/schema";

export async function getActiveLink(slug: string) {
  const link = await db
    .select()
    .from(redirects)
    .where(sql`${redirects.code} = ${slug}`);
  if (!link || link.length === 0 || !link[0]?.isActive) return null;
  return link[0];
}
