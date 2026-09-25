import { z } from "zod";

import { baseMetricCodes } from "@/features/channels/contracts";
import {
  calculatedMetrics,
  metricLabel as baseMetricLabel,
} from "@/features/corrections/contracts";
import { widgetEnvelopeSchema } from "@/features/report-widgets/contracts";

export const reportStatuses = ["active", "archived"] as const;
export const rangePresets = [
  "last_7_days",
  "last_30_days",
  "last_90_days",
] as const;
export const rangePresetLabels: Record<RangePreset, string> = {
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  last_90_days: "Last 90 days",
};
export const rangePresetDays: Record<RangePreset, number> = {
  last_7_days: 7,
  last_30_days: 30,
  last_90_days: 90,
};

// Every metric a live widget setting may name, in the API registry's order.
export const reportMetricCodes = [
  ...baseMetricCodes,
  ...(Object.keys(calculatedMetrics) as (keyof typeof calculatedMetrics)[]),
] as const;

export function reportMetricLabel(code: string) {
  return Object.hasOwn(calculatedMetrics, code)
    ? calculatedMetrics[code as keyof typeof calculatedMetrics].label
    : baseMetricLabel(code);
}

const idSchema = z.number().int().positive();
const userRefSchema = z.object({ id: idSchema, name: z.string() }).nullable();
// Laravel serialises an empty settings array as [] rather than {}.
const settingsSchema = z
  .union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
  .transform((value): Record<string, unknown> =>
    Array.isArray(value) ? {} : value,
  );

const reportWorkspaceSchema = z.object({
  id: idSchema,
  name: z.string(),
  currency: z.string(),
  position: z.number().int(),
  channel: z
    .object({ id: idSchema, code: z.string(), name: z.string() })
    .nullable(),
});

const reportSchema = z.object({
  id: idSchema,
  agency_id: idSchema,
  client_id: idSchema,
  client: z.object({ id: idSchema, name: z.string() }).optional(),
  name: z.string(),
  status: z.enum(reportStatuses),
  currency: z.string(),
  timezone: z.string(),
  default_range_preset: z.enum(rangePresets),
  layout_version: z.number().int(),
  // Links that open in the portal: not revoked, not expired, and the report
  // is not archived (an archived report always reports 0).
  active_links_count: z.number().int().nonnegative(),
  workspaces: z.array(reportWorkspaceSchema).default([]),
  created_by: userRefSchema.optional(),
  updated_by: userRefSchema.optional(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export const reportListSchema = z.object({
  data: z.array(reportSchema),
  meta: z.object({
    current_page: z.number().int().positive(),
    last_page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});
export const reportResponseSchema = z.object({ data: reportSchema });

const currencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "Choose a three-letter currency.");
const workspaceIdsSchema = z
  .array(idSchema)
  .max(50)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Each source workspace can be added once.",
  });

// Request bodies, matching the API's ReportRequest rules.
export const reportCreateRequestSchema = z.strictObject({
  name: z.string().trim().min(1).max(150),
  currency: currencySchema.optional(),
  timezone: z.string().min(1).max(64).optional(),
  default_range_preset: z.enum(rangePresets).optional(),
  workspace_ids: workspaceIdsSchema.optional(),
});
export const reportUpdateRequestSchema = z.strictObject({
  name: z.string().trim().min(1).max(150).optional(),
  status: z.enum(reportStatuses).optional(),
  currency: currencySchema.optional(),
  timezone: z.string().min(1).max(64).optional(),
  default_range_preset: z.enum(rangePresets).optional(),
});
export const reportWorkspacesRequestSchema = z.strictObject({
  workspace_ids: workspaceIdsSchema,
});

// The form behind create and settings. Workspaces are edited separately on
// settings, because the API changes them through their own endpoint.
export const reportProfileFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a report name.").max(150),
  status: z.enum(reportStatuses),
  default_range_preset: z.enum(rangePresets),
  currency: currencySchema,
  timezone: z.string().min(1, "Choose a time zone.").max(64),
});
export const reportCreateFormSchema = reportProfileFormSchema
  .omit({ status: true })
  .extend({ workspace_ids: workspaceIdsSchema });

export const layoutLevels = ["section", "tab", "widget"] as const;
export const widgetKinds = ["live", "text", "manual_data"] as const;

export type LayoutItem = {
  id: number;
  parent_id: number | null;
  level: (typeof layoutLevels)[number];
  code: string;
  title: string | null;
  default_title: string | null;
  type: string | null;
  kind: WidgetKind | null;
  is_enabled: boolean;
  is_available: boolean;
  position: number;
  settings: Record<string, unknown>;
  content: unknown;
  as_of: string | null;
  updated_at: string | null;
  children: LayoutItem[];
};

const layoutItemSchema: z.ZodType<LayoutItem, unknown> = z.lazy(() =>
  z.object({
    id: idSchema,
    parent_id: idSchema.nullable(),
    level: z.enum(layoutLevels),
    code: z.string(),
    title: z.string().nullable(),
    default_title: z.string().nullable(),
    type: z.string().nullable(),
    kind: z.enum(widgetKinds).nullable(),
    is_enabled: z.boolean(),
    is_available: z.boolean(),
    position: z.number().int(),
    settings: settingsSchema,
    content: z.unknown(),
    as_of: z.string().nullable(),
    updated_at: z.string().nullable(),
    children: z.array(layoutItemSchema).default([]),
  }),
);

export const layoutResponseSchema = z.object({
  data: z.object({
    report_id: idSchema,
    layout_version: z.number().int(),
    sections: z.array(layoutItemSchema),
  }),
});
export const layoutItemResponseSchema = z.object({ data: layoutItemSchema });

export const reorderRequestSchema = z.strictObject({
  items: z
    .array(
      z.strictObject({
        id: idSchema,
        position: z.number().int().min(0).max(1000),
        is_enabled: z.boolean(),
      }),
    )
    .min(1)
    .max(100),
});

// Content and settings shapes are validated by the API per catalogue entry;
// the proxy only checks the envelope.
export const layoutItemPatchSchema = z.strictObject({
  is_enabled: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).nullable().optional(),
  content: z.unknown().optional(),
  as_of: z.iso.date().nullable().optional(),
});

export const previewMetaSchema = z.object({
  data: z.object({
    report: z.object({ name: z.string(), client_name: z.string() }),
    currency: z.string(),
    timezone: z.string(),
    date_range: z.object({
      default: z.object({
        preset: z.string(),
        from: z.string(),
        to: z.string(),
      }),
      available: z.object({
        from: z.string().nullable(),
        to: z.string().nullable(),
      }),
      presets: z.array(z.string()),
      max_span_days: z.number().int().positive(),
    }),
    channels: z.array(z.object({ code: z.string(), name: z.string() })),
    sections: z.array(
      z.object({
        code: z.string(),
        name: z.string(),
        tabs: z.array(z.object({ code: z.string(), name: z.string() })),
      }),
    ),
  }),
});

// One reference per displayed value: what its correction pencil changes.
const editingValueSchema = z.object({
  path: z.string(),
  metric: z.string(),
  is_base: z.boolean(),
  inputs: z.array(z.string()).optional(),
  workspace_id: idSchema.optional(),
  date_from: z.string(),
  date_to: z.string(),
  total: z.number().nullable(),
  edited: z.boolean(),
  correction_ids: z.array(z.number().int()),
});

const previewWidgetSchema = widgetEnvelopeSchema.extend({
  editing: z.object({
    item_id: idSchema,
    kind: z.enum(widgetKinds),
    is_enabled: z.boolean(),
    is_available: z.boolean(),
    settings: settingsSchema,
    values: z.array(editingValueSchema),
  }),
});

export const previewTabSchema = z.object({
  data: z.object({
    tab: z.string(),
    period: z.object({
      from: z.string(),
      to: z.string(),
      compare_from: z.string(),
      compare_to: z.string(),
    }),
    channel: z.string().nullable(),
    layout_version: z.number().int(),
    widgets: z.array(previewWidgetSchema),
  }),
});

export type Report = z.infer<typeof reportSchema>;
export type ReportWorkspace = z.infer<typeof reportWorkspaceSchema>;
export type ReportStatus = (typeof reportStatuses)[number];
export type RangePreset = (typeof rangePresets)[number];
export type WidgetKind = (typeof widgetKinds)[number];
export type ReportCreateRequest = z.infer<typeof reportCreateRequestSchema>;
export type ReportUpdateRequest = z.infer<typeof reportUpdateRequestSchema>;
export type ReportProfileForm = z.infer<typeof reportProfileFormSchema>;
export type ReportCreateForm = z.infer<typeof reportCreateFormSchema>;
export type ReportLayout = z.infer<typeof layoutResponseSchema>["data"];
export type ReorderItem = z.infer<typeof reorderRequestSchema>["items"][number];
export type LayoutItemPatch = z.infer<typeof layoutItemPatchSchema>;
export type PreviewMeta = z.infer<typeof previewMetaSchema>["data"];
export type PreviewTab = z.infer<typeof previewTabSchema>["data"];
export type PreviewWidget = PreviewTab["widgets"][number];
export type EditingValue = z.infer<typeof editingValueSchema>;
