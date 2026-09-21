import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { userPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { getAgencyUser, listAgencyUsers, updateAgencyUser } from "./api";

const baseUser = {
  id: 7,
  name: "Jordan Analyst",
  email: "jordan@example.test",
  status: "active",
  agency_id: 12,
  membership_status: "active",
  role_code: "ANALYST",
  client_id: null,
  workspace_ids: [],
  invited_at: "2026-09-01T10:00:00Z",
  accepted_at: "2026-09-02T10:00:00Z",
};

describe("agency user API", () => {
  it("lists the selected agency's users with filters applied", async () => {
    let query = "";
    server.use(
      http.get(userPaths.collection(12), ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json({
          data: [baseUser],
          meta: { current_page: 1, last_page: 1, total: 1 },
        });
      }),
    );
    const response = await listAgencyUsers(12, {
      status: "active",
      search: "jordan",
      page: 1,
    });
    expect(query).toBe("?status=active&search=jordan&page=1");
    expect(response.data[0]?.id).toBe(7);
    expect(response.meta.total).toBe(1);
  });

  it("fetches a single agency user", async () => {
    server.use(
      http.get(userPaths.detail(12, 7), () =>
        HttpResponse.json({ data: baseUser }),
      ),
    );
    const user = await getAgencyUser(12, 7);
    expect(user.email).toBe("jordan@example.test");
  });

  it("puts the confirmed payload when updating a user", async () => {
    let received: unknown;
    server.use(
      http.put(userPaths.detail(12, 7), async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({
          data: { ...baseUser, status: "inactive" },
        });
      }),
    );
    const user = await updateAgencyUser(12, 7, {
      name: "Jordan Analyst",
      role_code: "ANALYST",
      client_id: null,
      workspace_ids: [],
      status: "inactive",
    });
    expect(received).toEqual({
      name: "Jordan Analyst",
      role_code: "ANALYST",
      client_id: null,
      workspace_ids: [],
      status: "inactive",
    });
    expect(user.status).toBe("inactive");
  });

  it("preserves API field errors from a rejected update", async () => {
    server.use(
      http.put(userPaths.detail(12, 7), () =>
        HttpResponse.json(
          { errors: { role_code: ["Invited users cannot be edited."] } },
          { status: 422 },
        ),
      ),
    );
    await expect(
      updateAgencyUser(12, 7, {
        name: "Jordan Analyst",
        role_code: "ANALYST",
        client_id: null,
        workspace_ids: [],
        status: "active",
      }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { role_code: "Invited users cannot be edited." },
    });
  });
});
