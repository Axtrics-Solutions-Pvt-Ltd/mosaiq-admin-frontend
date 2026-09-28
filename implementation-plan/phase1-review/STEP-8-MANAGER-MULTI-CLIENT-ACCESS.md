# Step 8 — Manager access to multiple clients (invite + edit)

Status: partly built, 28 September 2026.

- **Done:** `Checkbox` indeterminate, `client-access.ts` helpers, contracts, `useInfiniteClientTree`, client proxies, `ClientWorkspaceTree`, invite form and conflict dialog payload, and edit form, each with tests.
- **Still to do:** `UserDetail.tsx` grouped access, the accept and pending-invitation screens, and trimming the Manager modes out of `InvitationScopeSelectors`.

API dependency: API Step 8 (`mosaiq-laravel-api/docs/phase1-review/STEP-8-MANAGER-MULTI-CLIENT-ACCESS.md`). That doc has the full contract and the behaviour table (B1–B6). This file covers the admin panel only.

Only Managers are affected. The Agency Admin invite (Super Admin only) keeps having no client or workspace scope.

## 8.1 What changes for the user

- **Today:** on `/users/invite` and `/users/[userId]/edit`, the admin picks **one client** (dropdown), then optional workspaces (multi-select).
- **New:** both pages show a **client → workspace accordion** with checkboxes:

```
Client *
┌───────────────────────────────────────────────┐
│ 🔍 Search clients and workspaces…            │
├───────────────────────────────────────────────┤
│ ▾ [■] Acme Corp                           ⌃ │
│      [✓] All workspaces                      │
│         [✓] Marketing                        │
│         [✓] Development                      │
│         [✓] Operations                       │
│ ▾ [–] Global Solutions                    ⌃ │
│      [ ] All workspaces                      │
│         [✓] Design                           │
│         [ ] Engineering   (Invited)          │
│ ▸ [ ] Tech Innovations                    ⌄ │
│              … scroll loads more …          │
└───────────────────────────────────────────────┘
2 clients · All + 1 workspace selected
```

## 8.2 How the tree behaves

| Action | Result |
|---|---|
| Tick a client | Selects the client with **All workspaces** on, and expands the panel |
| Untick a client | Removes the client and its workspaces |
| Tick **All workspaces** | All workspace boxes show as ticked and are disabled. The Manager will also get workspaces created later |
| Untick **All workspaces** | Every currently listed workspace stays ticked, and the admin can untick some |
| Tick or untick a workspace | Updates the client box: ticked when all are ticked, partly ticked (indeterminate) when some are |
| Untick the last workspace | Removes the client |
| Client box state | Checked when All is on, indeterminate for a subset, empty when not selected |
| Search | Filters by client name **or** workspace name. Clients that match on a workspace open automatically |
| Scroll near the bottom | Loads the next page of 20 clients. A "Load more" button is the fallback |
| Row with `invite_status` `added` (invite page) | Disabled, badge "Added" |
| Row with `invite_status` `invited` (invite page) | Disabled, badge "Invited" |
| Pending item in edit (`pending_*`) | Stays ticked with badge "Invite pending". Unticking it revokes the pending invite on save |
| Selected client not on the loaded page | Stays selected. The selection is kept in form state, not taken from the loaded list |
| Summary line | "N clients · M workspaces selected"; a client with All counts as "All" |
| Validation | Manager needs at least one client, and each selected client needs All or at least one workspace |

Panels that start expanded: clients that are selected, and clients matching the search. All others start collapsed.

## 8.3 Components

### `src/components/ui/Checkbox.tsx`: add `indeterminate`
- Add an `indeterminate?: boolean` prop, set on the native input through a ref (`input.indeterminate = …`).
- Show a lucide `Minus` icon instead of `Check`.
- Set `aria-checked="mixed"`.
- Existing uses don't change.

### New `src/features/invitations/ClientWorkspaceTree.tsx`
- **Props:**
  - `agencyId`
  - `value: ClientAccessSelection`
  - `onChange`
  - `mode: "invite" | "edit"`
  - `inviteeEmail?`
  - `roleCode?`
  - `pending?`: from `user.access`, for edit
  - `errorMessage?`
  - `disabled?`
- **Type:** `type ClientAccessSelection = Record<number, { allWorkspaces: boolean; workspaceIds: number[] }>`
- **Search:** input debounced by 300 ms, the same pattern as `PaginatedCombobox`.
- **List:** a scroll container (max height about 480px) with infinite load when within 48px of the bottom. Copy the logic from `src/components/shared/PaginatedCombobox.tsx` (around L200-208) and keep its "Load more" button.
- **Client panel:** a header button (chevron plus client name) toggles it and has `aria-expanded`. The client checkbox is separate from the toggle.
- **Workspace rows:** use `Checkbox` plus a `Badge` for Added / Invited / Invite pending.
- **States:** loading uses `Skeleton` rows; empty and error use `StatePanel` with a retry.
- **Rendering:** one query loads the clients with their workspaces embedded, so no request is needed when a panel is expanded.
- **Helpers:** add `toClientsPayload(selection)` → `clients[]` and `fromUserAccess(access)` → `ClientAccessSelection` in `src/features/invitations/client-access.ts`, with unit tests.

`InvitationScopeSelectors.tsx` stays for the Super Admin → Agency Admin path, which has no client scope. Remove its Manager branches (`manager-invite`, `manager-edit`) once the tree replaces them.

## 8.4 Data

- **`src/features/workspaces/api.ts`:** `listClients` and `listAllClients` accept `include: "workspaces"`, plus `email` / `role_code`.
- **`src/features/workspaces/queries.ts`:** new `useInfiniteClientTree(agencyId, search, email?, roleCode?)`:
  - key `["workspaces", "client-tree", agencyId | "all", search, email, roleCode]`
  - `per_page: 20`, `status: "active"`, `include: "workspaces"`
  - same `getNextPageParam` as `useInfiniteClients`
- **`src/features/workspaces/contracts.ts`:**
  - `ClientRecord.workspaces` already exists. Add `invite_status?: "added" | "invited" | null` on the client.
- **Proxy `src/app/api/v1/agencies/[agency]/clients/route.ts` and `src/app/api/v1/clients/route.ts`:**
  - allow `include`, `email` and `role_code` in the query params that are passed through.

## 8.5 Contracts (Zod)

| File | Change |
|---|---|
| `src/features/invitations/contracts.ts` `inviteSchema` | Replace `client_id` and `workspace_ids` with `clients: [{client_id, all_workspaces, workspace_ids?}]`. Refine: required and at least one for MANAGER, absent for other roles, All or at least one workspace per client, distinct ids. The POST proxy re-validates with this schema, so it follows automatically. |
| same, `invitationSchema` | add `batch_id` |
| same, `myInvitationSchema` + inspect schema | add `clients: [{client_id, client_name, all_workspaces, workspaces[{id,name}], existing_workspaces[{id,name}]}]` |
| same, conflict schemas | every `already_pending` / `creatable` entry has `client_id` |
| `src/features/users/contracts.ts` `agencyUserSchema` | add `access: [{client_id, client_name, all_workspaces, workspace_ids, pending_all_workspaces, pending_workspace_ids}]` |
| same, `updateAgencyUserSchema` | add `clients[]` (same shape as invite). Keep `client_id: null` for the legacy CLIENT_USER path. The PUT proxy re-validates with it. |

## 8.6 Screens

### `InviteUserForm.tsx` (`/users/invite`)
- Form schema: replace `clientId` + `workspaceIds` with `clients: ClientAccessSelection`.
- When the role is Manager, render `ClientWorkspaceTree` with `mode="invite"`, passing the debounced email and role so Added / Invited badges show.
- Changing the agency (Super Admin) or the role clears the selection, as `clearScope()` does today.
- Submit sends `clients: toClientsPayload(selection)`.
- API field errors `clients` / `clients.{i}.*` go to the tree's `errorMessage`.
- `InvitationConflictDialog`: "Send to remaining" rebuilds `clients[]` from `creatable`, grouping by `client_id`. A creatable whole-client row means All.
- Keep the Agency Admin copy, and change it to: "Agency Admins invite Managers, who can access only the clients and workspaces chosen below."

### `UserEditForm.tsx` (`/users/[userId]/edit`)
- Start the tree from `fromUserAccess(user.access)`, with active and pending items both ticked; pending ones get a badge.
- Send `clients` only when the selection has changed (track a `scopeTouched` flag as today).
- Before saving, show a short note:
  - "Removed access is revoked immediately."
  - "Newly added clients or workspaces are sent as one invitation email."
- Remove `isWorkspaceRequired` / single-client logic. The tree validation replaces it.
- Editing is still blocked while `status === "invited"`.

### `UserDetail.tsx` (`/users/[userId]`)
- Replace `ClientAccessBadge` and the flat workspace list with a list grouped by client from `user.access`:
  - client name
  - "All workspaces" or the workspace names (resolved with `useWorkspacesByIds`)
  - pending items shown as "Invite pending"

### Invitation screens
| File | Change |
|---|---|
| `AcceptInvitationForm.tsx` (`/accept-invitation`) | Show the grouped `clients[]` from inspect: per client, "All workspaces" or a list |
| `MyInvitationList.tsx`, `PendingInvitationsScreen.tsx`, `PendingInvitationsDialog.tsx` | One card per invitation (batch) with the client and workspace list. Accept and Reject act on the whole invitation |
| `InvitationDirectory.tsx` (`/users/invitations`) | Stays one row per workspace or whole client (revoke per row). Optionally group visually by `batch_id` later |
| `labels.ts` | `wholeClientLabel()` also used for the All label in the tree and detail |

## 8.7 Tests (Vitest + MSW)

- **`client-access.test.ts`:** `toClientsPayload` / `fromUserAccess` round trip, All versus subset, and removing empty clients.
- **`ClientWorkspaceTree.test.tsx`:**
  - ticking a client selects All
  - unticking one workspace makes the client indeterminate
  - unticking the last one removes the client
  - search passes `search` to the API
  - scrolling or clicking Load more fetches page 2
  - an Added row is disabled
- **`Checkbox`:** `indeterminate` sets `aria-checked="mixed"`.
- **`InviteUserForm.test.tsx`:**
  - submits `clients[]`
  - Manager without a client shows an error
  - a 409 conflict "Send to remaining" posts the rebuilt `clients[]`
- **User edit:** starts from `access`, sends `clients[]` after a change, and doesn't send it when nothing changed.
- **`AcceptInvitationForm.test.tsx` / `PendingInvitationsScreen.test.tsx`:** render the grouped list.
- **MSW handlers:** clients `include=workspaces` responses, and the new invitation shapes.

## 8.8 Files

| Area | Files |
|---|---|
| UI | `src/components/ui/Checkbox.tsx` |
| New | `src/features/invitations/ClientWorkspaceTree.tsx`, `src/features/invitations/client-access.ts` (+ tests) |
| Data | `src/features/workspaces/{api,queries,contracts}.ts`, proxies `src/app/api/v1/agencies/[agency]/clients/route.ts`, `src/app/api/v1/clients/route.ts` |
| Contracts | `src/features/invitations/contracts.ts`, `src/features/users/contracts.ts` |
| Screens | `InviteUserForm.tsx`, `InvitationConflictDialog.tsx`, `UserEditForm.tsx`, `UserDetail.tsx`, `AcceptInvitationForm.tsx`, `MyInvitationList.tsx`, `PendingInvitationsScreen.tsx`, `PendingInvitationsDialog.tsx`, `InvitationScopeSelectors.tsx` (trim) |
| Mocks | `src/mocks/*` handlers |

No new dependencies. The accordion is built from the existing `Button`, `Checkbox`, `Badge` and lucide icons.

## 8.9 Build order

1. `Checkbox` indeterminate
2. contracts, and the `client-access.ts` helpers
3. data hook and proxies
4. `ClientWorkspaceTree`
5. invite form and conflict dialog
6. edit form
7. detail page
8. accept / pending invitation screens
9. tests

Build it against API Step 8. The shapes change together, so deploy both at the same time, then run `npm run build`.
