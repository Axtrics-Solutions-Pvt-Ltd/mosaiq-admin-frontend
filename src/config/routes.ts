function routeWithId(basePath: string, id: string) {
  return `${basePath}/${encodeURIComponent(id)}` as const;
}
export const routes = {
  home: "/",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
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
