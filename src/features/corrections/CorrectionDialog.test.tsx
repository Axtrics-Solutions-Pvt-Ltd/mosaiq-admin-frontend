import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { correctionPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { type CorrectionContext, CorrectionDialog } from "./CorrectionDialog";
import { CorrectionTrigger } from "./CorrectionTrigger";

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

const context: CorrectionContext = {
  agencyId: 2,
  clientId: 4,
  clientName: "Acme",
  workspaceId: 7,
  workspaceName: "Acme – Meta Ads",
  channelName: "Meta Ads",
  metricCode: "clicks",
  metricLabel: "Clicks",
  campaignKey: "cmp-9",
  campaignName: "Autumn sale",
  from: "2026-09-01",
  to: "2026-09-07",
  currentTotal: 1200,
  format: { kind: "number" },
};

function useCorrectionApi(
  response: () => Response = () =>
    HttpResponse.json({
      data: {
        id: 11,
        client_id: 4,
        workspace_id: 7,
        campaign_key: "cmp-9",
        metric_code: "clicks",
        date_from: "2026-09-01",
        date_to: "2026-09-07",
        original_total: 1200,
        corrected_total: 1500,
        note: "Tracking outage",
        is_active: true,
        reverted_at: null,
        reverted_by: null,
        created_at: "2026-09-25T10:00:00Z",
      },
    }),
) {
  const sent: unknown[] = [];
  server.use(
    http.post(correctionPaths.collection(2, 4), async ({ request }) => {
      sent.push(await request.json());
      return response();
    }),
  );
  return sent;
}

describe("CorrectionDialog", () => {
  it("sends the value's context with the new total and note", async () => {
    const sent = useCorrectionApi();
    const onClose = vi.fn();
    renderWithScope(<CorrectionDialog context={context} onClose={onClose} />);
    expect(
      screen.getByRole("heading", {
        name: "Correct Clicks — Meta Ads (Acme – Meta Ads)",
      }),
    ).toBeVisible();
    expect(screen.getByText("Campaign: Autumn sale")).toBeVisible();
    expect(screen.getByText("1,200")).toBeVisible();
    await userEvent.type(screen.getByLabelText(/New total/), "1,500");
    await userEvent.type(screen.getByLabelText("Note"), "Tracking outage");
    await userEvent.click(
      screen.getByRole("button", { name: "Save correction" }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sent).toEqual([
      {
        workspace_id: 7,
        metric_code: "clicks",
        campaign_key: "cmp-9",
        date_from: "2026-09-01",
        date_to: "2026-09-07",
        corrected_total: 1500,
        note: "Tracking outage",
      },
    ]);
  });

  it("rejects a decimal for a whole-number metric without saving", async () => {
    const sent = useCorrectionApi();
    renderWithScope(<CorrectionDialog context={context} onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/New total/), "12.5");
    await userEvent.click(
      screen.getByRole("button", { name: "Save correction" }),
    );
    expect(
      await screen.findByText("This metric is a whole number."),
    ).toBeVisible();
    expect(sent).toEqual([]);
  });

  it("shows an API validation error on its field and keeps the dialog open", async () => {
    useCorrectionApi(() =>
      HttpResponse.json(
        {
          message: "The given data was invalid.",
          errors: {
            corrected_total: ["The total is too large for this metric."],
          },
        },
        { status: 422 },
      ),
    );
    const onClose = vi.fn();
    renderWithScope(<CorrectionDialog context={context} onClose={onClose} />);
    await userEvent.type(screen.getByLabelText(/New total/), "900");
    await userEvent.click(
      screen.getByRole("button", { name: "Save correction" }),
    );
    expect(
      await screen.findByText("The total is too large for this metric."),
    ).toBeVisible();
    expect(screen.getByLabelText(/New total/)).toHaveValue("900");
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("CorrectionTrigger", () => {
  it("never opens the dialog for a calculated metric", async () => {
    const onCorrect = vi.fn();
    renderWithScope(
      <CorrectionTrigger
        metricCode="roas"
        metricLabel="ROAS"
        onCorrect={onCorrect}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: "ROAS: Calculated from Revenue ÷ Spend. Edit those instead.",
      }),
    );
    expect(onCorrect).not.toHaveBeenCalled();
  });

  it("opens the dialog for a base metric", async () => {
    const onCorrect = vi.fn();
    renderWithScope(
      <CorrectionTrigger
        metricCode="clicks"
        metricLabel="Clicks"
        onCorrect={onCorrect}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Correct Clicks" }),
    );
    expect(onCorrect).toHaveBeenCalledOnce();
  });
});
