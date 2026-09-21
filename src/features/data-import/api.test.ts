import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { csvImportPaths, importHistoryPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import {
  confirmCsvImport,
  getCsvImport,
  listImportHistory,
  previewCsvImport,
  retryCsvImport,
} from "./api";

const record = {
  id: 55,
  agency_id: 12,
  workspace_id: 7,
  type: "reporting",
  template_version: 1,
  status: "previewed",
  mode: null,
  original_filename: "campaign-data.csv",
  checksum: "abc123",
  row_count: 10,
  valid_count: 9,
  error_count: 1,
  validation_errors: [{ row: 3, message: "Not a number." }],
  failure_code: null,
  file_expires_at: "2026-09-22T10:00:00Z",
  confirmed_at: null,
  completed_at: null,
};

describe("csv import API", () => {
  it("uploads the dataset type and file as multipart form data", async () => {
    let receivedType: unknown;
    let receivedFileName: unknown;
    server.use(
      http.post(csvImportPaths.preview(12, 4, 7), async ({ request }) => {
        const formData = await request.formData();
        receivedType = formData.get("type");
        receivedFileName = (formData.get("file") as File).name;
        return HttpResponse.json({ data: record }, { status: 201 });
      }),
    );
    const file = new File(["date,spend"], "campaign-data.csv", {
      type: "text/csv",
    });
    const result = await previewCsvImport(12, 4, 7, "reporting", file);
    expect(receivedType).toBe("reporting");
    expect(receivedFileName).toBe("campaign-data.csv");
    expect(result.id).toBe(55);
    expect(result.valid_count).toBe(9);
  });

  it("reads a csv import's current status", async () => {
    server.use(
      http.get(csvImportPaths.detail(12, 4, 7, 55), () =>
        HttpResponse.json({ data: record }),
      ),
    );
    const result = await getCsvImport(12, 4, 7, 55);
    expect(result.status).toBe("previewed");
  });

  it("confirms an import with the chosen mode", async () => {
    let receivedBody: unknown;
    server.use(
      http.post(csvImportPaths.confirm(12, 4, 7, 55), async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({
          data: { ...record, status: "imported", mode: "append" },
        });
      }),
    );
    const result = await confirmCsvImport(12, 4, 7, 55, { mode: "append" });
    expect(receivedBody).toEqual({ mode: "append" });
    expect(result.status).toBe("imported");
  });

  it("retries a failed import", async () => {
    server.use(
      http.post(csvImportPaths.retry(12, 4, 7, 55), () =>
        HttpResponse.json({ data: { ...record, status: "processing" } }),
      ),
    );
    const result = await retryCsvImport(12, 4, 7, 55);
    expect(result.status).toBe("processing");
  });

  it("lists import history with the requested filters", async () => {
    let query = "";
    server.use(
      http.get(importHistoryPaths.collection, ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json({
          data: [
            {
              id: 55,
              agency_id: 12,
              workspace_id: 7,
              uploaded_by_user_id: 3,
              type: "reporting",
              status: "imported",
              mode: "append",
              original_filename: "campaign-data.csv",
              row_count: 10,
              valid_count: 9,
              error_count: 1,
              failure_code: null,
              created_at: "2026-09-20T10:00:00Z",
              completed_at: "2026-09-20T10:05:00Z",
            },
          ],
          meta: { current_page: 1, last_page: 1, total: 1, per_page: 20 },
        });
      }),
    );
    const result = await listImportHistory({ workspace_id: 7, page: 1 });
    expect(query).toContain("workspace_id=7");
    expect(result.data[0]?.original_filename).toBe("campaign-data.csv");
    expect(result.meta.total).toBe(1);
  });
});
