import { z } from "zod";

import {
  baseMetricCodes,
  type MetricCode,
  metricLabels,
} from "@/features/channels/contracts";

// Mirrors the API metric registry: spend and revenue are amounts, every other
// base metric is a whole number.
const integerMetricCodes: ReadonlySet<MetricCode> = new Set([
  "impressions",
  "clicks",
  "conversions",
  "reach",
  "video_views",
  "sessions",
  "users",
]);

export function isIntegerMetric(code: MetricCode) {
  return integerMetricCodes.has(code);
}

export function isBaseMetric(code: string): code is MetricCode {
  return baseMetricCodes.some((known) => known === code);
}

export function metricLabel(code: string) {
  return isBaseMetric(code) ? metricLabels[code] : code;
}

// Calculated metrics follow from their inputs and can't be corrected directly.
export const calculatedMetrics = {
  roas: { label: "ROAS", inputs: ["revenue", "spend"] },
  cpa: { label: "CPA", inputs: ["spend", "conversions"] },
  ctr: { label: "CTR", inputs: ["clicks", "impressions"] },
  cpm: { label: "CPM", inputs: ["spend", "impressions"] },
  cpc: { label: "CPC", inputs: ["spend", "clicks"] },
  conversion_rate: {
    label: "Conversion rate",
    inputs: ["conversions", "clicks"],
  },
} as const satisfies Record<
  string,
  { label: string; inputs: readonly [MetricCode, MetricCode] }
>;

export type CalculatedMetricCode = keyof typeof calculatedMetrics;

// The tooltip on a calculated value in place of the correction pencil.
export function calculatedMetricHint(code: CalculatedMetricCode) {
  const inputs = calculatedMetrics[code].inputs
    .map((input) => metricLabels[input])
    .join(" ÷ ");
  return `Calculated from ${inputs}. Edit those instead.`;
}

export const maxCorrectedTotal = 999_999_999_999;

const correctionSchema = z.object({
  id: z.number().int().positive(),
  client_id: z.number().int().positive(),
  workspace_id: z.number().int().positive(),
  campaign_key: z.string().nullable(),
  metric_code: z.string(),
  date_from: z.string(),
  date_to: z.string(),
  original_total: z.number(),
  corrected_total: z.number(),
  note: z.string().nullable(),
  is_active: z.boolean(),
  rows_owned: z.number().int().nonnegative().optional(),
  created_by: z
    .object({ id: z.number().int().positive(), name: z.string() })
    .nullable()
    .optional(),
  reverted_at: z.string().nullable(),
  reverted_by: z.number().int().nullable(),
  created_at: z.string().nullable(),
});

export const correctionListSchema = z.object({
  data: z.array(correctionSchema),
  meta: z.object({
    current_page: z.number().int().positive(),
    last_page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});
export const correctionResponseSchema = z.object({ data: correctionSchema });

export const correctionRequestSchema = z
  .object({
    workspace_id: z.number().int().positive(),
    metric_code: z.enum(baseMetricCodes),
    campaign_key: z.string().min(1).max(150).nullable(),
    date_from: z.iso.date(),
    date_to: z.iso.date(),
    corrected_total: z.number().min(0).max(maxCorrectedTotal),
    note: z.string().max(2000).nullable(),
  })
  .superRefine((request, context) => {
    if (request.date_to < request.date_from)
      context.addIssue({
        code: "custom",
        path: ["date_to"],
        message: "The end date must be on or after the start date.",
      });
    if (
      isIntegerMetric(request.metric_code) &&
      !Number.isInteger(request.corrected_total)
    )
      context.addIssue({
        code: "custom",
        path: ["corrected_total"],
        message: "This metric is a whole number.",
      });
  });

// The dialog edits the total as text so thousands separators can be typed.
export function correctionFormSchema(metricCode: MetricCode) {
  const isInteger = isIntegerMetric(metricCode);
  return z.object({
    corrected_total: z.string().transform((value, context) => {
      const normalized = value.replace(/[\s,]/g, "");
      const fail = (message: string) => {
        context.addIssue({ code: "custom", message });
        return z.NEVER;
      };
      if (!normalized) return fail("Enter the corrected total.");
      if (!/^\d+(\.\d+)?$/.test(normalized))
        return fail("Enter a number of 0 or more.");
      const total = Number(normalized);
      if (isInteger && !Number.isInteger(total))
        return fail("This metric is a whole number.");
      if (total > maxCorrectedTotal)
        return fail("Enter a total of 999,999,999,999 or less.");
      return total;
    }),
    note: z
      .string()
      .max(2000, "Keep the note to 2,000 characters.")
      .transform((note) => note.trim() || null),
  });
}

export type CorrectionStatus = "active" | "partly_replaced" | "reset";

export function correctionStatus(correction: Correction): CorrectionStatus {
  if (!correction.is_active) return "reset";
  // The API doesn't return how many rows a correction first owned, so only a
  // correction that lost every row is detectable. Its range always held data,
  // so owning none means newer corrections replaced part of it.
  if (correction.rows_owned === 0) return "partly_replaced";
  return "active";
}

export type Correction = z.infer<typeof correctionSchema>;
export type CorrectionRequest = z.infer<typeof correctionRequestSchema>;
export type CorrectionFormValues = z.input<
  ReturnType<typeof correctionFormSchema>
>;
export type CorrectionFormOutput = z.output<
  ReturnType<typeof correctionFormSchema>
>;
