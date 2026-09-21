import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { useState } from "react";
import { beforeAll, expect, it } from "vitest";

import { agencyPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { AgencyCombobox, type AgencyOption } from "./AgencyCombobox";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

const summary = {
  total_agencies: 2,
  active_agencies: 1,
  total_workspaces: 0,
  total_agency_users: 0,
};

function listRecord(
  id: number,
  displayName: string,
  status: "active" | "inactive",
) {
  return {
    id,
    display_name: displayName,
    logo_url: null,
    primary_admin: null,
    workspace_count: 0,
    user_count: 0,
    default_currency: "USD",
    status,
    created_at: null,
    last_activity_at: null,
  };
}

function Harness() {
  const [value, setValue] = useState<AgencyOption>();
  return (
    <>
      <label htmlFor="agency-selector">Agency</label>
      <AgencyCombobox id="agency-selector" onChange={setValue} value={value} />
    </>
  );
}

it("loads agencies 40 at a time and quick-creates a selected agency", async () => {
  const user = userEvent.setup();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const requestedPages: string[] = [];
  let createdBody: unknown;
  server.use(
    http.get(agencyPaths.collection, ({ request }) => {
      const query = new URL(request.url).searchParams;
      requestedPages.push(query.toString());
      const page = Number(query.get("page"));
      return HttpResponse.json({
        data:
          page === 2
            ? [listRecord(13, "Blue Horizon", "active")]
            : [listRecord(12, "Northstar", "inactive")],
        meta: {
          current_page: page,
          last_page: 2,
          total: 2,
          summary,
        },
      });
    }),
    http.post(agencyPaths.collection, async ({ request }) => {
      createdBody = await request.json();
      return HttpResponse.json(
        {
          data: {
            id: 14,
            display_name: "Fresh Agency",
            legal_name: null,
            description: null,
            website: null,
            status: "active",
            logo_url: null,
            brand_color: null,
            created_at: null,
            primary_contact: {
              name: null,
              email: null,
              phone: null,
              job_title: null,
            },
            defaults: {
              currency: "USD",
              time_zone: "UTC",
              language: "en",
              reporting_week_start: "monday",
              date_format: "YYYY-MM-DD",
            },
            workspace_count: 0,
            user_count: 0,
            workspaces: [],
            administrators: [],
            recent_activity: [],
          },
        },
        { status: 201 },
      );
    }),
  );
  render(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>,
  );

  await user.click(screen.getByRole("button", { name: "Agency" }));
  expect(await screen.findByText("Northstar")).toBeVisible();
  expect(screen.getByText("Inactive")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Load more" }));
  expect(await screen.findByText("Blue Horizon")).toBeVisible();
  expect(screen.getByText("Active")).toBeVisible();
  expect(requestedPages).toEqual(
    expect.arrayContaining(["page=1&per_page=40", "page=2&per_page=40"]),
  );
  await user.type(screen.getByPlaceholderText("Search agency name"), "North");
  await waitFor(() =>
    expect(
      requestedPages.some((query) =>
        query.includes("search=North&page=1&per_page=40"),
      ),
    ).toBe(true),
  );

  await user.click(screen.getByRole("button", { name: /Add agency/ }));
  await user.type(
    screen.getByRole("textbox", { name: "Display name" }),
    "Fresh Agency",
  );
  await user.click(screen.getByRole("button", { name: "Create agency" }));
  expect(
    await screen.findByRole("button", { name: "Agency" }),
  ).toHaveTextContent("#14 Fresh Agency");
  expect(createdBody).toEqual({ display_name: "Fresh Agency" });
});
