import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/config/env", () => ({
  getServerApiConfig: () => ({
    apiOrigin: "https://api.example.test",
    adminOrigin: "http://localhost:3000",
    sessionCookieName: "mosaiq-session",
  }),
}));

import { forwardAdminRequest } from "./admin-server";

afterEach(() => vi.unstubAllGlobals());

describe("admin gateway", () => {
  it("forwards authenticated GET requests without requiring an origin or CSRF token", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({
          data: [],
          meta: { current_page: 1, last_page: 1, total: 0 },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await forwardAdminRequest(
      new Request(
        "http://localhost:3000/api/v1/admin/agencies/12/invitations?page=2",
        { headers: { cookie: "mosaiq-session=abc; unrelated=secret" } },
      ),
      "/api/v1/admin/agencies/12/invitations?page=2",
      "GET",
    );
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    if (!call) throw new Error("Expected upstream request");
    const [url, options] = call;
    const headers = new Headers(options?.headers);
    expect(String(url)).toBe(
      "https://api.example.test/api/v1/admin/agencies/12/invitations?page=2",
    );
    expect(headers.get("Cookie")).toBe("mosaiq-session=abc");
    expect(headers.has("X-XSRF-TOKEN")).toBe(false);
    expect(result.status).toBe(200);
  });
});
