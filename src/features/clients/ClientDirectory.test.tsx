import { cleanup, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { agencyPaths, clientPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { ClientDirectory } from "./ClientDirectory";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(cleanup);

const agenciesResponse = {
  data: [
    {
      id: 1,
      display_name: "Northstar Digital",
      logo_url: null,
      primary_admin: null,
      workspace_count: 1,
      user_count: 1,
      default_currency: "USD",
      status: "active",
      created_at: null,
      last_activity_at: null,
    },
  ],
  meta: {
    current_page: 1,
    last_page: 1,
    total: 1,
    summary: {
      total_agencies: 1,
      active_agencies: 1,
      total_workspaces: 1,
      total_agency_users: 1,
    },
  },
};

const baseFilters = {
  search: "",
  status: "all" as const,
  agency: undefined,
  page: 1,
};

describe("ClientDirectory", () => {
  it("shows a loading state before results arrive", () => {
    server.use(
      http.get(agencyPaths.collection, () =>
        HttpResponse.json(agenciesResponse),
      ),
      http.get(clientPaths.allCollection, () =>
        HttpResponse.json({
          data: [],
          meta: { current_page: 1, last_page: 1, total: 0 },
        }),
      ),
    );
    renderWithScope(<ClientDirectory filters={baseFilters} />, {
      platformRoleCode: "SUPER_ADMIN",
    });
    expect(screen.getByText("Loading clients...")).toBeVisible();
  });

  it("shows an error state when the client list request fails", async () => {
    server.use(
      http.get(agencyPaths.collection, () =>
        HttpResponse.json(agenciesResponse),
      ),
      http.get(clientPaths.allCollection, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    );
    renderWithScope(<ClientDirectory filters={baseFilters} />, {
      platformRoleCode: "SUPER_ADMIN",
    });
    expect(await screen.findByText("Clients unavailable")).toBeVisible();
  });

  it("shows the empty state when there are no clients", async () => {
    server.use(
      http.get(agencyPaths.collection, () =>
        HttpResponse.json(agenciesResponse),
      ),
      http.get(clientPaths.allCollection, () =>
        HttpResponse.json({
          data: [],
          meta: { current_page: 1, last_page: 1, total: 0 },
        }),
      ),
    );
    renderWithScope(<ClientDirectory filters={baseFilters} />, {
      platformRoleCode: "SUPER_ADMIN",
    });
    expect(await screen.findByText("No clients yet")).toBeVisible();
  });

  it("lists clients across all agencies for a Super Admin with the All Agencies scope", async () => {
    server.use(
      http.get(agencyPaths.collection, () =>
        HttpResponse.json(agenciesResponse),
      ),
      http.get(clientPaths.allCollection, () =>
        HttpResponse.json({
          data: [
            {
              id: 20,
              agency_id: 1,
              name: "Northstar Client",
              status: "active",
              workspace_count: 2,
              created_at: "2026-09-01T10:00:00Z",
              updated_at: null,
            },
          ],
          meta: { current_page: 1, last_page: 1, total: 1 },
        }),
      ),
    );
    renderWithScope(<ClientDirectory filters={baseFilters} />, {
      platformRoleCode: "SUPER_ADMIN",
    });
    expect((await screen.findAllByText("Northstar Client"))[0]).toBeVisible();
    expect(screen.getAllByText("Northstar Digital")[0]).toBeVisible();
  });
});
