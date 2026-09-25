import { type NextRequest, NextResponse } from "next/server";

import { getServerApiConfig } from "@/config/env";
import { routes } from "@/config/routes";

export function proxy(request: NextRequest) {
  const { sessionCookieName } = getServerApiConfig();
  if (!request.cookies.has(sessionCookieName)) {
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
    "/curation/:path*",
    "/governance/:path*",
    "/design-system/:path*",
    "/invitations/:path*",
  ],
};
