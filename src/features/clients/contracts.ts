import { z } from "zod";

export {
  clientListSchema,
  type ClientRecord,
  clientResponseSchema,
} from "@/features/workspaces/contracts";

export const clientProfileSchema = z.object({
  name: z.string().trim().min(1, "Enter a client name.").max(255),
  status: z.enum(["active", "inactive"]),
});
export const clientCreateSchema = clientProfileSchema
  .partial()
  .required({ name: true });

export type ClientProfile = z.infer<typeof clientProfileSchema>;
export type ClientCreatePayload = z.infer<typeof clientCreateSchema>;
