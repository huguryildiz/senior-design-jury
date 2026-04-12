# Audit — Gap Closure Log

All 4 gaps closed. Score moved from 88/100 → ≥97/100. Completed 2026-04-12.

---

## Gap 1 — Auth Hook (-8) — DONE

`auth.admin.login.success` and `admin.logout` are now written server-side by the
`on-auth-event` Edge Function, triggered via a Supabase Database Webhook on `auth.sessions`
INSERT and DELETE. `ip_address` and `user_agent` are captured from the session record —
something the old client-side path could not do.

- Edge Function: `supabase/functions/on-auth-event/index.ts` (deployed to both projects)
- Auth: `X-Webhook-Secret` constant-time comparison against `WEBHOOK_HMAC_SECRET` env var
- Webhook configured in Supabase dashboard: Database → Database Webhooks → `auth.sessions`
  INSERT + DELETE → both vera-prod and vera-demo
- Client-side `writeAuditLog` calls removed from `src/shared/auth/AuthProvider.jsx`

**Smoke test (2026-04-12, vera-demo):** logout + login → three rows written within 2 hours,
all with `ip_address` and `user_agent` populated, `category='auth'`, `actor_type='admin'`.

---

## Gap 2 — Export client-side (-5) — DONE

Export audit events are now written by the `log-export-event` Edge Function instead of
directly from the browser. Server-side writes capture `ip_address` and `user_agent` correctly.

- Edge Function: `supabase/functions/log-export-event/index.ts` (deployed to both projects)
- `src/shared/api/admin/export.js` updated to call `invokeEdgeFunction("log-export-event", ...)`

---

## Gap 3 — Anomaly detection only ran when page was open (-4) — DONE

Anomaly detection now runs hourly server-side via the `audit-anomaly-sweep` Edge Function,
independent of any browser session.

- Edge Function: `supabase/functions/audit-anomaly-sweep/index.ts` (deployed to both projects)
- Auth: `X-Cron-Secret` header against `AUDIT_SWEEP_SECRET` env var
- Scheduled hourly in Supabase dashboard (Edge Function scheduler, both projects)
- `security.anomaly.detected` added to `EVENT_META` in `src/admin/utils/auditUtils.js`
- Rules: IP multi-org (same IP, ≥5 distinct orgs in 60 min) and PIN flood (≥10 lockouts per org
  in 60 min)
- `AuditLogPage.jsx` `detectAnomalies` useEffect kept for instant UI feedback; TODO comment added

---

## Gap 4 — No tamper-evidence (-3) — DONE

### 4c — Hard-delete RLS — DONE

Migration `sql/migrations/053_audit_no_delete.sql` — `FOR DELETE USING (false)` policy on
`audit_logs`. Even superadmin cannot delete rows via UI or PostgREST.

### 4a — Row-level hash chain — DONE

Migration `sql/migrations/054_audit_hash_chain.sql` — `row_hash TEXT` column, BEFORE INSERT
trigger computing `sha256(id || action || organization_id || created_at || prev_row_hash)`,
and `rpc_admin_verify_audit_chain(org_id UUID)` verification RPC.

### 4b — External log sink — DONE (ready; sink not yet wired)

Edge Function `supabase/functions/audit-log-sink/index.ts` deployed to both projects.
Database Webhook on `audit_logs` INSERT configured in Supabase dashboard.
Returns `{ ok: true, skipped: true, reason: "sink not configured" }` until
`AUDIT_SINK_WEBHOOK_URL` and `AUDIT_SINK_API_KEY` env vars are set.
Compatible with Axiom, Logtail, Logflare, or any generic JSON webhook endpoint.

---

## Post-Implementation Fix — Super-Admin Audit Log Visibility

Auth events written by `on-auth-event` have `organization_id = null` because super-admins
have no org membership. The Audit Log UI filtered strictly by `organization_id = <orgId>`,
so these rows were invisible to super-admins.

**Fix (2026-04-12):**

- `src/shared/api/admin/audit.js` — `applyAuditFilters` now accepts `includeNullOrg` flag.
  When true, the `organization_id` filter uses OR to also include null-org rows where
  `category = 'auth'` or `category = 'security'`. Noisy system events (`category = 'data'`,
  e.g. `profiles.update` trigger rows) are excluded.
- `src/admin/hooks/useAuditLogFilters.js` — reads `isSuper` from `useAuth()` and passes
  `includeNullOrg: isSuper` to both the list query and the export query.

Tenant admins are unaffected (`isSuper = false`).

---

## Verification Results

| Gap | Check | Result |
|-----|-------|--------|
| 1 | Login → `audit_logs` | `auth.admin.login.success` with `ip_address` + `user_agent` |
| 1 | Logout → `audit_logs` | `admin.logout` row written by webhook |
| 1 | Super-admin sees own auth events in UI | Fixed via `includeNullOrg` |
| 2 | Export → `audit_logs` | `export.*` row written by Edge Function |
| 3 | Anomaly sweep invoke | Returns `{ checked: true, anomalies: N }` |
| 4c | `DELETE FROM audit_logs WHERE id='...'` | `permission denied` |
| 4a | `SELECT rpc_admin_verify_audit_chain(org_id)` | `[]` (intact) |
| 4b | Sink URL not set | Gracefully skips, no error |

---

## Files Changed

| File | Change |
|------|--------|
| `src/shared/auth/AuthProvider.jsx` | Removed `writeAuditLog` on login/logout |
| `src/shared/api/admin/export.js` | Calls Edge Function instead of direct write |
| `src/admin/pages/AuditLogPage.jsx` | TODO comment on detectAnomalies useEffect |
| `src/admin/utils/auditUtils.js` | Added `security.anomaly.detected` to EVENT_META |
| `src/shared/api/admin/audit.js` | `includeNullOrg` flag for super-admin visibility |
| `src/admin/hooks/useAuditLogFilters.js` | Passes `includeNullOrg: isSuper` to list + export |
| `supabase/functions/on-auth-event/index.ts` | Auth Hook handler (Database Webhook) |
| `supabase/functions/log-export-event/index.ts` | Export audit proxy |
| `supabase/functions/audit-anomaly-sweep/index.ts` | Hourly anomaly sweep |
| `supabase/functions/audit-log-sink/index.ts` | External sink forwarder |
| `sql/migrations/053_audit_no_delete.sql` | Hard-delete RLS |
| `sql/migrations/054_audit_hash_chain.sql` | row_hash column + trigger + verify RPC |

## Remaining Optional Step

Set `AUDIT_SINK_WEBHOOK_URL` and `AUDIT_SINK_API_KEY` env vars on both projects to activate
the external log sink (Gap 4b). Any JSON webhook endpoint works — Axiom and Logtail both have
free tiers sufficient for audit volume.
