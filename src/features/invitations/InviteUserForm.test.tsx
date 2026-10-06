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
    http.get(workspacePaths.clients(12), ({ request }) => {
      const include = new URL(request.url).searchParams.get("include");
      return HttpResponse.json({
        data: [
          {
            id: 4,
            agency_id: 12,
            name: "Acme Client",
            status: "active",
            ...(include === "workspaces"
              ? {
                  workspaces: [
                    workspace(9, "Reporting"),
                    workspace(10, "Marketing"),
                  ],
                }
              : {}),
            created_at: null,
            updated_at: null,
          },
        ],
        meta: { current_page: 1, last_page: 1, total: 1 },
      });
    }),
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

async function chooseReportingOnly(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole("checkbox", { name: "Acme Client" }),
  );
  // Unticking All workspaces keeps every listed workspace, so one can be removed.
  await user.click(screen.getByRole("checkbox", { name: /^All channels/ }));
  await user.click(screen.getByRole("checkbox", { name: "Marketing" }));
}

it("lets an Agency Admin invite a Manager to chosen channels of a client", async () => {
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
    await screen.findByText("Choose at least one client for this Manager."),
  ).toBeVisible();
  expect(received).toBeUndefined();

  await chooseReportingOnly(user);
  expect(
    document.querySelector("#invite-clients [aria-live=polite]"),
  ).toHaveTextContent("1 client · 1 channel");
  await user.click(screen.getByRole("button", { name: "Send invitation" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Invitation emailed to manager@example.test.",
  );
  expect(received).toEqual({
    email: "manager@example.test",
    role_code: "MANAGER",
    clients: [{ client_id: 4, all_workspaces: false, workspace_ids: [9] }],
  });
  expect(push).toHaveBeenCalledWith("/users/invitations?agency=12");
});

it("invites a Manager to all channels of a client by ticking the client", async () => {
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

  await user.type(
    screen.getByRole("textbox", { name: /Email/ }),
    "whole@example.test",
  );
  await user.click(
    await screen.findByRole("checkbox", { name: "Acme Client" }),
  );
  expect(screen.getByRole("checkbox", { name: "Reporting" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Reporting" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Send invitation" }));

  expect(
    await screen.findByText("Invitation emailed to whole@example.test."),
  ).toBeVisible();
  expect(received).toEqual({
    email: "whole@example.test",
    role_code: "MANAGER",
    clients: [{ client_id: 4, all_workspaces: true }],
  });
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

it("shows already-pending channels on conflict and resubmits only the creatable ones", async () => {
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
            message: "Some channels already have a pending invitation.",
            error_code: "INVITATION_ALREADY_PENDING",
            request_id: "req-1",
            already_pending: [
              {
                workspace_id: 9,
                workspace_name: "Reporting",
                client_id: 4,
                invitation_id: 55,
                sent_at: "2026-09-01T00:00:00Z",
                expires_at: "2026-09-08T00:00:00Z",
              },
            ],
            creatable: [
              { workspace_id: 10, workspace_name: "Marketing", client_id: 4 },
            ],
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
  await user.click(
    await screen.findByRole("checkbox", { name: "Acme Client" }),
  );
  await user.click(screen.getByRole("checkbox", { name: /^All channels/ }));
  await user.click(screen.getByRole("button", { name: "Send invitation" }));

  expect(
    await screen.findByText("Some channels already have a pending invitation"),
  ).toBeVisible();
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("Reporting")).toBeVisible();
  expect(within(dialog).getByText("Marketing")).toBeVisible();

  await user.click(
    screen.getByRole("button", { name: "Send to the remaining 1 channel" }),
  );

  await vi.waitFor(() =>
    expect(push).toHaveBeenCalledWith("/users/invitations?agency=12"),
  );
  expect(receivedBodies).toHaveLength(2);
  expect(receivedBodies[0]).toEqual({
    email: "conflict@example.test",
    role_code: "MANAGER",
    clients: [{ client_id: 4, all_workspaces: false, workspace_ids: [9, 10] }],
  });
  expect(receivedBodies[1]).toEqual({
    email: "conflict@example.test",
    role_code: "MANAGER",
    clients: [{ client_id: 4, all_workspaces: false, workspace_ids: [10] }],
  });
});
