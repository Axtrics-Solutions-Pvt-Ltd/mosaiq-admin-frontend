import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { EditingValue } from "./contracts";
import { ValueCorrection } from "./ValueCorrection";

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

  it("explains a calculated value whose inputs aren't on the tab", () => {
    render(
      <ValueCorrection
        onCorrect={vi.fn()}
        onShowCorrections={vi.fn()}
        tabValues={[roas]}
        value={roas}
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "ROAS: Calculated from Revenue ÷ Spend. Edit those instead.",
      }),
    ).toHaveAttribute("aria-disabled");
  });
});
