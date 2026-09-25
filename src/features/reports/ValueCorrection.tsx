"use client";

import { Lock, Pencil } from "lucide-react";

import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils/cn";

import type { EditingValue } from "./contracts";
import { reportMetricLabel } from "./contracts";

const iconButton =
  "text-muted-foreground hover:text-primary focus-visible:ring-ring inline-flex size-7 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none";

function calculatedHint(value: EditingValue) {
  const inputs = (value.inputs ?? []).map(reportMetricLabel).join(" ÷ ");
  return inputs
    ? `Calculated from ${inputs}. Edit those instead.`
    : "Calculated from other metrics. Edit those instead.";
}

// A base-metric reference elsewhere on the tab that corrects one input of a
// calculated value: same workspace and same dates.
export function inputReferences(
  value: EditingValue,
  tabValues: readonly EditingValue[],
) {
  if (value.is_base || value.workspace_id === undefined) return [];
  return (value.inputs ?? []).flatMap((input) => {
    const match = tabValues.find(
      (candidate) =>
        candidate.is_base &&
        candidate.metric === input &&
        candidate.workspace_id === value.workspace_id &&
        candidate.date_from === value.date_from &&
        candidate.date_to === value.date_to,
    );
    return match ? [match] : [];
  });
}

// The controls beside one report value: a pencil for a base metric, a lock
// for a calculated one, and a marker when data corrections changed it.
export function ValueCorrection({
  dateLabel,
  onCorrect,
  onShowCorrections,
  tabValues,
  value,
}: {
  dateLabel?: string;
  onCorrect: (value: EditingValue) => void;
  onShowCorrections: (value: EditingValue) => void;
  tabValues: readonly EditingValue[];
  value: EditingValue;
}) {
  const label =
    reportMetricLabel(value.metric) + (dateLabel ? ` for ${dateLabel}` : "");
  const corrections = value.correction_ids.length;
  return (
    <span className="inline-flex items-center gap-0.5">
      {value.edited && (
        <Tooltip
          content={`Changed by ${corrections} data correction${corrections === 1 ? "" : "s"}`}
        >
          <button
            aria-label={`${label} was edited by ${corrections} data correction${corrections === 1 ? "" : "s"}. Show the corrections.`}
            className={cn(iconButton, "text-warning")}
            onClick={() => onShowCorrections(value)}
            type="button"
          >
            <span aria-hidden className="bg-warning size-2 rounded-full" />
            <span className="sr-only">Edited</span>
          </button>
        </Tooltip>
      )}
      {value.is_base && value.workspace_id !== undefined && (
        <button
          aria-label={`Correct ${label}`}
          className={iconButton}
          onClick={() => onCorrect(value)}
          type="button"
        >
          <Pencil aria-hidden className="size-3.5" />
        </button>
      )}
      {value.is_base && value.workspace_id === undefined && (
        <Tooltip content="Combines several workspaces. Filter by a channel to correct one.">
          {/* aria-disabled keeps it focusable so the explanation is reachable. */}
          <button
            aria-disabled
            aria-label={`${label} combines several workspaces. Filter by a channel to correct one.`}
            className={cn(iconButton, "cursor-not-allowed opacity-60")}
            type="button"
          >
            <Pencil aria-hidden className="size-3.5" />
          </button>
        </Tooltip>
      )}
      {!value.is_base && (
        <>
          <Tooltip content={calculatedHint(value)}>
            <button
              aria-disabled
              aria-label={`${label}: ${calculatedHint(value)}`}
              className={cn(iconButton, "cursor-help")}
              type="button"
            >
              <Lock aria-hidden className="size-3.5" />
            </button>
          </Tooltip>
          {inputReferences(value, tabValues).map((input) => (
            <button
              className="text-primary rounded-sm px-1 text-xs font-medium hover:underline"
              key={input.path + input.metric}
              onClick={() => onCorrect(input)}
              type="button"
            >
              Edit {reportMetricLabel(input.metric)}
              {dateLabel && <span className="sr-only"> for {dateLabel}</span>}
            </button>
          ))}
        </>
      )}
    </span>
  );
}
