import { z } from "zod";

const identifierSchema = z.coerce.number().int().positive();
const positionSchema = z.coerce.number();

const curationKpiSchema = z.object({
  id: identifierSchema,
  code: z.string(),
  name: z.string(),
  is_enabled: z.boolean(),
  position: positionSchema,
});

const curationModuleSchema = z.object({
  id: identifierSchema,
  code: z.string(),
  name: z.string(),
  is_enabled: z.boolean(),
  position: positionSchema,
  kpis: z.array(curationKpiSchema),
});

export const workspaceCurationResponseSchema = z.object({
  data: z.object({
    workspace_id: z.number().int().positive(),
    modules: z.array(curationModuleSchema),
  }),
});

export type CurationKpiRecord = z.infer<typeof curationKpiSchema>;
export type CurationModuleRecord = z.infer<typeof curationModuleSchema>;
export type WorkspaceCurationRecord = z.infer<
  typeof workspaceCurationResponseSchema
>["data"];

const updateKpiSchema = z.object({
  id: z.number().int().positive(),
  is_enabled: z.boolean(),
});

const updateModuleSchema = z.object({
  id: z.number().int().positive(),
  is_enabled: z.boolean(),
  kpis: z.array(updateKpiSchema).min(1),
});

export const updateWorkspaceCurationRequestSchema = z.object({
  modules: z.array(updateModuleSchema).min(1),
});

export type UpdateWorkspaceCurationRequest = z.infer<
  typeof updateWorkspaceCurationRequestSchema
>;
