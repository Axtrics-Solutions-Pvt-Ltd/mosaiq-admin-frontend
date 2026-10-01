import "server-only";

import { getServerApiConfig } from "@/config/env";
import { forwardedAuthCookies, relayAuthCookies } from "@/lib/api/cookies";
import { authPaths } from "@/lib/api/paths";

export type AuthOperation = keyof typeof authPaths;

function xsrfFromCookie(cookieHeader: string): string | undefined {
  const part = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith("XSRF-TOKEN="));
  if (!part) return undefined;
  try {
    return decodeURIComponent(part.slice("XSRF-TOKEN=".length));
  } catch {
    return undefined;
  }
}

export async function forwardAuthRequest(
  operation: AuthOperation,
  incoming: Request,
): Promise<Response> {
  const config = getServerApiConfig();
  const isMutation = operation !== "csrf" && operation !== "me";
  const hasBody =
    operation === "login" ||
    operation === "forgotPassword" ||
    operation === "resetPassword" ||
    operation === "changePassword";
  if (isMutation && incoming.headers.get("origin") !== config.adminOrigin) {
    return Response.json(
      { message: "Invalid request origin." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  const cookie = forwardedAuthCookies(incoming, config.sessionCookieName);
  const headers = new Headers({
    Accept: "application/json",
    Origin: config.adminOrigin,
  });
  if (cookie) headers.set("Cookie", cookie);
  if (isMutation) {
    const token = xsrfFromCookie(cookie);
    if (token) headers.set("X-XSRF-TOKEN", token);
    if (hasBody) headers.set("Content-Type", "application/json");
  }
  const body = hasBody ? await incoming.text() : undefined;
  const upstream = await fetch(
    new URL(authPaths[operation], config.apiOrigin),
    {
      method: isMutation ? "POST" : "GET",
      headers,
      body,
      credentials: "include",
      cache: "no-store",
      redirect: "manual",
    },
  );
  const responseHeaders = new Headers({ "Cache-Control": "no-store" });
  const contentType = upstream.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json"))
    responseHeaders.set("Content-Type", "application/json");
  const requestId = upstream.headers.get("X-Request-ID");
  if (requestId) responseHeaders.set("X-Request-ID", requestId);
  relayAuthCookies(upstream, responseHeaders, config);
  if (upstream.status >= 300 && !contentType.includes("application/json")) {
    return Response.json(
      { message: "The authentication service could not complete the request." },
      {
        status: upstream.status >= 500 ? 502 : upstream.status,
        headers: responseHeaders,
      },
    );
  }
  return new Response(upstream.status === 204 ? null : await upstream.text(), {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function safeForwardAuthRequest(
  operation: AuthOperation,
  incoming: Request,
): Promise<Response> {
  try {
    return await forwardAuthRequest(operation, incoming);
  } catch {
    return Response.json(
      { message: "The authentication service is unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
