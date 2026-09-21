import { apiRequest } from "@/lib/api/client";
import { userPaths } from "@/lib/api/paths";

import {
  type AgencyUser,
  agencyUserListResponseSchema,
  agencyUserResponseSchema,
  type UpdateAgencyUserPayload,
} from "./contracts";

export type AgencyUserFilters = {
  search?: string;
  status?: "invited" | "active" | "inactive";
  role?: AgencyUser["role_code"];
  page?: number;
  per_page?: number;
};

export async function listAgencyUsers(
  agencyId: number,
  filters: AgencyUserFilters,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const result = await apiRequest<unknown>(
    `${userPaths.collection(agencyId)}${params.size ? `?${params}` : ""}`,
    { signal },
  );
  return agencyUserListResponseSchema.parse(result);
}

export async function getAgencyUser(
  agencyId: number,
  userId: number,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(userPaths.detail(agencyId, userId), {
    signal,
  });
  return agencyUserResponseSchema.parse(result).data;
}

export async function updateAgencyUser(
  agencyId: number,
  userId: number,
  payload: UpdateAgencyUserPayload,
) {
  const result = await apiRequest<unknown>(userPaths.detail(agencyId, userId), {
    method: "PUT",
    body: payload,
  });
  return agencyUserResponseSchema.parse(result).data;
}
