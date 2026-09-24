# Step 4 — Reports and report builder

API dependency: API Step 4 (reports, layout, preview). The widget types and codes follow `mosaiq-laravel-api/docs/phase1-review/WIDGET-CATALOGUE.md`. The payload shapes follow `mosaiq-laravel-api/docs/client-portal/PUBLIC-REPORT-API-CONTRACT.md` §5.

## 4.1 Routes and navigation

| Route | Screen |
|---|---|
| `/reports` | list, filter by client, search, status |
| `/reports/new` | create |
| `/reports/[reportId]` | builder (default tab "Design") |
| `/reports/[reportId]/settings` | report settings |
| `/reports/[reportId]/links` | share links (Step 5) |

- The routes carry `?agency=&client=` like the workspace routes. Add `reportScope()`, `reportUrl()` and similar helpers in `routes.ts`.
- Nav: a new group "Reporting" with a "Reports" item (`reports.manage`).
- Client detail: a "Reports" card with a "+ New report" action.

## 4.2 Reports list and create

- **List columns:** name, client, channels (badges), active links, updated at/by, status.
- **Row actions:** Open, Duplicate, Archive, and Delete (`reports.delete`, with `ConfirmationDialog`).
- **Create form:**
  - client, name
  - **source workspaces**: checkboxes of the client's workspaces with channel badges; a Manager only sees accessible ones
  - default date range
  - currency and timezone prefilled from the agency
  - on submit, go to the builder
- **Settings page:** name, status, default range, currency, timezone, and source workspaces (reorder, add, remove). A currency mismatch error from the API is shown inline.

## 4.3 Builder layout

```
┌ Header: report name · client · [Date range ▾] [Channel ▾] [Preview as portal] ┐
├──────────────┬─────────────────────────────────────────────┬──────────────────┤
│ Structure    │ Canvas (portal look)                        │ Inspector        │
│              │                                             │ (drawer on       │
│ ▣ Reporting  │  [Reporting] [Marketing Int.] [MMM]         │  tablet/mobile)  │
│   ☑ Exec Sum │  Exec Summary | Detailed | Channels …       │                  │
│   ☑ Detailed │                                             │ Widget: Blended  │
│   ☐ Creative │  ┌ AI Summary ────────── 👁 ✎ ↑ ↓ ┐         │ ROAS             │
│ ▣ Market Int │  │ …                            │         │ Title  [____]    │
│ ☐ MMM        │  └──────────────────────────────┘         │ Subtitle [____]  │
│              │  ┌ Blended ROAS 3.2x ✎(spend,revenue) ┐   │ Settings …       │
│ ↑ ↓ per row  │  └──────────────────────────────┘         │ [Reset widget]   │
└──────────────┴─────────────────────────────────────────────┴──────────────────┘
```

**Structure panel (left)** shows the tree from `GET layout`.
- Each section and tab row has an enable checkbox and ↑/↓ buttons.
- Changes call `PUT layout/order` for that parent, with optimistic updates and rollback on error.
- Disabled items stay listed, greyed out.

**Canvas (centre)** renders `GET preview/tabs/{tab}` with the shared widget renderer (4.4).
- Each widget has a toolbar:
  - 👁 show/hide: `PATCH is_enabled`
  - ↑/↓: order
  - ✎: opens the inspector
- Disabled widgets render at reduced opacity with a "Hidden from portal" label.
- The date range and channel controls re-fetch the preview, exactly as the portal does.

**Inspector (right)** edits by widget kind:

| Kind | Inspector |
|---|---|
| `live` | Title, subtitle, and widget-specific settings (e.g. `kpi_cards` metrics, `detailed_metrics_table` rows, targets, row status/details overrides, `creative_performance` sort/limit). **No numeric inputs.** |
| `text` | Title plus a content editor per type: `text_hero` (headline, body), `bullet_list` (list editor), `recommendation_list` (title/body/owner rows), plus the `as_of` date |
| `manual_data` | Step 6 editors |

Every edit calls `PATCH layout/{item}`. Use an explicit Save per inspector, not autosave. A "Reset widget" button calls `POST reset` after confirmation.

**"Preview as portal"** hides the toolbars and disabled items, so the admin sees exactly what viewers will see.

## 4.4 Shared widget renderer (`src/features/report-widgets/`)

- A `WidgetRenderer` switches on `type` and renders one component per render type, matching the portal look from the design screenshots (cards, KPI tiles, donut, line chart with dual axis, lists, tables).
- It uses `recharts` plus the existing `Card`, `Badge` and `Tooltip` components.
- `formatValue(value, format, currency)` handles currency, number, percent, multiplier and text, with compact notation (`$127.9K`, `4.8M`). Add it to `src/lib/formatters.ts`.
- An unknown type renders an "Unsupported widget" placeholder in the admin only.
- Step 4 ships these types: `text_hero`, `kpi`, `line_chart`, `donut`, `bullet_list`, `recommendation_list` (the Executive Summary).

## 4.5 Editing numbers (pencil on values)

Live widgets in the preview include `editing.values[]` references.

- A value backed by a **base metric** shows a ✎ on hover. Clicking it opens the Step 3 `CorrectionDialog`, prefilled with the reference and the current preview range.
- A value that has `edited: true` shows an "Edited" dot, with a tooltip listing the corrections and a link to the client's corrections history.
- A **calculated** value (ROAS, CPA, CTR, share) shows a lock icon with the tooltip "Calculated from Spend ÷ Conversions. Edit those." Where possible, it offers shortcuts that open the dialog for each input metric.

## 4.6 Tests

- Structure: toggle and reorder send the right payloads, and roll back on error.
- The inspector for each kind renders the right fields. Live widgets never show numeric inputs.
- The renderer has a snapshot per type from contract fixtures, and `formatValue` has unit tests.
- e2e: create a report, hide Detailed Metrics, write the AI summary, correct Meta spend, and see Blended ROAS change in the preview.
