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
const manager = {
  data: {
    id: 5,
    name: "Manager",
    email: "manager@example.test",
    platform_role_code: null,
    membership: {
      agency_id: 1,
      role_code: "MANAGER",
      client_id: null,
      workspace_ids: [10],
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
const deletedWorkspaces = new Set();
// Share links (Step 5), for every report.
const shareLinks = [];
let nextShareLinkId = 1;
// Workspace ids are handed out in order so parallel projects never collide.
let nextWorkspaceId = 11;
const channels = [
  {
    id: 3,
    code: "meta_ads",
    name: "Meta Ads",
    category: "ads",
    is_active: true,
    credential_fields: [
      {
        key: "access_token",
        label: "Access token",
        type: "secret",
        required: true,
        help: null,
      },
      {
        key: "ad_account_id",
        label: "Ad account ID",
        type: "text",
        required: true,
        help: "Starts with act_",
      },
    ],
    metric_codes: ["spend", "impressions", "clicks", "conversions"],
    supports_campaigns: true,
    position: 1,
  },
  {
    id: 4,
    code: "ga4",
    name: "Google Analytics 4",
    category: "analytics",
    is_active: true,
    credential_fields: [
      {
        key: "property_id",
        label: "Property ID",
        type: "text",
        required: true,
        help: null,
      },
    ],
    metric_codes: ["sessions", "users", "conversions"],
    supports_campaigns: false,
    position: 2,
  },
];
const connectorSummary = (channel) =>
  channel
    ? {
        id: channel.id,
        code: channel.code,
        name: channel.name,
        category: channel.category,
      }
    : null;
// Stored credential values stay in the mock; responses only carry hints.
const credentialsByWorkspace = new Map();
function credentialState(workspace) {
  return (
    credentialsByWorkspace.get(workspace.id) ?? {
      status: "not_connected",
      values: {},
      last_fetched_at: null,
      last_fetch_status: null,
    }
  );
}
function withConnection(workspace) {
  const state = credentialState(workspace);
  const channel = channels.find((entry) => entry.id === workspace.connector_id);
  return {
    // The API always sends the invitation fields, null when not invited.
    invite_status: null,
    invite_status_reason: null,
    ...workspace,
    connector_id: workspace.connector_id ?? null,
    connector: connectorSummary(channel),
    connection: {
      status: state.status,
      last_fetched_at: state.last_fetched_at,
    },
  };
}
function credentialsResponse(workspace) {
  const state = credentialState(workspace);
  const channel = channels.find((entry) => entry.id === workspace.connector_id);
  return {
    data: {
      workspace_id: workspace.id,
      connector_id: workspace.connector_id ?? null,
      status: state.status,
      last_verified_at: null,
      last_fetched_at: state.last_fetched_at,
      last_fetch_status: state.last_fetch_status,
      last_fetch_error: null,
      fields: (channel?.credential_fields ?? []).map((field) => {
        const value = state.values[field.key];
        return {
          ...field,
          is_set: Boolean(value),
          hint: value ? `•••• ${value.slice(-4)}` : null,
        };
      }),
    },
  };
}
function paginated(rows) {
  return {
    data: rows,
    meta: { current_page: 1, last_page: 1, total: rows.length },
  };
}
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

// Reports (Step 4). Each Playwright project builds its report for its own
// seeded client, because data corrections change every report of a client.
const reportClientIds = [901, 902, 903];
const reports = new Map();
const reportLayouts = new Map();
const metricCorrections = [];
// Monthly budgets per workspace (Step 6), `month` as the first day.
const workspaceBudgets = [];
let nextBudgetId = 1;
let nextReportId = 100;
let nextCorrectionId = 1;
// Totals of each seeded Meta workspace over the report range.
const seededTotals = { spend: 1000, revenue: 3200 };
const reportRange = { to: "2026-09-23", availableFrom: "2025-09-24" };
const presetDays = { last_7_days: 7, last_30_days: 30, last_90_days: 90 };
function shiftDay(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function reportLayoutTemplate(reportId) {
  let id = reportId * 100;
  const item = (level, code, title, extra = {}) => ({
    id: ++id,
    parent_id: null,
    level,
    code,
    title,
    default_title: title,
    type: null,
    kind: null,
    is_enabled: true,
    is_available: true,
    position: 0,
    settings: [],
    content: null,
    as_of: null,
    updated_by: null,
    updated_at: null,
    children: [],
    ...extra,
  });
  const withChildren = (node, children) => ({
    ...node,
    children: children.map((child, position) => ({
      ...child,
      parent_id: node.id,
      position,
    })),
  });
  const summary = withChildren(
    item("tab", "executive_summary", "Executive Summary"),
    [
      item("widget", "ai_summary", "AI Summary", {
        type: "text_hero",
        kind: "text",
      }),
      item("widget", "blended_roas", "Blended ROAS", {
        type: "kpi",
        kind: "live",
      }),
      item("widget", "roas_by_channel", "ROAS by Channel", {
        type: "donut",
        kind: "live",
      }),
    ],
  );
  const detailed = withChildren(
    item("tab", "detailed_metrics", "Detailed Metrics"),
    [
      item("widget", "kpi_cards", "Key Metrics", {
        type: "kpi_group",
        kind: "live",
      }),
    ],
  );
  const channelsTab = withChildren(item("tab", "channels", "Channels"), [
    item("widget", "budget_utilization", "Budget Utilization", {
      type: "donut",
      kind: "live",
    }),
  ]);
  const reporting = withChildren(
    item("section", "reporting", "Reporting Dashboard"),
    [summary, detailed, channelsTab],
  );
  const intelligence = withChildren(
    item("section", "marketing_intelligence", "Marketing Intelligence"),
    [
      withChildren(item("tab", "audience_profile", "Audience Profile"), [
        item("widget", "audience_overview", "Audience Overview", {
          type: "kpi_list",
          kind: "manual_data",
        }),
      ]),
    ],
  );
  const mmm = withChildren(
    item("section", "mmm", "Media Mix Model", { is_enabled: false }),
    [
      item("widget", "mmm_readout", "Readout", {
        type: "recommendation_list",
        kind: "text",
      }),
    ],
  );
  return [reporting, { ...intelligence, position: 1 }, { ...mmm, position: 2 }];
}
function layoutNodes(items) {
  return items.flatMap((item) => [item, ...layoutNodes(item.children)]);
}
function correctedSpend(workspaceId) {
  const correction = [...metricCorrections]
    .reverse()
    .find(
      (entry) =>
        entry.is_active &&
        entry.workspace_id === workspaceId &&
        entry.metric_code === "spend",
    );
  return correction ? correction.corrected_total : seededTotals.spend;
}
// Spend in the range ÷ the monthly budgets prorated to the range's days, as
// the API's BudgetUtilizationBuilder does (spend spread evenly over the range).
function budgetPacing(workspaceIds, from, to) {
  const day = (value) => new Date(`${value}T00:00:00Z`).getTime();
  const rangeDays = (day(to) - day(from)) / 86_400_000 + 1;
  let budget = 0;
  let spend = 0;
  for (const entry of workspaceBudgets) {
    if (!workspaceIds.includes(entry.workspace_id)) continue;
    const monthStart = day(entry.month);
    const next = new Date(monthStart);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const monthEnd = next.getTime() - 86_400_000;
    const start = Math.max(monthStart, day(from));
    const end = Math.min(monthEnd, day(to));
    if (end < start) continue;
    const days = (end - start) / 86_400_000 + 1;
    const monthDays = (monthEnd - monthStart) / 86_400_000 + 1;
    budget += (entry.amount * days) / monthDays;
    spend += (correctedSpend(entry.workspace_id) * days) / rangeDays;
  }
  if (budget <= 0) return null;
  const round = (value) => Math.round(value * 100) / 100;
  return {
    budget: round(budget),
    spend: round(spend),
    pacing: round((spend / budget) * 100),
  };
}
function spendCorrectionIds(workspaceIds) {
  return metricCorrections
    .filter(
      (entry) =>
        entry.is_active &&
        entry.metric_code === "spend" &&
        workspaceIds.includes(entry.workspace_id),
    )
    .map((entry) => entry.id);
}
const hasCsrf = (request) =>
  request.headers["x-xsrf-token"] === "browser-token=";
// A report with no sources for the share-link flow; its links need no data.
function seedShareReport() {
  const now = "2026-09-20T09:00:00Z";
  reports.set(30, {
    id: 30,
    agency_id: 1,
    client_id: 20,
    name: "Northstar monthly",
    status: "active",
    currency: "GBP",
    timezone: "Europe/London",
    default_range_preset: "last_30_days",
    layout_version: 1,
    workspace_ids: [],
    created_at: now,
    updated_at: now,
  });
  reportLayouts.set(30, reportLayoutTemplate(30));
}
seedShareReport();
createServer(async (request, response) => {
  if (request.url === "/health") return json(response, 200, { ok: true });
  if (request.method === "GET" && request.url === "/sanctum/csrf-cookie") {
    // Like Laravel, refreshing the CSRF cookie keeps an existing session.
    const hasSession = request.headers.cookie?.includes(
      "mosaiq-session=active-",
    );
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
      return json(
        response,
        200,
        returningUser(returningSessions.get(sessionId)),
        {
          "Set-Cookie": `mosaiq-session=active-returning-${sessionId}; Path=/; HttpOnly; SameSite=Lax`,
        },
      );
    }
    const isViewer = body.email === "viewer@example.test";
    const isAgencyAdmin = body.email === "agency@example.test";
    const isManager = body.email === "manager@example.test";
    return json(
      response,
      200,
      isViewer
        ? viewer
        : isAgencyAdmin
          ? agencyAdmin
          : isManager
            ? manager
            : user,
      {
        "Set-Cookie": `mosaiq-session=${isViewer ? "active-viewer-session" : isAgencyAdmin ? "active-agency-session" : isManager ? "active-manager-session" : "active-session"}; Path=/; HttpOnly; SameSite=Lax`,
      },
    );
  }
  if (request.method === "GET" && request.url === "/api/v1/auth/me") {
    const returning = returningSession(request);
    if (returning) return json(response, 200, returningUser(returning));
    if (
      request.headers.cookie?.includes("mosaiq-session=active-agency-session")
    )
      return json(response, 200, agencyAdmin);
    if (
      request.headers.cookie?.includes("mosaiq-session=active-manager-session")
    )
      return json(response, 200, manager);
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
  if (
    request.method === "POST" &&
    request.url === "/api/v1/auth/change-password"
  ) {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    if (!request.headers.cookie?.includes("mosaiq-session=active-"))
      return json(response, 401, { error_code: "UNAUTHENTICATED" });
    const body = await readJson(request);
    if (body.current_password !== "correct-current")
      return json(response, 422, {
        errors: { current_password: ["The current password is incorrect."] },
      });
    response.writeHead(204);
    return response.end();
  }
  const url = new URL(request.url ?? "/", "http://localhost");
  if (
    url.pathname === "/api/v1/invitations/inspect" &&
    request.method === "POST"
  ) {
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
  if (
    url.pathname === "/api/v1/invitations/accept" &&
    request.method === "POST"
  ) {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    const body = await readJson(request);
    if (body.token !== invitationToken)
      return json(response, 404, { error_code: "NOT_FOUND" });
    if (
      !request.headers.cookie?.includes("mosaiq-session=active-agency-session")
    )
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
    if (!returning)
      return json(response, 401, { error_code: "UNAUTHENTICATED" });
    if (
      returning.hasMembership ||
      Number(myInvitationAccept[1]) !== pendingInvitation.id
    )
      return json(response, 404, { error_code: "NOT_FOUND" });
    returning.hasMembership = true;
    response.writeHead(204);
    return response.end();
  }
  const ownUserMatch = url.pathname.match(
    /^\/api\/v1\/agencies\/(\d+)\/users\/(\d+)$/,
  );
  if (ownUserMatch && request.method === "PUT") {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    if (
      !request.headers.cookie?.includes("mosaiq-session=active-agency-session")
    )
      return json(response, 403, { message: "Forbidden" });
    const body = await readJson(request);
    if (
      ownUserMatch[1] !== "1" ||
      ownUserMatch[2] !== "3" ||
      Object.keys(body).some((key) => key !== "name")
    )
      return json(response, 403, { message: "Forbidden" });
    if (!body.name?.trim())
      return json(response, 422, { errors: { name: ["Enter a name."] } });
    agencyAdmin.data.name = body.name.trim();
    return json(response, 200, {
      data: {
        id: 3,
        name: agencyAdmin.data.name,
        email: agencyAdmin.data.email,
        status: "active",
        agency_id: 1,
        membership_status: "active",
        role_code: "AGENCY_ADMIN",
        client_id: null,
        workspace_ids: [],
        invited_at: null,
        accepted_at: null,
      },
    });
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
  if (url.pathname === "/api/v1/channels" && request.method === "GET")
    return json(response, 200, {
      data: channels
        .filter((channel) => channel.is_active)
        .sort((a, b) => a.position - b.position),
    });
  if (url.pathname === "/api/v1/admin/channels" && request.method === "GET") {
    if (!request.headers.cookie?.includes("mosaiq-session=active-session"))
      return json(response, 403, { message: "Forbidden" });
    return json(response, 200, {
      data: channels.map((channel) => {
        const workspaceCount =
          [...updatedWorkspaces.values()].filter(
            (workspace) => workspace.connector_id === channel.id,
          ).length + (channel.id === 3 ? 1 : 0);
        return {
          ...channel,
          workspace_count: workspaceCount,
          is_code_locked: workspaceCount > 0,
        };
      }),
    });
  }
  if (url.pathname === "/api/v1/admin/channels" && request.method === "POST") {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    const body = await readJson(request);
    if (channels.some((channel) => channel.code === body.code))
      return json(response, 422, {
        errors: { code: ["The code has already been taken."] },
      });
    const channel = {
      ...body,
      id: Math.max(...channels.map((entry) => entry.id)) + 1,
      is_active: body.is_active ?? true,
      supports_campaigns: body.supports_campaigns ?? false,
      position: body.position ?? channels.length + 1,
    };
    channels.push(channel);
    return json(response, 201, {
      data: { ...channel, workspace_count: 0, is_code_locked: false },
    });
  }
  const adminChannel = url.pathname.match(
    /^\/api\/v1\/admin\/channels\/(\d+)$/,
  );
  if (adminChannel && request.method === "PUT") {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    const index = channels.findIndex(
      (channel) => channel.id === Number(adminChannel[1]),
    );
    if (index < 0) return json(response, 404, { message: "Channel not found" });
    const body = await readJson(request);
    channels[index] = { ...channels[index], ...body };
    return json(response, 200, {
      data: { ...channels[index], workspace_count: 0, is_code_locked: false },
    });
  }
  const workspaceRows = [
    {
      id: 10,
      agency_id: 1,
      client_id: 20,
      connector_id: 3,
      name: "Northstar Reporting",
      timezone: "Europe/London",
      currency: "GBP",
      status: "active",
      created_at: null,
      updated_at: null,
    },
    ...reportClientIds.map((id, index) => ({
      id,
      agency_id: 1,
      client_id: id,
      connector_id: 3,
      name: `Report Client ${index + 1} – Meta Ads`,
      timezone: "Europe/London",
      currency: "GBP",
      status: "active",
      created_at: null,
      updated_at: null,
    })),
  ];
  for (const [id, record] of updatedWorkspaces) {
    const index = workspaceRows.findIndex((row) => row.id === id);
    if (index >= 0) workspaceRows[index] = record;
    else workspaceRows.push(record);
  }
  for (const id of deletedWorkspaces) {
    const index = workspaceRows.findIndex((row) => row.id === id);
    if (index >= 0) workspaceRows.splice(index, 1);
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
    ...reportClientIds.map((id, index) => ({
      id,
      agency_id: 1,
      name: `Report Client ${index + 1}`,
      status: "active",
      workspace_count: 1,
      created_at: null,
      updated_at: null,
    })),
  ];
  for (const [id, record] of updatedClients) {
    const index = clientRows.findIndex((row) => row.id === id);
    if (index >= 0) clientRows[index] = record;
    else clientRows.push(record);
  }
  function clientWithWorkspaces(row) {
    const workspaces = workspaceRows
      .filter((w) => w.client_id === row.id)
      .map(withConnection);
    return { ...row, workspace_count: workspaces.length, workspaces };
  }
  function filteredWorkspaces(predicate) {
    const search = (url.searchParams.get("search") ?? "").toLowerCase();
    const status = url.searchParams.get("status");
    const connectorId = url.searchParams.get("connector_id");
    return workspaceRows
      .filter(
        (row) =>
          predicate(row) &&
          row.name.toLowerCase().includes(search) &&
          (!status || row.status === status) &&
          (!connectorId || row.connector_id === Number(connectorId)),
      )
      .map(withConnection);
  }
  if (url.pathname === "/api/v1/workspaces" && request.method === "GET") {
    const agencyId = url.searchParams.get("agency_id");
    return json(
      response,
      200,
      paginated(
        filteredWorkspaces(
          (row) => !agencyId || row.agency_id === Number(agencyId),
        ),
      ),
    );
  }
  const agencyWorkspaces = url.pathname.match(
    /^\/api\/v1\/agencies\/(\d+)\/workspaces$/,
  );
  if (agencyWorkspaces && request.method === "GET")
    return json(
      response,
      200,
      paginated(
        filteredWorkspaces(
          (row) => row.agency_id === Number(agencyWorkspaces[1]),
        ),
      ),
    );
  if (url.pathname === "/api/v1/clients" && request.method === "GET") {
    let rows = clientRows;
    const agencyId = url.searchParams.get("agency_id");
    if (agencyId)
      rows = rows.filter((row) => row.agency_id === Number(agencyId));
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
    const workspaceId = nextWorkspaceId++;
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
      data: { ...clientRecord, workspaces: [withConnection(defaultWorkspace)] },
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
  const correctionCollection = url.pathname.match(
    /^\/api\/v1\/agencies\/(\d+)\/clients\/(\d+)\/metric-corrections$/,
  );
  if (correctionCollection && request.method === "GET") {
    const rows = metricCorrections.filter(
      (entry) => entry.client_id === Number(correctionCollection[2]),
    );
    return json(response, 200, {
      data: [...rows].reverse(),
      meta: { current_page: 1, last_page: 1, total: rows.length },
    });
  }
  if (correctionCollection && request.method === "POST") {
    if (!hasCsrf(request))
      return json(response, 419, { message: "CSRF mismatch" });
    const clientId = Number(correctionCollection[2]);
    const body = await readJson(request);
    const workspace = workspaceRows.find(
      (row) => row.id === body.workspace_id && row.client_id === clientId,
    );
    if (!workspace)
      return json(response, 422, {
        errors: { workspace_id: ["The selected workspace id is invalid."] },
      });
    const correction = {
      id: nextCorrectionId++,
      client_id: clientId,
      workspace_id: workspace.id,
      campaign_key: body.campaign_key ?? null,
      metric_code: body.metric_code,
      date_from: body.date_from,
      date_to: body.date_to,
      original_total:
        body.metric_code === "spend"
          ? correctedSpend(workspace.id)
          : (seededTotals[body.metric_code] ?? 0),
      corrected_total: body.corrected_total,
      note: body.note ?? null,
      is_active: true,
      rows_owned: 30,
      created_by: { id: 1, name: "Demo Admin" },
      reverted_at: null,
      reverted_by: null,
      created_at: "2026-09-25T10:00:00Z",
    };
    metricCorrections.push(correction);
    return json(response, 201, { data: correction });
  }
  const budgetCollection = url.pathname.match(
    /^\/api\/v1\/agencies\/(\d+)\/clients\/(\d+)\/budgets$/,
  );
  if (budgetCollection && request.method === "GET") {
    const clientId = Number(budgetCollection[2]);
    return json(response, 200, {
      data: workspaceBudgets
        .filter((entry) => entry.client_id === clientId)
        .sort((left, right) => right.month.localeCompare(left.month)),
    });
  }
  if (budgetCollection && request.method === "PUT") {
    if (!hasCsrf(request))
      return json(response, 419, { message: "CSRF mismatch" });
    const clientId = Number(budgetCollection[2]);
    const body = await readJson(request);
    const items = Array.isArray(body.items) ? body.items : [];
    const errors = {};
    items.forEach((entry, index) => {
      if (
        !workspaceRows.some(
          (row) => row.id === entry.workspace_id && row.client_id === clientId,
        )
      )
        errors[`items.${index}.workspace_id`] = [
          "The selected workspace id is invalid.",
        ];
      if (entry.amount !== null && !(entry.amount >= 0))
        errors[`items.${index}.amount`] = ["The amount must be at least 0."];
    });
    if (items.length === 0) errors.items = ["The items field is required."];
    if (Object.keys(errors).length) return json(response, 422, { errors });
    const saved = [];
    for (const entry of items) {
      const month = `${entry.month}-01`;
      const index = workspaceBudgets.findIndex(
        (row) => row.workspace_id === entry.workspace_id && row.month === month,
      );
      if (entry.amount === null) {
        if (index >= 0) workspaceBudgets.splice(index, 1);
        continue;
      }
      const row = {
        id: index >= 0 ? workspaceBudgets[index].id : nextBudgetId++,
        client_id: clientId,
        workspace_id: entry.workspace_id,
        month,
        amount: entry.amount,
        updated_by: { id: 1, name: "Demo Admin" },
        created_at: "2026-09-25T10:00:00Z",
        updated_at: "2026-09-25T10:00:00Z",
      };
      if (index >= 0) workspaceBudgets[index] = row;
      else workspaceBudgets.push(row);
      saved.push(row);
    }
    return json(response, 200, { data: saved });
  }
  const workspaceCollection = url.pathname.match(
    /^\/api\/v1\/agencies\/(\d+)\/clients\/(\d+)\/workspaces$/,
  );
  if (workspaceCollection && request.method === "POST") {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    const body = await readJson(request);
    const errors = {};
    if (!body.name) errors.name = ["The name is required."];
    if (
      !channels.some(
        (channel) => channel.id === body.connector_id && channel.is_active,
      )
    )
      errors.connector_id = ["Choose an active channel."];
    if (Object.keys(errors).length) return json(response, 422, { errors });
    const record = {
      id: nextWorkspaceId++,
      agency_id: Number(workspaceCollection[1]),
      client_id: Number(workspaceCollection[2]),
      ...body,
      created_at: null,
      updated_at: null,
    };
    updatedWorkspaces.set(record.id, record);
    return json(response, 201, { data: withConnection(record) });
  }
  if (workspaceCollection && request.method === "GET")
    return json(
      response,
      200,
      paginated(
        filteredWorkspaces(
          (row) =>
            row.agency_id === Number(workspaceCollection[1]) &&
            row.client_id === Number(workspaceCollection[2]),
        ),
      ),
    );
  const workspaceConnection = url.pathname.match(
    /^\/api\/v1\/agencies\/(\d+)\/clients\/(\d+)\/workspaces\/(\d+)\/(credentials|fetch)$/,
  );
  if (workspaceConnection) {
    const workspace = workspaceRows.find(
      (row) =>
        row.agency_id === Number(workspaceConnection[1]) &&
        row.client_id === Number(workspaceConnection[2]) &&
        row.id === Number(workspaceConnection[3]),
    );
    if (!workspace)
      return json(response, 404, { message: "Workspace not found" });
    if (
      request.method !== "GET" &&
      request.headers["x-xsrf-token"] !== "browser-token="
    )
      return json(response, 419, { message: "CSRF mismatch" });
    const state = credentialState(workspace);
    if (workspaceConnection[4] === "fetch" && request.method === "POST") {
      if (state.status !== "connected")
        return json(response, 422, { message: "Connect the workspace first." });
      credentialsByWorkspace.set(workspace.id, {
        ...state,
        last_fetched_at: "2026-09-24T09:00:00Z",
        last_fetch_status: "completed",
      });
      return json(response, 200, {
        data: {
          status: "completed",
          rows_upserted: 400,
          date_from: "2025-08-21",
          date_to: "2026-09-24",
          is_sample: true,
        },
      });
    }
    if (request.method === "GET")
      return json(response, 200, credentialsResponse(workspace));
    if (request.method === "PUT") {
      const body = await readJson(request);
      const channel = channels.find(
        (entry) => entry.id === workspace.connector_id,
      );
      const values = { ...state.values };
      for (const [key, value] of Object.entries(body.values ?? {}))
        if (value !== "") values[key] = value;
      const errors = {};
      for (const field of channel?.credential_fields ?? [])
        if (field.required && !values[field.key])
          errors[`values.${field.key}`] = [
            `The ${field.label} field is required.`,
          ];
      if (Object.keys(errors).length) return json(response, 422, { errors });
      credentialsByWorkspace.set(workspace.id, {
        ...state,
        values,
        status: "connected",
      });
      return json(response, 200, credentialsResponse(workspace));
    }
    if (request.method === "DELETE") {
      credentialsByWorkspace.set(workspace.id, {
        ...state,
        values: {},
        status: "not_connected",
      });
      return json(response, 200, credentialsResponse(workspace));
    }
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
    if (existing.connector_id && body.connector_id !== existing.connector_id)
      return json(response, 422, {
        errors: { connector_id: ["The channel cannot be changed."] },
      });
    const record = { ...existing, ...body };
    updatedWorkspaces.set(id, record);
    return json(response, 200, { data: withConnection(record) });
  }
  if (workspaceDetail && request.method === "DELETE") {
    if (request.headers["x-xsrf-token"] !== "browser-token=")
      return json(response, 419, { message: "CSRF mismatch" });
    if (
      request.headers.cookie?.includes("mosaiq-session=active-manager-session")
    )
      return json(response, 403, { message: "Forbidden" });
    const id = Number(workspaceDetail[3]);
    if (!workspaceRows.some((row) => row.id === id))
      return json(response, 404, { message: "Workspace not found" });
    deletedWorkspaces.add(id);
    credentialsByWorkspace.delete(id);
    response.writeHead(204);
    return response.end();
  }
  if (workspaceDetail && request.method === "GET") {
    const row = workspaceRows.find(
      (entry) =>
        entry.agency_id === Number(workspaceDetail[1]) &&
        entry.client_id === Number(workspaceDetail[2]) &&
        entry.id === Number(workspaceDetail[3]),
    );
    return row
      ? json(response, 200, { data: withConnection(row) })
      : json(response, 404, { message: "Workspace not found" });
  }
  const reportMatch = url.pathname.match(
    /^\/api\/v1\/agencies\/(\d+)\/clients\/(\d+)\/reports(?:\/(\d+)(\/.*)?)?$/,
  );
  if (reportMatch) {
    const agencyId = Number(reportMatch[1]);
    const clientId = Number(reportMatch[2]);
    const reportId = reportMatch[3] ? Number(reportMatch[3]) : undefined;
    const rest = reportMatch[4] ?? "";
    const client = clientRows.find(
      (row) => row.id === clientId && row.agency_id === agencyId,
    );
    if (!client) return json(response, 404, { message: "Client not found" });
    if (request.method !== "GET" && !hasCsrf(request))
      return json(response, 419, { message: "CSRF mismatch" });
    const sourceRows = (ids) =>
      ids
        .map((id) => workspaceRows.find((row) => row.id === id))
        .filter(Boolean)
        .map(withConnection);
    const resource = (report) => ({
      ...report,
      client: { id: client.id, name: client.name },
      active_links_count:
        report.status === "archived"
          ? 0
          : shareLinks.filter(
              (link) =>
                link.report_id === report.id &&
                link.status === "active" &&
                (link.expires_at === null ||
                  new Date(link.expires_at) > new Date()),
            ).length,
      workspaces: sourceRows(report.workspace_ids).map((row, position) => ({
        id: row.id,
        name: row.name,
        currency: row.currency,
        position,
        channel: row.connector
          ? {
              id: row.connector.id,
              code: row.connector.code,
              name: row.connector.name,
            }
          : null,
      })),
      workspace_ids: undefined,
      created_by: { id: 1, name: "Demo Admin" },
      updated_by: { id: 1, name: "Demo Admin" },
    });
    const currencyErrors = (ids, currency, key) => {
      const unknown = ids.filter(
        (id) =>
          !workspaceRows.some(
            (row) => row.id === id && row.client_id === clientId,
          ),
      );
      if (unknown.length)
        return { [key]: ["The selected workspace is invalid."] };
      const different = sourceRows(ids).filter(
        (row) => row.currency !== currency,
      );
      return different.length
        ? {
            [key]: [
              `Every source workspace must use the report currency (${currency}). Different: ${different.map((row) => row.name).join(", ")}.`,
            ],
          }
        : undefined;
    };
    const touch = (report) => {
      report.layout_version += 1;
      report.updated_at = new Date().toISOString();
    };

    if (reportId === undefined) {
      if (request.method === "GET") {
        const search = url.searchParams.get("search")?.toLowerCase() ?? "";
        const status = url.searchParams.get("status");
        const rows = [...reports.values()]
          .filter(
            (report) =>
              report.client_id === clientId &&
              report.name.toLowerCase().includes(search) &&
              (!status || report.status === status),
          )
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
          .map(resource);
        return json(response, 200, paginated(rows));
      }
      if (request.method === "POST") {
        const body = await readJson(request);
        if (!body.name?.trim())
          return json(response, 422, {
            errors: { name: ["The name field is required."] },
          });
        const agency = agencyRows.find((row) => row.id === agencyId);
        const currency = body.currency ?? agency?.default_currency ?? "USD";
        const workspaceIds = body.workspace_ids ?? [];
        const errors = currencyErrors(workspaceIds, currency, "workspace_ids");
        if (errors) return json(response, 422, { message: "Invalid.", errors });
        const id = nextReportId++;
        const now = new Date().toISOString();
        const report = {
          id,
          agency_id: agencyId,
          client_id: clientId,
          name: body.name.trim(),
          status: "active",
          currency,
          timezone: body.timezone ?? "Europe/London",
          default_range_preset: body.default_range_preset ?? "last_30_days",
          layout_version: 1,
          workspace_ids: workspaceIds,
          created_at: now,
          updated_at: now,
        };
        reports.set(id, report);
        reportLayouts.set(id, reportLayoutTemplate(id));
        return json(response, 201, { data: resource(report) });
      }
    }

    const report = reports.get(reportId);
    if (!report || report.client_id !== clientId)
      return json(response, 404, { message: "Report not found" });
    const sections = reportLayouts.get(report.id);
    const treeResponse = () =>
      json(response, 200, {
        data: {
          report_id: report.id,
          layout_version: report.layout_version,
          sections,
        },
      });

    const linkMatch = rest.match(
      /^\/links(?:\/(\d+)(?:\/(revoke|regenerate))?)?$/,
    );
    if (linkMatch) {
      if (!linkMatch[1] && request.method === "GET")
        return json(response, 200, {
          data: shareLinks
            .filter((link) => link.report_id === report.id)
            .sort((a, b) => b.id - a.id),
        });
      if (!linkMatch[1] && request.method === "POST") {
        const body = await readJson(request);
        if (body.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(body.slug))
          return json(response, 422, {
            message: "The given data was invalid.",
            errors: {
              slug: [
                "The slug may only contain lowercase letters, numbers and single dashes.",
              ],
            },
          });
        const id = nextShareLinkId++;
        const slug = `${body.slug || "report"}-${String(id).padStart(6, "0")}`;
        const link = {
          id,
          report_id: report.id,
          label: body.label ?? null,
          slug,
          url: `http://portal.example.test/userPortal/${slug}`,
          status: "active",
          has_password: typeof body.password === "string",
          expires_at: body.expires_at ?? null,
          revoked_at: null,
          view_count: 0,
          last_viewed_at: null,
          created_by: { id: 1, name: "Demo Admin" },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        shareLinks.push(link);
        return json(response, 201, { data: link });
      }
      const link = shareLinks.find(
        (entry) =>
          entry.report_id === report.id && entry.id === Number(linkMatch[1]),
      );
      if (!link) return json(response, 404, { message: "Link not found" });
      if (linkMatch[2] === "revoke" && request.method === "POST") {
        if (link.status !== "revoked") {
          link.status = "revoked";
          link.revoked_at = new Date().toISOString();
        }
        return json(response, 200, { data: link });
      }
    }
    if (rest === "" && request.method === "GET")
      return json(response, 200, { data: resource(report) });
    if (rest === "" && request.method === "PUT") {
      const body = await readJson(request);
      if (body.currency) {
        const errors = currencyErrors(
          report.workspace_ids,
          body.currency,
          "currency",
        );
        if (errors) return json(response, 422, { message: "Invalid.", errors });
      }
      for (const key of [
        "name",
        "status",
        "currency",
        "timezone",
        "default_range_preset",
      ])
        if (body[key] !== undefined) report[key] = body[key];
      touch(report);
      return json(response, 200, { data: resource(report) });
    }
    if (rest === "" && request.method === "DELETE") {
      reports.delete(report.id);
      response.writeHead(204);
      return response.end();
    }
    if (rest === "/workspaces" && request.method === "PUT") {
      const body = await readJson(request);
      const errors = currencyErrors(
        body.workspace_ids,
        report.currency,
        "workspace_ids",
      );
      if (errors) return json(response, 422, { message: "Invalid.", errors });
      report.workspace_ids = body.workspace_ids;
      touch(report);
      return json(response, 200, { data: resource(report) });
    }
    if (rest === "/duplicate" && request.method === "POST") {
      const id = nextReportId++;
      const copy = {
        ...report,
        id,
        name: `${report.name} (copy)`,
        status: "active",
        layout_version: 1,
      };
      reports.set(id, copy);
      reportLayouts.set(id, structuredClone(sections));
      return json(response, 201, { data: resource(copy) });
    }
    if (rest === "/layout" && request.method === "GET") return treeResponse();
    if (rest === "/layout/order" && request.method === "PUT") {
      const body = await readJson(request);
      const nodes = layoutNodes(sections);
      const items = body.items ?? [];
      const moved = items.map((entry) =>
        nodes.find((node) => node.id === entry.id),
      );
      const parentId = moved[0]?.parent_id;
      const siblings =
        parentId === null
          ? sections
          : nodes.find((node) => node.id === parentId)?.children;
      if (
        moved.some((node) => !node || node.parent_id !== parentId) ||
        !siblings ||
        siblings.length !== items.length
      )
        return json(response, 422, {
          errors: { items: ["Send every child of one parent."] },
        });
      for (const entry of items) {
        const node = nodes.find((candidate) => candidate.id === entry.id);
        if (entry.is_enabled && !node.is_available)
          return json(response, 422, {
            errors: { items: [`${node.title} can't be enabled yet.`] },
          });
        node.position = entry.position;
        if (entry.is_enabled !== undefined) node.is_enabled = entry.is_enabled;
      }
      siblings.sort((a, b) => a.position - b.position);
      siblings.forEach((node, position) => (node.position = position));
      touch(report);
      return treeResponse();
    }
    const itemMatch = rest.match(/^\/layout\/(\d+)(\/reset)?$/);
    if (itemMatch) {
      const node = layoutNodes(sections).find(
        (entry) => entry.id === Number(itemMatch[1]),
      );
      if (!node) return json(response, 404, { message: "Item not found" });
      const itemResource = () => {
        const { children: _children, ...item } = node;
        return json(response, 200, {
          data: { ...item, title: node.settings?.title ?? node.default_title },
        });
      };
      if (itemMatch[2] && request.method === "POST") {
        node.is_enabled = node.code !== "mmm";
        node.settings = [];
        node.content = null;
        node.as_of = null;
        touch(report);
        return itemResource();
      }
      if (!itemMatch[2] && request.method === "PATCH") {
        const body = await readJson(request);
        if (
          node.type === "text_hero" &&
          body.content &&
          !body.content.headline?.trim()
        )
          return json(response, 422, {
            errors: { "content.headline": ["The headline field is required."] },
          });
        if (body.is_enabled !== undefined) node.is_enabled = body.is_enabled;
        if (body.settings !== undefined) node.settings = body.settings ?? [];
        if (body.content !== undefined) node.content = body.content;
        if (body.as_of !== undefined) node.as_of = body.as_of;
        touch(report);
        return itemResource();
      }
    }
    const channelsOf = (rows) => [
      ...new Map(
        rows
          .filter((row) => row.connector)
          .map((row) => [
            row.connector.code,
            { code: row.connector.code, name: row.connector.name },
          ]),
      ).values(),
    ];
    const defaultFrom = shiftDay(
      reportRange.to,
      -(presetDays[report.default_range_preset] - 1),
    );
    if (rest === "/preview/meta" && request.method === "GET")
      return json(response, 200, {
        data: {
          requires_password: false,
          report: { name: report.name, client_name: client.name },
          agency: { name: "Northstar Digital", logo_url: null },
          currency: report.currency,
          timezone: report.timezone,
          date_range: {
            default: {
              preset: report.default_range_preset,
              from: defaultFrom,
              to: reportRange.to,
            },
            available: { from: reportRange.availableFrom, to: reportRange.to },
            presets: [...Object.keys(presetDays), "custom"],
            max_span_days: 366,
          },
          channels: channelsOf(sourceRows(report.workspace_ids)),
          sections: sections
            .filter((section) => section.is_enabled)
            .map((section) => ({
              code: section.code,
              name: section.title,
              tabs:
                section.children[0]?.level === "widget"
                  ? [{ code: section.code, name: section.title }]
                  : section.children
                      .filter((tab) => tab.is_enabled)
                      .map((tab) => ({ code: tab.code, name: tab.title })),
            })),
        },
      });
    const tabMatch = rest.match(/^\/preview\/tabs\/([a-z_]+)$/);
    if (tabMatch && request.method === "GET") {
      const from = url.searchParams.get("from") ?? defaultFrom;
      const to = url.searchParams.get("to") ?? reportRange.to;
      const channel = url.searchParams.get("channel");
      const tab = layoutNodes(sections).find(
        (node) => node.code === tabMatch[1] && node.level !== "widget",
      );
      if (!tab)
        return json(response, 200, {
          data: {
            tab: tabMatch[1],
            period: { from, to, compare_from: from, compare_to: to },
            channel,
            layout_version: report.layout_version,
            widgets: [],
          },
        });
      const sources = sourceRows(report.workspace_ids).filter(
        (row) => !channel || row.connector?.code === channel,
      );
      const sourceIds = sources.map((row) => row.id);
      const spend = sources.reduce(
        (sum, row) => sum + correctedSpend(row.id),
        0,
      );
      const revenue = sources.length * seededTotals.revenue;
      const roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : null;
      const single = sources.length === 1 ? sources[0].id : undefined;
      const ref = (path, metric, total, workspaceIds, workspaceId) => {
        const ids = spendCorrectionIds(workspaceIds);
        return {
          path,
          metric,
          is_base: metric === "spend",
          ...(metric === "spend" ? {} : { inputs: ["revenue", "spend"] }),
          ...(workspaceId === undefined ? {} : { workspace_id: workspaceId }),
          date_from: from,
          date_to: to,
          total,
          edited: ids.length > 0,
          correction_ids: ids,
        };
      };
      const widgets = tab.children.map((node) => {
        const settings = Array.isArray(node.settings) ? {} : node.settings;
        const envelope = {
          code: node.code,
          type: node.type,
          kind: node.kind,
          title: settings.title ?? node.default_title,
          subtitle: settings.subtitle ?? null,
          as_of: node.kind === "live" ? null : node.as_of,
          empty: false,
        };
        const editing = (values) => ({
          item_id: node.id,
          kind: node.kind,
          is_enabled: node.is_enabled,
          is_available: node.is_available,
          settings,
          values,
        });
        if (node.code === "blended_roas")
          return {
            ...envelope,
            label: envelope.title,
            value: roas,
            format: "multiplier",
            change: null,
            sparkline: [],
            empty: roas === null,
            editing: editing([ref("value", "roas", roas, sourceIds, single)]),
          };
        if (node.code === "roas_by_channel")
          return {
            ...envelope,
            center: {
              label: "Blended ROAS",
              value: roas,
              format: "multiplier",
            },
            items: sources.map((row) => ({
              key: row.connector?.code ?? String(row.id),
              label: row.connector?.name ?? row.name,
              value: correctedSpend(row.id),
              format: "currency",
              share:
                spend > 0
                  ? Math.round((correctedSpend(row.id) / spend) * 10000) / 100
                  : 0,
            })),
            filterable: true,
            empty: sources.length === 0,
            editing: editing([
              ref("center.value", "roas", roas, sourceIds, single),
              ...sources.map((row, index) =>
                ref(
                  `items.${index}.value`,
                  "spend",
                  correctedSpend(row.id),
                  [row.id],
                  row.id,
                ),
              ),
            ]),
          };
        if (node.code === "budget_utilization") {
          const pacing = budgetPacing(sourceIds, from, to);
          if (!pacing)
            return {
              ...envelope,
              center: null,
              items: [],
              filterable: false,
              empty: true,
              reason: "no_budget",
              editing: editing([]),
            };
          const spentShare = Math.min(pacing.spend / pacing.budget, 1) * 100;
          return {
            ...envelope,
            center: {
              label: "Pacing",
              value: pacing.pacing,
              format: "percent",
            },
            items: [
              {
                key: "spent",
                label: "Spent",
                value: pacing.spend,
                format: "currency",
                share: Math.round(spentShare * 100) / 100,
              },
              {
                key: "remaining",
                label: "Remaining",
                value: Math.max(pacing.budget - pacing.spend, 0),
                format: "currency",
                share: Math.round((100 - spentShare) * 100) / 100,
              },
            ],
            filterable: false,
            editing: editing([]),
          };
        }
        if (node.kind !== "live") {
          const content = node.content ?? {};
          return {
            ...envelope,
            ...(node.type === "text_hero"
              ? {
                  headline: content.headline ?? null,
                  body: content.body ?? null,
                }
              : { items: content.items ?? [] }),
            ...(node.type === "bullet_list" ? { tone: "positive" } : {}),
            empty: node.content === null,
            editing: editing([]),
          };
        }
        return { ...envelope, empty: true, editing: editing([]) };
      });
      return json(response, 200, {
        data: {
          tab: tab.code,
          period: {
            from,
            to,
            compare_from: shiftDay(from, -30),
            compare_to: shiftDay(from, -1),
          },
          channel,
          layout_version: report.layout_version,
          widgets,
        },
      });
    }
  }
  json(response, 404, { message: "Not found" });
}).listen(4444, "127.0.0.1");
