# Phase 1 Review — Revised Scope (Admin frontend)

Status: planning, 24 September 2026. Agreed after the Phase 1 client review.

This folder plans the revised scope for `mosaiq-admin-frontend`. The API side, including the full decision list, role capabilities and widget catalogue, is in `mosaiq-laravel-api/docs/phase1-review/`. **Step numbers match across both repos.** An admin step can only be integrated once the API step with the same number is live.

Older phase files in `implementation-plan/` are left as they are. **If one conflicts with this folder, this folder wins.**

## What the admin panel becomes

- **Super Admin** (used by us only): everything as today — agencies, the "All agencies" header scope — plus the channel catalogue.
- **Agency Admin**: "My Agency", Clients, Workspaces (channel workspaces), Users (invite Managers), Reports, Audit & settings.
- **Manager**: Clients (read), Workspaces (create/edit for assigned ones), Reports.
- A **Report builder** that looks like the client portal, with show/hide, reorder and edit controls on each section, tab and widget, and share links.

## Architecture rules (unchanged)

Every new feature follows the existing pattern:
- `src/features/<feature>/` with `contracts.ts` (Zod), `api.ts`, `queries.ts` (TanStack Query) and screen components
- a Next.js proxy route under `src/app/api/v1/...` for every backend endpoint (`forwardAgencyRequest` / `admin-server`), with paths in `src/lib/api/paths.ts`
- routes in `src/config/routes.ts`
- nav in `src/config/navigation.ts`
- capabilities in `src/config/permissions.ts`

Shared UI comes from `src/components/shared` and `src/components/ui`. **No new dependencies without approval.** Reordering uses up/down buttons, not a drag-and-drop library. Charts use the existing `recharts`.

## Capabilities (target `permissions.ts`)

| Capability | Super Admin | Agency Admin | Manager |
|---|---|---|---|
| `dashboard.view` | ✅ | ✅ | ✅ |
| `agencies.create` | ✅ | — | — |
| `agencies.manage` (Agencies list / My Agency) | ✅ | ✅ | — |
| `clients.manage` (create/edit) | ✅ | ✅ | — |
| `clients.view` *(new)* | ✅ | ✅ | ✅ |
| `workspaces.manage` (create/edit/credentials/fetch) | ✅ | ✅ | ✅ |
| `workspaces.delete` *(new)* | ✅ | ✅ | — |
| `users.manage` | ✅ | ✅ | — |
| `roles.view` | ✅ | ✅ | — |
| `reports.manage` *(new)* | ✅ | ✅ | ✅ |
| `reports.delete` *(new)* | ✅ | ✅ | — |
| `channels.manage` *(new)* | ✅ | — | — |
| `settings.manage` | ✅ | ✅ | — |

The capabilities `imports.create`, `importHistory.view`, `connectors.view` and `curation.manage` are removed.

**The API remains the real guard.** Hiding UI is only for convenience. A Manager only sees records the API returns.

## Steps

| Step | File | Delivers |
|---|---|---|
| 1 | [STEP-1-SCOPE-CLEANUP.md](STEP-1-SCOPE-CLEANUP.md) | Data import/history/connector screens removed, "My Agency", Manager-only invites, roles page trimmed |
| 2 | [STEP-2-CHANNELS-AND-WORKSPACES.md](STEP-2-CHANNELS-AND-WORKSPACES.md) | Channel catalogue (Super Admin), workspace = channel, credentials, fetch, delete, Manager access |
| 3 | [STEP-3-DATA-CORRECTIONS.md](STEP-3-DATA-CORRECTIONS.md) | Correction dialog, correction history, reset |
| 4 | [STEP-4-REPORT-BUILDER.md](STEP-4-REPORT-BUILDER.md) | Reports list, create, builder (tree + preview + editors), widget renderer |
| 5 | [STEP-5-SHARE-LINKS.md](STEP-5-SHARE-LINKS.md) | Links tab: create, copy, password, expiry, revoke, regenerate |
| 6 | [STEP-6-REMAINING-WIDGETS.md](STEP-6-REMAINING-WIDGETS.md) | Renderers and editors for the remaining widget types, budgets |
| 7 | [STEP-7-LEGACY-RETIREMENT.md](STEP-7-LEGACY-RETIREMENT.md) | KPI curation and leftover legacy code removed |

## Definition of done per step

- `npm run typecheck`, `lint`, `test` and `build` pass. (The user runs these; this plan doesn't run them automatically.)
- Vitest covers contracts and key components. Playwright e2e is updated against `e2e/mock-auth-api.mjs` for the new flows, and MSW handlers are added in `src/mocks/handlers`.
- Screens have populated, empty, loading, error and forbidden states, and work at desktop, tablet and 390px.
- No success toast for anything the API didn't confirm.
