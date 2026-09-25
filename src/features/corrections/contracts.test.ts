import { describe, expect, it } from "vitest";

import { correctionFormSchema, correctionStatus } from "./contracts";

describe("correctionFormSchema", () => {
  it("rejects decimals for integer metrics", () => {
    const result = correctionFormSchema("clicks").safeParse({
      corrected_total: "12.5",
      note: "",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "This metric is a whole number.",
    );
  });

  it("accepts decimals and thousands separators for amounts", () => {
    expect(
      correctionFormSchema("spend").parse({
        corrected_total: "1,250.75",
        note: "  ",
      }),
    ).toEqual({ corrected_total: 1250.75, note: null });
  });
});

describe("correctionStatus", () => {
  const base = {
    id: 1,
    client_id: 4,
    workspace_id: 7,
    campaign_key: null,
    metric_code: "clicks",
    date_from: "2026-09-01",
    date_to: "2026-09-07",
    original_total: 100,
    corrected_total: 120,
    note: null,
    reverted_at: null,
    reverted_by: null,
    created_at: null,
  };

  it("treats a correction that owns no rows as partly replaced", () => {
    expect(correctionStatus({ ...base, is_active: true, rows_owned: 3 })).toBe(
      "active",
    );
    expect(correctionStatus({ ...base, is_active: true, rows_owned: 0 })).toBe(
      "partly_replaced",
    );
    expect(correctionStatus({ ...base, is_active: false, rows_owned: 3 })).toBe(
      "reset",
    );
  });
});
