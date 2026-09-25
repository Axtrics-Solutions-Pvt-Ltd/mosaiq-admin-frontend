import { z } from "zod";

import { assignableAgencyRoles } from "@/config/permissions";

// New invitations can only grant the assignable roles.
export const invitationRoles = assignableAgencyRoles;

// Invitations sent before the role trim may still carry legacy codes, so
// responses accept every agency role.
const invitationRoleCodes = [
  "AGENCY_ADMIN",
  "MANAGER",
  "ANALYST",
  "VIEWER",
  "CLIENT_USER",
] as const;

export const inviteSchema = z
  .object({
    email: z.email("Enter a valid email address."),
    role_code: z.enum(invitationRoles),
    workspace_ids: z.array(z.number().int().positive()),
  })
  .superRefine((value, context) => {
    // Agency Admins have agency-wide access, so workspace restrictions are
    // optional for them only; Managers must be scoped.
    if (value.role_code !== "AGENCY_ADMIN" && !value.workspace_ids.length) {
      context.addIssue({
        code: "custom",
        path: ["workspace_ids"],
        message: "Choose at least one workspace for this user.",
      });
    }
    if (new Set(value.workspace_ids).size !== value.workspace_ids.length) {
      context.addIssue({
        code: "custom",
        path: ["workspace_ids"],
        message: "Choose each workspace only once.",
      });
    }
  });

export const invitationStatuses = [
  "pending",
  "accepted",
  "rejected",
  "revoked",
  "expired",
] as const;
export type InvitationStatus = (typeof invitationStatuses)[number];

// "open" is the admin list default: invitations still waiting on the invitee,
// including expired ones an admin may want to resend.
export type InvitationStatusFilter = "open" | "all" | InvitationStatus;
const openInvitationStatuses = ["pending", "expired"] as const;

export function parseInvitationStatusFilter(
  value: string | undefined,
): InvitationStatusFilter {
  if (value === "all") return "all";
  return invitationStatuses.find((status) => status === value) ?? "open";
}

export function invitationStatusQuery(filter: InvitationStatusFilter) {
  if (filter === "all") return undefined;
  if (filter === "open") return openInvitationStatuses.join(",");
  return filter;
}

export const invitationSchema = z.object({
  id: z.number().int().positive(),
  email: z.email(),
  agency_id: z.number().int().positive(),
  client_id: z.number().int().positive().nullable(),
  role_code: z.enum(invitationRoleCodes),
  workspace_id: z.number().int().positive().nullable(),
  workspace_name: z.string().nullable(),
  expires_at: z.string().min(1),
  accepted_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
  rejected_at: z.string().nullable().optional(),
  // The backend is adding a computed status; when present it wins over
  // client-side derivation from the timestamp fields above.
  status: z.enum(invitationStatuses).optional(),
  // Laravel decides whether a row can be resent; do not derive it from status.
  can_resend: z.boolean().optional(),
});

export function getInvitationStatus(
  invitation: Pick<
    Invitation,
    "accepted_at" | "revoked_at" | "rejected_at" | "expires_at" | "status"
  >,
): InvitationStatus {
  if (invitation.status) return invitation.status;
  if (invitation.revoked_at) return "revoked";
  if (invitation.rejected_at) return "rejected";
  if (invitation.accepted_at) return "accepted";
  if (new Date(invitation.expires_at).getTime() < Date.now()) return "expired";
  return "pending";
}

export const invitationListResponseSchema = z.object({
  data: z.array(invitationSchema),
  meta: z.object({
    current_page: z.number().int().positive(),
    last_page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});

export const invitationResponseSchema = z.object({ data: invitationSchema });

export type InvitePayload = z.infer<typeof inviteSchema>;
export type Invitation = z.infer<typeof invitationSchema>;

export const myInvitationSchema = z.object({
  id: z.number().int().positive(),
  agency_id: z.number().int().positive(),
  agency_name: z.string(),
  role_code: z.enum(invitationRoleCodes),
  client_id: z.number().int().positive().nullable(),
  client_name: z.string().nullable(),
  workspace_id: z.number().int().positive().nullable(),
  workspace_name: z.string().nullable(),
  expires_at: z.string().min(1),
});
export type MyInvitation = z.infer<typeof myInvitationSchema>;

export const myInvitationListResponseSchema = z.object({
  data: z.array(myInvitationSchema),
});

export const alreadyPendingWorkspaceSchema = z.object({
  workspace_id: z.number().int().positive(),
  workspace_name: z.string(),
  invitation_id: z.number().int().positive(),
  sent_at: z.string(),
  expires_at: z.string(),
});

export const creatableWorkspaceSchema = z.object({
  workspace_id: z.number().int().positive(),
  workspace_name: z.string(),
});

export const invitationConflictSchema = z.object({
  already_pending: z.array(alreadyPendingWorkspaceSchema),
  creatable: z.array(creatableWorkspaceSchema),
});
export type InvitationConflict = z.infer<typeof invitationConflictSchema>;

export class InvitationAlreadyPendingError extends Error {
  constructor(public readonly conflict: InvitationConflict) {
    super("Some workspaces already have a pending invitation.");
    this.name = "InvitationAlreadyPendingError";
  }
}

export const invitationTokenRequestSchema = z.object({
  token: z.string().length(64, "Invalid invitation token."),
});

export const acceptInvitationRequestSchema = z.object({
  token: z.string().length(64, "Invalid invitation token."),
  name: z.string().trim().min(1).max(255).nullable().optional(),
  password: z.string().min(12).nullable().optional(),
  password_confirmation: z.string().min(12).nullable().optional(),
});

export const invitationInspectionSchema = z.object({
  email: z.email(),
  agency_name: z.string(),
  role_code: z.enum(invitationRoleCodes),
  expires_at: z.string().min(1),
  requires_existing_login: z.boolean(),
  // Being added by the backend; optional until every environment returns them.
  workspace_name: z.string().nullable().optional(),
  client_name: z.string().nullable().optional(),
});
export type InvitationInspection = z.infer<typeof invitationInspectionSchema>;

export const acceptInvitationFormSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your full name.").max(255),
    password: z.string().min(12, "Use at least 12 characters."),
    password_confirmation: z.string(),
  })
  .refine((value) => value.password === value.password_confirmation, {
    message: "Passwords must match.",
    path: ["password_confirmation"],
  });
export type AcceptInvitationFormValues = z.infer<
  typeof acceptInvitationFormSchema
>;
