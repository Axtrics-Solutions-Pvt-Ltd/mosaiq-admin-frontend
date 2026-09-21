import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Cable,
  DatabaseZap,
  FileClock,
  Gauge,
  LayoutDashboard,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  UsersRound,
} from "lucide-react";

import type { Capability } from "@/config/permissions";
import { routes } from "@/config/routes";
export type NavigationItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  capability: Capability;
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
    label: "Data management",
    items: [
      {
        href: routes.dataImport,
        icon: Upload,
        label: "Data import",
        capability: "imports.create",
      },
      {
        href: routes.importHistory,
        icon: FileClock,
        label: "Import history",
        capability: "importHistory.view",
      },
      {
        href: routes.connectors,
        icon: Cable,
        label: "Connector status",
        capability: "connectors.view",
      },
    ],
  },
  {
    label: "Configuration",
    items: [
      {
        href: routes.curation,
        icon: SlidersHorizontal,
        label: "KPI & module curation",
        capability: "curation.manage",
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
export function getNavigationItem(pathname: string) {
  return [...navigationItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
}
export function filterNavigationGroups(
  groups: readonly NavigationGroup[],
  isVisible: (capability: Capability) => boolean,
): readonly NavigationGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isVisible(item.capability)),
    }))
    .filter((group) => group.items.length > 0);
}
