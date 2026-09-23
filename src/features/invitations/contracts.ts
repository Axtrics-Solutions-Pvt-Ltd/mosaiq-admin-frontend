import { z } from "zod";

export const invitationRoles = [
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
    client_id: z.number().int().positive().optional(),
    workspace_ids: z.array(z.number().int().positive()),
  })
  .superRefine((value, context) => {
    if (value.role_code === "CLIENT_USER" && !value.client_id) {
      context.addIssue({
        code: "custom",
        path: ["client_id"],
        message: "Choose a client for this user.",
      });
    }
    if (value.role_code === "CLIENT_USER" && !value.workspace_ids.length) {
      context.addIssue({
        code: "custom",
        path: ["workspace_ids"],
        message: "Choose at least one workspace for this client.",
      });
    }
    if (value.role_code !== "CLIENT_USER" && value.client_id !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["client_id"],
        message: "A client can only be assigned to a Client User.",
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

export const invitationSchema = z.object({
  id: z.number().int().positive(),
  email: z.email(),
  agency_id: z.number().int().positive(),
  client_id: z.number().int().positive().nullable(),
  role_code: z.enum(invitationRoles),
  workspace_id: z.number().int().positive().nullable(),
  workspace_name: z.string().nullable(),
  expires_at: z.string().min(1),
  accepted_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
  // Backend does not yet return this field. Once the reject endpoint records
  // a timestamp, this becomes required — see InvitationDirectory handoff note.
  rejected_at: z.string().nullable().optional(),
  // Backend may eventually compute this directly; when present it wins over
  // client-side derivation from the timestamp fields above.
  status: z.enum(invitationStatuses).optional(),
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

export type InvitePayload = z.infer<typeof inviteSchema>;
export type Invitation = z.infer<typeof invitationSchema>;

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
  role_code: z.enum(invitationRoles),
  expires_at: z.string().min(1),
  requires_existing_login: z.boolean(),
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
