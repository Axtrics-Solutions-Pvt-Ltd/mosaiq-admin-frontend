import { z } from "zod";

const countSchema = z.number().int().nonnegative();

const platformSummarySchema = z.object({
  scope: z.literal("platform"),
  agency_id: z.null(),
  client_id: z.null(),
  agencies: countSchema,
  clients: countSchema,
  workspaces: countSchema,
  reports: countSchema,
  active_links: countSchema,
  users: countSchema,
});

const agencySummarySchema = z.object({
  scope: z.literal("agency"),
  agency_id: z.number().int().positive(),
  client_id: z.null(),
  agencies: z.literal(1),
  clients: countSchema,
  workspaces: countSchema,
  reports: countSchema,
  active_links: countSchema,
  users: countSchema,
});

const clientSummarySchema = z.object({
  scope: z.literal("client"),
  agency_id: z.number().int().positive(),
  client_id: z.number().int().positive().nullable(),
  agencies: countSchema,
  clients: countSchema,
  workspaces: countSchema,
  reports: countSchema,
  active_links: countSchema,
  users: z.null(),
});

const assignedSummarySchema = z.object({
  scope: z.literal("assigned"),
  agency_id: z.number().int().positive(),
  client_id: z.number().int().positive().nullable(),
  agencies: countSchema,
  clients: countSchema,
  workspaces: countSchema,
  reports: countSchema,
  active_links: countSchema,
  users: z.null(),
});

export const dashboardSummaryResponseSchema = z.object({
  data: z.discriminatedUnion("scope", [
    platformSummarySchema,
    agencySummarySchema,
    clientSummarySchema,
    assignedSummarySchema,
  ]),
});

export type DashboardSummary = z.infer<
  typeof dashboardSummaryResponseSchema
>["data"];
