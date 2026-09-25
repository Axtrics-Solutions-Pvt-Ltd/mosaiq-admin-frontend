export type CorrectionHistoryFilters = {
  workspaceId?: number;
  metricCode?: string;
  page: number;
};

// URL parameters on the client detail page, prefixed so they don't collide
// with the page's own scope parameters.
export const correctionFilterParams = {
  workspace: "correctionWorkspace",
  metric: "correctionMetric",
  page: "correctionPage",
} as const;
