import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";

import { invitationPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { InvitationDirectory } from "./InvitationDirectory";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

it("lists pending invitations for an Agency Admin's own agency", async () => {
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
  renderWithScope(<InvitationDirectory page={1} status="all" />, {
    membership: { agencyId: 12, roleCode: "AGENCY_ADMIN" },
  });
  expect(
    (await screen.findAllByText("new.user@example.test"))[0],
  ).toBeVisible();
  expect(screen.getAllByText("Client User")[0]).toBeVisible();
  expect(screen.getAllByText("2 workspaces")[0]).toBeVisible();
  expect(requestedPath).toBe("/api/v1/admin/agencies/12/invitations");
});
