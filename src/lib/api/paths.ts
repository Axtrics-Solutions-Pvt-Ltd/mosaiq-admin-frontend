export const authPaths = {
  csrf: "/sanctum/csrf-cookie",
  login: "/api/v1/auth/login",
  forgotPassword: "/api/v1/auth/forgot-password",
  resetPassword: "/api/v1/auth/reset-password",
  changePassword: "/api/v1/auth/change-password",
  me: "/api/v1/auth/me",
  logout: "/api/v1/auth/logout",
} as const;

export const invitationPaths = {
  collection: (agencyId: number) =>
    `/api/v1/admin/agencies/${agencyId}/invitations`,
  detail: (agencyId: number, invitationId: number) =>
    `/api/v1/admin/agencies/${agencyId}/invitations/${invitationId}`,
  resend: (agencyId: number, invitationId: number) =>
    `/api/v1/admin/agencies/${agencyId}/invitations/${invitationId}/resend`,
  inspect: "/api/v1/invitations/inspect",
  accept: "/api/v1/invitations/accept",
  reject: "/api/v1/invitations/reject",
} as const;

export const myInvitationPaths = {
  collection: "/api/v1/me/invitations",
  accept: (invitationId: number) =>
    `/api/v1/me/invitations/${invitationId}/accept`,
  reject: (invitationId: number) =>
    `/api/v1/me/invitations/${invitationId}/reject`,
} as const;

export const agencyPaths = {
  collection: "/api/v1/agencies",
  detail: (agencyId: number) => `/api/v1/agencies/${agencyId}`,
} as const;

export const dashboardPaths = {
  summary: "/api/v1/dashboard/summary",
} as const;

export const userPaths = {
  collection: (agencyId: number) => `/api/v1/agencies/${agencyId}/users`,
  detail: (agencyId: number, userId: number) =>
    `/api/v1/agencies/${agencyId}/users/${userId}`,
  allCollection: "/api/v1/users",
} as const;

export const rolePaths = {
  collection: "/api/v1/admin/roles",
} as const;

export const csvImportPaths = {
  preview: (agencyId: number, clientId: number, workspaceId: number) =>
    `/api/v1/admin/agencies/${agencyId}/clients/${clientId}/workspaces/${workspaceId}/csv-imports/preview`,
  detail: (
    agencyId: number,
    clientId: number,
    workspaceId: number,
    csvImportId: number,
  ) =>
    `/api/v1/admin/agencies/${agencyId}/clients/${clientId}/workspaces/${workspaceId}/csv-imports/${csvImportId}`,
  confirm: (
    agencyId: number,
    clientId: number,
    workspaceId: number,
    csvImportId: number,
  ) =>
    `/api/v1/admin/agencies/${agencyId}/clients/${clientId}/workspaces/${workspaceId}/csv-imports/${csvImportId}/confirm`,
  retry: (
    agencyId: number,
    clientId: number,
    workspaceId: number,
    csvImportId: number,
  ) =>
    `/api/v1/admin/agencies/${agencyId}/clients/${clientId}/workspaces/${workspaceId}/csv-imports/${csvImportId}/retry`,
} as const;

export const importHistoryPaths = {
  collection: "/api/v1/import-history",
} as const;

export const csvTemplatePaths = {
  collection: (agencyId: number, clientId: number, workspaceId: number) =>
    `/api/v1/admin/agencies/${agencyId}/clients/${clientId}/workspaces/${workspaceId}/csv-templates`,
  download: (
    agencyId: number,
    clientId: number,
    workspaceId: number,
    type: string,
    version: number,
  ) =>
    `/api/v1/admin/agencies/${agencyId}/clients/${clientId}/workspaces/${workspaceId}/csv-templates/${type}/versions/${version}`,
  allCollection: "/api/v1/csv-templates",
} as const;

export const creativeAssetPaths = {
  collection: (agencyId: number, clientId: number, workspaceId: number) =>
    `/api/v1/admin/agencies/${agencyId}/clients/${clientId}/workspaces/${workspaceId}/creative-assets`,
  attachAsset: (
    agencyId: number,
    clientId: number,
    workspaceId: number,
    creativeAssetId: number,
  ) =>
    `/api/v1/admin/agencies/${agencyId}/clients/${clientId}/workspaces/${workspaceId}/creative-assets/${creativeAssetId}/asset`,
  allCollection: "/api/v1/creative-assets",
} as const;

export const curationPaths = {
  detail: (workspaceId: number) =>
    `/api/v1/admin/workspaces/${workspaceId}/curation`,
} as const;

export const workspacePaths = {
  clients: (agencyId: number) => "/api/v1/agencies/" + agencyId + "/clients",
  client: (agencyId: number, clientId: number) =>
    "/api/v1/agencies/" + agencyId + "/clients/" + clientId,
  collection: (agencyId: number, clientId: number) =>
    "/api/v1/agencies/" + agencyId + "/clients/" + clientId + "/workspaces",
  detail: (agencyId: number, clientId: number, workspaceId: number) =>
    "/api/v1/agencies/" +
    agencyId +
    "/clients/" +
    clientId +
    "/workspaces/" +
    workspaceId,
  agencyCollection: (agencyId: number) =>
    "/api/v1/agencies/" + agencyId + "/workspaces",
  allCollection: "/api/v1/workspaces",
} as const;

export const clientPaths = {
  allCollection: "/api/v1/clients",
} as const;
