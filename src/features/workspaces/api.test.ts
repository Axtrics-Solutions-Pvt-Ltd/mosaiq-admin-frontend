import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { workspacePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import {
  createWorkspace,
  getWorkspace,
  listWorkspaces,
  updateWorkspace,
} from "./api";
import type { WorkspaceProfile } from "./contracts";

const profile: WorkspaceProfile = {
  name: "Northstar Reporting",
  timezone: "Europe/London",
  currency: "GBP",
  status: "active",
};
const record = {
  id: 7,
  agency_id: 2,
  client_id: 4,
  name: profile.name,
  timezone: profile.timezone,
  currency: profile.currency,
  status: "active",
  created_at: null,
  updated_at: null,
};
describe("workspace API", () => {
  it("scopes list filters to agency and client and reads pagination", async () => {
    let requested = "";
    server.use(
      http.get(workspacePaths.collection(2, 4), ({ request }) => {
        requested = request.url;
        return HttpResponse.json({
          data: [record],
          meta: { current_page: 2, last_page: 3, total: 12 },
        });
      }),
    );
    const result = await listWorkspaces(2, 4, {
      search: "North",
      status: "active",
      page: 2,
    });
    expect(requested).toContain("/agencies/2/clients/4/workspaces");
    expect(requested).toContain("search=North");
    expect(requested).toContain("status=active");
    expect(requested).toContain("page=2");
    expect(result.meta.total).toBe(12);
  });
  it("creates, reads, and updates a workspace with the documented profile", async () => {
    const calls: unknown[] = [];
    server.use(
      http.post(workspacePaths.collection(2, 4), async ({ request }) => {
        calls.push(await request.json());
        return HttpResponse.json({ data: record }, { status: 201 });
      }),
      http.get(workspacePaths.detail(2, 4, 7), () =>
        HttpResponse.json({ data: record }),
      ),
      http.put(workspacePaths.detail(2, 4, 7), async ({ request }) => {
        calls.push(await request.json());
        return HttpResponse.json({ data: { ...record, status: "inactive" } });
      }),
    );
    expect((await createWorkspace(2, 4, profile)).id).toBe(7);
    expect((await getWorkspace(2, 4, 7)).name).toBe(profile.name);
    expect(
      (await updateWorkspace(2, 4, 7, { ...profile, status: "inactive" }))
        .status,
    ).toBe("inactive");
    expect(calls).toEqual([profile, { ...profile, status: "inactive" }]);
  });
  it("preserves server validation errors for the form", async () => {
    server.use(
      http.post(workspacePaths.collection(2, 4), () =>
        HttpResponse.json(
          { errors: { name: ["Name already exists."] } },
          { status: 422 },
        ),
      ),
    );
    await expect(createWorkspace(2, 4, profile)).rejects.toMatchObject({
      status: 422,
      fieldErrors: { name: "Name already exists." },
    });
  });
});
