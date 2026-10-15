# Step 14 — One CSV per section, upload limits and blank templates

Status: built, 15 October 2026 (see Implementation notes at the end). Zip templates (§6, E11) built the same day. The decisions (E1–E10), the combined file format, the limits and the endpoint changes are in `mosaiq-laravel-api/docs/phase1-review/STEP-14-COMBINED-CSV-AND-UPLOAD-LIMITS.md`. This step changes the Step 13 import dialog ([STEP-13-CSV-CONTENT-IMPORT.md](STEP-13-CSV-CONTENT-IMPORT.md)), and everything there still applies unless this file changes it.

Today a Marketing Intelligence (MI) template is a zip with 6 folders of 7–11 files each. After this step:

- **One file per section.** The section template is a single CSV with a `#card` block for each card. A tab template is the same, with only that tab's cards. One upload of that file fills the section, the tab or a single card.
- **Blank templates.** Downloads hold only the header rows unless **Include example rows** is ticked.
- **4 MB in total per upload,** checked in the dialog, the proxy and the API, because Vercel rejects request bodies over 4.5 MB.

Separate card CSVs and zips still work.

## What the admin sees

```
Import CSV · Marketing Intelligence

  Download template  [ ] Include example rows
  Fill one row per item under each card. Numbers without % or $.

  As of [2026-10-15]
  ┌──────────────────────────────────────────────┐
  │  Drop the CSV here, or browse                │
  │  One file for the whole section, or separate │
  │  card files / a zip. Up to 4 MB in total.    │
  └──────────────────────────────────────────────┘

Review
  46 ready · 1 with errors · 1 skipped
  Card                Tab              Rows  Status
  Audience Overview   Audience Profile    2  Ready
  Core Values         Behaviour           5  Errors  ▸ Line 215 · value: Write numbers without %…
  Family Values       Audience Profile    0  Skipped – no rows
                                               [Apply 46 cards]
```

## API used (changes only)

| Endpoint | Change |
|---|---|
| `POST …/layout/{item}/csv-import/preview` | Each result gains `source` (the uploaded file name) and `line` (the `#card` line, null for a single-card file). `file` is now a display name, e.g. `MOSAIQ-Marketing-Intelligence.csv › core_values`. |
| `POST …/layout/{item}/csv-import` | Adds the optional `cards[]` field: the widget codes to apply. When it is sent, only those cards must be ready. A 422 on `cards` means one of them isn't. |
| `GET …/layout/{item}/csv-template` | Returns one `.csv` for every scope; there are no more zips. `?sample=1` adds example rows. |

**Result shape.** The two new fields in `csvImportFileSchema`:

```ts
{
  source: string;        // uploaded file name, e.g. "MOSAIQ-Marketing-Intelligence.csv"
  line: number | null;   // the #card line in a combined file
}
```

## 1. Contracts (`src/features/reports/contracts.ts`)

- **`csvImportFileSchema`:** add `source` and `line`. Use `.optional()` for one release so the dialog works before and after the API deploy.
- **Size limit:**
  - Replace `maxCsvImportFileBytes` (5 MB per file) with `maxCsvImportTotalBytes = 4 * 1024 * 1024`.
  - `csvImportProblem` checks the **sum** of the chosen files: "The upload can be at most 4 MB in total."
  - The per-file check goes, because the total check covers it.
- **Widget scope:** `csvImportProblem` still allows a single `.csv`, which can now be the combined file.

## 2. Proxy routes

- **`csv-import/forward.ts`:**
  - Uses the new `csvImportProblem`, so a request over 4 MB in total is a 422 on `files` before it is forwarded.
  - Also forwards `cards[]` (apply only), next to `files[]` and `as_of`. Only strings are kept, at most 60.
- **`csv-template/route.ts`:** passes the `sample` query parameter through. The response is now always CSV text, and `forwardAdminFileDownload` already reads it as `arrayBuffer`, so nothing else changes.
- `reportPaths.csvTemplate(scope, item, { sample })` adds `?sample=1` when it is true.

## 3. Import dialog (`CsvImportDialog.tsx`)

**Header**
- **Include example rows**, a checkbox next to **Download template**, unticked by default. It switches the link between `csvTemplate(…)` and `csvTemplate(…, { sample: true })`.
- The hint becomes: "Fill one row per item under each card. Don't change the # lines. Numbers without % or $."

**Choose files**
- The dropzone text becomes: "One file for the whole section, or separate card files or a zip. Up to 4 MB in total."
- `accept` doesn't change: `.csv,.zip` for a section or tab, `.csv` for a card.

**Review**
- **Rows are cards, not files.** The table already shows `widget.title`. A row from a combined file has no file name of its own.
  - When more than one file was uploaded, a small `source` caption goes under the card title.
  - The sort is unchanged (tab, then card).
- **Errors** read `Line {line} · {column}: {message}`, as now. The line numbers are lines in the uploaded file.
- **Format errors that belong to no card** ("Start each card with a #card line.") come back as a result without `widget`. Show them at the top of the table as a red row titled by `source`.

**Apply (replaces the Step 13 zip hold-back)**
- **Post with `cards[]`.** Apply posts every uploaded file again, plus `cards[]` = the widget codes of the **ready** rows, plus `as_of`.
- **Remove the zip hold-back.** In Step 13, a zip was held back on Apply when any of its files had errors, because the API rejected the whole call. With `cards[]`, the invalid cards are left alone, so:
  - remove the "zips held back" logic and message;
  - **Apply N cards** applies every ready card, whether it came from a combined file, a zip or a separate file.
- **On 422:**
  - on `cards`, which means a file changed between Check and Apply: show the message and go back to the review.
  - on `files`: as in Step 13.
- **On success:** unchanged (toast, reload, close).

## 4. Widget inspector (`WidgetInspector.tsx`)

- The **Download template** link gets the same **Include example rows** checkbox.
- **Import CSV** opens the dialog with the card as the scope.
  - The admin can drop either that card's CSV or the full section file. Only the card's block applies, and the other blocks show as "Not in this section".
  - If the file has no block for this card, the API's 422 message is shown in the dialog.

## 5. Mocks

**`src/mocks/fixtures/csv-import.ts`**
- Add `source` and `line` to every fixture.
- Add a combined-file fixture: two ready cards, one invalid card and one `out_of_scope` card, all from `MOSAIQ-Marketing-Intelligence.csv`.

**`src/mocks/handlers/csv-import.ts`**
- The template handler returns `text/csv` with `filename="MOSAIQ-Marketing-Intelligence.csv"`.
- It echoes whether `sample=1` was asked for, in a header the test can read.

## Tests

**`CsvImportDialog.test.tsx`**
- **Total size:** two files of 2.5 MB each show "The upload can be at most 4 MB in total" and keep **Check files** disabled.
- **Combined file:** dropping one combined file and checking it lists its cards as separate rows, with line-numbered errors under the invalid card.
- **Apply:** posts the file once, with `cards[]` holding only the ready codes. The old zip hold-back message is gone.
- **422 on `cards`:** returns to the review with the message.
- **Example rows checkbox:** toggling it changes the template link to and from `?sample=1`.
- **Card scope:** dropping the combined file is allowed.

**Other tests**
- **`WidgetInspector.test.tsx`:** the inspector checkbox changes its template link the same way.
- **`contracts` tests:** `csvImportProblem` checks the total size, and the schema accepts results with and without `source` and `line`.
- **Proxy route tests:**
  - an upload over 4 MB in total → 422 and no upstream call;
  - `cards[]` is forwarded on apply and dropped on preview;
  - `sample` is passed through to the template endpoint.
- **Playwright (`e2e/mock-auth-api.mjs`):** the mock API returns the combined-file fixture. The flow is: download link → drop one file → review → Apply.

## 6. Zip templates (E11, 15 Oct 2026)

Clients found the combined file hard to read, so section and tab templates can also be downloaded as a zip of card CSVs, as in Step 13. Both stay for a demo; one can be hidden later in the frontend only. Uploading needs no change, since zips are already accepted.

**API:** `GET …/csv-template?format=zip` on a section or tab returns `application/zip` (`MOSAIQ-Marketing-Intelligence-Templates.zip`, `MOSAIQ-MI-Behaviour-Templates.zip`, `MOSAIQ-Media-Mix-Model-Templates.zip`). `sample=1` works the same. A widget always gets its `.csv`.

**Changes**
- **`reportPaths.csvTemplate(…, { sample, format })`:** adds `format=zip` when asked; `csv` is the default and isn't sent.
- **`csv-template/route.ts`:** passes `format` through when it is `csv` or `zip`, and drops anything else. `forwardAdminFileDownload` already passes a binary body with its `Content-Type` and `Content-Disposition`; check that this holds for `application/zip`.
- **`csvTemplateFormats`** in `csv-import.ts`: `["csv", "zip"]`. Removing a value hides its button, so after the demo only this constant changes.
- **`CsvTemplateDownload.tsx`:** a `formats` prop. For a section or tab, two buttons share the **Include example rows** checkbox:
  - **Download as one file** (`.csv`, every card stacked)
  - **Download as zip** (one file per card)
  
  With one format left, a single **Download template** button. The widget inspector always shows the single button.
- **Dialog hint:** "Fill one row per item under each card's header. Numbers without % or $." The `#` line rule only applies to the combined file, so it moves to the button's title.

**Tests**
- `CsvTemplateDownload`: two buttons for a section or tab and one for a widget; the links carry `format=zip` and `sample=1` correctly; one button when `formats` has one value.
- Proxy route: `format=zip` is forwarded, an unknown `format` is dropped.
- Mock handler: `format=zip` returns `application/zip` with the zip file name.

## Order

1. Ship the API first, because Apply with `cards[]` needs it. The new response fields are optional in the schema (§1), so a frontend still on Step 13 keeps working against the new API.
2. Then ship this frontend.
3. Remove `.optional()` from `source` and `line` in a follow-up.

## Implementation notes

Where the build differs from the plan above:

- **`cards[]` over 60.** The proxy refuses it with a 422 on `cards` and doesn't call the API, rather than cutting the list to 60. A shortened list would apply fewer cards than the admin chose. The dialog never sends more than 60, because a section has fewer cards.
- **Source caption before the API deploy.** If a result has no `source` (an API still on Step 13), the caption under the card shows `file` instead.
- **Review names.** The table and the mobile list are now called "Cards checked", not "Files checked", because each row is a card.
- **File-level errors.** Their line errors are always shown, with no Show/Hide button, because the row has nothing else in it.
- **Shared control.** **Download template** and **Include example rows** are one component, `CsvTemplateDownload.tsx`, used by the dialog and the inspector. `InspectorCsvImport.templateHref` is now `(isSample) => string`.
- **Zip templates (§6).**
  - `CsvTemplateDownload.templateHref` is now `(isSample, format) => string`, so the inspector's one-argument callback still fits, and its default `formats` is `["csv"]`.
  - The dialog passes `csvTemplateFormats` for a section or tab and `["csv"]` for a card.
  - The link is `?sample=1&format=zip` when both apply.
  - Each button's explanation is its `title`.
  - The MSW handler and `e2e/mock-auth-api.mjs` answer `format=zip` with an empty zip and the zip file name; the Playwright flow checks both links and the zip download's headers.
- **E2E mock.** `e2e/mock-auth-api.mjs` reads a combined file block by block. A data row with `%` is an error on its line, and a block with no data rows is skipped. An unknown code is `unrecognised`, and a card outside the scope is `out_of_scope`. Apply with `cards[]` writes only those cards, and returns a 422 on `cards` if one of them isn't ready.
