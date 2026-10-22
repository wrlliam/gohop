import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowSquareOut,
  ChartBar,
  ChartLineUp,
  CheckCircle,
  Robot,
  TrendUp,
  Users,
  XCircle,
} from "@phosphor-icons/react/ssr";

import { auth } from "~/server/better-auth";
import {
  getBreakdown,
  getLinkRows,
  getSparklines,
  getSummary,
  getTimeseries,
  userScope,
} from "~/server/analytics";
import {
  RANGE_LABELS,
  countryName,
  formatNumber,
  formatPercent,
  formatRelative,
  parseRange,
  pctChange,
  percent,
} from "~/lib/analytics";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  BreakdownCard,
  RangeTabs,
  Sparkline,
  StatCard,
} from "~/components/Analytics/AdditionalParts";
import { ViewsChart } from "~/components/Analytics/ViewChart";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const userId = session.user.id;
  const range = parseRange((await searchParams).range);
  const scope = userScope(userId);

  const [links, sparklines, summary, series, countries, referrers] =
    await Promise.all([
      getLinkRows(userId, range),
      getSparklines(userId, range),
      getSummary(scope, range),
      getTimeseries(scope, range),
      getBreakdown(scope, range, "country", { format: countryName }),
      getBreakdown(scope, range, "referrerDomain", {
        fallback: "Direct / none",
      }),
    ]);

  const { current, previous } = summary;
  const humanViews = current.views - current.bots;
  const activeLinks = links.filter((l) => l.isActive).length;
  const rangeLabel = RANGE_LABELS[range];

  return (
    <main className="flex-1 space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Traffic and payout quality across your links, {rangeLabel}.
          </p>
        </div>
        <RangeTabs current={range} basePath="/app" />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Views"
          icon={ChartBar}
          value={formatNumber(current.views)}
          delta={pctChange(current.views, previous.views)}
          hint="vs previous period"
        />
        <StatCard
          label="Unique visitors"
          icon={Users}
          value={formatNumber(current.unique)}
          delta={pctChange(current.unique, previous.unique)}
          hint="vs previous period"
        />
        <StatCard
          label="Billable views"
          icon={TrendUp}
          value={formatNumber(current.billable)}
          delta={pctChange(current.billable, previous.billable)}
          hint={`${formatPercent(percent(current.billable, current.views))} of views`}
        />
        <StatCard
          label="Bot traffic"
          icon={Robot}
          value={formatPercent(percent(current.bots, current.views))}
          hint={`${formatNumber(current.bots)} hits filtered`}
        />
      </div>

      {/* Traffic over time */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic</CardTitle>
          <CardDescription>
            Daily views, unique visitors and billable views (UTC).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ViewsChart data={series} />
        </CardContent>
      </Card>

      {/* Where traffic comes from */}
      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard
          title="Top countries"
          description="Excludes bots"
          rows={countries}
          total={humanViews}
        />
        <BreakdownCard
          title="Top referrers"
          description="Excludes bots"
          rows={referrers}
          total={humanViews}
        />
      </div>

      {/* Links */}
      <Card>
        <CardHeader>
          <CardTitle>Your links</CardTitle>
          <CardDescription>
            {activeLinks} active of {links.length} total. Select a link for its
            full analytics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Unique</TableHead>
                <TableHead className="text-right">Billable</TableHead>
                <TableHead className="text-right">All time</TableHead>
                <TableHead>Last view</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-muted-foreground py-10 text-center"
                  >
                    No links yet. Create one and its traffic will show up here.
                  </TableCell>
                </TableRow>
              )}
              {links.map((link) => {
                const expired = !!link.expiresAt && link.expiresAt < new Date() && new Date(link.expiresAt).getTime() !== 0;
                return (
                  <TableRow key={link.id}>
                    <TableCell className="max-w-xs">
                      <Link
                        href={`/app/analytics/${link.code}`}
                        className="font-medium hover:underline"
                      >
                        {link.name ?? "Untitled link"}
                      </Link>
                      <div className="text-muted-foreground font-mono text-sm">
                        /{link.code}
                      </div>
                      <div className="text-muted-foreground truncate text-xs">
                        {link.redirectedLink}
                      </div>
                    </TableCell>
                    <TableCell>
                      {expired ? (
                        <Badge variant="outline" className="gap-1">
                          <XCircle className="h-3 w-3" weight="fill" /> Expired
                        </Badge>
                      ) : link.isActive ? (
                        <Badge className="gap-1">
                          <CheckCircle className="h-3 w-3" weight="fill" />{" "}
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-destructive gap-1"
                        >
                          <XCircle className="h-3 w-3" weight="fill" /> Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Sparkline values={sparklines.get(link.id) ?? []} />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatNumber(link.views)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {formatNumber(link.unique)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(link.billable)}
                      <span className="text-muted-foreground ml-1 text-xs">
                        {formatPercent(percent(link.billable, link.views))}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {formatNumber(link.allTimeViews)}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatRelative(link.lastViewedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon">
                          <Link
                            href={`/app/analytics/${link.code}`}
                            aria-label={`Analytics for ${link.name ?? link.code}`}
                          >
                            <ChartLineUp className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Link
                            href={`/~/${link.code}`}
                            target="_blank"
                            aria-label={`Open /${link.code}`}
                          >
                            <ArrowSquareOut className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
