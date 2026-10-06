import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { agencyPaths, channelPaths, workspacePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { WorkspaceDetails } from "./WorkspaceDetails";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

const workspace = {
  id: 7,
  agency_id: 2,
  client_id: 4,
  connector_id: 3,
  connector: { id: 3, code: "meta_ads", name: "Meta Ads", category: "ads" },
  connection: { status: "connected", last_fetched_at: null },
  name: "Acme – Meta Ads",
  timezone: "Europe/London",
  currency: "GBP",
  status: "active",
  invite_status: null,
  invite_status_reason: null,
  created_at: null,
  updated_at: null,
};

let deleted = 0;
beforeEach(() => {
  deleted = 0;
  push.mockReset();
  server.use(
    http.get(workspacePaths.detail(2, 4, 7), () =>
      HttpResponse.json({ data: workspace }),
    ),
    http.delete(workspacePaths.detail(2, 4, 7), () => {
      deleted += 1;
      return new HttpResponse(null, { status: 204 });
    }),
    http.get(workspacePaths.client(2, 4), () =>
      HttpResponse.json({
        data: {
          id: 4,
          agency_id: 2,
          name: "Acme",
          status: "active",
          created_at: null,
          updated_at: null,
        },
      }),
    ),
    http.get(agencyPaths.detail(2), () =>
      HttpResponse.json({ message: "Not needed." }, { status: 404 }),
    ),
    http.get(channelPaths.collection, () => HttpResponse.json({ data: [] })),
    http.get(workspacePaths.credentials(2, 4, 7), () =>
      HttpResponse.json({
        data: {
          workspace_id: 7,
          connector_id: 3,
          status: "connected",
          last_verified_at: null,
          last_fetched_at: null,
          last_fetch_status: null,
          last_fetch_error: null,
          fields: [],
        },
      }),
    ),
    http.get(workspacePaths.users(2, 4, 7), () =>
      HttpResponse.json({
        data: [
          {
            user_id: 11,
            name: "Avery Admin",
            email: "avery@example.com",
            role_code: "AGENCY_ADMIN",
            access: "agency",
            status: "active",
            granted_at: "2026-09-01T09:00:00.000000Z",
            invitation_expires_at: null,
          },
          {
            user_id: null,
            name: null,
            email: "pending@example.com",
            role_code: "MANAGER",
            access: "workspace",
            status: "invited",
            granted_at: null,
            invitation_expires_at: "2026-10-08T09:00:00.000000Z",
          },
        ],
      }),
    ),
    http.get(workspacePaths.activity(2, 4, 7), () =>
      HttpResponse.json({
        data: [
          {
            id: 5,
            action: "workspace.fetched",
            result: "success",
            actor: { id: 11, name: "Avery Admin" },
            metadata: { rows_upserted: 1200 },
            created_at: "2026-09-02T09:00:00.000000Z",
          },
        ],
        meta: { current_page: 1, last_page: 1, total: 1 },
      }),
    ),
  );
});

describe("WorkspaceDetails team and activity tabs", () => {
  it("lists channel users and pending invitations for an Agency Admin", async () => {
    renderWithScope(
      <WorkspaceDetails agencyId={2} clientId={4} workspaceId={7} />,
      { membership: { agencyId: 2, roleCode: "AGENCY_ADMIN" } },
    );
    await userEvent.click(
      await screen.findByRole("tab", { name: "Team and Access" }),
    );
    const panel = screen.getByRole("tabpanel", { name: "Team and Access" });
    expect(
      (await within(panel).findAllByText("Avery Admin")).length,
    ).toBeGreaterThan(0);
    expect(
      within(panel).getAllByText("pending@example.com").length,
    ).toBeGreaterThan(0);
    expect(within(panel).queryByText("UI preview")).not.toBeInTheDocument();
  });

  it("hides the team tab from a Manager", async () => {
    renderWithScope(
      <WorkspaceDetails agencyId={2} clientId={4} workspaceId={7} />,
      { membership: { agencyId: 2, roleCode: "MANAGER" } },
    );
    expect(
      await screen.findByRole("tab", { name: "Activity" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Team and Access" }),
    ).not.toBeInTheDocument();
  });

  it("shows channel activity", async () => {
    renderWithScope(
      <WorkspaceDetails agencyId={2} clientId={4} workspaceId={7} />,
      { membership: { agencyId: 2, roleCode: "MANAGER" } },
    );
    await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));
    const panel = screen.getByRole("tabpanel", { name: "Activity" });
    expect(
      await within(panel).findByText("Channel data fetched"),
    ).toBeInTheDocument();
    expect(within(panel).getByText(/Avery Admin/)).toBeInTheDocument();
  });
});

describe("WorkspaceDetails delete action", () => {
  it("is hidden for a Manager, who can still edit", async () => {
    renderWithScope(
      <WorkspaceDetails agencyId={2} clientId={4} workspaceId={7} />,
      { membership: { agencyId: 2, roleCode: "MANAGER" } },
    );
    expect(
      await screen.findByRole("link", { name: /Edit/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete channel" }),
    ).not.toBeInTheDocument();
  });

  it("asks an Agency Admin to type the channel name before deleting", async () => {
    renderWithScope(
      <WorkspaceDetails agencyId={2} clientId={4} workspaceId={7} />,
      { membership: { agencyId: 2, roleCode: "AGENCY_ADMIN" } },
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Delete channel" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Delete Acme – Meta Ads?",
    });
    const confirm = within(dialog).getByRole("button", {
      name: "Delete channel",
    });
    expect(confirm).toBeDisabled();
    await userEvent.type(
      screen.getByLabelText("Type Acme – Meta Ads to confirm"),
      "Acme – Meta Ads",
    );
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    await vi.waitFor(() =>
      expect(push).toHaveBeenCalledWith("/clients/4?agency=2"),
    );
    expect(deleted).toBe(1);
  });
});
