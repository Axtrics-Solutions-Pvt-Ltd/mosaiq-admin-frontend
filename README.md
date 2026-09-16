# MOSAIQ Admin Frontend

MOSAIQ Admin Frontend is the standalone administration interface for MOSAIQ. It will communicate with Laravel through an external JSON API and is planned as a Next.js App Router application with strict TypeScript, Tailwind CSS, and a feature-oriented `src/` layout.

The repository currently contains the approved product specifications and phased implementation plan. Application scaffolding begins in Phase 01; no runnable application or dependency manifest exists yet.

## Prerequisites

For the current documentation baseline:

- Git 2.42 or later
- A Markdown viewer or editor

For application development beginning with Phase 01:

- A currently supported Node.js LTS release
- The package manager selected by the committed lockfile once the app is scaffolded

## Setup

Clone the repository and enter the project directory:

```bash
git clone https://github.com/Axtrics-Solutions-Pvt-Ltd/mosaiq-admin-frontend.git
cd mosaiq-admin-frontend
git switch develop
```

No package installation is required for the current documentation baseline. After Phase 01 adds `package.json` and a lockfile, use the package manager and commands documented here by that phase.

Environment files are local and must not be committed. Copy the example when the application begins to require configuration:

```bash
cp .env.example .env.local
```

The example currently declares no required variables because API and authentication contracts have not been agreed. Add each validated variable to `.env.example` when introduced.

## Run locally

There is no local application server until Phase 01 scaffolds the Next.js application. Follow [`implementation-plan/PHASE-01-PROJECT-FOUNDATION.md`](implementation-plan/PHASE-01-PROJECT-FOUNDATION.md) for the foundation scope. The development, validation, test, and build commands will be documented here when their scripts exist in `package.json`.

## Repository structure

```text
.
|-- AGENTS.md
|-- MOSAIQ-Admin-Frontend-Screen-Spec.md
|-- MOSAIQ-Admin-UI-Engineering-Spec.md
|-- implementation-plan/
|   |-- README.md
|   `-- PHASE-01...12-*.md
|-- .env.example
|-- .gitignore
`-- README.md
```

- `AGENTS.md` defines repository-specific engineering conventions.
- `MOSAIQ-Admin-Frontend-Screen-Spec.md` defines product scope, routes, and screen behavior.
- `MOSAIQ-Admin-UI-Engineering-Spec.md` defines architecture, design, accessibility, testing, and security standards.
- `implementation-plan/` defines the approved delivery sequence and phase acceptance criteria.

The planned application structure uses `src/app`, `src/components`, `src/features`, `src/config`, `src/lib`, `src/mocks`, `src/providers`, `src/styles`, and `src/test`. These directories will be added during Phase 01 rather than created as empty placeholders.

## Git workflow

- `main` contains production-ready, reviewed code.
- `develop` is the integration branch for completed work awaiting a production release.
- Start each change from an up-to-date `develop` branch using `feature/<short-description>` or `fix/<short-description>`.
- Use Conventional Commits such as `feat: add authentication shell` or `fix: preserve filters in the URL`.
- Push the working branch and open a pull request into `develop`. Promote tested releases from `develop` to `main` through a separate pull request.
- Do not commit directly to `main`.
