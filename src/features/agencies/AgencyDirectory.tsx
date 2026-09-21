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
import { useRouter } from "next/navigation";

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
import { useAgencies } from "@/features/agencies/queries";
import { toAgencySummary } from "@/features/agencies/remote-model";
import type {
  AgencyFilters,
  AgencySummary,
} from "@/features/agencies/view-model";
import { hasCapability } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import { formatDate, formatNumber } from "@/lib/formatters";

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
      <AgencyLogo
        name={agency.name}
        tone={agency.logoTone}
        url={agency.logoUrl}
      />
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
    render: (agency) =>
      agency.createdAt ? (
        <time dateTime={agency.createdAt}>{formatDate(agency.createdAt)}</time>
      ) : (
        "--"
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

export function AgencyDirectory({
  filters,
  page,
}: {
  filters: AgencyFilters;
  page: number;
}) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const requestFilters = {
    search: filters.search || undefined,
    status: filters.status === "all" ? undefined : filters.status,
    currency: filters.currency === "all" ? undefined : filters.currency,
    workspace_count:
      filters.workspaces === "all" ? undefined : filters.workspaces,
    activity: filters.activity === "all" ? undefined : filters.activity,
    page,
  };
  const query = useAgencies(requestFilters);
  const agencies = query.data?.data.map(toAgencySummary) ?? [];
  const summary = query.data?.meta.summary;
  const canCreate = Boolean(
    currentUser.data && hasCapability(currentUser.data, "agencies.create"),
  );
  const hasFilters =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.currency !== "all" ||
    filters.workspaces !== "all" ||
    filters.activity !== "all";

  function changeFilter(key: keyof AgencyFilters, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.replace(
      `${routes.agencies.index}${params.size ? `?${params}` : ""}`,
    );
  }
  function changePage(nextPage: number) {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(nextPage));
    router.replace(`${routes.agencies.index}?${params}`);
  }
  const currencies = [
    ...new Set([
      "AUD",
      "EUR",
      "GBP",
      "INR",
      "USD",
      filters.currency,
      ...agencies.map((agency) => agency.currency),
    ]),
  ].filter((value) => value !== "all");

  return (
    <PageStack>
      <PageHeader
        actions={
          canCreate ? (
            <Button asChild>
              <Link href={routes.agencies.new}>
                <Plus aria-hidden className="size-4" /> Add agency
              </Link>
            </Button>
          ) : undefined
        }
        description="Manage agency profiles, administrators, defaults, and workspace access."
        title="Agencies"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Building2}
          label="Total agencies"
          value={formatNumber(summary?.total_agencies ?? 0)}
        />
        <MetricCard
          icon={Building2}
          label="Active agencies"
          value={formatNumber(summary?.active_agencies ?? 0)}
        />
        <MetricCard
          icon={Gauge}
          label="Total workspaces"
          value={formatNumber(summary?.total_workspaces ?? 0)}
        />
        <MetricCard
          icon={UsersRound}
          label="Agency users"
          value={formatNumber(summary?.total_agency_users ?? 0)}
        />
      </div>
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
              onChange={(event) => changeFilter("search", event.target.value)}
              placeholder="Agency name"
              value={filters.search}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="agency-status">Status</Label>
          <Select
            className="mt-1.5"
            id="agency-status"
            onChange={(event) => changeFilter("status", event.target.value)}
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
            onChange={(event) => changeFilter("currency", event.target.value)}
            value={filters.currency}
          >
            <option value="all">All currencies</option>
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="agency-workspaces">Workspaces</Label>
          <Select
            className="mt-1.5"
            id="agency-workspaces"
            onChange={(event) => changeFilter("workspaces", event.target.value)}
            value={filters.workspaces}
          >
            <option value="all">Any count</option>
            <option value="none">No workspaces</option>
            <option value="one-to-five">1-5 workspaces</option>
            <option value="six-plus">6+ workspaces</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="agency-activity">Activity</Label>
          <Select
            className="mt-1.5"
            id="agency-activity"
            onChange={(event) => changeFilter("activity", event.target.value)}
            value={filters.activity}
          >
            <option value="all">Any activity</option>
            <option value="recent">Recent</option>
            <option value="stale">One month or older</option>
          </Select>
        </div>
        {hasFilters && (
          <div className="lg:col-span-5">
            <Button
              onClick={() => router.replace(routes.agencies.index)}
              variant="ghost"
            >
              Clear all filters
            </Button>
          </div>
        )}
      </FilterBar>
      {query.isPending && <LoadingDirectory />}
      {query.isError && (
        <StatePanel
          action={<Button onClick={() => query.refetch()}>Try again</Button>}
          description="The agency directory could not be loaded. Please try again."
          kind="error"
          title="Agencies unavailable"
        />
      )}
      {query.isSuccess && agencies.length === 0 && (
        <StatePanel
          action={
            hasFilters ? (
              <Button
                onClick={() => router.replace(routes.agencies.index)}
                variant="outline"
              >
                Clear filters
              </Button>
            ) : canCreate ? (
              <Button asChild>
                <Link href={routes.agencies.new}>Add the first agency</Link>
              </Button>
            ) : undefined
          }
          description={
            hasFilters
              ? "Try another name or remove a filter."
              : "Create an agency profile to organize clients and workspaces."
          }
          kind={hasFilters ? "no-results" : "empty"}
          title={
            hasFilters ? "No agencies match these filters" : "No agencies yet"
          }
        />
      )}
      {query.isSuccess && agencies.length > 0 && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              Showing <strong className="text-strong">{agencies.length}</strong>{" "}
              of {query.data.meta.total} agencies
            </p>
            <Badge tone="neutral">Priority columns on mobile</Badge>
          </div>
          <DataTable
            caption="Agency directory"
            columns={columns}
            getRowKey={(agency) => agency.id}
            mobileCard={(agency) => <AgencyCard agency={agency} />}
            rows={agencies}
          />
          <nav
            aria-label="Agency pagination"
            className="bg-card flex items-center justify-between rounded-lg border p-3"
          >
            <p className="text-muted-foreground text-sm">
              Page {query.data.meta.current_page} of {query.data.meta.last_page}
            </p>
            <div className="flex gap-2">
              <Button
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => changePage(page - 1)}
                size="icon"
                variant="outline"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                aria-label="Next page"
                disabled={page >= query.data.meta.last_page}
                onClick={() => changePage(page + 1)}
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
