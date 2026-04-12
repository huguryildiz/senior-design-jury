# VERA Audit Log

Every security-relevant action in VERA is recorded in a single append-only
`audit_logs` table. This document is the authoritative reference for what gets
logged, how it gets there, and how to verify it.

---

## Design Goals

1. **No silent drops.** A client crash, dropped request, or forgotten `.catch()`
   must not erase a high-severity action from history.
2. **Self-contained rows.** `actor_name`, `action`, `resource_type`, `diff`,
   `ip_address`, `user_agent` are populated at write time so a row read years
   later still tells the full story.
3. **Single taxonomy.** Action strings are dotted (`noun.verb`). The UI's
   labels, narratives, and icons live in one `EVENT_META` map in
   `src/admin/utils/auditUtils.js`.
4. **Append-only.** Nothing updates or deletes audit rows. Hard-delete RLS
   (`FOR DELETE USING (false)`) blocks even superadmin.

---

## Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                          audit_logs                              │
│           (append-only, RLS-protected, org-scoped)               │
└──────────────────────────────────────────────────────────────────┘
              ▲            ▲                 ▲              ▲
              │            │                 │              │
   ┌──────────┴───┐ ┌──────┴──────┐ ┌────────┴───────┐ ┌────┴─────┐
   │ DB trigger   │ │ SECURITY    │ │ Edge Function  │ │ Blocking │
   │ on CRUD      │ │ DEFINER RPC │ │ (service role) │ │ client   │
   │ (15 tables)  │ │ (atomic tx) │ │ server-side    │ │ write    │
   └──────────────┘ └─────────────┘ └────────────────┘ └──────────┘
        automatic        atomic         server-side       available
        for every op    with the op    (email, cron)      but unused
```

Every row is written by exactly one of these four mechanisms.

---

## Write Mechanisms

| Mechanism | Who writes | When to use |
| --- | --- | --- |
| **DB trigger** (`trigger_audit_log`) | Postgres, `AFTER INSERT/UPDATE/DELETE` | Any CRUD on a tracked table. Automatic, no client code needed. |
| **SECURITY DEFINER RPC** | The RPC itself, same transaction as the DB change | Richer semantic context than raw CRUD (score submission, period lock, criteria save, etc.). |
| **Edge Function** (service role) | The Edge Function, after primary work succeeds | Email sends, auth events (Database Webhook), file exports, hourly anomaly sweep. |
| **Blocking client write** | React app via `writeAuditLog()` with `await` | Infrastructure for future client-side needs. Currently unused. |

**Banned pattern:** `writeAuditLog(...).catch(...)` fire-and-forget calls. All audit
writes are either transactional (RPC), trigger-automatic, or Edge Function server-side.

---

## Row Schema

```sql
CREATE TABLE audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz      DEFAULT now(),
  organization_id uuid REFERENCES organizations(id),
  user_id         uuid REFERENCES auth.users(id),
  actor_type      text,     -- 'admin' | 'juror' | 'system' | 'anonymous'
  actor_name      text,     -- snapshot of display name at write time
  action          text NOT NULL,
  resource_type   text,
  resource_id     uuid,
  category        text,     -- 'auth' | 'access' | 'data' | 'config' | 'security'
  severity        text,     -- 'info' | 'low' | 'medium' | 'high' | 'critical'
  details         jsonb DEFAULT '{}',
  diff            jsonb,    -- { before: {...}, after: {...} } for updates
  ip_address      inet,
  user_agent      text,
  row_hash        text,     -- sha256 chain for tamper evidence
  correlation_id  uuid      -- groups related events from the same operation
);
```

**Notable columns:**

- **`actor_name`** -- snapshot at write time. Profile renames don't affect
  historical rows.
- **`actor_type`** -- `'admin'` when `auth.uid()` is present (triggers and RPCs),
  `'system'` for cron/backend, `'juror'` for jury-side RPCs, `'anonymous'` for
  unauthenticated callers.
- **`diff`** -- `{ before, after }` with only changed keys for RPC-level diffs.
  Trigger-level diffs include full row snapshots. `score_sheets` excluded to
  avoid bloat.
- **`ip_address` / `user_agent`** -- extracted from `request.headers` GUC
  (PostgREST path) or request headers (Edge Function path). No manual passing.
- **`correlation_id`** -- groups related events from a single logical operation.
  `rpc_jury_finalize_submission` generates one UUID per call and stamps it on
  all three rows it writes (`evaluation.complete`, `data.score.submitted` × N,
  `juror.edit_mode_closed_on_resubmit`), making it possible to reconstruct a
  complete submission from audit logs.

---

## Tracked Tables (DB Trigger)

15 tables have `trigger_audit_log` attached. Every INSERT, UPDATE, and DELETE
on these tables produces an audit row automatically.

| Table | Org resolution | Category |
| --- | --- | --- |
| `organizations` | self | data |
| `periods` | `organization_id` column | data |
| `projects` | via `periods.organization_id` | data |
| `jurors` | `organization_id` column | data |
| `score_sheets` | via `periods.organization_id` | data |
| `memberships` | `organization_id` column | data |
| `entry_tokens` | via `periods.organization_id` | data |
| `period_criteria` | via `periods.organization_id` | data |
| `period_criterion_outcome_maps` | via `periods.organization_id` | data |
| `org_applications` | `organization_id` column | data |
| `framework_outcomes` | via `frameworks.organization_id` | data |
| `admin_invites` | `org_id` column | data |
| `frameworks` | `organization_id` column | data |
| `profiles` | NULL (global) | data |
| `security_policy` | NULL (global) | config |

Trigger actions follow the pattern `<table_name>.<operation>`, e.g.,
`periods.insert`, `jurors.update`, `projects.delete`.

---

## Event Catalog

### Auth and Access

| Action | Mechanism | Severity |
| --- | --- | --- |
| `auth.admin.login.success` | Edge Function (Database Webhook on `auth.sessions` INSERT) | info |
| `auth.admin.login.failure` | RPC (`rpc_write_auth_failure_event`) | medium |
| `admin.logout` | Edge Function (Database Webhook on `auth.sessions` DELETE) | info |
| `auth.admin.password.changed` | Edge Function (`password-changed-notify`) | medium |
| `auth.admin.password.reset.requested` | Edge Function (`password-reset-email`) | low |
| `admin.updated` | RPC (`rpc_admin_update_member_profile`) | info |
| `access.admin.invited` / `.accepted` | RPC (`rpc_accept_invite`) | low |

### Configuration

Canonical taxonomy is `config.outcome.*`; legacy `outcome.*` aliases are still
accepted for historical rows and mapped to the same UI labels.

| Action | Mechanism | Severity |
| --- | --- | --- |
| `organization.status_changed` | RPC (`rpc_admin_update_organization`) with diff | high |
| `period.set_current` | RPC (`rpc_admin_set_current_period`) | info |
| `period.lock` / `period.unlock` | RPC (`rpc_admin_set_period_lock`) | high |
| `criteria.save` | RPC (`rpc_admin_save_period_criteria`) with diff | medium |
| `config.outcome.created` / `.updated` / `.deleted` | RPC trio | info |
| `config.platform_settings.updated` | RPC (`rpc_admin_set_platform_settings`) with diff | medium |
| `config.backup_schedule.updated` | RPC (`rpc_admin_set_backup_schedule`) with diff | high |
| `application.approved` / `.rejected` | RPC (`rpc_admin_approve_application` / `rpc_admin_reject_application`) | medium |
| `security_policy.*` | DB trigger | high |

### Data

Canonical PIN taxonomy is `juror.pin_locked` / `juror.pin_unlocked` /
`pin.reset`; legacy `data.juror.pin.*` aliases are supported in UI mapping.

| Action | Mechanism | Severity |
| --- | --- | --- |
| `data.juror.auth.created` | RPC (`rpc_jury_authenticate`) — first auth per (juror, period) pair | info |
| `data.score.submitted` | RPC (`rpc_jury_finalize_submission`) with per-criterion diff | info |
| `data.score.edit_requested` | Edge Function (`request-score-edit`) | low |
| `juror.pin_locked` / `juror.pin_unlocked` / `pin.reset` | RPC (juror auth) | medium |
| `data.juror.edit_mode.granted` / `.force_closed` / `.closed` | RPC | info-medium |
| `evaluation.complete` | RPC (`rpc_jury_finalize_submission`) | info |
| CRUD on tracked tables (`<table>.insert/update/delete`) | DB trigger | info-medium |

### Security

| Action | Mechanism | Severity |
| --- | --- | --- |
| `security.entry_token.revoked` | RPC (`rpc_admin_revoke_entry_token`) | high |
| `token.generate` | RPC | info |
| `security.pin_reset.requested` | Edge Function (`request-pin-reset`) | medium |
| `security.anomaly.detected` | Edge Function cron (`audit-anomaly-sweep`) | high |
| `security.chain.broken` | Edge Function cron (auto chain verify) | critical |
| `backup.*` | RPC (`rpc_platform_backups_*`) | info |
| `maintenance.set` / `maintenance.cancelled` | RPC (`rpc_admin_set_maintenance` / `rpc_admin_cancel_maintenance`) | high / medium |
| `access.admin.session.revoked` | RPC (`rpc_admin_revoke_admin_session`) | high |

### Notifications (all Edge Function server-side)

| Action | Edge Function |
| --- | --- |
| `notification.entry_token` | `send-entry-token-email` |
| `notification.juror_pin` | `send-juror-pin-email` |
| `notification.export_report` | `send-export-report` |
| `notification.admin_invite` | `invite-org-admin` |
| `notification.application` | `notify-application` |
| `notification.maintenance` | `notify-maintenance` |

Every notification row carries recipients, send result, and any error in
`details`.

### Exports (all server-side via `log-export-event` Edge Function)

| Action | Severity |
| --- | --- |
| `export.scores` / `export.rankings` / `export.heatmap` | info |
| `export.analytics` / `export.audit` / `export.projects` / `export.jurors` / `export.backup` | info |

Export audit write happens before file generation. If the audit write fails,
the export aborts (no file without a log).
Export details use one schema across all export types:
`format`, `row_count`, `period_name`, `project_count`, `juror_count`, `filters`.

---

## Anomaly Detection

### Server-side (persistent)

The `audit-anomaly-sweep` Edge Function runs hourly via cron. It scans the last
60 minutes and writes `security.anomaly.detected` rows (with 2h dedup window).

| Rule | Condition | Threshold |
| --- | --- | --- |
| `ip_multi_org` | Same IP across distinct orgs | >= 2 orgs |
| `pin_flood` | `juror.pin_locked` events per org | >= 10 |
| `login_failure_burst` | `auth.admin.login.failure` per org | >= 5 |
| `org_suspended` | `organization.status_changed` with `newStatus=suspended` | >= 1 |
| `token_revoke_burst` | `security.entry_token.revoked` per org | >= 2 |
| `export_burst` | `export.*` events per org | >= 5 |

Each sweep also runs `_audit_verify_chain_internal(null)` (service_role-only helper,
no auth check). Broken links write a `security.chain.broken` row (severity=critical).

### Client-side (UI feedback only)

`detectAnomalies()` in `src/admin/utils/auditUtils.js` runs 6 rules on loaded
logs and shows an instant banner in the Audit Log page. These do not persist to
the database -- they are visual alerts only. The server-side cron is the
authoritative anomaly writer.

---

## Tamper Evidence

Three layers protect audit integrity:

1. **Hash chain.** Each row's `row_hash` = `sha256(id || action || org_id ||
   created_at || prev_hash)`. Verified by `rpc_admin_verify_audit_chain` (UI
   button for super-admins + automatic check in every anomaly sweep).
2. **Append-only RLS.** `FOR DELETE USING (false)` prevents any deletion.
3. **External log sink.** Every `audit_logs` INSERT is forwarded via the
   `audit-log-sink` Edge Function (Database Webhook) to an external
   observability platform (Axiom `vera-audit-logs` dataset). Offsite copy
   independent of the Supabase DB.

---

## Verification Checklist

After any audit-related change, verify these produce visible rows:

**DB operations:**

- Set a period as current -> `period.set_current`
- Toggle period lock -> `period.lock` / `period.unlock`
- Save criteria -> `criteria.save` (with diff)
- Create/update/delete an outcome -> `config.outcome.created` / `.updated` / `.deleted`
- Update platform settings -> `config.platform_settings.updated`
- Update backup schedule -> `config.backup_schedule.updated`
- Revoke an admin session -> `access.admin.session.revoked`
- Change organization status -> `organization.status_changed` (with diff)
- Update admin profile -> `admin.updated`
- Revoke entry token -> `security.entry_token.revoked`
- Force-close juror edit mode -> `data.juror.edit_mode.force_closed`
- Submit jury scores -> `data.score.submitted` (with diff)
- Update security policy -> `security_policy.update` (with diff, actor_type=admin)

**Auth:**

- Log in -> `auth.admin.login.success`
- Fail to log in -> `auth.admin.login.failure`
- Log out -> `admin.logout`

**Exports:**

- Any export type -> `export.<type>` (server-side, blocks on failure)

**Forensics (for any recent row):**

- `actor_name` is populated (not NULL)
- `actor_type` is `'admin'` for user-initiated actions (not `'system'`)
- `ip_address` is populated
- `user_agent` is populated
- `diff` is populated for update events

---

## Audit Query Reference

A human-readable map from investigative questions to the exact audit events that
answer them. All rows are in `audit_logs`; filter by `action` and optionally
`actor_type`, `resource_id`, or `details`.

### Juror Activity

| Question | Action(s) to query | Key `details` fields |
| --- | --- | --- |
| When did a juror start their evaluation? | `data.juror.auth.created` | `juror_id`, `period_id` |
| When did a juror finish (submit) their evaluation? | `evaluation.complete` | `juror_id`, `period_id`, `correlation_id` |
| Did a juror lock their PIN? When? | `juror.pin_locked` | `juror_id`, `attempt_count` |
| When was a PIN reset performed? | `pin.reset` + `security.pin_reset.requested` | `juror_id`, `reset_by` (admin actor) |
| Did a juror request an edit after submission? | `data.score.edit_requested` | `juror_id`, `project_id`, `reason` |
| Was a juror's edit mode granted or force-closed by an admin? | `data.juror.edit_mode.granted` / `.force_closed` / `.closed` | `juror_id`, `granted_by` |

**Tip:** Use `correlation_id` to reconstruct a complete submission session —
`evaluation.complete`, all `data.score.submitted` rows, and
`juror.edit_mode_closed_on_resubmit` share the same `correlation_id`.

---

### Admin — Data Management

| Question | Action(s) to query | Notes |
| --- | --- | --- |
| Did admin add / edit / delete a juror? | `jurors.insert` / `jurors.update` / `jurors.delete` | DB trigger; `diff` carries before/after |
| Did admin add / edit / delete a project? | `projects.insert` / `projects.update` / `projects.delete` | DB trigger |
| Did admin add / edit / delete an evaluation period? | `periods.insert` / `periods.update` / `periods.delete` | DB trigger |
| Did admin lock or unlock a period? | `period.lock` / `period.unlock` | RPC; severity=high |
| Did admin change criteria weights or rubric bands? | `criteria.save` | RPC; `diff` shows changed weights |

---

### Admin — Exports and Notifications

| Question | Action(s) to query | Key `details` fields |
| --- | --- | --- |
| What did admin export and when? | `export.scores` / `export.rankings` / `export.heatmap` / `export.analytics` / `export.audit` / `export.projects` / `export.jurors` / `export.backup` | `format`, `row_count`, `period_name`, `filters` |
| Who did admin email an export to? | `notification.export_report` | `recipients`, `send_result`, `export_type` |
| When were juror PINs sent by email? | `notification.juror_pin` | `recipients`, `juror_id` |
| When was an entry token emailed? | `notification.entry_token` | `recipients`, `token_id`, `period_id` |

---

### Admin — QR Codes / Entry Tokens

| Question | Action(s) to query | Key `details` fields |
| --- | --- | --- |
| When did admin generate an entry token (QR code)? | `token.generate` or `entry_tokens.insert` (DB trigger) | `token_id`, `period_id`, `expires_at` |
| When did admin revoke an entry token? | `security.entry_token.revoked` | `token_id`, `period_id`; severity=high |

---

### Admin — PIN Management

| Question | Action(s) to query | Key `details` fields |
| --- | --- | --- |
| Whose PIN block did admin remove? When? | `juror.pin_unlocked` | `juror_id`, `juror_name`; `actor_type='admin'` |
| When was a PIN reset requested by admin? | `security.pin_reset.requested` | `juror_id`, `requested_by` |

---

### Admin — Organization / Access Management

| Question | Action(s) to query | Key `details` fields |
| --- | --- | --- |
| When did admin approve an organization application? | `application.approved` | `org_id`, `applicant_name` |
| When did admin reject an organization application? | `application.rejected` | `org_id`, `reason` |
| When did admin change an organization's status (suspend/activate)? | `organization.status_changed` | `diff` carries `before`/`after` status; severity=high |
| When was an admin invited to an organization? | `access.admin.invited` | `invitee_email`, `org_id` |
| When did an invited admin accept their invitation? | `access.admin.accepted` | `invitee_id`, `org_id` |
| When did admin revoke another admin's session? | `access.admin.session.revoked` | `revoked_user_id`, `session_id` |

---

## Conscious Exclusions

| Gap | Reason | Status |
| --- | --- | --- |
| `score_sheet_items` trigger | Would emit a row per blur/save during evaluation. `data.score.submitted` carries per-criterion diff on finalize. | By design |
| `juror_period_auth` trigger | PIN auth state managed by RPCs that write semantic events (`data.juror.auth.created`, `juror.pin_locked`, etc.). | Covered by RPCs |
| `auth.admin.session.expired` | Supabase Auth has no session-expiry event. | Would need polling |
| `access.admin.impersonate.*` | Impersonation feature does not exist. | Will add with feature |
| Historical rows (pre-migration 048) | `actor_name`, `ip_address`, `user_agent` are NULL. | UI shows "(unknown)" |

---

Last updated: 2026-04-12
