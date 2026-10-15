import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse } from "msw";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { Toaster } from "@/components/ui/Toast";
import {
  combinedCsvName,
  csvImportCombinedFixtures,
  csvImportFileFixtures,
  csvImportFormatErrorFixture,
  csvImportPreviewFixture,
} from "@/mocks/fixtures/csv-import";
import { layoutItem } from "@/mocks/fixtures/reports";
import { csvImportHandlers } from "@/mocks/handlers/csv-import";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { applyCsvImport, previewCsvImport } from "./api";
import { layoutItemResponseSchema } from "./contracts";
import { CsvImportDialog } from "./CsvImportDialog";
import { reportKeys } from "./queries";

// The real requests run through MSW; the spies show what was sent.
vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    previewCsvImport: vi.fn(actual.previewCsvImport),
    applyCsvImport: vi.fn(actual.applyCsvImport),
  };
});

const sentFiles = (
  spy: typeof previewCsvImport | typeof applyCsvImport,
  call = 0,
) => {
  const args = vi.mocked(spy).mock.calls[call];
  return (
    args && {
      files: args[2].map((file) => file.name),
      asOf: args[3],
      ...(args[4] ? { cards: args[4] } : {}),
    }
  );
};

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
const report = { id: 7, agency_id: 1, client_id: 20 };

// Marketing Intelligence → Audience Profile (31) and Behaviour (41, 42).
const section = layoutItemResponseSchema.parse({
  data: layoutItem({
    id: 5,
    parent_id: null,
    level: "section",
    code: "marketing_intelligence",
    title: "Marketing Intelligence",
    position: 1,
    children: [
      layoutItem({
        id: 6,
        parent_id: 5,
        level: "tab",
        code: "audience_profile",
        title: "Audience Profile",
        position: 0,
        children: [
          layoutItem({
            id: 31,
            parent_id: 6,
            level: "widget",
            code: "audience_by_segment",
            title: "Audience by Segment",
            kind: "manual_data",
            type: "progress_list",
            position: 0,
          }),
        ],
      }),
      layoutItem({
        id: 7,
        parent_id: 5,
        level: "tab",
        code: "behaviour",
        title: "Behaviour",
        position: 1,
        children: [41, 42].map((id, position) =>
          layoutItem({
            id,
            parent_id: 7,
            level: "widget",
            code: id === 41 ? "core_values" : "category_spending",
            title: id === 41 ? "Core Values" : "Category Spending",
            kind: "manual_data",
            type: "progress_list",
            position,
          }),
        ),
      }),
    ],
  }),
}).data;
const card = section.children[1]!.children[0]!;

const csv = (name: string, size = 64) =>
  new File(["x".repeat(size)], name, { type: "text/csv" });

function renderDialog(
  item = section,
  props: { onClose?: () => void; onPreview?: () => void } = {},
) {
  return renderWithScope(
    <>
      <CsvImportDialog
        item={item}
        onClose={props.onClose ?? vi.fn()}
        onPreview={props.onPreview ?? vi.fn()}
        report={report}
        scope={scope}
        scopeLabel={
          item.level === "widget"
            ? "Card: Core Values"
            : "Marketing Intelligence"
        }
      />
      <Toaster />
    </>,
  );
}

const dropzone = () => screen.getByTestId("csv-dropzone");
const drop = (...files: File[]) =>
  fireEvent.drop(dropzone(), { dataTransfer: { files } });

// Two plain CSVs: one ready, one with errors.
const readyFile = {
  ...csvImportFileFixtures.ready,
  file: "03_audience_by_segment.csv",
};
const invalidFile = {
  ...csvImportFileFixtures.invalid,
  file: "02_core_values.csv",
};

afterEach(() => vi.clearAllMocks());

describe("CsvImportDialog", () => {
  it("enables Check files once valid files are chosen, and explains bad ones", async () => {
    renderDialog();
    const check = screen.getByRole("button", { name: "Check files" });
    expect(check).toBeDisabled();

    drop(csv("03_audience_by_segment.csv"));
    expect(check).toBeEnabled();

    drop(new File(["x"], "notes.xlsx"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "notes.xlsx: upload .csv or .zip files.",
    );
    expect(check).toBeDisabled();

    await userEvent.click(
      screen.getByRole("button", { name: "Remove notes.xlsx" }),
    );
    expect(check).toBeEnabled();
  });

  it("limits the chosen files to 4 MB in total", () => {
    renderDialog();
    const halfOver = 2.5 * 1024 * 1024;
    drop(csv("a.csv", halfOver), csv("b.csv", halfOver));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The upload can be at most 4 MB in total",
    );
    expect(screen.getByRole("button", { name: "Check files" })).toBeDisabled();
  });

  it("switches the template link to and from the example rows", async () => {
    renderDialog();
    const link = screen.getByRole("link", { name: "Download template" });
    const blank =
      "/api/v1/agencies/1/clients/20/reports/7/layout/5/csv-template";
    expect(link).toHaveAttribute("href", blank);
    const sample = screen.getByRole("checkbox", {
      name: "Include example rows",
    });
    expect(sample).not.toBeChecked();
    await userEvent.click(sample);
    expect(link).toHaveAttribute("href", `${blank}?sample=1`);
    await userEvent.click(sample);
    expect(link).toHaveAttribute("href", blank);
  });

  it("lists every status, expands errors and hides ignored files", async () => {
    const api = csvImportHandlers(scope, section.id);
    server.use(...api.handlers);
    renderDialog();
    drop(new File(["zip"], "MOSAIQ-Marketing-Intelligence-Templates.zip"));
    await userEvent.click(screen.getByRole("button", { name: "Check files" }));

    expect(
      await screen.findByText(
        "1 ready · 1 with errors · 1 skipped · 1 not used",
      ),
    ).toBeInTheDocument();
    expect(sentFiles(previewCsvImport)?.files).toEqual([
      "MOSAIQ-Marketing-Intelligence-Templates.zip",
    ]);
    const table = screen.getByRole("table", { name: "Cards checked" });
    const rows = within(table).getAllByRole("row").slice(1);
    // Tab by tab, card by card; the unmatched MMM file last.
    expect(rows.map((row) => within(row).getAllByRole("cell")[0]!)).toEqual([
      expect.objectContaining({
        textContent: expect.stringContaining("Audience by Segment"),
      }),
      expect.objectContaining({
        textContent: expect.stringContaining("Core Values"),
      }),
      expect.objectContaining({
        textContent: expect.stringContaining("Category Spending"),
      }),
      expect.objectContaining({
        textContent: expect.stringContaining("Channel Diagnosis"),
      }),
    ]);
    for (const label of [
      "Ready",
      "Errors",
      "Skipped – no rows",
      "Not in this section",
    ])
      expect(within(table).getByText(label)).toBeInTheDocument();
    expect(screen.queryByText("README.txt")).not.toBeInTheDocument();

    await userEvent.click(
      within(table).getByRole("button", {
        name: "Show 2 errors in Core Values",
      }),
    );
    expect(
      within(table).getByText(
        /Line 3 · value: Write numbers without %, \$ or commas/,
      ),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("link", {
        name: "Add audiences in report settings",
      }),
    ).toHaveAttribute("href", "/reports/7/settings?agency=1&client=20");
    // The card with errors is left alone; the ready one still applies.
    expect(screen.getByRole("button", { name: "Apply 1 card" })).toBeEnabled();
    expect(screen.queryByText(/held back|aren't applied|isn't applied/)).toBe(
      null,
    );
  });

  it("lists a combined file's cards as rows, with line-numbered errors", async () => {
    const api = csvImportHandlers(scope, section.id, {
      preview: () =>
        HttpResponse.json(
          csvImportPreviewFixture(Object.values(csvImportCombinedFixtures)),
        ),
    });
    server.use(...api.handlers);
    renderDialog();
    drop(csv(combinedCsvName));
    await userEvent.click(screen.getByRole("button", { name: "Check files" }));

    expect(
      await screen.findByText(
        "2 ready · 1 with errors · 0 skipped · 1 not used",
      ),
    ).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Cards checked" });
    const titles = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell")[0]!.textContent);
    expect(titles).toEqual([
      "Audience by Segment",
      "Core Values",
      "Category Spending",
      "Channel Diagnosis",
    ]);
    // One file uploaded, so no file name under the cards.
    expect(within(table).queryByText(combinedCsvName)).not.toBeInTheDocument();
    await userEvent.click(
      within(table).getByRole("button", {
        name: "Show 1 error in Core Values",
      }),
    );
    expect(
      within(table).getByText(
        /Line 215 · value: Write numbers without %, \$ or commas/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply 2 cards" })).toBeEnabled();
  });

  it("names each card's file when several were uploaded", async () => {
    const api = csvImportHandlers(scope, section.id, {
      preview: () =>
        HttpResponse.json(
          csvImportPreviewFixture([
            csvImportCombinedFixtures.audienceBySegment,
            {
              ...csvImportFileFixtures.skipped,
              file: "03_category_spending.csv",
              source: "03_category_spending.csv",
            },
          ]),
        ),
    });
    server.use(...api.handlers);
    renderDialog();
    drop(csv(combinedCsvName), csv("03_category_spending.csv"));
    await userEvent.click(screen.getByRole("button", { name: "Check files" }));
    const table = await screen.findByRole("table", { name: "Cards checked" });
    const [first, second] = within(table).getAllByRole("row").slice(1);
    expect(within(first!).getByText(combinedCsvName)).toBeInTheDocument();
    expect(
      within(second!).getByText("03_category_spending.csv"),
    ).toBeInTheDocument();
  });

  it("shows a file's own format error at the top, titled by the file", async () => {
    const api = csvImportHandlers(scope, section.id, {
      preview: () =>
        HttpResponse.json(
          csvImportPreviewFixture([
            csvImportCombinedFixtures.audienceBySegment,
            csvImportFormatErrorFixture,
          ]),
        ),
    });
    server.use(...api.handlers);
    renderDialog();
    drop(csv(combinedCsvName));
    await userEvent.click(screen.getByRole("button", { name: "Check files" }));
    const table = await screen.findByRole("table", { name: "Cards checked" });
    const first = within(table).getAllByRole("row")[1]!;
    expect(within(first).getByText(combinedCsvName)).toBeInTheDocument();
    expect(within(first).getByText("Errors")).toBeInTheDocument();
    expect(
      within(first).getByText("Line 4: Start each card with a #card line."),
    ).toBeInTheDocument();
  });

  it("posts every file again with the ready cards and the chosen date, then closes", async () => {
    const onClose = vi.fn();
    const api = csvImportHandlers(scope, section.id, {
      preview: () =>
        HttpResponse.json(csvImportPreviewFixture([readyFile, invalidFile])),
    });
    server.use(...api.handlers);
    const { queryClient } = renderDialog(section, { onClose });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const asOf = screen.getByLabelText("As of");
    fireEvent.change(asOf, { target: { value: "2026-09-30" } });
    drop(csv("03_audience_by_segment.csv"), csv("02_core_values.csv"));
    await userEvent.click(screen.getByRole("button", { name: "Check files" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Apply 1 card" }),
    );

    expect(await screen.findByText("1 card updated")).toBeInTheDocument();
    expect(sentFiles(previewCsvImport)).toEqual({
      files: ["03_audience_by_segment.csv", "02_core_values.csv"],
      asOf: "2026-09-30",
    });
    expect(sentFiles(applyCsvImport)).toEqual({
      files: ["03_audience_by_segment.csv", "02_core_values.csv"],
      asOf: "2026-09-30",
      cards: ["audience_by_segment"],
    });
    expect(api.calls.apply).toBe(1);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: reportKeys.layout(scope),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: reportKeys.preview(scope),
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the dialog open with the API's message when apply is refused", async () => {
    const onClose = vi.fn();
    const message =
      "2 files have errors. Fix them or remove them and try again.";
    const api = csvImportHandlers(scope, section.id, {
      preview: () => HttpResponse.json(csvImportPreviewFixture([readyFile])),
      apply: () =>
        HttpResponse.json(
          { message, errors: { files: [message] } },
          { status: 422 },
        ),
    });
    server.use(...api.handlers);
    renderDialog(section, { onClose });
    drop(csv("03_audience_by_segment.csv"));
    await userEvent.click(screen.getByRole("button", { name: "Check files" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Apply 1 card" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("button", { name: "Apply 1 card" })).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("posts a combined file once, naming only its ready cards", async () => {
    const api = csvImportHandlers(scope, section.id, {
      preview: () =>
        HttpResponse.json(
          csvImportPreviewFixture(Object.values(csvImportCombinedFixtures)),
        ),
    });
    server.use(...api.handlers);
    const onClose = vi.fn();
    renderDialog(section, { onClose });
    drop(csv(combinedCsvName));
    await userEvent.click(screen.getByRole("button", { name: "Check files" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Apply 2 cards" }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sentFiles(applyCsvImport)).toMatchObject({
      files: [combinedCsvName],
      cards: ["audience_by_segment", "category_spending"],
    });
  });

  it("stays on the review with the message when a card is no longer ready", async () => {
    const onClose = vi.fn();
    const message = "Core Values has errors. Check the files again.";
    const api = csvImportHandlers(scope, section.id, {
      preview: () => HttpResponse.json(csvImportPreviewFixture([readyFile])),
      apply: () =>
        HttpResponse.json(
          { message, errors: { cards: [message] } },
          { status: 422 },
        ),
    });
    server.use(...api.handlers);
    renderDialog(section, { onClose });
    drop(csv("03_audience_by_segment.csv"));
    await userEvent.click(screen.getByRole("button", { name: "Check files" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Apply 1 card" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(
      screen.getByRole("table", { name: "Cards checked" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Change files" }),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the shared access message when the report is out of reach", async () => {
    const api = csvImportHandlers(scope, section.id, {
      preview: () =>
        HttpResponse.json({ message: "Forbidden" }, { status: 403 }),
    });
    server.use(...api.handlers);
    renderDialog();
    drop(csv("03_audience_by_segment.csv"));
    await userEvent.click(screen.getByRole("button", { name: "Check files" }));
    expect(
      await screen.findByText("You do not have access to this report."),
    ).toBeInTheDocument();
  });

  it("takes a single .csv for a card", async () => {
    renderDialog(card);
    const input = screen.getByLabelText("Choose a CSV file");
    expect(input).not.toHaveAttribute("multiple");
    expect(input).toHaveAttribute("accept", ".csv,text/csv");

    drop(new File(["zip"], "templates.zip"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "templates.zip: a card takes a .csv file.",
    );
    // A second file replaces the first.
    drop(csv("02_core_values.csv"));
    const chosen = screen.getByRole("list", { name: "Chosen files" });
    expect(within(chosen).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Check files" })).toBeEnabled();
  });

  it("takes the whole section file for a card, and shows a missing block", async () => {
    const message = "This file has no #card block for Core Values.";
    const api = csvImportHandlers(scope, card.id, {
      preview: () =>
        HttpResponse.json(
          { message, errors: { files: [message] } },
          { status: 422 },
        ),
    });
    server.use(...api.handlers);
    renderDialog(card);
    drop(csv(combinedCsvName));
    const check = screen.getByRole("button", { name: "Check files" });
    expect(check).toBeEnabled();
    await userEvent.click(check);
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("warns when a ready card's tab is hidden", async () => {
    const api = csvImportHandlers(scope, section.id, {
      preview: () =>
        HttpResponse.json(
          csvImportPreviewFixture([
            {
              ...readyFile,
              tab: { ...readyFile.tab, is_enabled: false },
            },
          ]),
        ),
    });
    server.use(...api.handlers);
    renderDialog();
    drop(csv("03_audience_by_segment.csv"));
    await userEvent.click(screen.getByRole("button", { name: "Check files" }));
    expect(
      (
        await screen.findAllByText(
          "The tab is hidden. Show it in the structure to publish this card.",
        )
      ).length,
    ).toBeGreaterThan(0);
  });

  it("shows a ready card on the canvas while the dialog steps aside", async () => {
    const onPreview = vi.fn();
    const api = csvImportHandlers(scope, section.id, {
      preview: () => HttpResponse.json(csvImportPreviewFixture([readyFile])),
    });
    server.use(...api.handlers);
    renderDialog(section, { onPreview });
    drop(csv("03_audience_by_segment.csv"));
    await userEvent.click(screen.getByRole("button", { name: "Check files" }));
    const table = await screen.findByRole("table", { name: "Cards checked" });
    await userEvent.click(
      within(table).getByRole("button", {
        name: "Preview Audience by Segment on the canvas",
      }),
    );

    expect(onPreview).toHaveBeenLastCalledWith({
      itemId: 31,
      content: readyFile.content,
      title: "Audience by Segment",
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Back to import" }),
    );
    expect(onPreview).toHaveBeenLastCalledWith(undefined);
    expect(
      screen.getByRole("button", { name: "Apply 1 card" }),
    ).toBeInTheDocument();
  });

  it("asks before discarding chosen files", async () => {
    const onClose = vi.fn();
    renderDialog(section, { onClose });
    drop(csv("03_audience_by_segment.csv"));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Discard these files?")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Keep importing" }),
    );
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Discard files" }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("closes straight away with nothing chosen", async () => {
    const onClose = vi.fn();
    renderDialog(section, { onClose });
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "Discard these files?" }),
    ).not.toBeInTheDocument();
  });
});
