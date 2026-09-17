import { describe, expect, it } from "vitest";

import { canAccessAdmin, parseCurrentUser } from "./contracts";

function response(
  platformRoleCode: string | null,
  membershipRoleCode: string | null,
) {
  return {
    data: {
      id: 1,
      name: "Account",
      email: "account@example.test",
      platform_role_code: platformRoleCode,
      membership: membershipRoleCode
        ? {
            agency_id: 2,
            role_code: membershipRoleCode,
            client_id: null,
            workspace_ids: [null, 7],
          }
        : null,
    },
  };
}

describe("Admin role eligibility", () => {
  it("accepts platform and agency administrators", () => {
    expect(
      canAccessAdmin(parseCurrentUser(response("SUPER_ADMIN", null))),
    ).toBe(true);
    expect(
      canAccessAdmin(parseCurrentUser(response(null, "AGENCY_ADMIN"))),
    ).toBe(true);
  });

  it("rejects authenticated users without an Admin role", () => {
    expect(canAccessAdmin(parseCurrentUser(response(null, null)))).toBe(false);
    expect(canAccessAdmin(parseCurrentUser(response(null, "VIEWER")))).toBe(
      false,
    );
  });
});
