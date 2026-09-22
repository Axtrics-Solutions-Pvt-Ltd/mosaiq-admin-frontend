import { fireEvent, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";

import { agencyPaths, userPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { UserDirectory } from "./UserDirectory";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

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

it("lists an accepted user for an Agency Admin's own agency", async () => {
  let requestedPath = "";
  server.use(
    http.get(userPaths.collection(12), ({ request }) => {
      requestedPath = new URL(request.url).pathname;
      return HttpResponse.json({
        data: [
          {
            id: 34,
            name: "New Person",
            email: "new.user@example.test",
            status: "active",
            agency_id: 12,
            membership_status: "active",
            role_code: "CLIENT_USER",
            client_id: 4,
            workspace_ids: [9, 10],
            invited_at: "2026-09-01T10:00:00Z",
            accepted_at: "2026-09-02T10:00:00Z",
          },
        ],
        meta: { current_page: 1, last_page: 1, total: 1 },
      });
    }),
  );
  renderWithScope(<UserDirectory page={1} role="all" search="" status="all" />, {
    membership: { agencyId: 12, roleCode: "AGENCY_ADMIN" },
  });
  expect(
    (await screen.findAllByText("new.user@example.test"))[0],
  ).toBeVisible();
  expect(screen.getAllByText("Client User")[0]).toBeVisible();
  expect(screen.getAllByLabelText("Status: Active")[0]).toBeVisible();
  expect(requestedPath).toBe("/api/v1/agencies/12/users");
});

it("lets a Super Admin filter users to a single agency from the page", async () => {
  let requestedPath = "";
  server.use(
    http.get(agencyPaths.collection, () => HttpResponse.json(agenciesResponse)),
    http.get(userPaths.allCollection, () =>
      HttpResponse.json({
        data: [
          {
            id: 90,
            name: "All Agencies Person",
            email: "all.agencies@example.test",
            status: "active",
            agency_id: 1,
            membership_status: "active",
            role_code: "AGENCY_ADMIN",
            client_id: null,
            workspace_ids: [],
            invited_at: null,
            accepted_at: "2026-09-01T10:00:00Z",
          },
        ],
        meta: { current_page: 1, last_page: 1, total: 1 },
      }),
    ),
    http.get(userPaths.collection(1), ({ request }) => {
      requestedPath = new URL(request.url).pathname;
      return HttpResponse.json({
        data: [
          {
            id: 91,
            name: "Scoped Person",
            email: "scoped@example.test",
            status: "active",
            agency_id: 1,
            membership_status: "active",
            role_code: "AGENCY_ADMIN",
            client_id: null,
            workspace_ids: [],
            invited_at: null,
            accepted_at: "2026-09-01T10:00:00Z",
          },
        ],
        meta: { current_page: 1, last_page: 1, total: 1 },
      });
    }),
  );
  renderWithScope(<UserDirectory page={1} role="all" search="" status="all" />, {
    platformRoleCode: "SUPER_ADMIN",
  });
  expect(
    (await screen.findAllByText("all.agencies@example.test"))[0],
  ).toBeVisible();
  fireEvent.change(await screen.findByLabelText("Agency"), {
    target: { value: "1" },
  });
  expect(
    (await screen.findAllByText("scoped@example.test"))[0],
  ).toBeVisible();
  expect(requestedPath).toBe("/api/v1/agencies/1/users");
});
