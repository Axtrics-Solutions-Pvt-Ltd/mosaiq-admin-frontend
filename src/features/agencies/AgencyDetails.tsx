"use client";

import {
  Activity,
  Building2,
  Gauge,
  Mail,
  MapPin,
  Palette,
  Pencil,
  Phone,
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
import { routes } from "@/config/routes";
import { AgencyLogo } from "@/features/agencies/AgencyLogo";
import type { AgencyDetail } from "@/features/agencies/view-model";
import { formatDate } from "@/lib/formatters";

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
            Status controls access for the agency and its workspaces. This
            prototype does not change access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function PrimaryContact({ agency }: { agency: AgencyDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Primary contact</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          <span className="bg-primary-soft text-primary flex size-12 items-center justify-center rounded-full font-semibold">
            {agency.primaryContact.name
              .split(" ")
              .map((name) => name[0])
              .join("")}
          </span>
          <div>
            <h3 className="text-strong font-semibold">
              {agency.primaryContact.name}
            </h3>
            <p className="text-muted-foreground">
              {agency.primaryContact.jobTitle}
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <a
                className="hover:text-primary flex items-center gap-2"
                href={`mailto:${agency.primaryContact.email}`}
              >
                <Mail aria-hidden className="size-4" />
                {agency.primaryContact.email}
              </a>
              <a
                className="hover:text-primary flex items-center gap-2"
                href={`tel:${agency.primaryContact.phone.replaceAll(" ", "")}`}
              >
                <Phone aria-hidden className="size-4" />
                {agency.primaryContact.phone}
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Defaults({ agency }: { agency: AgencyDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace defaults</CardTitle>
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
            <Link href={routes.workspaces.new}>Open workspace preview</Link>
          </Button>
        }
        description="This sample agency has no linked workspaces yet."
        kind="empty"
        title="No workspaces"
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

function BrandPreview({ agency }: { agency: AgencyDetail }) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-primary h-2" />
      <CardContent className="pt-5">
        <div className="bg-muted flex min-h-64 items-center justify-center rounded-lg border p-6">
          <div className="bg-card w-full max-w-sm rounded-lg border p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <AgencyLogo
                className="size-12"
                name={agency.name}
                tone={agency.logoTone}
              />
              <div>
                <p className="text-strong font-semibold">
                  {agency.displayName}
                </p>
                <p className="text-muted-foreground text-xs">
                  Client reporting portal
                </p>
              </div>
            </div>
            <div className="mt-5 h-2 rounded-full bg-[var(--brand-primary)]" />
            <p className="text-muted-foreground mt-3 text-xs">
              Accent {agency.brandColor} · Basic preview
            </p>
          </div>
        </div>
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

export function AgencyDetails({ agency }: { agency: AgencyDetail }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const tabs: readonly TabOption[] = [
    {
      content: <Overview agency={agency} />,
      label: "Overview",
      value: "overview",
    },
    {
      content: <PrimaryContact agency={agency} />,
      label: "Primary contact",
      value: "contact",
    },
    {
      content: <Defaults agency={agency} />,
      label: "Defaults",
      value: "defaults",
    },
    {
      content: <Workspaces agency={agency} />,
      label: `Workspaces (${agency.workspaces})`,
      value: "workspaces",
    },
    {
      content: <Administrators agency={agency} />,
      label: "Administrators",
      value: "administrators",
    },
    {
      content: <BrandPreview agency={agency} />,
      label: "Brand preview",
      value: "brand",
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
            <Button onClick={() => setIsConfirming(true)} variant="outline">
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
            <Link className="hover:text-primary" href={routes.agencies.index}>
              Agencies
            </Link>
            <span aria-hidden> / </span>
            <span>{agency.name}</span>
          </>
        }
        context={agency.primaryContact.name}
        description="Review agency identity, defaults, people, workspaces, branding, and administrative activity."
        isPreview
        title={agency.name}
      />
      <div className="bg-card flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:p-5">
        <AgencyLogo
          className="size-14 text-base"
          name={agency.name}
          tone={agency.logoTone}
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
              <Mail aria-hidden className="size-4" />
              {agency.primaryContact.email}
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 aria-hidden className="size-4" />
              {agency.workspaces} workspaces
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin aria-hidden className="size-4" />
              {agency.timeZone.split(" (")[0]}
            </span>
            <span className="flex items-center gap-1.5">
              <Palette aria-hidden className="size-4" />
              {agency.brandColor}
            </span>
          </div>
        </div>
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div className="bg-card overflow-hidden rounded-lg border p-4 sm:p-5">
        <div className="overflow-x-auto">
          <Tabs items={tabs} />
        </div>
      </div>
      <ConfirmationDialog
        confirmLabel={
          agency.status === "active" ? "Deactivate agency" : "Activate agency"
        }
        description={`Review the impact before changing ${agency.name} to ${agency.status === "active" ? "inactive" : "active"}.`}
        isOpen={isConfirming}
        onCancel={() => setIsConfirming(false)}
        onConfirm={() => {
          setIsConfirming(false);
          setAnnouncement(
            "Status change preview closed. Sample data remains unchanged.",
          );
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
