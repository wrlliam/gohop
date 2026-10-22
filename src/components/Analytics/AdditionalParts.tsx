import Link from "next/link";
import type { ElementType } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "@phosphor-icons/react/ssr";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import {
  RANGES,
  formatNumber,
  formatPercent,
  type RangeKey,
} from "~/lib/analytics";

/* -------------------------------------------------------------------------- */
/* Stat card with period-over-period delta                                     */
/* -------------------------------------------------------------------------- */

function Delta({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-muted-foreground">No earlier data</span>;
  }
  const rounded = Math.round(value);
  if (rounded === 0) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-0.5">
        <Minus className="h-3 w-3" weight="bold" /> 0%
      </span>
    );
  }
  const Arrow = rounded > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium",
        rounded > 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-destructive",
      )}
    >
      <Arrow className="h-3 w-3" weight="bold" />
      {Math.abs(rounded)}%
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  hint,
}: {
  label: string;
  value: string;
  icon: ElementType;
  /** % change vs previous period. Omit to hide, null = nothing to compare. */
  delta?: number | null;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="text-muted-foreground h-4 w-4" weight="duotone" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
          {delta !== undefined && <Delta value={delta} />}
          {hint && <span>{hint}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Range switcher (driven by ?range=)                                          */
/* -------------------------------------------------------------------------- */

export function RangeTabs({
  current,
  basePath,
}: {
  current: RangeKey;
  basePath: string;
}) {
  return (
    <nav
      aria-label="Date range"
      className="bg-muted inline-flex rounded-lg p-1 text-sm"
    >
      {(Object.keys(RANGES) as RangeKey[]).map((key) => (
        <Link
          key={key}
          href={`${basePath}?range=${key}`}
          scroll={false}
          aria-current={key === current ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition-colors",
            key === current
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {key}
        </Link>
      ))}
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Ranked list with proportional bars                                          */
/* -------------------------------------------------------------------------- */

export function BreakdownCard({
  title,
  description,
  rows,
  total,
  empty = "No data in this period.",
}: {
  title: string;
  description?: string;
  rows: { label: string; views: number }[];
  /** What the percentages are relative to. */
  total: number;
  empty?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{empty}</p>
        ) : (
          <ul className="space-y-1.5">
            {rows.map((row) => {
              const pct = total > 0 ? (row.views / total) * 100 : 0;
              return (
                <li
                  key={row.label}
                  className="relative overflow-hidden rounded-md"
                >
                  <div
                    aria-hidden
                    className="bg-primary/10 absolute inset-y-0 left-0"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                  <div className="relative flex items-center justify-between gap-3 px-2 py-1.5 text-sm">
                    <span className="truncate">{row.label}</span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {formatNumber(row.views)}
                      <span className="ml-2 inline-block w-9 text-right text-xs">
                        {formatPercent(pct)}
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Hour-of-day histogram                                                       */
/* -------------------------------------------------------------------------- */

export function HourBars({ counts }: { counts: number[] }) {
  const max = Math.max(...counts, 1);
  return (
    <div>
      <div
        role="img"
        aria-label="Views by hour of day, UTC"
        className="flex h-28 items-end gap-1"
      >
        {counts.map((n, hour) => (
          <div
            key={hour}
            title={`${String(hour).padStart(2, "0")}:00 UTC: ${formatNumber(n)} views`}
            className="bg-primary/70 hover:bg-primary min-h-px flex-1 rounded-t-sm transition-colors"
            style={{ height: `${(n / max) * 100}%` }}
          />
        ))}
      </div>
      <div className="text-muted-foreground mt-2 flex justify-between text-xs">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tiny inline trend line                                                      */
/* -------------------------------------------------------------------------- */

export function Sparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  const w = 88;
  const h = 24;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const points = (values.length ? values : [0])
    .map(
      (v, i) =>
        `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`,
    )
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label="Views trend"
      className={cn("text-primary", className)}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
