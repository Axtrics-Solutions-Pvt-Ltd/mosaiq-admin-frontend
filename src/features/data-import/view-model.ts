export type DatasetType = "reporting" | "marketing" | "mmm";
export type PreviewScenario =
  "valid" | "mixed" | "invalid" | "processing" | "failed" | "unavailable";

export const importAgencies = [
  {
    id: "northstar",
    name: "Northstar Digital",
    workspaces: [
      { id: "commerce", name: "Commerce Hub" },
      { id: "insights", name: "Insights Lab" },
    ],
  },
  {
    id: "kinetic",
    name: "Kinetic Growth",
    workspaces: [{ id: "growth", name: "Growth Studio" }],
  },
] as const;

export const datasetGuides = {
  reporting: {
    label: "Reporting",
    description: "Campaign performance by date, channel, and creative.",
    columns: [
      "date",
      "campaign",
      "channel",
      "spend",
      "impressions",
      "clicks",
      "conversions",
      "revenue",
      "creative",
      "status",
    ],
    sampleRows: [
      [
        "2026-09-01",
        "Autumn launch",
        "Paid search",
        "1250.00",
        "42000",
        "1680",
        "74",
        "5820.00",
        "Search A",
        "Active",
      ],
      [
        "2026-09-02",
        "Autumn launch",
        "Paid social",
        "980.00",
        "51000",
        "1205",
        "49",
        "3910.00",
        "Video B",
        "Active",
      ],
    ],
  },
  marketing: {
    label: "Marketing Intelligence",
    description: "Market observations and their planning implications.",
    columns: [
      "section",
      "metric",
      "value",
      "category",
      "geography",
      "source",
      "planning implication",
    ],
    sampleRows: [
      [
        "Audience",
        "Search interest",
        "+18%",
        "Growth",
        "UK",
        "Research panel",
        "Increase search coverage",
      ],
      [
        "Market",
        "Category demand",
        "Stable",
        "Retail",
        "EU",
        "Industry report",
        "Maintain spend mix",
      ],
    ],
  },
  mmm: {
    label: "Media Mix Model",
    description:
      "Time series inputs for media, promotions, seasonality, and outcomes.",
    columns: [
      "date",
      "channel",
      "spend",
      "impressions",
      "clicks",
      "conversions",
      "revenue",
      "promotion",
      "seasonality",
    ],
    sampleRows: [
      [
        "2026-09-01",
        "Paid search",
        "1250.00",
        "42000",
        "1680",
        "74",
        "5820.00",
        "None",
        "Back to school",
      ],
      [
        "2026-09-02",
        "Paid social",
        "980.00",
        "51000",
        "1205",
        "49",
        "3910.00",
        "10% offer",
        "Back to school",
      ],
    ],
  },
} as const;

export type ReviewIssue = {
  row: string;
  column: string;
  message: string;
  severity: "warning" | "error";
};
export type ScenarioReview = {
  label: string;
  status: "ready" | "blocked" | "processing" | "failed" | "unavailable";
  fileName: string;
  fileSize: string;
  rowCount: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  missingColumns: readonly string[];
  issues: readonly ReviewIssue[];
  note: string;
};

export const scenarioReviews: Record<PreviewScenario, ScenarioReview> = {
  valid: {
    label: "Valid file",
    status: "ready",
    fileName: "reporting-september.csv",
    fileSize: "48 KB",
    rowCount: 240,
    validCount: 240,
    warningCount: 0,
    errorCount: 0,
    missingColumns: [],
    issues: [],
    note: "All example rows pass the illustrated checks. No file was validated.",
  },
  mixed: {
    label: "Mixed warnings",
    status: "ready",
    fileName: "campaign-data.csv",
    fileSize: "56 KB",
    rowCount: 240,
    validCount: 233,
    warningCount: 5,
    errorCount: 2,
    missingColumns: [],
    issues: [
      {
        row: "18",
        column: "date",
        message: "Date uses 09/02/2026; use YYYY-MM-DD.",
        severity: "error",
      },
      {
        row: "42",
        column: "campaign",
        message: "Possible duplicate of row 41.",
        severity: "warning",
      },
      {
        row: "71",
        column: "revenue",
        message: "Value is missing; check before import.",
        severity: "warning",
      },
      {
        row: "113",
        column: "spend",
        message: "Value must be a number.",
        severity: "error",
      },
    ],
    note: "Example warnings need review; example errors must be corrected before confirmation.",
  },
  invalid: {
    label: "Invalid file",
    status: "blocked",
    fileName: "incorrect-columns.csv",
    fileSize: "31 KB",
    rowCount: 120,
    validCount: 91,
    warningCount: 7,
    errorCount: 22,
    missingColumns: ["date", "revenue"],
    issues: [
      {
        row: "Header",
        column: "date",
        message: "Required column is missing.",
        severity: "error",
      },
      {
        row: "Header",
        column: "revenue",
        message: "Required column is missing.",
        severity: "error",
      },
      {
        row: "7",
        column: "spend",
        message: "Value must be a number.",
        severity: "error",
      },
      {
        row: "19",
        column: "channel",
        message: "Possible duplicate channel and date.",
        severity: "warning",
      },
    ],
    note: "This example is blocked until missing columns and row errors are corrected.",
  },
  processing: {
    label: "Processing",
    status: "processing",
    fileName: "mmm-quarterly.csv",
    fileSize: "112 KB",
    rowCount: 520,
    validCount: 0,
    warningCount: 0,
    errorCount: 0,
    missingColumns: [],
    issues: [],
    note: "Illustrative progress only. No file has been uploaded or processed.",
  },
  failed: {
    label: "Processing failed",
    status: "failed",
    fileName: "mmm-quarterly.csv",
    fileSize: "112 KB",
    rowCount: 520,
    validCount: 0,
    warningCount: 0,
    errorCount: 0,
    missingColumns: [],
    issues: [],
    note: "Example failure: processing stopped. Retry is unavailable in this preview.",
  },
  unavailable: {
    label: "Processing unavailable",
    status: "unavailable",
    fileName: "reporting-september.csv",
    fileSize: "48 KB",
    rowCount: 0,
    validCount: 0,
    warningCount: 0,
    errorCount: 0,
    missingColumns: [],
    issues: [],
    note: "Server processing is unavailable in this UI preview. No file has been sent.",
  },
};

export const mmmReadiness = {
  score: 82,
  checks: [
    {
      label: "Completeness",
      value: "94%",
      detail: "Most daily media and outcome fields are present.",
    },
    {
      label: "Time coverage",
      value: "26 weeks",
      detail: "A longer time series may improve confidence.",
    },
    {
      label: "Channel consistency",
      value: "Good",
      detail: "Channel names are mostly consistent.",
    },
    {
      label: "Outcome consistency",
      value: "Review",
      detail: "Check three days with missing revenue.",
    },
  ],
} as const;
