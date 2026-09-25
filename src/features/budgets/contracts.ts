import { z } from "zod";

// Monthly budgets per channel workspace (API Step 6). Reports use them for
// budget pacing, so every report of the client agrees.

const idSchema = z.number().int().positive();
export const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

const budgetSchema = z.object({
  id: idSchema,
  client_id: idSchema,
  workspace_id: idSchema,
  // The first day of the month, `YYYY-MM-DD`.
  month: z.string(),
  amount: z.number(),
  updated_by: z.object({ id: idSchema, name: z.string() }).nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export const budgetListSchema = z.object({ data: z.array(budgetSchema) });

export const budgetUpdateRequestSchema = z.strictObject({
  items: z
    .array(
      z.strictObject({
        workspace_id: idSchema,
        month: z.string().regex(monthPattern),
        // Null removes the month's budget.
        amount: z.number().nonnegative().max(999_999_999_999.99).nullable(),
      }),
    )
    .min(1)
    .max(500),
});

export type Budget = z.infer<typeof budgetSchema>;
export type BudgetUpdateRequest = z.infer<typeof budgetUpdateRequestSchema>;
export type BudgetChange = BudgetUpdateRequest["items"][number];
