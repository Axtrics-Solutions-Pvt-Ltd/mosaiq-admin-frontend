import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

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

const scope = { agencyId: 1, clientId: 20, reportId: 7 };

function manualWidget(overrides: Partial<LayoutItemFixture>) {
  const fixture = layoutItem({
    id: 30,
    parent_id: 5,
    level: "widget",
    code: "audience_overview",
    title: "Audience Overview",
    type: "kpi_list",
    kind: "manual_data",
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
  );
  return sent;
}

function renderEditor(item: ReturnType<typeof manualWidget>["item"]) {
  return renderWithScope(
    <WidgetInspector item={item} onDirtyChange={vi.fn()} scope={scope} />,
    { platformRoleCode: "SUPER_ADMIN" },
  );
}

const save = () =>
  userEvent.click(screen.getByRole("button", { name: "Save" }));

describe("Manual content editors", () => {
  it("adds, reorders and removes KPI list rows and saves them as text", async () => {
    const { fixture, item } = manualWidget({
      content: {
        items: [
          { label: "Population", value: "1.8M", format: "text" },
          { label: "Median age", value: 34, format: "number" },
        ],
      },
    });
    const sent = usePatchApi(fixture);
    renderEditor(item);
    expect(screen.getAllByLabelText("Value")[1]).toHaveValue("34");
    await userEvent.click(screen.getByRole("button", { name: "Add row" }));
    await userEvent.type(screen.getAllByLabelText("Label")[2]!, "Households");
    await userEvent.type(screen.getAllByLabelText("Value")[2]!, "520K");
    await userEvent.click(
      screen.getByRole("button", { name: "Move row 3 up" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove row 1" }));
    await userEvent.type(screen.getByLabelText("As of"), "2026-09-01");
    await save();
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      settings: null,
      content: {
        items: [
          { label: "Households", value: "520K", format: "text" },
          { label: "Median age", value: "34", format: "text" },
        ],
      },
      as_of: "2026-09-01",
    });
  });

  it("maps API content errors to the field table row they belong to", async () => {
    const { fixture, item } = manualWidget({
      code: "cultural_identity",
      title: "Cultural Identity",
      type: "field_table",
      content: {
        columns: ["Field", "Value", "Implication"],
        rows: [
          { field: "Identity", value: "High", note: null },
          { field: "Festivals", value: "Vaisakhi", note: null },
        ],
      },
    });
    usePatchApi(fixture, () =>
      HttpResponse.json(
        {
          message: "The given data was invalid.",
          errors: {
            "content.rows.1.value": ["The value may not be longer than 500."],
          },
        },
        { status: 422 },
      ),
    );
    renderEditor(item);
    await userEvent.type(screen.getAllByLabelText("Note")[1]!, "Seasonal");
    await save();
    expect(
      await screen.findByText("The value may not be longer than 500."),
    ).toBeVisible();
    expect(screen.getAllByLabelText("Value")[1]).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByText("Review the highlighted fields.")).toBeVisible();
    expect(screen.getAllByLabelText("Note")[1]).toHaveValue("Seasonal");
  });

  it("checks field table headings are all or nothing before saving", async () => {
    const { fixture, item } = manualWidget({
      code: "cultural_identity",
      title: "Cultural Identity",
      type: "field_table",
    });
    const sent = usePatchApi(fixture);
    renderEditor(item);
    await userEvent.type(screen.getByLabelText("First heading"), "Field");
    await userEvent.type(screen.getByLabelText("Field"), "Identity");
    await userEvent.type(screen.getByLabelText("Value"), "High");
    await save();
    expect(
      await screen.findAllByText("Enter all three headings, or none."),
    ).toHaveLength(2);
    expect(sent).toHaveLength(0);
  });

  it("keeps data table cells under their column when columns move", async () => {
    const { fixture, item } = manualWidget({
      code: "mmm_channel_diagnosis",
      title: "Channel Diagnosis",
      type: "data_table",
      content: {
        columns: [
          { key: "channel", label: "Channel", format: "text" },
          { key: "roi", label: "ROI", format: "multiplier" },
        ],
        rows: [{ channel: "Meta Ads", roi: 2.4 }],
      },
    });
    const sent = usePatchApi(fixture);
    renderEditor(item);
    await userEvent.click(screen.getByRole("button", { name: "Add column" }));
    await userEvent.type(screen.getAllByLabelText("Heading")[2]!, "Spend");
    await userEvent.type(screen.getAllByLabelText("Key")[2]!, "spend");
    await userEvent.selectOptions(
      screen.getAllByLabelText("Format")[2]!,
      "currency",
    );
    await userEvent.type(screen.getByLabelText("Spend"), "12,500");
    await userEvent.click(
      screen.getByRole("button", { name: "Move column 2 down" }),
    );
    await save();
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({
      content: {
        columns: [
          { key: "channel", label: "Channel", format: "text" },
          { key: "spend", label: "Spend", format: "currency" },
          { key: "roi", label: "ROI", format: "multiplier" },
        ],
        rows: [{ channel: "Meta Ads", spend: 12500, roi: 2.4 }],
      },
    });
  });

  it("drops a heatmap column's cells with the column", async () => {
    const { fixture, item } = manualWidget({
      code: "cultural_values_index",
      title: "Cultural Values Index",
      type: "heatmap",
      content: {
        columns: ["Low", "Medium", "High"],
        rows: [{ label: "Heritage", values: [1, 4, 9] }],
      },
    });
    const sent = usePatchApi(fixture);
    renderEditor(item);
    await userEvent.click(
      screen.getByRole("button", { name: "Remove column 2" }),
    );
    await save();
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({
      content: {
        columns: ["Low", "High"],
        rows: [{ label: "Heritage", values: [1, 9] }],
      },
    });
  });

  it("saves progress list groups, shares and a second value", async () => {
    const { fixture, item } = manualWidget({
      code: "language_province_mix",
      title: "Language & Province Mix",
      type: "progress_list",
    });
    const sent = usePatchApi(fixture);
    renderEditor(item);
    await userEvent.click(screen.getByRole("button", { name: "Add group" }));
    const groups = screen.getByRole("group", { name: "Groups" });
    await userEvent.type(within(groups).getByLabelText("Label"), "Languages");
    await userEvent.type(within(groups).getByLabelText("Key"), "languages");
    const rows = screen.getByRole("group", { name: "Rows" });
    await userEvent.selectOptions(
      within(rows).getByLabelText("Group"),
      "languages",
    );
    await userEvent.type(within(rows).getByLabelText("Label"), "Punjabi");
    await userEvent.type(within(rows).getByLabelText("Value"), "6.4");
    await userEvent.type(within(rows).getByLabelText("Second label"), "Reach");
    await userEvent.type(
      within(rows).getByLabelText("Second value"),
      "2300000",
    );
    await save();
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({
      content: {
        groups: [{ key: "languages", label: "Languages" }],
        items: [
          {
            group: "languages",
            label: "Punjabi",
            value: 6.4,
            format: "percent",
            share: null,
            secondary: { label: "Reach", value: 2300000, format: "number" },
          },
        ],
      },
    });
  });

  it("asks for a number before saving a donut segment", async () => {
    const { fixture, item } = manualWidget({
      code: "generation_split",
      title: "Generation Split",
      type: "donut",
    });
    const sent = usePatchApi(fixture);
    renderEditor(item);
    await userEvent.type(screen.getByLabelText("Label"), "Gen Z");
    await userEvent.type(screen.getByLabelText("Value"), "lots");
    await save();
    expect(
      await screen.findByText("Enter the value as a number."),
    ).toBeVisible();
    expect(sent).toHaveLength(0);
    await userEvent.clear(screen.getByLabelText("Value"));
    await userEvent.type(screen.getByLabelText("Value"), "31");
    await save();
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({
      content: {
        center: null,
        items: [{ label: "Gen Z", value: 31, format: "number" }],
      },
    });
  });
});
