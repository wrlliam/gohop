"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";

export type TimeseriesPoint = {
  date: string; // YYYY-MM-DD (UTC)
  views: number;
  unique: number;
  billable: number;
};

// If your globals.css wraps chart colours in hsl(...), use
// "hsl(var(--chart-1))" etc. instead.
const config = {
  views: { label: "Views", color: "var(--chart-1)" },
  unique: { label: "Unique visitors", color: "var(--chart-2)" },
  billable: { label: "Billable", color: "var(--chart-3)" },
} satisfies ChartConfig;

const formatDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export function ViewsChart({ data }: { data: TimeseriesPoint[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fill-views" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-views)"
              stopOpacity={0.35}
            />
            <stop
              offset="95%"
              stopColor="var(--color-views)"
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={formatDay}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(value) => formatDay(String(value))}
            />
          }
        />
        <Area
          dataKey="views"
          type="monotone"
          stroke="var(--color-views)"
          strokeWidth={2}
          fill="url(#fill-views)"
        />
        <Area
          dataKey="unique"
          type="monotone"
          stroke="var(--color-unique)"
          strokeWidth={2}
          fill="none"
        />
        <Area
          dataKey="billable"
          type="monotone"
          stroke="var(--color-billable)"
          strokeWidth={2}
          strokeDasharray="4 3"
          fill="none"
        />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}
