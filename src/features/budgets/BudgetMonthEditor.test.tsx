import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { budgetPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { BudgetMonthEditor } from "./BudgetMonthEditor";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const workspaces = [
  { id: 7, name: "Acme – Meta Ads", currency: "CAD", channel: null },
  { id: 8, name: "Acme – Google Ads", currency: "CAD", channel: null },
];

function useBudgetApi() {
  const sent: unknown[] = [];
  server.use(
    http.get(budgetPaths.collection(2, 4), () =>
      HttpResponse.json({
        data: [
          {
            id: 1,
            client_id: 4,
            workspace_id: 7,
            month: "2026-09-01",
            amount: 12500,
            updated_by: null,
            created_at: null,
            updated_at: null,
          },
        ],
      }),
    ),
    http.put(budgetPaths.collection(2, 4), async ({ request }) => {
      sent.push(await request.json());
      return HttpResponse.json({ data: [] });
    }),
  );
  return sent;
}

const cell = (workspace: string, month: string) =>
  screen.getByRole("textbox", { name: `${workspace} budget for ${month}` });

function renderEditor(onDirtyChange = vi.fn()) {
  renderWithScope(
    <BudgetMonthEditor
      agencyId={2}
      allBudgetsHref="/clients/4?agency=2#budgets"
      clientId={4}
      focusRequest={0}
      initialMonth="2026-09"
      onDirtyChange={onDirtyChange}
      workspaces={workspaces}
    />,
    { platformRoleCode: "SUPER_ADMIN" },
  );
  return onDirtyChange;
}

describe("BudgetMonthEditor", () => {
  it("edits one month per channel and keeps edits across months", async () => {
    const sent = useBudgetApi();
    const onDirtyChange = renderEditor();
    await waitFor(() =>
      expect(cell("Acme – Meta Ads", "September 2026")).toHaveValue("12500"),
    );
    await userEvent.type(cell("Acme – Google Ads", "September 2026"), "4000");
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    await userEvent.type(cell("Acme – Meta Ads", "October 2026"), "9,000");
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    await userEvent.click(screen.getByRole("button", { name: "Save budgets" }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      items: [
        { workspace_id: 8, month: "2026-09", amount: 4000 },
        { workspace_id: 7, month: "2026-10", amount: 9000 },
      ],
    });
  });

  it("links to the full year on the client page", async () => {
    useBudgetApi();
    renderEditor();
    expect(
      screen.getByRole("link", {
        name: "Edit the whole year on the client page",
      }),
    ).toHaveAttribute("href", "/clients/4?agency=2#budgets");
  });
});
