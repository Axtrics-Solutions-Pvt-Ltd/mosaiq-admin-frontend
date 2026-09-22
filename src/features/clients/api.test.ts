import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { workspacePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { createClient, updateClient } from "./api";
import type { ClientCreatePayload, ClientProfile } from "./contracts";

const createPayload: ClientCreatePayload = { name: "Northstar Client" };
const updatePayload: ClientProfile = { name: "Northstar Client", status: "inactive" };
const record = {
  id: 20,
  agency_id: 1,
  name: "Northstar Client",
  status: "active",
  workspace_count: 1,
  created_at: "2026-09-18T10:00:00Z",
  updated_at: "2026-09-18T10:00:00Z",
  workspaces: [
    {
      id: 30,
      agency_id: 1,
      client_id: 20,
      name: "Northstar Client Launch",
      timezone: "Europe/London",
      currency: "GBP",
      status: "active",
      created_at: null,
      updated_at: null,
    },
  ],
};

describe("client API", () => {
  it("creates a client and reads the auto-created default workspace from the response", async () => {
    const calls: { method: string; url: string; body: unknown }[] = [];
    server.use(
      http.post(workspacePaths.clients(1), async ({ request }) => {
        calls.push({
          method: request.method,
          url: request.url,
          body: await request.json(),
        });
        return HttpResponse.json({ data: record }, { status: 201 });
      }),
    );
    const saved = await createClient(1, createPayload);
    expect(saved.id).toBe(20);
    expect(saved.workspaces?.[0]?.name).toBe("Northstar Client Launch");
    expect(calls[0]).toMatchObject({
      method: "POST",
      body: createPayload,
    });
    expect(calls[0]?.url).toContain("/api/v1/agencies/1/clients");
  });

  it("updates a client's name and status through PUT", async () => {
    const calls: { method: string; url: string; body: unknown }[] = [];
    server.use(
      http.put(workspacePaths.client(1, 20), async ({ request }) => {
        calls.push({
          method: request.method,
          url: request.url,
          body: await request.json(),
        });
        return HttpResponse.json({
          data: { ...record, status: "inactive" },
        });
      }),
    );
    const saved = await updateClient(1, 20, updatePayload);
    expect(saved.status).toBe("inactive");
    expect(calls[0]).toMatchObject({ method: "PUT", body: updatePayload });
    expect(calls[0]?.url).toContain("/api/v1/agencies/1/clients/20");
  });

  it("keeps Laravel field errors available to the form", async () => {
    server.use(
      http.post(workspacePaths.clients(1), () =>
        HttpResponse.json(
          { message: "Invalid client", errors: { name: ["The name is required."] } },
          { status: 422 },
        ),
      ),
    );
    await expect(createClient(1, { name: "" })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { name: "The name is required." },
    });
  });
});
