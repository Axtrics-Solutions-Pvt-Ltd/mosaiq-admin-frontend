import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";

import { authKeys } from "@/features/auth/queries";
import { userPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { UserDirectory } from "./UserDirectory";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

it("lists an accepted user for an Agency Admin's own agency", async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(authKeys.me(), {
    id: 1,
    name: "Agency Admin",
    email: "admin@example.test",
    platformRoleCode: null,
    membership: {
      agencyId: 12,
      roleCode: "AGENCY_ADMIN",
      clientId: null,
      workspaceIds: [],
    },
  });
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
  render(
    <QueryClientProvider client={queryClient}>
      <UserDirectory page={1} role="all" search="" status="all" />
    </QueryClientProvider>,
  );
  expect(
    (await screen.findAllByText("new.user@example.test"))[0],
  ).toBeVisible();
  expect(screen.getAllByText("Client User")[0]).toBeVisible();
  expect(screen.getAllByLabelText("Status: Active")[0]).toBeVisible();
  expect(requestedPath).toBe("/api/v1/agencies/12/users");
});
