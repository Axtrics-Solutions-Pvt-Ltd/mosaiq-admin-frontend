"use client";

import {
  Activity,
  Building2,
  Gauge,
  MapPin,
  Pencil,
  Power,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { type TabOption, Tabs } from "@/components/ui/Tabs";
import { getNavigationItem } from "@/config/navigation";
import { clientScope, routes } from "@/config/routes";
import { AgencyLogo } from "@/features/agencies/AgencyLogo";
import type { AgencyRecord } from "@/features/agencies/contracts";
import { useAgency, useUpdateAgency } from "@/features/agencies/queries";
import {
  profileFromRecord,
  toAgencyDetail,
} from "@/features/agencies/remote-model";
import type { AgencyDetail } from "@/features/agencies/view-model";
import { ApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/formatters";
import { useScope } from "@/providers/ScopeProvider";

function DetailList({
  entries,
}: {
  entries: { label: string; value: string }[];
}) {
  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {entries.map((entry) => (
        <div key={entry.label}>
          <dt className="text-muted-foreground text-xs font-medium">
            {entry.label}
          </dt>
          <dd className="text-strong mt-1 font-medium break-words">
            {entry.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Overview({ agency }: { agency: AgencyDetail }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Agency overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-foreground">{agency.description}</p>
          <DetailList
            entries={[
              { label: "Display name", value: agency.displayName },
              { label: "Legal name", value: agency.legalName },
              { label: "Website", value: agency.website },
              { label: "Created", value: formatDate(agency.createdAt) },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Account status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StatusBadge status={agency.status} />
          <p className="text-muted-foreground text-sm">
            Status controls access for the agency and its channels.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Defaults({ agency }: { agency: AgencyDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel defaults</CardTitle>
      </CardHeader>
      <CardContent>
        <DetailList
          entries={[
            { label: "Default currency", value: agency.currency },
            { label: "Time zone", value: agency.timeZone },
            { label: "Language", value: agency.language },
            { label: "Reporting week", value: agency.reportingWeek },
            { label: "Date format", value: agency.dateFormat },
          ]}
        />
      </CardContent>
    </Card>
  );
}

function Workspaces({ agency }: { agency: AgencyDetail }) {
  if (!agency.workspaceRecords.length) {
    return (
      <StatePanel
        action={
          <Button asChild variant="outline">
            <Link href={routes.workspaces.new + clientScope(Number(agency.id))}>
              Create channel
            </Link>
          </Button>
        }
        description="This agency has no linked channels yet."
        kind="empty"
        title="No channels"
      />
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {agency.workspaceRecords.map((workspace) => (
        <Card key={workspace.id}>
          <CardContent className="pt-4 sm:pt-5">
            <div className="flex items-start justify-between gap-3">
              <span className="bg-primary-soft text-primary rounded-lg p-2.5">
                <Gauge aria-hidden className="size-5" />
              </span>
              <StatusBadge status={workspace.status} />
            </div>
            <h3 className="text-strong mt-4 font-semibold">{workspace.name}</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {workspace.dataSource}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Administrators({ agency }: { agency: AgencyDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned administrators</CardTitle>
      </CardHeader>
      <CardContent>
        {agency.administrators.length === 0 && (
          <p className="text-muted-foreground">No administrators assigned.</p>
        )}
        <ul className="divide-y">
          {agency.administrators.map((administrator) => (
            <li
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              key={administrator.id}
            >
              <span className="bg-muted text-muted-foreground rounded-full p-2">
                <UsersRound aria-hidden className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-strong block font-medium">
                  {administrator.name}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {administrator.role}
                </span>
              </span>
              <Badge tone="success">{administrator.status}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RecentActivity({ agency }: { agency: AgencyDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent administrative activity</CardTitle>
      </CardHeader>
      <CardContent>
        {agency.activity.length === 0 && (
          <p className="text-muted-foreground">No recent activity.</p>
        )}
        <ol className="space-y-5">
          {agency.activity.map((entry, index) => (
            <li className="relative flex gap-3" key={entry.id}>
              <span className="bg-primary-soft text-primary z-10 rounded-full p-2">
                <Activity aria-hidden className="size-4" />
              </span>
              {index < agency.activity.length - 1 && (
                <span
                  aria-hidden
                  className="bg-border absolute top-8 bottom-[-1.25rem] left-4 w-px"
                />
              )}
              <div>
                <p className="text-strong font-medium">{entry.title}</p>
                <p className="text-muted-foreground text-sm">
                  {entry.description}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {entry.time}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export function AgencyDetails({
  agency,
  record,
}: {
  agency: AgencyDetail;
  record: AgencyRecord;
}) {
  const updateMutation = useUpdateAgency();
  const [isConfirming, setIsConfirming] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const parentNavigation = getNavigationItem(routes.agencies.index, useScope());
  const tabs: readonly TabOption[] = [
    {
      content: <Overview agency={agency} />,
      label: "Overview",
      value: "overview",
    },
    {
      content: <Defaults agency={agency} />,
      label: "Defaults",
      value: "defaults",
    },
    {
      content: <Workspaces agency={agency} />,
      label: `Channels (${agency.workspaces})`,
      value: "workspaces",
    },
    {
      content: <Administrators agency={agency} />,
      label: "Administrators",
      value: "administrators",
    },
    {
      content: <RecentActivity agency={agency} />,
      label: "Recent activity",
      value: "activity",
    },
  ];

  return (
    <PageStack>
      <PageHeader
        actions={
          <>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => setIsConfirming(true)}
              variant="outline"
            >
              <Power aria-hidden className="size-4" />
              {agency.status === "active" ? "Deactivate" : "Activate"}
            </Button>
            <Button asChild>
              <Link href={routes.agencies.edit(agency.id)}>
                <Pencil aria-hidden className="size-4" /> Edit agency
              </Link>
            </Button>
          </>
        }
        breadcrumbs={
          <>
            <Link
              className="hover:text-primary"
              href={parentNavigation?.href ?? routes.agencies.index}
            >
              {parentNavigation?.label ?? "Agencies"}
            </Link>
            <span aria-hidden> / </span>
            <span>{agency.name}</span>
          </>
        }
        description="Review agency identity, defaults, people, channels, and administrative activity."
        title={agency.name}
      />
      <div className="bg-card flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:p-5">
        <AgencyLogo
          className="size-14 text-base"
          name={agency.name}
          tone={agency.logoTone}
          url={agency.logoUrl}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-strong text-lg font-semibold">
              {agency.displayName}
            </h2>
            <StatusBadge status={agency.status} />
          </div>
          <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5">
              <Building2 aria-hidden className="size-4" />
              {agency.workspaces} channels
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin aria-hidden className="size-4" />
              {agency.timeZone.split(" (")[0]}
            </span>
          </div>
        </div>
      </div>
      {announcement && (
        <div
          role={updateMutation.isError ? "alert" : "status"}
          className={
            updateMutation.isError
              ? "text-destructive rounded-lg border p-4"
              : "text-success rounded-lg border p-4"
          }
        >
          {announcement}
        </div>
      )}
      <div className="bg-card overflow-hidden rounded-lg border p-4 sm:p-5">
        <div className="overflow-x-auto">
          <Tabs items={tabs} />
        </div>
      </div>
      <ConfirmationDialog
        body="This status change will be saved immediately and may affect agency access."
        confirmLabel={
          agency.status === "active" ? "Deactivate agency" : "Activate agency"
        }
        description={`Review the impact before changing ${agency.name} to ${agency.status === "active" ? "inactive" : "active"}.`}
        isOpen={isConfirming}
        isPending={updateMutation.isPending}
        onCancel={() => setIsConfirming(false)}
        onConfirm={async () => {
          try {
            await updateMutation.mutateAsync({
              agencyId: record.id,
              payload: {
                ...profileFromRecord(record),
                status: record.status === "active" ? "inactive" : "active",
              },
            });
            setAnnouncement("Agency status updated.");
            setIsConfirming(false);
          } catch (error) {
            setAnnouncement(
              error instanceof ApiError
                ? error.message
                : "Agency status could not be updated.",
            );
            setIsConfirming(false);
          }
        }}
        title={
          agency.status === "active"
            ? "Deactivate this agency?"
            : "Activate this agency?"
        }
      />
    </PageStack>
  );
}

export function AgencyDetailsScreen({ agencyId }: { agencyId: number }) {
  const query = useAgency(agencyId);
  if (!Number.isSafeInteger(agencyId) || agencyId <= 0)
    return (
      <StatePanel
        kind="error"
        title="Invalid agency"
        description="The agency link is invalid."
      />
    );
  if (query.isPending)
    return (
      <div aria-busy="true" className="p-8">
        Loading agency...
      </div>
    );
  if (query.isError)
    return (
      <StatePanel
        kind="error"
        title="Agency unavailable"
        description="The agency could not be loaded."
        action={<Button onClick={() => query.refetch()}>Try again</Button>}
      />
    );
  return (
    <AgencyDetails agency={toAgencyDetail(query.data)} record={query.data} />
  );
}
