# Implementation Plan

Derived from the 2026-03-14 audit. Organized by priority for a small internal tool.

---

## Phase 1 — Critical Fixes

These items pose real user-facing risk during evaluation events.

### 1.1 Unsaved Change Guard (Settings Panels)

**Problem:** Admin can navigate away from an open Settings panel mid-edit and lose data silently.

**Fix:** Add `isDirty` flag to each manage panel. Use `window.confirm` before panel collapse or tab switch.

**Files:** `src/admin/ManageProjectsPanel.jsx`, `ManageJurorsPanel.jsx`, `ManageSemesterPanel.jsx`, `ManagePermissionsPanel.jsx`

---

### 1.2 Semester Delete Warning — Clarify Data Loss Scope

**Problem:** Current delete confirmation says "This action cannot be undone" but does not mention that all jurors, projects, and scores for the semester are also deleted.

**Fix:** Update confirm message to explicitly list cascaded data loss.

**File:** `src/admin/ManageSemesterPanel.jsx`

---

### 1.3 Single-Open Accordion in Settings

**Problem:** All four panels can be open simultaneously, creating visual overload.

**Fix:** Implement single-open accordion — opening one panel collapses the others.

**Files:** `src/admin/SettingsPage.jsx`

---

## Phase 2 — UX / Accessibility / Performance

Lower urgency but improves daily-use quality.

### 2.1 Overview Tab — Manual Refresh + Last Updated Timestamp

**Problem:** No way to know if displayed data is current. No manual refresh.

**Fix:** Add "Last updated: X seconds ago" label and a refresh button to the Overview tab.

**File:** `src/admin/OverviewTab.jsx`

---

### 2.2 Analytics Tab — Lazy Loading

**Problem:** Analytics data is fetched even when the tab is never visited.

**Fix:** Defer analytics data fetch until the Analytics tab is first opened.

**File:** `src/admin/AnalyticsTab.jsx`

---

### 2.3 Keyboard Navigation — Admin Settings Accordion

**Problem:** Accordion panels are not keyboard-navigable (no `aria-expanded`, no Enter/Space to toggle).

**Fix:** Add proper ARIA roles and keyboard event handlers.

**Files:** `src/admin/SettingsPage.jsx`

---

### 2.4 CSV Import — Row-Level Error Reporting

**Problem:** Parse errors during CSV import show a generic message. Individual row issues are not surfaced clearly.

**Fix:** Collect per-row parse errors into an array; display as a dismissible warning list.

**File:** `src/admin/ManageProjectsPanel.jsx`

---

### 2.5 DnD Accessibility

**Problem:** Drag-and-drop student reordering has no keyboard alternative.

**Fix:** Add keyboard reorder controls (up/down arrows) as an accessible fallback.

**File:** `src/admin/ManageProjectsPanel.jsx`

---

## Phase 3 — Refactors and Polish

Nice-to-have improvements that reduce code duplication or improve maintainability.

### 3.1 Shared Error Pattern Across Settings Panels

**Problem:** Each of the four settings panels manages its own `panelError` state with near-identical error display logic.

**Fix:** Extract a shared `usePanel` hook or `PanelErrorBanner` component.

**Files:** All `Manage*Panel.jsx` files

---

### 3.2 Score Grid — Empty State Polish

**Problem:** Score grid with no data shows a generic empty state that does not guide the admin.

**Fix:** Show a contextual message ("No evaluations recorded yet for this semester") with a link to the Settings tab.

**File:** `src/admin/ScoreGrid.jsx`

---

### 3.3 Toast System — Consolidate Usage

**Problem:** Some error states use `window.confirm` or inline error banners; others use the toast system.

**Fix:** Audit and standardize — use toast for success/info, inline banners for form validation errors.

**Files:** Various admin components

---

## Out of Scope (Intentionally Deferred)

The following were raised in the audit but are **not planned** given the project's scale:

- **React Router** — state-based routing is sufficient for this tool
- **RPC caching layer** — fresh data preferred during live evaluation
- **Session-based admin auth** — stateless RPC model acceptable for internal use
- **6-digit juror PIN** — 4-digit kept for usability
- **Context/Redux for prop drilling** — component hierarchy is shallow enough
