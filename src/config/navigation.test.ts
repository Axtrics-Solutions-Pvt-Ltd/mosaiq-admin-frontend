import { describe, expect, it } from "vitest";

import {
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
