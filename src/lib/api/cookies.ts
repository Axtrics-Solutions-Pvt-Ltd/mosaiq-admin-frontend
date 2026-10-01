import "server-only";

/** Laravel's remember-me cookie: `remember_web_` plus a hash of the guard. */
export const rememberCookiePrefix = "remember_web_";

/**
 * Whether a `name=value` cookie is one the Laravel session needs: the CSRF
 * token, the session itself, or the remember-me cookie.
 */
export function isAuthCookie(cookie: string, sessionCookieName: string) {
  return (
    cookie.startsWith("XSRF-TOKEN=") ||
    cookie.startsWith(`${sessionCookieName}=`) ||
    cookie.startsWith(rememberCookiePrefix)
  );
}

/** The auth cookies of an incoming request, ready for an upstream `Cookie` header. */
export function forwardedAuthCookies(
  request: Request,
  sessionCookieName: string,
) {
  return (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => isAuthCookie(part, sessionCookieName))
    .join("; ");
}

/** Re-scopes an API cookie to the admin origin: no Domain, root Path, safe SameSite. */
export function rewriteCookie(cookie: string, adminOrigin: string): string {
  const isSecure = new URL(adminOrigin).protocol === "https:";
  const parts = cookie.split(";").map((part) => part.trim());
  const sameSite = parts.slice(1).find((part) => /^samesite=/i.test(part));
  const attributes = parts
    .slice(1)
    .filter(
      (part) =>
        !/^domain=/i.test(part) &&
        !/^path=/i.test(part) &&
        !/^samesite=/i.test(part) &&
        (isSecure || !/^secure$/i.test(part)),
    );
  if (isSecure && !attributes.some((part) => /^secure$/i.test(part)))
    attributes.push("Secure");
  attributes.push(
    "Path=/",
    !isSecure && /^samesite=none$/i.test(sameSite ?? "")
      ? "SameSite=Lax"
      : (sameSite ?? "SameSite=Lax"),
  );
  return [parts[0], ...attributes].join("; ");
}

/**
 * Passes the API's auth cookies back to the browser. A remembered user whose
 * session expired gets a new session on whichever request comes first, so
 * every proxy relays it, not only the auth routes.
 */
export function relayAuthCookies(
  upstream: Response,
  responseHeaders: Headers,
  config: { adminOrigin: string; sessionCookieName: string },
) {
  for (const cookie of upstream.headers.getSetCookie()) {
    if (isAuthCookie(cookie, config.sessionCookieName))
      responseHeaders.append(
        "Set-Cookie",
        rewriteCookie(cookie, config.adminOrigin),
      );
  }
}
