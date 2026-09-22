# MOSAIQ Admin frontend — phased implementation plan

Status: approved planning direction, 16 September 2026. This folder plans the **separate Admin frontend** hosted on a dedicated domain such as `admin.mosiaq.com`. It does not implement the application or the Laravel API.

Read with [the screen specification](../MOSAIQ-Admin-Frontend-Screen-Spec.md) and [the UI engineering specification](../MOSAIQ-Admin-UI-Engineering-Spec.md). Those documents define the product and eventual engineering target. The decisions below refine their **delivery order**; where they conflict, update the source specifications before treating a visual prototype as production-complete.

## Confirmed direction

- Use routes such as `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/dashboard`, and `/agencies`. Do not add an `/admin` URL prefix; the Admin domain provides that separation. Authentication screens are outside the authenticated shell, not hidden because they are non-Admin.
- Include sign-up, sign-in, logout, forgot-password, and reset-password in the authentication phase. Logout is a shell/profile action, not a separate screen. Session-expired and protected-route states are also in scope.
- Build the complete **reviewable UI first**, using hardcoded sample content. No Laravel API is required to review layout, copy, navigation, responsive behavior, and visual states.
- A prototype control may open a local dialog, tab, or visual state, but must not imply it performed a real operation. List pagination, search, filter results, invitations, email delivery, CSV processing, persistence, and connector syncing do **not** need to work in the visual pass. Hide, disable, or label such controls as preview-only until implemented.
- After screen review, revise the UI as needed, then add typed frontend data contracts, MSW, actual interaction behavior, and Laravel API calls in a **separate integration workstream**. Do not wire screens directly to fixtures or API endpoints in a way that makes that transition expensive.
- Visual completion and functional completion are separate gates. A phase can be accepted as a UI prototype without satisfying the engineering specification's eventual functional definition of done.

## Roadmap

| Phase | Delivery | Prototype acceptance |
|---|---|---|
| [01](PHASE-01-PROJECT-FOUNDATION.md) | Project foundation | App runs; checks/build pass; routes and folders are ready |
| [02](PHASE-02-DESIGN-SYSTEM-AND-SHELL.md) | Design system and shell | Reusable visual language and responsive navigation approved |
| [03](PHASE-03-AUTHENTICATION.md) | Authentication | All five account actions have reviewable screens/states |
| [04](PHASE-04-DASHBOARD.md) | Dashboard | Aggregate and agency-scoped dashboard designs approved |
| [05](PHASE-05-AGENCY-MANAGEMENT.md) | Agencies | List, create, details, edit designs approved |
| [06](PHASE-06-WORKSPACE-MANAGEMENT.md) | Workspaces | List and six-section workspace detail designs approved |
| [07](PHASE-07-USERS-AND-ACCESS.md) | Users and roles | Invitation, assignment, and fixed-role designs approved |
| [08](PHASE-08-DATA-IMPORT.md) | Data import | CSV workflow and validation-state designs approved |
| [09](PHASE-09-IMPORTS-AND-CONNECTORS.md) | Import history and connectors | Operational history and honest connector-status designs approved |
| [10](PHASE-10-KPI-CURATION.md) | KPI/module curation | Configuration and availability-state designs approved |
| [11](PHASE-11-GOVERNANCE-AND-SETTINGS.md) | Governance/settings | Audit and basic-settings designs approved |
| [12](PHASE-12-REVIEW-AND-HANDOFF.md) | Cross-screen review and handoff | All routes, responsive layouts, and API-readiness inventory approved |

Sequence is 01 → 02 → 03 → 04–11 → 12. Once 02 is accepted, feature screens can be designed in a different order if product review requires it. Keep the shared shell and visual tokens stable enough to avoid screen-by-screen drift.

### Follow-up phases (after 01–12, functional not visual-prototype)

| Phase | Delivery | Acceptance |
|---|---|---|
| [13](PHASE-13-EXPANDED-DATA-IMPORT.md) | Expanded data import | Every backend-registered CSV type (client-portal work) uploadable from `/data-import`; creative-asset file attach flow working; import history reflects new types |
| [14](PHASE-14-SCOPE-AWARE-LIST-VIEWS.md) | Scope-aware list views | With header scope = All Agencies, Data Import/Import History/Workspaces/Users load open and unrestricted; with a specific agency selected, pages narrow and pre-fill to it |
| [15](PHASE-15-CLIENT-MANAGEMENT.md) | Client management | `/clients` list/create/detail/edit wired to the live `Client` API; workspace creation no longer dead-ends on a zero-client agency |
| [16](PHASE-16-ACCOUNT-SELF-SERVICE.md) | Account self-service | `/profile` edits the signed-in user's own name (agency-scoped roles) and changes their own password via the live `change-password` API; profile-menu "Component preview" replaced with real Edit profile / Change password actions |

## Delivery gates and working method

1. **Foundation gate:** scaffold the approved stack, configure scripts, and run dev server, typecheck, lint, test runner, and production build. Install dependencies only when Phase 01 starts, not merely because this plan exists.
2. **Visual gate per phase:** build each specified route with realistic static data, common states, responsive layouts, and enough local-only interactions to inspect tabs/drawers/dialogs. Share screenshots or a running preview; collect changes; update the design before moving on.
3. **No false functionality:** distinguish clickable navigation from working business operations. Use “Sample data”/“UI preview” indications. Never show a success toast for an email, upload, save, sync, or login that did not occur, except an explicitly labelled local demo simulation.
4. **Functional workstream, after visual sign-off:** agree API contracts and authentication model; introduce feature API functions, query keys, MSW handlers, validation, URL-backed filters/pagination, mutation state, permissions, and Laravel calls. Re-run the full engineering-spec definition of done per feature then.

## Prototype standard for every screen

- Use approved semantic blue SaaS tokens and shared components; do not invent a separate style per page.
- Cover desktop, tablet, 390px mobile, and 320px overflow checks; include keyboard focus and semantic labels.
- Show representative populated, empty, loading, error, permission, and success **designs** where relevant. These may be preview states rather than fully wired flows.
- Keep stable sample IDs and realistic multi-agency relationships. Put sample content behind feature-level view-model modules or a future adapter boundary; route components should not be tied to raw fixture collections.
- Use clear URLs for list, new, detail, and edit pages. Navigation between routes should work even while data operations do not.
- Record decisions and unresolved backend dependencies in the phase handoff; do not guess that a live API capability exists.

## Decisions still needed before functional integration

The UI can proceed now. Before implementing authentication or API behavior, confirm: whether sign-up is invite-only or open registration (recommend **invite-only** for Admin accounts); password-reset delivery and token contract; session/cookie/CSRF behavior; authorization/capability payload; API endpoint and pagination/filter contracts; upload size/template/processing contract; and whether the existing client frontend exposes a safe preview URL. The visual prototypes should avoid promising a behavior before those contracts exist.

## Source-spec reconciliation

The screen specification currently lists Forgot Password and Reset Password as future/hidden concepts, and does not include Sign-up. The user's confirmed scope overrides that exclusion for this plan. Before coding Phase 03, revise the source screen specification's scope, route map, and completion checklist to include these public authentication routes. The engineering specification describes MSW and working interactions as final requirements; they belong to the later functional workstream, not to visual prototype acceptance.
