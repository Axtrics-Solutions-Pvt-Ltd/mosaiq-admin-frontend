import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  attachCreativeAssetFile,
  confirmCsvImport,
  getCsvImport,
  type ImportHistoryFilters,
  listAllCreativeAssets,
  listAllCsvTemplates,
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
  templates: ["csv-templates"] as const,
  creativeAssets: (
    agencyId: number,
    clientId: number,
    workspaceId: number,
    csvImportId: number,
  ) =>
    ["creative-assets", agencyId, clientId, workspaceId, csvImportId] as const,
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
      getCsvImport(
        agencyId,
        clientId,
        workspaceId,
        csvImportId as number,
        signal,
      ),
    enabled:
      valid(agencyId) &&
      valid(clientId) &&
      valid(workspaceId) &&
      Boolean(csvImportId),
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
    }) =>
      confirmCsvImport(agencyId, clientId, workspaceId, csvImportId, payload),
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

export function useCsvTemplates() {
  return useQuery({
    queryKey: dataImportKeys.templates,
    queryFn: ({ signal }) => listAllCsvTemplates(signal),
  });
}

export function useCreativeAssets(
  agencyId: number,
  clientId: number,
  workspaceId: number,
  csvImportId: number | undefined,
) {
  return useQuery({
    queryKey: dataImportKeys.creativeAssets(
      agencyId,
      clientId,
      workspaceId,
      csvImportId ?? 0,
    ),
    queryFn: ({ signal }) =>
      listAllCreativeAssets(
        {
          agency_id: valid(agencyId) ? agencyId : undefined,
          client_id: valid(clientId) ? clientId : undefined,
          workspace_id: valid(workspaceId) ? workspaceId : undefined,
          csv_import_id: csvImportId,
        },
        signal,
      ),
    enabled: Boolean(csvImportId),
  });
}

export function useAttachCreativeAssetFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      agencyId,
      clientId,
      workspaceId,
      creativeAssetId,
      file,
    }: {
      agencyId: number;
      clientId: number;
      workspaceId: number;
      creativeAssetId: number;
      csvImportId: number;
      file: File;
    }) =>
      attachCreativeAssetFile(
        agencyId,
        clientId,
        workspaceId,
        creativeAssetId,
        file,
      ),
    onSuccess: (record, variables) => {
      queryClient.setQueryData(
        dataImportKeys.creativeAssets(
          variables.agencyId,
          variables.clientId,
          variables.workspaceId,
          variables.csvImportId,
        ),
        (rows: (typeof record)[] | undefined) =>
          rows?.map((row) => (row.id === record.id ? record : row)),
      );
    },
  });
}
