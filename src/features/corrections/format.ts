import type { MetricCode } from "@/features/channels/contracts";
import { formatCurrency, formatNumber } from "@/lib/formatters";

export type MetricFormat =
  { kind: "number" } | { kind: "currency"; currency: string };

// Spend and revenue are amounts in the workspace currency.
export function metricFormat(code: MetricCode, currency: string): MetricFormat {
  return code === "spend" || code === "revenue"
    ? { kind: "currency", currency }
    : { kind: "number" };
}

export function formatMetricValue(value: number, format: MetricFormat) {
  return format.kind === "currency"
    ? formatCurrency(value, format.currency)
    : formatNumber(value);
}
