import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "~/server/better-auth";
import { checkDestination } from "~/lib/links/check-destination";
import { resolveLink, type LinkRow } from "~/lib/links/resolve-link";
import { recordView, getClientIp } from "~/lib/links/record-view";
import { verifyPassword } from "~/lib/links/password";

type Ctx = { params: Promise<{ slug: string }> };

// --- Very small in-memory rate limiter for password guesses -----------------
// Per-process only. Swap for Redis or similar if you run multiple instances.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) return false;
  return entry.count >= MAX_ATTEMPTS;
}

function registerFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

// --- Helpers ----------------------------------------------------------------
function unavailable(status: "not_found" | "expired" | "limit_reached") {
  return NextResponse.json(
    { status },
    { status: status === "not_found" ? 404 : 410 },
  );
}

/** Checks the destination, then (if it's fine) records the view atomically. */
async function serve(req: NextRequest, slug: string, link: LinkRow) {
  const result = await checkDestination(link.redirectedLink);

  // Flagged destinations show the warning screen. The view is only counted
  // (and made billable) when the visitor is actually sent on.
  if (!result.ok) {
    return NextResponse.json({
      status: "ok",
      monetised: link.monetisationEnabled,
      url: link.redirectedLink,
      ...result,
    });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const recorded = await recordView(req, link, session?.user?.id ?? null);

  if (!recorded) {
    // Lost a race (limit hit or expired between resolve and update).
    const again = await resolveLink(slug);
    if (again.status === "expired" || again.status === "limit_reached") {
      return unavailable(again.status);
    }
    return unavailable("not_found");
  }

  return NextResponse.json({
    status: "ok",
    monetised: link.monetisationEnabled,
    url: link.redirectedLink,
    ...result,
  });
}

// --- GET: resolve a link without a password ----------------------------------
export async function GET(req: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const resolved = await resolveLink(slug);

  if (
    resolved.status === "not_found" ||
    resolved.status === "expired" ||
    resolved.status === "limit_reached"
  ) {
    return unavailable(resolved.status);
  }

  // Never reveal the destination, and never count a view, before the password.
  if (resolved.status === "password_required") {
    return NextResponse.json({
      status: "password_required",
      monetised: resolved.link.monetisationEnabled,
    });
  }

  return serve(req, slug, resolved.link);
}

// --- POST: resolve a password-protected link --------------------------------
export async function POST(req: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const resolved = await resolveLink(slug);

  if (
    resolved.status === "not_found" ||
    resolved.status === "expired" ||
    resolved.status === "limit_reached"
  ) {
    return unavailable(resolved.status);
  }

  // Link has no password: behave like GET.
  if (resolved.status === "ok") {
    return serve(req, slug, resolved.link);
  }

  const rateKey = `${getClientIp(req)}:${slug}`;
  if (isRateLimited(rateKey)) {
    return NextResponse.json({ status: "rate_limited" }, { status: 429 });
  }

  let password = "";
  try {
    const body = (await req.json()) as { password?: unknown };
    if (typeof body.password === "string") password = body.password;
  } catch {
    // fall through with empty password
  }

  const valid =
    password.length > 0 &&
    password.length <= 256 &&
    (await verifyPassword(password, resolved.link.password!));

  if (!valid) {
    registerFailure(rateKey);
    return NextResponse.json({ status: "wrong_password" }, { status: 401 });
  }

  attempts.delete(rateKey);
  return serve(req, slug, resolved.link);
}
