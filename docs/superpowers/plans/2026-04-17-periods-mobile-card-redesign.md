# Periods Mobile Card Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sparse, spec-sheet mobile portrait card on the Periods page with a Projects-parallel hero card (progress ring + title + kebab → meta row → config strip → footer stats).

**Architecture:** Pure CSS + JSX rearrangement. Keep the existing desktop `<tr><td>` structure; add one new mobile-only ring cell and two small pure helpers. The mobile portrait media query block in `periods.css` is rewritten to use a CSS Grid layout with named areas. No new RPCs, no new state, no new loading behavior.

**Tech Stack:** React (PeriodsPage.jsx), plain CSS (periods.css), Vitest + Testing Library for unit tests.

**Spec:** `docs/superpowers/specs/2026-04-17-periods-mobile-card-redesign.md`
**Mockup:** `docs/superpowers/mockups/periods-mobile-card.html`

---

## File Structure

**Modify:**
- `src/admin/pages/PeriodsPage.jsx` — add 2 pure helpers (`computeSetupPercent`, `computeRingModel`); add one new `<td className="periods-mobile-ring">` cell inside the row render; replace the existing `<td className="periods-mobile-stats">` cell with a mobile-only footer cell that also carries the `updated_at` relative timestamp.
- `src/styles/pages/periods.css` — rewrite the `@media (max-width: 768px) and (orientation: portrait)` block (lines 423–547) to use CSS Grid with named areas; add ring cell styles; collapse old eyebrow rows into the new meta/config/footer zones.

**Create:**
- `src/admin/__tests__/periodsMobileRing.test.js` — unit tests for `computeSetupPercent` and `computeRingModel`.

**Test:**
- Manual QA pass at 360×800 viewport (browser devtools).

---

## Task 1: Add pure helpers for the mobile ring

**Files:**
- Modify: `src/admin/pages/PeriodsPage.jsx` (add two top-level functions near existing `getPeriodState` at line 92)
- Test: `src/admin/__tests__/periodsMobileRing.test.js` (create)

**Context:** The mobile ring shows a different metric per state. Draft → setup readiness % derived from `readiness.issues` (required only). Live → evaluation % derived from `periodStats[id].progress`. Closed → `100`. Published (locked, no scores yet) behaves like live at `0%`.

- [ ] **Step 1.1: Add the helper signatures to `PeriodsPage.jsx` imports/exports**

Insert these functions immediately after the existing `getPeriodState` function (current line 97). Export them as named exports so tests can import them without rendering the page.

Open `src/admin/pages/PeriodsPage.jsx`, find:

```javascript
function getPeriodState(period, hasScores, readiness) {
  if (period.closed_at) return "closed";
  if (period.is_locked && hasScores) return "live";
  if (period.is_locked) return "published";
  return readiness?.ok ? "draft_ready" : "draft_incomplete";
}
```

Add immediately below:

```javascript
// Fixed denominator for setup % — matches the required-severity check count
// emitted by rpc_admin_check_period_readiness (criteria, weights, rubric
// bands, projects, jurors, framework). Keep in sync with that RPC if checks
// are added or removed.
const SETUP_REQUIRED_TOTAL = 6;

// Pure: derives setup completion % for a draft period from the readiness
// payload. `readiness` may be undefined while the row's readiness check is
// still in flight.
export function computeSetupPercent(readiness) {
  if (!readiness) return null;
  if (readiness.ok) return 100;
  const required = (readiness.issues || []).filter((i) => i.severity === "required");
  const satisfied = Math.max(0, SETUP_REQUIRED_TOTAL - required.length);
  return Math.round((satisfied / SETUP_REQUIRED_TOTAL) * 100);
}

// Pure: derives the mobile ring model { percent, label, stateClass } for a
// given period + lifecycle state + stats/readiness snapshots. Returns null
// percent when data is not yet loaded so the UI can render a skeleton ring.
export function computeRingModel({ state, readiness, stats }) {
  if (state === "closed") {
    return { percent: 100, label: "DONE", stateClass: "ring-closed" };
  }
  if (state === "live") {
    const pct = typeof stats?.progress === "number" ? stats.progress : null;
    return { percent: pct, label: "EVAL", stateClass: "ring-live" };
  }
  if (state === "published") {
    // Locked but no scores yet — treat like live at 0.
    return { percent: 0, label: "EVAL", stateClass: "ring-live" };
  }
  // draft_ready | draft_incomplete
  return {
    percent: computeSetupPercent(readiness),
    label: "SETUP",
    stateClass: "ring-draft",
  };
}
```

- [ ] **Step 1.2: Write the failing tests**

Create `src/admin/__tests__/periodsMobileRing.test.js`:

```javascript
import { describe, it, expect } from "vitest";
import { qaTest } from "../../test/qaTest";
import { computeSetupPercent, computeRingModel } from "../pages/PeriodsPage";

describe("computeSetupPercent", () => {
  it("returns null when readiness is not yet loaded", () => {
    expect(computeSetupPercent(undefined)).toBeNull();
  });

  it("returns 100 when readiness.ok is true", () => {
    expect(computeSetupPercent({ ok: true, issues: [] })).toBe(100);
  });

  it("returns 50 when 3 of 6 required checks are failing", () => {
    const readiness = {
      ok: false,
      issues: [
        { check: "no_criteria", severity: "required", msg: "" },
        { check: "no_projects", severity: "required", msg: "" },
        { check: "no_jurors", severity: "required", msg: "" },
        { check: "some_optional", severity: "optional", msg: "" },
      ],
    };
    expect(computeSetupPercent(readiness)).toBe(50);
  });

  it("returns 0 when all 6 required checks are failing", () => {
    const readiness = {
      ok: false,
      issues: Array.from({ length: 6 }, (_, i) => ({
        check: `c${i}`, severity: "required", msg: "",
      })),
    };
    expect(computeSetupPercent(readiness)).toBe(0);
  });

  it("clamps to 0 if more issues than the fixed total", () => {
    const readiness = {
      ok: false,
      issues: Array.from({ length: 10 }, (_, i) => ({
        check: `c${i}`, severity: "required", msg: "",
      })),
    };
    expect(computeSetupPercent(readiness)).toBe(0);
  });

  it("ignores optional issues", () => {
    const readiness = {
      ok: false,
      issues: [{ check: "x", severity: "optional", msg: "" }],
    };
    expect(computeSetupPercent(readiness)).toBe(100);
  });
});

describe("computeRingModel", () => {
  it("closed state: 100% DONE / ring-closed", () => {
    expect(computeRingModel({ state: "closed" })).toEqual({
      percent: 100, label: "DONE", stateClass: "ring-closed",
    });
  });

  it("live state: uses stats.progress as percent", () => {
    expect(
      computeRingModel({ state: "live", stats: { progress: 42 } })
    ).toEqual({ percent: 42, label: "EVAL", stateClass: "ring-live" });
  });

  it("live state with missing stats: percent null (skeleton)", () => {
    expect(computeRingModel({ state: "live", stats: {} })).toEqual({
      percent: null, label: "EVAL", stateClass: "ring-live",
    });
  });

  it("published (locked, no scores) treated as live at 0", () => {
    expect(computeRingModel({ state: "published" })).toEqual({
      percent: 0, label: "EVAL", stateClass: "ring-live",
    });
  });

  it("draft_incomplete: uses setup %", () => {
    const readiness = { ok: false, issues: [
      { check: "c1", severity: "required", msg: "" },
      { check: "c2", severity: "required", msg: "" },
      { check: "c3", severity: "required", msg: "" },
    ] };
    expect(
      computeRingModel({ state: "draft_incomplete", readiness })
    ).toEqual({ percent: 50, label: "SETUP", stateClass: "ring-draft" });
  });

  it("draft_ready: 100% SETUP", () => {
    expect(
      computeRingModel({ state: "draft_ready", readiness: { ok: true, issues: [] } })
    ).toEqual({ percent: 100, label: "SETUP", stateClass: "ring-draft" });
  });

  it("draft with no readiness yet: percent null", () => {
    expect(computeRingModel({ state: "draft_incomplete" })).toEqual({
      percent: null, label: "SETUP", stateClass: "ring-draft",
    });
  });
});
```

**Note on `qaTest`:** CLAUDE.md requires `qaTest()` for tests with catalog IDs. These helpers are pure utilities without user-facing scenarios, so plain `it()` is appropriate here (no catalog entries needed).

- [ ] **Step 1.3: Run the tests to verify they pass**

Run: `npm test -- --run src/admin/__tests__/periodsMobileRing.test.js`
Expected: all 12 tests pass.

If any fail, fix the helper (not the tests) until green.

- [ ] **Step 1.4: Commit**

```bash
git add src/admin/pages/PeriodsPage.jsx src/admin/__tests__/periodsMobileRing.test.js
git commit -m "feat(periods): add computeSetupPercent/computeRingModel helpers for mobile ring

Pure helpers that derive the mobile-portrait ring metric (setup % for
draft, eval % for live, 100% for closed) from existing readiness + stats
state. Unit-tested in isolation; consumed in the next commit."
```

---

## Task 2: Render the mobile ring cell + blockers pill in the row markup

**Files:**
- Modify: `src/admin/pages/PeriodsPage.jsx:1288-1466` (the row render block inside `pagedList.map(...)`)

**Context:** The desktop table keeps all its cells. We add two new mobile-only pieces:
1. A `<td className="periods-mobile-ring">` at the top of the row (hidden on desktop via CSS).
2. A `<td className="periods-mobile-blockers">` rendered inline with the status group that shows "N blockers" only when state is draft and `blockerCount > 0`. The existing `ReadinessPopover` already renders "N issues" badge for draft rows — we keep that and add the mobile variant via a new cell so CSS can relocate it cleanly.

Rather than add a separate blockers cell, we reuse the existing `ReadinessPopover` inside the Status cell. CSS restyles it for mobile. The only markup change is the new ring cell + class hooks.

- [ ] **Step 2.1: Add the mobile ring cell to the row**

Locate the row opening (line 1292) inside `pagedList.map((period) => { ... return ( <tr ...> ... )})` and the period name `<td>` at line 1301:

```javascript
                <tr
                  key={period.id}
                  className={[
                    "mcard",
                    isDraft ? "sem-row-draft" : "",
                    openMenuId === period.id ? "is-active" : "",
                  ].filter(Boolean).join(" ")}
                >
                  {/* Period name */}
                  <td data-label="Evaluation Period">
```

Replace with (adds the ring `<td>` right before the name cell and a state-based row class):

```javascript
                <tr
                  key={period.id}
                  className={[
                    "mcard",
                    "sem-row-" + (state === "draft_ready" || state === "draft_incomplete" ? "draft" : state),
                    openMenuId === period.id ? "is-active" : "",
                  ].filter(Boolean).join(" ")}
                >
                  {/* Mobile ring (portrait only — hidden on desktop) */}
                  <td className="periods-mobile-ring" aria-hidden="false">
                    {(() => {
                      const ring = computeRingModel({
                        state,
                        readiness: periodReadiness[period.id],
                        stats: periodStats[period.id],
                      });
                      const pct = ring.percent;
                      const deg = pct == null ? 0 : Math.round((pct / 100) * 360);
                      return (
                        <div
                          className={`periods-mring ${ring.stateClass}`}
                          style={{ "--pct": `${deg}deg` }}
                          aria-label={`${period.name} — ${pct == null ? "loading" : pct + "%"} ${ring.label.toLowerCase()}`}
                        >
                          <div className="periods-mring-fill">
                            <div className="periods-mring-inner">
                              <span className="periods-mring-num">{pct == null ? "—" : `${pct}%`}</span>
                              <span className="periods-mring-lbl">{ring.label}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </td>

                  {/* Period name */}
                  <td data-label="Evaluation Period">
```

**Note:** The existing `sem-row-draft` class was hard-coded; we now derive state-based row classes (`sem-row-draft`, `sem-row-published`, `sem-row-live`, `sem-row-closed`) so the CSS can colour the left state rail per state.

- [ ] **Step 2.2: Replace the mobile-stats cell with a mobile-footer cell**

The current mobile footer is `<td className="periods-mobile-stats">` at lines 1361-1366. Change it to also carry the updated timestamp so it becomes a self-contained footer on mobile:

Find lines 1361-1366:

```javascript
                  {/* Mobile stats strip */}
                  <td className="periods-mobile-stats">
                    <div className="periods-mobile-stats-row">
                      <span className="periods-m-stat"><span className={`val${(periodStats[period.id]?.projectCount || 0) === 0 ? " zero" : ""}`}>{periodStats[period.id]?.projectCount ?? "—"}</span> projects</span>
                      <span className="periods-m-stat"><span className={`val${(periodStats[period.id]?.jurorCount || 0) === 0 ? " zero" : ""}`}>{periodStats[period.id]?.jurorCount ?? "—"}</span> jurors</span>
                    </div>
                  </td>
```

Replace with:

```javascript
                  {/* Mobile footer (stats + updated) */}
                  <td className="periods-mobile-footer">
                    <div className="periods-mobile-footer-stats">
                      <span className="periods-m-stat"><span className={`val${(periodStats[period.id]?.projectCount || 0) === 0 ? " zero" : ""}`}>{periodStats[period.id]?.projectCount ?? "—"}</span> projects</span>
                      <span className="periods-m-stat"><span className={`val${(periodStats[period.id]?.jurorCount || 0) === 0 ? " zero" : ""}`}>{periodStats[period.id]?.jurorCount ?? "—"}</span> jurors</span>
                    </div>
                    <span className="periods-mobile-footer-updated">{formatRelative(period.updated_at)}</span>
                  </td>
```

- [ ] **Step 2.3: Build to catch syntax errors**

Run: `npm run build`
Expected: completes without errors.

- [ ] **Step 2.4: Commit**

```bash
git add src/admin/pages/PeriodsPage.jsx
git commit -m "feat(periods): add mobile ring cell + state-based row class

Renders a new periods-mobile-ring <td> at the top of each row (hidden on
desktop via CSS). Extends row class to all four lifecycle states so the
left state rail colour matches the ring colour. Mobile footer cell now
carries stats + updated timestamp for a single-row footer."
```

---

## Task 3: Rewrite the mobile portrait CSS block

**Files:**
- Modify: `src/styles/pages/periods.css:423-547`

**Context:** Replace the current flex-row card layout with CSS Grid named areas. Keep everything outside the `@media (max-width: 768px) and (orientation: portrait)` block untouched.

- [ ] **Step 3.1: Delete the current mobile portrait block**

Open `src/styles/pages/periods.css`. Delete lines 423–547 (everything inside the first `@media (max-width: 768px) and (orientation: portrait)` block including the opening `{` and closing `}`). The second media block at line 1051 stays untouched.

- [ ] **Step 3.2: Insert the new mobile portrait block in the same location**

Paste this in place of the deleted block:

```css
/* ─── Mobile card layout (portrait ≤ 768px) ──────────────────
   Hero-ring card matching Projects page:
   - Hero: ring | title (+ eyebrow, subtitle) | kebab
   - Meta: date range  |  status pills
   - Config strip: criteria + outcome (tinted)
   - Footer: stats + updated
   ────────────────────────────────────────────────────────── */
@media (max-width: 768px) and (orientation: portrait) {
  .periods-lifecycle-bar { padding: 12px 14px; }
  .periods-lifecycle-legend { flex-wrap: wrap; gap: 8px 14px; }

  /* Outer wrapper — let cards sit on the page background */
  .periods-table-card {
    border: none;
    background: transparent;
    box-shadow: none;
    border-radius: 0;
    overflow: visible;
    margin-bottom: 12px;
  }
  .periods-table-card-header {
    padding: 4px 2px 10px;
    border-bottom: none;
  }
  .periods-table-scroll { overflow: visible; }
  .periods-table-card .sem-table { min-width: 0; }

  .sem-table, .sem-table thead, .sem-table tbody { display: block; width: 100%; }
  .sem-table thead { display: none !important; }

  /* Card shell comes from global .mcard. Layout (grid + areas) here. */
  .sem-table tbody tr {
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
      "ring  title   actions"
      "meta  meta    meta"
      "cfg   cfg     cfg"
      "foot  foot    foot";
    gap: 0;
    width: 100%;
    margin-bottom: 12px;
    padding: 0;
    position: relative;
    overflow: hidden;
  }

  /* State rail — left border accent per lifecycle */
  .sem-table tbody tr.sem-row-draft     { border-left: 3px solid rgba(79, 70, 229, 0.35); }
  .sem-table tbody tr.sem-row-published { border-left: 3px solid #3b82f6; }
  .sem-table tbody tr.sem-row-live      { border-left: 3px solid #10b981; }
  .sem-table tbody tr.sem-row-closed    { border-left: 3px solid #94a3b8; }

  /* Reset all cells */
  .sem-table tbody td {
    display: block;
    width: auto;
    padding: 0;
    border-bottom: none;
    text-align: left !important;
    background: transparent !important;
    box-sizing: border-box;
  }
  .sem-table tbody td[data-label]::before { content: none; }

  /* ── Ring cell ── */
  .sem-table td.periods-mobile-ring {
    grid-area: ring;
    padding: 14px 0 10px 14px;
    align-self: center;
  }
  .periods-mring { position: relative; width: 52px; height: 52px; }
  .periods-mring-fill {
    position: relative; width: 52px; height: 52px; border-radius: 50%;
    background: conic-gradient(var(--ring-color, var(--accent)) var(--pct, 0deg), rgba(15,23,42,0.08) 0);
  }
  .periods-mring-fill::after {
    content:""; position:absolute; inset:3px; border-radius:50%;
    background: var(--bg-card);
  }
  .periods-mring-inner {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    line-height: 1; z-index: 1;
  }
  .periods-mring-num {
    font-size: 13px; font-weight: 700; letter-spacing: -0.5px;
    color: var(--ring-color, var(--accent));
    font-family: var(--mono);
  }
  .periods-mring-lbl {
    font-size: 7px; font-weight: 700; letter-spacing: 0.6px;
    color: var(--text-tertiary); text-transform: uppercase;
    margin-top: 2px;
  }
  .periods-mring.ring-draft     { --ring-color: #6366f1; }
  .periods-mring.ring-live      { --ring-color: #10b981; }
  .periods-mring.ring-closed    { --ring-color: #64748b; }
  /* Published = blue (not yet live). */
  .sem-row-published .periods-mring.ring-live { --ring-color: #3b82f6; }

  /* ── Title cell (Evaluation Period) ── */
  .sem-table td[data-label="Evaluation Period"] {
    grid-area: title;
    padding: 14px 0 0 12px;
    min-width: 0;
  }
  .sem-table td[data-label="Evaluation Period"] .sem-name {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.3px;
    color: var(--text-primary);
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .sem-table td[data-label="Evaluation Period"] .sem-name-sub {
    font-size: 11.5px;
    color: var(--text-tertiary);
    margin-top: 2px;
    font-weight: 500;
  }

  /* ── Actions (kebab) cell — top right ── */
  .sem-table td.col-actions {
    grid-area: actions;
    padding: 12px 12px 0 0;
    align-self: start;
    text-align: right !important;
    position: static;
    width: auto !important;
  }

  /* ── Meta row: date range + status group ── */
  .sem-table td[data-label="Date Range"] {
    grid-area: meta;
    padding: 10px 14px 10px 14px;
    display: flex;
    align-items: center;
    min-width: 0;
  }
  .sem-table td[data-label="Date Range"]::before { content: none; }
  .sem-table td[data-label="Date Range"] .periods-date-range {
    font-family: var(--mono);
    font-size: 11.5px;
    color: var(--text-secondary);
    font-weight: 500;
  }

  /* Status lives inside the meta row — absolutely positioned to the right */
  .sem-table td[data-label="Status"] {
    grid-area: meta;
    padding: 10px 14px 10px 0;
    justify-self: end;
    align-self: center;
    display: inline-flex;
  }
  .sem-table td[data-label="Status"] .periods-status-cell {
    flex-direction: row;
    align-items: center;
    gap: 6px;
  }
  /* Readiness badge: compact inline pill instead of stacked */
  .sem-table td[data-label="Status"] .periods-readiness-badge {
    padding: 2px 8px;
    font-size: 10.5px;
  }

  /* Hide desktop progress + stat cells (replaced by ring + mobile footer) */
  .sem-table td[data-label="Progress"],
  .sem-table td[data-label="Projects"],
  .sem-table td[data-label="Jurors"],
  .sem-table td[data-label="Last Updated"] { display: none !important; }

  /* ── Config strip: criteria + outcome side-by-side ── */
  .sem-table td[data-label="Criteria Set"],
  .sem-table td[data-label="Outcome"] {
    grid-area: cfg;
    padding: 10px 14px;
    background: linear-gradient(180deg, rgba(248,250,253,0.6) 0%, rgba(243,246,251,0.9) 100%) !important;
    border-top: 1px solid var(--border);
  }
  .sem-table td[data-label="Criteria Set"] {
    justify-self: start;
    width: 50%;
    border-right: 1px solid var(--border);
  }
  .sem-table td[data-label="Outcome"] {
    justify-self: end;
    width: 50%;
    margin-left: 50%;
    margin-top: -44px; /* pull onto the same row as criteria */
  }
  /* Uppercase mini-label above each badge (mobile-only) */
  .sem-table td[data-label="Criteria Set"]::before,
  .sem-table td[data-label="Outcome"]::before {
    content: attr(data-label);
    display: block;
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: var(--text-quaternary);
    margin-bottom: 4px;
  }

  /* ── Mobile footer (stats + updated) ── */
  .sem-table td.periods-mobile-footer {
    grid-area: foot;
    display: flex !important;
    align-items: center;
    justify-content: space-between;
    padding: 9px 14px;
    border-top: 1px solid var(--border);
    gap: 10px;
  }
  .periods-mobile-footer-stats {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .periods-m-stat {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; color: var(--text-tertiary); font-weight: 500;
  }
  .periods-m-stat .val {
    font-weight: 700; color: var(--text-secondary);
    font-family: var(--mono); font-size: 11.5px;
  }
  .periods-m-stat .val.zero { color: var(--text-quaternary); }
  .periods-mobile-footer-updated {
    font-size: 10.5px;
    color: var(--text-tertiary);
  }

  /* Pulse animation for live rows — respects reduced motion */
  @keyframes periods-live-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  @media (prefers-reduced-motion: no-preference) {
    .sem-row-live .sem-status-live::before {
      content: ""; width: 5px; height: 5px; border-radius: 50%;
      background: currentColor; margin-right: 4px;
      animation: periods-live-pulse 1.8s ease-in-out infinite;
    }
  }

  /* Empty-state row override — don't inherit grid */
  .sem-table tbody tr.es-row {
    display: block;
    grid-template: none;
    margin-bottom: 0;
    border: none;
    background: none;
    box-shadow: none;
  }
  .sem-table tbody tr.es-row td {
    display: block; width: 100%; padding: 0;
  }

  /* Desktop-only ring cell: hide when not in this media query — handled
     by only defining .periods-mobile-ring styles inside this block.
     On desktop the <td> renders empty so we hide it outright: */
}

/* Hide the mobile ring cell outside the portrait media query */
.periods-mobile-ring { display: none; }
.periods-mobile-footer { display: none; }
@media (max-width: 768px) and (orientation: portrait) {
  .periods-mobile-ring { display: block; }
  .periods-mobile-footer { display: flex; }
}
```

- [ ] **Step 3.3: Remove now-redundant mobile class rules outside the block**

The old `periods-mobile-stats` / `periods-mobile-stats-row` rules may live elsewhere in `periods.css`. Run a grep and delete any leftover definitions:

```bash
grep -n "periods-mobile-stats" src/styles/pages/periods.css
```

If any matches remain outside the rewritten media block, delete those rules. The new footer uses `periods-mobile-footer` + `periods-mobile-footer-stats`.

- [ ] **Step 3.4: Verify no-nested-panels check**

Run: `npm run check:no-nested-panels`
Expected: passes without complaints. The config strip uses a tinted background that could trigger the check; if it does, add `/* nested-panel-ok */` at the end of the line for `td[data-label="Criteria Set"]` and `td[data-label="Outcome"]` rules — the tint is intentional to visually group criteria + outcome as one strip.

- [ ] **Step 3.5: Start dev server and visual-check in browser**

Run: `npm run dev`

Open `http://localhost:5173/admin/periods` in a browser, open devtools responsive mode, set viewport to 360×800 (portrait), and verify:

1. A draft period renders with indigo ring showing setup %, `EVALUATION PERIOD` eyebrow, `Setup in progress` subtitle, draft + issues pills in meta row, criteria + outcome side by side in tinted strip, and `N projects · M jurors · 2h ago` footer.
2. A live period (requires a locked period with scores) renders with green ring showing eval %, pulse dot on the `Live` pill.
3. A closed period renders with slate ring at `100%` and `ARCHIVED` state rail.
4. The kebab still opens FloatingMenu correctly.
5. The readiness pill still opens ReadinessPopover via portal (not clipped).
6. Resize to 900×600 landscape → card layout disappears, desktop table re-appears.
7. Toggle dark mode → ring + config strip remain legible (dark mode overrides for config-strip background may be needed — check against `.dark-mode` selectors in the same file and add a matching override if the strip looks wrong).

- [ ] **Step 3.6: Commit**

```bash
git add src/styles/pages/periods.css
git commit -m "feat(periods): rewrite mobile portrait card as grid hero layout

Replaces the stacked eyebrow-labeled rows with a Projects-parallel
hero card: progress ring | title + kebab → meta row (date + status)
→ config strip (criteria + outcome) → footer stats. State-based
left-rail colouring (draft/published/live/closed). No desktop or
landscape changes."
```

---

## Task 4: Dark-mode polish + final visual pass

**Files:**
- Modify: `src/styles/pages/periods.css` (dark-mode overrides for config-strip background — only if needed per Task 3 Step 3.5 visual check)

- [ ] **Step 4.1: Add dark-mode override for config strip if required**

If Step 3.5 showed the tinted config strip looks wrong in dark mode, append (at the end of the mobile portrait block):

```css
  /* Dark-mode config strip — darker tint to read on card surface */
  .dark-mode .sem-table td[data-label="Criteria Set"],
  .dark-mode .sem-table td[data-label="Outcome"] {
    background: linear-gradient(180deg, rgba(21, 29, 50, 0.4) 0%, rgba(28, 39, 64, 0.55) 100%) !important;
    border-top-color: rgba(255, 255, 255, 0.06);
  }
  .dark-mode .periods-mring-fill {
    background: conic-gradient(var(--ring-color, var(--accent)) var(--pct, 0deg), rgba(255,255,255,0.07) 0);
  }
```

If dark mode already looked fine in Step 3.5, skip this step.

- [ ] **Step 4.2: Run unit + build + lint checks**

Run, in this order:

```bash
npm test -- --run
npm run build
npm run check:no-native-select
```

Expected: all three pass.

- [ ] **Step 4.3: E2E smoke (optional — only if dev cycle permits)**

Run: `npm run e2e -- --grep "periods" --project=Mobile`
Expected: existing mobile periods Playwright specs (if any) pass or visual-regression baselines are updated intentionally.

If Playwright baselines need refreshing because the card layout changed, re-capture them with `npx playwright test --update-snapshots -g periods`.

- [ ] **Step 4.4: Final commit (if dark-mode override was added)**

```bash
git add src/styles/pages/periods.css
git commit -m "fix(periods): dark-mode tint for mobile config strip + ring track"
```

If no dark-mode changes were needed, skip this commit.

---

## Self-Review Notes

**Spec coverage check:**
- Hero (ring + title + kebab) → Task 2 + Task 3.
- Meta row (date + status + blockers pill) → Task 3 (uses existing ReadinessPopover via Status cell).
- Config strip (criteria + outcome side by side) → Task 3.
- Footer stats → Task 2 (mobile-footer cell) + Task 3 (CSS).
- State-adaptive ring value (setup / eval / 100%) → Task 1 (helpers) + Task 2 (render).
- State rail colouring → Task 2 (row class) + Task 3 (CSS).
- Accessibility (`aria-label` on ring, pulse respects reduced-motion) → Task 2 + Task 3.
- Edge cases (missing dates, not-set badges, missing stats, empty-state row) → preserved via existing cell markup; CSS explicitly handles `.es-row`.
- Testing (pure-helper unit tests + manual QA) → Task 1 + Task 3 Step 3.5.

**Placeholder scan:** no TBD / TODO markers; every step has the actual code or command.

**Type consistency:** `computeRingModel` signature matches between Task 1 (definition) and Task 2 (usage). Ring class names (`ring-draft` / `ring-live` / `ring-closed`) match between the helper output and the CSS rules. Row class names (`sem-row-draft` / `sem-row-published` / `sem-row-live` / `sem-row-closed`) match between JSX and CSS.

**Known nuance:** The `published` state uses `ring-live` class (blue ring colour via `.sem-row-published .periods-mring.ring-live` override). This keeps the class enum small while letting CSS differentiate the colour. Called out explicitly in Task 3 Step 3.2.
