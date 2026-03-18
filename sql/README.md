# SQL Migration Files

This directory contains the Supabase database schema and seed files.

## Files and Application Order

```text
000_bootstrap.sql   ← Apply first (schema, tables, RPCs, RLS)
001_dummy_seed.sql  ← Optional: staging and local test environments only
```

### `000_bootstrap.sql`

Sets up a fresh Supabase project from scratch. Includes:

- Extensions (`pgcrypto`)
- Tables: `semesters`, `projects`, `jurors`, `scores`, `settings`, `juror_semester_auth`, `audit_logs`
- Triggers and views
- Public RPCs (jury evaluation flow)
- Admin RPCs (admin dashboard)
- Grants and RLS (Row Level Security) policies

Incorporates all security fixes applied on 2026-03-14:

- CSPRNG-based PIN generation (`gen_random_bytes` instead of `random()`)
- Audit log entry on every failed PIN attempt
- `pin_hash` / `pin_plain_once` fields excluded from `rpc_admin_full_export` payload
- Missing GRANT added for `rpc_admin_full_export`

**Idempotent:** Uses `CREATE TABLE IF NOT EXISTS` and `CREATE OR REPLACE FUNCTION` — safe to re-run.

### `001_dummy_seed.sql`

Test data: a sample semester, projects, and jurors.

> **Do not apply to production.** For staging or local test environments only.

---

## How to Apply

### Supabase Dashboard (recommended)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project
2. Go to **SQL Editor** → **New query**
3. Paste the contents of `000_bootstrap.sql` → click **Run**
4. (Optional) Paste `001_dummy_seed.sql` → staging environments only

### psql

```bash
psql "$DATABASE_URL" -f sql/000_bootstrap.sql
```

`DATABASE_URL`: Supabase Dashboard → Settings → Database → Connection string (URI).

---

## Adding a New Migration

Create a new file named `002_<description>.sql`:

```text
sql/002_add_group_feedback_column.sql
```

Add this header at the top of the file:

```sql
-- sql/002_add_group_feedback_column.sql
-- Applied: YYYY-MM-DD
-- Purpose: ...
-- Safe to re-run: yes / no
```

Then add the new file to this README.
