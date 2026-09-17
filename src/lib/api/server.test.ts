import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/config/env", () => ({
  getServerApiConfig: () => ({
    apiOrigin: "https://api.example.test",
    adminOrigin: "http://localhost:3000",
    sessionCookieName: "mosaiq-session",
  }),
}));

import { forwardAuthRequest } from "./server";

afterEach(() => vi.unstubAllGlobals());

describe("auth gateway", () => {
  it("rejects a cross-origin login before forwarding credentials", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await forwardAuthRequest(
      "login",
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { origin: "https://other.example.test" },
        body: "{}",
      }),
    );
    expect(result.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards only auth cookies and a decoded CSRF token with the configured Origin", async () => {
    const responseHeaders = new Headers({ "Content-Type": "application/json" });
    responseHeaders.append(
      "Set-Cookie",
      "mosaiq-session=abc; Domain=api.example.test; Path=/api; HttpOnly; Secure; SameSite=None",
    );
    responseHeaders.append(
      "Set-Cookie",
      "XSRF-TOKEN=token%3D; Domain=api.example.test; Path=/; SameSite=None",
    );
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response('{"data":{}}', { status: 200, headers: responseHeaders }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await forwardAuthRequest(
      "login",
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          referer: "https://other.example.test/",
          cookie: "XSRF-TOKEN=token%3D; mosaiq-session=abc; unrelated=secret",
        },
        body: '{"email":"example@test.test","password":"input"}',
      }),
    );
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    if (!call) throw new Error("Expected upstream request");
    const [url, options] = call;
    const sentHeaders = new Headers(options?.headers);
    expect(String(url)).toBe("https://api.example.test/api/v1/auth/login");
    expect(sentHeaders.get("Origin")).toBe("http://localhost:3000");
    expect(sentHeaders.has("Referer")).toBe(false);
    expect(sentHeaders.get("X-XSRF-TOKEN")).toBe("token=");
    expect(sentHeaders.get("Cookie")).not.toContain("unrelated");
    const cookies = result.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).not.toContain("Domain=");
    expect(cookies[0]).toContain("HttpOnly");
    expect(cookies[0]).not.toContain("Secure");
    expect(result.headers.get("Cache-Control")).toBe("no-store");
  });
});
