import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";

import { authKeys } from "@/features/auth/queries";
import { invitationPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { InvitationDirectory } from "./InvitationDirectory";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

it("lists pending invitations for an Agency Admin's own agency", async () => {
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
    http.get(invitationPaths.collection(12), ({ request }) => {
      requestedPath = new URL(request.url).pathname;
      return HttpResponse.json({
        data: [
          {
            id: 34,
            email: "new.user@example.test",
            agency_id: 12,
            client_id: 4,
            role_code: "CLIENT_USER",
            workspace_ids: [9, 10],
            expires_at: "2026-09-28T10:00:00Z",
            accepted_at: null,
            revoked_at: null,
          },
        ],
        meta: { current_page: 1, last_page: 1, total: 1 },
      });
    }),
  );
  render(
    <QueryClientProvider client={queryClient}>
      <InvitationDirectory page={1} requestedAgencyId={99} />
    </QueryClientProvider>,
  );
  expect(
    (await screen.findAllByText("new.user@example.test"))[0],
  ).toBeVisible();
  expect(screen.getAllByText("Client User")[0]).toBeVisible();
  expect(screen.getAllByText("2 workspaces")[0]).toBeVisible();
  expect(requestedPath).toBe("/api/v1/admin/agencies/12/invitations");
});
