# Export Button: Evaluation Criteria & Outcomes Pages

**Date:** 2026-04-17  
**Scope:** Add Export button to `CriteriaPage` and `OutcomesPage`, following established VERA export patterns.

---

## Context

Eight admin pages already have an Export button (Projects, Jurors, Rankings, Reviews, Periods, Analytics, Heatmap, Export). `CriteriaPage` and `OutcomesPage` are the remaining data-heavy pages without one. The implementation follows the existing hook-based export pattern (like `useGridExport.js` for HeatmapPage).

---

## Architecture

**Approach: Per-page export hooks**

Two new hooks alongside the existing `useGridExport.js`:

- `src/admin/hooks/useCriteriaExport.js`
- `src/admin/hooks/useOutcomesExport.js`

Each hook encapsulates: column definitions, cell formatting, multi-tab XLSX assembly, audit logging, and `downloadTable` call. Pages stay lean — they just call the hook and render `ExportPanel`.

**Why not inline (like ProjectsPage)?**  
Multi-tab XLSX logic is ~80–100 lines per page. A hook keeps the page readable and follows the HeatmapPage precedent.

**Multi-tab XLSX strategy:**  
For multi-tab XLSX, hooks either reuse `exportGridXLSX` from `exportXLSX.js` (if its interface is adaptable) or a small new helper is added there. The implementation plan determines the exact approach. `downloadTable.js` is not changed — CSV/PDF paths still go through it with Tab 1 data only.

---

## CriteriaPage Export

### Trigger

Export button added to the page toolbar (same position as other pages: right side, next to any existing action buttons). Toggles `exportOpen` state. `ExportPanel` renders below the toolbar when open.

### XLSX Sheet Structure (3 tabs)

**Tab 1 — "Criteria"**

| # | Ad | Kısa Ad | Ağırlık | Açıklama | Renk |
|---|-----|---------|---------|----------|------|
| 1 | Tasarım | Tasarım | 25 | ... | #4f46e5 |

- `#` — 1-based display index (not internal UUID)
- Ağırlık — `criterion.max` numeric value
- Renk — hex color string, or empty if unset

**Tab 2 — "Rubric"**

| Kriter | Bant | Min | Max |
|--------|------|-----|-----|
| Tasarım | Mükemmel | 90 | 100 |
| Tasarım | İyi | 75 | 89 |

- One row per (criterion × band). Bands listed high-to-low.
- Kriter column uses `criterion.label`.

**Tab 3 — "Mappings"**

| Kriter | Çıktı Kodu | Tür |
|--------|------------|-----|
| Tasarım | PÇ1 | Direct |
| Tasarım | PÇ3 | Indirect |

- One row per (criterion × mapped outcome). Criteria with no mappings are omitted.

### CSV / PDF

Tab 1 ("Criteria") only — flat table, no rubric/mapping detail.

### Audit Log

```js
logExportInitiated({
  action: "export.criteria",
  organizationId,
  resourceType: "criteria",
  details: {
    format,
    row_count: criteria.length,
    period_name: periodName,
    filters: { criterion_count: criteria.length }
  }
})
```

### Filename

`VERA_criteria_[tenantCode]_[periodName]_[yyyy-mm-dd].xlsx`

---

## OutcomesPage Export

### Trigger

Same pattern — Export button in toolbar, `exportOpen` state, `ExportPanel`.

### XLSX Sheet Structure (2 tabs)

**Tab 1 — "Outcomes"**

| Kod | Ad | Açıklama | Kapsam | Direct | Indirect |
|-----|----|----------|--------|--------|----------|
| PÇ1 | Mühendislik Bilgisi | ... | Direct | 3 | 1 |
| PÇ2 | Problem Çözme | ... | Indirect | 0 | 2 |
| PÇ3 | Tasarım | ... | Unmapped | 0 | 0 |

- Kapsam — `"Direct"` / `"Indirect"` / `"Unmapped"` (leading coverage type)
- Direct — count of criteria mapped as Direct
- Indirect — count of criteria mapped as Indirect

**Tab 2 — "Mappings"**

| Çıktı | Çıktı Adı | Kriter | Tür |
|-------|-----------|--------|-----|
| PÇ1 | Mühendislik Bilgisi | Tasarım | Direct |
| PÇ1 | Mühendislik Bilgisi | Sunum | Indirect |

- One row per (outcome × mapped criterion).
- Outcomes with no mappings are omitted.

### CSV / PDF

Tab 1 ("Outcomes") only — flat table.

### Audit Log

```js
logExportInitiated({
  action: "export.outcomes",
  organizationId,
  resourceType: "outcomes",
  details: {
    format,
    row_count: outcomes.length,
    period_name: periodName,
    filters: { outcome_count: outcomes.length }
  }
})
```

### Filename

`VERA_outcomes_[tenantCode]_[periodName]_[yyyy-mm-dd].xlsx`

---

## ExportPanel Integration

Both pages use the existing `ExportPanel` component (already used by Projects, Jurors, etc.) with the same prop interface:

```jsx
<ExportPanel
  open={exportOpen}
  onClose={() => setExportOpen(false)}
  onExport={handleExport}        // from hook
  generating={generating}        // from hook
  previewBlob={previewBlob}      // from hook
/>
```

No changes to `ExportPanel` itself.

---

## Data Access

Both hooks receive data already loaded by the page (criteria array, outcomes array, mappings). No additional API calls.

- `CriteriaPage` — passes `criteria` (with `.rubric` and `.outcomes` / `.outcomeTypes`)
- `OutcomesPage` — passes `outcomes` + `getMappedCriteria(outcomeId)` callback or equivalent mappings object

---

## Files Changed / Created

| Action | File |
|--------|------|
| Create | `src/admin/hooks/useCriteriaExport.js` |
| Create | `src/admin/hooks/useOutcomesExport.js` |
| Modify | `src/admin/pages/CriteriaPage.jsx` — add export button + ExportPanel |
| Modify | `src/admin/pages/OutcomesPage.jsx` — add export button + ExportPanel |

No changes to shared utilities, migrations, or API layer.

---

## Out of Scope

- No new API endpoints or RPC changes
- No changes to `downloadTable.js` (a small helper may be added to `exportXLSX.js` if needed for multi-tab)
- No PDF-specific multi-tab support (PDF always gets Tab 1 only — consistent with rest of app)
- No real-time export (data is already in component state)
