# Default Framework Templates — Design Spec

**Date:** 2026-04-15
**Status:** Approved

---

## Goal

Surface platform-level default frameworks (MÜDEK v3.1, ABET) prominently across three surfaces:
1. `FrameworkPickerDrawer` — prominent template cards with inline "Clone & Use"
2. `AddEditPeriodDrawer` — inline quick-pick chips before the modal
3. `FrameworkPickerModal` — card layout for platform templates, list for org frameworks

The platform templates already exist in the DB (`frameworks` table, `organization_id IS NULL`) seeded by `008_platform.sql`. No DB changes required.

---

## Surfaces & Changes

### 1. FrameworkPickerDrawer (`src/admin/drawers/FrameworkPickerDrawer.jsx`)

**New section: "Default Templates"** — inserted between "Active Framework" and "Previous Periods".

- Renders platform frameworks (`organization_id === null`) as clickable cards
- Each card: BadgeCheck icon · name · `Template` badge · description · `Clone & Use` button (visible on hover/selected)
- "Clone & Use" calls existing `handleCloneAndUse(fw)` — same confirm flow as before
- Existing "Clone from Existing" section renamed to **"Previous Periods"**: dropdown now contains only org frameworks (`organization_id !== null, id !== frameworkId`)
- Platform frameworks removed from the dropdown — no duplication

**State changes:** None. Reuses `changeConfirmOpen`, `pendingTarget`, `changingFw` already on the component.

---

### 2. FrameworkPickerModal (`src/admin/modals/FrameworkPickerModal.jsx`)

**Platform templates section:** Rendered above org frameworks as cards.

- Each card: icon · name · `Template` badge · description · accent border when selected
- `globalTemplates` (`organization_id === null`) → card layout
- `orgFrameworks` (`organization_id !== null`) → existing list layout (unchanged)
- Selection and "Clone & Use" confirm logic unchanged

---

### 3. AddEditPeriodDrawer (`src/admin/drawers/AddEditPeriodDrawer.jsx`)

**Framework field — inline quick-pick chips.**

- Rendered above the current `fw-display + "Select…"` row
- Chips derived from `frameworks` prop, filtered to `organization_id === null`
- Clicking a chip sets `formFrameworkId` + `formFrameworkName` directly (no modal)
- Chip shows active/selected state when `formFrameworkId === fw.id`
- Clicking an already-selected chip deselects (clears `formFrameworkId`)
- "More…" button replaces current "Select…" / "Change" button — opens `FrameworkPickerModal` as before
- Clear (×) button unchanged

---

## Data Flow

```
listFrameworks(organizationId)
  → returns org frameworks + platform frameworks (organization_id IS NULL)
  → passed as `frameworks` prop to all three surfaces

FrameworkPickerDrawer
  platformFrameworks = frameworks.filter(f => !f.organization_id)   → cards
  orgFrameworks      = frameworks.filter(f => f.organization_id && f.id !== frameworkId) → dropdown

FrameworkPickerModal
  globalTemplates = frameworks.filter(f => !f.organization_id)      → card layout
  orgFrameworks   = frameworks.filter(f => f.organization_id)       → list layout

AddEditPeriodDrawer
  platformChips = frameworks.filter(f => !f.organization_id)        → chips
```

---

## Constraints

- No new API calls or DB migrations
- No new state shape — reuses existing component state and handlers
- `changeConfirmOpen` confirm flow applies to template cards in drawer (hasMappings guard)
- Chip select in AddEditPeriodDrawer does NOT open modal — direct set, no clone at this stage (clone happens on period save via `frameworkId` prop to `onSave`)
- Platform templates in drawer trigger `cloneFramework` + `assignFrameworkToPeriod` on confirm (existing flow)
