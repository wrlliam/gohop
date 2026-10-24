import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// - link lookup: anyone with a shared link must be able to use it
// - finalise-period: authenticates itself with ADMIN_API_SECRET
const PUBLIC_PREFIXES = [
  "/api/links/redirect/",
  "/api/admin/finalise-period",
  "/api/links/impression",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasSession = getSessionCookie(request);
  if (hasSession) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    "/app/:path*",
    "/api/links/:path*",
    "/api/analytics/:path*",
    "/api/monetization/:path*",
    "/api/admin/:path*",
  ],
};
