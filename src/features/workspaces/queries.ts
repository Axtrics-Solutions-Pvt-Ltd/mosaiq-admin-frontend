import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createWorkspace,
  getClient,
  getWorkspace,
  listAgencyWorkspaces,
  listAllClients,
  listAllWorkspaces,
  listClients,
  listWorkspaces,
  updateWorkspace,
  type WorkspaceListFilters,
} from "./api";
import type { WorkspaceProfile, WorkspaceRecord } from "./contracts";

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
  byAgency: (agencyId: number, filters: WorkspaceListFilters) =>
    ["workspaces", "by-agency", agencyId, filters] as const,
};
const valid = (id: number) => Number.isSafeInteger(id) && id > 0;
export function useClients(agencyId: number, page = 1) {
  return useQuery({
    queryKey: workspaceKeys.clients(agencyId, page),
    queryFn: ({ signal }) =>
      listClients(agencyId, { page, per_page: 100 }, signal),
    enabled: valid(agencyId),
  });
}

export function useInfiniteClients(agencyId: number, search: string) {
  const isAllAgencies = !valid(agencyId);
  return useInfiniteQuery({
    queryKey: [
      "workspaces",
      "client-selector",
      isAllAgencies ? "all" : agencyId,
      search,
    ] as const,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      isAllAgencies
        ? listAllClients(
            {
              search: search || undefined,
              status: "active",
              page: pageParam,
              per_page: 40,
            },
            signal,
          )
        : listClients(
            agencyId,
            {
              search: search || undefined,
              status: "active",
              page: pageParam,
              per_page: 40,
            },
            signal,
          ),
    getNextPageParam: (page) =>
      page.meta.current_page < page.meta.last_page
        ? page.meta.current_page + 1
        : undefined,
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

export function useAgencyWorkspaces(
  agencyId: number,
  filters: WorkspaceListFilters,
) {
  return useQuery({
    queryKey: workspaceKeys.byAgency(agencyId, filters),
    queryFn: ({ signal }) => listAgencyWorkspaces(agencyId, filters, signal),
    enabled: valid(agencyId),
  });
}

export function useAllWorkspaces(
  agencyId: number | undefined,
  filters: WorkspaceListFilters,
) {
  const scopedAgencyId = valid(agencyId ?? 0) ? agencyId : undefined;
  return useQuery({
    queryKey: [
      "workspaces",
      "all",
      scopedAgencyId ?? "all",
      filters,
    ] as const,
    queryFn: ({ signal }) =>
      listAllWorkspaces({ ...filters, agency_id: scopedAgencyId }, signal),
  });
}

export function useInfiniteWorkspaces(
  agencyId: number,
  clientId: number,
  search: string,
  email?: string,
  roleCode?: string,
) {
  // The backend requires email and role_code together; drop email if role_code isn't chosen yet.
  const effectiveEmail = email && roleCode ? email : undefined;
  return useInfiniteQuery({
    queryKey: [
      "workspaces",
      "workspace-selector",
      agencyId,
      clientId,
      search,
      effectiveEmail ?? "",
      effectiveEmail ? (roleCode ?? "") : "",
    ] as const,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      listWorkspaces(
        agencyId,
        clientId,
        {
          search: search || undefined,
          status: "active",
          page: pageParam,
          per_page: 40,
          email: effectiveEmail,
          role_code: effectiveEmail ? roleCode : undefined,
        },
        signal,
      ),
    getNextPageParam: (page) =>
      page.meta.current_page < page.meta.last_page
        ? page.meta.current_page + 1
        : undefined,
    enabled: valid(agencyId) && valid(clientId),
  });
}
export function useWorkspacesByIds(
  agencyId: number,
  clientId: number,
  workspaceIds: readonly number[],
) {
  return useQueries({
    combine: (results) => ({
      data: results
        .map((result) => result.data)
        .filter((record): record is WorkspaceRecord => Boolean(record)),
      isPending: results.some((result) => result.isPending),
    }),
    queries: workspaceIds.map((workspaceId) => ({
      queryKey: workspaceKeys.detail(agencyId, clientId, workspaceId),
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        getWorkspace(agencyId, clientId, workspaceId, signal),
      enabled: valid(agencyId) && valid(clientId) && valid(workspaceId),
    })),
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
