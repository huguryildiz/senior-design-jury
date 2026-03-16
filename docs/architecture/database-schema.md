# Database Schema — TEDU VERA

Supabase Postgres. RLS is enabled on all tables with a default-deny policy. No
direct table access from the frontend — all reads and writes go through
SECURITY DEFINER RPC functions.

---

## Tables

### `semesters`

Stores academic semesters. Only one semester should be active at a time.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | `gen_random_uuid()` |
| `code` | text unique | e.g. `2024-Spring` |
| `name` | text | Display name |
| `starts_on` | date | |
| `ends_on` | date | |
| `is_active` | bool | Default `false` |
| `lock_active` | bool | When `true`, jurors cannot submit or edit scores |
| `created_at` | timestamptz | Default `now()` |

---

### `projects`

One row per student group in a semester.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `semester_id` | uuid FK → `semesters(id)` | |
| `group_no` | int | Group number within the semester |
| `project_title` | text | |
| `group_students` | text | Student names, stored as free text |
| `created_at` | timestamptz | Default `now()` |

---

### `jurors`

Juror accounts. No Supabase Auth — login is PIN-only.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `juror_code` | text unique | Exactly 4 digits (`^[0-9]{4}$`) |
| `juror_name` | text | |
| `juror_inst` | text | Institution / department |
| `created_at` | timestamptz | Default `now()` |

---

### `scores`

One row per (semester, project, juror) combination. `total` is computed by a DB trigger.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `semester_id` | uuid FK → `semesters(id)` | |
| `project_id` | uuid FK → `projects(id)` | |
| `juror_id` | uuid FK → `jurors(id)` | |
| `technical` | int | 0–30 |
| `written` | int | 0–30 (UI name: `design`) |
| `oral` | int | 0–30 (UI name: `delivery`) |
| `teamwork` | int | 0–10 |
| `total` | int | 0–100, computed by DB trigger |
| `comment` | text | Optional, one per score row |
| `submitted_at` | timestamptz | Set by trigger on any score field change |
| `final_submitted_at` | timestamptz | Set when juror explicitly finalizes submission |
| `created_at` | timestamptz | Default `now()` |

**Unique constraint:** `(semester_id, project_id, juror_id)`

---

### `settings`

Key-value store for application configuration. Currently holds the admin password hash.

| Column | Type | Notes |
| --- | --- | --- |
| `key` | text PK | e.g. `admin_password_hash` |
| `value` | text | |
| `updated_at` | timestamptz | Default `now()` |

---

### `project_notes`

Admin-only notes, one per project per semester. Jurors cannot read or write these.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `semester_id` | uuid FK → `semesters(id)` | |
| `project_id` | uuid FK → `projects(id)` | |
| `note` | text | Default `''` |
| `updated_at` | timestamptz | Default `now()` |
| `created_at` | timestamptz | Default `now()` |

**Unique constraint:** `(semester_id, project_id)`

---

## UI Field Name Mapping

The frontend uses different names for two score criteria. The mapping is applied
**only in `src/shared/api.js`** and must never be applied in components or
hooks.

| UI name (frontend / `config.js`) | DB column |
| --- | --- |
| `design` | `written` |
| `delivery` | `oral` |
| `technical` | `technical` |
| `teamwork` | `teamwork` |

---

## RPC Functions

All functions are `SECURITY DEFINER`. The frontend never calls tables directly.

### Public (no authentication required)

| Function | Description |
| --- | --- |
| `rpc_juror_login(pin)` | Validates a 4-digit PIN and returns juror profile |
| `rpc_list_projects(semester_id, juror_id)` | Returns projects for a semester with the juror's existing scores |
| `rpc_upsert_score(...)` | Creates or updates a score row for a (semester, project, juror) |
| `rpc_list_semesters()` | Returns all semesters |
| `rpc_get_active_semester()` | Returns the currently active semester |
| `rpc_get_juror_edit_state(juror_id, semester_id)` | Returns the juror's submission state and whether editing is allowed |

### Admin (require admin password parameter)

| Function | Description |
| --- | --- |
| `rpc_admin_login(password)` | Validates the admin password |
| `rpc_admin_list_scores(semester_id, password)` | Returns all scores for a semester |
| `rpc_admin_list_jurors(password)` | Returns all jurors |
| `rpc_admin_list_projects(semester_id, password)` | Returns all projects for a semester |
| `rpc_admin_reset_pin(juror_id, password)` | Generates and sets a new PIN for a juror |
| `rpc_admin_set_semester_active(semester_id, password)` | Sets a semester as active |
| `rpc_admin_delete_semester(semester_id, password)` | Deletes a semester |
| `rpc_admin_create_semester(...)` | Creates a new semester |
| `rpc_admin_upsert_project(...)` | Creates or updates a project |
| `rpc_admin_delete_project(project_id, password)` | Deletes a project |
| `rpc_admin_upsert_juror(...)` | Creates or updates a juror |
| `rpc_admin_delete_juror(juror_id, password)` | Deletes a juror |
| `rpc_admin_set_lock(semester_id, lock_active, password)` | Enables or disables the score lock for a semester |
| `rpc_admin_change_password(old_password, new_password)` | Changes the admin password |
| `rpc_admin_export_backup(semester_id, password)` | Returns a full data export for a semester |
| `rpc_admin_import_projects(rows, semester_id, password)` | Bulk-imports projects from CSV data |
| `rpc_admin_import_jurors(rows, password)` | Bulk-imports jurors from CSV data |

---

## Production Security

In production, all admin RPC calls are proxied through the `rpc-proxy` Supabase
Edge Function (`supabase/functions/rpc-proxy/index.ts`). This ensures the
`rpc_secret` value is never sent to the browser.

The proxy is controlled by `USE_PROXY = !import.meta.env.DEV` in
`src/shared/api.js`. In development, RPCs are called directly using the
`VITE_RPC_SECRET` env variable.

---

## Schema Source

Full SQL: `sql/000_bootstrap.sql`
