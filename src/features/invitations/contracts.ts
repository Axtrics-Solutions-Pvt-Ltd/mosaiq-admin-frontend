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
  });

export type InvitePayload = z.infer<typeof inviteSchema>;
