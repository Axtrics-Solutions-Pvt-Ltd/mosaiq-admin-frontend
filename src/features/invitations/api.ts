import { csrfBootstrap } from "@/features/auth/api";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { invitationPaths, myInvitationPaths } from "@/lib/api/paths";

import {
  InvitationAlreadyPendingError,
  invitationConflictSchema,
  invitationInspectionSchema,
  invitationListResponseSchema,
  invitationResponseSchema,
  type InvitationStatusFilter,
  invitationStatusQuery,
  type InvitePayload,
  myInvitationListResponseSchema,
} from "./contracts";

export async function listInvitations(
  agencyId: number,
  page: number,
  status: InvitationStatusFilter,
  workspaceId?: number,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ page: String(page) });
  const statusQuery = invitationStatusQuery(status);
  if (statusQuery) params.set("status", statusQuery);
  if (workspaceId) params.set("workspace_id", String(workspaceId));
  const result = await apiRequest<unknown>(
    `${invitationPaths.collection(agencyId)}?${params}`,
    { signal },
  );
  return invitationListResponseSchema.parse(result);
}

export async function createInvitation(
  agencyId: number,
  payload: InvitePayload,
) {
  try {
    await apiRequest<unknown>(invitationPaths.collection(agencyId), {
      method: "POST",
      body: payload,
    });
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.errorCode === "INVITATION_ALREADY_PENDING"
    ) {
      throw new InvitationAlreadyPendingError(
        invitationConflictSchema.parse(error.details),
      );
    }
    throw error;
  }
}

export async function revokeInvitation(agencyId: number, invitationId: number) {
  await apiRequest<unknown>(invitationPaths.detail(agencyId, invitationId), {
    method: "DELETE",
  });
}

export async function resendInvitation(
  agencyId: number,
  invitationId: number,
) {
  const result = await apiRequest<unknown>(
    invitationPaths.resend(agencyId, invitationId),
    { method: "POST" },
  );
  return invitationResponseSchema.parse(result).data;
}

export async function listMyInvitations(signal?: AbortSignal) {
  const result = await apiRequest<unknown>(myInvitationPaths.collection, {
    signal,
  });
  return myInvitationListResponseSchema.parse(result).data;
}

export async function acceptMyInvitation(invitationId: number) {
  await apiRequest<unknown>(myInvitationPaths.accept(invitationId), {
    method: "POST",
  });
}

export async function rejectMyInvitation(invitationId: number) {
  await apiRequest<unknown>(myInvitationPaths.reject(invitationId), {
    method: "POST",
  });
}

export async function inspectInvitation(token: string, signal?: AbortSignal) {
  await csrfBootstrap();
  const result = await apiRequest<unknown>(invitationPaths.inspect, {
    method: "POST",
    body: { token },
    signal,
  });
  return invitationInspectionSchema.parse((result as { data: unknown }).data);
}

export async function acceptInvitation(payload: {
  token: string;
  name?: string;
  password?: string;
  password_confirmation?: string;
}) {
  await csrfBootstrap();
  await apiRequest<unknown>(invitationPaths.accept, {
    method: "POST",
    body: payload,
  });
}

export async function rejectInvitation(token: string) {
  await csrfBootstrap();
  await apiRequest<unknown>(invitationPaths.reject, {
    method: "POST",
    body: { token },
  });
}
