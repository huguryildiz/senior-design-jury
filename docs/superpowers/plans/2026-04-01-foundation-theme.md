# Foundation Theme & Base Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all design tokens, typography, base components, and shared styles from the prototype HTML to the real React codebase, matching `docs/concepts/vera-premium-prototype.html` 1:1 in both light and dark mode.

**Architecture:** Replace the current shadcn default tokens with prototype-derived values in `globals.css`. Update base shadcn components (input, card, button, badge) to match prototype dimensions and styling. Swap fonts from Inter to Plus Jakarta Sans + JetBrains Mono. Delete legacy CSS files and replace custom toast system with sonner. All changes use Tailwind utilities — zero new custom CSS files.

**Tech Stack:** Tailwind CSS v4, shadcn/ui (base-nova), Plus Jakarta Sans, JetBrains Mono, sonner (toasts)

**Spec:** `docs/superpowers/specs/2026-04-01-prototype-to-code-design.md`

**Prototype reference:** `docs/concepts/vera-premium-prototype.html` (lines 10–57 for light tokens, lines 165–229 for dark tokens)

---

### Task 1: Delete orphaned CSS files

**Files:**
- Delete: `src/styles/admin-layout.css`
- Delete: `src/styles/admin-dashboard.css`
- Delete: `src/styles/admin-summary.css`
- Delete: `src/styles/admin-responsive.css`
- Delete: `src/styles/admin-auth.css`
- Delete: `src/styles/admin-jurors.css`
- Delete: `src/styles/home.css`

These 7 files are not imported anywhere — they were deprecated during earlier Tailwind migration phases.

- [ ] **Step 1: Verify files are truly orphaned**

Run:

```bash
grep -r "admin-layout\.css\|admin-dashboard\.css\|admin-summary\.css\|admin-responsive\.css\|admin-auth\.css\|admin-jurors\.css\|home\.css" src/ --include="*.jsx" --include="*.js" --include="*.css" -l
```

Expected: No results (or only the CSS files themselves referencing each other via comments).

- [ ] **Step 2: Delete the files**

```bash
rm src/styles/admin-layout.css src/styles/admin-dashboard.css src/styles/admin-summary.css src/styles/admin-responsive.css src/styles/admin-auth.css src/styles/admin-jurors.css src/styles/home.css
```

- [ ] **Step 3: Verify build still works**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A src/styles/
git commit -m "chore: delete 7 orphaned legacy CSS files

Files were deprecated during earlier Tailwind migration phases
and are no longer imported anywhere in the codebase."
```

---

### Task 2: Typography — swap fonts

**Files:**
- Modify: `src/styles/globals.css`

Current fonts: Inter Variable (body), DM Mono (mono).
Target fonts: Plus Jakarta Sans (body), JetBrains Mono (mono).
Both packages are already in `package.json`.

- [ ] **Step 1: Update globals.css font import**

In `src/styles/globals.css`, replace:

```css
@import "@fontsource-variable/inter";
```

with:

```css
@import "@fontsource-variable/plus-jakarta-sans";
@import "@fontsource/jetbrains-mono";
```

- [ ] **Step 2: Update font-sans and font-mono theme declarations**

In `src/styles/globals.css`, in the `@theme inline` block, replace:

```css
  --font-heading: var(--font-sans);
  --font-sans: 'Inter Variable', sans-serif;
```

with:

```css
  --font-heading: var(--font-sans);
  --font-sans: 'Plus Jakarta Sans Variable', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
```

- [ ] **Step 3: Update the @theme block**

In `src/styles/globals.css`, in the `@theme { ... }` block, replace:

```css
  --font-inter: "Inter", sans-serif;
  --font-mono: "DM Mono", monospace;
```

with:

```css
  --font-jakarta: "Plus Jakarta Sans Variable", -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
```

Note: `--color-success`, `--color-warning`, and `--color-criterion-*` entries in the same `@theme` block should stay unchanged.

- [ ] **Step 4: Verify dev server renders correctly**

Run: `npm run dev`
Open the browser. Text should now render in Plus Jakarta Sans. Score values and mono text should use JetBrains Mono. Check both light and dark mode.

- [ ] **Step 5: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat(theme): swap fonts to Plus Jakarta Sans + JetBrains Mono

Matches prototype typography. Both packages were already installed."
```

---

### Task 3: Light mode tokens

**Files:**
- Modify: `src/styles/globals.css`

Replace the entire `:root { ... }` block with prototype-derived values.

- [ ] **Step 1: Replace the `:root` block**

In `src/styles/globals.css`, replace the entire `:root { ... }` block (lines 74–109) with:

```css
:root {
  /* Backgrounds */
  --background: #f4f7fb;
  --foreground: #111827;
  --card: #fafbfd;
  --card-foreground: #111827;
  --popover: #ffffff;
  --popover-foreground: #111827;

  /* Brand */
  --primary: #3b82f6;
  --primary-foreground: #ffffff;
  --primary-soft: rgba(59,130,246,0.07);

  /* Surfaces */
  --secondary: #e3eaf4;
  --secondary-foreground: #111827;
  --muted: #eef2f8;
  --muted-foreground: #4b5675;
  --accent: #eef2f8;
  --accent-foreground: #111827;

  /* Semantic */
  --destructive: #e11d48;
  --success: #16a34a;
  --success-soft: rgba(22,163,74,0.07);
  --warning: #d97706;
  --warning-soft: rgba(217,119,6,0.07);
  --destructive-soft: rgba(225,29,72,0.05);

  /* Borders */
  --border: rgba(15,23,42,0.08);
  --border-strong: rgba(15,23,42,0.13);
  --input: rgba(15,23,42,0.08);
  --ring: rgba(59,130,246,0.15);
  --success-ring: rgba(22,163,74,0.12);
  --warning-ring: rgba(217,119,6,0.12);
  --danger-ring: rgba(225,29,72,0.10);

  /* Text extras */
  --text-tertiary: #94a3b8;
  --text-quaternary: #cbd5e1;

  /* Shadows */
  --shadow-card: 0 1px 4px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04), 0 0 0 1px rgba(15,23,42,0.04);
  --shadow-elevated: 0 8px 28px rgba(15,23,42,0.10), 0 3px 10px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04), 0 0 0 1px rgba(15,23,42,0.05);
  --shadow-drawer: -2px 0 40px rgba(15,23,42,0.10), 0 0 80px rgba(15,23,42,0.06);

  /* Radius */
  --radius: 0.625rem;

  /* Charts */
  --chart-1: #3b82f6;
  --chart-2: #2563eb;
  --chart-3: #1d4ed8;
  --chart-4: #1e40af;
  --chart-5: #1e3a8a;

  /* Sidebar */
  --sidebar: #0f172a;
  --sidebar-foreground: #94a3b8;
  --sidebar-primary: #3b82f6;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: rgba(59,130,246,0.15);
  --sidebar-accent-foreground: #93c5fd;
  --sidebar-border: #1e293b;
  --sidebar-ring: rgba(59,130,246,0.15);

  /* Score scale (semantic heatmap) */
  --score-excellent-bg: rgba(22,163,74,0.35);
  --score-excellent-text: #14532d;
  --score-high-bg: rgba(74,222,128,0.28);
  --score-high-text: #15803d;
  --score-good-bg: rgba(132,204,22,0.25);
  --score-good-text: #3f6212;
  --score-adequate-bg: rgba(234,179,8,0.28);
  --score-adequate-text: #854d0e;
  --score-low-bg: rgba(249,115,22,0.30);
  --score-low-text: #9a3412;
  --score-poor-bg: rgba(239,68,68,0.32);
  --score-poor-text: #991b1b;
  --score-partial-bg: rgba(234,179,8,0.18);
  --score-partial-text: #92400e;

  /* Status tokens (met/borderline/not-met) */
  --status-met-bg: rgba(22,163,74,0.08);
  --status-met-text: #15803d;
  --status-met-border: rgba(22,163,74,0.18);
  --status-borderline-bg: rgba(217,119,6,0.07);
  --status-borderline-text: #b45309;
  --status-borderline-border: rgba(217,119,6,0.18);
  --status-not-met-bg: rgba(225,29,72,0.06);
  --status-not-met-text: #be123c;
  --status-not-met-border: rgba(225,29,72,0.15);

  /* Delta */
  --delta-positive: #16a34a;
  --delta-negative: #dc2626;
  --delta-neutral: #64748b;
}
```

- [ ] **Step 2: Verify no visual regressions in light mode**

Run: `npm run dev`
Check the admin panel in light mode. Cards should have subtle background separation from the page. Sidebar should be dark navy.

- [ ] **Step 3: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat(theme): replace light mode tokens with prototype values

Maps all prototype :root CSS variables to shadcn token system.
Includes backgrounds, text, borders, semantic colors, shadows,
sidebar, score scale, status tokens, and delta tokens."
```

---

### Task 4: Dark mode tokens

**Files:**
- Modify: `src/styles/globals.css`

Replace the entire `.dark { ... }` block with prototype-derived values.

- [ ] **Step 1: Replace the `.dark` block**

In `src/styles/globals.css`, replace the entire `.dark { ... }` block (lines 111–145) with:

```css
.dark {
  /* Backgrounds (layered depth) */
  --background: #080d1a;
  --foreground: #f1f5f9;
  --card: #0b1022;
  --card-foreground: #f1f5f9;
  --popover: #0b1022;
  --popover-foreground: #f1f5f9;

  /* Brand */
  --primary: #60a5fa;
  --primary-foreground: #080d1a;
  --primary-soft: rgba(59,130,246,0.14);

  /* Surfaces */
  --secondary: #1c2740;
  --secondary-foreground: #f1f5f9;
  --muted: #151d32;
  --muted-foreground: #a8b8ca;
  --accent: #151d32;
  --accent-foreground: #f1f5f9;

  /* Semantic */
  --destructive: #f87171;
  --success: #4ade80;
  --success-soft: rgba(34,197,94,0.12);
  --warning: #fbbf24;
  --warning-soft: rgba(245,158,11,0.12);
  --destructive-soft: rgba(239,68,68,0.12);

  /* Borders */
  --border: rgba(255,255,255,0.07);
  --border-strong: rgba(255,255,255,0.13);
  --input: rgba(255,255,255,0.10);
  --ring: rgba(96,165,250,0.28);
  --success-ring: rgba(74,222,128,0.22);
  --warning-ring: rgba(251,191,36,0.22);
  --danger-ring: rgba(248,113,113,0.22);

  /* Text extras */
  --text-tertiary: #7a8ca0;
  --text-quaternary: #556070;

  /* Shadows */
  --shadow-card: 0 2px 8px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04);
  --shadow-elevated: 0 12px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.25);
  --shadow-drawer: 0 0 60px rgba(0,0,0,0.5), -4px 0 32px rgba(0,0,0,0.3);

  /* Charts */
  --chart-1: #60a5fa;
  --chart-2: #3b82f6;
  --chart-3: #2563eb;
  --chart-4: #1d4ed8;
  --chart-5: #1e40af;

  /* Sidebar */
  --sidebar: #060a16;
  --sidebar-foreground: #7a8ca0;
  --sidebar-primary: #60a5fa;
  --sidebar-primary-foreground: #080d1a;
  --sidebar-accent: rgba(96,165,250,0.12);
  --sidebar-accent-foreground: #93c5fd;
  --sidebar-border: rgba(255,255,255,0.05);
  --sidebar-ring: rgba(96,165,250,0.28);

  /* Score scale (dark — saturated heatmap) */
  --score-excellent-bg: rgba(34,197,94,0.38);
  --score-excellent-text: #bbf7d0;
  --score-high-bg: rgba(34,197,94,0.26);
  --score-high-text: #86efac;
  --score-good-bg: rgba(74,222,128,0.16);
  --score-good-text: #d9f99d;
  --score-adequate-bg: rgba(234,179,8,0.16);
  --score-adequate-text: #fef08a;
  --score-low-bg: rgba(249,115,22,0.22);
  --score-low-text: #fed7aa;
  --score-poor-bg: rgba(239,68,68,0.28);
  --score-poor-text: #fecaca;
  --score-partial-bg: rgba(234,179,8,0.18);
  --score-partial-text: #fde047;

  /* Status tokens (dark) */
  --status-met-bg: rgba(74,222,128,0.08);
  --status-met-text: #86efac;
  --status-met-border: rgba(74,222,128,0.20);
  --status-borderline-bg: rgba(251,191,36,0.08);
  --status-borderline-text: #fcd34d;
  --status-borderline-border: rgba(251,191,36,0.20);
  --status-not-met-bg: rgba(248,113,113,0.08);
  --status-not-met-text: #fca5a5;
  --status-not-met-border: rgba(248,113,113,0.18);

  /* Delta (dark) */
  --delta-positive: #4ade80;
  --delta-negative: #f87171;
  --delta-neutral: #64748b;

  /* Glassmorphism (dark only) */
  --glass-card-bg: rgba(10,15,28,0.55);
  --glass-card-blur: blur(24px) saturate(1.2);
  --glass-card-shadow: 0 2px 12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05);
  --glass-card-border: rgba(255,255,255,0.07);
  --glass-modal-bg: rgba(10,15,30,0.75);
  --glass-modal-blur: blur(32px) saturate(1.3);
  --glass-modal-shadow: 0 24px 72px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05);
  --glass-modal-border: rgba(255,255,255,0.08);
  --glass-drawer-bg: rgba(8,12,24,0.78);
  --glass-drawer-blur: blur(28px) saturate(1.2);
  --glass-drawer-shadow: -8px 0 56px rgba(0,0,0,0.45), inset 1px 0 0 rgba(255,255,255,0.04);
  --glass-drawer-border: rgba(255,255,255,0.06);
  --glass-header-bg: rgba(8,12,22,0.50);
  --glass-header-blur: blur(16px);
  --glass-footer-bg: rgba(6,10,18,0.55);
  --glass-footer-blur: blur(16px);
  --glass-overlay-bg: rgba(4,7,15,0.65);
  --glass-overlay-blur: blur(6px);
}
```

- [ ] **Step 2: Verify dark mode rendering**

Run: `npm run dev`
Toggle dark mode. Page background should be deep navy-black (#080d1a), not pure black. Cards should lift slightly from background. Sidebar should be near-black (#060a16).

- [ ] **Step 3: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat(theme): replace dark mode tokens with prototype values

Deep navy palette, glassmorphism tokens, saturated score scale,
and semantic status tokens for dark mode."
```

---

### Task 5: Scrollbar styling + base layer cleanup

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Add scrollbar styles to the `@layer base` block**

In `src/styles/globals.css`, expand the existing `@layer base` block. Replace:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
```

with:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
  *::-webkit-scrollbar { width: 6px; height: 6px; }
  *::-webkit-scrollbar-track { background: transparent; }
  *::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
  *::-webkit-scrollbar-thumb:hover { background: var(--border-strong); }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
```

Dark mode scrollbar styling is automatic because `--border` and `--border-strong` change in the `.dark` block.

- [ ] **Step 2: Verify scrollbars**

Run: `npm run dev`
Navigate to a page with scrollable content. Scrollbar should be thin (6px), subtle gray in light mode, near-invisible in dark mode.

- [ ] **Step 3: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat(theme): add premium thin scrollbar styling

6px width, transparent track, border-colored thumb.
Automatically adapts to dark mode via token system."
```

---

### Task 6: Register custom tokens in @theme inline

**Files:**
- Modify: `src/styles/globals.css`

Several new custom tokens (text-tertiary, border-strong, shadow-card, etc.) need to be exposed as Tailwind utilities.

- [ ] **Step 1: Add custom token mappings to `@theme inline`**

In `src/styles/globals.css`, add these lines inside the `@theme inline { ... }` block, after the existing sidebar entries:

```css
  /* Custom tokens from prototype (not already in @theme block) */
  --color-text-tertiary: var(--text-tertiary);
  --color-text-quaternary: var(--text-quaternary);
  --color-border-strong: var(--border-strong);
  --color-primary-soft: var(--primary-soft);
  --color-success-soft: var(--success-soft);
  --color-warning-soft: var(--warning-soft);
  --color-destructive-soft: var(--destructive-soft);
  --color-delta-positive: var(--delta-positive);
  --color-delta-negative: var(--delta-negative);
  --color-delta-neutral: var(--delta-neutral);
  --color-status-met-bg: var(--status-met-bg);
  --color-status-met-text: var(--status-met-text);
  --color-status-met-border: var(--status-met-border);
  --color-status-borderline-bg: var(--status-borderline-bg);
  --color-status-borderline-text: var(--status-borderline-text);
  --color-status-borderline-border: var(--status-borderline-border);
  --color-status-not-met-bg: var(--status-not-met-bg);
  --color-status-not-met-text: var(--status-not-met-text);
  --color-status-not-met-border: var(--status-not-met-border);
  --shadow-card: var(--shadow-card);
  --shadow-elevated: var(--shadow-elevated);
  --shadow-drawer: var(--shadow-drawer);
```

This enables usage like `text-text-tertiary`, `bg-status-met-bg`, `shadow-card`, etc. in Tailwind classes.

- [ ] **Step 2: Verify Tailwind recognizes the tokens**

Run: `npm run dev`
In any component, temporarily add `className="text-text-tertiary"`. The text should render in `#94a3b8` (light) or `#7a8ca0` (dark). Remove the test class after verification.

- [ ] **Step 3: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat(theme): register custom tokens as Tailwind utilities

Exposes text-tertiary, border-strong, status tokens, score scale,
delta, shadow-card, shadow-elevated as usable Tailwind classes."
```

---

### Task 7: Update Input component

**Files:**
- Modify: `src/components/ui/input.jsx`

- [ ] **Step 1: Update Input className**

In `src/components/ui/input.jsx`, replace the className string:

```jsx
"h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base shadow-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
```

with:

```jsx
"h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
```

Changes: `h-10` → `h-9`, `text-base` → `text-sm`, `focus-visible:border-ring` → `focus-visible:border-primary`, `focus-visible:ring-ring/50` → `focus-visible:ring-ring`, removed `md:text-sm` (redundant now).

- [ ] **Step 2: Verify input rendering**

Run: `npm run dev`
Navigate to any form with inputs (admin login, juror identity). Inputs should be 36px height, have subtle shadow, and show blue focus ring on focus.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/input.jsx
git commit -m "feat(ui): update Input to match prototype dimensions

h-9 (36px), text-sm, blue focus ring."
```

---

### Task 8: Update Card component

**Files:**
- Modify: `src/components/ui/card.jsx`

- [ ] **Step 1: Update Card className**

In `src/components/ui/card.jsx`, in the `Card` function, replace the className:

```jsx
"group/card flex flex-col gap-4 overflow-hidden rounded-xl border bg-card py-4 text-sm text-card-foreground shadow-sm has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
```

with:

```jsx
"group/card flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card py-4 text-sm text-card-foreground shadow-sm transition-shadow hover:shadow-[var(--shadow-card)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
```

Changes: added `border-border` (explicit), added `transition-shadow hover:shadow-[var(--shadow-card)]` for subtle hover elevation.

- [ ] **Step 2: Verify card rendering**

Run: `npm run dev`
Navigate to admin Overview. Cards should have visible border, subtle shadow, and slightly more shadow on hover.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/card.jsx
git commit -m "feat(ui): update Card with explicit border and hover elevation

Matches prototype card styling with border-border and shadow-card hover."
```

---

### Task 9: Update Button component

**Files:**
- Modify: `src/components/ui/button.jsx`

- [ ] **Step 1: Add primary shadow to default variant**

In `src/components/ui/button.jsx`, in the `variants.variant` object, replace:

```jsx
default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
```

with:

```jsx
default: "bg-primary text-primary-foreground shadow-[0_1px_3px_rgba(37,99,235,0.2)] hover:bg-primary/90 [a]:hover:bg-primary/80",
```

- [ ] **Step 2: Verify button rendering**

Run: `npm run dev`
Primary buttons should have a subtle blue shadow beneath them. Hover should slightly darken the background.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.jsx
git commit -m "feat(ui): add primary shadow to Button default variant

Subtle blue shadow matches prototype button styling."
```

---

### Task 10: Add semantic Badge variants

**Files:**
- Modify: `src/components/ui/badge.jsx`

- [ ] **Step 1: Add met, borderline, not-met, and neutral variants**

In `src/components/ui/badge.jsx`, add these entries to the `variants.variant` object, after the existing `link` variant:

```jsx
        neutral:
          "bg-muted text-muted-foreground border-border",
        met:
          "bg-[var(--status-met-bg)] text-[var(--status-met-text)] border-[var(--status-met-border)]",
        borderline:
          "bg-[var(--status-borderline-bg)] text-[var(--status-borderline-text)] border-[var(--status-borderline-border)]",
        "not-met":
          "bg-[var(--status-not-met-bg)] text-[var(--status-not-met-text)] border-[var(--status-not-met-border)]",
        success:
          "bg-success-soft text-success border-success/20",
        warning:
          "bg-warning-soft text-warning border-warning/20",
```

- [ ] **Step 2: Verify badge variants**

Run: `npm run dev`
Temporarily render badges with each new variant to verify colors. Met should be green, borderline amber, not-met red, neutral muted gray.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/badge.jsx
git commit -m "feat(ui): add semantic Badge variants (met, borderline, not-met, neutral)

Status badges for outcome attainment display."
```

---

### Task 11: Migrate toast system to sonner

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/components/toast/useToast.js`
- Delete: `src/components/toast/Toast.jsx`
- Delete: `src/components/toast/ToastContainer.jsx`
- Delete: `src/styles/toast.css`

Strategy: Keep `useToast()` hook API but rewrite it to delegate to sonner's `toast()`. This way all 12 consumer files continue working without changes. Delete the custom Toast component and CSS.

- [ ] **Step 1: Rewrite useToast.js to wrap sonner**

Replace the entire content of `src/components/toast/useToast.js` with:

```js
import { toast as sonnerToast } from "sonner";

const ensureTrailingPeriod = (message) => {
  const text = String(message ?? "").trim();
  if (!text) return text;
  return text.replace(/[.!?]+$/u, "") + ".";
};

const toast = {
  success: (m) => sonnerToast.success(ensureTrailingPeriod(m)),
  error:   (m) => sonnerToast.error(ensureTrailingPeriod(m)),
  warning: (m) => sonnerToast.warning(ensureTrailingPeriod(m)),
  info:    (m) => sonnerToast.info(ensureTrailingPeriod(m)),
};

export function useToast() {
  return toast;
}

// Legacy exports — no-ops, kept for import compatibility
export function ToastProvider({ children }) {
  return children;
}

export function useToasts() {
  return { toasts: [], removeToast: () => {} };
}
```

- [ ] **Step 2: Update main.jsx**

In `src/main.jsx`, make these changes:

Replace the imports:

```jsx
import { ToastProvider } from "./components/toast/useToast";
import ToastContainer from "./components/toast/ToastContainer";
import "./styles/globals.css";
import "./styles/shared.css";
import "./styles/toast.css";
```

with:

```jsx
import { ToastProvider } from "./components/toast/useToast";
import { Toaster } from "@/components/ui/sonner";
import "./styles/globals.css";
import "./styles/shared.css";
```

And replace:

```jsx
      <ToastProvider>
        <ToastContainer />
        <App />
      </ToastProvider>
```

with:

```jsx
      <ToastProvider>
        <Toaster position="top-left" richColors closeButton />
        <App />
      </ToastProvider>
```

Note: `shared.css` import stays for now — it's removed in Task 12.

- [ ] **Step 3: Delete old toast files**

```bash
rm src/components/toast/Toast.jsx src/components/toast/ToastContainer.jsx src/styles/toast.css
```

- [ ] **Step 4: Verify toast system works**

Run: `npm run dev`
Navigate to admin panel, trigger an action that shows a toast (e.g., export). Toast should appear via sonner (top-left, styled with shadcn theme).

- [ ] **Step 5: Run tests**

Run: `npm test -- --run`
Expected: All tests pass. If any test imports ToastContainer or Toast directly, update the import to use the useToast shim.

- [ ] **Step 6: Commit**

```bash
git add -A src/components/toast/ src/main.jsx src/styles/toast.css
git commit -m "feat(ui): migrate toast system to sonner

useToast() API preserved as thin wrapper around sonner.
Custom Toast component and toast.css deleted.
All 12 consumer files continue working without changes."
```

---

### Task 12: Delete shared.css and migrate essentials

**Files:**
- Modify: `src/styles/globals.css`
- Modify: `src/main.jsx`
- Delete: `src/styles/shared.css`

`shared.css` contains: legacy design tokens (already replaced in globals.css), Google Fonts import (replaced by fontsource), reset rules (Tailwind handles this), scrollbar styles (added in Task 5), button transitions, skip-link, sr-only class, and various legacy component styles.

Only two things need migrating: the skip-link and safe-area env vars. Everything else is either already handled by Tailwind/shadcn or will be replaced in sub-projects.

- [ ] **Step 1: Add skip-link and safe-area to globals.css**

In `src/styles/globals.css`, add these at the end of the `@layer base` block (before the closing `}`):

```css
  /* Skip navigation (a11y) */
  .skip-link {
    @apply absolute -top-full -left-full z-[9999] rounded bg-primary px-4 py-2 text-sm text-primary-foreground no-underline focus:top-3 focus:left-3;
  }
```

- [ ] **Step 2: Remove shared.css import from main.jsx**

In `src/main.jsx`, delete this line:

```jsx
import "./styles/shared.css";
```

- [ ] **Step 3: Delete shared.css**

```bash
rm src/styles/shared.css
```

- [ ] **Step 4: Verify build and check for broken styles**

Run: `npm run build`
Expected: Build succeeds.

Run: `npm run dev`
Check admin panel and jury form. Some legacy component styles from shared.css will be missing — this is expected and will be fixed in Admin/Jury sub-projects. The critical things (fonts, tokens, scrollbars, skip-link) should work.

- [ ] **Step 5: Commit**

```bash
git add -A src/styles/ src/main.jsx
git commit -m "chore: delete shared.css, migrate skip-link to globals.css

Legacy design tokens replaced by prototype token system.
Google Fonts replaced by fontsource packages.
Reset and scrollbar handled by Tailwind base layer.
Component-specific styles will be replaced in sub-projects."
```

---

### Task 13: Final verification and cleanup

**Files:**
- Verify: `src/styles/globals.css` (should be the only CSS file actively imported)

- [ ] **Step 1: Verify CSS file inventory**

Run:

```bash
ls src/styles/
```

Expected remaining files:

```text
globals.css
admin-details.css    (used by AdminPanel.jsx — removed in Admin sub-project)
admin-matrix.css     (used by AdminPanel.jsx — removed in Admin sub-project)
jury-confetti.css    (used by JuryForm.jsx — removed in Jury sub-project)
jury-pin.css         (used by JuryForm.jsx — removed in Jury sub-project)
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with zero errors.

- [ ] **Step 3: Run all tests**

Run: `npm test -- --run`
Expected: All tests pass.

- [ ] **Step 4: Visual spot-check in both modes**

Run: `npm run dev`

Check these pages in BOTH light and dark mode:
1. Admin login form — inputs, buttons, card styling
2. Admin sidebar — navy background, active item highlighting
3. Admin overview — KPI cards, overall layout
4. Jury identity step — form inputs, button

Dark mode should show deep navy backgrounds, not pure black. Light mode should show subtle blue-tinted backgrounds, not pure white.

- [ ] **Step 5: Commit (if any fixes needed)**

Only commit if Step 4 revealed issues that needed fixing.

```bash
git add -A
git commit -m "fix(theme): address visual issues found during foundation verification"
```
