import { z } from "zod";

import { apiRequest } from "@/lib/api/client";
import { agencyPaths } from "@/lib/api/paths";

import {
  type AgencyCreatePayload,
  agencyListResponseSchema,
  type AgencyProfile,
  agencyResponseSchema,
} from "./contracts";

export type AgencyListFilters = {
  search?: string;
  status?: "active" | "inactive";
  currency?: string;
  workspace_count?: "none" | "one-to-five" | "six-plus";
  activity?: "recent" | "stale";
  page?: number;
  per_page?: number;
};

export async function listAgencies(
  filters: AgencyListFilters,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const result = await apiRequest<unknown>(
    `${agencyPaths.collection}${params.size ? `?${params}` : ""}`,
    { signal },
  );
  return agencyListResponseSchema.parse(result);
}

export async function getAgencyRecord(agencyId: number, signal?: AbortSignal) {
  const result = await apiRequest<unknown>(agencyPaths.detail(agencyId), {
    signal,
  });
  return agencyResponseSchema.parse(result).data;
}

export async function createAgency(payload: AgencyCreatePayload) {
  const result = await apiRequest<unknown>(agencyPaths.collection, {
    method: "POST",
    body: payload,
  });
  return agencyResponseSchema.parse(result).data;
}

export async function updateAgency(agencyId: number, payload: AgencyProfile) {
  const result = await apiRequest<unknown>(agencyPaths.detail(agencyId), {
    method: "PUT",
    body: payload,
  });
  return agencyResponseSchema.parse(result).data;
}

const agencyLogoResponseSchema = z.object({
  data: z.object({ logo_url: z.string() }),
});

/** Uploads the agency logo and returns its public URL. */
export async function uploadAgencyLogo(agencyId: number, file: File) {
  const body = new FormData();
  body.append("logo", file, file.name);
  const result = await apiRequest<unknown>(agencyPaths.logo(agencyId), {
    method: "POST",
    body,
  });
  return agencyLogoResponseSchema.parse(result).data.logo_url;
}

export async function removeAgencyLogo(agencyId: number) {
  await apiRequest<unknown>(agencyPaths.logo(agencyId), { method: "DELETE" });
}
