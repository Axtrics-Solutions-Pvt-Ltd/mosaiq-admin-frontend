import { apiRequest } from "@/lib/api/client";
import { authPaths } from "@/lib/api/paths";

import { type CurrentUser, parseCurrentUser } from "./contracts";

export async function csrfBootstrap() {
  await apiRequest<void>(authPaths.csrf);
}

export async function login(credentials: {
  email: string;
  password: string;
}): Promise<CurrentUser> {
  await csrfBootstrap();
  const result = await apiRequest<unknown>(authPaths.login, {
    method: "POST",
    body: credentials,
  });
  return parseCurrentUser(result);
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const result = await apiRequest<unknown>(authPaths.me);
  return parseCurrentUser(result);
}

export async function logout(): Promise<void> {
  await apiRequest<void>(authPaths.logout, { method: "POST" });
}
