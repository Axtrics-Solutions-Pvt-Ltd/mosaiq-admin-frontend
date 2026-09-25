import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { reportPaths } from "@/lib/api/paths";
import { layoutItem, type LayoutItemFixture } from "@/mocks/fixtures/reports";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { layoutItemResponseSchema } from "./contracts";
import { WidgetInspector } from "./WidgetInspector";

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

function renderInspector(item: ReturnType<typeof widget>["item"]) {
  return renderWithScope(
    <WidgetInspector item={item} onDirtyChange={vi.fn()} scope={scope} />,
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
});
