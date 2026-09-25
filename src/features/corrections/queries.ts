import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { MetricCode } from "@/features/channels/contracts";

import {
  type CorrectionListFilters,
  createCorrection,
  findCorrections,
  listCorrections,
  resetCorrection,
} from "./api";
import type { CorrectionRequest } from "./contracts";

export const correctionKeys = {
  all: ["corrections"] as const,
  client: (agencyId: number, clientId: number) =>
    ["corrections", agencyId, clientId] as const,
  list: (agencyId: number, clientId: number, filters: CorrectionListFilters) =>
    ["corrections", agencyId, clientId, "list", filters] as const,
};

// Corrections change every report of the client. The report builder's preview
// query keys (Step 4) must start with this prefix so they refresh too.
export const clientReportPreviewKey = (agencyId: number, clientId: number) =>
  ["reports", "preview", agencyId, clientId] as const;

type ClientScope = { agencyId: number; clientId: number };
const valid = (id: number) => Number.isSafeInteger(id) && id > 0;

export function useCorrections(
  agencyId: number,
  clientId: number,
  filters: CorrectionListFilters,
) {
  return useQuery({
    queryKey: correctionKeys.list(agencyId, clientId, filters),
    queryFn: ({ signal }) =>
      listCorrections(agencyId, clientId, filters, signal),
    enabled: valid(agencyId) && valid(clientId),
    placeholderData: keepPreviousData,
  });
}

export type CorrectionLookup = {
  ids: readonly number[];
  workspace_id?: number;
  metric_code?: MetricCode;
};

// The corrections behind one report value. It lives under the client key, so
// saving or resetting a correction refreshes it.
export function useCorrectionsById(
  agencyId: number,
  clientId: number,
  lookup: CorrectionLookup | null,
) {
  return useQuery({
    queryKey: [...correctionKeys.client(agencyId, clientId), "ids", lookup],
    queryFn: ({ signal }) =>
      findCorrections(
        agencyId,
        clientId,
        lookup?.ids ?? [],
        {
          workspace_id: lookup?.workspace_id,
          metric_code: lookup?.metric_code,
        },
        signal,
      ),
    enabled: valid(agencyId) && valid(clientId) && Boolean(lookup?.ids.length),
  });
}

function useRefreshClientData() {
  const queryClient = useQueryClient();
  return ({ agencyId, clientId }: ClientScope) =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: correctionKeys.client(agencyId, clientId),
      }),
      queryClient.invalidateQueries({
        queryKey: clientReportPreviewKey(agencyId, clientId),
      }),
    ]);
}

export function useCreateCorrection() {
  const refresh = useRefreshClientData();
  return useMutation({
    mutationFn: ({
      agencyId,
      clientId,
      payload,
    }: ClientScope & { payload: CorrectionRequest }) =>
      createCorrection(agencyId, clientId, payload),
    onSuccess: (_, scope) => refresh(scope),
  });
}

export function useResetCorrection() {
  const refresh = useRefreshClientData();
  return useMutation({
    mutationFn: ({
      agencyId,
      clientId,
      correctionId,
    }: ClientScope & { correctionId: number }) =>
      resetCorrection(agencyId, clientId, correctionId),
    onSuccess: (_, scope) => refresh(scope),
  });
}
