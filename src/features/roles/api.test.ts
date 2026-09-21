import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { rolePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { listRoles } from "./api";

describe("role API", () => {
  it("lists the fixed role catalogue", async () => {
    server.use(
      http.get(rolePaths.collection, () =>
        HttpResponse.json({
          data: [
            {
              code: "AGENCY_ADMIN",
              name: "Agency Admin",
              assignable: true,
              permissions: ["agency_edit", "user_manage"],
            },
            {
              code: "VIEWER",
              name: "Agency Viewer",
              assignable: true,
              permissions: ["dashboard_view"],
            },
          ],
        }),
      ),
    );
    const roles = await listRoles();
    expect(roles).toHaveLength(2);
    expect(roles[0]?.code).toBe("AGENCY_ADMIN");
  });

  it("rejects when the caller lacks permission", async () => {
    server.use(
      http.get(rolePaths.collection, () =>
        HttpResponse.json({ message: "Forbidden." }, { status: 403 }),
      ),
    );
    await expect(listRoles()).rejects.toMatchObject({ status: 403 });
  });
});
