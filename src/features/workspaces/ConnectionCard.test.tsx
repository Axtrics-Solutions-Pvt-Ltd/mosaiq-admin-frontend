import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { channelPaths, workspacePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { ConnectionCard } from "./ConnectionCard";
import type { WorkspaceRecord } from "./contracts";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
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

const workspace: WorkspaceRecord = {
  id: 7,
  agency_id: 2,
  client_id: 4,
  agency: null,
  client: null,
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

function credentials(status: string) {
  return {
    workspace_id: 7,
    connector_id: 3,
    status,
    last_verified_at: null,
    last_fetched_at: null,
    last_fetch_status: null,
    last_fetch_error: null,
    fields: [
      {
        key: "access_token",
        label: "Access token",
        type: "secret",
        required: true,
        is_set: true,
        hint: "•••• 1234",
      },
      {
        key: "account_id",
        label: "Ad account ID",
        type: "text",
        required: true,
        is_set: false,
        hint: null,
      },
    ],
  };
}

function useConnectionApi(status = "connected") {
  const saved: unknown[] = [];
  server.use(
    http.get(channelPaths.collection, () => HttpResponse.json({ data: [] })),
    http.get(workspacePaths.credentials(2, 4, 7), () =>
      HttpResponse.json({ data: credentials(status) }),
    ),
    http.put(workspacePaths.credentials(2, 4, 7), async ({ request }) => {
      saved.push(await request.json());
      return HttpResponse.json({ data: credentials("connected") });
    }),
  );
  return saved;
}

describe("ConnectionCard", () => {
  it("never pre-fills a stored secret and shows only its masked hint", async () => {
    useConnectionApi();
    const { container } = renderWithScope(
      <ConnectionCard canManage workspace={workspace} />,
      { platformRoleCode: "SUPER_ADMIN" },
    );
    expect(await screen.findByText("•••• 1234")).toBeVisible();
    expect(container.querySelector("input[type=password]")).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Replace Access token" }),
    );
    const secret = screen.getByLabelText(/Access token/);
    expect(secret).toHaveAttribute("type", "password");
    expect(secret).toHaveValue("");
    expect(
      screen.getByText("Leave empty to keep the stored value."),
    ).toBeVisible();
  });

  it("omits a secret left blank from the saved values", async () => {
    const saved = useConnectionApi();
    renderWithScope(<ConnectionCard canManage workspace={workspace} />, {
      platformRoleCode: "SUPER_ADMIN",
    });
    await userEvent.click(
      await screen.findByRole("button", { name: "Replace Access token" }),
    );
    await userEvent.type(screen.getByLabelText(/Ad account ID/), "act_42");
    await userEvent.click(
      screen.getByRole("button", { name: "Save credentials" }),
    );
    await waitFor(() =>
      expect(saved).toEqual([{ values: { account_id: "act_42" } }]),
    );
  });

  it("requires an unset required field before saving", async () => {
    const saved = useConnectionApi();
    renderWithScope(<ConnectionCard canManage workspace={workspace} />, {
      platformRoleCode: "SUPER_ADMIN",
    });
    await userEvent.click(
      await screen.findByRole("button", { name: "Save credentials" }),
    );
    expect(await screen.findByText("Enter Ad account ID.")).toBeVisible();
    expect(saved).toEqual([]);
  });

  it("keeps Fetch data disabled until the workspace is connected", async () => {
    useConnectionApi("not_connected");
    renderWithScope(<ConnectionCard canManage workspace={workspace} />, {
      platformRoleCode: "SUPER_ADMIN",
    });
    expect(
      await screen.findByRole("button", { name: "Fetch data" }),
    ).toBeDisabled();
    expect(
      screen.getByText(/live connection to Meta Ads comes in a later phase/),
    ).toBeVisible();
  });

  it("reports the rows a fetch updated", async () => {
    useConnectionApi();
    server.use(
      http.post(workspacePaths.fetch(2, 4, 7), () =>
        HttpResponse.json({
          data: {
            status: "completed",
            rows_upserted: 1200,
            date_from: "2025-08-21",
            date_to: "2026-09-24",
            is_sample: true,
          },
        }),
      ),
    );
    renderWithScope(<ConnectionCard canManage workspace={workspace} />, {
      platformRoleCode: "SUPER_ADMIN",
    });
    await userEvent.click(
      await screen.findByRole("button", { name: "Fetch data" }),
    );
    expect(
      await screen.findByText(
        /^1,200 rows updated for 21 Aug 2025–24 Sept? 2026.$/,
      ),
    ).toBeVisible();
  });
});
