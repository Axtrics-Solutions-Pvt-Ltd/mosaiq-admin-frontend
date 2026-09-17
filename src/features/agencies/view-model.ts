export type AgencyStatus = "active" | "inactive";
export type AgencyCurrency = "AUD" | "EUR" | "GBP" | "INR" | "USD";

export type AgencySummary = {
  createdAt: string;
  currency: AgencyCurrency;
  id: string;
  lastActivity: string;
  logoTone: "blue" | "cyan" | "indigo" | "teal" | "violet";
  name: string;
  primaryAdmin: { email: string; name: string };
  status: AgencyStatus;
  users: number;
  workspaces: number;
};

export type AgencyDetail = AgencySummary & {
  activity: { id: string; description: string; time: string; title: string }[];
  administrators: { id: string; name: string; role: string; status: string }[];
  brandColor: string;
  dateFormat: string;
  description: string;
  displayName: string;
  language: string;
  legalName: string;
  primaryContact: {
    email: string;
    jobTitle: string;
    name: string;
    phone: string;
  };
  reportingWeek: string;
  timeZone: string;
  website: string;
  workspaceRecords: {
    dataSource: string;
    id: string;
    name: string;
    status: AgencyStatus;
  }[];
};

type AgencySeed = readonly [
  string,
  string,
  string,
  string,
  number,
  number,
  AgencyCurrency,
  AgencyStatus,
  string,
  string,
  AgencySummary["logoTone"],
];

const agencySeeds: readonly AgencySeed[] = [
  [
    "agency_northstar",
    "Northstar Digital",
    "Anika Rao",
    "anika@northstar.example",
    12,
    58,
    "USD",
    "active",
    "2024-01-18",
    "Today, 09:42",
    "blue",
  ],
  [
    "agency_kinetic",
    "Kinetic Growth",
    "Marcus Chen",
    "marcus@kinetic.example",
    9,
    43,
    "GBP",
    "active",
    "2024-02-06",
    "Today, 08:15",
    "indigo",
  ],
  [
    "agency_atlas",
    "Atlas Partners",
    "Maya Thompson",
    "maya@atlas.example",
    7,
    37,
    "EUR",
    "active",
    "2024-03-12",
    "Yesterday, 16:20",
    "cyan",
  ],
  [
    "agency_lumina",
    "Lumina Studio",
    "Oliver Grant",
    "oliver@lumina.example",
    6,
    28,
    "AUD",
    "active",
    "2024-04-03",
    "Yesterday, 11:05",
    "violet",
  ],
  [
    "agency_newbridge",
    "Newbridge Media",
    "Zara Ahmed",
    "zara@newbridge.example",
    0,
    2,
    "GBP",
    "active",
    "2026-09-08",
    "2 days ago",
    "teal",
  ],
  [
    "agency_horizon",
    "Horizon Collective",
    "Elena Rossi",
    "elena@horizon.example",
    1,
    4,
    "EUR",
    "active",
    "2024-06-24",
    "3 days ago",
    "blue",
  ],
  [
    "agency_summit",
    "Summit Strategy",
    "Noah Wilson",
    "noah@summit.example",
    1,
    3,
    "USD",
    "active",
    "2024-08-19",
    "4 days ago",
    "indigo",
  ],
  [
    "agency_meridian",
    "Meridian Works",
    "Aarav Mehta",
    "aarav@meridian.example",
    1,
    3,
    "INR",
    "active",
    "2024-10-09",
    "6 days ago",
    "cyan",
  ],
  [
    "agency_brightline",
    "Brightline Agency",
    "Grace Kim",
    "grace@brightline.example",
    1,
    3,
    "USD",
    "active",
    "2025-01-14",
    "1 week ago",
    "teal",
  ],
  [
    "agency_pulse",
    "Pulse Creative",
    "Ethan Brooks",
    "ethan@pulse.example",
    0,
    2,
    "AUD",
    "active",
    "2025-05-22",
    "2 weeks ago",
    "violet",
  ],
  [
    "agency_redwood",
    "Redwood & Co.",
    "Sofia Marin",
    "sofia@redwood.example",
    0,
    2,
    "USD",
    "inactive",
    "2025-06-17",
    "1 month ago",
    "blue",
  ],
  [
    "agency_orbit",
    "Orbit Advisory",
    "Daniel Okafor",
    "daniel@orbit.example",
    0,
    1,
    "GBP",
    "inactive",
    "2025-09-30",
    "2 months ago",
    "indigo",
  ],
];

export const agencies: readonly AgencySummary[] = agencySeeds.map(
  ([
    id,
    name,
    adminName,
    email,
    workspaces,
    users,
    currency,
    status,
    createdAt,
    lastActivity,
    logoTone,
  ]) => ({
    createdAt,
    currency,
    id,
    lastActivity,
    logoTone,
    name,
    primaryAdmin: { email, name: adminName },
    status,
    users,
    workspaces,
  }),
);

const workspaceNames: Record<string, string[]> = {
  agency_northstar: ["Summit Retail", "Harbor Foods", "Nova Commerce"],
  agency_kinetic: ["Vertex Labs", "Pioneer Home", "Cedar Finance"],
  agency_atlas: ["Ember Health", "Northwind Travel"],
  agency_lumina: ["Helio Home", "Solace Beauty"],
};

export function getAgency(id: string): AgencyDetail | undefined {
  const agency = agencies.find((entry) => entry.id === id);
  if (!agency) return undefined;
  const names = workspaceNames[id] ?? [];
  return {
    ...agency,
    activity: [
      {
        id: "activity_1",
        title: "Agency profile reviewed",
        description: "Jaspreet Kaur checked the agency defaults.",
        time: "2 hours ago",
      },
      {
        id: "activity_2",
        title: "Administrator access updated",
        description: `${agency.primaryAdmin.name} remains the primary administrator.`,
        time: "Yesterday",
      },
      {
        id: "activity_3",
        title: "Reporting defaults confirmed",
        description: `Currency remains ${agency.currency} for new workspaces.`,
        time: "6 days ago",
      },
    ],
    administrators: [
      {
        id: "admin_1",
        name: agency.primaryAdmin.name,
        role: "Agency administrator",
        status: "Active",
      },
      {
        id: "admin_2",
        name: "Priya Shah",
        role: "Agency manager",
        status: "Active",
      },
    ],
    brandColor: "#2563EB",
    dateFormat: "DD MMM YYYY",
    description: `${agency.name} manages client reporting and performance workspaces across its portfolio.`,
    displayName: agency.name,
    language: "English (UK)",
    legalName: `${agency.name} Ltd`,
    primaryContact: {
      email: agency.primaryAdmin.email,
      jobTitle: "Operations Director",
      name: agency.primaryAdmin.name,
      phone: "+44 20 7946 0284",
    },
    reportingWeek: "Monday to Sunday",
    timeZone: "Europe/London (UTC+00:00)",
    website: `https://${agency.name
      .toLowerCase()
      .replaceAll(/[^a-z]+/g, "")
      .slice(0, 18)}.example`,
    workspaceRecords: names.map((name, index) => ({
      dataSource: index === 1 ? "Seeded data" : "CSV import",
      id: `workspace_${index + 1}`,
      name,
      status: "active",
    })),
  };
}

export type AgencyFilters = {
  activity: "all" | "recent" | "stale";
  currency: "all" | AgencyCurrency;
  search: string;
  status: "all" | AgencyStatus;
  workspaces: "all" | "none" | "one-to-five" | "six-plus";
};

export function filterAgencies(filters: AgencyFilters) {
  const term = filters.search.trim().toLocaleLowerCase();
  return agencies.filter((agency) => {
    const matchesTerm =
      !term ||
      agency.name.toLocaleLowerCase().includes(term) ||
      agency.primaryAdmin.name.toLocaleLowerCase().includes(term);
    const matchesWorkspace =
      filters.workspaces === "all" ||
      (filters.workspaces === "none" && agency.workspaces === 0) ||
      (filters.workspaces === "one-to-five" &&
        agency.workspaces >= 1 &&
        agency.workspaces <= 5) ||
      (filters.workspaces === "six-plus" && agency.workspaces >= 6);
    const matchesActivity =
      filters.activity === "all" ||
      (filters.activity === "recent" &&
        !agency.lastActivity.includes("month")) ||
      (filters.activity === "stale" && agency.lastActivity.includes("month"));
    return (
      matchesTerm &&
      matchesWorkspace &&
      matchesActivity &&
      (filters.status === "all" || agency.status === filters.status) &&
      (filters.currency === "all" || agency.currency === filters.currency)
    );
  });
}

export const agencyTotals = agencies.reduce(
  (totals, agency) => ({
    active: totals.active + (agency.status === "active" ? 1 : 0),
    agencies: totals.agencies + 1,
    users: totals.users + agency.users,
    workspaces: totals.workspaces + agency.workspaces,
  }),
  { active: 0, agencies: 0, users: 0, workspaces: 0 },
);
