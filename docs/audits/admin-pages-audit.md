# Admin Pages Audit

Quick-scan of every admin page for concrete issues.
Date: 2026-04-05

---

## Legend

| Symbol | Meaning |
|---|---|
| `a11y` | Accessibility issue |
| `style` | Hardcoded color / should use CSS variable |
| `dead` | Dead code (unused variable or import) |
| `ux` | UX gap (missing state, native browser primitive, etc.) |
| ✅ | Fixed |
| ⏭ | Intentionally skipped (see note) |

---

## Status Overview

| Page | File | Status |
|---|---|---|
| Overview | `OverviewPage.jsx` | Clean |
| Rankings | `RankingsPage.jsx` | Clean |
| Analytics | `AnalyticsPage.jsx` | Clean |
| Heatmap | `HeatmapPage.jsx` | Clean |
| Reviews | `ReviewsPage.jsx` | Clean |
| Jurors | `JurorsPage.jsx` | Not audited |
| Projects | `ProjectsPage.jsx` | Not audited |
| Periods | `PeriodsPage.jsx` | Not audited |
| Criteria | `CriteriaPage.jsx` | Not audited |
| Entry Control | `EntryControlPage.jsx` | Not audited |
| Settings | `SettingsPage.jsx` | Not audited |
| Audit Log | `AuditLogPage.jsx` | Not audited |

---

## Findings

### Overview

- ✅ `ux` KPI completion sub-label said "submitted" → "completed"
- ✅ `style` Ready-to-submit bullet and bar color was wrong → `var(--accent)`
- ✅ `dead` `kpi.avg` included editing jurors → fixed to `finalSubmitted && !editEnabled`
- ✅ `dead` Live feed had stale `"partial"` state references → replaced with `ready_to_submit`
- ✅ `dead` Unused `isDemoMode` prop removed from destructuring

### Rankings

- ✅ `ux` Native `title=` on medal emoji spans — removed (`aria-label` already present)
- ✅ `a11y` Invalid `alt=` on `<span role="img">` medal spans — removed
- ✅ `a11y` `<span onClick>` "Clear filters" → `<button type="button">`
- ✅ `a11y` `<div onClick>` export option cards → `<button type="button">`
- ✅ `ux` `title=` on Send button → `aria-label=`
- ✅ `dead` `buildRankingsExportData()` called unconditionally — moved inside `else` branch (not called for XLSX)
- ✅ `ux` Rank + Average columns both highlighted when sorting by avg → introduced distinct `"rank"` sort key so only the active column highlights
- ✅ `ux` Rank column header now sortable
- ✅ `dead` `fmtMembers` defined twice (in `handleExport` and `generateFile`) — hoisted to component scope
- ✅ `dead` Empty `<div className="filter-tags" />` placeholder — removed

### Analytics

- ✅ `style` Legend dot colors hardcoded — now use exported `BAND_COLORS` from `RubricAchievementChart.jsx` so chart and legend stay in sync

### Heatmap

- ✅ `ux` Native `title=` on Send button — removed
- ✅ `a11y` Export option cards `<div onClick>` → `<button type="button">`
- ✅ `dead` `jurorFinalMap` removed from destructuring
- ✅ `dead` `groupAverages` removed from `useHeatmapData` destructuring — never used; component computes `visibleAverages` itself
- ✅ `a11y` Export toggle, close, Send, and Download buttons missing `type="button"` → added to all four
- ✅ `a11y` Close `×` button had no accessible label → `aria-label="Close export panel"` added
- ✅ `style` `import JurorBadge` and `import JurorStatusPill` placed after a function definition — moved to top of imports
- ✅ `dead` Stale comment `// Criteria tabs are built dynamically…` removed (obvious from the code)
- ✅ `dead` `useHeatmapData`: `completedJurors` + `groupAverages` useMemos removed — page replaced hook average with `computeVisibleAverages`; `filterCompletedJurors` + `computeGroupAverages` imports removed; `jurorFinalMap` removed from return (internal dep only)
- ✅ `dead` `useHeatmapData.test.jsx`: `groupAverages` assertion removed from griddata.01; entire `groupAverages edge cases` describe block (griddata.02–07) deleted; unused `BASE_GROUPS` constant removed
- ✅ `dead` `_toast` had underscore "unused" prefix but was actively used in `handleDownload` → renamed to `toast`
- ✅ `style` 4 inline SVG elements (3× Download, 1× Send) → replaced with `<Download>` / `<Send>` from lucide-react
- ✅ `ux` `handleDownload` didn't await `requestExport` — CSV/PDF success toast fired before download completed, errors silently swallowed → made async + added `await`
- ✅ `a11y` `<span role="rowheader">` inside `<th role="columnheader">` — contradictory roles → span removed, plain text
- ✅ `style` Per-juror avg cell wrapped in unnecessary IIFE just to bind `const avg` → IIFE removed, direct `jurorRowAvgs[jurorIdx]` access
- ⏭ `dead` `useGridSort` returns 7 filter values (`jurorFilter`, `groupScoreFilters`, `setJurorFilter`, `clearSort`, `setGroupScoreFilter`, `clearGroupScoreFilter`, `clearAllFilters`) HeatmapPage never uses; filter branches in `visibleJurors` are always no-ops (no filter UI); left in place — filter UI is planned

### Reviews

- ✅ `dead` `updatedDateError` and `completedDateError` removed from destructuring — never read anywhere in component
- ✅ `dead` `buildEmptyFilters` removed from destructuring and removed unused call in `handleClearFilters` — return value was always discarded
- ✅ `dead` `_toast` → `toast` (declared with underscore prefix but actively used in `handleExport`)
- ✅ `a11y` Filter toggle button missing `type="button"` → added
- ✅ `a11y` Export toggle button missing `type="button"` → added
- ✅ `a11y` "Clear filters →" `<span onClick>` → `<button type="button">` (inline `cursor:pointer` style also removed)
- ✅ `a11y` Filter-panel close button: `type="button"` + `aria-label="Close filter panel"` added
- ✅ `a11y` Export-panel close button: `type="button"` + `aria-label="Close export panel"` added
- ✅ `a11y` Export format cards `<div onClick>` → `<button type="button">`
- ✅ `a11y` Send button: `type="button"` added, `title=` → `aria-label=`
- ✅ `a11y` Download button: `type="button"` added
- ✅ `a11y` All pagination nav buttons (first/prev/next/last): `type="button"` added, `title=` → `aria-label=`
- ✅ `a11y` Page-number and page-size buttons: `type="button"` added
- ✅ `a11y` "Clear all" button in filter row missing `type="button"` → added
- ✅ `style` Search icon in header → `<Search>` from lucide-react
- ✅ `style` Filter toggle button SVG → `<Filter>` from lucide-react
- ✅ `style` Export toggle button SVG → `<Download>` from lucide-react
- ✅ `style` Filter-active banner SVG → `<CheckCircle2>` from lucide-react
- ✅ `style` Filter panel header SVG → `<Filter>` from lucide-react
- ✅ `style` "Clear all" button SVG → `<X>` from lucide-react
- ✅ `style` Export panel header SVG → `<Download>` from lucide-react
- ✅ `style` Send button inline SVG → `<Send>` from lucide-react
- ✅ `style` Download button inline SVG → `<Download>` from lucide-react
- ✅ `style` Comment column inline SVG → `<MessageSquare>` from lucide-react

### Jurors

No issues found (agent false-positive — `_toast` is used).

### Projects

No issues found (agent false-positive — `_toast` is used).

### Periods

No issues found (agent false-positive — `_toast` is used).

### Criteria

- ⏭ `style` `color: "#fff"` on danger button — standard white-on-red; no `--text-on-danger` var defined, leave as-is

### Entry Control

- ⏭ `style` QR library config (`dotsOptions.color`, etc.) — JS library takes hex, CSS vars not applicable

### Settings

- ⏭ `style` `AVATAR_COLORS` array hardcoded — no design-token precedent for avatar palette; leave as-is

### Audit Log

No issues found (agent false-positive — `_toast` is used).
