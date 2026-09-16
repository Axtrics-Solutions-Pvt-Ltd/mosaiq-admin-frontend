# Phase 02 — Design system and application shell

## Outcome

The Admin application has an approved modern blue SaaS visual foundation that every later screen can reuse.

## Scope

- Implement semantic light-theme tokens from the engineering specification: primary/hover/soft blue, canvas, surface, border, navy/slate text, success, warning, danger, and controlled chart accents.
- Build core primitives and shared patterns needed immediately: button, input, label, select, checkbox, tabs, card, badge, tooltip, dialog, drawer, toast presentation, `PageHeader`, `MetricCard`, `StatusBadge`, skeleton, empty/no-results/error/permission states, form field, and confirmation pattern.
- Build the responsive authenticated shell: persistent/collapsible desktop sidebar, mobile navigation drawer, top bar, breadcrumbs, agency/workspace scope selectors, profile menu, and Demo data indicator.
- Use one navigation configuration and one route-builder source. Include all 14 screen groups in navigation; auth routes remain outside the shell.
- Show sample agency/workspace context and an `All agencies` option where appropriate. A selector may visually change the chosen label in prototype mode; cross-screen data scoping comes later.
- Define layout patterns for cards, forms, operational tables, filters, charts, drawers, and page sections. Include active, disabled, focus, hover, and error appearances.

## Review artifacts

- A component-gallery/preview route or equivalent development view with key variants.
- Shell shown at 1440, 1024, 768, 390, and 320px widths.
- Navigation and at least one dialog/drawer/empty state reviewed by keyboard.

## Implementation sequence

1. Translate approved palette, type scale, spacing, radius, and breakpoint decisions into tokens.
2. Build primitives and patterns before feature-specific visuals.
3. Implement shell/navigation and route composition.
4. Review desktop and mobile design; adjust tokens centrally.

## Exit gate

The shell is visually approved; all navigation destinations exist as placeholders; focus and contrast are usable; mobile navigation works; no page duplicates the sidebar/top bar. Business selectors and profile actions may remain UI-preview controls, clearly labelled where needed.
