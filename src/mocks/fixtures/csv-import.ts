// Contract fixtures for CSV import (API Steps 13 and 14), shaped like the
// preview and apply responses. Production code must not import this file.

// Results from the files of a Step 13 template zip, and one separate CSV.
export const csvImportFileFixtures = {
  ready: {
    file: "01-audience-profile/03_audience_by_segment.csv",
    source: "MOSAIQ-Marketing-Intelligence-Templates.zip",
    line: null,
    status: "ready",
    widget: {
      id: 31,
      code: "audience_by_segment",
      title: "Audience by Segment",
      type: "progress_list",
    },
    tab: {
      code: "audience_profile",
      title: "Audience Profile",
      is_enabled: true,
    },
    section_enabled: true,
    rows: 2,
    errors: [],
    content: {
      items: [
        { label: "Indian", value: 58, format: "percent" },
        { label: "Pakistani", value: 22, format: "percent" },
      ],
      footer: [],
    },
  },
  invalid: {
    file: "04-behaviour/02_core_values.csv",
    source: "MOSAIQ-Marketing-Intelligence-Templates.zip",
    line: null,
    status: "invalid",
    widget: {
      id: 41,
      code: "core_values",
      title: "Core Values",
      type: "progress_list",
    },
    tab: { code: "behaviour", title: "Behaviour", is_enabled: true },
    section_enabled: true,
    rows: 5,
    errors: [
      {
        line: 3,
        column: "value",
        message: "Write numbers without %, $ or commas, e.g. 30 not 30%.",
      },
      {
        line: 4,
        column: "audience",
        message:
          "Use one of this report's audience codes: south_asian, chinese.",
      },
    ],
    content: null,
  },
  skipped: {
    file: "04-behaviour/03_category_spending.csv",
    source: "MOSAIQ-Marketing-Intelligence-Templates.zip",
    line: null,
    status: "skipped",
    widget: {
      id: 42,
      code: "category_spending",
      title: "Category Spending",
      type: "progress_list",
    },
    tab: { code: "behaviour", title: "Behaviour", is_enabled: true },
    section_enabled: true,
    rows: 0,
    errors: [],
    content: null,
  },
  outOfScope: {
    file: "05_channel_diagnosis.csv",
    source: "05_channel_diagnosis.csv",
    line: null,
    status: "out_of_scope",
    widget: {
      id: 52,
      code: "mmm_channel_diagnosis",
      title: "Channel Diagnosis",
      type: "data_table",
    },
    tab: null,
    errors: [],
    content: null,
  },
  ignored: {
    file: "README.txt",
    source: "MOSAIQ-Marketing-Intelligence-Templates.zip",
    line: null,
    status: "ignored",
  },
} as const;

export const combinedCsvName = "MOSAIQ-Marketing-Intelligence.csv";

// The blocks of one combined file (API Step 14): two ready cards, one with
// errors on lines of the file, and one outside the section.
export const csvImportCombinedFixtures = {
  audienceBySegment: {
    ...csvImportFileFixtures.ready,
    file: `${combinedCsvName} › audience_by_segment`,
    source: combinedCsvName,
    line: 12,
  },
  coreValues: {
    ...csvImportFileFixtures.invalid,
    file: `${combinedCsvName} › core_values`,
    source: combinedCsvName,
    line: 212,
    errors: [
      {
        line: 215,
        column: "value",
        message: "Write numbers without %, $ or commas, e.g. 30 not 30%.",
      },
    ],
  },
  categorySpending: {
    ...csvImportFileFixtures.skipped,
    file: `${combinedCsvName} › category_spending`,
    source: combinedCsvName,
    line: 220,
    status: "ready",
    rows: 1,
    content: {
      items: [{ label: "Groceries", value: 41, format: "percent" }],
      footer: [],
    },
  },
  channelDiagnosis: {
    ...csvImportFileFixtures.outOfScope,
    file: `${combinedCsvName} › channel_diagnosis`,
    source: combinedCsvName,
    line: 301,
  },
} as const;

// A problem with the combined file itself, belonging to no card.
export const csvImportFormatErrorFixture = {
  file: combinedCsvName,
  source: combinedCsvName,
  line: null,
  status: "invalid",
  widget: null,
  errors: [
    { line: 4, column: null, message: "Start each card with a #card line." },
  ],
} as const;

type CsvImportFileFixture = {
  file: string;
  status: string;
  widget?: { code: string } | null;
  [field: string]: unknown;
};

export function csvImportPreviewFixture(
  files: readonly CsvImportFileFixture[] = Object.values(csvImportFileFixtures),
) {
  const count = (status: string) =>
    files.filter((file) => file.status === status).length;
  return {
    data: {
      as_of: "2026-10-15",
      summary: {
        ready: count("ready"),
        invalid: count("invalid"),
        skipped: count("skipped"),
        ignored:
          files.length - count("ready") - count("invalid") - count("skipped"),
      },
      files,
    },
  };
}

export function csvImportApplyFixture(
  files: readonly CsvImportFileFixture[] = [csvImportFileFixtures.ready],
) {
  const preview = csvImportPreviewFixture(files);
  return {
    data: {
      ...preview.data,
      applied: files.flatMap((file) =>
        file.status === "ready" && file.widget ? [file.widget.code] : [],
      ),
      layout_version: 4,
    },
  };
}
