import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { formatValue } from "@/lib/formatters";
import { cn } from "@/lib/utils/cn";

import type { ValueAdornment, WidgetPayload } from "./contracts";

// Tables keep their columns on small screens and scroll sideways inside the
// card. The scroll region is focusable so keyboard users can scroll it too.
function ScrollTable({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <div
      aria-label={caption}
      className="focus-visible:ring-ring -mx-1 overflow-x-auto rounded-sm px-1 focus-visible:ring-2 focus-visible:outline-none"
      role="region"
      tabIndex={0}
    >
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

const headCell = "text-muted-foreground py-2 pr-4 text-xs font-medium";
const bodyCell = "py-2.5 pr-4 align-top";

const statusTones: Record<
  string,
  "success" | "warning" | "danger" | "neutral"
> = {
  healthy: "success",
  on_watch: "warning",
  needs_attention: "danger",
  info: "neutral",
};

export function MetricTableWidget({
  currency,
  payload,
  title,
  valueAdornment,
}: {
  currency: string;
  payload: WidgetPayload<"metric_table">;
  title: string;
  valueAdornment?: ValueAdornment;
}) {
  return (
    <ScrollTable caption={title}>
      <thead>
        <tr>
          <th className={headCell} scope="col">
            Metric
          </th>
          <th className={headCell} scope="col">
            Value
          </th>
          <th className={headCell} scope="col">
            Status
          </th>
          <th className={headCell} scope="col">
            Details
          </th>
        </tr>
      </thead>
      <tbody>
        {payload.rows.map((row, index) => (
          <tr className="border-t" key={row.metric}>
            <th className={cn(bodyCell, "text-strong font-medium")} scope="row">
              {row.label}
            </th>
            <td className={cn(bodyCell, "whitespace-nowrap tabular-nums")}>
              <span className="flex items-center gap-1">
                <span className="text-strong">
                  {formatValue(row.value, row.format, currency)}
                </span>
                {valueAdornment?.(`rows.${index}.value`)}
              </span>
            </td>
            <td className={bodyCell}>
              {row.status ? (
                // The label names the status, so colour is never the only cue.
                <Badge tone={statusTones[row.status.code] ?? "neutral"}>
                  {row.status.label}
                </Badge>
              ) : (
                "—"
              )}
            </td>
            <td className={cn(bodyCell, "text-muted-foreground min-w-40")}>
              {row.details || "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </ScrollTable>
  );
}

export function FieldTableWidget({
  payload,
  title,
}: {
  payload: WidgetPayload<"field_table">;
  title: string;
}) {
  const [field = "Field", value = "Value", note = "Notes"] = payload.columns;
  return (
    <ScrollTable caption={title}>
      <thead>
        <tr>
          <th className={headCell} scope="col">
            {field}
          </th>
          <th className={headCell} scope="col">
            {value}
          </th>
          <th className={headCell} scope="col">
            {note}
          </th>
        </tr>
      </thead>
      <tbody>
        {payload.rows.map((row, index) => (
          // Manual rows have no id; their position is their identity.
          <tr className="border-t" key={index}>
            <th className={cn(bodyCell, "text-strong font-medium")} scope="row">
              {row.field}
            </th>
            <td className={cn(bodyCell, "text-strong")}>{row.value}</td>
            <td className={cn(bodyCell, "text-muted-foreground min-w-40")}>
              {row.note || "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </ScrollTable>
  );
}

const isNumericFormat = (format: string) => format !== "text";

export function DataTableWidget({
  currency,
  payload,
  title,
  valueAdornment,
}: {
  currency: string;
  payload: WidgetPayload<"data_table">;
  title: string;
  valueAdornment?: ValueAdornment;
}) {
  const [first, ...rest] = payload.columns;
  if (!first) return null;
  return (
    <ScrollTable caption={title}>
      <thead>
        <tr>
          {payload.columns.map((column) => (
            <th
              className={cn(
                headCell,
                "whitespace-nowrap",
                isNumericFormat(column.format) && "text-right",
              )}
              key={column.key}
              scope="col"
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {payload.rows.map((row, index) => (
          <tr className="border-t" key={index}>
            <th
              className={cn(
                bodyCell,
                "text-strong font-medium whitespace-nowrap",
                isNumericFormat(first.format) && "text-right tabular-nums",
              )}
              scope="row"
            >
              {formatValue(row[first.key], first.format, currency)}
            </th>
            {rest.map((column) => (
              <td
                className={cn(
                  bodyCell,
                  "whitespace-nowrap",
                  isNumericFormat(column.format) && "text-right tabular-nums",
                )}
                key={column.key}
              >
                <span className="inline-flex items-center gap-1">
                  {formatValue(row[column.key], column.format, currency)}
                  {valueAdornment?.(`rows.${index}.${column.key}`)}
                </span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </ScrollTable>
  );
}

// Shading from the lowest to the highest value, as a share of the chart blue.
function shade(value: number, min: number, max: number) {
  const level = max === min ? 0.5 : (value - min) / (max - min);
  return { level, percent: Math.round(12 + level * 78) };
}

export function HeatmapWidget({
  payload,
  title,
}: {
  payload: WidgetPayload<"heatmap">;
  title: string;
}) {
  const values = payload.rows.flatMap((row) =>
    row.values.filter((value): value is number => value !== null),
  );
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  return (
    <ScrollTable caption={title}>
      <thead>
        <tr>
          <td />
          {payload.columns.map((column, index) => (
            <th
              className={cn(headCell, "px-1 text-center whitespace-nowrap")}
              key={index}
              scope="col"
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {payload.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            <th
              className="text-strong py-1 pr-3 text-sm font-medium whitespace-nowrap"
              scope="row"
            >
              {row.label}
            </th>
            {payload.columns.map((_, columnIndex) => {
              const value = row.values[columnIndex] ?? null;
              const cell = value === null ? null : shade(value, min, max);
              return (
                <td className="p-0.5" key={columnIndex}>
                  <span
                    className={cn(
                      "flex h-9 min-w-12 items-center justify-center rounded-md text-xs font-medium tabular-nums",
                      cell === null && "bg-muted text-muted-foreground",
                      cell && cell.level > 0.55 ? "text-white" : "text-strong",
                    )}
                    // Shading scales with the value; the number is always
                    // printed, so colour is never the only cue.
                    style={
                      cell
                        ? {
                            backgroundColor: `color-mix(in srgb, var(--chart-blue) ${cell.percent}%, var(--surface))`,
                          }
                        : undefined
                    }
                  >
                    {formatValue(value, "number", "")}
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </ScrollTable>
  );
}
