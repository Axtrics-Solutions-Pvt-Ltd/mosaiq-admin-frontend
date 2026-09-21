import { apiRequest } from "@/lib/api/client";
import { csvImportPaths, importHistoryPaths } from "@/lib/api/paths";

import {
  type ConfirmCsvImportPayload,
  csvImportResponseSchema,
  type CsvImportType,
  importHistoryListResponseSchema,
} from "./contracts";

function withQuery(
  path: string,
  values: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return path + (params.size ? "?" + params : "");
}

export async function previewCsvImport(
  agencyId: number,
  clientId: number,
  workspaceId: number,
  type: CsvImportType,
  file: File,
) {
  const body = new FormData();
  body.set("type", type);
  body.set("file", file);
  const result = await apiRequest<unknown>(
    csvImportPaths.preview(agencyId, clientId, workspaceId),
    { method: "POST", body },
  );
  return csvImportResponseSchema.parse(result).data;
}

export async function getCsvImport(
  agencyId: number,
  clientId: number,
  workspaceId: number,
  csvImportId: number,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(
    csvImportPaths.detail(agencyId, clientId, workspaceId, csvImportId),
    { signal },
  );
  return csvImportResponseSchema.parse(result).data;
}

export async function confirmCsvImport(
  agencyId: number,
  clientId: number,
  workspaceId: number,
  csvImportId: number,
  payload: ConfirmCsvImportPayload,
) {
  const result = await apiRequest<unknown>(
    csvImportPaths.confirm(agencyId, clientId, workspaceId, csvImportId),
    { method: "POST", body: payload },
  );
  return csvImportResponseSchema.parse(result).data;
}

export async function retryCsvImport(
  agencyId: number,
  clientId: number,
  workspaceId: number,
  csvImportId: number,
) {
  const result = await apiRequest<unknown>(
    csvImportPaths.retry(agencyId, clientId, workspaceId, csvImportId),
    { method: "POST" },
  );
  return csvImportResponseSchema.parse(result).data;
}

export type ImportHistoryFilters = {
  workspace_id?: number;
  type?: CsvImportType;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
};

export async function listImportHistory(
  filters: ImportHistoryFilters,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(
    withQuery(importHistoryPaths.collection, filters),
    { signal },
  );
  return importHistoryListResponseSchema.parse(result);
}
