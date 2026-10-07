import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  noBudgetWidgetFixture,
  widgetFixtures,
} from "@/mocks/fixtures/reports";

import { widgetEnvelopeSchema } from "./contracts";
import { WidgetRenderer } from "./WidgetRenderer";

const widget = (fixture: unknown) => widgetEnvelopeSchema.parse(fixture);

describe("WidgetRenderer", () => {
  it.each(Object.entries(widgetFixtures))(
    "renders the %s contract fixture",
    (_, fixture) => {
      const { container } = render(
        <WidgetRenderer currency="CAD" widget={widget(fixture)} />,
      );
      expect(container.firstChild).toMatchSnapshot();
    },
  );

  it("formats KPI values and describes the change for screen readers", () => {
    render(
      <WidgetRenderer currency="USD" widget={widget(widgetFixtures.kpi)} />,
    );
    expect(screen.getByText("3.2x")).toBeVisible();
    expect(screen.getByText("Up")).toBeInTheDocument();
    expect(screen.getByText("vs prev 30 days")).toBeVisible();
  });

  it("uses a filterable donut's segments as the channel filter", async () => {
    const onChannelSelect = vi.fn();
    render(
      <WidgetRenderer
        currency="USD"
        onChannelSelect={onChannelSelect}
        widget={widget(widgetFixtures.donut)}
      />,
    );
    expect(screen.getByText("$127.9K")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Filter the report by Meta Ads" }),
    );
    expect(onChannelSelect).toHaveBeenCalledWith("meta_ads");
  });

  it("places value adornments by payload path", () => {
    render(
      <WidgetRenderer
        currency="USD"
        valueAdornment={(path) => <span>adornment:{path}</span>}
        widget={widget(widgetFixtures.donut)}
      />,
    );
    expect(screen.getByText("adornment:center.value")).toBeInTheDocument();
    expect(screen.getByText("adornment:items.1.value")).toBeInTheDocument();
  });

  it("puts a chart's point adornments in its values table", () => {
    render(
      <WidgetRenderer
        currency="USD"
        valueAdornment={(path) => <span>adornment:{path}</span>}
        widget={widget(widgetFixtures.line_chart)}
      />,
    );
    expect(screen.getByText("Values and corrections")).toBeVisible();
    expect(
      screen.getByText("adornment:series.0.points.0.y"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("adornment:series.1.points.1.y"),
    ).toBeInTheDocument();
  });

  it("opens a chart's values table on request and shows one shared note", () => {
    const adornment = (path: string) => <span>adornment:{path}</span>;
    const lineChart = widget(widgetFixtures.line_chart);
    const { rerender } = render(
      <WidgetRenderer
        currency="USD"
        valueAdornment={adornment}
        valuesPanel={{ note: "Choose a channel to correct one." }}
        widget={lineChart}
      />,
    );
    const values = screen
      .getByText("Values and corrections")
      .closest("details");
    expect(values).not.toHaveAttribute("open");
    rerender(
      <WidgetRenderer
        currency="USD"
        valueAdornment={adornment}
        valuesPanel={{
          note: "Choose a channel to correct one.",
          revealRequest: 1,
        }}
        widget={lineChart}
      />,
    );
    expect(values).toHaveAttribute("open");
    expect(
      screen.getAllByText("Choose a channel to correct one."),
    ).toHaveLength(1);
  });

  it("filters a grouped progress list with its toggle and shows the footer", async () => {
    render(
      <WidgetRenderer
        currency="CAD"
        widget={widget(widgetFixtures.progress_list)}
      />,
    );
    expect(screen.getByText("Punjabi")).toBeVisible();
    expect(screen.queryByText("Ontario")).toBeNull();
    expect(screen.getByText(/Reach 2.3M/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Provinces" }));
    expect(screen.getByRole("button", { name: "Provinces" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Ontario")).toBeVisible();
    expect(screen.queryByText("Punjabi")).toBeNull();
    expect(screen.getByText("Total reach")).toBeVisible();
    expect(screen.getByText("7.5M")).toBeVisible();
  });

  it("names each metric table status in text, not colour alone", () => {
    render(
      <WidgetRenderer
        currency="USD"
        widget={widget(widgetFixtures.metric_table)}
      />,
    );
    const row = screen.getByRole("row", { name: /Blended CPA/ });
    expect(within(row).getByText("On watch")).toBeVisible();
    expect(within(row).getByText("Slightly above target")).toBeVisible();
    expect(within(row).getByText("$45.75")).toBeVisible();
  });

  it("shows a placeholder for a creative without a thumbnail", () => {
    render(
      <WidgetRenderer
        currency="USD"
        widget={widget(widgetFixtures.creative_grid)}
      />,
    );
    expect(document.querySelectorAll("img")).toHaveLength(1);
    expect(screen.getAllByText("Carousel")).not.toHaveLength(0);
    expect(screen.getByText("Video · Lunar New Year")).toBeVisible();
    expect(screen.getAllByText("CTR")).toHaveLength(2);
  });

  it("formats data table cells by column and shows missing values as a dash", () => {
    render(
      <WidgetRenderer
        currency="USD"
        widget={widget(widgetFixtures.data_table)}
      />,
    );
    const row = screen.getByRole("row", { name: /Google Analytics 4/ });
    expect(within(row).getAllByText("—")).toHaveLength(2);
    expect(screen.getByText("$127.9K")).toBeVisible();
    expect(screen.getByText("2.18x")).toBeVisible();
  });

  it("shows data table status chips and how many rows were sent", () => {
    render(
      <WidgetRenderer
        currency="USD"
        widget={widget({
          code: "mmm_channel_diagnosis",
          type: "data_table",
          kind: "manual_data",
          title: "Channel Diagnosis",
          empty: false,
          columns: [
            { key: "channel", label: "Channel", format: "text" },
            { key: "spend", label: "Spend", format: "currency" },
            { key: "status", label: "Status", format: "text" },
          ],
          rows: [
            {
              channel: "Paid social",
              spend: 182000,
              status: {
                value: "Scale",
                status: { code: "strong", label: "Strong" },
              },
            },
            {
              channel: "Search",
              spend: 146000,
              status: {
                value: "Live",
                status: { code: "live", label: "Live" },
              },
            },
          ],
          total: 6,
          truncated: true,
        })}
      />,
    );
    expect(screen.queryByText(/Unsupported widget/)).not.toBeInTheDocument();
    const paidSocial = screen.getByRole("row", { name: /Paid social/ });
    expect(within(paidSocial).getByText("Scale")).toBeVisible();
    expect(within(paidSocial).getByText("Strong")).toBeVisible();
    const search = screen.getByRole("row", { name: /Search/ });
    expect(within(search).getAllByText("Live")).toHaveLength(1);
    expect(screen.getByText("Showing 2 of 6")).toBeVisible();
  });

  it("shows a gauge's value, status in text and details", () => {
    render(
      <WidgetRenderer currency="USD" widget={widget(widgetFixtures.gauge)} />,
    );
    expect(screen.getByText("82%")).toBeVisible();
    expect(screen.getByText("Under pacing")).toBeVisible();
    expect(screen.getByText("vs prev 30 days")).toBeVisible();
    expect(screen.getByText("$350K")).toBeVisible();
    expect(screen.getByText("Remaining")).toBeVisible();
  });

  it("prints every heatmap value so shading isn't the only cue", () => {
    render(
      <WidgetRenderer currency="USD" widget={widget(widgetFixtures.heatmap)} />,
    );
    const row = screen.getByRole("row", { name: /Family/ });
    expect(within(row).getByText("7")).toBeVisible();
    expect(within(row).getByText("—")).toBeVisible();
  });

  it.each([
    ["kpi_group", ["items.0.value", "items.1.value"]],
    ["channel_list", ["items.0.spend", "items.1.roas"]],
    ["metric_table", ["rows.1.value"]],
    ["data_table", ["rows.0.spend", "rows.1.roas"]],
    ["gauge", ["value", "details.1.value"]],
  ] as const)("places %s value adornments by payload path", (type, paths) => {
    render(
      <WidgetRenderer
        currency="USD"
        valueAdornment={(path) => <span>adornment:{path}</span>}
        widget={widget(widgetFixtures[type])}
      />,
    );
    for (const path of paths)
      expect(screen.getByText(`adornment:${path}`)).toBeInTheDocument();
  });

  it("offers an empty widget's action under its message", () => {
    render(
      <WidgetRenderer
        currency="USD"
        emptyAction={<a href="#budgets">Add budgets</a>}
        widget={widget(noBudgetWidgetFixture)}
      />,
    );
    expect(screen.getByText("No data for this period.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Add budgets" })).toBeVisible();
  });

  it("explains a split that can't be shown for an audience", () => {
    render(
      <WidgetRenderer
        currency="USD"
        emptyAction={<a href="#budgets">Add budgets</a>}
        widget={widget({
          ...noBudgetWidgetFixture,
          reason: "audience_unavailable",
        })}
      />,
    );
    expect(screen.getByText(/Not available by audience/)).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Add budgets" }),
    ).not.toBeInTheDocument();
  });

  it("keeps an empty widget's card with a message", () => {
    render(
      <WidgetRenderer
        currency="USD"
        widget={widget({ ...widgetFixtures.kpi, empty: true, value: null })}
      />,
    );
    expect(screen.getByRole("heading", { name: "Blended ROAS" })).toBeVisible();
    expect(screen.getByText("No data for this period.")).toBeVisible();
  });

  it("shows an unknown type as unsupported instead of failing", () => {
    render(
      <WidgetRenderer
        currency="USD"
        widget={widget({
          code: "future_widget",
          type: "sankey",
          kind: "live",
          title: "Future",
          empty: false,
        })}
      />,
    );
    expect(screen.getByText(/Unsupported widget/)).toBeVisible();
    expect(screen.getByText(/sankey/)).toBeVisible();
  });

  it("renders written text as text, never as HTML", () => {
    render(
      <WidgetRenderer
        currency="USD"
        widget={widget({
          ...widgetFixtures.text_hero,
          body: "<img src=x onerror=alert(1)>",
        })}
      />,
    );
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeVisible();
    expect(document.querySelector("img")).toBeNull();
  });
});
