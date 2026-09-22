import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type AgencyUserFilters,
  getAgencyUser,
  listAgencyUsers,
  listAllAgencyUsers,
  updateAgencyUser,
} from "./api";
import type { UpdateAgencyUserPayload } from "./contracts";

export const userKeys = {
  all: ["agency-users"] as const,
  list: (agencyId: number, filters: AgencyUserFilters) =>
    ["agency-users", "list", agencyId, filters] as const,
  listAll: (filters: AgencyUserFilters) =>
    ["agency-users", "list-all", filters] as const,
  detail: (agencyId: number, userId: number) =>
    ["agency-users", "detail", agencyId, userId] as const,
};

export function useAgencyUsers(
  agencyId: number | undefined,
  filters: AgencyUserFilters,
) {
  return useQuery({
    queryKey: agencyId
      ? userKeys.list(agencyId, filters)
      : userKeys.listAll(filters),
    queryFn: ({ signal }) =>
      agencyId
        ? listAgencyUsers(agencyId, filters, signal)
        : listAllAgencyUsers(filters, signal),
  });
}

export function useAgencyUser(agencyId: number, userId: number) {
  return useQuery({
    queryKey: userKeys.detail(agencyId, userId),
    queryFn: ({ signal }) => getAgencyUser(agencyId, userId, signal),
    enabled:
      Number.isSafeInteger(agencyId) &&
      agencyId > 0 &&
      Number.isSafeInteger(userId) &&
      userId > 0,
  });
}

export function useUpdateAgencyUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      agencyId,
      userId,
      payload,
    }: {
      agencyId: number;
      userId: number;
      payload: UpdateAgencyUserPayload;
    }) => updateAgencyUser(agencyId, userId, payload),
    retry: false,
    onSuccess: (record, { agencyId }) => {
      queryClient.setQueryData(userKeys.detail(agencyId, record.id), record);
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
