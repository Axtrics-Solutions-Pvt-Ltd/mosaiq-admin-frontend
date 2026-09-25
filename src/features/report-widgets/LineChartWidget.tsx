"use client";

import { useId, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { formatValue } from "@/lib/formatters";
import { cn } from "@/lib/utils/cn";

import { bucketLabel, chartColor } from "./chart";
import type { ValueAdornment, WidgetPayload } from "./contracts";

type Series = WidgetPayload<"line_chart">["series"][number];

export function LineChartWidget({
  currency,
  payload,
  title,
  valueAdornment,
}: {
  currency: string;
  payload: WidgetPayload<"line_chart">;
  title: string;
  valueAdornment?: ValueAdornment;
}) {
  const selectId = useId();
  const variants = payload.variants ?? [];
  // A variant only chooses which series are drawn; it needs no API call.
  const [variantKey, setVariantKey] = useState(variants[0]?.key);
  const variant = variants.find((entry) => entry.key === variantKey);
  const visible = variant
    ? payload.series.filter((series) =>
        variant.series_keys.includes(series.key),
      )
    : payload.series;
  const buckets = payload.series[0]?.points ?? [];
  const rows = buckets.map((point, index) => ({
    label: bucketLabel(point.x, index, payload.granularity),
    ...Object.fromEntries(
      payload.series.map((series) => [
        series.key,
        series.points[index]?.y ?? null,
      ]),
    ),
  }));
  const seriesByKey = new Map(
    payload.series.map((series) => [series.key, series]),
  );
  const axisFormat = (axis: Series["axis"]) =>
    visible.find((series) => series.axis === axis)?.format ?? "number";
  const hasRightAxis = visible.some((series) => series.axis === "right");

  return (
    <div className="space-y-3">
      {variants.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <Label className="text-muted-foreground text-xs" htmlFor={selectId}>
            Series
          </Label>
          <Select
            className="h-9 w-auto"
            id={selectId}
            onChange={(event) => setVariantKey(event.target.value)}
            value={variantKey}
          >
            {variants.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div aria-hidden className="h-64">
        <LineChart
          // A text alternative sits beside each chart, so the SVG itself
          // stays out of the tab order and the accessibility tree.
          accessibilityLayer={false}
          data={rows}
          height="100%"
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          responsive
          width="100%"
        >
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--text-muted)"
            tickLine={false}
            fontSize={12}
          />
          <YAxis
            fontSize={12}
            stroke="var(--text-muted)"
            tickFormatter={(value: number) =>
              formatValue(value, axisFormat("left"), currency)
            }
            tickLine={false}
            width={64}
            yAxisId="left"
          />
          {hasRightAxis && (
            <YAxis
              fontSize={12}
              orientation="right"
              stroke="var(--text-muted)"
              tickFormatter={(value: number) =>
                formatValue(value, axisFormat("right"), currency)
              }
              tickLine={false}
              width={64}
              yAxisId="right"
            />
          )}
          <Tooltip
            formatter={(value, name) => {
              const series = seriesByKey.get(String(name));
              return [
                formatValue(
                  typeof value === "number" ? value : null,
                  series?.format ?? "number",
                  currency,
                ),
                series?.label ?? String(name),
              ];
            }}
          />
          {visible.map((series) => (
            <Line
              dataKey={series.key}
              dot={false}
              isAnimationActive={false}
              key={series.key}
              name={series.key}
              stroke={chartColor(payload.series.indexOf(series))}
              strokeWidth={2}
              type="monotone"
              yAxisId={
                series.axis === "right" && hasRightAxis ? "right" : "left"
              }
            />
          ))}
        </LineChart>
      </div>
      <ul className="flex flex-wrap gap-4 text-xs">
        {visible.map((series) => (
          <li className="flex items-center gap-1.5" key={series.key}>
            <svg aria-hidden className="size-2.5" viewBox="0 0 10 10">
              <circle
                cx="5"
                cy="5"
                fill={chartColor(payload.series.indexOf(series))}
                r="5"
              />
            </svg>
            {series.label}
            {hasRightAxis && (
              <span className="text-muted-foreground">
                ({series.axis === "right" ? "right axis" : "left axis"})
              </span>
            )}
          </li>
        ))}
      </ul>
      {valueAdornment ? (
        // Chart points are too small to hold controls, so the builder puts
        // each point's pencil in a table that is also the text alternative.
        <details className="group text-sm">
          <summary className="text-primary focus-visible:ring-ring w-fit cursor-pointer rounded-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
            Values and corrections
          </summary>
          <div className="mt-2 overflow-x-auto">
            <ValuesTable
              buckets={buckets}
              currency={currency}
              payload={payload}
              rows={rows}
              title={title}
              valueAdornment={valueAdornment}
              visible={visible}
            />
          </div>
        </details>
      ) : (
        <ValuesTable
          buckets={buckets}
          className="sr-only"
          currency={currency}
          payload={payload}
          rows={rows}
          title={title}
          visible={visible}
        />
      )}
    </div>
  );
}

function ValuesTable({
  buckets,
  className,
  currency,
  payload,
  rows,
  title,
  valueAdornment,
  visible,
}: {
  buckets: Series["points"];
  className?: string;
  currency: string;
  payload: WidgetPayload<"line_chart">;
  rows: readonly { label: string }[];
  title: string;
  valueAdornment?: ValueAdornment;
  visible: readonly Series[];
}) {
  return (
    <table className={cn("w-full text-left tabular-nums", className)}>
      <caption className="sr-only">{title}</caption>
      <thead className="text-muted-foreground text-xs">
        <tr>
          <th className="py-1.5 pr-3 font-medium" scope="col">
            Period
          </th>
          {visible.map((series) => (
            <th
              className="py-1.5 pr-3 font-medium"
              key={series.key}
              scope="col"
            >
              {series.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {buckets.map((point, index) => (
          <tr className="border-t" key={point.x}>
            <th className="py-1 pr-3 font-medium whitespace-nowrap" scope="row">
              {rows[index]?.label}
            </th>
            {visible.map((series) => (
              <td className="py-1 pr-3 whitespace-nowrap" key={series.key}>
                {formatValue(
                  series.points[index]?.y ?? null,
                  series.format,
                  currency,
                )}
                {valueAdornment?.(
                  `series.${payload.series.indexOf(series)}.points.${index}.y`,
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
