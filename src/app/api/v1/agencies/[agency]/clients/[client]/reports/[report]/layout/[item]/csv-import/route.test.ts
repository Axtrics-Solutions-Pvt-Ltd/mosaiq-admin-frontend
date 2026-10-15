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

import { POST as previewPost } from "./preview/route";
import { POST as applyPost } from "./route";

afterEach(() => vi.unstubAllGlobals());

const params = (item = "5") =>
  Promise.resolve({ agency: "1", client: "20", report: "7", item });

function upload(
  files: File[],
  extra: Record<string, string> = {},
  cards: string[] = [],
) {
  const body = new FormData();
  for (const file of files) body.append("files[]", file, file.name);
  for (const [key, value] of Object.entries(extra)) body.append(key, value);
  for (const code of cards) body.append("cards[]", code);
  return new Request("http://localhost:3000/api/v1/x", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      cookie: "mosaiq-session=abc; XSRF-TOKEN=token%3D",
    },
    body,
  });
}

const csv = (name: string) => new File(["label,value\nA,1\n"], name);

function stubUpstream() {
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({ data: { files: [] } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("CSV import proxy", () => {
  it("refuses a malformed id before reading the upload", async () => {
    const fetchMock = stubUpstream();
    const response = await previewPost(upload([csv("a.csv")]), {
      params: params("abc"),
    });
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a file of the wrong type with the API's 422 shape", async () => {
    const fetchMock = stubUpstream();
    const response = await applyPost(upload([new File(["x"], "a.xlsx")]), {
      params: params(),
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      message: "a.xlsx: upload .csv or .zip files.",
      errors: { files: ["a.xlsx: upload .csv or .zip files."] },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an upload over 4 MB in total without calling the API", async () => {
    const fetchMock = stubUpstream();
    const half = "x".repeat(2.5 * 1024 * 1024);
    const response = await previewPost(
      upload([new File([half], "a.csv"), new File([half], "b.csv")]),
      { params: params() },
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      message: "The upload can be at most 4 MB in total.",
      errors: { files: ["The upload can be at most 4 MB in total."] },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an upload without files", async () => {
    stubUpstream();
    const response = await previewPost(upload([]), { params: params() });
    expect(response.status).toBe(422);
  });

  it("forwards only the files and as_of, as multipart", async () => {
    const fetchMock = stubUpstream();
    const response = await previewPost(
      upload([csv("a.csv"), new File(["zip"], "b.zip")], {
        as_of: "2026-10-15",
        other: "dropped",
      }),
      { params: params() },
    );
    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.example.test/api/v1/agencies/1/clients/20/reports/7/layout/5/csv-import/preview",
    );
    const body = init?.body as FormData;
    expect([...body.keys()]).toEqual(["files[]", "files[]", "as_of"]);
    expect(body.getAll("files[]").map((entry) => (entry as File).name)).toEqual(
      ["a.csv", "b.zip"],
    );
    const headers = new Headers(init?.headers);
    expect(headers.get("X-XSRF-TOKEN")).toBe("token=");
    expect(headers.has("Content-Type")).toBe(false);

    await applyPost(upload([csv("a.csv")]), { params: params() });
    expect(String(fetchMock.mock.calls[1]![0])).toMatch(
      /\/layout\/5\/csv-import$/,
    );
  });

  it("forwards cards[] on apply only", async () => {
    const fetchMock = stubUpstream();
    const cards = ["audience_overview", "core_values"];
    await applyPost(upload([csv("a.csv")], { as_of: "2026-10-15" }, cards), {
      params: params(),
    });
    await previewPost(upload([csv("a.csv")], {}, cards), { params: params() });

    const applyBody = fetchMock.mock.calls[0]![1]?.body as FormData;
    expect([...applyBody.keys()]).toEqual([
      "files[]",
      "as_of",
      "cards[]",
      "cards[]",
    ]);
    expect(applyBody.getAll("cards[]")).toEqual(cards);
    const previewBody = fetchMock.mock.calls[1]![1]?.body as FormData;
    expect(previewBody.has("cards[]")).toBe(false);
  });

  it("refuses more than 60 cards on apply", async () => {
    const fetchMock = stubUpstream();
    const cards = Array.from({ length: 61 }, (_, index) => `card_${index}`);
    const response = await applyPost(upload([csv("a.csv")], {}, cards), {
      params: params(),
    });
    expect(response.status).toBe(422);
    expect((await response.json()).errors).toHaveProperty("cards");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
