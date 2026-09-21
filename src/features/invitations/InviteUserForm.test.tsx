import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";

import { Toaster } from "@/components/ui/Toast";
import { authKeys } from "@/features/auth/queries";
import { invitationPaths, workspacePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { InviteUserForm } from "./InviteUserForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

it("locks Agency Admin to their agency and requires Client User scope before sending", async () => {
  const user = userEvent.setup();
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
  let received: unknown;
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
        data: [
          {
            id: 9,
            agency_id: 12,
            client_id: 4,
            name: "Reporting",
            timezone: "UTC",
            currency: "USD",
            status: "active",
            created_at: null,
            updated_at: null,
          },
          {
            id: 10,
            agency_id: 12,
            client_id: 4,
            name: "Marketing",
            timezone: "UTC",
            currency: "USD",
            status: "active",
            created_at: null,
            updated_at: null,
          },
        ],
        meta: { current_page: 1, last_page: 1, total: 2 },
      }),
    ),
    http.post(invitationPaths.collection(12), async ({ request }) => {
      received = await request.json();
      return new HttpResponse(null, { status: 201 });
    }),
  );
  render(
    <QueryClientProvider client={queryClient}>
      <InviteUserForm />
      <Toaster />
    </QueryClientProvider>,
  );
  expect(screen.queryByLabelText("Agency ID")).not.toBeInTheDocument();
  await user.type(
    screen.getByRole("textbox", { name: /Email/ }),
    "client@example.test",
  );
  await user.selectOptions(
    screen.getByRole("combobox", { name: /Role/ }),
    "CLIENT_USER",
  );
  await user.click(screen.getByRole("button", { name: "Send invitation" }));
  expect(
    await screen.findByText("Choose a client for this user."),
  ).toBeVisible();
  expect(received).toBeUndefined();
  await user.click(screen.getByRole("button", { name: "Client" }));
  await user.click(await screen.findByRole("option", { name: /Acme Client/ }));
  await user.click(screen.getByRole("button", { name: "Workspace access" }));
  await user.click(await screen.findByRole("option", { name: /Reporting/ }));
  await user.click(screen.getByRole("option", { name: /Marketing/ }));
  await user.click(screen.getByRole("button", { name: "Send invitation" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Invitation emailed to client@example.test.",
  );
  expect(received).toEqual({
    email: "client@example.test",
    role_code: "CLIENT_USER",
    client_id: 4,
    workspace_ids: [9, 10],
  });
  expect(push).toHaveBeenCalledWith("/users/invitations?agency=12");
});
