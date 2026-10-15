// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/config/env", () => ({
  getServerApiConfig: () => ({
    apiOrigin: "https://api.example.test",
    adminOrigin: "http://localhost:3000",
    sessionCookieName: "mosaiq-session",
  }),
}));

import { GET } from "./route";

afterEach(() => vi.unstubAllGlobals());

describe("CSV template proxy", () => {
  it("passes a zip through byte for byte", async () => {
    // Not valid UTF-8, so reading it as text would change it.
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff, 0xfe, 0x00]);
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(bytes, {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition":
              'attachment; filename="MOSAIQ-Marketing-Intelligence-Templates.zip"',
          },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(
      new Request("http://localhost:3000/api/v1/x", {
        headers: { cookie: "mosaiq-session=abc" },
      }),
      {
        params: Promise.resolve({
          agency: "1",
          client: "20",
          report: "7",
          item: "5",
        }),
      },
    );
    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      "https://api.example.test/api/v1/agencies/1/clients/20/reports/7/layout/5/csv-template",
    );
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toContain(
      "MOSAIQ-Marketing-Intelligence-Templates.zip",
    );
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  });

  it("refuses a malformed id", async () => {
    const response = await GET(new Request("http://localhost:3000/api/v1/x"), {
      params: Promise.resolve({
        agency: "1",
        client: "20",
        report: "7",
        item: "0",
      }),
    });
    expect(response.status).toBe(400);
  });
});
