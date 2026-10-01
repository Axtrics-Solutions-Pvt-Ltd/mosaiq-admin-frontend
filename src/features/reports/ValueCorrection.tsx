"use client";

import { Lock, Pencil } from "lucide-react";
import { type CSSProperties, useEffect, useId, useRef, useState } from "react";

import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils/cn";

import type { EditingValue } from "./contracts";
import { reportMetricLabel } from "./contracts";

const iconButton =
  "text-muted-foreground hover:text-primary focus-visible:ring-ring inline-flex size-7 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none";

function calculatedFrom(value: EditingValue) {
  const inputs = (value.inputs ?? []).map(reportMetricLabel).join(" ÷ ");
  return inputs
    ? `Calculated from ${inputs}.`
    : "Calculated from other metrics.";
}

function calculatedHint(value: EditingValue) {
  return `${calculatedFrom(value)} Edit those instead.`;
}

const combinedHint =
  "Combines several workspaces. Filter by a channel to correct one.";

// A base value that totals several workspaces, so it has no single source to
// correct until the preview is narrowed to one channel.
export function isCombinedValue(value: EditingValue) {
  return value.is_base && value.workspace_id === undefined;
}

// One note for a values table whose totals combine workspaces, in place of
// the same tooltip on every value.
export const combinedValuesNote =
  "They combine several workspaces. Choose a channel under “Edit numbers for” in the inspector to correct one.";

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
  isCombinedExplained = false,
  onCorrect,
  onShowCorrections,
  tabValues,
  value,
}: {
  dateLabel?: string;
  // A note over the values already explains combined totals, so the value
  // shows no control of its own.
  isCombinedExplained?: boolean;
  onCorrect: (value: EditingValue) => void;
  onShowCorrections: (value: EditingValue) => void;
  tabValues: readonly EditingValue[];
  value: EditingValue;
}) {
  const label =
    reportMetricLabel(value.metric) + (dateLabel ? ` for ${dateLabel}` : "");
  const corrections = value.correction_ids.length;
  const inputs = inputReferences(value, tabValues);
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
      {isCombinedValue(value) &&
        (isCombinedExplained ? null : (
          <Tooltip content={combinedHint}>
            {/* aria-disabled keeps it focusable so the explanation is reachable. */}
            <button
              aria-disabled
              aria-label={`${label}: ${combinedHint}`}
              className={cn(iconButton, "cursor-not-allowed opacity-60")}
              type="button"
            >
              <Pencil aria-hidden className="size-3.5" />
            </button>
          </Tooltip>
        ))}
      {!value.is_base && inputs.length === 0 && (
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
      )}
      {!value.is_base && inputs.length > 0 && (
        <InputsMenu
          dateLabel={dateLabel}
          inputs={inputs}
          label={label}
          onCorrect={onCorrect}
          value={value}
        />
      )}
    </span>
  );
}

const menuWidth = 224;

// The shortcuts to a calculated value's inputs. They sit in a popover behind
// the lock rather than beside the number, so a value in a tight spot, such as
// a donut's centre or a table cell, keeps one icon's width of controls. The
// popover is in the top layer, so the widget card can't clip it.
function InputsMenu({
  dateLabel,
  inputs,
  label,
  onCorrect,
  value,
}: {
  dateLabel?: string;
  inputs: readonly EditingValue[];
  label: string;
  onCorrect: (value: EditingValue) => void;
  value: EditingValue;
}) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>();
  const [isOpen, setIsOpen] = useState(false);
  const menuLabel = `${label} is calculated. Edit its inputs`;

  // The menu is placed once when it opens, so it closes rather than drift
  // away from its button when the page scrolls.
  useEffect(() => {
    if (!isOpen) return;
    const hide = () => menuRef.current?.hidePopover?.();
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [isOpen]);

  function place() {
    const trigger = triggerRef.current?.getBoundingClientRect();
    if (!trigger) return;
    const left = Math.max(
      8,
      Math.min(
        trigger.left + trigger.width / 2 - menuWidth / 2,
        window.innerWidth - menuWidth - 8,
      ),
    );
    const opensUp = trigger.bottom + 160 > window.innerHeight;
    setPosition(
      opensUp
        ? { left, top: "auto", bottom: window.innerHeight - trigger.top + 4 }
        : { left, top: trigger.bottom + 4, bottom: "auto" },
    );
  }

  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-label={menuLabel}
        className={cn(iconButton, isOpen && "text-primary")}
        popoverTarget={menuId}
        ref={triggerRef}
        type="button"
      >
        <Lock aria-hidden className="size-3.5" />
      </button>
      <div
        aria-label={menuLabel}
        className="bg-card m-0 w-56 rounded-lg border p-1.5 text-left shadow-[var(--shadow-overlay)]"
        id={menuId}
        onBeforeToggle={(event) => {
          if (event.newState === "open") place();
        }}
        onToggle={(event) => setIsOpen(event.newState === "open")}
        popover="auto"
        ref={menuRef}
        role="group"
        style={position}
      >
        <p className="text-muted-foreground px-3 pt-1.5 pb-2 text-xs">
          {calculatedFrom(value)} Edit an input to change it.
        </p>
        {inputs.map((input) => (
          <button
            className="hover:bg-muted text-strong flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm"
            key={input.path + input.metric}
            onClick={() => {
              // `hidePopover` is missing where the Popover API isn't (jsdom).
              menuRef.current?.hidePopover?.();
              onCorrect(input);
            }}
            type="button"
          >
            <Pencil aria-hidden className="text-muted-foreground size-4" />
            Edit {reportMetricLabel(input.metric)}
            {dateLabel && <span className="sr-only"> for {dateLabel}</span>}
          </button>
        ))}
      </div>
    </>
  );
}
