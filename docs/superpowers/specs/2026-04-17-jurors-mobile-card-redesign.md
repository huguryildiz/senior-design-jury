# Jurors Page — Mobile Portrait Card Redesign

## Summary

Replace the current sparse juror mobile portrait card (avatar + progress bar + timestamp) with a richer, information-dense card that matches VERA's premium SaaS aesthetic. The new design combines Option B's stats strip with Option C's gradient progress bar and status pill style.

---

## Visual Structure

```
┌─────────────────────────────────────────────┐
│  [Avatar 50px]  Dr. Alper Kılıç             │
│   sq-radius     TED University, EE          │
│                 ● Completed          [⋮]    │
├──────────────┬──────────────┬───────────────┤
│      5       │      5       │     100%      │
│   SCORED     │   ASSIGNED   │     DONE      │
├─────────────────────────────────────────────┤
│  Progress                     5 / 5 projects│
│  ██████████████████████████████ (gradient)  │
├─────────────────────────────────────────────┤
│  🕐 Last active 2 minutes ago               │
└─────────────────────────────────────────────┘
```

---

## Sections

### 1. Card Header

- **Avatar**: 50×50px, `border-radius: 14px` (square with rounded corners), gradient background derived from juror initials (existing `avatarGradient()` or similar).
- **Name**: 14.5px, font-weight 800, `text-overflow: ellipsis`.
- **Affiliation**: 11px, `--text-secondary`.
- **Status pill** (below affiliation, same row as name block):
  - `Completed` → green soft background, checkmark icon
  - `Editing` → purple soft background, pencil icon
  - `Not started` → amber soft background, clock icon
  - Pill style: `border-radius: 999px`, 11px font, font-weight 700, icon + text, matching C's pill style from mockup.
- **Kebab menu**: `MoreVertical` Lucide icon, 28×28px grey button, top-right.

### 2. Stats Strip

Three equal columns separated by `1px solid var(--border)`, `border-top` and `border-bottom` on the strip.

| Column | Value | Label |
|--------|-------|-------|
| Scored | `overviewScoredProjects` | "SCORED" |
| Assigned | `overviewTotalProjects` | "ASSIGNED" |
| Done% | `Math.round(scored/total * 100) + '%'` | "DONE" |

- Value: 18px, font-weight 900.
- Label: 9px uppercase, letter-spacing 0.5px.
- Color coding:
  - Scored: green when complete, accent-purple when in-progress, grey when zero.
  - Done%: green ≥100%, amber 40–99%, grey 0%.

### 3. Progress Bar

- Header row: "Progress" label (left) + "X / Y projects" count (right), 10.5px, font-weight 700.
- Bar: 7px height, `border-radius: 99px`, `background: var(--surface-1)`.
- Fill: gradient — `linear-gradient(90deg, #22c55e, #86efac)` when complete; `linear-gradient(90deg, #6c63ff, #a78bfa)` when partial; empty when zero.
- Width: `(scored / total) * 100%`.
- Right-side count color: green when complete, blue when in-progress, grey when zero.

### 4. Last Active Footer

- `border-top: 1px solid var(--border)`.
- `Clock` Lucide icon (11px, opacity 0.7) + relative timestamp string.
- Font: 10.5px, `--text-tertiary`.
- "Never active" when `lastActive` is null.
- Padding: `7px 14px`.

---

## Dark Mode

All sections use CSS variable tokens (`--bg-card`, `--border`, `--text-primary`, etc.) so dark mode is handled automatically. Status pill backgrounds use `rgba()` overlays (e.g. `rgba(34,197,94,.15)`) instead of opaque soft colors for better contrast.

---

## Implementation Scope

- **File**: `src/admin/pages/JurorsPage.jsx` — replace the existing `.col-portrait` mobile card JSX block.
- **CSS**: `src/styles/pages/jurors.css` — replace/update the portrait card block (lines ~308–466).
- **No new data needed**: `overviewScoredProjects`, `overviewTotalProjects`, `overviewStatus`, `lastActive` are already available on enriched juror rows.
- **No API changes**.
- **No migration**.

---

## Out of Scope

- Desktop table layout (unchanged).
- Landscape tablet view (unchanged).
- Juror detail drawer (unchanged).
