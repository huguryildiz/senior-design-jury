# Enable Editing Mode — Modal & Access Control Design

**Date:** 2026-04-05
**Status:** Approved

---

## Overview

The "Enable Editing Mode" action on the Jurors page currently fires immediately on click with no
confirmation, no reason capture, and no duration limit. This spec adds:

1. A confirmation modal with duration + reason inputs before enabling edit mode.
2. Access control: the action is only available for jurors with `completed` status.
3. Disabled state with tooltip for all other statuses.
4. `edit_reason` and `edit_expires_at` written to `juror_period_auth` (columns already exist).

---

## Scope

- New file: `src/admin/modals/EnableEditingModal.jsx`
- Modified: `src/shared/api/admin/jurors.js` — `setJurorEditMode`
- Modified: `src/admin/hooks/useManageJurors.js` — `handleToggleJurorEdit`
- Modified: `src/admin/pages/JurorsPage.jsx` — action menu + modal state

---

## Modal Design

### Header

- Icon: Lucide `LockOpen` in a branded icon container (`fs-icon`)
- Title: `"Enable Editing Mode"`
- Subtitle: `"Temporarily allow **{juror name}** to update submitted scores."`

### Body

**Info banner** (top of body, non-dismissible):
- Lucide `Info` icon
- Text: `"The juror will be able to modify their submitted scores until the editing
  window expires or they resubmit."`
- Style: `var(--surface-2)` background, subtle border

**Duration row:**
- Label: `"Duration"`
- Two inputs side-by-side:
  - `<input type="number">` — min=1, width ~80px, default value `30`
  - `<select>` unit picker — options: `minutes`, `hours`; default `minutes`
- When unit = `minutes`: clamp input to 1–240
- When unit = `hours`: clamp input to 1–48
- Combined result passed as `durationMinutes` to the hook

**Reason field:**
- Label: `"Reason (audit log)"` with `*` required marker
- `<textarea>` — 3 rows, minLength=5
- Placeholder: `"e.g. Correcting accidental criterion mismatch"`

**Enable button disabled when:**
- reason.trim().length < 5
- duration value is empty / 0 / NaN

### Footer

- `Cancel` — secondary button, closes modal, resets form
- `Enable` — primary button, Lucide `LockOpen` icon prefix
  - Loading state: `"Enabling…"` with spinner, all inputs disabled

### Error handling

If the API call fails, show inline `fs-alert danger` inside the modal body. Modal stays open.

---

## Action Menu — Access Control

### Visibility rules

| Status | "Enable Editing Mode" item |
|---|---|
| `completed` | Active — opens modal |
| `editing` | Hidden (already in editing mode) |
| `in_progress`, `ready_to_submit`, `not_started` | Disabled + tooltip |

### Disabled tooltip

A lightweight CSS tooltip (not `title` attribute) shown on hover:

> "Juror must complete their submission before editing can be unlocked."

Implementation: wrapper `<span>` with `data-tooltip` attribute + CSS `::after` pseudo-element.
Delay: 150ms. Position: above the item.

---

## API Layer — `setJurorEditMode`

```js
setJurorEditMode({ jurorId, periodId, enabled, reason, durationMinutes })
```

When `enabled = true`, computes `edit_expires_at = new Date(Date.now() + durationMinutes * 60_000)`.

PostgREST update payload:

```js
{
  edit_enabled: true,
  edit_reason: reason || null,
  edit_expires_at: expiresAt,
}
```

When `enabled = false` (force-close path, no modal needed):

```js
{
  edit_enabled: false,
  edit_reason: null,
  edit_expires_at: null,
}
```

---

## Hook Layer — `handleToggleJurorEdit`

New signature:

```js
handleToggleJurorEdit({ jurorId, enabled, reason, durationMinutes })
```

- Passes `reason` and `durationMinutes` down to `setJurorEditMode`.
- Optimistic patch unchanged (sets `edit_enabled: true`, `overviewStatus: "editing"`).

---

## JurorsPage State

New state variables:

```js
const [editModeJuror, setEditModeJuror] = useState(null); // juror object | null
```

Flow:

1. User clicks "Enable Editing Mode" → `setEditModeJuror(juror)`
2. Modal opens (`open={!!editModeJuror}`)
3. User fills form → clicks Enable
4. `handleToggleJurorEdit({ jurorId, enabled: true, reason, durationMinutes })`
5. On success → modal closes, `editModeJuror` reset to null, toast shown
6. On error → modal stays open, inline error displayed

---

## Out of Scope

- Using `rpc_juror_toggle_edit_mode` (PostgREST update is sufficient)
- Displaying remaining edit time in the juror list
- Editing an already-active edit window
