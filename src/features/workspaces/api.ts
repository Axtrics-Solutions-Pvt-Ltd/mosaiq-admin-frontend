import { apiRequest } from "@/lib/api/client";
import { clientPaths, workspacePaths } from "@/lib/api/paths";

import {
  clientListSchema,
  clientResponseSchema,
  workspaceListSchema,
  type WorkspaceProfile,
  workspaceResponseSchema,
} from "./contracts";

function withQuery(
  path: string,
  values: Record<string, string | number | readonly number[] | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      for (const entry of value) params.append(`${key}[]`, String(entry));
    } else {
      params.set(key, String(value));
    }
  }
  return path + (params.size ? "?" + params : "");
}
export type ClientListFilters = {
  search?: string;
  status?: "active" | "inactive";
  page?: number;
  per_page?: number;
};
export async function listClients(
  agencyId: number,
  filters: ClientListFilters,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(
    withQuery(workspacePaths.clients(agencyId), filters),
    { signal },
  );
  return clientListSchema.parse(result);
}
export async function listAllClients(
  filters: ClientListFilters & { agency_id?: number },
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(
    withQuery(clientPaths.allCollection, filters),
    { signal },
  );
  return clientListSchema.parse(result);
}
export async function getClient(
  agencyId: number,
  clientId: number,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(
    workspacePaths.client(agencyId, clientId),
    { signal },
  );
  return clientResponseSchema.parse(result).data;
}
export type WorkspaceListFilters = {
  search?: string;
  status?: "active" | "inactive";
  page?: number;
  per_page?: number;
  email?: string;
  role_code?: string;
  ids?: readonly number[];
};
export async function listWorkspaces(
  agencyId: number,
  clientId: number,
  filters: WorkspaceListFilters,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(
    withQuery(workspacePaths.collection(agencyId, clientId), filters),
    { signal },
  );
  return workspaceListSchema.parse(result);
}
export async function listAllWorkspaces(
  filters: WorkspaceListFilters,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(
    withQuery(workspacePaths.allCollection, filters),
    { signal },
  );
  return workspaceListSchema.parse(result);
}
export async function listAgencyWorkspaces(
  agencyId: number,
  filters: WorkspaceListFilters,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(
    withQuery(workspacePaths.agencyCollection(agencyId), filters),
    { signal },
  );
  return workspaceListSchema.parse(result);
}
export async function getWorkspace(
  agencyId: number,
  clientId: number,
  workspaceId: number,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(
    workspacePaths.detail(agencyId, clientId, workspaceId),
    { signal },
  );
  return workspaceResponseSchema.parse(result).data;
}
export async function createWorkspace(
  agencyId: number,
  clientId: number,
  payload: WorkspaceProfile,
) {
  const result = await apiRequest<unknown>(
    workspacePaths.collection(agencyId, clientId),
    { method: "POST", body: payload },
  );
  return workspaceResponseSchema.parse(result).data;
}
export async function updateWorkspace(
  agencyId: number,
  clientId: number,
  workspaceId: number,
  payload: WorkspaceProfile,
) {
  const result = await apiRequest<unknown>(
    workspacePaths.detail(agencyId, clientId, workspaceId),
    { method: "PUT", body: payload },
  );
  return workspaceResponseSchema.parse(result).data;
}
