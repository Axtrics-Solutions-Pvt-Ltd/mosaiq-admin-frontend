import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { invitationPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { createInvitation, revokeInvitation } from "./api";

describe("invitation API", () => {
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
      role_code: "CLIENT_USER",
      client_id: 4,
      workspace_ids: [9],
    });
    expect(received).toEqual({
      email: "person@example.test",
      role_code: "CLIENT_USER",
      client_id: 4,
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
        role_code: "CLIENT_USER",
        client_id: 4,
        workspace_ids: [99],
      }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { workspace_ids: "Workspace does not belong to client." },
    });
  });
});
