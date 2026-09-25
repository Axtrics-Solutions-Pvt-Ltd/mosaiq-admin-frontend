import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, expect, it, vi } from "vitest";

import { agencyPaths, channelPaths, workspacePaths } from "@/lib/api/paths";
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
  renderWithScope(<WorkspaceCreateScreen agencyId={1} clientId={0} />, {
    platformRoleCode: "SUPER_ADMIN",
  });
  const links = await screen.findAllByRole("link", { name: "Add client" });
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) {
    expect(link).toHaveAttribute("href", "/clients/new?agency=1");
  }
  expect(
    screen.getAllByText("This agency has no clients yet", { exact: false })[0],
  ).toBeVisible();
});

function mockCreateScreenApi() {
  const created: unknown[] = [];
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
        data: [
          {
            id: 20,
            agency_id: 1,
            name: "Acme",
            status: "active",
            created_at: null,
            updated_at: null,
          },
        ],
        meta: { current_page: 1, last_page: 1, total: 1 },
      }),
    ),
    http.get(channelPaths.collection, () =>
      HttpResponse.json({
        data: [
          {
            id: 3,
            code: "meta_ads",
            name: "Meta Ads",
            category: "ads",
            is_active: true,
            credential_fields: [],
            metric_codes: ["spend"],
            supports_campaigns: true,
            position: 1,
          },
        ],
      }),
    ),
    http.post(workspacePaths.collection(1, 20), async ({ request }) => {
      created.push(await request.json());
      return HttpResponse.json({ message: "Stop here." }, { status: 500 });
    }),
  );
  return created;
}

it("requires a channel before creating a workspace", async () => {
  const created = mockCreateScreenApi();
  renderWithScope(<WorkspaceCreateScreen agencyId={1} clientId={20} />, {
    platformRoleCode: "SUPER_ADMIN",
  });
  await screen.findByRole("option", { name: "Meta Ads" });
  await userEvent.type(screen.getByLabelText(/Workspace name/), "Acme ads");
  await userEvent.click(
    screen.getByRole("button", { name: "Create workspace" }),
  );
  expect(await screen.findByText("Choose a channel.")).toBeVisible();
  expect(created).toEqual([]);
});

it("suggests the client and channel as the name and sends the channel", async () => {
  const created = mockCreateScreenApi();
  renderWithScope(<WorkspaceCreateScreen agencyId={1} clientId={20} />, {
    platformRoleCode: "SUPER_ADMIN",
  });
  await screen.findByRole("option", { name: "Meta Ads" });
  await userEvent.selectOptions(screen.getByLabelText(/Channel/), "Meta Ads");
  expect(screen.getByLabelText(/Workspace name/)).toHaveValue(
    "Acme – Meta Ads",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Create workspace" }),
  );
  await waitFor(() =>
    expect(created).toEqual([
      expect.objectContaining({ connector_id: 3, name: "Acme – Meta Ads" }),
    ]),
  );
});
