# Enable Editing Mode Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a confirmation modal with duration + reason inputs before enabling juror edit mode, with access control based on juror status.

**Architecture:** Four-layer change: (1) extend the API function to accept and persist `reason`/`durationMinutes`, (2) thread new params through the hook, (3) new `EnableEditingModal` component that owns duration/reason form state, (4) wire modal into the action menu with status-based access control and CSS tooltips for disabled items.

**Tech Stack:** React 18, Lucide icons (`lucide-react`), PostgREST direct table update via Supabase client, existing `Modal` from `@/shared/ui/Modal`, existing CSS classes (`fs-modal-*`, `fs-btn`, `fs-alert`, `fs-input`).

---

## File Map

| File | Change |
|---|---|
| `src/shared/api/admin/jurors.js` | Modify `setJurorEditMode` to accept `reason` + `durationMinutes` |
| `src/admin/hooks/useManageJurors.js` | Modify `handleToggleJurorEdit` to accept + pass `reason` + `durationMinutes`, return `{ ok, message }` |
| `src/admin/modals/EnableEditingModal.jsx` | **Create** — modal with duration/reason form |
| `src/admin/pages/JurorsPage.jsx` | Add `editModeJuror` state, update action menu access control, import + render modal |
| `src/styles/pages/jurors.css` | Add `.juror-action-item.disabled` + `[data-tooltip]` CSS for action menu |

---

### Task 1: Extend `setJurorEditMode` API

**Files:**

- Modify: `src/shared/api/admin/jurors.js:71-78`

- [ ] **Step 1: Update the function signature and body**

Replace the existing `setJurorEditMode` function (lines 71–78):

```js
export async function setJurorEditMode({ jurorId, periodId, enabled, reason, durationMinutes }) {
  if (!jurorId || !periodId) throw new Error("setJurorEditMode: jurorId and periodId required");
  const patch = enabled
    ? {
        edit_enabled: true,
        edit_reason: reason || null,
        edit_expires_at: new Date(Date.now() + (durationMinutes || 30) * 60_000).toISOString(),
      }
    : {
        edit_enabled: false,
        edit_reason: null,
        edit_expires_at: null,
      };
  const { error } = await supabase
    .from("juror_period_auth")
    .update(patch)
    .match({ juror_id: jurorId, period_id: periodId });
  if (error) throw error;
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/api/admin/jurors.js
git commit -m "feat(api): extend setJurorEditMode to persist reason and edit_expires_at"
```

---

### Task 2: Thread `reason` + `durationMinutes` through the hook

**Files:**

- Modify: `src/admin/hooks/useManageJurors.js:508-565`

- [ ] **Step 1: Update `handleToggleJurorEdit` signature and `setJurorEditMode` call**

Replace the entire `handleToggleJurorEdit` function (currently lines 508–565):

```js
const handleToggleJurorEdit = async ({ jurorId, enabled, reason, durationMinutes }) => {
  if (!viewPeriodId || !jurorId) return { ok: false };
  setMessage("");
  setEvalLockError?.("");
  if (!enabled) {
    setEvalLockError?.("Edit mode can only be closed by juror resubmission.");
    return { ok: false };
  }
  applyJurorPatch({
    juror_id: jurorId,
    edit_enabled: true,
    editEnabled: true,
    overviewStatus: "editing",
    final_submitted_at: null,
    finalSubmittedAt: null,
  });
  incLoading();
  try {
    await setJurorEditMode({ periodId: viewPeriodId, jurorId, enabled: true, reason, durationMinutes });
    const jurorName = getJurorNameById(jurors, jurorId);
    setMessage(
      jurorName ? `Editing unlocked for Juror ${jurorName}` : "Editing unlocked for juror"
    );
    scheduleJurorRefresh();
    return { ok: true };
  } catch (e) {
    scheduleJurorRefresh();
    const msg = String(e?.message || "");
    if (
      msg.includes("edit_mode_disable_not_allowed") ||
      msg.includes("final_submit_required")
    ) {
      setEvalLockError?.("Edit mode can only be closed by juror resubmission.");
    } else if (msg.includes("final_submission_required")) {
      setEvalLockError?.(
        "Juror must have a completed submission before edit mode can be enabled."
      );
    } else if (msg.includes("no_pin")) {
      setEvalLockError?.("Juror PIN is missing for this period. Reset the PIN first.");
    } else if (
      msg.includes("period_not_found") ||
      msg.includes("period_inactive")
    ) {
      setEvalLockError?.("Selected period could not be found. Refresh and try again.");
    } else if (msg.includes("period_locked")) {
      setEvalLockError?.("Evaluation lock is active. Unlock the period first.");
    } else if (msg.includes("unauthorized")) {
      setEvalLockError?.("Admin password is invalid. Please re-login.");
    } else {
      setEvalLockError?.(
        e?.message || "Could not update edit mode. Try again or check admin password."
      );
    }
    return { ok: false, message: e?.message || "Could not enable editing mode." };
  } finally {
    decLoading();
  }
};
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/admin/hooks/useManageJurors.js
git commit -m "feat(hook): thread reason+durationMinutes through handleToggleJurorEdit"
```

---

### Task 3: Create `EnableEditingModal.jsx`

**Files:**

- Create: `src/admin/modals/EnableEditingModal.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/admin/modals/EnableEditingModal.jsx
// Modal: confirm enable-editing-mode for a completed juror.
//
// Props:
//   open             — boolean
//   onClose          — () => void  (resets form)
//   juror            — { name, affiliation } | null
//   onEnable         — ({ reason, durationMinutes }) => Promise<void>

import { useState } from "react";
import { LockOpen, Info } from "lucide-react";
import Modal from "@/shared/ui/Modal";

const UNIT_CLAMP = { minutes: [1, 240], hours: [1, 48] };

export default function EnableEditingModal({ open, onClose, juror, onEnable }) {
  const [durationValue, setDurationValue] = useState("30");
  const [durationUnit, setDurationUnit] = useState("minutes");
  const [reason, setReason] = useState("");
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    if (enabling) return;
    setDurationValue("30");
    setDurationUnit("minutes");
    setReason("");
    setError("");
    onClose();
  };

  const parsedDuration = parseInt(durationValue, 10);
  const [min, max] = UNIT_CLAMP[durationUnit];
  const durationValid = !isNaN(parsedDuration) && parsedDuration >= min && parsedDuration <= max;
  const reasonValid = reason.trim().length >= 5;
  const canEnable = durationValid && reasonValid && !enabling;

  const durationMinutes =
    durationUnit === "hours" ? parsedDuration * 60 : parsedDuration;

  const handleEnable = async () => {
    if (!canEnable) return;
    setEnabling(true);
    setError("");
    try {
      await onEnable({ reason: reason.trim(), durationMinutes });
      // Success — parent closes modal via setEditModeJuror(null)
    } catch (e) {
      setError(e?.message || "Could not enable editing mode. Please try again.");
    } finally {
      setEnabling(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} size="sm" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon">
          <LockOpen size={20} />
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>Enable Editing Mode</div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          Temporarily allow <strong style={{ color: "var(--text-primary)" }}>{juror?.name}</strong>{" "}
          to update submitted scores.
        </div>
      </div>

      <div className="fs-modal-body">
        {/* Info banner */}
        <div
          style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "10px 12px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            marginBottom: 16,
          }}
        >
          <Info size={15} style={{ color: "var(--text-secondary)", flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            The juror will be able to modify their submitted scores until the editing
            window expires or they resubmit.
          </span>
        </div>

        {/* Duration row */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
            Duration
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="fs-input"
              type="number"
              min={min}
              max={max}
              value={durationValue}
              onChange={(e) => setDurationValue(e.target.value)}
              disabled={enabling}
              style={{ width: 80, boxSizing: "border-box" }}
            />
            <select
              className="fs-input"
              value={durationUnit}
              onChange={(e) => {
                setDurationUnit(e.target.value);
                setDurationValue(e.target.value === "hours" ? "1" : "30");
              }}
              disabled={enabling}
              style={{ flex: 1 }}
            >
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
            </select>
          </div>
          {durationValue !== "" && !durationValid && (
            <div style={{ fontSize: 11.5, color: "var(--danger)", marginTop: 4 }}>
              {durationUnit === "minutes" ? "Enter 1–240 minutes." : "Enter 1–48 hours."}
            </div>
          )}
        </div>

        {/* Reason field */}
        <div style={{ marginBottom: error ? 12 : 0 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
            Reason (audit log) <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <textarea
            className="fs-input"
            rows={3}
            minLength={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Correcting accidental criterion mismatch"
            disabled={enabling}
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
          />
        </div>

        {/* Inline error */}
        {error && (
          <div className="fs-alert danger" style={{ margin: 0, marginTop: 10 }}>
            <div className="fs-alert-body">
              <div className="fs-alert-desc">{error}</div>
            </div>
          </div>
        )}
      </div>

      <div className="fs-modal-footer" style={{ justifyContent: "center", background: "transparent", borderTop: "none", paddingTop: 0 }}>
        <button
          type="button"
          className="fs-btn fs-btn-secondary"
          onClick={handleClose}
          disabled={enabling}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-primary"
          onClick={handleEnable}
          disabled={!canEnable}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          {enabling ? (
            <>
              <span className="fs-spinner" style={{ width: 13, height: 13 }} />
              Enabling…
            </>
          ) : (
            <>
              <LockOpen size={13} />
              Enable
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/admin/modals/EnableEditingModal.jsx
git commit -m "feat(modal): add EnableEditingModal with duration + reason form"
```

---

### Task 4: Add tooltip CSS for disabled action menu items

**Files:**

- Modify: `src/styles/pages/jurors.css`

The existing tooltip pattern is used on `.jurors-table-active[data-tooltip]`. We need to add the shared `[data-tooltip]` base styles (if not already present globally) AND the disabled action item variant.

- [ ] **Step 1: Check for existing global tooltip CSS**

```bash
grep -r "data-tooltip" src/styles/ --include="*.css" -l
```

If the output includes a global CSS file (e.g. `vera.css` or `components.css`) that already defines `[data-tooltip]::before` / `[data-tooltip]::after`, skip to Step 3. If only `jurors.css` is found (the existing `.jurors-table-active[data-tooltip]` override), proceed to Step 2.

- [ ] **Step 2: Append tooltip + disabled styles to `jurors.css`**

Open `src/styles/pages/jurors.css` and append at the end:

```css
/* ─── Tooltip base (used for disabled action menu items) ───── */
[data-tooltip] { position: relative }
[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  background: var(--text-primary);
  color: var(--bg-card);
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 5px;
  pointer-events: none;
  opacity: 0;
  transition: opacity .15s .15s;
  z-index: 200;
}
[data-tooltip]:hover::after { opacity: 1 }

/* ─── Disabled action item ───────────────────────────────────── */
.juror-action-item.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}
.juror-action-item-tooltip-wrap {
  display: block;
  position: relative;
}
.juror-action-item-tooltip-wrap[data-tooltip]::after {
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(100% + 6px);
  white-space: normal;
  width: 200px;
  text-align: center;
}
```

- [ ] **Step 3: Verify the existing `.jurors-table-active[data-tooltip]` override still works**

The existing rule `.jurors-table-active[data-tooltip]:hover::after { left: auto; right: 0; transform: none }` overrides the base `[data-tooltip]` rule specifically for that column — this is fine. No change needed.

- [ ] **Step 4: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/styles/pages/jurors.css
git commit -m "feat(css): add tooltip base + disabled action item styles for jurors page"
```

---

### Task 5: Wire modal into JurorsPage — state + action menu + render

**Files:**

- Modify: `src/admin/pages/JurorsPage.jsx`

- [ ] **Step 1: Import `EnableEditingModal`**

Add to the imports section at the top of the file (after the existing modal imports on lines 9–13):

```js
import EnableEditingModal from "../modals/EnableEditingModal";
```

- [ ] **Step 2: Add `editModeJuror` state**

In the "Local UI state" block (around line 160), add after `const [removeJuror, setRemoveJuror] = useState(null);`:

```js
// Enable editing mode modal
const [editModeJuror, setEditModeJuror] = useState(null);
```

- [ ] **Step 3: Add `handleEnableEditMode` callback**

After the existing `handleSaveEditJuror` function, add:

```js
const handleEnableEditMode = async ({ reason, durationMinutes }) => {
  const jurorId = editModeJuror?.juror_id || editModeJuror?.jurorId;
  const result = await jurorsHook.handleToggleJurorEdit({
    jurorId,
    enabled: true,
    reason,
    durationMinutes,
  });
  if (!result?.ok) throw new Error(result?.message || "Could not enable editing mode.");
  setEditModeJuror(null);
};
```

- [ ] **Step 4: Update the action menu "Enable Editing Mode" item**

Find the action menu block (around lines 600–606). Replace the current `<div className="juror-action-item">` for "Enable Editing Mode":

**Before:**

```jsx
<div className="juror-action-item" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); jurorsHook.handleToggleJurorEdit({ jurorId: jid, enabled: true }); }}>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
  Enable Editing Mode
</div>
```

**After** (replace with status-aware version):

```jsx
{status !== "editing" && (
  status === "completed" ? (
    <div
      className="juror-action-item"
      onClick={(e) => {
        e.stopPropagation();
        setOpenMenuId(null);
        setEditModeJuror(juror);
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        <path d="M11 15h1v2" />
      </svg>
      Enable Editing Mode
    </div>
  ) : (
    <span
      className="juror-action-item-tooltip-wrap"
      data-tooltip="Juror must complete their submission before editing can be unlocked."
    >
      <div className="juror-action-item disabled">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          <path d="M11 15h1v2" />
        </svg>
        Enable Editing Mode
      </div>
    </span>
  )
)}
```

Note: `status` is already computed per-row from `juror.overviewStatus` (check the variable name in the existing row-rendering loop — it may be `status`, `overviewStatus`, or extracted differently).

- [ ] **Step 5: Add `EnableEditingModal` to the MODALS section**

After the `<RemoveJurorModal ... />` block (around line 715), add:

```jsx
{/* Enable Editing Mode Modal */}
<EnableEditingModal
  open={!!editModeJuror}
  onClose={() => setEditModeJuror(null)}
  juror={editModeJuror ? {
    name: editModeJuror.juryName || editModeJuror.juror_name || "",
    affiliation: editModeJuror.affiliation || "",
  } : null}
  onEnable={handleEnableEditMode}
/>
```

- [ ] **Step 6: Verify `status` variable name in the row loop**

Before running the build, read lines 450–570 of `JurorsPage.jsx` and confirm which variable name is used for `juror.overviewStatus` in the row rendering loop. If it's not `status`, update the action menu code in Step 4 to use the correct name.

- [ ] **Step 7: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/admin/pages/JurorsPage.jsx
git commit -m "feat(ui): wire EnableEditingModal into JurorsPage with status-based access control"
```

---

### Task 6: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test — completed juror**

1. Navigate to admin → Jurors page.
2. Find a juror with `Completed` status pill.
3. Open the action menu (⋮ button).
4. Verify "Enable Editing Mode" item is clickable.
5. Click it — modal opens with LockOpen icon header, info banner, Duration row (30 / minutes default), Reason textarea.
6. Leave reason empty → Enable button disabled.
7. Type 4 chars in reason → still disabled.
8. Type 5+ chars → Enable button activates.
9. Click Enable → modal closes, juror status changes to `editing`, toast appears.

- [ ] **Step 3: Test — non-completed juror (e.g. in_progress)**

1. Find a juror with `In Progress` or `Not Started` status.
2. Open the action menu.
3. Verify "Enable Editing Mode" is rendered but visually dimmed (opacity 0.45, `not-allowed` cursor when wrapping span is hovered).
4. Hover the dimmed item — tooltip appears: "Juror must complete their submission before editing can be unlocked."
5. The item cannot be clicked (pointer-events: none on the inner div).

- [ ] **Step 4: Test — editing juror**

1. Find a juror already in `editing` status.
2. Open the action menu.
3. Verify "Enable Editing Mode" is **not rendered** (hidden entirely).

- [ ] **Step 5: Test — API error path**

1. Temporarily break the network (DevTools → Network → Offline) after entering a valid reason.
2. Click Enable — spinner appears, modal stays open, inline danger alert shows error message.
3. Restore network, click Enable again — success.

- [ ] **Step 6: Commit smoke test confirmation**

No code changes needed — this step is just verification. If bugs are found, fix them and commit with:

```bash
git add <changed files>
git commit -m "fix(enable-editing): <description of fix>"
```
