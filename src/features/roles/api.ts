import { apiRequest } from "@/lib/api/client";
import { rolePaths } from "@/lib/api/paths";

import { roleListSchema } from "./contracts";

export async function listRoles(signal?: AbortSignal) {
  const result = await apiRequest<unknown>(rolePaths.collection, { signal });
  return roleListSchema.parse(result).data;
}
