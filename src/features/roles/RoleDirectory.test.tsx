import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, expect, it } from "vitest";

import { authKeys } from "@/features/auth/queries";
import { rolePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { RoleDirectory } from "./RoleDirectory";

afterEach(cleanup);

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
  const table = await screen.findByRole("table", {
    name: "Roles and the permissions each one grants",
  });
  expect(
    within(table).getByRole("columnheader", { name: "Manage users" }),
  ).toBeVisible();
  const row = within(table).getByRole("row", { name: /Agency Admin/ });
  expect(within(row).getAllByText("Granted")).toHaveLength(2);
  expect(
    within(table).queryByRole("columnheader", { name: "Create agencies" }),
  ).not.toBeInTheDocument();
});

it("shows only Agency Admin and Manager, each linked to the admin portal", async () => {
  server.use(
    http.get(rolePaths.collection, () =>
      HttpResponse.json({
        data: [
          {
            code: "SUPER_ADMIN",
            name: "Super Admin",
            assignable: false,
            permissions: [],
          },
          {
            code: "AGENCY_ADMIN",
            name: "Agency Admin",
            assignable: true,
            permissions: ["dashboard_view"],
          },
          {
            code: "MANAGER",
            name: "Manager",
            assignable: true,
            permissions: ["dashboard_view"],
          },
          {
            code: "ANALYST",
            name: "Analyst",
            assignable: true,
            permissions: ["dashboard_view"],
          },
          {
            code: "CLIENT_USER",
            name: "Client Viewer",
            assignable: true,
            permissions: ["dashboard_view"],
          },
        ],
      }),
    ),
  );
  renderWithUser({ platformRoleCode: "SUPER_ADMIN", membership: null });
  const table = await screen.findByRole("table", {
    name: "Roles and the permissions each one grants",
  });
  const rows = within(table).getAllByRole("row").slice(1);
  expect(rows).toHaveLength(2);
  expect(screen.getByText("2 fixed roles")).toBeVisible();
  for (const name of [/Agency Admin/, /Manager/]) {
    const row = within(table).getByRole("row", { name });
    expect(
      within(row).getByRole("link", { name: /Admin Portal/ }),
    ).toHaveAttribute("href", "https://mosaiq-admin-frontend.vercel.app");
  }
  expect(
    within(table).queryByRole("columnheader", { name: "Upload CSV?" }),
  ).not.toBeInTheDocument();
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
