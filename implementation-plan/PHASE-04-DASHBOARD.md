# Phase 04 — Admin dashboard UI

## Outcome

A polished overview that demonstrates how a platform administrator monitors all agencies and how an agency-scoped overview differs.

## Route

`/dashboard`

## Screen scope

- Header with All Agencies/agency context, date-range and data-source controls, refresh affordance, and Demo data label.
- Six summary cards: agencies, active workspaces, active users, completed imports, failed imports, and demo-data workspaces.
- Agency performance/usage visualization, attention list, data-source distribution, recent imports, connector availability, recent Admin activity, and quick actions.
- Empty-agency onboarding design and loading/error/permission variants.
- Responsive chart/card layout and text summaries for charts.

## Prototype behavior

Quick-action and destination links navigate to their feature routes. Scope/date/filter controls may show selected visual state, but sample metrics are static unless a small local demonstration is useful for design review. Never call a fake refresh a live update or show an unearned synchronization timestamp.

## Sequence and exit gate

1. Define a consistent sample dataset/story across dashboard cards and later agency/workspace/import screens.
2. Build metric, chart, activity, and attention patterns from shared components.
3. Review aggregate, selected-agency, empty, loading, and narrow-screen compositions.
4. Approve hierarchy, chart readability, action placement, and sample-data labelling.

Later: connect query keys and API/response models; make scope/date/source filters truly update data; test navigation and refresh behavior.
