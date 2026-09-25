export type Capability =
  | "dashboard.view"
  | "agencies.manage"
  | "agencies.create"
  | "clients.view"
  | "clients.manage"
  | "workspaces.manage"
  | "workspaces.delete"
  | "users.manage"
  | "roles.view"
  | "reports.manage"
  | "reports.delete"
  | "channels.manage"
  | "curation.manage"
  | "settings.manage";

// The only roles that can be granted now. Analyst, Viewer and Client User are
// legacy codes that existing memberships may still carry.
export const assignableAgencyRoles = ["AGENCY_ADMIN", "MANAGER"] as const;
export type AssignableAgencyRole = (typeof assignableAgencyRoles)[number];

const orgAdminCapabilities: readonly Capability[] = [
  "dashboard.view",
  "agencies.manage",
  "clients.view",
  "clients.manage",
  "workspaces.manage",
  "workspaces.delete",
  "users.manage",
  "roles.view",
  "reports.manage",
  "reports.delete",
  "curation.manage",
  "settings.manage",
];

// A Manager only reaches the clients and workspaces the API returns for them.
// They may delete any report they can edit; workspace delete stays with admins.
const managerCapabilities: readonly Capability[] = [
  "dashboard.view",
  "clients.view",
  "workspaces.manage",
  "reports.manage",
  "reports.delete",
];

const agencyStaffCapabilities: readonly Capability[] = ["dashboard.view"];

export const capabilitiesByAgencyRole: Record<
  string,
  readonly Capability[] | undefined
> = {
  AGENCY_ADMIN: orgAdminCapabilities,
  MANAGER: managerCapabilities,
  ANALYST: agencyStaffCapabilities,
  VIEWER: agencyStaffCapabilities,
};

export const superAdminCapabilities: readonly Capability[] = [
  ...orgAdminCapabilities,
  "agencies.create",
  "channels.manage",
];

export function capabilitiesForRole(roleCode: string): readonly Capability[] {
  if (roleCode === "SUPER_ADMIN") return superAdminCapabilities;
  return capabilitiesByAgencyRole[roleCode] ?? [];
}
