import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { finalisePeriod } from "~/server/monitisation/finalise-period";

const bodySchema = z.object({
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  grossRevenueMinor: z.number().int().min(0),
});

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * curl -X POST https://your.app/api/admin/finalise-period \
 *   -H "Authorization: Bearer $ADMIN_API_SECRET" -H "Content-Type: application/json" \
 *   -d '{"startsAt":"2026-10-01T00:00:00Z","endsAt":"2026-11-01T00:00:00Z","grossRevenueMinor":123456}'
 *
 * Keep this out of your public middleware allow-list changes; the secret is the only gate.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_API_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const result = await finalisePeriod(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
