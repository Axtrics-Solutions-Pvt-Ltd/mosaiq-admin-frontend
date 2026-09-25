"use client";

import Link from "next/link";

import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { formatDate, formatDateRange } from "@/lib/formatters";

import {
  type Correction,
  correctionStatus,
  isBaseMetric,
  metricLabel,
} from "./contracts";
import { formatMetricValue, metricFormat } from "./format";
import { type CorrectionLookup, useCorrectionsById } from "./queries";

type SourceWorkspace = { id: number; name: string; currency: string };

export type AppliedCorrectionsContext = {
  agencyId: number;
  clientId: number;
  valueLabel: string;
  from: string;
  to: string;
  lookup: CorrectionLookup;
  historyHref: string;
};

function formatTotal(
  correction: Correction,
  value: number,
  workspace: SourceWorkspace | undefined,
) {
  return isBaseMetric(correction.metric_code) && workspace
    ? formatMetricValue(
        value,
        metricFormat(correction.metric_code, workspace.currency),
      )
    : formatMetricValue(value, { kind: "number" });
}

// Lists the data corrections that changed one report value.
export function AppliedCorrectionsDialog({
  context,
  onClose,
  workspaces,
}: {
  context: AppliedCorrectionsContext | null;
  onClose: () => void;
  workspaces: readonly SourceWorkspace[];
}) {
  const query = useCorrectionsById(
    context?.agencyId ?? 0,
    context?.clientId ?? 0,
    context?.lookup ?? null,
  );
  const workspaceById = new Map(
    workspaces.map((workspace) => [workspace.id, workspace]),
  );
  const count = context?.lookup.ids.length ?? 0;

  return (
    <Dialog
      description={
        context
          ? `${count} data correction${count === 1 ? "" : "s"} changed ${context.valueLabel} for ${formatDateRange(context.from, context.to)}.`
          : undefined
      }
      footer={
        <>
          {context && (
            <Button asChild variant="outline">
              <Link href={context.historyHref}>Open correction history</Link>
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </>
      }
      isOpen={Boolean(context)}
      onClose={onClose}
      title={context ? `${context.valueLabel} corrections` : "Corrections"}
    >
      {query.isPending && <p aria-busy="true">Loading corrections...</p>}
      {query.isError && (
        <StatePanel
          action={<Button onClick={() => query.refetch()}>Try again</Button>}
          description="The corrections could not be loaded."
          kind="error"
          title="Corrections unavailable"
        />
      )}
      {query.isSuccess && (
        <div className="space-y-3">
          <ul className="max-h-[50vh] space-y-3 overflow-y-auto">
            {query.data.corrections.map((correction) => {
              const workspace = workspaceById.get(correction.workspace_id);
              return (
                <li
                  className="space-y-1.5 rounded-lg border p-3 text-sm"
                  key={correction.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-strong font-medium">
                      {metricLabel(correction.metric_code)} ·{" "}
                      {workspace?.name ??
                        `Workspace #${correction.workspace_id}`}
                    </p>
                    <StatusBadge status={correctionStatus(correction)} />
                  </div>
                  <p className="tabular-nums">
                    {formatTotal(
                      correction,
                      correction.original_total,
                      workspace,
                    )}
                    <span aria-hidden> → </span>
                    <span className="sr-only"> changed to </span>
                    <span className="text-strong font-medium">
                      {formatTotal(
                        correction,
                        correction.corrected_total,
                        workspace,
                      )}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateRange(correction.date_from, correction.date_to)}{" "}
                    · {correction.campaign_key ?? "All campaigns"} ·{" "}
                    {correction.created_by?.name ?? "Unknown user"}
                    {correction.created_at &&
                      ` · ${formatDate(correction.created_at)}`}
                  </p>
                  {correction.note && <p>{correction.note}</p>}
                </li>
              );
            })}
          </ul>
          {query.data.missing > 0 && (
            <p className="text-muted-foreground text-sm">
              {query.data.missing} more correction
              {query.data.missing === 1 ? " isn't" : "s aren't"} shown here.
              Open the correction history to see every correction.
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
