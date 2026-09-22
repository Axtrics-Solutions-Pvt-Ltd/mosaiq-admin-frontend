"use client";

import {
  Building,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Eye,
  FolderKanban,
  Gauge,
  Pencil,
  Plus,
  Search,
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
import {
  clientDetailUrl,
  clientEditUrl,
  routes,
  workspaceScope,
} from "@/config/routes";
import { useAgencies } from "@/features/agencies/queries";
import { hasCapability } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import { formatDate, formatNumber } from "@/lib/formatters";
import { useScope } from "@/providers/ScopeProvider";

import { useClientsDirectory } from "./queries";
import { type ClientSummary, toClientSummary } from "./view-model";

type Filters = {
  search: string;
  status: "all" | "active" | "inactive";
  agency: number | undefined;
  page: number;
};

function ClientActions({ client }: { client: ClientSummary }) {
  return (
    <details className="relative">
      <summary
        aria-label={`Open actions for ${client.name}`}
        className="hover:bg-muted focus-visible:ring-ring flex size-9 list-none items-center justify-center rounded-sm focus-visible:ring-2 [&::-webkit-details-marker]:hidden"
      >
        <Ellipsis aria-hidden className="size-4" />
      </summary>
      <div className="bg-card absolute right-0 z-20 mt-1 w-56 rounded-lg border p-1.5 shadow-[var(--shadow-overlay)]">
        <Link
          className="hover:bg-muted flex items-center gap-2 rounded-sm px-3 py-2"
          href={clientDetailUrl(Number(client.id), client.agencyId)}
        >
          <Eye aria-hidden className="size-4" /> View client
        </Link>
        <Link
          className="hover:bg-muted flex items-center gap-2 rounded-sm px-3 py-2"
          href={clientEditUrl(Number(client.id), client.agencyId)}
        >
          <Pencil aria-hidden className="size-4" /> Edit client
        </Link>
        <Link
          className="hover:bg-muted flex items-center gap-2 rounded-sm px-3 py-2"
          href={`${routes.workspaces.index}?agency=${client.agencyId}&client=${client.id}`}
        >
          <Gauge aria-hidden className="size-4" /> Open workspaces
        </Link>
        <Link
          className="hover:bg-muted flex items-center gap-2 rounded-sm px-3 py-2"
          href={
            routes.workspaces.new +
            workspaceScope(client.agencyId, Number(client.id))
          }
        >
          <Plus aria-hidden className="size-4" /> Add workspace
        </Link>
      </div>
    </details>
  );
}

function ClientIdentity({ client }: { client: ClientSummary }) {
  return (
    <Link
      className="group flex min-w-40 flex-col"
      href={clientDetailUrl(Number(client.id), client.agencyId)}
    >
      <span className="text-strong group-hover:text-primary font-medium">
        {client.name}
      </span>
      <span className="text-muted-foreground text-xs">{client.id}</span>
    </Link>
  );
}

function ClientCard({ client }: { client: ClientSummary }) {
  return (
    <Card>
      <CardContent className="pt-4 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <ClientIdentity client={client} />
          <ClientActions client={client} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Agency</dt>
            <dd className="text-strong mt-0.5 truncate font-medium">
              {client.agencyName}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={client.status} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Workspaces</dt>
            <dd className="text-strong mt-0.5 tabular-nums">
              {client.workspaceCount}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Created</dt>
            <dd className="text-strong mt-0.5">
              {client.createdAt ? formatDate(client.createdAt) : "--"}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export function ClientDirectory({ filters }: { filters: Filters }) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const scope = useScope();
  const agenciesQuery = useAgencies({ page: 1 });
  const agencies = agenciesQuery.data?.data ?? [];
  const isAllAgencies = !scope.agencyId;
  const filterAgencyId = scope.agencyId ?? filters.agency;
  const query = useClientsDirectory(filterAgencyId, {
    search: filters.search || undefined,
    status: filters.status === "all" ? undefined : filters.status,
    page: filters.page,
  });
  const agencyNameById = new Map(
    agencies.map((agency) => [agency.id, agency.display_name]),
  );
  const clients =
    query.data?.data.map((record) =>
      toClientSummary(
        record,
        agencyNameById.get(record.agency_id) ?? `Agency #${record.agency_id}`,
      ),
    ) ?? [];
  const canCreate = Boolean(
    currentUser.data && hasCapability(currentUser.data, "clients.manage"),
  );
  const hasFilters =
    filters.search !== "" ||
    filters.status !== "all" ||
    Boolean(filters.agency);

  function replace(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    router.replace(routes.clients.index + (params.size ? "?" + params : ""));
  }

  const columns: readonly DataTableColumn<ClientSummary>[] = [
    {
      id: "client",
      header: "Client",
      render: (client) => <ClientIdentity client={client} />,
    },
    ...(isAllAgencies
      ? [
          {
            id: "agency",
            header: "Agency",
            render: (client: ClientSummary) => client.agencyName,
          } satisfies DataTableColumn<ClientSummary>,
        ]
      : []),
    {
      id: "workspaces",
      header: "Workspaces",
      align: "right",
      render: (client) => client.workspaceCount,
    },
    {
      id: "status",
      header: "Status",
      render: (client) => <StatusBadge status={client.status} />,
    },
    {
      id: "created",
      header: "Created",
      render: (client) =>
        client.createdAt ? (
          <time dateTime={client.createdAt}>
            {formatDate(client.createdAt)}
          </time>
        ) : (
          "--"
        ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      render: (client) => <ClientActions client={client} />,
    },
  ];

  return (
    <PageStack>
      <PageHeader
        title="Clients"
        description="Manage clients between agencies and their workspaces."
        actions={
          canCreate ? (
            <Button asChild>
              <Link
                href={
                  filterAgencyId
                    ? `${routes.clients.new}?agency=${filterAgencyId}`
                    : routes.clients.new
                }
              >
                <Plus aria-hidden className="size-4" /> Add client
              </Link>
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={Building}
          label="Clients matching filters"
          value={formatNumber(query.data?.meta.total ?? 0)}
        />
        <MetricCard
          icon={Building}
          label="Active on this page"
          value={formatNumber(
            clients.filter((client) => client.status === "active").length,
          )}
        />
        <MetricCard
          icon={FolderKanban}
          label="Workspaces on this page"
          value={formatNumber(
            clients.reduce((total, client) => total + client.workspaceCount, 0),
          )}
        />
      </div>
      <FilterBar
        className={
          isAllAgencies
            ? "lg:grid lg:grid-cols-[minmax(13rem,1.4fr)_repeat(3,minmax(8rem,1fr))]"
            : "lg:grid lg:grid-cols-2"
        }
      >
        <div>
          <Label htmlFor="client-search">Search clients</Label>
          <div className="relative mt-1.5">
            <Search
              aria-hidden
              className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              className="pl-9"
              id="client-search"
              onChange={(event) =>
                replace({ search: event.target.value, page: undefined })
              }
              placeholder="Client name"
              value={filters.search}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="client-status">Status</Label>
          <Select
            className="mt-1.5"
            id="client-status"
            onChange={(event) =>
              replace({ status: event.target.value, page: undefined })
            }
            value={filters.status}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        {isAllAgencies && (
          <div>
            <Label htmlFor="client-agency">Agency</Label>
            <Select
              className="mt-1.5"
              id="client-agency"
              onChange={(event) =>
                replace({ agency: event.target.value, page: undefined })
              }
              value={filters.agency ? String(filters.agency) : "all"}
            >
              <option value="all">All agencies</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.display_name}
                </option>
              ))}
            </Select>
          </div>
        )}
        {hasFilters && (
          <div className="lg:col-span-4">
            <Button
              onClick={() => router.replace(routes.clients.index)}
              variant="ghost"
            >
              Clear all filters
            </Button>
          </div>
        )}
      </FilterBar>
      {(agenciesQuery.isPending || query.isPending) && (
        <p aria-busy="true">Loading clients...</p>
      )}
      {(agenciesQuery.isError || query.isError) && (
        <StatePanel
          action={
            <Button
              onClick={() => {
                agenciesQuery.refetch();
                query.refetch();
              }}
            >
              Try again
            </Button>
          }
          description="The client directory could not be loaded. Please try again."
          kind="error"
          title="Clients unavailable"
        />
      )}
      {query.isSuccess && clients.length === 0 && (
        <StatePanel
          action={
            hasFilters ? (
              <Button
                onClick={() => router.replace(routes.clients.index)}
                variant="outline"
              >
                Clear filters
              </Button>
            ) : canCreate ? (
              <Button asChild>
                <Link
                  href={
                    filterAgencyId
                      ? `${routes.clients.new}?agency=${filterAgencyId}`
                      : routes.clients.new
                  }
                >
                  Add the first client
                </Link>
              </Button>
            ) : undefined
          }
          description={
            hasFilters
              ? "Try another name or remove a filter."
              : "Create a client to organize its workspaces."
          }
          kind={hasFilters ? "no-results" : "empty"}
          title={
            hasFilters ? "No clients match these filters" : "No clients yet"
          }
        />
      )}
      {query.isSuccess && clients.length > 0 && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              Showing <strong className="text-strong">{clients.length}</strong>{" "}
              of {query.data.meta.total} clients
            </p>
            <Badge tone="neutral">Priority columns on mobile</Badge>
          </div>
          <DataTable
            caption="Client directory"
            columns={columns}
            getRowKey={(client) => client.id}
            mobileCard={(client) => <ClientCard client={client} />}
            rows={clients}
          />
          <nav
            aria-label="Client pagination"
            className="bg-card flex items-center justify-between rounded-lg border p-3"
          >
            <p className="text-muted-foreground text-sm">
              Page {query.data.meta.current_page} of {query.data.meta.last_page}
            </p>
            <div className="flex gap-2">
              <Button
                aria-label="Previous page"
                disabled={filters.page <= 1}
                onClick={() => replace({ page: String(filters.page - 1) })}
                size="icon"
                variant="outline"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                aria-label="Next page"
                disabled={filters.page >= query.data.meta.last_page}
                onClick={() => replace({ page: String(filters.page + 1) })}
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
