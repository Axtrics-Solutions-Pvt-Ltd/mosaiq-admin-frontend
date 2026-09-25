import { describe, expect, it } from "vitest";

import { formatValue } from "./formatters";

describe("formatValue", () => {
  it("shows large amounts in compact notation with the currency symbol", () => {
    expect(formatValue(127900.5, "currency", "USD")).toBe("$127.9K");
    expect(formatValue(127900.5, "currency", "CAD")).toBe("$127.9K");
    expect(formatValue(1_250_000, "currency", "GBP")).toBe("£1.3M");
  });

  it("keeps cents on small amounts", () => {
    expect(formatValue(45.75, "currency", "USD")).toBe("$45.75");
  });

  it("falls back to the code for an unknown currency", () => {
    expect(formatValue(2500, "currency", "ZZZ")).toMatch(/^(ZZZ|¤)\s?2\.5K$/);
  });

  it("formats numbers, percents and multipliers", () => {
    expect(formatValue(4_800_000, "number", "USD")).toBe("4.8M");
    expect(formatValue(682, "number", "USD")).toBe("682");
    expect(formatValue(1.44, "percent", "USD")).toBe("1.44%");
    expect(formatValue(3.2, "multiplier", "USD")).toBe("3.2x");
    expect(formatValue(2.1845, "multiplier", "USD")).toBe("2.18x");
  });

  it("shows text as typed and a missing value as a dash", () => {
    expect(formatValue("$65B+", "text", "USD")).toBe("$65B+");
    expect(formatValue(null, "currency", "USD")).toBe("—");
    expect(formatValue(undefined, "number", "USD")).toBe("—");
  });
});
