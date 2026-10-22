"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { redirects } from "~/server/db/schema";
import { hashPassword } from "~/lib/links/password";

const isHttpUrl = (value: string) => {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

const updateLinkSchema = z.object({
  name: z
    .string()
    .trim()
    .max(256, "Keep the name under 256 characters")
    .transform((v) => (v === "" ? null : v)),
  redirectedLink: z
    .string()
    .trim()
    .min(1, "Destination URL is required")
    .max(2048, "URL is too long")
    .refine(isHttpUrl, "Enter a valid http(s) URL"),
  isActive: z.boolean(),
  // null = unlimited
  maxUses: z
    .number()
    .int("Must be a whole number")
    .min(1, "Must be at least 1")
    .max(1_000_000_000, "That's a lot of views")
    .nullable(),
  password: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("keep") }),
    z.object({ mode: z.literal("remove") }),
    z.object({
      mode: z.literal("set"),
      value: z
        .string()
        .min(1, "Enter a password")
        .max(256, "Password is too long"),
    }),
  ]),
});

export type UpdateLinkInput = z.input<typeof updateLinkSchema>;

export type UpdateLinkResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function updateLink(
  code: string,
  input: unknown,
): Promise<UpdateLinkResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "You need to be signed in." };

  const parsed = updateLinkSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Some fields need fixing.", fieldErrors };
  }

  const { name, redirectedLink, isActive, maxUses, password } = parsed.data;

  // TODO: run the same destination checks as your create-link route here
  // (profanity, other shorteners/redirect sites, your own domain).

  const values: Partial<typeof redirects.$inferInsert> = {
    name,
    redirectedLink,
    isActive,
    maxUses,
  };

  if (password.mode === "set")
    values.password = await hashPassword(password.value);
  if (password.mode === "remove") values.password = null;

  // Ownership is part of the WHERE clause, so other users' links can't be touched.
  const updated = await db
    .update(redirects)
    .set(values)
    .where(
      and(eq(redirects.code, code), eq(redirects.createdById, session.user.id)),
    )
    .returning({ id: redirects.id });

  if (updated.length === 0) return { ok: false, error: "Link not found." };

  revalidatePath(`/app/analytics/${code}`);
  revalidatePath("/app");

  return { ok: true };
}
