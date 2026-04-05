# SQL — VERA

This directory contains the Supabase database schema, migration files, and seed
data for the VERA multi-tenant evaluation platform.

## Canonical Data Model

The schema is organized in five layers. Data flows top-down: Identity owns
everything; Frameworks define the evaluation rubric; Execution holds the live
runtime data; Snapshots freeze the rubric at period activation; Scoring stores
the actual juror work.

```text
┌─────────────────────────────────────────────────────────────────┐
│  IDENTITY                                                        │
│  organizations · profiles · memberships · org_applications       │
└────────────────────────────┬────────────────────────────────────┘
                             │ owns
          ┌──────────────────┴──────────────────────┐
          ▼                                         ▼
┌─────────────────────┐              ┌──────────────────────────┐
│  FRAMEWORKS         │              │  EXECUTION               │
│  frameworks         │◄─────────────┤  periods (framework_id)  │
│  framework_outcomes │  used by     │  projects                │
│  framework_criteria │              │  jurors                  │
│  criterion_outcome  │              │  juror_period_auth       │
│    _maps            │              │  entry_tokens            │
└─────────────────────┘              │  audit_logs              │
                                     └──────────────┬───────────┘
                                                    │ freeze
                                                    ▼
                                     ┌──────────────────────────┐
                                     │  SNAPSHOTS               │
                                     │  period_criteria         │
                                     │  period_outcomes         │
                                     │  period_criterion_       │
                                     │    outcome_maps          │
                                     └──────────────┬───────────┘
                                                    │ referenced by
                                                    ▼
                                     ┌──────────────────────────┐
                                     │  SCORING                 │
                                     │  score_sheets            │
                                     │  score_sheet_items       │
                                     │  scores_compat (view)    │
                                     └──────────────────────────┘
```

### Key relationships

```text
organizations ──< frameworks
organizations ──< periods
organizations ──< jurors

frameworks ──< framework_criteria ──< framework_criterion_outcome_maps
frameworks ──< framework_outcomes ──< framework_criterion_outcome_maps

periods >── frameworks              (period.framework_id)
periods ──< projects
periods ──< entry_tokens
periods ──< juror_period_auth       (via jurors)
periods ──< period_criteria         (snapshot on freeze)
periods ──< period_outcomes         (snapshot on freeze)

period_criteria ──< period_criterion_outcome_maps
period_outcomes ──< period_criterion_outcome_maps
period_criteria ──< score_sheet_items

jurors ──< juror_period_auth
jurors ──< score_sheets
projects ──< score_sheets
score_sheets ──< score_sheet_items
```

### Snapshot pattern

When a period is activated (`rpc_period_freeze_snapshot`), the live
`framework_criteria` / `framework_outcomes` / `framework_criterion_outcome_maps`
rows are copied into immutable `period_*` snapshot tables. All subsequent
scoring (`score_sheet_items`) references these snapshots — never the live
framework rows. This means the framework can be edited without corrupting
historical scores.

### scores_compat view

`score_sheet_items` is a normalized row-per-criterion model. The `scores_compat`
view pivots it back to the flat wide-row shape (columns: `technical`, `written`,
`oral`, `teamwork`, `comments`) that the current admin API and `fieldMapping.js`
expect. This view is the backward-compatibility bridge — admin reads go through
it; jury writes go through `rpc_jury_upsert_score`.

## Directory Structure

```text
sql/
├── migrations/                    ← Apply in order (001+); 000 is teardown only
│   ├── 000_drop_all.sql           ← Full teardown — run once before a fresh apply
│   ├── 001_extensions.sql         ← Extensions: uuid-ossp, pgcrypto
│   ├── 002_identity.sql           ← organizations, profiles, memberships, org_applications
│   ├── 003_frameworks.sql         ← frameworks, framework_outcomes, framework_criteria, maps
│   ├── 004_periods_and_execution.sql ← periods, projects, jurors, juror_period_auth, entry_tokens, audit_logs
│   ├── 005_snapshots.sql          ← period_criteria, period_outcomes, period_criterion_outcome_maps + freeze RPC
│   ├── 006_scoring.sql            ← score_sheets, score_sheet_items, scores_compat view
│   ├── 007_auth_and_tokens.sql    ← All jury + admin RPCs
│   ├── 008_audit_and_rls.sql      ← Triggers (updated_at, audit_log) + RLS for all 21 tables
│   ├── 009_security_hash_tokens.sql ← Security patch: token fields stored as SHA-256 hashes
│   ├── 010_landing_stats.sql      ← Public RPC: rpc_landing_stats() for landing page (anon)
│   ├── 011_enable_realtime.sql    ← Realtime publication: 7 tables added to supabase_realtime
│   └── 020_ensure_pgcrypto.sql    ← Ensure pgcrypto + fix jury RPC search_path for digest()
└── seeds/
    └── 001_seed.sql               ← Premium demo seed (multi-org, realistic scores)
```

## Migration Files (apply in order)

| # | File | Purpose |
|---|------|---------|
| 000 | `000_drop_all.sql` | Teardown only — drops all v0 + v1 tables, views, functions |
| 001 | `001_extensions.sql` | `uuid-ossp`, `pgcrypto` |
| 002 | `002_identity.sql` | `organizations`, `profiles`, `memberships`, `org_applications`; `current_user_is_super_admin()` helper |
| 003 | `003_frameworks.sql` | `frameworks`, `framework_outcomes`, `framework_criteria`, `framework_criterion_outcome_maps` |
| 004 | `004_periods_and_execution.sql` | `periods`, `projects`, `jurors`, `juror_period_auth`, `entry_tokens`, `audit_logs` |
| 005 | `005_snapshots.sql` | `period_criteria`, `period_outcomes`, `period_criterion_outcome_maps`; `rpc_period_freeze_snapshot()` |
| 006 | `006_scoring.sql` | `score_sheets`, `score_sheet_items`; `scores_compat` view (backward-compat bridge) |
| 007 | `007_auth_and_tokens.sql` | Jury RPCs, admin juror/token RPCs, `rpc_admin_approve_application` |
| 008 | `008_audit_and_rls.sql` | `trigger_set_updated_at`, `trigger_audit_log`; RLS policies for all 21 tables |
| 009 | `009_security_hash_tokens.sql` | `entry_tokens.token → token_hash` (SHA-256); `juror_period_auth.session_token → session_token_hash`; updated RPCs |
| 010 | `010_landing_stats.sql` | `rpc_landing_stats()` — public RPC returning org/juror/project/evaluation counts for landing page |
| 011 | `011_enable_realtime.sql` | Adds 7 tables to `supabase_realtime` publication (see Realtime section below) |
| 020 | `020_ensure_pgcrypto.sql` | Ensures `pgcrypto` extension and sets jury RPC search_path to include `extensions` for `digest()` |

## Tables (21 total)

### Identity (4)

| Table | Key columns |
|-------|-------------|
| `organizations` | `code` UNIQUE, `name`, `institution_name`, `status`, `settings JSONB` |
| `profiles` | `id` → `auth.users`, `display_name`, `avatar_url` |
| `memberships` | `user_id`, `organization_id` (NULL = super_admin), `role` (`org_admin` \| `super_admin`) |
| `org_applications` | `organization_id`, `applicant_name`, `contact_email`, `status` |

### Frameworks (4)

| Table | Key columns |
|-------|-------------|
| `frameworks` | `organization_id`, `name`, `version`, `default_threshold`, `outcome_code_prefix`, `is_default` |
| `framework_outcomes` | `framework_id`, `code` UNIQUE per framework, `label`, `sort_order` |
| `framework_criteria` | `framework_id`, `key` UNIQUE per framework, `label`, `max_score`, `weight`, `rubric_bands JSONB` |
| `framework_criterion_outcome_maps` | `framework_id`, `criterion_id`, `outcome_id`, `coverage_type` (`direct` \| `indirect`) |

### Execution (6)

| Table | Key columns |
|-------|-------------|
| `periods` | `organization_id`, `framework_id`, `name`, `season`, `is_current`, `is_locked`, `snapshot_frozen_at` |
| `projects` | `period_id`, `project_no`, `title`, `members JSONB`, `advisor_name`, `advisor_affiliation` |
| `jurors` | `organization_id`, `juror_name`, `affiliation`, `email`, `avatar_color` |
| `juror_period_auth` | PK(`juror_id`, `period_id`), `pin_hash` (bcrypt), `session_token_hash` (SHA-256), `session_expires_at`, `failed_attempts`, `locked_until`, `edit_enabled`, `edit_reason`, `edit_expires_at`, `final_submitted_at` |
| `entry_tokens` | `period_id`, `token_hash` (SHA-256, UNIQUE), `is_revoked`, `expires_at`, `last_used_at` |
| `audit_logs` | `organization_id`, `user_id`, `action`, `resource_type`, `resource_id`, `details JSONB` |

### Snapshots (3)

Immutable copies of framework criteria/outcomes frozen when a period is activated.
`score_sheet_items` references these, never the live `framework_criteria`.

| Table | Key columns |
|-------|-------------|
| `period_criteria` | `period_id`, `source_criterion_id`, `key` UNIQUE per period, `max_score`, `weight`, `rubric_bands JSONB` |
| `period_outcomes` | `period_id`, `source_outcome_id`, `code` UNIQUE per period |
| `period_criterion_outcome_maps` | `period_id`, `period_criterion_id`, `period_outcome_id`, `coverage_type` |

### Scoring (2 + 1 view)

| Object | Key columns |
|--------|-------------|
| `score_sheets` | PK(`juror_id`, `project_id`), `period_id`, `comment`, `status` (`draft` \| `in_progress` \| `submitted`) |
| `score_sheet_items` | `score_sheet_id`, `period_criterion_id`, `score_value` |
| `scores_compat` (view) | Flat wide-row shape for backward-compatible admin reads: `technical`, `written`, `oral`, `teamwork`, `comments` |

## RPCs

### Jury RPCs (anon + authenticated)

| Function | Purpose |
|----------|---------|
| `rpc_jury_authenticate(period_id, juror_name, affiliation, force_reissue)` | Find/create juror; generate bcrypt PIN; return `pin_plain_once` if new |
| `rpc_jury_verify_pin(period_id, juror_name, affiliation, pin)` | Verify bcrypt PIN; issue session token (stored as SHA-256 hash); 5 failures → 30 min lockout |
| `rpc_jury_validate_entry_token(token)` | Validate entry token (SHA-256 lookup, revocation check, 24h TTL) |
| `rpc_jury_upsert_score(period_id, project_id, juror_id, session_token, scores JSONB, comment)` | Upsert `score_sheets` + `score_sheet_items`; if juror is already finalized, requires active edit window (`edit_enabled=true` and `edit_expires_at > now()`) |
| `rpc_jury_finalize_submission(period_id, juror_id, session_token)` | Set `final_submitted_at` and close edit window fields (`edit_enabled=false`, `edit_reason=NULL`, `edit_expires_at=NULL`) |

### Admin RPCs (authenticated only)

| Function | Purpose |
|----------|---------|
| `rpc_period_freeze_snapshot(period_id)` | Copy framework criteria/outcomes into period snapshot tables; idempotent |
| `rpc_juror_reset_pin(period_id, juror_id)` | Generate + hash new PIN; clear lockout |
| `rpc_juror_toggle_edit_mode_v2(period_id, juror_id, enabled, reason, duration_minutes)` | Open/close juror edit window (minutes-based), enforces final-submission prerequisite, writes explicit audit log on enable |
| `rpc_juror_unlock_pin(period_id, juror_id)` | Clear PIN lockout |
| `rpc_entry_token_generate(period_id)` | Create entry token (plain returned once; hash stored) |
| `rpc_entry_token_revoke(token_id)` | Revoke entry token by ID |
| `rpc_admin_approve_application(application_id)` | Super-admin: mark application approved (user creation handled by Edge Function) |

## Realtime

Seven tables are added to the `supabase_realtime` Postgres publication (migration `011`).
Only these tables are published — others are excluded to minimise WAL overhead.

| Table | Consumer | Event |
|-------|----------|-------|
| `score_sheets` | `useAdminRealtime` | `*` — live score progress on admin panel |
| `score_sheet_items` | `useAdminRealtime` | `*` — individual criterion updates |
| `juror_period_auth` | `useAdminRealtime` | `*` — juror session / edit-mode changes |
| `projects` | `useAdminRealtime` | `*` — project list changes |
| `periods` | `useAdminRealtime` | `*` — period lock / activation changes |
| `jurors` | `useAdminRealtime` | `*` — juror roster changes |
| `audit_logs` | `usePageRealtime` (AuditLogPage) | `INSERT` — new audit entries |

RLS still applies to all Realtime channels — clients only receive rows they are
authorised to read regardless of publication membership.

## Auth Model

Single JWT-based auth via Supabase Auth. No legacy password layer.

| Concept | Detail |
|---------|--------|
| `org_admin` | Member of one organization (`organization_id NOT NULL`) |
| `super_admin` | Member row with `organization_id IS NULL` (global scope) |
| `current_user_is_super_admin()` | Security-definer helper used in RLS policies to avoid recursion |
| Jury auth | Stateless token — `session_token_hash` in `juror_period_auth`; validated per RPC call |

### Google OAuth Setup

Google sign-in is handled entirely by Supabase Auth — no client-side secrets required.

**Supabase Dashboard** (per project):

```text
Authentication → Providers → Google
  → Client ID:     <Google Cloud OAuth Client ID>
  → Client Secret: <Google Cloud OAuth Client Secret>
```

**Google Cloud Console:**

```text
APIs & Services → Credentials → OAuth 2.0 Client IDs
  → Authorized redirect URIs:
      https://<project-ref>.supabase.co/auth/v1/callback
```

**First-time Google user flow** (see `src/auth/AuthProvider.jsx`):

1. `signInWithGoogle()` → `supabase.auth.signInWithOAuth({ provider: "google", redirectTo: ...?admin })`
2. After redirect, `onAuthStateChange` fires → `handleAuthChange` detects `provider === "google"` with no memberships and `profile_completed` not set
3. `profileIncomplete = true` → `CompleteProfileForm` shown to user
4. User submits name + organization → `completeProfile()` → sets `user_metadata.profile_completed = true` + calls `rpc_admin_application_submit`
5. Application enters pending review → `PendingReviewGate` shown until approved

## Seed Data

| File | Purpose |
|------|---------|
| `001_seed.sql` | Multi-org demo seed with realistic score distributions and workflow-state diversity |

> **Do not apply seeds to production.** For dev or demo environments only.

## How to Apply

### Fresh setup

```bash
# Teardown (skip if starting fresh)
psql "$DATABASE_URL" -f sql/migrations/000_drop_all.sql

# Apply migrations in order (excluding teardown)
for f in sql/migrations/[0-9][0-9][0-9]_*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

### Supabase Dashboard

1. Open SQL Editor → New query
2. Paste each migration file in order (001 → latest) → Run
3. Optionally apply the seed for dev/demo

### Seed data (dev only)

```bash
psql "$DATABASE_URL" -f sql/seeds/001_seed.sql
```

**Idempotency:** Most migrations are safe to re-run (`CREATE OR REPLACE FUNCTION`, `CREATE ... IF NOT EXISTS`). Column-shape migrations (for example token-column reshapes) should run once per environment. `020` is idempotent (`CREATE EXTENSION IF NOT EXISTS` + `ALTER FUNCTION ... SET search_path`).
