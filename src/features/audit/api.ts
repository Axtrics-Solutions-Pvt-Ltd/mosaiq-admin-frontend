import { apiRequest } from "@/lib/api/client";
import { auditPaths } from "@/lib/api/paths";

import { type AuditCategory, auditLogListSchema } from "./contracts";

export type AuditLogFilters = {
  agency_id?: number;
  workspace_id?: number;
  category?: AuditCategory;
  result?: "success" | "failure";
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
};

export async function listAuditLogs(
  filters: AuditLogFilters,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const result = await apiRequest<unknown>(
    `${auditPaths.collection}${params.size ? `?${params}` : ""}`,
    { signal },
  );
  return auditLogListSchema.parse(result);
}
