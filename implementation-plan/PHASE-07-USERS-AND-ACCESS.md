# Phase 07 — Users and access UI

## Outcome

Reviewable user-management, invitation/edit, assignment, and fixed-role permission views without implying that frontend visibility is security enforcement.

## Routes

`/users`, `/users/invite`, `/users/[userId]`, `/users/[userId]/edit`, and `/roles`.

## Screen scope

- User summary cards and list columns for identity, type, fixed role, agency, workspaces, invitation status, last login, account status, and actions.
- Filters for agency, workspace, user type, role, invitation, and account state. Include populated, invited, inactive, empty, no-results, loading, error, and permission designs.
- Invite/edit sections: Identity, User Type, Agency Access, Workspace Access, Role, and Status/Invitation. Show conditional fields, searchable workspace selector, chips, incompatible-selection confirmation, validation, and unsaved-change patterns.
- Fixed role cards and read-only matrix for Platform Admin, Agency Admin, Manager/Account Manager, Analyst, Viewer, and Client User. Include capability search/group expansion and an assigned-users drawer.
- Ensure Client User copy clearly limits access to explicitly assigned workspaces. Do not expose role creation or permission editing.

## Prototype behavior

Navigation, tabs, grouped permission expansion, and drawers should work for review. Filters, pagination, resend invitation, deactivate, and saving assignments need not change real data. A preview success state must say it is simulated; do not claim an invitation email was sent.

## Exit gate

Approve role vocabulary, visible capability matrix, internal/client distinction, assignment layout, mobile list strategy, confirmation copy, and all form/state designs. Record unresolved server capability rules for API handoff. Later functional work centralizes capability identifiers, consumes the authorized-user payload, handles 401/403/422 responses, implements forms/mutations, and tests one forbidden route/control case.
