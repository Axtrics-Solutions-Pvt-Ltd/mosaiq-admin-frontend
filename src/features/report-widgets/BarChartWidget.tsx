"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import { formatValue } from "@/lib/formatters";

import { chartColor } from "./chart";
import type { WidgetPayload } from "./contracts";

export function BarChartWidget({
  currency,
  payload,
  title,
}: {
  currency: string;
  payload: WidgetPayload<"bar_chart">;
  title: string;
}) {
  // Bars hold numbers only; a text value can't be drawn and counts as none.
  const bars = payload.items.map((item, index) => ({
    index,
    label: item.label,
    value: typeof item.value === "number" ? item.value : null,
  }));
  const axisFormat = payload.items[0]?.format ?? "number";
  return (
    <div className="space-y-3">
      <div aria-hidden className="h-56">
        <BarChart
          // A text alternative sits beside each chart, so the SVG itself
          // stays out of the tab order and the accessibility tree.
          accessibilityLayer={false}
          data={bars}
          height="100%"
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          responsive
          width="100%"
        >
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            fontSize={12}
            stroke="var(--text-muted)"
            tickLine={false}
          />
          <YAxis
            fontSize={12}
            stroke="var(--text-muted)"
            tickFormatter={(value: number) =>
              formatValue(value, axisFormat, currency)
            }
            tickLine={false}
            width={56}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-subtle)" }}
            formatter={(value, _name, entry) => {
              const item = payload.items[entry.payload?.index ?? -1];
              return [
                formatValue(
                  typeof value === "number" ? value : null,
                  item?.format ?? axisFormat,
                  currency,
                ),
                item?.label ?? "",
              ];
            }}
          />
          <Bar
            dataKey="value"
            fill={chartColor(0)}
            isAnimationActive={false}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {payload.items.map((item, index) => (
            <tr key={index}>
              <th scope="row">{item.label}</th>
              <td>{formatValue(item.value, item.format, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
