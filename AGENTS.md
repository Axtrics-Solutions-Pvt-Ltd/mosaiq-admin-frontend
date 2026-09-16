# MOSAIQ Admin Frontend — Codex Project Instructions

## Scope

These instructions apply to this directory and every directory below it.

This repository is the standalone MOSAIQ Admin frontend. Laravel is an external JSON API. Do not add Laravel, PHP, database, migration, queue, or infrastructure code here.

The repository currently contains approved specifications and a phased implementation plan. When the application has not yet been scaffolded, preserve those documents and begin with the requested phase. Do not treat planned files, scripts, API contracts, or dependencies as if they already exist.

## Instruction and specification priority

Follow requirements in this order:

1. The user's current request.
2. This `AGENTS.md` file.
3. `implementation-plan/README.md` and the active `implementation-plan/PHASE-*.md` file for delivery order, phase scope, and prototype acceptance.
4. `MOSAIQ-Admin-Frontend-Screen-Spec.md` for product scope, screen content, and user-visible behavior.
5. `MOSAIQ-Admin-UI-Engineering-Spec.md` for frontend architecture, design system, coding standards, accessibility, testing, and the eventual production definition of done.
6. Existing code and tests for local implementation conventions.

The approved implementation plan refines earlier specifications. In particular:

- Use `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/dashboard`, `/agencies`, and the other documented routes without an `/admin` URL prefix.
- Authentication routes remain outside the authenticated application shell.
- Build and review the complete UI prototype before the separate functional API integration workstream.
- The Phase 03 authentication scope includes sign-up, sign-in, logout, forgot-password, reset-password, session-expired, and protected-route states.

If two sources still conflict in a way that affects the requested result, do not silently choose a third design. Follow the higher-priority source, record the conflict, and update the relevant specification when the task includes documentation reconciliation.

## Working behavior

- Read this file, the implementation-plan README, the active phase document, and the relevant sections of both specifications before changing code.
- Inspect sibling components and existing patterns before creating a new abstraction.
- Carry the requested phase or feature through implementation and appropriate verification. Make reasonable routine decisions without stopping for confirmation.
- Preserve the phased scope. Do not pull later functional integration into a visual-prototype phase.
- Keep changes focused. Do not refactor unrelated areas or rewrite planning documents unless the task requires it.
- Reuse existing components, tokens, utilities, route builders, formatters, and typed constants before adding new ones.
- Do not create new top-level source directories or introduce a new architectural layer without a clear need.
- Do not add or upgrade dependencies casually. Use the package manager identified by the committed lockfile. When Phase 01 requires dependencies, install the approved stack and commit the resulting lockfile.
- Never invent backend URLs, endpoint shapes, authentication behavior, authorization payloads, pagination contracts, credentials, or business rules. Record unresolved API dependencies for handoff.
- Keep explanations concise. Report what changed, what was verified, and any remaining contract dependency or material limitation.

## Approved frontend stack

Use the following stack when the application is scaffolded:

- Next.js App Router with a `src/` layout.
- React and strict TypeScript.
- Tailwind CSS with semantic CSS variables.
- Project-owned and customized shadcn/ui primitives.
- Lucide React icons.
- TanStack Query for remote state and TanStack Table for operational tables.
- React Hook Form and Zod for forms and frontend validation.
- Recharts for charts.
- MSW for production-shaped mock API behavior.
- Vitest and React Testing Library for unit, component, and integration tests.
- Playwright for critical end-to-end flows.
- Geist Sans with suitable fallbacks.
- Storybook is optional and must not block the UI delivery path.

Pin actual package versions through the lockfile. Do not copy speculative version numbers from planning documents into package configuration.

## Architecture and source organization

Use Next.js route groups to separate public authentication routes from authenticated application routes without changing their URLs:

```text
src/app/(auth)/...
src/app/(application)/...
```

Use the feature-oriented structure defined in the engineering specification:

```text
src/app/                  routes, layouts, loading and error boundaries
src/components/ui/        project-owned primitives
src/components/layout/    application shell
src/components/shared/    cross-feature patterns
src/features/             domain features
src/config/               environment, navigation, permissions, routes
src/lib/                  API, auth, query, validation, shared utilities
src/mocks/                MSW fixtures and handlers
src/providers/            focused providers
src/styles/               semantic tokens
src/test/                 shared test setup
```

Keep dependencies flowing from routes to features to shared components to UI primitives, with `lib` and `config` supporting those layers. UI primitives must not import feature code. Features must not reach into another feature's internal folders. Route files compose screens and should not contain large workflows.

- Default to Server Components for static composition.
- Add `"use client"` only at the smallest boundary that needs hooks, events, context, or browser APIs.
- Use named exports for components and hooks except where Next.js requires a default route export.
- Keep one typed navigation configuration and one route-builder source. Do not assemble route strings ad hoc in JSX.
- Store shareable filter, sort, pagination, tab, agency, and workspace state in the URL when it defines the result set.
- Keep passwords, tokens, files, sensitive fields, and large drafts out of URLs.

## Prototype and API boundaries

The current delivery plan uses realistic static UI first, followed by a separate functional integration workstream.

- Put prototype sample content behind feature-level view-model or adapter modules. Route components must not depend on raw fixture collections.
- Clearly label sample and preview states with `Demo data`, `Sample data`, or `UI preview` where needed.
- Navigation, tabs, drawers, dialogs, and other local inspection controls may work during the prototype.
- Do not claim that login, email, invite, save, upload, CSV processing, connector sync, filtering, pagination, or persistence occurred when no real operation happened.
- Hide, disable, or clearly label unavailable actions. Never show a normal success toast for an operation that did not occur unless it is explicitly presented as a local demo simulation.
- When functional integration begins, pages and components must call feature query or mutation hooks, which call feature API functions, which use one shared typed HTTP client.
- Components must not call `fetch` or Axios directly.
- MSW must intercept the same paths as the future Laravel API. Production components must not import mock fixtures.
- Keep API DTO validation and normalization separate from presentation-specific UI models.
- Treat Laravel as authoritative for authentication, authorization, validation, persistence, and business rules. Frontend permission display is usability behavior, not security enforcement.

## State, forms, and tables

- TanStack Query owns remote state. Do not copy query collections into a second global store.
- Define stable, feature-local query-key factories that include every value affecting the response.
- Use React Hook Form with Zod schemas and infer form types from schemas when possible.
- Preserve entered values after recoverable errors and map server field errors to the matching controls.
- Render detail views as semantic read-only content instead of disabled forms.
- Warn before navigation discards dirty form state.
- Use the shared confirmation pattern for destructive or consequential actions. Do not use `window.confirm`.
- Build operational tables on the shared DataTable foundation. Use entity IDs as keys, accessible sorting labels, server-compatible state, distinct empty and no-results states, and an explicit mobile strategy.
- Use shared locale-aware formatters for dates, currency, numbers, and percentages.

## UI and design system

Implement the approved modern blue SaaS system through semantic tokens:

- Cool blue-gray canvas, white surfaces, confident blue actions, and navy/slate text.
- Restrained status and chart colors.
- Fine borders, compact operational spacing, and minimal elevation.
- Limited gradients for sparse brand moments.
- Avoid neon colors, strong glass effects, heavy shadows, excessive pills, and one-off raw colors.

Build primitives and shared patterns before duplicating feature visuals. Individual pages must use the shared authenticated shell and must not recreate the sidebar or top bar.

Use Lucide icons rather than hand-drawn or unrelated icon sets. Use icons with text or accessible labels where the action would otherwise be ambiguous.

## Responsive and accessible implementation

Target WCAG 2.2 AA and validate layouts at 1440, 1280, 1024, 768, 390, and 320 pixels where the active phase calls for visual review.

- Use semantic HTML first and established accessible primitives for dialogs, drawers, menus, tabs, comboboxes, and tooltips.
- Provide visible focus, correct labels and errors, logical headings, a skip link, route-change focus handling, and contextual accessible names.
- Keep every control keyboard operable and restore focus after overlays close.
- Do not communicate status through color alone.
- Honor reduced-motion preferences.
- Use the mobile navigation and filter drawers defined by the specifications.
- Choose a deliberate mobile table strategy per table.
- Never hide application-wide overflow to conceal a layout defect.

## TypeScript, React, and styling conventions

- Keep TypeScript strict. Avoid `any`; narrow `unknown` at untrusted boundaries.
- Use discriminated unions for meaningful UI states.
- Type public component props explicitly and keep them small.
- Keep state close to its owner. Use focused composition or context instead of a universal application context.
- Derive values during render when possible. Do not use effects to synchronize duplicate state or suppress hook dependency warnings.
- Use stable entity keys, never array indexes for mutable collections.
- Components use `PascalCase`; hooks, functions, and variables use `camelCase`; booleans start with `is`, `has`, `can`, or `should`.
- Prefer descriptive domain names over vague names such as `data`, `item`, `helper`, or `utils2`.
- Use semantic token utilities, the shared class-merging helper, and controlled variants.
- Avoid dynamic Tailwind class construction, repeated long class lists, arbitrary pixels without a documented visual need, and inline styles except for genuinely dynamic values.
- Comments explain constraints and decisions. Do not leave commented-out implementations.

## Security-conscious frontend rules

- Never commit or log passwords, access tokens, private keys, connector credentials, personal payloads, or real secrets.
- Treat all `NEXT_PUBLIC_*` values as public.
- Do not render unsanitized HTML or use `dangerouslySetInnerHTML` without an approved and documented sanitization requirement.
- Render imported CSV values as text.
- Show safe user-facing errors rather than raw stack traces, HTML error bodies, internal exception names, or secrets.

## Verification

Use scripts from `package.json` once it exists. Phase 01 must provide noninteractive scripts for formatting or format checks, linting, independent type checking, unit tests, Playwright tests, and production builds.

For each change:

1. Run the smallest relevant checks while iterating.
2. Add or update meaningful tests for behavior with branching, regressions, shared component contracts, or critical workflows.
3. Avoid tests that only repeat TypeScript, static markup, or implementation details.
4. Before completing a phase, run every exit-gate command named by that phase.
5. Before a broad handoff, run formatting, lint, type checking, relevant unit/component tests, relevant Playwright flows, and the production build.

Use Testing Library queries by role and label. Use MSW for request behavior. Include desktop and at least one mobile viewport for critical Playwright flows. Perform keyboard and responsive checks required by the active phase; automated accessibility checks supplement manual keyboard review.

If a requested UI change is not visible, verify the development server and build state and tell the user which existing package script to run. Do not invent command names before `package.json` exists.

## Definition of a completed task

A task is complete when its requested scope and active phase gate are satisfied, the implementation follows the approved shared patterns, appropriate checks pass, prototype copy accurately describes what works, and remaining backend contract dependencies are stated clearly. Do not describe an entire feature as production-complete when only its visual prototype has been implemented.
