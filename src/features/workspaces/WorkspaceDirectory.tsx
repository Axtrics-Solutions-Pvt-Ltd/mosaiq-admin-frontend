"use client";

import { ChevronLeft, ChevronRight, FolderKanban, Plus } from "lucide-react";
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
import { routes, workspaceDetailUrl, workspaceEditUrl } from "@/config/routes";
import { useAgencies } from "@/features/agencies/queries";
import { useCurrentUser } from "@/features/auth/queries";
import { formatDate, formatNumber } from "@/lib/formatters";
import { useScope } from "@/providers/ScopeProvider";

import type { WorkspaceRecord } from "./contracts";
import { useAllWorkspaces } from "./queries";

type Filters = {
  search: string;
  status: "all" | "active" | "inactive";
  page: number;
};
function WorkspaceCard({
  record,
  agencyName,
  clientName,
}: {
  record: WorkspaceRecord;
  agencyName: string;
  clientName: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <Link
            className="text-strong hover:text-primary font-semibold"
            href={workspaceDetailUrl(
              record.id,
              record.agency_id,
              record.client_id,
            )}
          >
            {record.name}
          </Link>
          <StatusBadge status={record.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          {clientName} / {agencyName}
        </p>
        <p className="text-muted-foreground text-sm">
          {record.currency} / {record.timezone}
        </p>
        <Button asChild size="sm" variant="outline">
          <Link
            href={workspaceEditUrl(
              record.id,
              record.agency_id,
              record.client_id,
            )}
          >
            Edit workspace
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
export function WorkspaceDirectory({ filters }: { filters: Filters }) {
  const router = useRouter();
  const user = useCurrentUser();
  const scope = useScope();
  const agenciesQuery = useAgencies({ page: 1 });
  const agencies = agenciesQuery.data?.data ?? [];
  const agencyId = scope.agencyId;
  const query = useAllWorkspaces(agencyId, {
    search: filters.search || undefined,
    status: filters.status === "all" ? undefined : filters.status,
    page: filters.page,
  });
  const records = query.data?.data ?? [];
  const agencyNameById = new Map(
    agencies.map((agency) => [agency.id, agency.display_name]),
  );
  const agencyName = (id: number) =>
    agencyNameById.get(id) ?? `Agency #${id}`;
  const canManage =
    user.data?.platformRoleCode === "SUPER_ADMIN" ||
    (user.data?.membership?.roleCode === "AGENCY_ADMIN" &&
      Boolean(agencyId) &&
      user.data.membership.agencyId === agencyId);
  const hasFilters = Boolean(filters.search) || filters.status !== "all";
  const columns: readonly DataTableColumn<WorkspaceRecord>[] = [
    {
      id: "workspace",
      header: "Workspace",
      render: (record) => (
        <Link
          className="text-strong hover:text-primary font-medium"
          href={workspaceDetailUrl(
            record.id,
            record.agency_id,
            record.client_id,
          )}
        >
          {record.name}
        </Link>
      ),
    },
    {
      id: "client",
      header: "Client",
      render: (record) => `Client #${record.client_id}`,
    },
    {
      id: "agency",
      header: "Agency",
      render: (record) => agencyName(record.agency_id),
    },
    { id: "currency", header: "Currency", render: (record) => record.currency },
    { id: "zone", header: "Time zone", render: (record) => record.timezone },
    {
      id: "status",
      header: "Status",
      render: (record) => <StatusBadge status={record.status} />,
    },
    {
      id: "updated",
      header: "Updated",
      render: (record) =>
        record.updated_at ? formatDate(record.updated_at) : "",
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      render: (record) => (
        <Link
          className="text-primary hover:underline"
          href={workspaceEditUrl(record.id, record.agency_id, record.client_id)}
        >
          Edit
        </Link>
      ),
    },
  ];
  function replace(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    router.replace(routes.workspaces.index + (params.size ? "?" + params : ""));
  }
  return (
    <PageStack>
      <PageHeader
        title="Client Workspaces"
        description="Manage client workspaces across all agencies or within the selected agency."
        actions={
          canManage ? (
            <Button asChild>
              <Link
                href={
                  agencyId
                    ? `${routes.workspaces.new}?agency=${agencyId}`
                    : routes.workspaces.new
                }
              >
                <Plus aria-hidden className="size-4" /> Add workspace
              </Link>
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={FolderKanban}
          label="Workspaces matching filters"
          value={formatNumber(query.data?.meta.total ?? 0)}
        />
        <MetricCard
          icon={FolderKanban}
          label="Active on this page"
          value={formatNumber(
            records.filter((record) => record.status === "active").length,
          )}
        />
        <MetricCard
          icon={FolderKanban}
          label="Inactive on this page"
          value={formatNumber(
            records.filter((record) => record.status === "inactive").length,
          )}
        />
      </div>
      <FilterBar className="lg:grid lg:grid-cols-2">
        <div>
          <Label htmlFor="workspace-search">Search workspaces</Label>
          <Input
            id="workspace-search"
            className="mt-1.5"
            value={filters.search}
            onChange={(event) =>
              replace({ search: event.target.value, page: undefined })
            }
            placeholder="Workspace name"
          />
        </div>
        <div>
          <Label htmlFor="workspace-status">Status</Label>
          <Select
            id="workspace-status"
            className="mt-1.5"
            value={filters.status}
            onChange={(event) =>
              replace({ status: event.target.value, page: undefined })
            }
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </FilterBar>
      <p className="text-muted-foreground text-xs">
        Module, data source, account manager, and freshness filters are not
        offered here because the workspace API does not return that data yet
        — see the handoff notes.
      </p>
      {(agenciesQuery.isPending || query.isPending) && (
        <p aria-busy="true">Loading workspaces...</p>
      )}
      {(agenciesQuery.isError || query.isError) && (
        <StatePanel
          kind="error"
          title="Workspaces unavailable"
          description="The workspace list could not be loaded."
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
        />
      )}
      {agenciesQuery.isSuccess && agencies.length === 0 && (
        <StatePanel
          kind="empty"
          title="No agencies"
          description="Create an agency before adding client workspaces."
        />
      )}
      {query.isSuccess && records.length === 0 && (
        <StatePanel
          kind={hasFilters ? "no-results" : "empty"}
          title={hasFilters ? "No matching workspaces" : "No workspaces yet"}
          description={
            hasFilters
              ? "Try another search or status."
              : "Add a workspace to get started."
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() =>
                  replace({
                    search: undefined,
                    status: undefined,
                    page: undefined,
                  })
                }
              >
                Clear filters
              </Button>
            ) : canManage ? (
              <Button asChild>
                <Link
                  href={
                    agencyId
                      ? `${routes.workspaces.new}?agency=${agencyId}`
                      : routes.workspaces.new
                  }
                >
                  Add workspace
                </Link>
              </Button>
            ) : undefined
          }
        />
      )}
      {query.isSuccess && records.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-sm">
              Showing {records.length} of {query.data.meta.total} workspaces
            </p>
            <Badge tone="neutral">Priority columns on mobile</Badge>
          </div>
          <DataTable
            caption="Workspace directory"
            columns={columns}
            getRowKey={(record) => String(record.id)}
            mobileCard={(record) => (
              <WorkspaceCard
                record={record}
                agencyName={agencyName(record.agency_id)}
                clientName={`Client #${record.client_id}`}
              />
            )}
            rows={records}
          />
          <nav
            aria-label="Workspace pagination"
            className="bg-card flex items-center justify-between rounded-lg border p-3"
          >
            <p className="text-muted-foreground text-sm">
              Page {query.data.meta.current_page} of {query.data.meta.last_page}
            </p>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="outline"
                aria-label="Previous page"
                disabled={filters.page <= 1}
                onClick={() => replace({ page: String(filters.page - 1) })}
              >
                <ChevronLeft aria-hidden className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                aria-label="Next page"
                disabled={filters.page >= query.data.meta.last_page}
                onClick={() => replace({ page: String(filters.page + 1) })}
              >
                <ChevronRight aria-hidden className="size-4" />
              </Button>
            </div>
          </nav>
        </>
      )}
    </PageStack>
  );
}
