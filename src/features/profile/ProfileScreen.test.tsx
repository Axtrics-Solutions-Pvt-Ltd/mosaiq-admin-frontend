import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import Link from "next/link";
import { afterEach, beforeAll, expect, it, vi } from "vitest";

import type { CurrentUser } from "@/features/auth/contracts";
import { authKeys } from "@/features/auth/queries";
import { authPaths, userPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { ProfileScreen } from "./ProfileScreen";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(cleanup);

function renderProfile(user: CurrentUser) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(authKeys.me(), user);
  render(
    <QueryClientProvider client={queryClient}>
      <ProfileScreen />
      <Link href="/dashboard">Dashboard</Link>
    </QueryClientProvider>,
  );
  return queryClient;
}

const agencyUser: CurrentUser = {
  id: 3,
  name: "Agency Admin",
  email: "agency@example.test",
  platformRoleCode: null,
  membership: {
    agencyId: 1,
    roleCode: "AGENCY_ADMIN",
    clientId: null,
    workspaceIds: [],
  },
};

it("updates only the signed-in agency user's name and refreshes the auth cache", async () => {
  const browser = userEvent.setup();
  let payload: unknown;
  server.use(
    http.put(userPaths.detail(1, 3), async ({ request }) => {
      payload = await request.json();
      return HttpResponse.json({
        data: {
          id: 3,
          name: "Alex Rivera",
          email: agencyUser.email,
          status: "active",
          agency_id: 1,
          membership_status: "active",
          role_code: "AGENCY_ADMIN",
          client_id: null,
          workspace_ids: [],
          invited_at: null,
          accepted_at: null,
        },
      });
    }),
  );
  const queryClient = renderProfile(agencyUser);
  await browser.clear(screen.getByRole("textbox", { name: /Name/ }));
  await browser.type(
    screen.getByRole("textbox", { name: /Name/ }),
    "Alex Rivera",
  );
  await browser.click(screen.getByRole("button", { name: "Save name" }));
  expect(await screen.findByText("Your name has been updated.")).toBeVisible();
  expect(payload).toEqual({ name: "Alex Rivera" });
  expect(queryClient.getQueryData<CurrentUser>(authKeys.me())?.name).toBe(
    "Alex Rivera",
  );
});

it("keeps a Super Admin's name read-only and explains the API gap", () => {
  renderProfile({
    ...agencyUser,
    membership: null,
    platformRoleCode: "SUPER_ADMIN",
  });
  expect(
    screen.queryByRole("textbox", { name: /Name/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Agency Admin")).toBeVisible();
  expect(
    screen.getByText(/no agency-independent self-edit endpoint/),
  ).toBeVisible();
});

it("maps an incorrect current password to its field and preserves values", async () => {
  const browser = userEvent.setup();
  server.use(
    http.post(authPaths.changePassword, () =>
      HttpResponse.json(
        { errors: { current_password: ["Current password is incorrect."] } },
        { status: 422 },
      ),
    ),
  );
  renderProfile(agencyUser);
  await browser.type(
    screen.getByLabelText("Current password *"),
    "wrong-current",
  );
  await browser.type(
    screen.getByLabelText("New password *"),
    "new-password-123",
  );
  await browser.type(
    screen.getByLabelText("Confirm new password *"),
    "new-password-123",
  );
  await browser.click(screen.getByRole("button", { name: "Change password" }));
  expect(
    await screen.findByText("Current password is incorrect."),
  ).toBeVisible();
  expect(screen.getByLabelText("Current password *")).toHaveValue(
    "wrong-current",
  );
});

it("clears password fields and discloses revocation of other sessions", async () => {
  const browser = userEvent.setup();
  server.use(
    http.post(
      authPaths.changePassword,
      () => new HttpResponse(null, { status: 204 }),
    ),
  );
  renderProfile(agencyUser);
  await browser.type(
    screen.getByLabelText("Current password *"),
    "correct-current",
  );
  await browser.type(
    screen.getByLabelText("New password *"),
    "new-password-123",
  );
  await browser.type(
    screen.getByLabelText("Confirm new password *"),
    "new-password-123",
  );
  await browser.click(screen.getByRole("button", { name: "Change password" }));
  expect(
    await screen.findByText(/signed out of your other sessions and devices/),
  ).toBeVisible();
  expect(screen.getByLabelText("Current password *")).toHaveValue("");
});

it("asks before leaving a profile with an unsaved name", async () => {
  push.mockClear();
  const browser = userEvent.setup();
  renderProfile(agencyUser);
  await browser.clear(screen.getByRole("textbox", { name: /Name/ }));
  await browser.type(
    screen.getByRole("textbox", { name: /Name/ }),
    "Draft Name",
  );
  await browser.click(screen.getByRole("link", { name: "Dashboard" }));
  expect(await screen.findByText("Discard changes?")).toBeVisible();
  expect(push).not.toHaveBeenCalled();
  await browser.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByText("Discard changes?")).not.toBeVisible();
  await browser.click(screen.getByRole("link", { name: "Dashboard" }));
  await browser.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(push).toHaveBeenCalledWith("/dashboard");
});
