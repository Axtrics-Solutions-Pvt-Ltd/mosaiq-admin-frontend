import { parseWidget } from "@/features/report-widgets/contracts";

import { filterByAudience } from "./audience-filter";
import type {
  Accent,
  LayoutItem,
  LayoutItemPatch,
  PreviewWidget,
} from "./contracts";
import { replaceLayoutItem } from "./layout";

// The canvas shows an open form's unsaved edits before Save. Titles, a
// section's colour and the content of written and manual widgets are worked
// out here the way the API serves them. A live widget's other settings change
// its numbers, which only the API can work out, so they show once saved.

export type InspectorDraft = { itemId: number; patch: LayoutItemPatch };

// The preview's audience filter, for a Marketing Intelligence widget: the
// selected codes (none means no filter) and every audience's label.
export type AudienceView = {
  selected: readonly string[];
  labels: Readonly<Record<string, string>>;
};

type Content = Record<string, unknown>;
type Entry = Record<string, unknown>;

function entries(value: unknown): Entry[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Entry => typeof entry === "object" && entry !== null,
      )
    : [];
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : 0;
}

// The API's `Str::slug($label, '_')` for a donut slice without a key.
function slug(label: unknown) {
  return String(label ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normaliseChange(change: unknown) {
  if (typeof change !== "object" || change === null) return null;
  const value = change as Entry;
  return {
    value: value.value ?? null,
    format: value.format ?? "percent",
    direction: value.direction,
    sentiment: value.sentiment,
    label: value.label ?? null,
  };
}

// Mirrors the API's `ContentRules::normalise`: optional keys filled in and
// shares left out worked out from the values.
function normaliseContent(type: string | null, content: Content): Content {
  switch (type) {
    case "recommendation_list":
      return {
        ...content,
        items: entries(content.items).map((item) => ({
          title: item.title,
          body: item.body ?? null,
          owner: item.owner ?? null,
        })),
      };
    case "kpi_list":
      return {
        items: entries(content.items).map((item) => ({
          label: item.label,
          value: item.value,
          format: item.format,
          change: normaliseChange(item.change),
        })),
      };
    case "gauge":
      return {
        value: content.value ?? null,
        max: content.max ?? 100,
        format: content.format,
        label: content.label ?? null,
        status: content.status ?? null,
        details: content.details ?? [],
      };
    case "donut": {
      const items = entries(content.items);
      const total = items.reduce((sum, item) => sum + asNumber(item.value), 0);
      return {
        center: content.center ?? null,
        items: items.map((item) => ({
          key: item.key ?? slug(item.label),
          label: item.label,
          value: item.value,
          format: item.format,
          share:
            item.share ??
            (total > 0
              ? Math.round((asNumber(item.value) / total) * 10000) / 100
              : 0),
        })),
        filterable: false,
      };
    }
    case "progress_list": {
      const items = entries(content.items);
      const largest = new Map<string, number>();
      for (const item of items) {
        const group = String(item.group ?? "");
        largest.set(
          group,
          Math.max(largest.get(group) ?? 0, asNumber(item.value)),
        );
      }
      const groups = entries(content.groups);
      const footer = entries(content.footer);
      return {
        ...(groups.length > 0 ? { groups } : {}),
        items: items.map((item) => {
          const inGroup = largest.get(String(item.group ?? "")) ?? 0;
          const share =
            item.share ??
            (item.format === "percent"
              ? Math.min(Math.max(asNumber(item.value), 0), 100)
              : inGroup > 0
                ? Math.round((asNumber(item.value) / inGroup) * 10000) / 100
                : 0);
          return {
            ...(item.group !== undefined ? { group: item.group } : {}),
            label: item.label,
            value: item.value,
            format: item.format,
            share,
            secondary: item.secondary ?? null,
          };
        }),
        ...(footer.length > 0
          ? {
              footer: footer.map((kpi) => ({
                label: kpi.label,
                value: kpi.value,
                format: kpi.format,
                change: normaliseChange(kpi.change),
              })),
            }
          : {}),
      };
    }
    case "field_table":
      return {
        columns: content.columns ?? ["Field", "Value", "Notes"],
        rows: entries(content.rows).map((row) => ({
          field: row.field,
          value: row.value,
          note: row.note ?? null,
        })),
      };
    case "data_table": {
      const keys = entries(content.columns).map((column) => String(column.key));
      return {
        columns: content.columns ?? [],
        rows: entries(content.rows).map((row) => ({
          ...Object.fromEntries(keys.map((key) => [key, null])),
          ...row,
        })),
      };
    }
    default:
      return content;
  }
}

function hasContent(content: unknown): content is Content {
  return (
    typeof content === "object" &&
    content !== null &&
    !Array.isArray(content) &&
    Object.keys(content).length > 0
  );
}

function draftSettings(patch: LayoutItemPatch) {
  return patch.settings === undefined ? undefined : (patch.settings ?? {});
}

function settingText(settings: Record<string, unknown>, key: string) {
  const value = settings[key];
  return typeof value === "string" && value.trim() ? value : null;
}

// The item with its draft title and, for a section, its draft colour, for
// the section tabs and widget headings.
export function draftLayoutItem(
  item: LayoutItem,
  patch: LayoutItemPatch,
  accents: readonly Accent[],
): LayoutItem {
  const settings = draftSettings(patch);
  if (!settings) return item;
  const accentKey = settingText(settings, "accent");
  const accent = accents.find((option) => option.key === accentKey);
  return {
    ...item,
    settings,
    // The layout serves `title` as the custom title or the catalogue's.
    title: settingText(settings, "title") ?? item.default_title,
    accent:
      item.level === "section" && accent
        ? {
            ...accent,
            is_default:
              item.accent?.key === accent.key &&
              Boolean(item.accent?.is_default),
          }
        : item.accent,
  };
}

export function withDraftLayout(
  sections: readonly LayoutItem[],
  item: LayoutItem | undefined,
  draft: InspectorDraft | undefined,
  accents: readonly Accent[],
): readonly LayoutItem[] {
  if (!item || draft?.itemId !== item.id) return sections;
  return replaceLayoutItem(
    sections,
    draftLayoutItem(item, draft.patch, accents),
  );
}

// The served widget with the draft laid over it. A draft the widget can't
// show yet, such as a half-typed number, keeps the served content. A
// Marketing Intelligence widget's draft is filtered by `audiences` first.
export function draftPreviewWidget(
  widget: PreviewWidget,
  item: LayoutItem,
  patch: LayoutItemPatch,
  audiences?: AudienceView,
): PreviewWidget {
  const settings = draftSettings(patch);
  // Without a stored subtitle the served one is the catalogue default, which
  // a cleared draft subtitle falls back to.
  const catalogueSubtitle = settingText(item.settings, "subtitle")
    ? null
    : (widget.subtitle ?? null);
  const envelope: PreviewWidget = {
    ...widget,
    ...(settings
      ? { subtitle: settingText(settings, "subtitle") ?? catalogueSubtitle }
      : {}),
    ...(item.kind !== "live" && patch.as_of !== undefined
      ? { as_of: patch.as_of }
      : {}),
  };
  if (item.kind === "live" || !("content" in patch)) return envelope;
  if (!hasContent(patch.content)) return { ...envelope, empty: true };
  const content = audiences
    ? filterByAudience(
        item.type,
        patch.content,
        audiences.selected,
        audiences.labels,
      )
    : patch.content;
  if (!content) return { ...envelope, empty: true };
  const drafted: PreviewWidget = {
    ...envelope,
    ...normaliseContent(item.type, content),
    empty: false,
  };
  return parseWidget(drafted).type === "unsupported" ? envelope : drafted;
}
