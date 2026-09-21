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

export async function requestPasswordReset(email: string): Promise<void> {
  await csrfBootstrap();
  await apiRequest<{ message: string }>(authPaths.forgotPassword, {
    method: "POST",
    body: { email },
  });
}

export async function resetPassword(credentials: {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  await csrfBootstrap();
  await apiRequest<void>(authPaths.resetPassword, {
    method: "POST",
    body: credentials,
  });
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const result = await apiRequest<unknown>(authPaths.me);
  return parseCurrentUser(result);
}

export async function logout(): Promise<void> {
  await apiRequest<void>(authPaths.logout, { method: "POST" });
}
