import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeAll, expect, it, vi } from "vitest";

import { Toaster } from "@/components/ui/Toast";
import { authKeys } from "@/features/auth/queries";
import { invitationPaths, workspacePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { InviteUserForm } from "./InviteUserForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(cleanup);

const agencyAdmin = {
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
};

function workspace(id: number, name: string) {
  return {
    id,
    agency_id: 12,
    client_id: 4,
    name,
    timezone: "UTC",
    currency: "USD",
    status: "active",
    invite_status: null,
    invite_status_reason: null,
    created_at: null,
    updated_at: null,
  };
}

function mockAgencyScope() {
  server.use(
    http.get(workspacePaths.clients(12), () =>
      HttpResponse.json({
        data: [
          {
            id: 4,
            agency_id: 12,
            name: "Acme Client",
            status: "active",
            created_at: null,
            updated_at: null,
          },
        ],
        meta: { current_page: 1, last_page: 1, total: 1 },
      }),
    ),
    http.get(workspacePaths.collection(12, 4), () =>
      HttpResponse.json({
        data: [workspace(9, "Reporting"), workspace(10, "Marketing")],
        meta: { current_page: 1, last_page: 1, total: 2 },
      }),
    ),
  );
}

function renderForm(currentUser: unknown) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(authKeys.me(), currentUser);
  return render(
    <QueryClientProvider client={queryClient}>
      <InviteUserForm />
      <Toaster />
    </QueryClientProvider>,
  );
}

async function chooseWorkspaces(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Workspace client" }));
  await user.click(await screen.findByRole("option", { name: /Acme Client/ }));
  await user.click(screen.getByRole("button", { name: "Workspace access" }));
  await user.click(await screen.findByRole("option", { name: /Reporting/ }));
  await user.click(screen.getByRole("option", { name: /Marketing/ }));
}

it("lets an Agency Admin invite only Managers, scoped to workspaces", async () => {
  const user = userEvent.setup();
  let received: unknown;
  mockAgencyScope();
  server.use(
    http.post(invitationPaths.collection(12), async ({ request }) => {
      received = await request.json();
      return new HttpResponse(null, { status: 201 });
    }),
  );
  renderForm(agencyAdmin);

  expect(
    screen.queryByRole("combobox", { name: /Role/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Role:").parentElement).toHaveTextContent(
    "Role: Manager",
  );
  await user.type(
    screen.getByRole("textbox", { name: /Email/ }),
    "manager@example.test",
  );
  await user.click(screen.getByRole("button", { name: "Send invitation" }));
  expect(
    await screen.findByText("Choose a client to select workspaces."),
  ).toBeVisible();
  expect(
    screen.getByText("Choose at least one workspace for this user."),
  ).toBeVisible();
  expect(received).toBeUndefined();

  await chooseWorkspaces(user);
  await user.click(screen.getByRole("button", { name: "Send invitation" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Invitation emailed to manager@example.test.",
  );
  expect(received).toEqual({
    email: "manager@example.test",
    role_code: "MANAGER",
    workspace_ids: [9, 10],
  });
  expect(push).toHaveBeenCalledWith("/users/invitations?agency=12");
});

it("offers a Super Admin only the Agency Admin and Manager roles", () => {
  renderForm({
    id: 1,
    name: "Super Admin",
    email: "super@example.test",
    platformRoleCode: "SUPER_ADMIN",
    membership: null,
  });
  const roleSelect = screen.getByRole("combobox", { name: /Role/ });
  expect(
    within(roleSelect)
      .getAllByRole("option")
      .map((option) => option.textContent),
  ).toEqual(["Agency Admin", "Manager"]);
  expect(roleSelect).toHaveValue("MANAGER");
});

it("shows already-pending workspaces on conflict and resubmits only the creatable ones", async () => {
  const user = userEvent.setup();
  const receivedBodies: unknown[] = [];
  let requestCount = 0;
  mockAgencyScope();
  server.use(
    http.post(invitationPaths.collection(12), async ({ request }) => {
      receivedBodies.push(await request.json());
      requestCount += 1;
      if (requestCount === 1) {
        return HttpResponse.json(
          {
            message: "Some workspaces already have a pending invitation.",
            error_code: "INVITATION_ALREADY_PENDING",
            request_id: "req-1",
            already_pending: [
              {
                workspace_id: 9,
                workspace_name: "Reporting",
                invitation_id: 55,
                sent_at: "2026-09-01T00:00:00Z",
                expires_at: "2026-09-08T00:00:00Z",
              },
            ],
            creatable: [{ workspace_id: 10, workspace_name: "Marketing" }],
          },
          { status: 409 },
        );
      }
      return new HttpResponse(null, { status: 201 });
    }),
  );
  renderForm(agencyAdmin);
  await user.type(
    screen.getByRole("textbox", { name: /Email/ }),
    "conflict@example.test",
  );
  await chooseWorkspaces(user);
  await user.click(screen.getByRole("button", { name: "Send invitation" }));

  expect(
    await screen.findByText(
      "Some workspaces already have a pending invitation",
    ),
  ).toBeVisible();
  expect(screen.getByText("Reporting")).toBeVisible();
  expect(screen.getByText("Marketing")).toBeVisible();

  await user.click(
    screen.getByRole("button", { name: "Send to the remaining 1 workspace" }),
  );

  await vi.waitFor(() =>
    expect(push).toHaveBeenCalledWith("/users/invitations?agency=12"),
  );
  expect(receivedBodies).toHaveLength(2);
  expect(receivedBodies[1]).toEqual({
    email: "conflict@example.test",
    role_code: "MANAGER",
    workspace_ids: [10],
  });
});
