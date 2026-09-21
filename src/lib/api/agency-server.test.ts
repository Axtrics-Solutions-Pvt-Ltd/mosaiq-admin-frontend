import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/config/env", () => ({
  getServerApiConfig: () => ({
    apiOrigin: "https://api.example.test",
    adminOrigin: "http://localhost:3000",
    sessionCookieName: "mosaiq-session",
  }),
}));

import { forwardAgencyRequest } from "./agency-server";

afterEach(() => vi.unstubAllGlobals());

describe("agency gateway", () => {
  it("rejects mutations from another origin", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await forwardAgencyRequest(
      new Request("http://localhost:3000/api/v1/agencies", {
        method: "POST",
        headers: { origin: "https://other.example.test" },
      }),
      "/api/v1/agencies",
      "POST",
      { display_name: "Northstar" },
    );
    expect(result.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the session and decoded CSRF token without unrelated cookies", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({ data: { id: 12 } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await forwardAgencyRequest(
      new Request("http://localhost:3000/api/v1/agencies/12", {
        method: "PUT",
        headers: {
          origin: "http://localhost:3000",
          cookie: "XSRF-TOKEN=token%3D; mosaiq-session=abc; unrelated=secret",
        },
      }),
      "/api/v1/agencies/12",
      "PUT",
      { display_name: "Northstar" },
    );
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    if (!call) throw new Error("Expected upstream request");
    const [url, options] = call;
    const headers = new Headers(options?.headers);
    expect(String(url)).toBe("https://api.example.test/api/v1/agencies/12");
    expect(headers.get("X-XSRF-TOKEN")).toBe("token=");
    expect(headers.get("Cookie")).not.toContain("unrelated");
    expect(result.status).toBe(200);
  });
});
