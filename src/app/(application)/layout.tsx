import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { getServerApiConfig } from "@/config/env";
import { routes } from "@/config/routes";
import {
  canAccessAdmin,
  currentUserSchema,
  normalizeCurrentUser,
} from "@/features/auth/contracts";
import { authKeys } from "@/features/auth/queries";
import { authPaths } from "@/lib/api/paths";
import { forwardAuthRequest } from "@/lib/api/server";

export default async function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const incoming = await headers();
  let response: Response;
  try {
    response = await forwardAuthRequest(
      "me",
      new Request(new URL(authPaths.me, getServerApiConfig().adminOrigin), {
        headers: { cookie: incoming.get("cookie") ?? "" },
      }),
    );
  } catch {
    return (
      <div role="alert" className="p-8">
        Authentication is temporarily unavailable. Please try again later.
      </div>
    );
  }
  if (response.status === 401) {
    let errorCode: unknown;
    try {
      errorCode = (await response.json()).error_code;
    } catch {
      errorCode = undefined;
    }
    redirect(
      errorCode === "UNAUTHENTICATED" ? routes.sessionExpired : routes.login,
    );
  }
  if (response.status === 403) redirect(routes.forbidden);
  if (!response.ok)
    return (
      <div role="alert" className="p-8">
        Authentication is temporarily unavailable. Please try again later.
      </div>
    );
  const parsed = currentUserSchema.safeParse(await response.json());
  if (!parsed.success)
    return (
      <div role="alert" className="p-8">
        We could not verify your account. Please try again later.
      </div>
    );
  const user = normalizeCurrentUser(parsed.data.data);
  if (!canAccessAdmin(user)) redirect(routes.forbidden);
  const queryClient = new QueryClient();
  queryClient.setQueryData(authKeys.me(), user);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<div className="bg-background min-h-screen" />}>
        <AppShell>{children}</AppShell>
      </Suspense>
    </HydrationBoundary>
  );
}
