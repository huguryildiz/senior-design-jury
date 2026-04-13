# Criteria Card Mobile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the portrait-mobile criteria card so weight is prominent in the top-right, rubric bands wrap cleanly, and the card feels premium-SaaS polished.

**Architecture:** Pure CSS changes inside the existing `@media (max-width: 768px) and (orientation: portrait)` block in `src/styles/pages/criteria.css`. No JSX, no new components, no new props. The existing grid-area assignments for all cells stay; only the grid columns, weight-cell styling, band layout, and card chrome change.

**Tech Stack:** CSS Grid, Flexbox, CSS custom properties (`var(--bg-card)`, `var(--border)`, `var(--accent)`, `var(--text-tertiary)`)

---

## File Map

| File | Change |
|------|--------|
| `src/styles/pages/criteria.css` | Edit the portrait mobile block (lines 976–1049) |

---

### Task 1: Rewrite the portrait mobile CSS block

This is the only task. All changes are inside the `@media (max-width: 768px) and (orientation: portrait)` block that currently occupies lines 976–1049.

**Files:**
- Modify: `src/styles/pages/criteria.css:976-1049`

No unit tests exist for CSS; verification is visual (dev server + browser DevTools mobile emulation).

---

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open `http://localhost:5173` in Chrome. Open DevTools → Toggle device toolbar → select "iPhone 12 Pro" (390×844, portrait). Navigate to Admin → Criteria. You should see the current broken layout: weight on its own row with a truncated "WEIGH…" label, bands in a 2×2 grid.

---

- [ ] **Step 2: Replace the portrait mobile block**

Open `src/styles/pages/criteria.css`. Find the block that starts at line 976:

```css
/* ─── Portrait card layout (≤ 768px portrait) ────────────────
   Each criteria row becomes a stacked card.
   ──────────────────────────────────────────────────────────── */
@media (max-width: 768px) and (orientation: portrait) {
```

Replace the entire block (from that comment down to and including the closing `}` on line 1049) with:

```css
/* ─── Portrait card layout (≤ 768px portrait) ────────────────
   Each criteria row becomes a stacked card.
   ──────────────────────────────────────────────────────────── */
@media (max-width: 768px) and (orientation: portrait) {
  .criteria-page .table-wrap {
    overflow: hidden;
    border: none;
    background: none;
    box-shadow: none;
    border-radius: 0;
  }

  .crt-table { display: contents; }
  .crt-table thead { display: none !important; }
  .crt-table tbody { display: block; width: 100%; }

  /* Card container */
  .crt-table tbody tr {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    grid-template-areas:
      "num criterion weight"
      "num rubric    rubric"
      "num mapping   mapping"
      ".   actions   actions";
    width: 100%;
    box-sizing: border-box;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    margin-bottom: 10px;
    padding: 14px 16px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04);
    transition: box-shadow 0.15s, border-color 0.15s;
    gap: 8px 12px;
    cursor: pointer;
  }
  .crt-table tbody tr:hover {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.10), 0 4px 12px rgba(0,0,0,0.06);
  }

  /* Base cell reset */
  .crt-table td {
    display: block;
    border-bottom: none;
    padding: 0;
    box-sizing: border-box;
    text-align: left !important;
  }

  /* data-label micro-labels */
  .crt-table td[data-label]::before {
    content: attr(data-label);
    display: block;
    font-size: 8.5px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--text-tertiary);
    font-weight: 600;
    margin-bottom: 2px;
  }

  /* Grid area assignments */
  .crt-table td:nth-child(1)     { grid-area: num; align-self: flex-start; padding-top: 2px; }
  .crt-table td:nth-child(2)     { grid-area: criterion; }
  .crt-table td.col-weight       { grid-area: weight; align-self: flex-start; }
  .crt-table td.col-rubric       { grid-area: rubric; padding-top: 8px; border-top: 1px solid var(--border); }
  .crt-table td.col-mapping      { grid-area: mapping; }
  .crt-table td.col-crt-actions  {
    grid-area: actions;
    padding-top: 8px;
    border-top: 1px solid var(--border);
    text-align: right !important;
  }
  .crt-table td.col-crt-actions::before { display: none; }

  /* Weight cell — suppress redundant label, style as prominent badge */
  .crt-table td.col-weight::before { display: none; }

  .crt-table td.col-weight .crt-inline-weight {
    align-items: flex-start;
    justify-content: flex-end;
  }

  .crt-table td.col-weight .crt-inline-weight-badge {
    font-size: 16px;
    font-weight: 800;
    padding: 6px 10px;
    border-radius: 10px;
    min-width: 52px;
    text-align: center;
    line-height: 1.2;
  }

  /* Rubric bands — single flex-wrap row, no 2×2 grid */
  .crt-table td.col-rubric .crt-rubric-bands {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .crt-table td.col-rubric .crt-band-pill {
    width: max-content;
  }
}
```

---

- [ ] **Step 3: Verify the new layout in the browser**

With the dev server running, reload the Criteria page in Chrome DevTools mobile emulation (iPhone 12 Pro, portrait).

Check each of these:

1. **Weight position** — the weight badge appears in the top-right corner of the card, aligned with the criterion name row. The "WEIGHT" label is gone.
2. **Weight badge style** — the badge shows "30 pts" (or whatever the value is) as a large, prominent pill with `font-size: 16px; font-weight: 800`.
3. **Rubric bands** — bands wrap onto multiple lines if needed; no 2×2 fixed grid. All band labels are fully visible (not truncated).
4. **Section divider** — there is a horizontal rule between the criterion+weight header row and the rubric bands row.
5. **Card border-radius** — card corners are noticeably rounder than before (12px vs the old `var(--radius)`).
6. **Hover state** — hovering a card shows the blue accent border + glow.
7. **Desktop table untouched** — switch to desktop viewport; table layout is identical to before.
8. **Landscape untouched** — rotate to landscape in DevTools; the landscape compact block still applies.

---

- [ ] **Step 4: Verify the three-dot menu and tap behavior**

Still in mobile emulation:

1. Click anywhere on a card body — the EditSingleCriterionDrawer should open (existing `onClick` on the row).
2. Click the three-dot (⋯) Actions button — the actions menu should open as before.

Both behaviors come from existing JSX handlers; no changes needed. Just confirm they still work.

---

- [ ] **Step 5: Run the build to confirm no CSS syntax errors**

```bash
npm run build
```

Expected: build succeeds with no errors. CSS syntax errors show up as build failures.

---
