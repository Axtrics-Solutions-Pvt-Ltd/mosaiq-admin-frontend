# Phase 09 — Import history and connector status UI

## Outcome

Operational history and future-source availability are understandable without pretending that live connectors exist.

## Routes

`/import-history` and `/connectors`.

## Import history scope

- Summary cards for successful, processing, failed, active, and inactive datasets.
- Table fields: batch ID, agency, workspace, dataset, filename, uploader, time, row counts, mode, activation, processing status, and actions.
- Filters and visual pagination; detail drawer with processing stages, validation, counts, errors, replaced batch, and activation history.
- Review states for success, processing, warning, failure, empty/no-results/loading/error, retry, corrected upload, and activation/deactivation confirmations.

## Connector scope

- Provider cards/table grouped by Advertising, Analytics, and Manual Data for Meta Ads, Google Ads, GA4, CSV Import, and approved future placeholders.
- Show provider, description, modules, applicable workspaces, and only honest states: Available through CSV, Demo data active, Planned integration, Not configured, or Next phase.
- Agency/workspace/provider filter designs and informational drawer.
- Do not add OAuth, secret fields, Sync Now, Reconnect, or fake last-sync success.

## Prototype and exit gate

Drawers, route links, and provider information should be inspectable. Filtering, pagination, retry, activation, processing, and data refresh can remain static visual states. Approve operational density, status meanings, detail hierarchy, mobile strategies, and all honesty copy. Later work implements URL-backed list state, lazy drawer queries, mutations and rollback/error handling, real import contracts, and connector endpoints only when they exist.
