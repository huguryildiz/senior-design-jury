# Admin UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the admin dashboard from a flat wireframe into a premium product with proper visual hierarchy, depth, and spacing.

**Architecture:** Update CSS theme tokens for card/background separation, fix base component sizing (Input, Card, Button already done), redesign KPI cards with ring-progress layout, recompose the Overview page with hero KPI + split layout, and enhance PageShell/sidebar styling.

**Tech Stack:** Tailwind CSS, shadcn/ui components, CSS custom properties (oklch), SVG for progress rings

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/styles/globals.css` | Modify | Theme tokens: `--card`, `--sidebar`, dark mode values |
| `src/admin/pages/PageShell.jsx` | Modify | Title size, content gap |
| `src/admin/overview/KpiCard.jsx` | Rewrite | Ring-progress layout with proper typography |
| `src/admin/overview/KpiGrid.jsx` | Modify | Support hero row variant |
| `src/admin/OverviewTab.jsx` | Rewrite | Hero KPI + split composition |

**Already done (earlier in this session):**
- `src/components/ui/input.jsx` — h-10, bg-background, shadow-sm
- `src/components/ui/card.jsx` — border + shadow-sm (replaces ring-1)
- `src/components/ui/button.jsx` — h-9, px-4

---

### Task 1: Theme Token Updates

**Files:**
- Modify: `src/styles/globals.css:74-108` (`:root` block) and `src/styles/globals.css:111-145` (`.dark` block)

- [ ] **Step 1: Update light mode `:root` tokens**

In `src/styles/globals.css`, change these values in the `:root` block:

```css
/* Line 77: card — was oklch(1 0 0), now slightly tinted for card/bg separation */
--card: oklch(0.98 0 0);

/* Line 85: muted — was oklch(0.97 0 0), slightly adjusted */
--muted: oklch(0.965 0 0);

/* Line 101: sidebar — was oklch(0.985 0 0), match card tint */
--sidebar: oklch(0.975 0 0);
```

Leave all other `:root` values unchanged.

- [ ] **Step 2: Update dark mode `.dark` tokens**

In the `.dark` block, change these values:

```css
/* Line 112: background — deep slate with subtle blue */
--background: oklch(0.145 0.015 265);

/* Line 114: card — elevated slate */
--card: oklch(0.21 0.015 265);

/* Line 127: border — more visible */
--border: oklch(0.30 0.015 265);

/* Line 128: input — match border visibility */
--input: oklch(0.30 0.015 265);

/* Line 137: sidebar — match background for tinted feel */
--sidebar: oklch(0.17 0.015 265);

/* Line 143: sidebar-border — visible in dark */
--sidebar-border: oklch(0.28 0.015 265);
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: `✓ built in ~3.5s`

- [ ] **Step 4: Commit**

```bash
git add src/styles/globals.css
git commit -m "style: update theme tokens for card/background separation and dark mode"
```

---

### Task 2: PageShell Enhancement

**Files:**
- Modify: `src/admin/pages/PageShell.jsx`

- [ ] **Step 1: Update title and spacing**

Replace the entire file content:

```jsx
// src/admin/pages/PageShell.jsx
// Shared page layout wrapper for all admin pages.
// Provides consistent title, description, actions area, and content spacing.

export default function PageShell({ title, description, actions, children, className }) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
```

Changes from current:
- Title: `text-lg font-semibold` → `text-xl font-bold`
- Gap between title/desc: `gap-1` → `gap-1.5`
- Content margin: `mt-6` → `mt-8`

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 3: Commit**

```bash
git add src/admin/pages/PageShell.jsx
git commit -m "style: strengthen PageShell title hierarchy and spacing"
```

---

### Task 3: KPI Card Redesign

**Files:**
- Rewrite: `src/admin/overview/KpiCard.jsx`

- [ ] **Step 1: Rewrite KpiCard with ring-progress layout**

Replace the entire file:

```jsx
// src/admin/overview/KpiCard.jsx
// KPI statistic card with optional ring progress indicator.

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

const RING_SIZE = 52;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ringColor(pct) {
  if (pct === 0) return "var(--color-muted-foreground)";
  if (pct <= 33) return "#f97316";
  if (pct <= 66) return "#eab308";
  if (pct < 100) return "#84cc16";
  return "#22c55e";
}

function ProgressRing({ pct }) {
  const color = ringColor(pct);
  const offset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE;
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
        <circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
          fill="none" stroke="currentColor" strokeWidth={RING_STROKE}
          className="text-muted/60"
        />
        <circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
          fill="none" stroke={color} strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-extrabold tabular-nums" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

export default function KpiCard({
  value,
  label,
  sub,
  metaLines,
  ring,
  icon,
  tooltip,
  className,
}) {
  return (
    <Card className={cn("flex flex-row items-center gap-4 px-5 py-4", className)}>
      {/* Left: Ring or Icon */}
      {ring ? (
        <ProgressRing pct={ring.pct} />
      ) : icon ? (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      ) : null}

      {/* Right: Content */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground/40 hover:text-muted-foreground" aria-label="More information">
                  <Info className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{tooltip}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="text-2xl font-extrabold tracking-tight text-foreground">{value}</span>
        {sub && (
          <span className="text-xs text-muted-foreground">{sub}</span>
        )}
        {Array.isArray(metaLines) && metaLines.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {metaLines.join(" · ")}
          </span>
        )}
      </div>
    </Card>
  );
}
```

Key changes from current:
- Card uses horizontal flex (`flex-row items-center`) instead of vertical CardHeader/CardContent
- Ring is 52px with percentage text colored to match ring
- Label above value (small muted), value large and bold below
- Removed `stat-card`, `stat-ring`, `stat-icon-circle`, `stat-card-value`, `stat-card-label`, `stat-card-sub`, `stat-card-meta` CSS classes
- Icon container: `size-10 rounded-lg` (was `size-8 rounded-md`)

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 3: Commit**

```bash
git add src/admin/overview/KpiCard.jsx
git commit -m "feat: redesign KPI cards with ring-progress layout"
```

---

### Task 4: Overview Page Composition

**Files:**
- Modify: `src/admin/overview/KpiGrid.jsx`
- Rewrite: `src/admin/OverviewTab.jsx`

- [ ] **Step 1: Add hero grid variant to KpiGrid**

Replace the file:

```jsx
// src/admin/overview/KpiGrid.jsx
// KPI cards grid with hero variant for overview composition.

import { cn } from "@/lib/utils";

export default function KpiGrid({ children, className }) {
  return (
    <div
      className={cn(
        "col-span-full grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Hero row: large left card + stacked compact right cards. */
export function KpiHeroRow({ children, className }) {
  return (
    <div
      className={cn(
        "col-span-full grid gap-4 lg:grid-cols-[3fr_2fr]",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Right column of hero row: stacks 2 compact metric cards. */
export function KpiHeroSide({ children, className }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-1", className)}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite OverviewTab with hero composition**

Replace the entire file:

```jsx
// src/admin/OverviewTab.jsx
// Overview dashboard with Hero KPI + split composition.

import { Users, FolderKanban } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import KpiCard from "./overview/KpiCard";
import KpiGrid, { KpiHeroRow, KpiHeroSide } from "./overview/KpiGrid";
import JurorActivityTable from "./overview/JurorActivityTable";
import CriteriaProgress from "./overview/CriteriaProgress";

export default function OverviewTab({
  jurorStats,
  groups,
  metrics,
  rawScores,
  criteriaTemplate,
  onGoToSettings,
}) {
  const {
    totalJurors = 0,
    completedJurors = 0,
    inProgressJurors = 0,
    editingJurors = 0,
    readyToSubmitJurors = 0,
    totalEvaluations = 0,
    scoredEvaluations = 0,
    partialEvaluations = 0,
    emptyEvaluations = 0,
  } = metrics ?? {};
  const totalGroups = groups?.length ?? 0;

  const clamp = (v) => Math.min(100, Math.max(0, v));
  const completedPct = clamp(
    totalJurors > 0 ? Math.round((completedJurors / totalJurors) * 100) : 0
  );
  const scoredPct = clamp(
    totalEvaluations > 0
      ? Math.round((scoredEvaluations / totalEvaluations) * 100)
      : 0
  );
  const completedHasData = totalJurors > 0;
  const scoredHasData = totalEvaluations > 0;

  const notStartedJurors = Math.max(
    0,
    totalJurors - completedJurors - inProgressJurors - readyToSubmitJurors - editingJurors
  );

  const completedMetaLines = [
    inProgressJurors > 0 && `${inProgressJurors} in progress`,
    readyToSubmitJurors > 0 && `${readyToSubmitJurors} ready to submit`,
    editingJurors > 0 && `${editingJurors} editing`,
    notStartedJurors > 0 && `${notStartedJurors} not started`,
  ].filter(Boolean);

  const scoredMetaLines = [
    partialEvaluations > 0 && `${partialEvaluations} partial`,
    emptyEvaluations > 0 && `${emptyEvaluations} empty`,
  ].filter(Boolean);

  const scoredSub =
    totalEvaluations > 0 && scoredEvaluations < totalEvaluations
      ? `${totalEvaluations} total`
      : undefined;

  const scoredValue = scoredHasData ? scoredEvaluations : "\u2014";
  const completedValue = completedHasData ? completedJurors : "\u2014";
  const isEmpty = totalJurors === 0 && totalGroups === 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Empty state */}
      {isEmpty && (
        <Card className="col-span-full">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="mb-4 text-sm text-muted-foreground" role="status">
              No data yet. Add jurors and groups to get started.
            </p>
            <Button variant="outline" onClick={() => onGoToSettings?.()}>
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Hero KPI row: completion ring (large) + side metrics */}
      <KpiHeroRow>
        <KpiCard
          value={`${completedValue} / ${totalJurors}`}
          label="Juror Completion"
          sub={completedHasData ? `${notStartedJurors} remaining` : undefined}
          metaLines={completedMetaLines}
          ring={completedHasData ? { pct: completedPct } : null}
          tooltip="Jurors who have completed scoring for all assigned groups and submitted their evaluations."
        />
        <KpiHeroSide>
          <KpiCard
            value={totalGroups}
            label="Project Groups"
            icon={<FolderKanban className="size-5" />}
          />
          <KpiCard
            value={scoredValue}
            label="Scored Evaluations"
            sub={scoredSub}
            ring={scoredHasData ? { pct: scoredPct } : null}
            tooltip="Total group×juror score rows with at least one criterion filled"
          />
        </KpiHeroSide>
      </KpiHeroRow>

      {/* Content split: Juror Activity (2/3) + Criteria (1/3) */}
      <Card className="py-0 lg:col-span-2">
        <JurorActivityTable jurorStats={jurorStats} groups={groups} />
      </Card>

      <div className="lg:col-span-1">
        <CriteriaProgress rawScores={rawScores} criteriaTemplate={criteriaTemplate} />
      </div>
    </div>
  );
}
```

Key changes from current:
- Hero row: completion KPI takes 3/5 width, side metrics stack in 2/5
- `KpiHeroRow` + `KpiHeroSide` provide the split layout
- Completion card shows `"16 / 24"` as value with ring
- Content split: Juror Activity (2 cols) + Criteria (1 col) on `lg:`
- Empty state: more padding (`py-16`), bigger button
- Removed the standalone `KpiGrid` with 4 equal cards — replaced by hero composition
- `totalJurors` KPI removed (redundant with completion hero)

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 4: Run tests**

Run: `npm test -- --run`
Expected: All tests pass (OverviewTab has no dedicated tests)

- [ ] **Step 5: Commit**

```bash
git add src/admin/overview/KpiGrid.jsx src/admin/OverviewTab.jsx
git commit -m "feat: overview hero KPI composition with split layout"
```

---

### Task 5: Verify and Clean Up

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 2: Full test suite**

Run: `npm test -- --run`
Expected: All 53 test files pass, 417+ tests pass

- [ ] **Step 3: Check for leftover stat-card CSS references**

Run: `grep -r "stat-card\|stat-ring\|stat-icon" src/ --include="*.jsx" --include="*.js" --include="*.css"`
Expected: Zero matches (all custom KPI CSS classes removed)

If any CSS definitions remain in `shared.css` or other CSS files for `stat-card`, `stat-ring`, `stat-icon-circle`, `stat-card-value`, `stat-card-label`, `stat-card-sub`, `stat-card-meta`, `stat-card-meta-line` — delete them.

- [ ] **Step 4: Final commit if cleanup was needed**

```bash
git add -A
git commit -m "chore: remove leftover stat-card CSS definitions"
```
