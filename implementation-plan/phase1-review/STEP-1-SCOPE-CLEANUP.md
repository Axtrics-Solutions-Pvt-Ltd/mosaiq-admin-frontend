# Step 1 — Scope cleanup

API dependency: API Step 1 (the import routes are removed there, so these screens would break anyway).

## 1.1 Remove data import, import history and connector status

**Delete:**
- Pages: `src/app/(application)/data-import/`, `import-history/`
- The `/connectors` route key and its catch-all handling in `[...slug]/page.tsx` (if it renders a connectors screen)
- Feature: `src/features/data-import/` (whole folder)
- Proxy routes:
  - `src/app/api/v1/csv-templates/`
  - `src/app/api/v1/import-history/`
  - `src/app/api/v1/creative-assets/`
  - `src/app/api/v1/admin/agencies/[agency]/clients/[client]/workspaces/[workspace]/csv-*` and `creative-assets/`
- In `routes.ts`: `dataImport`, `importHistory`, `connectors`
- In `paths.ts`: the matching entries
- In `navigation.ts`: the whole "Data management" group
- In `permissions.ts`: `imports.create`, `importHistory.view`, `connectors.view`
- The matching MSW handlers and e2e specs

**Also remove references in `WorkspaceDetails.tsx`**, i.e. the "Workspace data" card that links to import, and in `DashboardPreview.tsx`, i.e. any import cards.

## 1.2 "My Agency"

In `navigation.ts`, the Agencies item stays for Super Admin. For an Agency Admin, the same slot shows **"My Agency"**, linking straight to `routes.agencies.detail(ownAgencyId)`.

Implementation:
- A `label`/`href` resolver on the nav item that reads `useScope()`: `isSuperAdmin`, `agencyId`.
- The `/agencies` list page redirects non-Super-Admins to their agency detail.
- The page title, breadcrumbs and `getNavigationItem` must match the resolved label.

## 1.3 Roles

- `RoleDirectory` shows Agency Admin and Manager only, using the trimmed `/admin/roles` response. Remove the hardcoded rows for Analyst, Viewer and Client User.
- `InviteUserForm`:
  - **Agency Admin:** there is no role picker. Show "Role: Manager" as read-only text, send `role_code: "MANAGER"`, and require the workspace scope.
  - **Super Admin:** a two-option picker (Agency Admin, Manager). Agency Admin needs no workspace scope; that's existing behaviour.
  - Remove the `CLIENT_USER` client-scope branch and `invitationRoles` entries for the hidden roles.
- `role-labels.ts`: keep labels for all six codes, because existing legacy users still need to display correctly.
- `UserDirectory` role filter: Agency Admin and Manager only.
- `UserEditForm` role select: Agency Admin and Manager only.

## 1.4 Hide KPI curation

Remove the "KPI & module curation" nav item now, because it's replaced by the report builder. The code is deleted in Step 7.

## 1.5 Tests

- Update nav snapshot/unit tests for each role.
- Invite form: an Agency Admin sends MANAGER with no picker; a Super Admin sees two options.
- An e2e check that the removed routes 404.
