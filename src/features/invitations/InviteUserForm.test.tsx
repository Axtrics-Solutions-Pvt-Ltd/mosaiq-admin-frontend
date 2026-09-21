import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";

import { authKeys } from "@/features/auth/queries";
import { invitationPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { InviteUserForm } from "./InviteUserForm";

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
    http.post(invitationPaths.collection(12), async ({ request }) => {
      received = await request.json();
      return new HttpResponse(null, { status: 201 });
    }),
  );
  render(
    <QueryClientProvider client={queryClient}>
      <InviteUserForm />
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
  await user.type(screen.getByRole("textbox", { name: /Client ID/ }), "4");
  await user.type(
    screen.getByRole("textbox", { name: /Workspace IDs/ }),
    "9, 10",
  );
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
});
