"use client";

import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FilterBar, PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import {
  clientScope,
  newReportUrl,
  reportLinksUrl,
  reportUrl,
  routes,
} from "@/config/routes";
import { hasCapability } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/errors";
import { formatDate, formatNumber } from "@/lib/formatters";

import type { Report, ReportStatus } from "./contracts";
import {
  useDeleteReport,
  useDuplicateReport,
  useReports,
  useUpdateReport,
} from "./queries";
import { ReportOwnerFields, useReportOwner } from "./ReportOwner";

export type ReportDirectoryFilters = {
  agencyId: number;
  clientId: number;
  search: string;
  status: "all" | ReportStatus;
  page: number;
};

type PendingAction = {
  kind: "archive" | "restore" | "delete";
  report: Report;
} | null;

export function ReportChannels({ report }: { report: Report }) {
  const channels = [
    ...new Map(
      report.workspaces
        .flatMap((workspace) => (workspace.channel ? [workspace.channel] : []))
        .map((channel) => [channel.code, channel]),
    ).values(),
  ];
  if (channels.length === 0)
    return <span className="text-muted-foreground text-sm">No sources</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {channels.map((channel) => (
        <Badge key={channel.code} tone="primary">
          {channel.name}
        </Badge>
      ))}
    </span>
  );
}

// An archived report's links don't open, so the API counts 0 for it; say why
// instead of showing a bare zero.
function ActiveLinks({
  canManage,
  report,
}: {
  canManage: boolean;
  report: Report;
}) {
  if (report.status === "archived")
    return (
      <span className="text-muted-foreground text-xs">
        Paused while archived
      </span>
    );
  const count = formatNumber(report.active_links_count);
  const name = `${count} active ${report.active_links_count === 1 ? "link" : "links"}`;
  return canManage ? (
    <Link
      aria-label={`${name} for ${report.name}`}
      className="hover:text-primary tabular-nums underline-offset-4 hover:underline"
      href={reportLinksUrl(report.id, report.agency_id, report.client_id)}
    >
      {count}
    </Link>
  ) : (
    <span className="tabular-nums">{count}</span>
  );
}

function scopeOf(report: Report) {
  return {
    agencyId: report.agency_id,
    clientId: report.client_id,
    reportId: report.id,
  };
}

export function ReportDirectory({
  filters,
}: {
  filters: ReportDirectoryFilters;
}) {
  const router = useRouter();
  const user = useCurrentUser();
  const owner = useReportOwner(filters.agencyId, filters.clientId);
  const query = useReports(owner.agencyId, owner.clientId, {
    search: filters.search || undefined,
    status: filters.status === "all" ? undefined : filters.status,
    page: filters.page,
  });
  const duplicateMutation = useDuplicateReport();
  const updateMutation = useUpdateReport();
  const deleteMutation = useDeleteReport();
  const [pending, setPending] = useState<PendingAction>(null);
  const canManage = Boolean(
    user.data && hasCapability(user.data, "reports.manage"),
  );
  const canDelete = Boolean(
    user.data && hasCapability(user.data, "reports.delete"),
  );
  const canAddClient = Boolean(
    user.data && hasCapability(user.data, "clients.manage"),
  );
  const hasFilters = Boolean(filters.search) || filters.status !== "all";
  const records = query.data?.data ?? [];

  function replace(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all" || value === "0") params.delete(key);
      else params.set(key, value);
    }
    router.replace(routes.reports.index + (params.size ? "?" + params : ""));
  }

  async function duplicate(report: Report) {
    try {
      const copy = await duplicateMutation.mutateAsync(scopeOf(report));
      toast({
        title: "Report duplicated",
        description: `${copy.name} was created without share links.`,
        tone: "success",
      });
    } catch (error) {
      toast({
        title: "Report not duplicated",
        description:
          error instanceof ApiError
            ? error.message
            : "The report could not be duplicated.",
        tone: "error",
      });
    }
  }

  async function confirmPending() {
    if (!pending) return;
    const { kind, report } = pending;
    try {
      if (kind === "delete") {
        await deleteMutation.mutateAsync(scopeOf(report));
        toast({
          title: "Report deleted",
          description: report.name,
          tone: "success",
        });
      } else {
        await updateMutation.mutateAsync({
          scope: scopeOf(report),
          payload: { status: kind === "archive" ? "archived" : "active" },
        });
        toast({
          title: kind === "archive" ? "Report archived" : "Report restored",
          description: report.name,
          tone: "success",
        });
      }
    } catch (error) {
      toast({
        title: "Change not saved",
        description:
          error instanceof ApiError
            ? error.message
            : "The report could not be changed.",
        tone: "error",
      });
    }
    setPending(null);
  }

  const actions = (report: Report) => (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <Button asChild size="sm" variant="outline">
        <Link href={reportUrl(report.id, report.agency_id, report.client_id)}>
          Open<span className="sr-only"> {report.name}</span>
        </Link>
      </Button>
      {canManage && (
        <>
          <Button
            aria-label={`Duplicate ${report.name}`}
            disabled={duplicateMutation.isPending}
            onClick={() => duplicate(report)}
            size="icon"
            variant="ghost"
          >
            <Copy aria-hidden className="size-4" />
          </Button>
          <Button
            aria-label={
              report.status === "active"
                ? `Archive ${report.name}`
                : `Restore ${report.name}`
            }
            onClick={() =>
              setPending({
                kind: report.status === "active" ? "archive" : "restore",
                report,
              })
            }
            size="icon"
            variant="ghost"
          >
            {report.status === "active" ? (
              <Archive aria-hidden className="size-4" />
            ) : (
              <ArchiveRestore aria-hidden className="size-4" />
            )}
          </Button>
        </>
      )}
      {canDelete && (
        <Button
          aria-label={`Delete ${report.name}`}
          onClick={() => setPending({ kind: "delete", report })}
          size="icon"
          variant="ghost"
        >
          <Trash2 aria-hidden className="text-destructive size-4" />
        </Button>
      )}
    </div>
  );

  const updatedCell = (report: Report) => (
    <span className="text-sm">
      {report.updated_at ? formatDate(report.updated_at) : "--"}
      {report.updated_by && (
        <span className="text-muted-foreground block text-xs">
          by {report.updated_by.name}
        </span>
      )}
    </span>
  );

  const columns: readonly DataTableColumn<Report>[] = [
    {
      id: "name",
      header: "Report",
      render: (report) => (
        <Link
          className="text-strong hover:text-primary font-medium"
          href={reportUrl(report.id, report.agency_id, report.client_id)}
        >
          {report.name}
        </Link>
      ),
    },
    {
      id: "client",
      header: "Client",
      render: (report) => report.client?.name ?? owner.client?.name ?? "--",
    },
    {
      id: "channels",
      header: "Channels",
      render: (report) => <ReportChannels report={report} />,
    },
    {
      id: "active-links",
      header: "Active links",
      align: "right",
      render: (report) => <ActiveLinks canManage={canManage} report={report} />,
    },
    { id: "updated", header: "Updated", render: updatedCell },
    {
      id: "status",
      header: "Status",
      render: (report) => <StatusBadge status={report.status} />,
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: actions,
    },
  ];

  const pendingCopy = pending
    ? {
        archive: {
          title: "Archive this report?",
          description: "Its share links stop working until it is restored.",
          confirm: "Archive report",
        },
        restore: {
          title: "Restore this report?",
          description: "Its share links work again.",
          confirm: "Restore report",
        },
        delete: {
          title: "Delete this report?",
          description:
            "Its share links stop working. This can't be undone here.",
          confirm: "Delete report",
        },
      }[pending.kind]
    : undefined;

  return (
    <PageStack>
      <PageHeader
        actions={
          canManage && owner.clientId ? (
            <Button asChild>
              <Link href={newReportUrl(owner.agencyId, owner.clientId)}>
                <Plus aria-hidden className="size-4" /> New report
              </Link>
            </Button>
          ) : undefined
        }
        description="Build client reports from their channel workspaces and share them with the client portal."
        title="Reports"
      />
      <FilterBar className="lg:grid lg:grid-cols-4">
        <ReportOwnerFields
          idPrefix="reports"
          onChange={(agencyId, clientId) =>
            replace({
              agency: String(agencyId),
              client: String(clientId),
              page: undefined,
            })
          }
          owner={owner}
        />
        <div>
          <Label htmlFor="report-search">Search reports</Label>
          <Input
            className="mt-1.5"
            id="report-search"
            onChange={(event) =>
              replace({ search: event.target.value, page: undefined })
            }
            placeholder="Report name"
            value={filters.search}
          />
        </div>
        <div>
          <Label htmlFor="report-status">Status</Label>
          <Select
            className="mt-1.5"
            id="report-status"
            onChange={(event) =>
              replace({ status: event.target.value, page: undefined })
            }
            value={filters.status}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
      </FilterBar>
      {owner.isPending && <p aria-busy="true">Loading reports...</p>}
      {owner.isError && (
        <StatePanel
          action={<Button onClick={owner.refetch}>Try again</Button>}
          description="Agencies or clients could not be loaded."
          kind="error"
          title="Reports unavailable"
        />
      )}
      {!owner.isPending && !owner.isError && owner.clients.length === 0 && (
        <StatePanel
          action={
            canAddClient && owner.agencyId ? (
              <Button asChild>
                <Link href={routes.clients.new + clientScope(owner.agencyId)}>
                  Add client
                </Link>
              </Button>
            ) : undefined
          }
          description={
            owner.agencyId
              ? "Reports belong to a client. Add a client first, or ask an Agency Admin for access to one."
              : "Choose an agency to see its reports."
          }
          kind="empty"
          title="No clients"
        />
      )}
      {owner.clientId > 0 && query.isPending && (
        <p aria-busy="true">Loading reports...</p>
      )}
      {query.isError && (
        <StatePanel
          action={<Button onClick={() => query.refetch()}>Try again</Button>}
          description="The report list could not be loaded."
          kind="error"
          title="Reports unavailable"
        />
      )}
      {query.isSuccess && records.length === 0 && (
        <StatePanel
          action={
            hasFilters ? (
              <Button
                onClick={() =>
                  replace({
                    search: undefined,
                    status: undefined,
                    page: undefined,
                  })
                }
                variant="outline"
              >
                Clear filters
              </Button>
            ) : canManage ? (
              <Button asChild>
                <Link href={newReportUrl(owner.agencyId, owner.clientId)}>
                  New report
                </Link>
              </Button>
            ) : undefined
          }
          description={
            hasFilters
              ? "Try another search or status."
              : `${owner.client?.name ?? "This client"} has no reports yet.`
          }
          kind={hasFilters ? "no-results" : "empty"}
          title={hasFilters ? "No matching reports" : "No reports yet"}
        />
      )}
      {query.isSuccess && records.length > 0 && (
        <>
          <p className="text-muted-foreground text-sm">
            Showing {records.length} of {query.data.meta.total} reports
          </p>
          <DataTable
            caption="Reports"
            columns={columns}
            getRowKey={(report) => String(report.id)}
            mobileCard={(report) => (
              <Card>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      className="text-strong hover:text-primary font-semibold"
                      href={reportUrl(
                        report.id,
                        report.agency_id,
                        report.client_id,
                      )}
                    >
                      {report.name}
                    </Link>
                    <StatusBadge status={report.status} />
                  </div>
                  <ReportChannels report={report} />
                  <p className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Active links</span>
                    <ActiveLinks canManage={canManage} report={report} />
                  </p>
                  {updatedCell(report)}
                  {actions(report)}
                </CardContent>
              </Card>
            )}
            rows={records}
          />
          {query.data.meta.last_page > 1 && (
            <nav
              aria-label="Report pagination"
              className="bg-card flex items-center justify-between rounded-lg border p-3"
            >
              <p className="text-muted-foreground text-sm">
                Page {query.data.meta.current_page} of{" "}
                {query.data.meta.last_page}
              </p>
              <div className="flex gap-2">
                <Button
                  aria-label="Previous page"
                  disabled={filters.page <= 1}
                  onClick={() => replace({ page: String(filters.page - 1) })}
                  size="icon"
                  variant="outline"
                >
                  <ChevronLeft aria-hidden className="size-4" />
                </Button>
                <Button
                  aria-label="Next page"
                  disabled={filters.page >= query.data.meta.last_page}
                  onClick={() => replace({ page: String(filters.page + 1) })}
                  size="icon"
                  variant="outline"
                >
                  <ChevronRight aria-hidden className="size-4" />
                </Button>
              </div>
            </nav>
          )}
        </>
      )}
      <ConfirmationDialog
        body={
          pending ? (
            <p>
              Report:{" "}
              <span className="text-strong font-medium">
                {pending.report.name}
              </span>
            </p>
          ) : undefined
        }
        confirmLabel={pendingCopy?.confirm}
        description={pendingCopy?.description ?? ""}
        isOpen={Boolean(pending)}
        isPending={updateMutation.isPending || deleteMutation.isPending}
        onCancel={() => setPending(null)}
        onConfirm={confirmPending}
        title={pendingCopy?.title ?? ""}
      />
    </PageStack>
  );
}
