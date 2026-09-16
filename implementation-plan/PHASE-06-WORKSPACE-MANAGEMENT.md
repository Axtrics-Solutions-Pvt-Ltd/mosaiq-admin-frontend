# Phase 06 — Workspace management UI

## Outcome

Complete visual control surface for client workspaces across agencies, including all six detail sections.

## Routes

`/workspaces`, `/workspaces/new`, `/workspaces/[workspaceId]`, `/workspaces/[workspaceId]/edit`.

## Screen scope

- List summary cards, table, agency/status/module/data-source/manager/freshness filters, actions, and empty/no-results/loading/error variants.
- Workspace header with parent agency, client identity, status, data-source badge, and primary action.
- Six sections: Overview; Market Profile; Modules; Team and Access; Data; Activity.
- Show Reporting, Marketing Intelligence, and MMM module controls; assignments and roles; seeded/imported/current dataset display; links to imports and curation; activation/deactivation and unsaved-change designs.
- Create uses empty/default field designs; details is read-only; edit shows editable fields. No separate onboarding wizard.

## Prototype behavior

Tabs and route links work. Scope selectors may show local selection, but a static list need not actually refilter or paginate. Any module toggle or assignment chip used for visual review is local-only and labelled as preview state. Opening the client-facing app remains an external preview link only after its safe URL is confirmed.

## Sequence and exit gate

Agree representative agency/workspace relationships, build list, build detail tabs, then create/edit form layouts and state previews. Review the highest-density sections at mobile widths. Later functional work adds filtered data contracts, assignments, form validation, mutation confirmations, and consistent agency/workspace scoping.
