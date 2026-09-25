import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { workspacePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import {
  createWorkspace,
  deleteWorkspace,
  disconnectWorkspace,
  fetchWorkspaceData,
  getWorkspace,
  getWorkspaceCredentials,
  listWorkspaces,
  saveWorkspaceCredentials,
  updateWorkspace,
} from "./api";
import type { WorkspaceProfile } from "./contracts";

const profile: WorkspaceProfile = {
  connector_id: 3,
  name: "Northstar Reporting",
  timezone: "Europe/London",
  currency: "GBP",
  status: "active",
};
const record = {
  id: 7,
  agency_id: 2,
  client_id: 4,
  connector_id: 3,
  connector: { id: 3, code: "meta_ads", name: "Meta Ads", category: "ads" },
  connection: { status: "not_connected", last_fetched_at: null },
  name: profile.name,
  timezone: profile.timezone,
  currency: profile.currency,
  status: "active",
  invite_status: null,
  invite_status_reason: null,
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
    expect(result.data[0]?.connector?.name).toBe("Meta Ads");
  });
  it("sends the channel filter as connector_id", async () => {
    let requested = "";
    server.use(
      http.get(workspacePaths.collection(2, 4), ({ request }) => {
        requested = request.url;
        return HttpResponse.json({
          data: [],
          meta: { current_page: 1, last_page: 1, total: 0 },
        });
      }),
    );
    await listWorkspaces(2, 4, { connector_id: 3 });
    expect(requested).toContain("connector_id=3");
  });
  it("reads a legacy workspace without a channel", async () => {
    server.use(
      http.get(workspacePaths.detail(2, 4, 7), () =>
        HttpResponse.json({
          data: {
            ...record,
            connector_id: null,
            connector: null,
            connection: undefined,
          },
        }),
      ),
    );
    const workspace = await getWorkspace(2, 4, 7);
    expect(workspace.connector).toBeNull();
    expect(workspace.connection).toBeNull();
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
  it("deletes a workspace", async () => {
    let method = "";
    server.use(
      http.delete(workspacePaths.detail(2, 4, 7), ({ request }) => {
        method = request.method;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await deleteWorkspace(2, 4, 7);
    expect(method).toBe("DELETE");
  });
});

describe("workspace connection API", () => {
  const credentials = {
    workspace_id: 7,
    connector_id: 3,
    status: "connected",
    last_verified_at: null,
    last_fetched_at: null,
    last_fetch_status: null,
    last_fetch_error: null,
    fields: [{ key: "access_token", is_set: true, hint: "•••• 1234" }],
  };
  it("reads, saves and clears credentials", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.get(workspacePaths.credentials(2, 4, 7), () =>
        HttpResponse.json({ data: credentials }),
      ),
      http.put(workspacePaths.credentials(2, 4, 7), async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ data: credentials });
      }),
      http.delete(workspacePaths.credentials(2, 4, 7), () =>
        HttpResponse.json({
          data: { ...credentials, status: "not_connected", fields: [] },
        }),
      ),
    );
    expect((await getWorkspaceCredentials(2, 4, 7)).fields[0]?.hint).toBe(
      "•••• 1234",
    );
    await saveWorkspaceCredentials(2, 4, 7, {
      values: { account_id: "act_1" },
    });
    expect(bodies).toEqual([{ values: { account_id: "act_1" } }]);
    expect((await disconnectWorkspace(2, 4, 7)).status).toBe("not_connected");
  });
  it("returns the fetch summary", async () => {
    server.use(
      http.post(workspacePaths.fetch(2, 4, 7), () =>
        HttpResponse.json({
          data: {
            status: "completed",
            rows_upserted: 400,
            date_from: "2025-08-21",
            date_to: "2026-09-24",
            is_sample: true,
          },
        }),
      ),
    );
    await expect(fetchWorkspaceData(2, 4, 7)).resolves.toMatchObject({
      rows_upserted: 400,
      is_sample: true,
    });
  });
});
