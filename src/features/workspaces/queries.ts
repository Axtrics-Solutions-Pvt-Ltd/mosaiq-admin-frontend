import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createWorkspace,
  getClient,
  getWorkspace,
  listClients,
  listWorkspaces,
  updateWorkspace,
  type WorkspaceListFilters,
} from "./api";
import type { WorkspaceProfile } from "./contracts";

export const workspaceKeys = {
  all: ["workspaces"] as const,
  clients: (agencyId: number, page: number) =>
    ["workspaces", "clients", agencyId, page] as const,
  client: (agencyId: number, clientId: number) =>
    ["workspaces", "client", agencyId, clientId] as const,
  list: (agencyId: number, clientId: number, filters: WorkspaceListFilters) =>
    ["workspaces", "list", agencyId, clientId, filters] as const,
  detail: (agencyId: number, clientId: number, workspaceId: number) =>
    ["workspaces", "detail", agencyId, clientId, workspaceId] as const,
};
const valid = (id: number) => Number.isSafeInteger(id) && id > 0;
export function useClients(agencyId: number, page = 1) {
  return useQuery({
    queryKey: workspaceKeys.clients(agencyId, page),
    queryFn: ({ signal }) => listClients(agencyId, page, signal),
    enabled: valid(agencyId),
  });
}
export function useClient(agencyId: number, clientId: number) {
  return useQuery({
    queryKey: workspaceKeys.client(agencyId, clientId),
    queryFn: ({ signal }) => getClient(agencyId, clientId, signal),
    enabled: valid(agencyId) && valid(clientId),
  });
}
export function useWorkspaces(
  agencyId: number,
  clientId: number,
  filters: WorkspaceListFilters,
) {
  return useQuery({
    queryKey: workspaceKeys.list(agencyId, clientId, filters),
    queryFn: ({ signal }) =>
      listWorkspaces(agencyId, clientId, filters, signal),
    enabled: valid(agencyId) && valid(clientId),
  });
}
export function useWorkspace(
  agencyId: number,
  clientId: number,
  workspaceId: number,
) {
  return useQuery({
    queryKey: workspaceKeys.detail(agencyId, clientId, workspaceId),
    queryFn: ({ signal }) =>
      getWorkspace(agencyId, clientId, workspaceId, signal),
    enabled: valid(agencyId) && valid(clientId) && valid(workspaceId),
  });
}
export function useCreateWorkspace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      agencyId,
      clientId,
      payload,
    }: {
      agencyId: number;
      clientId: number;
      payload: WorkspaceProfile;
    }) => createWorkspace(agencyId, clientId, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: workspaceKeys.all }),
  });
}
export function useUpdateWorkspace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      agencyId,
      clientId,
      workspaceId,
      payload,
    }: {
      agencyId: number;
      clientId: number;
      workspaceId: number;
      payload: WorkspaceProfile;
    }) => updateWorkspace(agencyId, clientId, workspaceId, payload),
    onSuccess: (record) => {
      client.setQueryData(
        workspaceKeys.detail(record.agency_id, record.client_id, record.id),
        record,
      );
      client.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}
