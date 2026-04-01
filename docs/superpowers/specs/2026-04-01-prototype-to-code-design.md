# Prototype-to-Code Migration — Design Spec

## Context

VERA has a complete UI prototype at `docs/concepts/vera-premium-prototype.html` (28,680 lines) covering 20+ pages in both light and dark mode. The real React codebase has shadcn/ui (base-nova) + Tailwind CSS v4 installed with 58 shadcn components, but the visual output does not match the prototype. This spec defines how to migrate the prototype's visual design 1:1 into the real codebase.

## Scope

This is the **master spec** that defines the overall migration strategy. Implementation is split into 4 sub-projects, each with its own spec-plan-implementation cycle:

| # | Sub-project | Status |
|---|------------|--------|
| 1 | Foundation (tokens, dark mode, base components) | This spec |
| 2 | Admin (15 pages + sidebar + header) | Separate spec |
| 3 | Jury (splash, identity, PIN, eval, done) | Separate spec |
| 4 | Landing (hero, trust band, features, CTA) | Separate spec |

Order: Foundation -> Admin -> Jury -> Landing.

## Global Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Visual reference | `vera-premium-prototype.html` is the 1:1 source of truth | Complete design, both modes, all pages |
| Light + dark mode | Implement both simultaneously | Prototype defines both; Tailwind `dark:` makes it natural |
| CSS approach | Tailwind utilities + minimal custom CSS | Existing ~9,700 lines of custom CSS will be migrated to Tailwind and deleted |
| Component library | shadcn/ui (base-nova) + Tailwind v4 | Already installed, 58 components ready |
| Sub-project isolation | Each area gets its own spec -> plan -> implementation | Prevents scope explosion |
| DB migration | Consolidated migration required in parallel | Accumulated schema changes (renames, new columns) |

## Naming Updates (applied during implementation)

These renames come from project decisions documented in memory. Apply everywhere during implementation:

| Current | New | Scope |
|---------|-----|-------|
| Semester | Evaluation Period / Period | All UI text, component names |
| Department (juror) | Affiliation | Juror forms, tables, filters |
| Project Title | Title | Project forms, tables |
| Supervisor | Advisor | Project forms, tables |
| Students | Team Members | Project forms, tables |
| Tenant | Organization | UI text (DB rename separate) |

## DB Migration (parallel track)

A consolidated DB migration is required. Pending schema changes:

- RENAME `juror_inst` -> `affiliation`
- RENAME `supervisor` -> `advisor` (when column exists)
- ADD `advisor` to projects (nullable)
- ADD `description` to projects (nullable)
- ADD `description`, `start_date`, `end_date` to semesters (nullable)
- ADD `email` to jurors (nullable)
- ADD `coverage_override` to outcomes (for Direct/Indirect mapping)
- Potential `tenants` -> `organizations` table/column rename

RPCs, API layer (`src/shared/api/`), and `fieldMapping.js` must be updated in sync.

---

## Sub-project 1: Foundation

### 1.1 Typography

The prototype uses Plus Jakarta Sans + JetBrains Mono. Current codebase uses Inter.

| Role | Prototype | Current | Action |
|------|-----------|---------|--------|
| Body font | Plus Jakarta Sans (400/500/600/700/800) | Inter Variable | Replace with Plus Jakarta Sans |
| Mono font | JetBrains Mono (400/500/600) | DM Mono | Replace with JetBrains Mono |

Install via `@fontsource-variable/plus-jakarta-sans` and `@fontsource/jetbrains-mono` (or Google Fonts import). Update `globals.css` `--font-sans` and `--font-mono` references.

### 1.2 Theme Tokens — Light Mode

Map prototype `:root` variables to shadcn/Tailwind tokens in `globals.css`.

#### Backgrounds

| Prototype token | Value | Maps to |
|----------------|-------|---------|
| `--bg-page` | `#f4f7fb` | `--background` |
| `--bg-card` | `#fafbfd` (premium polish override) | `--card` |
| `--surface-1` | `#eef2f8` | `--muted` |
| `--surface-2` | `#e3eaf4` | `--secondary` |

#### Text

| Prototype token | Value | Maps to |
|----------------|-------|---------|
| `--text-primary` | `#111827` | `--foreground` |
| `--text-secondary` | `#4b5675` | `--muted-foreground` |
| `--text-tertiary` | `#94a3b8` | Custom `--text-tertiary` |
| `--text-quaternary` | `#cbd5e1` | Custom `--text-quaternary` |

#### Borders

| Prototype token | Value | Maps to |
|----------------|-------|---------|
| `--border` | `rgba(15,23,42,0.08)` | `--border` |
| `--border-strong` | `rgba(15,23,42,0.13)` | Custom `--border-strong` |

#### Brand/Semantic

| Prototype token | Value | Maps to |
|----------------|-------|---------|
| `--accent` | `#3b82f6` | `--primary` |
| `--accent-dark` | `#2563eb` | Hover state for primary |
| `--accent-soft` | `rgba(59,130,246,0.07)` | Custom `--primary-soft` |
| `--success` | `#16a34a` | `--success` |
| `--warning` | `#d97706` | `--warning` |
| `--danger` | `#e11d48` | `--destructive` |
| `--success-soft` | `rgba(22,163,74,0.07)` | Custom `--success-soft` |
| `--warning-soft` | `rgba(217,119,6,0.07)` | Custom `--warning-soft` |
| `--danger-soft` | `rgba(225,29,72,0.05)` | Custom `--destructive-soft` |

#### Focus Rings

| Prototype token | Value | Maps to |
|----------------|-------|---------|
| `--accent-ring` | `rgba(59,130,246,0.15)` | `--ring` |
| `--success-ring` | `rgba(22,163,74,0.12)` | Custom |
| `--warning-ring` | `rgba(217,119,6,0.12)` | Custom |
| `--danger-ring` | `rgba(225,29,72,0.10)` | Custom |

#### Shadows

| Prototype token | Value | Maps to |
|----------------|-------|---------|
| `--shadow-sm` | `0 1px 3px rgba(15,23,42,0.05), 0 1px 2px rgba(15,23,42,0.03)` | Tailwind `shadow-sm` override |
| `--shadow-card` | `0 1px 4px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04), 0 0 0 1px rgba(15,23,42,0.04)` | Custom `--shadow-card` |
| `--shadow-elevated` | `0 8px 28px rgba(15,23,42,0.10), ...` | Custom `--shadow-elevated` |
| `--shadow-drawer` | `-2px 0 40px rgba(15,23,42,0.10), ...` | Custom `--shadow-drawer` |

#### Sidebar

| Prototype token | Value | Maps to |
|----------------|-------|---------|
| `--sidebar-bg` | `#0f172a` | `--sidebar` |
| `--sidebar-border` | `#1e293b` | `--sidebar-border` |
| `--sidebar-text` | `#94a3b8` | `--sidebar-foreground` |
| `--sidebar-active-bg` | `rgba(59,130,246,0.15)` | `--sidebar-accent` |
| `--sidebar-active-text` | `#93c5fd` | `--sidebar-accent-foreground` |

#### Radius

| Prototype token | Value | Maps to |
|----------------|-------|---------|
| `--radius` | `10px` | `--radius` (currently `0.625rem` = 10px, keep) |
| `--radius-sm` | `6px` | `--radius-sm` |
| `--radius-lg` | `14px` | `--radius-lg` |
| `--radius-xl` | `16px` | `--radius-xl` |

#### Score Scale (semantic heatmap colors)

These are custom tokens added to `:root` and `.dark`:

```text
--score-excellent-bg, --score-excellent-text
--score-high-bg, --score-high-text
--score-good-bg, --score-good-text
--score-adequate-bg, --score-adequate-text
--score-low-bg, --score-low-text
--score-poor-bg, --score-poor-text
--score-partial-bg, --score-partial-text
```

Light values from prototype `:root`, dark values from prototype `.dark-mode`.

#### Status Tokens (met/borderline/not-met)

```text
--status-met-bg, --status-met-text, --status-met-border
--status-borderline-bg, --status-borderline-text, --status-borderline-border
--status-not-met-bg, --status-not-met-text, --status-not-met-border
```

#### Delta Tokens

```text
--delta-positive, --delta-negative, --delta-neutral
```

#### Field Tokens

```text
--field-h: 36px
--field-px: 12px
--field-radius: 8px
--field-border: var(--border)
--field-bg: #ffffff (light) / var(--bg-card) (dark)
--field-focus-ring, --field-error-ring, --field-success-ring
```

### 1.3 Theme Tokens — Dark Mode

Map prototype `.dark-mode` variables to `.dark` block in `globals.css`.

#### Backgrounds (layered depth)

| Role | Value |
|------|-------|
| Page | `#080d1a` |
| Card / Surface | `#0b1022` |
| Surface-1 | `#151d32` |
| Surface-2 | `#1c2740` |

#### Text

| Role | Value |
|------|-------|
| Primary | `#f1f5f9` |
| Secondary | `#a8b8ca` |
| Tertiary | `#7a8ca0` |
| Quaternary | `#556070` |

#### Borders

| Role | Value |
|------|-------|
| Default | `rgba(255,255,255,0.07)` |
| Strong | `rgba(255,255,255,0.13)` |

#### Brand accent (dark)

| Role | Value |
|------|-------|
| Primary | `#60a5fa` |
| Hover | `#93c5fd` |
| Soft bg | `rgba(59,130,246,0.14)` |

#### Semantic states (dark)

| State | Text | Background |
|-------|------|------------|
| Success | `#4ade80` | `rgba(34,197,94,0.12)` |
| Warning | `#fbbf24` | `rgba(245,158,11,0.12)` |
| Danger | `#f87171` | `rgba(239,68,68,0.12)` |

#### Shadows (dark)

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.4)` |
| `--shadow-card` | `0 2px 8px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)` |
| `--shadow-elevated` | `0 12px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.25)` |

#### Glassmorphism tokens (dark only)

```text
--glass-card-bg: rgba(10,15,28,0.55)
--glass-card-blur: blur(24px) saturate(1.2)
--glass-card-shadow: 0 2px 12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)
--glass-card-border: rgba(255,255,255,0.07)
--glass-modal-bg: rgba(10,15,30,0.75)
--glass-modal-blur: blur(32px) saturate(1.3)
--glass-drawer-bg: rgba(8,12,24,0.78)
--glass-header-bg: rgba(8,12,22,0.50)
--glass-overlay-bg: rgba(4,7,15,0.65)
```

#### Sidebar (dark)

| Token | Value |
|-------|-------|
| bg | `#060a16` |
| border | `rgba(255,255,255,0.05)` |
| text | `#7a8ca0` |
| active-bg | `rgba(96,165,250,0.12)` |
| active-text | `#93c5fd` |

### 1.4 Base Component Updates

#### Input (`src/components/ui/input.jsx`)

| Property | Current | Prototype |
|----------|---------|-----------|
| Height | `h-8` | `h-9` (36px / `--field-h`) |
| Background | `bg-transparent` | `bg-background` |
| Padding | `px-2.5 py-1` | `px-3 py-2` |
| Shadow | none | `shadow-sm` |
| Focus ring | `ring-3` | `ring-2` with `--accent-ring` |
| Border radius | default | `rounded-lg` (8px / `--field-radius`) |

#### Card (`src/components/ui/card.jsx`)

| Property | Current | Prototype |
|----------|---------|-----------|
| Border | `ring-1 ring-foreground/10` | `border border-border` |
| Shadow | none | `shadow-sm` (light), `shadow-card` (dark) |
| Hover | none | subtle elevation increase |
| Background | `bg-card` | `bg-card` (token already set to `#fafbfd`) |

#### Button (`src/components/ui/button.jsx`)

| Property | Current | Prototype |
|----------|---------|-----------|
| Default height | `h-8` | `h-9` |
| Default padding | `px-2.5` | `px-4` |
| Primary shadow | none | `0 1px 3px rgba(37,99,235,0.2)` |

#### Badge

Extend with semantic variants matching prototype:

- `met` — green bg/text/border
- `borderline` — amber bg/text/border
- `not-met` — red bg/text/border
- `neutral` — muted bg/text

### 1.5 Scrollbar Styling

Add to `globals.css` `@layer base`:

```text
Light: thin scrollbar, track transparent, thumb var(--border), thumb:hover var(--border-strong)
Dark: thumb rgba(255,255,255,0.08), thumb:hover rgba(255,255,255,0.15)
Width: 6px
```

### 1.6 Criterion Colors (preserved)

These are already correct in the current codebase and must not change:

```text
Technical: #f59e0b (amber)
Written/Design: #22c55e (green)
Oral/Delivery: #3b82f6 (blue)
Teamwork: #ef4444 (red)
```

### 1.7 Legacy CSS Cleanup (Foundation phase)

Files to empty or delete during foundation:

| File | Action |
|------|--------|
| `src/styles/shared.css` | Migrate utilities to Tailwind, delete |
| `src/styles/toast.css` | Replace with sonner defaults, delete |
| `src/styles/home.css` | Keep until Landing sub-project |
| `src/styles/admin-*.css` (7 files) | Keep until Admin sub-project |
| `src/styles/jury-*.css` (2 files) | Keep until Jury sub-project |

Foundation only deletes `shared.css` and `toast.css`. Domain-specific CSS files are cleaned up in their respective sub-projects.

### 1.8 Folder Structure

No major reorganization needed in foundation. Target state after all sub-projects:

```text
src/styles/
  globals.css          -- Tailwind imports + all tokens (light/dark) + minimal global styles
  (all other CSS files deleted)
```

Component folder structure decisions will be made per sub-project as needed.

---

## Sub-project 2: Admin (future spec)

Covers 15 pages: Overview, Rankings, Analytics, Score Grid, Score Details, Jurors, Projects, Semesters (Evaluation Periods), Criteria, Accreditation (Outcomes & Mapping), Entry Control, PIN Block, Audit, Export, Settings. Plus sidebar navigation and header.

Key considerations from memory notes:

- Top Projects card on Overview (auto-highlight rules)
- Dynamic insight banners on Analytics (computed, not static)
- Score-based field locking on Criteria/Settings
- Framework per period on Analytics
- Direct/Indirect outcome mapping on Accreditation
- Chart theme integration (shadcn Recharts wrapper)
- All naming updates (Evaluation Period, Affiliation, Title, Advisor, Team Members, Organization)

## Sub-project 3: Jury (future spec)

Covers: Splash screen, Identity (InfoStep), PIN (PinStep/PinRevealStep), Loading, Eval (EvalStep with group bar, criteria cards, sticky bottom bar, rubric bottom sheet, group selector sheet, submit confirm overlay), Done (DoneStep).

Key considerations:

- Card stack layout (not stepper) for scoring
- "Affiliation" label for juror field
- Glassmorphism in dark mode

## Sub-project 4: Landing (future spec)

Covers: Nav, Hero (copy-led with small logo), Trust Band (social proof + stats), How it Works (3-step flow), Features (3-card grid), Before/After comparison, Mobile Mockup (3-phone flow), CTA Reprise, Footer.

Key considerations:

- Content should be prop-driven (JSONB from DB in production)
- Naming updates in demo content
- Product showcase carousel

---

## Superseded Specs

The following previously written specs are now superseded by this master spec:

- `2026-03-28-admin-ui-polish-design.md` — token changes and component fixes are incorporated here
- `2026-03-29-premium-dark-mode-design.md` — dark mode tokens are incorporated here
- `2026-04-01-landing-page-redesign.md` — landing page is sub-project 4
