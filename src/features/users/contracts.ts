import { z } from "zod";

import { assignableAgencyRoles } from "@/config/permissions";

// Existing memberships may still carry legacy codes, so responses accept them.
export const agencyUserRoles = [
  "AGENCY_ADMIN",
  "MANAGER",
  "ANALYST",
  "VIEWER",
  "CLIENT_USER",
] as const;

export const agencyUserStatuses = ["invited", "active", "inactive"] as const;

export const agencyUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  email: z.email(),
  status: z.enum(agencyUserStatuses),
  agency_id: z.number().int().positive(),
  membership_status: z.string(),
  role_code: z.enum(agencyUserRoles),
  client_id: z.number().int().positive().nullable(),
  workspace_ids: z.array(z.number().int().positive()),
  pending_workspace_ids: z.array(z.number().int().positive()).default([]),
  // Clients a Manager holds whole-client access to, and pending whole-client
  // invitations. Older API responses omit them.
  client_ids: z.array(z.number().int().positive()).default([]),
  pending_client_ids: z.array(z.number().int().positive()).default([]),
  invited_at: z.string().nullable(),
  accepted_at: z.string().nullable(),
});

export const agencyUserListResponseSchema = z.object({
  data: z.array(agencyUserSchema),
  meta: z.object({
    current_page: z.number().int().positive(),
    last_page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});

export const agencyUserResponseSchema = z.object({
  data: agencyUserSchema,
});

export const updateAgencyUserSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name.").max(255),
    role_code: z.enum(assignableAgencyRoles),
    client_id: z.null(),
    workspace_ids: z.array(z.number().int().positive()),
    status: z.enum(["active", "inactive"]),
  })
  .partial()
  // A Manager with no workspaces is valid when they hold client-level access,
  // which only the edit form knows; it enforces that rule.
  .superRefine((value, context) => {
    if (
      value.workspace_ids &&
      new Set(value.workspace_ids).size !== value.workspace_ids.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["workspace_ids"],
        message: "Choose each workspace only once.",
      });
    }
  });

export type AgencyUser = z.infer<typeof agencyUserSchema>;
export type AgencyUserListResponse = z.infer<
  typeof agencyUserListResponseSchema
>;
export type UpdateAgencyUserPayload = z.infer<typeof updateAgencyUserSchema>;
