# Unified Mobile Card Design

Date: 2026-04-16

## Problem

Five admin pages (Audit Log, Jurors, Projects, Periods, Rankings) each duplicate the mobile-card shell (border, radius, background, shadow, active-state ring). The look is close but not identical, and every new page that adds a mobile card invents its own shell. The Audit Log card is the most refined template; we want its shell (minus the coloured left accent bar) to become the single source of truth.

## Goals

- One shell definition for all admin mobile cards.
- Blue border only when a card is "active" (kebab open or selected).
- No left coloured accent bar on any card.
- Per-page internal layout (grid/flex, typography, badges) unchanged.

## Non-Goals

- Not changing jury-side cards.
- Not touching pages that currently use tables on mobile without a card shell (Reviews, Heatmap, Outcomes, Criteria, EntryControl, Organizations).
- Not changing `.amc-*` internal elements (avatar, header, footer, diff chips, tipografi).

## Design

### Global shell: `.mcard`

Defined once in `src/styles/components.css` inside a new `/* ── unified mobile card (.mcard) ── */` block.

**Base:**

- `position: relative`
- `border-radius: 14px`
- `border: 1px solid var(--border)`
- `overflow: hidden`
- Light: `background: var(--bg-card)`
- Dark: `background: linear-gradient(145deg, #0f1629 0%, #0a1020 100%)`, `border-color: rgba(127,153,205,0.22)`, inset + outer shadow
- `transition: box-shadow .18s, border-color .18s, transform .18s`

**Active (`.mcard.is-active`):**

- Light: `border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-ring);`
- Dark: `border-color: rgba(89,160,255,0.85); box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 0 0 1px rgba(89,160,255,.3), 0 0 16px rgba(59,130,246,.28);`

**Optional parts:**

- `.mcard-body` — transparent inner wrapper, standard padding.
- `.mcard-divider` — 1px `var(--border)` horizontal rule (dark variant rgba).
- `.mcard-footer` — `border-top: 1px solid var(--border)` + `background: var(--surface-1)` (dark: `rgba(255,255,255,0.03)`), used only by Audit Log for now.

### Per-page migration

Each page keeps its existing class (for internal layout) and adds `mcard`. Shell rules are stripped from the per-page CSS.

| Page | Existing class | Active trigger | Notes |
|---|---|---|---|
| AuditLogPage | `.amc` | click-to-select → `is-active` | Remove `::before` accent bar + all `[data-chip]` colour rules |
| JurorsPage | `.jc` | `openMenuId === id` | Was `.jc.menu-open` |
| ProjectsPage | `tr` | `openMenuId === id` | Was `tr.row-menu-open` |
| PeriodsPage | `tr` | `openMenuId === id` | Was `tr.row-menu-open` / `.menu-open` |
| RankingsPage | `tr` | none (hover only) | No kebab on mobile |

Rankings has no active state because there's no kebab or selection on the mobile card. Hover styling stays.

### What gets removed from per-page CSS

Only shell kuralları:

- `background`, `background-image`, `background-color`
- `border`, `border-color` (except inner separators)
- `border-radius`
- `box-shadow`
- Active state (`.menu-open`, `.row-menu-open`, `.selected`) shell kuralları — replaced by `.mcard.is-active`

What stays:

- All grid / flexbox / padding / margin / gap
- All typography, colours for text, icons, chips
- Inner separators (`border-top` between rows of a card)
- Hover transforms / cursor

## Risks

- Periods/Projects `<tr>` + `overflow: hidden` + child `<td>` can clip content; audit `.amc` already uses `overflow: hidden` so we expect parity, but verification needed.
- Jurors uses `--card-i-shadow-base / --card-i-shadow-open` tokens; we stop applying them in `.jc` but don't delete the tokens in case they're used elsewhere.
- Audit `.amc.amc-warning` variant: keep as an override on top of `.mcard` (warning border colour), no bar.

## Verification

- `npm run check:no-nested-panels`
- `npm run check:no-native-select`
- `npm run build`
- Manual: DevTools mobile portrait on all 5 pages, light + dark, open kebab → blue ring; close → revert.

## Rollout

Single commit or small series, user-controlled. No DB / API changes.
