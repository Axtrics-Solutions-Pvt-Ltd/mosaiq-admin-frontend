import { describe, expect, it } from "vitest";

import {
  filterNavigationGroups,
  getNavigationItem,
  navigationGroups,
  navigationItems,
} from "@/config/navigation";
describe("navigation configuration", () => {
  it("keeps every authenticated screen group in one unique configuration", () => {
    expect(navigationGroups).toHaveLength(5);
    expect(navigationItems).toHaveLength(10);
    expect(new Set(navigationItems.map((item) => item.href)).size).toBe(
      navigationItems.length,
    );
  });
  it("matches nested routes to their parent destination", () => {
    expect(getNavigationItem("/agencies/northstar/edit")?.label).toBe(
      "Agencies",
    );
    expect(getNavigationItem("/import-history")?.label).toBe("Import history");
  });
});

describe("capability-based navigation filtering", () => {
  it("shows only Dashboard to a session with no capabilities", () => {
    const visible = filterNavigationGroups(navigationGroups, () => false);
    expect(visible).toHaveLength(0);
  });
  it("shows an agency staff role only Dashboard, Import history, and Connector status", () => {
    const staffCapabilities = new Set([
      "dashboard.view",
      "importHistory.view",
      "connectors.view",
    ]);
    const visible = filterNavigationGroups(navigationGroups, (capability) =>
      staffCapabilities.has(capability),
    );
    const labels = visible.flatMap((group) =>
      group.items.map((item) => item.label),
    );
    expect(labels).toEqual(["Dashboard", "Import history", "Connector status"]);
  });
  it("shows every destination to a full-capability session", () => {
    const visible = filterNavigationGroups(navigationGroups, () => true);
    expect(visible).toEqual(navigationGroups);
  });
});
