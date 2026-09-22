import { cleanup, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, expect, it, vi } from "vitest";

import { agencyPaths, workspacePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { WorkspaceCreateScreen } from "./WorkspaceForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(cleanup);

it("offers an inline Add client affordance instead of an empty picker when the agency has zero clients", async () => {
  server.use(
    http.get(agencyPaths.collection, () =>
      HttpResponse.json({
        data: [
          {
            id: 1,
            display_name: "Northstar Digital",
            logo_url: null,
            primary_admin: null,
            workspace_count: 0,
            user_count: 0,
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
            total_workspaces: 0,
            total_agency_users: 0,
          },
        },
      }),
    ),
    http.get(workspacePaths.clients(1), () =>
      HttpResponse.json({
        data: [],
        meta: { current_page: 1, last_page: 1, total: 0 },
      }),
    ),
  );
  renderWithScope(
    <WorkspaceCreateScreen agencyId={1} clientId={0} />,
    { platformRoleCode: "SUPER_ADMIN" },
  );
  const links = await screen.findAllByRole("link", { name: "Add client" });
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) {
    expect(link).toHaveAttribute("href", "/clients/new?agency=1");
  }
  expect(
    screen.getAllByText("This agency has no clients yet", { exact: false })[0],
  ).toBeVisible();
});
