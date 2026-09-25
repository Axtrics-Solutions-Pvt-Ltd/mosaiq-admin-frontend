import { describe, expect, it } from "vitest";

import {
  getInvitationAccessScope,
  invitationSchema,
  invitationStatusQuery,
  inviteSchema,
  parseInvitationStatusFilter,
} from "./contracts";

describe("invitation status filter", () => {
  it("defaults to open invitations, which include expired ones to resend", () => {
    expect(parseInvitationStatusFilter(undefined)).toBe("open");
    expect(parseInvitationStatusFilter("unknown")).toBe("open");
    expect(invitationStatusQuery("open")).toBe("pending,expired");
  });

  it("omits the status parameter only for all invitations", () => {
    expect(parseInvitationStatusFilter("all")).toBe("all");
    expect(invitationStatusQuery("all")).toBeUndefined();
    expect(parseInvitationStatusFilter("rejected")).toBe("rejected");
    expect(invitationStatusQuery("rejected")).toBe("rejected");
  });
});

describe("invitation contract", () => {
  it("only invites Agency Admins or Managers", () => {
    for (const role_code of ["ANALYST", "VIEWER", "CLIENT_USER"]) {
      expect(
        inviteSchema.safeParse({
          email: "legacy@example.test",
          role_code,
          workspace_ids: [9],
        }).success,
      ).toBe(false);
    }
  });

  it("makes workspaces optional and requires a client for a Manager", () => {
    expect(
      inviteSchema.safeParse({
        email: "admin@example.test",
        role_code: "AGENCY_ADMIN",
        workspace_ids: [],
      }).success,
    ).toBe(true);
    expect(
      inviteSchema.safeParse({
        email: "manager@example.test",
        role_code: "MANAGER",
        client_id: 4,
        workspace_ids: [],
      }).success,
    ).toBe(true);
    const result = inviteSchema.safeParse({
      email: "manager@example.test",
      role_code: "MANAGER",
      workspace_ids: [9],
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.path).toEqual(["client_id"]);
  });

  it("submits a client only for a Manager", () => {
    const manager = inviteSchema.safeParse({
      email: "manager@example.test",
      role_code: "MANAGER",
      client_id: 4,
      workspace_ids: [9],
    });
    expect(manager.success && manager.data.client_id).toBe(4);
    expect(
      inviteSchema.safeParse({
        email: "admin@example.test",
        role_code: "AGENCY_ADMIN",
        client_id: 4,
        workspace_ids: [],
      }).success,
    ).toBe(false);
  });

  it("describes what an invitation grants", () => {
    expect(
      getInvitationAccessScope({
        role_code: "MANAGER",
        client_id: 4,
        workspace_id: null,
      }),
    ).toBe("client");
    expect(
      getInvitationAccessScope({
        role_code: "MANAGER",
        client_id: 4,
        workspace_id: 9,
      }),
    ).toBe("workspace");
    expect(
      getInvitationAccessScope({
        role_code: "AGENCY_ADMIN",
        client_id: null,
        workspace_id: null,
      }),
    ).toBe("agency");
    expect(
      getInvitationAccessScope({
        access_scope: "client",
        role_code: "MANAGER",
      }),
    ).toBe("client");
  });

  it("still reads invitations sent with a legacy role", () => {
    expect(
      invitationSchema.safeParse({
        id: 3,
        email: "viewer@example.test",
        agency_id: 12,
        client_id: null,
        role_code: "VIEWER",
        workspace_id: 9,
        workspace_name: "Reporting",
        expires_at: "2026-12-31T10:00:00Z",
        accepted_at: null,
        revoked_at: null,
      }).success,
    ).toBe(true);
  });

  it("rejects duplicate workspace assignments", () => {
    const result = inviteSchema.safeParse({
      email: "manager@example.test",
      role_code: "MANAGER",
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
