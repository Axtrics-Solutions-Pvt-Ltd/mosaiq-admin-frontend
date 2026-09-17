# MOSAIQ Admin Frontend

MOSAIQ Admin Frontend is the standalone administration interface for MOSAIQ. It communicates with Laravel through an external JSON API and uses Next.js App Router, strict TypeScript, Tailwind CSS, and a feature-oriented `src/` layout.

The sign-in, session check, and sign-out flow uses the Laravel Sanctum API. Dashboard and other business content still use labelled sample data.

## Prerequisites

- Node.js 20.9 or later (a current LTS release is recommended)
- npm 10 or later

## Setup

Install the locked dependency set:

```bash
npm ci
```

Copy the environment example and set the actual API and Admin origins:

```bash
cp .env.example .env.local
```

`VITE_API_BASE_URL` is the server-only Laravel API origin. `NEXT_ADMIN_ORIGIN` is the exact URL origin of this Admin frontend, including its port. For local development, set the API origin to the approved development API and the Admin origin to the URL shown by `npm run dev`. Laravel must list that Admin host and port in `SANCTUM_STATEFUL_DOMAINS`. Set `ADMIN_SESSION_COOKIE` only if Laravel overrides its default `mosaiq-session` name. Do not put these values in `NEXT_PUBLIC_*`. `APP_ROOT_PREVIEW` only controls the `/` redirect.

## Run locally

```bash
npm run dev
```

Open the Admin URL configured in `NEXT_ADMIN_ORIGIN`. The root route redirects to `/login` by default. Protected routes require a valid Admin session and role.

## Quality commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Install the Playwright Chromium browser once before the first end-to-end run:

```bash
npm run test:e2e:install
```

All validation scripts are noninteractive. `npm run format` writes formatting changes; `npm run test:watch` starts the local Vitest watch mode.

## Source structure

```text
src/
|-- app/          # App Router routes, layouts, and route boundaries
|-- components/   # Project-owned UI, layout, and shared components
|-- config/       # Environment and route sources of truth
|-- features/     # Feature-owned modules added by delivery phase
|-- lib/          # Shared API, validation, and utility boundaries
|-- mocks/        # MSW browser/server setup and handlers
|-- providers/    # Focused React providers
|-- styles/       # Semantic design tokens
`-- test/         # Shared unit/component test setup
```

Route groups separate public authentication routes from application routes without adding segments to the URL. Route strings and builders live in `src/config/routes.ts`; there is no `/admin` URL prefix.

## Git workflow

- `main` contains production-ready, reviewed code.
- `develop` is the integration branch for completed work awaiting release.
- Use `feature/<short-description>` or `fix/<short-description>` branches.
- Use Conventional Commits.
