# Phase 08 — Data import UI

## Outcome

A complete visual walkthrough of CSV selection, validation, review, and completion for Reporting, Marketing Intelligence, and Media Mix Model datasets.

## Route

`/data-import`. Validation remains in the single-screen guided flow; do not create a separate validation route.

## Screen scope

- Guided progression: agency → workspace → dataset type → template guidance/download → file selection/dropzone → validation → sample rows → confirmation → active-dataset choice.
- Dataset-specific expected columns from the screen specification.
- File metadata, recognized/missing columns, valid/warning/error counts, row errors, duplicate/date warnings, first-row preview, append/replace choice, pending/progress/failure/success designs.
- MMM readiness score and completeness, time coverage, channel consistency, and outcome consistency.
- Visual examples for valid file, invalid file, mixed warnings, replacement consequence, and unavailable processing.

## Prototype behavior

The initial pass uses designed sample file states. A chosen local filename may be displayed for review, but no upload, parsing, template generation, server processing, dataset activation, or persistence is claimed. If sample CSV links are shown before real files exist, label them unavailable in preview rather than shipping broken downloads.

## Exit gate

Approve the flow order, field/column copy, error density, preview table, warning hierarchy, confirmation consequence, progress display, and mobile behavior. Verify CSV values are rendered as text, not HTML. Later functional work adds file constraints, safe frontend preview/parsing where approved, Zod/external-data normalization, MSW fixtures, server upload/processing contract, cancellation/retry, and E2E coverage.
