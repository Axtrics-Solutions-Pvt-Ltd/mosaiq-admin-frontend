export type DashboardScope = "all" | "northstar" | "kinetic" | "newbridge";
export type DashboardSource = "all" | "seeded" | "csv" | "connector";
export type DashboardPeriod = "30" | "90" | "year";
export type DashboardState = "populated" | "loading" | "error" | "permission";
export type ImportStatus = "completed" | "failed" | "processing";

type MetricId =
  "agencies" | "workspaces" | "users" | "completed" | "failed" | "demo";
type Metric = { id: MetricId; label: string; value: number; note: string };
type DashboardRecord = {
  scopeLabel: string;
  metricValues: Record<DashboardPeriod, Record<DashboardSource, number[]>>;
  agencyUsage: { name: string; workspaces: number; users: number }[];
  sourceDistribution: { name: string; value: number }[];
  attention: {
    id: string;
    title: string;
    description: string;
    severity: "warning" | "danger";
  }[];
  imports: {
    id: string;
    name: string;
    agency: string;
    source: Exclude<DashboardSource, "all">;
    status: ImportStatus;
    time: string;
  }[];
};

const metricDefinitions: Omit<Metric, "value">[] = [
  { id: "agencies", label: "Total agencies", note: "10 currently active" },
  {
    id: "workspaces",
    label: "Active workspaces",
    note: "Across the selected scope",
  },
  { id: "users", label: "Active users", note: "6 invitations pending" },
  { id: "completed", label: "Completed imports", note: "In this period" },
  { id: "failed", label: "Failed imports", note: "Require attention" },
  { id: "demo", label: "Demo-data workspaces", note: "Using seeded data" },
];

const metrics = (
  all: number[],
  seeded: number[],
  csv: number[],
  connector: number[],
): Record<DashboardSource, number[]> => ({ all, connector, csv, seeded });

const allAgencies: DashboardRecord = {
  scopeLabel: "All agencies",
  metricValues: {
    "30": metrics(
      [12, 38, 186, 142, 3, 9],
      [8, 9, 54, 38, 0, 9],
      [10, 24, 108, 89, 3, 0],
      [4, 5, 24, 15, 0, 0],
    ),
    "90": metrics(
      [12, 38, 186, 391, 8, 9],
      [8, 9, 54, 106, 0, 9],
      [10, 24, 108, 243, 8, 0],
      [4, 5, 24, 42, 0, 0],
    ),
    year: metrics(
      [12, 38, 186, 1264, 21, 9],
      [8, 9, 54, 304, 0, 9],
      [10, 24, 108, 811, 21, 0],
      [4, 5, 24, 149, 0, 0],
    ),
  },
  agencyUsage: [
    { name: "Northstar", users: 58, workspaces: 12 },
    { name: "Kinetic", users: 43, workspaces: 9 },
    { name: "Atlas", users: 37, workspaces: 7 },
    { name: "Lumina", users: 28, workspaces: 6 },
    { name: "Other", users: 20, workspaces: 4 },
  ],
  sourceDistribution: [
    { name: "CSV", value: 24 },
    { name: "Seeded", value: 9 },
    { name: "Future connector", value: 5 },
  ],
  attention: [
    {
      id: "ws-summit",
      title: "Summit Retail has stale data",
      description: "No completed import in 14 days - Northstar Digital",
      severity: "warning",
    },
    {
      id: "imp-1048",
      title: "Revenue import failed validation",
      description: "18 rows need review - Kinetic Growth",
      severity: "danger",
    },
    {
      id: "ws-ember",
      title: "Ember Health still uses demo data",
      description: "Workspace created 9 days ago - Atlas Partners",
      severity: "warning",
    },
  ],
  imports: [
    {
      agency: "Northstar Digital",
      id: "imp-1052",
      name: "Q3 marketing performance",
      source: "csv",
      status: "completed",
      time: "18 min ago",
    },
    {
      agency: "Kinetic Growth",
      id: "imp-1051",
      name: "Paid media actuals",
      source: "csv",
      status: "failed",
      time: "1 hr ago",
    },
    {
      agency: "Atlas Partners",
      id: "imp-1050",
      name: "Workspace starter dataset",
      source: "seeded",
      status: "completed",
      time: "3 hrs ago",
    },
    {
      agency: "Lumina Studio",
      id: "imp-1049",
      name: "Analytics connector preview",
      source: "connector",
      status: "processing",
      time: "Yesterday",
    },
  ],
};

function agencyRecord(
  scopeLabel: string,
  values: [number[], number[], number[], number[]],
  usage: DashboardRecord["agencyUsage"],
  distribution: DashboardRecord["sourceDistribution"],
  attentionIndex: number,
): DashboardRecord {
  const periodMetrics = metrics(...values);
  return {
    ...allAgencies,
    scopeLabel,
    metricValues: {
      "30": periodMetrics,
      "90": periodMetrics,
      year: periodMetrics,
    },
    agencyUsage: usage,
    sourceDistribution: distribution,
    attention: allAgencies.attention.slice(attentionIndex, attentionIndex + 1),
    imports: allAgencies.imports.filter((entry) => entry.agency === scopeLabel),
  };
}

const agencyRecords: Record<Exclude<DashboardScope, "all">, DashboardRecord> = {
  northstar: agencyRecord(
    "Northstar Digital",
    [
      [1, 12, 58, 46, 1, 2],
      [1, 2, 11, 8, 0, 2],
      [1, 8, 41, 33, 1, 0],
      [1, 2, 6, 5, 0, 0],
    ],
    [
      { name: "Summit Retail", users: 16, workspaces: 3 },
      { name: "Harbor Foods", users: 13, workspaces: 3 },
      { name: "Nova Commerce", users: 11, workspaces: 2 },
      { name: "Other", users: 18, workspaces: 4 },
    ],
    [
      { name: "CSV", value: 8 },
      { name: "Seeded", value: 2 },
      { name: "Future connector", value: 2 },
    ],
    0,
  ),
  kinetic: agencyRecord(
    "Kinetic Growth",
    [
      [1, 9, 43, 31, 2, 1],
      [1, 1, 8, 5, 0, 1],
      [1, 7, 31, 24, 2, 0],
      [1, 1, 4, 2, 0, 0],
    ],
    [
      { name: "Vertex Labs", users: 15, workspaces: 3 },
      { name: "Pioneer Home", users: 12, workspaces: 2 },
      { name: "Cedar Finance", users: 9, workspaces: 2 },
      { name: "Other", users: 7, workspaces: 2 },
    ],
    [
      { name: "CSV", value: 7 },
      { name: "Seeded", value: 1 },
      { name: "Future connector", value: 1 },
    ],
    1,
  ),
  newbridge: {
    ...allAgencies,
    scopeLabel: "Newbridge Media",
    metricValues: {
      "30": metrics(
        [1, 0, 2, 0, 0, 0],
        [1, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0],
      ),
      "90": metrics(
        [1, 0, 2, 0, 0, 0],
        [1, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0],
      ),
      year: metrics(
        [1, 0, 2, 0, 0, 0],
        [1, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0],
      ),
    },
    agencyUsage: [],
    sourceDistribution: [],
    attention: [],
    imports: [],
  },
};

export function getDashboardView(
  scope: DashboardScope,
  period: DashboardPeriod,
  source: DashboardSource,
) {
  const record = scope === "all" ? allAgencies : agencyRecords[scope];
  const values = record.metricValues[period][source];
  return {
    ...record,
    sourceDistribution:
      source === "all"
        ? record.sourceDistribution
        : record.sourceDistribution.filter((entry) =>
            source === "connector"
              ? entry.name === "Future connector"
              : entry.name.toLowerCase().startsWith(source),
          ),
    imports:
      source === "all"
        ? record.imports
        : record.imports.filter((entry) => entry.source === source),
    metrics: metricDefinitions.map((metric, index) => ({
      ...metric,
      value: values[index] ?? 0,
    })),
  };
}
