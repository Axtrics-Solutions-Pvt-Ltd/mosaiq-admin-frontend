# Phase 03 — Authentication and account access UI

## Outcome

Complete reviewable entry/account-access screens on the dedicated Admin domain, outside the authenticated application shell.

## Routes and views

| URL | UI purpose |
|---|---|
| `/login` | Sign in; email/password, remember me, show/hide password, help link |
| `/signup` | Admin account creation/activation design; identity, email, password, confirmation, terms/help copy as agreed |
| `/forgot-password` | Request reset link; submitted and unavailable states |
| `/reset-password` | Set new password using a reset link; invalid/expired link and success states |
| `/forbidden` | Access denied presentation |
| No dedicated URL | Logout action in profile menu; signed-out/session-expired presentation |

## Important product decision

The visual pass should use **invite-only Admin sign-up** as a clearly marked working assumption, because open self-registration could create unauthorized Admin accounts. The exact eligibility, invitation link, reset token, password policy, session storage, cookie/CSRF, and delivery contracts require Laravel/API agreement before functional implementation. Do not imply the screen already sends email or creates an account.

## Screen design tasks

- Develop one coherent auth layout: restrained brand panel or centered card, MOSAIQ identity, clear hierarchy, mobile variant, and accessible field layout.
- Show default, field-error, pending, invalid credentials, generic unavailable, expired link, submitted, and success visual states in a reviewable way.
- Implement safe local presentation interactions if helpful: password visibility, route links, dialog previews, and form-state demonstrations. Do not claim real authentication.
- Design protected-route and session-expiry behavior; for prototype review, a preview-mode route switch may expose shell pages without a real login.
- Add logout to the profile menu with a clear preview-only signed-out state until session APIs exist.

## Exit gate

Every route renders directly; auth screens work at desktop/mobile widths; labels, focus, error descriptions, and status messaging are accessible; copy clearly distinguishes UI preview from real email/account/session operations. Source screen spec is updated to include these routes before implementation begins.

## Later functional gate

Agree API contracts, then implement Zod validation, React Hook Form, real signed-in/session handling, 401/403 responses, reset-token handling, logout, and E2E flows. No password/token is stored in fixtures, local storage, URL state beyond the real reset token, or logs.
