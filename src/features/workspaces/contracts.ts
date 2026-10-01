import { z } from "zod";

import { credentialFieldTypes } from "@/features/channels/contracts";

const statusSchema = z.enum(["active", "inactive"]);
export const connectionStatusSchema = z.enum([
  "not_connected",
  "connected",
  "error",
]);
export const workspaceDataSourceSchema = z.enum(["sample", "live"]);
const workspaceChannelSchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
  category: z.string(),
});
const workspaceSchema = z.object({
  id: z.number().int().positive(),
  agency_id: z.number().int().positive(),
  client_id: z.number().int().positive(),
  agency: z
    .object({ id: z.number().int().positive(), display_name: z.string() })
    .nullable()
    .default(null),
  client: z
    .object({ id: z.number().int().positive(), name: z.string() })
    .nullable()
    .default(null),
  // Legacy workspaces created before channels have no connector.
  connector_id: z.number().int().positive().nullable().default(null),
  connector: workspaceChannelSchema.nullable().default(null),
  connection: z
    .object({
      status: connectionStatusSchema,
      last_fetched_at: z.string().nullable(),
    })
    .nullable()
    .default(null),
  name: z.string(),
  timezone: z.string(),
  currency: z.string(),
  status: statusSchema,
  // Null until sample data is generated or live data is fetched.
  data_source: workspaceDataSourceSchema.nullable().default(null),
  data_fetched_at: z.string().nullable().default(null),
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
  // Only when listed with `email` + `role_code`: "added" when that user already
  // holds All workspaces of the client, "invited" when it is pending.
  invite_status: z.enum(["added", "invited"]).nullable().optional(),
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
  connector_id: z
    .number({ error: "Choose a channel." })
    .int()
    .positive("Choose a channel."),
  name: z.string().trim().min(1, "Enter a workspace name.").max(255),
  timezone: z.string().min(1, "Choose a time zone.").max(64),
  currency: z.string().regex(/^[A-Z]{3}$/, "Choose a currency."),
  status: statusSchema,
});

// Stored values are never returned: only whether each field is set and a
// masked hint. Field definitions may also be read from the channel catalogue.
const storedCredentialFieldSchema = z.object({
  key: z.string(),
  label: z.string().optional(),
  type: z.enum(credentialFieldTypes).optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  help: z.string().nullable().optional(),
  is_set: z.boolean(),
  hint: z.string().nullable().optional(),
});
export const workspaceCredentialsResponseSchema = z.object({
  data: z.object({
    workspace_id: z.number().int().positive(),
    connector_id: z.number().int().positive().nullable(),
    status: connectionStatusSchema,
    last_verified_at: z.string().nullable(),
    last_fetched_at: z.string().nullable(),
    last_fetch_status: z.string().nullable(),
    last_fetch_error: z.string().nullable(),
    fields: z.array(storedCredentialFieldSchema),
  }),
});
export const workspaceCredentialsPayloadSchema = z.object({
  values: z.record(z.string(), z.string()),
});
export const workspaceFetchResponseSchema = z.object({
  data: z.object({
    status: z.string(),
    rows_upserted: z.number().int().nonnegative(),
    date_from: z.string(),
    date_to: z.string(),
    is_sample: z.boolean(),
    // Set only by the first live fetch of a workspace holding sample data.
    sample_rows_cleared: z.number().int().nonnegative().default(0),
    corrections_reverted: z.number().int().nonnegative().default(0),
  }),
});

// Everyone who can reach a workspace, plus pending invitations that grant it.
const workspaceUserSchema = z.object({
  user_id: z.number().int().positive().nullable(),
  name: z.string().nullable(),
  email: z.string(),
  role_code: z.string(),
  access: z.enum(["agency", "all_workspaces", "workspace"]),
  status: z.enum(["active", "inactive", "invited"]),
  granted_at: z.string().nullable(),
  invitation_expires_at: z.string().nullable(),
});
export const workspaceUserListSchema = z.object({
  data: z.array(workspaceUserSchema),
});
const workspaceActivitySchema = z.object({
  id: z.number().int().positive(),
  action: z.string(),
  result: z.enum(["success", "failure"]),
  actor: z
    .object({ id: z.number().int().positive(), name: z.string() })
    .nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().nullable(),
});
export const workspaceActivityListSchema = z.object({
  data: z.array(workspaceActivitySchema),
  meta: paginationSchema,
});

export type WorkspaceRecord = z.infer<typeof workspaceSchema>;
export type WorkspaceUser = z.infer<typeof workspaceUserSchema>;
export type WorkspaceActivity = z.infer<typeof workspaceActivitySchema>;
export type ClientRecord = z.infer<typeof clientSchema>;
export type WorkspaceProfile = z.infer<typeof workspaceProfileSchema>;
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;
export type WorkspaceCredentials = z.infer<
  typeof workspaceCredentialsResponseSchema
>["data"];
export type StoredCredentialField = z.infer<typeof storedCredentialFieldSchema>;
export type WorkspaceCredentialsPayload = z.infer<
  typeof workspaceCredentialsPayloadSchema
>;
export type WorkspaceFetchResult = z.infer<
  typeof workspaceFetchResponseSchema
>["data"];
