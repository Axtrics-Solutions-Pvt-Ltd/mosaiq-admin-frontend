import { describe, expect, it } from "vitest";

import {
  budgetCells,
  changedCells,
  invalidCells,
  monthsOfYear,
  parseBudgetAmount,
} from "./budget-grid";

describe("budget grid", () => {
  it("lists the months of a year", () => {
    expect(monthsOfYear(2026)).toHaveLength(12);
    expect(monthsOfYear(2026)[0]).toBe("2026-01");
    expect(monthsOfYear(2026)[11]).toBe("2026-12");
  });

  it("keys saved budgets by workspace and month", () => {
    expect(
      budgetCells([
        {
          id: 1,
          client_id: 4,
          workspace_id: 7,
          month: "2026-09-01",
          amount: 12500,
          updated_by: null,
          created_at: null,
          updated_at: null,
        },
      ]),
    ).toEqual({ "7:2026-09": "12500" });
  });

  it("reads amounts with separators, blanks as none, and rejects the rest", () => {
    expect(parseBudgetAmount("12,500.50")).toBe(12500.5);
    expect(parseBudgetAmount(" ")).toBeNull();
    expect(parseBudgetAmount("-5")).toBeUndefined();
    expect(parseBudgetAmount("1.234")).toBeUndefined();
    expect(parseBudgetAmount("abc")).toBeUndefined();
  });

  it("sends only cells whose amount changed, and null for a cleared one", () => {
    const saved = { "7:2026-09": "12500", "7:2026-10": "9000" };
    const draft = {
      ...saved,
      "7:2026-09": "12,500.00",
      "7:2026-10": "",
      "8:2026-09": "4000",
      "8:2026-11": "",
    };
    expect(changedCells(saved, draft)).toEqual([
      { workspace_id: 7, month: "2026-10", amount: null },
      { workspace_id: 8, month: "2026-09", amount: 4000 },
    ]);
  });

  it("holds invalid cells back from the changes", () => {
    const draft = { "7:2026-09": "12k" };
    expect(changedCells({}, draft)).toEqual([]);
    expect(invalidCells(draft)).toEqual(["7:2026-09"]);
  });
});
