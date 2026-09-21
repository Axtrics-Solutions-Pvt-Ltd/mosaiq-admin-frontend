import { describe, expect, it } from "vitest";

import { updateAgencyUserSchema } from "./contracts";

describe("agency user contract", () => {
  it("requires a client for Client User", () => {
    const result = updateAgencyUserSchema.safeParse({
      role_code: "CLIENT_USER",
      workspace_ids: [],
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.path).toEqual(["client_id"]);
  });

  it("rejects a client for non-Client roles", () => {
    const result = updateAgencyUserSchema.safeParse({
      role_code: "VIEWER",
      client_id: 4,
      workspace_ids: [9],
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.path).toEqual(["client_id"]);
  });

  it("rejects duplicate workspace assignments", () => {
    const result = updateAgencyUserSchema.safeParse({
      role_code: "CLIENT_USER",
      client_id: 4,
      workspace_ids: [9, 9],
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(
        result.error.issues.some((issue) => issue.path[0] === "workspace_ids"),
      ).toBe(true);
  });

  it("accepts a partial status-only update", () => {
    const result = updateAgencyUserSchema.safeParse({ status: "inactive" });
    expect(result.success).toBe(true);
  });
});
