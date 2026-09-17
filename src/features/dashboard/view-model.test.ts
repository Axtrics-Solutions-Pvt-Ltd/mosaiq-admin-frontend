import { describe, expect, it } from "vitest";

import { getDashboardView } from "@/features/dashboard/view-model";

describe("dashboard view model", () => {
  it("updates aggregate metrics for the selected period and source", () => {
    const dashboard = getDashboardView("all", "90", "csv");

    expect(dashboard.scopeLabel).toBe("All agencies");
    expect(
      dashboard.metrics.find((metric) => metric.id === "completed")?.value,
    ).toBe(243);
    expect(dashboard.imports).toHaveLength(2);
    expect(dashboard.imports.every((entry) => entry.source === "csv")).toBe(
      true,
    );
  });

  it("provides an empty onboarding scope without operational content", () => {
    const dashboard = getDashboardView("newbridge", "30", "all");

    expect(dashboard.scopeLabel).toBe("Newbridge Media");
    expect(
      dashboard.metrics.find((metric) => metric.id === "workspaces")?.value,
    ).toBe(0);
    expect(dashboard.agencyUsage).toEqual([]);
    expect(dashboard.imports).toEqual([]);
  });

  it("keeps agency content within the selected scope", () => {
    const dashboard = getDashboardView("northstar", "30", "all");

    expect(dashboard.imports).toHaveLength(1);
    expect(dashboard.imports[0]?.agency).toBe("Northstar Digital");
    expect(dashboard.attention[0]?.description).toContain("Northstar Digital");
  });
});
