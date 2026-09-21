import { apiRequest } from "@/lib/api/client";
import { invitationPaths } from "@/lib/api/paths";

import type { InvitePayload } from "./contracts";

export async function createInvitation(
  agencyId: number,
  payload: InvitePayload,
) {
  await apiRequest<unknown>(invitationPaths.collection(agencyId), {
    method: "POST",
    body: payload,
  });
}

export async function revokeInvitation(agencyId: number, invitationId: number) {
  await apiRequest<unknown>(invitationPaths.detail(agencyId, invitationId), {
    method: "DELETE",
  });
}
