# Step 9 — Section accent colours

Status: built 29 September 2026 (tests not yet run). Response shape agreed.

API dependency: API Step 9 (`mosaiq-laravel-api/docs/phase1-review/STEP-9-SECTION-ACCENTS.md`). That doc has the full contract, the swatch list and the rules (A1–A9). This file covers the admin panel only.

## 9.1 What changes for the user

- In the report builder, **Colour and title** in a section tab's ⋯ menu (next to Move left and Move right) opens the section in the inspector: its title and a **Colour** choice of 8 swatches from the API.
- In the design view, the active section and the active sub-tab are underlined, with their text in the section's darker shade; sub-tab hover uses the light shade. The portal-view preview fills the active section like the portal (white text on `base`).
- **Reset** on a section restores its default colour (and its default title, as today).
- The preview uses the same colours. Charts and widgets don't change.
- MMM has no sub-tab row, so only its section tab is coloured.

## 9.2 Contracts (`src/features/reports/contracts.ts`)

| Schema | Change |
|---|---|
| New `accentSchema` | `{ key, label, base, strong, soft }` (strings) |
| New `resolvedAccentSchema` | `accentSchema.extend({ is_default: z.boolean() })` |
| `LayoutItem` type and `layoutItemSchema` | `accent: resolvedAccentSchema.nullable()`. Use `.nullable().default(null)` while the API isn't deployed yet, then tighten. |
| `layoutResponseSchema` | `accents: z.array(accentSchema)` (`.default([])` until the API is deployed) |
| Preview meta `sections[]` | `accent: resolvedAccentSchema.nullable().default(null)` |
| `layoutItemPatchSchema` | **No change.** `settings` is already an open record. |

API proxy routes under `src/app/api/v1/.../layout/**` need **no change**; they forward `settings` as-is.

## 9.3 Builder UI

| File | Change |
|---|---|
| `layout.ts` | `accentStyle(accent)` returns the colours as CSS variables: `--section-accent`, `--section-accent-strong` and `--section-accent-soft`. |
| `StructureTabs.tsx` (design view) | Each section tab carries its own variables. The selected section is underlined and its text uses `strong`. The tab row gets the section's variables through `accent`: the selected tab's text and underline use `strong`, and hover uses `soft`. Without an accent, today's styling is kept. A section's ⋯ menu ("{section} options") holds Move left, Move right and Colour and title, with icons (`MoveOption.icon`), when `onEdit` is given. |
| `ReportCanvas.tsx` | Same colours in the read-only portal-view `Switcher` (no palette button there). New `onEditSection` prop. |
| `ReportBuilder.tsx` | `onEditSection` selects the section in the inspector (same unsaved-changes guard as widgets). Passes `layout.accents` to the inspector. The drawer title is "Edit section" for sections. |
| `SectionForm.tsx` (new) | Title (no subtitle) and a radio group of swatches (`aria-label` = the swatch `label`, "(default)" on the default one, native arrow-key navigation). The group is hidden when the API sends no `accents`. |
| `inspector-forms.ts` | `sectionFormSchema`, `toSectionValues` and `sectionPatch`. The patch keeps the other stored settings and sends `{ settings: { ...settings, title?, accent? } }`, or `null` when empty. |
| `WidgetInspector.tsx` | Renders `SectionForm` for sections, labels the header "Section" and the reset "Reset section". |
| Errors | A 422 on `settings.accent` shows on the colour group. A 422 on `settings.title` shows on the title field. |
| Reset | Existing reset mutation. The response brings back the default accent (`is_default: true`). |

Tabs and widgets never show the Colour field (`accent` is null for them).

## 9.4 Tests

- `layout.test.ts`: parses a layout with `accents` and section `accent` (tabs null). A layout from an API without these fields parses with `[]` and `null`. Checks `accentStyle`.
- `StructureTabs.test.tsx`: the selected section is underlined, and the tab row carries the section's variables. A null accent keeps today's classes. Colour and title in a section's menu calls `onEditSection` (sections only). The portal view is coloured and has no menus.
- `WidgetInspector.test.tsx`:
  - a section shows 8 swatches with accessible names and the stored one selected
  - saving sends `{ settings: { title, accent } }`
  - a 422 on `settings.accent` is shown on the field
  - tabs and widgets have no Colour field

## 9.5 Out of scope

- The client portal. It reads `sections[].accent` from `GET /api/v1/public/reports/{slug}` (contract 1.2). Note for the portal team: this is separate from `theme.accent`, the brand colour.
- Custom colours outside the swatch list.
