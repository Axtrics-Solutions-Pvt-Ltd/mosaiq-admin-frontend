function routeWithId(basePath: string, id: string) {
  return `${basePath}/${encodeURIComponent(id)}` as const;
}
export const routes = {
  home: "/",
  login: "/login",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  acceptInvitation: "/accept-invitation",
  forbidden: "/forbidden",
  signedOut: "/login?reason=signed-out",
  sessionExpired: "/login?reason=session-expired",
  dashboard: "/dashboard",
  agencies: {
    index: "/agencies",
    new: "/agencies/new",
    detail: (id: string) => routeWithId("/agencies", id),
    edit: (id: string) => `${routeWithId("/agencies", id)}/edit` as const,
  },
  workspaces: {
    index: "/workspaces",
    new: "/workspaces/new",
    detail: (id: string) => routeWithId("/workspaces", id),
    edit: (id: string) => `${routeWithId("/workspaces", id)}/edit` as const,
  },
  users: {
    index: "/users",
    invite: "/users/invite",
    invitations: "/users/invitations",
    detail: (id: string) => routeWithId("/users", id),
    edit: (id: string) => `${routeWithId("/users", id)}/edit` as const,
  },
  roles: "/roles",
  dataImport: "/data-import",
  importHistory: "/import-history",
  connectors: "/connectors",
  curation: "/curation",
  governance: "/governance",
  designSystem: "/design-system",
} as const;

export function workspaceScope(agencyId: number, clientId: number) {
  const params = new URLSearchParams({
    agency: String(agencyId),
    client: String(clientId),
  });
  return "?" + params;
}
export function workspaceDetailUrl(
  workspaceId: number,
  agencyId: number,
  clientId: number,
) {
  return (
    routes.workspaces.detail(String(workspaceId)) +
    workspaceScope(agencyId, clientId)
  );
}
export function workspaceEditUrl(
  workspaceId: number,
  agencyId: number,
  clientId: number,
) {
  return (
    routes.workspaces.edit(String(workspaceId)) +
    workspaceScope(agencyId, clientId)
  );
}
export function userDetailUrl(userId: number, agencyId: number) {
  return `${routes.users.detail(String(userId))}?agency=${agencyId}`;
}
export function userEditUrl(userId: number, agencyId: number) {
  return `${routes.users.edit(String(userId))}?agency=${agencyId}`;
}
export function userInvitationsUrl(agencyId: number) {
  return `${routes.users.invitations}?agency=${agencyId}`;
}
