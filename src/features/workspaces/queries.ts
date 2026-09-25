import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createWorkspace,
  deleteWorkspace,
  disconnectWorkspace,
  fetchWorkspaceData,
  getClient,
  getWorkspace,
  getWorkspaceCredentials,
  listAgencyWorkspaces,
  listAllClients,
  listAllWorkspaces,
  listClients,
  listWorkspaces,
  saveWorkspaceCredentials,
  updateWorkspace,
  type WorkspaceListFilters,
} from "./api";
import type {
  WorkspaceCredentialsPayload,
  WorkspaceProfile,
} from "./contracts";

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
  byIds: (agencyId: number, workspaceIds: readonly number[]) =>
    ["workspaces", "by-ids", agencyId, workspaceIds] as const,
  credentials: (agencyId: number, clientId: number, workspaceId: number) =>
    ["workspaces", "credentials", agencyId, clientId, workspaceId] as const,
};
type WorkspaceScope = {
  agencyId: number;
  clientId: number;
  workspaceId: number;
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
    queryKey: ["workspaces", "all", scopedAgencyId ?? "all", filters] as const,
    // The cross-agency endpoint is Super Admin only; scoped roles use the per-agency one.
    queryFn: ({ signal }) =>
      scopedAgencyId
        ? listAgencyWorkspaces(scopedAgencyId, filters, signal)
        : listAllWorkspaces(filters, signal),
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
  workspaceIds: readonly number[],
) {
  const ids = [...workspaceIds].sort((a, b) => a - b);
  const query = useQuery({
    queryKey: workspaceKeys.byIds(agencyId, ids),
    queryFn: ({ signal }) =>
      listAgencyWorkspaces(
        agencyId,
        { ids, per_page: Math.max(ids.length, 1) },
        signal,
      ),
    enabled: valid(agencyId) && ids.length > 0,
    select: (page) => page.data,
  });
  return {
    data: query.data ?? [],
    isPending: ids.length > 0 && query.isPending,
  };
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
export function useDeleteWorkspace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ agencyId, clientId, workspaceId }: WorkspaceScope) =>
      deleteWorkspace(agencyId, clientId, workspaceId),
    onSuccess: (_, { workspaceId }) => {
      // The deleted workspace's own detail and credentials would only 404, and
      // the screen showing them is about to navigate away.
      const isDeletedWorkspace = (key: readonly unknown[]) =>
        (key[1] === "detail" || key[1] === "credentials") &&
        key[4] === workspaceId;
      // Client detail and selectors live under workspace keys; the client
      // directory's workspace counts under its own; reports list their
      // sources and preview their data.
      client.invalidateQueries({
        queryKey: workspaceKeys.all,
        predicate: (query) => !isDeletedWorkspace(query.queryKey),
      });
      client.invalidateQueries({ queryKey: ["clients"] });
      client.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
export function useWorkspaceCredentials(
  { agencyId, clientId, workspaceId }: WorkspaceScope,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: workspaceKeys.credentials(agencyId, clientId, workspaceId),
    queryFn: ({ signal }) =>
      getWorkspaceCredentials(agencyId, clientId, workspaceId, signal),
    enabled:
      (options?.enabled ?? true) &&
      valid(agencyId) &&
      valid(clientId) &&
      valid(workspaceId),
  });
}
// Variables defaults to void so argument-less actions call mutateAsync().
function useConnectionMutation<Variables = void, Result = unknown>(
  mutationFn: (variables: Variables) => Promise<Result>,
  onResult?: (result: Result) => void,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => onResult?.(result),
    // Connection status and last fetch time also show on workspace lists,
    // client cards and detail, and a failed fetch records its error on the
    // credentials, so refresh every workspace query either way.
    onSettled: () => client.invalidateQueries({ queryKey: workspaceKeys.all }),
  });
}
export function useSaveWorkspaceCredentials(scope: WorkspaceScope) {
  const client = useQueryClient();
  return useConnectionMutation(
    (payload: WorkspaceCredentialsPayload) =>
      saveWorkspaceCredentials(
        scope.agencyId,
        scope.clientId,
        scope.workspaceId,
        payload,
      ),
    (credentials) =>
      client.setQueryData(
        workspaceKeys.credentials(
          scope.agencyId,
          scope.clientId,
          scope.workspaceId,
        ),
        credentials,
      ),
  );
}
export function useDisconnectWorkspace(scope: WorkspaceScope) {
  const client = useQueryClient();
  return useConnectionMutation(
    () =>
      disconnectWorkspace(scope.agencyId, scope.clientId, scope.workspaceId),
    (credentials) =>
      client.setQueryData(
        workspaceKeys.credentials(
          scope.agencyId,
          scope.clientId,
          scope.workspaceId,
        ),
        credentials,
      ),
  );
}
export function useFetchWorkspaceData(scope: WorkspaceScope) {
  return useConnectionMutation(() =>
    fetchWorkspaceData(scope.agencyId, scope.clientId, scope.workspaceId),
  );
}
