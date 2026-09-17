import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCurrentUser, login, logout } from "./api";

export const authKeys = { me: () => ["auth", "me"] as const };
export const meQueryOptions = {
  queryKey: authKeys.me(),
  queryFn: getCurrentUser,
  staleTime: 30_000,
  retry: false,
};

export function useCurrentUser() {
  return useQuery(meQueryOptions);
}
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    retry: false,
    onSuccess: (user) => {
      queryClient.clear();
      queryClient.setQueryData(authKeys.me(), user);
    },
  });
}
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    retry: false,
    onSuccess: () => queryClient.clear(),
  });
}
