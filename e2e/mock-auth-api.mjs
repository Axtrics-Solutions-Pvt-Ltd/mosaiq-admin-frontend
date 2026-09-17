import { createServer } from "node:http";

const user = {
  data: {
    id: 1,
    name: "Demo Admin",
    email: "admin@example.test",
    platform_role_code: "SUPER_ADMIN",
    membership: null,
  },
};
const viewer = {
  data: {
    id: 2,
    name: "Viewer",
    email: "viewer@example.test",
    platform_role_code: null,
    membership: {
      agency_id: 1,
      role_code: "VIEWER",
      client_id: null,
      workspace_ids: [],
    },
  },
};
const json = (response, status, body, headers = {}) => {
  response.writeHead(status, {
    "Content-Type": "application/json",
    ...headers,
  });
  response.end(JSON.stringify(body));
};

createServer(async (request, response) => {
  if (request.url === "/health") return json(response, 200, { ok: true });
  if (request.method === "GET" && request.url === "/sanctum/csrf-cookie") {
    response.writeHead(204, {
      "Set-Cookie": [
        "XSRF-TOKEN=browser-token%3D; Path=/; SameSite=Lax",
        "mosaiq-session=pre-session; Path=/; HttpOnly; SameSite=Lax",
      ],
    });
    return response.end();
  }
  if (request.method === "POST" && request.url === "/api/v1/auth/login") {
    if (
      request.headers["x-xsrf-token"] !== "browser-token=" ||
      !request.headers.cookie?.includes("XSRF-TOKEN=")
    )
      return json(response, 419, { message: "CSRF mismatch" });
    let body;
    try {
      body = JSON.parse(
        await new Promise((resolve, reject) => {
          let value = "";
          request.on("data", (chunk) => (value += chunk));
          request.on("end", () => resolve(value));
          request.on("error", reject);
        }),
      );
    } catch {
      return json(response, 422, { errors: { email: ["Invalid input"] } });
    }
    if (!body.email || !body.password)
      return json(response, 422, { errors: { email: ["Invalid input"] } });
    const isViewer = body.email === "viewer@example.test";
    return json(response, 200, isViewer ? viewer : user, {
      "Set-Cookie": `mosaiq-session=${isViewer ? "active-viewer-session" : "active-session"}; Path=/; HttpOnly; SameSite=Lax`,
    });
  }
  if (request.method === "GET" && request.url === "/api/v1/auth/me") {
    if (
      request.headers.cookie?.includes("mosaiq-session=active-viewer-session")
    )
      return json(response, 200, viewer);
    return request.headers.cookie?.includes("mosaiq-session=active-session")
      ? json(response, 200, user)
      : json(response, 401, { error_code: "UNAUTHENTICATED" });
  }
  if (request.method === "POST" && request.url === "/api/v1/auth/logout") {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    if (!request.headers.cookie?.includes("mosaiq-session=active-"))
      return json(response, 401, { error_code: "UNAUTHENTICATED" });
    response.writeHead(204, {
      "Set-Cookie":
        "mosaiq-session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
    });
    return response.end();
  }
  json(response, 404, { message: "Not found" });
}).listen(4444, "127.0.0.1");
