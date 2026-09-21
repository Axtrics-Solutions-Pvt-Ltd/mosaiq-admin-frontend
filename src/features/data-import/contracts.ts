import { z } from "zod";

export const csvImportTypes = ["reporting", "marketing", "mmm"] as const;
export const csvImportTypeSchema = z.enum(csvImportTypes);
export type CsvImportType = z.infer<typeof csvImportTypeSchema>;

export const datasetTypeLabels: Record<CsvImportType, string> = {
  reporting: "Reporting",
  marketing: "Marketing Intelligence",
  mmm: "Media Mix Model",
};

export const csvImportModes = ["append", "replace"] as const;
export const csvImportModeSchema = z.enum(csvImportModes);
export type CsvImportMode = z.infer<typeof csvImportModeSchema>;

export const csvImportSchema = z.object({
  id: z.number().int().positive(),
  agency_id: z.number().int().positive(),
  workspace_id: z.number().int().positive(),
  type: z.string(),
  template_version: z.number().int(),
  status: z.string(),
  mode: csvImportModeSchema.nullable(),
  original_filename: z.string(),
  checksum: z.string(),
  row_count: z.number().int().nonnegative(),
  valid_count: z.number().int().nonnegative(),
  error_count: z.number().int().nonnegative(),
  validation_errors: z.array(z.unknown()),
  failure_code: z.string().nullable(),
  file_expires_at: z.string().nullable(),
  confirmed_at: z.string().nullable(),
  completed_at: z.string().nullable(),
});
export type CsvImport = z.infer<typeof csvImportSchema>;
export const csvImportResponseSchema = z.object({ data: csvImportSchema });

export const confirmCsvImportPayloadSchema = z.object({
  mode: csvImportModeSchema,
});
export type ConfirmCsvImportPayload = z.infer<
  typeof confirmCsvImportPayloadSchema
>;

export const importHistorySchema = z.object({
  id: z.number().int().positive(),
  agency_id: z.number().int().positive(),
  workspace_id: z.number().int().positive(),
  uploaded_by_user_id: z.number().int().positive(),
  type: z.string(),
  status: z.string(),
  mode: csvImportModeSchema.nullable(),
  original_filename: z.string(),
  row_count: z.number().int().nonnegative(),
  valid_count: z.number().int().nonnegative(),
  error_count: z.number().int().nonnegative(),
  failure_code: z.string().nullable(),
  created_at: z.string().nullable(),
  completed_at: z.string().nullable(),
});
export type ImportHistoryEntry = z.infer<typeof importHistorySchema>;

export const importHistoryListResponseSchema = z.object({
  data: z.array(importHistorySchema),
  meta: z.object({
    current_page: z.number().int().positive(),
    last_page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    per_page: z.number().int().positive(),
  }),
});

export const importHistoryStatuses = [
  "previewed",
  "invalid",
  "processing",
  "imported",
  "failed",
] as const;
export type ImportHistoryStatus = (typeof importHistoryStatuses)[number];

/**
 * Column reference only; the API does not expose a machine-readable
 * template. This is documentation copy, not sample or fixture data.
 */
export const datasetColumnGuides: Record<
  CsvImportType,
  { description: string; columns: readonly string[] }
> = {
  reporting: {
    description: "Campaign performance by date, channel, and campaign.",
    columns: [
      "date",
      "channel",
      "campaign",
      "impressions",
      "clicks",
      "spend",
      "revenue",
    ],
  },
  marketing: {
    description: "Lead and conversion performance by date, channel, and campaign.",
    columns: ["date", "channel", "campaign", "spend", "leads", "conversions"],
  },
  mmm: {
    description: "Time series spend and outcome inputs by date and channel.",
    columns: ["date", "channel", "spend", "outcome"],
  },
};

/**
 * Illustrative rows for the downloadable sample CSV template only. Not used
 * to render any preview or validation UI. Dates use ISO 8601 (YYYY-MM-DD).
 */
export const datasetSampleRows: Record<CsvImportType, readonly (readonly string[])[]> = {
  reporting: [
    ["2026-01-15", "Paid Social", "Spring Launch", "120000", "3400", "1500.00", "8600.00"],
    ["2026-01-16", "Search", "Spring Launch", "45000", "1200", "980.50", "4200.00"],
  ],
  marketing: [
    ["2026-01-15", "Paid Social", "Spring Launch", "1500.00", "45", "20"],
    ["2026-01-16", "Search", "Spring Launch", "980.50", "30", "12"],
  ],
  mmm: [
    ["2026-01-15", "Paid Social", "1500.00", "8600.00"],
    ["2026-01-16", "Search", "980.50", "4200.00"],
  ],
};

export const maxCsvImportFileSizeBytes = 2048 * 1024;
