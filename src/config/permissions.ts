export type Capability =
  | "dashboard.view"
  | "agencies.manage"
  | "agencies.create"
  | "workspaces.manage"
  | "users.manage"
  | "roles.view"
  | "imports.create"
  | "importHistory.view"
  | "connectors.view"
  | "curation.manage"
  | "settings.manage";

const orgAdminCapabilities: readonly Capability[] = [
  "dashboard.view",
  "agencies.manage",
  "workspaces.manage",
  "users.manage",
  "roles.view",
  "imports.create",
  "importHistory.view",
  "connectors.view",
  "curation.manage",
  "settings.manage",
];

const agencyStaffCapabilities: readonly Capability[] = [
  "dashboard.view",
  "importHistory.view",
  "connectors.view",
];

export const capabilitiesByAgencyRole: Record<
  string,
  readonly Capability[] | undefined
> = {
  AGENCY_ADMIN: orgAdminCapabilities,
  MANAGER: agencyStaffCapabilities,
  ANALYST: agencyStaffCapabilities,
  VIEWER: agencyStaffCapabilities,
};

export const superAdminCapabilities: readonly Capability[] = [
  ...orgAdminCapabilities,
  "agencies.create",
];
