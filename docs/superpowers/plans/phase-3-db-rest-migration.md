# Phase 3 — DB Schema Rewrite + REST API Migration

> **Status as of 2026-04-01:** All 22 tasks complete. Manual smoke test (Task 22 Step 4)
> blocked until migrations are applied to demo Supabase instance (`kmprsxrofnemmsryjhfj`).
> **Commits:** `b33d3c8`, `94dd654` on branch `feature/db-rest-migration` → merged to `main`.
> **Tests:** 427/427 passing.

---

## Context

The previous codebase had 23 incremental migration files (`sql/migrations/001–023`) that
accumulated tech debt: bad column names, removed features, inconsistent naming, RPC-heavy API.

**We deleted all 23 files and rewrote the schema from scratch.**

No backward compatibility. No legacy RPCs. Clean, intentional design from day one.

**Tech stack:** React + Vite + Tailwind CSS v4 + shadcn/ui + Supabase (PostgreSQL + Auth +
PostgREST + Edge Functions).

---

## Architectural Decision: REST API (not RPC-based)

### Previous approach (removed)

All Supabase calls went through hand-written RPC functions (40+):

```js
supabase.rpc('rpc_admin_semester_list', { p_tenant_id: orgId })
```

### New approach

Use Supabase's auto-generated PostgREST REST API via the JS client query builder:

```js
// List periods
supabase.from('periods')
  .select('*')
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false })

// Scores with joins
supabase.from('scores')
  .select(`*, project:projects(title, members), juror:jurors(juror_name, affiliation)`)
  .eq('period_id', periodId)
```

**Authorization is enforced by Row Level Security (RLS) policies** — not by RPC function guards.

### What still uses RPCs

Only genuinely complex stateful operations stay as RPCs:

| Operation | Reason |
|---|---|
| `rpc_jury_authenticate` | PIN verification + session token creation |
| `rpc_jury_validate_entry_token` | Token lookup + TTL check + rate limiting |
| `rpc_jury_upsert_scores` | Batch score write with deduplication |
| `rpc_admin_approve_application` | Creates Supabase Auth user + membership atomically |

Everything else (CRUD for periods, projects, jurors, organizations, outcomes, frameworks) is
done via REST.

---

## New Database Schema (14 tables)

### `organizations` (was `tenants`)

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            TEXT NOT NULL
short_name      TEXT
contact_email   TEXT
status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'limited', 'disabled', 'archived'))
created_at      TIMESTAMPTZ DEFAULT now()
```

### `profiles`

```sql
id              UUID PRIMARY KEY REFERENCES auth.users(id)
display_name    TEXT
avatar_url      TEXT
created_at      TIMESTAMPTZ DEFAULT now()
```

### `memberships`

```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE  -- NULL = super admin
role              TEXT NOT NULL DEFAULT 'admin'
                    CHECK (role IN ('admin', 'super_admin'))
created_at        TIMESTAMPTZ DEFAULT now()
UNIQUE(user_id, organization_id)
```

### `tenant_applications`

```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_name   TEXT NOT NULL
contact_email       TEXT NOT NULL
applicant_name      TEXT NOT NULL
message             TEXT
status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected'))
reviewed_by         UUID REFERENCES profiles(id)
reviewed_at         TIMESTAMPTZ
created_at          TIMESTAMPTZ DEFAULT now()
```

### `frameworks`

```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE
                    -- NULL = global built-in (MÜDEK, ABET)
name              TEXT NOT NULL  -- 'MÜDEK', 'ABET', 'Custom'
description       TEXT
is_default        BOOLEAN DEFAULT false
created_at        TIMESTAMPTZ DEFAULT now()
```

### `outcomes`

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
framework_id  UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE
code          TEXT NOT NULL   -- 'PO1', 'SO a', 'PÇ-1', etc.
label         TEXT NOT NULL   -- short display label
description   TEXT
sort_order    INT DEFAULT 0
created_at    TIMESTAMPTZ DEFAULT now()
```

### `periods` (was `semesters`)

```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
name              TEXT NOT NULL
season            TEXT CHECK (season IN ('Fall', 'Spring', 'Summer'))
description       TEXT
start_date        DATE
end_date          DATE
framework_id      UUID REFERENCES frameworks(id)  -- accreditation framework for this period
is_current        BOOLEAN DEFAULT false
is_locked         BOOLEAN DEFAULT false
is_visible        BOOLEAN DEFAULT true
outcome_config    JSONB   -- per-period outcome overrides
criteria_config   JSONB   -- per-period criteria/weight overrides
created_at        TIMESTAMPTZ DEFAULT now()
```

### `projects`

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
period_id   UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE
title       TEXT NOT NULL
members     TEXT   -- team members (comma-separated or freeform)
advisor     TEXT   -- faculty advisor / mentor
description TEXT
created_at  TIMESTAMPTZ DEFAULT now()
```

### `jurors`

```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
juror_name        TEXT NOT NULL
affiliation       TEXT NOT NULL   -- was juror_inst
email             TEXT
notes             TEXT            -- internal admin notes
created_at        TIMESTAMPTZ DEFAULT now()
```

### `scores`

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
juror_id    UUID NOT NULL REFERENCES jurors(id)
project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
period_id   UUID NOT NULL REFERENCES periods(id)
technical   NUMERIC
written     NUMERIC
oral        NUMERIC
teamwork    NUMERIC
comments    TEXT
created_at  TIMESTAMPTZ DEFAULT now()
updated_at  TIMESTAMPTZ DEFAULT now()
UNIQUE(juror_id, project_id)
```

Note: `written` and `oral` are the DB column names. The frontend maps these to `design` and
`delivery` via `fieldMapping.js`.

### `criterion_outcome_mappings`

```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
outcome_id        UUID NOT NULL REFERENCES outcomes(id) ON DELETE CASCADE
criterion_key     TEXT NOT NULL  -- 'technical' | 'written' | 'oral' | 'teamwork'
coverage_type     TEXT NOT NULL DEFAULT 'direct'
                    CHECK (coverage_type IN ('direct', 'indirect'))
weight            NUMERIC
created_at        TIMESTAMPTZ DEFAULT now()
UNIQUE(organization_id, outcome_id, criterion_key)
```

### `juror_period_auth` (was `juror_semester_auth`)

```sql
juror_id      UUID NOT NULL REFERENCES jurors(id) ON DELETE CASCADE
period_id     UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE
pin           TEXT
session_token TEXT
last_seen_at  TIMESTAMPTZ
is_blocked    BOOLEAN DEFAULT false
created_at    TIMESTAMPTZ DEFAULT now()
PRIMARY KEY (juror_id, period_id)
```

### `entry_tokens`

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
period_id   UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE
token       TEXT NOT NULL UNIQUE
is_revoked  BOOLEAN DEFAULT false
expires_at  TIMESTAMPTZ
created_at  TIMESTAMPTZ DEFAULT now()
```

### `audit_logs`

```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id   UUID REFERENCES organizations(id)
user_id           UUID REFERENCES profiles(id)
action            TEXT NOT NULL
resource_type     TEXT
resource_id       UUID
details           JSONB
created_at        TIMESTAMPTZ DEFAULT now()
```

---

## RLS Policy Design

Every table with organization data has RLS. The pattern:

```sql
-- Tenant admin can see their own org's data
CREATE POLICY "tenant_admin_select" ON periods
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND organization_id IS NOT NULL
      LIMIT 1
    )
    OR
    EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid() AND organization_id IS NULL  -- super admin
    )
  );
```

Super admin (`organization_id IS NULL` in memberships) can see all data.
Tenant admin can only see their own `organization_id`.
Jury operations use a separate service-role RPC approach (not authenticated Supabase users).

---

## Frontend API Layer

### Pattern

```js
// src/shared/api/admin/periods.js
import { supabase } from '../core/client.js'

export async function listPeriods(organizationId) {
  const { data, error } = await supabase
    .from('periods')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
```

### Field name mapping (`fieldMapping.js`)

| UI name (`config.js`) | DB column |
|---|---|
| `design` | `written` |
| `delivery` | `oral` |
| `technical` | `technical` |
| `teamwork` | `teamwork` |

---

## Implementation Tasks

### Task 1: Delete old migrations, create new SQL schema file ✅

**Files:**
- Delete: `sql/migrations/001_core_schema.sql` through `023_entry_token_security.sql` (23 files)
- Create: `sql/migrations/001_schema.sql`

- [x] **Step 1: Delete all 23 old migration files**
- [x] **Step 2: Write `sql/migrations/001_schema.sql`** — all 14 tables (see schema above)
- [x] **Step 3: Verify table count**
- [x] **Step 4: Commit**

---

### Task 2: Write RLS policies ✅

**Files:**
- Create: `sql/migrations/002_rls_policies.sql`

- [x] **Step 1: Write RLS `ENABLE ROW LEVEL SECURITY` for all 14 tables**
- [x] **Step 2: Write SELECT/INSERT/UPDATE/DELETE policies for each table**
- [x] **Step 3: Commit**

---

### Task 3: Write jury RPCs ✅

**Files:**
- Create: `sql/migrations/003_jury_rpcs.sql`

- [x] **Step 1: Write `rpc_jury_authenticate`** — PIN verification + session token creation
- [x] **Step 2: Write `rpc_jury_validate_entry_token`** — token lookup + TTL check
- [x] **Step 3: Write `rpc_jury_upsert_scores`** — batch score write with deduplication
- [x] **Step 4: Write `rpc_admin_approve_application`** — creates Supabase Auth user atomically
- [x] **Step 5: Commit**

---

### Task 4: Write triggers ✅

**Files:**
- Create: `sql/migrations/004_triggers.sql`

- [x] **Step 1: Write `updated_at` trigger function + apply to `scores` table**
- [x] **Step 2: Write audit log trigger function + apply to key tables**
- [x] **Step 3: Commit**

---

### Task 5: Rewrite seed file ✅

**Files:**
- Rewrite: `sql/seeds/001_seed.sql` (was `001_multi_tenant_seed.sql`)

- [x] **Step 1: Write organizations** (2–3 sample orgs)
- [x] **Step 2: Write built-in frameworks** (MÜDEK + ABET) with their outcomes
- [x] **Step 3: Write sample periods, jurors, projects, scores**
- [x] **Step 4: Write test admin users + memberships**
- [x] **Step 5: Commit**

---

### Task 6: Delete old API files ✅

**Files:**
- Delete: `src/shared/api/adminApi.js`
- Delete: `src/shared/api/semesterApi.js`
- Delete: `src/shared/api/transport.js`
- Delete: `supabase/functions/rpc-proxy/` (entire directory)

- [x] **Step 1: Confirm nothing still imports from these files** (or note what needs updating)
- [x] **Step 2: Delete all four**
- [x] **Step 3: Commit**

---

### Task 7: Write admin/periods.js ✅

**Files:**
- Rewrite: `src/shared/api/admin/periods.js` (was `semesters.js`)

- [x] **Step 1: Write** `listPeriods`, `getPeriod`, `createPeriod`, `updatePeriod`, `deletePeriod`,
  `setCurrentPeriod`, `setEvalLock`, `updatePeriodCriteriaConfig`, `updatePeriodOutcomeConfig`
- [x] **Step 2: Commit**

---

### Task 8: Write admin/projects.js ✅

**Files:**
- Rewrite: `src/shared/api/admin/projects.js`

- [x] **Step 1: Write** `listProjects`, `createProject`, `updateProject`, `upsertProject`,
  `deleteProject`, `getProjectSummary`, `getDeleteCounts`
- [x] **Step 2: Commit**

---

### Task 9: Write admin/jurors.js ✅

**Files:**
- Rewrite: `src/shared/api/admin/jurors.js`

- [x] **Step 1: Write** `listJurors`, `listJurorsSummary`, `createJuror`, `updateJuror`,
  `deleteJuror`, `resetJurorPin`, `setJurorEditMode`, `forceCloseJurorEditMode`
- [x] **Step 2: Commit**

---

### Task 10: Write admin/organizations.js ✅

**Files:**
- Rewrite: `src/shared/api/admin/organizations.js` (was `tenants.js`)
- Delete: `src/shared/api/admin/tenants.js`

- [x] **Step 1: Write** `listOrganizations`, `getOrganization`, `createOrganization`,
  `updateOrganization`, `listPendingApplications`, `approveApplication`, `rejectApplication`,
  `submitApplication`
- [x] **Step 2: Commit**

---

### Task 11: Write admin/scores.js ✅

**Files:**
- Rewrite: `src/shared/api/admin/scores.js`

- [x] **Step 1: Write** `getScores`, `getOutcomeTrends`
- [x] **Step 2: Commit**

---

### Task 12: Write remaining admin modules ✅

**Files:**
- Rewrite: `src/shared/api/admin/tokens.js`
- Rewrite: `src/shared/api/admin/audit.js`
- Rewrite: `src/shared/api/admin/export.js`
- Rewrite: `src/shared/api/admin/profiles.js`

- [x] **Step 1: Write tokens.js** — `generateEntryToken`, `revokeEntryToken`, `getEntryTokenStatus`
- [x] **Step 2: Write audit.js** — `listAuditLogs`
- [x] **Step 3: Write export.js** — `fullExport`
- [x] **Step 4: Write profiles.js** — `getProfile`, `upsertProfile`
- [x] **Step 5: Commit**

---

### Task 13: Rewrite admin/auth.js ✅

**Files:**
- Rewrite: `src/shared/api/admin/auth.js`

- [x] **Step 1: Rewrite** — remove all `callAdminRpcV2`/`callAdminRpc` calls; use PostgREST
  for `getSession` (query `memberships + organizations`), `listOrganizations`, `submitApplication`
- [x] **Step 2: Keep** `approveApplication` as Edge Function call (creates Supabase Auth user)
- [x] **Step 3: Commit**

---

### Task 14: Create admin/frameworks.js ✅

**Files:**
- Create: `src/shared/api/admin/frameworks.js`

- [x] **Step 1: Write** `listFrameworks`, `createFramework`, `deleteFramework`,
  `listOutcomes`, `createOutcome`, `updateOutcome`, `deleteOutcome`,
  `listCriterionOutcomeMappings`, `upsertCriterionOutcomeMapping`, `deleteCriterionOutcomeMapping`
- [x] **Step 2: Commit**

---

### Task 15: Rewrite juryApi.js ✅

**Files:**
- Rewrite: `src/shared/api/juryApi.js`

- [x] **Step 1: Keep as RPCs:** `authenticateJuror` (was `createOrGetJurorAndIssuePin`),
  `verifyJurorPin`, `upsertScore`, `verifyEntryToken`
- [x] **Step 2: Rewrite as PostgREST:** `getJurorById`, `listProjects`, `getJurorEditState`
- [x] **Step 3: Add public period listing** — `listPeriods`, `getCurrentPeriod` (moved from `semesterApi.js`)
- [x] **Step 4: Add** `finalizeJurorSubmission` as RPC (atomic multi-table update)
- [x] **Step 5: Wrap** `listProjects` + `upsertScore` with `withRetry`
- [x] **Step 6: Commit**

---

### Task 16: Update barrel exports ✅

**Files:**
- Rewrite: `src/shared/api/admin/index.js`
- Rewrite: `src/shared/api/index.js`

- [x] **Step 1: Rewrite `admin/index.js`** — re-export from all 11 domain modules
- [x] **Step 2: Rewrite `api/index.js`** — `./admin/index.js` + `juryApi.js` + `fieldMapping.js` +
  `core/retry.js` + `core/client.js`; no re-exports from deleted files
- [x] **Step 3: Verify no broken imports**
- [x] **Step 4: Commit**

---

### Task 17: Update jury hooks (semester → period) ✅

**Files:**
- Modify: all files in `src/jury/hooks/`
- Modify: `src/jury/useJuryState.js`

- [x] **Step 1: Global renames across all jury hooks:**

| Find | Replace |
|---|---|
| `semesterId` | `periodId` |
| `semesterName` | `periodName` |
| `currentSemester` | `currentPeriod` |
| `semesters` | `periods` |
| `listSemesters` | `listPeriods` |
| `getCurrentSemester` | `getCurrentPeriod` |
| `loadSemester` / `_loadSemester` | `loadPeriod` / `_loadPeriod` |
| `juror_inst` / `jurorInst` | `affiliation` |
| `criteria_template` / `criteriaTemplate` | `criteria_config` / `criteriaConfig` |
| `mudek_template` / `mudekTemplate` | `outcome_config` / `outcomeConfig` |

- [x] **Step 2: Update API import names** (e.g. `createOrGetJurorAndIssuePin` → `authenticateJuror`)
- [x] **Step 3: Verify build**
- [x] **Step 4: Commit**

---

### Task 18: Update admin hooks ✅

**Files:**
- Rename: `src/admin/hooks/useManageSemesters.js` → `src/admin/hooks/useManagePeriods.js`
- Modify: all other admin hooks

- [x] **Step 1: Rename file + hook name** `useManageSemesters` → `useManagePeriods`
- [x] **Step 2: Apply semester→period, tenant→organization renames**
- [x] **Step 3: Update API function names** (see full mapping below)
- [x] **Step 4: Update `useAdminRealtime.js`** — subscribe to `periods` instead of `semesters`
- [x] **Step 5: Update all imports of renamed hook**
- [x] **Step 6: Verify build**
- [x] **Step 7: Commit**

Key API function renames:

| Old import | New import |
|---|---|
| `adminListSemesters` | `listPeriods` |
| `adminListProjects` | `listProjects` |
| `adminListJurors` | `listJurorsSummary` |
| `adminGetScores` | `getScores` |
| `adminCreateJuror` | `createJuror` |
| `adminUpdateJuror` | `updateJuror` |
| `adminDeleteJuror` | `deleteJuror` |
| `adminResetJurorPin` | `resetJurorPin` |
| `adminListTenants` | `listOrganizations` |
| `adminCreateTenant` | `createOrganization` |
| `adminUpdateTenant` | `updateOrganization` |
| `adminGetSession` | `getSession` |
| `adminGenerateEntryToken` | `generateEntryToken` |
| `adminRevokeEntryToken` | `revokeEntryToken` |
| `adminListAuditLogs` | `listAuditLogs` |
| `adminFullExport` | `fullExport` |

---

### Task 19: Update AuthProvider.jsx ✅

**Files:**
- Modify: `src/shared/auth/AuthProvider.jsx`

- [x] **Step 1: Replace direct `supabase.rpc("rpc_admin_auth_get_session")`** → `getSession()`
- [x] **Step 2: Replace direct `supabase.rpc("rpc_admin_application_submit")`** → `submitApplication()`
- [x] **Step 3: Rename tenant variables** (`activeTenantId` → `activeOrganizationId`, etc.)
- [x] **Step 4: Verify build**
- [x] **Step 5: Commit**

---

### Task 20: Update components ✅

**Files:**
- Rename: `src/jury/steps/SemesterStep.jsx` → `src/jury/steps/PeriodStep.jsx`
- Rename: `src/components/TenantSwitcher.jsx` → `src/components/OrganizationSwitcher.jsx`
- Rename: `src/admin/analytics/TrendSemesterSelect.jsx` → `src/admin/analytics/TrendPeriodSelect.jsx`
- Rename: utility files `semesterFormat.js` → `periodFormat.js`, `semesterSort.js` → `periodSort.js`
- Modify: all components referencing old field names

- [x] **Step 1: Rename component files and update all imports**
- [x] **Step 2: Apply renames in components** (semester→period, tenant→organization, inst→affiliation)
- [x] **Step 3: Update `src/admin/scoreHelpers.js` and `src/admin/useScoreGridData.js`**
- [x] **Step 4: Verify build**
- [x] **Step 5: Commit**

---

### Task 21: Update tests ✅

**Files:**
- Modify: all test files in `src/admin/__tests__/`, `src/jury/__tests__/`, `src/shared/__tests__/`

- [x] **Step 1: Update Supabase client mocks** — replace RPC mocks with PostgREST chain mocks
- [x] **Step 2: Update test data fixtures** (`semester_id` → `period_id`, `juror_inst` → `affiliation`,
  `project_title` → `title`, `group_students` → `members`)
- [x] **Step 3: Update import paths** (`useManageSemesters` → `useManagePeriods`, etc.)
- [x] **Step 4: Rewrite `tenantsApi.mapping.test.js`** — `transport.js` deleted; use `organizations.js`
  and PostgREST mock pattern
- [x] **Step 5: Fix `ManageProjectsPanel.test.jsx`** — `currentSemesterId` → `currentPeriodId`
- [x] **Step 6: Add 4 new SQL idempotency test IDs to `qa-catalog.json`**
- [x] **Step 7: Run all tests — 427/427 pass**
- [x] **Step 8: Commit**

---

### Task 22: Final verification & cleanup ✅

- [x] **Step 1: Verify no old names remain**

```bash
grep -r "juror_inst\|project_title\|group_students\|criteria_template\|mudek_template" src/
grep -r "callAdminRpc" src/
grep -r "supabase\.rpc" src/ | grep -v juryApi  # Only juryApi should have rpc calls
```

- [x] **Step 2: Full build verification** — `npm run build` passes
- [x] **Step 3: Full test suite** — `npm test -- --run` → 427/427 green
- [ ] **Step 4: Manual smoke test** ⏳ **BLOCKED — DB migrations not yet applied to Supabase**

  Pre-condition: apply `001_schema.sql` → `004_triggers.sql` to demo Supabase (`kmprsxrofnemmsryjhfj`)

  - [ ] Jury flow: entry token → juror identity → PIN → eval → submit
  - [ ] Admin: login → see periods → create project → view scores
  - [ ] Auth: register → pending → approve → login as tenant admin

- [x] **Step 5: Final commit** — `94dd654` — merged to `main`

---

## Remaining Work

### Apply DB migrations to Supabase (pre-condition for smoke test)

Apply in order to demo Supabase instance `kmprsxrofnemmsryjhfj`:

```text
sql/migrations/001_schema.sql
sql/migrations/002_rls_policies.sql
sql/migrations/003_jury_rpcs.sql
sql/migrations/004_triggers.sql
sql/seeds/001_seed.sql
```

After this, Task 16 in [phase-2-admin-panel.md](phase-2-admin-panel.md) (visual verification)
can also be unblocked.

### E2E tests (not yet implemented)

1. Admin login E2E — email/password via Supabase Auth (not `window.prompt`)
2. Jury entry E2E — `jury_gate` (entry token) step comes first
3. Apply migrations to E2E Supabase instance
4. Add CI secrets: `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`
5. Tenant isolation E2E tests

---

## Verification Reference

| Check | Command | Expected |
|---|---|---|
| Old migrations deleted | `ls sql/migrations/` | Only `001_schema.sql`–`004_triggers.sql` |
| New tables | `grep -c "CREATE TABLE" sql/migrations/001_schema.sql` | 14 |
| RLS policies | `grep -c "CREATE POLICY" sql/migrations/002_rls_policies.sql` | 30+ |
| RPCs minimal | `grep -c "CREATE.*FUNCTION" sql/migrations/003_jury_rpcs.sql` | 4–6 |
| No old API files | `ls src/shared/api/transport.js` | Not found |
| No RPC calls outside juryApi | `grep -r "supabase\.rpc" src/ \| grep -v juryApi` | 0 hits |
| Build passes | `npm run build` | No errors |
| Tests pass | `npm test -- --run` | 427/427 green |
| No old field names | `grep -r "juror_inst\|project_title\|group_students" src/` | 0 hits |
