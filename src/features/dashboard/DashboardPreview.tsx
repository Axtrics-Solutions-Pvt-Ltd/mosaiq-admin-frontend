"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  Cable,
  CheckCircle2,
  Database,
  FileCheck2,
  FileWarning,
  Gauge,
  Plus,
  RefreshCw,
  Upload,
  UserPlus,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartSurface,
  FilterBar,
  PageStack,
} from "@/components/shared/LayoutPatterns";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { routes } from "@/config/routes";
import {
  type DashboardPeriod,
  type DashboardScope,
  type DashboardSource,
  type DashboardState,
  getDashboardView,
} from "@/features/dashboard/view-model";

const metricIcons = {
  agencies: Building2,
  completed: FileCheck2,
  demo: Database,
  failed: FileWarning,
  users: UsersRound,
  workspaces: Gauge,
} as const;

const chartColors = [
  "var(--chart-blue)",
  "var(--chart-indigo)",
  "var(--chart-cyan)",
];

const quickActions = [
  { href: routes.agencies.new, icon: Building2, label: "Add agency" },
  { href: routes.workspaces.new, icon: Plus, label: "Add workspace" },
  { href: routes.users.invite, icon: UserPlus, label: "Invite user" },
  { href: routes.dataImport, icon: Upload, label: "Import data" },
];

function DashboardFilters({
  onPeriodChange,
  onRefresh,
  onScopeChange,
  onSourceChange,
  onStateChange,
  period,
  scope,
  source,
  state,
}: {
  onPeriodChange: (value: DashboardPeriod) => void;
  onRefresh: () => void;
  onScopeChange: (value: DashboardScope) => void;
  onSourceChange: (value: DashboardSource) => void;
  onStateChange: (value: DashboardState) => void;
  period: DashboardPeriod;
  scope: DashboardScope;
  source: DashboardSource;
  state: DashboardState;
}) {
  return (
    <FilterBar className="lg:grid lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
      <div>
        <Label htmlFor="dashboard-scope">Agency scope</Label>
        <Select
          className="mt-1.5"
          id="dashboard-scope"
          onChange={(event) =>
            onScopeChange(event.target.value as DashboardScope)
          }
          value={scope}
        >
          <option value="all">All agencies</option>
          <option value="northstar">Northstar Digital</option>
          <option value="kinetic">Kinetic Growth</option>
          <option value="newbridge">Newbridge Media (empty)</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="dashboard-period">Date range</Label>
        <Select
          className="mt-1.5"
          id="dashboard-period"
          onChange={(event) =>
            onPeriodChange(event.target.value as DashboardPeriod)
          }
          value={period}
        >
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="year">This year</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="dashboard-source">Data source</Label>
        <Select
          className="mt-1.5"
          id="dashboard-source"
          onChange={(event) =>
            onSourceChange(event.target.value as DashboardSource)
          }
          value={source}
        >
          <option value="all">All sources</option>
          <option value="seeded">Seeded</option>
          <option value="csv">CSV</option>
          <option value="connector">Future connector</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="dashboard-state">Preview state</Label>
        <Select
          className="mt-1.5"
          id="dashboard-state"
          onChange={(event) =>
            onStateChange(event.target.value as DashboardState)
          }
          value={state}
        >
          <option value="populated">Populated</option>
          <option value="loading">Loading</option>
          <option value="error">Error</option>
          <option value="permission">Limited permission</option>
        </Select>
      </div>
      <Button className="lg:mb-px" onClick={onRefresh} variant="outline">
        <RefreshCw aria-hidden className="size-4" />
        Preview refresh
      </Button>
    </FilterBar>
  );
}

function LoadingDashboard() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading dashboard preview"
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 pt-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-80 xl:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

function DashboardCharts({
  agencyUsage,
  scopeLabel,
  sourceDistribution,
}: {
  agencyUsage: { name: string; workspaces: number; users: number }[];
  scopeLabel: string;
  sourceDistribution: { name: string; value: number }[];
}) {
  const totalSources = sourceDistribution.reduce(
    (total, entry) => total + entry.value,
    0,
  );
  const leadingAgency = agencyUsage.at(0);
  const leadingSource = sourceDistribution.toSorted(
    (left, right) => right.value - left.value,
  )[0];

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <ChartSurface className="xl:col-span-2">
        <div>
          <h2 className="text-strong text-base font-semibold">
            {scopeLabel === "All agencies"
              ? "Agency usage overview"
              : "Workspace usage overview"}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Active workspaces and users in the selected scope.
          </p>
        </div>
        <figure className="mt-5">
          <div
            aria-label="Bar chart comparing active workspaces and users"
            className="h-64 min-w-0"
            role="img"
          >
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={agencyUsage} margin={{ left: -20, right: 4 }}>
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  fontSize={12}
                  stroke="var(--text-muted)"
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  fontSize={12}
                  stroke="var(--text-muted)"
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: "var(--surface-subtle)" }} />
                <Bar
                  dataKey="workspaces"
                  fill="var(--chart-blue)"
                  name="Workspaces"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="users"
                  fill="var(--chart-indigo)"
                  name="Users"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <figcaption className="text-muted-foreground mt-3 border-t pt-3 text-sm">
            {leadingAgency
              ? `${leadingAgency.name} has the highest displayed usage with ${leadingAgency.workspaces} active workspaces and ${leadingAgency.users} users.`
              : "No usage is available for this scope."}
          </figcaption>
        </figure>
      </ChartSurface>

      <ChartSurface>
        <h2 className="text-strong text-base font-semibold">
          Data-source distribution
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Active workspaces grouped by source.
        </p>
        <figure className="mt-3">
          <div
            aria-label="Donut chart showing workspace data sources"
            className="h-52"
            role="img"
          >
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  data={sourceDistribution}
                  dataKey="value"
                  innerRadius={52}
                  nameKey="name"
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {sourceDistribution.map((entry, index) => (
                    <Cell
                      fill={chartColors[index % chartColors.length]}
                      key={entry.name}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div
            className="flex flex-wrap justify-center gap-3"
            aria-label="Chart legend"
          >
            {sourceDistribution.map((entry, index) => (
              <span
                className="flex items-center gap-1.5 text-xs"
                key={entry.name}
              >
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{
                    backgroundColor: chartColors[index % chartColors.length],
                  }}
                />
                {entry.name} ({entry.value})
              </span>
            ))}
          </div>
          <figcaption className="text-muted-foreground mt-3 border-t pt-3 text-sm">
            {totalSources} active workspaces are represented.
            {leadingSource &&
              ` ${leadingSource.name} is the largest source in this sample.`}
          </figcaption>
        </figure>
      </ChartSurface>
    </div>
  );
}

function AttentionCard({
  attention,
}: {
  attention: ReturnType<typeof getDashboardView>["attention"];
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Needs attention</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Workspaces and imports requiring review.
          </p>
        </div>
        <Badge tone={attention.length ? "warning" : "success"}>
          {attention.length || "None"}
        </Badge>
      </CardHeader>
      <CardContent>
        {attention.length ? (
          <ul className="divide-y">
            {attention.map((entry) => (
              <li className="py-3 first:pt-0 last:pb-0" key={entry.id}>
                <Link
                  className="group flex items-start gap-3 rounded-sm focus-visible:outline-none"
                  href={
                    entry.id.startsWith("imp")
                      ? routes.importHistory
                      : routes.workspaces.index
                  }
                >
                  <span
                    className={
                      entry.severity === "danger"
                        ? "bg-destructive-soft text-destructive mt-0.5 rounded-full p-2"
                        : "bg-warning-soft text-warning mt-0.5 rounded-full p-2"
                    }
                  >
                    <AlertTriangle aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-strong group-hover:text-primary block font-medium">
                      {entry.title}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs">
                      {entry.description}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="text-muted-foreground mt-2 size-4"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Nothing in this sample needs attention.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RecentImports({
  imports,
}: {
  imports: ReturnType<typeof getDashboardView>["imports"];
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Recent imports</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Latest sample ingestion activity.
          </p>
        </div>
        <Button asChild size="sm" variant="ghost">
          <Link href={routes.importHistory}>
            View all <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {imports.length ? (
          <div className="space-y-1">
            {imports.map((entry) => (
              <div
                className="flex flex-col gap-2 border-b py-3 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-center"
                key={entry.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-strong truncate font-medium">
                    {entry.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {entry.agency} � {entry.time}
                  </p>
                </div>
                <StatusBadge status={entry.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No sample imports match the selected source.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function OperationsGrid({
  attention,
  imports,
}: {
  attention: ReturnType<typeof getDashboardView>["attention"];
  imports: ReturnType<typeof getDashboardView>["imports"];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <AttentionCard attention={attention} />
      <RecentImports imports={imports} />
      <Card>
        <CardHeader>
          <CardTitle>Connector availability</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Product availability only; no sync is running.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            ["CSV upload", "Available", "available"],
            ["Google Analytics", "Planned", "planned"],
            ["Paid media", "Planned", "planned"],
          ].map(([name, label, status]) => (
            <div className="flex items-center justify-between gap-3" key={name}>
              <span className="flex items-center gap-2">
                <Cable aria-hidden className="text-muted-foreground size-4" />
                <span className="text-strong font-medium">{name}</span>
              </span>
              {status === "available" ? (
                <Badge tone="success">
                  <CheckCircle2 aria-hidden className="size-3" />
                  {label}
                </Badge>
              ) : (
                <StatusBadge status="planned" />
              )}
            </div>
          ))}
          <Button asChild className="mt-2 w-full" variant="outline">
            <Link href={routes.connectors}>Review connector status</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent Admin activity</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Representative configuration changes.
          </p>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <Activity aria-hidden className="text-primary mt-0.5 size-4" />
              <div>
                <p className="text-strong font-medium">
                  Workspace access reviewed
                </p>
                <p className="text-muted-foreground text-xs">
                  Jaspreet Kaur � 2 hours ago
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <WandSparkles
                aria-hidden
                className="text-primary mt-0.5 size-4"
              />
              <div>
                <p className="text-strong font-medium">KPI set updated</p>
                <p className="text-muted-foreground text-xs">
                  Priya Shah � Yesterday
                </p>
              </div>
            </li>
          </ol>
          <Button asChild className="mt-5 w-full" variant="outline">
            <Link href={routes.governance}>Open audit preview</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickActions.map(({ href, icon: Icon, label }) => (
          <Button
            asChild
            className="justify-start"
            key={label}
            variant="outline"
          >
            <Link href={href}>
              <Icon aria-hidden className="text-primary size-4" />
              {label}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyAgency() {
  return (
    <StatePanel
      action={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href={routes.workspaces.new}>
              <Plus aria-hidden className="size-4" />
              Create workspace
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={routes.dataImport}>
              <Upload aria-hidden className="size-4" />
              Open import preview
            </Link>
          </Button>
        </div>
      }
      description="Create the first client workspace, then add data when it is ready. These links open UI preview routes and do not save changes."
      kind="empty"
      title="Set up the first workspace for Newbridge Media"
    />
  );
}

export function DashboardPreview() {
  const [scope, setScope] = useState<DashboardScope>("all");
  const [period, setPeriod] = useState<DashboardPeriod>("30");
  const [source, setSource] = useState<DashboardSource>("all");
  const [state, setState] = useState<DashboardState>("populated");
  const [refreshMessage, setRefreshMessage] = useState("");
  const dashboard = useMemo(
    () => getDashboardView(scope, period, source),
    [period, scope, source],
  );

  return (
    <PageStack>
      <PageHeader
        context={dashboard.scopeLabel}
        actions={<Badge tone="primary">Demo data</Badge>}
        description="Monitor agency operations, workspace activity, and data health from one place."
        title="Dashboard"
      />
      <div aria-live="polite" className="sr-only">
        {refreshMessage}
      </div>
      <DashboardFilters
        onPeriodChange={setPeriod}
        onRefresh={() =>
          setRefreshMessage(
            "Preview refreshed. Sample data remains unchanged because no live service is connected.",
          )
        }
        onScopeChange={setScope}
        onSourceChange={setSource}
        onStateChange={setState}
        period={period}
        scope={scope}
        source={source}
        state={state}
      />

      {state === "loading" && <LoadingDashboard />}
      {state === "error" && (
        <StatePanel
          action={
            <Button onClick={() => setState("populated")}>
              Return to dashboard
            </Button>
          }
          description="The dashboard preview could not load its sample content. No live request was made."
          kind="error"
          title="Dashboard unavailable"
        />
      )}
      {state === "permission" && (
        <StatePanel
          action={
            <Button asChild variant="outline">
              <Link href={routes.dashboard}>Return to your dashboard</Link>
            </Button>
          }
          description="This account can open the dashboard, but aggregate agency metrics are restricted in this preview."
          kind="permission"
          title="Limited dashboard access"
        />
      )}
      {state === "populated" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {dashboard.metrics.map((metric) => (
              <MetricCard
                change={metric.note}
                icon={metricIcons[metric.id]}
                key={metric.id}
                label={metric.label}
                tone={
                  metric.id === "failed" && metric.value > 0
                    ? "warning"
                    : "neutral"
                }
                value={metric.value.toLocaleString("en-US")}
              />
            ))}
          </div>
          {scope === "newbridge" ? (
            <>
              <EmptyAgency />
              <QuickActions />
            </>
          ) : (
            <>
              <DashboardCharts
                agencyUsage={dashboard.agencyUsage}
                scopeLabel={dashboard.scopeLabel}
                sourceDistribution={dashboard.sourceDistribution}
              />
              <OperationsGrid
                attention={dashboard.attention}
                imports={dashboard.imports}
              />
              <QuickActions />
            </>
          )}
        </>
      )}
    </PageStack>
  );
}
