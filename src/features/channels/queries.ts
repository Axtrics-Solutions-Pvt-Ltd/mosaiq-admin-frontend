import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createChannel,
  listAdminChannels,
  listChannels,
  updateChannel,
} from "./api";
import type { ChannelRequest } from "./contracts";

export const channelKeys = {
  all: ["channels"] as const,
  active: () => ["channels", "active"] as const,
  admin: () => ["channels", "admin"] as const,
};

// Active channels in catalogue order; any admin-panel user can read them.
export function useChannels(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: channelKeys.active(),
    queryFn: ({ signal }) => listChannels(signal),
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminChannels(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: channelKeys.admin(),
    queryFn: ({ signal }) => listAdminChannels(signal),
    enabled: options?.enabled,
  });
}

export function useSaveChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      channelId,
      payload,
    }: {
      channelId?: number;
      payload: ChannelRequest;
    }) =>
      channelId ? updateChannel(channelId, payload) : createChannel(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: channelKeys.all }),
  });
}
