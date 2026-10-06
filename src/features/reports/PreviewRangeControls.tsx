"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";

import {
  type Audience,
  type PreviewMeta,
  rangePresetDays,
  rangePresetLabels,
  rangePresets,
} from "./contracts";

export type DateRange = { from: string; to: string };

// Calendar arithmetic on YYYY-MM-DD strings, in UTC so no day is skipped or
// repeated around daylight-saving changes.
export function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1, day! + days));
  return shifted.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return (
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
    86_400_000
  );
}

function isPreset(value: string): value is (typeof rangePresets)[number] {
  return rangePresets.some((preset) => preset === value);
}

// Presets end on the last day with data, as in the portal (contract §4.1).
export function presetRange(
  meta: PreviewMeta,
  preset: string,
): DateRange | undefined {
  if (!isPreset(preset)) return undefined;
  const to = meta.date_range.available.to ?? meta.date_range.default.to;
  return { from: shiftDate(to, -(rangePresetDays[preset] - 1)), to };
}

export function customRangeError(meta: PreviewMeta, range: DateRange) {
  const { available, max_span_days: maxSpan } = meta.date_range;
  if (!range.from || !range.to) return "Choose a start and an end date.";
  if (range.to < range.from)
    return "The end date must be on or after the start date.";
  if (daysBetween(range.from, range.to) + 1 > maxSpan)
    return `Choose at most ${maxSpan} days.`;
  if (
    (available.from && range.from < available.from) ||
    (available.to && range.to > available.to)
  )
    return "Choose dates within the data available for this report.";
  return undefined;
}

function CustomRange({
  meta,
  onApply,
  range,
}: {
  meta: PreviewMeta;
  onApply: (range: DateRange) => void;
  range: DateRange;
}) {
  const [draft, setDraft] = useState(range);
  const [error, setError] = useState<string>();
  const { available } = meta.date_range;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <Label htmlFor="preview-from">From</Label>
        <Input
          className="mt-1.5 h-9"
          id="preview-from"
          max={available.to ?? undefined}
          min={available.from ?? undefined}
          onChange={(event) => setDraft({ ...draft, from: event.target.value })}
          type="date"
          value={draft.from}
        />
      </div>
      <div>
        <Label htmlFor="preview-to">To</Label>
        <Input
          className="mt-1.5 h-9"
          id="preview-to"
          max={available.to ?? undefined}
          min={available.from ?? undefined}
          onChange={(event) => setDraft({ ...draft, to: event.target.value })}
          type="date"
          value={draft.to}
        />
      </div>
      <Button
        onClick={() => {
          const problem = customRangeError(meta, draft);
          setError(problem);
          if (!problem) onApply(draft);
        }}
        size="sm"
        type="button"
        variant="outline"
      >
        Apply
      </Button>
      {error && (
        <p className="text-destructive w-full text-xs font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// The portal's "Audience segments" multi-select. Nothing selected means all
// audiences.
export function AudienceFilter({
  audiences,
  onChange,
  selected,
}: {
  audiences: readonly Audience[];
  onChange: (selected: string[]) => void;
  selected: readonly string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const labelId = useId();

  useEffect(() => {
    if (!isOpen) return;
    // Closes on a click outside, or on Escape.
    const closeOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node))
        setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function toggle(code: string) {
    // Kept in the report's order, as the API echoes it.
    onChange(
      audiences
        .map((audience) => audience.code)
        .filter((option) =>
          option === code ? !selected.includes(code) : selected.includes(option),
        ),
    );
  }

  const summary =
    selected.length === 0
      ? "All audiences"
      : selected.length === 1
        ? (audiences.find((audience) => audience.code === selected[0])
            ?.label ?? "1 selected")
        : `${selected.length} selected`;
  return (
    <div className="relative" ref={containerRef}>
      <Label id={labelId}>Audience segments</Label>
      <Button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-labelledby={`${labelId} ${panelId}-summary`}
        className="mt-1.5 h-9 font-normal"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
        variant="outline"
      >
        <span id={`${panelId}-summary`}>{summary}</span>
        <ChevronDown aria-hidden className="size-4" />
      </Button>
      {isOpen && (
        <div
          className="bg-card absolute z-20 mt-1 min-w-56 space-y-1 rounded-lg border p-2 shadow-md"
          id={panelId}
        >
          <fieldset>
            <legend className="sr-only">Audience segments</legend>
            {audiences.map((audience) => (
              <label
                className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                key={audience.code}
              >
                <Checkbox
                  checked={selected.includes(audience.code)}
                  onChange={() => toggle(audience.code)}
                />
                {audience.label}
              </label>
            ))}
          </fieldset>
          <div className="border-t pt-1">
            <Button
              disabled={selected.length === 0}
              onClick={() => onChange([])}
              size="sm"
              type="button"
              variant="ghost"
            >
              Clear selection
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PreviewRangeControls({
  audienceFilter,
  channel,
  meta,
  onChannelChange,
  onRangeChange,
  range,
}: {
  // Shown on Marketing Intelligence tabs of a report with audiences.
  audienceFilter?: {
    selected: readonly string[];
    onChange: (selected: string[]) => void;
  };
  channel: string | undefined;
  meta: PreviewMeta;
  onChannelChange: (channel: string | undefined) => void;
  onRangeChange: (range: DateRange) => void;
  range: DateRange;
}) {
  const matching = rangePresets.find((preset) => {
    const candidate = presetRange(meta, preset);
    return candidate?.from === range.from && candidate.to === range.to;
  });
  const [isCustom, setIsCustom] = useState(!matching);
  const selected = isCustom || !matching ? "custom" : matching;
  const presets = meta.date_range.presets.filter(
    (preset) => isPreset(preset) || preset === "custom",
  );
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor="preview-range">Date range</Label>
        <Select
          className="mt-1.5 h-9 w-auto"
          id="preview-range"
          onChange={(event) => {
            const next = presetRange(meta, event.target.value);
            setIsCustom(!next);
            if (next) onRangeChange(next);
          }}
          value={selected}
        >
          {presets.map((preset) => (
            <option key={preset} value={preset}>
              {isPreset(preset) ? rangePresetLabels[preset] : "Custom range"}
            </option>
          ))}
        </Select>
      </div>
      {selected === "custom" && (
        <CustomRange
          key={`${range.from}-${range.to}`}
          meta={meta}
          onApply={onRangeChange}
          range={range}
        />
      )}
      {meta.channels.length > 0 && (
        <div>
          <Label htmlFor="preview-channel">Channel</Label>
          <Select
            className="mt-1.5 h-9 w-auto"
            id="preview-channel"
            onChange={(event) =>
              onChannelChange(event.target.value || undefined)
            }
            value={channel ?? ""}
          >
            <option value="">All channels</option>
            {meta.channels.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {audienceFilter && meta.audiences.length > 0 && (
        <AudienceFilter
          audiences={meta.audiences}
          onChange={audienceFilter.onChange}
          selected={audienceFilter.selected}
        />
      )}
    </div>
  );
}
