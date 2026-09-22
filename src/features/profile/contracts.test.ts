import { describe, expect, it } from "vitest";

import { changePasswordSchema, editProfileSchema } from "./contracts";

describe("profile forms", () => {
  it("requires the current password and an eight-character password with letters and numbers", () => {
    expect(
      changePasswordSchema.safeParse({
        current_password: "",
        password: "short",
        password_confirmation: "different",
      }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        current_password: "current",
        password: "new-password-123",
        password_confirmation: "different",
      }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        current_password: "current",
        password: "new-password-123",
        password_confirmation: "new-password-123",
      }).success,
    ).toBe(true);
    expect(
      changePasswordSchema.safeParse({
        current_password: "same1234",
        password: "same1234",
        password_confirmation: "same1234",
      }).success,
    ).toBe(false);
  });

  it("reuses the user-update name limits", () => {
    expect(editProfileSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(editProfileSchema.safeParse({ name: "a".repeat(256) }).success).toBe(
      false,
    );
    expect(editProfileSchema.parse({ name: "  Alex  " })).toEqual({
      name: "Alex",
    });
  });
});
