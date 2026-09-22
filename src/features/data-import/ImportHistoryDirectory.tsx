"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FilterBar, PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { PaginatedCombobox } from "@/components/shared/PaginatedCombobox";
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
import { hasCapability } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import type { ClientRecord, WorkspaceRecord } from "@/features/workspaces/contracts";
import { useInfiniteClients, useInfiniteWorkspaces } from "@/features/workspaces/queries";
import { formatDate, formatNumber } from "@/lib/formatters";
import { useScope } from "@/providers/ScopeProvider";

import {
  csvImportTypes,
  datasetTypeLabels,
  type ImportHistoryStatus,
  importHistoryStatuses,
} from "./contracts";
import { useImportHistory } from "./queries";

function uniqueById<Option extends { id: number }>(options: Option[]) {
  return [...new Map(options.map((option) => [option.id, option])).values()];
}

const knownStatuses = new Set<string>(importHistoryStatuses);

function ImportStatusBadge({ status }: { status: string }) {
  if (knownStatuses.has(status))
    return <StatusBadge status={status as ImportHistoryStatus} />;
  return <Badge>{status}</Badge>;
}

function LoadingRows() {
  return (
    <div aria-busy="true" aria-label="Loading import history" className="space-y-3">
      <Skeleton className="h-12 w-full" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton className="h-14 w-full" key={index} />
      ))}
    </div>
  );
}

export function ImportHistoryDirectory({
  page,
  type,
  status,
  dateFrom,
  dateTo,
}: {
  page: number;
  type: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const scope = useScope();
  const canViewHistory = Boolean(
    currentUser.data && hasCapability(currentUser.data, "importHistory.view"),
  );

  const agencyId = scope.agencyId;

  const [clientSearch, setClientSearch] = useState("");
  const [client, setClient] = useState<ClientRecord>();
  const clientsQuery = useInfiniteClients(agencyId ?? 0, clientSearch);
  const clientOptions = uniqueById(
    clientsQuery.data?.pages.flatMap((entry) => entry.data) ?? [],
  );

  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceRecord>();
  const workspacesQuery = useInfiniteWorkspaces(
    agencyId ?? 0,
    client?.id ?? 0,
    workspaceSearch,
  );
  const workspaceOptions = uniqueById(
    workspacesQuery.data?.pages.flatMap((entry) => entry.data) ?? [],
  );

  const [priorAgencyId, setPriorAgencyId] = useState(agencyId);
  if (priorAgencyId !== agencyId) {
    setPriorAgencyId(agencyId);
    setClient(undefined);
    setWorkspace(undefined);
  }

  // The import-history endpoint has no agency-scoping parameter yet, only
  // workspace_id, so header agency scope narrows the client/workspace
  // pickers above but isn't sent to the request itself.
  const filters = {
    workspace_id: workspace?.id,
    type: csvImportTypes.includes(type as (typeof csvImportTypes)[number])
      ? (type as (typeof csvImportTypes)[number])
      : undefined,
    status: status || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
    per_page: 20,
  };
  const historyQuery = useImportHistory(filters, canViewHistory);
  const entries = historyQuery.data?.data ?? [];

  function updateQuery(next: Partial<Record<string, string | number | undefined>>) {
    const params = new URLSearchParams();
    if (workspace) params.set("workspace_id", String(workspace.id));
    if (filters.type) params.set("type", filters.type);
    if (filters.status) params.set("status", filters.status);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    params.set("page", "1");
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    }
    router.replace(`${routes.importHistory}?${params}`);
  }

  function changePage(nextPage: number) {
    const params = new URLSearchParams();
    if (workspace) params.set("workspace_id", String(workspace.id));
    if (filters.type) params.set("type", filters.type);
    if (filters.status) params.set("status", filters.status);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    params.set("page", String(nextPage));
    router.replace(`${routes.importHistory}?${params}`);
  }

  const columns: readonly DataTableColumn<(typeof entries)[number]>[] = [
    {
      header: "File",
      id: "file",
      render: (entry) => (
        <span className="text-strong font-medium break-all">
          {entry.original_filename}
        </span>
      ),
    },
    {
      header: "Type",
      id: "type",
      render: (entry) =>
        datasetTypeLabels[entry.type as keyof typeof datasetTypeLabels] ??
        entry.type,
    },
    {
      header: "Status",
      id: "status",
      render: (entry) => <ImportStatusBadge status={entry.status} />,
    },
    {
      header: "Mode",
      id: "mode",
      render: (entry) => entry.mode ?? "--",
    },
    {
      header: "Rows",
      id: "rows",
      render: (entry) => (
        <span>
          {formatNumber(entry.valid_count)} / {formatNumber(entry.row_count)}
        </span>
      ),
    },
    {
      header: "Uploaded",
      id: "created",
      render: (entry) => (entry.created_at ? formatDate(entry.created_at) : "--"),
    },
    {
      header: "Completed",
      id: "completed",
      render: (entry) =>
        entry.completed_at ? formatDate(entry.completed_at) : "--",
    },
  ];

  return (
    <PageStack>
      <PageHeader
        description="Review CSV imports across your permitted agencies and workspaces."
        title="Import history"
      />

      {currentUser.isSuccess && !canViewHistory && (
        <StatePanel
          description="Import history is restricted for your role. Contact an administrator for access."
          kind="permission"
          title="You do not have access to import history"
        />
      )}

      {canViewHistory && (
        <>
          <FilterBar className="flex-wrap">
            <div className="w-full sm:max-w-56">
              <Label htmlFor="history-client">Client</Label>
              <div className="mt-1.5">
                <PaginatedCombobox
                  disabled={!agencyId}
                  getKey={(option) => String(option.id)}
                  getLabel={(option) => option.name}
                  hasNextPage={clientsQuery.hasNextPage}
                  id="history-client"
                  isFetchingNextPage={clientsQuery.isFetchingNextPage}
                  isLoading={clientsQuery.isPending && Boolean(agencyId)}
                  loadNextPage={() => void clientsQuery.fetchNextPage()}
                  mode="single"
                  onChange={(next) => {
                    setClient(next);
                    setWorkspace(undefined);
                  }}
                  onSearchChange={setClientSearch}
                  options={clientOptions}
                  placeholder={agencyId ? "All clients" : "Select an agency first"}
                  renderOption={(option) => option.name}
                  searchPlaceholder="Search client name"
                  value={client}
                />
              </div>
            </div>
            <div className="w-full sm:max-w-56">
              <Label htmlFor="history-workspace">Workspace</Label>
              <div className="mt-1.5">
                <PaginatedCombobox
                  disabled={!client}
                  getKey={(option) => String(option.id)}
                  getLabel={(option) => option.name}
                  hasNextPage={workspacesQuery.hasNextPage}
                  id="history-workspace"
                  isFetchingNextPage={workspacesQuery.isFetchingNextPage}
                  isLoading={workspacesQuery.isPending && Boolean(client)}
                  loadNextPage={() => void workspacesQuery.fetchNextPage()}
                  mode="single"
                  onChange={(next) => {
                    setWorkspace(next);
                    updateQuery({ workspace_id: next.id });
                  }}
                  onSearchChange={setWorkspaceSearch}
                  options={workspaceOptions}
                  placeholder={client ? "All workspaces" : "Select a client first"}
                  renderOption={(option) => option.name}
                  searchPlaceholder="Search workspace name"
                  value={workspace}
                />
              </div>
            </div>
            <div className="w-full sm:max-w-40">
              <Label htmlFor="history-type">Dataset</Label>
              <Select
                className="mt-1.5"
                id="history-type"
                onChange={(event) => updateQuery({ type: event.target.value })}
                value={type}
              >
                <option value="">All datasets</option>
                {csvImportTypes.map((value) => (
                  <option key={value} value={value}>
                    {datasetTypeLabels[value]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-full sm:max-w-40">
              <Label htmlFor="history-status">Status</Label>
              <Select
                className="mt-1.5"
                id="history-status"
                onChange={(event) => updateQuery({ status: event.target.value })}
                value={status}
              >
                <option value="">All statuses</option>
                {importHistoryStatuses.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-full sm:max-w-40">
              <Label htmlFor="history-date-from">From</Label>
              <Input
                className="mt-1.5"
                id="history-date-from"
                onChange={(event) => updateQuery({ date_from: event.target.value })}
                type="date"
                value={dateFrom}
              />
            </div>
            <div className="w-full sm:max-w-40">
              <Label htmlFor="history-date-to">To</Label>
              <Input
                className="mt-1.5"
                id="history-date-to"
                onChange={(event) => updateQuery({ date_to: event.target.value })}
                type="date"
                value={dateTo}
              />
            </div>
          </FilterBar>

          {historyQuery.isPending && <LoadingRows />}
          {historyQuery.isError && (
            <StatePanel
              action={
                <Button onClick={() => historyQuery.refetch()}>Try again</Button>
              }
              description="Import history could not be loaded. Please try again."
              kind="error"
              title="Import history unavailable"
            />
          )}
          {historyQuery.isSuccess && entries.length === 0 && (
            <StatePanel
              description="No CSV imports match these filters yet."
              kind="no-results"
              title="No import history"
            />
          )}
          {historyQuery.isSuccess && entries.length > 0 && (
            <>
              <p className="text-muted-foreground text-sm">
                Showing <strong className="text-strong">{entries.length}</strong>{" "}
                of {historyQuery.data.meta.total} imports
              </p>
              <DataTable
                caption="Import history"
                columns={columns}
                getRowKey={(entry) => String(entry.id)}
                mobileCard={(entry) => (
                  <Card>
                    <CardContent className="space-y-2 pt-4 text-sm sm:pt-5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-strong truncate font-medium">
                          {entry.original_filename}
                        </p>
                        <ImportStatusBadge status={entry.status} />
                      </div>
                      <p className="text-muted-foreground">
                        {datasetTypeLabels[
                          entry.type as keyof typeof datasetTypeLabels
                        ] ?? entry.type}{" "}
                        · {entry.mode ?? "--"}
                      </p>
                      <p>
                        {formatNumber(entry.valid_count)} /{" "}
                        {formatNumber(entry.row_count)} rows
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Uploaded{" "}
                        {entry.created_at ? formatDate(entry.created_at) : "--"}
                      </p>
                    </CardContent>
                  </Card>
                )}
                rows={entries}
              />
              <nav
                aria-label="Import history pagination"
                className="bg-card flex items-center justify-between rounded-lg border p-3"
              >
                <p className="text-muted-foreground text-sm">
                  Page {historyQuery.data.meta.current_page} of{" "}
                  {historyQuery.data.meta.last_page}
                </p>
                <div className="flex gap-2">
                  <Button
                    aria-label="Previous page"
                    disabled={historyQuery.data.meta.current_page <= 1}
                    onClick={() => changePage(historyQuery.data.meta.current_page - 1)}
                    size="icon"
                    variant="outline"
                  >
                    <ChevronLeft aria-hidden className="size-4" />
                  </Button>
                  <Button
                    aria-label="Next page"
                    disabled={
                      historyQuery.data.meta.current_page >=
                      historyQuery.data.meta.last_page
                    }
                    onClick={() => changePage(historyQuery.data.meta.current_page + 1)}
                    size="icon"
                    variant="outline"
                  >
                    <ChevronRight aria-hidden className="size-4" />
                  </Button>
                </div>
              </nav>
            </>
          )}
        </>
      )}
    </PageStack>
  );
}
