import { http, HttpResponse, type RequestHandler } from "msw";

import { authPaths, dashboardPaths } from "@/lib/api/paths";

let isSignedIn = false;
const mockUser = {
  data: {
    id: 1,
    name: "Demo Admin",
    email: "admin@example.test",
    platform_role_code: "SUPER_ADMIN",
    membership: null,
  },
};

export function resetAuthMock() {
  isSignedIn = false;
}

export const handlers: RequestHandler[] = [
  http.get(
    authPaths.csrf,
    () =>
      new HttpResponse(null, {
        status: 204,
        headers: { "Set-Cookie": "XSRF-TOKEN=mock-xsrf; Path=/; SameSite=Lax" },
      }),
  ),
  http.post(authPaths.login, async ({ request }) => {
    const body: unknown = await request.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("email" in body) ||
      !("password" in body)
    ) {
      return HttpResponse.json({ message: "Invalid input." }, { status: 422 });
    }
    isSignedIn = true;
    return HttpResponse.json(mockUser, {
      headers: {
        "Set-Cookie":
          "mosaiq-session=mock-session; Path=/; HttpOnly; SameSite=Lax",
      },
    });
  }),
  http.get(authPaths.me, () =>
    isSignedIn
      ? HttpResponse.json(mockUser)
      : HttpResponse.json({ error_code: "UNAUTHENTICATED" }, { status: 401 }),
  ),
  http.post(authPaths.logout, () => {
    isSignedIn = false;
    return new HttpResponse(null, {
      status: 204,
      headers: { "Set-Cookie": "mosaiq-session=; Max-Age=0; Path=/; HttpOnly" },
    });
  }),
  http.get(dashboardPaths.summary, () =>
    isSignedIn
      ? HttpResponse.json({
          data: {
            scope: "platform",
            agency_id: null,
            client_id: null,
            agencies: 12,
            clients: 38,
            workspaces: 186,
            reports: 24,
            active_links: 31,
            users: 142,
          },
        })
      : HttpResponse.json({ error_code: "UNAUTHENTICATED" }, { status: 401 }),
  ),
];
