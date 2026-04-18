# Mobile Card Tap Behavior — Design Spec

**Date:** 2026-04-18
**Status:** Draft — awaiting review
**Scope:** Admin panel mobile cards (≤600px portrait or equivalent breakpoint) and their kebab buttons across all admin pages.

---

## Problem

Mobile card tap behavior across VERA admin pages is inconsistent. Each page offers a slightly different contract:

- Projects / Jurors / Periods: kebab-only, card body inert.
- Heatmap: whole-card expand/collapse (Linear-style toggle).
- Reviews: inline comment toggle, no kebab.
- Organizations / Entry Control / Pin Blocking / Rankings / Overview Top Projects: table → card via global `mobile.css`, with per-page variations.
- Audit Log: `.is-active` row highlight tied to drawer opening.

Additionally, the current kebab button tap target is ~22–24px — well below the WCAG 2.2 AAA / Apple HIG 44×44px standard — causing frequent mis-taps on mobile.

There is no global rule for what visual feedback the card should provide on tap. Users re-learn interaction affordances on every page.

## Goals

1. A single, globally consistent mobile card interaction contract.
2. Kebab tap target at platform standards (44×44px mobile).
3. Subtle but visible tap feedback that is coherent across all cards.
4. Preserve the "no nested panels" rule — feedback must not cascade into inner card elements.

## Non-goals

- New detail drawers for Projects / Jurors / Periods / Organizations. Tracked separately.
- Desktop table row hover/interaction redesign. Separate spec.
- Jury flow card patterns. Admin-only.

---

## Decisions

### D1 — Tap Model: Pattern B with Persistent Selection

The card is a **display surface**. Row-level actions (Edit, Delete, View, Duplicate, Reset PIN, etc.) live inside the kebab menu only. The card body has no `onClick` that navigates or opens drawers.

On tap, the card enters a **persistent selected state** (`.is-selected`) — border turns `var(--accent)` and **stays** until another card is tapped. This gives users a visual anchor ("this is the row I touched last") across long lists.

**Rationale:**

- VERA does not have read-only detail drawers for most entities; a tap-opens-detail model is out of scope.
- A flash-only feedback lies about interactivity when no action follows. A persistent selected state is honest: "you touched this one; next tap will move focus."
- Matches iPad Mail split-view row highlight pattern. Premium SaaS apps on mobile typically pair tap with detail navigation; we instead use the selection as a benign visual bookmark.

**Exceptions:**

- [JurorHeatmapCard.jsx](src/admin/pages/JurorHeatmapCard.jsx)'s whole-card expand/collapse remains as-is (inline content disclosure, not row action). Selection and expand states coexist — tapping the card adds `.is-selected` AND toggles `.is-expanded`.
- [ProjectAveragesCard.jsx](src/admin/pages/ProjectAveragesCard.jsx) (Heatmap footer summary) is a page-level summary, not a per-row card. Selection is skipped.
- [AuditLogPage.jsx](src/admin/pages/AuditLogPage.jsx): pre-existing `.is-active` class (tied to drawer open) is **replaced** by `.is-selected` from the global selection hook. Selection state and drawer open state become one.

### D2 — Kebab Button Tap Target

| Breakpoint | Button size | Visible icon | Padding |
|---|---|---|---|
| Mobile (≤600px portrait) | 44×44px | 18px | `10px` |
| Desktop (>600px) | 32×32px | 15px | `6px` |

The icon itself stays small; only the invisible tap zone expands on mobile.

### D3 — Global Class Rename

Rename `.juror-action-btn` (defined in [src/styles/pages/jurors.css](src/styles/pages/jurors.css)) to `.row-action-btn` and move to [src/styles/components.css](src/styles/components.css).

**Touched pages (kebab consumers):** [ProjectsPage.jsx](src/admin/pages/ProjectsPage.jsx), [JurorsPage.jsx](src/admin/pages/JurorsPage.jsx), [PeriodsPage.jsx](src/admin/pages/PeriodsPage.jsx), [OrganizationsPage.jsx](src/admin/pages/OrganizationsPage.jsx), [CriteriaPage.jsx](src/admin/pages/CriteriaPage.jsx), [OutcomesPage.jsx](src/admin/pages/OutcomesPage.jsx).

**Rationale:** `juror-action` is semantically misleading when used on projects, periods, outcomes, organizations. `.row-action-btn` accurately describes scope.

### D4 — Card Selection Feedback

On tap, the card's **border color** changes to `var(--accent)` and persists until another card is tapped. Background and inner elements are never touched.

**Model:** Single-selection across the visible list. At most one card carries `.is-selected` at any time.

**Mechanism:**

- Pointer `down` on any card root → remove `.is-selected` from all sibling cards in scope, add it to the target card.
- Kebab tap additionally opens the FloatingMenu for that card — the two behaviors are independent and compatible (same card gets selected AND opens menu).
- Inline controls inside the card (Reviews comment toggle, Periods criteria/outcome nav badges) do NOT trigger selection — their handlers call `event.stopPropagation()` or the hook's delegated listener skips `closest('.row-inline-control')`.
- Tapping the same selected card again deselects it (toggle).
- Selection clears on component unmount (navigate away → no selected state on return).

**Implementation outline:**

```js
// src/shared/hooks/useCardSelection.js (new)
// Given a list scope ref, installs a delegated pointerdown listener.
// On fire:
//   - if closest('.row-inline-control') → ignore
//   - if closest('[data-card-selectable]') → toggle .is-selected on target,
//     remove .is-selected from siblings
// Returns a ref to attach to the scope container.
```

CSS (global, in [src/styles/components.css](src/styles/components.css)):

```css
.mcard,
.hm-card,
.rmc-card,
.crt-mobile-card,
.acc-m-card,
.organizations-table tbody tr,
.entry-history-table tbody tr,
.pin-lock-table tbody tr,
.overview-top-projects-table tbody tr,
.ranking-table tbody tr,
.reviews-table tbody tr,
.acc-table tbody tr.acc-row {
  transition: border-color 120ms ease-out;
  -webkit-tap-highlight-color: transparent;
}

.mcard.is-selected,
.hm-card.is-selected,
.rmc-card.is-selected,
.crt-mobile-card.is-selected,
.acc-m-card.is-selected,
.organizations-table tbody tr.is-selected,
.entry-history-table tbody tr.is-selected,
.pin-lock-table tbody tr.is-selected,
.overview-top-projects-table tbody tr.is-selected,
.ranking-table tbody tr.is-selected,
.reviews-table tbody tr.is-selected,
.acc-table tbody tr.acc-row.is-selected {
  border-color: var(--accent);
}
```

**Why `--accent` (not a new `--primary` token):**

- VERA's existing visual identity is blue (`#3b82f6` light, `#60a5fa` dark) — buttons, links, status pills all use this token.
- [mobile.css:450](src/styles/mobile.css#L450) already uses `--accent` for the pre-existing `.menu-open` / `.is-active` kebab-highlight pattern. We are unifying, not introducing a new color.
- Adding a new `--primary` token would require dark-mode overrides, cascade testing, and broader token discipline — a separate concern.

**Why not background tint:** Prior incidents with nested panel artifacts and dark mode color wash — see CLAUDE.md "nested panel yasağı." Border-only keeps feedback isolated to the card edge.

### D5 — Kebab Button `:active`

Standard pressed state on the kebab button only:

```css
.row-action-btn:active {
  background: var(--surface-1);
  transform: scale(0.96);
  transition: transform 80ms, background 80ms;
}
```

The kebab pressed state is independent of the card's `.is-selected` state. Tapping the kebab triggers both: card becomes selected AND menu opens.

### D6 — Deprecate `.menu-open` / `.is-active` Row Highlights

The old classes `.menu-open`, `.row-menu-open`, and `.is-active` (when applied to row-level cards) previously signaled "this row's kebab menu is currently open." Their entire CSS footprint (notably [mobile.css:432–451](src/styles/mobile.css#L432-L451)) is replaced by `.is-selected`.

**Migration:**

- JSX: every place that toggles `"menu-open"`, `"row-menu-open"`, or `"is-active"` on a row `className` based on `openMenuId === id` is changed to toggle `"is-selected"` (and only when the kebab is open — because the new selection hook handles the general case). Actually simpler: remove these conditional classes entirely from JSX and let the `useCardSelection` hook drive `.is-selected`. When the menu is open, the card is selected, so the visual state is still correct.
- CSS: the `.menu-open` / `.is-active` selectors in [mobile.css](src/styles/mobile.css) and page-level CSS are deleted. Their rules (border-color, box-shadow) migrate into `.is-selected`.
- AuditLog: the current `isSelected ? "is-active" : ""` usage in [AuditLogPage.jsx:835](src/admin/pages/AuditLogPage.jsx#L835) is removed. The selection hook takes over; when the drawer is open, the corresponding row is selected because the hook already added `.is-selected` on the prior tap.

### D7 — Reviews Page

[ReviewMobileCard.jsx](src/admin/components/ReviewMobileCard.jsx):

- No kebab (no row-level actions defined today).
- Inline comment toggle kept — content-local disclosure, skipped from selection logic.
- Card receives D4 border feedback on tap.

---

## Architecture

```
src/shared/hooks/useCardSelection.js        (new)
  └── Delegated pointerdown listener on a list scope.
      Toggles .is-selected on target card; deselects siblings.
      Skips .row-inline-control targets.
      Returns scope ref.

src/styles/components.css                   (modified)
  ├── .row-action-btn block                 (renamed from .juror-action-btn)
  │   ├── base: 32×32, 15px icon
  │   ├── @media (max-width: 600px): 44×44, 18px icon
  │   └── :active: bg + scale(0.96)
  └── mcard / hm-card / rmc-card / etc. base + .is-selected rules

src/styles/mobile.css                       (modified)
  └── delete .menu-open / .is-active row highlight block (lines ~432–451);
      visual responsibility migrates to .is-selected

src/styles/pages/jurors.css                 (modified)
  └── delete .juror-action-btn block

Consumers (attach useCardSelection to list scope):
  Kebab-having (D2, D3, D4, D5, D6):
    - src/admin/pages/ProjectsPage.jsx
    - src/admin/pages/JurorsPage.jsx
    - src/admin/pages/PeriodsPage.jsx
    - src/admin/pages/OrganizationsPage.jsx
    - src/admin/pages/CriteriaPage.jsx
    - src/admin/pages/OutcomesPage.jsx

  Kebab-less (D4 only):
    - src/admin/pages/RankingsPage.jsx
    - src/admin/pages/OverviewPage.jsx (top projects table)
    - src/admin/pages/EntryControlPage.jsx
    - src/admin/pages/PinBlockingPage.jsx
    - src/admin/components/ReviewMobileCard.jsx
    - src/admin/pages/JurorHeatmapCard.jsx (coexists with expand)

  Exempt:
    - src/admin/pages/ProjectAveragesCard.jsx (footer summary, not per-row)
    - src/admin/pages/AuditLogPage.jsx: selection replaces existing is-active
```

## Files Changed Summary

**New:**

- `src/shared/hooks/useCardSelection.js`

**Modified:**

- `src/styles/components.css` — add `.row-action-btn`, add `.is-selected` rules for all card classes
- `src/styles/mobile.css` — delete old `.menu-open` / `.is-active` row-highlight block
- `src/styles/pages/jurors.css` — remove `.juror-action-btn` block
- Six kebab-using admin pages: replace `juror-action-btn` className → `row-action-btn`, remove old `menu-open` / `is-active` conditional classNames, attach `useCardSelection`
- Six kebab-less admin pages / components: attach `useCardSelection` (no className change)
- [AuditLogPage.jsx](src/admin/pages/AuditLogPage.jsx): remove `isSelected ? "is-active" : ""` className, let the hook drive selection

## CLAUDE.md Addition

Add to the "UI/UX Conventions" section:

> **Mobile card tap model (global rule):** All admin mobile cards (≤600px portrait) use a single-selection model. Tapping any card adds `.is-selected` to that card (border turns `var(--accent)`) and removes it from sibling cards. Selection persists until another card is tapped. Row-level actions live in the kebab menu (`.row-action-btn`, 44×44px mobile tap target); inline controls inside the card (comment toggles, nav badges) do not trigger selection. The legacy classes `.menu-open`, `.row-menu-open`, and `.is-active` for row highlighting are deprecated — do not reintroduce them; use `.is-selected` via `useCardSelection`. Per-page `border-color` overrides for row selection are forbidden; extend the global rule in `components.css` instead.

## Testing

- Unit: `useCardSelection` hook — pointerdown on a card root adds `.is-selected` to target + removes from siblings; pointerdown on `.row-inline-control` is ignored; tapping a selected card again deselects it.
- Visual regression: tap each affected card on mobile viewport (375×667), verify:
  - Border accent appears and persists
  - Tapping another card moves selection
  - Background unchanged
  - Dark mode parity
- Accessibility: kebab button tappable at 44×44px (DevTools Elements inspector); focus ring preserved.
- Lint: `npm run check:no-nested-panels` after changes.

## Open Items

None — all decisions resolved.

## References

- CLAUDE.md "No tap-to-open on cards/rows" rule (amended by this spec — tap is permitted for selection, but still not for drawer/nav)
- CLAUDE.md "Nested panel yasağı"
- WCAG 2.2 AAA 2.5.8 Target Size (Minimum)
- Apple HIG Touch Targets
- iPad Mail split-view row highlight pattern (persistent selection analog)
