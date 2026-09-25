import { z } from "zod";

import { baseMetricCodes } from "@/features/channels/contracts";

import type { LayoutItem, LayoutItemPatch } from "./contracts";

// Form models for the widget inspector and their conversion to the PATCH body.
// Limits mirror the API catalogue (`ReportCatalogue`, `ContentRules`).

export const kpiCardsMaxMetrics = 5;
export const detailedTableMaxRows = 10;
export const creativeMaxLimit = 24;
export const breakdownWidgetCodes: ReadonlySet<string> = new Set([
  "age_breakdown",
  "gender_breakdown",
  "region_breakdown",
  "device_breakdown",
]);

const trimmed = (max: number, message: string) => z.string().max(max, message);

const titleFields = {
  title: trimmed(150, "Keep the title to 150 characters."),
  subtitle: trimmed(255, "Keep the subtitle to 255 characters."),
};

const targetPattern = /^\d+(\.\d+)?$/;

export const liveFormSchema = z
  .object({
    ...titleFields,
    metrics: z
      .array(z.string())
      .max(kpiCardsMaxMetrics, `Choose up to ${kpiCardsMaxMetrics} metrics.`),
    rows: z
      .array(z.string())
      .max(detailedTableMaxRows, `Choose up to ${detailedTableMaxRows} rows.`),
    targets: z.record(z.string(), z.string()),
    overrides: z.record(
      z.string(),
      z.object({
        label: trimmed(100, "Keep the label to 100 characters."),
        status_label: trimmed(60, "Keep the status to 60 characters."),
        details: trimmed(500, "Keep the details to 500 characters."),
      }),
    ),
    sort_metric: z.string(),
    limit: z.string(),
    metric: z.string(),
  })
  .superRefine((values, context) => {
    for (const [code, target] of Object.entries(values.targets))
      if (target.trim() && !targetPattern.test(target.trim().replace(/,/g, "")))
        context.addIssue({
          code: "custom",
          path: ["targets", code],
          message: "Enter a target of 0 or more.",
        });
  });

export const textFormSchema = z
  .object({
    ...titleFields,
    as_of: z.union([z.literal(""), z.iso.date("Enter a valid date.")]),
    headline: trimmed(300, "Keep the headline to 300 characters."),
    body: trimmed(5000, "Keep the text to 5,000 characters."),
    bullets: z
      .array(
        z.object({
          text: trimmed(500, "Keep each point to 500 characters.").refine(
            (text) => text.trim().length > 0,
            "Enter the point or remove it.",
          ),
        }),
      )
      .max(20, "Add up to 20 points."),
    recommendations: z
      .array(
        z.object({
          title: trimmed(200, "Keep the title to 200 characters.").refine(
            (text) => text.trim().length > 0,
            "Enter a title or remove the recommendation.",
          ),
          body: trimmed(2000, "Keep the detail to 2,000 characters."),
          owner: trimmed(100, "Keep the owner to 100 characters."),
        }),
      )
      .max(20, "Add up to 20 recommendations."),
  })
  .superRefine((values, context) => {
    if (values.body.trim() && !values.headline.trim())
      context.addIssue({
        code: "custom",
        path: ["headline"],
        message: "Enter a headline for this text.",
      });
  });

export const titleFormSchema = z.object(titleFields);

export type LiveFormValues = z.infer<typeof liveFormSchema>;
export type TextFormValues = z.infer<typeof textFormSchema>;
export type TitleFormValues = z.infer<typeof titleFormSchema>;

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function text(value: unknown) {
  return typeof value === "string" ? value : "";
}
function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export function toTitleValues(item: LayoutItem): TitleFormValues {
  return {
    title: text(item.settings.title),
    subtitle: text(item.settings.subtitle),
  };
}

export function toLiveValues(item: LayoutItem): LiveFormValues {
  const settings = item.settings;
  const targets = record(settings.targets);
  const overrides = record(settings.row_overrides);
  return {
    ...toTitleValues(item),
    metrics: strings(settings.metrics),
    rows: strings(settings.rows),
    targets: Object.fromEntries(
      Object.entries(targets).map(([code, value]) => [
        code,
        typeof value === "number" ? String(value) : "",
      ]),
    ),
    overrides: Object.fromEntries(
      Object.entries(overrides).map(([code, value]) => {
        const override = record(value);
        return [
          code,
          {
            label: text(override.label),
            status_label: text(override.status_label),
            details: text(override.details),
          },
        ];
      }),
    ),
    sort_metric: text(settings.sort_metric),
    limit: typeof settings.limit === "number" ? String(settings.limit) : "",
    metric: text(settings.metric),
  };
}

export function toTextValues(item: LayoutItem): TextFormValues {
  const content = record(item.content);
  const items = Array.isArray(content.items) ? content.items : [];
  return {
    ...toTitleValues(item),
    as_of: item.as_of ?? "",
    headline: text(content.headline),
    body: text(content.body),
    bullets:
      item.type === "bullet_list"
        ? items
            .filter((entry) => typeof entry === "string")
            .map((entry) => ({ text: entry }))
        : [],
    recommendations:
      item.type === "recommendation_list"
        ? items.map((entry) => {
            const recommendation = record(entry);
            return {
              title: text(recommendation.title),
              body: text(recommendation.body),
              owner: text(recommendation.owner),
            };
          })
        : [],
  };
}

// Settings replace the stored value, so unrelated keys are carried over and
// blank overrides are left out. No keys at all clears the settings.
function withTitles(
  settings: Record<string, unknown>,
  values: TitleFormValues,
): Record<string, unknown> {
  const next = { ...settings };
  delete next.title;
  delete next.subtitle;
  if (values.title.trim()) next.title = values.title.trim();
  if (values.subtitle.trim()) next.subtitle = values.subtitle.trim();
  return next;
}

function settingsOrNull(settings: Record<string, unknown>) {
  return Object.keys(settings).length > 0 ? settings : null;
}

export function titlePatch(
  item: LayoutItem,
  values: TitleFormValues,
): LayoutItemPatch {
  return { settings: settingsOrNull(withTitles(item.settings, values)) };
}

export function livePatch(
  item: LayoutItem,
  values: LiveFormValues,
): LayoutItemPatch {
  const next = withTitles(item.settings, values);
  const set = (key: string, value: unknown) => {
    if (value === undefined) delete next[key];
    else next[key] = value;
  };
  if (item.code === "kpi_cards")
    set("metrics", values.metrics.length ? values.metrics : undefined);
  if (item.code === "detailed_metrics_table") {
    set("rows", values.rows.length ? values.rows : undefined);
    const targets = Object.fromEntries(
      Object.entries(values.targets)
        .map(
          ([code, target]) => [code, target.trim().replace(/,/g, "")] as const,
        )
        .filter(([, target]) => target !== "")
        .map(([code, target]) => [code, Number(target)]),
    );
    set("targets", Object.keys(targets).length ? targets : undefined);
    const overrides = Object.fromEntries(
      Object.entries(values.overrides).flatMap(([code, override]) => {
        const fields = Object.fromEntries(
          Object.entries(override)
            .map(([key, value]) => [key, value.trim()] as const)
            .filter(([, value]) => value !== ""),
        );
        return Object.keys(fields).length ? [[code, fields]] : [];
      }),
    );
    set("row_overrides", Object.keys(overrides).length ? overrides : undefined);
  }
  if (item.code === "creative_performance") {
    set("sort_metric", values.sort_metric || undefined);
    set("limit", values.limit ? Number(values.limit) : undefined);
  }
  if (breakdownWidgetCodes.has(item.code))
    set("metric", values.metric || undefined);
  return { settings: settingsOrNull(next) };
}

export function textPatch(
  item: LayoutItem,
  values: TextFormValues,
): LayoutItemPatch {
  let content: unknown = null;
  if (item.type === "text_hero" && values.headline.trim())
    content = {
      headline: values.headline.trim(),
      body: values.body.trim() || null,
    };
  if (item.type === "bullet_list" && values.bullets.length)
    content = { items: values.bullets.map((bullet) => bullet.text.trim()) };
  if (item.type === "recommendation_list" && values.recommendations.length)
    content = {
      items: values.recommendations.map((recommendation) => ({
        title: recommendation.title.trim(),
        body: recommendation.body.trim() || null,
        owner: recommendation.owner.trim() || null,
      })),
    };
  return {
    settings: settingsOrNull(withTitles(item.settings, values)),
    content,
    as_of: values.as_of || null,
  };
}

export const editableTextTypes: ReadonlySet<string> = new Set([
  "text_hero",
  "bullet_list",
  "recommendation_list",
]);

export const breakdownMetricCodes = baseMetricCodes;
