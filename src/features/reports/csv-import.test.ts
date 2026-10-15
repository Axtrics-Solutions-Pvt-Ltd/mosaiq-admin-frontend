import { afterEach, describe, expect, it, vi } from "vitest";

import {
  csvImportApplyFixture,
  csvImportFileFixtures,
  csvImportPreviewFixture,
} from "@/mocks/fixtures/csv-import";

import { applyCsvImport, previewCsvImport } from "./api";
import {
  csvImportApplyResponseSchema,
  type CsvImportFile,
  csvImportFileSchema,
  csvImportProblem,
  csvImportResponseSchema,
} from "./contracts";
import { csvApplyPlan, hiddenScopeNote, todayIsoDate } from "./csv-import";

const file = (name: string, size = 10) =>
  new File(["x".repeat(size)], name, { type: "text/csv" });

const result = (name: string, status: CsvImportFile["status"]) =>
  csvImportFileSchema.parse({ file: name, status });

afterEach(() => vi.unstubAllGlobals());

describe("csvImportProblem", () => {
  it("accepts .csv and .zip files within the limits", () => {
    expect(csvImportProblem([file("a.csv"), file("b.ZIP")])).toBeNull();
  });

  it("names the first file of the wrong type or size", () => {
    expect(csvImportProblem([file("a.csv"), file("b.xlsx")])).toBe(
      "b.xlsx: upload .csv or .zip files.",
    );
    expect(csvImportProblem([file("big.zip", 5 * 1024 * 1024 + 1)])).toBe(
      "big.zip: each file must be 5 MB or smaller.",
    );
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
      status: "ignored",
      errors: [],
    });
    const applied = csvImportApplyResponseSchema.parse(csvImportApplyFixture());
    expect(applied.data.applied).toEqual(["audience_by_segment"]);
    expect(applied.data.layout_version).toBe(4);
  });

  it("refuse an unknown status", () => {
    expect(() =>
      csvImportFileSchema.parse({ file: "a.csv", status: "imported" }),
    ).toThrow();
  });
});

describe("csvApplyPlan", () => {
  it("posts only the ready CSV files", () => {
    const chosen = [file("a.csv"), file("b.csv"), file("c.csv")];
    const plan = csvApplyPlan(chosen, [
      result("a.csv", "ready"),
      result("b.csv", "invalid"),
      result("c.csv", "skipped"),
    ]);
    expect(plan.uploads.map((upload) => upload.name)).toEqual(["a.csv"]);
    expect(plan.readyCount).toBe(1);
    expect(plan.blockedZips).toEqual([]);
  });

  it("posts a zip whose files are all ready or unused", () => {
    const zip = file("templates.zip");
    const plan = csvApplyPlan(
      [zip],
      [
        result("01-audience-profile/01_audience_overview.csv", "ready"),
        result("01-audience-profile/02_cultural_identity.csv", "ready"),
        result("README.txt", "ignored"),
      ],
    );
    expect(plan.uploads).toEqual([zip]);
    expect(plan.readyCount).toBe(2);
  });

  it("holds back a zip with a file that has errors", () => {
    const plan = csvApplyPlan(
      [file("templates.zip"), file("a.csv")],
      [
        result("04-behaviour/02_core_values.csv", "invalid"),
        result("04-behaviour/01_shopping_behaviour.csv", "ready"),
        result("a.csv", "ready"),
      ],
    );
    expect(plan.uploads.map((upload) => upload.name)).toEqual(["a.csv"]);
    expect(plan.readyCount).toBe(1);
    expect(plan.blockedZips).toEqual(["templates.zip"]);
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
    await applyCsvImport(scope, 5, [file("a.csv")], "2026-10-15");

    const [previewUrl, previewInit] = fetchMock.mock.calls[0]!;
    expect(previewUrl).toBe(
      "/api/v1/agencies/1/clients/20/reports/7/layout/5/csv-import/preview",
    );
    const previewBody = previewInit?.body as FormData;
    expect(
      previewBody.getAll("files[]").map((entry) => (entry as File).name),
    ).toEqual(["a.csv", "b.zip"]);
    expect(previewBody.get("as_of")).toBe("2026-10-15");
    // The browser sets the multipart boundary itself.
    expect(new Headers(previewInit?.headers).has("Content-Type")).toBe(false);
    expect(fetchMock.mock.calls[1]![0]).toBe(
      "/api/v1/agencies/1/clients/20/reports/7/layout/5/csv-import",
    );
  });
});

describe("todayIsoDate", () => {
  it("uses the local calendar date", () => {
    expect(todayIsoDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
