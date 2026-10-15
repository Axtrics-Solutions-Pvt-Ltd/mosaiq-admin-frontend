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

const params = Promise.resolve({
  agency: "1",
  client: "20",
  report: "7",
  item: "5",
});

function stubTemplate(
  body: BodyInit,
  headers: Record<string, string> = {
    "Content-Type": "text/csv; charset=UTF-8",
    "Content-Disposition":
      'attachment; filename="MOSAIQ-Marketing-Intelligence.csv"',
  },
) {
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(body, { headers }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const templateRequest = (query = "") =>
  new Request(`http://localhost:3000/api/v1/x${query}`, {
    headers: { cookie: "mosaiq-session=abc" },
  });

describe("CSV template proxy", () => {
  it("passes the CSV through byte for byte", async () => {
    // A BOM and a Windows-1252 byte, which reading as text would change.
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x23, 0x63, 0xe9, 0x0a]);
    const fetchMock = stubTemplate(bytes);
    const response = await GET(templateRequest(), { params });
    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      "https://api.example.test/api/v1/agencies/1/clients/20/reports/7/layout/5/csv-template",
    );
    expect(response.headers.get("Content-Type")).toBe(
      "text/csv; charset=UTF-8",
    );
    expect(response.headers.get("Content-Disposition")).toContain(
      "MOSAIQ-Marketing-Intelligence.csv",
    );
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  });

  it("passes the sample flag through, and nothing else", async () => {
    const fetchMock = stubTemplate("#card,a,A\n");
    await GET(templateRequest("?sample=1&other=x"), { params });
    await GET(templateRequest("?sample=0"), { params });
    expect(String(fetchMock.mock.calls[0]![0])).toMatch(
      /\/csv-template\?sample=1$/,
    );
    expect(String(fetchMock.mock.calls[1]![0])).toMatch(/\/csv-template$/);
  });

  it("passes a zip format through and drops an unknown one", async () => {
    const fetchMock = stubTemplate("#card,a,A\n");
    await GET(templateRequest("?format=zip&sample=1"), { params });
    await GET(templateRequest("?format=xlsx"), { params });
    await GET(templateRequest("?format=csv"), { params });
    expect(String(fetchMock.mock.calls[0]![0])).toMatch(
      /\/csv-template\?sample=1&format=zip$/,
    );
    expect(String(fetchMock.mock.calls[1]![0])).toMatch(/\/csv-template$/);
    expect(String(fetchMock.mock.calls[2]![0])).toMatch(/\/csv-template$/);
  });

  it("passes a zip through byte for byte with its headers", async () => {
    // A zip's local file header signature, then bytes that aren't text.
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0xff, 0x80]);
    stubTemplate(bytes, {
      "Content-Type": "application/zip",
      "Content-Disposition":
        'attachment; filename="MOSAIQ-Marketing-Intelligence-Templates.zip"',
    });
    const response = await GET(templateRequest("?format=zip"), { params });
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
