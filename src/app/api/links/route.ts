import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "~/server/better-auth";
import { createLinkSchema } from "~/lib/schemas/link";
import { createId } from "~/lib/utils";
import { db } from "~/server/db";
import { redirects } from "~/server/db/schema";
import { sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = createLinkSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Invalid input", field: issue?.path[0] },
      { status: 400 },
    );
  }

  const { url, slug, name, expiresAt, isActive, maxViews, password } =
    parsed.data;

  let finalSlug = slug || createId(8);

  finalSlug = finalSlug.split("/").join("-")

  const existingSlug = await db
    .select()
    .from(redirects)
    .where(sql`${redirects.code} = ${finalSlug}`);

  if (existingSlug && existingSlug.length > 0) {
    return NextResponse.json(
      {
        error: "Slug is already in use.",
        field: "slug",
      },
      {
        status: 409,
      },
    );
  }
  //@ts-ignore -> doesnt like new date for timestamp but its valid.
  await db.insert(redirects).values({
    code: finalSlug,
    redirectedLink: url,
    name: name,
    maxUses: maxViews,
    password: password,
    isActive,
    expiresAt: expiresAt ? new Date(expiresAt as number) : null,
    createdById: session.user.id,
  });

  return NextResponse.json(
    { slug: finalSlug, shortUrl: `${request.nextUrl.origin}/~/${finalSlug}` },
    { status: 201 },
  );
}
