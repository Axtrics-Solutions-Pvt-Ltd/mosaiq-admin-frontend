import type { CurrentUser } from "@/features/auth/contracts";

import type { AgencyUser } from "./contracts";

export const roleLabels: Record<AgencyUser["role_code"], string> = {
  AGENCY_ADMIN: "Agency Admin",
  MANAGER: "Manager",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
  CLIENT_USER: "Client User",
};

export function currentUserRoleLabel(user: CurrentUser) {
  if (user.platformRoleCode === "SUPER_ADMIN") return "Super Admin";
  const role = user.membership?.roleCode;
  return role && Object.hasOwn(roleLabels, role)
    ? roleLabels[role as keyof typeof roleLabels]
    : "Account";
}
