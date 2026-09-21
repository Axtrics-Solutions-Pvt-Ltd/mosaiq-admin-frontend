import { apiRequest } from "@/lib/api/client";
import { dashboardPaths } from "@/lib/api/paths";

import { dashboardSummaryResponseSchema } from "./contracts";

export async function getDashboardSummary(signal?: AbortSignal) {
  const result = await apiRequest<unknown>(dashboardPaths.summary, {
    signal,
  });
  return dashboardSummaryResponseSchema.parse(result).data;
}
