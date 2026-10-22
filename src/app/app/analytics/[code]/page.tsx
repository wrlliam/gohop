import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  ChartBarIcon,
  CheckCircleIcon,
  LockKeyIcon,
  RobotIcon,
  TrendUpIcon,
  UsersIcon,
  XCircleIcon,
} from "@phosphor-icons/react/ssr";

import { auth } from "~/server/better-auth";
import {
  getBreakdown,
  getHourly,
  getOwnedLink,
  getRecentViews,
  getSummary,
  getTimeseries,
  linkScope,
} from "~/server/analytics";
import {
  RANGE_LABELS,
  capitalise,
  countryName,
  formatDate,
  formatDateTime,
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
  HourBars,
  RangeTabs,
  StatCard,
} from "~/components/Analytics/AdditionalParts";
import { ViewsChart } from "~/components/Analytics/ViewChart";
import { EditLinkDialog } from "~/components/Analytics/EditLinkDialog";

export default async function LinkAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { code } = await params;
  const range = parseRange((await searchParams).range);

  // Ownership is part of the lookup, so other users' codes 404.
  const link = await getOwnedLink(session.user.id, code);
  if (!link) notFound();

  const scope = linkScope(link.id);

  const [
    summary,
    series,
    hours,
    countries,
    cities,
    referrers,
    campaigns,
    devices,
    browsers,
    systems,
    recent,
  ] = await Promise.all([
    getSummary(scope, range),
    getTimeseries(scope, range),
    getHourly(scope, range),
    getBreakdown(scope, range, "country", { format: countryName }),
    getBreakdown(scope, range, "city"),
    getBreakdown(scope, range, "referrerDomain", { fallback: "Direct / none" }),
    getBreakdown(scope, range, "utmCampaign", { fallback: "No campaign" }),
    getBreakdown(scope, range, "deviceType", {
      includeBots: true,
      format: capitalise,
    }),
    getBreakdown(scope, range, "browser"),
    getBreakdown(scope, range, "os"),
    getRecentViews(link.id),
  ]);

  const { current, previous } = summary;
  const humanViews = current.views - current.bots;
  const expired =
    !!link.expiresAt &&
    link.expiresAt < new Date() &&
    new Date(link.expiresAt).getTime() !== 0;
  const usePct = link.maxUses
    ? Math.min(100, (link.viewCount / link.maxUses) * 100)
    : null;

  return (
    <main className="flex-1 space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-3">
          <Link
            href="/app"
            className="flex flex-row items-center justify-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Dashboard
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {link.name ?? "Untitled link"}
              </h1>
              {expired ? (
                <Badge variant="outline" className="gap-1">
                  <XCircleIcon className="h-3 w-3" weight="fill" /> Expired
                </Badge>
              ) : link.isActive ? (
                <Badge className="gap-1">
                  <CheckCircleIcon className="h-3 w-3" weight="fill" /> Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-destructive gap-1">
                  <XCircleIcon className="h-3 w-3" weight="fill" /> Inactive
                </Badge>
              )}
              {link.password && (
                <Badge variant="secondary" className="gap-1">
                  <LockKeyIcon className="h-3 w-3" weight="fill" /> Password
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground font-mono text-sm">
              /~/{link.code}
            </p>
            <a
              href={link.redirectedLink}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-muted-foreground hover:text-foreground flex max-w-2xl items-center gap-1 truncate text-sm"
            >
              <span className="truncate">{link.redirectedLink}</span>
              <ArrowSquareOutIcon className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Only pass hasPassword, never the stored hash, to the client. */}
            <EditLinkDialog
              link={{
                code: link.code,
                name: link.name,
                redirectedLink: link.redirectedLink,
                isActive: link.isActive,
                maxUses: link.maxUses,
                viewCount: link.viewCount,
                hasPassword: !!link.password,
              }}
            />
            <RangeTabs
              current={range}
              basePath={`/app/analytics/${link.code}`}
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Views"
          icon={ChartBarIcon}
          value={formatNumber(current.views)}
          delta={pctChange(current.views, previous.views)}
          hint="vs previous period"
        />
        <StatCard
          label="Unique visitors"
          icon={UsersIcon}
          value={formatNumber(current.unique)}
          delta={pctChange(current.unique, previous.unique)}
          hint="vs previous period"
        />
        <StatCard
          label="Billable views"
          icon={TrendUpIcon}
          value={formatNumber(current.billable)}
          delta={pctChange(current.billable, previous.billable)}
          hint={`${formatPercent(percent(current.billable, current.views))} of views`}
        />
        <StatCard
          label="Bot traffic"
          icon={RobotIcon}
          value={formatPercent(percent(current.bots, current.views))}
          hint={`${formatNumber(current.bots)} hits filtered`}
        />
      </div>

      {/* Chart + link details */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Views over time</CardTitle>
            <CardDescription>
              Daily activity for the {RANGE_LABELS[range]} (UTC).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ViewsChart data={series} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Link details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <Detail
                label="All-time views"
                value={formatNumber(link.viewCount)}
              />
              <Detail
                label="All-time unique"
                value={formatNumber(link.uniqueViewCount)}
              />
              <Detail
                label="All-time billable"
                value={formatNumber(link.billableViewCount)}
              />
              <Detail
                label="Last viewed"
                value={formatRelative(link.lastViewedAt)}
              />
              <Detail label="Created" value={formatDate(link.createdAt)} />
              <Detail
                label="Expires"
                value={
                  link.expiresAt
                    ? new Date(link.expiresAt).getTime() == 0
                      ? "Never"
                      : formatDate(link.expiresAt)
                    : "Never"
                }
              />
              <div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">View limit</dt>
                  <dd className="font-medium tabular-nums">
                    {link.maxUses
                      ? `${formatNumber(link.viewCount)} / ${formatNumber(link.maxUses)}`
                      : "Unlimited"}
                  </dd>
                </div>
                {usePct !== null && (
                  <div
                    role="progressbar"
                    aria-label="Share of view limit used"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(usePct)}
                    className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full"
                  >
                    <div
                      className="bg-primary h-full"
                      style={{ width: `${usePct}%` }}
                    />
                  </div>
                )}
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Hour of day */}
      <Card>
        <CardHeader>
          <CardTitle>When people click</CardTitle>
          <CardDescription>
            Views by hour of day in UTC, excluding bots.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HourBars counts={hours} />
        </CardContent>
      </Card>

      {/* Breakdowns */}
      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard
          title="Countries"
          description="Excludes bots"
          rows={countries}
          total={humanViews}
        />
        <BreakdownCard
          title="Cities"
          description="Excludes bots"
          rows={cities}
          total={humanViews}
        />
        <BreakdownCard
          title="Referrers"
          description="Where visitors came from"
          rows={referrers}
          total={humanViews}
        />
        <BreakdownCard
          title="Campaigns"
          description="By utm_campaign"
          rows={campaigns}
          total={humanViews}
        />
        <BreakdownCard
          title="Devices"
          description="Includes bots"
          rows={devices}
          total={current.views}
        />
        <BreakdownCard
          title="Browsers"
          description="Excludes bots"
          rows={browsers}
          total={humanViews}
        />
        <BreakdownCard
          title="Operating systems"
          description="Excludes bots"
          rows={systems}
          total={humanViews}
        />
      </div>

      {/* Recent hits */}
      <Card>
        <CardHeader>
          <CardTitle>Recent views</CardTitle>
          <CardDescription>
            The latest {recent.length} hits on this link (times in UTC).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Quality</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-10 text-center"
                  >
                    No views yet. Share the link and hits will appear here.
                  </TableCell>
                </TableRow>
              )}
              {recent.map((hit) => (
                <TableRow key={hit.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(hit.createdAt)}
                  </TableCell>
                  <TableCell>
                    {[hit.city, hit.country ? countryName(hit.country) : null]
                      .filter(Boolean)
                      .join(", ") || "Unknown"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {hit.referrerDomain ?? "Direct / none"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[capitalise(hit.deviceType), hit.browser, hit.os]
                      .filter(Boolean)
                      .join(", ")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {hit.isBot && <Badge variant="outline">Bot</Badge>}
                      {hit.isUnique && (
                        <Badge variant="secondary">New visitor</Badge>
                      )}
                      {hit.isBillable && <Badge>Billable</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
