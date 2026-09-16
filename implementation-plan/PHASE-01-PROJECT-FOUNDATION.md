# Phase 01 — Project foundation

## Outcome

A clean, runnable Next.js App Router frontend exists on the Admin project's own directory. This phase installs and verifies tooling; it does **not** build business screens.

## Scope

- Scaffold Next.js with strict TypeScript, `src/` layout, App Router, Tailwind CSS, and a committed lockfile. Keep dependency versions pinned by that lockfile.
- Configure semantic CSS variables, Geist Sans with fallbacks, shadcn/ui setup, Lucide React, TanStack Query and Table, React Hook Form, Zod, Recharts, MSW, Vitest, Testing Library, and Playwright. Storybook is optional and should not block the UI pass.
- Add formatter, ESLint, typecheck, unit-test, E2E-test, and production-build scripts. Set up test browser fixtures and a minimal smoke test.
- Establish `src/app/(auth)`, `src/app/(application)`, `src/components`, `src/features`, `src/config`, `src/lib`, `src/styles`, and test folders. Route groups do not appear in URLs.
- Add a single route-builder module with no `/admin` prefix. Establish environment validation and a future API-client location, but do not invent a Laravel URL or authentication contract.
- Make a root landing decision explicit: in the prototype, `/` can redirect to `/login` or `/dashboard` via a documented preview setting; later it must follow real session state.

## Implementation sequence

1. Confirm the existing folder contains only planning/spec files and preserve them.
2. Scaffold the application and configure the approved dependencies.
3. Add a minimal layout, global styles, placeholder routes, and not-found/error boundaries.
4. Add one sample primitive and one smoke test so each toolchain is exercised.
5. Run all checks and fix configuration errors before Phase 02.

## Verification / exit gate

- Development server starts and each placeholder route loads directly and after refresh.
- `typecheck`, `lint`, unit test, Playwright smoke test, and production build pass in noninteractive mode.
- No secret or fake API credential is committed. The repository has a documented environment example.
- At least one mobile viewport loads without horizontal overflow.

## Not in this phase

No business data, authentication, API calls, tables, charts, CSV parsing, or permissions. Tooling being installed does not require it to be fully used yet.
