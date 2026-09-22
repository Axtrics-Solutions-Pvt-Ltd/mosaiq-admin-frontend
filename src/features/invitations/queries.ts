import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptInvitation,
  createInvitation,
  inspectInvitation,
  listInvitations,
  rejectInvitation,
  revokeInvitation,
} from "./api";
import type { InvitationStatus, InvitePayload } from "./contracts";

export const invitationKeys = {
  all: ["invitations"] as const,
  list: (agencyId: number, page: number, status: InvitationStatus | "all") =>
    ["invitations", "list", agencyId, status, page] as const,
  inspect: (token: string) => ["invitations", "inspect", token] as const,
};

export function useInvitations(
  agencyId: number,
  page: number,
  status: InvitationStatus | "all",
) {
  return useQuery({
    queryKey: invitationKeys.list(agencyId, page, status),
    queryFn: ({ signal }) => listInvitations(agencyId, page, status, signal),
    enabled: Number.isSafeInteger(agencyId) && agencyId > 0,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      agencyId,
      payload,
    }: {
      agencyId: number;
      payload: InvitePayload;
    }) => createInvitation(agencyId, payload),
    retry: false,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
  });
}

export function useInspectInvitation(token: string | null) {
  return useQuery({
    queryKey: invitationKeys.inspect(token ?? ""),
    queryFn: ({ signal }) => inspectInvitation(token as string, signal),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useAcceptInvitation() {
  return useMutation({ mutationFn: acceptInvitation, retry: false });
}

export function useRejectInvitation() {
  return useMutation({ mutationFn: rejectInvitation, retry: false });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      agencyId,
      invitationId,
    }: {
      agencyId: number;
      invitationId: number;
    }) => revokeInvitation(agencyId, invitationId),
    retry: false,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
  });
}
