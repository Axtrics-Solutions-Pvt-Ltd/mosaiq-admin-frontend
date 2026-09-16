# Phase 10 — KPI and module curation UI

## Outcome

A clear configuration screen shows what each workspace can display and distinguishes visible, deliberately hidden, and unavailable data.

## Route

`/curation` with selected agency/workspace represented in the URL later when it defines the result set.

## Screen scope

- Agency and workspace selectors, draft/saved indicator, Reset, Save Configuration, and client-preview entry point.
- Sections for Reporting Dashboard, Marketing Intelligence, and Media Mix Model.
- Per module: enable/disable, grouped KPIs, visibility controls, primary KPI, ordering affordance, data availability, and client-visible/internal-only label.
- Explicit presentations for Available and visible, Available but hidden, and Unavailable.
- Default, modified/draft, saved, reset-confirmation, validation, loading, unavailable-data, permission, and error designs.

## Prototype behavior

Controls may update a local draft purely to make the layout reviewable, but must not claim persistence. Decide whether ordering uses drag-and-drop or keyboard-friendly up/down controls during review; if drag is retained, provide an equivalent keyboard action. Client preview must not open an unconfirmed or unsafe URL.

## Exit gate

Approve information hierarchy, availability vocabulary, primary-KPI rule presentation, ordering interaction, draft/saved feedback, reset consequence, responsive layout, and preview behavior. Later functional work validates configuration rules, loads and saves through typed feature functions, guards dirty scope changes, and tests mutation failure/recovery.
