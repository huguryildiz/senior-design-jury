# Jurors Mobile Portrait Card Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sparse juror mobile portrait card (avatar + progress bar + timestamp) with a rich card: square avatar + name/affiliation/status pill + kebab, 3-column stats strip (Scored/Assigned/Done%), gradient progress bar, and always-visible last-active footer.

**Architecture:** Two-file change — JSX card block in `JurorsPage.jsx` and matching CSS in `jurors.css`. No new components, no API changes, no migrations. Avatar rendered directly in the portrait card using `jurorInitials`/`jurorAvatarBg`/`jurorAvatarFg` because `JurorBadge` uses `borderRadius: "50%"` as an inline style that cannot be overridden via CSS.

**Tech Stack:** React 18, CSS custom properties (VERA design tokens), Lucide icons

---

### Task 1: Replace portrait card JSX in JurorsPage.jsx

**Files:**
- Modify: `src/admin/pages/JurorsPage.jsx:54` (add import)
- Modify: `src/admin/pages/JurorsPage.jsx:157-162` (remove `mobileBarFill`)
- Modify: `src/admin/pages/JurorsPage.jsx:994-1064` (replace portrait card block)

- [ ] **Step 1: Add `jurorInitials`, `jurorAvatarBg`, `jurorAvatarFg` import**

Open `src/admin/pages/JurorsPage.jsx`. After line 55 (`import JurorStatusPill from "../components/JurorStatusPill";`), add:

```jsx
import { jurorInitials, jurorAvatarBg, jurorAvatarFg } from "../utils/jurorIdentity";
```

- [ ] **Step 2: Remove `mobileBarFill` function**

Delete lines 157-162 (the `mobileBarFill` function) entirely:

```js
// DELETE THIS BLOCK:
function mobileBarFill(status) {
  if (status === "completed") return "var(--success)";
  if (status === "editing")   return "#60a5fa";
  if (status === "in_progress" || status === "ready_to_submit") return "var(--warning)";
  return "rgba(100,116,139,0.3)";
}
```

- [ ] **Step 3: Replace the portrait card `<td>` block (lines 994-1064)**

Replace the entire block from `{/* Mobile card */}` through the closing `</td>` with:

```jsx
{/* Mobile card — hidden on desktop, shown at ≤768px portrait */}
<td className="col-mobile-card">
  <div className={`mcard jc${openMenuId === jid ? " is-active" : ""}`}>
    {/* ── Header ── */}
    <div className="jc-header">
      <div
        className="jc-avatar"
        style={{ background: jurorAvatarBg(name), color: jurorAvatarFg(name) }}
      >
        {jurorInitials(name)}
      </div>
      <div className="jc-meta">
        <span className="jc-meta-name">{name}</span>
        {juror.affiliation && (
          <span className="jc-meta-org">{juror.affiliation}</span>
        )}
        <span className="jc-meta-pill">
          <JurorStatusPill status={status} />
        </span>
      </div>
      <FloatingMenu
        isOpen={openMenuId === jid && shouldUseCardLayout}
        onClose={() => setOpenMenuId(null)}
        placement="bottom-end"
        trigger={
          <button
            className="jc-kebab"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId((prev) => (prev === jid ? null : jid));
            }}
          >
            <MoreVertical size={15} strokeWidth={2} />
          </button>
        }
      >
        <button className="floating-menu-item" onMouseDown={() => { setOpenMenuId(null); openEditModal(juror); }}>
          <SquarePen size={13} />
          Edit Juror
        </button>
        <button className="floating-menu-item" onMouseDown={() => { setOpenMenuId(null); openPinResetModal(juror); }}>
          <Lock size={13} />
          Reset PIN
        </button>
        <button className="floating-menu-item" onMouseDown={() => { setOpenMenuId(null); setScoresJuror(juror); }}>
          <ClipboardList size={13} />
          View Scores
        </button>
        <button className="floating-menu-item" onMouseDown={() => { setOpenMenuId(null); setReviewsJuror(juror); }}>
          <FileText size={13} />
          View Reviews
        </button>
        <div className="floating-menu-divider" />
        <button className="floating-menu-item danger" onMouseDown={() => { setOpenMenuId(null); openRemoveModal(juror); }}>
          <Trash2 size={13} />
          Remove Juror
        </button>
      </FloatingMenu>
    </div>

    {/* ── Stats strip ── */}
    <div className="jc-stats">
      <div className="jc-stat">
        <span className={`jcs-val${scored >= total && total > 0 ? " val-done" : scored > 0 ? " val-partial" : " val-zero"}`}>
          {scored}
        </span>
        <span className="jcs-key">SCORED</span>
      </div>
      <div className="jc-stat">
        <span className="jcs-val val-zero">{total}</span>
        <span className="jcs-key">ASSIGNED</span>
      </div>
      <div className="jc-stat">
        <span className={`jcs-val${total === 0 ? " val-zero" : scored >= total ? " val-done" : " val-amber"}`}>
          {total === 0 ? "—" : `${Math.round((scored / total) * 100)}%`}
        </span>
        <span className="jcs-key">DONE</span>
      </div>
    </div>

    {/* ── Progress bar ── */}
    <div className="jc-prog-block">
      <div className="jc-prog-header">
        <span>Progress</span>
        <span className={`jc-prog-count${total === 0 ? " val-zero" : scored >= total ? " val-done" : " val-partial"}`}>
          {scored} / {total} projects
        </span>
      </div>
      <div className="jc-prog-bar">
        {total > 0 && (
          <div
            className={`jc-prog-fill${scored >= total ? " fill-complete" : " fill-partial"}`}
            style={{ width: `${Math.min(100, Math.round((scored / total) * 100))}%` }}
          />
        )}
      </div>
    </div>

    {/* ── Footer ── */}
    <div className="jc-footer">
      <Clock size={11} strokeWidth={2} style={{ opacity: 0.7 }} />
      <span>{lastActive ? formatRelative(lastActive) : "Never active"}</span>
    </div>
  </div>
</td>
```

- [ ] **Step 4: Verify build compiles without errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript/JSX errors referencing `mobileBarFill`, `jc-main`, or `jc-divider`.

---

### Task 2: Replace portrait card CSS in jurors.css

**Files:**
- Modify: `src/styles/pages/jurors.css:361-449` (replace card-specific classes; keep shell, dim, and empty-state rules)

Keep lines 361-375 as-is (`.jc` shell + dim rule). Replace everything from line 377 (`.jc-main {`) through line 448 (end of `.jc-footer {}`) with the new CSS below.

- [ ] **Step 1: Replace the card CSS block**

The old block to remove (lines 377-448):
```css
  /* ── Main row ── */
  .jc-main { ... }
  .jc-main .jb-badge { ... }
  .jc-main .jb-name { ... }
  .jc-main .jb-affiliation { ... }
  .jc-right { ... }
  .jc-kebab-wrap { ... }
  .jc-kebab { ... }
  .jc-kebab:active { ... }
  .jc-action-menu { ... }
  .jc-action-item { ... }
  .jc-action-item:last-child { ... }
  .jc-action-item:hover { ... }
  .jc-action-item.danger { ... }
  .jc-action-item.danger:hover { ... }
  .jc-action-sep { ... }
  .jc-divider { ... }
  .jc-progress { ... }
  .jc-bar-wrap { ... }
  .jc-bar-fill { ... }
  .jc-proj-count { ... }
  .jc-proj-count span { ... }
  .jc-footer { ... }
```

Replace with:

```css
  /* ── Header ── */
  .jc-header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 12px 10px;
  }

  .jc-avatar {
    flex-shrink: 0;
    width: 50px;
    height: 50px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.5px;
  }

  .jc-meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .jc-meta-name {
    font-size: 14.5px;
    font-weight: 800;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .jc-meta-org {
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .jc-meta-pill {
    margin-top: 3px;
    display: flex;
  }

  /* Kebab button */
  .jc-kebab {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    transition: background 0.15s;
  }
  .jc-kebab:hover { background: var(--surface-1); }
  .jc-kebab:active { background: rgba(96,165,250,0.14); }

  /* ── Stats strip ── */
  .jc-stats {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    margin: 0;
  }

  .jc-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 9px 0;
    gap: 2px;
    border-right: 1px solid var(--border);
  }
  .jc-stat:last-child { border-right: none; }

  .jcs-val {
    font-size: 18px;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .jcs-val.val-done    { color: #22c55e; }
  .jcs-val.val-partial { color: var(--accent-purple, #6c63ff); }
  .jcs-val.val-zero    { color: var(--text-tertiary); }
  .jcs-val.val-amber   { color: #f59e0b; }

  .jcs-key {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }

  /* ── Progress block ── */
  .jc-prog-block {
    padding: 9px 12px 10px;
  }

  .jc-prog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-size: 10.5px;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .jc-prog-count.val-done    { color: #22c55e; }
  .jc-prog-count.val-partial { color: #60a5fa; }
  .jc-prog-count.val-zero    { color: var(--text-tertiary); }

  .jc-prog-bar {
    height: 7px;
    border-radius: 99px;
    background: var(--surface-1);
    overflow: hidden;
  }

  .jc-prog-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.35s ease;
  }
  .jc-prog-fill.fill-complete { background: linear-gradient(90deg, #22c55e, #86efac); }
  .jc-prog-fill.fill-partial  { background: linear-gradient(90deg, #6c63ff, #a78bfa); }

  /* ── Footer ── */
  .jc-footer {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 7px 14px;
    border-top: 1px solid var(--border);
    color: var(--text-tertiary);
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.015em;
  }
```

- [ ] **Step 2: Verify no old class names remain in the portrait block**

```bash
grep -n "jc-main\|jc-right\|jc-divider\|jc-progress\|jc-bar-wrap\|jc-bar-fill\|jc-proj-count\|jc-action-menu\|jc-action-item\|jc-action-sep\|jc-kebab-wrap\|mobileBarFill" src/admin/pages/JurorsPage.jsx src/styles/pages/jurors.css
```

Expected: zero matches.

---

### Task 3: Visual verification

- [ ] **Step 1: Start dev server and open Jurors page on mobile viewport**

```bash
npm run dev
```

Open `http://localhost:5173` → Jurors page. In DevTools, set device to iPhone 14 (390×844) or similar. Verify portrait card shows:
- Square rounded avatar with initials gradient
- Name (bold), affiliation (smaller), status pill below affiliation
- MoreVertical kebab in top-right
- 3-column stats strip with SCORED / ASSIGNED / DONE%
- Gradient progress bar with "X / Y projects" right-aligned
- "Last active N minutes ago" footer (or "Never active" for null)

- [ ] **Step 2: Test all three card states**

Check a juror with:
1. `scored === total > 0` → green Done% + green gradient bar + green count
2. `0 < scored < total` → purple stats + purple gradient bar + blue count
3. `scored === 0` → grey stats + empty bar + grey count

- [ ] **Step 3: Test dark mode**

Toggle dark mode in the app. Verify avatar gradients, pill backgrounds, and stat colors all render correctly against dark surfaces using CSS variable tokens.

- [ ] **Step 4: Confirm kebab menu still works**

Tap the kebab on a card. Verify the FloatingMenu opens with all 5 actions (Edit Juror, Reset PIN, View Scores, View Reviews, Remove Juror). Verify other cards dim while menu is open.
