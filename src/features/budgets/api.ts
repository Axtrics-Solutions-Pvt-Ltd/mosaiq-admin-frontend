import { apiRequest } from "@/lib/api/client";
import { budgetPaths } from "@/lib/api/paths";

import { budgetListSchema, type BudgetUpdateRequest } from "./contracts";

export async function listBudgets(
  agencyId: number,
  clientId: number,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(
    budgetPaths.collection(agencyId, clientId),
    { signal },
  );
  return budgetListSchema.parse(result).data;
}

export async function updateBudgets(
  agencyId: number,
  clientId: number,
  payload: BudgetUpdateRequest,
) {
  const result = await apiRequest<unknown>(
    budgetPaths.collection(agencyId, clientId),
    { method: "PUT", body: payload },
  );
  return budgetListSchema.parse(result).data;
}
