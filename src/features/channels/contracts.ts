import { z } from "zod";

export const channelCategories = ["ads", "analytics"] as const;
export const credentialFieldTypes = ["text", "secret", "select"] as const;
// The base metrics a channel can report, as accepted by the channel API.
export const baseMetricCodes = [
  "spend",
  "revenue",
  "impressions",
  "clicks",
  "conversions",
  "reach",
  "video_views",
  "sessions",
  "users",
] as const;

export const channelCategoryLabels: Record<ChannelCategory, string> = {
  ads: "Ads",
  analytics: "Analytics",
};
export const metricLabels: Record<MetricCode, string> = {
  spend: "Spend",
  revenue: "Revenue",
  impressions: "Impressions",
  clicks: "Clicks",
  conversions: "Conversions",
  reach: "Reach",
  video_views: "Video views",
  sessions: "Sessions",
  users: "Users",
};

const credentialFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(credentialFieldTypes),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  help: z.string().nullable().optional(),
});

const channelSchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
  category: z.string(),
  is_active: z.boolean(),
  credential_fields: z.array(credentialFieldSchema),
  metric_codes: z.array(z.string()),
  supports_campaigns: z.boolean(),
  position: z.number().int(),
  workspace_count: z.number().int().nonnegative().optional(),
  is_code_locked: z.boolean().optional(),
});

export const channelListSchema = z.object({ data: z.array(channelSchema) });
export const channelResponseSchema = z.object({ data: channelSchema });

const credentialFieldInputSchema = z
  .object({
    key: z.string().trim().min(1, "Enter a key.").max(50),
    label: z.string().trim().min(1, "Enter a label.").max(255),
    type: z.enum(credentialFieldTypes),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1).max(255)),
    help: z.string().trim().max(500).nullable(),
  })
  .superRefine((field, context) => {
    if (field.type === "select" && field.options.length === 0)
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Add at least one option.",
      });
  });

// Matches the channel request body for both create and update.
export const channelRequestSchema = z
  .object({
    code: z.string().trim().min(1, "Enter a code.").max(50),
    name: z.string().trim().min(1, "Enter a channel name.").max(255),
    category: z.enum(channelCategories),
    is_active: z.boolean(),
    credential_fields: z.array(credentialFieldInputSchema),
    metric_codes: z.array(z.enum(baseMetricCodes)),
    supports_campaigns: z.boolean(),
    position: z.number().int().min(1).max(32767).optional(),
  })
  .superRefine((channel, context) => {
    const seen = new Set<string>();
    channel.credential_fields.forEach((field, index) => {
      if (seen.has(field.key))
        context.addIssue({
          code: "custom",
          path: ["credential_fields", index, "key"],
          message: "Each key must be unique.",
        });
      seen.add(field.key);
    });
  });

// The editor keeps select options as one text box and position as text, then
// converts to the request body so errors land on the same field paths.
export const channelFormSchema = z
  .object({
    code: z.string(),
    name: z.string(),
    category: z.enum(channelCategories),
    is_active: z.boolean(),
    credential_fields: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
        type: z.enum(credentialFieldTypes),
        required: z.boolean(),
        options: z.string(),
        help: z.string(),
      }),
    ),
    metric_codes: z.array(z.enum(baseMetricCodes)),
    supports_campaigns: z.boolean(),
    position: z.string().trim().regex(/^\d*$/, "Enter a whole number."),
  })
  .transform((values): z.input<typeof channelRequestSchema> => ({
    ...values,
    credential_fields: values.credential_fields.map((field) => ({
      ...field,
      options:
        field.type === "select"
          ? field.options
              .split(/[\n,]/)
              .map((option) => option.trim())
              .filter(Boolean)
          : [],
      help: field.help.trim() || null,
    })),
    position: values.position ? Number(values.position) : undefined,
  }))
  .pipe(channelRequestSchema);

export function toChannelFormValues(
  channel: Channel | undefined,
): z.input<typeof channelFormSchema> {
  return {
    code: channel?.code ?? "",
    name: channel?.name ?? "",
    category: channel?.category === "analytics" ? "analytics" : "ads",
    is_active: channel?.is_active ?? true,
    credential_fields:
      channel?.credential_fields.map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        required: field.required,
        options: field.options?.join("\n") ?? "",
        help: field.help ?? "",
      })) ?? [],
    metric_codes:
      channel?.metric_codes.filter((code): code is MetricCode =>
        baseMetricCodes.some((known) => known === code),
      ) ?? [],
    supports_campaigns: channel?.supports_campaigns ?? false,
    position: channel ? String(channel.position) : "",
  };
}

export type ChannelFormValues = z.input<typeof channelFormSchema>;
export type Channel = z.infer<typeof channelSchema>;
export type CredentialField = z.infer<typeof credentialFieldSchema>;
export type ChannelCategory = (typeof channelCategories)[number];
export type MetricCode = (typeof baseMetricCodes)[number];
export type ChannelRequest = z.infer<typeof channelRequestSchema>;
