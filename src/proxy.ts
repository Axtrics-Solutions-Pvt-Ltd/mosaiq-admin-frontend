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
    "/users/:path*",
    "/roles/:path*",
    "/data-import/:path*",
    "/import-history/:path*",
    "/connectors/:path*",
    "/curation/:path*",
    "/governance/:path*",
    "/design-system/:path*",
    "/invitations/:path*",
  ],
};
