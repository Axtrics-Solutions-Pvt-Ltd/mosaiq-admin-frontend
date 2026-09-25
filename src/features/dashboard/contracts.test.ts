import { describe, expect, it } from "vitest";

import { dashboardSummaryResponseSchema } from "./contracts";

describe("dashboard summary response schema", () => {
  it("parses the platform scope shape", () => {
    const result = dashboardSummaryResponseSchema.parse({
      data: {
        scope: "platform",
        agency_id: null,
        client_id: null,
        agencies: 12,
        clients: 38,
        workspaces: 186,
        reports: 4,
        active_links: 6,
        users: 142,
      },
    });
    expect(result.data.scope).toBe("platform");
  });

  it("parses the agency scope shape", () => {
    const result = dashboardSummaryResponseSchema.parse({
      data: {
        scope: "agency",
        agency_id: 4,
        client_id: null,
        agencies: 1,
        clients: 9,
        workspaces: 21,
        reports: 4,
        active_links: 6,
        users: 14,
      },
    });
    expect(result.data.scope).toBe("agency");
  });

  it("parses the client and assigned scope shapes with users withheld", () => {
    for (const scope of ["client", "assigned"] as const) {
      const result = dashboardSummaryResponseSchema.parse({
        data: {
          scope,
          agency_id: 4,
          client_id: 7,
          agencies: 1,
          clients: 1,
          workspaces: 3,
          reports: 4,
          active_links: 6,
          users: null,
        },
      });
      expect(result.data.users).toBeNull();
    }
  });

  it("rejects a summary without the report or active link counts", () => {
    expect(() =>
      dashboardSummaryResponseSchema.parse({
        data: {
          scope: "agency",
          agency_id: 4,
          client_id: null,
          agencies: 1,
          clients: 9,
          workspaces: 21,
          users: 14,
        },
      }),
    ).toThrow();
  });

  it("rejects an unknown scope value", () => {
    expect(() =>
      dashboardSummaryResponseSchema.parse({
        data: {
          scope: "unknown",
          agency_id: null,
          client_id: null,
          agencies: 1,
          clients: 1,
          workspaces: 1,
          reports: 4,
          active_links: 6,
          users: 1,
        },
      }),
    ).toThrow();
  });
});
