import { apiRequest } from "@/lib/api/client";
import { curationPaths } from "@/lib/api/paths";

import {
  type UpdateWorkspaceCurationRequest,
  updateWorkspaceCurationRequestSchema,
  workspaceCurationResponseSchema,
} from "./contracts";

export async function getWorkspaceCuration(
  workspaceId: number,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(curationPaths.detail(workspaceId), {
    signal,
  });
  return workspaceCurationResponseSchema.parse(result).data;
}

export async function updateWorkspaceCuration(
  workspaceId: number,
  payload: UpdateWorkspaceCurationRequest,
) {
  const result = await apiRequest<unknown>(curationPaths.detail(workspaceId), {
    method: "PUT",
    body: updateWorkspaceCurationRequestSchema.parse(payload),
  });
  return workspaceCurationResponseSchema.parse(result).data;
}
