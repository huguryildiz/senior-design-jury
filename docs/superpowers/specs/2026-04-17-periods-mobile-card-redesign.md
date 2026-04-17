# Periods Page — Mobile Portrait Card Redesign

**Date:** 2026-04-17
**Scope:** Admin → Periods page → mobile portrait card layout (≤ 768px portrait)
**Reference mockup:** `docs/superpowers/mockups/periods-mobile-card.html`
**Pattern parity:** `src/styles/pages/projects.css` mobile portrait card

---

## Problem

Current Periods mobile card (`@media (max-width: 768px) and (orientation: portrait)` block in `src/styles/pages/periods.css:423`) stacks every field as its own labeled row. Result: sparse, spec-sheet feel; empty progress bar for draft periods wastes ~60px vertical; two status pills stack vertically (`Draft` + `Ready`) instead of composing. No visual anchor — the card has no hero element analogous to the rank ring on Projects cards.

## Goal

Adopt the Projects card's three-zone structure (hero → meta → footer) on Periods, with a **state-adaptive progress ring** as the hero so every row has a meaningful metric regardless of lifecycle state (draft / live / closed).

## Non-goals

- No change to desktop table layout.
- No change to landscape compact layout.
- No new data fields or RPC changes — rendered from already-available `period`, `periodStats[period.id]`, and `periodReadiness[period.id]`.
- No change to drawer behavior, kebab menu, StatusPill component, or ReadinessPopover logic.

---

## Layout Specification (Variant A — Progress Ring Hero)

### Card structure (CSS grid on `tr`)

```
┌─────────────────────────────────────────┐
│  [ring]  eyebrow              [kebab]   │  hero
│  50%     Spring 2026                    │
│  SETUP   Setup in progress              │
├─────────────────────────────────────────┤
│  📅 Apr 17 → Apr 27    [Draft][2 blockers] │  meta
├─────────────────────────────────────────┤
│  CRITERIA SET        OUTCOME            │  config
│  [MÜDEK-S26-R]       [MÜDEK-S26-O]      │
├─────────────────────────────────────────┤
│  5 projects · 16 jurors        2h ago   │  footer
└─────────────────────────────────────────┘
```

Grid areas on `tbody tr`:

```
"ring  title   actions"
"meta  meta    meta"
"cfg   cfg     cfg"
"foot  foot    foot"
```

### Hero zone

- **Progress ring** — 52×52 conic-gradient ring, 3px stroke equivalent. Percentage number + uppercase label inside. Color varies by state:
  - Draft → indigo `#6366f1` · label `SETUP` · value = setup readiness % (see ring-value logic below)
  - Live → emerald `#10b981` · label `EVAL` · value = evaluation completion %
  - Closed → slate `#64748b` · label `DONE` · value = `100%`
- **Eyebrow** (above title) — 9.5px, weight 700, uppercase, letter-spacing 0.7px.
  - Draft → `EVALUATION PERIOD` (accent color)
  - Live → pulsing green dot + `LIVE EVALUATION`
  - Closed → `ARCHIVED` (slate)
- **Title** — period name, 15px, weight 700, `letter-spacing: -0.3px`.
- **Subtitle** — 11.5px `--text-tertiary`. Draft: `Setup in progress`. Live: `{done} of {total} scorecards complete`. Closed: `Closed · results locked`.
- **Kebab** — existing `FloatingMenu` trigger, 28×28 button top-right.

### Ring-value logic

- **Draft / ready_to_open** → readiness %. Computed from `periodReadiness[period.id]` as `(satisfiedChecks / totalChecks) × 100`, rounded. Ready state (no blockers) = `100%` but ring color stays indigo.
- **Live / published** → evaluation %. Derived from `periodStats[period.id]` as `(doneScorecards / expectedScorecards) × 100`, rounded. Falls back to `0%` with `—` label if stats missing.
- **Closed** → `100%` always (state-only semantic).

If `periodStats` or `periodReadiness` is not yet loaded for a row, render ring at `0%` with no numeric label, preserving the ring shape as a skeleton.

### Meta zone

Single flex row between hero and config strip:

- **Date range** (left) — calendar icon + `Apr 17 → Apr 27` (mono font, 11.5px).
  - When one side missing: render placeholder em-dash.
  - When both missing: render `—` in quaternary color, no icon.
- **Status group** (right, flex-end) — StatusPill + optional readiness blockers pill.
  - Draft → `Draft` + (if `blockerCount > 0`) `{n} blockers` pill in danger tint; clicking the blockers pill opens the existing ReadinessPopover.
  - Ready (no blockers, is_locked=false) → `Draft` + `Ready` pill.
  - Live → `Live` pill with mini pulse dot.
  - Closed → `Closed` pill.

### Config zone

Two-column strip with a subtle tinted background (linear-gradient light, separated by top + bottom border):

- Left: `CRITERIA SET` label + badge (existing `periods-cset-badge` styling) or `Not set` with `+` add button.
- Right: `OUTCOME` label + badge (existing `periods-fw-badge clickable`) or `Not set` with `+` add button.
- Both badges remain click-navigable to Criteria / Outcomes pages.
- Uppercase labels at 8.5px, weight 700, `--text-quaternary`.

### Footer zone

- Left: `projects · jurors` stats (existing `periods-m-stat` values, color tokens unchanged).
- Right: relative timestamp (existing `formatRelative(period.updated_at)`), 10.5px.
- `border-top: 1px solid var(--border)` between config and footer if visual separation needed; mockup keeps config tinted background as the separator.

### State rail (left border accent)

Retain existing 3px left border:

- Draft → `rgba(79, 70, 229, 0.35)` indigo
- Live → `#10b981` emerald
- Closed → `#94a3b8` slate (new — currently no closed accent)
- Current period boost — keep the existing `.sem-row-current` glow if still applicable after state rail change.

---

## Component / File Changes

### `src/admin/pages/PeriodsPage.jsx`

Add three small helpers inside the existing row render (or extract to `PeriodMobileCard` subcomponent if the JSX grows > ~80 lines):

1. **Ring-value helper** — derives `{ percent, label, colorClass }` from `(state, periodReadiness[id], periodStats[id])`.
2. **Mobile ring cell** — new `<td className="periods-mobile-ring">` rendering the conic-gradient markup (mirrors `.mobile-rank-ring` structure from `ProjectsPage`). Desktop hides it via CSS.
3. **Mobile blockers pill** — new pill rendered inline with StatusPill when state is draft and `blockerCount > 0`. Wraps the existing ReadinessPopover trigger.

All other `<td>` cells (Date Range, Progress, Projects, Jurors, Criteria Set, Outcome, Last Updated, Actions) stay in place — the mobile CSS rearranges them via grid areas.

### `src/styles/pages/periods.css`

Rewrite the `@media (max-width: 768px) and (orientation: portrait)` block (lines 423–547):

- Replace flex-row tbody rows with CSS Grid (`grid-template-areas` as above).
- Add `.periods-mobile-ring` cell styles (ring dimensions, conic-gradient, inner num/label).
- Collapse the separate Date Range, Progress, Mobile Stats, Criteria, Outcome, Updated eyebrow rows into the new meta/config/footer zones. Hide `td[data-label="Progress"]`, `td[data-label="Date Range"]` individual blocks (their data is consumed by ring + meta row).
- Add config strip wrapper styles — paint a single `<td>` or wrap Criteria + Outcome cells via `grid-area: cfg` so they sit in one shared tinted box.
- State rail colors via `tr.sem-row-draft`, `tr.sem-row-live`, `tr.sem-row-closed`.
- Footer row: `border-top`, padding, stats + timestamp alignment.

All new styles gated inside the existing `@media (max-width: 768px) and (orientation: portrait)` block — zero desktop/landscape impact.

### Progress logic reuse

`ProgressCell` component (used in desktop) computes evaluation %. Extract its calculation into a pure helper (e.g. `computeEvalPercent(period, stats)`) in `src/admin/pages/PeriodsPage.jsx` or a small util, so the mobile ring can reuse it. No new RPC, no new state.

### Readiness blocker count

`periodReadiness[id]` already exposes a list/object describing missing setup steps. Add a pure `countBlockers(readiness)` helper; render the pill only when count > 0.

---

## Data Flow

```
PeriodsPage (existing)
  ├── periods[]                 (existing state)
  ├── periodStats[id]           (existing state)
  └── periodReadiness[id]       (existing state)
        │
        └── row render
              ├── Ring value    = derive(state, readiness, stats)   [pure]
              ├── Status pills  = StatusPill + optional Blockers    [existing]
              ├── Config badges = existing Criteria/Framework cells [unchanged]
              └── Stats/footer  = existing periodStats values       [unchanged]
```

No new props to parent routes. No new loading state. No new realtime subscriptions.

---

## Accessibility

- Ring is decorative; percentage is also rendered as text inside it, screen readers read the number. Add `aria-label` on the ring cell: `"{period.name} — {percent}% {label}"`.
- Blockers pill is a button; must have `aria-label="{n} setup blockers — open checklist"` and preserve keyboard activation (Enter/Space → open ReadinessPopover).
- Pulse animation on Live eyebrow dot respects `prefers-reduced-motion: reduce` (disable keyframes).
- Ensure all interactive regions (kebab, badges, blockers pill, ring) have focus-visible outline via existing `:focus-visible` tokens.

---

## Edge Cases

- **Missing dates** → meta row shows `—` placeholder, no calendar icon (current behavior preserved).
- **Missing criteria or outcome** → existing `Not set` + plus button renders in config strip column.
- **Stats still loading** → ring shows `0%` with muted label; projects/jurors counts show `—`.
- **Empty state row** (no periods at all) — keep existing `.es-row` override from current CSS.
- **Current period badge** (`sem-badge-current`) — continue rendering inline with eyebrow on mobile; verify it doesn't collide with the pulse dot.
- **Long period names** — title clamps to 2 lines via `-webkit-line-clamp: 2` (match Projects title treatment).
- **Draft with 0% readiness** — ring renders empty stroke (no fill arc), `0%` number, label `SETUP`.

---

## Testing

- **Unit:** Ring-value helper + blocker-count helper — pure functions, simple test vectors per state.
- **Visual regression:** Existing Playwright E2E screenshot check for `/admin/periods` at 360×800 — update baseline after change.
- **Manual QA pass (mobile portrait 360×800 emulation in devtools):**
  - Draft with 0 blockers → `Draft` + `Ready` pills, ring 100% indigo.
  - Draft with 2 blockers → `Draft` + `2 blockers` pill, tapping opens ReadinessPopover.
  - Live mid-evaluation → pulsing dot, ring green matching desktop ProgressCell %.
  - Closed period → slate ring at 100%, `ARCHIVED` eyebrow, no blockers.
  - No dates / no criteria / no outcome → graceful placeholders.
  - Dark mode → colors remain legible; conic-gradient uses dark-mode track color.
- **No native `<select>` / no inline modals** — N/A for this change but verified via existing `npm run check:no-native-select` in CI.
- **Nested panel check** — config strip tint must not create an opaque background under the card shell; run `npm run check:no-nested-panels` and add `/* nested-panel-ok */` annotation on the config strip rule if needed.

---

## Out of Scope / Follow-ups

- Landscape mobile compact — leave as-is for now.
- Desktop table redesign — separate future track.
- Ring micro-animation on %-change — can be added later with CSS transition on the conic-gradient `--pct` variable.
- Legend / lifecycle bar above cards — no changes in this scope.
