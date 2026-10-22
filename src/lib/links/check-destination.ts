import "server-only";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import net from "node:net";

export type CheckResult = { ok: boolean; reasons: string[] };

const MAX_HOPS = 4;
const HOP_TIMEOUT_MS = 4000;
const TOTAL_TIMEOUT_MS = 10_000;
const MAX_URL_LENGTH = 2048;
const ALLOWED_PORTS = new Set(["", "80", "443"]);

// Everything that isn't the public internet
const blocked = new net.BlockList();
const V4: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];
const V6: [string, number][] = [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
];
for (const [a, p] of V4) blocked.addSubnet(a, p, "ipv4");
for (const [a, p] of V6) blocked.addSubnet(a, p, "ipv6");

function isBlockedIp(ip: string) {
  const family = net.isIP(ip);
  return family === 0 || blocked.check(ip, family === 4 ? "ipv4" : "ipv6");
}

// Runs on the actual connection, so the IP checked is the IP used (no rebinding gap).
// Rejects if ANY returned address is internal.
const safeLookup: net.LookupFunction = (hostname, options, cb) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addrs) => {
    if (err) return cb(err, "", 0);
    if (addrs.length === 0 || addrs.some((a) => isBlockedIp(a.address))) {
      return cb(
        Object.assign(new Error("blocked"), { code: "EBLOCKED" }),
        "",
        0,
      );
    }
    if (options.all) return cb(null, addrs);
    cb(null, addrs[0]!.address, addrs[0]!.family);
  });
};

const fail = (reason: string): CheckResult => ({
  ok: false,
  reasons: [reason],
});

// Node skips DNS for IP literals, so those are checked here instead
function validateUrl(url: URL): string | null {
  if (url.protocol !== "http:" && url.protocol !== "https:")
    return "The destination uses an unsupported protocol.";
  if (url.username || url.password)
    return "The destination contains embedded login credentials.";
  if (!ALLOWED_PORTS.has(url.port))
    return "The destination uses an unusual port.";
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isBlockedIp(host))
    return "The destination points to a private or internal address.";
  return null;
}

function describeError(e: unknown): string {
  const code = (e as NodeJS.ErrnoException | undefined)?.code ?? "";
  if (code === "EBLOCKED")
    return "The destination points to a private or internal address.";
  if (code === "ETIMEDOUT" || code === "ABORT_ERR")
    return "The destination took too long to respond.";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN")
    return "The destination’s domain doesn’t exist.";
  if (/CERT|TLS|SELF_SIGNED|UNABLE_TO_VERIFY/.test(code))
    return "The destination’s security certificate is invalid.";
  return "The destination couldn’t be reached.";
}

// Reads the status line and headers only; the body is never read.
function probe(url: URL, method: "HEAD" | "GET", signal: AbortSignal) {
  return new Promise<{ status: number; location?: string }>(
    (resolve, reject) => {
      const lib = url.protocol === "https:" ? https : http;
      const req = lib.request(
        url,
        {
          method,
          lookup: safeLookup,
          agent: false,
          signal,
          maxHeaderSize: 16 * 1024,
          headers: {
            "user-agent": "goHopLinkCheck/1.0",
            accept: "*/*",
            "accept-encoding": "identity",
            connection: "close",
          },
        },
        (res) => {
          resolve({
            status: res.statusCode ?? 0,
            location: res.headers.location,
          });
          res.destroy();
          req.destroy();
        },
      );
      req.setTimeout(HOP_TIMEOUT_MS, () =>
        req.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })),
      );
      req.on("error", reject);
      req.end();
    },
  );
}

export async function checkDestination(raw: string): Promise<CheckResult> {
  if (raw.length > MAX_URL_LENGTH)
    return fail("The destination URL is too long.");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail("The destination isn’t a valid URL.");
  }

  const reasons: string[] = [];
  if (url.protocol === "http:") {
    reasons.push("The destination isn’t encrypted (http, not https).");
  }

  const signal = AbortSignal.timeout(TOTAL_TIMEOUT_MS);

  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const problem = validateUrl(url);
    if (problem) return fail(problem);

    try {
      let res = await probe(url, "HEAD", signal);
      if (res.status === 405 || res.status === 501)
        res = await probe(url, "GET", signal);

      if (res.status >= 300 && res.status < 400 && res.location) {
        try {
          url = new URL(res.location, url); // validated again at the top of the loop
          continue;
        } catch {
          return fail("The destination redirects to an invalid URL.");
        }
      }

      // 401/403/429 mean a server answered (usually bot protection), so don't warn.
      if (res.status === 404 || res.status === 410) {
        reasons.push(`The page wasn’t found (${res.status}).`);
      } else if (res.status >= 500) {
        reasons.push(`The destination’s server is erroring (${res.status}).`);
      } else if (res.status >= 400 && ![401, 403, 429].includes(res.status)) {
        reasons.push(
          `The destination responded with an error (${res.status}).`,
        );
      }
      return { ok: reasons.length === 0, reasons };
    } catch (e) {
      return fail(describeError(e));
    }
  }

  return fail("The destination redirects too many times.");
}
