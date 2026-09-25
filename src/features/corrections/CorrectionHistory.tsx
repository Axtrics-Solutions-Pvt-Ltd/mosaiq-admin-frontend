"use client";

import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { baseMetricCodes, metricLabels } from "@/features/channels/contracts";
import type { WorkspaceRecord } from "@/features/workspaces/contracts";
import { formatDate, formatDateRange } from "@/lib/formatters";

import {
  type Correction,
  correctionStatus,
  isBaseMetric,
  metricLabel,
} from "./contracts";
import {
  correctionFilterParams,
  type CorrectionHistoryFilters,
} from "./filters";
import { formatMetricValue, metricFormat } from "./format";
import { useCorrections, useResetCorrection } from "./queries";

type HistoryWorkspace = Pick<
  WorkspaceRecord,
  "id" | "name" | "currency" | "connector"
>;

function formatTotal(
  correction: Correction,
  value: number,
  workspace: HistoryWorkspace | undefined,
) {
  // Without the workspace (no access, or deleted) the currency is unknown.
  return isBaseMetric(correction.metric_code) && workspace
    ? formatMetricValue(
        value,
        metricFormat(correction.metric_code, workspace.currency),
      )
    : formatMetricValue(value, { kind: "number" });
}

export function CorrectionHistory({
  agencyId,
  clientId,
  filters,
  workspaces,
}: {
  agencyId: number;
  clientId: number;
  filters: CorrectionHistoryFilters;
  workspaces: readonly HistoryWorkspace[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const metricCode =
    filters.metricCode && isBaseMetric(filters.metricCode)
      ? filters.metricCode
      : undefined;
  const query = useCorrections(agencyId, clientId, {
    workspace_id: filters.workspaceId,
    metric_code: metricCode,
    page: filters.page,
  });
  const resetMutation = useResetCorrection();
  const [resetting, setResetting] = useState<Correction | null>(null);
  const [resetError, setResetError] = useState("");
  const workspaceById = new Map(
    workspaces.map((workspace) => [workspace.id, workspace]),
  );
  const hasFilters = Boolean(filters.workspaceId || metricCode);

  function replace(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    router.replace(pathname + (params.size ? "?" + params : ""), {
      scroll: false,
    });
  }

  async function confirmReset() {
    if (!resetting) return;
    setResetError("");
    try {
      await resetMutation.mutateAsync({
        agencyId,
        clientId,
        correctionId: resetting.id,
      });
      toast({
        title: "Correction reset",
        description: `${metricLabel(resetting.metric_code)} is back to the fetched values in every report.`,
        tone: "success",
      });
    } catch {
      setResetError("The correction could not be reset. Please try again.");
    }
    setResetting(null);
  }

  // Reset needs access to the workspace; the client's workspace list is
  // already limited to the ones the API lets this user see.
  const canReset = (correction: Correction) =>
    correction.is_active && workspaceById.has(correction.workspace_id);

  const workspaceCell = (correction: Correction) => {
    const workspace = workspaceById.get(correction.workspace_id);
    return (
      <div className="min-w-0">
        <p className="text-strong font-medium">
          {workspace?.name ?? `Workspace #${correction.workspace_id}`}
        </p>
        {workspace?.connector && (
          <p className="text-muted-foreground text-xs">
            {workspace.connector.name}
          </p>
        )}
      </div>
    );
  };

  const changeCell = (correction: Correction) => {
    const workspace = workspaceById.get(correction.workspace_id);
    return (
      <span className="whitespace-nowrap tabular-nums">
        {formatTotal(correction, correction.original_total, workspace)}
        <span aria-hidden> → </span>
        <span className="sr-only"> changed to </span>
        <span className="text-strong font-medium">
          {formatTotal(correction, correction.corrected_total, workspace)}
        </span>
      </span>
    );
  };

  const resetButton = (correction: Correction) =>
    canReset(correction) ? (
      <Button
        aria-label={`Reset ${metricLabel(correction.metric_code)} correction for ${formatDateRange(correction.date_from, correction.date_to)}`}
        onClick={() => setResetting(correction)}
        size="sm"
        variant="outline"
      >
        <RotateCcw aria-hidden className="size-4" /> Reset
      </Button>
    ) : null;

  const columns: readonly DataTableColumn<Correction>[] = [
    {
      id: "created",
      header: "Created",
      render: (correction) =>
        correction.created_at ? formatDate(correction.created_at) : "--",
    },
    { id: "workspace", header: "Channel / workspace", render: workspaceCell },
    {
      id: "metric",
      header: "Metric",
      render: (correction) => metricLabel(correction.metric_code),
    },
    {
      id: "campaign",
      header: "Campaign",
      render: (correction) => correction.campaign_key ?? "All campaigns",
    },
    {
      id: "range",
      header: "Dates",
      render: (correction) =>
        formatDateRange(correction.date_from, correction.date_to),
    },
    { id: "change", header: "Original → corrected", render: changeCell },
    {
      id: "by",
      header: "By",
      render: (correction) => correction.created_by?.name ?? "--",
    },
    {
      id: "note",
      header: "Note",
      render: (correction) => (
        <span className="line-clamp-2 max-w-60">{correction.note ?? "--"}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      render: (correction) => (
        <StatusBadge status={correctionStatus(correction)} />
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: resetButton,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data corrections</CardTitle>
        <p className="text-muted-foreground text-sm">
          Corrected totals replace fetched values in every report of this
          client.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
          <div>
            <Label htmlFor="correction-workspace">Workspace</Label>
            <Select
              className="mt-1.5"
              id="correction-workspace"
              onChange={(event) =>
                replace({
                  [correctionFilterParams.workspace]: event.target.value,
                  [correctionFilterParams.page]: undefined,
                })
              }
              value={filters.workspaceId ? String(filters.workspaceId) : "all"}
            >
              <option value="all">All workspaces</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="correction-metric">Metric</Label>
            <Select
              className="mt-1.5"
              id="correction-metric"
              onChange={(event) =>
                replace({
                  [correctionFilterParams.metric]: event.target.value,
                  [correctionFilterParams.page]: undefined,
                })
              }
              value={metricCode ?? "all"}
            >
              <option value="all">All metrics</option>
              {baseMetricCodes.map((code) => (
                <option key={code} value={code}>
                  {metricLabels[code]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {resetError && (
          <p
            className="text-destructive rounded-lg border p-3 text-sm"
            role="alert"
          >
            {resetError}
          </p>
        )}
        {query.isPending && <p aria-busy="true">Loading corrections...</p>}
        {query.isError && (
          <StatePanel
            action={<Button onClick={() => query.refetch()}>Try again</Button>}
            description="The corrections could not be loaded."
            kind="error"
            title="Corrections unavailable"
          />
        )}
        {query.isSuccess && query.data.data.length === 0 && (
          <StatePanel
            action={
              hasFilters ? (
                <Button
                  onClick={() =>
                    replace({
                      [correctionFilterParams.workspace]: undefined,
                      [correctionFilterParams.metric]: undefined,
                      [correctionFilterParams.page]: undefined,
                    })
                  }
                  variant="outline"
                >
                  Clear filters
                </Button>
              ) : undefined
            }
            description={
              hasFilters
                ? "No corrections match these filters."
                : "Corrections made from report values appear here."
            }
            kind="empty"
            title={hasFilters ? "No matching corrections" : "No corrections"}
          />
        )}
        {query.isSuccess && query.data.data.length > 0 && (
          <>
            <DataTable
              caption="Data corrections"
              columns={columns}
              getRowKey={(correction) => String(correction.id)}
              mobileCard={(correction) => (
                <article className="space-y-3 rounded-lg border p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    {workspaceCell(correction)}
                    <StatusBadge status={correctionStatus(correction)} />
                  </div>
                  <p className="text-strong font-medium">
                    {metricLabel(correction.metric_code)} ·{" "}
                    {formatDateRange(correction.date_from, correction.date_to)}
                  </p>
                  <p>{changeCell(correction)}</p>
                  <p className="text-muted-foreground text-xs">
                    {correction.campaign_key ?? "All campaigns"} ·{" "}
                    {correction.created_by?.name ?? "Unknown user"}
                    {correction.created_at &&
                      ` · ${formatDate(correction.created_at)}`}
                  </p>
                  {correction.note && <p>{correction.note}</p>}
                  {resetButton(correction)}
                </article>
              )}
              rows={query.data.data}
            />
            {query.data.meta.last_page > 1 && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm">
                  Page {query.data.meta.current_page} of{" "}
                  {query.data.meta.last_page}
                </p>
                <div className="flex gap-2">
                  <Button
                    aria-label="Previous corrections page"
                    disabled={filters.page <= 1}
                    onClick={() =>
                      replace({
                        [correctionFilterParams.page]: String(filters.page - 1),
                      })
                    }
                    size="icon"
                    variant="outline"
                  >
                    <ChevronLeft aria-hidden className="size-4" />
                  </Button>
                  <Button
                    aria-label="Next corrections page"
                    disabled={filters.page >= query.data.meta.last_page}
                    onClick={() =>
                      replace({
                        [correctionFilterParams.page]: String(filters.page + 1),
                      })
                    }
                    size="icon"
                    variant="outline"
                  >
                    <ChevronRight aria-hidden className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
      <ConfirmationDialog
        body={
          resetting ? (
            <p>
              The {metricLabel(resetting.metric_code)} correction for{" "}
              {formatDateRange(resetting.date_from, resetting.date_to)} is
              removed. Every report of this client goes back to the fetched
              values for those dates. The correction stays in this history as
              Reset.
            </p>
          ) : undefined
        }
        confirmLabel="Reset correction"
        description="Totals, ROAS, CPA and charts will recalculate."
        isOpen={Boolean(resetting)}
        isPending={resetMutation.isPending}
        onCancel={() => setResetting(null)}
        onConfirm={confirmReset}
        title="Reset this correction?"
      />
    </Card>
  );
}
