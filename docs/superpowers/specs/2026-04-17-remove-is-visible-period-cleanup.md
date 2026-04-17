# Remove `is_visible` from Periods & Clean Up Edit Drawer

**Date:** 2026-04-17
**Status:** Approved

## Background

`is_visible` was originally a manual toggle letting admins hide/archive a period from jury access. With the introduction of the 5-state lifecycle (`draft → published → live → closed`) this field is redundant:

- Jury access is gated by entry token (revoked on Close), not by `is_visible`.
- The `closed_at` column already captures the "archived" concept.
- The `is_locked = true` condition already distinguishes published/live/closed periods from drafts — which is the only distinction that matters for RLS.

Additionally, the Edit Period drawer (`AddEditPeriodDrawer`) currently shows an "Evaluation Settings" section (Lock + Visibility dropdowns) and an "Overview" stats grid in edit mode. These are being removed:

- Lock state is lifecycle-managed via dedicated actions (Publish, Revert to Draft, Close). Exposing it in the edit drawer bypasses the lifecycle model.
- The Overview stats are redundant — the table already shows project count, juror count, and progress.

## Goals

1. Remove `is_visible` column from `periods` table and all references.
2. Replace `is_visible = true` RLS filter with `is_locked = true`.
3. Strip the Edit drawer down to metadata-only: name, description, start date, end date.

## Out of Scope

- Changes to entry token revocation logic (already correct).
- Changes to `is_locked` lifecycle (Publish / Revert / Close actions are unchanged).
- Any new UI for period visibility or archiving.

---

## Changes

### DB Migrations (apply to both vera-prod and vera-demo)

#### `002_tables.sql`
- Remove `is_visible BOOLEAN DEFAULT true` from `periods` table definition.

#### `004_rls.sql`
Replace all occurrences of `is_visible = true` with `is_locked = true` (grep finds 5 lines: line 307 on `periods` directly, lines 363/628/678/721 on child tables via subquery):

| Location | Old | New |
|----------|-----|-----|
| `periods` SELECT policy | `is_visible = true` | `is_locked = true` |
| Child-table SELECT policies (×4) | `period_id IN (SELECT id FROM periods WHERE is_visible = true)` | `period_id IN (SELECT id FROM periods WHERE is_locked = true)` |

#### `003_helpers_and_triggers.sql`
- Remove `NEW.is_visible IS DISTINCT FROM OLD.is_visible OR` line from the audit trigger condition.
- Remove `is_visible` from the trigger comment listing tracked columns.

#### `006_rpcs_admin.sql`
- Remove `is_visible` from the `duplicate_period` RPC column list (INSERT and VALUES).

### API Layer

#### `src/shared/api/admin/periods.js`
- `createPeriod`: remove `is_visible` from payload and INSERT.
- `updatePeriod`: remove `is_visible` parameter and conditional assignment.

#### `src/shared/api/juryApi.js`
- Remove `.eq("is_visible", true)` filter (line ~219). Now covered by RLS.

### Frontend

#### `src/admin/drawers/AddEditPeriodDrawer.jsx`
Remove from edit mode:
- `Evaluation Settings` section (Lock CustomSelect + hint text, Visibility CustomSelect)
- `Overview` section (stats grid with project/juror/score counts + created date)

Remove entirely:
- `LOCK_OPTIONS` and `VISIBILITY_OPTIONS` constants
- `formIsLocked`, `formIsVisible` state
- `counts`, `countsLoading` state
- `getPeriodCounts` import and effect
- `is_locked`, `is_visible` from `onSave` payload

`onSave` payload becomes: `{ name, description, start_date, end_date }`.

#### `src/admin/pages/PeriodsPage.jsx`
- `handleSavePeriod`: remove `is_locked` and `is_visible` from both the create and update call payloads.

#### `src/admin/hooks/useManagePeriods.js`
- `handleUpdatePeriod`: remove `is_visible` from the parameters passed to `updatePeriod`.

### Seed Scripts

#### `scripts/generate_demo_seed.js`
- Remove `is_visible` from both INSERT column lists (draft rows and published rows).
- Remove `UPDATE periods SET is_locked = true WHERE activated_at IS NOT NULL AND is_visible = true` — replace with `UPDATE periods SET is_locked = true WHERE activated_at IS NOT NULL`.

---

## RLS Replacement Rationale

`is_visible = true` was used to prevent jury users from querying draft periods' data. With `is_locked = true` as the replacement:

- Draft periods (`is_locked = false`) are invisible to jury — correct.
- Published/Live/Closed periods (`is_locked = true`) are accessible — correct.
- Closed periods remain accessible at the RLS level, but jury can't actually reach them because the entry token is revoked on Close. This is fine.

## Testing Checklist

- [ ] Fresh DB from `000→009` migrations passes without error.
- [ ] Jury entry flow works for a Published period.
- [ ] Jury entry is blocked for a Draft period (no token, RLS blocks direct query).
- [ ] Edit Period drawer saves name/description/dates only; no lock or visibility fields sent.
- [ ] Duplicate Period action works (no `is_visible` in INSERT).
- [ ] Audit trigger does not reference `is_visible`.
