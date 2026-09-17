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

import { routes } from "@/config/routes";
export type NavigationItem = { href: string; icon: LucideIcon; label: string };
export type NavigationGroup = {
  label: string;
  items: readonly NavigationItem[];
};
export const navigationGroups: readonly NavigationGroup[] = [
  {
    label: "Overview",
    items: [
      { href: routes.dashboard, icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: routes.agencies.index, icon: Building2, label: "Agencies" },
      { href: routes.workspaces.index, icon: Gauge, label: "Workspaces" },
    ],
  },
  {
    label: "Access management",
    items: [
      { href: routes.users.index, icon: UsersRound, label: "Users" },
      { href: routes.roles, icon: ShieldCheck, label: "Roles & permissions" },
    ],
  },
  {
    label: "Data management",
    items: [
      { href: routes.dataImport, icon: Upload, label: "Data import" },
      { href: routes.importHistory, icon: FileClock, label: "Import history" },
      { href: routes.connectors, icon: Cable, label: "Connector status" },
    ],
  },
  {
    label: "Configuration",
    items: [
      {
        href: routes.curation,
        icon: SlidersHorizontal,
        label: "KPI & module curation",
      },
      { href: routes.governance, icon: DatabaseZap, label: "Audit & settings" },
    ],
  },
];
export const navigationItems = navigationGroups.flatMap((g) => g.items);
export function getNavigationItem(pathname: string) {
  return [...navigationItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
}
