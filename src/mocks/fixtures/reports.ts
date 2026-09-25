// Contract fixtures for the report builder tests, shaped like the API's
// preview and layout payloads (public report contract §5, Laravel resources).
// Production code must not import this file.

export const widgetFixtures = {
  text_hero: {
    code: "ai_summary",
    type: "text_hero",
    kind: "text",
    title: "AI Summary",
    subtitle: null,
    as_of: "2026-09-20",
    empty: false,
    headline: "Meta is leading on efficiency",
    body: "Blended ROAS rose 28% on the previous period.",
  },
  kpi: {
    code: "blended_roas",
    type: "kpi",
    kind: "live",
    title: "Blended ROAS",
    subtitle: null,
    as_of: null,
    empty: false,
    label: "Blended ROAS",
    value: 3.2,
    format: "multiplier",
    change: {
      value: 28,
      format: "percent",
      direction: "up",
      sentiment: "positive",
      label: "vs prev 30 days",
    },
    sparkline: [
      { x: "2026-08-25", y: 3.1 },
      { x: "2026-09-01", y: 3.3 },
    ],
  },
  line_chart: {
    code: "spend_vs_conversions",
    type: "line_chart",
    kind: "live",
    title: "Spend vs Conversions",
    subtitle: null,
    as_of: null,
    empty: false,
    granularity: "week",
    series: [
      {
        key: "spend",
        label: "Spend",
        format: "currency",
        axis: "left",
        points: [
          { x: "2026-08-25", y: 15200 },
          { x: "2026-09-01", y: 16800 },
        ],
      },
      {
        key: "conversions",
        label: "Conversions",
        format: "number",
        axis: "right",
        points: [
          { x: "2026-08-25", y: 410 },
          { x: "2026-09-01", y: 452 },
        ],
      },
    ],
  },
  donut: {
    code: "roas_by_channel",
    type: "donut",
    kind: "live",
    title: "ROAS by Channel",
    subtitle: null,
    as_of: null,
    empty: false,
    center: { label: "Blended ROAS", value: 3.2, format: "multiplier" },
    items: [
      {
        key: "meta_ads",
        label: "Meta Ads",
        value: 127900,
        format: "currency",
        share: 73,
      },
      {
        key: "google_ads",
        label: "Google Ads",
        value: 47300,
        format: "currency",
        share: 27,
      },
    ],
    filterable: true,
  },
  bullet_list: {
    code: "what_worked",
    type: "bullet_list",
    kind: "text",
    title: "What Worked",
    subtitle: null,
    as_of: null,
    empty: false,
    tone: "positive",
    items: ["Video creative drove a 2.34% CTR", "Retargeting cut CPA by 12%"],
  },
  recommendation_list: {
    code: "recommendations",
    type: "recommendation_list",
    kind: "text",
    title: "Recommendations",
    subtitle: null,
    as_of: null,
    empty: false,
    items: [
      {
        title: "Reallocate 15% of budget into Meta Ads",
        body: "Shift underperforming spend.",
        owner: "Media Buying Team",
      },
      { title: "Refresh search copy", body: null, owner: null },
    ],
  },
  kpi_group: {
    code: "kpi_cards",
    type: "kpi_group",
    kind: "live",
    title: "Key Metrics",
    subtitle: null,
    as_of: null,
    empty: false,
    items: [
      {
        label: "Spend",
        value: 175200,
        format: "currency",
        change: {
          value: 12.4,
          format: "percent",
          direction: "up",
          sentiment: "neutral",
          label: "vs prev 30 days",
        },
        sparkline: [
          { x: "2026-08-25", y: 15200 },
          { x: "2026-09-01", y: 16800 },
        ],
      },
      {
        label: "CPA",
        value: 45.75,
        format: "currency",
        change: {
          value: 6.1,
          format: "percent",
          direction: "up",
          sentiment: "negative",
          label: "vs prev 30 days",
        },
        sparkline: [],
      },
    ],
  },
  kpi_list: {
    code: "audience_overview",
    type: "kpi_list",
    kind: "manual_data",
    title: "Audience Overview",
    subtitle: null,
    as_of: "2026-09-01",
    empty: false,
    items: [
      { label: "Population", value: "1.8M", format: "text" },
      { label: "Median age", value: 34, format: "number" },
    ],
  },
  bar_chart: {
    code: "mmm_carryover",
    type: "bar_chart",
    kind: "manual_data",
    title: "Carryover",
    subtitle: null,
    as_of: null,
    empty: false,
    items: [
      { label: "Week 1", value: 100, format: "percent" },
      { label: "Week 2", value: 62, format: "percent" },
    ],
  },
  progress_list: {
    code: "language_province_mix",
    type: "progress_list",
    kind: "manual_data",
    title: "Language & Province Mix",
    subtitle: null,
    as_of: null,
    empty: false,
    groups: [
      { key: "languages", label: "Languages" },
      { key: "provinces", label: "Provinces" },
    ],
    items: [
      {
        group: "languages",
        label: "Punjabi",
        value: 6.4,
        format: "percent",
        share: 6.4,
        secondary: { label: "Reach", value: 2300000, format: "number" },
      },
      {
        group: "provinces",
        label: "Ontario",
        value: 41,
        format: "percent",
        share: 41,
        secondary: null,
      },
    ],
    footer: [
      {
        label: "Total reach",
        value: 7460000,
        format: "number",
        change: {
          value: 12.6,
          format: "percent",
          direction: "up",
          sentiment: "positive",
        },
      },
    ],
  },
  channel_list: {
    code: "channel_roas",
    type: "channel_list",
    kind: "live",
    title: "ROAS by Channel",
    subtitle: null,
    as_of: null,
    empty: false,
    items: [
      {
        channel: "meta_ads",
        label: "Meta Ads",
        spend: 127900,
        share: 100,
        roas: 2.18,
      },
      {
        channel: "google_ads",
        label: "Google Ads",
        spend: 47300,
        share: 36.98,
        roas: 3.4,
      },
    ],
  },
  metric_table: {
    code: "detailed_metrics_table",
    type: "metric_table",
    kind: "live",
    title: "Detailed Metrics",
    subtitle: null,
    as_of: null,
    empty: false,
    rows: [
      {
        metric: "roas",
        label: "Blended ROAS",
        value: 3.2,
        format: "multiplier",
        status: { code: "healthy", label: "Healthy" },
        details: null,
      },
      {
        metric: "cpa",
        label: "Blended CPA",
        value: 45.75,
        format: "currency",
        status: { code: "on_watch", label: "On watch" },
        details: "Slightly above target",
      },
      {
        metric: "ctr",
        label: "CTR",
        value: 1.44,
        format: "percent",
        status: { code: "info", label: "No target" },
        details: null,
      },
    ],
  },
  field_table: {
    code: "cultural_identity",
    type: "field_table",
    kind: "manual_data",
    title: "Cultural Identity",
    subtitle: null,
    as_of: null,
    empty: false,
    columns: ["Field", "Value", "Planning implication"],
    rows: [
      {
        field: "Strength of cultural identity",
        value: "High",
        note: "Identity remains a differentiator",
      },
      { field: "Festivals", value: "Vaisakhi, Diwali", note: null },
    ],
  },
  data_table: {
    code: "channel_table",
    type: "data_table",
    kind: "live",
    title: "Channel Performance",
    subtitle: null,
    as_of: null,
    empty: false,
    columns: [
      { key: "channel", label: "Channel", format: "text" },
      { key: "spend", label: "Spend", format: "currency" },
      { key: "roas", label: "ROAS", format: "multiplier" },
    ],
    rows: [
      { channel: "Meta Ads", spend: 127900, roas: 2.18 },
      { channel: "Google Analytics 4", spend: null, roas: null },
    ],
  },
  heatmap: {
    code: "cultural_values_index",
    type: "heatmap",
    kind: "manual_data",
    title: "Cultural Values Index",
    subtitle: null,
    as_of: null,
    empty: false,
    columns: ["Low", "Medium", "High"],
    rows: [
      { label: "Heritage", values: [1, 4, 9] },
      { label: "Family", values: [2, null, 7] },
    ],
  },
  creative_grid: {
    code: "creative_performance",
    type: "creative_grid",
    kind: "live",
    title: "Creative Performance",
    subtitle: null,
    as_of: null,
    empty: false,
    items: [
      {
        key: "cr_12",
        title: "Lunar New Year – Video 15s",
        thumbnail_url: "https://cdn.example.test/cr_12.jpg",
        format: "video",
        campaign: "Lunar New Year",
        metrics: {
          impressions: { value: 820000, format: "number" },
          ctr: { value: 2.34, format: "percent" },
          conversions: { value: 410, format: "number" },
          cpa: { value: 31.2, format: "currency" },
        },
      },
      {
        key: "cr_13",
        title: "Carousel – Family offers",
        thumbnail_url: null,
        format: "carousel",
        campaign: null,
        metrics: {
          impressions: { value: 410000, format: "number" },
          ctr: { value: 1.1, format: "percent" },
        },
      },
    ],
  },
} as const;

// Budget pacing without any budget in the range (API Step 6).
export const noBudgetWidgetFixture = {
  code: "budget_utilization",
  type: "donut",
  kind: "live",
  title: "Budget Utilization",
  subtitle: null,
  as_of: null,
  empty: true,
  reason: "no_budget",
  center: null,
  items: [],
  filterable: false,
} as const;

export type LayoutItemFixture = {
  id: number;
  parent_id: number | null;
  level: "section" | "tab" | "widget";
  code: string;
  title: string;
  default_title: string;
  type: string | null;
  kind: "live" | "text" | "manual_data" | null;
  is_enabled: boolean;
  is_available: boolean;
  position: number;
  settings: Record<string, unknown> | unknown[];
  content: unknown;
  as_of: string | null;
  updated_by: number | null;
  updated_at: string | null;
  children: LayoutItemFixture[];
};

type LayoutItemInput = Partial<LayoutItemFixture> &
  Pick<
    LayoutItemFixture,
    "id" | "parent_id" | "level" | "code" | "title" | "position"
  >;

export function layoutItem(fixture: LayoutItemInput): LayoutItemFixture {
  return {
    type: null,
    kind: null,
    is_enabled: true,
    is_available: true,
    settings: [],
    content: null,
    as_of: null,
    updated_by: null,
    updated_at: null,
    children: [],
    default_title: fixture.title,
    ...fixture,
  };
}

// Reporting → Executive Summary / Detailed Metrics, and Media Mix Model.
export function layoutFixture() {
  return {
    report_id: 7,
    layout_version: 3,
    sections: [
      layoutItem({
        id: 1,
        parent_id: null,
        level: "section",
        code: "reporting",
        title: "Reporting Dashboard",
        position: 0,
        children: [
          layoutItem({
            id: 2,
            parent_id: 1,
            level: "tab",
            code: "executive_summary",
            title: "Executive Summary",
            position: 0,
            children: [
              layoutItem({
                id: 10,
                parent_id: 2,
                level: "widget",
                code: "ai_summary",
                title: "AI Summary",
                type: "text_hero",
                kind: "text",
                position: 0,
              }),
              layoutItem({
                id: 11,
                parent_id: 2,
                level: "widget",
                code: "blended_roas",
                title: "Blended ROAS",
                type: "kpi",
                kind: "live",
                position: 1,
              }),
            ],
          }),
          layoutItem({
            id: 3,
            parent_id: 1,
            level: "tab",
            code: "detailed_metrics",
            title: "Detailed Metrics",
            position: 1,
          }),
        ],
      }),
      layoutItem({
        id: 4,
        parent_id: null,
        level: "section",
        code: "mmm",
        title: "Media Mix Model",
        is_enabled: false,
        position: 1,
        children: [
          layoutItem({
            id: 20,
            parent_id: 4,
            level: "widget",
            code: "mmm_readout",
            title: "Readout",
            type: "recommendation_list",
            kind: "text",
            position: 0,
          }),
        ],
      }),
    ],
  };
}
