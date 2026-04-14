# Period Criteria Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `PeriodCriteriaDrawer` — a slide-in panel that opens when the user clicks the "Spring 2026" period badge in CriteriaPage, showing active criteria and shortcuts to apply templates or copy from another period.

**Architecture:** Pure UI component; no new API calls. All data flows in as props from `CriteriaPage` and out via callback props that delegate to existing handlers (`periods.updateDraft`, `handleClone`). The drawer replaces the temporarily-wired `AddEditPeriodDrawer` on the period badge click.

**Tech Stack:** React, lucide-react, `Drawer` from `src/shared/ui/Drawer.jsx`, `CustomSelect` from `src/shared/ui/CustomSelect.jsx`, `STARTER_CRITERIA` from `src/admin/drawers/StarterCriteriaDrawer.jsx`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/admin/drawers/PeriodCriteriaDrawer.jsx` | New drawer component |
| Modify | `src/styles/pages/criteria.css` | Add `.pcd-*` styles (append to end of file) |
| Modify | `src/admin/pages/CriteriaPage.jsx` | Swap `AddEditPeriodDrawer` → `PeriodCriteriaDrawer` |

---

## Task 1: Create `PeriodCriteriaDrawer.jsx`

**Files:**
- Create: `src/admin/drawers/PeriodCriteriaDrawer.jsx`

- [ ] **Step 1: Create the file with the full component**

```jsx
// src/admin/drawers/PeriodCriteriaDrawer.jsx
//
// Props:
//   open             — boolean
//   onClose          — () => void
//   period           — period object ({ id, name, is_locked }) or null
//   criteria         — array of criterion objects (draftCriteria)
//   isLocked         — boolean
//   otherPeriods     — array of period objects excluding current
//   onApplyTemplate  — (criteria[]) => void   — replaces draft
//   onCopyFromPeriod — (periodId) => void     — clones from another period
//   onEditCriteria   — () => void             — closes drawer so user works in table
//   onClearCriteria  — () => void             — sets draft to []

import { useState } from "react";
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Pencil,
  Trash2,
  LayoutTemplate,
  PlusCircle,
  Copy,
} from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import CustomSelect from "@/shared/ui/CustomSelect";
import { STARTER_CRITERIA } from "./StarterCriteriaDrawer";
import { CRITERION_COLORS } from "@/admin/criteria/criteriaFormHelpers";

export default function PeriodCriteriaDrawer({
  open,
  onClose,
  period,
  criteria = [],
  isLocked = false,
  otherPeriods = [],
  onApplyTemplate,
  onCopyFromPeriod,
  onEditCriteria,
  onClearCriteria,
}) {
  const [copyPeriodId, setCopyPeriodId] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmTemplate, setConfirmTemplate] = useState(false);

  const total = criteria.reduce((s, c) => s + (Number(c.max) || 0), 0);
  const isBalanced = criteria.length > 0 && total === 100;
  const hasExisting = criteria.length > 0;

  const MAX_VISIBLE = 5;
  const visibleCriteria = criteria.slice(0, MAX_VISIBLE);
  const overflow = criteria.length - MAX_VISIBLE;

  const periodOptions = otherPeriods
    .filter((p) => p.id)
    .map((p) => ({ value: p.id, label: p.name }));

  function handleApplyTemplate() {
    if (hasExisting) {
      setConfirmTemplate(true);
    } else {
      onApplyTemplate(STARTER_CRITERIA);
      onClose();
    }
  }

  function handleConfirmTemplate() {
    setConfirmTemplate(false);
    onApplyTemplate(STARTER_CRITERIA);
    onClose();
  }

  function handleStartBlank() {
    if (hasExisting) {
      setConfirmClear(true);
    } else {
      onClearCriteria();
      onEditCriteria();
    }
  }

  function handleConfirmClear() {
    setConfirmClear(false);
    onClearCriteria();
    onClose();
  }

  function handleCopy() {
    if (!copyPeriodId) return;
    onCopyFromPeriod(copyPeriodId);
    setCopyPeriodId("");
    onClose();
  }

  function handleEditCriteria() {
    onEditCriteria();
    onClose();
  }

  function handleClearClick() {
    setConfirmClear(true);
  }

  // Reset confirmation states when drawer closes
  function handleClose() {
    setConfirmClear(false);
    setConfirmTemplate(false);
    onClose();
  }

  return (
    <Drawer open={open} onClose={handleClose}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-icon">
          <ClipboardList size={17} strokeWidth={1.75} />
        </div>
        <div className="fs-drawer-header-content">
          <div className="fs-drawer-title">{period?.name ?? "Period"} — Criteria</div>
          <div className="fs-drawer-subtitle">
            Manage criteria, weights, and rubric bands for this period
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────── */}
      <div className="fs-drawer-body">

        {/* ── ACTIVE CRITERIA ── */}
        <div className="pcd-section">
          <div className="pcd-section-label">Active Criteria</div>
          <div className="pcd-active-card">
            {/* Stat pills */}
            <div className="pcd-stat-pills">
              <div className="pcd-pill pcd-pill--neutral">
                <ClipboardList size={10} strokeWidth={2} />
                {criteria.length} {criteria.length === 1 ? "criterion" : "criteria"}
              </div>
              {criteria.length > 0 && (
                isBalanced ? (
                  <div className="pcd-pill pcd-pill--success">
                    <CheckCircle2 size={10} strokeWidth={2} />
                    {total} pts · balanced
                  </div>
                ) : (
                  <div className="pcd-pill pcd-pill--warning">
                    <AlertTriangle size={10} strokeWidth={2} />
                    {total} / 100 pts
                  </div>
                )
              )}
              {isLocked && (
                <div className="pcd-pill pcd-pill--locked">
                  <Lock size={10} strokeWidth={2.2} />
                  Scores exist · locked
                </div>
              )}
            </div>

            {/* Criteria mini-list */}
            {criteria.length === 0 ? (
              <div className="pcd-empty">
                No criteria defined for this period
              </div>
            ) : (
              <div className="pcd-criteria-list">
                {visibleCriteria.map((c, i) => (
                  <div key={c.key || i} className="pcd-criterion-row">
                    <span
                      className="pcd-dot"
                      style={{ background: c.color || CRITERION_COLORS[i % CRITERION_COLORS.length] }}
                    />
                    <span className="pcd-crit-label">
                      {c.label || c.shortLabel || `Criterion ${i + 1}`}
                    </span>
                    <span className="pcd-crit-weight">
                      {c.max != null ? `${c.max} pts` : "—"}
                    </span>
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="pcd-overflow">+{overflow} more</div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="pcd-card-actions">
              <button className="pcd-btn-ghost" onClick={handleEditCriteria}>
                <Pencil size={12} strokeWidth={2} />
                Edit Criteria
              </button>
              <button
                className="pcd-btn-ghost pcd-btn-ghost--danger"
                onClick={handleClearClick}
                disabled={criteria.length === 0}
              >
                <Trash2 size={12} strokeWidth={2} />
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* ── DEFAULT TEMPLATE ── */}
        <div className="pcd-section">
          <div className="pcd-section-label">Default Template</div>
          <div className="pcd-template-list">
            <button className="pcd-template-row" onClick={handleApplyTemplate} disabled={isLocked}>
              <div className="pcd-template-row-icon">
                <LayoutTemplate size={14} strokeWidth={1.75} />
              </div>
              <div className="pcd-template-row-body">
                <div className="pcd-template-row-name">VERA Default</div>
                <div className="pcd-template-row-desc">
                  {STARTER_CRITERIA.length} criteria · {STARTER_CRITERIA.reduce((s, c) => s + c.max, 0)} pts · with rubric bands
                </div>
              </div>
            </button>
            <button
              className="pcd-template-row pcd-template-row--blank"
              onClick={handleStartBlank}
              disabled={isLocked}
            >
              <div className="pcd-template-row-icon pcd-template-row-icon--blank">
                <PlusCircle size={14} strokeWidth={1.75} />
              </div>
              <div className="pcd-template-row-body">
                <div className="pcd-template-row-name">Start blank</div>
                <div className="pcd-template-row-desc">Define criteria from scratch</div>
              </div>
            </button>
          </div>
        </div>

        {/* ── COPY FROM ANOTHER PERIOD ── */}
        <div className="pcd-section">
          <div className="pcd-section-label">Copy from Another Period</div>
          <div className="pcd-copy-row">
            <CustomSelect
              value={copyPeriodId}
              onChange={setCopyPeriodId}
              options={periodOptions}
              placeholder="Select a period…"
              disabled={periodOptions.length === 0 || isLocked}
              ariaLabel="Select period to copy criteria from"
            />
            <button
              className="pcd-btn-primary"
              onClick={handleCopy}
              disabled={!copyPeriodId || isLocked}
            >
              <Copy size={12} strokeWidth={2} />
              Copy &amp; Use
            </button>
          </div>
          {periodOptions.length === 0 && (
            <div className="pcd-copy-hint">No other periods with criteria available</div>
          )}
        </div>

        {/* ── Confirm: clear ── */}
        {confirmClear && (
          <div className="pcd-confirm-banner">
            <div className="pcd-confirm-text">
              This will remove all {criteria.length} criteria from this period. Continue?
            </div>
            <div className="pcd-confirm-actions">
              <button className="pcd-btn-ghost" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
              <button className="pcd-btn-danger" onClick={handleConfirmClear}>
                <Trash2 size={12} strokeWidth={2} />
                Clear all
              </button>
            </div>
          </div>
        )}

        {/* ── Confirm: apply template over existing ── */}
        {confirmTemplate && (
          <div className="pcd-confirm-banner">
            <div className="pcd-confirm-text">
              This replaces your {criteria.length} existing criteria with the VERA Default template. Continue?
            </div>
            <div className="pcd-confirm-actions">
              <button className="pcd-btn-ghost" onClick={() => setConfirmTemplate(false)}>
                Cancel
              </button>
              <button className="pcd-btn-danger" onClick={handleConfirmTemplate}>
                <LayoutTemplate size={12} strokeWidth={2} />
                Replace
              </button>
            </div>
          </div>
        )}

      </div>{/* /body */}

      {/* ── Footer ─────────────────────────────────────── */}
      <div className="fs-drawer-footer">
        <button className="fs-btn fs-btn-secondary" onClick={handleClose}>
          Close
        </button>
      </div>
    </Drawer>
  );
}
```

- [ ] **Step 2: Verify the file exists and has no syntax errors**

```bash
node --input-type=module --eval "
import { readFileSync } from 'fs';
readFileSync('src/admin/drawers/PeriodCriteriaDrawer.jsx', 'utf8');
console.log('File OK');
" 2>&1 || echo "File missing"
```

Expected: `File OK`

---

## Task 2: Add `.pcd-*` styles to criteria.css

**Files:**
- Modify: `src/styles/pages/criteria.css` (append at end)

- [ ] **Step 1: Append the styles**

Open `src/styles/pages/criteria.css` and append the following block at the very end of the file:

```css
/* ── PeriodCriteriaDrawer (.pcd-*) ───────────────────────── */

.pcd-section {
  padding: 18px 24px;
  border-bottom: 1px solid var(--border);
}
.pcd-section:last-of-type {
  border-bottom: none;
}

.pcd-section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-quaternary);
  margin-bottom: 12px;
}

/* ── Active criteria card ── */
.pcd-active-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-1);
}

.pcd-stat-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--border);
}

.pcd-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 20px;
  border: 1px solid transparent;
}

.pcd-pill--neutral {
  color: var(--text-secondary);
  background: var(--surface-2);
  border-color: var(--border);
}
.pcd-pill--success {
  color: var(--success, #16a34a);
  background: rgba(22, 163, 74, 0.08);
  border-color: rgba(22, 163, 74, 0.2);
}
.pcd-pill--warning {
  color: var(--warning, #d97706);
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.2);
}
.pcd-pill--locked {
  color: var(--warning, #d97706);
  background: rgba(217, 119, 6, 0.06);
  border-color: rgba(217, 119, 6, 0.15);
}

.pcd-criteria-list {
  padding: 4px 0;
}

.pcd-criterion-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  transition: background 0.12s;
}
.pcd-criterion-row:hover {
  background: var(--surface-2);
}

.pcd-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pcd-crit-label {
  flex: 1;
  font-size: 12.5px;
  color: var(--text-primary);
  font-weight: 500;
}

.pcd-crit-weight {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.pcd-overflow {
  padding: 6px 14px;
  font-size: 11px;
  color: var(--text-quaternary);
  font-style: italic;
}

.pcd-empty {
  padding: 14px;
  font-size: 12px;
  color: var(--text-quaternary);
  text-align: center;
}

.pcd-card-actions {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  background: var(--surface-0, var(--bg));
}

/* ── Ghost buttons ── */
.pcd-btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-1);
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 550;
  cursor: pointer;
  transition: background 0.13s, color 0.13s, border-color 0.13s;
}
.pcd-btn-ghost:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}
.pcd-btn-ghost:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
.pcd-btn-ghost--danger {
  color: var(--danger);
  border-color: rgba(225, 29, 72, 0.2);
  background: rgba(225, 29, 72, 0.04);
  margin-left: auto;
}
.pcd-btn-ghost--danger:hover {
  background: rgba(225, 29, 72, 0.1);
  border-color: rgba(225, 29, 72, 0.35);
}

/* ── Template list ── */
.pcd-template-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pcd-template-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 11px;
  border: 1px solid var(--border);
  background: var(--surface-1);
  cursor: pointer;
  text-align: left;
  transition: background 0.13s, border-color 0.13s, transform 0.1s;
  width: 100%;
}
.pcd-template-row:hover {
  background: var(--surface-2);
  border-color: var(--accent);
  transform: translateY(-1px);
}
.pcd-template-row:active {
  transform: translateY(0);
}
.pcd-template-row:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
.pcd-template-row--blank {
  border-style: dashed;
}
.pcd-template-row--blank:hover {
  border-style: dashed;
}

.pcd-template-row-icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  flex-shrink: 0;
}
.pcd-template-row-icon--blank {
  background: var(--surface-2);
  border-color: var(--border);
  color: var(--text-tertiary);
}

.pcd-template-row-name {
  font-size: 12.5px;
  font-weight: 650;
  color: var(--text-primary);
  margin-bottom: 2px;
}
.pcd-template-row-desc {
  font-size: 11px;
  color: var(--text-tertiary);
}

/* ── Copy from period ── */
.pcd-copy-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.pcd-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 9px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s, transform 0.12s;
}
.pcd-btn-primary:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}
.pcd-btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
  transform: none;
}

.pcd-copy-hint {
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-quaternary);
}

/* ── Confirm banner ── */
.pcd-confirm-banner {
  margin: 0 24px 16px;
  padding: 14px;
  border-radius: 10px;
  background: rgba(225, 29, 72, 0.05);
  border: 1px solid rgba(225, 29, 72, 0.18);
}
.pcd-confirm-text {
  font-size: 12.5px;
  color: var(--text-primary);
  margin-bottom: 10px;
  text-align: justify;
  text-justify: inter-word;
}
.pcd-confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.pcd-btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 13px;
  border-radius: 8px;
  border: 1px solid rgba(225, 29, 72, 0.4);
  background: rgba(225, 29, 72, 0.12);
  color: var(--danger);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.13s;
}
.pcd-btn-danger:hover {
  background: rgba(225, 29, 72, 0.22);
}
```

- [ ] **Step 2: Verify the build still compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: build exits with no errors (warnings are fine).

---

## Task 3: Wire `PeriodCriteriaDrawer` into `CriteriaPage`

**Files:**
- Modify: `src/admin/pages/CriteriaPage.jsx`

- [ ] **Step 1: Replace `AddEditPeriodDrawer` import with `PeriodCriteriaDrawer`**

Find this line:
```js
import AddEditPeriodDrawer from "@/admin/drawers/AddEditPeriodDrawer";
```

Replace with:
```js
import PeriodCriteriaDrawer from "@/admin/drawers/PeriodCriteriaDrawer";
```

- [ ] **Step 2: Replace the `AddEditPeriodDrawer` JSX block**

Find this block (near the bottom of the component return, just before `<StarterCriteriaDrawer`):

```jsx
      <AddEditPeriodDrawer
        open={periodDrawerOpen}
        onClose={() => setPeriodDrawerOpen(false)}
        period={viewPeriod}
        onSave={async (data) => {
          const result = await periods.handleUpdatePeriod(data);
          if (result?.ok) setPeriodDrawerOpen(false);
          return result;
        }}
        allPeriods={periods.periodList}
      />
```

Replace with:

```jsx
      <PeriodCriteriaDrawer
        open={periodDrawerOpen}
        onClose={() => setPeriodDrawerOpen(false)}
        period={viewPeriod}
        criteria={draftCriteria}
        isLocked={isLocked}
        otherPeriods={otherPeriods}
        onApplyTemplate={(criteria) => {
          periods.updateDraft(criteria);
        }}
        onCopyFromPeriod={(periodId) => {
          handleClone(periodId);
        }}
        onEditCriteria={() => setPeriodDrawerOpen(false)}
        onClearCriteria={() => periods.updateDraft([])}
      />
```

- [ ] **Step 3: Run the dev server and verify manually**

```bash
npm run dev
```

Open http://localhost:5173, navigate to Admin → Criteria. Click the period badge (e.g. "Spring 2026").

Verify:
- Drawer opens
- Active criteria list renders with color dots and weights
- Stat pills show correct count / balanced or unbalanced state
- "VERA Default" template row is clickable (if no existing criteria: applies immediately; if criteria exist: shows confirm banner)
- "Start blank" row clears criteria after confirm
- "Copy & Use" is disabled when no period is selected
- "Clear" button is disabled when no criteria exist
- All buttons are disabled when `isLocked` is true
- Drawer closes when clicking overlay or Close button

- [ ] **Step 4: Verify no `<select>` native elements**

```bash
npm run check:no-native-select 2>&1 | tail -10
```

Expected: passes (no native `<select>` in `PeriodCriteriaDrawer.jsx`).

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors.
