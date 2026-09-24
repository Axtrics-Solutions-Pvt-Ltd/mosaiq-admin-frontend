import { z } from "zod";

import {
  capabilitiesByAgencyRole,
  type Capability,
  superAdminCapabilities,
} from "@/config/permissions";
import { routes, safeReturnPath } from "@/config/routes";

export const currentUserSchema = z.object({
  data: z.object({
    id: z.number(),
    name: z.string(),
    email: z.email(),
    platform_role_code: z.string().nullable(),
    membership: z
      .object({
        agency_id: z.number(),
        role_code: z.string(),
        client_id: z.number().nullable(),
        workspace_ids: z.array(z.number().nullable()),
      })
      .nullable(),
  }),
});

type CurrentUserDto = z.infer<typeof currentUserSchema>["data"];

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  platformRoleCode: string | null;
  membership: {
    agencyId: number;
    roleCode: string;
    clientId: number | null;
    workspaceIds: (number | null)[];
  } | null;
};

export function normalizeCurrentUser(dto: CurrentUserDto): CurrentUser {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    platformRoleCode: dto.platform_role_code,
    membership: dto.membership
      ? {
          agencyId: dto.membership.agency_id,
          roleCode: dto.membership.role_code,
          clientId: dto.membership.client_id,
          workspaceIds: dto.membership.workspace_ids,
        }
      : null,
  };
}

export function parseCurrentUser(response: unknown): CurrentUser {
  return normalizeCurrentUser(currentUserSchema.parse(response).data);
}

export function canAccessAdmin(user: CurrentUser) {
  return (
    user.platformRoleCode === "SUPER_ADMIN" ||
    user.membership?.roleCode === "AGENCY_ADMIN"
  );
}

export function isClientUser(user: CurrentUser) {
  return user.membership?.roleCode === "CLIENT_USER";
}

export function canSignIntoAdmin(user: CurrentUser) {
  return !isClientUser(user);
}

// Super Admins also have no membership, so a null membership alone does not
// mean the account is waiting on an invitation.
export function needsPendingInvitations(user: CurrentUser) {
  return user.membership === null && user.platformRoleCode !== "SUPER_ADMIN";
}

export function postLoginDestination(user: CurrentUser, next?: string) {
  const returnPath = safeReturnPath(next);
  if (returnPath) return returnPath;
  if (needsPendingInvitations(user)) return routes.pendingInvitations;
  return canSignIntoAdmin(user)
    ? routes.dashboard
    : `${routes.forbidden}?reason=client-portal`;
}

export function userCapabilities(user: CurrentUser): readonly Capability[] {
  if (user.platformRoleCode === "SUPER_ADMIN") return superAdminCapabilities;
  return capabilitiesByAgencyRole[user.membership?.roleCode ?? ""] ?? [];
}

export function hasCapability(user: CurrentUser, capability: Capability) {
  return userCapabilities(user).includes(capability);
}
