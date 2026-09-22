import { describe, expect, it } from "vitest";

import { clientCreateSchema, clientProfileSchema } from "./contracts";

describe("client contracts", () => {
  it("requires a non-empty name up to 255 characters", () => {
    expect(
      clientProfileSchema.safeParse({ name: "", status: "active" }).success,
    ).toBe(false);
    expect(
      clientProfileSchema.safeParse({
        name: "a".repeat(256),
        status: "active",
      }).success,
    ).toBe(false);
    expect(
      clientProfileSchema.safeParse({
        name: "a".repeat(255),
        status: "active",
      }).success,
    ).toBe(true);
  });

  it("trims whitespace-only names to empty and rejects them", () => {
    const result = clientProfileSchema.safeParse({
      name: "   ",
      status: "active",
    });
    expect(result.success).toBe(false);
  });

  it("only accepts active or inactive status", () => {
    expect(
      clientProfileSchema.safeParse({ name: "Client", status: "archived" })
        .success,
    ).toBe(false);
    expect(
      clientProfileSchema.safeParse({ name: "Client", status: "active" })
        .success,
    ).toBe(true);
  });

  it("makes status optional on create but still requires name", () => {
    expect(clientCreateSchema.safeParse({ name: "Client" }).success).toBe(
      true,
    );
    expect(clientCreateSchema.safeParse({}).success).toBe(false);
  });
});
