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

const updatedAgencies = new Map();
const updatedWorkspaces = new Map();
const agencyRows = [
  {
    id: 1,
    display_name: "Northstar Digital",
    default_currency: "USD",
    status: "active",
    workspace_count: 2,
    user_count: 3,
  },
  {
    id: 2,
    display_name: "Kinetic Growth",
    default_currency: "GBP",
    status: "active",
    workspace_count: 1,
    user_count: 2,
  },
];
function agencyDetail(row) {
  return {
    id: row.id,
    display_name: row.display_name,
    legal_name: `${row.display_name} Ltd`,
    description: "Agency profile",
    website: null,
    status: row.status,
    logo_url: null,
    brand_color: "#2563EB",
    created_at: "2026-09-01T10:00:00Z",
    primary_contact: {
      name: "Jamie Rivera",
      email: "jamie@example.test",
      phone: null,
      job_title: null,
    },
    defaults: {
      currency: row.default_currency,
      time_zone: "Europe/London",
      language: "English (UK)",
      reporting_week_start: "monday",
      date_format: "DD MMM YYYY",
    },
    workspace_count: row.workspace_count,
    user_count: row.user_count,
    workspaces: [],
    administrators: [],
    recent_activity: [],
  };
}
async function readJson(request) {
  let value = "";
  for await (const chunk of request) value += chunk;
  return JSON.parse(value);
}
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
  const url = new URL(request.url ?? "/", "http://localhost");
  if (url.pathname === "/api/v1/agencies" && request.method === "GET") {
    if (!request.headers.cookie?.includes("mosaiq-session=active-session"))
      return json(response, 401, { error_code: "UNAUTHENTICATED" });
    let rows = agencyRows;
    const search = url.searchParams.get("search")?.toLowerCase();
    if (search)
      rows = rows.filter((row) =>
        row.display_name.toLowerCase().includes(search),
      );
    const status = url.searchParams.get("status");
    if (status) rows = rows.filter((row) => row.status === status);
    const currency = url.searchParams.get("currency");
    if (currency)
      rows = rows.filter((row) => row.default_currency === currency);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const perPage = 20;
    return json(response, 200, {
      data: rows.slice((page - 1) * perPage, page * perPage).map((row) => ({
        ...row,
        logo_url: null,
        primary_admin: {
          id: 1,
          name: "Demo Admin",
          email: "admin@example.test",
        },
        created_at: "2026-09-01T10:00:00Z",
        last_activity_at: null,
      })),
      meta: {
        current_page: page,
        last_page: Math.max(1, Math.ceil(rows.length / perPage)),
        total: rows.length,
        summary: {
          total_agencies: 2,
          active_agencies: 2,
          total_workspaces: 3,
          total_agency_users: 5,
        },
      },
    });
  }
  if (url.pathname === "/api/v1/agencies" && request.method === "POST") {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    const body = await readJson(request);
    if (!body.display_name)
      return json(response, 422, {
        errors: { display_name: ["The display name is required."] },
      });
    return json(response, 201, {
      data: {
        ...agencyDetail({
          id: 3,
          display_name: body.display_name,
          status: body.status,
          default_currency: body.defaults.currency,
          workspace_count: 0,
          user_count: 0,
        }),
        legal_name: body.legal_name,
        primary_contact: body.primary_contact,
        defaults: body.defaults,
      },
    });
  }
  const agencyMatch = url.pathname.match(/^\/api\/v1\/agencies\/(\d+)$/);
  if (agencyMatch && request.method === "GET") {
    const row =
      agencyMatch[1] === "3"
        ? {
            id: 3,
            display_name: "Sample Agency",
            status: "active",
            default_currency: "USD",
            workspace_count: 0,
            user_count: 0,
          }
        : agencyRows.find((entry) => entry.id === Number(agencyMatch[1]));
    return row
      ? json(response, 200, {
          data: updatedAgencies.get(row.id) ?? agencyDetail(row),
        })
      : json(response, 404, { message: "Agency not found" });
  }
  if (agencyMatch && request.method === "PUT") {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    const row = agencyRows.find((entry) => entry.id === Number(agencyMatch[1]));
    if (!row) return json(response, 404, { message: "Agency not found" });
    const body = await readJson(request);
    const updated = {
      ...agencyDetail(row),
      display_name: body.display_name,
      legal_name: body.legal_name,
      description: body.description,
      website: body.website,
      status: body.status,
      brand_color: body.brand_color,
      primary_contact: body.primary_contact,
      defaults: body.defaults,
    };
    updatedAgencies.set(row.id, updated);
    return json(response, 200, { data: updated });
  }
  const clientCollection = url.pathname.match(
    /^\/api\/v1\/agencies\/(\d+)\/clients$/,
  );
  if (clientCollection && request.method === "GET") {
    return json(response, 200, {
      data: [
        {
          id: 20,
          agency_id: Number(clientCollection[1]),
          name: "Northstar Client",
          status: "active",
          workspace_count: 1,
          created_at: null,
          updated_at: null,
        },
      ],
      meta: { current_page: 1, last_page: 1, total: 1 },
    });
  }
  const clientDetail = url.pathname.match(
    /^\/api\/v1\/agencies\/(\d+)\/clients\/(\d+)$/,
  );
  if (clientDetail && request.method === "GET") {
    return json(response, 200, {
      data: {
        id: Number(clientDetail[2]),
        agency_id: Number(clientDetail[1]),
        name: "Northstar Client",
        status: "active",
        created_at: null,
        updated_at: null,
        workspaces: [],
      },
    });
  }
  const workspaceRows = [
    {
      id: 10,
      agency_id: 1,
      client_id: 20,
      name: "Northstar Reporting",
      timezone: "Europe/London",
      currency: "GBP",
      status: "active",
      created_at: null,
      updated_at: null,
    },
  ];
  for (const [id, record] of updatedWorkspaces) {
    const index = workspaceRows.findIndex((row) => row.id === id);
    if (index >= 0) workspaceRows[index] = record;
    else workspaceRows.push(record);
  }
  const workspaceCollection = url.pathname.match(
    /^\/api\/v1\/agencies\/(\d+)\/clients\/(\d+)\/workspaces$/,
  );
  if (workspaceCollection && request.method === "POST") {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    const body = await readJson(request);
    if (!body.name)
      return json(response, 422, {
        errors: { name: ["The name is required."] },
      });
    const record = {
      id: 11,
      agency_id: Number(workspaceCollection[1]),
      client_id: Number(workspaceCollection[2]),
      ...body,
      created_at: null,
      updated_at: null,
    };
    updatedWorkspaces.set(record.id, record);
    return json(response, 201, { data: record });
  }
  if (workspaceCollection && request.method === "GET") {
    const search = (url.searchParams.get("search") ?? "").toLowerCase();
    const status = url.searchParams.get("status");
    const rows = workspaceRows.filter(
      (row) =>
        row.agency_id === Number(workspaceCollection[1]) &&
        row.client_id === Number(workspaceCollection[2]) &&
        row.name.toLowerCase().includes(search) &&
        (!status || row.status === status),
    );
    return json(response, 200, {
      data: rows,
      meta: { current_page: 1, last_page: 1, total: rows.length },
    });
  }
  const workspaceDetail = url.pathname.match(
    /^\/api\/v1\/agencies\/(\d+)\/clients\/(\d+)\/workspaces\/(\d+)$/,
  );
  if (workspaceDetail && request.method === "PUT") {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    const body = await readJson(request);
    const id = Number(workspaceDetail[3]);
    const existing = workspaceRows.find((row) => row.id === id);
    if (!existing)
      return json(response, 404, { message: "Workspace not found" });
    const record = { ...existing, ...body };
    updatedWorkspaces.set(id, record);
    return json(response, 200, { data: record });
  }
  if (workspaceDetail && request.method === "GET") {
    const row = workspaceRows.find(
      (entry) =>
        entry.agency_id === Number(workspaceDetail[1]) &&
        entry.client_id === Number(workspaceDetail[2]) &&
        entry.id === Number(workspaceDetail[3]),
    );
    return row
      ? json(response, 200, { data: row })
      : json(response, 404, { message: "Workspace not found" });
  }
  json(response, 404, { message: "Not found" });
}).listen(4444, "127.0.0.1");
