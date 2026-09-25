import { describe, expect, it } from "vitest";

import { agencyUserSchema, updateAgencyUserSchema } from "./contracts";

describe("agency user contract", () => {
  it("only assigns Agency Admin or Manager", () => {
    for (const role_code of ["ANALYST", "VIEWER", "CLIENT_USER"]) {
      const result = updateAgencyUserSchema.safeParse({
        role_code,
        workspace_ids: [9],
      });
      expect(result.success).toBe(false);
    }
    expect(
      updateAgencyUserSchema.safeParse({
        role_code: "AGENCY_ADMIN",
        client_id: null,
        workspace_ids: [],
      }).success,
    ).toBe(true);
  });

  it("requires workspaces for a Manager", () => {
    const result = updateAgencyUserSchema.safeParse({
      role_code: "MANAGER",
      workspace_ids: [],
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.path).toEqual(["workspace_ids"]);
  });

  it("rejects a client assignment", () => {
    const result = updateAgencyUserSchema.safeParse({
      role_code: "MANAGER",
      client_id: 4,
      workspace_ids: [9],
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.path).toEqual(["client_id"]);
  });

  it("rejects duplicate workspace assignments", () => {
    const result = updateAgencyUserSchema.safeParse({
      role_code: "MANAGER",
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

  it("still reads users who hold a legacy role", () => {
    const result = agencyUserSchema.safeParse({
      id: 5,
      name: "Legacy Analyst",
      email: "analyst@example.test",
      status: "active",
      agency_id: 12,
      membership_status: "active",
      role_code: "ANALYST",
      client_id: null,
      workspace_ids: [9],
      invited_at: null,
      accepted_at: null,
    });
    expect(result.success).toBe(true);
  });
});
