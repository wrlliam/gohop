import crypto from "node:crypto";
import type { NextRequest } from "next/server";

function getSalt(): string {
  const salt = process.env.VISITOR_HASH_SALT;
  if (!salt) throw new Error("VISITOR_HASH_SALT is not set");
  return salt;
}

export function getClientIp(req: NextRequest): string {
  // Only trust x-forwarded-for if your reverse proxy overwrites it.
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1"
  );
}

/** IP + user agent. Same formula as before, so existing hashes stay valid. */
export function hashVisitor(ip: string, userAgent: string): string {
  return crypto
    .createHash("sha256")
    .update(ip + userAgent + getSalt())
    .digest("hex");
}

/** IP alone, so rotating the user agent doesn't dodge per-IP limits. */
export function hashIp(ip: string): string {
  return crypto
    .createHmac("sha256", getSalt())
    .update(`ip:${ip}`)
    .digest("hex");
}

/** Proves the browser received this view from our lookup, not a forged one. */
export function signImpression(viewId: number, visitorHash: string): string {
  return crypto
    .createHmac("sha256", getSalt())
    .update(`impression:${viewId}:${visitorHash}`)
    .digest("hex");
}

export function verifyImpression(
  viewId: number,
  visitorHash: string,
  token: string,
): boolean {
  const expected = Buffer.from(signImpression(viewId, visitorHash));
  const actual = Buffer.from(token);
  return (
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual)
  );
}
