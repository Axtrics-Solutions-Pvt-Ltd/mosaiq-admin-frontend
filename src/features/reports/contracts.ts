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

// An audience segment the report can be filtered by. The code is made from
// the label when the audience is added and never changes, so a renamed
// audience keeps its tags on widget rows and campaigns.
export const audienceCodePattern = /^[a-z][a-z0-9_]*$/;
export const maxAudiences = 20;
export const audienceSchema = z.object({
  code: z.string(),
  label: z.string(),
});

// The filter option and campaign audience for campaigns without an audience
// ("Untagged / General"). It is never a report audience's code.
export const untaggedAudienceCode = "untagged";

// The code for a new audience: its label in snake case, e.g. "South Asian" →
// "south_asian", with a number added when another audience has it.
export function audienceCode(label: string, taken: readonly string[]) {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^[^a-z]+|_+$/g, "")
      .slice(0, 36) || "audience";
  const unavailable = [...taken, untaggedAudienceCode];
  let code = base;
  for (let suffix = 2; unavailable.includes(code); suffix++)
    code = `${base}_${suffix}`;
  return code;
}

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
  // Older API versions leave it out: no audiences.
  audiences: z.array(audienceSchema).default([]),
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
    message: "Each source channel can be added once.",
  });

const audiencesRequestSchema = z
  .array(
    z.strictObject({
      code: z.string().max(40).regex(audienceCodePattern),
      label: z.string().trim().min(1).max(60),
    }),
  )
  .max(maxAudiences)
  .nullable();

// Request bodies, matching the API's ReportRequest rules.
export const reportCreateRequestSchema = z.strictObject({
  name: z.string().trim().min(1).max(150),
  currency: currencySchema.optional(),
  timezone: z.string().min(1).max(64).optional(),
  default_range_preset: z.enum(rangePresets).optional(),
  workspace_ids: workspaceIdsSchema.optional(),
  audiences: audiencesRequestSchema.optional(),
});
export const reportUpdateRequestSchema = z.strictObject({
  name: z.string().trim().min(1).max(150).optional(),
  status: z.enum(reportStatuses).optional(),
  currency: currencySchema.optional(),
  timezone: z.string().min(1).max(64).optional(),
  default_range_preset: z.enum(rangePresets).optional(),
  // The full list in display order; null or [] removes every audience.
  audiences: audiencesRequestSchema.optional(),
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

// A section colour from the API's fixed swatch list. The shades are drawn as
// sent: `base` fills the active section tab (white text), `strong` marks the
// active sub-tab, `soft` is the sub-tab hover.
const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const accentSchema = z.object({
  key: z.string(),
  label: z.string(),
  base: hexColorSchema,
  strong: hexColorSchema,
  soft: hexColorSchema,
});
// A section's colour: its `settings.accent`, or the catalogue default.
const resolvedAccentSchema = accentSchema.extend({ is_default: z.boolean() });
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
  // Sections only; null for tabs and widgets, which follow their section.
  accent: ResolvedAccent | null;
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
    accent: resolvedAccentSchema.nullable().default(null),
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
    // The swatches a section can use, in display order.
    accents: z.array(accentSchema).default([]),
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
    // One per source channel (workspace); `code` is its id as a string and is
    // the value of the `channel` filter. `platform` is its connector.
    channels: z.array(
      z.object({
        code: z.string(),
        name: z.string(),
        platform: z
          .object({ code: z.string(), name: z.string() })
          .nullable()
          .optional(),
      }),
    ),
    // The audiences the preview can be filtered by.
    audiences: z.array(audienceSchema).default([]),
    // The last filter option, for campaigns without an audience; null when
    // the report has no audiences.
    untagged_audience: audienceSchema.nullable().default(null),
    sections: z.array(
      z.object({
        code: z.string(),
        name: z.string(),
        accent: resolvedAccentSchema.nullable().default(null),
        tabs: z.array(
          z.object({
            code: z.string(),
            name: z.string(),
            // Whether the audience filter applies to (and shows on) the tab.
            // Older API versions leave it out.
            audience_filter: z.boolean().optional(),
          }),
        ),
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
  // Set on a campaign row's value, which corrects that campaign only.
  campaign_key: z.string().nullable().optional(),
  campaign_name: z.string().nullable().optional(),
  date_from: z.string(),
  date_to: z.string(),
  total: z.number().nullable(),
  edited: z.boolean(),
  correction_ids: z.array(z.number().int()),
});

// Why a live widget's values can't be corrected: with a Reporting audience
// filter on, its totals cover some campaigns only.
export const audienceFilterLock = "audience_filter";

const previewWidgetSchema = widgetEnvelopeSchema.extend({
  editing: z.object({
    item_id: idSchema,
    kind: z.enum(widgetKinds),
    is_enabled: z.boolean(),
    is_available: z.boolean(),
    settings: settingsSchema,
    // `audience_filter` when `values` is empty because of the audience
    // filter; null otherwise (and from older API versions).
    locked_reason: z.string().nullable().default(null),
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
    // The audience filter the tab applied, in report order with `untagged`
    // last; [] for none (and on tabs the filter doesn't apply to).
    audiences: z.array(z.string()).default([]),
    layout_version: z.number().int(),
    widgets: z.array(previewWidgetSchema),
  }),
});

// Which audience each campaign belongs to on the Reporting Dashboard: its own
// (`audience`), else its channel's default, else none (`untagged`).
export const campaignAudienceSources = ["campaign", "channel", "none"] as const;
export const maxCampaignAudiences = 2000;

const campaignAudienceSchema = z.object({
  campaign_key: z.string(),
  name: z.string(),
  status: z.string(),
  // A report audience code, `untagged` for General, or null to follow the
  // channel default.
  audience: z.string().nullable(),
  effective_audience: z.string(),
  source: z.enum(campaignAudienceSources),
});

export const campaignAudiencesSchema = z.object({
  data: z.object({
    channels: z.array(
      z.object({
        workspace_id: idSchema,
        name: z.string(),
        platform: z
          .object({ code: z.string(), name: z.string() })
          .nullable()
          .optional(),
        default_audience: z.string().nullable(),
        campaigns: z.array(campaignAudienceSchema),
      }),
    ),
    untagged_campaigns: z.number().int().nonnegative(),
  }),
});

// The whole mapping: channels left out get no default, campaigns left out
// follow their channel.
export const campaignAudiencesRequestSchema = z.strictObject({
  channels: z
    .array(
      z.strictObject({
        workspace_id: idSchema,
        default_audience: z.string().max(40).nullable(),
      }),
    )
    .max(50),
  campaigns: z
    .array(
      z.strictObject({
        workspace_id: idSchema,
        campaign_key: z.string().min(1).max(150),
        audience: z.string().min(1).max(40),
      }),
    )
    .max(maxCampaignAudiences),
});

// Creative Performance editing (API phase 1). Keys come from the connector
// and stay the same across syncs and date ranges.
export const creativeKeyPattern = /^[A-Za-z0-9_:-]{1,150}$/;
export const creativeMaxMetrics = 4;
export const creativeMaxPins = 24;
export const creativeMaxHidden = 200;
export const creativeMaxOverrides = 200;
export const creativeTitleMaxLength = 150;
export const defaultCreativeMetrics = [
  "impressions",
  "ctr",
  "conversions",
  "cpa",
] as const;

export const creativeThumbnailTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const maxCreativeThumbnailBytes = 5 * 1024 * 1024;

// The API's own messages, so a file refused here reads the same as one the
// API refuses (it also checks the content, not just the type).
export function creativeThumbnailProblem(file: File) {
  if (!(creativeThumbnailTypes as readonly string[]).includes(file.type))
    return "Upload a JPEG, PNG or WebP image.";
  if (file.size > maxCreativeThumbnailBytes)
    return "The image must be 5 MB or smaller.";
  return null;
}

const listedCreativeSchema = z.object({
  key: z.string(),
  // The saved name, or the channel's when there is none.
  title: z.string(),
  original_title: z.string(),
  campaign: z.string().nullable(),
  format: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  has_custom_thumbnail: z.boolean(),
  is_hidden: z.boolean(),
  is_pinned: z.boolean(),
  rank_value: z.number().nullable(),
});

export const creativeListSchema = z.object({
  data: z.array(listedCreativeSchema),
  meta: z.object({
    current_page: z.number().int().positive(),
    last_page: z.number().int().positive(),
    per_page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    sort_metric: z.string(),
  }),
});

export const creativeThumbnailResponseSchema = z.object({
  data: z.object({
    key: z.string(),
    thumbnail_url: z.string().nullable(),
    has_custom_thumbnail: z.boolean(),
  }),
});

export type Report = z.infer<typeof reportSchema>;
export type Audience = z.infer<typeof audienceSchema>;
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
export type Accent = z.infer<typeof accentSchema>;
export type ResolvedAccent = z.infer<typeof resolvedAccentSchema>;
export type PreviewMeta = z.infer<typeof previewMetaSchema>["data"];
export type PreviewTab = z.infer<typeof previewTabSchema>["data"];
export type PreviewWidget = PreviewTab["widgets"][number];
export type EditingValue = z.infer<typeof editingValueSchema>;
export type ListedCreative = z.infer<typeof listedCreativeSchema>;
export type CampaignAudiences = z.infer<typeof campaignAudiencesSchema>["data"];
export type CampaignAudienceChannel = CampaignAudiences["channels"][number];
export type CampaignAudience = z.infer<typeof campaignAudienceSchema>;
export type CampaignAudiencesRequest = z.infer<
  typeof campaignAudiencesRequestSchema
>;
export type CreativeList = z.infer<typeof creativeListSchema>;
