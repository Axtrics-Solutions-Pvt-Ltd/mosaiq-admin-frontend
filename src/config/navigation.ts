import type { LucideIcon } from "lucide-react";
import {
  Building,
  Building2,
  DatabaseZap,
  FileChartColumn,
  Gauge,
  LayoutDashboard,
  Plug,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import type { Capability } from "@/config/permissions";
import { routes } from "@/config/routes";

export type NavigationScope = {
  isSuperAdmin: boolean;
  agencyId: number | undefined;
};
export type NavigationItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  capability: Capability;
  // Overrides the label and link for a session; `href` stays the match prefix.
  resolve?: (
    scope: NavigationScope,
  ) => Partial<Pick<NavigationItem, "href" | "label">> | undefined;
};
export type NavigationGroup = {
  label: string;
  items: readonly NavigationItem[];
};
export const navigationGroups: readonly NavigationGroup[] = [
  {
    label: "Overview",
    items: [
      {
        href: routes.dashboard,
        icon: LayoutDashboard,
        label: "Dashboard",
        capability: "dashboard.view",
      },
    ],
  },
  {
    label: "Organization",
    items: [
      {
        href: routes.agencies.index,
        icon: Building2,
        label: "Agencies",
        capability: "agencies.manage",
        resolve: ({ isSuperAdmin, agencyId }) =>
          !isSuperAdmin && agencyId
            ? {
                label: "My Agency",
                href: routes.agencies.detail(String(agencyId)),
              }
            : undefined,
      },
      {
        href: routes.clients.index,
        icon: Building,
        label: "Clients",
        capability: "clients.view",
      },
      {
        href: routes.workspaces.index,
        icon: Gauge,
        label: "Workspaces",
        capability: "workspaces.manage",
      },
    ],
  },
  {
    label: "Reporting",
    items: [
      {
        href: routes.reports.index,
        icon: FileChartColumn,
        label: "Reports",
        capability: "reports.manage",
      },
    ],
  },
  {
    label: "Access management",
    items: [
      {
        href: routes.users.index,
        icon: UsersRound,
        label: "Users",
        capability: "users.manage",
      },
      {
        href: routes.roles,
        icon: ShieldCheck,
        label: "Roles & permissions",
        capability: "roles.view",
      },
    ],
  },
  {
    label: "Configuration",
    items: [
      {
        href: routes.channels,
        icon: Plug,
        label: "Channels",
        capability: "channels.manage",
      },
      {
        href: routes.governance,
        icon: DatabaseZap,
        label: "Audit & settings",
        capability: "settings.manage",
      },
    ],
  },
];
export const navigationItems = navigationGroups.flatMap((g) => g.items);
export function resolveNavigationItem(
  item: NavigationItem,
  scope: NavigationScope,
): NavigationItem {
  return { ...item, ...item.resolve?.(scope) };
}
export function getNavigationItem(pathname: string, scope?: NavigationScope) {
  const item = [...navigationItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return item && scope ? resolveNavigationItem(item, scope) : item;
}
export function filterNavigationGroups(
  groups: readonly NavigationGroup[],
  isVisible: (capability: Capability) => boolean,
  scope?: NavigationScope,
): readonly NavigationGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => isVisible(item.capability))
        .map((item) => (scope ? resolveNavigationItem(item, scope) : item)),
    }))
    .filter((group) => group.items.length > 0);
}
