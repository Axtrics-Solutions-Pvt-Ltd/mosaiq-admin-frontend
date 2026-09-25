"use client";

import {
  Briefcase,
  Building2,
  FileChartColumn,
  Gauge,
  Link2,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { PageStack } from "@/components/shared/LayoutPatterns";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { filterActions, quickActions } from "@/config/actions";
import { hasCapability } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import type { DashboardSummary } from "@/features/dashboard/contracts";
import { useDashboardSummary } from "@/features/dashboard/queries";

const liveMetricIcons = {
  agencies: Building2,
  clients: Briefcase,
  workspaces: Gauge,
  reports: FileChartColumn,
  activeLinks: Link2,
  users: UsersRound,
} as const;

function liveScopeLabel(scope: DashboardSummary["scope"]) {
  switch (scope) {
    case "platform":
      return "Platform-wide";
    case "agency":
      return "Your agency";
    case "client":
      return "Your client";
    case "assigned":
      return "Your assigned workspaces";
  }
}

function buildLiveMetrics(summary: DashboardSummary) {
  const metrics: {
    id: keyof typeof liveMetricIcons;
    label: string;
    value: number;
  }[] = [];
  if (summary.scope === "platform")
    metrics.push({
      id: "agencies",
      label: "Total agencies",
      value: summary.agencies,
    });
  metrics.push({ id: "clients", label: "Clients", value: summary.clients });
  metrics.push({
    id: "workspaces",
    label: "Active workspaces",
    value: summary.workspaces,
  });
  metrics.push({ id: "reports", label: "Reports", value: summary.reports });
  metrics.push({
    id: "activeLinks",
    label: "Active share links",
    value: summary.active_links,
  });
  if (summary.users !== null)
    metrics.push({
      id: "users",
      label: "Active users",
      value: summary.users,
    });
  return metrics;
}

function LiveSummary() {
  const summaryQuery = useDashboardSummary();

  if (summaryQuery.isPending)
    return (
      <div
        aria-busy="true"
        aria-label="Loading live dashboard summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 pt-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );

  if (summaryQuery.isError)
    return (
      <StatePanel
        action={
          <Button onClick={() => summaryQuery.refetch()} variant="outline">
            <RefreshCw aria-hidden className="size-4" />
            Retry
          </Button>
        }
        description="Live agency, workspace, report, link, and user totals could not be loaded."
        kind="error"
        title="Summary unavailable"
      />
    );

  const summary = summaryQuery.data;
  const metrics = buildLiveMetrics(summary);

  return (
    <div>
      <p className="text-muted-foreground mb-3 text-sm">
        {liveScopeLabel(summary.scope)}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            icon={liveMetricIcons[metric.id]}
            key={metric.id}
            label={metric.label}
            value={metric.value.toLocaleString("en-US")}
          />
        ))}
      </div>
      {summary.users === null && (
        <p className="text-muted-foreground mt-3 text-xs">
          User counts are restricted for this role.
        </p>
      )}
    </div>
  );
}

function QuickActions() {
  const currentUser = useCurrentUser();
  if (!currentUser.data) return null;
  const visibleActions = filterActions(quickActions, (capability) =>
    hasCapability(currentUser.data, capability),
  );
  if (visibleActions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visibleActions.map(({ href, icon: Icon, id, label }) => (
          <Button asChild className="justify-start" key={id} variant="outline">
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

export function DashboardPreview() {
  return (
    <PageStack>
      <PageHeader
        description="Monitor agency operations, workspace activity, and data health from one place."
        title="Dashboard"
      />
      <LiveSummary />
      <QuickActions />
    </PageStack>
  );
}
