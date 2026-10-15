import { afterEach, describe, expect, it, vi } from "vitest";

import {
  csvImportApplyFixture,
  csvImportCombinedFixtures,
  csvImportFileFixtures,
  csvImportFormatErrorFixture,
  csvImportPreviewFixture,
} from "@/mocks/fixtures/csv-import";
import { layoutItem } from "@/mocks/fixtures/reports";

import { applyCsvImport, previewCsvImport } from "./api";
import {
  csvImportApplyResponseSchema,
  csvImportFileSchema,
  csvImportProblem,
  csvImportResponseSchema,
  layoutItemResponseSchema,
} from "./contracts";
import {
  csvResultKey,
  csvReviewRows,
  hiddenScopeNote,
  isFileLevelError,
  readyCardCodes,
  todayIsoDate,
} from "./csv-import";

const file = (name: string, size = 10) =>
  new File(["x".repeat(size)], name, { type: "text/csv" });

afterEach(() => vi.unstubAllGlobals());

describe("csvImportProblem", () => {
  it("accepts .csv and .zip files within the limits", () => {
    expect(csvImportProblem([file("a.csv"), file("b.ZIP")])).toBeNull();
  });

  it("names the first file of the wrong type", () => {
    expect(csvImportProblem([file("a.csv"), file("b.xlsx")])).toBe(
      "b.xlsx: upload .csv or .zip files.",
    );
  });

  it("limits the upload to 4 MB in total, not per file", () => {
    const megabytes = (count: number) => count * 1024 * 1024;
    expect(csvImportProblem([file("full.csv", megabytes(4))])).toBeNull();
    expect(
      csvImportProblem([
        file("a.csv", megabytes(2.5)),
        file("b.zip", megabytes(2.5)),
      ]),
    ).toBe("The upload can be at most 4 MB in total.");
    expect(
      csvImportProblem([file("big.csv", megabytes(4) + 1)], {
        isSingleCard: true,
      }),
    ).toBe("The upload can be at most 4 MB in total.");
  });

  it("limits the count, and a card to one .csv", () => {
    expect(csvImportProblem([])).toBe("Choose at least one file.");
    const many = Array.from({ length: 61 }, (_, index) => file(`${index}.csv`));
    expect(csvImportProblem(many)).toBe("Choose at most 60 files.");
    const card = { isSingleCard: true };
    expect(csvImportProblem([file("a.csv")], card)).toBeNull();
    expect(csvImportProblem([file("a.csv"), file("b.csv")], card)).toBe(
      "A card takes one CSV file.",
    );
    expect(csvImportProblem([file("a.zip")], card)).toBe(
      "a.zip: a card takes a .csv file.",
    );
  });
});

describe("CSV import responses", () => {
  it("parse the preview and apply shapes", () => {
    const preview = csvImportResponseSchema.parse(csvImportPreviewFixture());
    expect(preview.data.summary).toEqual({
      ready: 1,
      invalid: 1,
      skipped: 1,
      ignored: 2,
    });
    const ignored = preview.data.files.find(
      (entry) => entry.status === "ignored",
    );
    expect(ignored).toEqual({
      file: "README.txt",
      source: "MOSAIQ-Marketing-Intelligence-Templates.zip",
      line: null,
      status: "ignored",
      errors: [],
    });
    const applied = csvImportApplyResponseSchema.parse(csvImportApplyFixture());
    expect(applied.data.applied).toEqual(["audience_by_segment"]);
    expect(applied.data.layout_version).toBe(4);
  });

  it("take results with or without the Step 14 source and line", () => {
    const block = csvImportFileSchema.parse(
      csvImportCombinedFixtures.coreValues,
    );
    expect(block).toMatchObject({
      source: "MOSAIQ-Marketing-Intelligence.csv",
      line: 212,
    });
    const step13 = csvImportFileSchema.parse({
      file: "02_core_values.csv",
      status: "skipped",
    });
    expect(step13.source).toBeUndefined();
    expect(step13.line).toBeUndefined();
  });

  it("refuse an unknown status", () => {
    expect(() =>
      csvImportFileSchema.parse({ file: "a.csv", status: "imported" }),
    ).toThrow();
  });
});

describe("readyCardCodes", () => {
  it("names every ready card once, whichever file it came from", () => {
    const codes = readyCardCodes(
      [
        ...Object.values(csvImportCombinedFixtures),
        csvImportFileFixtures.ready,
        csvImportFileFixtures.invalid,
      ].map((entry) => csvImportFileSchema.parse(entry)),
    );
    expect(codes).toEqual(["audience_by_segment", "category_spending"]);
  });
});

describe("csvReviewRows", () => {
  it("puts a file's own errors first and leaves ignored files out", () => {
    const scope = layoutItemResponseSchema.parse({
      data: layoutItem({
        id: 5,
        parent_id: null,
        level: "section",
        code: "marketing_intelligence",
        title: "Marketing Intelligence",
        position: 0,
      }),
    }).data;
    const rows = csvReviewRows(
      scope,
      [
        csvImportCombinedFixtures.coreValues,
        csvImportFileFixtures.ignored,
        csvImportFormatErrorFixture,
      ].map((entry) => csvImportFileSchema.parse(entry)),
    );
    expect(rows.map((row) => row.file)).toEqual([
      "MOSAIQ-Marketing-Intelligence.csv",
      "MOSAIQ-Marketing-Intelligence.csv › core_values",
    ]);
    expect(isFileLevelError(rows[0]!)).toBe(true);
    expect(isFileLevelError(rows[1]!)).toBe(false);
  });

  it("keys the same card twice in one file apart by line", () => {
    const block = csvImportFileSchema.parse(
      csvImportCombinedFixtures.coreValues,
    );
    expect(csvResultKey(block)).not.toBe(
      csvResultKey({ ...block, status: "duplicate", line: 230 }),
    );
  });
});

describe("hiddenScopeNote", () => {
  it("warns for a ready card in a hidden tab or section only", () => {
    const ready = csvImportFileSchema.parse(csvImportFileFixtures.ready);
    expect(hiddenScopeNote(ready)).toBeUndefined();
    expect(
      hiddenScopeNote({ ...ready, tab: { ...ready.tab!, is_enabled: false } }),
    ).toMatch(/^The tab is hidden/);
    expect(hiddenScopeNote({ ...ready, section_enabled: false })).toMatch(
      /^The section is hidden/,
    );
    expect(
      hiddenScopeNote({ ...ready, status: "skipped", section_enabled: false }),
    ).toBeUndefined();
  });
});

describe("CSV import requests", () => {
  it("post every file and the date as multipart, to the scope item", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json(csvImportPreviewFixture()),
    );
    vi.stubGlobal("fetch", fetchMock);
    const scope = { agencyId: 1, clientId: 20, reportId: 7 };
    await previewCsvImport(
      scope,
      5,
      [file("a.csv"), file("b.zip")],
      "2026-10-15",
    );
    fetchMock.mockResolvedValueOnce(Response.json(csvImportApplyFixture()));
    await applyCsvImport(scope, 5, [file("a.csv")], "2026-10-15", [
      "audience_overview",
      "core_values",
    ]);

    const [previewUrl, previewInit] = fetchMock.mock.calls[0]!;
    expect(previewUrl).toBe(
      "/api/v1/agencies/1/clients/20/reports/7/layout/5/csv-import/preview",
    );
    const previewBody = previewInit?.body as FormData;
    expect(
      previewBody.getAll("files[]").map((entry) => (entry as File).name),
    ).toEqual(["a.csv", "b.zip"]);
    expect(previewBody.get("as_of")).toBe("2026-10-15");
    expect(previewBody.has("cards[]")).toBe(false);
    // The browser sets the multipart boundary itself.
    expect(new Headers(previewInit?.headers).has("Content-Type")).toBe(false);
    expect(fetchMock.mock.calls[1]![0]).toBe(
      "/api/v1/agencies/1/clients/20/reports/7/layout/5/csv-import",
    );
    const applyBody = fetchMock.mock.calls[1]![1]?.body as FormData;
    expect(applyBody.getAll("cards[]")).toEqual([
      "audience_overview",
      "core_values",
    ]);
  });
});

describe("todayIsoDate", () => {
  it("uses the local calendar date", () => {
    expect(todayIsoDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
