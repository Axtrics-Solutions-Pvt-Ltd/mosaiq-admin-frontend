import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, expect, it, vi } from "vitest";

import { Toaster } from "@/components/ui/Toast";
import { userPaths, workspacePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { UserEditForm } from "./UserEditForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
afterEach(cleanup);

function workspace(id: number, clientId: number, name: string) {
  return {
    id,
    agency_id: 12,
    client_id: clientId,
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

const manager = {
  id: 5,
  name: "Morgan Manager",
  email: "morgan@example.test",
  status: "active",
  agency_id: 12,
  membership_status: "active",
  role_code: "MANAGER",
  client_id: null,
  workspace_ids: [10],
  pending_workspace_ids: [11],
  client_ids: [4],
  pending_client_ids: [],
  access: [
    {
      client_id: 4,
      client_name: "Acme Client",
      all_workspaces: true,
      workspace_ids: [],
      pending_all_workspaces: false,
      pending_workspace_ids: [],
    },
    {
      client_id: 7,
      client_name: "Globex",
      all_workspaces: false,
      workspace_ids: [10],
      pending_all_workspaces: false,
      pending_workspace_ids: [11],
    },
  ],
  invited_at: null,
  accepted_at: null,
};

function mockManager(onUpdate: (body: unknown) => void) {
  server.use(
    http.get(userPaths.detail(12, 5), () =>
      HttpResponse.json({ data: manager }),
    ),
    http.put(userPaths.detail(12, 5), async ({ request }) => {
      onUpdate(await request.json());
      return HttpResponse.json({ data: manager });
    }),
    http.get(workspacePaths.agencyCollection(12), () =>
      HttpResponse.json({
        data: [workspace(10, 7, "Design")],
        meta: { current_page: 1, last_page: 1, total: 1 },
      }),
    ),
    http.get(workspacePaths.clients(12), () =>
      HttpResponse.json({
        data: [
          {
            id: 4,
            agency_id: 12,
            name: "Acme Client",
            status: "active",
            workspaces: [workspace(9, 4, "Marketing")],
            created_at: null,
            updated_at: null,
          },
          {
            id: 7,
            agency_id: 12,
            name: "Globex",
            status: "active",
            workspaces: [
              workspace(10, 7, "Design"),
              workspace(11, 7, "Engineering"),
              workspace(12, 7, "HR"),
            ],
            created_at: null,
            updated_at: null,
          },
        ],
        meta: { current_page: 1, last_page: 1, total: 2 },
      }),
    ),
  );
}

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <UserEditForm agencyId={12} userId={5} />
      <Toaster />
    </QueryClientProvider>,
  );
}

it("shows a Manager's clients and saves the changed access as clients", async () => {
  const user = userEvent.setup();
  let received: unknown;
  mockManager((body) => {
    received = body;
  });
  renderForm();

  const acme = await screen.findByRole("checkbox", { name: "Acme Client" });
  expect(acme).toBeChecked();
  const globex = screen.getByRole("checkbox", { name: "Globex" });
  expect(globex).toHaveAttribute("aria-checked", "mixed");
  expect(screen.getByRole("checkbox", { name: /Engineering/ })).toBeChecked();
  expect(
    within(
      screen.getByRole("checkbox", { name: /Engineering/ }).closest("label")!,
    ).getByText("Invite pending"),
  ).toBeVisible();

  await user.click(acme);
  await user.click(screen.getByRole("checkbox", { name: "HR" }));
  expect(
    screen.getByText(/Removed access is revoked as soon as you save/),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Save changes" }));

  await vi.waitFor(() => expect(received).toBeDefined());
  expect(received).toEqual({
    name: "Morgan Manager",
    role_code: "MANAGER",
    client_id: null,
    status: "active",
    clients: [
      { client_id: 7, all_workspaces: false, workspace_ids: [10, 11, 12] },
    ],
  });
  expect(push).toHaveBeenCalledWith("/users/5?agency=12");
});

it("does not send clients when a Manager's access is unchanged", async () => {
  const user = userEvent.setup();
  let received: unknown;
  mockManager((body) => {
    received = body;
  });
  renderForm();

  await screen.findByRole("checkbox", { name: "Acme Client" });
  await user.clear(screen.getByRole("textbox", { name: /Name/ }));
  await user.type(screen.getByRole("textbox", { name: /Name/ }), "Morgan M");
  await user.click(screen.getByRole("button", { name: "Save changes" }));

  await vi.waitFor(() => expect(received).toBeDefined());
  expect(received).toEqual({
    name: "Morgan M",
    role_code: "MANAGER",
    client_id: null,
    status: "active",
  });
});

it("requires at least one client for a Manager", async () => {
  const user = userEvent.setup();
  let received: unknown;
  mockManager((body) => {
    received = body;
  });
  renderForm();

  await user.click(
    await screen.findByRole("checkbox", { name: "Acme Client" }),
  );
  await user.click(screen.getByRole("checkbox", { name: "Design" }));
  await user.click(screen.getByRole("checkbox", { name: /Engineering/ }));
  await user.click(screen.getByRole("button", { name: "Save changes" }));

  expect(
    await screen.findByText("Choose at least one client for this Manager."),
  ).toBeVisible();
  expect(received).toBeUndefined();
});

it("lists a selected client missing from the tree so it can be removed", async () => {
  const user = userEvent.setup();
  let received: unknown;
  mockManager((body) => {
    received = body;
  });
  server.use(
    http.get(userPaths.detail(12, 5), () =>
      HttpResponse.json({
        data: {
          ...manager,
          access: [
            ...manager.access,
            {
              client_id: 8,
              client_name: "Retired Client",
              all_workspaces: false,
              workspace_ids: [30],
              pending_all_workspaces: false,
              pending_workspace_ids: [],
            },
          ],
        },
      }),
    ),
  );
  renderForm();

  const others = await screen.findByRole("list", {
    name: "Other selected clients",
  });
  expect(others).toHaveTextContent("Retired Client · 1 workspace");
  await user.click(
    within(others).getByRole("button", { name: "Remove Retired Client" }),
  );
  await user.click(screen.getByRole("button", { name: "Save changes" }));

  await vi.waitFor(() => expect(received).toBeDefined());
  expect(received).toMatchObject({
    clients: [
      { client_id: 4, all_workspaces: true },
      { client_id: 7, all_workspaces: false, workspace_ids: [10, 11] },
    ],
  });
});
