# Step 12 — Audience filter for the Reporting Dashboard

Status: built, 7 October 2026. The API side, with the decisions and the full filtering rules, is `mosaiq-laravel-api/docs/phase1-review/STEP-12-REPORTING-AUDIENCE-FILTER.md`.

The Step 11 audience dropdown now also filters the Reporting Dashboard. Live data is linked to an audience through its campaign: each source channel gets a default audience, and a campaign can override it. The admin needs four things:
- tagging channels and campaigns;
- previewing Reporting with the filter;
- seeing which widgets can't be filtered;
- tagging rows of the two manual Reporting widgets.

## Decisions that shape the UI

- A campaign's audience is its own tag, else its channel's default, else none. A campaign can be set to **General** to opt out of the channel default.
- The dropdown has an **"Untagged / General"** option last, for campaigns with no audience or General.
- Data with no campaign (e.g. GA4 sessions) is left out under a filter, even with a channel default. It shows "—".
- Age, Gender, Region, Device and Budget Utilization show "Not available by audience" under a filter.
- 2+ audiences selected = one combined total on Reporting. Marketing Intelligence keeps its per-audience rows.
- The dropdown is hidden on Media Mix Model and on the Reports (PDF) tab.
- Values can't be corrected while a Reporting filter is on.

## API used

| Endpoint | Change |
|---|---|
| `GET …/reports/{report}/campaign-audiences` | New. Source channels with `default_audience` and their campaigns: `audience`, `effective_audience`, `source` (`campaign`, `channel`, `none`); `untagged_campaigns` |
| `PUT …/reports/{report}/campaign-audiences` | New. Replaces the mapping: `channels: [{workspace_id, default_audience}]`, `campaigns: [{workspace_id, campaign_key, audience}]`; same response as `GET` |
| `PATCH …/reports/{report}` | 422 on `audiences` when a removed audience is still used by a channel or campaign; `untagged` can't be a code |
| `GET …/preview/meta` | Each tab has `audience_filter`; new `untagged_audience: {code, label}` (null without audiences) |
| `GET …/preview/tabs/{tab}` | `audiences` now filters Reporting tabs too and accepts `untagged`; the echo is the selection the tab applied |
| `POST …/layout/{item}/preview` | Takes `audiences` too (the builder doesn't call it yet) |
| Widget payloads | `reason: "audience_unavailable"` on empty widgets; `editing.locked_reason: "audience_filter"` (else null) with `editing.values: []` |
| `PATCH …/layout/{item}` | `audience` tags also accepted on the manual Reporting widgets |

## 1. Campaign audiences (report settings)

A new **Campaign audiences** card in `ReportSettingsScreen`, after Audience segments. It is shown only when the report has audiences. Otherwise it shows a hint: "Add audience segments first."

- One block per source channel, in source order: the channel name and platform, and a **Default audience** select ("No default" or one of the report's audiences).
- Under it, the channel's campaigns: name, status, and an **Audience** select with these options:
  - "Channel default (…)", showing the default's label, or "Channel default (none)";
  - each of the report's audiences;
  - "General".
- A campaign with no effective audience shows an "Untagged" badge. The card header shows "N campaigns are not tagged", using `untagged_campaigns` from the saved state and recounted live from the draft.
- **Bulk:** tick campaigns, pick an audience (or "Channel default") under "Selected campaigns", then **Apply**.
- A search box filters campaigns by name.
- **Save** sends the whole draft with `PUT campaign-audiences`. Discard resets it. Errors are shown on the card.
- Help text: "Reporting filters by campaign. A campaign uses its own audience, else its channel's default. Data without a campaign (e.g. website analytics) isn't included when an audience is selected."
- Audience segments card: the API's new 422 ("still used by 1 channel and 3 campaigns…") is shown like the existing one.
- The audience code generator never produces `untagged`. That label gets `untagged_2`.

## 2. Preview filter (report builder)

- `PreviewRangeControls`: the audience select is shown when the current tab's `audience_filter` is true. It no longer checks for MI tabs. The tab flag already requires the report to have audiences.
- The options are the report's audiences, then a divider, then `untagged_audience.label` ("Untagged / General").
- The selection stays in the URL (`audiences`) across every tab and section. It is still sent only for tabs with `audience_filter`. On MMM the control is hidden and the selection is kept for when the user returns.
- The applied selection is part of the `previewTab` query key.
- **All selected:** on Reporting, every audience *plus* Untagged = no filter. Every audience without Untagged still filters. On MI the Step 11 rule is kept, and Untagged is ignored. `appliedSelection(options, selected)` in `audience-filter.ts` does both: the options are the audiences plus Untagged for Reporting data, and the audiences only for MI tabs and entered content.
- Without the `audience_filter` flag (older API), the dropdown shows on MI tabs only.

## 3. Rendering in the preview

- **Not available:** a widget with `empty: true` and `reason: "audience_unavailable"` shows "Not available by audience" plus the hint "Age, gender, region, device and budget can't be split by campaign."
- **Editing locked:** when a widget has `editing.locked_reason === "audience_filter"`, its value pencils are gone (there are no `values`). Under the preview controls, a note says values show the selected campaigns only and can't be corrected, with a **Clear audience filter** button. The inspector's live-numbers note says the same, with the same button, and hides the channel picker.
- A value that comes back `null` under a filter (no campaign data) shows "—", as today.

## 4. Manual Reporting widgets

- `cultural_segments` and `audience_language_province_mix` can be tagged. The builder passes the report's audiences to widgets of `audienceSectionCodes` (Marketing Intelligence and Reporting, in `layout.ts`). The manual forms offer the Audience select on taggable types only, so Reporting's text and live widgets are unchanged.
- `ManualDataForms`: the Audience select and hints from Step 11 now appear on these two widgets.
- The draft preview (`draft-preview.ts`) and the inspector filter (Step 11, 3a) use the content selection, which drops Untagged and treats every audience as no filter.

## 5. Contracts

`contracts.ts` gets:
- the campaign audiences schemas;
- `audience_filter` on meta tabs, and `untagged_audience`;
- `locked_reason` on `editing` (default null). `reason` on widgets was already there; `audienceUnavailableReason` is in `report-widgets/contracts.ts`.
- `audienceCode()` never makes `untagged`.

## Tests

- **Campaign audiences card** (`CampaignAudiencesCard.test.tsx`):
  - defaults and campaign tags are saved in one `PUT`;
  - the untagged count and the Untagged badge update live;
  - bulk set;
  - search;
  - the API error is shown;
  - a hint when the report has no audiences.
- **Rendering** (`WidgetRenderer.test.tsx`): the `audience_unavailable` state.
- **`audience-filter.ts`:** `appliedSelection()`; `audienceCode()` skips `untagged`.
- **Not covered yet:** builder-level tests for the dropdown per tab (Reporting and MI shown, MMM and Reports hidden), Untagged in the dropdown, the selection surviving tab switches, and the locked-editing note.
