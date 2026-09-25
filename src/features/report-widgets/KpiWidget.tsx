"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Line, LineChart, YAxis } from "recharts";

import { Badge } from "@/components/ui/Badge";
import { formatValue } from "@/lib/formatters";
import { cn } from "@/lib/utils/cn";

import { chartColor } from "./chart";
import type { ValueAdornment, WidgetPayload } from "./contracts";

type Change = NonNullable<WidgetPayload<"kpi">["change"]>;

const sentimentTones = {
  positive: "success",
  negative: "danger",
  neutral: "neutral",
} as const;
const directionIcons = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus };
const directionWords = { up: "Up", down: "Down", flat: "No change" };

// The change against the previous period. Colour follows the sentiment the
// API sends; the direction is also spelled out for screen readers.
export function ChangeBadge({
  change,
  currency,
}: {
  change: Change;
  currency: string;
}) {
  const DirectionIcon = directionIcons[change.direction];
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <Badge tone={sentimentTones[change.sentiment]}>
        <DirectionIcon aria-hidden className="size-3" />
        <span className="sr-only">{directionWords[change.direction]} </span>
        {formatValue(change.value, change.format ?? "percent", currency)}
      </Badge>
      {change.label && (
        <span className="text-muted-foreground">{change.label}</span>
      )}
    </span>
  );
}

export function KpiWidget({
  currency,
  isCompact = false,
  payload,
  valueAdornment,
}: {
  currency: string;
  isCompact?: boolean;
  payload: WidgetPayload<"kpi">;
  valueAdornment?: ValueAdornment;
}) {
  const { change } = payload;
  const sparkline = payload.sparkline?.filter((point) => point.y !== null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p
          className={cn(
            "text-strong font-semibold tracking-tight tabular-nums",
            isCompact ? "text-2xl" : "text-3xl",
          )}
        >
          {formatValue(payload.value, payload.format, currency)}
        </p>
        {valueAdornment?.("value")}
      </div>
      {change && <ChangeBadge change={change} currency={currency} />}
      {sparkline && sparkline.length > 1 && (
        <div aria-hidden className={isCompact ? "h-10" : "h-12"}>
          <LineChart
            // A text alternative sits beside each chart, so the SVG itself
            // stays out of the tab order and the accessibility tree.
            accessibilityLayer={false}
            data={sparkline}
            height="100%"
            margin={{ top: 4, right: 0, bottom: 4, left: 0 }}
            responsive
            width="100%"
          >
            <YAxis dataKey="y" domain={["auto", "auto"]} hide />
            <Line
              dataKey="y"
              dot={false}
              isAnimationActive={false}
              stroke={chartColor(0)}
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </div>
      )}
    </div>
  );
}

// Adornments of a nested payload are addressed from the widget root, so a
// child renderer's `value` becomes `items.2.value`.
export function nestedAdornment(
  valueAdornment: ValueAdornment | undefined,
  prefix: string,
): ValueAdornment | undefined {
  return valueAdornment && ((path) => valueAdornment(`${prefix}.${path}`));
}

export function KpiGroupWidget({
  currency,
  payload,
  valueAdornment,
}: {
  currency: string;
  payload: WidgetPayload<"kpi_group">;
  valueAdornment?: ValueAdornment;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {payload.items.map((kpi, index) => (
        // KPIs have no id; the metric order is set in the widget settings.
        <li className="bg-muted/40 rounded-lg border p-3" key={index}>
          <p className="text-muted-foreground mb-1 text-sm font-medium">
            {kpi.label}
          </p>
          <KpiWidget
            currency={currency}
            isCompact
            payload={kpi}
            valueAdornment={nestedAdornment(valueAdornment, `items.${index}`)}
          />
        </li>
      ))}
    </ul>
  );
}
