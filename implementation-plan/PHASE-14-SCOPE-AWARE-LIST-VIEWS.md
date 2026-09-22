# Phase 14 — Scope-aware list views (header "All Agencies / All Workspaces")

Status: not started. Follow-up scope, same category as [Phase 13](PHASE-13-EXPANDED-DATA-IMPORT.md) — functional work on already-integrated screens, not part of the 01→12 visual-prototype sequence in [README.md](README.md).

## Problem

The header scope selector (`src/providers/ScopeProvider.tsx`, rendered in `src/components/layout/AppShell.tsx`) lets a Super Admin pick a specific agency or leave it as "All agencies" (the default). Every other role is locked to their one membership agency and never sees this control — that part is correct and out of scope here (see `MOSAIQ-Admin-Frontend-Screen-Spec.md` lines 87-105).

The bug is what list pages do with an unset (`undefined`/"All") `scope.agencyId`. Today every page below treats "no agency in header" as **"nothing to show yet, please pick one from the header"** and blocks itself with a prompt. It should instead mean **"show everything the user can see, with fully open pickers on the page"** — the opposite of what happens now. When the header *does* have a specific agency selected, the page should narrow to it, which mostly already happens for agency (client/workspace state resets on agency change) but has never been extended to client/workspace defaults.

Three backend endpoints were added specifically to unblock this (confirmed live in the regenerated `mosaiq-laravel-api/storage/app/mosaiq-api-v1-openapi.json`):

| Endpoint | Filters | Access |
|---|---|---|
| `GET /v1/clients?agency_id=` (`listAllClients`) | `agency_id?, search?, status?, page?, per_page?` | Super Admin only |
| `GET /v1/workspaces?agency_id=` (`listAllWorkspaces`) | `agency_id?, search?, status?, page?, per_page?` (no `client_id` filter; rows carry `client_id`) | Super Admin only |
| `GET /v1/users?agency_id=` (`listAllAgencyUsers`) | `agency_id?, search?, status?, page?, per_page?` | Super Admin only |
| `GET /v1/import-history?agency_id=&client_id=` | now adds `agency_id`, `client_id` to the existing `workspace_id, type, status, date_from, date_to, page, per_page` | Scoped by existing `WorkspaceDataAccess::query($user)` — filters narrow, never widen, a user's own access |
| `GET /v1/csv-templates` (`listAllCsvTemplates`) | none — flat, static registry, identical for every agency/client/workspace | Super Admin or any active Agency Admin |
| `GET /v1/creative-assets?agency_id=&client_id=&workspace_id=&csv_import_id=` (`listAllCreativeAssets`) | all four optional, paginated | Super Admin, or Agency Admin scoped to their own agency (cross-agency `agency_id` 404s for them) |

Not covered by this batch, still fully path-scoped (`/agencies/{a}/clients/{c}/workspaces/{w}/...`) and out of scope for this phase:
- `csv-imports` preview/detail/confirm/retry — expected, these are mutations tied to one destination, not list views.
- `/admin/agencies/{agency}/invitations` — no aggregate variant exists yet. Flag to backend if Invitations should get the same treatment as Users.

## Outcome

For every page below: when the header scope is "All Agencies" (Super Admin default), the page's own agency/client/workspace pickers are open and unrestricted, not blocked. When the header has a specific agency selected, the page's pickers default to it and are narrowed to it. Non-Super-Admin roles are unaffected — they never had an "All Agencies" state, so their pages keep working exactly as today (agency always resolved from membership).

## Screen scope

### `src/features/data-import/DataImportPreview.tsx` (`/data-import`)
- Remove the `!agencyId` block at the "Choose destination" section (currently `"Select an agency from the header to choose a destination."`, disables the Client combobox). Client combobox should always be enabled.
- `useInfiniteClients`/`useInfiniteWorkspaces` (`src/features/workspaces/queries.ts`) need an "all agencies" mode: when `agencyId` is unset, call the new `listAllClients`/`listAllWorkspaces` (via new `api.ts` functions + `paths.ts` entries) instead of being `enabled: false`. When `agencyId` is set, keep the existing agency-scoped calls (or pass `agency_id` into the flat endpoint — functionally equivalent, pick one convention and reuse it for Users/Workspaces too).
- `useCsvTemplates` currently requires `agencyId, clientId, workspaceId` and blocks until all three are chosen. Since `GET /v1/csv-templates` is flat and content never varies by scope, switch the "Check the template" section (`SectionHeading number="2"`) to always call the new unscoped endpoint regardless of destination — this removes a real block, not just an "all" case, and is a strict simplification.
- `useCreativeAssets` currently requires `agencyId, clientId, workspaceId` all valid plus optional `csvImportId`, blocking until the full destination chain is picked. Switch to the new `listAllCreativeAssets(filters)` with `agency_id`/`client_id`/`workspace_id`/`csv_import_id` all optional — pass whatever is currently selected, omit the rest, matches the "open until narrowed" behavior everywhere else on this page.
- Keep the existing reset-on-agency-change effect (`priorAgencyId` guard) — still correct, just also needs to fire when the header changes agency *away from* "All" and *back to* "All", which it already does since it's driven by reference equality on `agencyId`.

### `src/features/data-import/ImportHistoryDirectory.tsx` (`/import-history`)
- Same Client/Workspace combobox fix as above (all-agencies mode via the new endpoints).
- `ImportHistoryFilters` (`src/features/data-import/api.ts:154-162`) currently only sends `workspace_id`. Add `agency_id?` and `client_id?` and thread `agencyId`/`client?.id` through from this component — the comment at `ImportHistoryDirectory.tsx:106-108` ("The import-history endpoint has no agency-scoping parameter yet...") is now stale and should be deleted along with the workaround it describes.
- Remove the placeholder text tied to the old blocking pattern (`"Select an agency first"` / `client ? "All clients" : ...`) since both pickers are now always open; simplify to plain "All clients"/"All workspaces" placeholders throughout.

### `src/features/workspaces/WorkspaceDirectory.tsx` (`/workspaces`)
- Bigger change than the two above: this page currently forces a **client** selection too (`clientId` defaults to `clients[0]?.id`) and calls the three-level `useWorkspaces(agencyId, clientId, filters)`, so it has never shown "all workspaces for an agency," let alone across agencies — contradicts `MOSAIQ-Admin-Frontend-Screen-Spec.md:274` ("Manage client workspaces across all agencies or within the selected agency").
- Replace the `useClients` + forced-first-client + `useWorkspaces(agencyId, clientId, ...)` chain with a new hook backed by `GET /v1/workspaces?agency_id=` (`listAllWorkspaces`) — call with `agency_id: scope.agencyId` (omitted when "All"). This one call replaces the client-list dependency entirely for this screen; `client_id` isn't a supported filter on this endpoint, so if a client-level filter is still wanted here, filter the returned rows client-side using the `client_id` field already present on `WorkspaceResource`, or drop the client filter from this screen's filter bar if it isn't essential to the acceptance criteria.
- `agencyName`/`clientName` lookups need to handle the multi-agency case (currently assumes one `agencyId`) — likely resolve per-row from `record.agency_id` via the already-fetched `agenciesQuery` list instead of a single outer `agencyId`.

### `src/features/users/UserDirectory.tsx` (`/users`)
- Remove the `isSuperAdmin && !agencyId` empty-state block (`UserDirectory.tsx:288`) and the `if (!agencyId) return;` early-out in `changePage` (`UserDirectory.tsx:205`).
- Add an "all agencies" branch to whatever hook backs `useAgencyUsers` (`src/features/users/queries.ts`) using the new `GET /v1/users?agency_id=` (`listAllAgencyUsers`) when `agencyId` is unset, falling back to the existing `userPaths.collection(agencyId)` (`/agencies/{agency}/users`) when a specific agency is selected. Response shape differs slightly (`AgencyUserResource` includes `agency_id`, `client_id`, `workspace_ids` directly on each row — useful if the directory table wants to show which agency a row belongs to in "All" mode); confirm `src/features/users/contracts.ts`'s `agencyUserListResponseSchema` already matches this shape or needs a shared/union schema.

### `src/features/invitations/InvitationDirectory.tsx` (`/users/invitations`)
- **No backend endpoint exists for this yet.** `invitationPaths.collection` is still `/api/v1/admin/agencies/{agencyId}/invitations` only — not part of this batch. Leave the current `isSuperAdmin && !agencyId` blocking state (`InvitationDirectory.tsx:251`) as-is for this phase; note it as an explicit backend follow-up ask (same pattern as `listAllAgencyUsers`) rather than attempting a client-side fan-out across agencies.

### `src/lib/api/paths.ts`
- Add unscoped builders: `clientPaths.allCollection = "/api/v1/clients"`, `workspacePaths.allCollection = "/api/v1/workspaces"`, `userPaths.allCollection = "/api/v1/users"`, `csvTemplatePaths.allCollection = "/api/v1/csv-templates"`, `creativeAssetPaths.allCollection = "/api/v1/creative-assets"`. Add `agency_id`/`client_id` to the existing `importHistoryPaths` filter type (path itself is already unscoped).

## Decision: branch on `agencyId` presence (approved)

Keep the existing nested-path calls (`/agencies/{id}/clients`, `/agencies/{id}/workspaces`, `/agencies/{id}/users`) when the header has a specific agency selected; use the new flat `listAll*` endpoints only for the "All Agencies" case. Rejected the always-flat alternative (pass `agency_id` into the flat endpoint for both cases) to avoid touching the already-verified scoped code path in a bug-fix phase — smaller diff, lower regression risk. Apply this same branch consistently across Data Import, Import History, Workspaces, and Users.

## Out of scope for this phase

- Header `ScopeProvider` itself — confirmed working as intended, not being changed.
- Non-Super-Admin role behavior — already correct (agency always resolved from membership, never "All").
- `csv-imports` action endpoints (preview/confirm/retry) — inherently single-destination, no aggregate variant needed or requested.
- Invitations aggregate view — blocked on a backend endpoint that doesn't exist yet; track as a follow-up ask, don't build a client-side workaround.
- Persisting header scope across reloads, dirty-state confirmation on scope change, invalid-URL-scope recovery — separate, previously-identified gaps in `ScopeProvider`/`AppShell`, unrelated to this phase's list-view fix.

## Exit gate

With header scope = "All Agencies" (Super Admin), Data Import, Import History, Workspaces, and Users all load with fully open agency/client/workspace pickers and no forced pre-selection or blocking prompt. With a specific agency selected in the header, the same pages narrow their data and pickers to it, matching current (unchanged) behavior. Non-Super-Admin roles show no behavior change. Import History's Dataset/Status/date filters continue to combine correctly with the new `agency_id`/`client_id` filters. No fabricated "all data" claim where a backend endpoint still requires scope (Invitations stays honestly blocked with its existing message).
