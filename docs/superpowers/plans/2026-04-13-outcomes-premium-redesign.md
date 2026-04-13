# Outcomes & Mapping Premium Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign admin Outcomes & Mapping page with premium UI — inline descriptions (no expand/chevron), KPI cards, coverage progress bar, enhanced actions menu, improved edit drawer with coverage type selector.

**Architecture:** Modify OutcomesPage.jsx in-place (remove expand logic, restructure JSX), extend outcomes.css with new card/bar/badge styles using existing theme variables, update OutcomeDetailDrawer with coverage type radio. All styles use CSS variables from variables.css — no hardcoded colors.

**Tech Stack:** React, CSS (custom properties), lucide-react icons, existing Drawer/FloatingMenu/ConfirmDialog components.

**Spec:** `docs/superpowers/specs/2026-04-13-outcomes-premium-redesign-design.md`
**Mockup:** `docs/concepts/outcomes-redesign-mockup.html`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/styles/pages/outcomes.css` | Modify | New KPI card, coverage bar, code badge, inline desc, mobile card actions styles |
| `src/admin/pages/OutcomesPage.jsx` | Modify | Remove expand/chevron, new KPI cards, coverage bar, enhanced menu, row-click-to-edit, mobile card actions |
| `src/admin/drawers/OutcomeDetailDrawer.jsx` | Modify | Add coverage type radio selector, readonly identity fields |

---

### Task 1: CSS — KPI Cards, Coverage Bar, Code Badge

**Files:**
- Modify: `src/styles/pages/outcomes.css`

- [ ] **Step 1: Add KPI card styles to outcomes.css**

Append after the existing `.col-info-icon:hover` rule (line 251):

```css
/* ── KPI Cards ──────────────────────────────────────────────── */

.acc-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.acc-kpi-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 18px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.acc-kpi-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.acc-kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: var(--radius) var(--radius) 0 0;
}

.acc-kpi-card.kpi-total::before { background: var(--accent); }
.acc-kpi-card.kpi-direct::before { background: var(--success); }
.acc-kpi-card.kpi-indirect::before { background: var(--warning); }
.acc-kpi-card.kpi-unmapped::before { background: var(--text-quaternary); }

.acc-kpi-icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  margin-bottom: 10px;
}

.acc-kpi-card.kpi-total .acc-kpi-icon { background: var(--accent-soft); color: var(--accent); }
.acc-kpi-card.kpi-direct .acc-kpi-icon { background: var(--success-soft); color: var(--success); }
.acc-kpi-card.kpi-indirect .acc-kpi-icon { background: var(--warning-soft); color: var(--warning); }
.acc-kpi-card.kpi-unmapped .acc-kpi-icon { background: rgba(148,163,184,0.1); color: var(--text-tertiary); }

.acc-kpi-icon svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
  fill: none;
  stroke: currentColor;
}

.acc-kpi-value {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1;
  margin-bottom: 4px;
}

.acc-kpi-card.kpi-total .acc-kpi-value { color: var(--text-primary); }
.acc-kpi-card.kpi-direct .acc-kpi-value { color: var(--success); }
.acc-kpi-card.kpi-indirect .acc-kpi-value { color: var(--warning); }
.acc-kpi-card.kpi-unmapped .acc-kpi-value { color: var(--text-tertiary); }

.acc-kpi-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 1px;
}

.acc-kpi-sublabel {
  font-size: 10px;
  color: var(--text-quaternary);
  font-weight: 500;
}
```

- [ ] **Step 2: Add coverage progress bar styles**

Append:

```css
/* ── Coverage Progress Bar ──────────────────────────────────── */

.acc-coverage-progress {
  margin-bottom: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 18px;
  box-shadow: var(--shadow-sm);
}

.acc-coverage-progress-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.acc-coverage-progress-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-tertiary);
}

.acc-coverage-progress-pct {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
}

.acc-coverage-bar-track {
  height: 8px;
  background: var(--surface-1);
  border-radius: 999px;
  overflow: hidden;
  display: flex;
}

.acc-coverage-bar-direct {
  height: 100%;
  background: linear-gradient(90deg, var(--success), #22c55e);
  border-radius: 999px 0 0 999px;
  transition: width 0.4s ease;
}

.acc-coverage-bar-indirect {
  height: 100%;
  background: linear-gradient(90deg, var(--warning), #fbbf24);
  transition: width 0.4s ease;
}

.acc-coverage-bar-legend {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.acc-coverage-bar-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.acc-coverage-bar-legend-item .legend-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
```

- [ ] **Step 3: Add upgraded code badge and inline description styles**

Append:

```css
/* ── Code Badge (upgraded) ──────────────────────────────────── */

.acc-code-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--mono);
  letter-spacing: 0.3px;
  white-space: nowrap;
  line-height: 1.3;
}

.acc-code-badge.mapped {
  background: linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.04));
  color: var(--accent-dark);
  border: 1px solid rgba(59,130,246,0.12);
}

.acc-code-badge.unmapped {
  background: var(--surface-1);
  color: var(--text-tertiary);
  border: 1px solid var(--border);
}

.dark-mode .acc-code-badge.mapped {
  background: linear-gradient(135deg, rgba(96,165,250,0.10), rgba(96,165,250,0.05));
  color: #93c5fd;
  border-color: rgba(96,165,250,0.15);
}

.acc-code-prefix {
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
}

/* ── Inline outcome description ─────────────────────────────── */

.acc-outcome-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.acc-outcome-desc {
  font-size: 11.5px;
  color: var(--text-tertiary);
  line-height: 1.5;
  max-width: 420px;
}
```

- [ ] **Step 4: Add floating menu description sublabel style**

Append:

```css
/* ── Floating menu item description ─────────────────────────── */

.floating-menu-item-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.floating-menu-item-desc {
  font-size: 10px;
  font-weight: 450;
  color: var(--text-quaternary);
}

.floating-menu-item.danger .floating-menu-item-desc {
  color: rgba(225,29,72,0.5);
}

.dark-mode .floating-menu-item-desc {
  color: rgba(241,245,249,0.4);
}

.dark-mode .floating-menu-item.danger .floating-menu-item-desc {
  color: rgba(251,113,133,0.5);
}
```

- [ ] **Step 5: Add coverage type selector styles for drawer**

Append:

```css
/* ── Coverage Type Selector (drawer) ────────────────────────── */

.acc-coverage-type-selector {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.acc-coverage-type-option {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s;
  background: var(--bg-card);
}

.acc-coverage-type-option:hover {
  background: var(--surface-2);
}

.acc-coverage-type-option.selected.cov-direct {
  background: var(--success-soft);
  border-color: rgba(22,163,74,0.25);
}

.acc-coverage-type-option.selected.cov-indirect {
  background: var(--warning-soft);
  border-color: rgba(217,119,6,0.25);
}

.acc-cov-radio {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--border-strong);
  flex-shrink: 0;
  transition: all 0.15s;
}

.acc-coverage-type-option.selected.cov-direct .acc-cov-radio {
  border-width: 5px;
  border-color: var(--success);
}

.acc-coverage-type-option.selected.cov-indirect .acc-cov-radio {
  border-width: 5px;
  border-color: var(--warning);
}

.acc-cov-type-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.acc-cov-type-desc {
  font-size: 10px;
  color: var(--text-quaternary);
  font-weight: 500;
}

.acc-coverage-type-option.selected.cov-direct .acc-cov-type-label { color: var(--success); }
.acc-coverage-type-option.selected.cov-indirect .acc-cov-type-label { color: var(--warning); }

.dark-mode .acc-coverage-type-option.selected.cov-direct {
  background: rgba(22,163,74,0.10);
  border-color: rgba(22,163,74,0.30);
}

.dark-mode .acc-coverage-type-option.selected.cov-indirect {
  background: rgba(217,119,6,0.10);
  border-color: rgba(217,119,6,0.30);
}
```

- [ ] **Step 6: Update mobile portrait media query**

Replace the existing `@media (max-width: 768px) and (orientation: portrait)` block (lines 256–350 in outcomes.css) with the updated version that uses card-based layout with inline actions instead of the expand/chevron grid:

```css
/* ─── Mobile card actions ───────────────────────────────────── */

.acc-m-card-actions {
  display: none;
}

@media (max-width: 768px) and (orientation: portrait) {
  /* KPI grid: 2x2 on mobile */
  .acc-kpi-grid {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .acc-kpi-card {
    padding: 12px;
  }

  .acc-kpi-icon {
    width: 28px;
    height: 28px;
    margin-bottom: 8px;
  }

  .acc-kpi-icon svg {
    width: 14px;
    height: 14px;
  }

  .acc-kpi-value {
    font-size: 22px;
  }

  /* Coverage bar legend stacks */
  .acc-coverage-bar-legend {
    flex-wrap: wrap;
    gap: 8px;
  }

  /* Table → card layout */
  #page-accreditation .table-wrap {
    overflow: hidden;
    border: none;
    background: none;
    box-shadow: none;
    border-radius: 0;
  }

  .acc-table { display: contents; }
  .acc-table thead { display: none !important; }
  .acc-table tbody { display: flex; flex-direction: column; gap: 8px; width: 100%; }

  .acc-table tbody tr.acc-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
    box-shadow: var(--shadow-sm);
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .acc-table tbody tr.acc-row:hover {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-ring);
  }

  /* Base cell reset */
  .acc-table td {
    display: block;
    border-bottom: none !important;
    padding: 0 !important;
  }

  /* Code + coverage on same line */
  .acc-table td[data-label="Code"],
  .acc-table td[data-label="Coverage"] {
    display: inline-block;
  }

  .acc-table td[data-label="Code"] {
    margin-bottom: 4px;
  }

  /* Hide desktop actions column */
  .acc-table td.col-acc-actions {
    display: none;
  }

  /* Show mobile card actions */
  .acc-m-card-actions {
    display: flex;
    gap: 6px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }

  .acc-m-action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 7px 0;
    border-radius: 7px;
    border: 1px solid var(--border);
    background: transparent;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: var(--font);
    transition: all 0.12s;
  }

  .acc-m-action-btn:hover {
    background: var(--surface-1);
  }

  .acc-m-action-btn svg {
    width: 13px;
    height: 13px;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
  }

  .acc-m-action-btn.primary {
    background: var(--accent-soft);
    border-color: rgba(59,130,246,0.15);
    color: var(--accent-dark);
  }

  .acc-m-action-btn.danger {
    color: var(--danger);
    border-color: rgba(225,29,72,0.15);
  }

  .acc-m-action-btn.danger:hover {
    background: var(--danger-soft);
  }
}

/* ─── Landscape compact (≤ 768px landscape) ──────────────────
   Normal table; hide description.
   ──────────────────────────────────────────────────────────── */
@media (max-width: 768px) and (orientation: landscape) {
  #page-accreditation .table-wrap { overflow-x: auto; }

  .acc-table thead th { padding: 6px 10px; font-size: 10px; }
  .acc-table tbody td { padding: 6px 8px; font-size: 12px; }

  .acc-outcome-desc { display: none; }
}
```

- [ ] **Step 7: Verify CSS compiles — run build**

Run: `npm run build`
Expected: Build succeeds with no CSS errors.

---

### Task 2: OutcomesPage.jsx — Remove Expand, Add KPI Cards & Coverage Bar

**Files:**
- Modify: `src/admin/pages/OutcomesPage.jsx`

- [ ] **Step 1: Update imports — replace Icon with specific lucide icons**

Replace:
```jsx
import { Pencil, Trash2, MoreVertical, Icon } from "lucide-react";
```

With:
```jsx
import { Pencil, Trash2, Copy, MoreVertical, Layers, CheckCircle2, AlertCircle, XCircle, ChevronRight } from "lucide-react";
```

- [ ] **Step 2: Remove OutcomeDetailRow and SortIcon components (lines 48–105)**

Delete the `SortIcon` component (lines 48–57) and `OutcomeDetailRow` component (lines 59–105) entirely. They are no longer needed.

- [ ] **Step 3: Rewrite OutcomeRow — remove expand, add inline desc and mobile actions**

Replace the entire `OutcomeRow` component (lines 107–260) with:

```jsx
function OutcomeRow({
  outcome,
  mappedCriteria,
  coverage,
  onEdit,
  onDelete,
  onDuplicate,
  onRemoveChip,
  onAddMapping,
  onCycleCoverage,
  openMenuId,
  setOpenMenuId,
}) {
  const menuKey = `acc-row-${outcome.id}`;
  const isMenuOpen = openMenuId === menuKey;
  const hasMappings = mappedCriteria.length > 0;
  const codePrefix = outcome.code.replace(/[\d.]+$/, "").trim();
  const codeNum = outcome.code.replace(/^[^\d]*/, "").trim();

  return (
    <tr
      className="acc-row"
      onClick={() => onEdit(outcome)}
      style={{ cursor: "pointer" }}
    >
      {/* Code */}
      <td data-label="Code">
        <span className={`acc-code-badge ${hasMappings ? "mapped" : "unmapped"}`}>
          {codePrefix && <span className="acc-code-prefix">{codePrefix}</span>}
          {codeNum || outcome.code}
        </span>
      </td>

      {/* Outcome label + inline description */}
      <td data-label="Outcome">
        <div className="acc-outcome-cell">
          <span className="acc-outcome-label">{outcome.label}</span>
          {outcome.description && (
            <span className="acc-outcome-desc">{outcome.description}</span>
          )}
        </div>
      </td>

      {/* Mapped criteria chips */}
      <td data-label="Criteria">
        <div className="acc-chip-wrap">
          {mappedCriteria.map((c) => (
            <span key={c.id} className="acc-chip">
              <span className="acc-crit-dot" style={{ background: c.color || "var(--accent)" }} />
              {c.short_label || c.label}
              <span
                className="acc-chip-x"
                onClick={(e) => { e.stopPropagation(); onRemoveChip(c.id, outcome.id); }}
                title="Remove mapping"
              >
                <XCircle size={9} strokeWidth={2.5} />
              </span>
            </span>
          ))}
          {coverage === "indirect" && !hasMappings && (
            <span style={{ fontSize: 10.5, color: "var(--text-quaternary)", fontWeight: 500 }}>Indirect coverage</span>
          )}
          <button
            className="acc-chip-add"
            onClick={(e) => { e.stopPropagation(); onAddMapping(outcome); }}
            title="Map a criterion"
          >
            +{!hasMappings && coverage !== "indirect" ? " Map criterion" : ""}
          </button>
        </div>
      </td>

      {/* Coverage */}
      <td className="text-center" data-label="Coverage">
        <span
          className={coverageBadgeClass(coverage)}
          onClick={(e) => {
            e.stopPropagation();
            if (coverage !== "direct") onCycleCoverage(outcome.id);
          }}
          title={coverage === "direct" ? "Explicitly assessed by mapped criteria" : "Click to change coverage level"}
        >
          <span className="acc-cov-dot" />
          {coverageLabel(coverage)}
        </span>
      </td>

      {/* Actions */}
      <td className="col-acc-actions" style={{ textAlign: "right" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <FloatingMenu
            trigger={
              <button
                className="juror-action-btn"
                title="Actions"
                onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : menuKey); }}
              >
                <MoreVertical size={14} />
              </button>
            }
            isOpen={isMenuOpen}
            onClose={() => setOpenMenuId(null)}
            placement="bottom-end"
          >
            <button
              className="floating-menu-item"
              onMouseDown={(e) => { e.stopPropagation(); setOpenMenuId(null); onEdit(outcome); }}
            >
              <Pencil size={13} strokeWidth={2} />
              <div className="floating-menu-item-body">
                <span>Edit Outcome</span>
                <span className="floating-menu-item-desc">Description, mappings</span>
              </div>
            </button>
            <button
              className="floating-menu-item"
              onMouseDown={(e) => { e.stopPropagation(); setOpenMenuId(null); onDuplicate(outcome); }}
            >
              <Copy size={13} strokeWidth={2} />
              <div className="floating-menu-item-body">
                <span>Duplicate</span>
                <span className="floating-menu-item-desc">Copy with new code</span>
              </div>
            </button>
            <div className="floating-menu-divider" />
            <button
              className="floating-menu-item danger"
              onMouseDown={(e) => { e.stopPropagation(); setOpenMenuId(null); onDelete(outcome); }}
            >
              <Trash2 size={13} strokeWidth={2} />
              <div className="floating-menu-item-body">
                <span>Remove Outcome</span>
                <span className="floating-menu-item-desc">Permanently delete</span>
              </div>
            </button>
          </FloatingMenu>
        </div>

        {/* Mobile card actions (visible only in portrait) */}
        <div className="acc-m-card-actions">
          <button className="acc-m-action-btn primary" onClick={(e) => { e.stopPropagation(); onEdit(outcome); }}>
            <Pencil size={13} strokeWidth={2} /> Edit
          </button>
          <button className="acc-m-action-btn danger" onClick={(e) => { e.stopPropagation(); onDelete(outcome); }}>
            <Trash2 size={13} strokeWidth={2} /> Remove
          </button>
        </div>
      </td>
    </tr>
  );
}
```

- [ ] **Step 4: Remove CoverageHelpPopover component (lines 264–283)**

Delete the `CoverageHelpPopover` component entirely. Coverage info will be clear from the KPI cards and coverage bar.

- [ ] **Step 5: Remove expand-related state from OutcomesPage**

In the main `OutcomesPage` component, remove:
```jsx
const [expandedRows, setExpandedRows] = useState(new Set());
```
and:
```jsx
const [coverageHelpOpen, setCoverageHelpOpen] = useState(false);
```
and the `useEffect` that listens for `coverageHelpOpen` clicks (lines 355–363).

Also remove `toggleExpand` function and `toggleSort` function (replace sort toggle with inline).

- [ ] **Step 6: Add duplicate handler**

Add after `handleDeleteConfirm`:

```jsx
const handleDuplicate = async (outcome) => {
  setPanelError("");
  try {
    const newCode = outcome.code + " (copy)";
    await fw.addOutcome({
      code: newCode,
      shortLabel: outcome.label,
      description: outcome.description || "",
      criterionIds: fw.getMappedCriteria(outcome.id).map((c) => c.id),
    });
    toast.success("Outcome duplicated");
  } catch (e) {
    toast.error(e?.message || "Failed to duplicate outcome");
  }
};
```

- [ ] **Step 7: Rewrite the render section — KPI cards + coverage bar + simplified table**

Replace the entire render block from `{noFramework ? (` to the closing `)}` of the ternary (everything inside the `<>...</>` for the framework-exists branch) with the new layout. The key structural changes:

1. Replace `scores-kpi-strip` with `acc-kpi-grid` containing 4 `acc-kpi-card` elements
2. Add `acc-coverage-progress` bar after KPI grid
3. Remove `table-card-hint` ("Expand rows for details")
4. Remove expand column (`<th>` and `<td>`) from table
5. Remove `isExpanded` / `onToggleExpand` props from OutcomeRow
6. Add `onDuplicate={handleDuplicate}` prop to OutcomeRow
7. Remove `CoverageHelpPopover` from coverage column header

The KPI cards JSX:

```jsx
<div className="acc-kpi-grid">
  <div className="acc-kpi-card kpi-total">
    <div className="acc-kpi-icon"><Layers size={16} strokeWidth={2} /></div>
    <div className="acc-kpi-value">{totalOutcomes}</div>
    <div className="acc-kpi-label">Total Outcomes</div>
    <div className="acc-kpi-sublabel">Defined in framework</div>
  </div>
  <div className="acc-kpi-card kpi-direct">
    <div className="acc-kpi-icon"><CheckCircle2 size={16} strokeWidth={2} /></div>
    <div className="acc-kpi-value">{directCount}</div>
    <div className="acc-kpi-label">Direct</div>
    <div className="acc-kpi-sublabel">Explicitly mapped</div>
  </div>
  <div className="acc-kpi-card kpi-indirect">
    <div className="acc-kpi-icon"><AlertCircle size={16} strokeWidth={2} /></div>
    <div className="acc-kpi-value">{indirectCount}</div>
    <div className="acc-kpi-label">Indirect</div>
    <div className="acc-kpi-sublabel">Tangentially assessed</div>
  </div>
  <div className="acc-kpi-card kpi-unmapped">
    <div className="acc-kpi-icon"><XCircle size={16} strokeWidth={2} /></div>
    <div className="acc-kpi-value">{unmappedCount}</div>
    <div className="acc-kpi-label">Unmapped</div>
    <div className="acc-kpi-sublabel">No coverage</div>
  </div>
</div>
```

The coverage bar JSX (after KPI grid, before warning banner):

```jsx
{totalOutcomes > 0 && (
  <div className="acc-coverage-progress">
    <div className="acc-coverage-progress-top">
      <span className="acc-coverage-progress-label">Overall Coverage</span>
      <span className="acc-coverage-progress-pct">
        {totalOutcomes > 0 ? Math.round(((directCount + indirectCount) / totalOutcomes) * 100) : 0}% covered
      </span>
    </div>
    <div className="acc-coverage-bar-track">
      <div className="acc-coverage-bar-direct" style={{ width: `${totalOutcomes > 0 ? (directCount / totalOutcomes) * 100 : 0}%` }} />
      <div className="acc-coverage-bar-indirect" style={{ width: `${totalOutcomes > 0 ? (indirectCount / totalOutcomes) * 100 : 0}%` }} />
    </div>
    <div className="acc-coverage-bar-legend">
      <span className="acc-coverage-bar-legend-item"><span className="legend-dot" style={{ background: "#22c55e" }} /> Direct ({directCount})</span>
      <span className="acc-coverage-bar-legend-item"><span className="legend-dot" style={{ background: "#fbbf24" }} /> Indirect ({indirectCount})</span>
      <span className="acc-coverage-bar-legend-item"><span className="legend-dot" style={{ background: "var(--text-quaternary)" }} /> Unmapped ({unmappedCount})</span>
    </div>
  </div>
)}
```

Table header (no expand column, no coverage help popover):

```jsx
<thead>
  <tr>
    <th style={{ width: 80 }} className="sortable sorted" onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}>
      Code <span className={`sort-icon sort-icon-active`}>{sortOrder === "asc" ? "▲" : "▼"}</span>
    </th>
    <th>Outcome</th>
    <th>Mapped Criteria</th>
    <th style={{ width: 110 }} className="text-center">Coverage</th>
    <th style={{ width: 44 }} className="text-center">Actions</th>
  </tr>
</thead>
```

- [ ] **Step 8: Verify the page renders — run dev server**

Run: `npm run dev`

Open `http://localhost:5173/admin/outcomes` (or demo equivalent). Verify:
- KPI cards render with colored top bars and icons
- Coverage progress bar shows correct percentages
- Table shows inline descriptions under outcome labels
- Code badges show prefix + number in mono font
- Actions menu shows 3 items with descriptions
- Row click opens edit drawer
- No console errors

---

### Task 3: OutcomeDetailDrawer — Coverage Type Selector

**Files:**
- Modify: `src/admin/drawers/OutcomeDetailDrawer.jsx`

- [ ] **Step 1: Add coverageType state and prop**

Update the component to accept and manage coverage type. Add to props: the drawer now receives `coverageType` on the outcome object and passes it back on save.

In the state section, add:
```jsx
const [coverageType, setCoverageType] = useState("direct");
```

In the `useEffect` that runs on open:
```jsx
useEffect(() => {
  if (open && outcome) {
    setDescription(outcome.description ?? "");
    setCriterionIds(outcome.criterionIds ?? []);
    setCoverageType(outcome.coverageType ?? "direct");
    setSaveError("");
    setSaving(false);
  }
}, [open, outcome]);
```

Update `handleSave` to pass `coverageType`:
```jsx
const handleSave = async () => {
  setSaveError("");
  setSaving(true);
  try {
    await onSave?.({
      description: description.trim() || null,
      criterionIds,
      coverageType,
    });
    onClose();
  } catch (e) {
    setSaveError(e?.message || "Something went wrong.");
  } finally {
    setSaving(false);
  }
};
```

- [ ] **Step 2: Add readonly identity fields to drawer body**

Add before the Description section in the JSX:

```jsx
{/* Identity (readonly) */}
<div className="acc-detail-section-label">Outcome Identity</div>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
  <div className="fs-field">
    <label className="fs-field-label">Code</label>
    <div style={{ position: "relative" }}>
      <input className="fs-input locked" value={outcome?.code || ""} readOnly />
      <Lock size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-quaternary)" }} />
    </div>
  </div>
  <div className="fs-field">
    <label className="fs-field-label">Short Label</label>
    <div style={{ position: "relative" }}>
      <input className="fs-input locked" value={outcome?.shortLabel || ""} readOnly />
      <Lock size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-quaternary)" }} />
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add coverage type radio selector after criterion mapping**

Add after the criteria grid in the JSX:

```jsx
{/* Coverage Type */}
{criterionIds.length > 0 && (
  <>
    <div className="acc-detail-section-label" style={{ marginTop: 18 }}>Coverage Type</div>
    <div className="acc-coverage-type-selector">
      <div
        className={`acc-coverage-type-option${coverageType === "direct" ? " selected cov-direct" : ""}`}
        onClick={() => !saving && setCoverageType("direct")}
      >
        <div className="acc-cov-radio" />
        <div>
          <div className="acc-cov-type-label">Direct</div>
          <div className="acc-cov-type-desc">Explicitly assessed by criteria</div>
        </div>
      </div>
      <div
        className={`acc-coverage-type-option${coverageType === "indirect" ? " selected cov-indirect" : ""}`}
        onClick={() => !saving && setCoverageType("indirect")}
      >
        <div className="acc-cov-radio" />
        <div>
          <div className="acc-cov-type-label">Indirect</div>
          <div className="acc-cov-type-desc">Tangentially assessed</div>
        </div>
      </div>
    </div>
  </>
)}
```

- [ ] **Step 4: Update import to include Lock icon**

Update the import line:
```jsx
import { AlertCircle, Info, Lock } from "lucide-react";
```

(Remove `Icon` from the import since we no longer use the generic `Icon` component.)

- [ ] **Step 5: Update OutcomesPage to pass coverageType to drawer and handle it on save**

In `OutcomesPage.jsx`, update `openEditDrawer` to include coverageType:
```jsx
const openEditDrawer = (outcome) => {
  const mapped = fw.getMappedCriteria(outcome.id);
  const coverage = getCoverageWithOverrides(outcome.id);
  setEditingOutcome({
    id: outcome.id,
    code: outcome.code,
    shortLabel: outcome.label,
    description: outcome.description || "",
    criterionIds: mapped.map((c) => c.id),
    coverageType: coverage === "none" ? "direct" : coverage,
  });
  setEditDrawerOpen(true);
};
```

Update `handleEditOutcome` to use coverageType:
```jsx
const handleEditOutcome = async ({ description, criterionIds, coverageType }) => {
  if (!editingOutcome) return;
  setPanelError("");
  try {
    await fw.editOutcome(editingOutcome.id, {
      label: editingOutcome.shortLabel,
      description,
      criterionIds,
      coverageType: coverageType || "direct",
    });
    toast.success("Outcome updated successfully");
  } catch (e) {
    throw e;
  }
};
```

- [ ] **Step 6: Update useFrameworkOutcomes.editOutcome to respect coverageType**

In `src/admin/hooks/useFrameworkOutcomes.js`, update the `editOutcome` callback to use the passed `coverageType` instead of hardcoding `"direct"`:

Replace:
```jsx
...toAdd.map((critId) =>
  upsertCriterionOutcomeMapping({
    framework_id: frameworkId,
    criterion_id: critId,
    outcome_id: outcomeId,
    coverage_type: "direct",
  })
)
```

With:
```jsx
...toAdd.map((critId) =>
  upsertCriterionOutcomeMapping({
    framework_id: frameworkId,
    criterion_id: critId,
    outcome_id: outcomeId,
    coverage_type: coverageType || "direct",
  })
)
```

And update the function signature:
```jsx
const editOutcome = useCallback(
  async (outcomeId, { label, description, criterionIds = [], coverageType = "direct" }) => {
```

Also update existing mappings that stay (aren't removed) to the new coverage type:
```jsx
// Update coverage type on retained mappings if it changed
const toUpdate = currentMaps.filter(
  (m) => criterionIds.includes(m.criterion_id) && m.coverage_type !== coverageType
);

await Promise.all([
  ...toRemove.map((m) => deleteCriterionOutcomeMapping(m.id)),
  ...toAdd.map((critId) =>
    upsertCriterionOutcomeMapping({
      framework_id: frameworkId,
      criterion_id: critId,
      outcome_id: outcomeId,
      coverage_type: coverageType,
    })
  ),
  ...toUpdate.map((m) =>
    upsertCriterionOutcomeMapping({
      ...m,
      coverage_type: coverageType,
    })
  ),
]);
```

- [ ] **Step 7: Test the full flow end-to-end**

Run: `npm run dev`

Test sequence:
1. Navigate to Outcomes page
2. Verify KPI cards, coverage bar, table with inline descriptions
3. Click a row → edit drawer opens with code/label locked
4. Change coverage type from Direct to Indirect → Save
5. Verify coverage badge updates in table
6. Click "..." → Duplicate → verify new outcome appears
7. Click "..." → Remove → confirm dialog → outcome removed
8. Check mobile portrait mode (resize browser to 375px portrait)
9. Verify card layout with Edit/Remove buttons
10. Check dark mode toggle — all colors use CSS variables

- [ ] **Step 8: Run build to ensure no errors**

Run: `npm run build`
Expected: Build succeeds with no errors or warnings.
