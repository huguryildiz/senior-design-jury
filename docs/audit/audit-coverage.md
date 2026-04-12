# VERA Audit Log

Every security-relevant action in VERA is recorded in a single append-only
`audit_logs` table. This document is the authoritative reference for **what
gets logged**, **how it gets there**, and **what you can query**.

If you ever wonder "did X get audited?" — read [Event Catalog](#event-catalog).

---

## Table of Contents

1. [Design Goals](#design-goals)
2. [Architecture at a Glance](#architecture-at-a-glance)
3. [Write Mechanisms](#write-mechanisms)
4. [Row Anatomy](#row-anatomy)
5. [Event Catalog](#event-catalog)
6. [Category, Severity & Actor Taxonomy](#category-severity--actor-taxonomy)
7. [Diff Format](#diff-format)
8. [IP, User Agent & Actor Name](#ip-user-agent--actor-name)
9. [Querying the Audit Log](#querying-the-audit-log)
10. [Adding a New Audited Event](#adding-a-new-audited-event)
11. [What is Not Audited (Conscious Exclusions)](#what-is-not-audited-conscious-exclusions)
12. [Migration Timeline](#migration-timeline)
13. [Verification Checklist](#verification-checklist)

---

## Design Goals

1. **No critical event can be silently dropped.** A client crash, a dropped
   network request, or a forgotten `.catch()` must not make a high-severity
   action disappear from history.
2. **Every row is interpretable on its own.** `actor_name`, `action`,
   `resource_type`, `diff`, `ip_address`, `user_agent` are populated at write
   time, so a row read a year later still tells you the full story.
3. **One taxonomy, everywhere.** Action strings are dotted (`noun.verb`), and
   the UI's labels, narratives, and icons live in a single EVENT_META map —
   not scattered across pages.
4. **Append-only.** Nothing ever updates or deletes audit rows. Drift becomes
   history, not a rewrite.

---

## Architecture at a Glance

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
   │ (14 tables)  │ │ (atomic tx) │ │ after email    │ │ write    │
   └──────────────┘ └─────────────┘ └────────────────┘ └──────────┘
        automatic        atomic         server-side       narrow
        for every op    with the op    with the email     fallback
```

Every row is written by **one** of these four mechanisms. Which one depends on
where the operation happens — see [Write Mechanisms](#write-mechanisms) below.

---

## Write Mechanisms

| Mechanism                            | Who writes it                                                    | When to use                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DB trigger** (`trigger_audit_log`) | Postgres, on every CRUD via `AFTER INSERT/UPDATE/DELETE`         | Anything that changes row state in a tracked table. 14 tables: `organizations`, `periods`, `period_criteria`, `period_outcomes`, `period_criterion_outcome_maps`, `projects`, `jurors`, `score_sheets`, `score_sheet_items`, `memberships`, `entry_tokens`, `juror_period_auth`, `security_policy`, `audit_logs` (meta).   |
| **SECURITY DEFINER RPC**             | The RPC itself, in the same transaction as the DB change         | Operations where we want richer semantic context than raw CRUD: score submission, period lock/unlock, criteria save, organization status change, outcome CRUD, token revoke, juror force-close, admin profile update, application approve/reject.                                                                          |
| **Edge Function (service role)**     | The Edge Function, after the primary work succeeds               | Email notifications (entry token, juror PIN, export report, admin invite, application state, password change, password reset); admin login/logout (via Database Webhook on `auth.sessions`); file exports (via `log-export-event`); hourly anomaly sweep (via `audit-anomaly-sweep` cron). The audit write happens server-side — no client crash can drop it. |
| **Blocking client write**            | The React app, via `writeAuditLog()` with `await` + `try/catch` | Narrow fallback: anomaly detection from the audit log viewer (provides instant UI feedback; cron covers server-side detection independently). Self-service password change safety net.                                                                                                                                    |

**Rule of thumb:** if the operation touches the database, it is audited by a
trigger or an RPC. If it sends an email or is triggered server-side, it is
audited by the Edge Function. Only anomaly detection in the live UI uses the
client-blocking path — and even that `await`s and surfaces failures.

**What migrations 050/051 removed:** every `writeAuditLog(...).catch(...)`
fire-and-forget call from the API layer, the notification layer, and export
call sites. Those are now either transactional RPCs or Edge Function writes.

---

## Row Anatomy

```sql
CREATE TABLE audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz      DEFAULT now(),

  -- Who
  organization_id uuid REFERENCES organizations(id),
  user_id         uuid REFERENCES auth.users(id),
  actor_type      text CHECK (actor_type IN ('admin','juror','system','anonymous')),
  actor_name      text,                 -- snapshot: profile display name or juror name

  -- What
  action          text NOT NULL,        -- dotted taxonomy: noun.verb
  resource_type   text,                 -- table or logical resource name
  resource_id     uuid,

  -- Classification
  category        text CHECK (category IN ('auth','access','data','config','security')),
  severity        text CHECK (severity IN ('info','low','medium','high','critical')),

  -- Payload
  details         jsonb DEFAULT '{}',   -- action-specific context, fully denormalized
  diff            jsonb,                -- { before: {...}, after: {...} } for update events

  -- Forensics
  ip_address      inet,
  user_agent      text
);
```

### Notable columns

- **`actor_name`** — snapshot at write time. Even if the profile display name
  changes later, the audit row still says who *was* responsible when the
  action happened. Added in migration 048.
- **`ip_address` / `user_agent`** — extracted from `request.headers` GUC set
  by the PostgREST proxy on every RPC call, or from `x-forwarded-for` and
  `user-agent` request headers inside Edge Functions. Added in migration 049.
- **`diff`** — for update events, `{ before: {...}, after: {...} }` where
  each side contains only the keys that actually changed. Trigger-level diffs
  added in migration 045; RPC-level diffs (criteria.save,
  organization.status_changed, data.score.submitted) computed inside the RPC.
- **`details`** — action-specific JSON, denormalized on purpose. Resource
  names, applicant emails, period names, recipient lists are embedded so the
  audit feed is readable even after the underlying rows are renamed or deleted.

---

## Event Catalog

This table is the complete list of action strings VERA writes. It is grouped
by category. Under "Mechanism" you will find exactly *how* the row reaches
the database — there is no silent third path.

### Auth & Access

| Action                                  | Mechanism                                   | Severity | Written by                                                                                                                                                                                                                                                                                                            |
| --------------------------------------- | ------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.admin.login.success`              | Edge Function (Database Webhook)            | info     | [supabase/functions/on-auth-event/index.ts](supabase/functions/on-auth-event/index.ts) — triggered by `auth.sessions` INSERT; captures `ip_address` + `user_agent` from session record                                                                                                                                |
| `auth.admin.login.failure`              | RPC (`rpc_write_auth_failure_event`)        | medium   | Called by [src/auth/AuthProvider.jsx](src/auth/AuthProvider.jsx) on failed login                                                                                                                                                                                                                                      |
| `admin.logout`                          | Edge Function (Database Webhook)            | info     | [supabase/functions/on-auth-event/index.ts](supabase/functions/on-auth-event/index.ts) — triggered by `auth.sessions` DELETE                                                                                                                                                                                          |
| `auth.admin.password.changed`           | Edge Function + blocking fallback           | medium   | [supabase/functions/password-changed-notify/index.ts](supabase/functions/password-changed-notify/index.ts) (primary) + [src/auth/AuthProvider.jsx](src/auth/AuthProvider.jsx) safety net                                                                                                                              |
| `auth.admin.password.reset.requested`   | Edge Function                               | low      | [supabase/functions/password-reset-email/index.ts](supabase/functions/password-reset-email/index.ts)                                                                                                                                                                                                                  |
| `admin.updated`                         | RPC (`rpc_admin_update_member_profile`)     | info     | [src/shared/api/admin/organizations.js](src/shared/api/admin/organizations.js)                                                                                                                                                                                                                                        |
| `access.admin.invited` / `access.admin.accepted` | RPC (`rpc_accept_invite`)                   | low      | [sql/migrations/032_rpc_accept_invite.sql](sql/migrations/032_rpc_accept_invite.sql)                                                                                                                                                                                                                                  |

### Configuration

| Action                                                    | Mechanism                                                        | Severity | Written by                                                                                                                             |
| --------------------------------------------------------- | ---------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `organization.status_changed`                             | RPC (`rpc_admin_update_organization`)                            | high     | [src/shared/api/admin/organizations.js](src/shared/api/admin/organizations.js)                                                         |
| `period.set_current`                                      | RPC (`rpc_admin_set_current_period`)                             | info     | [src/shared/api/admin/periods.js](src/shared/api/admin/periods.js)                                                                     |
| `period.lock` / `period.unlock`                           | RPC (`rpc_admin_set_period_lock`)                                | high     | [src/shared/api/admin/periods.js](src/shared/api/admin/periods.js)                                                                     |
| `criteria.save`                                           | RPC (`rpc_admin_save_period_criteria`)                           | medium   | [src/shared/api/admin/periods.js](src/shared/api/admin/periods.js) — diff contains full before/after criteria tree                     |
| `outcome.created` / `outcome.updated` / `outcome.deleted` | RPC trio (`rpc_admin_{create,update,delete}_period_outcome`)     | info     | [src/shared/api/admin/frameworks.js](src/shared/api/admin/frameworks.js)                                                               |
| `config.security_policy.*`                                | DB trigger                                                       | medium   | `security_policy` table updates via Security drawers                                                                                   |
| `application.approved` / `application.rejected`          | RPC (`rpc_admin_review_tenant_application`)                      | medium   | Admin application workflow                                                                                                             |

### Data

| Action                                                     | Mechanism                                    | Severity | Written by                                                                                                                     |
| ---------------------------------------------------------- | -------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `data.score.submitted`                                     | RPC (`rpc_jury_finalize_submission`)         | info     | Emitted per project on finalize, with per-criterion `diff` computed by comparing to the previous audit row (migration 051)    |
| `data.juror.pin.locked` / `.unlocked` / `.reset`           | RPC (juror auth)                             | medium   | [sql/migrations/009_juror_period_auth.sql](sql/migrations/009_juror_period_auth.sql) and successors                            |
| `data.juror.edit_mode.granted`                             | RPC                                          | info     | [src/shared/api/admin/jurors.js](src/shared/api/admin/jurors.js) via admin grant edit                                          |
| `data.juror.edit_mode.force_closed`                        | RPC (`rpc_admin_force_close_juror_edit_mode`) | medium   | [src/shared/api/admin/jurors.js](src/shared/api/admin/jurors.js)                                                               |
| `data.juror.edit_mode.closed` (self)                       | RPC                                          | info     | Juror session close                                                                                                            |
| `data.score.edit_requested`                                | Edge Function (service role)                 | low      | [supabase/functions/request-score-edit/index.ts](supabase/functions/request-score-edit/index.ts) — juror requests edit mode after submitting scores; `actor_type='juror'` |
| `evaluation.complete`                                      | RPC (`rpc_jury_finalize_submission`)         | info     | Once per session across all projects                                                                                           |
| CRUD on tracked tables (`*.insert/update/delete`)          | DB trigger                                   | info     | 14 tables via `trigger_audit_log`                                                                                              |

### Security

| Action                          | Mechanism                                  | Severity | Written by                                                                                                                         |
| ------------------------------- | ------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `security.entry_token.revoked`  | RPC (`rpc_admin_revoke_entry_token`)       | high     | [src/shared/api/admin/tokens.js](src/shared/api/admin/tokens.js)                                                                   |
| `token.generate`                | RPC                                        | info     | Entry token generation                                                                                                              |
| `security.pin_reset.requested`  | Edge Function (service role)               | medium   | [supabase/functions/request-pin-reset/index.ts](supabase/functions/request-pin-reset/index.ts) — locked juror requests PIN reset; `actor_type='juror'` |
| `security.anomaly.detected`     | Edge Function (cron) + blocking client write | high   | Primary: [supabase/functions/audit-anomaly-sweep/index.ts](supabase/functions/audit-anomaly-sweep/index.ts) — runs hourly via Supabase scheduler, `actor_type='system'`. Secondary: [src/admin/pages/AuditLogPage.jsx](src/admin/pages/AuditLogPage.jsx) — instant UI feedback for the currently-loaded log window. |
| `snapshot.freeze`               | RPC                                        | info     | Period freeze                                                                                                                       |
| `backup.*`                      | RPC (`rpc_platform_backups_*`)             | info     | Platform backup flows ([sql/migrations/036_platform_backups_rpcs.sql](sql/migrations/036_platform_backups_rpcs.sql))                |

### Notifications (all Edge Function–written)

| Action                      | Edge Function                                                                | Severity | Recipient                                                   |
| --------------------------- | ---------------------------------------------------------------------------- | -------- | ----------------------------------------------------------- |
| `notification.entry_token`  | [send-entry-token-email](supabase/functions/send-entry-token-email/index.ts) | low      | Juror (entry token email)                                   |
| `notification.juror_pin`    | [send-juror-pin-email](supabase/functions/send-juror-pin-email/index.ts)     | low      | Juror (PIN email)                                           |
| `notification.export_report` | [send-export-report](supabase/functions/send-export-report/index.ts)         | low      | Admin-specified list (exported report attachment)           |
| `notification.admin_invite` | [invite-org-admin](supabase/functions/invite-org-admin/index.ts)             | low      | Invited admin                                               |
| `notification.application`  | [notify-application](supabase/functions/notify-application/index.ts)         | info     | Applicant (approval/rejection) or tenant admins (submitted) |
| `notification.maintenance`  | [notify-maintenance](supabase/functions/notify-maintenance/index.ts)         | medium   | All active jurors in a period (maintenance / scheduled downtime notice) |

Every notification row carries the actual recipients, CC count, send result,
and any Resend error in `details`, so a single audit query tells you both
*what email was attempted* and *whether it landed*.

### Exports

All export events are written server-side via the `log-export-event` Edge
Function. The client calls the Edge Function before generating the file; if
the audit write fails, the export aborts. `ip_address` and `user_agent` are
captured server-side.

| Action              | Written by                                                                                                                                                    | Severity |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `export.scores`     | [supabase/functions/log-export-event/index.ts](supabase/functions/log-export-event/index.ts) — called from [src/shared/api/admin/export.js](src/shared/api/admin/export.js) | info |
| `export.rankings`   | Same Edge Function                                                                                                                                             | info     |
| `export.heatmap`    | Same Edge Function                                                                                                                                             | info     |
| `export.analytics`  | Same Edge Function                                                                                                                                             | info     |
| `export.audit`      | Same Edge Function                                                                                                                                             | info     |
| `export.backup`     | Same Edge Function                                                                                                                                             | info     |

---

## Category, Severity & Actor Taxonomy

```text
category   ∈ { auth, access, data, config, security }
severity   ∈ { info, low, medium, high, critical }
actor_type ∈ { admin, juror, system, anonymous }
```

- **auth** — login, logout, password events, failed logins
- **access** — invite, accept, membership changes
- **data** — evaluations, scores, juror sessions, CRUD on business tables
- **config** — period state, criteria, outcomes, organization status, security policy
- **security** — token revocation, anomaly detection, backups

Severity reflects how loudly a monitoring system should react. In the UI
[src/admin/utils/auditUtils.js](src/admin/utils/auditUtils.js) assigns a
numeric weight (info=0, low=1, medium=2, high=3, critical=4) that drives the
severity filter dropdown.

Actor type controls how `actor_name` is resolved:

- **admin** — looked up from `profiles.display_name` at write time by the
  trigger, or embedded directly by the RPC
- **juror** — embedded in `details.actor_name` by the juror-side RPC
- **system** — no authenticated session (cron jobs, backend triggers)
- **anonymous** — unauthenticated callers (failed login, public password
  reset request, public application submission)

---

## Diff Format

For update events, `diff` is:

```json
{
  "before": { "key1": "old_value", "key2": "old_value" },
  "after":  { "key1": "new_value", "key2": "new_value" }
}
```

**Only changed keys appear.** If `name` stayed the same but `status` changed,
only `status` is in both sides. This keeps diffs compact and makes the UI's
"Changes" tab readable.

**Trigger-level diffs** (14 tables) are computed by
[sql/migrations/045_audit_trigger_diff.sql](sql/migrations/045_audit_trigger_diff.sql)
using `jsonb_diff_map()` on OLD vs NEW.

**RPC-level diffs** are computed inside the RPC itself:

- `organization.status_changed` — `diff.before.status` vs `diff.after.status`
- `criteria.save` — full before/after criteria tree (id, label, weight, rubric)
- `data.score.submitted` — per-criterion diff computed by reading the most
  recent `data.score.submitted` audit row for the same project/juror and
  comparing its `details.scores` map (migration 051). On first submission,
  `before` is null and only `after` is populated.

---

## IP, User Agent & Actor Name

**IP and user agent** are resolved automatically in three paths:

1. **PostgREST RPC path.** The proxy sets the `request.headers` GUC before
   every request. The trigger and all RPCs read it via
   `current_setting('request.headers', true)` and extract `x-forwarded-for`
   and `user-agent`. No API or RPC has to pass them manually. See
   [sql/migrations/049_audit_ip_ua_self_extract.sql](sql/migrations/049_audit_ip_ua_self_extract.sql).
2. **Edge Function path.** `writeEdgeAuditLog(req, input)` extracts them from
   `x-forwarded-for` and `user-agent` on the incoming `Request`. See
   [supabase/functions/_shared/audit-log.ts](supabase/functions/_shared/audit-log.ts).
3. **Blocking client write path.** The generic
   `rpc_admin_write_audit_event` receives the GUC-set headers transparently —
   no extra work required.

**Actor name** is a snapshot. Triggers resolve it at write time by joining
`profiles` for `actor_type='admin'`. RPCs embed the caller's display name
directly. Jurors get their name from `details.actor_name`, supplied by the
juror auth RPC chain.

---

## Querying the Audit Log

All admin queries go through [src/shared/api/admin/audit.js](src/shared/api/admin/audit.js)
and ultimately `rpc_admin_list_audit_logs(...)`. The RPC is org-scoped: a
tenant admin only sees their own org; a super admin sees everything.

### Common recipes

**"Who locked this period?"**

```sql
SELECT created_at, actor_name, ip_address, details
  FROM audit_logs
 WHERE action = 'period.lock'
   AND resource_id = :period_id
 ORDER BY created_at DESC;
```

**"Show all score re-submissions for this juror, with the criteria they
actually changed."**

```sql
SELECT created_at, resource_id AS project_id,
       diff -> 'before' AS previous_scores,
       diff -> 'after'  AS new_scores
  FROM audit_logs
 WHERE action = 'data.score.submitted'
   AND (details ->> 'juror_id')::uuid = :juror_id
   AND diff -> 'before' IS NOT NULL
 ORDER BY created_at DESC;
```

**"Which notifications failed to send today?"**

```sql
SELECT action, resource_id,
       details ->> 'error' AS error,
       details -> 'recipients' AS recipients
  FROM audit_logs
 WHERE category = 'security'
   AND action LIKE 'notification.%'
   AND (details ->> 'sent')::boolean = false
   AND created_at > now() - interval '24 hours';
```

**"All high-severity events for an organization in the last week"**

```sql
SELECT created_at, actor_name, action, severity, resource_type
  FROM audit_logs
 WHERE organization_id = :org_id
   AND severity IN ('high','critical')
   AND created_at > now() - interval '7 days'
 ORDER BY created_at DESC;
```

### UI

[src/admin/pages/AuditLogPage.jsx](src/admin/pages/AuditLogPage.jsx) provides
cursor-paginated filtering by category, severity, action, resource type,
actor, and date range. Each row opens an
[AuditEventDrawer](src/admin/drawers/AuditEventDrawer.jsx) with three tabs:

- **Summary** — who, what, when, IP
- **Changes** — renders `diff` side-by-side
- **Raw** — full JSON payload

All event labels, narratives, and icons come from a single EVENT_META map in
[src/admin/utils/auditUtils.js](src/admin/utils/auditUtils.js). If you add an
event to the catalog, that map is the only place the UI needs to learn about it.

---

## Adding a New Audited Event

There is no flowchart — just pick the mechanism that matches where the
operation actually happens.

1. **Is it a database write?** → Either:
   - Rely on the trigger (if the table is already tracked), *and* add an
     EVENT_META entry for the `<table>.insert|update|delete` action, OR
   - Write a new SECURITY DEFINER RPC that does the update and calls
     `_audit_write(...)` inside the same transaction
     ([sql/migrations/050_audit_premium_rpcs.sql](sql/migrations/050_audit_premium_rpcs.sql)
     is the reference).

2. **Is it an email send or other server-side work?** → Add the audit write
   inside the Edge Function, right after the primary work succeeds, using
   `writeEdgeAuditLog(req, { action, ... })` from
   [supabase/functions/_shared/audit-log.ts](supabase/functions/_shared/audit-log.ts).

3. **Is it a pure client action (like a file export)?** → Use
   `logExportInitiated({ action, ... })` from
   [src/shared/api/admin/export.js](src/shared/api/admin/export.js). This
   `await`s and throws on failure, so the export aborts if the audit fails.

4. **Add the event to EVENT_META** ([src/admin/utils/auditUtils.js](src/admin/utils/auditUtils.js))
   with `label`, `narrative`, `category`, `severity`, `actor_type`, and `icon`.

5. **Write a verification query** — pick the action, perform the action in
   the UI, then run `SELECT * FROM audit_logs WHERE action = '<new>' ORDER BY
   created_at DESC LIMIT 1` to confirm the row exists and the payload matches.

**Do not** add `writeAuditLog(...).catch(...)` anywhere. The fire-and-forget
pattern is banned (see [Migration Timeline](#migration-timeline)).

---

## What is Not Audited (Conscious Exclusions)

These gaps are deliberate and tracked here so they don't silently persist:

| Gap                                        | Reason                                                                                                                                             | Path to fix                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Score sheet item-level trigger diff        | Would emit a row per blur/save during normal evaluation — noise. The semantic `data.score.submitted` event already carries a per-criterion diff.   | No action; covered by RPC-level diff (migration 051).              |
| ~~Anomaly detection as a cron job~~        | **Resolved.** `audit-anomaly-sweep` Edge Function runs hourly via Supabase scheduler. Client-side detection in `AuditLogPage.jsx` kept for instant UI feedback only. | —                                                         |
| Historical rows pre-migration 048/049      | Early rows have `actor_name`, `ip_address`, `user_agent` = NULL.                                                                                    | Backfill script not planned; UI renders "(unknown)" gracefully.    |
| `access.admin.impersonate.*`               | Impersonation feature does not exist yet.                                                                                                          | Will be added alongside the feature.                               |
| `auth.admin.session.expired`               | Supabase Auth does not expose a session-expiry event.                                                                                               | Would require polling or custom session monitor; low priority.     |

---

## Migration Timeline

Every change to the audit system ships as a SQL migration. Apply in order to
both `vera-prod` and `vera-demo`.

| Migration                                                                                                   | Date    | Change                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| [008_audit_logs.sql](sql/migrations/008_audit_logs.sql)                                                     | 2026-01 | Initial `audit_logs` table + base triggers                                                                              |
| [043_audit_taxonomy.sql](sql/migrations/043_audit_taxonomy.sql)                                             | 2026-03 | Dotted action taxonomy + category/severity columns                                                                      |
| [045_audit_trigger_diff.sql](sql/migrations/045_audit_trigger_diff.sql)                                     | 2026-03 | Trigger-level `{before, after}` diff for 14 tables                                                                      |
| [046_audit_rpc_hardening.sql](sql/migrations/046_audit_rpc_hardening.sql)                                   | 2026-03 | SECURITY DEFINER RPC hardening, `_assert_org_admin` guard                                                               |
| [047_audit_anon_auth_failure.sql](sql/migrations/047_audit_anon_auth_failure.sql)                           | 2026-03 | `rpc_write_auth_failure_event` for anonymous login failures                                                             |
| [048_audit_actor_name_and_score_submitted.sql](sql/migrations/048_audit_actor_name_and_score_submitted.sql) | 2026-04 | `actor_name` snapshot column; per-project `data.score.submitted` emission                                                |
| [049_audit_ip_ua_self_extract.sql](sql/migrations/049_audit_ip_ua_self_extract.sql)                         | 2026-04 | IP + user-agent extracted from `request.headers` GUC in RPCs and triggers                                                |
| [050_audit_premium_rpcs.sql](sql/migrations/050_audit_premium_rpcs.sql)                                     | 2026-04 | **Premium SaaS overhaul** — 10 new SECURITY DEFINER RPCs replace every fire-and-forget client audit write                |
| [051_audit_score_criterion_diff.sql](sql/migrations/051_audit_score_criterion_diff.sql)                     | 2026-04 | Per-criterion `{before, after}` diff in `rpc_jury_finalize_submission`, computed by self-comparison of audit history     |
| [052_audit_taxonomy_sync.sql](sql/migrations/052_audit_taxonomy_sync.sql)                                   | 2026-04 | `rpc_admin_write_audit_event` category/severity/actor_type taxonomy sync across all actions                              |
| [053_audit_no_delete.sql](sql/migrations/053_audit_no_delete.sql)                                           | 2026-04 | Hard-delete RLS: `FOR DELETE USING (false)` on `audit_logs` — even superadmin cannot delete rows                         |
| [054_audit_hash_chain.sql](sql/migrations/054_audit_hash_chain.sql)                                         | 2026-04 | `row_hash TEXT` column + BEFORE INSERT trigger computing `sha256(id \|\| action \|\| org_id \|\| created_at \|\| prev_hash)`; `rpc_admin_verify_audit_chain` RPC |
| [055_audit_anomaly_cron.sql](sql/migrations/055_audit_anomaly_cron.sql)                                     | 2026-04 | `pg_cron` schedule template for `audit-anomaly-sweep` Edge Function (hourly)                                             |
| [056_audit_actor_type_fix.sql](sql/migrations/056_audit_actor_type_fix.sql)                                 | 2026-04 | Fix: `security.anomaly.detected` added to 'system' actor_type CASE and 'high' severity CASE in `rpc_admin_write_audit_event` |

### What migration 050 actually did

Before 050, these actions existed as `writeAuditLog(...).catch(console.warn)`
calls from the client after a separate `.update()`:

- `period.set_current`, `period.lock`, `period.unlock`
- `criteria.save`, `outcome.created`, `outcome.updated`, `outcome.deleted`
- `organization.status_changed`, `admin.updated`
- `security.entry_token.revoked`
- `data.juror.edit_mode.force_closed` (audit was missing entirely)

Migration 050 introduces 10 RPCs that perform the update **and** the audit
write in one transaction. The client now calls the RPC, and if the
transaction commits, the audit row is guaranteed to exist. No `.catch()` can
swallow it.

### What migration 051 actually did

Before 051, `data.score.submitted` recorded "submission happened" with the
current score map in `details.scores` but no diff. After 051, the RPC looks
at the most recent previous `data.score.submitted` row for the same
project + juror, computes a per-criterion diff of the scores, and writes it
into the `diff` column. First submissions have `before = null, after = {...}`.
Resubmissions carry only the actually-changed criteria on each side.

---

## Verification Checklist

Run this smoke test after any audit-related change. Every step must produce
a new row visible in the UI and in a raw SQL query against `audit_logs`.

### DB operations

- Set a period as current → `period.set_current`
- Toggle period lock → `period.lock` / `period.unlock`
- Save criteria from the Periods drawer → `criteria.save` (with diff)
- Create / rename / delete an outcome → `outcome.created` / `.updated` / `.deleted`
- Change an organization's status → `organization.status_changed` (with diff)
- Rename an admin via Organizations → `admin.updated`
- Revoke an entry token → `security.entry_token.revoked`
- Force-close juror edit mode → `data.juror.edit_mode.force_closed`
- Submit a new jury session → `data.score.submitted` with `diff.after` only
- Re-submit one changed criterion → `data.score.submitted` with both
  `diff.before` and `diff.after` on that one key

### Email notifications

- Send entry-token email → `notification.entry_token`
- Send juror PIN email → `notification.juror_pin`
- Send export report email → `notification.export_report`
- Invite a new admin → `notification.admin_invite`
- Submit a tenant application → `notification.application` (submitted)
- Approve the application → `notification.application` (approved) + `application.approved`
- Reject the application → `notification.application` (rejected) + `application.rejected`
- Change password → `auth.admin.password.changed`
- Request password reset → `auth.admin.password.reset.requested`
- Send maintenance notice → `notification.maintenance`
- Locked juror requests PIN reset → `security.pin_reset.requested` (`actor_type='juror'`)
- Juror requests score edit after submission → `data.score.edit_requested` (`actor_type='juror'`)

### Auth

- Log in → `auth.admin.login.success`
- Fail to log in → `auth.admin.login.failure`
- Log out → `admin.logout`

### Exports

- Rankings → `export.rankings`
- Scores → `export.scores`
- Heatmap → `export.heatmap`
- Analytics → `export.analytics`
- Audit log → `export.audit`
- Backup → `export.backup`

### Forensics

For a recent row, verify:

- `actor_name` is populated (not NULL)
- `ip_address` is populated (PostgREST path via GUC; Edge Function path via request headers)
- `user_agent` is populated
- `diff` is populated for update-type events

### Grep guard

These are the ONLY allowed call sites for `writeAuditLog(`:

- `src/shared/api/admin/audit.js` (definition)
- `src/admin/pages/AuditLogPage.jsx` (blocking anomaly detection — instant UI feedback)

```bash
grep -rn "writeAuditLog(" src/
```

Anything else means a fire-and-forget leak has reappeared — fix it before
merging.

---

Last updated: 2026-04-12 (migrations 052–056 — taxonomy sync, hard-delete RLS, hash chain tamper evidence, anomaly cron, actor_type fix; auth events moved to `on-auth-event` Database Webhook; exports moved to `log-export-event` Edge Function; `audit-anomaly-sweep` cron deployed).
