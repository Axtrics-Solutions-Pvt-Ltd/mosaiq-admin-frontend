# Phase 10 — KPI and module curation UI

## Outcome

A clear configuration screen shows what each workspace can display and distinguishes visible and deliberately hidden data.

## Reconciliation (2026-09-22)

Built as a fully functional screen against the real Laravel admin curation endpoints
(`GET`/`PUT /admin/workspaces/{workspace}/curation`), not a local-draft prototype, since the
API contract was already available and agencies/workspaces had already moved to real
integration. This overrides the "prototype first" framing below for this screen. The
documented `UpdateWorkspaceCurationRequest` payload only accepts `{ id, is_enabled }` per
module/KPI — it has no `position` field and no primary-KPI or data-availability field. As a
result, scope was cut against the original screen spec:

- Only two states are represented: **Visible** (`is_enabled: true`) and **Hidden**
  (`is_enabled: false`). The three-state "Available & visible / Available but hidden /
  Unavailable" vocabulary and the data-availability label are dropped — there is no backend
  field to source an "unavailable" distinction from.
- Primary-KPI marking is dropped — no backing field exists.
- No reorder UI — modules/KPIs render in the order the API returns (`position`), since any
  client-side reordering could not be saved.
- The client-preview entry point links to a placeholder URL pending the client portal's
  actual route contract (tracked as an unresolved backend/product dependency).

## Route

`/curation` with the selected agency and workspace represented in the URL query (`agency`,
`workspace`) since they define the result set.

## Screen scope

- Agency and workspace selectors, draft/saved indicator, Reset, Save Configuration, and a
  client-preview entry point (placeholder URL).
- Modules and their KPIs as returned by the API, each with enable/disable.
- Explicit presentations for Visible and Hidden.
- Default, modified/draft, saved, reset-confirmation, validation, loading, permission, and
  error designs.

## Prototype behavior

Superseded — see Reconciliation above. Save and Reset perform real requests against
`PUT /admin/workspaces/{workspace}/curation`.

## Exit gate

Approve information hierarchy, draft/saved feedback, reset consequence, responsive layout,
and preview behavior. Confirmed: loads and saves through typed feature functions
(`src/features/curation`), guards dirty scope changes, and covers mutation failure/recovery.
Outstanding: primary-KPI marking, data-availability status, and the real client-preview URL
remain unresolved backend/product contract dependencies.
