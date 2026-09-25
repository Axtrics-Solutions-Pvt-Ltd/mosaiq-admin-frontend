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
  );
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
      screen.queryByRole("button", { name: "Delete workspace" }),
    ).not.toBeInTheDocument();
  });

  it("asks an Agency Admin to type the workspace name before deleting", async () => {
    renderWithScope(
      <WorkspaceDetails agencyId={2} clientId={4} workspaceId={7} />,
      { membership: { agencyId: 2, roleCode: "AGENCY_ADMIN" } },
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Delete workspace" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Delete Acme – Meta Ads?",
    });
    const confirm = within(dialog).getByRole("button", {
      name: "Delete workspace",
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
