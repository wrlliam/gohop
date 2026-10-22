// Assumes 2-decimal currencies (USD, GBP, EUR...). Zero-decimal currencies
// such as JPY would need different handling.
export function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(minor / 100);
}

/** 1000 -> "10%", 825 -> "8.25%" */
export function formatBps(bps: number): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}
