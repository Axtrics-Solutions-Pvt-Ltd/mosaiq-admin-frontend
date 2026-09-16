# MOSAIQ Admin Frontend — UI Screen Specification

## 1. Document purpose

This document defines the **Admin frontend UI screen and interaction requirements** for MOSAIQ.

The current focus is screen design, navigation, reusable components, realistic interactions, responsive behavior, and a polished modern SaaS experience. During UI development, displayed data and actions may use local mock data exposed through the same frontend data contracts that will consume the Laravel API.

This document is limited to frontend screen design and behavior. It does not define Laravel implementation, database design, infrastructure, or server-side authorization.

The implementation rules, technology choices, component architecture, design tokens, coding standards, frontend data strategy, accessibility rules, and testing expectations are defined in [`MOSAIQ-Admin-UI-Engineering-Spec.md`](./MOSAIQ-Admin-UI-Engineering-Spec.md). Both documents are required reading for Admin frontend work.

MOSAIQ is a **multi-agency platform**. The Admin UI must support switching between and managing multiple agencies, with multiple client workspaces inside each agency.

## 2. UI scope summary

The core Admin frontend contains **14 conceptual screen groups**:

| Area | Screens |
|---|---:|
| Authentication | 1 |
| Overview | 1 |
| Agency management | 2 |
| Workspace management | 2 |
| User and access management | 3 |
| Data management | 3 |
| Client configuration | 1 |
| Governance and settings | 1 |
| **Total** | **14** |

Create, edit, and details modes that share one feature layout count as one conceptual screen group, even when they use separate URLs. Drawers, dialogs, confirmation prompts, loading states, and responsive variants are not counted as separate screen groups.

## 3. Product structure

```text
MOSAIQ Admin
├── Login
├── Overview
│   └── Admin Dashboard
├── Agencies
│   ├── Agency List
│   └── Agency Create / Edit / Details
├── Workspaces
│   ├── Workspace List
│   └── Workspace Create / Edit / Details
├── Access Management
│   ├── User List
│   ├── Invite / Edit User
│   └── Roles & Permissions
├── Data Management
│   ├── Data Import
│   ├── Import History
│   └── Connector Status
├── Client Configuration
│   └── KPI & Module Curation
└── Governance
    └── Audit Log & Basic Settings
```

## 4. Shared Admin application shell

### Left sidebar

The desktop application uses a persistent left sidebar containing:

- MOSAIQ logo and Admin label.
- Overview.
- Agencies.
- Workspaces.
- Users.
- Roles & Permissions.
- Data Import.
- Import History.
- Connector Status.
- KPI & Module Curation.
- Audit & Settings.
- Collapse/expand control.

The active item uses a blue-tinted background, blue icon, and stronger text. Related items may be grouped with small section labels.

On tablets and mobile devices, the sidebar becomes a slide-out navigation drawer.

### Top bar

The top bar contains:

- Breadcrumb or current page name.
- Global agency selector.
- Optional workspace selector when the page operates within one client workspace.
- Search or command shortcut.
- Notifications icon with mock unread count.
- User avatar and profile menu.

The agency selector is important because MOSAIQ is multi-agency. Changing the selected agency updates the visible dashboard, workspaces, users, imports, and configuration using local data.

### Page header

Every screen uses a consistent header containing:

- Page title.
- One-sentence description.
- Context such as selected agency or workspace.
- Primary action on the right.
- Optional status or mock-data badge.

### Global demo indicator

Show a small non-intrusive label such as **Demo data** or **Sample workspace** so hardcoded information is not mistaken for live information.

## 5. Detailed screen specifications

### Screen 1 — Admin Login

**Purpose:** Provide a clean entry point for agency and platform administrators.

**Layout:** A split-screen or centered authentication card. The visual side may contain a soft blue gradient, MOSAIQ brand statement, and an abstract analytics illustration. The form side remains clean and focused.

**UI content:**

- MOSAIQ logo.
- “Welcome back” heading.
- Short Admin portal description.
- Email field.
- Password field.
- Show/hide password.
- Remember me.
- Sign in button.
- Help/contact link.
- Demo credentials note where appropriate.

**Hardcoded interactions:**

- Required-field validation.
- Invalid-email validation.
- Show/hide password.
- Simulated loading state.
- Invalid-credentials message.
- Successful navigation to the Dashboard for the agreed demo credentials.

**States:** Default, validation error, submitting, invalid credentials, generic unavailable error, and success.

### Screen 2 — Admin Dashboard

**Purpose:** Give the administrator an immediate view of the entire multi-agency platform or the currently selected agency.

**Top controls:**

- Scope selector: All Agencies or one agency.
- Date-range selector.
- Data-source filter: All, Seeded, CSV, or Future Connector.
- Refresh button with simulated refreshed timestamp.

**Summary cards:**

- Total agencies.
- Active client workspaces.
- Active users.
- Completed imports.
- Failed imports requiring attention.
- Workspaces using demo data.

**Main dashboard sections:**

- Agency performance/usage overview.
- Workspaces requiring attention.
- Data-source distribution.
- Recent import activity.
- Connector availability summary.
- Recent Admin activity.
- Quick actions: Add Agency, Add Workspace, Invite User, and Import Data.

**Hardcoded interactions:** Filters update the displayed mock figures and tables. Cards and attention items navigate to their relevant filtered screens.

**Empty state:** If an agency has no workspaces, show a clear onboarding card with Create Workspace and Import Data actions.

### Screen 3 — Agency List

**Purpose:** Manage the multiple agencies operating on MOSAIQ.

**Page header:** “Agencies” with an **Add Agency** primary button.

**Summary strip:**

- Total agencies.
- Active agencies.
- Total workspaces.
- Total agency users.

**Table columns:**

- Agency name and logo.
- Primary administrator.
- Number of workspaces.
- Number of users.
- Default currency.
- Status.
- Created date.
- Last activity.
- Actions menu.

**Filters:** Search, status, currency, number of workspaces, and recent activity.

**Actions:** View, edit, open workspaces, activate/deactivate, and duplicate sample configuration.

**Hardcoded interactions:** Creating or editing an agency updates the local mock collection for the current browser session. Deactivation changes its status after confirmation.

**States:** Populated, empty, no search results, loading skeleton, and simulated error.

### Screen 4 — Agency Create / Edit / Details

**Purpose:** Create a new agency, view its configuration, or edit an existing agency.

**Header content:** Agency logo, name, status badge, primary contact, and Edit or Save action.

**Sections or tabs:**

1. **Overview** — agency name, legal/display name, description, website, status, and created date.
2. **Primary Contact** — name, email, phone, and job title.
3. **Defaults** — currency, time zone, language, reporting week, and date format.
4. **Workspaces** — linked client workspaces with status and data source.
5. **Administrators** — assigned agency admins and managers.
6. **Brand Preview** — logo and basic accent-color preview without building the full white-label module.
7. **Recent Activity** — latest mock administrative changes.

**Modes:**

- Create mode uses empty fields and a Create Agency action.
- Details mode is read-only.
- Edit mode exposes editable fields with Save and Cancel actions.

**Hardcoded interactions:** Inline validation, unsaved-changes warning, logo preview, status change, simulated save toast, and return to Agency List.

### Screen 5 — Workspace List

**Purpose:** Manage client workspaces across all agencies or within the selected agency.

**Page header:** “Client Workspaces” with an **Add Workspace** button.

**Summary cards:**

- Total workspaces.
- Active.
- Using seeded data.
- Using imported data.
- Requiring attention.

**Table columns:**

- Client name and logo.
- Parent agency.
- Account manager.
- Assigned users.
- Enabled modules.
- Active dataset.
- Data-source type.
- Latest import/update.
- Status.
- Actions.

**Filters:** Agency, status, enabled module, data-source type, account manager, and freshness.

**Actions:** Create, view, edit, activate/deactivate, open imports, open KPI configuration, and open the existing client-facing frontend in demo mode.

**Hardcoded interactions:** Agency selection filters the list. Status and dataset actions update local screen state and show confirmation toasts.

### Screen 6 — Workspace Create / Edit / Details

**Purpose:** Provide one complete control screen for a client workspace.

**Header content:** Client logo, workspace name, parent agency, status, data-source badge, and primary actions.

**Recommended tab layout:**

#### Overview

- Client/workspace name.
- Parent agency.
- Description and industry/category.
- Primary client contact.
- Account manager.
- Active/read-only/deactivated status.

#### Market profile

- Country and provinces.
- Target markets.
- Target languages.
- Cultural audience segments.
- Default currency, time zone, and reporting period.

#### Modules

- Reporting Dashboard toggle.
- Marketing Intelligence toggle.
- Media Mix Model toggle.
- Short explanation of what enabling each module changes.

#### Team and access

- Assigned internal users.
- Assigned client users.
- Role for each assigned user.
- Add/remove user interaction.

#### Data

- Current source: Seeded, CSV Imported, or Future Connector.
- Active dataset name and status.
- Latest import date.
- Recent import summary.
- Open Data Import and Import History actions.

#### Activity

- Recent workspace changes and import events.

**Modes:** Create, details, and edit share this route. Create mode may visually guide the user through sections but should not become a separate wizard screen.

**Hardcoded interactions:** Tab navigation, field validation, module toggles, add/remove mock users, data-source selection, simulated save, unsaved-changes warning, and deactivate confirmation.

### Screen 7 — User List

**Purpose:** Manage internal agency users and client users across the platform.

**Summary cards:** Total users, active, invited, internal users, and client users.

**Table columns:**

- Name and avatar.
- Email.
- User type.
- Fixed role.
- Agency.
- Assigned workspaces.
- Invitation status.
- Last login.
- Account status.
- Actions.

**Filters:** Agency, workspace, user type, role, invitation status, and account status.

**Actions:** Invite, view/edit, resend simulated invitation, activate/deactivate, and change workspace assignments.

**Hardcoded interactions:** Filters update the table, edits update local state, and invitation/deactivation actions show realistic confirmation and success states.

### Screen 8 — Invite / Edit User

**Purpose:** Add a new user or update their role and access scope.

**Form sections:**

1. **Identity** — first name, last name, email, job title, and optional avatar.
2. **User type** — Internal Team or Client User.
3. **Agency access** — one or more permitted agencies according to role.
4. **Workspace access** — searchable multi-select of allowed client workspaces.
5. **Role** — fixed role selector.
6. **Status and invitation** — active/inactive and optional invitation message preview.

**Rules represented in the UI:**

- Client users only see explicitly assigned workspaces.
- Workspace choices are filtered by selected agency.
- A user may belong to multiple workspaces.
- Changing an agency removes incompatible workspace selections after confirmation.

**Hardcoded interactions:** Conditional fields, validation, workspace chips, simulated invitation, edit/save toast, and unsaved-changes guard.

### Screen 9 — Roles & Permissions

**Purpose:** Explain what each fixed role can see and do without building a custom permission designer.

**Recommended roles:**

- Platform Admin.
- Agency Admin.
- Manager / Account Manager.
- Analyst.
- Viewer.
- Client User.

**UI content:**

- Role summary cards with user count and scope.
- Read-only permission matrix.
- Capability groups: agencies, workspaces, users, imports, connectors, KPI curation, settings, and audit history.
- Assigned-user drawer for each role.

**Hardcoded interactions:** Select a role to highlight its capabilities, search capabilities, expand grouped permissions, and open assigned mock users.

**Boundary:** Roles are presets. Do not display Create Role, Edit Permission, or custom policy controls.

### Screen 10 — Data Import

**Purpose:** Demonstrate a clear CSV upload and validation experience for MOSAIQ datasets.

**Single-screen guided flow:**

1. Select agency.
2. Select workspace.
3. Select dataset type.
4. Read template instructions.
5. Download a sample CSV template.
6. Choose or drag/drop a CSV.
7. Preview validation results.
8. Review sample rows.
9. Confirm the simulated import.
10. Choose whether the imported dataset becomes active.

**Dataset types:**

- Reporting.
- Marketing Intelligence.
- Media Mix Model.

**Displayed template fields:**

- Reporting: date, campaign, channel, spend, impressions, clicks, conversions, revenue, creative, and status.
- Marketing Intelligence: section, metric, value, category, geography, source, and planning implication.
- MMM: date, channel, spend, impressions, clicks, conversions, revenue, promotion, and seasonality.

**Validation UI:**

- File name, size, and selected dataset.
- Recognized and missing columns.
- Valid, warning, and error row counts.
- Row-level error table.
- Duplicate and date-format warnings.
- First rows preview.
- Append/replace choice for demonstration.

**MMM-specific UI:** Readiness score, completeness, time coverage, channel consistency, and outcome consistency.

**Hardcoded behavior:** Use sample valid and invalid fixtures to demonstrate parsing, progress, validation, error correction, confirmation, and success. No real upload or permanent storage is implied.

### Screen 11 — Import History

**Purpose:** Show past mock imports and their status in a traceable operational view.

**Summary cards:** Successful, processing, failed, active datasets, and inactive datasets.

**Table columns:**

- Batch ID.
- Agency.
- Workspace.
- Dataset type.
- File name.
- Uploaded by.
- Upload time.
- Valid/error rows.
- Import mode.
- Activation status.
- Processing status.
- Actions.

**Filters:** Agency, workspace, dataset, status, activation state, uploader, and date.

**Detail drawer:** Processing stages, validation results, row counts, error summary, previous/replaced batch, and activation history.

**Hardcoded interactions:** Open details, retry a failed mock import, upload a corrected version, activate/deactivate a dataset, and show success/error toasts.

### Screen 12 — Connector Status

**Purpose:** Display future data-source availability honestly without pretending that live connections exist.

**Layout:** Provider cards or compact table grouped by Advertising, Analytics, and Manual Data.

**Providers:**

- Meta Ads.
- Google Ads.
- Google Analytics 4.
- CSV Import.
- Additional providers shown only when useful as future placeholders.

**Card content:** Provider logo, description, supported modules, applicable workspaces, and availability state.

**Allowed UI states:**

- Available through CSV.
- Demo data active.
- Planned integration.
- Not configured.
- Next phase.

**Hardcoded interactions:** Filter by agency/workspace/provider and open an informational drawer explaining the planned connector. No OAuth forms, secret fields, Sync Now, Reconnect, or fake successful synchronization timestamps.

### Screen 13 — KPI & Module Curation

**Purpose:** Control the modules and KPIs shown for each client workspace.

**Top controls:** Agency selector, workspace selector, draft/saved indicator, reset action, and Save Configuration button.

**Module sections:**

- Reporting Dashboard.
- Marketing Intelligence.
- Media Mix Model.

**Content within each module:**

- Module enable/disable toggle.
- KPI groups by section or source.
- Individual KPI visibility checkboxes.
- Primary KPI selection.
- Drag handles or simple ordering controls where useful.
- Data availability indicator.
- Client-visible versus internal-only label.

**Required distinction:**

- **Available and visible** — client can see it.
- **Available but hidden** — data exists but is intentionally hidden.
- **Unavailable** — the current sample dataset does not contain it.

**Hardcoded interactions:** Toggle modules/KPIs, change primary KPI, reorder selected items, reset to mock defaults, save locally, and open the existing client-facing frontend as a preview.

### Screen 14 — Audit Log & Basic Settings

**Purpose:** Combine activity history and safe visual configuration into one governance area.

**Recommended top-level tabs:** Audit Log and Basic Settings.

#### Audit Log tab

**Table content:** Timestamp, actor, agency, workspace, action, entity, short change summary, result, and event ID.

**Filters:** Date, agency, workspace, actor, action, entity, and result.

**Detail drawer:** Full mock event information, before/after summary, related import batch, and copy event ID action.

Audit records are read-only and cannot be edited or deleted.

#### Basic Settings tab

**Safe UI settings:**

- Default landing page.
- Default currency.
- Default time zone.
- Supported interface language display.
- Module availability toggles.
- Seeded-data fallback preference.
- Demo/maintenance banner text.
- Table density preference.

**Hardcoded interactions:** Filters, drawers, toggles, simulated save, reset to defaults, validation, and success feedback.

## 6. Reusable components and uncounted UI states

The following are shared components or states, not additional screens:

- Sidebar, mobile navigation drawer, top bar, breadcrumbs, agency selector, workspace selector, and profile menu.
- Page header, metric card, chart card, information card, table, pagination, search, filter bar, and column selector.
- Agency, workspace, user, dataset, connector, and activity cards.
- Tabs, accordion, step indicator, dropdown, multi-select, date picker, file picker, toggle, checkbox, radio group, and tooltip.
- Confirmation modal, side drawer, toast, unsaved-changes prompt, and command/search dialog.
- Status badges: active, inactive, invited, seeded, imported, planned, processing, completed, warning, and failed.
- Loading skeleton, empty state, no-results state, form validation, permission state, success state, recoverable error, and generic unavailable state.

## 7. Modern blue SaaS visual system

### Brand direction

- Primary blue: confident medium blue for primary actions and active navigation.
- Indigo accent: optional secondary accent for charts and selected states.
- Navy text: high-contrast headings and important metrics.
- Neutral canvas: very light blue-gray application background.
- White surfaces: cards, tables, forms, and drawers.
- Semantic colors: green for success, amber for warning, red for destructive/error, and slate for neutral states.

Avoid heavy gradients, strong glass effects, excessive shadows, neon colors, and overly rounded consumer-app styling.

### Suggested token direction

| Token | Suggested visual use |
|---|---|
| Primary | Buttons, active navigation, selected controls |
| Primary soft | Selected table rows, filter chips, active card backgrounds |
| Canvas | Main application background |
| Surface | Cards, tables, forms, dropdowns |
| Border | Subtle card and input boundaries |
| Text strong | Page titles, values, key labels |
| Text muted | Supporting descriptions and metadata |
| Success | Active, complete, healthy |
| Warning | Attention, partial data, validation warning |
| Danger | Failed, destructive, invalid |

### Typography

- Use Inter, Geist, or the approved MOSAIQ brand font.
- Keep page titles strong but compact.
- Use readable 14–16px body text.
- Use tabular numerals for metrics where supported.
- Avoid excessive uppercase; reserve it for small section eyebrows.

### Spacing and surfaces

- Use an 8px spacing system.
- Use 10–12px card and input radii.
- Use subtle borders and very restrained shadows.
- Prefer whitespace and grouping over decorative dividers.
- Keep tables compact but not cramped.

### Charts

- Use blue as the primary series.
- Add indigo, cyan, teal, amber, and purple as controlled secondary series.
- Keep gridlines and labels subtle.
- Always provide labels/tooltips and accessible text summaries.

## 8. Responsive behavior

### Desktop

- Persistent sidebar.
- Multi-column dashboard.
- Full data tables.
- Drawers open from the right without replacing the page.

### Tablet

- Collapsible sidebar.
- Two-column card layouts.
- Reduced table columns with optional horizontal scrolling.

### Mobile

- Navigation drawer.
- Single-column cards and forms.
- Important table rows represented as stacked cards where practical.
- Filters open in a full-width drawer.
- Primary actions remain visible without covering content.

The Admin product is desktop-first because of tables and configuration tasks, but every route must remain usable at smaller widths.

## 9. Frontend data and interaction rules

- Use realistic local fixture data for at least three agencies and several workspaces per agency.
- Include internal users and client users with different roles and workspace access.
- Include healthy, warning, failed, empty, and inactive examples.
- Use stable IDs so drill-through navigation feels consistent.
- Keep local UI changes during the current browser session where useful when the mock data source is enabled.
- Access mock and remote data through feature-level frontend query and mutation functions. Screen components must not import fixture collections directly.
- Keep mock and Laravel-backed UI behavior consistent by using the same frontend types, validation schemas, query keys, and error presentation.
- Provide Reset Demo Data so reviewers can return to the starting state.
- Simulate loading delays sparingly to demonstrate skeleton and progress states.
- Clearly label mock imports, connector placeholders, and sample metrics.
- Do not display fake passwords, tokens, secret keys, or claims of live synchronization.
- Do not imply that email invitations, CSV files, or settings were permanently saved.

## 10. Accessibility requirements

- Target WCAG 2.1 AA.
- Provide visible keyboard focus and logical tab order.
- Use real form labels and descriptive validation messages.
- Include accessible table headers and captions where needed.
- Provide keyboard-accessible menus, tabs, dialogs, and drawers.
- Do not communicate status through color alone; pair color with text and icons.
- Ensure muted text and pale status backgrounds meet contrast requirements.
- Provide meaningful button names such as “Edit Acme Agency,” not only “Edit.”
- Respect reduced-motion preferences for transitions and loading effects.

## 11. Screens hidden from the core Admin navigation

The following are valid future UI concepts but are not part of the current 14-screen hardcoded Admin UI:

- Forgot Password.
- Reset Password.
- Dedicated Workspace Onboarding Wizard.
- Dedicated Connector Setup/Reconnect screen.
- Separate Import Validation route.
- Separate Import Batch Detail route.
- Dedicated embedded Client Portal Preview.
- Reports & Schedules.
- Alerts & Notification Rules.
- Full Branding / White-label management.
- Advanced Profile & Security.
- Custom Role and Permission Builder.
- Research Library.
- Research Upload / Editor.
- Research Record Detail / Preview.
- Billing and Subscription Management.

These items should be absent from the main navigation or displayed only as clearly labelled future features. They must not appear operational if their interactions are not being designed now.

## 12. UI completion checklist

The Admin frontend design is complete when:

- All 14 conceptual screen groups and their required URLs render within the shared Admin shell.
- The global agency selector consistently changes the displayed sample context.
- Agency and workspace create/edit screens have complete form, validation, and success states.
- Users can be visually assigned to agencies and multiple workspaces.
- Fixed roles and permissions are clearly understandable.
- Data Import demonstrates template selection, upload, validation, preview, and completion states.
- Import History demonstrates successful, processing, warning, and failed batches.
- Connector Status clearly shows placeholders without implying live integrations.
- KPI and module visibility can be changed and previewed with local data.
- Audit and Settings contain realistic filters, drawers, controls, and feedback.
- Every major screen has loading, empty, validation, error, and success treatments where relevant.
- The UI is polished at desktop, tablet, and mobile sizes.
- All screens follow the same modern blue SaaS design system.
