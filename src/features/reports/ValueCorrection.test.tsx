import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { EditingValue } from "./contracts";
import {
  inputReferences,
  type OtherTabValues,
  ValueCorrection,
} from "./ValueCorrection";

function editingValue(overrides: Partial<EditingValue>): EditingValue {
  return {
    path: "value",
    metric: "spend",
    is_base: true,
    workspace_id: 5,
    date_from: "2026-09-01",
    date_to: "2026-09-30",
    total: 100,
    edited: false,
    correction_ids: [],
    ...overrides,
  };
}

const roas = editingValue({
  path: "center.value",
  metric: "roas",
  is_base: false,
  inputs: ["revenue", "spend"],
});
const revenue = editingValue({ path: "items.0.revenue", metric: "revenue" });
const spend = editingValue({ path: "items.0.spend", metric: "spend" });

describe("inputReferences", () => {
  it("links a campaign's CTR only to that campaign's inputs", () => {
    const ctr = editingValue({
      path: "rows.1.ctr",
      metric: "ctr",
      is_base: false,
      inputs: ["clicks", "impressions"],
      campaign_key: "summer",
    });
    const workspaceImpressions = editingValue({
      path: "items.0.impressions",
      metric: "impressions",
    });
    const otherCampaign = editingValue({
      path: "rows.0.impressions",
      metric: "impressions",
      campaign_key: "winter",
    });
    const sameCampaign = editingValue({
      path: "rows.1.impressions",
      metric: "impressions",
      campaign_key: "summer",
    });
    // Clicks has no column; its value is only reached from the CTR lock.
    const hiddenClicks = editingValue({
      path: "rows.1.clicks",
      metric: "clicks",
      campaign_key: "summer",
    });
    expect(
      inputReferences(ctr, [
        workspaceImpressions,
        otherCampaign,
        sameCampaign,
        hiddenClicks,
      ]),
    ).toEqual([hiddenClicks, sameCampaign]);
    // Without a campaign, a workspace value doesn't pick up a campaign row.
    expect(
      inputReferences({ ...ctr, campaign_key: undefined }, [
        otherCampaign,
        workspaceImpressions,
      ]),
    ).toEqual([workspaceImpressions]);
  });
});

describe("ValueCorrection", () => {
  it("keeps a calculated value's input shortcuts behind its lock", async () => {
    const onCorrect = vi.fn();
    render(
      <ValueCorrection
        onCorrect={onCorrect}
        onShowCorrections={vi.fn()}
        tabValues={[roas, revenue, spend]}
        value={roas}
      />,
    );
    const trigger = screen.getByRole("button", {
      name: "ROAS is calculated. Edit its inputs",
    });
    // Only the lock sits beside the number, so tight layouts don't overflow;
    // the shortcuts are in the popover it opens. jsdom can't open a popover,
    // so the test reaches it through the lock.
    expect(screen.getAllByRole("button")).toEqual([trigger]);
    const menuId = trigger.getAttribute("popovertarget") ?? "";
    const menu = document.getElementById(menuId);
    if (!menu) throw new Error("The lock opens no popover");
    expect(menu).toHaveAttribute("popover", "auto");
    expect(menu).toHaveTextContent("Calculated from Revenue ÷ Spend.");

    await userEvent.click(
      within(menu).getByRole("button", { hidden: true, name: "Edit Spend" }),
    );
    expect(onCorrect).toHaveBeenCalledWith(spend);
  });

  it("points to where a calculated value's input is shown", async () => {
    const onShowValue = vi.fn();
    render(
      <ValueCorrection
        onCorrect={vi.fn()}
        onShowCorrections={vi.fn()}
        onShowValue={onShowValue}
        tabValues={[roas, revenue, spend]}
        value={roas}
      />,
    );
    const trigger = screen.getByRole("button", {
      name: "ROAS is calculated. Edit its inputs",
    });
    const menu = document.getElementById(
      trigger.getAttribute("popovertarget") ?? "",
    )!;
    await userEvent.click(
      within(menu).getByRole("button", {
        hidden: true,
        name: "Show Revenue on canvas",
      }),
    );
    expect(onShowValue).toHaveBeenCalledWith(revenue);
  });

  it("explains a calculated value whose inputs aren't on the tab", () => {
    render(
      <ValueCorrection
        onCorrect={vi.fn()}
        onShowCorrections={vi.fn()}
        tabValues={[roas]}
        value={roas}
      />,
    );
    // A click opens the explanation, so it also works on touch screens.
    const trigger = screen.getByRole("button", {
      name: "ROAS is calculated. Edit its inputs",
    });
    const menu = document.getElementById(
      trigger.getAttribute("popovertarget") ?? "",
    );
    expect(menu).toHaveTextContent(
      "Calculated from Revenue ÷ Spend. Its inputs aren't shown on this tab",
    );
  });

  it("corrects an input found on another tab", async () => {
    const onCorrect = vi.fn();
    const menuFor = (otherTabs: OtherTabValues) => {
      const view = render(
        <ValueCorrection
          onCorrect={onCorrect}
          onShowCorrections={vi.fn()}
          otherTabs={otherTabs}
          tabValues={[roas]}
          value={roas}
        />,
      );
      const trigger = within(view.container).getByRole("button", {
        name: "ROAS is calculated. Edit its inputs",
      });
      return {
        menu: document.getElementById(
          trigger.getAttribute("popovertarget") ?? "",
        )!,
        unmount: view.unmount,
      };
    };

    const loading = menuFor({
      status: "loading",
      values: [],
      onSearch: vi.fn(),
    });
    expect(loading.menu).toHaveTextContent("Looking on the other tabs");
    loading.unmount();

    const missing = menuFor({ status: "ready", values: [], onSearch: vi.fn() });
    expect(missing.menu).toHaveTextContent(
      "Its inputs aren't shown on any tab of this report",
    );
    missing.unmount();

    const found = menuFor({
      status: "ready",
      values: [{ value: spend, tabName: "Channels" }],
      onSearch: vi.fn(),
    });
    expect(found.menu).toHaveTextContent("Its inputs are on other tabs.");
    await userEvent.click(
      within(found.menu).getByRole("button", {
        hidden: true,
        name: /^Edit Spend\s*On the Channels tab$/,
      }),
    );
    expect(onCorrect).toHaveBeenCalledWith(spend);
  });

  it("offers the channels for a value that combines several", async () => {
    const onPickChannel = vi.fn();
    const combined = editingValue({ workspace_id: undefined });
    render(
      <ValueCorrection
        channels={[
          { code: "meta", name: "Meta Ads" },
          { code: "google", name: "Google Ads" },
        ]}
        onCorrect={vi.fn()}
        onPickChannel={onPickChannel}
        onShowCorrections={vi.fn()}
        tabValues={[combined]}
        value={combined}
      />,
    );
    const trigger = screen.getByRole("button", {
      name: "Spend combines several channels. Choose how to correct it",
    });
    // A working button, not a disabled one.
    expect(trigger).not.toHaveAttribute("aria-disabled");
    const menu = document.getElementById(
      trigger.getAttribute("popovertarget") ?? "",
    );
    if (!menu) throw new Error("The pencil opens no popover");
    await userEvent.click(
      within(menu).getByRole("button", { hidden: true, name: "Google Ads" }),
    );
    expect(onPickChannel).toHaveBeenCalledWith(combined, "google");
  });
});
