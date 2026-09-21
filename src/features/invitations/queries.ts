import { useMutation } from "@tanstack/react-query";

import { createInvitation, revokeInvitation } from "./api";
import type { InvitePayload } from "./contracts";

export function useCreateInvitation() {
  return useMutation({
    mutationFn: ({
      agencyId,
      payload,
    }: {
      agencyId: number;
      payload: InvitePayload;
    }) => createInvitation(agencyId, payload),
    retry: false,
  });
}

export function useRevokeInvitation() {
  return useMutation({
    mutationFn: ({
      agencyId,
      invitationId,
    }: {
      agencyId: number;
      invitationId: number;
    }) => revokeInvitation(agencyId, invitationId),
    retry: false,
  });
}
