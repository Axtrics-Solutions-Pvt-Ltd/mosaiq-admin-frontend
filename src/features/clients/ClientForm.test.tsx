import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeAll, expect, it, vi } from "vitest";

import { authKeys } from "@/features/auth/queries";
import { agencyPaths, workspacePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { ClientCreateScreen } from "./ClientForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
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

function renderForAgencyAdmin(agencyId: number) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(authKeys.me(), {
    id: 1,
    name: "Agency Admin",
    email: "admin@example.test",
    platformRoleCode: null,
    membership: {
      agencyId,
      roleCode: "AGENCY_ADMIN",
      clientId: null,
      workspaceIds: [],
    },
  });
  server.use(
    http.get(agencyPaths.collection, () =>
      HttpResponse.json({
        data: [
          {
            id: agencyId,
            display_name: "Northstar Digital",
            logo_url: null,
            primary_admin: null,
            workspace_count: 0,
            user_count: 0,
            default_currency: "USD",
            status: "active",
            created_at: null,
            last_activity_at: null,
          },
        ],
        meta: {
          current_page: 1,
          last_page: 1,
          total: 1,
          summary: {
            total_agencies: 1,
            active_agencies: 1,
            total_workspaces: 0,
            total_agency_users: 0,
          },
        },
      }),
    ),
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <ClientCreateScreen agencyId={agencyId} />
    </QueryClientProvider>,
  );
}

it("requires a client name before submitting", async () => {
  const user = userEvent.setup();
  renderForAgencyAdmin(12);
  await user.click(await screen.findByRole("button", { name: "Create client" }));
  expect(await screen.findByText("Enter a client name.")).toBeVisible();
});

it("maps a server field error onto the name field", async () => {
  const user = userEvent.setup();
  server.use(
    http.post(workspacePaths.clients(12), () =>
      HttpResponse.json(
        { message: "Invalid client", errors: { name: ["Name already exists."] } },
        { status: 422 },
      ),
    ),
  );
  renderForAgencyAdmin(12);
  await user.type(
    await screen.findByLabelText(/Client name/),
    "Existing Client",
  );
  await user.click(screen.getByRole("button", { name: "Create client" }));
  expect(await screen.findByText("Name already exists.")).toBeVisible();
});

it("warns before discarding unsaved changes", async () => {
  const user = userEvent.setup();
  renderForAgencyAdmin(12);
  await user.type(await screen.findByLabelText(/Client name/), "Draft");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(await screen.findByText("Discard changes?")).toBeVisible();
});
