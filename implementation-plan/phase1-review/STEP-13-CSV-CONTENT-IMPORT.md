# Step 13 — CSV import for Marketing Intelligence and Media Mix Model

Status: built, 15 October 2026 (see Implementation notes at the end). The API side, with the decisions, the file → widget mapping and the CSV → content rules, is `mosaiq-laravel-api/docs/phase1-review/STEP-13-CSV-CONTENT-IMPORT.md`.

Clients send Marketing Intelligence (MI) and Media Mix Model (MMM) data as CSV files that follow our templates. One file fills one card. Today the admin types this data into the manual forms (Step 6). This step adds an **Import CSV** dialog to the report builder: the admin drops the files, sees what each one will fill and any errors, then applies.

This is not the data import screen removed in Step 1. That one imported metrics per workspace. This one fills widget content inside a report, and lives in the builder. No new pages and no new nav entries.

## Decisions that shape the UI

- **Where:**
  - On the MI section, each MI tab and the MMM section (bulk).
  - On a single MI or MMM card in the inspector (one file).
  - Never on Reporting.
- **What can be dropped:** several `.csv` files and/or a `.zip`. The template zips work as sent. A single card takes one `.csv`.
- **File name = card**, e.g. `03_audience_by_segment.csv`. Folders inside the zip are optional.
- **Preview, then apply.** Nothing is saved until **Apply**. The API keeps nothing between the two calls, so the dialog keeps the `File` objects and posts them again on Apply.
- **Apply sends only the ready files.** The API rejects the whole call if any posted file is invalid.
- **Header-only file:** "Skipped – no rows", and the card stays as it is.
- **Full replace:** a file replaces the card's whole content.
- **Audience codes** must already be report audiences. If not, the file shows an error that links to report settings.
- **"As of" date:** one per upload, defaulting to today.
- **Visibility:** an imported card is switched on. Its tab or section is not, and the preview row warns when they are hidden.

## API used

| Endpoint | Use |
|---|---|
| `POST …/reports/{report}/layout/{item}/csv-import/preview` | Multipart `files[]`, `as_of`. Returns `data: {as_of, summary, files[]}` (see below). Writes nothing. |
| `POST …/reports/{report}/layout/{item}/csv-import` | Same body. Applies. Returns the same shape plus `applied[]` and `layout_version`. 422 `errors.files` if any file is invalid. |
| `GET …/reports/{report}/layout/{item}/csv-template` | Download: a zip for a section or tab, a `.csv` for a widget. |
| `GET …/layout` | Already used. Reloaded after apply. |
| `GET …/preview/tabs/{tab}` | Already used. Reloaded after apply. |

Each entry in `files[]`:

```ts
{
  file: string;                                  // name inside the upload, e.g. "04-behaviour/02_core_values.csv"
  status: "ready" | "invalid" | "skipped" | "unrecognised" | "out_of_scope" | "duplicate" | "ignored";
  widget?: { id: number; code: string; title: string; type: string };
  tab?: { code: string; title: string; is_enabled: boolean } | null;  // null for MMM
  section_enabled?: boolean;
  rows?: number;
  errors?: { line: number; column: string | null; message: string }[];
  content?: Record<string, unknown> | null;     // only when ready
}
```

## 1. Proxy routes

Under `src/app/api/v1/agencies/[agency]/clients/[client]/reports/[report]/layout/[item]/`:

| Route | Method | Helper |
|---|---|---|
| `csv-import/preview/route.ts` | POST | `forwardAdminUpload` |
| `csv-import/route.ts` | POST | `forwardAdminUpload` |
| `csv-template/route.ts` | GET | file download (see below) |

- **Upload routes** follow `layout/[item]/creatives/[creative]/thumbnail/route.ts`:
  1. Check the ids with `positiveRouteIds`.
  2. Re-read the `FormData` and keep only `files[]` and `as_of`.
  3. Check the files before forwarding:
     - 1–60 files, each `.csv` or `.zip`;
     - at most 5 MB each.
  4. On failure, return a 422 with `{errors: {files: [...]}}`.
  5. Otherwise forward as multipart.
- **Template route:** `forwardAdminFileDownload` in `src/lib/api/admin-server.ts` already passes through `Content-Type` and `Content-Disposition`. It reads the body with `upstream.text()`, though, which corrupts a zip.
  - Change it to `upstream.arrayBuffer()`. That is binary-safe and still fine for the current text downloads.
  - Check the agency-scoped Origin and XSRF handling matches `forwardAgencyRequest`.
- `reportPaths` in `src/lib/api/paths.ts` gets `csvImportPreview(scope, item)`, `csvImport(scope, item)` and `csvTemplate(scope, item)`.

## 2. Contracts and queries

**`src/features/reports/contracts.ts`**
- `csvImportStatusSchema`, `csvImportFileSchema`, `csvImportResponseSchema` and `csvImportApplyResponseSchema`, matching the shape above.
- `csvImportProblem(files)` does the same client-side checks as the proxy (type, size, count; a single `.csv` for a widget scope). It follows the pattern of `creativeThumbnailProblem`.

**`api.ts` / `queries.ts`**
- `previewCsvImport(scope, item, files, asOf)` and `applyCsvImport(...)`, which build the `FormData`.
- `useCsvImportPreview()` mutation.
- `useCsvImportApply()` mutation. On success it invalidates the layout query, the `previewTab` queries of the report and the preview meta query.
- `csvImportable(item, sectionCode)` in `layout.ts` is true for:
  - the `marketing_intelligence` section and its tabs;
  - the `mmm` section;
  - `manual_data` and `text` widgets under those sections.

## 3. Import dialog: `CsvImportDialog.tsx`

It uses the in-house `Dialog`. Props: `report`, `item` (the scope) and `onApplied`.

**Header**
- Title: "Import CSV" plus the scope, e.g. "Marketing Intelligence · Behaviour", "Media Mix Model" or "Card: Core Values".
- **Download template** link to `csvTemplate`.
- A one-line hint: "Keep the header row. One file per card. Numbers without % or $."

**Step 1: choose files**
- **As of** date input, defaulting to today.
- Dropzone:
  - Recover it from the deleted `DataImportPreview.tsx` (`git show 1a68d7c^:src/features/data-import/DataImportPreview.tsx`, dropzone near line 327).
  - `accept=".csv,.zip,text/csv,application/zip"`, `multiple` except for a widget scope.
  - It has drop and browse, the file list with remove buttons, and `csvImportProblem` errors inline.
- A **Check files** button runs the preview.

**Step 2: review**
- A summary line, e.g. "46 ready · 1 with errors · 1 skipped".
- One row per file, sorted by tab then card. Ignored files are hidden.

| Column | Content |
|---|---|
| Card | `widget.title` (or the file name if not matched) |
| Tab | `tab.title`, or "—" for MMM |
| Rows | `rows` |
| Status | Badge: Ready (green), Errors (red), Skipped – no rows (grey), Not recognised / Not in this section / Duplicate (amber) |

- **Error rows** expand to show `Line {line} · {column}: {message}`.
  - An unknown-audience error links to `reports/[reportId]/settings`.
- **Hidden tab or section:** a ready row whose tab or section is hidden shows "The tab is hidden. Show it in the structure to publish this card."
- **Preview on canvas:** clicking a ready row shows its `content` on the canvas through `draft-preview.ts`, as an unsaved edit does today. The canvas switches to that card's tab if needed.
- **Change files** goes back to step 1 with the files kept.

**Footer**
- **Apply N cards** is disabled when N = 0. It posts only the ready files with the same `as_of`.
- **On success:** a toast ("12 cards updated"), the dialog closes, the queries are reloaded, and `onApplied` runs.
- **On 422 or a network error:** the error is shown in the dialog and nothing closes. There is no success toast unless the API confirmed it.
- **Leaving early:** closing with files chosen but not applied asks "Discard these files?"

**States**
- **Loading:** the buttons show spinners while checking or applying.
- **Forbidden:** if the API returns 403/404, the dialog shows the shared forbidden message.
- **Layout:** works at 390px. The table becomes stacked cards, and the dialog uses the full screen.

## 4. Entry points

**Structure tree** (`StructureTabs.tsx`, wired in `ReportBuilder.tsx`)
- An **Import CSV** icon button (lucide `Upload`, tooltip "Import CSV") on:
  - the MI section row;
  - each MI tab row;
  - the MMM section row.
- It is shown only when `csvImportable` is true and the user has `reports.manage`.

**Widget inspector** (`WidgetInspector.tsx`)
- For importable widgets, a row above `ManualDataForm` with **Import CSV** and **Download template**.
- The dialog opens with the widget as the scope.
- If the inspector form has unsaved edits, opening it first asks "Discard unsaved changes?" (`useUnsavedChangesWarning`).
- After apply, the form resets to the saved content.

## 5. Mocks

- MSW handlers in `src/mocks/handlers` for the preview, apply and template endpoints.
- Fixtures cover the statuses: one ready, one invalid with two errors, one skipped, one out of scope.

## Tests

**`CsvImportDialog.test.tsx`**
- Dropping files enables **Check files**. A bad type or a size over 5 MB shows the inline error.
- The preview renders every status. Error rows expand to show the line messages. Ignored files are hidden.
- **Apply N** posts only the ready files plus `as_of`. Success shows a toast and invalidates the queries. A 422 keeps the dialog open with the error.
- A widget scope accepts one `.csv` only.
- The hidden-tab warning shows.
- Closing with files chosen asks for confirmation.

**Builder and helpers**
- **`StructureTabs.test.tsx`:** the import button is on the MI section, MI tabs and MMM, and not on Reporting.
- **`WidgetInspector.test.tsx`:** the import row is on MI and MMM manual and text widgets, and not on live widgets.
- **`layout.test.ts`:** `csvImportable`.
- **`contracts`:** the response schemas and `csvImportProblem`.

**Proxy routes and e2e**
- **Proxy routes:** an invalid id gives 422, and so does a wrong type. Forwarding is multipart.
- **Template:** a zip download comes through unchanged.
- **Playwright** (`e2e/mock-auth-api.mjs`): open MI section → Import CSV → drop the template zip → 48 ready → Apply → the toast shows.

## Implementation notes

Where the build differs from the plan above:

- **Invalid route id:** the proxy answers 400 "Invalid report scope.", as every other report proxy route does, not 422. A wrong file type, size or count is a 422 on `files`.
- **Zips on Apply:** the API names a zip's files by their path inside it, not by the zip. A zip is posted on Apply only when none of the files that came from zips has errors. Otherwise the dialog says which zips are held back, and the ready `.csv` files are still applied.
- **Preview on canvas:** the dialog is modal, so a row's **Preview** button moves the dialog aside. A bar at the bottom then reads "Preview: … Not saved yet." and has a **Back to import** button.
- **Unsaved inspector edits:** before the import opens, the inspector asks "Discard unsaved changes?" using the shared confirmation dialog. `useUnsavedChangesWarning` only covers leaving the page.
- **MSW:** the handlers in `src/mocks/handlers/csv-import.ts` don't read the posted files, because a jsdom `File` body never finishes streaming. The dialog tests spy on `previewCsvImport` and `applyCsvImport` to see what was sent.
- **Playwright:** the mock API's layout has a single Marketing Intelligence card, so the flow expects 1 ready card instead of 48.
