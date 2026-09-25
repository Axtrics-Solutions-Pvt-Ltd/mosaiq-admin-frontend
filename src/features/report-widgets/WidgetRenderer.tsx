"use client";

import type { ReactNode } from "react";

import { BarChartWidget } from "./BarChartWidget";
import {
  parseWidget,
  type ValueAdornment,
  type WidgetEnvelope,
} from "./contracts";
import { CreativeGridWidget } from "./CreativeGridWidget";
import { DonutWidget } from "./DonutWidget";
import { KpiGroupWidget, KpiWidget } from "./KpiWidget";
import { LineChartWidget } from "./LineChartWidget";
import {
  ChannelListWidget,
  KpiListWidget,
  ProgressListWidget,
} from "./ListWidgets";
import {
  DataTableWidget,
  FieldTableWidget,
  HeatmapWidget,
  MetricTableWidget,
} from "./TableWidgets";
import {
  BulletListWidget,
  RecommendationListWidget,
  TextHeroWidget,
} from "./TextWidgets";
import { WidgetCard, WidgetMessage } from "./WidgetCard";

const fullWidthTypes: ReadonlySet<string> = new Set([
  "text_hero",
  "line_chart",
  "recommendation_list",
  "kpi_group",
  "metric_table",
  "data_table",
  "heatmap",
  "creative_grid",
]);

// How many canvas columns a widget spans on wide screens.
export function isFullWidthWidget(type: string | null) {
  return type === null || fullWidthTypes.has(type);
}

function WidgetBody({
  currency,
  emptyAction,
  onChannelSelect,
  valueAdornment,
  widget,
}: {
  currency: string;
  emptyAction?: ReactNode;
  onChannelSelect?: (channelCode: string) => void;
  valueAdornment?: ValueAdornment;
  widget: WidgetEnvelope;
}): ReactNode {
  const parsed = parseWidget(widget);
  const title = widget.title ?? widget.code;
  switch (parsed.type) {
    case "empty":
      return (
        <div className="space-y-3">
          <WidgetMessage>
            {widget.kind === "live"
              ? "No data for this period."
              : "No content yet."}
          </WidgetMessage>
          {emptyAction}
        </div>
      );
    case "unsupported":
      // Only the admin sees this; the portal skips unknown types silently.
      return (
        <WidgetMessage>
          <span className="text-strong font-medium">Unsupported widget. </span>
          {parsed.reason}
        </WidgetMessage>
      );
    case "text_hero":
      return <TextHeroWidget payload={parsed.payload} />;
    case "kpi":
      return (
        <KpiWidget
          currency={currency}
          payload={parsed.payload}
          valueAdornment={valueAdornment}
        />
      );
    case "kpi_group":
      return (
        <KpiGroupWidget
          currency={currency}
          payload={parsed.payload}
          valueAdornment={valueAdornment}
        />
      );
    case "kpi_list":
      return <KpiListWidget currency={currency} payload={parsed.payload} />;
    case "line_chart":
      return (
        <LineChartWidget
          currency={currency}
          payload={parsed.payload}
          title={title}
          valueAdornment={valueAdornment}
        />
      );
    case "bar_chart":
      return (
        <BarChartWidget
          currency={currency}
          payload={parsed.payload}
          title={title}
        />
      );
    case "donut":
      return (
        <DonutWidget
          currency={currency}
          onChannelSelect={onChannelSelect}
          payload={parsed.payload}
          valueAdornment={valueAdornment}
        />
      );
    case "progress_list":
      return (
        <ProgressListWidget
          currency={currency}
          payload={parsed.payload}
          title={title}
        />
      );
    case "channel_list":
      return (
        <ChannelListWidget
          currency={currency}
          payload={parsed.payload}
          valueAdornment={valueAdornment}
        />
      );
    case "metric_table":
      return (
        <MetricTableWidget
          currency={currency}
          payload={parsed.payload}
          title={title}
          valueAdornment={valueAdornment}
        />
      );
    case "field_table":
      return <FieldTableWidget payload={parsed.payload} title={title} />;
    case "data_table":
      return (
        <DataTableWidget
          currency={currency}
          payload={parsed.payload}
          title={title}
          valueAdornment={valueAdornment}
        />
      );
    case "heatmap":
      return <HeatmapWidget payload={parsed.payload} title={title} />;
    case "creative_grid":
      return (
        <CreativeGridWidget currency={currency} payload={parsed.payload} />
      );
    case "bullet_list":
      return <BulletListWidget payload={parsed.payload} />;
    case "recommendation_list":
      return <RecommendationListWidget payload={parsed.payload} />;
  }
}

export function WidgetRenderer({
  actions,
  className,
  currency,
  emptyAction,
  notice,
  onChannelSelect,
  valueAdornment,
  widget,
}: {
  actions?: ReactNode;
  className?: string;
  currency: string;
  // Shown under an empty widget's message, e.g. the builder's "Add budgets".
  emptyAction?: ReactNode;
  notice?: ReactNode;
  onChannelSelect?: (channelCode: string) => void;
  valueAdornment?: ValueAdornment;
  widget: WidgetEnvelope;
}) {
  return (
    <WidgetCard
      actions={actions}
      className={className}
      envelope={widget}
      notice={notice}
    >
      <WidgetBody
        currency={currency}
        emptyAction={emptyAction}
        onChannelSelect={onChannelSelect}
        valueAdornment={valueAdornment}
        widget={widget}
      />
    </WidgetCard>
  );
}
