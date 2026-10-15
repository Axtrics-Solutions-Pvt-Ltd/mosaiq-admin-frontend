// Contract fixtures for CSV import (API Step 13), shaped like the preview and
// apply responses. Production code must not import this file.

export const csvImportFileFixtures = {
  ready: {
    file: "01-audience-profile/03_audience_by_segment.csv",
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
  ignored: { file: "README.txt", status: "ignored" },
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
