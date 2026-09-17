import { describe, expect, it } from "vitest";

import { routes } from "./routes";

describe("routes", () => {
  it("encodes entity identifiers and omits an admin prefix", () => {
    expect(routes.agencies.edit("agency/example")).toBe(
      "/agencies/agency%2Fexample/edit",
    );
    expect(routes.dashboard).toBe("/dashboard");
  });
});
