import { useQuery } from "@tanstack/react-query";

import { listRoles } from "./api";

export const roleKeys = {
  all: ["roles"] as const,
};

export function useRoles(enabled: boolean) {
  return useQuery({
    queryKey: roleKeys.all,
    queryFn: ({ signal }) => listRoles(signal),
    enabled,
  });
}
