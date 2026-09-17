export const authPaths = {
  csrf: "/sanctum/csrf-cookie",
  login: "/api/v1/auth/login",
  me: "/api/v1/auth/me",
  logout: "/api/v1/auth/logout",
} as const;
