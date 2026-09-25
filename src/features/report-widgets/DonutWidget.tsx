"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";

import { formatValue } from "@/lib/formatters";

import { chartColor } from "./chart";
import type { ValueAdornment, WidgetPayload } from "./contracts";
import { ChangeBadge } from "./KpiWidget";

export function DonutWidget({
  currency,
  onChannelSelect,
  payload,
  valueAdornment,
}: {
  currency: string;
  onChannelSelect?: (channelCode: string) => void;
  payload: WidgetPayload<"donut">;
  valueAdornment?: ValueAdornment;
}) {
  // Item keys are channel codes when the donut is filterable (contract §5).
  const selectChannel = payload.filterable ? onChannelSelect : undefined;
  const slices = payload.items.map((item) => ({
    key: item.key,
    label: item.label,
    value: item.value ?? 0,
  }));
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,12rem)_1fr]">
      <div className="relative mx-auto aspect-square w-full max-w-48">
        <div aria-hidden className="absolute inset-0">
          <PieChart
            // A text alternative sits beside each chart, so the SVG itself
            // stays out of the tab order and the accessibility tree.
            accessibilityLayer={false}
            height="100%"
            responsive
            width="100%"
          >
            <Pie
              data={slices}
              dataKey="value"
              innerRadius="62%"
              isAnimationActive={false}
              nameKey="label"
              onClick={
                selectChannel
                  ? (_, index) => {
                      const slice = slices[index];
                      if (slice) selectChannel(slice.key);
                    }
                  : undefined
              }
              outerRadius="92%"
              paddingAngle={1}
              stroke="var(--surface)"
            >
              {slices.map((slice, index) => (
                <Cell
                  className={selectChannel ? "cursor-pointer" : undefined}
                  fill={chartColor(index)}
                  key={slice.key}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, entry) => {
                const item = payload.items.find(
                  (candidate) => candidate.key === entry.payload?.key,
                );
                return formatValue(
                  typeof value === "number" ? value : null,
                  item?.format ?? "number",
                  currency,
                );
              }}
            />
          </PieChart>
        </div>
        {payload.center && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-muted-foreground text-xs">
              {payload.center.label}
            </span>
            <span className="pointer-events-auto flex items-center gap-1">
              <span className="text-strong text-xl font-semibold tabular-nums">
                {formatValue(
                  payload.center.value,
                  payload.center.format,
                  currency,
                )}
              </span>
              {valueAdornment?.("center.value")}
            </span>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {payload.center?.change && (
          <ChangeBadge change={payload.center.change} currency={currency} />
        )}
        <ul className="divide-y text-sm">
          {payload.items.map((item, index) => (
            <li
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2"
              key={item.key}
            >
              <span className="flex min-w-0 items-center gap-2">
                <svg
                  aria-hidden
                  className="size-2.5 shrink-0"
                  viewBox="0 0 10 10"
                >
                  <circle cx="5" cy="5" fill={chartColor(index)} r="5" />
                </svg>
                {selectChannel ? (
                  <button
                    aria-label={`Filter the report by ${item.label}`}
                    className="text-strong hover:text-primary truncate text-left font-medium underline-offset-2 hover:underline"
                    onClick={() => selectChannel(item.key)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="text-strong truncate font-medium">
                    {item.label}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2 tabular-nums">
                <span className="text-strong">
                  {formatValue(item.value, item.format, currency)}
                </span>
                {valueAdornment?.(`items.${index}.value`)}
                {item.share !== null && (
                  <span className="text-muted-foreground w-14 text-right text-xs">
                    {formatValue(item.share, "percent", currency)}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
