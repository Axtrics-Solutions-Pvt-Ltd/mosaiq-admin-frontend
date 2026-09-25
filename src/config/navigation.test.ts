import { describe, expect, it } from "vitest";

import {
  filterNavigationGroups,
  getNavigationItem,
  navigationGroups,
  navigationItems,
  type NavigationScope,
} from "@/config/navigation";
import { capabilitiesForRole } from "@/config/permissions";

const superAdminScope: NavigationScope = {
  isSuperAdmin: true,
  agencyId: undefined,
};
const agencyScope: NavigationScope = { isSuperAdmin: false, agencyId: 12 };

function visibleLabels(roleCode: string, scope: NavigationScope) {
  const capabilities = capabilitiesForRole(roleCode);
  return filterNavigationGroups(
    navigationGroups,
    (capability) => capabilities.includes(capability),
    scope,
  ).flatMap((group) => group.items.map((item) => item.label));
}

describe("navigation configuration", () => {
  it("keeps every authenticated screen group in one unique configuration", () => {
    expect(navigationGroups).toHaveLength(5);
    expect(navigationItems).toHaveLength(9);
    expect(new Set(navigationItems.map((item) => item.href)).size).toBe(
      navigationItems.length,
    );
  });
  it("matches nested routes to their parent destination", () => {
    expect(getNavigationItem("/agencies/northstar/edit")?.label).toBe(
      "Agencies",
    );
    expect(getNavigationItem("/users/invite")?.label).toBe("Users");
  });
  it("has no destination for retired data management and curation screens", () => {
    for (const path of [
      "/data-import",
      "/import-history",
      "/connectors",
      "/curation",
    ])
      expect(getNavigationItem(path)).toBeUndefined();
  });
});

describe("agencies destination", () => {
  it("stays the Agencies list for a Super Admin", () => {
    const item = getNavigationItem("/agencies/12", superAdminScope);
    expect(item).toMatchObject({ label: "Agencies", href: "/agencies" });
  });
  it("becomes My Agency, linked to the own agency, for everyone else", () => {
    expect(getNavigationItem("/agencies/12/edit", agencyScope)).toMatchObject({
      label: "My Agency",
      href: "/agencies/12",
    });
  });
});

describe("capability-based navigation filtering", () => {
  it("shows nothing to a session with no capabilities", () => {
    const visible = filterNavigationGroups(navigationGroups, () => false);
    expect(visible).toHaveLength(0);
  });
  it("shows a Super Admin every destination", () => {
    expect(visibleLabels("SUPER_ADMIN", superAdminScope)).toEqual([
      "Dashboard",
      "Agencies",
      "Clients",
      "Workspaces",
      "Reports",
      "Users",
      "Roles & permissions",
      "Channels",
      "Audit & settings",
    ]);
  });
  it("shows an Agency Admin My Agency in place of Agencies", () => {
    expect(visibleLabels("AGENCY_ADMIN", agencyScope)).toEqual([
      "Dashboard",
      "My Agency",
      "Clients",
      "Workspaces",
      "Reports",
      "Users",
      "Roles & permissions",
      "Audit & settings",
    ]);
  });
  it("shows a Manager the Dashboard, Clients, Workspaces and Reports", () => {
    expect(visibleLabels("MANAGER", agencyScope)).toEqual([
      "Dashboard",
      "Clients",
      "Workspaces",
      "Reports",
    ]);
  });
  it("leaves groups unchanged when no scope is given", () => {
    const visible = filterNavigationGroups(navigationGroups, () => true);
    expect(visible).toEqual(navigationGroups);
  });
});
