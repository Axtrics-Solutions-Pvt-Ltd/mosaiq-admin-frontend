import "server-only";

import { getServerApiConfig } from "@/config/env";

type ServerApiConfig = ReturnType<typeof getServerApiConfig>;

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

function forwardCookie(request: Request, config: ServerApiConfig) {
  return (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(
      (part) =>
        part.startsWith("XSRF-TOKEN=") ||
        part.startsWith(`${config.sessionCookieName}=`),
    )
    .join("; ");
}

function buildForwardHeaders(
  request: Request,
  config: ServerApiConfig,
  method: "GET" | "POST" | "PUT" | "DELETE",
  hasJsonBody: boolean,
) {
  const cookie = forwardCookie(request, config);
  const headers = new Headers({
    Accept: "application/json",
    Origin: config.adminOrigin,
  });
  if (cookie) headers.set("Cookie", cookie);
  if (method !== "GET") {
    const token = csrfToken(cookie);
    if (token) headers.set("X-XSRF-TOKEN", token);
    if (hasJsonBody) headers.set("Content-Type", "application/json");
  }
  return headers;
}

async function relayUpstream(upstream: Response) {
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
  return new Response(upstream.status === 204 ? null : await upstream.text(), {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function forwardAdminRequest(
  request: Request,
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: unknown,
) {
  try {
    const config = getServerApiConfig();
    if (
      method !== "GET" &&
      request.headers.get("origin") !== config.adminOrigin
    )
      return Response.json(
        { message: "Invalid request origin." },
        { status: 403 },
      );
    const headers = buildForwardHeaders(
      request,
      config,
      method,
      body !== undefined,
    );
    const upstream = await fetch(new URL(path, config.apiOrigin), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
      cache: "no-store",
      redirect: "manual",
    });
    return await relayUpstream(upstream);
  } catch {
    return Response.json(
      { message: "The service is unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function forwardAdminFileDownload(request: Request, path: string) {
  try {
    const config = getServerApiConfig();
    const headers = buildForwardHeaders(request, config, "GET", false);
    const upstream = await fetch(new URL(path, config.apiOrigin), {
      method: "GET",
      headers,
      credentials: "include",
      cache: "no-store",
      redirect: "manual",
    });
    if (!upstream.ok) return relayUpstream(upstream);
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    const contentType = upstream.headers.get("Content-Type");
    if (contentType) responseHeaders.set("Content-Type", contentType);
    const contentDisposition = upstream.headers.get("Content-Disposition");
    if (contentDisposition)
      responseHeaders.set("Content-Disposition", contentDisposition);
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { message: "The service is unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function forwardAdminUpload(
  request: Request,
  path: string,
  formData: FormData,
) {
  try {
    const config = getServerApiConfig();
    if (request.headers.get("origin") !== config.adminOrigin)
      return Response.json(
        { message: "Invalid request origin." },
        { status: 403 },
      );
    const headers = buildForwardHeaders(request, config, "POST", false);
    const upstream = await fetch(new URL(path, config.apiOrigin), {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
      cache: "no-store",
      redirect: "manual",
    });
    return await relayUpstream(upstream);
  } catch {
    return Response.json(
      { message: "The service is unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
