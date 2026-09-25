import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { reportPaths, workspacePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { ReportDirectory } from "./ReportDirectory";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/reports",
  useSearchParams: () => new URLSearchParams(),
}));

function report(overrides: Record<string, unknown>) {
  return {
    id: 9,
    agency_id: 2,
    client_id: 4,
    client: { id: 4, name: "Acme" },
    name: "Acme monthly",
    status: "active",
    currency: "GBP",
    timezone: "Europe/London",
    default_range_preset: "last_30_days",
    layout_version: 1,
    active_links_count: 3,
    workspaces: [],
    created_by: null,
    updated_by: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

describe("ReportDirectory active links", () => {
  it("links the active count to the Links tab and explains archived reports", async () => {
    server.use(
      http.get(workspacePaths.clients(2), () =>
        HttpResponse.json({
          data: [
            {
              id: 4,
              agency_id: 2,
              name: "Acme",
              status: "active",
              workspace_count: 1,
              created_at: null,
              updated_at: null,
            },
          ],
          meta: { current_page: 1, last_page: 1, total: 1 },
        }),
      ),
      http.get(reportPaths.collection(2, 4), () =>
        HttpResponse.json({
          data: [
            report({}),
            report({
              id: 10,
              name: "Acme archive",
              status: "archived",
              active_links_count: 0,
            }),
          ],
          meta: { current_page: 1, last_page: 1, total: 2 },
        }),
      ),
    );
    renderWithScope(
      <ReportDirectory
        filters={{
          agencyId: 2,
          clientId: 4,
          search: "",
          status: "all",
          page: 1,
        }}
      />,
      { membership: { agencyId: 2, roleCode: "AGENCY_ADMIN" } },
    );

    const table = await screen.findByRole("table", { name: "Reports" });
    expect(
      within(table).getByRole("columnheader", { name: "Active links" }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("link", {
        name: "3 active links for Acme monthly",
      }),
    ).toHaveAttribute("href", "/reports/9/links?agency=2&client=4");
    expect(within(table).getByText("Paused while archived")).toBeVisible();
  });
});
