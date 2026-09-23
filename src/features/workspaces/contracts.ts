import { z } from "zod";

const statusSchema = z.enum(["active", "inactive"]);
const workspaceSchema = z.object({
  id: z.number().int().positive(),
  agency_id: z.number().int().positive(),
  client_id: z.number().int().positive(),
  name: z.string(),
  timezone: z.string(),
  currency: z.string(),
  status: statusSchema,
  invite_status: z.enum(["added", "invited"]).nullable(),
  invite_status_reason: z.enum(["expired", "revoked", "rejected"]).nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});
const clientSchema = z.object({
  id: z.number().int().positive(),
  agency_id: z.number().int().positive(),
  name: z.string(),
  status: statusSchema,
  workspace_count: z.number().int().nonnegative().optional(),
  workspaces: z.array(workspaceSchema).optional(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});
const paginationSchema = z.object({
  current_page: z.number().int().positive(),
  last_page: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export const workspaceListSchema = z.object({
  data: z.array(workspaceSchema),
  meta: paginationSchema,
});
export const workspaceResponseSchema = z.object({ data: workspaceSchema });
export const clientListSchema = z.object({
  data: z.array(clientSchema),
  meta: paginationSchema,
});
export const clientResponseSchema = z.object({ data: clientSchema });
export const workspaceProfileSchema = z.object({
  name: z.string().trim().min(1, "Enter a workspace name.").max(255),
  timezone: z.string().min(1, "Choose a time zone.").max(64),
  currency: z.string().regex(/^[A-Z]{3}$/, "Choose a currency."),
  status: statusSchema,
});
export type WorkspaceRecord = z.infer<typeof workspaceSchema>;
export type ClientRecord = z.infer<typeof clientSchema>;
export type WorkspaceProfile = z.infer<typeof workspaceProfileSchema>;
