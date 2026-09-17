"use client";

import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Ellipsis,
  Eye,
  Gauge,
  Pencil,
  Plus,
  Search,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FilterBar, PageStack } from "@/components/shared/LayoutPatterns";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { routes } from "@/config/routes";
import { AgencyLogo } from "@/features/agencies/AgencyLogo";
import {
  type AgencyFilters,
  type AgencySummary,
  agencyTotals,
  filterAgencies,
} from "@/features/agencies/view-model";
import { formatDate, formatNumber } from "@/lib/formatters";

type PreviewState = "populated" | "empty" | "loading" | "error";

const initialFilters: AgencyFilters = {
  activity: "all",
  currency: "all",
  search: "",
  status: "all",
  workspaces: "all",
};

function AgencyActions({ agency }: { agency: AgencySummary }) {
  return (
    <details className="relative">
      <summary
        aria-label={`Open actions for ${agency.name}`}
        className="hover:bg-muted focus-visible:ring-ring flex size-9 list-none items-center justify-center rounded-sm focus-visible:ring-2 [&::-webkit-details-marker]:hidden"
      >
        <Ellipsis aria-hidden className="size-4" />
      </summary>
      <div className="bg-card absolute right-0 z-20 mt-1 w-56 rounded-lg border p-1.5 shadow-[var(--shadow-overlay)]">
        <Link
          className="hover:bg-muted flex items-center gap-2 rounded-sm px-3 py-2"
          href={routes.agencies.detail(agency.id)}
        >
          <Eye aria-hidden className="size-4" /> View agency
        </Link>
        <Link
          className="hover:bg-muted flex items-center gap-2 rounded-sm px-3 py-2"
          href={routes.agencies.edit(agency.id)}
        >
          <Pencil aria-hidden className="size-4" /> Edit agency
        </Link>
        <Link
          className="hover:bg-muted flex items-center gap-2 rounded-sm px-3 py-2"
          href={`${routes.workspaces.index}?agency=${agency.id}`}
        >
          <Gauge aria-hidden className="size-4" /> Open workspaces
        </Link>
        <button
          className="text-muted-foreground flex w-full cursor-not-allowed items-center gap-2 rounded-sm px-3 py-2 text-left opacity-70"
          disabled
          title="Available during functional integration"
          type="button"
        >
          <Copy aria-hidden className="size-4" /> Duplicate (preview only)
        </button>
      </div>
    </details>
  );
}

function AgencyIdentity({ agency }: { agency: AgencySummary }) {
  return (
    <Link
      className="group flex min-w-48 items-center gap-3"
      href={routes.agencies.detail(agency.id)}
    >
      <AgencyLogo name={agency.name} tone={agency.logoTone} />
      <span>
        <span className="text-strong group-hover:text-primary block font-medium">
          {agency.name}
        </span>
        <span className="text-muted-foreground block text-xs">{agency.id}</span>
      </span>
    </Link>
  );
}

const columns: readonly DataTableColumn<AgencySummary>[] = [
  {
    header: "Agency",
    id: "agency",
    render: (agency) => <AgencyIdentity agency={agency} />,
  },
  {
    header: "Primary administrator",
    id: "admin",
    render: (agency) => (
      <span>
        <span className="text-strong block font-medium">
          {agency.primaryAdmin.name}
        </span>
        <span className="text-muted-foreground block text-xs">
          {agency.primaryAdmin.email}
        </span>
      </span>
    ),
  },
  {
    align: "right",
    header: "Workspaces",
    id: "workspaces",
    render: (agency) => agency.workspaces,
  },
  {
    align: "right",
    header: "Users",
    id: "users",
    render: (agency) => agency.users,
  },
  { header: "Currency", id: "currency", render: (agency) => agency.currency },
  {
    header: "Status",
    id: "status",
    render: (agency) => <StatusBadge status={agency.status} />,
  },
  {
    header: "Created",
    id: "created",
    render: (agency) => (
      <time dateTime={agency.createdAt}>{formatDate(agency.createdAt)}</time>
    ),
  },
  {
    header: "Last activity",
    id: "activity",
    render: (agency) => (
      <span className="whitespace-nowrap">{agency.lastActivity}</span>
    ),
  },
  {
    header: <span className="sr-only">Actions</span>,
    id: "actions",
    render: (agency) => <AgencyActions agency={agency} />,
  },
];

function AgencyCard({ agency }: { agency: AgencySummary }) {
  return (
    <Card>
      <CardContent className="pt-4 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <AgencyIdentity agency={agency} />
          <AgencyActions agency={agency} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Administrator</dt>
            <dd className="text-strong mt-0.5 truncate font-medium">
              {agency.primaryAdmin.name}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={agency.status} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">
              Workspaces / users
            </dt>
            <dd className="text-strong mt-0.5 tabular-nums">
              {agency.workspaces} / {agency.users}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Currency</dt>
            <dd className="text-strong mt-0.5 font-medium">
              {agency.currency}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground text-xs">Last activity</dt>
            <dd className="text-strong mt-0.5">{agency.lastActivity}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function DirectoryFilters({
  filters,
  onChange,
  onClear,
  previewState,
  setPreviewState,
}: {
  filters: AgencyFilters;
  onChange: <Key extends keyof AgencyFilters>(
    key: Key,
    value: AgencyFilters[Key],
  ) => void;
  onClear: () => void;
  previewState: PreviewState;
  setPreviewState: (state: PreviewState) => void;
}) {
  const hasFilters = Object.entries(filters).some(([key, value]) =>
    key === "search" ? Boolean(value) : value !== "all",
  );
  return (
    <FilterBar className="lg:grid lg:grid-cols-[minmax(13rem,1.4fr)_repeat(4,minmax(8rem,1fr))]">
      <div>
        <Label htmlFor="agency-search">Search agencies</Label>
        <div className="relative mt-1.5">
          <Search
            aria-hidden
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            className="pl-9"
            id="agency-search"
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Name or administrator"
            value={filters.search}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="agency-status">Status</Label>
        <Select
          className="mt-1.5"
          id="agency-status"
          onChange={(event) =>
            onChange("status", event.target.value as AgencyFilters["status"])
          }
          value={filters.status}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="agency-currency">Currency</Label>
        <Select
          className="mt-1.5"
          id="agency-currency"
          onChange={(event) =>
            onChange(
              "currency",
              event.target.value as AgencyFilters["currency"],
            )
          }
          value={filters.currency}
        >
          <option value="all">All currencies</option>
          {["AUD", "EUR", "GBP", "INR", "USD"].map((currency) => (
            <option key={currency}>{currency}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="agency-workspaces">Workspaces</Label>
        <Select
          className="mt-1.5"
          id="agency-workspaces"
          onChange={(event) =>
            onChange(
              "workspaces",
              event.target.value as AgencyFilters["workspaces"],
            )
          }
          value={filters.workspaces}
        >
          <option value="all">Any count</option>
          <option value="none">No workspaces</option>
          <option value="one-to-five">1–5 workspaces</option>
          <option value="six-plus">6+ workspaces</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="agency-activity">Activity</Label>
        <Select
          className="mt-1.5"
          id="agency-activity"
          onChange={(event) =>
            onChange(
              "activity",
              event.target.value as AgencyFilters["activity"],
            )
          }
          value={filters.activity}
        >
          <option value="all">Any activity</option>
          <option value="recent">Recent</option>
          <option value="stale">One month or older</option>
        </Select>
      </div>
      <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-end sm:justify-between lg:col-span-5">
        <div className="w-full sm:w-52">
          <Label htmlFor="agency-preview-state">Preview state</Label>
          <Select
            className="mt-1.5"
            id="agency-preview-state"
            onChange={(event) =>
              setPreviewState(event.target.value as PreviewState)
            }
            value={previewState}
          >
            <option value="populated">Populated</option>
            <option value="empty">Empty collection</option>
            <option value="loading">Loading</option>
            <option value="error">Error</option>
          </Select>
        </div>
        {hasFilters && (
          <Button onClick={onClear} variant="ghost">
            Clear all filters
          </Button>
        )}
      </div>
    </FilterBar>
  );
}

function LoadingDirectory() {
  return (
    <div aria-busy="true" aria-label="Loading agencies" className="space-y-3">
      <Skeleton className="h-12 w-full" />
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton className="h-16 w-full" key={index} />
      ))}
    </div>
  );
}

export function AgencyDirectory() {
  const [filters, setFilters] = useState<AgencyFilters>(initialFilters);
  const [previewState, setPreviewState] = useState<PreviewState>("populated");
  const visibleAgencies = useMemo(() => filterAgencies(filters), [filters]);
  const setFilter = <Key extends keyof AgencyFilters>(
    key: Key,
    value: AgencyFilters[Key],
  ) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <PageStack>
      <PageHeader
        actions={
          <Button asChild>
            <Link href={routes.agencies.new}>
              <Plus aria-hidden className="size-4" /> Add agency
            </Link>
          </Button>
        }
        description="Manage agency profiles, administrators, defaults, and workspace access."
        isPreview
        title="Agencies"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Building2}
          label="Total agencies"
          value={formatNumber(agencyTotals.agencies)}
        />
        <MetricCard
          icon={Building2}
          label="Active agencies"
          value={formatNumber(agencyTotals.active)}
        />
        <MetricCard
          icon={Gauge}
          label="Total workspaces"
          value={formatNumber(agencyTotals.workspaces)}
        />
        <MetricCard
          icon={UsersRound}
          label="Agency users"
          value={formatNumber(agencyTotals.users)}
        />
      </div>
      <DirectoryFilters
        filters={filters}
        onChange={setFilter}
        onClear={() => setFilters(initialFilters)}
        previewState={previewState}
        setPreviewState={setPreviewState}
      />
      {previewState === "loading" && <LoadingDirectory />}
      {previewState === "error" && (
        <StatePanel
          action={
            <Button onClick={() => setPreviewState("populated")}>
              Return to directory
            </Button>
          }
          description="The agency directory preview could not load its sample content. No live request was made."
          kind="error"
          title="Agencies unavailable"
        />
      )}
      {previewState === "empty" && (
        <StatePanel
          action={
            <Button asChild>
              <Link href={routes.agencies.new}>
                <Plus aria-hidden className="size-4" /> Add the first agency
              </Link>
            </Button>
          }
          description="Create an agency profile to organize client workspaces, defaults, and administrators."
          kind="empty"
          title="No agencies yet"
        />
      )}
      {previewState === "populated" && visibleAgencies.length === 0 && (
        <StatePanel
          action={
            <Button
              onClick={() => setFilters(initialFilters)}
              variant="outline"
            >
              Clear filters
            </Button>
          }
          description="Try another name or remove one of the selected filters."
          kind="no-results"
          title="No agencies match these filters"
        />
      )}
      {previewState === "populated" && visibleAgencies.length > 0 && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              Showing{" "}
              <strong className="text-strong">{visibleAgencies.length}</strong>{" "}
              of {agencyTotals.agencies} sample agencies
            </p>
            <Badge tone="neutral">Priority columns on mobile</Badge>
          </div>
          <DataTable
            caption="Agency directory"
            columns={columns}
            getRowKey={(agency) => agency.id}
            mobileCard={(agency) => <AgencyCard agency={agency} />}
            rows={visibleAgencies}
          />
          <nav
            aria-label="Agency pagination"
            className="bg-card flex items-center justify-between rounded-lg border p-3"
          >
            <p className="text-muted-foreground text-sm">
              Page 1 of 1 · Sample data
            </p>
            <div className="flex gap-2">
              <Button
                aria-label="Previous page"
                disabled
                size="icon"
                variant="outline"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                aria-label="Next page"
                disabled
                size="icon"
                variant="outline"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </nav>
        </>
      )}
    </PageStack>
  );
}
