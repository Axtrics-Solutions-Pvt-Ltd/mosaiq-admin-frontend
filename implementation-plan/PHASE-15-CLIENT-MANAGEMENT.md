# Phase 15 — Client management

Status: not started. Follow-up scope, same category as [Phase 13](PHASE-13-EXPANDED-DATA-IMPORT.md) and [Phase 14](PHASE-14-SCOPE-AWARE-LIST-VIEWS.md) — functional work on an already-integrated app, not part of the 01→12 visual-prototype sequence in [README.md](README.md).

## Problem

`Client` sits between Agency and Workspace (`Agency → Client → Workspace`) and the Laravel API fully manages it as its own entity — confirmed in `mosaiq-laravel-api/storage/app/mosaiq-api-v1-openapi.json`:

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /v1/clients` (`listAllClients`) | Cross-agency client list, `agency_id?/search?/status?/page?/per_page?` | Super Admin only |
| `GET /v1/agencies/{agency}/clients` (`listClients`) | Clients within one agency | Any role scoped to that agency |
| `POST /v1/agencies/{agency}/clients` (`createClient`) | Create a client. **Also creates that client's launch-default workspace**, using the agency's currency/timezone | Super Admin, owning Agency Admin |
| `GET /v1/agencies/{agency}/clients/{client}` (`getClient`) | Client detail incl. `workspaces[]` | Super Admin, owning Agency Admin |
| `PUT /v1/agencies/{agency}/clients/{client}` (`updateClient`) | Update `name`/`status`. "An inactive client retains its workspaces and assignments for recovery" — status is a soft toggle, there is no delete | Super Admin, owning Agency Admin |

`ClientResource`: `id, agency_id, name, status(active|inactive), workspace_count, workspaces[], created_at, updated_at`.
`ClientProfileRequest` (create/update body): `name` (required, ≤255), `status`.

The Admin frontend never built a screen for this. Today Client only exists as a read-only picker:

- `src/features/workspaces/contracts.ts`, `api.ts`, `queries.ts` already have read schemas/functions/hooks (`clientSchema`, `listClients`, `listAllClients`, `getClient`, `useClients`, `useInfiniteClients`, `useClient`) — these back the Client dropdown in `WorkspaceCreateScreen` (`src/features/workspaces/WorkspaceForm.tsx:517-532`) and the client comboboxes in `InvitationScopeSelectors.tsx`, `ImportHistoryDirectory.tsx`, `DataImportPreview.tsx`.
- The Next.js proxy routes only implement `GET`: `src/app/api/v1/agencies/[agency]/clients/route.ts`, `src/app/api/v1/agencies/[agency]/clients/[client]/route.ts`.
- There is no `POST`/`PUT` anywhere in the frontend, no `/clients` route group, no sidebar entry, and no create/edit UI.

Concretely this is a dead end today: `WorkspaceCreateScreen`'s Client `<Select>` (`WorkspaceForm.tsx:517-532`) renders only `clients.data?.data.map(...)`. If an agency has zero clients, the dropdown has no options and nothing on screen lets you add one — you cannot create a workspace for a client-less agency at all.

## Outcome

- A dedicated **Clients** screen group (list, create, details, edit) under the same "Organization" sidebar section as Agencies and Workspaces, matching those two screens' visual and interaction patterns (`DataTable`, `PageHeader`, `FilterBar`, `StatePanel`, `MetricCard`, `StatusBadge`, `ConfirmationDialog`).
- Full CRUD wired to the real endpoints above via the existing Next.js proxy-route + `apiRequest` + Zod contract pattern — no mock/fixture data, no new architectural layer.
- `WorkspaceCreateScreen`'s Client picker gets an inline "Add client" affordance when the selected agency has zero clients (or a persistent "Add client" action next to the picker at all times), so creating the first workspace for a new agency is no longer blocked.
- Create follows the backend's actual behavior: submitting the Client form produces both a client **and** its auto-generated default workspace in one call; the success screen/toast must not claim anything the API didn't do, and should surface the created workspace (`response.data.workspaces[0]`) rather than pretend it doesn't exist.
- Verified end-to-end against the mock Laravel server used by Playwright today (`e2e/mock-auth-api.mjs`), not just typechecked.

## Scope decisions

- **Route shape**: `/clients`, `/clients/new`, `/clients/[clientId]`, `/clients/[clientId]/edit`, all carrying `?agency=` (Super Admin selecting which agency to act in; other roles are agency-locked same as everywhere else). This mirrors `routes.workspaces` + `workspaceScope()`, one level shallower since Client only needs an Agency scope, not an Agency+Client scope. Add to `src/config/routes.ts`:
  ```ts
  clients: {
    index: "/clients",
    new: "/clients/new",
    detail: (id: string) => routeWithId("/clients", id),
    edit: (id: string) => `${routeWithId("/clients", id)}/edit` as const,
  },
  ```
  plus `clientScope(agencyId)`, `clientDetailUrl(clientId, agencyId)`, `clientEditUrl(clientId, agencyId)` helpers next to the existing `workspaceScope`/`workspaceDetailUrl`/`workspaceEditUrl`.
- **List scoping follows the Phase 14 convention already live in `WorkspaceDirectory.tsx`**: read `agencyId` from `useScope()` (`src/providers/ScopeProvider.tsx`). Header scope = "All Agencies" (Super Admin) → call `listAllClients({ agency_id: undefined, ... })`; a specific agency selected → call `listClients(agencyId, ...)` (or the flat endpoint with `agency_id` set — pick whichever `WorkspaceDirectory` already settled on and reuse it, per Phase 14's "Decision: branch on `agencyId` presence"). Do not reintroduce a page that force-blocks on "select an agency first".
- **Capability**: add `"clients.manage"` to `Capability` (`src/config/permissions.ts`) and include it in `orgAdminCapabilities` (Super Admin + owning Agency Admin) — **not** split into a `.manage`/`.create` pair like Agencies. Reason: `ClientPolicy` (per the Engineering Spec's permission table) scopes the same as `WorkspacePolicy`, where Agency Admins can create within their own agency; Agencies split the two because only Super Admin may create a brand-new agency. Confirm this against `ClientPolicy` in `mosaiq-laravel-api` before shipping — flag as a backend contract dependency if the policy differs.
- **Sidebar**: add a "Clients" item to the existing "Organization" group in `src/config/navigation.ts`, between Agencies and Workspaces, `capability: "clients.manage"`, a Lucide icon distinct from Agencies' `Building2` (e.g. `Building`).
- **No delete**: `status` is the only lifecycle control (`active`/`inactive`), same as Agency and Workspace. Deactivation goes through the shared `ConfirmationDialog` pattern, never `window.confirm`, and the copy must say "deactivate" / retains workspaces for recovery, not "delete".
- **Field surface is intentionally small**: `ClientProfileRequest` is just `name` + `status`. No logo, defaults, or primary-contact fields like Agency has — don't invent fields the API doesn't accept.

## Data & API layer

New feature folder `src/features/clients/`, reusing rather than duplicating the read path already in `src/features/workspaces/`:

- **`contracts.ts`**: import/re-export `ClientRecord`, `clientResponseSchema`, `clientListSchema` from `@/features/workspaces/contracts` (exported, not an internal reach-in — allowed). Add:
  ```ts
  export const clientProfileSchema = z.object({
    name: z.string().trim().min(1, "Enter a client name.").max(255),
    status: z.enum(["active", "inactive"]),
  });
  export const clientCreateSchema = clientProfileSchema.partial().required({ name: true });
  export type ClientProfile = z.infer<typeof clientProfileSchema>;
  export type ClientCreatePayload = z.infer<typeof clientCreateSchema>;
  ```
- **`api.ts`**: `createClient(agencyId, payload)` → `POST /api/v1/agencies/{agency}/clients`; `updateClient(agencyId, clientId, payload)` → `PUT /api/v1/agencies/{agency}/clients/{client}`. Re-export `listClients`, `listAllClients`, `getClient` from `@/features/workspaces/api` rather than re-implementing them.
- **`queries.ts`**: `clientKeys` factory; `useClientsDirectory(agencyId, filters)` (scope-aware per the decision above); `useCreateClient()`, `useUpdateClient()` mutations. On success, invalidate **both** `clientKeys.all` and `workspaceKeys.all` (`@/features/workspaces/queries`) — the workspace-creation Client picker (`useClients`) and the invitation/import-history client comboboxes (`useInfiniteClients`) read through the workspaces feature's query cache and must see a newly created client immediately.
- **`view-model.ts`**: `toClientSummary(record, agencyName)` mapping `ClientRecord` → the row shape `ClientDirectory`'s `DataTable` needs (id, name, agencyId, agencyName, status, workspaceCount, createdAt) — same role `agencies/remote-model.ts`'s `toAgencySummary` plays.
- **Next.js proxy routes** (server-only, forward via `forwardAgencyRequest` exactly like the Agency ones):
  - `src/app/api/v1/agencies/[agency]/clients/route.ts`: add `POST`, validating body with `clientCreateSchema` before forwarding (mirror `src/app/api/v1/agencies/route.ts`'s `POST` handler).
  - `src/app/api/v1/agencies/[agency]/clients/[client]/route.ts`: add `PUT`, validating with `clientProfileSchema` (mirror `src/app/api/v1/agencies/[agency]/route.ts`'s `PUT` handler).

## Screens

- **`src/features/clients/ClientDirectory.tsx`** (`ClientDirectory`): `PageHeader` "Clients" + "Add client" action (capability-gated); `MetricCard` row (total clients, active clients, total workspaces from `meta`); `FilterBar` (search, status, and — only when header scope is "All Agencies" — an agency filter); `DataTable` with columns Client (name + id, links to detail), Agency (hidden/omitted when a single agency is already scoped), Workspaces (count), Status, Created, Actions (`View`, `Edit`, `Open workspaces` linking to `routes.workspaces.index` filtered to this client, `Add workspace` linking to `routes.workspaces.new + workspaceScope(agencyId, clientId)`); loading/error/empty/no-results `StatePanel`s exactly like `AgencyDirectory`.
- **`src/features/clients/ClientForm.tsx`**: `ClientCreateScreen` (agency picker for Super Admin, reusing the same pattern as `WorkspaceCreateScreen`'s owner-agency `<Select>`, then the shared name/status form) and `ClientEditScreen`; a shared `<ClientForm>` using React Hook Form + `zodResolver(clientProfileSchema)`, dirty-state navigation warning, and server field-error mapping — same conventions as `AgencyForm.tsx`. On successful create, route to the new client's detail page and show what was actually created ("Client created with a default workspace, *Workspace name*, in *currency*/*timezone*") — not a generic "saved" toast.
- **`src/features/clients/ClientDetails.tsx`**: `ClientDetailsScreen(agencyId, clientId)` — header (client name, parent agency link, status badge, Edit action), workspace count metric, and the client's `workspaces[]` (already returned by `getClient`) rendered as a compact table/list linking into `workspaceDetailUrl`/`workspaceEditUrl`, with an "Add workspace" primary action.
- **Routes** (thin wrappers, matching `agencies/[agencyId]/*` exactly):
  - `src/app/(application)/clients/page.tsx`
  - `src/app/(application)/clients/new/page.tsx`
  - `src/app/(application)/clients/[clientId]/page.tsx`
  - `src/app/(application)/clients/[clientId]/edit/page.tsx`

## Fix the workspace-creation dead end

In `WorkspaceForm.tsx`'s `WorkspaceCreateScreen` (around lines 517-532): when `clients.data?.data.length === 0` for the selected agency, replace the empty `<Select>` with a `StatePanel`/inline prompt ("This agency has no clients yet") plus a button to `routes.clients.new + clientScope(agencyId)`. Optionally also add a persistent small "Add client" link next to the Client field regardless of count, for the common case of needing a second client. After creating a client from that path, the flow should return the user to workspace creation with the new client pre-selected (pass the new client id back via the `clients.new` return URL, or simply land on the new client's detail page with its auto-created default workspace already visible — decide based on which reads more honestly, since a workspace already exists at that point and offering to "create" another one immediately could be confusing).

## Testing — follow the backend, don't assume it

1. **Contract tests** (`src/features/clients/*.test.ts`, mirroring `src/features/workspaces/api.test.ts` / `agencies` equivalents): `clientProfileSchema`/`clientCreateSchema` validation edge cases (empty name, name > 255, invalid status); `createClient`/`updateClient` request shape and response parsing against the exact `ClientResource`/`ClientProfileRequest` shapes read from the OpenAPI doc.
2. **Component tests** (RTL): `ClientDirectory` loading/error/empty/populated states; `ClientForm` validation, dirty-state warning, server error mapping; the new "Add client" affordance in `WorkspaceForm` when `clients` is empty.
3. **`e2e/mock-auth-api.mjs`**: currently only stubs `GET` for `/api/v1/agencies/:agency/clients(/:client)?`. Add `POST` (returning a `ClientResource` with a `workspaces` array containing one seeded default workspace, matching `createClient`'s documented behavior) and `PUT` handlers, mirroring how that file already stubs Agency's `POST`/`PUT`.
4. **`e2e/clients.spec.ts`** (new, mirroring `e2e/agencies.spec.ts`): directory search/filter, create-client-validates-then-saves (assert the created default workspace is reflected, not just the client), edit persists through `PUT`, deactivate through the confirmation dialog, and the workspace-creation dead-end fix (create a workspace for a zero-client agency end-to-end).
5. **Manual verification against the real backend**: before calling this phase done, run the flow against an actual `mosaiq-laravel-api` instance (not just the Playwright mock) at least once — create a client, confirm the returned default workspace's currency/timezone actually match the agency's, update a client's status, and confirm `ClientPolicy` actually permits an Agency Admin to do this outside their own agency (403) and inside it (200) as assumed above. Record any mismatch as a backend contract note rather than silently adjusting the frontend to compensate.

## Out of scope for this phase

- Client delete — the API has no delete endpoint; `status` is the only lifecycle control.
- Editing the auto-created default workspace's name/currency/timezone as part of the client form — that's an ordinary Workspace edit, already built.
- Any change to `ClientPolicy`/backend authorization — frontend capability gating is presentation only, per `AGENTS.md`.
- Cross-agency client reassignment (moving a client to a different agency) — not exposed by `ClientProfileRequest` (no `agency_id` field), so not offered in the UI.

## Exit gate

`/clients` lists, searches, and filters clients (open across agencies for Super Admin's "All Agencies" scope, narrowed when an agency is selected, exactly like `/workspaces` after Phase 14). Creating a client succeeds through `POST` and honestly reflects the auto-created default workspace. Editing a client's name/status persists through `PUT`. The sidebar shows "Clients" for Super Admin and Agency Admin only (`clients.manage`), consistent with the Agencies/Workspaces visibility rule already documented in the Screen Spec. `WorkspaceCreateScreen` no longer dead-ends on a zero-client agency. All new code follows the existing proxy-route + Zod contract + TanStack Query pattern with no new architectural layer, no fixture data in production components, and no invented fields beyond `name`/`status`. Unit, component, and the new Playwright spec pass; the flow has been exercised once against the real Laravel API and any discrepancy from the OpenAPI doc is recorded here as a follow-up rather than papered over.
