import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";

import { userPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { UserDirectory } from "./UserDirectory";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

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
