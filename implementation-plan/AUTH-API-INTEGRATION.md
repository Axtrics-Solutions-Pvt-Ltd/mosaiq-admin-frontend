# Authentication API integration plan

Status: login, session verification, and logout architecture implemented in the frontend. Live Laravel cookie and origin behavior still requires deployment verification. Read it with [the roadmap](README.md), [Phase 03](PHASE-03-AUTHENTICATION.md), and [the Phase 12 handoff](PHASE-12-REVIEW-AND-HANDOFF.md).

## Scope and pre-integration repository snapshot

- This is a Next.js 16 App Router application using strict TypeScript and npm (package-lock.json). Vite is installed for Vitest; it is not the application runtime.
- TanStack Query, React Hook Form, Zod, and MSW are installed. QueryProvider has a 30-second default stale time and focus refetch disabled. There is no Redux, Zustand, Axios, or current API call in src/.
- src/config/env.ts validates environment settings. src/lib/api/ contains a placeholder README. src/mocks/handlers/index.ts has no handlers yet.
- LoginForm in src/features/auth/AuthForms.tsx is a local preview. The AppShell sign-out link only navigates to the signed-out preview route. QueryProvider currently wraps the application route group, so /login cannot use Query hooks until that provider boundary changes.
- Route groups already separate public auth pages and the application shell. src/config/routes.ts is the single frontend route source. Preserve the current UI styling and layout while replacing preview behavior with real behavior.
- The roadmap places real API integration after visual prototype review. Treat this as the auth part of that functional workstream.

## Confirmed backend contract

The backend team confirmed a Laravel Sanctum browser session, with no bearer token:

| Step | Request | Client requirement |
|---|---|---|
| CSRF bootstrap | GET /sanctum/csrf-cookie | Include credentials; browser receives XSRF-TOKEN and session cookies. |
| Sign in | POST /api/v1/auth/login | JSON email/password; include credentials, Accept: application/json, and URL-decoded XSRF-TOKEN as X-XSRF-TOKEN. |
| Restore/verify session | GET /api/v1/auth/me | Include credentials; use after reload and for protected access. |
| Sign out | POST /api/v1/auth/logout | Include credentials and CSRF header; successful response is HTTP 204. |

The backend CurrentUserResource returns a data object for both login and /me. Although the initial example showed string role codes and a membership object, the current backend resource permits platform_role_code to be null and membership to be null. A non-null membership contains agency_id, role_code, client_id (which may be null), and workspace_ids. Verify the approved OpenAPI schema before implementation and retain nullable fields unless the backend changes. A successful login may precede usable Admin membership for a pending invitation; do not equate login success with permission to every Admin page.

The backend confirmed that a Super Admin has `data.platform_role_code === "SUPER_ADMIN"` and an Agency Admin has `data.membership.role_code === "AGENCY_ADMIN"`. `/me` returns JSON 401 for a missing or expired session. It also returns 401 for a pending invitation or an account without an active membership when one is required. Missing and expired sessions currently include top-level `error_code: "UNAUTHENTICATED"`; do not assume that a pending-invitation 401 has the same code. The configured default session cookie name is `mosaiq-session`, but `SESSION_COOKIE` can override it.

Use the [API documentation](https://mosaiq.axtrics.com/docs/api#/) as the contract reference during implementation. The page was not retrievable during this planning pass; the details above were checked against the backend controller, resource, routes, and configuration cited by the team. Do not infer contracts for signup, password recovery, or other features from these four auth calls.

## Transport and environment origins

1. Keep the upstream API origin in `VITE_API_BASE_URL` and the Admin frontend origin in a separate server-only variable, `NEXT_ADMIN_ORIGIN`. The local `.env.local` (ignored by Git) uses the current deployed development API origin and the actual local Admin origin, including its port. Each deployment supplies its own values; changing either URL must not require a code change. An `.env.example` may document both variable names with placeholders, not live origins. Do not hardcode either domain in application code.
2. Extend `src/config/env.ts` with server-only validation of `process.env.VITE_API_BASE_URL` and `process.env.NEXT_ADMIN_ORIGIN`, and expose parsed values only through that module. Validate `NEXT_ADMIN_ORIGIN` as an exact origin (scheme, host, optional port; no path, query, or fragment). The local value may use HTTP on localhost; deployment supplies its actual Admin origin. Next.js does not expose `VITE_` variables to browser bundles; Vite's presence for tests does not change that. Do not copy either origin to `NEXT_PUBLIC_*`, components, fixtures, or route files.
3. Prefer native fetch, wrapped once in a typed request client under src/lib/api/. This fits the current repository and avoids an Axios dependency. The shared layer owns base URL joining, Accept/JSON headers, credentials, CSRF bootstrap and header, abort signals, 204 responses, safe error parsing, and request IDs. Feature code never calls fetch directly.
4. Browser components should use same-origin frontend API routes. Next route handlers forward only allowlisted Laravel paths through a shared server transport. This lets the server read VITE_API_BASE_URL and gives the browser a first-party cookie path. Keep route handlers thin; do not duplicate JSON parsing, URL joining, CSRF rules, or error mapping in each handler. Never build an unrestricted proxy to arbitrary upstream paths.
5. The shared server transport must set `Origin` explicitly from the validated `NEXT_ADMIN_ORIGIN` on outbound Laravel calls, including the server layout's `/me` request. Server-side fetch does not add a browser `Origin` automatically. Sanctum accepts `Origin` alone when its host and port are in `SANCTUM_STATEFUL_DOMAINS`; the backend example includes `localhost:3000` and `localhost:5173`, but the active backend environment must be checked. Sanctum checks `Referer` first when present, so do not forward a mismatched `Referer`: omit it or ensure it matches the configured Admin origin. Login still requires the normal CSRF cookie and `X-XSRF-TOKEN` flow, session cookie, and `Accept: application/json`.
6. The gateway must forward browser cookies and approved request headers upstream, return required Set-Cookie headers to the browser, and handle cookie Domain, Path, Secure, and SameSite attributes correctly for the frontend origin. Forward only safe response headers and set Cache-Control: no-store for session and user responses. The CSRF cookie exposed to frontend JavaScript must remain readable; the Laravel session cookie should remain HttpOnly. Verify the actual cookie name and attributes on the incoming Admin request in a real browser before finalizing gateway and route-guard behavior.
7. The browser API client calls relative same-origin paths. The server transport alone addresses Laravel's absolute paths. MSW intercepts those same frontend request paths and returns backend-shaped responses, keeping production components independent of fixtures.

The same-origin gateway is a deliberate choice because the requested variable is server-only in Next.js and the documented Admin and API hosts may be on different sites. Direct cross-site browser cookies and access to an API-host XSRF cookie cannot be assumed to work. If deployment places the frontend and API on a confirmed same-site setup, revisit whether a simpler direct browser transport still keeps the API origin server-only and satisfies the approved cookie/CSRF flow; document that decision before coding.

## Module map

Keep the existing folders and add only focused files when implementation begins:

| Location | Responsibility |
|---|---|
| src/config/env.ts | Validated, server-only API and Admin origins. |
| src/lib/api/ | Shared HTTP transport, CSRF helper, normalized errors, server gateway helper. |
| src/app/api/ | Thin, allowlisted same-origin route handlers. |
| src/proxy.ts | Cheap protected-route session-cookie presence check and redirect. |
| src/app/(application)/layout.tsx | Server `/me` check, Admin role gate, and query hydration before rendering the shell. |
| src/features/auth/api.ts | Login, me, and logout functions. |
| src/features/auth/contracts.ts | Approved DTO schema/types and normalization. |
| src/features/auth/queries.ts | Auth query key, session query, auth mutations. |
| src/features/auth/ | Existing form, alerts, and focused UI wiring. |
| src/providers/QueryProvider.tsx | Shared query cache for login and application. |
| src/mocks/handlers/ | Auth handlers for the same frontend paths. |

Use generated types from the approved API schema if available. Otherwise define the current-user schema once with Zod and infer its TypeScript type. Parse untrusted responses at the API boundary and map them to a small UI user model only if presentation needs one. Keep Laravel DTOs out of components and never duplicate auth types across features.

## Session state and cache policy

- No Redux or Zustand is needed. Use TanStack Query's authKeys.me() query as the single current-user source; components and navigation read it through a focused hook. Do not copy the user into Context, local storage, or another global store. Keep purely local UI state in components.
- Make the existing Query provider available to both /login and application routes, with the smallest suitable provider boundary. On login, run CSRF bootstrap, submit credentials, then set or invalidate the me query and navigate to the approved landing route. On reload, /me establishes the session from the cookie.
- Use `src/proxy.ts` (the Next.js 16 convention) only for a presence check of the configured Admin session cookie on protected routes. Redirect to `/login` when absent. Match the cookie name the gateway actually exposes, defaulting to `mosaiq-session` only when the backend has not overridden `SESSION_COOKIE`. Do not call `/me`, parse roles, or treat cookie presence as valid authentication in Proxy.
- Before rendering the protected application shell, its server layout must call `/me` through the shared server transport with the forwarded session cookie, explicit configured `Origin`, and no-store semantics. A 401 redirects to the approved sign-in/session-expired route. A 200 response permits the Admin shell only for `platform_role_code === "SUPER_ADMIN"` or `membership?.role_code === "AGENCY_ADMIN"`; other authenticated users go to `/forbidden`. Handle upstream/network failure as an unavailable state, not as a signed-out user. Laravel remains authoritative for authorization on every API operation.
- Use one request-scoped server QueryClient and the same `authKeys.me()` key to fetch the layout's `/me` result, then pass `dehydrate(queryClient)` through a `HydrationBoundary` inside the client Query provider. Do not fetch `/me` a second time just to hydrate it, and never share the server QueryClient across users or serialize credentials or cookies. Session requests use no-store HTTP semantics. Set `/me` query freshness/refetch options so hydration does not immediately repeat the request on mount; then revalidate on focus, deliberate navigation refresh, or an agreed interval as needed, without retrying 401/403. A short in-memory stale time is an optimization, not proof that a session still exists.
- The application layout can persist across client-side navigation. Keep route-handler checks, Laravel authorization, and client handling of later 401/403 responses in place; the initial layout check does not authorize every subsequent operation.
- On successful logout, remove all user-scoped query data before navigating to the signed-out route. Never persist the Query cache or user details between browser sessions. For multiple tabs, consider a BroadcastChannel sign-out signal and clear each tab's cache without passing credentials or session data.
- Handle a /me 401 with the confirmed UNAUTHENTICATED code as signed out, and a 401 from an authenticated operation as session expired. A pending invitation can also produce /me 401; do not label an unclassified 401 as an expired session or invent a pending-invitation reason before its response contract is confirmed. Clear private cache and navigate once when the session is confirmed lost. Handle 403 as forbidden without treating it as logout. Guard application routes using an authoritative session check, not only cached client state or hidden navigation; confirm the server-side guard and gateway cookie design together.
- Do not cache personalized API responses in Next, HTTP caches, or a service worker. Later feature queries should use feature-local keys containing every result-changing filter/scope, invalidate only affected data after mutations, and clear all private data on logout or account switch.

## Existing UI wiring and errors

- Wire LoginForm to React Hook Form and a Zod input schema, the auth mutation, its pending state, and the existing alert/error locations. Preserve entered email on recoverable failure. Remove preview-only success claims when real behavior is available; do not restyle the form.
- Replace the AppShell sign-out preview link with a button/action invoking the logout mutation. Disable repeated submission while pending and show a safe error if logout fails. Decide how a failed logout should be handled before claiming the session ended.
- The Remember me checkbox currently has no documented backend effect. Do not send or promise an invented persistence flag; leave its preview behavior clear until the backend confirms a session-lifetime contract.
- Normalize API errors in the shared client, preserving the backend's top-level `error_code` alongside HTTP status, safe message, field errors, and request ID when present. Treat `UNAUTHENTICATED` as the confirmed code for missing/expired sessions; safely handle absent or unknown codes. Map 401 login failure to invalid credentials only when the response actually represents invalid credentials; 419 to a safe CSRF refresh and retry only when explicitly safe; 422 field errors to controls; 429 to a rate-limit message; 5xx/network failures to a retryable service message. Avoid automatic retries of login, logout, and other mutations. Capture X-Request-ID/request_id for support without exposing raw server bodies, HTML, exception names, or credentials.

## Delivery and verification sequence

1. Supply the current development API URL and actual local Admin origin as separate environment values; deployment supplies its own values later. Confirm the active backend allows that Admin host and port in `SANCTUM_STATEFUL_DOMAINS`, plus production HTTPS, cookie attributes, `SESSION_DOMAIN`, and any enforced origin/CORS rules. Verify in a real browser that CSRF and session cookies survive the gateway and Laravel treats forwarded requests as stateful.
2. Verify the approved auth OpenAPI shape and error codes, including nullable user fields. The backend confirms that pending invitations can receive 401 from `/me`; determine the login response and user-facing path for that case before claiming a complete pending-invitation flow. Confirm the intended Admin landing route and the meaning of Remember me.
3. Implement the validated two-origin env boundary, shared transport/gateway, auth contracts, MSW handlers, and auth query functions. Keep URL, `Origin`, and CSRF logic centralized.
4. Wire existing sign-in and sign-out controls, then the presence-only Proxy check, server `/me` and role gate, query hydration, reload/session expiry, and private-cache clearing. Keep unintegrated account actions labelled as previews until their own API contracts are agreed.
5. Test explicit `Origin` and mismatched-`Referer` handling, CSRF bootstrap ordering and decoding, cookie forwarding/name, login errors, `/me` reload and Admin role outcomes, no immediate client `/me` refetch after hydration, logout 204, 401/403/419 and `error_code` handling, cache clearing, and protected routes. Use MSW for request behavior and Playwright on desktop plus mobile for the critical browser flow. Run formatting, lint, typecheck, relevant tests, and production build before declaring the functional auth gate complete.

## Open deployment decision

Local development uses the actual localhost Admin origin and the separately configured deployed development API origin; either value can change without a code change. The backend example lists `localhost:3000` and `localhost:5173` as stateful domains, but its active environment and the actual frontend port must match. The production Admin origin, production API HTTPS configuration, cookie attributes after gateway forwarding, and pending-invitation login experience still need deployment/runtime confirmation. Do not finalize cookie rewriting or ship session handling on an assumed domain arrangement.
