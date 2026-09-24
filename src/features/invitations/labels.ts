import type { Invitation } from "./contracts";

export const invitationRoleLabels: Record<Invitation["role_code"], string> = {
  AGENCY_ADMIN: "Agency Admin",
  MANAGER: "Manager",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
  CLIENT_USER: "Client User",
};
