# Remove `is_visible` from Periods & Clean Up Edit Drawer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `is_visible` column from the `periods` table, replace its RLS role with `is_locked = true`, and strip the Edit Period drawer down to metadata-only fields (name, description, dates).

**Architecture:** Four migration files are edited in-place (snapshot approach — no new migration file). API wrappers drop the parameter. The drawer loses two sections and all related state. Seed script column lists are updated. Migrations are applied to both vera-prod and vera-demo in the same step.

**Tech Stack:** PostgreSQL (Supabase), React, Vite, Supabase JS client

---

## Files Changed

| File | Change |
|------|--------|
| `sql/migrations/002_tables.sql` | Remove `is_visible` column from `periods` |
| `sql/migrations/003_helpers_and_triggers.sql` | Remove `is_visible` from audit trigger |
| `sql/migrations/004_rls.sql` | Replace `is_visible = true` with `is_locked = true` (5 locations) |
| `sql/migrations/006_rpcs_admin.sql` | Remove `is_visible` from `duplicate_period` INSERT |
| `sql/README.md` | Note updated migration scope |
| `src/shared/api/admin/periods.js` | Drop `is_visible` from `createPeriod` and `updatePeriod` |
| `src/shared/api/juryApi.js` | Remove `.eq("is_visible", true)` filter |
| `src/admin/drawers/AddEditPeriodDrawer.jsx` | Remove Evaluation Settings + Overview sections |
| `src/admin/pages/PeriodsPage.jsx` | Remove `is_locked`/`is_visible` from `handleSavePeriod` |
| `src/admin/hooks/useManagePeriods.js` | Remove `is_visible` from `handleUpdatePeriod` patch |
| `scripts/generate_demo_seed.js` | Remove `is_visible` from INSERT statements + UPDATE |

---

## Task 1: Update `002_tables.sql` — remove `is_visible` column

**Files:**
- Modify: `sql/migrations/002_tables.sql:154`

- [ ] **Step 1: Remove the column definition**

In `sql/migrations/002_tables.sql`, find and remove this line (around line 154):

```sql
  is_visible          BOOLEAN DEFAULT true,
```

The surrounding context before the change:
```sql
  is_locked           BOOLEAN DEFAULT false,
  is_visible          BOOLEAN DEFAULT true,
  activated_at        TIMESTAMPTZ,
```

After the change:
```sql
  is_locked           BOOLEAN DEFAULT false,
  activated_at        TIMESTAMPTZ,
```

- [ ] **Step 2: Verify no other `is_visible` references in `002_tables.sql`**

Run:
```bash
grep -n "is_visible" sql/migrations/002_tables.sql
```
Expected: no output.

---

## Task 2: Update `003_helpers_and_triggers.sql` — remove `is_visible` from audit trigger

**Files:**
- Modify: `sql/migrations/003_helpers_and_triggers.sql` (lines ~455–495)

- [ ] **Step 1: Remove `is_visible` from the trigger comment**

Find (around line 458):
```sql
-- is_visible, organization_id.
```

Replace with:
```sql
-- organization_id.
```

- [ ] **Step 2: Remove `is_visible` from the trigger condition**

Find (around line 491–493):
```sql
      NEW.framework_id    IS DISTINCT FROM OLD.framework_id    OR
      NEW.is_visible      IS DISTINCT FROM OLD.is_visible      OR
      NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
```

Replace with:
```sql
      NEW.framework_id    IS DISTINCT FROM OLD.framework_id    OR
      NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
```

- [ ] **Step 3: Verify no other `is_visible` in `003_helpers_and_triggers.sql`**

```bash
grep -n "is_visible" sql/migrations/003_helpers_and_triggers.sql
```
Expected: no output.

---

## Task 3: Update `004_rls.sql` — replace `is_visible = true` with `is_locked = true`

**Files:**
- Modify: `sql/migrations/004_rls.sql` (lines 307, 363, 628, 678, 721)

- [ ] **Step 1: Update `periods` SELECT policy (line 307)**

Find:
```sql
CREATE POLICY "periods_select_public_visible" ON periods
  FOR SELECT USING (is_visible = true);
```

Replace with:
```sql
CREATE POLICY "periods_select_public_visible" ON periods
  FOR SELECT USING (is_locked = true);
```

- [ ] **Step 2: Update `projects` SELECT policy (line ~363)**

Find:
```sql
CREATE POLICY "projects_select_public_by_period" ON projects
  FOR SELECT USING (
    period_id IN (SELECT id FROM periods WHERE is_visible = true)
  );
```

Replace with:
```sql
CREATE POLICY "projects_select_public_by_period" ON projects
  FOR SELECT USING (
    period_id IN (SELECT id FROM periods WHERE is_locked = true)
  );
```

- [ ] **Step 3: Update `period_criteria` SELECT policy (line ~628)**

Find:
```sql
CREATE POLICY "period_criteria_select_public" ON period_criteria FOR SELECT USING (
  period_id IN (SELECT id FROM periods WHERE is_visible = true)
);
```

Replace with:
```sql
CREATE POLICY "period_criteria_select_public" ON period_criteria FOR SELECT USING (
  period_id IN (SELECT id FROM periods WHERE is_locked = true)
);
```

- [ ] **Step 4: Update `period_outcomes` SELECT policy (line ~678)**

Find:
```sql
CREATE POLICY "period_outcomes_select_public" ON period_outcomes
  FOR SELECT USING (
    period_id IN (SELECT id FROM periods WHERE is_visible = true)
  );
```

Replace with:
```sql
CREATE POLICY "period_outcomes_select_public" ON period_outcomes
  FOR SELECT USING (
    period_id IN (SELECT id FROM periods WHERE is_locked = true)
  );
```

- [ ] **Step 5: Update `period_criterion_outcome_maps` SELECT policy (line ~721)**

Find:
```sql
CREATE POLICY "period_criterion_outcome_maps_select_public" ON period_criterion_outcome_maps
  FOR SELECT USING (
    period_id IN (SELECT id FROM periods WHERE is_visible = true)
  );
```

Replace with:
```sql
CREATE POLICY "period_criterion_outcome_maps_select_public" ON period_criterion_outcome_maps
  FOR SELECT USING (
    period_id IN (SELECT id FROM periods WHERE is_locked = true)
  );
```

- [ ] **Step 6: Verify all `is_visible` replaced in `004_rls.sql`**

```bash
grep -n "is_visible" sql/migrations/004_rls.sql
```
Expected: no output.

---

## Task 4: Update `006_rpcs_admin.sql` — remove `is_visible` from `duplicate_period`

**Files:**
- Modify: `sql/migrations/006_rpcs_admin.sql` (lines ~2616, 2662–2672)

- [ ] **Step 1: Remove `is_visible` from the RPC comment**

Find (around line 2616):
```sql
--     is_locked=false, is_visible=true, criteria_name copied)
```

Replace with:
```sql
--     is_locked=false, criteria_name copied)
```

- [ ] **Step 2: Remove `is_visible` from the INSERT column list and VALUES**

Find (around lines 2660–2673):
```sql
  INSERT INTO periods (
    organization_id, framework_id, name, season, description,
    start_date, end_date, is_locked, is_visible, criteria_name
  ) VALUES (
    v_src.organization_id,
    v_new_fw_id,
    v_new_name,
    v_src.season,
    v_src.description,
    NULL,
    NULL,
    false,
    true,
    v_src.criteria_name
  )
```

Replace with:
```sql
  INSERT INTO periods (
    organization_id, framework_id, name, season, description,
    start_date, end_date, is_locked, criteria_name
  ) VALUES (
    v_src.organization_id,
    v_new_fw_id,
    v_new_name,
    v_src.season,
    v_src.description,
    NULL,
    NULL,
    false,
    v_src.criteria_name
  )
```

- [ ] **Step 3: Verify no other `is_visible` in `006_rpcs_admin.sql`**

```bash
grep -n "is_visible" sql/migrations/006_rpcs_admin.sql
```
Expected: no output.

---

## Task 5: Commit migration changes + update `sql/README.md`

- [ ] **Step 1: Update `sql/README.md`**

Find the line describing `002_tables` and add a note that `is_visible` was removed. Find the line describing `004_rls` and note that jury SELECT policies now use `is_locked = true`. The exact edits depend on the current README content — just ensure the description accurately reflects the final state.

- [ ] **Step 2: Commit migrations**

```bash
git add sql/migrations/002_tables.sql sql/migrations/003_helpers_and_triggers.sql sql/migrations/004_rls.sql sql/migrations/006_rpcs_admin.sql sql/README.md
git commit -m "feat(db): remove is_visible from periods, replace RLS gate with is_locked"
```

---

## Task 6: Apply migrations to both Supabase environments

Apply to **vera-prod** first, then **vera-demo** in the same session. Use Supabase MCP.

- [ ] **Step 1: Apply `002_tables.sql` to vera-prod**

Execute via `mcp__claude_ai_Supabase__execute_sql` (vera-prod project):

```sql
ALTER TABLE periods DROP COLUMN IF EXISTS is_visible;
```

- [ ] **Step 2: Apply `004_rls.sql` policy changes to vera-prod**

Execute via `mcp__claude_ai_Supabase__execute_sql` (vera-prod project):

```sql
-- Drop old policies
DROP POLICY IF EXISTS "periods_select_public_visible" ON periods;
DROP POLICY IF EXISTS "projects_select_public_by_period" ON projects;
DROP POLICY IF EXISTS "period_criteria_select_public" ON period_criteria;
DROP POLICY IF EXISTS "period_outcomes_select_public" ON period_outcomes;
DROP POLICY IF EXISTS "period_criterion_outcome_maps_select_public" ON period_criterion_outcome_maps;

-- Re-create with is_locked = true
CREATE POLICY "periods_select_public_visible" ON periods
  FOR SELECT USING (is_locked = true);

CREATE POLICY "projects_select_public_by_period" ON projects
  FOR SELECT USING (
    period_id IN (SELECT id FROM periods WHERE is_locked = true)
  );

CREATE POLICY "period_criteria_select_public" ON period_criteria FOR SELECT USING (
  period_id IN (SELECT id FROM periods WHERE is_locked = true)
);

CREATE POLICY "period_outcomes_select_public" ON period_outcomes
  FOR SELECT USING (
    period_id IN (SELECT id FROM periods WHERE is_locked = true)
  );

CREATE POLICY "period_criterion_outcome_maps_select_public" ON period_criterion_outcome_maps
  FOR SELECT USING (
    period_id IN (SELECT id FROM periods WHERE is_locked = true)
  );
```

- [ ] **Step 3: Apply `003_helpers_and_triggers.sql` trigger update to vera-prod**

Execute via `mcp__claude_ai_Supabase__execute_sql` (vera-prod project) — paste the full updated `trigger_block_periods_on_locked_mutate` function body from the migration file (the `CREATE OR REPLACE FUNCTION` block). The trigger rebuild replaces the old version in-place.

- [ ] **Step 4: Apply `006_rpcs_admin.sql` RPC update to vera-prod**

Execute via `mcp__claude_ai_Supabase__execute_sql` (vera-prod project) — paste the full updated `rpc_admin_duplicate_period` function body.

- [ ] **Step 5: Repeat Steps 1–4 for vera-demo**

Same SQL, different project ref.

- [ ] **Step 6: Verify column is gone on vera-prod**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'periods' AND column_name = 'is_visible';
```
Expected: 0 rows.

---

## Task 7: Update API — `src/shared/api/admin/periods.js`

**Files:**
- Modify: `src/shared/api/admin/periods.js:46-86`

- [ ] **Step 1: Remove `is_visible` from `createPeriod`**

Find (lines 46–64):
```js
export async function createPeriod(payload) {
  const { data, error } = await supabase
    .from("periods")
    .insert({
      organization_id: payload.organizationId,
      name: payload.name,
      season: payload.season || null,
      description: payload.description || null,
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
      is_locked: payload.is_locked ?? false,
      is_visible: payload.is_visible ?? true,
      framework_id: payload.framework_id || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

Replace with:
```js
export async function createPeriod(payload) {
  const { data, error } = await supabase
    .from("periods")
    .insert({
      organization_id: payload.organizationId,
      name: payload.name,
      season: payload.season || null,
      description: payload.description || null,
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
      is_locked: payload.is_locked ?? false,
      framework_id: payload.framework_id || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Remove `is_visible` from `updatePeriod`**

Find (lines 66–86):
```js
export async function updatePeriod({ id, name, season, description, start_date, end_date, is_locked, is_visible, framework_id }) {
  if (!id) throw new Error("updatePeriod: id required");
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (season !== undefined) updates.season = season;
  if (description !== undefined) updates.description = description;
  if (start_date !== undefined) updates.start_date = start_date;
  if (end_date !== undefined) updates.end_date = end_date;
  if (is_locked !== undefined) updates.is_locked = is_locked;
  if (is_visible !== undefined) updates.is_visible = is_visible;
  if (framework_id !== undefined) updates.framework_id = framework_id;
  ...
}
```

Replace the signature and body:
```js
export async function updatePeriod({ id, name, season, description, start_date, end_date, is_locked, framework_id }) {
  if (!id) throw new Error("updatePeriod: id required");
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (season !== undefined) updates.season = season;
  if (description !== undefined) updates.description = description;
  if (start_date !== undefined) updates.start_date = start_date;
  if (end_date !== undefined) updates.end_date = end_date;
  if (is_locked !== undefined) updates.is_locked = is_locked;
  if (framework_id !== undefined) updates.framework_id = framework_id;

  const { data, error } = await supabase
    .from("periods")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

---

## Task 8: Update API — `src/shared/api/juryApi.js`

**Files:**
- Modify: `src/shared/api/juryApi.js:215–224`

- [ ] **Step 1: Remove `.eq("is_visible", true)` filter**

Find (around line 219):
```js
export async function listPeriods(signal) {
  let query = supabase
    .from("periods")
    .select("id, name, is_locked, closed_at, organization_id, framework_id, snapshot_frozen_at, end_date, organizations(code, name, institution, contact_email)")
    .eq("is_visible", true)
    .order("created_at", { ascending: false });
```

Replace with:
```js
export async function listPeriods(signal) {
  let query = supabase
    .from("periods")
    .select("id, name, is_locked, closed_at, organization_id, framework_id, snapshot_frozen_at, end_date, organizations(code, name, institution, contact_email)")
    .order("created_at", { ascending: false });
```

- [ ] **Step 2: Commit API changes**

```bash
git add src/shared/api/admin/periods.js src/shared/api/juryApi.js
git commit -m "feat(api): remove is_visible from createPeriod, updatePeriod, juryApi listPeriods"
```

---

## Task 9: Update `AddEditPeriodDrawer.jsx` — remove Evaluation Settings + Overview

**Files:**
- Modify: `src/admin/drawers/AddEditPeriodDrawer.jsx`

- [ ] **Step 1: Remove `LOCK_OPTIONS`, `VISIBILITY_OPTIONS` constants**

Remove (lines 22–30):
```js
const LOCK_OPTIONS = [
  { value: "open", label: "Open — scoring enabled" },
  { value: "locked", label: "Locked — scores finalized" },
];

const VISIBILITY_OPTIONS = [
  { value: "visible", label: "Visible to all admins" },
  { value: "hidden", label: "Hidden (archived)" },
];
```

- [ ] **Step 2: Remove unused imports**

Remove from the import line at the top:
- `getPeriodCounts` from `"@/shared/api"`
- `CustomSelect` from `"@/shared/ui/CustomSelect"` (only used by the removed sections — verify it's not used elsewhere in the file before removing)

- [ ] **Step 3: Remove state declarations for lock, visibility, counts**

Remove these lines inside the component (around lines 45–49):
```js
  const [formIsLocked, setFormIsLocked] = useState("open");
  const [formIsVisible, setFormIsVisible] = useState("visible");

  const [counts, setCounts] = useState(null);
  const [countsLoading, setCountsLoading] = useState(false);
```

- [ ] **Step 4: Remove `is_locked`/`is_visible` initialization from the `useEffect`**

Find in the useEffect (around lines 61–62):
```js
    setFormIsLocked(period?.is_locked ? "locked" : "open");
    setFormIsVisible(period?.is_visible === false ? "hidden" : "visible");
```
And (around lines 66–67):
```js
    setCounts(null);

    if (isEdit && period?.id) {
      setCountsLoading(true);
      getPeriodCounts(period.id)
        .then(setCounts)
        .catch(() => setCounts(null))
        .finally(() => setCountsLoading(false));
    }
```

Remove all of the above lines.

- [ ] **Step 5: Remove `is_locked`/`is_visible` from the `onSave` payload**

Find (around lines 92–99):
```js
      await onSave?.({
        name: formName.trim(),
        description: formDescription.trim() || null,
        start_date: formStartDate || null,
        end_date: formEndDate || null,
        is_locked: formIsLocked === "locked",
        is_visible: formIsVisible === "visible",
      });
```

Replace with:
```js
      await onSave?.({
        name: formName.trim(),
        description: formDescription.trim() || null,
        start_date: formStartDate || null,
        end_date: formEndDate || null,
      });
```

- [ ] **Step 6: Remove the Evaluation Settings JSX section**

Remove this entire block (around lines 218–252):
```jsx
        {/* ── EDIT MODE: EVALUATION SETTINGS ── */}
        {isEdit && (
          <div className="fs-section">
            <div className="fs-section-header">
              <div className="fs-section-title">Evaluation Settings</div>
            </div>

            <div className="fs-field">
              <label className="fs-field-label">Evaluation Lock</label>
              <CustomSelect
                value={formIsLocked}
                onChange={setFormIsLocked}
                options={LOCK_OPTIONS}
                disabled={saving}
                ariaLabel="Evaluation lock"
              />
              <div className="fs-field-helper hint">
                {formIsLocked === "locked"
                  ? "Scoring is closed — scores are finalized and read-only."
                  : "Scoring is open — jurors can submit and edit evaluations."}
              </div>
            </div>

            <div className="fs-field">
              <label className="fs-field-label">Visibility</label>
              <CustomSelect
                value={formIsVisible}
                onChange={setFormIsVisible}
                options={VISIBILITY_OPTIONS}
                disabled={saving}
                ariaLabel="Visibility"
              />
            </div>
          </div>
        )}
```

- [ ] **Step 7: Remove the Overview JSX section**

Remove this entire block (around lines 256–289):
```jsx
        {/* ── EDIT MODE: OVERVIEW ── */}
        {isEdit && (
          <div className="fs-section">
            <div className="fs-section-header">
              <div className="fs-section-title">Overview</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Project Groups", value: countsLoading ? "…" : (Number(counts?.project_count) > 0 ? counts.project_count : "—") },
                { label: "Jurors", value: countsLoading ? "…" : counts?.juror_count ?? "—" },
                { label: "Scores Recorded", value: countsLoading ? "…" : counts?.score_count ?? "—" },
                { label: "Created", value: formatDate(period?.created_at) },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    padding: "10px 12px",
                    background: "var(--surface-1)",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--mono)", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2, fontWeight: 500 }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
```

- [ ] **Step 8: Check if `formatDate` import is still needed**

`formatDate` was only used by the Overview section. If it has no other usages in the file:

```bash
grep -n "formatDate" src/admin/drawers/AddEditPeriodDrawer.jsx
```

If zero results after the removal, remove the import line:
```js
import { formatDate } from "@/shared/lib/dateUtils";
```

- [ ] **Step 9: Verify the drawer renders cleanly**

Run `npm run dev` and open Edit Period drawer for an existing period. It should show only: Period Name, Description, Start Date, End Date, Save/Cancel buttons. No Evaluation Settings, no Overview.

---

## Task 10: Update `PeriodsPage.jsx` — remove `is_locked`/`is_visible` from `handleSavePeriod`

**Files:**
- Modify: `src/admin/pages/PeriodsPage.jsx:899–928`

- [ ] **Step 1: Remove `is_locked` and `is_visible` from both save paths**

Find (around lines 899–928):
```js
  async function handleSavePeriod(data) {
    if (periodDrawerTarget) {
      const result = await periods.handleUpdatePeriod({
        id: periodDrawerTarget.id,
        name: data.name,
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date,
        is_locked: data.is_locked,
        is_visible: data.is_visible,
      });
      ...
    } else {
      const result = await periods.handleCreatePeriod({
        name: data.name,
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date,
        is_locked: data.is_locked,
        is_visible: data.is_visible,
      });
```

Replace both payloads (keep `id` in the update path):
```js
  async function handleSavePeriod(data) {
    if (periodDrawerTarget) {
      const result = await periods.handleUpdatePeriod({
        id: periodDrawerTarget.id,
        name: data.name,
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date,
      });
      ...
    } else {
      const result = await periods.handleCreatePeriod({
        name: data.name,
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date,
      });
```

---

## Task 11: Update `useManagePeriods.js` — remove `is_visible` from patch

**Files:**
- Modify: `src/admin/hooks/useManagePeriods.js:365–377`

- [ ] **Step 1: Remove `is_locked` and `is_visible` from `applyPeriodPatch` call**

Find (around lines 366–377):
```js
      applyPeriodPatch({
        id: payload.id,
        name: payload.name,
        description: payload.description,
        start_date: payload.start_date,
        end_date: payload.end_date,
        is_locked: payload.is_locked,
        is_visible: payload.is_visible,
        ...(payload.criteria_config !== undefined ? { criteria_config: payload.criteria_config } : {}),
        ...(payload.outcome_config !== undefined ? { outcome_config: payload.outcome_config } : {}),
      });
```

Replace with:
```js
      applyPeriodPatch({
        id: payload.id,
        name: payload.name,
        description: payload.description,
        start_date: payload.start_date,
        end_date: payload.end_date,
        ...(payload.criteria_config !== undefined ? { criteria_config: payload.criteria_config } : {}),
        ...(payload.outcome_config !== undefined ? { outcome_config: payload.outcome_config } : {}),
      });
```

- [ ] **Step 2: Commit frontend changes**

```bash
git add src/admin/drawers/AddEditPeriodDrawer.jsx src/admin/pages/PeriodsPage.jsx src/admin/hooks/useManagePeriods.js
git commit -m "feat(ui): remove Evaluation Settings and Overview from Edit Period drawer"
```

---

## Task 12: Update `scripts/generate_demo_seed.js`

**Files:**
- Modify: `scripts/generate_demo_seed.js` (lines ~1413, ~1431, ~3194)

- [ ] **Step 1: Remove `is_visible` from the draft period INSERT (line ~1413)**

Find:
```js
      out.push(`INSERT INTO periods (id, organization_id, framework_id, name, season, description, start_date, end_date, is_locked, is_visible, criteria_name, snapshot_frozen_at, activated_at, closed_at, updated_at) VALUES ('${pId}', '${o.id}', '${fwId}', '${escapeSql(d.name)}', ${sn}, '${escapeSql(d.desc)}', '${d.start}', '${d.end}', false, false, '${escapeSql(criteriaName)}', NULL, NULL, NULL, ${draftTs}) ON CONFLICT DO NOTHING;`);
```

Replace with:
```js
      out.push(`INSERT INTO periods (id, organization_id, framework_id, name, season, description, start_date, end_date, is_locked, criteria_name, snapshot_frozen_at, activated_at, closed_at, updated_at) VALUES ('${pId}', '${o.id}', '${fwId}', '${escapeSql(d.name)}', ${sn}, '${escapeSql(d.desc)}', '${d.start}', '${d.end}', false, '${escapeSql(criteriaName)}', NULL, NULL, NULL, ${draftTs}) ON CONFLICT DO NOTHING;`);
```

- [ ] **Step 2: Remove `is_visible` from the active period INSERT (line ~1431)**

Find:
```js
    out.push(`INSERT INTO periods (id, organization_id, framework_id, name, season, description, start_date, end_date, is_locked, is_visible, criteria_name, snapshot_frozen_at, activated_at, closed_at, updated_at) VALUES ('${pId}', '${o.id}', '${fwId}', '${escapeSql(d.name)}', ${sn}, '${escapeSql(d.desc)}', ${startDateSql}, ${endDateSql}, false, true, '${escapeSql(criteriaName)}', ${frozenTs}, ${activatedTs}, ${closedAtSql}, ${updatedTs}) ON CONFLICT DO NOTHING;`);
```

Replace with:
```js
    out.push(`INSERT INTO periods (id, organization_id, framework_id, name, season, description, start_date, end_date, is_locked, criteria_name, snapshot_frozen_at, activated_at, closed_at, updated_at) VALUES ('${pId}', '${o.id}', '${fwId}', '${escapeSql(d.name)}', ${sn}, '${escapeSql(d.desc)}', ${startDateSql}, ${endDateSql}, false, '${escapeSql(criteriaName)}', ${frozenTs}, ${activatedTs}, ${closedAtSql}, ${updatedTs}) ON CONFLICT DO NOTHING;`);
```

- [ ] **Step 3: Remove `is_visible` from the bulk UPDATE (line ~3194)**

Find:
```js
out.push(`UPDATE periods SET is_locked = true WHERE activated_at IS NOT NULL AND is_visible = true;`);
```

Replace with:
```js
out.push(`UPDATE periods SET is_locked = true WHERE activated_at IS NOT NULL;`);
```

- [ ] **Step 4: Verify no remaining `is_visible` in the seed script**

```bash
grep -n "is_visible" scripts/generate_demo_seed.js
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate_demo_seed.js
git commit -m "chore(seed): remove is_visible from generate_demo_seed.js inserts"
```

---

## Task 13: Final verification

- [ ] **Step 1: Build passes**

```bash
npm run build
```
Expected: exit 0, no TypeScript/Babel errors.

- [ ] **Step 2: Unit tests pass**

```bash
npm test -- --run
```
Expected: all pass.

- [ ] **Step 3: Check for any stray `is_visible` references in src/**

```bash
grep -rn "is_visible" src/
```
Expected: no output.

- [ ] **Step 4: Manual smoke test**
  - Open `/admin/periods` in the running dev server.
  - Click "Edit Evaluation Period" from the kebab menu — drawer should show only Period Details section (name, description, dates). No Evaluation Settings, no Overview.
  - Edit the period name and save — period name updates in the table.
  - Create a new period — same drawer, same fields only.
  - Confirm Publish/Revert/Close actions still work from the kebab menu (they don't touch `is_visible`).
