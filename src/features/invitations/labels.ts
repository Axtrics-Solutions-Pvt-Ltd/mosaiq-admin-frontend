import type { Invitation } from "./contracts";

/** Label for a whole-client Manager invitation, e.g. "All workspaces of Acme (3)". */
export function wholeClientLabel(
  clientName: string | null | undefined,
  workspaceCount?: number | null,
) {
  const client = clientName ? ` of ${clientName}` : "";
  const count =
    workspaceCount === null || workspaceCount === undefined
      ? ""
      : ` (${workspaceCount})`;
  return `All workspaces${client}${count}`;
}

export const invitationRoleLabels: Record<Invitation["role_code"], string> = {
  AGENCY_ADMIN: "Agency Admin",
  MANAGER: "Manager",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
  CLIENT_USER: "Client User",
};
