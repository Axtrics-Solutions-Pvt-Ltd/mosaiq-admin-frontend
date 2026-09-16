# Phase 05 — Agency management UI

## Outcome

Reviewable agency directory and create/details/edit flows for the multi-agency product.

## Routes

`/agencies`, `/agencies/new`, `/agencies/[agencyId]`, `/agencies/[agencyId]/edit`.

## Screen scope

- List: summary strip; agency name/logo, primary admin, workspace/user counts, currency, status, created date, last activity, and row actions. Design search/status/currency/workspace-count/recent-activity controls and empty/no-results/loading/error states.
- Create/details/edit: Overview, Primary Contact, Defaults, Workspaces, Administrators, Brand Preview, Recent Activity. Details is semantic read-only content, not disabled inputs.
- Show form validation, logo-preview, unsaved-change warning, status/deactivation confirmation, save-pending/error/success **visual states**.
- Use stable sample agencies that match dashboard and workspace references.

## Prototype behavior

Routes and tabs should navigate. Filters, pagination, create/save, duplicate, and deactivate can be inert or local-only preview interactions; label any simulation. Do not claim persistence or quietly change a static table after a fake save.

## Sequence and exit gate

Build shared list/table visual pattern, then directory, then details, then create/edit fields and state previews. Approve dense-table readability at desktop and mobile strategy (priority columns, controlled scroll, or record cards). Approve copy, validation placement, form sections, and confirmation language. Later functional work adds API/contract types, RHF/Zod, URL-backed table state, mutations, and permission/error handling.
