"use client";

import { Cell, Pie, PieChart } from "recharts";

import { Badge } from "@/components/ui/Badge";
import { formatValue } from "@/lib/formatters";
import { cn } from "@/lib/utils/cn";

import {
  chartColor,
  ringCenterClass,
  ringFrameClass,
  ringLabelClass,
  ringValueRowClass,
  ringValueSize,
} from "./chart";
import type { ValueAdornment, WidgetPayload } from "./contracts";
import { ChangeBadge } from "./KpiWidget";
import { statusTones } from "./TableWidgets";

export function GaugeWidget({
  currency,
  payload,
  valueAdornment,
}: {
  currency: string;
  payload: WidgetPayload<"gauge">;
  valueAdornment?: ValueAdornment;
}) {
  // The ring fills `value / max`; a value past `max`, such as over pacing,
  // shows a full ring while the centre keeps the real number.
  const filled = Math.min(Math.max(payload.value ?? 0, 0), payload.max);
  const ring = [
    { key: "value", value: filled },
    { key: "rest", value: payload.max - filled },
  ];
  const details = payload.details ?? [];
  const centerValue = formatValue(payload.value, payload.format, currency);
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,12rem)_1fr]">
      <div className={ringFrameClass}>
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
              data={ring}
              dataKey="value"
              endAngle={-270}
              innerRadius="62%"
              isAnimationActive={false}
              outerRadius="92%"
              startAngle={90}
              stroke="none"
            >
              <Cell fill={chartColor(0)} />
              <Cell fill="var(--border)" />
            </Pie>
          </PieChart>
        </div>
        <div className={ringCenterClass}>
          <span className={ringValueRowClass}>
            <span
              className={cn(
                "text-strong max-w-full min-w-0 truncate font-semibold tabular-nums",
                ringValueSize(centerValue),
              )}
              title={centerValue}
            >
              {centerValue}
            </span>
            {valueAdornment?.("value")}
          </span>
          {payload.label && payload.label !== payload.status?.label && (
            <span className={ringLabelClass}>{payload.label}</span>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {(payload.status || payload.change) && (
          <div className="flex flex-wrap items-center gap-2">
            {payload.status && (
              // The label names the status, so colour is never the only cue.
              <Badge tone={statusTones[payload.status.code] ?? "neutral"}>
                {payload.status.label}
              </Badge>
            )}
            {payload.change && (
              <ChangeBadge change={payload.change} currency={currency} />
            )}
          </div>
        )}
        {details.length > 0 && (
          <ul className="divide-y text-sm">
            {details.map((detail, index) => (
              <li
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2"
                key={detail.label}
              >
                <span className="text-muted-foreground">{detail.label}</span>
                <span className="flex items-center gap-2 tabular-nums">
                  <span className="text-strong font-medium">
                    {formatValue(detail.value, detail.format, currency)}
                  </span>
                  {valueAdornment?.(`details.${index}.value`)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
