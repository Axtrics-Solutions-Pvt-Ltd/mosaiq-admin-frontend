# Step 3 — Data corrections

API dependency: API Step 3 (`metric-corrections` endpoints).

Corrections are **per client**. They change the numbers in every report of that client. The main way in is the pencil icon on report values (Step 4). This step builds the reusable dialog and the history screen.

## 3.1 `CorrectionDialog` (`src/features/corrections/`)

It opens with a context: `{clientId, workspaceId, workspaceName, channelName, metricCode, metricLabel, campaignKey?, campaignName?, from, to, currentTotal, format}`.

Layout:
- **Header:** "Correct {Metric} — {Channel} ({Workspace})", plus the campaign if set.
- **Read-only fields:** the date range and the current total, formatted.
- **Input:** the new total. The currency or number input matches `format`; integer metrics only accept whole numbers.
- **Note:** optional textarea.
- **Impact line:** "This changes {Metric} for {Channel} in every {Client} report for these dates. Totals, ROAS, CPA and charts will recalculate."

Submit → `POST metric-corrections`. On success, invalidate the report preview queries for that client and the corrections list, and show a toast: "Correction saved".

- Validation errors from the API map to the fields.
- **Calculated metrics never open this dialog.** If a user tries, the pencil tooltip says: "Calculated from {inputs}. Edit those instead."

## 3.2 Corrections history

A **"Data corrections"** card on the client detail page lists the corrections (API list), filterable by workspace and metric.

- Columns: date created, channel/workspace, metric, campaign, range, original → corrected, by, note, status (Active / Partly replaced / Reset).
- "Partly replaced" means `rows_owned` is less than the original row count.
- The **Reset** action uses a `ConfirmationDialog` and calls `DELETE`. It is visible to users with access to that workspace.

## 3.3 Tests

- Integer metrics reject decimals.
- The dialog sends the right payload.
- Reset invalidates the relevant queries.
