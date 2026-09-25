import { describe, expect, it } from "vitest";

import { agencyResponseSchema } from "./contracts";

const profile = {
  id: 9,
  display_name: "Axtrics",
  legal_name: null,
  description: null,
  website: null,
  status: "active",
  logo_url: null,
  brand_color: null,
  created_at: null,
  primary_contact: { name: null, email: null, phone: null, job_title: null },
  defaults: {
    currency: "USD",
    time_zone: "UTC",
    language: "en",
    reporting_week_start: "monday",
    date_format: "Y-m-d",
  },
};

describe("agency detail contract", () => {
  it("accepts the profile-only detail a Manager receives", () => {
    const agency = agencyResponseSchema.parse({ data: profile }).data;

    expect(agency.display_name).toBe("Axtrics");
    expect(agency.defaults.currency).toBe("USD");
    expect(agency.workspaces).toEqual([]);
    expect(agency.administrators).toEqual([]);
    expect(agency.recent_activity).toEqual([]);
  });
});
