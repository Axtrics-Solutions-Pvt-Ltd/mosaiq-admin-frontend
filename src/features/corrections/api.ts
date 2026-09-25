import type { MetricCode } from "@/features/channels/contracts";
import { apiRequest } from "@/lib/api/client";
import { correctionPaths } from "@/lib/api/paths";

import {
  type Correction,
  correctionListSchema,
  type CorrectionRequest,
  correctionResponseSchema,
} from "./contracts";

export type CorrectionListFilters = {
  workspace_id?: number;
  metric_code?: MetricCode;
  active?: boolean;
  page?: number;
  per_page?: number;
};

export async function listCorrections(
  agencyId: number,
  clientId: number,
  filters: CorrectionListFilters,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue;
    // Laravel's boolean rule accepts 1 and 0 but not "true" and "false".
    params.set(
      key,
      typeof value === "boolean" ? (value ? "1" : "0") : String(value),
    );
  }
  const result = await apiRequest<unknown>(
    correctionPaths.collection(agencyId, clientId) +
      (params.size ? "?" + params : ""),
    { signal },
  );
  return correctionListSchema.parse(result);
}

// The API can't fetch corrections by id, so this pages through the history
// narrowed by workspace and metric until every id turns up. It stops after
// `maxPages` so a very long history can't turn into dozens of requests.
export async function findCorrections(
  agencyId: number,
  clientId: number,
  ids: readonly number[],
  filters: Pick<CorrectionListFilters, "workspace_id" | "metric_code">,
  signal?: AbortSignal,
  maxPages = 5,
) {
  const wanted = new Set(ids);
  const found = new Map<number, Correction>();
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await listCorrections(
      agencyId,
      clientId,
      { ...filters, page, per_page: 100 },
      signal,
    );
    for (const correction of result.data)
      if (wanted.has(correction.id)) found.set(correction.id, correction);
    if (found.size === wanted.size || page >= result.meta.last_page) break;
  }
  return {
    corrections: ids.flatMap((id) => found.get(id) ?? []),
    missing: ids.length - found.size,
  };
}

export async function createCorrection(
  agencyId: number,
  clientId: number,
  payload: CorrectionRequest,
) {
  const result = await apiRequest<unknown>(
    correctionPaths.collection(agencyId, clientId),
    { method: "POST", body: payload },
  );
  return correctionResponseSchema.parse(result).data;
}

export async function resetCorrection(
  agencyId: number,
  clientId: number,
  correctionId: number,
) {
  const result = await apiRequest<unknown>(
    correctionPaths.detail(agencyId, clientId, correctionId),
    { method: "DELETE" },
  );
  return correctionResponseSchema.parse(result).data;
}
