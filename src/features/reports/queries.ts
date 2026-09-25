import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { clientReportPreviewKey } from "@/features/corrections/queries";

import {
  createReport,
  deleteReport,
  duplicateReport,
  getPreviewMeta,
  getPreviewTab,
  getReport,
  getReportLayout,
  listReports,
  type PreviewRange,
  reorderReportLayout,
  type ReportListFilters,
  type ReportScope,
  resetLayoutItem,
  updateLayoutItem,
  updateReport,
  updateReportWorkspaces,
} from "./api";
import type {
  LayoutItemPatch,
  ReorderItem,
  ReportCreateRequest,
  ReportLayout,
  ReportUpdateRequest,
} from "./contracts";
import { applyOrder, replaceLayoutItem, setItemEnabled } from "./layout";

export const reportKeys = {
  all: ["reports"] as const,
  lists: ["reports", "list"] as const,
  list: (agencyId: number, clientId: number, filters: ReportListFilters) =>
    ["reports", "list", agencyId, clientId, filters] as const,
  detail: ({ agencyId, clientId, reportId }: ReportScope) =>
    ["reports", "detail", agencyId, clientId, reportId] as const,
  layout: ({ agencyId, clientId, reportId }: ReportScope) =>
    ["reports", "layout", agencyId, clientId, reportId] as const,
  // Under the client prefix, so a data correction refreshes every preview.
  preview: ({ agencyId, clientId, reportId }: ReportScope) =>
    [...clientReportPreviewKey(agencyId, clientId), reportId] as const,
  previewMeta: (scope: ReportScope) =>
    [...reportKeys.preview(scope), "meta"] as const,
  previewTab: (scope: ReportScope, tabCode: string, range: PreviewRange) =>
    [
      ...reportKeys.preview(scope),
      "tab",
      tabCode,
      range.from ?? "",
      range.to ?? "",
      range.channel ?? "",
    ] as const,
};

const valid = (id: number) => Number.isSafeInteger(id) && id > 0;
const validScope = (scope: ReportScope) =>
  valid(scope.agencyId) && valid(scope.clientId) && valid(scope.reportId);

export function useReports(
  agencyId: number,
  clientId: number,
  filters: ReportListFilters,
) {
  return useQuery({
    queryKey: reportKeys.list(agencyId, clientId, filters),
    queryFn: ({ signal }) => listReports(agencyId, clientId, filters, signal),
    enabled: valid(agencyId) && valid(clientId),
    placeholderData: keepPreviousData,
  });
}

export function useReport(scope: ReportScope) {
  return useQuery({
    queryKey: reportKeys.detail(scope),
    queryFn: ({ signal }) => getReport(scope, signal),
    enabled: validScope(scope),
  });
}

export function useReportLayout(scope: ReportScope) {
  return useQuery({
    queryKey: reportKeys.layout(scope),
    queryFn: ({ signal }) => getReportLayout(scope, signal),
    enabled: validScope(scope),
  });
}

export function usePreviewMeta(scope: ReportScope) {
  return useQuery({
    queryKey: reportKeys.previewMeta(scope),
    queryFn: ({ signal }) => getPreviewMeta(scope, signal),
    enabled: validScope(scope),
  });
}

export function usePreviewTab(
  scope: ReportScope,
  tabCode: string | undefined,
  range: PreviewRange,
) {
  return useQuery({
    queryKey: reportKeys.previewTab(scope, tabCode ?? "", range),
    queryFn: ({ signal }) => getPreviewTab(scope, tabCode ?? "", range, signal),
    enabled: validScope(scope) && Boolean(tabCode),
    // Keep the current widgets on screen while another range loads.
    placeholderData: keepPreviousData,
  });
}

export function useCreateReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      agencyId,
      clientId,
      payload,
    }: {
      agencyId: number;
      clientId: number;
      payload: ReportCreateRequest;
    }) => createReport(agencyId, clientId, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: reportKeys.lists }),
  });
}

// Profile and source changes alter list rows, the header and the preview
// (currency, default range, channels).
function useRefreshReport() {
  const client = useQueryClient();
  return (scope: ReportScope) =>
    Promise.all([
      client.invalidateQueries({ queryKey: reportKeys.lists }),
      client.invalidateQueries({ queryKey: reportKeys.preview(scope) }),
    ]);
}

export function useUpdateReport() {
  const client = useQueryClient();
  const refresh = useRefreshReport();
  return useMutation({
    mutationFn: ({
      scope,
      payload,
    }: {
      scope: ReportScope;
      payload: ReportUpdateRequest;
    }) => updateReport(scope, payload),
    onSuccess: (report, { scope }) => {
      client.setQueryData(reportKeys.detail(scope), report);
      return refresh(scope);
    },
  });
}

export function useUpdateReportWorkspaces() {
  const client = useQueryClient();
  const refresh = useRefreshReport();
  return useMutation({
    mutationFn: ({
      scope,
      workspaceIds,
    }: {
      scope: ReportScope;
      workspaceIds: readonly number[];
    }) => updateReportWorkspaces(scope, workspaceIds),
    onSuccess: (report, { scope }) => {
      client.setQueryData(reportKeys.detail(scope), report);
      return refresh(scope);
    },
  });
}

export function useDuplicateReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: duplicateReport,
    onSuccess: () => client.invalidateQueries({ queryKey: reportKeys.lists }),
  });
}

export function useDeleteReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteReport,
    onSuccess: (_, scope) => {
      client.removeQueries({ queryKey: reportKeys.detail(scope) });
      return client.invalidateQueries({ queryKey: reportKeys.lists });
    },
  });
}

export function useReorderLayout(scope: ReportScope) {
  const client = useQueryClient();
  const key = reportKeys.layout(scope);
  return useMutation({
    mutationFn: (items: readonly ReorderItem[]) =>
      reorderReportLayout(scope, items),
    onMutate: async (items) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<ReportLayout>(key);
      if (previous)
        client.setQueryData<ReportLayout>(key, {
          ...previous,
          sections: applyOrder(previous.sections, items),
        });
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
    },
    onSuccess: (layout) => client.setQueryData(key, layout),
    onSettled: () =>
      client.invalidateQueries({ queryKey: reportKeys.preview(scope) }),
  });
}

export function useUpdateLayoutItem(scope: ReportScope) {
  const client = useQueryClient();
  const key = reportKeys.layout(scope);
  return useMutation({
    mutationFn: ({
      itemId,
      patch,
    }: {
      itemId: number;
      patch: LayoutItemPatch;
    }) => updateLayoutItem(scope, itemId, patch),
    onMutate: async ({ itemId, patch }) => {
      // Only show/hide is applied before the API answers; edited content
      // waits for validation.
      if (patch.is_enabled === undefined) return { previous: undefined };
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<ReportLayout>(key);
      if (previous)
        client.setQueryData<ReportLayout>(key, {
          ...previous,
          sections: setItemEnabled(previous.sections, itemId, patch.is_enabled),
        });
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
    },
    onSuccess: (item) =>
      client.setQueryData<ReportLayout>(key, (layout) =>
        layout
          ? { ...layout, sections: replaceLayoutItem(layout.sections, item) }
          : layout,
      ),
    onSettled: () =>
      client.invalidateQueries({ queryKey: reportKeys.preview(scope) }),
  });
}

export function useResetLayoutItem(scope: ReportScope) {
  const client = useQueryClient();
  const key = reportKeys.layout(scope);
  return useMutation({
    mutationFn: (itemId: number) => resetLayoutItem(scope, itemId),
    onSuccess: (item) =>
      client.setQueryData<ReportLayout>(key, (layout) =>
        layout
          ? { ...layout, sections: replaceLayoutItem(layout.sections, item) }
          : layout,
      ),
    onSettled: () =>
      client.invalidateQueries({ queryKey: reportKeys.preview(scope) }),
  });
}
