import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { invitationPaths, myInvitationPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import {
  acceptMyInvitation,
  createInvitation,
  listInvitations,
  listMyInvitations,
  rejectMyInvitation,
  resendInvitation,
  revokeInvitation,
} from "./api";

describe("invitation API", () => {
  it("lists the selected agency's invitations with pagination", async () => {
    let query = "";
    server.use(
      http.get(invitationPaths.collection(12), ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json({
          data: [
            {
              id: 34,
              email: "person@example.test",
              agency_id: 12,
              client_id: null,
              role_code: "VIEWER",
              workspace_id: null,
              workspace_name: null,
              expires_at: "2026-09-28T10:00:00Z",
              accepted_at: null,
              revoked_at: null,
            },
          ],
          meta: { current_page: 2, last_page: 3, total: 21 },
        });
      }),
    );
    const response = await listInvitations(12, 2, "all");
    expect(query).toBe("?page=2");
    expect(response.data[0]?.id).toBe(34);
    expect(response.meta.total).toBe(21);
  });

  it("forwards a status filter when one is selected", async () => {
    let query = "";
    server.use(
      http.get(invitationPaths.collection(12), ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json({
          data: [],
          meta: { current_page: 1, last_page: 1, total: 0 },
        });
      }),
    );
    await listInvitations(12, 1, "rejected");
    expect(query).toBe("?page=1&status=rejected");
  });

  it("requests pending and expired invitations for the open filter", async () => {
    let status: string | null = null;
    server.use(
      http.get(invitationPaths.collection(12), ({ request }) => {
        status = new URL(request.url).searchParams.get("status");
        return HttpResponse.json({
          data: [],
          meta: { current_page: 1, last_page: 1, total: 0 },
        });
      }),
    );
    await listInvitations(12, 1, "open");
    expect(status).toBe("pending,expired");
  });

  it("returns the resent invitation row", async () => {
    server.use(
      http.post(invitationPaths.resend(12, 34), () =>
        HttpResponse.json({
          data: {
            id: 34,
            email: "person@example.test",
            agency_id: 12,
            client_id: null,
            role_code: "VIEWER",
            workspace_id: 9,
            workspace_name: "Growth",
            expires_at: "2026-09-30T10:00:00Z",
            accepted_at: null,
            revoked_at: null,
            rejected_at: null,
            status: "pending",
            can_resend: false,
          },
        }),
      ),
    );
    const invitation = await resendInvitation(12, 34);
    expect(invitation).toMatchObject({ id: 34, status: "pending" });
  });

  it("lists, accepts and rejects the signed-in user's invitations by id", async () => {
    const calls: string[] = [];
    server.use(
      http.get(myInvitationPaths.collection, () =>
        HttpResponse.json({
          data: [
            {
              id: 5,
              agency_id: 12,
              agency_name: "Northstar",
              role_code: "ANALYST",
              client_id: null,
              client_name: null,
              workspace_id: 9,
              workspace_name: "Growth",
              expires_at: "2026-09-30T10:00:00Z",
            },
          ],
        }),
      ),
      http.post(myInvitationPaths.accept(5), () => {
        calls.push("accept");
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(myInvitationPaths.reject(5), () => {
        calls.push("reject");
        return new HttpResponse(null, { status: 204 });
      }),
    );
    expect((await listMyInvitations())[0]?.workspace_name).toBe("Growth");
    await acceptMyInvitation(5);
    await rejectMyInvitation(5);
    expect(calls).toEqual(["accept", "reject"]);
  });

  it("posts the confirmed payload and accepts an empty success response", async () => {
    let received: unknown;
    server.use(
      http.post(invitationPaths.collection(12), async ({ request }) => {
        received = await request.json();
        return new HttpResponse(null, { status: 201 });
      }),
    );
    await createInvitation(12, {
      email: "person@example.test",
      role_code: "MANAGER",
      workspace_ids: [9],
    });
    expect(received).toEqual({
      email: "person@example.test",
      role_code: "MANAGER",
      workspace_ids: [9],
    });
  });

  it("forwards a known invitation ID to DELETE", async () => {
    let called = false;
    server.use(
      http.delete(invitationPaths.detail(12, 34), () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await revokeInvitation(12, 34);
    expect(called).toBe(true);
  });

  it("preserves API field errors for the form", async () => {
    server.use(
      http.post(invitationPaths.collection(12), () =>
        HttpResponse.json(
          {
            errors: { workspace_ids: ["Workspace does not belong to client."] },
          },
          { status: 422 },
        ),
      ),
    );
    await expect(
      createInvitation(12, {
        email: "person@example.test",
        role_code: "MANAGER",
        workspace_ids: [99],
      }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { workspace_ids: "Workspace does not belong to client." },
    });
  });
});
