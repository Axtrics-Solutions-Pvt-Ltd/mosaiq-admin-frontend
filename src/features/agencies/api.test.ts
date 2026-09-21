import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { agencyPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { createAgency, listAgencies, updateAgency } from "./api";
import type { AgencyProfile } from "./contracts";

const profile: AgencyProfile = {
  display_name: "Northstar",
  legal_name: null,
  description: null,
  website: null,
  status: "active",
  brand_color: null,
  primary_contact: { name: null, email: null, phone: null, job_title: null },
  defaults: {
    currency: "USD",
    time_zone: "Europe/London",
    language: "English (UK)",
    reporting_week_start: "monday",
    date_format: "DD MMM YYYY",
  },
};
const record = {
  id: 12,
  display_name: "Northstar",
  legal_name: null,
  description: null,
  website: null,
  status: "active",
  logo_url: null,
  brand_color: null,
  created_at: "2026-09-18T10:00:00Z",
  primary_contact: profile.primary_contact,
  defaults: profile.defaults,
  workspace_count: 0,
  user_count: 0,
  workspaces: [],
  administrators: [],
  recent_activity: [],
};

describe("agency API", () => {
  it("sends documented list filters and reads pagination totals", async () => {
    let query = "";
    server.use(
      http.get(agencyPaths.collection, ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json({
          data: [
            {
              id: 12,
              display_name: "Northstar",
              logo_url: null,
              primary_admin: null,
              workspace_count: 0,
              user_count: 0,
              default_currency: "USD",
              status: "active",
              created_at: "2026-09-18T10:00:00Z",
              last_activity_at: null,
            },
          ],
          meta: {
            current_page: 2,
            last_page: 3,
            total: 41,
            summary: {
              total_agencies: 41,
              active_agencies: 30,
              total_workspaces: 72,
              total_agency_users: 18,
            },
          },
        });
      }),
    );
    const response = await listAgencies({
      search: "North",
      status: "active",
      page: 2,
    });
    expect(new URLSearchParams(query)).toMatchObject({});
    expect(query).toContain("search=North");
    expect(query).toContain("status=active");
    expect(query).toContain("page=2");
    expect(response.meta.summary.total_agencies).toBe(41);
    expect(response.data[0]?.id).toBe(12);
  });

  it("posts the agency profile and updates the existing ID with PUT", async () => {
    const calls: { method: string; url: string; body: unknown }[] = [];
    server.use(
      http.post(agencyPaths.collection, async ({ request }) => {
        calls.push({
          method: request.method,
          url: request.url,
          body: await request.json(),
        });
        return HttpResponse.json({ data: record }, { status: 201 });
      }),
      http.put(agencyPaths.detail(12), async ({ request }) => {
        calls.push({
          method: request.method,
          url: request.url,
          body: await request.json(),
        });
        return HttpResponse.json({ data: { ...record, status: "inactive" } });
      }),
    );
    expect((await createAgency(profile)).id).toBe(12);
    expect(
      (await updateAgency(12, { ...profile, status: "inactive" })).status,
    ).toBe("inactive");
    expect(calls.map((call) => call.method)).toEqual(["POST", "PUT"]);
    expect(calls[0]?.body).toEqual(profile);
    expect(calls[1]?.url).toContain("/api/v1/agencies/12");
  });

  it("keeps Laravel field errors available to the form", async () => {
    server.use(
      http.post(agencyPaths.collection, () =>
        HttpResponse.json(
          {
            message: "Raw validation details",
            errors: {
              "primary_contact.email": ["Enter a valid email address."],
            },
          },
          { status: 422 },
        ),
      ),
    );
    await expect(createAgency(profile)).rejects.toMatchObject({
      status: 422,
      fieldErrors: { "primary_contact.email": "Enter a valid email address." },
    });
  });
});
