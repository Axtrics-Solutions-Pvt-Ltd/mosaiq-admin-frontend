import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { reportPaths } from "@/lib/api/paths";
import {
  accentFixture,
  accentFixtures,
  layoutItem,
  type LayoutItemFixture,
} from "@/mocks/fixtures/reports";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { type EditingValue, layoutItemResponseSchema } from "./contracts";
import { type LiveEditing, WidgetInspector } from "./WidgetInspector";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

const scope = { agencyId: 1, clientId: 20, reportId: 7 };

function widget(overrides: Partial<LayoutItemFixture>) {
  const fixture = layoutItem({
    id: 11,
    parent_id: 2,
    level: "widget",
    code: "blended_roas",
    title: "Blended ROAS",
    type: "kpi",
    kind: "live",
    position: 0,
    ...overrides,
  });
  return {
    fixture,
    item: layoutItemResponseSchema.parse({ data: fixture }).data,
  };
}

function usePatchApi(fixture: LayoutItemFixture, response?: () => Response) {
  const sent: unknown[] = [];
  server.use(
    http.patch(
      reportPaths.layoutItem(1, 20, 7, fixture.id),
      async ({ request }) => {
        sent.push(await request.json());
        return response?.() ?? HttpResponse.json({ data: fixture });
      },
    ),
    // Saving refreshes the preview queries; none is mounted here.
  );
  return sent;
}

function section(overrides: Partial<LayoutItemFixture>) {
  return widget({
    id: 1,
    parent_id: null,
    level: "section",
    code: "reporting",
    title: "Reporting Dashboard",
    type: null,
    kind: null,
    accent: accentFixture("blue"),
    ...overrides,
  });
}

function editingValue(overrides: Partial<EditingValue>): EditingValue {
  return {
    path: "value",
    metric: "spend",
    is_base: true,
    date_from: "2026-09-01",
    date_to: "2026-09-30",
    total: 1200,
    edited: false,
    correction_ids: [],
    ...overrides,
  };
}

const channels = [
  { code: "meta", name: "Meta" },
  { code: "google", name: "Google Ads" },
];

function renderInspector(
  item: ReturnType<typeof widget>["item"],
  liveEditing?: LiveEditing,
) {
  return renderWithScope(
    <WidgetInspector
      accents={accentFixtures}
      item={item}
      liveEditing={liveEditing}
      onDirtyChange={vi.fn()}
      scope={scope}
    />,
    { platformRoleCode: "SUPER_ADMIN" },
  );
}

describe("WidgetInspector", () => {
  it("gives a live widget no way to type its numbers", () => {
    renderInspector(widget({}).item);
    expect(screen.getByLabelText("Title")).toBeVisible();
    expect(screen.getByLabelText("Subtitle")).toBeVisible();
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.getByText(/use the pencil beside the value/)).toBeVisible();
  });

  it("asks for a channel when a live widget's totals combine several", async () => {
    const onChannelChange = vi.fn();
    const onRevealValues = vi.fn();
    renderInspector(
      widget({
        code: "spend_vs_conversions",
        title: "Spend vs Conversions",
        type: "line_chart",
      }).item,
      {
        values: [editingValue({ path: "series.0.points.0.y" })],
        channel: undefined,
        channels,
        onChannelChange,
        onRevealValues,
      },
    );
    expect(screen.getByText(/combines several channels/)).toBeVisible();
    // Focusing the picker opens the values table before a channel is chosen.
    await userEvent.click(screen.getByLabelText("Edit numbers for"));
    expect(onRevealValues).toHaveBeenCalled();
    await userEvent.selectOptions(
      screen.getByLabelText("Edit numbers for"),
      "google",
    );
    expect(onChannelChange).toHaveBeenCalledWith("google");
  });

  it("points to the pencils once a channel narrows the values", () => {
    renderInspector(
      widget({
        code: "spend_vs_conversions",
        title: "Spend vs Conversions",
        type: "line_chart",
      }).item,
      {
        values: [editingValue({ workspace_id: 5 })],
        channel: "meta",
        channels,
        onChannelChange: vi.fn(),
      },
    );
    expect(screen.getByText(/use the pencil beside the value/)).toBeVisible();
    expect(screen.getByLabelText("Edit numbers for")).toHaveValue("meta");
  });

  it("says campaign rows can't be edited and offers no channel", () => {
    renderInspector(
      widget({
        code: "active_campaigns",
        title: "Active Campaigns",
        type: "data_table",
      }).item,
      { values: [], channel: undefined, channels, onChannelChange: vi.fn() },
    );
    expect(
      screen.getByText(/Campaign rows come straight from the channel data/),
    ).toBeVisible();
    expect(screen.queryByLabelText("Edit numbers for")).not.toBeInTheDocument();
  });

  it("saves the number of active campaigns shown", async () => {
    const { fixture, item } = widget({
      code: "active_campaigns",
      title: "Active Campaigns",
      type: "data_table",
    });
    const sent = usePatchApi(fixture);
    renderInspector(item);
    const limit = screen.getByLabelText("Campaigns shown");
    await userEvent.type(limit, "500");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("Enter a whole number from 1 to 200."),
    ).toBeVisible();
    await userEvent.clear(limit);
    await userEvent.type(limit, "10");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ settings: { limit: 10 } });
  });

  it("saves a KPI card's metric choice and title as settings", async () => {
    const { fixture, item } = widget({
      code: "kpi_cards",
      title: "Key Metrics",
      type: "kpi_group",
      settings: { title: "Old title" },
    });
    const sent = usePatchApi(fixture);
    renderInspector(item);
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    await userEvent.clear(screen.getByLabelText("Title"));
    await userEvent.click(screen.getByRole("checkbox", { name: "Spend" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "ROAS" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ settings: { metrics: ["spend", "roas"] } });
  });

  it("edits an AI summary's headline, text and as-of date", async () => {
    const { fixture, item } = widget({
      id: 10,
      code: "ai_summary",
      title: "AI Summary",
      type: "text_hero",
      kind: "text",
    });
    const sent = usePatchApi(fixture);
    renderInspector(item);
    await userEvent.type(screen.getByLabelText("Headline"), "Meta leads");
    await userEvent.type(screen.getByLabelText("Text"), "ROAS rose 28%.");
    await userEvent.type(screen.getByLabelText("As of"), "2026-09-20");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      settings: null,
      content: { headline: "Meta leads", body: "ROAS rose 28%." },
      as_of: "2026-09-20",
    });
  });

  it("edits a bullet list with a list editor", async () => {
    const { fixture, item } = widget({
      id: 12,
      code: "what_worked",
      title: "What Worked",
      type: "bullet_list",
      kind: "text",
      content: { items: ["Video drove CTR"] },
    });
    const sent = usePatchApi(fixture);
    renderInspector(item);
    expect(screen.getByLabelText("Point 1")).toHaveValue("Video drove CTR");
    await userEvent.click(screen.getByRole("button", { name: "Add point" }));
    await userEvent.type(
      screen.getByLabelText("Point 2"),
      "Retargeting cut CPA",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Move point 2 up" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({
      content: { items: ["Retargeting cut CPA", "Video drove CTR"] },
    });
  });

  it("shows an API content error on the recommendation it belongs to", async () => {
    const { fixture, item } = widget({
      id: 13,
      code: "recommendations",
      title: "Recommendations",
      type: "recommendation_list",
      kind: "text",
      content: { items: [{ title: "Shift budget", body: null, owner: null }] },
    });
    usePatchApi(fixture, () =>
      HttpResponse.json(
        {
          message: "The given data was invalid.",
          errors: { "content.items.0.owner": ["The owner is too long."] },
        },
        { status: 422 },
      ),
    );
    renderInspector(item);
    await userEvent.type(screen.getByLabelText("Owner"), "Media team");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("The owner is too long.")).toBeVisible();
    expect(screen.getByLabelText("Owner")).toHaveValue("Media team");
  });

  it("opens the content editor of a manual widget's render type", () => {
    renderInspector(
      widget({
        code: "audience_overview",
        title: "Audience Overview",
        type: "kpi_list",
        kind: "manual_data",
      }).item,
    );
    expect(
      screen.getByRole("form", { name: "Audience Overview content" }),
    ).toBeVisible();
    expect(screen.getByRole("group", { name: "Rows" })).toBeVisible();
  });

  it("keeps a manual widget of an unknown type to its title", () => {
    renderInspector(
      widget({
        code: "future_manual",
        title: "Future",
        type: "sankey",
        kind: "manual_data",
      }).item,
    );
    expect(screen.getByText(/can't be edited here yet/)).toBeVisible();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("resets a widget only after confirmation", async () => {
    const { fixture, item } = widget({});
    let resets = 0;
    server.use(
      http.post(reportPaths.layoutItemReset(1, 20, 7, fixture.id), () => {
        resets += 1;
        return HttpResponse.json({ data: fixture });
      }),
    );
    renderInspector(item);
    await userEvent.click(screen.getByRole("button", { name: "Reset widget" }));
    expect(resets).toBe(0);
    const dialog = screen.getByRole("dialog", { name: "Reset this widget?" });
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Reset widget" }),
    );
    await waitFor(() => expect(resets).toBe(1));
  });

  it("shows a section's colours with its default chosen and no subtitle", () => {
    renderInspector(section({}).item);
    const colours = screen.getByRole("group", { name: "Colour" });
    expect(within(colours).getAllByRole("radio")).toHaveLength(8);
    expect(
      within(colours).getByRole("radio", { name: "Blue (default)" }),
    ).toBeChecked();
    expect(screen.getByLabelText("Title")).toBeVisible();
    expect(screen.queryByLabelText("Subtitle")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset section" })).toBeVisible();
  });

  it("saves a section colour with the section's other settings", async () => {
    const { fixture, item } = section({ settings: { title: "Performance" } });
    const sent = usePatchApi(fixture);
    renderInspector(item);
    await userEvent.click(screen.getByRole("radio", { name: "Rose" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      settings: { title: "Performance", accent: "rose" },
    });
  });

  it("shows a stored colour as chosen and the API's colour error on it", async () => {
    const { fixture, item } = section({
      settings: { accent: "teal" },
      accent: accentFixture("teal", false),
    });
    usePatchApi(fixture, () =>
      HttpResponse.json(
        {
          message: "The given data was invalid.",
          errors: {
            "settings.accent": ["Choose one of the available colours."],
          },
        },
        { status: 422 },
      ),
    );
    renderInspector(item);
    expect(screen.getByRole("radio", { name: "Teal" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "Slate" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("Choose one of the available colours."),
    ).toBeVisible();
    expect(screen.getByRole("radio", { name: "Slate" })).toBeChecked();
  });

  it("offers no colour on a widget", () => {
    renderInspector(widget({}).item);
    expect(
      screen.queryByRole("group", { name: "Colour" }),
    ).not.toBeInTheDocument();
  });
});
