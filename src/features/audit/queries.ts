import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { type AuditLogFilters, listAuditLogs } from "./api";

export const auditKeys = {
  all: ["audit-logs"] as const,
  list: (filters: AuditLogFilters) => ["audit-logs", "list", filters] as const,
};

export function useAuditLogs(
  filters: AuditLogFilters,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: ({ signal }) => listAuditLogs(filters, signal),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
