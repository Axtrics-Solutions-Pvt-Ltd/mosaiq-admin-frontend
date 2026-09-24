# Step 6 — Remaining widgets and budgets

API dependency: API Step 6.

## 6.1 Renderers

Add renderers for:
- `kpi_group` (with sparklines)
- `kpi_list`
- `bar_chart`
- `progress_list` (with a group toggle and footer)
- `channel_list`
- `metric_table` (status badges)
- `field_table`
- `data_table`
- `heatmap`
- `creative_grid` (thumbnail with a placeholder by format)

Build them in this order: Detailed Metrics → Channels → Audience → Creative → Marketing Intelligence → MMM.

## 6.2 Manual content editors (inspector)

One generic editor per render type, reused by every widget of that type:

| Type | Editor |
|---|---|
| `kpi_list` | rows: label, value (text) |
| `field_table` | 3 column headers + rows: field, value, note |
| `progress_list` | optional groups; rows: group, label, value, format, share, optional secondary (label, value) |
| `donut` | center (label, value, format) + items: label, value |
| `bar_chart` | items: label, value, format |
| `data_table` | columns (key, label, format) + a row grid |
| `heatmap` | column labels + rows: label + one value per column |

Every editor has add, remove and ↑/↓ for rows, validation messages from the API, and an `as_of` date field.

## 6.3 Live widget settings

- `kpi_cards`: pick up to 5 metrics.
- `detailed_metrics_table`: pick rows. Per row: a target value, and an optional status and details override.
- `performance_trend`: enabled variants.
- `creative_performance`: sort metric and limit.

## 6.4 Budgets

A **"Budgets"** card on the client detail page shows a month × channel-workspace grid of amounts.

- Save calls `PUT budgets` with the changed cells.
- The `budget_utilization` widget, when `empty` with reason `no_budget`, shows "Add budgets" (a link to this card) in the admin only.

## 6.5 Tests

- Renderer fixtures per type.
- Editors: add/remove/reorder rows and validation mapping.
- Budget grid save sends only the changed cells.
