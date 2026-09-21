export const authPaths = {
  csrf: "/sanctum/csrf-cookie",
  login: "/api/v1/auth/login",
  forgotPassword: "/api/v1/auth/forgot-password",
  resetPassword: "/api/v1/auth/reset-password",
  me: "/api/v1/auth/me",
  logout: "/api/v1/auth/logout",
} as const;

export const invitationPaths = {
  collection: (agencyId: number) =>
    `/api/v1/admin/agencies/${agencyId}/invitations`,
  detail: (agencyId: number, invitationId: number) =>
    `/api/v1/admin/agencies/${agencyId}/invitations/${invitationId}`,
} as const;

export const agencyPaths = {
  collection: "/api/v1/agencies",
  detail: (agencyId: number) => `/api/v1/agencies/${agencyId}`,
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
} as const;
