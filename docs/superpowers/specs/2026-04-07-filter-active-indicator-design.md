# Filter Active Indicator — Design Spec

**Date:** 2026-04-07
**Status:** Approved

---

## Problem

6 admin pages (Reviews, Rankings, Jurors, Projects, AuditLog, Periods) have filter buttons, but only Reviews shows a visual indicator when filters are active. On all other pages, once the filter panel is closed, there is no way to tell filters are applied. Icons are also inconsistent — 3 pages use inline SVGs instead of lucide-react.

---

## Solution

A shared `FilterButton` component with a count badge. When `activeCount > 0`, a pill badge shows the number of active filters regardless of whether the panel is open or closed. All 6 pages adopt this component.

---

## Component

### `src/shared/ui/FilterButton.jsx`

```jsx
<FilterButton activeCount={2} isOpen={false} onClick={toggle} />
```

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `activeCount` | `number` | `0` | Number of active filters; `0` hides the badge |
| `isOpen` | `boolean` | `false` | Adds `.active` class + focus ring when panel is open |
| `onClick` | `function` | — | Toggle handler |

**Visual states:**

| State | Appearance |
|---|---|
| Default (`activeCount=0`, `isOpen=false`) | Outline button, neutral |
| Panel open (`isOpen=true`) | Accent border + glow ring |
| Filters active (`activeCount>0`, `isOpen=false`) | Accent border + badge pill |
| Filters active + panel open | Accent border + glow + badge pill |

**Icon:** `<Filter size={14} />` from lucide-react — replaces all inline SVG funnel icons.

---

## CSS Changes

`.filter-badge` moves from `src/styles/pages/reviews.css` to `src/styles/components.css`.
No style changes — exact same rule, global scope.

---

## Per-Page Active Count Logic

| Page | Before | After |
|---|---|---|
| **Reviews** | `computeActiveFilterCount()` ✓ | No change |
| **Rankings** | None | `(consensusFilter !== "all" ? 1 : 0) + (groupSearch !== "" ? 1 : 0)` |
| **Jurors** | None | `(statusFilter !== "all" ? 1 : 0) + (affilFilter !== "all" ? 1 : 0)` |
| **Projects** | None | `(projectFilter !== "" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0)` |
| **AuditLog** | `hasAuditFilters` (boolean) | Count: `(auditSearch ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0) + (eventType.length ? 1 : 0) + (actor.length ? 1 : 0) + (resource.length ? 1 : 0)` |
| **Periods** | None | `(statusFilter !== "all" ? 1 : 0) + (lockFilter !== "all" ? 1 : 0)` |

---

## Files Changed

| File | Change |
|---|---|
| `src/shared/ui/FilterButton.jsx` | **New** — shared component |
| `src/styles/components.css` | Add `.filter-badge` rule (moved from reviews.css) |
| `src/styles/pages/reviews.css` | Remove `.filter-badge` rule |
| `src/admin/pages/ReviewsPage.jsx` | Use `FilterButton`, remove inline button markup |
| `src/admin/pages/RankingsPage.jsx` | Use `FilterButton`, add count, remove inline SVG |
| `src/admin/pages/JurorsPage.jsx` | Use `FilterButton`, add count, remove inline SVG |
| `src/admin/pages/ProjectsPage.jsx` | Use `FilterButton`, add count, remove inline SVG |
| `src/admin/pages/AuditLogPage.jsx` | Use `FilterButton`, extend count from `hasAuditFilters` |
| `src/admin/pages/PeriodsPage.jsx` | Use `FilterButton`, add count, remove inline SVG |

---

## Out of Scope

- Jury-side pages (no filters exist)
- Filter persistence (separate concern)
- Responsive sheet/popover changes
- Any filter panel layout changes
