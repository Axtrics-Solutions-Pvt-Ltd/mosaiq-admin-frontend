import type { Budget, BudgetChange } from "./contracts";

// The budgets card edits a month × workspace grid. Cells are strings while
// being typed and keyed `workspaceId:YYYY-MM`.

export type BudgetCells = Record<string, string>;

export function cellKey(workspaceId: number, month: string) {
  return `${workspaceId}:${month}`;
}

// The twelve `YYYY-MM` months of a calendar year.
export function monthsOfYear(year: number) {
  return Array.from(
    { length: 12 },
    (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`,
  );
}

export function budgetCells(budgets: readonly Budget[]): BudgetCells {
  return Object.fromEntries(
    budgets.map((budget) => [
      cellKey(budget.workspace_id, budget.month.slice(0, 7)),
      String(budget.amount),
    ]),
  );
}

const amountPattern = /^\d+(\.\d{1,2})?$/;

// "12,500.5" → 12500.5; blank is null (no budget); anything else is invalid.
export function parseBudgetAmount(value: string): number | null | undefined {
  const cleaned = value.trim().replace(/,/g, "");
  if (cleaned === "") return null;
  return amountPattern.test(cleaned) ? Number(cleaned) : undefined;
}

export function invalidCells(draft: BudgetCells) {
  return Object.keys(draft).filter(
    (key) => parseBudgetAmount(draft[key] ?? "") === undefined,
  );
}

// Only cells whose amount differs from the saved one are sent. Clearing a
// saved cell sends null, which removes that budget.
export function changedCells(
  saved: BudgetCells,
  draft: BudgetCells,
): BudgetChange[] {
  return Object.entries(draft).flatMap(([key, value]) => {
    const amount = parseBudgetAmount(value);
    const before = parseBudgetAmount(saved[key] ?? "");
    if (amount === undefined || amount === before) return [];
    const [workspaceId, month] = key.split(":");
    return [{ workspace_id: Number(workspaceId), month: month ?? "", amount }];
  });
}
