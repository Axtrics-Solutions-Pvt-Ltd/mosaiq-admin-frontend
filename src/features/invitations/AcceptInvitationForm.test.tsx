import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeAll, expect, it, vi } from "vitest";

import { authPaths, invitationPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { AcceptInvitationForm } from "./AcceptInvitationForm";

const token = "t".repeat(64);

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams({ token }),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

function inspection(requiresExistingLogin: boolean) {
  return http.post(invitationPaths.inspect, () =>
    HttpResponse.json({
      data: {
        email: "invitee@example.test",
        agency_name: "Northstar",
        agency_status: "active",
        role_code: "ANALYST",
        expires_at: "2026-09-30T10:00:00Z",
        requires_existing_login: requiresExistingLogin,
        workspace_name: "Growth",
        client_name: null,
      },
    }),
  );
}

function signedInAs(email: string | undefined) {
  return http.get(authPaths.me, () =>
    email
      ? HttpResponse.json({
          data: {
            id: 7,
            name: "Signed In",
            email,
            platform_role_code: null,
            membership: {
              agency_id: 1,
              role_code: "ANALYST",
              client_id: null,
              workspace_ids: [3],
            },
          },
        })
      : HttpResponse.json({ error_code: "UNAUTHENTICATED" }, { status: 401 }),
  );
}

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AcceptInvitationForm />
    </QueryClientProvider>,
  );
}

it("asks a signed-out existing account to sign in and return, without accepting", async () => {
  let acceptCalls = 0;
  server.use(
    inspection(true),
    signedInAs(undefined),
    http.post(invitationPaths.accept, () => {
      acceptCalls += 1;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  renderForm();
  const signIn = await screen.findByRole("link", { name: "Sign in to accept" });
  const next = new URL(signIn.getAttribute("href") ?? "", "http://app.test");
  expect(next.pathname).toBe("/login");
  expect(next.searchParams.get("next")).toBe(
    `/accept-invitation?token=${token}`,
  );
  expect(screen.getByText("Growth")).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Decline invitation" }),
  ).toBeVisible();
  expect(acceptCalls).toBe(0);
});

it("lets the invited account accept explicitly and confirms the new access", async () => {
  let received: unknown;
  server.use(
    inspection(true),
    signedInAs("Invitee@Example.test"),
    http.post(invitationPaths.accept, async ({ request }) => {
      received = await request.json();
      return new HttpResponse(null, { status: 204 });
    }),
  );
  renderForm();
  fireEvent.click(
    await screen.findByRole("button", { name: "Accept invitation" }),
  );
  expect(
    await screen.findByText("You now have access to Growth at Northstar."),
  ).toBeVisible();
  expect(screen.getByRole("link", { name: "Go to dashboard" })).toHaveAttribute(
    "href",
    "/dashboard",
  );
  expect(received).toEqual({ token });
});

it("offers to switch accounts instead of the sign-up form when another user is signed in", async () => {
  server.use(inspection(false), signedInAs("someone.else@example.test"));
  renderForm();
  expect(
    await screen.findByRole("button", { name: "Sign out and continue" }),
  ).toBeVisible();
  expect(screen.getByText(/signed in as someone.else@example.test/)).toBeVisible();
  expect(screen.queryByLabelText(/Create password/)).not.toBeInTheDocument();
});

it("shows the switch-account state when the API reports an email mismatch", async () => {
  server.use(
    inspection(true),
    signedInAs("invitee@example.test"),
    http.post(invitationPaths.accept, () =>
      HttpResponse.json(
        { error_code: "INVITATION_EMAIL_MISMATCH" },
        { status: 403 },
      ),
    ),
  );
  renderForm();
  fireEvent.click(
    await screen.findByRole("button", { name: "Accept invitation" }),
  );
  expect(
    await screen.findByRole("button", { name: "Sign out and continue" }),
  ).toBeVisible();
});

it("declines with only the email link, without signing in", async () => {
  let received: unknown;
  server.use(
    inspection(true),
    signedInAs(undefined),
    http.post(invitationPaths.reject, async ({ request }) => {
      received = await request.json();
      return new HttpResponse(null, { status: 204 });
    }),
  );
  renderForm();
  fireEvent.click(
    await screen.findByRole("button", { name: "Decline invitation" }),
  );
  fireEvent.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Decline invitation",
    }),
  );
  await waitFor(() =>
    expect(
      screen.getByText(/You have declined this invitation/),
    ).toBeVisible(),
  );
  expect(received).toEqual({ token });
});
