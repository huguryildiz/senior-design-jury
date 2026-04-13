# Criteria Card Mobile Redesign

**Date:** 2026-04-13
**Status:** Approved

---

## Problem

The criteria card in portrait mobile view (≤ 768px) has several issues:
- Weight label is truncated ("WEIGH…") and shown as a separate full-width row
- Rubric bands are crammed into a 2×2 grid with overflow/wrapping issues
- Visual hierarchy is flat — all sections look the same weight
- Card lacks polish (no tap affordance, weak shadow)

---

## Goal

Redesign the mobile card to match a premium SaaS standard: weight prominent in top-right, criterion name and description in a clean header, bands and mapping stacked below with breathing room.

---

## Scope

- **Only** `@media (max-width: 768px) and (orientation: portrait)` — desktop table is untouched
- **Files changed:** `src/styles/pages/criteria.css` (mobile block only)
- No JSX changes, no new components, no new props

---

## Layout (Option B)

```
┌─────────────────────────────────────┐
│  1  ● Technical Content      30     │  ← header row (criterion td + weight td)
│     Evaluates depth, correctness…  pts│
├─────────────────────────────────────┤
│     RUBRIC BANDS                    │
│     27–30 Excellent  21–26 Good     │
│     13–20 Developing  0–12 Insuff.  │
├─────────────────────────────────────┤
│     OUTCOMES                        │
│     MDK 1.2  MDK 2  MDK 3  +       │
├─────────────────────────────────────┤
│                           ⋯ Actions │
└─────────────────────────────────────┘
```

---

## CSS Changes

### 1. Grid columns and areas

Change `grid-template-columns` from `28px 1fr 1fr` to `28px 1fr auto`.

Change `grid-template-areas`:
```css
"num criterion weight"
"num rubric    rubric"
"num mapping   mapping"
".   actions   actions"
```

The weight `td` moves from its own full-width row into the top-right of the criterion row.

### 2. Weight cell (`.col-weight`)

On mobile, the weight badge shows as a large number above a "pts" label:
- `.col-weight .crt-inline-weight`: `align-items: flex-end; justify-content: flex-start`
- `.col-weight .crt-inline-weight-badge`: `flex-direction: column; align-items: center; padding: 4px 8px; border-radius: 10px; min-width: 44px`
- The number (value) renders at `font-size: 20px; font-weight: 800; line-height: 1`
- "pts" label: `font-size: 9px; font-weight: 600; text-transform: uppercase; opacity: 0.7`

Since `InlineWeightEdit` renders `{value} pts` as a single string, we use CSS to split the display:
- Target `.col-weight .crt-inline-weight-badge` and use `flex-direction: column`
- The badge text "30 pts" becomes a two-part visual via a CSS `::after` pseudo-element approach:
  - Override: set `font-size: 20px; letter-spacing: -0.5px` for the number portion
  - The badge content is `{value} pts` — we style the whole badge to look large, accepting "30 pts" as a single large string at `font-size: 16px; font-weight: 800`

Actually the simpler approach: style `.col-weight .crt-inline-weight-badge` with `font-size: 16px; font-weight: 800; padding: 6px 10px; border-radius: 10px; min-width: 52px; text-align: center; flex-direction: column` — this makes "30 pts" read as a prominent badge without splitting.

### 3. Suppress weight data-label

```css
.crt-table td.col-weight::before { display: none; }
```

The weight value is already prominent in the top-right; the label is redundant.

### 4. Criterion cell — no change

The criterion `td` (name + description) already has `grid-area: criterion` and displays correctly. With the new grid it occupies `1fr` of the header row alongside the weight's `auto` column.

### 5. Rubric bands — remove 2×2 grid

Remove any `grid` or fixed-width constraint from `.crt-rubric-bands` within the mobile block. Bands use `display: flex; flex-wrap: wrap; gap: 4px` (already the default). Each `.crt-band-pill` uses `width: max-content`.

### 6. Card polish

```css
.crt-table tbody tr {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04);
  cursor: pointer;
  gap: 8px 12px;
}
.crt-table tbody tr:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.10), 0 4px 12px rgba(0,0,0,0.06);
}
```

### 7. Section divider

Add a visual separator between the header (criterion + weight) and the body sections (rubric bands, mapping). Achieved by adding `padding-top: 8px; border-top: 1px solid var(--border)` to `.col-rubric` within the mobile block.

---

## What Stays the Same

- `col-crt-actions` grid area and border-top separator: unchanged
- `data-label` micro-labels on rubric and mapping cells: unchanged
- Desktop table: untouched
- Landscape breakpoint: untouched
- `InlineWeightEdit` JSX: no changes
- Tap-to-edit behavior: the existing `onClick` on the row (if any) and three-dot menu both continue to work; only the visual treatment changes
