# Period Criteria Drawer — Design Spec

**Date:** 2026-04-14
**Trigger:** Clicking the "Spring 2026" period badge in CriteriaPage

---

## Overview

A slide-in drawer that opens when the user clicks the period badge in the Criteria page header row. It gives a summary of the current period's criteria and provides shortcuts to apply a default template, copy from another period, or start blank — without navigating away from the page.

---

## Trigger & Entry Point

- **Element:** `crt-period-badge` button in `CriteriaPage.jsx` (already wired to `setPeriodDrawerOpen(true)`)
- **Replaces:** The old `AddEditPeriodDrawer` that was briefly assigned to this button. The period-settings drawer stays accessible from the Periods page only.
- The new drawer is named `PeriodCriteriaDrawer`.

---

## Sections

### 1. Header

- Icon: `ClipboardList` from lucide-react
- Title: `{periodName} — Criteria`
- Subtitle: "Manage criteria, weights, and rubric bands for this period"
- Close (×) button

### 2. Active Criteria

Label: `ACTIVE CRITERIA`

Shows a compact card containing:

**Stat pills row**
- `{n} criteria` (neutral)
- `{total} pts · balanced` (green, only when total === 100)
- `{total} / 100 pts` (amber, when total ≠ 100)
- `Scores exist · locked` (amber, when `is_locked`)

**Criteria mini-list** (max 5 rows visible; if more, show "+ N more")
- Color dot (matches `criterion.color`)
- Criterion label
- Weight in pts (right-aligned)

**Action buttons** (inside card footer)
- `Edit Criteria` — closes drawer (user works in the criteria table)
- `Clear` (danger, right-aligned) — removes all criteria from this period after confirmation

If no criteria exist yet, show an empty state inside the card: "No criteria defined for this period" with muted text.

### 3. Default Template

Label: `DEFAULT TEMPLATE`

Two items displayed as clickable rows (not a grid):

1. **VERA Default** — our single built-in starter template (the `STARTER_CRITERIA` constant from `StarterCriteriaDrawer`). Shows criterion count.
2. **Start blank** — dashed border row, opens the Add Criterion drawer (`editingIndex = -1`).

Clicking a template row replaces the current draft criteria after a confirmation if criteria already exist.

### 4. Copy from Another Period

Label: `COPY FROM ANOTHER PERIOD`

- `CustomSelect` dropdown listing other periods (excluding current) that have at least 1 criterion
- `Copy & Use` primary button — copies criteria from selected period into current draft
- Disabled state if no other periods have criteria

---

## Data Flow

All data comes from props passed by `CriteriaPage`:

| Prop | Source |
|---|---|
| `period` | `viewPeriod` (from `periods.periodList`) |
| `criteria` | `draftCriteria` |
| `isLocked` | `!!viewPeriod?.is_locked` |
| `otherPeriods` | `otherPeriods` (already computed in CriteriaPage) |
| `onApplyTemplate(criteria[])` | sets draft via `periods.updateDraft()` |
| `onCopyFromPeriod(periodId)` | triggers existing `handleClone(periodId)` |
| `onEditCriteria()` | closes drawer |
| `onClearCriteria()` | sets draft to `[]` |

No new API calls. The drawer is purely a UI shortcut that delegates to existing CriteriaPage handlers.

---

## State

Managed entirely in `CriteriaPage`:

```js
const [periodCriteriaDrawerOpen, setPeriodCriteriaDrawerOpen] = useState(false);
```

The `crt-period-badge` button already sets this state (currently wired to `AddEditPeriodDrawer` — that wiring is replaced).

---

## File Structure

- **New file:** `src/admin/drawers/PeriodCriteriaDrawer.jsx`
- **New styles:** Add `.pcd-*` namespaced styles to `src/styles/pages/criteria.css`
- **Modified:** `src/admin/pages/CriteriaPage.jsx` — swap `AddEditPeriodDrawer` for `PeriodCriteriaDrawer`

---

## Constraints

- No new API calls — all data is already loaded in CriteriaPage
- No changes to DB schema or RPCs
- Uses only `lucide-react` icons
- Follows VERA drawer conventions: `Drawer` shell from `src/shared/ui/Drawer.jsx`
- Uses `CustomSelect` (not native `<select>`) for the period picker
- Confirmation before destructive actions (clear, apply template over existing criteria)

---

## Out of Scope

- Period settings editing (name, dates, lock state) — stays in Periods page
- Framework/outcome management — stays in Outcomes page
- Adding individual criteria directly from this drawer (Edit Criteria closes drawer → user works in table)
