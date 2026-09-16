# MOSAIQ Admin Frontend — UI Engineering and Design System Specification

## 1. Purpose and authority

This document is the implementation contract for the MOSAIQ Admin frontend. It defines the frontend technology, route organization, visual system, component boundaries, state ownership, frontend data access, naming standards, accessibility, testing, and definition of done.

This is a **UI-side document only**. It does not define Laravel controllers, database tables, migrations, queues, infrastructure, or backend authorization implementation. Laravel is treated only as an external JSON API consumed by the frontend.

Read this document together with [`MOSAIQ-Admin-Frontend-Screen-Spec.md`](./MOSAIQ-Admin-Frontend-Screen-Spec.md):

- The screen specification defines **what the product must display and allow a user to do**.
- This document defines **how the frontend must be structured and implemented**.

If a visual or behavioral requirement conflicts, the screen specification controls product scope and this document controls frontend engineering conventions. Any genuine contradiction must be resolved in the documents rather than silently handled differently in code.

## 2. Approved frontend decisions

### 2.1 Technology stack

| Concern | Approved choice | Frontend responsibility |
|---|---|---|
| Application framework | Next.js App Router | Routing, layouts, page delivery, loading and error boundaries |
| UI language | React with strict TypeScript | Components, interactions, and type-safe UI contracts |
| Styling | Tailwind CSS with semantic CSS variables | Layout, responsive rules, and token-driven styling |
| UI primitives | shadcn/ui components customized for MOSAIQ | Accessible primitives owned by the project |
| Remote/server state | TanStack Query | Laravel API fetching, caching, mutation state, and invalidation |
| Data tables | TanStack Table | Headless sorting, filtering, pagination, selection, and column behavior |
| Forms | React Hook Form | Performant form state and field registration |
| Validation | Zod | Frontend form and external-data validation |
| Charts | Recharts | Dashboard and operational data visualization |
| Icons | Lucide React | Consistent interface iconography |
| Mock API behavior | Mock Service Worker (MSW) | Browser-level mock requests using production-shaped contracts |
| Unit/component tests | Vitest and React Testing Library | Logic and user-visible component behavior |
| End-to-end tests | Playwright | Critical route and workflow verification |
| Component workshop | Storybook, schedule permitting | Isolated shared-component states and visual review |

Package versions must be pinned by the lockfile when the application is scaffolded. Do not copy version numbers from planning documents into source code.

### 2.2 Architectural position

The Admin application is a separate frontend. It must not import code from the Laravel repository or connect directly to a database.

```text
Admin page/component
        |
        v
Feature query or mutation hook
        |
        v
Typed frontend API client
        |
        +----> MSW mock handler during mock development
        |
        +----> Laravel JSON API when remote mode is enabled
```

The frontend owns presentation and interaction behavior. Laravel remains the authority for authentication, authorization, validation, persistence, and business rules. Hiding or disabling a frontend control is a usability behavior and must never be described as security enforcement.

### 2.3 Rendering approach

Use Next.js App Router layouts and route files. Default to Server Components for static layout composition when they do not require browser state. Add `"use client"` only at the smallest interactive boundary that needs hooks, event handlers, context, browser APIs, or TanStack Query.

Do not mark an entire route tree as client-rendered merely because one child contains a table or form. Do not force Server Components into highly interactive Admin features when doing so makes state and authentication handling harder to understand.

The initial application is an authenticated, application-style interface rather than a search-indexed content site. Correct behavior, maintainability, and predictable data refresh are more important than public-page SEO.

## 3. Product vocabulary

Use these terms consistently in UI copy, component names, types, fixtures, tests, and documentation:

| Term | Meaning |
|---|---|
| Agency | An organization managing one or more client workspaces |
| Workspace | A client environment belonging to an agency |
| Internal user | A platform, agency, manager, or analyst user |
| Client user | A user limited to explicitly assigned workspaces |
| Dataset | A reporting, Marketing Intelligence, or MMM data collection |
| Import batch | One attempted dataset import and its processing result |
| Connector | A current or planned source through which data may be provided |

Use **Workspace** as the canonical entity name. Use “Client workspace” in explanatory page copy only when the audience benefits from the clarification. Do not use `client`, `account`, and `workspace` interchangeably in code.

## 4. Route and layout architecture

The 14 items in the screen specification are conceptual screen groups, not a restriction on URL count. Create, details, and edit modes must use clear URLs so pages are refresh-safe, linkable, and testable.

### 4.1 Recommended route map

```text
/
├── login
└── admin
    ├── dashboard
    ├── agencies
    │   ├── new
    │   └── [agencyId]
    │       └── edit
    ├── workspaces
    │   ├── new
    │   └── [workspaceId]
    │       └── edit
    ├── users
    │   ├── invite
    │   └── [userId]
    │       └── edit
    ├── roles
    ├── data-import
    ├── import-history
    ├── connectors
    ├── curation
    └── governance
```

The implementation may omit the `/admin` URL prefix if the Admin frontend has its own dedicated domain. The folder grouping must still clearly separate authenticated application routes from authentication routes.

### 4.2 Route-group layout

Recommended App Router shape:

```text
src/app/
├── (auth)/
│   └── login/page.tsx
├── (admin)/
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   ├── dashboard/page.tsx
│   ├── agencies/...
│   ├── workspaces/...
│   └── governance/page.tsx
├── forbidden/page.tsx
├── not-found.tsx
└── globals.css
```

The authenticated layout owns the Admin shell, navigation, top bar, providers, page content region, and global overlays. Individual pages must not recreate the shell.

### 4.3 Route-state rules

Store shareable operational state in the URL:

- Search text after a short debounce.
- Filters.
- Sort column and direction.
- Pagination page and page size.
- Active tab when linking to the tab is useful.
- Selected agency or workspace when it defines the page result set.

Example:

```text
/import-history?agency=agency_01&status=failed&page=2&sort=-uploadedAt
```

Do not store passwords, invitation messages, file contents, personally sensitive values, or large form drafts in URL parameters.

## 5. Source organization

Use a feature-oriented source tree:

```text
src/
├── app/                         # Routes, layouts, route boundaries
├── components/
│   ├── ui/                      # Primitive components
│   ├── layout/                  # Application shell components
│   └── shared/                  # Cross-feature UI patterns
├── features/
│   ├── agencies/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── schemas/
│   │   ├── types/
│   │   ├── utils/
│   │   └── constants.ts
│   ├── workspaces/
│   ├── users/
│   ├── roles/
│   ├── imports/
│   ├── connectors/
│   ├── curation/
│   └── governance/
├── config/
│   ├── env.ts
│   ├── navigation.ts
│   ├── permissions.ts
│   └── routes.ts
├── lib/
│   ├── api/
│   ├── auth/
│   ├── query/
│   ├── validation/
│   └── utils/
├── mocks/
│   ├── fixtures/
│   ├── handlers/
│   └── browser.ts
├── providers/
├── styles/
│   └── tokens.css
└── test/
```

### 5.1 Dependency direction

Allowed direction:

```text
app → features → shared components → UI primitives
                 ↓
              lib/config
```

Rules:

- UI primitives must not import feature code.
- Shared components must not know about a specific route.
- One feature must not reach into another feature's internal folders.
- Cross-feature behavior must move to a shared, explicitly named module.
- Route files compose features; they do not contain large business workflows.
- Avoid circular dependencies and convenience imports that violate ownership.

Each feature may expose a small public API through its root `index.ts`. Avoid deep barrel-file chains because they obscure dependencies and can create cycles.

## 6. Component architecture

### 6.1 Component levels

| Level | Location | Examples | Business knowledge |
|---|---|---|---|
| Primitive | `components/ui` | Button, Input, Dialog, Tabs, Badge | None |
| Layout | `components/layout` | AdminShell, Sidebar, TopBar | Application layout only |
| Shared pattern | `components/shared` | PageHeader, DataTable, FilterBar, EmptyState | Generic UI behavior |
| Domain | `features/*/components` | AgencyStatusBadge, WorkspaceSelector | One domain concept |
| Feature | `features/*/components` | AgencyForm, ImportValidationPanel | One workflow or use case |
| Route composition | `app/**/page.tsx` | AgenciesPage | Route assembly only |

### 6.2 Composition rules

- Prefer small composable components with clear props over configuration-heavy universal components.
- Do not create a generic `EntityForm`, `EntityTable`, or `EntityDetails` that switches behavior through dozens of flags.
- Extract repeated structure when it represents a stable concept, not merely because two blocks currently look similar.
- A component should own one understandable responsibility.
- Keep data fetching outside purely visual components.
- Pass semantic props such as `status="failed"`, not presentation props such as `badgeColor="red"`.
- Prefer children, slots, and focused variants over booleans that create many hidden component modes.
- Keep feature-specific column definitions beside the feature, not in the generic DataTable.
- Shared components must include their loading, disabled, focus, error, and empty behaviors where relevant.

### 6.3 Required shared components

#### Application structure

- `AdminShell`
- `SidebarNavigation`
- `MobileNavigationDrawer`
- `TopBar`
- `Breadcrumbs`
- `ProfileMenu`
- `AgencyScopeSelector`
- `WorkspaceScopeSelector`
- `DemoDataIndicator`

#### Page composition

- `PageHeader`
- `PageSection`
- `MetricCard`
- `ChartCard`
- `InfoCard`
- `ResponsiveGrid`
- `DetailList`
- `ActivityTimeline`

#### Operational data

- `DataTable`
- `TableToolbar`
- `FilterBar`
- `FilterDrawer`
- `ActiveFilterChips`
- `PaginationControls`
- `ColumnVisibilityMenu`
- `RowActionsMenu`
- `TableSkeleton`

#### Feedback and state

- `StatusBadge`
- `EmptyState`
- `NoResultsState`
- `ErrorState`
- `PermissionState`
- `LoadingSkeleton`
- `ConfirmDialog`
- `DetailDrawer`
- `UnsavedChangesDialog`
- `ToastProvider`

#### Forms

- `FormField`
- `FormSection`
- `FormActions`
- `SearchCombobox`
- `MultiSelect`
- `DateRangePicker`
- `FileDropzone`
- `LogoUploader`
- `FormErrorSummary`

## 7. Constants and single sources of truth

“Keep constants in one place” means one authoritative place **per concern**, not one application-wide file containing unrelated values.

Use:

```text
config/routes.ts                    # Route builders
config/navigation.ts                # Sidebar grouping and labels
config/permissions.ts               # Frontend capability identifiers
features/users/constants.ts         # Roles and user statuses
features/imports/constants.ts       # Dataset/import options
features/connectors/constants.ts    # Provider presentation metadata
styles/tokens.css                   # Visual tokens
```

Rules:

- Never repeat route strings throughout components.
- Route builders accept IDs and encode them correctly.
- Never repeat role, status, dataset-type, or connector identifiers.
- Keep display labels separate from stable identifiers.
- Do not use server-provided text as a CSS class name.
- Do not move a value to global configuration when it is private to one component.
- Environment values are read and validated in `config/env.ts`, never scattered through components.
- Status-to-icon and status-to-tone mappings have one typed source of truth.

## 8. Frontend data and state management

### 8.1 State categories

| State type | Owner | Examples |
|---|---|---|
| Remote/server state | TanStack Query | Agencies, users, workspaces, import history |
| URL state | Next.js URL/search parameters | Filters, page, sorting, active operational tab |
| Form state | React Hook Form | Create/edit values and validation |
| Global UI context | Focused React providers | Signed-in user, selected global scope |
| Local component state | `useState` or reducer | Drawer visibility, temporary disclosure |
| Mock persistence | Mock data layer | Session/demo changes when mock mode is active |

Do not place all of these categories in one global store. Do not copy TanStack Query results into Context or Zustand simply to make them globally accessible.

### 8.2 TanStack Query conventions

TanStack Query is frontend-only. It manages the lifecycle of requests to the Laravel API or MSW mock handlers.

Every feature must define stable query keys using a query-key factory:

```ts
export const agencyKeys = {
  all: ["agencies"] as const,
  lists: () => [...agencyKeys.all, "list"] as const,
  list: (filters: AgencyFilters) => [...agencyKeys.lists(), filters] as const,
  details: () => [...agencyKeys.all, "detail"] as const,
  detail: (id: string) => [...agencyKeys.details(), id] as const,
};
```

Rules:

- Query functions live in the feature API layer, not in components.
- Query keys include every value that changes the response.
- Mutations invalidate or update only the affected query families.
- Do not retry validation, authentication, authorization, or not-found failures automatically.
- Avoid aggressive background refresh for stable Admin configuration data.
- Preserve prior table data while safe page/filter requests are loading.
- Show a first-load skeleton, a subtle refresh indicator for background refetch, and an actionable error state for failures.
- Do not optimistically apply destructive or permission-sensitive mutations unless rollback behavior is explicit and tested.

### 8.3 API client boundary

Provide one configured frontend HTTP client responsible for:

- Base URL resolution from validated environment configuration.
- JSON request and response handling.
- Credentials/cookie options required by the approved authentication flow.
- CSRF initialization where required by the API contract.
- Request cancellation.
- Normalized API errors.
- Correlation/request ID capture when provided.

Components must not call `fetch` or Axios directly. Feature functions such as `listAgencies`, `getWorkspace`, and `updateUser` call the shared client.

Do not place secret credentials or private keys in `NEXT_PUBLIC_*` variables. Anything exposed to the browser is public.

### 8.4 Frontend contract types

Prefer generated TypeScript types from the approved OpenAPI contract when that contract is available. Keep UI view models separate where the interface needs derived or presentation-specific values.

```text
API DTO → validation/normalization → UI model → component
```

Do not expose raw, unstable API response shapes throughout the component tree. Do not duplicate the same manually written API type in several features.

### 8.5 Mock mode

MSW must intercept the same request paths used for the Laravel API. Pages and components must not import mock fixtures directly.

Mock behavior must cover:

- Successful list and detail requests.
- Create and edit mutations.
- Validation errors.
- Unauthorized and forbidden presentation.
- Not found.
- Recoverable service failure.
- Loading delay where needed to verify skeletons.
- Empty and no-results collections.
- Healthy, warning, failed, inactive, and processing entities.

Use stable IDs. Reset Demo Data restores the initial fixture state without requiring the screen components to understand fixture storage.

## 9. Forms and validation

### 9.1 Form construction

- Use React Hook Form for create/edit forms.
- Use one Zod schema as the frontend validation source for a form mode where possible.
- Infer TypeScript form-value types from the schema instead of manually duplicating them.
- Map API field errors to the corresponding fields.
- Place non-field errors in an error summary or page-level alert.
- Keep labels visible; placeholders do not replace labels.
- Mark optional fields explicitly when ambiguity exists.
- Use descriptions for consequences, not to repeat the label.
- Disable repeated submission while a mutation is pending.
- Preserve entered values after a recoverable submission failure.
- Move focus to the first invalid field or error summary after failed submission.

### 9.2 Create, details, and edit modes

Share schemas, field groups, and presentation components without forcing every mode into one oversized conditional component.

- Details mode presents semantic read-only content, not disabled inputs everywhere.
- Edit mode initializes from normalized detail data.
- Create mode uses explicit defaults.
- Cancel returns to the logical parent and does not silently save.
- Dirty forms trigger an unsaved-changes warning for route changes and relevant browser exit behavior.
- Success feedback states what changed and where the user is being taken.

### 9.3 Destructive and consequential actions

Deactivate, remove assignment, replace dataset, reset configuration, and similar actions require a confirmation dialog that includes:

- The affected entity name.
- The consequence.
- A specific action label such as `Deactivate agency`.
- A safe cancel action.
- Pending and error states.

Do not use `window.confirm`.

## 10. Data tables and filters

All operational tables must use the shared DataTable foundation while keeping columns and domain actions inside the owning feature.

### 10.1 Standard table behavior

- Stable row keys from entity IDs, never array indexes.
- Sort indicators with accessible labels.
- Server-compatible pagination and filtering contracts.
- Page-size choices constrained to approved values.
- Column visibility with essential columns protected when necessary.
- Row action menus with entity-specific accessible names.
- Skeleton rows matching the approximate final column structure.
- Distinct empty collection and no-filter-results states.
- Horizontal overflow only when a card representation would lose critical meaning.
- Sticky headers only where the table height and page layout justify them.
- Numeric columns use tabular numerals and right alignment when appropriate.
- Dates use one application formatter and expose an exact value where relative text is shown.

### 10.2 Filters

- Desktop filters appear in the table toolbar when space allows.
- Smaller screens use a full-width filter drawer.
- Active filters are visible as removable chips.
- `Clear all` appears only when filters are active.
- Filter values are reflected in the URL.
- Changing a result-affecting filter returns pagination to page one.
- Search is debounced and does not send a request for every keystroke.
- Agency changes clear workspace selections that are no longer valid, following the confirmation behavior in the screen specification.

### 10.3 Responsive table behavior

Use one of three explicit strategies per table:

1. Hide nonessential columns and retain a compact table.
2. Allow controlled horizontal scrolling with the primary identity column kept visible where practical.
3. Render a designed record-card list on mobile.

Do not automatically convert every table to generic stacked cards. Choose the strategy based on comparison needs and task efficiency.

## 11. Design system

### 11.1 Visual direction

MOSAIQ Admin uses a modern, professional blue SaaS visual language:

- Cool blue-gray application canvas.
- White working surfaces.
- Confident blue primary actions.
- Navy headings and high-value metrics.
- Restrained indigo, cyan, teal, amber, and purple chart accents.
- Fine borders and minimal elevation.
- Compact geometry appropriate for operational work.
- Limited gradients, reserved primarily for login or sparse brand moments.
- No strong glass effects, neon colors, heavy shadows, or excessive pill shapes.

The initial release uses a polished light theme. Tokens must be semantic so a dark theme can be introduced later without changing component APIs. Do not build or expose a nonfunctional theme switcher.

### 11.2 Core color tokens

The final implementation must verify WCAG contrast in actual component combinations. These values define the starting palette:

| Semantic token | Value | Use |
|---|---:|---|
| `brand-primary` | `#2563EB` | Primary buttons, active navigation, selected controls |
| `brand-primary-hover` | `#1D4ED8` | Hover/pressed emphasis |
| `brand-primary-soft` | `#EFF6FF` | Selected rows, chips, subtle active backgrounds |
| `brand-indigo` | `#4F46E5` | Secondary chart and selected-state accent |
| `canvas` | `#F6F8FC` | Main application background |
| `surface` | `#FFFFFF` | Cards, forms, menus, drawers |
| `surface-subtle` | `#F8FAFC` | Subsections and quiet grouped regions |
| `border` | `#E2E8F0` | Standard borders |
| `border-strong` | `#CBD5E1` | Strong boundaries and control hover |
| `text-strong` | `#0F172A` | Page titles and primary content |
| `text` | `#334155` | Body content |
| `text-muted` | `#64748B` | Supporting metadata |
| `success` | `#15803D` | Successful and healthy states |
| `warning` | `#B45309` | Attention and partial states |
| `danger` | `#B91C1C` | Error, failed, and destructive states |
| `info` | `#0369A1` | Informational state distinct from selection |

Components use semantic tokens such as `background`, `foreground`, `primary`, `muted`, `border`, and `destructive`. They must not scatter raw hex values through JSX.

### 11.3 Typography

- Use Geist Sans as the default interface font unless an approved MOSAIQ brand font is supplied.
- Provide system fallbacks.
- Body text defaults to 14px or 15px with comfortable line height.
- Page titles remain compact rather than marketing-sized.
- Use 600 weight for most headings and 500 for control emphasis.
- Use tabular numerals for metric cards and aligned numeric table columns.
- Avoid uppercase paragraphs and labels. Uppercase is limited to short eyebrows where letter spacing supports readability.

Suggested scale:

| Role | Size | Line height | Weight |
|---|---:|---:|---:|
| Page title | 28px | 36px | 650/700 |
| Section title | 20px | 28px | 600 |
| Card title | 16px | 24px | 600 |
| Body | 14px | 22px | 400 |
| Small/metadata | 12px | 18px | 400/500 |
| Metric value | 28–32px | 36–40px | 650/700 |

### 11.4 Spacing, sizing, and density

- Base spacing unit: 4px.
- Standard layout rhythm: 8px multiples.
- Page horizontal padding: 24px desktop, 20px tablet, 16px mobile.
- Page section gap: 24px desktop and 20px smaller screens.
- Card padding: 20–24px desktop, 16px mobile.
- Standard control height: 40px.
- Compact table control height: 36px where accessibility is retained.
- Minimum touch target: 44×44px on touch layouts, using invisible padding where needed.
- Page content uses a consistent maximum width only where very wide lines reduce usability; operational tables may use the available width.

### 11.5 Radius, border, and elevation

- Inputs and controls: 8–10px radius.
- Cards: 12px radius.
- Dialogs and drawers: 14–16px radius where the viewport allows.
- Pills are reserved for badges, chips, and compact segmented controls.
- Cards use a border by default.
- Shadows are subtle and reserved for overlays, floating menus, and selected elevated surfaces.
- Nested cards must not create multiple unnecessary layers of borders and shadows.

### 11.6 Iconography

- Use Lucide icons consistently.
- Default sizes: 16px inside compact controls, 18–20px in navigation, and 20–24px for empty-state support.
- Icons supplement labels; they do not replace unfamiliar action text.
- Icon-only buttons require an accessible name and tooltip where the action is not immediately obvious.
- Do not mix unrelated icon families.

### 11.7 Motion

- Use motion to clarify state changes, not decorate routine navigation.
- Standard transitions should generally complete in 120–200ms.
- Drawers may use a slightly longer restrained transition.
- Avoid animating large layout dimensions when opacity/transform communicates the change.
- Respect `prefers-reduced-motion` and remove nonessential motion.
- Never delay an operation to make an animation visible.

## 12. Shared pattern specifications

### 12.1 Page header

Every route uses the shared PageHeader and supports:

- Title.
- One-sentence description.
- Breadcrumbs when hierarchy is useful.
- Agency/workspace context.
- One primary action.
- Optional secondary actions.
- Optional status/demo badge.

On mobile, actions wrap below the title without overlapping or becoming icon-only without reason.

### 12.2 Status badge

StatusBadge accepts a stable status identifier and derives label, tone, icon, and accessible text from one mapping. Status is never indicated by color alone.

Required families include:

- Active / inactive.
- Invited / pending.
- Seeded / imported.
- Planned / unavailable.
- Processing / completed.
- Warning / failed.

Feature code may extend the mapping through typed domain configuration but must not recreate arbitrary badge colors on each page.

### 12.3 Drawers and dialogs

- Use a drawer for supplementary detail that preserves list context.
- Use a dialog for a focused decision or short task.
- Use a full page for complex create/edit workflows.
- Trap focus inside open overlays.
- Restore focus to the trigger after close.
- Escape closes only when doing so cannot discard an active consequential operation.
- The close control must have a clear accessible name.
- Long drawers keep their header and footer actions available without covering content.

### 12.4 Toasts

- Toasts confirm transient outcomes; they do not carry the only copy of critical error information.
- Success messages name the affected entity or action.
- Validation errors remain near the form.
- Persistent or blocking errors use inline alerts or ErrorState.
- Avoid multiple toasts for one operation.
- Do not report a simulated or mock operation as permanently completed without a Demo data indication.

### 12.5 Empty, no-results, and error states

These states are distinct:

- **Empty:** No entities exist yet; provide an onboarding action where permitted.
- **No results:** Entities exist but current search/filters match none; offer clear filters.
- **Permission:** The user cannot view or perform the action; explain without exposing sensitive information.
- **Recoverable error:** Explain the failure and offer retry.
- **Unavailable:** The feature or source is intentionally not available.

Do not show a blank table with only a dash.

## 13. Navigation and scope behavior

### 13.1 Sidebar

- Desktop: persistent, collapsible, and keyboard accessible.
- Collapsed state keeps recognizable icons and tooltips.
- Active state uses primary-soft background, primary icon, and strong text.
- Related destinations use restrained section labels.
- Sidebar scrolls independently when viewport height is limited.
- Collapse preference may persist locally as a UI preference.

### 13.2 Mobile navigation

- Convert the sidebar to a modal navigation drawer.
- Close after successful navigation.
- Lock background scroll while open.
- Keep the current destination clear.
- Do not render desktop and mobile navigation as two separately maintained menu definitions; both consume `config/navigation.ts`.

### 13.3 Agency and workspace scope

- Agency selection changes the data scope for applicable screens.
- Workspace options are constrained by the selected agency.
- A scope change that would discard dirty form state or incompatible workspace selections requires confirmation.
- The current scope remains visible in the top bar and relevant page headers.
- An `All agencies` option appears only on pages and for roles where aggregate access makes sense.
- Invalid scope IDs from URLs recover to an explanatory state rather than silently showing unrelated data.

## 14. Charts and metrics

- Use blue for the primary series.
- Secondary series use the controlled chart palette; do not assign random colors.
- Provide chart titles, legends where needed, tooltips, and a textual summary.
- Never rely on red/green alone for comparison.
- Use consistent number, currency, percentage, and date formatters.
- Start quantitative axes at zero when truncation would mislead.
- Clearly distinguish no data from zero.
- Skeletons approximate the final chart area to prevent layout shift.
- Charts must resize with their container and remain legible at supported widths.
- Decorative animation is disabled under reduced-motion preferences.

## 15. Responsive layout

The application is desktop-first but fully usable at smaller widths.

Recommended layout breakpoints must be expressed through shared design tokens rather than copied arbitrary values. Validate at minimum:

- 1440px desktop.
- 1280px laptop.
- 1024px tablet landscape.
- 768px tablet portrait.
- 390px mobile.
- 320px narrow mobile for overflow defects.

Behavior:

- Desktop uses the persistent sidebar and multi-column dashboard.
- Tablet reduces card columns, prioritizes table columns, and allows the sidebar to collapse.
- Mobile uses a navigation drawer, single-column forms/cards, and a filter drawer.
- Primary actions remain reachable but must not cover form or table content.
- Dialogs become near-full-screen sheets where required for usable content width.
- Forms use one column on mobile; paired fields are allowed only when both remain readable.
- Never solve overflow by applying `overflow-x: hidden` to the whole application.

## 16. Accessibility

Target WCAG 2.2 AA for new frontend work.

Required practices:

- Use semantic HTML before adding ARIA.
- All controls are keyboard operable.
- Focus is visible against every surface.
- Heading order reflects page structure.
- Form controls have programmatic labels and associated errors.
- Required and invalid state is announced correctly.
- Dialogs, drawers, menus, tabs, comboboxes, and tooltips follow established accessible interaction patterns.
- Tables have meaningful headers and captions or accessible names.
- Status never relies on color alone.
- Muted text and status treatments meet contrast requirements.
- Dynamic success/error feedback uses an appropriate live region without excessive announcements.
- Route changes move focus to the page heading or main content using a consistent strategy.
- Skip navigation is provided for keyboard users.
- Touch targets remain usable on small screens.
- Reduced-motion preferences are honored.
- Accessible names include context, such as `Edit Acme Agency`, rather than `Edit` repeated in every row.

Accessibility is verified during component implementation, not postponed to final QA.

## 17. Frontend permission presentation

Use typed capability identifiers for presentation decisions, for example:

```text
agencies.view
agencies.manage
workspaces.manage
users.invite
imports.create
curation.manage
settings.manage
audit.view
```

Rules:

- Route navigation hides destinations the current UI session cannot access.
- Direct navigation displays a designed forbidden state when appropriate.
- Controls are hidden when the action is irrelevant and disabled with an explanation when seeing the unavailable action helps understanding.
- Permission checks are centralized through a hook or component, not repeated string comparisons.
- The frontend must still handle `401` and `403` responses because UI presentation is not authorization enforcement.
- Roles & Permissions remains read-only as required by the screen specification.

## 18. Error handling

Normalize external failures to a frontend error shape containing, where available:

- Stable category/code.
- Safe user-facing message.
- Field errors.
- HTTP status.
- Request/correlation ID.
- Whether retry is reasonable.

Presentation rules:

- `401`: begin the agreed signed-out/session-expired experience.
- `403`: show the forbidden state without implying the resource does not exist unless required by the API contract.
- `404`: show feature-appropriate not found UI.
- `422`: attach field errors and show a form summary.
- `429`: explain that requests are temporarily limited and prevent repeated immediate submission.
- `5xx` or network failure: preserve user input and offer retry where safe.

Never display raw stack traces, HTML error bodies, internal exception names, or secrets in the UI.

## 19. Coding standards

### 19.1 TypeScript

- Enable strict TypeScript settings.
- Avoid `any`; use `unknown` at untrusted boundaries and narrow it.
- Use discriminated unions for meaningful UI states.
- Prefer literal unions or enums generated from contracts for stable identifiers.
- Do not duplicate a type that can be inferred from a Zod schema or generated contract.
- Type component props explicitly and keep public props minimal.
- Handle nullable and optional fields deliberately.

### 19.2 React

- Components and hooks use named exports except where Next.js requires a default route export.
- Hooks begin with `use` and represent one clear behavior.
- Do not use effects for values that can be derived during render.
- Do not suppress hook dependency warnings to force behavior.
- Keep state as close as possible to its owner.
- Avoid prop drilling through many layers; use focused composition or context, not a universal app context.
- Memoization is driven by measured need or stable library contracts, not added everywhere automatically.
- Never use array indexes as keys for mutable collections.

### 19.3 Naming

- Components: `PascalCase`.
- Hooks/functions/variables: `camelCase`.
- Constants: descriptive `camelCase` objects; reserve `SCREAMING_SNAKE_CASE` for true environment/build constants.
- Files: use one consistent convention within a category. Component filenames may use `PascalCase.tsx`; route folders follow Next.js conventions.
- Boolean names begin with `is`, `has`, `can`, or `should`.
- Event handlers describe outcomes, such as `handleAgencyChange`.
- Avoid vague names such as `data`, `item`, `helper`, `common`, or `utils2` when a domain name is available.

### 19.4 Styling

- Use semantic token utilities and variants.
- Use the shared class-merging helper for conditional classes.
- Use a variant utility for controlled component variants where appropriate.
- Do not construct Tailwind class names dynamically from untrusted or incomplete strings.
- Do not use inline styles except for genuinely dynamic values such as chart coordinates or CSS custom properties.
- Do not repeat long class lists when they represent a reusable component pattern.
- Avoid arbitrary pixel values unless required by a documented visual case.

### 19.5 Functions and utilities

- Prefer pure functions for formatting, mapping, filtering, and calculations.
- Format currency, numbers, dates, and percentages through shared locale-aware formatters.
- A function name states its intent and result.
- Utilities remain domain-local until more than one feature has a real use for them.
- Avoid a dumping-ground `helpers.ts` file.
- Side effects belong in event handlers, mutations, or explicit service functions.

### 19.6 Comments and documentation

- Comments explain constraints or decisions, not syntax visible from the code.
- Public shared components with non-obvious contracts include concise usage documentation or Storybook stories.
- Temporary workarounds include the reason and removal condition.
- Do not leave commented-out implementation in committed source.

## 20. Quality and testing strategy

### 20.1 Unit tests

Test logic with meaningful branching:

- Formatters and parsers.
- Filter serialization.
- Status mappings.
- Permission presentation helpers.
- CSV preview/readiness calculations implemented in the frontend.
- Reducers and state transitions.

Do not write low-value tests that only repeat TypeScript or assert static constants without behavior.

### 20.2 Component and integration tests

Use Testing Library and MSW to test behavior from the user's perspective:

- Loading to success.
- Empty and no-results states.
- Recoverable failures and retry.
- Form validation and API field errors.
- Table filtering, sorting, and pagination.
- Drawer/dialog focus and keyboard behavior.
- Agency/workspace scope changes.
- Mutation success followed by refreshed UI.
- Permission-based control presentation.

Prefer role- and label-based queries. Avoid tests coupled to class names or internal component state.

### 20.3 End-to-end tests

At minimum cover:

1. Login and arrival at the dashboard.
2. Switch agency and verify scoped content changes.
3. Create or edit an agency.
4. Create or edit a workspace and module settings.
5. Invite/edit a user and assign workspaces.
6. Complete the mock CSV import validation flow.
7. Inspect and act on an import-history record.
8. Change and save KPI/module curation.
9. Filter the audit log and open event details.
10. Verify one forbidden route/control case.

Run critical flows at desktop and at least one mobile viewport.

### 20.4 Visual and accessibility review

- Shared components include stories for important variants if Storybook is enabled.
- Review screenshots at the standard responsive widths.
- Run automated accessibility checks as a baseline.
- Perform keyboard-only checks for every new complex control.
- Automated checks supplement rather than replace manual accessibility review.

## 21. Performance and UX requirements

- Avoid fetching data that the current screen does not display.
- Use route- or feature-level code splitting for heavy charts and CSV tooling where beneficial.
- Keep filter input responsive during table updates.
- Debounce remote text search.
- Cancel or ignore obsolete requests after rapid scope/filter changes.
- Prevent visible layout shift by sizing skeletons and chart containers.
- Paginate large operational datasets; do not render an unbounded result collection.
- Consider row virtualization only after pagination/design requirements show a real need.
- Lazy-load drawer detail data when opening the drawer is the first need for it.
- Do not introduce loading delays in production; simulated delays belong to mock/test configuration.
- Use optimized image handling for agency/workspace logos while preserving correct aspect ratio and fallbacks.

Performance changes must not remove accessible labels, useful error messages, or stable UI state.

## 22. Security-conscious frontend rules

These are frontend hygiene requirements, not replacements for server security:

- Never store passwords, access tokens, secret keys, or connector credentials in fixtures, local storage, source, or logs.
- Do not render unsanitized HTML from API or CSV values.
- Do not use `dangerouslySetInnerHTML` without an approved, documented sanitization need.
- Validate uploaded file extension, size, and basic structure for immediate user feedback while treating server validation as authoritative.
- Avoid logging personal data or complete API payloads in production.
- Clear sensitive in-memory form values after successful completion or sign-out where appropriate.
- External links use safe target/rel behavior.
- Public browser environment variables are assumed visible to every user.

## 23. Linting, formatting, and review gates

The project must configure:

- Next.js/React/TypeScript ESLint rules.
- Import ordering and unused-import detection.
- Formatting through one agreed formatter.
- Type checking independent of the production build.
- Tests runnable in CI/noninteractive mode.
- A production build command.

A change is not ready for review when it introduces:

- Type errors.
- Lint errors.
- Unhandled loading/error states.
- Duplicated constants or API calls.
- Inaccessible unlabeled controls.
- Raw colors outside the token system without justification.
- Fixture imports in page components.
- New shared-component behavior without verification.

## 24. Feature implementation pattern

Each feature should follow this flow:

```text
Route page
  → feature screen component
    → query/mutation hook
      → feature API function
        → shared HTTP client

Feature screen component
  → shared layout/pattern components
    → UI primitives
```

Example agency feature responsibilities:

```text
features/agencies/
├── api/agencies.api.ts             # list/get/create/update calls
├── api/agencies.keys.ts            # TanStack Query key factory
├── components/AgencyForm.tsx
├── components/AgencyTable.tsx
├── components/AgencyStatusBadge.tsx
├── hooks/useAgencies.ts
├── hooks/useAgencyMutations.ts
├── schemas/agency.schema.ts
├── types/agency.types.ts
├── utils/mapAgencyDto.ts
└── constants.ts
```

Do not require every feature to contain every folder. Create a folder only when the feature has that responsibility.

## 25. Prohibited patterns

The following patterns are not allowed without an explicitly documented exception:

- One giant application-wide `constants.ts`.
- One giant `types.ts` for unrelated domains.
- API requests directly inside table cells or visual primitives.
- Direct imports from `mocks/fixtures` into production components.
- Duplicate sidebar definitions for desktop and mobile.
- Route strings assembled ad hoc in JSX.
- Status colors selected independently on each screen.
- Copy-pasted form validation.
- A universal entity component controlled by many unrelated boolean props.
- Putting remote API collections into a second global state store.
- Using effects to synchronize two copies of the same state.
- Hiding backend errors and always displaying a success toast.
- Claiming that demo actions, invitations, uploads, or connectors are live.
- Permission logic based only on visible role labels.
- Using color alone for status.
- Silencing TypeScript or lint rules instead of resolving the underlying issue.
- Premature abstraction that makes a two-line domain rule harder to find.

## 26. Frontend definition of done

A route or feature is complete only when:

- It follows the approved route and source structure.
- It uses the shared Admin shell and design tokens.
- Desktop, tablet, and mobile layouts are usable.
- Loading, empty, no-results, error, success, and permission states are implemented where relevant.
- Forms include validation, pending behavior, API error presentation, and unsaved-change handling where relevant.
- Tables use shared behavior and URL-backed operational state.
- API access occurs through feature functions and TanStack Query.
- Mock behavior uses MSW and production-shaped contracts.
- Repeated values come from the correct typed constant/configuration source.
- Controls are keyboard accessible and visibly focused.
- Relevant unit/component tests pass.
- Critical workflow changes have Playwright coverage.
- Type checking, linting, and production build pass.
- UI copy does not misrepresent mock or planned capabilities as live.
- The implementation matches the screen specification and the modern blue SaaS system.

## 27. Application-level completion checklist

The frontend is ready for handoff when:

- All 14 conceptual screen groups and their required URLs are implemented.
- Navigation is generated from one typed configuration.
- Global agency and workspace scope behaves consistently.
- Shared component usage is visible across screens without feature leakage into primitives.
- The same screens operate against MSW and the configured remote API without component rewrites.
- The design token system controls color, typography, spacing, radius, borders, elevation, and responsive behavior.
- All major workflows have realistic feedback and failure recovery.
- No screen depends directly on fixture data.
- No known critical keyboard, contrast, responsive overflow, or focus-management defect remains.
- The supported browser matrix passes the agreed smoke test.
- The production frontend build succeeds with validated environment configuration.

## 28. Decision summary

The MOSAIQ Admin frontend will be built as a separate Next.js App Router application using strict TypeScript. It will use a feature-oriented architecture, semantic blue SaaS design tokens, project-owned shadcn/ui primitives, TanStack Query for Laravel API state, TanStack Table for operational tables, React Hook Form and Zod for forms, and MSW for contract-shaped UI development mocks.

The core implementation principle is:

> One source of truth per concern, shared primitives for stable UI behavior, feature ownership for domain behavior, and no direct coupling between screen components and data fixtures or backend implementation details.
