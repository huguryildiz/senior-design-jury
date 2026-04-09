# Register Page Premium Redesign

**Date:** 2026-04-09
**Status:** Approved
**Scope:** `src/auth/screens/RegisterScreen.jsx`, new `GroupedCombobox` component, `auth.css`

## Problem

The current Register ("Apply for Access") page has two issues:

1. **Broken University/Department cascade** — `listOrganizationsPublic()` returns `{ id, name, code, subtitle }`. The `subtitle` field contains `"University · Department"` but RegisterScreen never parses it. `getUniversityLabel()` falls back to `tenant.name`, making every org appear as both a "university" and its own "department" — a two-step process that functionally selects a single org.

2. **Basic form feel** — Clean but lacks the premium SaaS polish expected: no inline validation, no progress feedback, no search capability for 100+ organizations.

## Solution

### 1. Grouped Combobox (replaces University + Department dropdowns)

Single searchable input with grouped dropdown results.

**Input behavior:**

- Search icon (Lucide `Search`) + placeholder `"Search university or department…"`
- On focus: opens dropdown showing all groups (scrollable)
- On type: client-side filter across both university and department text
- On select: input shows selected org as inline text `"University · Department"` with a clear (×) button
- On clear: resets to empty search state

**Dropdown structure:**

- Results grouped by university name
- Group header: university name, uppercase, `11px`, muted color (`#94a3b8`), `letter-spacing: 0.05em`
- Each item: department name (left) + org `code` badge right-aligned (muted, `11px`)
- Highlighted item: `background: #eff6ff`
- Max height with overflow scroll

**Keyboard navigation:**

- `↑` / `↓` — move highlight through items (skip group headers)
- `Enter` — select highlighted item
- `Escape` — close dropdown
- Close on outside click

**Data parsing:**

- `subtitle` split by ` · ` delimiter → `[university, department]`
- If no ` · ` found: `university = name`, `department = ""`
- Orgs without department show only under university group header with `name` as the item label

**Empty state:**

- `"No matching organizations found. Contact your department admin to set up VERA."`
- Shown inside dropdown area, centered, muted text

### 2. Inline Field Validation (onBlur)

Each field validates when the user leaves it (blur event):

| Field | Validation | Pass indicator | Fail indicator |
|---|---|---|---|
| Full Name | non-empty after trim | green checkmark at label right | "Full name is required" below field |
| Email | non-empty + basic email format | green checkmark | "Valid email is required" below field |
| Organization | org selected (tenantId truthy) | green checkmark | "Please select an organization" below field |
| Password | meets strength policy | green checkmark + strength bar | strength bar shows level |
| Confirm | matches password | "Passwords match" (existing) | "Passwords do not match" (existing) |

**Visual states:**

- **Valid:** label gets small green `✓` (Lucide `Check`, 12px, `#10b981`), input border `#10b981`, background `#f0fdf4`
- **Invalid:** inline error text below field, `12px`, `#ef4444`
- **Untouched:** default styling (no validation indicators)
- Track touched state per field via `onBlur` — only show validation after first blur

### 3. Progress Indicator

Five thin bars (`24px × 3px` each, `3px` border-radius) centered above the form divider:

- One bar per field group: Name, Email, Organization, Password, Confirm
- Filled (blue `#3b82f6`) when field passes validation
- Empty (gray `#e2e8f0`) otherwise
- CSS transition on background-color for smooth fill animation

### 4. Preserved Behaviors

- Password strength bar + label (Weak/Fair/Good/Strong) — unchanged
- Google OAuth application flow (badge, email disabled, no password fields) — unchanged
- Success state (Application Submitted card) — unchanged
- `generateTemporaryPassword()` — unchanged
- Error normalization (`normalizeError`, `extractErrorText`) — unchanged
- `useShakeOnError` on submit button — unchanged
- Security policy integration (`useSecurityPolicy`) — unchanged

## New Component

### `src/shared/ui/GroupedCombobox.jsx`

```text
Props:
  id: string
  value: string (selected item value)
  onChange: (value: string) => void
  options: Array<{ value: string, label: string, group: string, badge?: string }>
  placeholder: string
  emptyMessage: string
  disabled: boolean
  ariaLabel: string
```

Internal state: `query` (search text), `isOpen` (dropdown visible), `highlightIndex` (keyboard nav).

Filtering: case-insensitive substring match on `label` and `group` fields.

Rendered selected state: when `value` is set and dropdown is closed, show the matching option's `group · label` text with a clear button.

### CSS additions in `auth.css`

All new classes prefixed with `grouped-cb-` to avoid collisions:

- `.grouped-cb-wrap` — relative container
- `.grouped-cb-input` — search input with icon
- `.grouped-cb-dropdown` — absolute positioned list
- `.grouped-cb-group` — group header
- `.grouped-cb-item` — selectable item
- `.grouped-cb-item--highlighted` — keyboard/hover highlight
- `.grouped-cb-badge` — right-aligned code badge
- `.grouped-cb-empty` — empty state message
- `.grouped-cb-selected` — selected value display with clear button

Light mode overrides included following existing `body:not(.dark-mode)` pattern.

Inline validation classes:

- `.apply-field--valid` — green border + background on input
- `.apply-field--invalid` — red text below
- `.apply-valid-check` — green checkmark on label

Progress bar:

- `.apply-progress` — flex container for bars
- `.apply-progress-bar` — individual bar segment
- `.apply-progress-bar--filled` — blue filled state

## Files Changed

| File | Change |
|---|---|
| `src/shared/ui/GroupedCombobox.jsx` | New component |
| `src/auth/screens/RegisterScreen.jsx` | Replace two CustomSelect with GroupedCombobox, add inline validation state, add progress indicator, parse subtitle |
| `src/styles/auth.css` | GroupedCombobox styles, validation states, progress bar |

## Files NOT Changed

- `src/shared/api/` — no API changes
- `sql/` — no migrations
- `src/shared/ui/CustomSelect.jsx` — kept, used elsewhere
- Success state markup — unchanged

## Out of Scope

- Async/server-side org search (future: when 500+ orgs)
- "Request to add organization" flow (future: option B from brainstorm)
- DB migration for separate `university`/`department` columns (future: consolidated migration)
- Other auth screens (Login, ForgotPassword, ResetPassword)
