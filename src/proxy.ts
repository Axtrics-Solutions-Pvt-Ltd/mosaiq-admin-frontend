import { type NextRequest, NextResponse } from "next/server";

import { getServerApiConfig } from "@/config/env";
import { routes } from "@/config/routes";
import { rememberCookiePrefix } from "@/lib/api/cookies";

export function proxy(request: NextRequest) {
  const { sessionCookieName } = getServerApiConfig();
  // A remembered user may arrive with only the remember-me cookie; the first
  // API call then restores their session.
  const isRemembered = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith(rememberCookiePrefix));
  if (!request.cookies.has(sessionCookieName) && !isRemembered) {
    return NextResponse.redirect(new URL(routes.login, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agencies/:path*",
    "/workspaces/:path*",
    "/reports/:path*",
    "/users/:path*",
    "/roles/:path*",
    "/channels/:path*",
    "/governance/:path*",
    "/design-system/:path*",
    "/invitations/:path*",
  ],
};
