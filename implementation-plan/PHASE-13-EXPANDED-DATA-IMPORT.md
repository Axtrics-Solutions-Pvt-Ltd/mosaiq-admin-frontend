# Phase 13 — Expanded data import (client-portal CSV types)

Status: not started. This is follow-up scope, not part of the original 01→12 visual-prototype sequence in [README.md](README.md) — Phases 08 and 09 were already carried through to a working, API-wired `/data-import` and `/import-history` (confirmed: both screens call the real Laravel endpoints today, not fixtures). This phase extends that already-functional feature to the new import types built on the backend.

Backend source of truth: [docs/client-portal/IMPLEMENTATION_PHASES.md](../../mosaiq-laravel-api/docs/client-portal/IMPLEMENTATION_PHASES.md) (Phase 5 there is this doc's counterpart). Read that first — it lists every new CSV type, its columns, and what's already live.

## Outcome

Admins can upload, preview, confirm, retry, and review history for every CSV type the backend now supports, not just the original three (`reporting`, `marketing`, `mmm`).

## What already works without any change

Verified by reading `DataImportPreview.tsx` and `ImportHistoryDirectory.tsx` in full: neither has per-type branching. Both read type lists/labels/columns from `src/features/data-import/contracts.ts` and iterate generically. The upload/preview/confirm/retry flow, validation-error rendering, append/replace confirmation, and history filters all already scale to new types **once contracts.ts knows about them** — no component rewrite implied by adding a type.

## New types to add (from the backend registry)

`mmm_channel_performance`, `geography`, `audience_segments`, `campaigns`, `creative_assets`, `audience_overview`, `cultural_identity`, `demographics`, `data_readiness`, `model_input_readiness`. Also: `reporting` and `marketing` now accept two template versions (v1 without `status`, v2 with it) — this is new behavior on types that already exist here, not just new types.

## Decision needed before starting (do not guess)

`contracts.ts` currently hardcodes `datasetColumnGuides` and `datasetSampleRows` client-side and never calls the backend's `GET csv-templates` / `GET csv-templates/{type}/versions/{version}` endpoints at all. That was a minor duplication at 3 types; at 13 types plus real version history it becomes a real drift risk (the frontend's v1-only `reporting`/`marketing` column list is already stale against the backend's v2). Pick one before writing code:

- **A — keep hardcoding.** Add 10 more entries to `datasetColumnGuides`/`datasetSampleRows`, and a version-aware shape for `reporting`/`marketing`. Fast now, repeats the drift risk on every future backend template change.
- **B — fetch templates from the API.** Call `GET csv-templates` for the column list and accepted versions, and `GET csv-templates/{type}/versions/{version}` for the downloadable sample, instead of maintaining a second copy. More work now (new `api.ts`/`queries.ts` functions, loading/error states on the template section), but removes the duplication permanently and handles future version bumps with zero frontend changes.

## Screen scope

- `src/features/data-import/contracts.ts`: add `csvImportTypes` entries and `datasetTypeLabels` for the 10 new types regardless of the decision above (needed for the dataset `<Select>` on `/data-import` and the dataset filter on `/import-history`).
- If Option A: extend `datasetColumnGuides`/`datasetSampleRows` for all 10, and add version-aware entries for `reporting`/`marketing`.
- If Option B: new `csv-templates` API functions/query hooks; `DataImportPreview.tsx`'s "Check the template" section (`SectionHeading number="2"`) reads from the query instead of the static maps; loading/error states for that fetch.
- **Creative assets — new flow, not a config addition.** `creative_assets` rows import without `asset_url`; a file must be attached per confirmed row afterward via `POST .../creative-assets/{creativeAsset}/asset`. Nothing in the current confirm/success screen (`isConfirmed` block in `DataImportPreview.tsx`) has a concept of "confirmed, but now attach files per row." This needs its own post-confirmation step: likely a table of the imported creative rows with a per-row file picker/upload control and status, appearing after `isConfirmed` is true for `datasetType === "creative_assets"`.
- Import history: verify the "Dataset" filter and table/mobile-card labels pick up the new types automatically via `datasetTypeLabels` (confirmed in `ImportHistoryDirectory.tsx` — they do, with a raw-type fallback if a label is ever missing).

## Out of scope for this phase

- `media-mix-model/scenarios` has no CSV type yet on the backend (open item, not yet designed) — nothing to build here until that lands.
- The report/document library (`reporting/reports`) and Marketing Intelligence `behavior`/`media-brand`/`insights-comparison` sub-tabs have no import type or table on the backend at all — same, nothing to build here yet.

## Exit gate

Every backend-registered CSV type is selectable and uploadable from `/data-import`, with correct expected-columns display and a working sample download. `reporting`/`marketing` templates correctly reflect both accepted versions. Creative asset rows can be imported and have their files attached end to end. Import history correctly labels and filters every new type. No fabricated success states — if the template-fetch (Option B) or asset-attach call fails, show the same honest error patterns already used elsewhere in this feature (`StatePanel`, `ApiError` messages).
