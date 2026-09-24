import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { authKeys } from "@/features/auth/queries";
import { workspaceKeys } from "@/features/workspaces/queries";

import {
  acceptInvitation,
  acceptMyInvitation,
  createInvitation,
  inspectInvitation,
  listInvitations,
  listMyInvitations,
  rejectInvitation,
  rejectMyInvitation,
  resendInvitation,
  revokeInvitation,
} from "./api";
import type {
  Invitation,
  InvitationStatusFilter,
  InvitePayload,
} from "./contracts";

export const invitationKeys = {
  all: ["invitations"] as const,
  lists: () => ["invitations", "list"] as const,
  list: (
    agencyId: number,
    page: number,
    status: InvitationStatusFilter,
    workspaceId: number | undefined,
  ) => ["invitations", "list", agencyId, status, page, workspaceId] as const,
  inspect: (token: string) => ["invitations", "inspect", token] as const,
  mine: () => ["invitations", "mine"] as const,
};

type InvitationListData = Awaited<ReturnType<typeof listInvitations>>;

// Accepting adds a workspace to the user's membership (or creates it), so the
// current user and every workspace-scoped query must be refetched.
function refreshAccessAfterAccept(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: authKeys.me() }),
    queryClient.invalidateQueries({ queryKey: workspaceKeys.all }),
    queryClient.invalidateQueries({ queryKey: invitationKeys.mine() }),
  ]);
}

export function useInvitations(
  agencyId: number,
  page: number,
  status: InvitationStatusFilter,
  workspaceId?: number,
) {
  return useQuery({
    queryKey: invitationKeys.list(agencyId, page, status, workspaceId),
    queryFn: ({ signal }) =>
      listInvitations(agencyId, page, status, workspaceId, signal),
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInvitation,
    retry: false,
    onSuccess: () => refreshAccessAfterAccept(queryClient),
  });
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

export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      agencyId,
      invitationId,
    }: {
      agencyId: number;
      invitationId: number;
    }) => resendInvitation(agencyId, invitationId),
    retry: false,
    // Resend reuses the same row (new token and expiry), so replace it in
    // place rather than reloading every list page.
    onSuccess: (resent: Invitation) =>
      queryClient.setQueriesData<InvitationListData>(
        { queryKey: invitationKeys.lists() },
        (current) =>
          current && {
            ...current,
            data: current.data.map((invitation) =>
              invitation.id === resent.id ? resent : invitation,
            ),
          },
      ),
  });
}

export function useMyInvitations({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: invitationKeys.mine(),
    queryFn: ({ signal }) => listMyInvitations(signal),
    enabled,
    retry: false,
  });
}

export function useAcceptMyInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptMyInvitation,
    retry: false,
    onSuccess: () => refreshAccessAfterAccept(queryClient),
    // A 404 means the invite is no longer pending; refresh so it disappears.
    onError: () =>
      queryClient.invalidateQueries({ queryKey: invitationKeys.mine() }),
  });
}

export function useRejectMyInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectMyInvitation,
    retry: false,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: invitationKeys.mine() }),
  });
}
