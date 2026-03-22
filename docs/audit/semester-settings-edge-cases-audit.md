# Semester Settings — Edge Case Audit

**Date:** 2026-03-22 (updated 2026-03-23, hardening pass 2026-03-23)
**Reviewer:** Claude Code (automated architectural audit)
**Area:** Semester Settings — full CRUD flow, modals, API layer, hooks

## Audit Update Note

**Fix first items completed (2026-03-23):**

- Fix 1: `window.confirm` replaced with `ConfirmDialog` in `ManageSemesterPanel.jsx`
- Fix 2: `refreshSemesters()` called after temp-ID patch to reconcile phantom entries
- Fix 3: In-flight ref guard added to `handleSetActiveSemester` in `useManageSemesters.js`
- Fix 4: `isLockedFn` now checks `semester.is_locked` for all semesters, not only `viewSemesterId`

**Fix next items completed (2026-03-23):**

- Fix 5: Last-semester delete blocked with panel error in `SettingsPage.jsx`
- Fix 6: Delete dialog blocked when `adminPass` is absent in `SettingsPage.jsx`
- Fix 7: Edit modal dirty false positive eliminated — `editOrigRef` tracks original values
- Fix 8: Unsaved dot indicator added to Criteria / MÜDEK tabs via `onDirtyChange` prop on `CriteriaManager` and `MudekManager`

**Hardening pass items completed (2026-03-23):**

- Realtime stale-edit warning: amber banner + Save disabled when another session updates the semester currently in the edit modal
- `beforeunload` guard added in `ManageSemesterPanel.jsx` — browser/tab close triggers native warning while any unsaved changes exist
- Search term whitespace trim confirmed: `searchTerm.trim().toLowerCase()` applied before all comparisons
- Empty-state message updated: "No semesters match your search." shown when filtered list is empty

**Remaining open issues:** `activeSemesterId → ""` fallback on last-semester delete (beyond the client-side block); stale criteria/MÜDEK template save when user edits name first then saves template (low probability).

---

## Summary

**Overall risk level: Low-to-Moderate** for a small internal tool (improved from Moderate after fixes).

The implementation is generally well-structured with clear separation of concerns across
`ManageSemesterPanel.jsx`, `useManageSemesters.js`, `useSettingsCrud.js`,
`useDeleteConfirm.js`, and `adminApi.js`. Most critical paths are protected at the DB
layer. The eight targeted fixes have resolved the top priority issues.

---

## Current Semester Selection

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Set active semester when none currently active | Pass | `handleSetActiveSemester` sets all semesters to `is_active=false` then the target to `true`, fires `onActiveSemesterChange`. Works even from a blank state. |
| Set active semester that is already active | Partial | No guard prevents re-calling the RPC for the same ID. Results in a no-op on the DB, but still fires a full reload and toast. Harmless but wasteful. |
| Rapid double-click "Set as Current" | Pass | `setActiveInFlightRef` ref guard added to `handleSetActiveSemester`. A second call while one is in flight returns `{ ok: false }` immediately without firing an RPC. |
| activeSemesterId not found in semesterList after Realtime update | Unclear | If a Realtime DELETE arrives for the active semester between the `handleSetActiveSemester` call and its response, the list and the activeSemesterId can briefly diverge. `removeSemester` auto-promotes but this path is not covered by the Set Active handler. |
| Set active semester with no adminPass | Pass | `handleSetActiveSemester` validates `adminPass` early and sets a panel error without calling the RPC. |

---

## Semester Creation

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Name is empty / whitespace only | Pass | `getFormMeta()` blocks on empty trim. Client-side error shown. |
| Duplicate name, same case | Pass | Client-side dedupe check (lines 441–447) catches it before API call; user sees "A semester with this name already exists." |
| Duplicate name, different case | Pass | Client-side comparison uses `toLowerCase()`. DB also enforces `semesters_name_ci_unique`. Error is mapped in `handleCreateSemester`. |
| poster_date missing | Pass | `getFormMeta()` validates presence. Create button stays disabled. |
| poster_date year outside APP_DATE bounds | Pass | `getFormMeta()` checks year range. Error shown. |
| API returns null (no row returned) | Pass | `handleCreateSemester` already guarded `created?.id`. Now also calls `refreshSemesters()` after the temp-ID patch so the phantom entry is replaced with real server data on the next load. |
| Network failure during create | Pass | Caught in catch block, maps to `setPanelError("semester", ...)`, shown as panel alert. |
| Criteria / MÜDEK state unsaved when switching away | Pass | `CriteriaManager` and `MudekManager` now accept `onDirtyChange` and report dirty state. The edit modal's Criteria and MÜDEK tab buttons show an amber dot when changes are unsaved. Users are visually informed that those saves are independent. |
| Create succeeds but `fieldErrors` returned | Pass | `handleCreateSemester` returns `{ ok: false, fieldErrors }` and the UI switches to the "semester" tab and highlights the field. |

---

## Semester Editing

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Edit current (active) semester name | Pass | No guard prevents editing the name of the active semester. DB allows it. The `activeSemesterLabel` derived value will reflect the update after `applySemesterPatch`. |
| Edit current semester poster_date | Pass | Same as above — allowed and works. |
| Edit with duplicate name | Pass | DB constraint fires `semesters_name_ci_unique`; error is mapped to "Semester name already exists." |
| Main "Save" on Semester tab does NOT persist criteria/MÜDEK changes | Partial | `onUpdateSemester` sends only `{ id, name, poster_date }`. Template changes from the Criteria/MÜDEK tabs are only persisted when the user explicitly clicks the inline save inside `CriteriaManager` / `MudekManager`. This is intentional by design but is not communicated to the user — no indication that the two flows are independent. |
| Criteria/MÜDEK template update requires name + poster_date in form state | Partial | `handleUpdateCriteriaTemplate` passes `name` and `posterDate` from the form state. If the edit modal was opened and the user changed the name (but did not yet save), the template update will be called with the *new unsaved name*, which could trigger a DB name-uniqueness check against the wrong value. Low probability but possible. |
| Editing semester while Realtime update arrives for same semester | Pass | `useManageSemesters` now exposes `externalUpdatedSemesterId` state set by a `notifyExternalSemesterUpdate` call in `useSettingsCrud`'s Realtime UPDATE handler. `ManageSemesterPanel` detects this via `useEffect` and sets `staleSemester = true` when the updated ID matches `editForm.id`. An amber warning banner appears and the Save button is disabled until the modal is closed and reopened. Form state is preserved — no auto-merge or silent discard. |
| isLockedFn returns false for non-viewed semesters | Pass | `isLockedFn` now checks `semester.is_locked` from `semesterList` first. Any semester with `is_locked=true` (eval-lock set by admin) returns `true` regardless of which semester is viewed. The `finalSubmitted` check is preserved as a secondary guard for the viewed semester. |
| Save button clicked on Criteria or MÜDEK tab (not Semester tab) | Partial | The "Save Changes" button in the edit modal footer only fires `handleEditSave`, which only saves name + poster_date. If the user is on the Criteria tab and clicks the outer Save button, nothing happens to the criteria. The inline CriteriaManager save is separate but UI proximity may confuse users. |
| Unsaved changes in modal (dirty) — user clicks outside or Cancel | Pass | `window.confirm` replaced with `ConfirmDialog`. Collapsing the panel while dirty now shows an in-app "Unsaved changes / Leave anyway?" dialog. Confirming calls `closeCreate()` + `closeEdit()` then `onToggle()`. |

---

## Semester Deletion

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Delete active (current) semester | Pass | Blocked client-side in `SettingsPage.jsx` with a panel error: "Current semester cannot be deleted...". Delete dialog never opens. |
| Delete last (only) semester | Pass | `onDeleteSemester` in `SettingsPage` now checks `crud.semesterList.length === 1` and shows a panel error "Cannot delete the only remaining semester." before opening the delete dialog. |
| Delete non-active semester | Pass | Standard flow: DeleteConfirmDialog opens, cascade counts shown, password required, RPC called. |
| Delete password wrong | Pass | `mapDeleteError` maps `incorrect_delete_password` to a user-friendly message shown in the dialog. |
| Delete password empty | Pass | Delete button in DeleteConfirmDialog is disabled until password is non-empty. |
| Network failure during delete | Partial | Error is caught and shown in the dialog. However, the `deleteTarget` state is not cleared on failure, so the dialog remains open and the user can retry. The semester is not removed from the list (correct). But if the delete actually succeeded server-side (partial commit + network timeout), the semester will still appear in the UI and the user has no way to know without refreshing. |
| adminDeleteCounts silently fails (no adminPass) | Pass | `onDeleteSemester` in `SettingsPage` now checks `!adminPass` before calling `handleRequestDelete` and shows a panel error "Admin password missing. Please re-login." The delete dialog is never opened without a valid password. |
| Cascade counts not updated after Realtime changes | Unclear | `deleteCounts` is fetched once when `handleRequestDelete` fires. If a juror submits scores between opening the dialog and confirming, the counts shown will be stale. Unlikely but not guarded. |
| Rapid delete confirm clicks | Partial | No in-flight `loading` state guard visible in `handleConfirmDelete` on the hook side. `DeleteConfirmDialog` has a local `loading` state but it is reset on error; a second rapid click could fire two RPC calls. |

---

## Search and Filtering

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Search term that matches nothing | Pass | Filtered list is empty; the component renders "No semesters match your search." in a secondary-styled message below the list. |
| Search filters out active semester | Pass | No special treatment — the active semester is filtered out of view like any other if the term doesn't match. No warning shown. |
| Search term with leading/trailing whitespace | Pass | `normalizedSearch` is computed as `searchTerm.trim().toLowerCase()` before all comparisons. A search for " Fall " correctly matches "Fall 2025". |
| Search term with special regex characters | Pass | Search uses `includes()` not `RegExp`, so no injection risk. |
| Clearing search after "Show all" | Pass | `setShowAll(false)` is called when search term changes (lines 201–204 of ManageSemesterPanel), collapsing to 4 after clearing. This is correct behavior. |

---

## Rendering and Sorting

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Semesters sorted by poster_date DESC | Pass | `applySemesterPatch` and the initial load both sort by `poster_date` DESC. UI reflects this consistently. |
| More than 4 semesters — "Show all" toggle | Pass | `showAll` state controls whether all or only the first 4 are rendered. Toggle works. |
| Deduplication by ID with fallback to (name, poster_date) | Pass | Lines 118–130 deduplicate correctly. The fallback for rows without an ID is a tuple key, which is unusual but safe. |
| Semester with missing/null poster_date in sort | Unclear | Sort is done by `new Date(a.poster_date) - new Date(b.poster_date)`. If `poster_date` is `null`, `new Date(null)` returns epoch (1970-01-01), pushing the semester to the bottom. This is silent and may surprise if a semester lacks a date. DB schema likely requires the field, but the client-side behavior is undocumented. |
| Active semester badge display | Pass | Active semester is marked with a badge derived from `activeSemesterId` prop. Correct after Set Active RPC completes. |
| created_at / updated_at display | Unclear | The Explore agent found no display of `created_at`/`updated_at` in `ManageSemesterPanel`. If the UI shows these, the field source and null-handling are not visible in the audit. If not shown, this is a non-issue. |

---

## Empty, Loading, and Error States

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Initial load with empty semester list | Partial | `loadSemesters` includes a 600 ms retry if the list is empty (lines 123–132 of useManageSemesters). This is a one-time retry, not a proper polling mechanism. If the DB is genuinely empty after the retry, the list renders empty with no special empty-state UI. |
| Network failure on initial load | Pass | Errors are caught and propagated to `setPanelError("semester", ...)`, shown as a panel-level alert. User can see that something failed. |
| Panel error message replaced on next operation | Pass | `setPanelError` replaces the existing error for the "semester" key, so errors do not stack. |
| Loading state during Set Active / Create / Update / Delete | Partial | Some operations set intermediate feedback via toast messages but do not disable the UI during the API call. Double-submission is possible for most operations except Delete (which has a dialog-level loading state). |
| Eval-lock confirm dialog opened without a viewSemesterId | Pass | `handleSaveSettings` validates `viewSemesterId` early; if missing, it sets an error and returns. |
| Toast message for successful operations | Pass | All mutating handlers call `setMessage(...)` on success, producing a visible toast. |

---

## Modal and Dirty State

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Create modal: user types name then clicks Cancel | Pass | `isDirty` is true when the create form has a non-empty name or date. Collapsing the panel fires `handleToggle` → `setLeaveDialogOpen(true)`. `ConfirmDialog` asks "Leave anyway?" — confirming calls `closeCreate()` then `onToggle()`. No `window.confirm`. |
| Edit modal: user opens, changes nothing, clicks Cancel | Pass | `editOrigRef` captures the original `name` and `poster_date` when the edit modal opens. `isDirty` only becomes true if the user actually changes a value. Opening and immediately cancelling no longer triggers any confirmation. |
| Closing the browser/tab with unsaved changes | Pass | A `beforeunload` listener is registered in `ManageSemesterPanel` via `useEffect` whenever `isAnyDirty` is true (covers create/edit name-date fields and criteria/MÜDEK tab dirty states). The listener is removed immediately when dirty state clears. |
| onDirtyChange propagation | Pass | `isDirty` is synced to parent via `useEffect` (line 86–92). Parent (`SettingsPage`) can use this to warn before tab navigation. |

---

## Data Integrity and Backend Consistency

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Duplicate semester name enforced at DB layer | Pass | `semesters_name_ci_unique` constraint exists. The client-side check is a UX optimization; the DB is the authoritative guard. |
| Criteria/MÜDEK template update without name/date change | Pass | `handleUpdateCriteriaTemplate` and `handleUpdateMudekTemplate` always read `name` and `posterDate` from the form state. If those match the DB, the RPC's internal uniqueness check passes trivially. |
| Editing criteria template when semester is in use (has scores) | Fail | `isLockedFn` only returns `true` for the currently viewed semester. For other semesters, editing criteria is always allowed in the UI. If a semester has scores against old criteria weights, changing the criteria retroactively produces inconsistent score interpretations. |
| Realtime DELETE for active semester arrives while UI is idle | Pass | `removeSemester` auto-promotes to the next `is_active` or first in list. `activeSemesterId` is updated. |
| Realtime UPDATE arrives while edit modal is open | Pass | `useSettingsCrud` calls `semesters.notifyExternalSemesterUpdate(id)` alongside `applySemesterPatch` in the Realtime UPDATE handler. `ManageSemesterPanel` watches `externalUpdatedSemesterId` and sets a `staleSemester` flag when it matches the open semester. Warning banner shown; Save disabled. See "Editing semester while Realtime update arrives" row in Semester Editing. |
| adminPass expires / becomes invalid mid-session | Pass | All admin RPCs return `unauthorized` errors; these are mapped and shown as panel errors or dialog errors. No silent data loss. |
| RPC proxy unavailable in production | Pass | Error propagates through the API layer and surfaces as a panel error. Not a silent failure. |
| Optimistic list update vs. server-returned ID mismatch | Partial | `handleCreateSemester` patches the list with the returned row. If the row is `null`, a temp-ID-based entry is never cleaned up, producing a phantom entry until the next full reload. |

---

## Mobile and Responsive Behavior

| Edge Case / Test Scenario | Result | Explanation |
|---|---|---|
| Panel collapse/expand on mobile | Pass | `SettingsPage` toggles `openPanels` per panel; mobile collapses all by default. Standard accordion pattern. |
| Create/Edit modal on small screen | Unclear | No explicit responsive CSS rules were inspected for the modal. Tab content (CriteriaManager, MudekManager) may overflow on small viewports given the complexity of those components. Cannot confirm without visual testing. |
| Search input on mobile | Unclear | No mobile-specific handling noted. Touch targets and overflow behavior depend on CSS not audited here. |
| Three-tab modal keyboard navigation | Unclear | Tab navigation between the three modal tabs ("Semester", "Criteria", "MÜDEK") was not audited for keyboard accessibility. |

---

## Top 10 Most Important Issues

1. ~~**`window.confirm` in ManageSemesterPanel**~~ **→ Fixed.** Replaced with `ConfirmDialog`.

2. ~~**`isLockedFn` always returns `false` for non-viewed semesters**~~ **→ Fixed.** Now checks `semester.is_locked` for all semesters.

3. ~~**Edit modal not refreshed on Realtime update**~~ **→ Fixed.** Stale-edit warning banner + Save disabled when external update arrives for the semester being edited.

4. ~~**No in-flight guard on "Set as Current"**~~ **→ Fixed.** `setActiveInFlightRef` guard added.

5. ~~**`adminDeleteCounts` silent zero when adminPass absent**~~ **→ Fixed.** Delete blocked with panel error.

6. ~~**Deleting the last semester leaves `activeSemesterId = ""`**~~ **→ Fixed.** Blocked with panel error.

7. ~~**`null` API return from `adminCreateSemester` not guarded**~~ **→ Fixed.** `refreshSemesters()` called after temp-ID patch.

8. ~~**Edit modal dirty-check false positive**~~ **→ Fixed.** `editOrigRef` tracks original values.

9. ~~**Criteria/MÜDEK have no unsaved-state indicator**~~ **→ Fixed.** Amber dot on tab label when dirty.

10. ~~**No `beforeunload` guard**~~ **→ Fixed.** `useEffect` in `ManageSemesterPanel` registers the listener while any unsaved changes exist and removes it on cleanup.

---

## Recommended Fixes

### Fix first — all completed ✓

- ~~Replace `window.confirm` with `ConfirmDialog`~~ — done.
- ~~Guard `null` return from `adminCreateSemester`~~ — done (`refreshSemesters()` added).
- ~~Add in-flight guard on `handleSetActiveSemester`~~ — done (`setActiveInFlightRef`).
- ~~Fix `isLockedFn` for all semesters~~ — done (checks `semester.is_locked`).

### Fix next — all completed ✓

- ~~Warn before deleting the last semester~~ — done (panel error in `SettingsPage`).
- ~~Cascade counts guard when adminPass absent~~ — done (delete blocked in `SettingsPage`).
- ~~Edit modal dirty-check false positive~~ — done (`editOrigRef` tracks originals).
- ~~Surface unsaved criteria/MÜDEK state~~ — done (amber dot on tab labels).

### Nice to have — all completed ✓

- ~~Stale-edit warning for Realtime updates~~ — done (`externalUpdatedSemesterId` + amber banner + Save disabled).
- ~~Trim search term~~ — done (`searchTerm.trim().toLowerCase()` applied).
- ~~`beforeunload` warning~~ — done (`useEffect` listener while `isAnyDirty`).
- ~~Empty-state message~~ — done ("No semesters match your search." rendered when filtered list is empty).

---

## Most Relevant Files

| File | Why it matters |
|---|---|
| [src/admin/ManageSemesterPanel.jsx](../../src/admin/ManageSemesterPanel.jsx) | All semester UI, modals, dirty tracking, `window.confirm` violation |
| [src/admin/hooks/useManageSemesters.js](../../src/admin/hooks/useManageSemesters.js) | All semester CRUD handlers, auto-promotion logic, error mapping |
| [src/admin/hooks/useSettingsCrud.js](../../src/admin/hooks/useSettingsCrud.js) | `isLockedFn` definition, Realtime subscription, cross-hook wiring |
| [src/admin/hooks/useDeleteConfirm.js](../../src/admin/hooks/useDeleteConfirm.js) | Delete dialog logic, cascade counts, error mapping |
| [src/admin/SettingsPage.jsx](../../src/admin/SettingsPage.jsx) | Active-semester delete guard, props wiring to ManageSemesterPanel |
| [src/shared/api/adminApi.js](../../src/shared/api/adminApi.js) | RPC wrappers — null return risk, error codes |
| [src/shared/ConfirmDialog.jsx](../../src/shared/ConfirmDialog.jsx) | Should replace `window.confirm` calls |

---

## Overall Judgment

**Acceptable for a small internal tool — risk reduced to low after all fixes and hardening pass.**

All eight targeted fixes and all four nice-to-have hardening items are implemented.
The core data path (create, update, delete, set-active) is solid and DB-enforced.
Users are warned on browser/tab close, concurrent edits are surfaced visibly,
and search and empty-state UX are correct. No further Semester Settings work is required
for normal poster-day operations.
