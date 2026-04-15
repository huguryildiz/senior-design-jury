# Default Framework Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface platform-level frameworks (MÜDEK v3.1, ABET) as prominent template cards in `FrameworkPickerDrawer`, as a card layout in `FrameworkPickerModal`, and as inline quick-pick chips in `AddEditPeriodDrawer`.

**Architecture:** Platform frameworks (`organization_id IS NULL`) already exist in the DB and are already returned by `listFrameworks`. The `frameworks` prop is already passed to all three components. Changes are purely presentational — new CSS classes, new render sections, and reuse of existing handlers.

**Tech Stack:** React 18, CSS custom properties (design tokens from `variables.css`), Lucide icons

---

## File Map

| File | Change |
|------|--------|
| `src/styles/pages/outcomes.css` | Add: `.fpd-template-card`, `.fpd-template-badge`, `.fpd-template-desc`, `.fpd-template-action`, `.fw-quick-chips`, `.fw-chip` |
| `src/admin/drawers/FrameworkPickerDrawer.jsx` | Add "Default Templates" card section; strip platform frameworks from "Clone from Existing" dropdown |
| `src/admin/modals/FrameworkPickerModal.jsx` | Render `globalTemplates` as card grid; keep `orgFrameworks` as list |
| `src/admin/drawers/AddEditPeriodDrawer.jsx` | Add platform quick-pick chips above fw display row; rename Select/Change → More… |

---

### Task 1: CSS — template cards and quick-pick chips

**Files:**
- Modify: `src/styles/pages/outcomes.css` (append after existing `fpd-*` block, around line 1415)

- [ ] **Step 1: Read the end of the fpd-* block to find the exact insertion point**

  Check where `.fpd-footer-disclaimer` ends in `outcomes.css`. The new CSS goes after that class's closing brace.

  ```
  grep -n "fpd-footer-disclaimer" src/styles/pages/outcomes.css
  ```

  Expected: line ~1408. Read lines 1408–1430 to confirm nothing follows.

- [ ] **Step 2: Append template-card and quick-chip CSS**

  After the existing `.fpd-footer-disclaimer` block, append:

  ```css
  /* ── Default template cards (FrameworkPickerDrawer) ─────────────── */

  .fpd-template-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .fpd-template-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg-card);
    cursor: default;
    transition: border-color .15s, background .15s;
  }

  .fpd-template-card:hover {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.03);
  }

  .fpd-template-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .fpd-template-card-name {
    flex: 1;
    font-size: 13px;
    font-weight: 650;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .fpd-template-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    background: var(--accent-soft);
    color: var(--accent);
    border: 1px solid var(--accent-ring);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .fpd-template-desc {
    font-size: 12px;
    color: var(--text-tertiary);
    line-height: 1.5;
    text-align: justify;
    text-justify: inter-word;
  }

  .fpd-template-action {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 4px;
    padding: 5px 12px;
    border-radius: var(--radius);
    font-size: 12px;
    font-weight: 600;
    background: var(--accent);
    color: #fff;
    border: none;
    cursor: pointer;
    opacity: 0;
    transition: opacity .15s;
    align-self: flex-start;
  }

  .fpd-template-card:hover .fpd-template-action {
    opacity: 1;
  }

  .fpd-template-action:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── Framework quick-pick chips (AddEditPeriodDrawer) ────────────── */

  .fw-quick-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }

  .fw-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: 99px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid var(--border);
    background: var(--surface-1);
    color: var(--text-secondary);
    cursor: pointer;
    transition: border-color .15s, background .15s, color .15s;
    white-space: nowrap;
  }

  .fw-chip:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: rgba(var(--accent-rgb), 0.05);
  }

  .fw-chip.active {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.10);
    color: var(--accent);
  }

  /* ── Framework picker modal template cards (fpm-*) ───────────────── */

  .fpm-template-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .fpm-template-card {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 12px 14px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg-card);
    cursor: pointer;
    transition: border-color .15s, background .15s;
    text-align: left;
    width: 100%;
  }

  .fpm-template-card:hover {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.03);
  }

  .fpm-template-card.selected {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.06);
  }

  .fpm-template-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .fpm-template-card-name {
    flex: 1;
    font-size: 13px;
    font-weight: 650;
    color: var(--text-primary);
  }

  .fpm-template-card.selected .fpm-template-card-name {
    color: var(--accent);
  }

  .fpm-template-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    background: var(--accent-soft);
    color: var(--accent);
    border: 1px solid var(--accent-ring);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .fpm-template-card-desc {
    font-size: 12px;
    color: var(--text-tertiary);
    line-height: 1.5;
    text-align: justify;
    text-justify: inter-word;
  }
  ```

- [ ] **Step 3: Verify no syntax errors**

  ```bash
  npm run build 2>&1 | head -30
  ```

  Expected: build succeeds (or fails only on unrelated issues, not CSS parse errors).

---

### Task 2: FrameworkPickerDrawer — Default Templates section

**Files:**
- Modify: `src/admin/drawers/FrameworkPickerDrawer.jsx`

Context: The drawer currently has three sections:
1. "Active Framework" (lines 258–388)
2. "Clone from Existing" — dropdown with both `orgFrameworks` and `platformFrameworks` in "Previous Periods" / "Starter Templates" groups (lines 390–508)
3. "Create from Scratch" (lines 510–561)

Plan: Insert a new "Default Templates" section between sections 1 and 2. Remove `platformFrameworks` from the section 2 dropdown. The `changeConfirmOpen` / `deleteTarget` confirm panels stay in section 2.

- [ ] **Step 1: Insert "Default Templates" section in the JSX**

  In `FrameworkPickerDrawer.jsx`, locate the comment `{/* ── Section 2: Clone from existing */}` (line 390). Insert the following block immediately before it (after the closing `</div>` of the Active Framework section at line 388):

  ```jsx
  {/* ── Section 1b: Default Templates ── */}
  {platformFrameworks.length > 0 && (
    <div className="fpd-section">
      <div className="fpd-section-label">Default Templates</div>
      {changeConfirmOpen && !pendingTarget?.organization_id ? (
        <div className="fs-confirm-panel">
          <p className="fs-confirm-msg">
            All outcome mappings for this period will be deleted. Are you sure you want to continue?
          </p>
          <div className="fs-confirm-btns">
            <button
              className="fs-confirm-cancel"
              onClick={() => { setChangeConfirmOpen(false); setPendingTarget(null); }}
              disabled={changingFw}
            >
              Cancel
            </button>
            <button
              className="fs-confirm-action"
              onClick={() => execCloneAndUse()}
              disabled={changingFw}
            >
              <AsyncButtonContent loading={changingFw}>Change</AsyncButtonContent>
            </button>
          </div>
        </div>
      ) : (
        <div className="fpd-template-cards">
          {platformFrameworks.map((fw) => (
            <div key={fw.id} className="fpd-template-card">
              <div className="fpd-template-card-header">
                <BadgeCheck size={14} strokeWidth={1.75} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span className="fpd-template-card-name">{fw.name}</span>
                <span className="fpd-template-badge">Template</span>
              </div>
              {fw.description && (
                <div className="fpd-template-desc">{fw.description}</div>
              )}
              <button
                className="fpd-template-action"
                onClick={() => handleCloneAndUse(fw)}
                disabled={changingFw}
              >
                <Copy size={12} strokeWidth={2} />
                Clone &amp; Use
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )}
  ```

  **Why the conditional on `changeConfirmOpen && !pendingTarget?.organization_id`:** The confirm panel shows in whichever section initiated the clone. Template cards have `organization_id === null`, so `!pendingTarget?.organization_id` is `true` when a template triggered the confirm. This keeps the confirm visually in the "Default Templates" section.

- [ ] **Step 2: Strip platform frameworks from the "Clone from Existing" dropdown**

  In `FrameworkPickerDrawer.jsx`, the "Clone from Existing" section (starting at line 390) currently shows both `orgFrameworks` and `platformFrameworks` in the dropdown. Make these changes:

  a) **Rename section label** from `"Clone from Existing"` to `"Previous Periods"`:
  ```jsx
  // Before:
  <div className="fpd-section-label">Clone from Existing</div>
  // After:
  <div className="fpd-section-label">Previous Periods</div>
  ```

  b) **Show this section only when `orgFrameworks.length > 0`** (remove `|| platformFrameworks.length > 0` from the condition):
  ```jsx
  // Before:
  {(orgFrameworks.length > 0 || platformFrameworks.length > 0) && (
  // After:
  {orgFrameworks.length > 0 && (
  ```

  c) **In the `changeConfirmOpen` condition for this section**, add `&& pendingTarget?.organization_id` so it only shows here when an org framework triggered it:
  ```jsx
  // Before:
  {changeConfirmOpen ? (
  // After:
  {changeConfirmOpen && pendingTarget?.organization_id ? (
  ```

  d) **Remove the "Starter Templates" group** from the dropdown. Delete lines 470–489 (the `{platformFrameworks.length > 0 && (...)}`  block inside `fpd-picker-dropdown`).

  e) **Update the "Clone & Use" button's `onClick`** — remove `...platformFrameworks` from the find since only org frameworks remain in the dropdown:
  ```jsx
  // Before:
  const fw = [...orgFrameworks, ...platformFrameworks].find((f) => f.id === selectedFwId);
  // After:
  const fw = orgFrameworks.find((f) => f.id === selectedFwId);
  ```

  f) **Remove `deleteTarget` confirm from this section condition** since it should remain (it applies to org frameworks only, which is correct). No change needed there.

- [ ] **Step 3: Verify build passes**

  ```bash
  npm run build 2>&1 | head -30
  ```

  Expected: clean build.

- [ ] **Step 4: Smoke test in browser**

  Start dev server (`npm run dev`), open the Outcomes page for a period that has no framework assigned and one that does. Open the Framework Picker drawer and verify:
  - "Default Templates" section appears with MÜDEK v3.1 and ABET cards
  - Hover over a card → "Clone & Use" button appears
  - Click "Clone & Use" on MÜDEK when hasMappings=false → confirm then closes drawer
  - Click "Clone & Use" when hasMappings=true → inline confirm panel appears in the "Default Templates" section
  - "Previous Periods" dropdown shows only org frameworks (no MÜDEK/ABET)
  - "Previous Periods" section hidden when no org frameworks exist

---

### Task 3: FrameworkPickerModal — card layout for platform templates

**Files:**
- Modify: `src/admin/modals/FrameworkPickerModal.jsx`

Context: Modal currently renders both `orgFrameworks` and `globalTemplates` as plain button list items with inline styles. Goal: render `globalTemplates` as cards (using new `fpm-template-card` CSS), show them **above** org frameworks. Keep org frameworks as the existing list.

- [ ] **Step 1: Rewrite the modal body**

  Replace everything inside `<div className="fs-modal-body" ...>` with:

  ```jsx
  <div className="fs-modal-body" style={{ maxHeight: 360, overflowY: "auto" }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

      {/* Platform template cards — shown first */}
      {globalTemplates.length > 0 && (
        <>
          <div style={sectionLabelStyle}>Platform Templates</div>
          <div className="fpm-template-cards">
            {globalTemplates.map((fw) => (
              <button
                key={fw.id}
                type="button"
                className={["fpm-template-card", selected?.id === fw.id ? "selected" : ""].filter(Boolean).join(" ")}
                onClick={() => setSelected(fw)}
              >
                <div className="fpm-template-card-header">
                  <BadgeCheck
                    size={14}
                    strokeWidth={1.75}
                    style={{ flexShrink: 0, color: selected?.id === fw.id ? "var(--accent)" : "var(--text-tertiary)" }}
                  />
                  <span className="fpm-template-card-name">{fw.name}</span>
                  <span className="fpm-template-badge">Template</span>
                </div>
                {fw.description && (
                  <div className="fpm-template-card-desc">{fw.description}</div>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Org frameworks — plain list */}
      {orgFrameworks.length > 0 && (
        <>
          <div style={{ ...sectionLabelStyle, paddingTop: globalTemplates.length > 0 ? 14 : 10 }}>Previous Periods</div>
          {orgFrameworks.map((fw) => (
            <button
              key={fw.id}
              style={itemStyle(selected?.id === fw.id)}
              onClick={() => setSelected(fw)}
            >
              <BadgeCheck size={14} strokeWidth={1.5} style={{ flexShrink: 0, color: selected?.id === fw.id ? "var(--accent)" : "var(--text-secondary)" }} />
              {fw.name}
            </button>
          ))}
        </>
      )}

      {orgFrameworks.length === 0 && globalTemplates.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: "24px 0", textAlign: "center" }}>
          No frameworks available.
        </div>
      )}

    </div>
  </div>
  ```

- [ ] **Step 2: Verify build passes**

  ```bash
  npm run build 2>&1 | head -30
  ```

- [ ] **Step 3: Smoke test in browser**

  Open "Add Evaluation Period" drawer, click "More…" (or "Select…") to open the modal. Verify:
  - MÜDEK v3.1 and ABET appear as cards at the top with the "Template" badge and description
  - "Previous Periods" list appears below (if any org frameworks exist)
  - Clicking a template card selects it (accent border)
  - Clicking "Clone & Use" in the footer sets the framework in the drawer

---

### Task 4: AddEditPeriodDrawer — inline quick-pick chips

**Files:**
- Modify: `src/admin/drawers/AddEditPeriodDrawer.jsx`

Context: The Framework field (add mode only) is in the "Scoring Setup" section. It currently shows a display div + "Select…"/"Change" button + optional "×" clear button. Goal: add chip buttons derived from `platformChips = frameworks.filter(f => !f.organization_id)` above the display row. Clicking a chip sets `formFrameworkId` / `formFrameworkName` directly; clicking a selected chip clears it. Rename "Select…"/"Change" to "More…".

- [ ] **Step 1: Derive `platformChips` and add chips to the Framework field**

  In `AddEditPeriodDrawer.jsx`, the Framework field is inside the `!isEdit` block (add mode), around line 305. Make these changes:

  a) **Add `BadgeCheck` to the import** — it's not currently imported. Add it to the lucide-react import line:
  ```jsx
  // Before (line 14):
  import {
    AlertCircle,
    Lock,
    Unlock,
    Eye,
    EyeOff,
    Copy,
    BarChart2,
    ChevronRight,
    Icon,
  } from "lucide-react";
  // After:
  import {
    AlertCircle,
    Lock,
    Unlock,
    Eye,
    EyeOff,
    Copy,
    BarChart2,
    ChevronRight,
    BadgeCheck,
    Icon,
  } from "lucide-react";
  ```

  b) **Derive `platformChips`** — add this line immediately after the `copyFromOptions` definition (around line 115):
  ```jsx
  const platformChips = frameworks.filter((f) => !f.organization_id);
  ```

  c) **Insert chip row above the display+button row** — locate the Framework `<div className="fs-field">` block (around line 305). Replace the entire `<div className="fs-field">` for Framework with:

  ```jsx
  <div className="fs-field">
    <label className="fs-field-label">
      Framework <span className="fs-field-opt">(optional)</span>
    </label>

    {/* Quick-pick chips for platform templates */}
    {platformChips.length > 0 && (
      <div className="fw-quick-chips">
        {platformChips.map((fw) => (
          <button
            key={fw.id}
            type="button"
            className={["fw-chip", formFrameworkId === fw.id ? "active" : ""].filter(Boolean).join(" ")}
            onClick={() => {
              if (formFrameworkId === fw.id) {
                setFormFrameworkId(null);
                setFormFrameworkName("");
              } else {
                setFormFrameworkId(fw.id);
                setFormFrameworkName(fw.name);
              }
            }}
            disabled={saving}
          >
            <BadgeCheck size={11} strokeWidth={2} />
            {fw.name}
          </button>
        ))}
      </div>
    )}

    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div
        style={{
          flex: 1,
          padding: "9px 12px",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          background: "var(--surface-1)",
          fontSize: 13,
          color: formFrameworkName ? "var(--text-primary)" : "var(--text-tertiary)",
        }}
      >
        {formFrameworkName || "— Select or add later from the Outcomes page —"}
      </div>
      <button
        type="button"
        className="fs-btn fs-btn-secondary"
        style={{ flexShrink: 0, fontSize: 12, padding: "6px 12px" }}
        onClick={() => setFwPickerOpen(true)}
        disabled={saving}
      >
        More…
      </button>
      {formFrameworkName && (
        <button
          type="button"
          className="fs-btn fs-btn-secondary"
          style={{ flexShrink: 0, fontSize: 12, padding: "6px 10px", color: "var(--text-tertiary)" }}
          onClick={() => { setFormFrameworkId(null); setFormFrameworkName(""); }}
          disabled={saving}
        >
          ×
        </button>
      )}
    </div>
    <div className="fs-field-helper hint">
      The selected framework will be cloned for this period. You can also set it later from the Outcomes page.
    </div>
  </div>
  ```

- [ ] **Step 2: Verify build passes**

  ```bash
  npm run build 2>&1 | head -30
  ```

- [ ] **Step 3: Smoke test in browser**

  Open "Add Evaluation Period" drawer. Verify:
  - MÜDEK v3.1 and ABET appear as chips above the display row
  - Clicking MÜDEK chip → chip becomes active (accent), display shows "MÜDEK v3.1"
  - Clicking MÜDEK chip again → chip deselects, display resets to placeholder
  - Clicking "More…" opens `FrameworkPickerModal` with card layout (from Task 3)
  - Selecting a framework via the modal also reflects in chips if it's a platform template
  - "×" clears both `formFrameworkId` and `formFrameworkName`
  - Everything still works in edit mode (no change there, framework field is hidden in edit mode)

---

## Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| FrameworkPickerDrawer: platform templates as cards with BadgeCheck, name, Template badge, description, Clone & Use | Task 2, Step 1 |
| Clone & Use calls existing `handleCloneAndUse(fw)` | Task 2, Step 1 (reuses handler) |
| `changeConfirmOpen` confirm flow applies to template cards | Task 2, Step 1 (conditional on `!pendingTarget?.organization_id`) |
| "Clone from Existing" renamed to "Previous Periods" | Task 2, Step 2a |
| Dropdown contains only org frameworks | Task 2, Steps 2b–2d |
| Platform frameworks removed from dropdown | Task 2, Step 2d |
| FrameworkPickerModal: globalTemplates as card layout above orgFrameworks | Task 3 |
| Modal: accent border when card selected | Task 3, `.fpm-template-card.selected` CSS |
| AddEditPeriodDrawer: chips from `frameworks.filter(f => !f.organization_id)` | Task 4, Step 1b–1c |
| Chip click sets formFrameworkId + formFrameworkName | Task 4, Step 1c |
| Clicking selected chip clears | Task 4, Step 1c (toggle logic) |
| "More…" replaces "Select…" / "Change" | Task 4, Step 1c |
| Clear (×) button unchanged | Task 4, Step 1c (preserved) |
| No new API calls | All tasks (confirmed — no new fetches) |
| No new state shape | All tasks (reuse existing state) |
