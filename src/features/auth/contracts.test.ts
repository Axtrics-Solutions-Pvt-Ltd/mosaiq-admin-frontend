import { describe, expect, it } from "vitest";

import {
  canAccessAdmin,
  canSignIntoAdmin,
  hasCapability,
  needsPendingInvitations,
  parseCurrentUser,
  postLoginDestination,
} from "./contracts";

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

describe("admin portal sign-in eligibility", () => {
  it("allows every agency role except Client User", () => {
    expect(
      canSignIntoAdmin(parseCurrentUser(response("SUPER_ADMIN", null))),
    ).toBe(true);
    for (const role of ["AGENCY_ADMIN", "MANAGER", "ANALYST", "VIEWER"]) {
      expect(canSignIntoAdmin(parseCurrentUser(response(null, role)))).toBe(
        true,
      );
    }
  });

  it("blocks Client User accounts from this portal", () => {
    expect(
      canSignIntoAdmin(parseCurrentUser(response(null, "CLIENT_USER"))),
    ).toBe(false);
  });
});

describe("post-login destination", () => {
  const invitePath = `/accept-invitation?token=${"a".repeat(64)}`;

  it("sends a user without a membership to their pending invitations", () => {
    const user = parseCurrentUser(response(null, null));
    expect(needsPendingInvitations(user)).toBe(true);
    expect(postLoginDestination(user)).toBe("/invitations/pending");
  });

  it("does not treat a Super Admin's null membership as a pending invitee", () => {
    const superAdmin = parseCurrentUser(response("SUPER_ADMIN", null));
    expect(needsPendingInvitations(superAdmin)).toBe(false);
    expect(postLoginDestination(superAdmin)).toBe("/dashboard");
  });

  it("keeps existing role routing for members", () => {
    expect(postLoginDestination(parseCurrentUser(response(null, "VIEWER")))).toBe(
      "/dashboard",
    );
    expect(
      postLoginDestination(parseCurrentUser(response(null, "CLIENT_USER"))),
    ).toBe("/forbidden?reason=client-portal");
  });

  it("returns to the invitation the user was accepting", () => {
    for (const account of [
      response(null, null),
      response(null, "VIEWER"),
      response("SUPER_ADMIN", null),
    ]) {
      expect(postLoginDestination(parseCurrentUser(account), invitePath)).toBe(
        invitePath,
      );
    }
  });

  it("ignores return paths outside the allowlist", () => {
    const viewer = parseCurrentUser(response(null, "VIEWER"));
    for (const next of [
      "https://evil.example/accept-invitation",
      "//evil.example/accept-invitation",
      "/\\evil.example/accept-invitation",
      "/users",
      "accept-invitation",
    ]) {
      expect(postLoginDestination(viewer, next)).toBe("/dashboard");
    }
  });
});

describe("capability-based access", () => {
  it("grants Manager the read-only operational capabilities", () => {
    const manager = parseCurrentUser(response(null, "MANAGER"));
    expect(hasCapability(manager, "dashboard.view")).toBe(true);
    expect(hasCapability(manager, "importHistory.view")).toBe(true);
    expect(hasCapability(manager, "connectors.view")).toBe(true);
    expect(hasCapability(manager, "agencies.manage")).toBe(false);
    expect(hasCapability(manager, "users.manage")).toBe(false);
    expect(hasCapability(manager, "roles.view")).toBe(false);
  });

  it("grants Agency Admin the full organization capability set", () => {
    const agencyAdmin = parseCurrentUser(response(null, "AGENCY_ADMIN"));
    expect(hasCapability(agencyAdmin, "agencies.manage")).toBe(true);
    expect(hasCapability(agencyAdmin, "users.manage")).toBe(true);
    expect(hasCapability(agencyAdmin, "roles.view")).toBe(true);
  });

  it("reserves creating new agencies for Super Admin only", () => {
    const superAdmin = parseCurrentUser(response("SUPER_ADMIN", null));
    const agencyAdmin = parseCurrentUser(response(null, "AGENCY_ADMIN"));
    expect(hasCapability(superAdmin, "agencies.create")).toBe(true);
    expect(hasCapability(agencyAdmin, "agencies.create")).toBe(false);
  });

  it("grants no capabilities to a Client User", () => {
    const clientUser = parseCurrentUser(response(null, "CLIENT_USER"));
    expect(hasCapability(clientUser, "dashboard.view")).toBe(false);
  });
});
