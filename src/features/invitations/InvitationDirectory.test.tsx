import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";

import { agencyPaths, invitationPaths, workspacePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { useScope } from "@/providers/ScopeProvider";
import { renderWithScope } from "@/test/renderWithScope";

import { InvitationDirectory } from "./InvitationDirectory";

function ScopeAgencyProbe() {
  const scope = useScope();
  return <p>Header scope agency: {scope.agencyId ?? "none"}</p>;
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const agenciesResponse = {
  data: [
    {
      id: 1,
      display_name: "Northstar Digital",
      logo_url: null,
      primary_admin: null,
      workspace_count: 1,
      user_count: 1,
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
      total_workspaces: 1,
      total_agency_users: 1,
    },
  },
};

it("lists pending invitations for an Agency Admin's own agency", async () => {
  let requestedPath = "";
  server.use(
    http.get(invitationPaths.collection(12), ({ request }) => {
      requestedPath = new URL(request.url).pathname;
      return HttpResponse.json({
        data: [
          {
            id: 34,
            email: "new.user@example.test",
            agency_id: 12,
            client_id: 4,
            role_code: "CLIENT_USER",
            workspace_id: 9,
            workspace_name: "Northstar Growth",
            expires_at: "2026-09-28T10:00:00Z",
            accepted_at: null,
            revoked_at: null,
          },
        ],
        meta: { current_page: 1, last_page: 1, total: 1 },
      });
    }),
  );
  renderWithScope(
    <InvitationDirectory
      agencyId={undefined}
      page={1}
      status="all"
      workspaceId={undefined}
    />,
    {
      membership: { agencyId: 12, roleCode: "AGENCY_ADMIN" },
    },
  );
  expect(
    (await screen.findAllByText("new.user@example.test"))[0],
  ).toBeVisible();
  expect(screen.getAllByText("Client User")[0]).toBeVisible();
  expect(screen.getAllByText("Northstar Growth")[0]).toBeVisible();
  expect(requestedPath).toBe("/api/v1/admin/agencies/12/invitations");
});

it("lets a Super Admin choose an agency from the page and loads its invitations", async () => {
  let requestedPath = "";
  server.use(
    http.get(agencyPaths.collection, () => HttpResponse.json(agenciesResponse)),
    http.get(invitationPaths.collection(1), ({ request }) => {
      requestedPath = new URL(request.url).pathname;
      return HttpResponse.json({
        data: [
          {
            id: 55,
            email: "invited@example.test",
            agency_id: 1,
            client_id: null,
            role_code: "AGENCY_ADMIN",
            workspace_id: null,
            workspace_name: null,
            expires_at: "2026-09-28T10:00:00Z",
            accepted_at: null,
            revoked_at: null,
          },
        ],
        meta: { current_page: 1, last_page: 1, total: 1 },
      });
    }),
  );
  renderWithScope(
    <InvitationDirectory
      agencyId={undefined}
      page={1}
      status="all"
      workspaceId={undefined}
    />,
    {
      platformRoleCode: "SUPER_ADMIN",
    },
  );
  expect(await screen.findByText("Choose an agency")).toBeVisible();
  fireEvent.change(await screen.findByLabelText("Agency"), {
    target: { value: "1" },
  });
  expect(
    (await screen.findAllByText("invited@example.test"))[0],
  ).toBeVisible();
  expect(requestedPath).toBe("/api/v1/admin/agencies/1/invitations");
});

it("does not change the header's agency scope when the page-level agency filter is changed", async () => {
  server.use(
    http.get(agencyPaths.collection, () => HttpResponse.json(agenciesResponse)),
    http.get(invitationPaths.collection(1), () =>
      HttpResponse.json({
        data: [],
        meta: { current_page: 1, last_page: 1, total: 0 },
      }),
    ),
  );
  renderWithScope(
    <>
      <InvitationDirectory
        agencyId={undefined}
        page={1}
        status="all"
        workspaceId={undefined}
      />
      <ScopeAgencyProbe />
    </>,
    { platformRoleCode: "SUPER_ADMIN" },
  );
  expect(await screen.findByText("Header scope agency: none")).toBeVisible();
  fireEvent.change(await screen.findByLabelText("Agency"), {
    target: { value: "1" },
  });
  await screen.findByText("No invitations found");
  expect(screen.getByText("Header scope agency: none")).toBeVisible();
});

it("resends an expired invitation and updates its row in place", async () => {
  const row = {
    id: 34,
    email: "late.user@example.test",
    agency_id: 12,
    client_id: null,
    role_code: "VIEWER",
    workspace_id: 9,
    workspace_name: "Retail",
    expires_at: "2026-09-01T10:00:00Z",
    accepted_at: null,
    revoked_at: null,
    rejected_at: null,
    status: "expired",
    can_resend: true,
  };
  server.use(
    http.get(invitationPaths.collection(12), () =>
      HttpResponse.json({
        data: [row],
        meta: { current_page: 1, last_page: 1, total: 1 },
      }),
    ),
    http.post(invitationPaths.resend(12, 34), () =>
      HttpResponse.json({
        data: {
          ...row,
          expires_at: "2026-09-30T10:00:00Z",
          status: "pending",
          can_resend: false,
        },
      }),
    ),
  );
  renderWithScope(
    <InvitationDirectory
      agencyId={undefined}
      page={1}
      status="open"
      workspaceId={undefined}
    />,
    { membership: { agencyId: 12, roleCode: "AGENCY_ADMIN" } },
  );
  const resendButtons = await screen.findAllByRole("button", {
    name: "Resend invitation to late.user@example.test",
  });
  fireEvent.click(resendButtons[0] as HTMLElement);
  await waitFor(() =>
    expect(
      screen.queryAllByRole("button", {
        name: "Resend invitation to late.user@example.test",
      }),
    ).toHaveLength(0),
  );
  expect(screen.getAllByLabelText("Status: Pending")[0]).toBeVisible();
});

it("filters invitations by workspace for an Agency Admin", async () => {
  let requestedUrl = "";
  server.use(
    http.get(workspacePaths.agencyCollection(12), () =>
      HttpResponse.json({
        data: [
          {
            id: 7,
            agency_id: 12,
            client_id: 4,
            name: "Northstar Growth",
            timezone: "UTC",
            currency: "USD",
            status: "active",
            created_at: null,
            updated_at: null,
          },
        ],
        meta: { current_page: 1, last_page: 1, total: 1 },
      }),
    ),
    http.get(invitationPaths.collection(12), ({ request }) => {
      requestedUrl = request.url;
      return HttpResponse.json({
        data: [],
        meta: { current_page: 1, last_page: 1, total: 0 },
      });
    }),
  );
  renderWithScope(
    <InvitationDirectory
      agencyId={undefined}
      page={1}
      status="all"
      workspaceId={undefined}
    />,
    {
      membership: { agencyId: 12, roleCode: "AGENCY_ADMIN" },
    },
  );
  const workspaceSelect = await screen.findByLabelText("Workspace");
  expect(await screen.findByText("Northstar Growth")).toBeInTheDocument();
  await screen.findByText("No invitations found");
  fireEvent.change(workspaceSelect, { target: { value: "7" } });
  await waitFor(() =>
    expect(new URL(requestedUrl).searchParams.get("workspace_id")).toBe("7"),
  );
});
