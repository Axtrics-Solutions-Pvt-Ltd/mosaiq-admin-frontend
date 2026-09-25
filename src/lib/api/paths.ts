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
  credentials: (agencyId: number, clientId: number, workspaceId: number) =>
    `/api/v1/agencies/${agencyId}/clients/${clientId}/workspaces/${workspaceId}/credentials`,
  fetch: (agencyId: number, clientId: number, workspaceId: number) =>
    `/api/v1/agencies/${agencyId}/clients/${clientId}/workspaces/${workspaceId}/fetch`,
} as const;

export const channelPaths = {
  collection: "/api/v1/channels",
  adminCollection: "/api/v1/admin/channels",
  adminDetail: (channelId: number) => `/api/v1/admin/channels/${channelId}`,
} as const;

export const clientPaths = {
  allCollection: "/api/v1/clients",
} as const;

const reportBase = (agencyId: number, clientId: number, reportId: number) =>
  `/api/v1/agencies/${agencyId}/clients/${clientId}/reports/${reportId}`;

export const reportPaths = {
  collection: (agencyId: number, clientId: number) =>
    `/api/v1/agencies/${agencyId}/clients/${clientId}/reports`,
  detail: reportBase,
  workspaces: (agencyId: number, clientId: number, reportId: number) =>
    `${reportBase(agencyId, clientId, reportId)}/workspaces`,
  duplicate: (agencyId: number, clientId: number, reportId: number) =>
    `${reportBase(agencyId, clientId, reportId)}/duplicate`,
  layout: (agencyId: number, clientId: number, reportId: number) =>
    `${reportBase(agencyId, clientId, reportId)}/layout`,
  layoutOrder: (agencyId: number, clientId: number, reportId: number) =>
    `${reportBase(agencyId, clientId, reportId)}/layout/order`,
  layoutItem: (
    agencyId: number,
    clientId: number,
    reportId: number,
    itemId: number,
  ) => `${reportBase(agencyId, clientId, reportId)}/layout/${itemId}`,
  layoutItemReset: (
    agencyId: number,
    clientId: number,
    reportId: number,
    itemId: number,
  ) => `${reportBase(agencyId, clientId, reportId)}/layout/${itemId}/reset`,
  previewMeta: (agencyId: number, clientId: number, reportId: number) =>
    `${reportBase(agencyId, clientId, reportId)}/preview/meta`,
  previewTab: (
    agencyId: number,
    clientId: number,
    reportId: number,
    tabCode: string,
  ) =>
    `${reportBase(agencyId, clientId, reportId)}/preview/tabs/${encodeURIComponent(tabCode)}`,
  links: (agencyId: number, clientId: number, reportId: number) =>
    `${reportBase(agencyId, clientId, reportId)}/links`,
  link: (
    agencyId: number,
    clientId: number,
    reportId: number,
    linkId: number,
  ) => `${reportBase(agencyId, clientId, reportId)}/links/${linkId}`,
  linkRevoke: (
    agencyId: number,
    clientId: number,
    reportId: number,
    linkId: number,
  ) => `${reportBase(agencyId, clientId, reportId)}/links/${linkId}/revoke`,
  linkRegenerate: (
    agencyId: number,
    clientId: number,
    reportId: number,
    linkId: number,
  ) => `${reportBase(agencyId, clientId, reportId)}/links/${linkId}/regenerate`,
} as const;

export const correctionPaths = {
  collection: (agencyId: number, clientId: number) =>
    `/api/v1/agencies/${agencyId}/clients/${clientId}/metric-corrections`,
  detail: (agencyId: number, clientId: number, correctionId: number) =>
    `/api/v1/agencies/${agencyId}/clients/${clientId}/metric-corrections/${correctionId}`,
} as const;

export const budgetPaths = {
  collection: (agencyId: number, clientId: number) =>
    `/api/v1/agencies/${agencyId}/clients/${clientId}/budgets`,
} as const;
