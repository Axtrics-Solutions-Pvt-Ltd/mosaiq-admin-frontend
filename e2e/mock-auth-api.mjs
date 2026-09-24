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
const agencyAdmin = {
  data: {
    id: 3,
    name: "Agency Admin",
    email: "agency@example.test",
    platform_role_code: null,
    membership: {
      agency_id: 1,
      role_code: "AGENCY_ADMIN",
      client_id: null,
      workspace_ids: [],
    },
  },
};
// A user with no membership who signs in to accept a pending invitation. Each
// sign-in gets its own session so parallel Playwright projects do not share
// acceptance state.
const returningSessions = new Map();
let returningSessionCount = 0;
function returningSession(request) {
  const match = request.headers.cookie?.match(
    /mosaiq-session=active-returning-(\d+)/,
  );
  return match ? returningSessions.get(match[1]) : undefined;
}
function returningUser(session) {
  return {
    data: {
      id: 4,
      name: "Returning User",
      email: "returning@example.test",
      platform_role_code: null,
      membership: session.hasMembership
        ? {
            agency_id: 1,
            role_code: "ANALYST",
            client_id: null,
            workspace_ids: [101],
          }
        : null,
    },
  };
}
const pendingInvitation = {
  id: 71,
  agency_id: 1,
  agency_name: "Northstar Digital",
  role_code: "ANALYST",
  client_id: null,
  client_name: null,
  workspace_id: 101,
  workspace_name: "Growth",
  expires_at: "2026-12-31T10:00:00Z",
};
const invitationToken = "e".repeat(64);

const json = (response, status, body, headers = {}) => {
  response.writeHead(status, {
    "Content-Type": "application/json",
    ...headers,
  });
  response.end(JSON.stringify(body));
};

const updatedAgencies = new Map();
const updatedWorkspaces = new Map();
const updatedClients = new Map();
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
    // Like Laravel, refreshing the CSRF cookie keeps an existing session.
    const hasSession = request.headers.cookie?.includes("mosaiq-session=active-");
    response.writeHead(204, {
      "Set-Cookie": [
        "XSRF-TOKEN=browser-token%3D; Path=/; SameSite=Lax",
        ...(hasSession
          ? []
          : ["mosaiq-session=pre-session; Path=/; HttpOnly; SameSite=Lax"]),
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
    if (body.email === "returning@example.test") {
      const sessionId = String((returningSessionCount += 1));
      returningSessions.set(sessionId, { hasMembership: false });
      return json(response, 200, returningUser(returningSessions.get(sessionId)), {
        "Set-Cookie": `mosaiq-session=active-returning-${sessionId}; Path=/; HttpOnly; SameSite=Lax`,
      });
    }
    const isViewer = body.email === "viewer@example.test";
    const isAgencyAdmin = body.email === "agency@example.test";
    return json(response, 200, isViewer ? viewer : isAgencyAdmin ? agencyAdmin : user, {
      "Set-Cookie": `mosaiq-session=${isViewer ? "active-viewer-session" : isAgencyAdmin ? "active-agency-session" : "active-session"}; Path=/; HttpOnly; SameSite=Lax`,
    });
  }
  if (request.method === "GET" && request.url === "/api/v1/auth/me") {
    const returning = returningSession(request);
    if (returning) return json(response, 200, returningUser(returning));
    if (request.headers.cookie?.includes("mosaiq-session=active-agency-session"))
      return json(response, 200, agencyAdmin);
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
  if (request.method === "POST" && request.url === "/api/v1/auth/change-password") {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    if (!request.headers.cookie?.includes("mosaiq-session=active-"))
      return json(response, 401, { error_code: "UNAUTHENTICATED" });
    const body = await readJson(request);
    if (body.current_password !== "correct-current")
      return json(response, 422, { errors: { current_password: ["The current password is incorrect."] } });
    response.writeHead(204);
    return response.end();
  }
  const url = new URL(request.url ?? "/", "http://localhost");
  if (url.pathname === "/api/v1/invitations/inspect" && request.method === "POST") {
    const body = await readJson(request);
    if (body.token !== invitationToken)
      return json(response, 404, { error_code: "NOT_FOUND" });
    return json(response, 200, {
      data: {
        email: "agency@example.test",
        agency_name: "Northstar Digital",
        agency_status: "active",
        role_code: "AGENCY_ADMIN",
        expires_at: "2026-12-31T10:00:00Z",
        requires_existing_login: true,
        workspace_name: "Retail",
        client_name: null,
      },
    });
  }
  if (url.pathname === "/api/v1/invitations/accept" && request.method === "POST") {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    const body = await readJson(request);
    if (body.token !== invitationToken)
      return json(response, 404, { error_code: "NOT_FOUND" });
    if (!request.headers.cookie?.includes("mosaiq-session=active-agency-session"))
      return json(response, 401, { error_code: "UNAUTHENTICATED" });
    response.writeHead(204);
    return response.end();
  }
  if (url.pathname === "/api/v1/me/invitations" && request.method === "GET") {
    const returning = returningSession(request);
    if (returning)
      return json(response, 200, {
        data: returning.hasMembership ? [] : [pendingInvitation],
      });
    if (!request.headers.cookie?.includes("mosaiq-session=active-"))
      return json(response, 401, { error_code: "UNAUTHENTICATED" });
    return json(response, 200, { data: [] });
  }
  const myInvitationAccept = url.pathname.match(
    /^\/api\/v1\/me\/invitations\/(\d+)\/accept$/,
  );
  if (myInvitationAccept && request.method === "POST") {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    const returning = returningSession(request);
    if (!returning) return json(response, 401, { error_code: "UNAUTHENTICATED" });
    if (
      returning.hasMembership ||
      Number(myInvitationAccept[1]) !== pendingInvitation.id
    )
      return json(response, 404, { error_code: "NOT_FOUND" });
    returning.hasMembership = true;
    response.writeHead(204);
    return response.end();
  }
  const ownUserMatch = url.pathname.match(/^\/api\/v1\/agencies\/(\d+)\/users\/(\d+)$/);
  if (ownUserMatch && request.method === "PUT") {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    if (!request.headers.cookie?.includes("mosaiq-session=active-agency-session"))
      return json(response, 403, { message: "Forbidden" });
    const body = await readJson(request);
    if (ownUserMatch[1] !== "1" || ownUserMatch[2] !== "3" || Object.keys(body).some((key) => key !== "name"))
      return json(response, 403, { message: "Forbidden" });
    if (!body.name?.trim())
      return json(response, 422, { errors: { name: ["Enter a name."] } });
    agencyAdmin.data.name = body.name.trim();
    return json(response, 200, { data: {
      id: 3, name: agencyAdmin.data.name, email: agencyAdmin.data.email,
      status: "active", agency_id: 1, membership_status: "active",
      role_code: "AGENCY_ADMIN", client_id: null, workspace_ids: [],
      invited_at: null, accepted_at: null,
    } });
  }
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
  const clientRows = [
    {
      id: 20,
      agency_id: 1,
      name: "Northstar Client",
      status: "active",
      workspace_count: 1,
      created_at: null,
      updated_at: null,
    },
  ];
  for (const [id, record] of updatedClients) {
    const index = clientRows.findIndex((row) => row.id === id);
    if (index >= 0) clientRows[index] = record;
    else clientRows.push(record);
  }
  function clientWithWorkspaces(row) {
    return {
      ...row,
      workspaces: workspaceRows.filter((w) => w.client_id === row.id),
    };
  }
  if (url.pathname === "/api/v1/clients" && request.method === "GET") {
    let rows = clientRows;
    const agencyId = url.searchParams.get("agency_id");
    if (agencyId) rows = rows.filter((row) => row.agency_id === Number(agencyId));
    const search = url.searchParams.get("search")?.toLowerCase();
    if (search)
      rows = rows.filter((row) => row.name.toLowerCase().includes(search));
    const status = url.searchParams.get("status");
    if (status) rows = rows.filter((row) => row.status === status);
    return json(response, 200, {
      data: rows,
      meta: { current_page: 1, last_page: 1, total: rows.length },
    });
  }
  const clientCollection = url.pathname.match(
    /^\/api\/v1\/agencies\/(\d+)\/clients$/,
  );
  if (clientCollection && request.method === "GET") {
    const agencyId = Number(clientCollection[1]);
    let rows = clientRows.filter((row) => row.agency_id === agencyId);
    const search = url.searchParams.get("search")?.toLowerCase();
    if (search)
      rows = rows.filter((row) => row.name.toLowerCase().includes(search));
    const status = url.searchParams.get("status");
    if (status) rows = rows.filter((row) => row.status === status);
    return json(response, 200, {
      data: rows,
      meta: { current_page: 1, last_page: 1, total: rows.length },
    });
  }
  if (clientCollection && request.method === "POST") {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    const agencyId = Number(clientCollection[1]);
    const body = await readJson(request);
    if (!body.name)
      return json(response, 422, {
        errors: { name: ["The name is required."] },
      });
    const agency = agencyRows.find((row) => row.id === agencyId);
    const clientId = 20 + updatedClients.size + 1;
    const workspaceId = 100 + updatedClients.size;
    const defaultWorkspace = {
      id: workspaceId,
      agency_id: agencyId,
      client_id: clientId,
      name: `${body.name} Launch`,
      timezone: "Europe/London",
      currency: agency?.default_currency ?? "USD",
      status: "active",
      created_at: null,
      updated_at: null,
    };
    updatedWorkspaces.set(workspaceId, defaultWorkspace);
    const clientRecord = {
      id: clientId,
      agency_id: agencyId,
      name: body.name,
      status: body.status ?? "active",
      workspace_count: 1,
      created_at: null,
      updated_at: null,
    };
    updatedClients.set(clientId, clientRecord);
    return json(response, 201, {
      data: { ...clientRecord, workspaces: [defaultWorkspace] },
    });
  }
  const clientDetail = url.pathname.match(
    /^\/api\/v1\/agencies\/(\d+)\/clients\/(\d+)$/,
  );
  if (clientDetail && request.method === "GET") {
    const row = clientRows.find(
      (entry) =>
        entry.agency_id === Number(clientDetail[1]) &&
        entry.id === Number(clientDetail[2]),
    );
    return row
      ? json(response, 200, { data: clientWithWorkspaces(row) })
      : json(response, 404, { message: "Client not found" });
  }
  if (clientDetail && request.method === "PUT") {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    const row = clientRows.find(
      (entry) =>
        entry.agency_id === Number(clientDetail[1]) &&
        entry.id === Number(clientDetail[2]),
    );
    if (!row) return json(response, 404, { message: "Client not found" });
    const body = await readJson(request);
    const updated = { ...row, name: body.name, status: body.status };
    updatedClients.set(row.id, updated);
    return json(response, 200, { data: clientWithWorkspaces(updated) });
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
