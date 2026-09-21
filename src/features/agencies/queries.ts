import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type AgencyListFilters,
  createAgency,
  getAgencyRecord,
  listAgencies,
  updateAgency,
} from "./api";
import type { AgencyProfile } from "./contracts";

export const agencyKeys = {
  all: ["agencies"] as const,
  list: (filters: AgencyListFilters) => ["agencies", "list", filters] as const,
  detail: (agencyId: number) => ["agencies", "detail", agencyId] as const,
};

export function useAgencies(filters: AgencyListFilters) {
  return useQuery({
    queryKey: agencyKeys.list(filters),
    queryFn: ({ signal }) => listAgencies(filters, signal),
  });
}

export function useAgency(agencyId: number) {
  return useQuery({
    queryKey: agencyKeys.detail(agencyId),
    queryFn: ({ signal }) => getAgencyRecord(agencyId, signal),
    enabled: Number.isSafeInteger(agencyId) && agencyId > 0,
  });
}

export function useCreateAgency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AgencyProfile) => createAgency(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: agencyKeys.all }),
  });
}

export function useUpdateAgency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      agencyId,
      payload,
    }: {
      agencyId: number;
      payload: AgencyProfile;
    }) => updateAgency(agencyId, payload),
    onSuccess: (record) => {
      queryClient.setQueryData(agencyKeys.detail(record.id), record);
      queryClient.invalidateQueries({ queryKey: agencyKeys.all });
    },
  });
}
