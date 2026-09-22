# Phase 16 — Account self-service (change password, edit profile)

Status: frontend implementation complete; live-backend smoke verification pending. Follow-up scope, same category as [Phase 13](PHASE-13-EXPANDED-DATA-IMPORT.md), [Phase 14](PHASE-14-SCOPE-AWARE-LIST-VIEWS.md), and [Phase 15](PHASE-15-CLIENT-MANAGEMENT.md) — functional work on an already-integrated app, not part of the 01→12 visual-prototype sequence in [README.md](README.md). Forgot-password and reset-password are **already built and working** (Phase 03) and are out of scope here except as a shared-component reference.

## Problem

The profile menu in `src/components/layout/AppShell.tsx:256-262` currently has one real action ("Sign out") and one placeholder link — "Component preview" pointing at `routes.designSystem` (the internal component gallery). There is no way for a signed-in user to change their password or edit their own name from the app. Confirmed against `mosaiq-laravel-api/storage/app/mosaiq-api-v1-openapi.json`:

| Endpoint | Purpose | Auth / constraints |
|---|---|---|
| `POST /auth/change-password` | `{current_password, password, password_confirmation}` → 204 | Any authenticated, active account. Wrong `current_password` or invalid new password → 422 with field errors. **Revokes every other session for the account** — the caller's own session survives, but this must be disclosed in the UI. |
| `PUT /agencies/{agency}/users/{user}` | Existing `updateAgencyUser` endpoint (`src/features/users/api.ts:62`), already used by admin user-management. Body is `role_code, client_id, workspace_ids, status, name`, all optional. | "A user editing their own record may only change `name`; role/client/workspace/status changes require Agency Admin or Super Admin" — server-enforced, per the spec. |

**Real gap, not solvable in this repo alone**: `PUT /agencies/{agency}/users/{user}` requires an `{agency}` path segment. A Super Admin's `CurrentUser.membership` is `null` (per `src/features/auth/contracts.ts:28-39`) — there is no agency to put that request under, and no other endpoint in the OpenAPI doc lets a Super Admin edit their own name. This phase does not invent a workaround endpoint. It ships a working profile screen for agency-scoped users and a read-only profile (name/email/role) plus working change-password for Super Admin, and records the missing endpoint as a backend dependency (see "Backend dependencies" below).

## Outcome

- The profile-menu "Component preview" link is replaced with two real entries: **Edit profile** and **Change password**. (`Component preview`/design-system access, if still wanted for internal QA, moves to a dev-only affordance outside the profile menu — not part of this phase unless the user asks; default is to just remove it from the menu.)
- `/profile` shows the signed-in user's own name, email (read-only — not part of either request schema), and role, with:
  - **Agency-scoped users** (`membership` present): an editable **Name** field wired to `PUT /agencies/{agency}/users/{user}` with `agencyId = membership.agencyId`, `userId = currentUser.id`, body `{ name }` only. Uses the existing `updateAgencyUser`/`useUpdateAgencyUser`-style mutation, not a new endpoint.
  - **Super Admin** (`platformRoleCode === "SUPER_ADMIN"`): name and role rendered as read-only text (no backend endpoint exists to change it — see gap above), with an inline note stating this, not a disabled input pretending to be a form.
- A **Change password** section/panel, same page or a `/profile/change-password` sub-view (decide during build based on how much vertical space the profile page needs — either is acceptable; prefer one `/profile` page with two clearly separated sections unless that gets visually cramped), with `current_password`, `password`, `password_confirmation` fields wired to `POST /auth/change-password`. On success: explicit copy that other sessions/devices have been signed out, matching the real API behavior — never a generic "saved" toast.
- No new architectural layer: new feature folder `src/features/profile/`, reusing `src/features/auth` (`authPaths`, `PasswordInput`, `AuthAlert` pattern) and `src/features/users` (`updateAgencyUser`, `updateAgencyUserSchema`) rather than duplicating them.

## Scope decisions

- **Route**: add `profile: "/profile"` to `src/config/routes.ts` (`routes.profile`), inside the authenticated app shell (`src/app/(application)/profile/page.tsx`) — this is a personal-account screen, not a public auth screen, so it does **not** go under `src/app/(auth)/`.
- **No sidebar entry**: profile is reached only via the `AppShell` profile-menu dropdown, same as Sign out — do not add it to `src/config/navigation.ts`/`navigationGroups`, it is not a navigable feature area with a capability gate.
- **No new capability**: editing your own profile and changing your own password are self-service actions available to every authenticated role regardless of `Capability`/`userCapabilities()` — do not gate them behind `src/config/permissions.ts`. The existing `updateAgencyUserSchema`/`PUT` endpoint's server-side "self-edit is name-only" rule is what constrains this, not a frontend capability check.
- **Reuse, don't duplicate, the update-user path**: do not create a second Zod schema or a second `PUT` proxy route for "update own name". `src/app/api/v1/agencies/[agency]/users/[user]/route.ts` and `updateAgencyUserSchema` (`src/features/users/contracts.ts:40-78`) already handle a `{ name }`-only partial payload correctly (the schema is `.partial()`, so `{ name }` alone validates). The profile feature calls the existing `updateAgencyUser(agencyId, userId, { name })` from `src/features/users/api.ts:62`, not a new function.
- **New surface needed**: only `changePassword`. Add to `authPaths` (`src/lib/api/paths.ts:1-8`): `changePassword: "/api/v1/auth/change-password"`. Add `"changePassword"` to `AuthOperation` handling in `src/lib/api/server.ts` — it is a mutation (needs CSRF/origin check like login/forgot/reset) **and** it needs the caller's own session cookie forwarded and preserved exactly like `me`/`logout` (it is authenticated, not anonymous like forgot/reset). Update `forwardAuthRequest`'s `isMutation`/`hasBody` branches (`server.ts:50-54`) to include `"changePassword"` in `hasBody` (it has a body) while keeping it authenticated (do not add it to `me`/`csrf`'s no-body branch). Add `src/app/api/v1/auth/change-password/route.ts` exporting `POST`, mirroring `forgot-password/route.ts`'s one-liner: `return safeForwardAuthRequest("changePassword", request);`.
- **Session-revocation disclosure**: because the API revokes all other sessions on password change, the success state must say so plainly (e.g. "Password updated. You've been signed out of your other sessions and devices.") — do not word it as if nothing else happened.
- **Field surface**: only what each endpoint accepts. Do not add avatar upload, timezone, phone, or notification-preference fields — none exist in `ChangePasswordRequest`/`updateAgencyUserSchema`/`CurrentUserResource`.

## Data & API layer

New feature folder `src/features/profile/`:

- **`contracts.ts`**: 
  ```ts
  export const changePasswordSchema = z
    .object({
      current_password: z.string().min(1, "Enter your current password."),
      password: z.string().min(8, "Use at least 8 characters."),
      password_confirmation: z.string(),
    })
    .refine((v) => v.password === v.password_confirmation, {
      message: "Passwords must match.",
      path: ["password_confirmation"],
    });
  export type ChangePasswordPayload = z.infer<typeof changePasswordSchema>;

  export const editProfileSchema = z.object({
    name: updateAgencyUserSchema.shape.name.unwrap(),
  });
  export type EditProfilePayload = z.infer<typeof editProfileSchema>;
  ```

The live Laravel ChangePasswordRequest rule was checked during implementation: minimum 8 characters, at least one letter and one number, and different from the current password. The profile form follows that rule. The existing reset form uses a stricter 12-character client-side minimum and needs separate reconciliation.
- **`api.ts`**: `changePassword(payload: ChangePasswordPayload): Promise<void>` → `apiRequest(authPaths.changePassword, { method: "POST", body: payload })`. Re-export `updateAgencyUser` from `@/features/users/api` for the name-edit call — no new function needed there.
- **`queries.ts`**: `useChangePassword()` — `useMutation({ mutationFn: changePassword, retry: false })`, **no** `queryClient.clear()` on success unlike `useResetPassword`/`useLogin` (the caller's own session stays valid; only *other* sessions are revoked server-side). `useUpdateOwnProfile(agencyId, userId)` — thin wrapper around the existing `useUpdateAgencyUser`-equivalent mutation from `src/features/users/queries.ts` if one already exists there (check first — reuse it directly, scoped to `{ name }`, rather than re-wrapping `updateAgencyUser` a second time).

## Screens

- **`src/features/profile/ProfileScreen.tsx`** (`ProfileScreen`): reads `useCurrentUser()`. Header: name, email (read-only, plain text — `email` is not editable by either endpoint), role (formatted from `platformRoleCode`/`membership.roleCode`, reuse whatever role-label formatter `UserDirectory.tsx`/`UserDetail.tsx` already use — check `src/features/users/` for an existing role-to-label map before writing a new one).
  - Agency-scoped branch: `<FormField>` name input, React Hook Form + `zodResolver(editProfileSchema)`, submit calls `updateAgencyUser(membership.agencyId, currentUser.id, { name })`; on success, update the cached `authKeys.me()` query data with the new name (`queryClient.setQueryData`) so the profile-menu initials/name in `AppShell` reflect it immediately without a full refetch; dirty-state navigation warning per AGENTS.md.
  - Super Admin branch: name/role rendered as static text with a short note, e.g. "Super Admin profile editing isn't available yet — this will be added when the API supports it." (Record this exact gap in "Backend dependencies" below; don't soften it into implying a timeline the team hasn't committed to.)
- **`src/features/profile/ChangePasswordForm.tsx`**: `current_password` (plain `Input`, not `PasswordInput`, since a current-password field doesn't need a strength affordance — but confirm which the existing `AuthForms.tsx`/`PasswordInput.tsx` convention already treats this as; reuse whichever component `PasswordRecoveryForms.tsx`'s reset form uses, for visual consistency), `password`/`password_confirmation` via `PasswordInput` matching `ResetPasswordForm`'s pattern exactly (`PasswordRecoveryForms.tsx:206-237`). Server field-error mapping via `ApiError.fieldErrors` for `current_password`/`password`/`password_confirmation`, same pattern as `ResetPasswordForm`'s `onSubmit` (`PasswordRecoveryForms.tsx:156-166`). Success state: inline `AuthAlert tone="success"` with the session-revocation disclosure, form fields cleared, no redirect (the user stays signed in).
- **Route**: `src/app/(application)/profile/page.tsx` — thin wrapper rendering `<ProfileScreen />`, matching how other route files in `(application)` just compose a feature screen.
- **`AppShell.tsx` change** (`src/components/layout/AppShell.tsx:256-262`): replace the "Component preview" `<Link>` with:
  ```tsx
  <Link className="..." href={routes.profile}>
    <UserRound aria-hidden className="size-4" />
    Edit profile
  </Link>
  <Link className="..." href={`${routes.profile}#change-password`}>
    <KeyRound aria-hidden className="size-4" />
    Change password
  </Link>
  ```
  (import `KeyRound` from `lucide-react`; anchor to a `#change-password` section id on the profile page rather than a second route, per the "one page, two sections" decision above — adjust if the page ends up as two routes instead). Do the same replacement in the mobile `Drawer` if it duplicates this menu (check — the current mobile drawer only shows nav + agency scope, not the profile menu, so likely no change needed there beyond confirming that).

## Testing

1. **Contract tests** (`src/features/profile/contracts.test.ts`): `changePasswordSchema`/`editProfileSchema` edge cases (empty/short password, mismatched confirmation, empty name, name > 255) — mirror `src/features/auth/contracts.test.ts`'s style.
2. **API tests** (`src/features/profile/api.test.ts`): `changePassword` request shape, mirroring `src/features/auth/api.test.ts`'s pattern for `resetPassword`.
3. **Component tests (RTL)**: `ProfileScreen` — agency-scoped branch renders an editable name form and submits via `updateAgencyUser`; Super Admin branch renders read-only text and no form; `ChangePasswordForm` validation, server field-error mapping (wrong current password → 422 on `current_password`), success message includes the session-revocation disclosure.
4. **`e2e/mock-auth-api.mjs`**: add a `POST /api/v1/auth/change-password` handler (204 on correct `current_password`, 422 with `fieldErrors.current_password` on mismatch) and ensure the existing `PUT /agencies/:agency/users/:user` mock accepts a `{ name }`-only body for the "self-edit" case.
5. **New Playwright spec** (`e2e/profile.spec.ts`): agency-scoped user edits their name and sees it reflected in the profile-menu initials; change-password happy path shows the sign-out-elsewhere message; wrong current password shows the field error and does not clear the form. Include one mobile viewport per AGENTS.md's Playwright convention.
6. **Manual verification against the real backend**: confirm `PUT /agencies/{agency}/users/{user}` truly accepts and applies a `{ name }`-only body for a self-edit (not just per the OpenAPI doc) and that `POST /auth/change-password` truly revokes other sessions as documented, before calling this phase done.

## Backend dependencies to record for handoff

- **No endpoint exists for a Super Admin to edit their own profile/name.** `PUT /agencies/{agency}/users/{user}` is agency-path-scoped and Super Admin has no agency. Either a new `PUT /auth/me` (or similar agency-independent self-edit endpoint) is needed, or Super Admin profile editing stays permanently read-only by design — needs a product decision from the backend/API owner, not a frontend workaround.
- Verified against Laravel request classes: change and reset both require at least 8 characters with letters and numbers; change also requires a password different from the current one. The existing reset form currently requires 12 characters on the frontend, so its validation copy should be reconciled in a separate auth follow-up. The OpenAPI schema does not encode these rules.

## Out of scope for this phase

- Forgot-password / reset-password screens — already built (Phase 03), untouched here except as a pattern reference.
- Email change, avatar upload, MFA/2FA, session/device management UI (e.g., listing or individually revoking other sessions) — none of these exist in the current API surface.
- Any change to `UserPolicy`/backend authorization — frontend behavior here is presentation only, per AGENTS.md.
- Removing or relocating the design-system/"Component preview" page itself — only its entry in the profile-menu dropdown is replaced. If internal access to `/design-system` is still wanted, that's a separate small decision (e.g. a footer link, a dev-only route) left to a follow-up, not blocking this phase.

## Exit gate

The profile-menu dropdown in `AppShell` offers **Edit profile** and **Change password** in place of "Component preview". `/profile` renders the correct branch for Super Admin (read-only, with the recorded gap noted in-UI) vs. agency-scoped users (editable name, saved via the existing `updateAgencyUser` endpoint, reflected immediately in the profile-menu initials). Change-password works end-to-end against `POST /auth/change-password` via a new thin proxy route, correctly surfaces wrong-current-password as a field error, and its success state honestly discloses that other sessions were signed out. No new capability, sidebar entry, fixture data, or duplicated schema/endpoint was introduced. Unit, component, and the new Playwright spec pass; the Super-Admin profile gap and the password-complexity-rule confirmation are recorded above rather than silently assumed.
