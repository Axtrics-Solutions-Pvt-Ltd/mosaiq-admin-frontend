import { z } from "zod";

export const auditCategories = [
  "agency",
  "client",
  "workspace",
  "user",
  "invitation",
  "report",
  "channel",
  "budget",
  "metric",
] as const;
export type AuditCategory = (typeof auditCategories)[number];

const namedEntitySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
});
const auditLogSchema = z.object({
  id: z.number().int().positive(),
  action: z.string(),
  result: z.enum(["success", "failure"]),
  actor: namedEntitySchema.nullable(),
  agency: namedEntitySchema.nullable().optional(),
  workspace: namedEntitySchema
    .extend({ client_id: z.number().int().positive() })
    .nullable()
    .optional(),
  subject_type: z.string(),
  subject_id: z.number().int(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().nullable(),
});
export const auditLogListSchema = z.object({
  data: z.array(auditLogSchema),
  meta: z.object({
    current_page: z.number().int().positive(),
    last_page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});

export type AuditLogEntry = z.infer<typeof auditLogSchema>;
