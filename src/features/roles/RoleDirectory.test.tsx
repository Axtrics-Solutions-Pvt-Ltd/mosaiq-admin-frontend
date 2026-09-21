import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";

import { authKeys } from "@/features/auth/queries";
import { rolePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { RoleDirectory } from "./RoleDirectory";

function renderWithUser(user: {
  platformRoleCode: string | null;
  membership: { agencyId: number; roleCode: string } | null;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(authKeys.me(), {
    id: 1,
    name: "Test User",
    email: "user@example.test",
    platformRoleCode: user.platformRoleCode,
    membership: user.membership
      ? {
          agencyId: user.membership.agencyId,
          roleCode: user.membership.roleCode,
          clientId: null,
          workspaceIds: [],
        }
      : null,
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RoleDirectory />
    </QueryClientProvider>,
  );
}

it("lists fixed roles and their permissions for a Super Admin", async () => {
  server.use(
    http.get(rolePaths.collection, () =>
      HttpResponse.json({
        data: [
          {
            code: "AGENCY_ADMIN",
            name: "Agency Admin",
            assignable: true,
            permissions: ["agency_edit", "user_manage"],
          },
        ],
      }),
    ),
  );
  renderWithUser({ platformRoleCode: "SUPER_ADMIN", membership: null });
  expect(await screen.findByText("Agency Admin")).toBeVisible();
  expect(screen.getByText("Manage users")).toBeVisible();
});

it("hides roles from a user without admin access", async () => {
  renderWithUser({
    platformRoleCode: null,
    membership: { agencyId: 12, roleCode: "VIEWER" },
  });
  expect(
    await screen.findByText(
      "You do not have permission to view roles and permissions.",
    ),
  ).toBeVisible();
});
