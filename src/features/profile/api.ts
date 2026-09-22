import { apiRequest } from "@/lib/api/client";
import { authPaths } from "@/lib/api/paths";

import type { ChangePasswordPayload } from "./contracts";

export { updateAgencyUser } from "@/features/users/api";

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<void> {
  await apiRequest<void>(authPaths.changePassword, {
    method: "POST",
    body: payload,
  });
}
