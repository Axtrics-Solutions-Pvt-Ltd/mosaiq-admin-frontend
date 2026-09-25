import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { correctionPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import {
  type AppliedCorrectionsContext,
  AppliedCorrectionsDialog,
} from "./AppliedCorrectionsDialog";

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

function correction(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    client_id: 4,
    workspace_id: 7,
    campaign_key: null,
    metric_code: "spend",
    date_from: "2026-09-01",
    date_to: "2026-09-07",
    original_total: 1200,
    corrected_total: 1600,
    note: null,
    is_active: true,
    rows_owned: 7,
    created_by: { id: 1, name: "Avery Admin" },
    reverted_at: null,
    reverted_by: null,
    created_at: "2026-09-10T10:00:00Z",
    ...overrides,
  };
}

// Two pages of history; the wanted ids sit on different pages.
function useHistoryApi(lastPage = 2) {
  const requests: URLSearchParams[] = [];
  server.use(
    http.get(correctionPaths.collection(2, 4), ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      const page = Number(params.get("page"));
      return HttpResponse.json({
        data:
          page === 1
            ? [correction(3), correction(5, { note: "Invoice total" })]
            : [correction(9, { corrected_total: 1400 })],
        meta: { current_page: page, last_page: lastPage, total: 3 },
      });
    }),
  );
  return requests;
}

const context = (ids: number[]): AppliedCorrectionsContext => ({
  agencyId: 2,
  clientId: 4,
  valueLabel: "Spend",
  from: "2026-09-01",
  to: "2026-09-30",
  lookup: { ids, workspace_id: 7, metric_code: "spend" },
  historyHref: "/clients/4?agency=2",
});

const workspaces = [{ id: 7, name: "Acme – Meta Ads", currency: "USD" }];

describe("AppliedCorrectionsDialog", () => {
  it("lists exactly the corrections behind a value", async () => {
    const requests = useHistoryApi();
    renderWithScope(
      <AppliedCorrectionsDialog
        context={context([5, 9])}
        onClose={() => {}}
        workspaces={workspaces}
      />,
    );
    expect(await screen.findByText("Invoice total")).toBeVisible();
    expect(screen.getByText("$1,400.00")).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(requests).toHaveLength(2);
    expect(requests[0]?.get("workspace_id")).toBe("7");
    expect(requests[0]?.get("metric_code")).toBe("spend");
    expect(
      screen.getByRole("link", { name: "Open correction history" }),
    ).toHaveAttribute("href", "/clients/4?agency=2");
  });

  it("stops paging once every correction is found", async () => {
    const requests = useHistoryApi();
    renderWithScope(
      <AppliedCorrectionsDialog
        context={context([3])}
        onClose={() => {}}
        workspaces={workspaces}
      />,
    );
    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(1),
    );
    expect(requests).toHaveLength(1);
  });

  it("says when a correction couldn't be found", async () => {
    useHistoryApi(1);
    renderWithScope(
      <AppliedCorrectionsDialog
        context={context([5, 42])}
        onClose={() => {}}
        workspaces={workspaces}
      />,
    );
    expect(
      await screen.findByText(/1 more correction isn't shown here/),
    ).toBeVisible();
  });
});
