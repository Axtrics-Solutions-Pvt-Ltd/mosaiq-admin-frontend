import { useQuery } from "@tanstack/react-query";

import { getDashboardSummary } from "./api";

export const dashboardKeys = {
  summary: ["dashboard", "summary"] as const,
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary,
    queryFn: ({ signal }) => getDashboardSummary(signal),
  });
}
