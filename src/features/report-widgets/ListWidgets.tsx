"use client";

import { useState } from "react";

import { formatValue } from "@/lib/formatters";
import { cn } from "@/lib/utils/cn";

import { chartColor } from "./chart";
import type { ValueAdornment, WidgetPayload } from "./contracts";
import { ChangeBadge } from "./KpiWidget";

// A share (0–100) drawn as a bar. The number beside it carries the meaning,
// so the bar itself is decoration.
function ShareBar({ color, share }: { color: string; share: number | null }) {
  const width = Math.min(Math.max(share ?? 0, 0), 100);
  return (
    <div aria-hidden className="bg-muted h-2 overflow-hidden rounded-full">
      <div
        className="h-full rounded-full"
        // Bar length and colour are data driven.
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function KpiListWidget({
  currency,
  payload,
}: {
  currency: string;
  payload: WidgetPayload<"kpi_list">;
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {payload.items.map((item, index) => (
        // Manual rows have no id; their position is their identity.
        <div className="bg-muted/40 rounded-lg border p-3" key={index}>
          <dt className="text-muted-foreground text-sm">{item.label}</dt>
          <dd className="text-strong mt-1 text-xl font-semibold tabular-nums">
            {formatValue(item.value, item.format, currency)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressListWidget({
  currency,
  payload,
  title,
}: {
  currency: string;
  payload: WidgetPayload<"progress_list">;
  title: string;
}) {
  const groups = payload.groups ?? [];
  const [groupKey, setGroupKey] = useState(groups[0]?.key);
  // A group the payload no longer has falls back to the first one.
  const activeGroup =
    groups.find((group) => group.key === groupKey)?.key ?? groups[0]?.key;
  const items = activeGroup
    ? payload.items.filter((item) => item.group === activeGroup)
    : payload.items;
  const footer = payload.footer ?? [];
  return (
    <div className="space-y-4">
      {groups.length > 0 && (
        <div
          aria-label={`${title} groups`}
          className="bg-muted flex w-fit flex-wrap gap-1 rounded-lg border p-1"
          role="group"
        >
          {groups.map((group) => (
            <button
              aria-pressed={group.key === activeGroup}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium",
                group.key === activeGroup
                  ? "bg-card text-strong shadow-sm"
                  : "text-muted-foreground hover:text-strong",
              )}
              key={group.key}
              onClick={() => setGroupKey(group.key)}
              type="button"
            >
              {group.label}
            </button>
          ))}
        </div>
      )}
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No rows in this group.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li className="space-y-1.5" key={`${item.group ?? ""}-${index}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span className="text-strong font-medium">{item.label}</span>
                <span className="flex items-baseline gap-3 tabular-nums">
                  {item.secondary && (
                    <span className="text-muted-foreground text-xs">
                      {item.secondary.label}{" "}
                      {formatValue(
                        item.secondary.value,
                        item.secondary.format,
                        currency,
                      )}
                    </span>
                  )}
                  <span className="text-strong">
                    {formatValue(item.value, item.format, currency)}
                  </span>
                </span>
              </div>
              <ShareBar color={chartColor(0)} share={item.share} />
            </li>
          ))}
        </ul>
      )}
      {footer.length > 0 && (
        <dl className="grid gap-3 border-t pt-4 sm:grid-cols-2">
          {footer.map((kpi, index) => (
            <div key={index}>
              <dt className="text-muted-foreground text-sm">{kpi.label}</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-strong text-xl font-semibold tabular-nums">
                  {formatValue(kpi.value, kpi.format, currency)}
                </span>
                {kpi.change && (
                  <ChangeBadge change={kpi.change} currency={currency} />
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function ChannelListWidget({
  currency,
  payload,
  valueAdornment,
}: {
  currency: string;
  payload: WidgetPayload<"channel_list">;
  valueAdornment?: ValueAdornment;
}) {
  return (
    <ul className="space-y-4">
      {payload.items.map((item, index) => (
        <li className="space-y-1.5" key={item.channel}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <span className="text-strong font-medium">{item.label}</span>
            <span className="flex flex-wrap items-center gap-x-3 tabular-nums">
              <span className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">Spend</span>
                <span className="text-strong">
                  {formatValue(item.spend, "currency", currency)}
                </span>
                {valueAdornment?.(`items.${index}.spend`)}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">ROAS</span>
                <span className="text-strong font-semibold">
                  {formatValue(item.roas, "multiplier", currency)}
                </span>
                {valueAdornment?.(`items.${index}.roas`)}
              </span>
            </span>
          </div>
          <ShareBar color={chartColor(index)} share={item.share} />
        </li>
      ))}
    </ul>
  );
}
