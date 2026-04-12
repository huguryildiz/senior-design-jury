# Database Webhooks — VERA

Supabase Database Webhooks call Edge Functions when specific table events occur.
VERA uses three webhooks, all requiring manual configuration in the Supabase dashboard
(no CLI or migration can configure webhooks).

---

## Webhooks Overview

| Webhook | Table | Events | Edge Function | Purpose |
|---------|-------|--------|---------------|---------|
| `on-auth-event` | `auth.sessions` | INSERT, DELETE | `on-auth-event` | Server-side login/logout audit |
| `audit-log-sink` | `public.audit_logs` | INSERT | `audit-log-sink` | Forward audit rows to external sink |

> Both webhooks must be configured in **both vera-prod and vera-demo**.

---

## Authentication

All webhooks share a single shared-secret auth pattern:

- The Supabase dashboard lets you set a custom header when configuring a webhook.
- Set header name: `x-webhook-secret`, value: the same random string stored as the
  `WEBHOOK_HMAC_SECRET` environment variable on the Edge Function.
- The Edge Function reads `Deno.env.get("WEBHOOK_HMAC_SECRET")` and performs a
  **constant-time comparison** against the incoming header to prevent timing attacks.
- If the secret is absent or wrong, the function returns `{ ok: false, error: "Unauthorized" }`
  with HTTP 200 (never 401 — Supabase retries on non-2xx which would create duplicate events).

Generate the secret:

```bash
openssl rand -hex 32
```

Set it as an environment variable on both projects:
**Supabase Dashboard → Project → Edge Functions → [function name] → Secrets → `WEBHOOK_HMAC_SECRET`**

---

## `verify_jwt: false`

All webhook-triggered Edge Functions must have `verify_jwt` disabled in the Supabase dashboard.

**Why:** Webhooks are called by Supabase infrastructure, not by a browser session — there is no
user JWT in the request. Kong (the Supabase API gateway) rejects requests without a valid JWT by
default. With `verify_jwt: false`, Kong forwards the request and the function handles its own
authentication (via the `WEBHOOK_HMAC_SECRET` header check).

**Location:** Supabase Dashboard → Edge Functions → [function name] → Settings → disable "Enforce JWT"

> This setting is per-function and must be set on each project individually.

---

## Configuring a Webhook (Step-by-Step)

1. Go to **Supabase Dashboard → Database → Database Webhooks**.
2. Click **Create a new hook**.
3. Fill in:
   - **Name:** descriptive name (e.g. `on_auth_event`)
   - **Table:** select the schema and table (e.g. `auth` → `sessions`)
   - **Events:** check the relevant event types (INSERT / DELETE / UPDATE)
4. Under **Webhook configuration**, select **Supabase Edge Functions**.
5. Select the target Edge Function from the dropdown.
6. Under **HTTP Headers**, add:
   - Header: `x-webhook-secret`
   - Value: the `WEBHOOK_HMAC_SECRET` value for this project
7. Click **Create webhook**.
8. Repeat for the other project (vera-prod / vera-demo).

---

## Webhook: `on-auth-event`

**Triggers on:** `auth.sessions` INSERT (login) and DELETE (logout)

**Function:** `supabase/functions/on-auth-event/index.ts`

**What it does:**
- INSERT → writes `auth.admin.login.success` to `audit_logs` with `category='auth'`, `severity='info'`
- DELETE → writes `admin.logout` to `audit_logs` with `category='auth'`, `severity='info'`
- Resolves `organization_id` from `memberships` table using the session's `user_id`
  (super-admins have no org membership → `organization_id = null`)
- Extracts `ip_address` and `user_agent` from the session record (not accessible client-side)
- Uses service role for the audit insert (bypasses RLS)

**Required env vars on the function:**

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Injected automatically by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Injected automatically by Supabase |
| `WEBHOOK_HMAC_SECRET` | Shared secret for request authentication |

**Super-admin note:** Auth events for super-admins have `organization_id = null` because
super-admins have no `memberships` row. The Audit Log UI accounts for this via the
`includeNullOrg` flag in `applyAuditFilters` (active when `isSuper = true`), which expands
the query to include null-org rows with `category='auth'` or `category='security'`.

---

## Webhook: `audit-log-sink`

**Triggers on:** `public.audit_logs` INSERT

**Function:** `supabase/functions/audit-log-sink/index.ts`

**What it does:**
- Receives each new audit row as a webhook payload
- Forwards the row as a JSON POST to `AUDIT_SINK_WEBHOOK_URL` with `Authorization: Bearer AUDIT_SINK_API_KEY`
- Compatible with Axiom, Logtail, Logflare, or any generic JSON webhook endpoint
- If `AUDIT_SINK_WEBHOOK_URL` is not set, returns `{ ok: true, skipped: true }` gracefully (no retry)
- Always returns HTTP 200 to prevent Supabase from retrying and creating duplicate sink entries

**Required env vars on the function:**

| Variable | Description |
|----------|-------------|
| `WEBHOOK_HMAC_SECRET` | Shared secret for request authentication |
| `AUDIT_SINK_WEBHOOK_URL` | Target webhook URL (e.g. Axiom ingest endpoint) — **optional** |
| `AUDIT_SINK_API_KEY` | Bearer token for the sink service — **optional** |

**To activate:** Set `AUDIT_SINK_WEBHOOK_URL` and `AUDIT_SINK_API_KEY` on both projects.
Until set, the function silently skips forwarding.

---

## Cron-Scheduled Edge Function: `audit-anomaly-sweep`

Not a webhook — triggered by the Supabase Edge Function scheduler (cron). Listed here for
completeness as it is part of the audit infrastructure.

**Schedule:** Hourly

**Auth:** `X-Cron-Secret` header checked against `AUDIT_SWEEP_SECRET` env var

**Location:** Supabase Dashboard → Edge Functions → `audit-anomaly-sweep` → Schedule

**What it does:** Scans the last 60 minutes of `audit_logs` for two anomaly patterns:
- **IP multi-org:** same IP address, ≥ 5 distinct organizations in 60 minutes
- **PIN flood:** same organization, ≥ 10 `data.juror.pin.locked` events in 60 minutes

Writes `security.anomaly.detected` rows with `actor_type='system'` when triggered.

---

## Troubleshooting

**Webhook fires but no audit row appears**

Check Edge Function logs:
**Supabase Dashboard → Edge Functions → [function name] → Logs**

Look for:
- `Invalid or missing X-Webhook-Secret` → secret mismatch; re-check the header value set in the webhook config
- `Environment not configured` → `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` missing
- `audit insert failed` → RLS or schema issue; check the error message

**`execution_time_ms ≈ 0` in logs**

Kong pre-rejected the request before the function ran. Cause: `verify_jwt` is still enabled.
Disable it in **Edge Functions → [function] → Settings**.

**Duplicate audit rows on login**

If both the client-side `writeAuditLog` call and the `on-auth-event` webhook are active,
each login produces two rows. The client-side calls in `AuthProvider.jsx` must be removed
once the webhook is confirmed working. See `docs/audit/audit-gaps-remaining.md`.
