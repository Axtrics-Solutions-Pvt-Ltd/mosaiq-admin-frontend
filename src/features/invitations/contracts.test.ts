import { describe, expect, it } from "vitest";

import { inviteSchema } from "./contracts";

const base = {
  email: "person@example.test",
  role_code: "VIEWER",
  workspace_ids: [],
};

describe("invitation payload", () => {
  it("excludes Super Admin and requires client scope for Client User", () => {
    expect(
      inviteSchema.safeParse({ ...base, role_code: "SUPER_ADMIN" }).success,
    ).toBe(false);
    expect(
      inviteSchema.safeParse({ ...base, role_code: "CLIENT_USER" }).success,
    ).toBe(false);
    expect(
      inviteSchema.safeParse({
        ...base,
        role_code: "CLIENT_USER",
        client_id: 10,
        workspace_ids: [21],
      }).success,
    ).toBe(true);
  });

  it("allows optional workspace scope for other roles", () => {
    expect(
      inviteSchema.safeParse({ ...base, workspace_ids: [21, 22] }).success,
    ).toBe(true);
  });
});
