# Outcomes & Mapping — Premium Redesign

**Date:** 2026-04-13
**Status:** Approved
**Mockups:** `docs/concepts/outcomes-redesign-mockup.html`, `docs/concepts/outcomes-redesign-table-mockup.html`

---

## Summary

Redesign the admin Outcomes & Mapping page (`src/admin/pages/OutcomesPage.jsx`) with premium UI treatment. Remove chevron/expand mechanism, show outcome descriptions inline, upgrade KPI strip to individual cards, add coverage progress bar, redesign actions menu with descriptions, and improve the edit drawer with explicit coverage type selection.

## Design Decisions

### 1. Remove Expand/Chevron — Inline Descriptions

**Before:** Each outcome row has a chevron that expands a detail row showing description + mapped criteria list.

**After:** Remove expand column entirely. Outcome description shown directly below the outcome label in the same table cell (smaller, tertiary color). Table goes from 6 columns to 5: Code, Outcome (label + desc), Mapped Criteria, Coverage, Actions.

**Why:** Reduces interaction cost. All information visible at a glance. Mapped criteria are already shown as chips in the table row — the expand only added description which is short enough to show inline.

### 2. KPI Strip → Individual Cards

**Before:** Single `scores-kpi-strip` bar with 4 inline KPI items.

**After:** `grid-template-columns: repeat(4, 1fr)` of individual `.kpi-card` elements. Each card has:
- Colored top border (3px) matching its semantic color (accent/success/warning/tertiary)
- Icon in a tinted surface square (32×32, 9px radius)
- Value (26px, 800 weight)
- Label + sublabel

Uses existing CSS variables: `--accent`, `--success`, `--warning`, `--text-quaternary` for the 4 KPI types.

### 3. Coverage Progress Bar (New Element)

New component between KPI strip and table card. Shows overall mapping coverage as a stacked horizontal bar:
- Green segment = direct count / total
- Yellow segment = indirect count / total
- Gray remainder = unmapped

Displays "X% covered" label and a 3-item legend. Uses existing `--success`, `--warning` variables with gradient fills.

### 4. Actions Floating Menu — Enhanced

**Before:** FloatingMenu with 2 items (Edit Outcome, Remove Outcome).

**After:** 3 items with icon + label + description sublabel:
- **Edit Outcome** — "Description, mappings" (opens drawer)
- **Duplicate** — "Copy with new code" (clones outcome into same framework)
- Divider
- **Remove Outcome** — "Permanently delete" (danger, opens ConfirmDialog)

Row click → opens Edit drawer directly (replaces old expand behavior).

### 5. Edit Outcome Drawer — Redesign

Uses existing `Drawer` component and `fs-*` design system classes. Changes:

**Header:** Code badge (mono font, gradient bg) + "Edit Outcome" title + subtitle.

**Body sections:**
1. **Outcome Identity** — Code + Short Label as readonly locked inputs (lock icon). These are not editable from the edit drawer (use inline edit or add drawer for those).
2. **Description** — Editable textarea (existing pattern).
3. **Criterion Mapping** — Pill selector (existing `acc-drawer-criteria-grid` pattern). Each pill shows dot color + criterion label + check icon when selected.
4. **Coverage Type** — New radio-style selector replacing the "cycle on click" badge. Two options: Direct ("Explicitly assessed by criteria") and Indirect ("Tangentially assessed"). Uses card-style radio buttons with colored bg when selected.

**Footer:** Meta text ("Changes saved on confirm") + Cancel + Save Changes.

### 6. Mobile Portrait — Card Actions

**Before:** FloatingMenu on each card (small target, hard to tap).

**After:** Inline action buttons at card bottom:
- **Edit** button — primary accent style (accent-soft bg, accent border)
- **Remove** button — danger style (subtle danger border)

Both buttons are full-width flex items in a row with `border-top` separator. Touch-friendly (min 44px tap target via padding).

### 7. Code Badge Upgrade

**Before:** Simple `.acc-code` class with mapped/unmapped coloring.

**After:** `.code-badge` with:
- Mono font (`var(--mono)`)
- Prefix label (e.g., "MDK") as smaller uppercase text
- Gradient background for mapped state: `linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.04))`
- Plain surface-1 for unmapped state
- 1px border matching state color

## Files to Modify

### Primary
- `src/admin/pages/OutcomesPage.jsx` — main component rewrite
- `src/styles/pages/outcomes.css` — new styles (KPI cards, coverage bar, code badge, inline desc, mobile cards)
- `src/admin/drawers/OutcomeDetailDrawer.jsx` — add coverage type selector, readonly identity fields

### Secondary
- `src/admin/drawers/AddOutcomeDrawer.jsx` — add coverage type selector (defaults to "direct")

### No Changes
- `src/admin/hooks/useFrameworkOutcomes.js` — data layer stays the same
- `src/shared/ui/Drawer.jsx` — use as-is
- `src/shared/ui/FloatingMenu.jsx` — use as-is
- `src/shared/ui/ConfirmDialog.jsx` — use as-is

## Theme Adherence

All new styles must use existing CSS variables from `variables.css`:
- Colors: `--accent`, `--success`, `--warning`, `--danger`, `--text-*`, `--surface-*`, `--bg-*`
- Borders: `--border`, `--border-strong`
- Radii: `--radius`, `--radius-sm`, `--radius-lg`
- Shadows: `--shadow-card`, `--shadow-elevated`
- Typography: `--font`, `--mono`
- Fields: `--field-h`, `--field-radius`, `--field-border`, `--field-bg`, `--field-focus-ring`

No hardcoded colors. Dark mode must work via existing `.dark-mode` variable overrides.

## Out of Scope

- Empty state redesign (framework-not-found, no-outcomes states)
- Add Outcome drawer redesign (minor, works fine)
- Framework switcher UI
- Bulk actions
- Search/filter functionality
