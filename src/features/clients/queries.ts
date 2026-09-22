import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceKeys } from "@/features/workspaces/queries";

import {
  type ClientListFilters,
  createClient,
  listAllClients,
  listClients,
  updateClient,
} from "./api";
import type { ClientCreatePayload, ClientProfile } from "./contracts";

export const clientKeys = {
  all: ["clients"] as const,
  directory: (agencyId: number | undefined, filters: ClientListFilters) =>
    ["clients", "directory", agencyId ?? "all", filters] as const,
};

const valid = (id: number | undefined) =>
  Number.isSafeInteger(id) && (id ?? 0) > 0;

export function useClientsDirectory(
  agencyId: number | undefined,
  filters: ClientListFilters,
) {
  const scopedAgencyId = valid(agencyId) ? agencyId : undefined;
  return useQuery({
    queryKey: clientKeys.directory(scopedAgencyId, filters),
    queryFn: ({ signal }) =>
      scopedAgencyId
        ? listClients(scopedAgencyId, filters, signal)
        : listAllClients(filters, signal),
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      agencyId,
      payload,
    }: {
      agencyId: number;
      payload: ClientCreatePayload;
    }) => createClient(agencyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      agencyId,
      clientId,
      payload,
    }: {
      agencyId: number;
      clientId: number;
      payload: ClientProfile;
    }) => updateClient(agencyId, clientId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}
