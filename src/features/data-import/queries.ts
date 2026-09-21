import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  confirmCsvImport,
  getCsvImport,
  type ImportHistoryFilters,
  listImportHistory,
  previewCsvImport,
  retryCsvImport,
} from "./api";
import type { ConfirmCsvImportPayload, CsvImportType } from "./contracts";

const valid = (id: number) => Number.isSafeInteger(id) && id > 0;

export const dataImportKeys = {
  all: ["csv-imports"] as const,
  detail: (
    agencyId: number,
    clientId: number,
    workspaceId: number,
    csvImportId: number,
  ) =>
    [
      "csv-imports",
      "detail",
      agencyId,
      clientId,
      workspaceId,
      csvImportId,
    ] as const,
  history: (filters: ImportHistoryFilters) =>
    ["import-history", filters] as const,
};

export function useCsvImport(
  agencyId: number,
  clientId: number,
  workspaceId: number,
  csvImportId: number | undefined,
) {
  return useQuery({
    queryKey: dataImportKeys.detail(
      agencyId,
      clientId,
      workspaceId,
      csvImportId ?? 0,
    ),
    queryFn: ({ signal }) =>
      getCsvImport(agencyId, clientId, workspaceId, csvImportId as number, signal),
    enabled:
      valid(agencyId) && valid(clientId) && valid(workspaceId) && Boolean(csvImportId),
    refetchInterval: (query) =>
      query.state.data?.status === "processing" ? 2000 : false,
  });
}

export function usePreviewCsvImport() {
  return useMutation({
    mutationFn: ({
      agencyId,
      clientId,
      workspaceId,
      type,
      file,
    }: {
      agencyId: number;
      clientId: number;
      workspaceId: number;
      type: CsvImportType;
      file: File;
    }) => previewCsvImport(agencyId, clientId, workspaceId, type, file),
    retry: false,
  });
}

export function useConfirmCsvImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      agencyId,
      clientId,
      workspaceId,
      csvImportId,
      payload,
    }: {
      agencyId: number;
      clientId: number;
      workspaceId: number;
      csvImportId: number;
      payload: ConfirmCsvImportPayload;
    }) => confirmCsvImport(agencyId, clientId, workspaceId, csvImportId, payload),
    retry: false,
    onSuccess: (record, variables) => {
      queryClient.setQueryData(
        dataImportKeys.detail(
          variables.agencyId,
          variables.clientId,
          variables.workspaceId,
          variables.csvImportId,
        ),
        record,
      );
      queryClient.invalidateQueries({ queryKey: ["import-history"] });
    },
  });
}

export function useRetryCsvImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      agencyId,
      clientId,
      workspaceId,
      csvImportId,
    }: {
      agencyId: number;
      clientId: number;
      workspaceId: number;
      csvImportId: number;
    }) => retryCsvImport(agencyId, clientId, workspaceId, csvImportId),
    retry: false,
    onSuccess: (record, variables) => {
      queryClient.setQueryData(
        dataImportKeys.detail(
          variables.agencyId,
          variables.clientId,
          variables.workspaceId,
          variables.csvImportId,
        ),
        record,
      );
      queryClient.invalidateQueries({ queryKey: ["import-history"] });
    },
  });
}

export function useImportHistory(
  filters: ImportHistoryFilters,
  enabled: boolean,
) {
  return useQuery({
    queryKey: dataImportKeys.history(filters),
    queryFn: ({ signal }) => listImportHistory(filters, signal),
    enabled,
  });
}
