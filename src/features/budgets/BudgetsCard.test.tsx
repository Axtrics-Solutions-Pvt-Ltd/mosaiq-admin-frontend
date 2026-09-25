import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { workspaceListSchema } from "@/features/workspaces/contracts";
import { budgetPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { BudgetsCard } from "./BudgetsCard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const year = new Date().getFullYear();
const workspaceRow = (id: number, name: string, code: string) => ({
  id,
  agency_id: 2,
  client_id: 4,
  connector_id: id,
  connector: { id, code, name: code, category: "ads" },
  connection: null,
  name,
  timezone: "America/Toronto",
  currency: "CAD",
  status: "active",
  invite_status: null,
  invite_status_reason: null,
  created_at: null,
  updated_at: null,
});
const workspaces = workspaceListSchema.parse({
  data: [
    workspaceRow(7, "Acme – Meta Ads", "meta_ads"),
    workspaceRow(8, "Acme – Google Ads", "google_ads"),
  ],
  meta: { current_page: 1, last_page: 1, total: 2, per_page: 25 },
}).data;

const saved = (workspaceId: number, month: string, amount: number) => ({
  id: workspaceId * 100 + Number(month.slice(5, 7)),
  client_id: 4,
  workspace_id: workspaceId,
  month: `${month}-01`,
  amount,
  updated_by: null,
  created_at: null,
  updated_at: null,
});

function useBudgetApi(response?: () => Response) {
  const sent: unknown[] = [];
  server.use(
    http.get(budgetPaths.collection(2, 4), () =>
      HttpResponse.json({
        data: [saved(7, `${year}-01`, 12500), saved(8, `${year}-01`, 4000)],
      }),
    ),
    http.put(budgetPaths.collection(2, 4), async ({ request }) => {
      sent.push(await request.json());
      return response?.() ?? HttpResponse.json({ data: [] });
    }),
  );
  return sent;
}

const cell = (workspace: string, month: string) =>
  screen.getByRole("textbox", {
    name: `${workspace} budget for ${month} ${year}`,
  });

describe("BudgetsCard", () => {
  it("saves only the changed cells", async () => {
    const sent = useBudgetApi();
    renderWithScope(
      <BudgetsCard agencyId={2} clientId={4} workspaces={workspaces} />,
      { platformRoleCode: "SUPER_ADMIN" },
    );
    await waitFor(() =>
      expect(cell("Acme – Meta Ads", "January")).toHaveValue("12500"),
    );
    await userEvent.type(cell("Acme – Meta Ads", "March"), "9,000");
    await userEvent.clear(cell("Acme – Google Ads", "January"));
    // Retyping a saved amount is not a change.
    await userEvent.clear(cell("Acme – Meta Ads", "January"));
    await userEvent.type(cell("Acme – Meta Ads", "January"), "12500.00");
    expect(screen.getByText("2 unsaved changes")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Save budgets" }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      items: [
        { workspace_id: 8, month: `${year}-01`, amount: null },
        { workspace_id: 7, month: `${year}-03`, amount: 9000 },
      ],
    });
  });

  it("keeps an invalid amount out of the request", async () => {
    const sent = useBudgetApi();
    renderWithScope(
      <BudgetsCard agencyId={2} clientId={4} workspaces={workspaces} />,
      { platformRoleCode: "SUPER_ADMIN" },
    );
    await waitFor(() =>
      expect(cell("Acme – Meta Ads", "January")).toHaveValue("12500"),
    );
    await userEvent.type(cell("Acme – Meta Ads", "May"), "lots");
    await userEvent.click(screen.getByRole("button", { name: "Save budgets" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Enter each budget as an amount/,
    );
    expect(cell("Acme – Meta Ads", "May")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(sent).toHaveLength(0);
  });

  it("shows an API error on the cell it belongs to and keeps the entry", async () => {
    useBudgetApi(() =>
      HttpResponse.json(
        {
          message: "The given data was invalid.",
          errors: { "items.0.amount": ["The amount is too large."] },
        },
        { status: 422 },
      ),
    );
    renderWithScope(
      <BudgetsCard agencyId={2} clientId={4} workspaces={workspaces} />,
      { platformRoleCode: "SUPER_ADMIN" },
    );
    await waitFor(() =>
      expect(cell("Acme – Meta Ads", "January")).toHaveValue("12500"),
    );
    await userEvent.type(cell("Acme – Google Ads", "June"), "999999");
    await userEvent.click(screen.getByRole("button", { name: "Save budgets" }));
    expect(await screen.findByText("The amount is too large.")).toBeVisible();
    expect(cell("Acme – Google Ads", "June")).toHaveValue("999999");
    expect(screen.getByText("Review the highlighted budgets.")).toBeVisible();
  });
});
