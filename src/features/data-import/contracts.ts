import { z } from "zod";

export const csvImportTypes = [
  "reporting",
  "marketing",
  "mmm",
  "mmm_channel_performance",
  "geography",
  "audience_segments",
  "campaigns",
  "creative_assets",
  "audience_overview",
  "cultural_identity",
  "demographics",
  "data_readiness",
  "model_input_readiness",
] as const;
export const csvImportTypeSchema = z.enum(csvImportTypes);
export type CsvImportType = z.infer<typeof csvImportTypeSchema>;

export const datasetTypeLabels: Record<CsvImportType, string> = {
  reporting: "Reporting",
  marketing: "Marketing Intelligence",
  mmm: "Media Mix Model",
  mmm_channel_performance: "MMM Channel Performance",
  geography: "Geography",
  audience_segments: "Audience Segments",
  campaigns: "Campaigns",
  creative_assets: "Creative Assets",
  audience_overview: "Audience Overview",
  cultural_identity: "Cultural Identity",
  demographics: "Demographics",
  data_readiness: "Data Readiness",
  model_input_readiness: "Model Input Readiness",
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
 * A single accepted template version for a dataset type, as served by
 * `GET csv-templates`. `columns` is the server's header for the *current*
 * `version`; older `accepted_versions` are still valid uploads but their
 * column lists are not repeated here.
 */
export const csvTemplateSchema = z.object({
  type: z.string(),
  version: z.number().int(),
  accepted_versions: z.array(z.number().int()),
  columns: z.array(z.string()),
});
export type CsvTemplate = z.infer<typeof csvTemplateSchema>;
export const csvTemplateListResponseSchema = z.object({
  data: z.array(csvTemplateSchema),
});

export function csvTemplateColumns(template: CsvTemplate): string[] {
  return template.columns;
}

export const creativeAssetSchema = z.object({
  id: z.number().int().positive(),
  agency_id: z.number().int().positive(),
  workspace_id: z.number().int().positive(),
  title: z.string(),
  campaign_name: z.string(),
  channel: z.string(),
  status: z.string().nullable(),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  spend: z.string(),
  asset_url: z.string().nullable(),
});
export type CreativeAssetRecord = z.infer<typeof creativeAssetSchema>;
export const creativeAssetListResponseSchema = z.object({
  data: z.array(creativeAssetSchema),
});
export const creativeAssetResponseSchema = z.object({
  data: creativeAssetSchema,
});

export const maxCsvImportFileSizeBytes = 2048 * 1024;
export const maxCreativeAssetFileSizeBytes = 10240 * 1024;
