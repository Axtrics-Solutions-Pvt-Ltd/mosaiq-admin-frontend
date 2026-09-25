import type { ReactNode } from "react";
import { z } from "zod";

import { valueFormats } from "@/lib/formatters";

// Renders beside one displayed value, addressed by its payload path such as
// `value` or `items.0.value`. The builder uses it for correction controls.
export type ValueAdornment = (path: string) => ReactNode;

// Widget payloads follow the public report contract §5. The portal and the
// admin preview receive the same shape; the preview adds an `editing` block
// that the report builder reads separately.

const formatSchema = z.enum(valueFormats);
const numberOrNull = z.number().nullable();

export const widgetEnvelopeSchema = z.looseObject({
  code: z.string(),
  type: z.string().nullable(),
  kind: z.string(),
  title: z.string().nullable(),
  subtitle: z.string().nullable().optional(),
  as_of: z.string().nullable().optional(),
  empty: z.boolean(),
  // Why an empty widget is empty, e.g. `no_budget` for budget pacing.
  reason: z.string().nullable().optional(),
});

const changeSchema = z.object({
  value: numberOrNull,
  format: formatSchema.optional(),
  direction: z.enum(["up", "down", "flat"]),
  sentiment: z.enum(["positive", "negative", "neutral"]),
  label: z.string().nullable().optional(),
});

const pointSchema = z.object({ x: z.string(), y: numberOrNull });

const displayValue = z.union([z.number(), z.string()]).nullable();

const kpiPayload = z.object({
  label: z.string(),
  value: displayValue,
  format: formatSchema,
  change: changeSchema.nullable().optional(),
  sparkline: z.array(pointSchema).optional(),
});

const labelledValue = z.object({
  label: z.string(),
  value: displayValue,
  format: formatSchema,
});

export const metricStatusCodes = [
  "healthy",
  "on_watch",
  "needs_attention",
  "info",
] as const;

const payloadSchemas = {
  text_hero: z.object({
    headline: z.string().nullable(),
    body: z.string().nullable(),
  }),
  kpi: kpiPayload,
  line_chart: z.object({
    granularity: z.enum(["day", "week", "month"]),
    series: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
        format: formatSchema,
        axis: z.enum(["left", "right"]),
        points: z.array(pointSchema),
      }),
    ),
    variants: z
      .array(
        z.object({
          key: z.string(),
          label: z.string(),
          series_keys: z.array(z.string()),
        }),
      )
      .optional(),
  }),
  donut: z.object({
    center: z
      .object({
        label: z.string(),
        value: z.union([z.number(), z.string()]).nullable(),
        format: formatSchema,
        change: changeSchema.nullable().optional(),
      })
      .nullable()
      .optional(),
    items: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
        value: numberOrNull,
        format: formatSchema,
        share: numberOrNull,
      }),
    ),
    filterable: z.boolean(),
  }),
  bullet_list: z.object({
    tone: z.enum(["positive", "negative", "neutral"]),
    items: z.array(z.string()),
  }),
  recommendation_list: z.object({
    items: z.array(
      z.object({
        title: z.string(),
        body: z.string().nullable(),
        owner: z.string().nullable(),
      }),
    ),
  }),
  kpi_group: z.object({ items: z.array(kpiPayload) }),
  kpi_list: z.object({ items: z.array(labelledValue) }),
  bar_chart: z.object({ items: z.array(labelledValue) }),
  progress_list: z.object({
    groups: z
      .array(z.object({ key: z.string(), label: z.string() }))
      .nullable()
      .optional(),
    items: z.array(
      z.object({
        group: z.string().nullable().optional(),
        label: z.string(),
        value: displayValue,
        format: formatSchema,
        share: numberOrNull,
        secondary: labelledValue.nullable().optional(),
      }),
    ),
    footer: z
      .array(
        labelledValue.extend({ change: changeSchema.nullable().optional() }),
      )
      .nullable()
      .optional(),
  }),
  channel_list: z.object({
    items: z.array(
      z.object({
        channel: z.string(),
        label: z.string(),
        spend: numberOrNull,
        share: numberOrNull,
        roas: numberOrNull,
      }),
    ),
  }),
  metric_table: z.object({
    rows: z.array(
      z.object({
        metric: z.string(),
        label: z.string(),
        value: displayValue,
        format: formatSchema,
        status: z
          .object({
            // An unknown status code from a newer backend shows as neutral.
            code: z.string(),
            label: z.string(),
          })
          .nullable()
          .optional(),
        details: z.string().nullable().optional(),
      }),
    ),
  }),
  field_table: z.object({
    columns: z.array(z.string()),
    rows: z.array(
      z.object({
        field: z.string(),
        value: z.string(),
        note: z.string().nullable(),
      }),
    ),
  }),
  data_table: z.object({
    columns: z.array(
      z.object({ key: z.string(), label: z.string(), format: formatSchema }),
    ),
    rows: z.array(z.record(z.string(), displayValue)),
  }),
  heatmap: z.object({
    columns: z.array(z.string()),
    rows: z.array(
      z.object({ label: z.string(), values: z.array(numberOrNull) }),
    ),
  }),
  creative_grid: z.object({
    items: z.array(
      z.object({
        key: z.string(),
        title: z.string(),
        thumbnail_url: z.string().nullable(),
        format: z.string().nullable(),
        campaign: z.string().nullable(),
        metrics: z.record(
          z.string(),
          z.object({ value: displayValue, format: formatSchema }),
        ),
      }),
    ),
  }),
} as const;

export type SupportedWidgetType = keyof typeof payloadSchemas;
export type WidgetEnvelope = z.infer<typeof widgetEnvelopeSchema>;
export type WidgetPayload<Type extends SupportedWidgetType> = z.infer<
  (typeof payloadSchemas)[Type]
>;

export type ParsedWidget =
  | {
      [Type in SupportedWidgetType]: {
        type: Type;
        envelope: WidgetEnvelope;
        payload: WidgetPayload<Type>;
      };
    }[SupportedWidgetType]
  | { type: "empty"; envelope: WidgetEnvelope }
  | { type: "unsupported"; envelope: WidgetEnvelope; reason: string };

function isSupportedType(type: string | null): type is SupportedWidgetType {
  return type !== null && Object.hasOwn(payloadSchemas, type);
}

// Narrows one widget from the API. An unknown type, or a payload that doesn't
// match its type, becomes an "unsupported" widget instead of breaking the tab.
export function parseWidget(envelope: WidgetEnvelope): ParsedWidget {
  const type = envelope.type;
  if (!isSupportedType(type))
    return {
      type: "unsupported",
      envelope,
      reason: type
        ? `The ${type} widget type is not supported in this preview yet.`
        : "This widget has no render type.",
    };
  // An empty widget still renders its card; its payload may be incomplete.
  if (envelope.empty) return { type: "empty", envelope };
  const parsed = payloadSchemas[type].safeParse(envelope);
  if (!parsed.success)
    return {
      type: "unsupported",
      envelope,
      reason: "This widget's data could not be read.",
    };
  return { type, envelope, payload: parsed.data } as ParsedWidget;
}
