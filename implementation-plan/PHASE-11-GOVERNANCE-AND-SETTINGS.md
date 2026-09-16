# Phase 11 — Governance and basic settings UI

## Outcome

One governance area presents immutable activity history and safe visual settings with a clear boundary between the two.

## Route

`/governance`; use URL-backed `audit`/`settings` tab state during the functional pass so direct links are stable.

## Audit Log tab

- Table: timestamp, actor, agency, workspace, action, entity, change summary, result, and event ID.
- Date/agency/workspace/actor/action/entity/result filter designs.
- Read-only detail drawer with full sample event, before/after summary, related import batch, and Copy Event ID action.
- Populated, empty/no-results, loading, error, permission, and long-value designs. Never show edit/delete actions.

## Basic Settings tab

- Default landing page, currency, time zone, supported-language display, module availability, seeded fallback, demo/maintenance banner, and table-density preference.
- Default, dirty, validation, save-pending/error/success, reset-confirmation, and permission designs.
- Keep settings within the safe scope; no secrets, billing, advanced security, or full white-label controls.

## Prototype and exit gate

Tabs, drawers, and Copy Event ID may work locally. Filters, pagination, save, reset, and banner effects can be visual-only; do not claim audit completeness or persistence. Approve audit density, immutable affordances, settings copy/defaults, reset consequence, permission presentation, and mobile strategy. Later work implements URL state, API queries/mutations, clipboard feedback, field validation, request IDs, and audit/settings E2E coverage.
