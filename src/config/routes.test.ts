import { describe, expect, it } from "vitest";

import {
  newReportUrl,
  reportLinksUrl,
  reportSettingsUrl,
  reportUrl,
  routes,
} from "./routes";

describe("routes", () => {
  it("encodes entity identifiers and omits an admin prefix", () => {
    expect(routes.agencies.edit("agency/example")).toBe(
      "/agencies/agency%2Fexample/edit",
    );
    expect(routes.dashboard).toBe("/dashboard");
  });
  it("scopes report routes to their agency and client", () => {
    expect(reportUrl(7, 1, 20)).toBe("/reports/7?agency=1&client=20");
    expect(reportSettingsUrl(7, 1, 20)).toBe(
      "/reports/7/settings?agency=1&client=20",
    );
    expect(reportLinksUrl(7, 1, 20)).toBe(
      "/reports/7/links?agency=1&client=20",
    );
    expect(newReportUrl(1, 20)).toBe("/reports/new?agency=1&client=20");
  });
});
