import { apiRequest } from "@/lib/api/client";
import { channelPaths } from "@/lib/api/paths";

import {
  channelListSchema,
  type ChannelRequest,
  channelResponseSchema,
} from "./contracts";

export async function listChannels(signal?: AbortSignal) {
  const result = await apiRequest<unknown>(channelPaths.collection, {
    signal,
  });
  return channelListSchema.parse(result).data;
}

export async function listAdminChannels(signal?: AbortSignal) {
  const result = await apiRequest<unknown>(channelPaths.adminCollection, {
    signal,
  });
  return channelListSchema.parse(result).data;
}

export async function createChannel(payload: ChannelRequest) {
  const result = await apiRequest<unknown>(channelPaths.adminCollection, {
    method: "POST",
    body: payload,
  });
  return channelResponseSchema.parse(result).data;
}

export async function updateChannel(
  channelId: number,
  payload: ChannelRequest,
) {
  const result = await apiRequest<unknown>(
    channelPaths.adminDetail(channelId),
    { method: "PUT", body: payload },
  );
  return channelResponseSchema.parse(result).data;
}
