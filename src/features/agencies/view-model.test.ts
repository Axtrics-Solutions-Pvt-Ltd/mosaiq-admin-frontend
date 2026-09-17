import { describe, expect, it } from "vitest";

import {
  agencyTotals,
  filterAgencies,
  getAgency,
} from "@/features/agencies/view-model";

const baseFilters = {
  activity: "all" as const,
  currency: "all" as const,
  search: "",
  status: "all" as const,
  workspaces: "all" as const,
};

describe("agency view model", () => {
  it("stays aligned with the aggregate dashboard sample", () => {
    expect(agencyTotals).toEqual({
      active: 10,
      agencies: 12,
      users: 186,
      workspaces: 38,
    });
  });

  it("combines search and operational filters", () => {
    const matches = filterAgencies({
      ...baseFilters,
      currency: "USD",
      search: "anika",
      status: "active",
      workspaces: "six-plus",
    });

    expect(matches.map((agency) => agency.id)).toEqual(["agency_northstar"]);
  });

  it("returns semantic details and a true empty-workspace agency", () => {
    const agency = getAgency("agency_newbridge");

    expect(agency?.primaryContact.name).toBe("Zara Ahmed");
    expect(agency?.workspaceRecords).toEqual([]);
    expect(getAgency("missing")).toBeUndefined();
  });
});
