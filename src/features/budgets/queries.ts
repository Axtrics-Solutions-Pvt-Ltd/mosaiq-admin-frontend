import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientReportPreviewKey } from "@/features/corrections/queries";

import { listBudgets, updateBudgets } from "./api";
import type { BudgetUpdateRequest } from "./contracts";

export const budgetKeys = {
  client: (agencyId: number, clientId: number) =>
    ["budgets", agencyId, clientId] as const,
};

const valid = (id: number) => Number.isSafeInteger(id) && id > 0;

// Every month of every workspace; a client has a few dozen rows at most.
export function useBudgets(agencyId: number, clientId: number) {
  return useQuery({
    queryKey: budgetKeys.client(agencyId, clientId),
    queryFn: ({ signal }) => listBudgets(agencyId, clientId, signal),
    enabled: valid(agencyId) && valid(clientId),
  });
}

export function useUpdateBudgets(agencyId: number, clientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BudgetUpdateRequest) =>
      updateBudgets(agencyId, clientId, payload),
    // Budgets change the pacing widget of every report of the client.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: budgetKeys.client(agencyId, clientId),
        }),
        queryClient.invalidateQueries({
          queryKey: clientReportPreviewKey(agencyId, clientId),
        }),
      ]),
  });
}
