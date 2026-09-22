import { apiRequest } from "@/lib/api/client";
import { workspacePaths } from "@/lib/api/paths";

export {
  type ClientListFilters,
  getClient,
  listAllClients,
  listClients,
} from "@/features/workspaces/api";

import {
  type ClientCreatePayload,
  type ClientProfile,
  clientResponseSchema,
} from "./contracts";

export async function createClient(
  agencyId: number,
  payload: ClientCreatePayload,
) {
  const result = await apiRequest<unknown>(workspacePaths.clients(agencyId), {
    method: "POST",
    body: payload,
  });
  return clientResponseSchema.parse(result).data;
}

export async function updateClient(
  agencyId: number,
  clientId: number,
  payload: ClientProfile,
) {
  const result = await apiRequest<unknown>(
    workspacePaths.client(agencyId, clientId),
    { method: "PUT", body: payload },
  );
  return clientResponseSchema.parse(result).data;
}
