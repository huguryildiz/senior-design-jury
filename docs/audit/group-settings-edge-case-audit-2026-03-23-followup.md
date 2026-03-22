# Group Settings Edge-Case Audit — Follow-Up Status

**Audit date:** 2026-03-23
**Remediation completed:** 2026-03-23
**Original audit:** `docs/audit/group-settings-edge-cases-audit.md`

---

## Fixed (fully resolved)

| Issue | Severity | Fix |
|---|---|---|
| A.1 Semester switch corrupts edit | High | `semesterId` locked in `editForm` at open; passed as `semesterId` to hook — edit always targets the semester the group belongs to |
| A.2 Edit modal closes on failure | High | Save result checked; modal stays open on `res?.ok === false` with in-modal `role="alert"` error; only closes on success |
| A.3 Delete with missing `p.id` | High | Guard added before `onDeleteProject`; shows panel error if `id` is falsy, no server call made |
| A.4 Premature import success | Medium | `setImportSuccess` moved to after `onImport` resolves; success only shown when `res?.ok` is truthy |
| A.5 Silent `loadProjects` failure | Medium | `try/catch` added; `setPanelError("projects", msg)` called on failure instead of silently setting empty list |
| B.6 `window.confirm` | Medium | Replaced with `ConfirmDialog` (title "Unsaved Changes", tone "caution") |
| B.7 Empty CSV no feedback | Medium | Explicit check after `parseCsv` returns empty array; sets import error message |
| B.8 No `loadProjects` after import | Medium | `loadProjects(viewSemesterId)` called after successful import loop in `handleImportProjects` |
| B.9 Cross-semester patch risk | Medium | `applyProjectPatch` fallback now requires `patch.semester_id`; patch without id+semester_id appends as new row |
| C.10 `aria-label` typo | Low | Fixed: `"Remove student ${idx + 1}"` (was `"tudent ${idx + 1}"`) in add modal student list |
| C.12 Duplicate student names stored | Low | `normalizeStudentNames` now deduplicates (first-occurrence order) via `filter((n, i, a) => a.indexOf(n) === i)` |
| C.13 No `group_no` upper bound | Low | `group_no > 999` rejected in CSV import validation and create form (error: "Group number must be between 1 and 999.") |
| C.14 Confusing prop naming | Low | `activeSemesterName` removed from `ManageProjectsPanel`; single `semesterName` prop used throughout |

## Partially Fixed

| Issue | Severity | Notes |
|---|---|---|
| C.11 No import abort | Low | Soft-cancel via `importCancelRef`: loop stops between rows when Cancel/Stop clicked during import. Cancel button label changes to "Stop" while import is in flight. True per-request abort is not feasible with the current Supabase RPC wrappers — each `adminCreateProject` call runs to completion before the next row is checked. |

## Not in Scope

No items were deferred or skipped.

---

## Automated Tests Added

All new test IDs were registered in `src/test/qa-catalog.json` before writing tests.

| Test ID | Description | File |
|---|---|---|
| `auditUtils.dedup.01` | `normalizeStudentNames` deduplicates identical names | `auditUtils.test.js` |
| `auditUtils.dedup.02` | Deduplication preserves first-occurrence order | `auditUtils.test.js` |
| `groups.csv.09` | `group_no > 999` rejected in CSV import | `ManageProjectsPanel.test.jsx` |
| `groups.create.01` | `group_no > 999` rejected in add form | `ManageProjectsPanel.test.jsx` |
| `groups.edit.01` | Edit modal stays open with in-modal error on save failure | `ManageProjectsPanel.test.jsx` |
| `groups.delete.02` | Delete blocked with panel error when `p.id` is missing | `ManageProjectsPanel.test.jsx` |
| `groups.import.02` | Error shown for empty CSV file | `ManageProjectsPanel.test.jsx` |

---

## Commits

| Commit | Description |
|---|---|
| `fix: deduplicate student names in normalizeStudentNames` | Task 1: C.12 |
| `fix: surface loadProjects failures as panel-level error` | Task 2: A.5 |
| `fix: require semester_id in applyProjectPatch fallback` | Task 3: B.9 |
| `fix: reject group_no > 999 in create form and CSV import` | Task 4: C.13 |
| `fix: lock semesterId in editForm; keep edit modal open on failure` | Task 5: A.1 + A.2 |
| `fix: import hardening — empty CSV, deferred success, post-import refresh, soft-cancel` | Task 6: A.4 + B.7 + B.8 + C.11 |
| `fix: block delete when project id is missing` | Task 7: A.3 |
| `fix: replace window.confirm with ConfirmDialog` | Task 8: B.6 |
| `fix: correct remove-student aria-label typo; unify semesterName prop` | Task 9: C.10 + C.14 |

---

## Manual Retest Recommended

The following scenarios were fixed in code and covered by new automated tests, but should also be verified manually against the running application:

- **Edit semester lock:** Open edit for a group → switch the viewed semester dropdown → save → confirm the save targets the original group's semester, not the newly viewed one
- **Edit failure recovery:** Simulate a network failure during edit save (e.g., disconnect) → modal stays open with in-modal error → retry succeeds → modal closes, success toast appears
- **Import Cancel/Stop:** Start a CSV import with many rows → click Stop mid-import → verify loop halts cleanly, partial rows saved, error message appears
- **Delete no-id guard:** Force a project into state with no server id (e.g., optimistic patch before refresh) → click delete → verify no dialog opens, panel error appears
- **Empty CSV drop:** Drop or select an empty file in the import modal → verify error appears immediately without a progress spinner
- **Unsaved-changes ConfirmDialog:** Fill part of the add form → click the Group Settings panel toggle → verify `ConfirmDialog` appears (not a native browser dialog) → click "Keep Editing" → panel stays open → click "Leave Anyway" → panel closes
- **Remove student aria-label:** Open add group form → add 2+ students → use a screen reader or accessibility inspector → verify "Remove student 1", "Remove student 2" labels are announced
