# Phase 12 — Cross-screen review, refinement, and handoff

## Outcome

The complete UI prototype is consistent, responsive, accessible enough for implementation review, and accompanied by a precise backlog for real behavior and Laravel integration.

## Review matrix

- Visit every public and authenticated route directly, through navigation, after refresh, and at 1440, 1280, 1024, 768, 390, and 320px widths.
- Review vocabulary, labels, breadcrumbs, active navigation, sample IDs/relationships, scope selectors, statuses, dates/currencies, and Demo data indicators across screens.
- Verify common visual states: populated, empty, no results, loading, recoverable error, permission, validation, pending, confirmation, and success where relevant.
- Keyboard-check navigation, menus, tabs, dialogs, drawers, comboboxes, tables, file controls, focus restoration, skip link, and route-change focus. Run automated accessibility checks and manually inspect contrast/status meaning/reduced motion.
- Check no prototype copy claims real email, authentication, save, upload, processing, sync, activation, pagination, filtering, or API persistence.
- Remove duplicated one-off styles and move stable patterns into shared components/tokens without creating universal flag-heavy components.

## Product review loop

1. Demonstrate each phase in a running preview with agreed viewport screenshots.
2. Log requested changes by route and severity; identify whether each change affects a shared token/component or one feature.
3. Apply approved changes centrally where appropriate and regression-check all consuming screens.
4. Obtain explicit visual sign-off or list known exceptions. A screenshot approval is not functional/API acceptance.

## Functional/API handoff inventory

For every route, record: required endpoint(s); request/response DTOs; pagination/filter/sort parameters; validation errors; 401/403/404/422/429/5xx behavior; capability requirement; loading/refresh policy; mutation and confirmation rules; and whether mock/MSW coverage is needed. Also resolve the authentication decisions listed in the roadmap.

Recommended post-prototype implementation order:

1. Shared HTTP client, normalized errors, generated/approved contract types, query provider, MSW bootstrap, and fixture reset.
2. Authentication/session/CSRF and capability presentation.
3. Global agency/workspace scope and URL-state utilities.
4. Agencies, workspaces, users/roles.
5. Dashboard and cross-feature aggregates.
6. Import flow/history and connectors.
7. Curation, audit, and settings.
8. Full unit/component/E2E suite, performance checks, and production hardening.

## Final prototype exit gate

- Every planned route and responsive layout is visually approved or has an explicitly accepted exception.
- Navigation and safe presentation interactions work; nonfunctional operations are clearly identified.
- Typecheck, lint, relevant UI tests, production build, responsive screenshots, and baseline accessibility checks pass.
- No component directly assumes an undocumented Laravel payload, and no secrets or fake live-integration claims exist.
- The API/backlog inventory separates already implemented behavior from visual-only work and is estimable by frontend and backend teams.

## Eventual production gate

After API integration, reapply the full definition of done in the engineering specification: MSW and production-shaped contracts, real URL-backed operational state, forms and mutations, permissions and error recovery, critical Playwright workflows, responsive/accessibility review, and successful production build. Phase 12 prototype sign-off alone is not production completion.
