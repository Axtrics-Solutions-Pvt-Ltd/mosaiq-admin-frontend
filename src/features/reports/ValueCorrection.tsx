"use client";

import {
  Filter,
  LocateFixed,
  Lock,
  type LucideIcon,
  Pencil,
} from "lucide-react";
import {
  type CSSProperties,
  Fragment,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

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
// calculated value: same workspace, same campaign and same dates.
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
        (candidate.campaign_key ?? null) === (value.campaign_key ?? null) &&
        candidate.date_from === value.date_from &&
        candidate.date_to === value.date_to,
    );
    return match ? [match] : [];
  });
}

export type ChannelOption = { code: string; name: string };

// The report's other tabs, searched for inputs the current tab doesn't show.
export type OtherTabValues = {
  status: "idle" | "loading" | "ready" | "error";
  values: readonly { value: EditingValue; tabName: string }[];
  onSearch: () => void;
};

// The controls beside one report value: a pencil for a base metric, a lock
// for a calculated one, and a marker when data corrections changed it. A
// value that can't be corrected as it stands opens a menu that says why and
// offers the next step, rather than a hover-only tooltip that touch screens
// never show.
export function ValueCorrection({
  channels = [],
  dateLabel,
  isCombinedExplained = false,
  onCorrect,
  onPickChannel,
  onShowCorrections,
  onShowValue,
  otherTabs,
  tabValues,
  value,
}: {
  // The preview's channels, offered when a value combines several.
  channels?: readonly ChannelOption[];
  dateLabel?: string;
  // A note over the values already explains combined totals, so the value
  // shows no control of its own.
  isCombinedExplained?: boolean;
  onCorrect: (value: EditingValue) => void;
  // Narrows the preview to one channel so this value can be corrected.
  onPickChannel?: (value: EditingValue, channelCode: string) => void;
  onShowCorrections: (value: EditingValue) => void;
  // Scrolls to the widget that shows an input, so it's clear where it is.
  onShowValue?: (value: EditingValue) => void;
  otherTabs?: OtherTabValues;
  tabValues: readonly EditingValue[];
  value: EditingValue;
}) {
  const label =
    reportMetricLabel(value.metric) + (dateLabel ? ` for ${dateLabel}` : "");
  const corrections = value.correction_ids.length;
  const inputs = inputReferences(value, tabValues);
  const isCombined = value.workspace_id === undefined;
  const canPickChannel =
    isCombined && Boolean(onPickChannel) && channels.length > 1;

  function channelChoices() {
    return channels.map((channel) => (
      <button
        className={menuItem}
        key={channel.code}
        onClick={() => onPickChannel?.(value, channel.code)}
        type="button"
      >
        <Filter aria-hidden className="text-muted-foreground size-4" />
        {channel.name}
      </button>
    ));
  }

  // Inputs only shown on other tabs, once those tabs are loaded.
  const canSearchOtherTabs =
    inputs.length === 0 && !isCombined && Boolean(otherTabs);
  const elsewhere =
    canSearchOtherTabs && otherTabs?.status === "ready"
      ? inputReferences(
          value,
          otherTabs.values.map((entry) => entry.value),
        ).map((input) => ({
          input,
          tabName:
            otherTabs.values.find((entry) => entry.value === input)?.tabName ??
            "",
        }))
      : [];

  let calculatedNote = "Edit an input to change it.";
  if (inputs.length === 0)
    calculatedNote = canPickChannel
      ? "It adds up several channels. Choose one to edit its inputs:"
      : isCombined
        ? "It adds up several workspaces, so its inputs can't be corrected from this preview."
        : !otherTabs
          ? "Its inputs aren't shown on this tab, so they can't be corrected from here."
          : otherTabs.status === "ready"
            ? elsewhere.length > 0
              ? "Its inputs are on other tabs. Edit one here:"
              : "Its inputs aren't shown on any tab of this report, so they can't be corrected here."
            : otherTabs.status === "error"
              ? "Its inputs aren't on this tab, and the other tabs could not be checked. Please try again."
              : "Its inputs aren't on this tab. Looking on the other tabs…";

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
      {value.is_base && !isCombined && (
        <button
          aria-label={`Correct ${label}`}
          className={iconButton}
          onClick={() => onCorrect(value)}
          type="button"
        >
          <Pencil aria-hidden className="size-3.5" />
        </button>
      )}
      {value.is_base && isCombined && !isCombinedExplained && (
        <ValueMenu
          icon={Pencil}
          label={`${label} combines several workspaces. Choose how to correct it`}
          // Faded until a channel is chosen, but still a working button.
          triggerClassName="opacity-60"
        >
          <>
            <MenuNote>
              {canPickChannel
                ? `${label} adds up several channels. Choose one to correct its value:`
                : "This value adds up several workspaces, so it can't be corrected from this preview."}
            </MenuNote>
            {canPickChannel && channelChoices()}
          </>
        </ValueMenu>
      )}
      {!value.is_base && (
        <ValueMenu
          icon={Lock}
          label={`${label} is calculated. Edit its inputs`}
          onOpen={
            canSearchOtherTabs && otherTabs?.status !== "ready"
              ? otherTabs?.onSearch
              : undefined
          }
        >
          <>
            <MenuNote>
              {calculatedFrom(value)} {calculatedNote}
            </MenuNote>
            {inputs.map((input) => (
              <Fragment key={input.path + input.metric}>
                <button
                  className={menuItem}
                  onClick={() => onCorrect(input)}
                  type="button"
                >
                  <Pencil
                    aria-hidden
                    className="text-muted-foreground size-4"
                  />
                  Edit {reportMetricLabel(input.metric)}
                  {dateLabel && (
                    <span className="sr-only"> for {dateLabel}</span>
                  )}
                </button>
                {onShowValue && (
                  <button
                    className={menuItem}
                    onClick={() => onShowValue(input)}
                    type="button"
                  >
                    <LocateFixed
                      aria-hidden
                      className="text-muted-foreground size-4"
                    />
                    Show {reportMetricLabel(input.metric)} on canvas
                    {dateLabel && (
                      <span className="sr-only"> for {dateLabel}</span>
                    )}
                  </button>
                )}
              </Fragment>
            ))}
            {elsewhere.map(({ input, tabName }) => (
              <button
                className={menuItem}
                key={input.path + input.metric + tabName}
                onClick={() => onCorrect(input)}
                type="button"
              >
                <Pencil aria-hidden className="text-muted-foreground size-4" />
                <span>
                  Edit {reportMetricLabel(input.metric)}
                  <span className="text-muted-foreground block text-xs">
                    On the {tabName} tab
                  </span>
                </span>
              </button>
            ))}
            {inputs.length === 0 && canPickChannel && channelChoices()}
          </>
        </ValueMenu>
      )}
    </span>
  );
}

const menuItem =
  "hover:bg-muted text-strong flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm";

function MenuNote({ children }: { children: ReactNode }) {
  return (
    // Polite, as a lock's note changes while it looks on other tabs.
    <p
      aria-live="polite"
      className="text-muted-foreground px-3 pt-1.5 pb-2 text-xs"
    >
      {children}
    </p>
  );
}

const menuWidth = 224;

// A value's menu. It sits in a popover rather than beside the number, so a
// value in a tight spot, such as a donut's centre or a table cell, keeps one
// icon's width of controls. The popover is in the top layer, so the widget
// card can't clip it.
function ValueMenu({
  children,
  icon: Icon,
  label,
  onOpen,
  triggerClassName,
}: {
  children: ReactNode;
  icon: LucideIcon;
  label: string;
  onOpen?: () => void;
  triggerClassName?: string;
}) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>();
  const [isOpen, setIsOpen] = useState(false);
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
        aria-label={label}
        className={cn(
          iconButton,
          triggerClassName,
          isOpen && "text-primary opacity-100",
        )}
        popoverTarget={menuId}
        ref={triggerRef}
        type="button"
      >
        <Icon aria-hidden className="size-3.5" />
      </button>
      <div
        aria-label={label}
        className="bg-card m-0 w-56 rounded-lg border p-1.5 text-left shadow-[var(--shadow-overlay)]"
        id={menuId}
        onBeforeToggle={(event) => {
          if (event.newState === "open") place();
        }}
        onToggle={(event) => {
          setIsOpen(event.newState === "open");
          if (event.newState === "open") onOpen?.();
        }}
        popover="auto"
        ref={menuRef}
        // Choosing any action closes the menu. `hidePopover` is missing
        // where the Popover API isn't (jsdom).
        onClick={(event) => {
          if ((event.target as Element).closest("button"))
            menuRef.current?.hidePopover?.();
        }}
        role="group"
        style={position}
      >
        {children}
      </div>
    </>
  );
}
