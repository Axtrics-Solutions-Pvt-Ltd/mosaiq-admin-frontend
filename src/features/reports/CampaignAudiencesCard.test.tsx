import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { reportPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { CampaignAudiencesCard } from "./CampaignAudiencesCard";
import type { CampaignAudiences, Report } from "./contracts";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const scope = { agencyId: 1, clientId: 20, reportId: 7 };
const report = {
  audiences: [
    { code: "south_asian", label: "South Asian" },
    { code: "chinese", label: "Chinese" },
  ],
} as Report;

const mapping: CampaignAudiences = {
  channels: [
    {
      workspace_id: 12,
      name: "Meta Ads account",
      platform: { code: "meta_ads", name: "Meta Ads" },
      default_audience: null,
      campaigns: [
        {
          campaign_key: "launch",
          name: "Launch",
          status: "active",
          audience: null,
          effective_audience: "untagged",
          source: "none",
        },
        {
          campaign_key: "promo",
          name: "Promo",
          status: "paused",
          audience: "chinese",
          effective_audience: "chinese",
          source: "campaign",
        },
      ],
    },
  ],
  untagged_campaigns: 1,
};

function useCampaignAudiencesApi(
  onSave?: (body: unknown) => Response | undefined,
) {
  const saved: unknown[] = [];
  const path = reportPaths.campaignAudiences(1, 20, 7);
  server.use(
    http.get(path, () => HttpResponse.json({ data: mapping })),
    http.put(path, async ({ request }) => {
      const body = await request.json();
      saved.push(body);
      return onSave?.(body) ?? HttpResponse.json({ data: mapping });
    }),
  );
  return saved;
}

describe("CampaignAudiencesCard", () => {
  it("saves channel defaults and campaign audiences in one request", async () => {
    const user = userEvent.setup();
    const saved = useCampaignAudiencesApi();
    renderWithScope(<CampaignAudiencesCard report={report} scope={scope} />);

    expect(await screen.findByText("1 campaign is not tagged.")).toBeVisible();
    expect(screen.getByText("Untagged")).toBeVisible();

    await user.selectOptions(
      screen.getByLabelText("Default audience"),
      "south_asian",
    );
    expect(screen.getByText("Every campaign has an audience.")).toBeVisible();
    expect(screen.queryByText("Untagged")).not.toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Audience for Launch")).getByRole("option", {
        name: "Channel default (South Asian)",
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Save campaign audiences" }),
    );
    await waitFor(() =>
      expect(saved).toEqual([
        {
          channels: [{ workspace_id: 12, default_audience: "south_asian" }],
          campaigns: [
            { workspace_id: 12, campaign_key: "promo", audience: "chinese" },
          ],
        },
      ]),
    );
  });

  it("sets the audience of selected campaigns in bulk", async () => {
    const user = userEvent.setup();
    useCampaignAudiencesApi();
    renderWithScope(<CampaignAudiencesCard report={report} scope={scope} />);

    await user.click(
      await screen.findByRole("checkbox", { name: "Select Launch" }),
    );
    await user.click(screen.getByRole("checkbox", { name: "Select Promo" }));
    await user.selectOptions(
      screen.getByLabelText("Selected campaigns (2)"),
      "untagged",
    );
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByLabelText("Audience for Launch")).toHaveValue(
      "untagged",
    );
    expect(screen.getByLabelText("Audience for Promo")).toHaveValue("untagged");
    expect(screen.getByText("Every campaign has an audience.")).toBeVisible();
    expect(screen.getByText("Unsaved changes")).toBeVisible();
  });

  it("finds campaigns by name", async () => {
    const user = userEvent.setup();
    useCampaignAudiencesApi();
    renderWithScope(<CampaignAudiencesCard report={report} scope={scope} />);

    await user.type(await screen.findByLabelText("Find a campaign"), "pro");
    expect(screen.getByText("Promo")).toBeVisible();
    expect(screen.queryByText("Launch")).not.toBeInTheDocument();
  });

  it("shows the API's reason when saving fails", async () => {
    const user = userEvent.setup();
    useCampaignAudiencesApi(() =>
      HttpResponse.json(
        {
          message: "The given data was invalid.",
          errors: {
            "campaigns.0.campaign_key": [
              "This campaign is not on that channel.",
            ],
          },
        },
        { status: 422 },
      ),
    );
    renderWithScope(<CampaignAudiencesCard report={report} scope={scope} />);

    await user.selectOptions(
      await screen.findByLabelText("Audience for Launch"),
      "south_asian",
    );
    await user.click(
      screen.getByRole("button", { name: "Save campaign audiences" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This campaign is not on that channel.",
    );
  });

  it("asks for audience segments first", () => {
    renderWithScope(
      <CampaignAudiencesCard
        report={{ ...report, audiences: [] }}
        scope={scope}
      />,
    );
    expect(screen.getByText("Add audience segments first.")).toBeVisible();
  });
});
