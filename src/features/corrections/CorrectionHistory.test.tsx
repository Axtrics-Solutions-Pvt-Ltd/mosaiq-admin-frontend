import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { correctionPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { CorrectionHistory } from "./CorrectionHistory";
import { clientReportPreviewKey, correctionKeys } from "./queries";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/clients/4",
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

const workspaces = [
  {
    id: 7,
    name: "Acme – Meta Ads",
    currency: "GBP",
    connector: { id: 3, code: "meta_ads", name: "Meta Ads", category: "ads" },
  },
];

function correction(overrides: Record<string, unknown>) {
  return {
    id: 11,
    client_id: 4,
    workspace_id: 7,
    campaign_key: null,
    metric_code: "spend",
    date_from: "2026-09-01",
    date_to: "2026-09-07",
    original_total: 1000,
    corrected_total: 1250.5,
    note: "Invoice adjustment",
    is_active: true,
    rows_owned: 7,
    created_by: { id: 1, name: "Dana Lee" },
    reverted_at: null,
    reverted_by: null,
    created_at: "2026-09-20T09:00:00Z",
    ...overrides,
  };
}

function useHistoryApi(rows: unknown[]) {
  const deleted: string[] = [];
  server.use(
    http.get(correctionPaths.collection(2, 4), () =>
      HttpResponse.json({
        data: rows,
        meta: { current_page: 1, last_page: 1, total: rows.length },
      }),
    ),
    http.delete(correctionPaths.detail(2, 4, 11), ({ request }) => {
      deleted.push(request.url);
      return HttpResponse.json({
        data: correction({
          is_active: false,
          reverted_at: "2026-09-25T10:00:00Z",
        }),
      });
    }),
  );
  return deleted;
}

function renderHistory() {
  return renderWithScope(
    <CorrectionHistory
      agencyId={2}
      clientId={4}
      filters={{ page: 1 }}
      workspaces={workspaces}
    />,
    { platformRoleCode: "SUPER_ADMIN" },
  );
}

describe("CorrectionHistory", () => {
  it("lists corrections with their change and status", async () => {
    useHistoryApi([correction({})]);
    renderHistory();
    const table = await screen.findByRole("table", {
      name: "Data corrections",
    });
    expect(within(table).getByText("£1,250.50")).toBeVisible();
    expect(within(table).getByText("Dana Lee")).toBeVisible();
    expect(within(table).getByLabelText("Status: Active")).toBeVisible();
  });

  it("resets a correction after confirmation and refreshes reports", async () => {
    const deleted = useHistoryApi([correction({})]);
    const { queryClient } = renderHistory();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const table = await screen.findByRole("table", {
      name: "Data corrections",
    });
    await userEvent.click(
      within(table).getByRole("button", { name: /^Reset Spend correction/ }),
    );
    expect(deleted).toEqual([]);
    await userEvent.click(
      screen.getByRole("button", { name: "Reset correction" }),
    );
    await waitFor(() => expect(deleted).toHaveLength(1));
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: clientReportPreviewKey(2, 4),
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: correctionKeys.client(2, 4),
    });
  });

  it("offers no reset for a reset correction or an inaccessible workspace", async () => {
    useHistoryApi([
      correction({ id: 12, is_active: false }),
      correction({ id: 13, workspace_id: 99 }),
    ]);
    renderHistory();
    const table = await screen.findByRole("table", {
      name: "Data corrections",
    });
    expect(within(table).getByText("Workspace #99")).toBeVisible();
    expect(within(table).queryByRole("button", { name: /^Reset/ })).toBeNull();
  });
});
