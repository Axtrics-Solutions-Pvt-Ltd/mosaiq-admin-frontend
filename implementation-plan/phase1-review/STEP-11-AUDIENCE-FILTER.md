# Step 11 — Audience filter for Marketing Intelligence

Status: built, 6 October 2026. The API side, with the decisions and the full filtering rules, is `mosaiq-laravel-api/docs/phase1-review/STEP-11-AUDIENCE-FILTER.md`.

Each report gets its own list of audience segments (e.g. South Asian, Chinese). Rows of Marketing Intelligence content can be tagged with an audience, and the portal filters that section by the audiences the viewer picks. The admin needs three things: managing the list, tagging rows, and previewing with the filter.

## API used

| Endpoint | Change |
|---|---|
| `GET/PATCH …/reports/{report}` | `audiences: [{code, label}]` on the resource and in the update body |
| `GET …/preview/meta` | `audiences: [{code, label}]` |
| `GET …/preview/tabs/{tab}` | optional `audiences=code1,code2`; the response echoes `audiences` |
| `PATCH …/layout/{item}` | content entries take an optional `audience` code (Marketing Intelligence widgets only) |

## 1. Audience list (report settings)

In `ReportProfileFields` / `ReportSettingsScreen`, a new **Audience segments** card:
- A row per audience with its label, up and down buttons, and remove.
- "Add audience" adds a row. Its `code` is created from the label (lowercase, `_` for spaces and symbols, made unique) and never changes afterwards, so renaming keeps the tags.
- Max 20. Labels must be unique.
- Saved with the rest of the report profile (`PATCH …/reports/{report}`).
- If a removed audience is still used, the API returns 422 on `audiences`. Show that message on the card.
- Help text: "Viewers can filter Marketing Intelligence by these audiences. Tag rows with an audience in each widget."

## 2. Tagging rows (manual content forms)

In `ManualDataForms` / `manual-forms.ts`, for Marketing Intelligence widgets only, and only when the report has audiences:
- An **Audience** select on each entry: "All audiences" (no tag) or one of the report's audiences.
  - `kpi_list` items, `field_table` rows, `progress_list` items and footer, `bar_chart` items, `donut` items, `heatmap` rows, `data_table` rows and columns.
- Under the form, a hint for summary widgets (`kpi_list`, `field_table`): "Rows tagged with an audience are shown when that audience is selected. Untagged rows are the totals, shown when no audience is selected."
- The column key `audience` is reserved in the `data_table` column editor.
- Tags of an audience that no longer exists can't happen (the API blocks removal), but the select shows an unknown code as "Unknown audience" rather than dropping it.

## 3. Preview filter (report builder)

- `PreviewRangeControls`: an **Audience** multi-select next to the range and channel controls. It is shown only on Marketing Intelligence tabs and only when `meta.audiences` isn't empty. Placeholder "All audiences". It shows "N selected" and has "Clear selection", like the portal.
- The selection is part of the builder view state (URL query `audiences`, comma-separated) and is sent with `previewTab`. It is part of the `previewTab` query key.
- The Next proxy route for `preview/tabs/[tab]` already forwards the query string. Check that `audiences` passes through.
- **Draft preview:** manual widgets preview from the draft without the API (`draft-preview.ts`). The same filtering rules are ported to TypeScript (`audience-filter.ts`) and applied to the draft content, so the preview matches the API.

## 4. Contracts

- `contracts.ts`: `audiences` on the report and on `previewMetaSchema`, `audiences` on the preview tab response, and an optional `audience` on content entries in the manual-form schemas.

## Tests

- **Contracts:** parsing `audiences` in the report, meta and preview payloads.
- **Audience settings:** add, rename, reorder, remove; code generation and uniqueness; API 422 shown.
- **Manual forms:** the Audience select appears only for MI widgets of reports with audiences, and saves `audience`.
- **`audience-filter.ts`:** the same cases as the API filter tests.
- **Builder:** the filter appears on MI tabs only, and changing it refetches with `audiences`.
