import { describe, expect, it } from "vitest";

import { inviteSchema } from "./contracts";

describe("invitation contract", () => {
  it("requires an active-scope shape for Client User", () => {
    expect(
      inviteSchema.safeParse({
        email: "client@example.test",
        role_code: "CLIENT_USER",
        workspace_ids: [],
      }).success,
    ).toBe(false);
  });

  it("makes workspaces optional only for Agency Admin", () => {
    expect(
      inviteSchema.safeParse({
        email: "admin@example.test",
        role_code: "AGENCY_ADMIN",
        workspace_ids: [],
      }).success,
    ).toBe(true);
    const result = inviteSchema.safeParse({
      email: "viewer@example.test",
      role_code: "VIEWER",
      workspace_ids: [],
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.path).toEqual(["workspace_ids"]);
  });

  it("rejects client_id for non-Client roles", () => {
    const result = inviteSchema.safeParse({
      email: "viewer@example.test",
      role_code: "VIEWER",
      client_id: 4,
      workspace_ids: [9],
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.path).toEqual(["client_id"]);
  });

  it("rejects duplicate workspace assignments", () => {
    const result = inviteSchema.safeParse({
      email: "client@example.test",
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
});
