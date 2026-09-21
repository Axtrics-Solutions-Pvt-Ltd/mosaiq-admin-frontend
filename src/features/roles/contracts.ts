import { z } from "zod";

export const roleCodes = [
  "SUPER_ADMIN",
  "AGENCY_ADMIN",
  "MANAGER",
  "ANALYST",
  "VIEWER",
  "CLIENT_USER",
] as const;

const roleSchema = z.object({
  code: z.enum(roleCodes),
  name: z.string(),
  assignable: z.boolean(),
  permissions: z.array(z.string()),
});

export const roleListSchema = z.object({ data: z.array(roleSchema) });

export type Role = z.infer<typeof roleSchema>;
