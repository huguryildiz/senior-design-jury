# System Health — Edge Function Fix + Historic AreaChart

**Date:** 2026-04-11
**Scope:** Fix `platform-metrics` edge function deployment + add latency history chart to `SystemHealthDrawer`

---

## Problem

1. `rpc_platform_metrics()` SQL exists in `sql/migrations-v0/015_platform_metrics_rpc.sql` but was never promoted to the active migrations folder. The `platform-metrics` edge function exists in code but is not deployed. This causes the "Edge Functions: Degraded" status in the System Health drawer and all DB metrics show `—`.

2. The drawer has no historical view — every open is a fresh snapshot with no trend context.

---

## Solution

Two independent parts: (1) fix the edge function, (2) add the chart.

---

## Part 1 — Edge Function Fix

### Migration

Create `sql/migrations/033_platform_metrics_rpc.sql` by promoting the existing SQL from `migrations-v0/015_platform_metrics_rpc.sql`. No schema changes — identical content, new canonical location.

Apply to both `vera-prod` and `vera-demo` via Supabase MCP (`mcp__claude_ai_Supabase__apply_migration`).

The RPC signature:

```sql
CREATE OR REPLACE FUNCTION public.rpc_platform_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
```

Returns: `db_size_bytes`, `db_size_pretty`, `active_connections`, `audit_requests_24h`, `total_organizations`, `total_jurors`.

Access: revoked from `PUBLIC`, `authenticated`, `anon` — callable only by service role (used by the edge function).

### Edge Function Deploy

Deploy `supabase/functions/platform-metrics/index.ts` to both projects via `mcp__claude_ai_Supabase__deploy_edge_function`.

The function verifies the caller is `super_admin` via `current_user_is_super_admin()` RPC (using the user's JWT), then fetches metrics using a service-role client. No env var changes needed — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by Supabase.

### Verification

After deploy, confirm via `mcp__claude_ai_Supabase__get_logs` that the function returns 200. The System Health drawer should then show real values for Active Connections, API Requests (24h), and DB Storage Used.

---

## Part 2 — Historic AreaChart

### Data Model

Each `runChecks()` call produces a snapshot object:

```js
{ ts: Date.now(), dbMs: number, authMs: number, edgeMs: number }
```

History is stored in `localStorage` under the key `"vera_health_history"` as a JSON array. Maximum 20 entries — when a new snapshot is added and the array exceeds 20, the oldest entry is dropped (shift). This gives roughly 20 manual refreshes worth of history, persisting across drawer close/open and page reloads.

No DB table. No migration beyond Part 1.

### Chart

Recharts `<AreaChart>` (already in project at `recharts@^3.8.0`). Three `<Area>` series:

| Series | Color | Stroke |
|--------|-------|--------|
| DB Latency | `#22c55e` | 1.8px |
| Auth Latency | `#60a5fa` | 1.5px dashed |
| Edge Latency | `#f97316` | 1.8px |

Each area has a vertical gradient fill (color at 20% opacity → transparent), matching the mockup and VERA's analytics tab aesthetic.

X axis: check index (1…N) — no timestamp labels, keeps it compact.
Y axis: milliseconds, auto-scaled by Recharts.
Tooltip: custom, shows `dbMs`, `authMs`, `edgeMs` on hover.
Responsive container: `width="100%"`, `height={100}`.

### Placement in `GovernanceDrawers.jsx`

New `"Latency Trend"` section inserted between the Performance table and the Overall Status card — identical to the mockup layout. Section header: `"LATENCY TREND — LAST {n} CHECKS"`.

Section only renders when `history.length >= 2` (need at least 2 points for a line). With 0–1 points, the section is hidden — no empty state needed.

### localStorage helpers (inline, no separate file)

Two small inline helpers at the top of `SystemHealthDrawer`:

```js
function loadHistory() {
  try { return JSON.parse(localStorage.getItem("vera_health_history") || "[]"); }
  catch { return []; }
}
function saveHistory(h) {
  localStorage.setItem("vera_health_history", JSON.stringify(h.slice(-20)));
}
```

State: `const [history, setHistory] = useState(loadHistory)`.

After each `runChecks()` completes, append the new snapshot and save:

```js
setHistory(prev => {
  const next = [...prev, { ts: Date.now(), dbMs: db.latency, authMs: auth.latency, edgeMs: metrics.latency }];
  saveHistory(next);
  return next;
});
```

### Changes

| File | Change |
|------|--------|
| `sql/migrations/033_platform_metrics_rpc.sql` | New file (promoted from migrations-v0) |
| `supabase/functions/platform-metrics/index.ts` | No code change — deploy only |
| `src/admin/drawers/GovernanceDrawers.jsx` | Add history state + localStorage helpers + AreaChart section |

No other files touched.

---

## Out of Scope

- Auto-refresh polling (manual Refresh only)
- DB table for health history
- Per-function edge function health breakdown
- Sparklines on individual metric rows (Option B — not chosen)
