import type { LucideIcon } from "lucide-react";
import { Building2, Plus, Upload, UserPlus } from "lucide-react";

import type { Capability } from "@/config/permissions";
import { routes } from "@/config/routes";

export type ActionDefinition = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  capability: Capability;
};

export const quickActions: readonly ActionDefinition[] = [
  {
    id: "add-agency",
    label: "Add agency",
    href: routes.agencies.new,
    icon: Building2,
    capability: "agencies.create",
  },
  {
    id: "add-workspace",
    label: "Add workspace",
    href: routes.workspaces.new,
    icon: Plus,
    capability: "workspaces.manage",
  },
  {
    id: "invite-user",
    label: "Invite user",
    href: routes.users.invite,
    icon: UserPlus,
    capability: "users.manage",
  },
  {
    id: "import-data",
    label: "Import data",
    href: routes.dataImport,
    icon: Upload,
    capability: "imports.create",
  },
];

export function filterActions(
  actions: readonly ActionDefinition[],
  isVisible: (capability: Capability) => boolean,
): readonly ActionDefinition[] {
  return actions.filter((action) => isVisible(action.capability));
}
