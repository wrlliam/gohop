import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { confirmImpression } from "~/lib/links/confirm-impression";

const bodySchema = z.object({
  viewId: z.number().int().positive(),
  token: z.string().min(32).max(128),
});

/**
 * Called by RedirectSlug once an ad has been on screen for a moment.
 * Must be public (see the middleware exemption): visitors aren't logged in.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const outcome = await confirmImpression(
    req,
    parsed.data.viewId,
    parsed.data.token,
  );
  if (outcome === "invalid") {
    return NextResponse.json({ error: "Invalid impression" }, { status: 400 });
  }

  // Don't tell clients whether a view counted: that would help anyone probing
  // the limits. The outcome is only exposed outside production, for testing.
  return NextResponse.json(
    process.env.NODE_ENV === "production"
      ? { ok: true }
      : { ok: true, outcome },
  );
}
