/**
 * Pure helpers shared by the analytics queries and the UI.
 * No DB imports here, so this is safe to use from client components too.
 */

export const RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const;
export type RangeKey = keyof typeof RANGES;
export const DEFAULT_RANGE: RangeKey = "30d";

export const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
};

export function parseRange(value: string | string[] | undefined): RangeKey {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v in RANGES ? (v as RangeKey) : DEFAULT_RANGE;
}

export const DAY_MS = 86_400_000;

/**
 * The current window is the last N whole UTC days, including today.
 * The previous window is the N days immediately before it, used for deltas.
 */
export function getWindow(range: RangeKey) {
  const days = RANGES[range];
  const now = new Date();
  const todayStart = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const from = new Date(todayStart - (days - 1) * DAY_MS);
  const prevFrom = new Date(from.getTime() - days * DAY_MS);
  const to = new Date(todayStart + DAY_MS); // exclusive upper bound
  return { days, from, prevFrom, to };
}

/** % change vs the previous period. null = there was nothing to compare to. */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export const percent = (part: number, total: number) =>
  total > 0 ? (part / total) * 100 : 0;

export const formatPercent = (value: number) =>
  value > 0 && value < 1 ? "<1%" : `${Math.round(value)}%`;

const numberFormat = new Intl.NumberFormat("en-GB");
export const formatNumber = (n: number) => numberFormat.format(n);

export const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

let regionNames: Intl.DisplayNames | undefined;
export function countryName(code: string) {
  try {
    regionNames ??= new Intl.DisplayNames(["en-GB"], { type: "region" });
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export function formatDate(date: Date | null | undefined) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(date: Date) {
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function formatRelative(date: Date | null | undefined) {
  if (!date) return "Never";
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < DAY_MS) return rtf.format(Math.round(diff / 3_600_000), "hour");
  return rtf.format(Math.round(diff / DAY_MS), "day");
}
