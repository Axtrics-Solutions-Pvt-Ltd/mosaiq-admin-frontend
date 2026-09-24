function routeWithId(basePath: string, id: string) {
  return `${basePath}/${encodeURIComponent(id)}` as const;
}
export const routes = {
  home: "/",
  login: "/login",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  acceptInvitation: "/accept-invitation",
  pendingInvitations: "/invitations/pending",
  forbidden: "/forbidden",
  signedOut: "/login?reason=signed-out",
  sessionExpired: "/login?reason=session-expired",
  dashboard: "/dashboard",
  profile: "/profile",
  agencies: {
    index: "/agencies",
    new: "/agencies/new",
    detail: (id: string) => routeWithId("/agencies", id),
    edit: (id: string) => `${routeWithId("/agencies", id)}/edit` as const,
  },
  clients: {
    index: "/clients",
    new: "/clients/new",
    detail: (id: string) => routeWithId("/clients", id),
    edit: (id: string) => `${routeWithId("/clients", id)}/edit` as const,
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

export function acceptInvitationUrl(token: string) {
  return `${routes.acceptInvitation}?${new URLSearchParams({ token })}`;
}

export function loginWithReturnUrl(returnPath: string) {
  return `${routes.login}?${new URLSearchParams({ next: returnPath })}`;
}

// Only these pages may be targeted by the post-login `next` parameter, so the
// sign-in form cannot be used as an open redirect.
const allowedReturnPaths: readonly string[] = [routes.acceptInvitation];
const returnPathBase = "http://return-path.invalid";

export function safeReturnPath(value: string | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) return undefined;
  let url: URL;
  try {
    url = new URL(value, returnPathBase);
  } catch {
    return undefined;
  }
  if (url.origin !== returnPathBase || !allowedReturnPaths.includes(url.pathname))
    return undefined;
  return `${url.pathname}${url.search}`;
}

export function clientScope(agencyId: number) {
  const params = new URLSearchParams({ agency: String(agencyId) });
  return "?" + params;
}
export function clientDetailUrl(clientId: number, agencyId: number) {
  return routes.clients.detail(String(clientId)) + clientScope(agencyId);
}
export function clientEditUrl(clientId: number, agencyId: number) {
  return routes.clients.edit(String(clientId)) + clientScope(agencyId);
}
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
