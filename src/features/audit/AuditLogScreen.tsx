"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FilterBar, PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { routes, workspaceDetailUrl } from "@/config/routes";
import { hasCapability } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import { useAgencyWorkspaces } from "@/features/workspaces/queries";
import { formatDateTime } from "@/lib/formatters";
import { useScope } from "@/providers/ScopeProvider";

import {
  auditCategories,
  type AuditCategory,
  type AuditLogEntry,
} from "./contracts";
import {
  auditActionDetail,
  auditActionLabel,
  auditCategoryLabels,
} from "./labels";
import { useAuditLogs } from "./queries";

export type AuditLogScreenFilters = {
  page: number;
  category: "all" | AuditCategory;
  result: "all" | "success" | "failure";
  dateFrom: string;
  dateTo: string;
};

function ActionCell({ entry }: { entry: AuditLogEntry }) {
  const detail = auditActionDetail(entry);
  return (
    <div>
      <p className="text-strong font-medium">
        {auditActionLabel(entry.action)}
      </p>
      {detail && <p className="text-muted-foreground text-xs">{detail}</p>}
    </div>
  );
}

function WhereCell({
  entry,
  showAgency,
}: {
  entry: AuditLogEntry;
  showAgency: boolean;
}) {
  const workspace = entry.workspace;
  return (
    <div>
      {workspace && entry.agency ? (
        <Link
          className="text-strong hover:text-primary font-medium"
          href={workspaceDetailUrl(
            workspace.id,
            entry.agency.id,
            workspace.client_id,
          )}
        >
          {workspace.name}
        </Link>
      ) : (
        <span className="text-muted-foreground">{entry.subject_type}</span>
      )}
      {showAgency && (
        <p className="text-muted-foreground text-xs">
          {entry.agency?.name ?? "Platform"}
        </p>
      )}
    </div>
  );
}

function ResultCell({ entry }: { entry: AuditLogEntry }) {
  return (
    <StatusBadge status={entry.result === "failure" ? "failed" : "completed"} />
  );
}

function EntryTime({ entry }: { entry: AuditLogEntry }) {
  return entry.created_at ? (
    <time className="whitespace-nowrap" dateTime={entry.created_at}>
      {formatDateTime(entry.created_at)}
    </time>
  ) : (
    <>--</>
  );
}

function buildColumns(showAgency: boolean) {
  const columns: readonly DataTableColumn<AuditLogEntry>[] = [
    {
      id: "time",
      header: "When",
      render: (entry) => <EntryTime entry={entry} />,
    },
    {
      id: "action",
      header: "Action",
      render: (entry) => <ActionCell entry={entry} />,
    },
    {
      id: "actor",
      header: "By",
      render: (entry) => entry.actor?.name ?? "System",
    },
    {
      id: "where",
      header: "Where",
      render: (entry) => <WhereCell entry={entry} showAgency={showAgency} />,
    },
    {
      id: "result",
      header: "Result",
      render: (entry) => <ResultCell entry={entry} />,
    },
  ];
  return columns;
}

function EntryCard({
  entry,
  showAgency,
}: {
  entry: AuditLogEntry;
  showAgency: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-4 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <ActionCell entry={entry} />
          <ResultCell entry={entry} />
        </div>
        <WhereCell entry={entry} showAgency={showAgency} />
        <p className="text-muted-foreground text-xs">
          {entry.actor?.name ?? "System"} · <EntryTime entry={entry} />
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingEntries() {
  return (
    <div aria-busy="true" aria-label="Loading audit log" className="space-y-3">
      <Skeleton className="h-12 w-full" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton className="h-14 w-full" key={index} />
      ))}
    </div>
  );
}

export function AuditLogScreen({
  page,
  category,
  result,
  dateFrom,
  dateTo,
}: AuditLogScreenFilters) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const scope = useScope();
  const canView = Boolean(
    currentUser.data && hasCapability(currentUser.data, "audit.view"),
  );
  const logs = useAuditLogs(
    {
      agency_id: scope.agencyId,
      workspace_id: scope.workspaceId,
      category: category === "all" ? undefined : category,
      result: result === "all" ? undefined : result,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page,
    },
    { enabled: canView },
  );
  const workspacesQuery = useAgencyWorkspaces(scope.agencyId ?? 0, {
    status: "active",
    per_page: 100,
  });
  const entries = logs.data?.data ?? [];
  const showAgency = !scope.agencyId;
  const hasFilters =
    category !== "all" || result !== "all" || dateFrom !== "" || dateTo !== "";

  function updateParams(key: string, value: string, emptyValue = "") {
    const params = new URLSearchParams(window.location.search);
    if (value === emptyValue) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.replace(`${routes.governance}${params.size ? `?${params}` : ""}`);
  }

  function changePage(nextPage: number) {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(nextPage));
    router.replace(`${routes.governance}?${params}`);
  }

  return (
    <PageStack>
      <PageHeader
        context={scope.agencyId ? undefined : "All agencies"}
        description="Who changed what across agencies, clients, workspaces, users and reports."
        title="Audit log"
      />
      {currentUser.isPending && <LoadingEntries />}
      {currentUser.isSuccess && !canView && (
        <StatePanel
          description="Only Super Admins and Agency Admins can read the audit log."
          kind="permission"
          title="Audit log unavailable"
        />
      )}
      {canView && (
        <>
          <FilterBar className="lg:grid lg:grid-cols-5">
            <div>
              <Label htmlFor="audit-workspace">Workspace</Label>
              <Select
                className="mt-1.5"
                disabled={!scope.agencyId || workspacesQuery.isPending}
                id="audit-workspace"
                onChange={(event) => {
                  scope.setWorkspaceId(
                    event.target.value ? Number(event.target.value) : undefined,
                  );
                  updateParams("page", "");
                }}
                title={
                  scope.agencyId
                    ? undefined
                    : "Choose an agency to filter by workspace"
                }
                value={scope.workspaceId ? String(scope.workspaceId) : ""}
              >
                <option value="">All workspaces</option>
                {workspacesQuery.data?.data.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="audit-category">Area</Label>
              <Select
                className="mt-1.5"
                id="audit-category"
                onChange={(event) =>
                  updateParams("category", event.target.value, "all")
                }
                value={category}
              >
                <option value="all">All areas</option>
                {auditCategories.map((value) => (
                  <option key={value} value={value}>
                    {auditCategoryLabels[value]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="audit-result">Result</Label>
              <Select
                className="mt-1.5"
                id="audit-result"
                onChange={(event) =>
                  updateParams("result", event.target.value, "all")
                }
                value={result}
              >
                <option value="all">All results</option>
                <option value="success">Succeeded</option>
                <option value="failure">Failed</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="audit-date-from">From</Label>
              <Input
                className="mt-1.5"
                id="audit-date-from"
                max={dateTo || undefined}
                onChange={(event) =>
                  updateParams("date_from", event.target.value)
                }
                type="date"
                value={dateFrom}
              />
            </div>
            <div>
              <Label htmlFor="audit-date-to">To</Label>
              <Input
                className="mt-1.5"
                id="audit-date-to"
                min={dateFrom || undefined}
                onChange={(event) =>
                  updateParams("date_to", event.target.value)
                }
                type="date"
                value={dateTo}
              />
            </div>
          </FilterBar>
          {logs.isPending && <LoadingEntries />}
          {logs.isError && (
            <StatePanel
              action={<Button onClick={() => logs.refetch()}>Try again</Button>}
              description="The audit log could not be loaded. Please try again."
              kind="error"
              title="Audit log unavailable"
            />
          )}
          {logs.isSuccess && entries.length === 0 && (
            <StatePanel
              action={
                hasFilters ? (
                  <Button
                    onClick={() => router.replace(routes.governance)}
                    variant="outline"
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
              description={
                hasFilters
                  ? "Try another area or date range."
                  : "Administrative changes will appear here as they happen."
              }
              kind={hasFilters ? "no-results" : "empty"}
              title={
                hasFilters ? "No events match these filters" : "No events yet"
              }
            />
          )}
          {logs.isSuccess && entries.length > 0 && (
            <>
              <p className="text-muted-foreground text-sm">
                Showing{" "}
                <strong className="text-strong">{entries.length}</strong> of{" "}
                {logs.data.meta.total} events
              </p>
              <DataTable
                caption="Audit log"
                columns={buildColumns(showAgency)}
                getRowKey={(entry) => String(entry.id)}
                mobileCard={(entry) => (
                  <EntryCard entry={entry} showAgency={showAgency} />
                )}
                rows={entries}
              />
              <nav
                aria-label="Audit log pagination"
                className="bg-card flex items-center justify-between rounded-lg border p-3"
              >
                <p className="text-muted-foreground text-sm">
                  Page {logs.data.meta.current_page} of{" "}
                  {logs.data.meta.last_page}
                </p>
                <div className="flex gap-2">
                  <Button
                    aria-label="Previous audit log page"
                    disabled={logs.data.meta.current_page <= 1}
                    onClick={() => changePage(logs.data.meta.current_page - 1)}
                    size="icon"
                    variant="outline"
                  >
                    <ChevronLeft aria-hidden className="size-4" />
                  </Button>
                  <Button
                    aria-label="Next audit log page"
                    disabled={
                      logs.data.meta.current_page >= logs.data.meta.last_page
                    }
                    onClick={() => changePage(logs.data.meta.current_page + 1)}
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
