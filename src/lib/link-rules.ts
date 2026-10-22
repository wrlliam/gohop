// Hostnames (and their subdomains) that can't be used as a redirect target.
export const BLOCKED_DOMAINS = [
  "gohop.link",
  "bit.ly",
  "bitly.com",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "v.gd",
  "buff.ly",
  "rebrand.ly",
  "cutt.ly",
  "shorturl.at",
  "tiny.cc",
  "rb.gy",
  "t.ly",
  "lnkd.in",
  "bl.ink",
  "soo.gd",
  "s.id",
  "clck.ru",
  "adf.ly",
  "bit.do",
  "shorte.st",
  "ouo.io",
  "tr.ee",
  "dub.sh",
  "dub.co",
  "short.io",
  "qr.ae",
  "amzn.to",
  "fb.me",
  "j.mp",
  "x.co",
  "urlz.fr",
];

// Slugs that would collide with your own routes.
export const RESERVED_SLUGS = new Set([
  "app",
  "api",
  "login",
  "signup",
  "logout",
  "admin",
  "dashboard",
  "settings",
  "about",
  "terms",
  "privacy",
  "_next",
  "static",
]);

export function isBlockedDomain(host: string) {
  const h = host.toLowerCase().replace(/\.$/, "");
  return BLOCKED_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`));
}
