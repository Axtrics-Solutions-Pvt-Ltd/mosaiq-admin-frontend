import { apiRequest } from "@/lib/api/client";
import { reportPaths } from "@/lib/api/paths";

import {
  type LayoutItemPatch,
  layoutItemResponseSchema,
  layoutResponseSchema,
  previewMetaSchema,
  previewTabSchema,
  type ReorderItem,
  type ReportCreateRequest,
  reportListSchema,
  reportResponseSchema,
  type ReportStatus,
  type ReportUpdateRequest,
} from "./contracts";

export type ReportScope = {
  agencyId: number;
  clientId: number;
  reportId: number;
};

export type ReportListFilters = {
  search?: string;
  status?: ReportStatus;
  page?: number;
  per_page?: number;
};

export type PreviewRange = {
  from?: string;
  to?: string;
  channel?: string;
};

function withQuery(
  path: string,
  values: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== "") params.set(key, String(value));
  return path + (params.size ? "?" + params : "");
}

export async function listReports(
  agencyId: number,
  clientId: number,
  filters: ReportListFilters,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(
    withQuery(reportPaths.collection(agencyId, clientId), filters),
    { signal },
  );
  return reportListSchema.parse(result);
}

export async function getReport(
  { agencyId, clientId, reportId }: ReportScope,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(
    reportPaths.detail(agencyId, clientId, reportId),
    { signal },
  );
  return reportResponseSchema.parse(result).data;
}

export async function createReport(
  agencyId: number,
  clientId: number,
  payload: ReportCreateRequest,
) {
  const result = await apiRequest<unknown>(
    reportPaths.collection(agencyId, clientId),
    { method: "POST", body: payload },
  );
  return reportResponseSchema.parse(result).data;
}

export async function updateReport(
  { agencyId, clientId, reportId }: ReportScope,
  payload: ReportUpdateRequest,
) {
  const result = await apiRequest<unknown>(
    reportPaths.detail(agencyId, clientId, reportId),
    { method: "PUT", body: payload },
  );
  return reportResponseSchema.parse(result).data;
}

export async function updateReportWorkspaces(
  { agencyId, clientId, reportId }: ReportScope,
  workspaceIds: readonly number[],
) {
  const result = await apiRequest<unknown>(
    reportPaths.workspaces(agencyId, clientId, reportId),
    { method: "PUT", body: { workspace_ids: workspaceIds } },
  );
  return reportResponseSchema.parse(result).data;
}

export async function duplicateReport({
  agencyId,
  clientId,
  reportId,
}: ReportScope) {
  const result = await apiRequest<unknown>(
    reportPaths.duplicate(agencyId, clientId, reportId),
    { method: "POST" },
  );
  return reportResponseSchema.parse(result).data;
}

export async function deleteReport({
  agencyId,
  clientId,
  reportId,
}: ReportScope) {
  await apiRequest<unknown>(reportPaths.detail(agencyId, clientId, reportId), {
    method: "DELETE",
  });
}

export async function getReportLayout(
  { agencyId, clientId, reportId }: ReportScope,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(
    reportPaths.layout(agencyId, clientId, reportId),
    { signal },
  );
  return layoutResponseSchema.parse(result).data;
}

export async function reorderReportLayout(
  { agencyId, clientId, reportId }: ReportScope,
  items: readonly ReorderItem[],
) {
  const result = await apiRequest<unknown>(
    reportPaths.layoutOrder(agencyId, clientId, reportId),
    { method: "PUT", body: { items } },
  );
  return layoutResponseSchema.parse(result).data;
}

export async function updateLayoutItem(
  { agencyId, clientId, reportId }: ReportScope,
  itemId: number,
  patch: LayoutItemPatch,
) {
  const result = await apiRequest<unknown>(
    reportPaths.layoutItem(agencyId, clientId, reportId, itemId),
    { method: "PATCH", body: patch },
  );
  return layoutItemResponseSchema.parse(result).data;
}

export async function resetLayoutItem(
  { agencyId, clientId, reportId }: ReportScope,
  itemId: number,
) {
  const result = await apiRequest<unknown>(
    reportPaths.layoutItemReset(agencyId, clientId, reportId, itemId),
    { method: "POST" },
  );
  return layoutItemResponseSchema.parse(result).data;
}

export async function getPreviewMeta(
  { agencyId, clientId, reportId }: ReportScope,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(
    reportPaths.previewMeta(agencyId, clientId, reportId),
    { signal },
  );
  return previewMetaSchema.parse(result).data;
}

export async function getPreviewTab(
  { agencyId, clientId, reportId }: ReportScope,
  tabCode: string,
  range: PreviewRange,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(
    withQuery(reportPaths.previewTab(agencyId, clientId, reportId, tabCode), {
      from: range.from,
      to: range.to,
      channel: range.channel,
    }),
    { signal },
  );
  return previewTabSchema.parse(result).data;
}
