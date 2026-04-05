# Compare Projects Modal — Design Spec

Date: 2026-04-05

## Overview

Add a "Compare Projects" modal to the Rankings page that lets admins select two projects
side-by-side, view a radar chart of per-criterion scores, and compare key stats.
Matches the prototype in `docs/concepts/vera-premium-prototype.html` exactly.

## New Files

- `src/admin/modals/CompareProjectsModal.jsx` — self-contained modal component

## Modified Files

- `src/admin/pages/RankingsPage.jsx` — add "Compare" button + modal state

## Component: CompareProjectsModal

### Props

| Prop | Type | Description |
|---|---|---|
| `open` | `bool` | Controls modal visibility |
| `onClose` | `fn` | Called when modal closes |
| `projects` | `summaryData[]` | All projects with `avg`, `totalAvg`, `title` |
| `criteriaConfig` | `Criterion[]` | Dynamic criteria (label, shortLabel, max, id) |
| `rawScores` | `array` | Raw juror scores for sigma computation |

### Internal State

- `projectAId` — initialized to `projects[0].id`
- `projectBId` — initialized to `projects[1].id`

Derived: `projectA`, `projectB` — looked up from projects array by id.

### Sigma Computation

Inline in modal: for each selected project, group rawScores by juror, sum per-juror totals,
compute standard deviation. Returns `{ sigma: "2.67" }` or null if < 2 jurors.

```js
function computeSigma(projectId, rawScores, criteriaConfig) {
  const projScores = rawScores.filter(s => (s.projectId ?? s.project_id) === projectId);
  const byJuror = {};
  for (const s of projScores) {
    const jid = s.jurorId ?? s.juror_id;
    if (!byJuror[jid]) byJuror[jid] = 0;
    for (const c of criteriaConfig) {
      const v = s[c.id];
      if (typeof v === "number") byJuror[jid] += v;
    }
  }
  const totals = Object.values(byJuror);
  if (totals.length < 2) return null;
  const mean = totals.reduce((a, b) => a + b) / totals.length;
  const variance = totals.reduce((s, v) => s + (v - mean) ** 2, 0) / totals.length;
  return { sigma: Math.sqrt(variance).toFixed(2) };
}
```

### Radar Chart

- Library: recharts `RadarChart` + `Radar` + `PolarAngleAxis` + `PolarGrid` + `PolarRadiusAxis` + `Legend`
- One axis per criterion (`criteriaConfig` determines axes dynamically)
- Normalization: `(avg[id] / criterion.max) * 100` → 0–100 scale
- Null avg treated as 0
- Domain: `[0, 100]`
- Color A: `#3b82f6` (blue), fill `rgba(59,130,246,0.12)`, stroke `rgba(59,130,246,0.7)`
- Color B: `#8b5cf6` (purple), fill `rgba(139,92,246,0.10)`, stroke `rgba(139,92,246,0.7)`
- No built-in recharts legend — custom legend rendered above the chart (matches prototype)
- `PolarRadiusAxis` ticks hidden, domain `[0, 100]`

### Stats Grid

Two-column CSS grid, one cell per criterion + Average + Consensus rows.

- Each cell: uppercase label (`TECHNICAL /30`), two mono values side by side (A blue, B purple)
- Average row: `totalAvg.toFixed(1)` for each
- Consensus row: `σ2.67` format from `computeSigma`, or `—` if null
- Stats values use `font-family: var(--mono)`, `font-weight: 700`
- Grid: `background: var(--border)`, `gap: 1px` — creates hairline divider effect (matches prototype)

### Selectors

Two custom `<select>` dropdowns styled to match existing filter dropdowns.
Both populated with all projects. On change → update `projectAId` / `projectBId`.

Between them: a "vs" label in `var(--text-tertiary)`.

### Layout

```
┌─ compare-modal (720px max-width) ──────────────────────────┐
│  Compare Projects                                      [×]  │
├────────────────────────────────────────────────────────────│
│  [Select A ▾]   vs   [Select B ▾]                          │
│  ● SDR Receiver   ● Buck Converter  (legend)                │
│  ┌──────────────────────┬──────────────────────────────┐   │
│  │   RadarChart         │  Stats 2-col grid            │   │
│  │   (280px height)     │  TECHNICAL /30  26.3  24.3   │   │
│  │                      │  DESIGN /30     24.2  23.8   │   │
│  │                      │  …                           │   │
│  │                      │  AVERAGE        84.0  78.6   │   │
│  │                      │  CONSENSUS      σ2.67 σ4.32  │   │
│  └──────────────────────┴──────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

Mobile (`max-width: 640px`): stack grid vertically (radar on top, stats below).

### Modal Behavior

- Overlay backdrop with `backdrop-filter: blur(4px)`
- Clicking backdrop closes modal
- `animation: modal-in .2s ease-out` (scale + translateY)
- Dark mode: glass morphism `rgba(10,15,30,0.75)` + `backdrop-filter: blur(32px)`
- Escape key closes modal

### CSS

All styles scoped to `.compare-*` class names. Added to
`src/admin/styles/compare.css` (imported in `CompareProjectsModal.jsx`).
Design tokens: `--bg-card`, `--border`, `--radius-lg`, `--text-primary`, `--text-tertiary`,
`--accent`, `--mono`, `--surface-1` — same variables already used across the app.

## RankingsPage Changes

- Import `CompareProjectsModal` and `GitCompare` icon from lucide-react
- Add `const [compareOpen, setCompareOpen] = useState(false)` state
- Add "Compare" button to page header (right side, next to Export button)
- Render `<CompareProjectsModal>` at bottom of JSX, passing `summaryData`,
  `criteriaConfig`, `rawScores`, `compareOpen`, `onClose`

## Out of Scope

- Pinning comparisons or sharing comparison URLs
- Comparing more than 2 projects at once
- Persisting last-selected comparison projects
