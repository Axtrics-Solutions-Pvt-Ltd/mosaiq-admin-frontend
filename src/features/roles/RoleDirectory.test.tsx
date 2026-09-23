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

it("links client users to the user portal and other roles to admin", async () => {
  server.use(
    http.get(rolePaths.collection, () =>
      HttpResponse.json({
        data: [
          {
            code: "AGENCY_ADMIN",
            name: "Agency Admin",
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
  const adminRow = within(table).getByRole("row", { name: /Agency Admin/ });
  expect(
    within(adminRow).getByRole("link", { name: /Admin Portal/ }),
  ).toHaveAttribute("href", "https://mosaiq-admin-frontend.vercel.app");
  const clientRow = within(table).getByRole("row", { name: /Client Viewer/ });
  expect(
    within(clientRow).getByRole("link", { name: /User Portal/ }),
  ).toHaveAttribute("href", "https://mosaiq-user-frontend.vercel.app");
});

it("shows CSV upload and import history access per role", async () => {
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
            permissions: [],
          },
          {
            code: "MANAGER",
            name: "Manager",
            assignable: true,
            permissions: [],
          },
          {
            code: "CLIENT_USER",
            name: "Client Viewer",
            assignable: true,
            permissions: [],
          },
        ],
      }),
    ),
  );
  renderWithUser({ platformRoleCode: "SUPER_ADMIN", membership: null });
  const table = await screen.findByRole("table", {
    name: "Roles and the permissions each one grants",
  });
  const cells = (name: RegExp) =>
    within(within(table).getByRole("row", { name }))
      .getAllByRole("cell")
      .map((cell) => cell.textContent);

  expect(cells(/Super Admin/)).toEqual(
    expect.arrayContaining(["Yes· All agencies"]),
  );
  expect(cells(/Agency Admin/)).toEqual(
    expect.arrayContaining(["Yes· Own agency"]),
  );
  expect(cells(/Manager/)).toEqual(
    expect.arrayContaining(["No", "Yes· Assigned workspaces"]),
  );
  expect(cells(/Client Viewer/)).toEqual(
    expect.arrayContaining(["No", "Hidden"]),
  );
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
