import { describe, expect, it } from "vitest";

import { accentFixture, layoutItem } from "@/mocks/fixtures/reports";

import {
  type LayoutItemPatch,
  layoutItemResponseSchema,
  type PreviewWidget,
} from "./contracts";
import {
  draftLayoutItem,
  draftPreviewWidget,
  withDraftLayout,
} from "./draft-preview";

function item(
  overrides: Partial<Parameters<typeof layoutItem>[0]> & { code: string },
) {
  return layoutItemResponseSchema.parse({
    data: layoutItem({
      id: 12,
      parent_id: 2,
      level: "widget",
      position: 0,
      title: "Widget",
      ...overrides,
    }),
  }).data;
}

function served(overrides: Record<string, unknown>): PreviewWidget {
  return {
    code: "widget",
    type: null,
    kind: "text",
    title: "Widget",
    subtitle: null,
    as_of: null,
    empty: false,
    editing: {
      item_id: 12,
      kind: "text",
      is_enabled: true,
      is_available: true,
      settings: {},
      values: [],
    },
    ...overrides,
  } as PreviewWidget;
}

describe("draftPreviewWidget", () => {
  const hero = item({
    code: "ai_summary",
    title: "AI Summary",
    type: "text_hero",
    kind: "text",
  });
  const heroWidget = served({
    code: "ai_summary",
    type: "text_hero",
    headline: "Saved headline",
    body: "Saved body",
  });

  it("shows written content, subtitle and as-of as they will be saved", () => {
    const patch: LayoutItemPatch = {
      settings: { subtitle: "Draft subtitle" },
      content: { headline: "Draft headline", body: null },
      as_of: "2026-09-30",
    };
    expect(draftPreviewWidget(heroWidget, hero, patch)).toMatchObject({
      subtitle: "Draft subtitle",
      as_of: "2026-09-30",
      headline: "Draft headline",
      body: null,
      empty: false,
    });
  });

  it("empties a widget whose draft clears its content", () => {
    expect(
      draftPreviewWidget(heroWidget, hero, { settings: null, content: null }),
    ).toMatchObject({ empty: true });
  });

  it("works out donut keys and shares as the API does", () => {
    const donut = item({
      code: "spend_split",
      type: "donut",
      kind: "manual_data",
    });
    const drafted = draftPreviewWidget(
      served({ type: "donut", kind: "manual_data", items: [], center: null }),
      donut,
      {
        content: {
          center: null,
          items: [
            { label: "Paid Social", value: 30, format: "currency" },
            { label: "Search", value: 10, format: "currency" },
          ],
        },
      },
    );
    expect(drafted).toMatchObject({
      items: [
        { key: "paid_social", share: 75 },
        { key: "search", share: 25 },
      ],
    });
  });

  it("filters a Marketing Intelligence draft by the selected audiences", () => {
    const overview = item({
      code: "audience_overview",
      type: "kpi_list",
      kind: "manual_data",
    });
    const patch: LayoutItemPatch = {
      content: {
        items: [
          { label: "Visits", value: "171K", format: "text" },
          { label: "Visits", value: "75K", format: "text", audience: "chinese" },
        ],
      },
    };
    const widget = served({ type: "kpi_list", kind: "manual_data", items: [] });
    const labels = { chinese: "Chinese", filipino: "Filipino" };

    expect(
      draftPreviewWidget(widget, overview, patch, {
        selected: ["chinese"],
        labels,
      }),
    ).toMatchObject({ items: [{ value: "75K" }], empty: false });
    expect(
      draftPreviewWidget(widget, overview, patch, {
        selected: ["filipino"],
        labels,
      }),
    ).toMatchObject({ empty: true });
  });

  it("keeps the served content while the draft can't be drawn", () => {
    const gauge = item({ code: "health", type: "gauge", kind: "manual_data" });
    const widget = served({
      type: "gauge",
      kind: "manual_data",
      value: 40,
      max: 100,
      format: "percent",
    });
    // A format the widget can't read, as a half-finished edit might send.
    const drafted = draftPreviewWidget(widget, gauge, {
      settings: { title: "Health" },
      content: { value: 50, format: "unknown" },
    });
    expect(drafted).toMatchObject({ value: 40, format: "percent" });
  });

  it("changes only the subtitle of a live widget", () => {
    const live = item({ code: "kpi_cards", type: "kpi_group", kind: "live" });
    const widget = served({ type: "kpi_group", kind: "live", items: [] });
    expect(
      draftPreviewWidget(widget, live, {
        settings: { subtitle: "Draft", metrics: ["spend"] },
      }),
    ).toEqual({ ...widget, subtitle: "Draft" });
  });
});

describe("draftLayoutItem", () => {
  it("previews a section's title and colour", () => {
    const section = item({
      id: 1,
      parent_id: null,
      level: "section",
      code: "reporting",
      title: "Reporting Dashboard",
      accent: accentFixture("blue"),
    });
    const indigo = accentFixture("indigo");
    const drafted = draftLayoutItem(
      section,
      { settings: { title: "Overview", accent: indigo.key } },
      [accentFixture("blue"), indigo],
    );
    expect(drafted.title).toBe("Overview");
    expect(drafted.accent?.key).toBe(indigo.key);
  });

  it("falls back to the catalogue title when the draft clears it", () => {
    const widget = item({
      code: "ai_summary",
      title: "Custom",
      default_title: "AI Summary",
    });
    expect(draftLayoutItem(widget, { settings: null }, []).title).toBe(
      "AI Summary",
    );
  });

  it("leaves the tree alone without a draft for the item", () => {
    const widget = item({ code: "ai_summary" });
    const sections = [widget];
    expect(withDraftLayout(sections, widget, undefined, [])).toBe(sections);
  });
});
