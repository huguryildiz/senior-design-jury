# Light Mode Glass System Design

**Date:** 2026-04-06
**Status:** Approved
**Scope:** CSS-only; no component JSX changes

---

## Summary

Apply a global "C+ Refined Glass" design language to all light-mode UI surfaces in VERA.
Inspired by openclaw.ai: restrained elegance, soft layering through opacity and border subtlety,
minimal blur (not iOS heavy), flat solid buttons. Feels like a premium B2B SaaS control surface.

Dark mode is untouched. Jury flow is untouched. No component JSX changes.

---

## Design Language: C+ Refined Glass

### Visual Signature

- Card backgrounds: `rgba(255,255,255,0.88)` — semi-transparent over a soft page atmosphere
- Blur: `blur(16px) saturate(1.15)` — enough to read the layering, not enough to obscure content
- Overlay/backdrop: `rgba(241,245,249,0.50)` with `blur(6px)` — page dims softly, not harshly
- Border: near-invisible `rgba(15,23,42,0.06)` hairline — defines surfaces without hard edges
- Inner highlight: `inset 0 1px 0 rgba(255,255,255,0.9)` — light catches the top edge
- Outer ring: `0 0 0 1px rgba(255,255,255,0.7)` — subtle white ring separates card from page

### What It Is Not

- No heavy iOS blur (no `blur(40px)` or full transparency)
- No gradient card backgrounds or rainbow glass
- No neon/glow effects
- No colored tints on surfaces (surfaces stay neutral white/slate)
- No changes to button styles — buttons stay flat solid as-is

---

## Token System

These tokens are added to `:root` in `variables.css` and override via `body:not(.dark-mode)`:

```css
/* Modal / Dialog surfaces */
--glass-modal-bg:          rgba(255,255,255,0.88);
--glass-modal-blur:        blur(16px) saturate(1.15);
--glass-modal-shadow:      0 0 0 1px rgba(255,255,255,0.7),
                           0 1px 2px rgba(15,23,42,0.04),
                           0 4px 16px rgba(15,23,42,0.06),
                           0 12px 40px rgba(15,23,42,0.08);
--glass-modal-border:      rgba(15,23,42,0.06);
--glass-modal-header-bg:   linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%);

/* Drawer surfaces */
--glass-drawer-bg:         rgba(255,255,255,0.92);
--glass-drawer-blur:       blur(16px) saturate(1.1);
--glass-drawer-shadow:     -2px 0 40px rgba(15,23,42,0.08),
                           0 0 0 1px rgba(255,255,255,0.6);
--glass-drawer-border:     rgba(15,23,42,0.06);

/* Overlay / backdrop */
--glass-overlay-bg:        rgba(241,245,249,0.50);
--glass-overlay-blur:      blur(6px) saturate(1.05);

/* Shared header / footer strips */
--glass-header-bg:         rgba(255,255,255,0.35);
--glass-footer-bg:         rgba(249,250,251,0.65);
--glass-footer-border:     rgba(15,23,42,0.04);

/* Card surfaces (admin cards, table wrappers) */
--glass-card-bg:           rgba(250,251,253,0.85);
--glass-card-shadow:       0 1px 3px rgba(15,23,42,0.04),
                           0 0 0 1px rgba(15,23,42,0.03),
                           inset 0 1px 0 rgba(255,255,255,0.9);
--glass-card-border:       rgba(15,23,42,0.05);
```

In dark mode these tokens already exist with dark glass values — the new light tokens sit
alongside them under `:root` and are overridden by `.dark-mode` as before.

---

## Three-Tier Surface Strategy

### Tier 1 — Full Glass (overlays and floating panels)

Applies `backdrop-filter` for true frosted effect because these surfaces float over page content.

| Surface | CSS classes | File |
|---|---|---|
| Modal backdrop | `.fs-modal-wrap` | `modals.css` |
| Modal card | `.fs-modal` | `modals.css` |
| Drawer backdrop | `.fs-overlay` | `drawers.css` |
| Drawer panel | `.fs-drawer` | `drawers.css` |
| ConfirmDialog backdrop | `.vera-modal-overlay` | `ui-base.css` |
| ConfirmDialog card | `.vera-modal-card` | `ui-base.css` |
| Generic modal backdrop | `.modal-overlay` | `components.css` |
| Generic modal card | `.modal-card` | `components.css` |
| Dropdown menus | `.fs-dropdown-menu`, `.custom-select-menu` | `variables.css` overrides |

### Tier 2 — Refined Surface (inline content regions)

No `backdrop-filter` (nothing to blur behind an inline card). Gets the inner-highlight shadow
and near-invisible border for depth without blurring.

| Surface | CSS classes | File |
|---|---|---|
| Admin cards | `.card` | `components.css` |
| Table wrappers | `.jrm-table-wrap` | `modals.css` |
| Info cards | `.eem-info-card` | `modals.css` |
| KPI stat tiles | `.compare-stat` | `modals.css` |
| Alert/info strips | `.alert`, `.info-strip` | `components.css` |

### Tier 3 — Page Atmosphere (backgrounds)

Soft page backgrounds that give the glass surfaces something to float over.

| Surface | Target value | File |
|---|---|---|
| Admin main bg | `#f0f4f8` (current `#eef2f8`, minimal shift) | `variables.css` |
| Landing sections | Align existing partial glass to C+ token values | `landing.css` |

---

## Per-File Implementation Plan

### 1. `src/styles/variables.css`

**Add to `:root`:** All 17 light-mode glass tokens listed above.

**Add to `body:not(.dark-mode)`:**

```css
/* Custom select dropdown menus get glass surface */
body:not(.dark-mode) .custom-select-menu {
  background: var(--glass-card-bg);
  backdrop-filter: var(--glass-modal-blur);
  border-color: var(--glass-modal-border);
  box-shadow: var(--glass-modal-shadow);
}
```

### 2. `src/styles/modals.css`

**Add `body:not(.dark-mode)` block:**

```css
body:not(.dark-mode) .fs-modal-wrap {
  background: var(--glass-overlay-bg);
  backdrop-filter: var(--glass-overlay-blur);
}
body:not(.dark-mode) .fs-modal {
  background: var(--glass-modal-bg);
  backdrop-filter: var(--glass-modal-blur);
  box-shadow: var(--glass-modal-shadow);
  border: 1px solid var(--glass-modal-border);
}
body:not(.dark-mode) .fs-modal-header {
  background: var(--glass-modal-header-bg);
  border-bottom-color: var(--glass-modal-border);
}
body:not(.dark-mode) .fs-modal-footer {
  background: var(--glass-footer-bg);
  border-top-color: var(--glass-footer-border);
}
body:not(.dark-mode) .jrm-table-wrap {
  background: var(--glass-card-bg);
  border-color: var(--glass-card-border);
  box-shadow: var(--glass-card-shadow);
}
body:not(.dark-mode) .compare-stat {
  background: var(--glass-card-bg);
}
body:not(.dark-mode) .eem-info-card {
  background: var(--glass-card-bg);
  border-color: var(--glass-card-border);
}
```

### 3. `src/styles/drawers.css`

**Add `body:not(.dark-mode)` block:**

```css
body:not(.dark-mode) .fs-overlay {
  background: var(--glass-overlay-bg);
  backdrop-filter: var(--glass-overlay-blur);
}
body:not(.dark-mode) .fs-drawer {
  background: var(--glass-drawer-bg);
  backdrop-filter: var(--glass-drawer-blur);
  box-shadow: var(--glass-drawer-shadow);
  border-left: 1px solid var(--glass-drawer-border);
}
body:not(.dark-mode) .fs-drawer-header {
  background: var(--glass-header-bg);
  border-bottom-color: var(--glass-drawer-border);
}
body:not(.dark-mode) .fs-drawer-footer {
  background: var(--glass-footer-bg);
  border-top-color: var(--glass-footer-border);
}
```

### 4. `src/styles/ui-base.css`

**Add `body:not(.dark-mode)` block (ConfirmDialog):**

```css
body:not(.dark-mode) .vera-modal-overlay {
  background: var(--glass-overlay-bg);
  backdrop-filter: var(--glass-overlay-blur);
}
body:not(.dark-mode) .vera-modal-card {
  background: var(--glass-modal-bg);
  backdrop-filter: var(--glass-modal-blur);
  box-shadow: var(--glass-modal-shadow);
  border-color: var(--glass-modal-border);
}
```

### 5. `src/styles/components.css`

**Add `body:not(.dark-mode)` block:**

```css
body:not(.dark-mode) .modal-overlay {
  background: var(--glass-overlay-bg);
  backdrop-filter: var(--glass-overlay-blur);
}
body:not(.dark-mode) .modal-card {
  background: var(--glass-modal-bg);
  backdrop-filter: var(--glass-modal-blur);
  box-shadow: var(--glass-modal-shadow);
  border: 1px solid var(--glass-modal-border);
}
body:not(.dark-mode) .card {
  background: var(--glass-card-bg);
  box-shadow: var(--glass-card-shadow);
  border-color: var(--glass-card-border);
}
```

### 6. `src/styles/landing.css`

**Align existing glass values to C+ tokens:**

The landing page already has extensive `body:not(.dark-mode)` glass overrides using two raw values
that need to be updated for consistency:

| Current value | Replace with |
|---|---|
| `rgba(255,255,255,0.48)` | `rgba(255,255,255,0.88)` |
| `blur(20px) saturate(1.4)` | `blur(16px) saturate(1.15)` |

This affects every `body:not(.dark-mode)` block in `landing.css` that contains these values —
`.landing-trust`, `.landing-feature`, `.landing-how`, `.landing-pill`, `.landing-section-label`,
`.product-showcase`, `.uc-card`, `.testimonial-card`, `.faq-item`, `.trust-feature-card`,
`.compare-table`, `.mobile-frame` and similar. Use global find-replace within the file,
scoped only to lines already inside `body:not(.dark-mode)` blocks.

---

## What Is Explicitly Out of Scope

- **Dark mode** — existing dark glass tokens are untouched
- **Sidebar / nav** — `src/styles/sidebar.css` is not touched
- **Jury flow** — `src/jury/` components and related CSS are not touched
- **Component JSX** — zero `.jsx` file edits; purely CSS changes
- **Button styles** — buttons remain flat solid; no glass on buttons
- **Form inputs** — inputs remain as-is; no glass on `<input>` / `<textarea>`
- **Scrollbars** — existing scrollbar styling unchanged

---

## Acceptance Criteria

1. In light mode, all modals (fs-modal, vera-modal, modal-card) show frosted glass card on soft overlay
2. In light mode, all drawers (fs-drawer) show frosted glass panel on soft overlay
3. In light mode, all admin cards show inner-highlight depth without blur
4. In light mode, dropdowns float with glass shadow
5. Dark mode is visually identical to before this change
6. Jury flow screens are visually identical to before this change
7. No hardcoded color values introduced — all overrides reference the new `--glass-*` tokens
8. `npm run build` passes with no errors
