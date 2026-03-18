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
| `name` | text | Display name (case-insensitive unique) |
| `is_active` | boolean | Default `false` |
| `is_locked` | boolean | Default `false` — when `true`, jurors cannot submit or edit |
| `poster_date` | date | Optional date of the poster day event |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()`, updated by trigger |
| `entry_token_hash` | text | bcrypt hash of the QR/URL entry token |
| `entry_token_enabled` | boolean | Default `false` |
| `entry_token_created_at` | timestamptz | When the token was generated |
| `entry_token_expires_at` | timestamptz | Token expiry (null = no expiry) |

**Unique constraint:** `name` (case-insensitive)

---

### `projects`

One row per student group in a semester.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `semester_id` | uuid FK → `semesters(id)` | `ON DELETE CASCADE` |
| `group_no` | integer | Group number within the semester |
| `project_title` | text | |
| `group_students` | text | Student names, stored as free text |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()`, updated by trigger |

**Unique constraint:** `(semester_id, group_no)`

---

### `jurors`

Juror identity records. No Supabase Auth — authentication is PIN-based via
`juror_semester_auth`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `juror_name` | text | |
| `juror_inst` | text | Institution / department |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()`, updated by trigger |

**Unique constraint:** `(juror_name, juror_inst)` (normalized)

---

### `juror_semester_auth`

Per-semester PIN authentication state for each juror. Created when a juror
first enters their PIN for a semester.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `juror_id` | uuid FK → `jurors(id)` | `ON DELETE CASCADE` |
| `semester_id` | uuid FK → `semesters(id)` | `ON DELETE CASCADE` |
| `pin_hash` | text | bcrypt hash of the 4-digit PIN |
| `pin_reveal_pending` | boolean | `true` until juror acknowledges PIN on first login |
| `pin_plain_once` | text | Encrypted (AES via Vault `pin_secret`) for one-time PIN reveal |
| `failed_attempts` | integer | Default `0` — reset on success |
| `locked_until` | timestamptz | `null` = not locked; 3 failures → 15-minute lockout |
| `last_seen_at` | timestamptz | Updated on each successful PIN entry |
| `edit_enabled` | boolean | Default `false` — admin grants edit permission |
| `session_token_hash` | text | Hash of the current session token (for token-based auth) |
| `session_expires_at` | timestamptz | Session token expiry |
| `created_at` | timestamptz | Default `now()` |

**Unique constraint:** `(juror_id, semester_id)`

---

### `scores`

One row per (semester, project, juror) evaluation. `total` is computed by
DB trigger on insert or update.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `semester_id` | uuid FK → `semesters(id)` | `ON DELETE CASCADE` |
| `project_id` | uuid FK → `projects(id)` | `ON DELETE CASCADE` |
| `juror_id` | uuid FK → `jurors(id)` | `ON DELETE CASCADE` |
| `poster_date` | date | Copied from `semesters.poster_date` by trigger |
| `technical` | integer | 0–30 |
| `written` | integer | 0–30 (UI name: `design`) |
| `oral` | integer | 0–30 (UI name: `delivery`) |
| `teamwork` | integer | 0–10 |
| `total` | integer | 0–100, computed by `trg_scores_compute_total` trigger |
| `comment` | text | Optional, one per score row |
| `final_submitted_at` | timestamptz | Set when juror explicitly finalizes submission |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()`, updated by trigger |

**Unique constraint:** `(semester_id, project_id, juror_id)`

---

### `settings`

Key-value store for application configuration. Holds hashed passwords.

| Column | Type | Notes |
| --- | --- | --- |
| `key` | text PK | e.g. `admin_password_hash`, `delete_password_hash`, `backup_password_hash` |
| `value` | text | bcrypt hash |
| `updated_at` | timestamptz | Default `now()` |

---

### `audit_logs`

Immutable append-only log of critical admin and juror operations.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `created_at` | timestamptz | Default `now()` |
| `actor_type` | text | `'admin'`, `'juror'`, or `'system'` |
| `actor_id` | uuid | Juror ID for juror actions; null for admin |
| `action` | text | Action identifier (e.g. `pin_reset`, `eval_lock`) |
| `entity_type` | text | What was acted on (e.g. `juror`, `semester`) |
| `entity_id` | uuid | ID of the affected record |
| `message` | text | Human-readable description |
| `metadata` | jsonb | Additional context (IPs, old values, etc.) |

**Immutability:** A trigger (`trg_audit_logs_immutable`) prevents `UPDATE` and
`DELETE` on this table.

---

## UI Field Name Mapping

The frontend uses different names for two score criteria. The mapping is applied
**only in `src/shared/api/fieldMapping.js`** and must never be applied in
components or hooks.

| UI name (frontend / `config.js`) | DB column |
| --- | --- |
| `design` | `written` |
| `delivery` | `oral` |
| `technical` | `technical` |
| `teamwork` | `teamwork` |

---

## RPC Functions

All functions are `SECURITY DEFINER`. The frontend never calls tables directly.

### Public (no admin password required)

| Function | Description |
| --- | --- |
| `rpc_list_semesters()` | Returns all semesters |
| `rpc_get_active_semester()` | Returns the currently active semester |
| `rpc_list_projects(p_semester_id, p_juror_id, p_session_token)` | Returns projects for a semester with the juror's existing scores |
| `rpc_upsert_score(...)` | Creates or updates a score row for a (semester, project, juror) |
| `rpc_get_juror_edit_state(p_juror_id, p_semester_id, p_session_token)` | Returns the juror's submission state and whether editing is allowed |
| `rpc_finalize_juror_submission(p_juror_id, p_semester_id, p_session_token)` | Marks a juror's evaluation as finally submitted |
| `rpc_create_or_get_juror_and_issue_pin(p_name, p_inst, p_semester_id, p_session_token)` | Finds or creates a juror and issues a PIN for the semester |
| `rpc_verify_juror_pin(p_juror_id, p_semester_id, p_pin)` | Verifies a juror PIN; returns session token on success; enforces lockout |
| `rpc_verify_semester_entry_token(p_token)` | Validates a QR/URL entry token; returns semester info on success |

### Admin (require admin password + RPC secret)

| Function | Description |
| --- | --- |
| `rpc_admin_login(p_password, p_rpc_secret)` | Validates the admin password |
| `rpc_admin_security_state(p_rpc_secret)` | Returns which passwords are configured |
| `rpc_admin_change_password(p_old_password, p_new_password, p_rpc_secret)` | Changes the admin password |
| `rpc_admin_change_delete_password(p_old_delete_password, p_new_delete_password, p_admin_password, p_rpc_secret)` | Changes the delete password |
| `rpc_admin_change_backup_password(p_old_backup_password, p_new_backup_password, p_admin_password, p_rpc_secret)` | Changes the backup/export password |
| `rpc_admin_bootstrap_password(p_password)` | Sets the initial admin password (one-time, only works when unset) |
| `rpc_admin_bootstrap_delete_password(p_delete_password, p_admin_password)` | Sets the initial delete password |
| `rpc_admin_bootstrap_backup_password(p_backup_password, p_admin_password)` | Sets the initial backup password |
| `rpc_admin_get_scores(p_semester_id, p_admin_password, p_rpc_secret)` | Returns all scores for a semester |
| `rpc_admin_project_summary(p_semester_id, p_admin_password, p_rpc_secret)` | Returns per-project score summary |
| `rpc_admin_outcome_trends(p_admin_password, p_rpc_secret)` | Returns cross-semester MÜDEK outcome trend data |
| `rpc_admin_list_audit_logs(...)` | Returns paginated audit log entries with filters |
| `rpc_admin_set_active_semester(p_semester_id, p_admin_password, p_rpc_secret)` | Sets a semester as active (deactivates others) |
| `rpc_admin_create_semester(...)` | Creates a new semester |
| `rpc_admin_update_semester(...)` | Updates semester name, poster_date, or lock state |
| `rpc_admin_delete_semester(p_semester_id, p_delete_password, p_rpc_secret)` | Deletes a semester (requires delete password) |
| `rpc_admin_list_projects(p_semester_id, p_admin_password, p_rpc_secret)` | Returns all projects for a semester |
| `rpc_admin_create_project(...)` | Creates a new project |
| `rpc_admin_upsert_project(...)` | Creates or updates a project (used for CSV import) |
| `rpc_admin_delete_project(p_project_id, p_delete_password, p_rpc_secret)` | Deletes a project |
| `rpc_admin_list_jurors(p_semester_id, p_admin_password, p_rpc_secret)` | Returns jurors with their auth state for a semester |
| `rpc_admin_create_juror(...)` | Creates a juror and issues a PIN for the semester |
| `rpc_admin_update_juror(...)` | Updates a juror's name or institution |
| `rpc_admin_delete_juror(p_juror_id, p_delete_password, p_rpc_secret)` | Deletes a juror |
| `rpc_admin_delete_counts(p_target_type, p_target_id, p_admin_password, p_rpc_secret)` | Returns cascade counts before delete confirmation |
| `rpc_admin_reset_juror_pin(p_juror_id, p_semester_id, p_admin_password, p_rpc_secret)` | Generates and sets a new PIN for a juror |
| `rpc_admin_set_semester_eval_lock(p_semester_id, p_is_locked, p_admin_password, p_rpc_secret)` | Enables or disables the score lock for a semester |
| `rpc_admin_set_juror_edit_mode(...)` | Grants or revokes a juror's post-submission edit permission |
| `rpc_admin_force_close_juror_edit_mode(p_semester_id, p_admin_password, p_rpc_secret)` | Force-closes edit mode for all jurors in a semester |
| `rpc_admin_get_settings(p_admin_password, p_rpc_secret)` | Returns app settings (non-sensitive) |
| `rpc_admin_set_setting(...)` | Updates an app setting value |
| `rpc_admin_full_export(p_backup_password, p_rpc_secret)` | Returns a full data export (all semesters) |
| `rpc_admin_full_import(p_backup_password, p_rpc_secret, p_payload)` | Imports a full backup payload |
| `rpc_admin_generate_entry_token(p_semester_id, p_admin_password, p_rpc_secret)` | Generates a QR/URL entry token for a semester |
| `rpc_admin_revoke_entry_token(p_semester_id, p_admin_password, p_rpc_secret)` | Revokes the entry token for a semester |
| `rpc_admin_get_entry_token_status(p_semester_id, p_admin_password, p_rpc_secret)` | Returns the current entry token state for a semester |

### Internal helpers (not called from frontend)

| Function | Description |
| --- | --- |
| `_audit_log(...)` | Internal — appends a row to `audit_logs` |
| `_verify_rpc_secret(p_provided)` | Internal — validates the RPC secret from Vault |
| `_assert_juror_session(...)` | Internal — validates a juror session token |
| `_verify_admin_password(p_password)` | Internal — bcrypt-checks the admin password |
| `_verify_delete_password(p_password)` | Internal — bcrypt-checks the delete password |
| `_assert_delete_password(p_password)` | Internal — raises if delete password is wrong |
| `_assert_backup_password(p_password)` | Internal — raises if backup password is wrong |

---

## DB Triggers

| Trigger | Table | Description |
| --- | --- | --- |
| `trg_set_updated_at` | `semesters`, `projects`, `jurors` | Sets `updated_at = now()` on every `UPDATE` |
| `trg_scores_compute_total` | `scores` | Computes `total = technical + written + oral + teamwork` on upsert |
| `trg_scores_set_poster_date` | `scores` | Copies `poster_date` from the semester row on insert |
| `trg_scores_set_updated_at` | `scores` | Sets `updated_at = now()` on every `UPDATE` |
| `trg_audit_logs_immutable` | `audit_logs` | Prevents `UPDATE` and `DELETE` |

---

## Production Security

In production, all admin RPC calls are proxied through the `rpc-proxy` Supabase
Edge Function (`supabase/functions/rpc-proxy/index.ts`). This ensures the
`rpc_secret` value (stored in Supabase Vault) is never sent to the browser.

The proxy is controlled by `USE_PROXY = !import.meta.env.DEV` in
`src/shared/api/core/client.js`. In development, RPCs are called directly
using the `VITE_RPC_SECRET` env variable.

---

## Schema Source

Full SQL: `sql/000_bootstrap.sql`
