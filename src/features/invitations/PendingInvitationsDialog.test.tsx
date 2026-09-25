import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeAll, expect, it } from "vitest";

import type { CurrentUser } from "@/features/auth/contracts";
import { myInvitationPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { PendingInvitationsDialog } from "./PendingInvitationsDialog";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

afterEach(() => window.sessionStorage.clear());

const member: CurrentUser = {
  id: 7,
  name: "Analyst",
  email: "analyst@example.test",
  platformRoleCode: null,
  membership: {
    agencyId: 12,
    roleCode: "ANALYST",
    clientId: null,
    workspaceIds: [3],
  },
};

function invitation(id: number, workspaceName: string, agencyId = 12) {
  return {
    id,
    agency_id: agencyId,
    agency_name: agencyId === 12 ? "Northstar" : "Kinetic",
    role_code: "ANALYST",
    client_id: null,
    client_name: null,
    workspace_id: id + 100,
    workspace_name: workspaceName,
    expires_at: "2026-09-30T10:00:00Z",
  };
}

function renderDialog(user: CurrentUser = member) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PendingInvitationsDialog user={user} />
    </QueryClientProvider>,
  );
}

it("groups pending invitations by agency and removes one once accepted", async () => {
  let pending = [
    invitation(1, "Growth"),
    invitation(2, "Retail"),
    invitation(3, "Brand", 14),
  ];
  const accepted: number[] = [];
  server.use(
    http.get(myInvitationPaths.collection, () =>
      HttpResponse.json({ data: pending }),
    ),
    http.post(myInvitationPaths.accept(1), () => {
      accepted.push(1);
      pending = pending.filter((row) => row.id !== 1);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  renderDialog();
  expect(
    await screen.findByRole("heading", { name: "Northstar" }),
  ).toBeVisible();
  expect(screen.getByRole("heading", { name: "Kinetic" })).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Accept invitation to Growth" }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Accept invitation to Growth" }),
    ).not.toBeInTheDocument(),
  );
  expect(accepted).toEqual([1]);
  expect(
    screen.getByRole("button", { name: "Accept invitation to Retail" }),
  ).toBeVisible();
});

it("explains when an invitation is no longer available", async () => {
  let pending = [invitation(1, "Growth"), invitation(2, "Retail")];
  server.use(
    http.get(myInvitationPaths.collection, () =>
      HttpResponse.json({ data: pending }),
    ),
    http.post(myInvitationPaths.accept(1), () => {
      pending = pending.filter((row) => row.id !== 1);
      return HttpResponse.json({ error_code: "NOT_FOUND" }, { status: 404 });
    }),
  );
  renderDialog();
  fireEvent.click(
    await screen.findByRole("button", { name: "Accept invitation to Growth" }),
  );
  expect(
    await screen.findByText(/That invitation is no longer available/),
  ).toBeVisible();
});

it("stays closed after Later for the rest of the session", async () => {
  server.use(
    http.get(myInvitationPaths.collection, () =>
      HttpResponse.json({ data: [invitation(1, "Growth")] }),
    ),
  );
  const { unmount } = renderDialog();
  fireEvent.click(await screen.findByRole("button", { name: "Later" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  unmount();
  renderDialog();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("does not ask Super Admins for invitations", () => {
  renderDialog({
    ...member,
    platformRoleCode: "SUPER_ADMIN",
    membership: null,
  });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
