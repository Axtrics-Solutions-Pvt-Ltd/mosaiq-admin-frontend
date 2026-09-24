import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";

import { authPaths, myInvitationPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { PendingInvitationsScreen } from "./PendingInvitationsScreen";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

beforeEach(() => replace.mockClear());

function meResponse(hasMembership: boolean) {
  return {
    data: {
      id: 9,
      name: "Returning User",
      email: "returning@example.test",
      platform_role_code: null,
      membership: hasMembership
        ? {
            agency_id: 12,
            role_code: "ANALYST",
            client_id: null,
            workspace_ids: [101],
          }
        : null,
    },
  };
}

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PendingInvitationsScreen />
    </QueryClientProvider>,
  );
}

it("lets a user without a membership accept and then continues to the dashboard", async () => {
  let hasMembership = false;
  server.use(
    http.get(authPaths.me, () => HttpResponse.json(meResponse(hasMembership))),
    http.get(myInvitationPaths.collection, () =>
      HttpResponse.json({
        data: hasMembership
          ? []
          : [
              {
                id: 1,
                agency_id: 12,
                agency_name: "Northstar",
                role_code: "ANALYST",
                client_id: null,
                client_name: null,
                workspace_id: 101,
                workspace_name: "Growth",
                expires_at: "2026-09-30T10:00:00Z",
              },
            ],
      }),
    ),
    http.post(myInvitationPaths.accept(1), () => {
      hasMembership = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  renderScreen();
  expect(await screen.findByText("returning@example.test")).toBeVisible();
  fireEvent.click(
    await screen.findByRole("button", { name: "Accept invitation to Growth" }),
  );
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
});

it("explains that there is no access when no invitations are waiting", async () => {
  server.use(
    http.get(authPaths.me, () => HttpResponse.json(meResponse(false))),
    http.get(myInvitationPaths.collection, () =>
      HttpResponse.json({ data: [] }),
    ),
  );
  renderScreen();
  expect(
    await screen.findByText(/no invitations waiting for you/),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
  expect(replace).not.toHaveBeenCalled();
});

it("sends existing members straight to the dashboard", async () => {
  server.use(http.get(authPaths.me, () => HttpResponse.json(meResponse(true))));
  renderScreen();
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
});
