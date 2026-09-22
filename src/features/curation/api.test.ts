import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { curationPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { getWorkspaceCuration, updateWorkspaceCuration } from "./api";
import type { UpdateWorkspaceCurationRequest } from "./contracts";

const record = {
  workspace_id: 9,
  modules: [
    {
      id: 1,
      code: "reporting",
      name: "Reporting",
      is_enabled: true,
      position: 1,
      kpis: [
        {
          id: 1,
          code: "reporting.impressions",
          name: "Impressions",
          is_enabled: true,
          position: 1,
        },
      ],
    },
  ],
};

describe("curation API", () => {
  it("reads the editable configuration for a workspace", async () => {
    server.use(
      http.get(curationPaths.detail(9), () =>
        HttpResponse.json({ data: record }),
      ),
    );
    const result = await getWorkspaceCuration(9);
    expect(result.workspace_id).toBe(9);
    expect(result.modules[0]?.kpis[0]?.code).toBe("reporting.impressions");
  });

  it("sends the documented module/KPI enable payload on save", async () => {
    const calls: { method: string; body: unknown }[] = [];
    server.use(
      http.put(curationPaths.detail(9), async ({ request }) => {
        calls.push({ method: request.method, body: await request.json() });
        return HttpResponse.json({
          data: {
            ...record,
            modules: [{ ...record.modules[0], is_enabled: false }],
          },
        });
      }),
    );
    const payload: UpdateWorkspaceCurationRequest = {
      modules: [
        { id: 1, is_enabled: false, kpis: [{ id: 1, is_enabled: false }] },
      ],
    };
    const result = await updateWorkspaceCuration(9, payload);
    expect(calls).toEqual([{ method: "PUT", body: payload }]);
    expect(result.modules[0]?.is_enabled).toBe(false);
  });

  it("rejects an update payload without any modules", async () => {
    await expect(updateWorkspaceCuration(9, { modules: [] })).rejects.toThrow();
  });
});
