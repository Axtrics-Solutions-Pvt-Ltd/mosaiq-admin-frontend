import "server-only";

import { getServerApiConfig } from "@/config/env";

function csrfToken(cookie: string) {
  const value = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("XSRF-TOKEN="));
  if (!value) return undefined;
  try {
    return decodeURIComponent(value.slice("XSRF-TOKEN=".length));
  } catch {
    return undefined;
  }
}

export async function forwardAdminMutation(
  request: Request,
  path: string,
  method: "POST" | "DELETE",
  body?: unknown,
) {
  try {
    const config = getServerApiConfig();
    if (request.headers.get("origin") !== config.adminOrigin)
      return Response.json(
        { message: "Invalid request origin." },
        { status: 403 },
      );
    const cookie = (request.headers.get("cookie") ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(
        (part) =>
          part.startsWith("XSRF-TOKEN=") ||
          part.startsWith(`${config.sessionCookieName}=`),
      )
      .join("; ");
    const headers = new Headers({
      Accept: "application/json",
      Origin: config.adminOrigin,
    });
    if (cookie) headers.set("Cookie", cookie);
    const token = csrfToken(cookie);
    if (token) headers.set("X-XSRF-TOKEN", token);
    if (body !== undefined) headers.set("Content-Type", "application/json");
    const upstream = await fetch(new URL(path, config.apiOrigin), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
      cache: "no-store",
      redirect: "manual",
    });
    const contentType = upstream.headers.get("Content-Type") ?? "";
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    if (contentType.includes("application/json"))
      responseHeaders.set("Content-Type", "application/json");
    const requestId = upstream.headers.get("X-Request-ID");
    if (requestId) responseHeaders.set("X-Request-ID", requestId);
    if (upstream.status >= 300 && !contentType.includes("application/json"))
      return Response.json(
        { message: "The service could not complete the request." },
        {
          status: upstream.status >= 500 ? 502 : upstream.status,
          headers: responseHeaders,
        },
      );
    return new Response(
      upstream.status === 204 ? null : await upstream.text(),
      {
        status: upstream.status,
        headers: responseHeaders,
      },
    );
  } catch {
    return Response.json(
      { message: "The service is unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
