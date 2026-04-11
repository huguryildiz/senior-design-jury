# System Health — Edge Function Fix + Historic AreaChart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the `platform-metrics` edge function (deploy RPC + function to both Supabase projects) and add a recharts AreaChart to `SystemHealthDrawer` that shows DB/Auth/Edge latency history stored in localStorage.

**Architecture:** Two independent parts — (1) a new SQL migration `033_platform_metrics_rpc.sql` applied to both projects via Supabase MCP, followed by edge function deploy; (2) localStorage history state + recharts `AreaChart` wired into the existing `SystemHealthDrawer` component via a `runChecks` callback extension.

**Tech Stack:** Supabase MCP (`mcp__claude_ai_Supabase__*`), recharts 3.x (already installed), React useState/useCallback, localStorage

---

## File Map

| File | Action |
|------|--------|
| `sql/migrations/033_platform_metrics_rpc.sql` | Create — promote SQL from `migrations-v0/015_platform_metrics_rpc.sql` |
| `supabase/functions/platform-metrics/index.ts` | No code change — deploy only (both projects) |
| `src/admin/drawers/GovernanceDrawers.jsx` | Modify — add recharts import, localStorage helpers, history state, AreaChart section |

---

## Task 1: Create migration `033_platform_metrics_rpc.sql`

**Files:**
- Create: `sql/migrations/033_platform_metrics_rpc.sql`

- [ ] **Step 1: Create the migration file**

  Copy content from `sql/migrations-v0/015_platform_metrics_rpc.sql` verbatim. The only change is the file location and a corrected header comment.

  Full file content:

  ```sql
  -- sql/migrations/033_platform_metrics_rpc.sql
  -- ============================================================
  -- RPC: rpc_platform_metrics
  -- Returns live DB-level metrics for the System Health drawer.
  -- Called exclusively by the platform-metrics Edge Function
  -- (which uses service role, bypassing RLS).
  --
  -- Metrics returned:
  --   db_size_bytes        — raw pg_database_size()
  --   db_size_pretty       — human-readable (e.g. "84 MB")
  --   active_connections   — pg_stat_activity rows with state='active'
  --   audit_requests_24h   — audit_logs rows created in last 24h
  --   total_organizations  — count of organizations
  --   total_jurors         — count of jurors
  -- ============================================================

  CREATE OR REPLACE FUNCTION public.rpc_platform_metrics()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_db_size_bytes      bigint;
    v_db_size_pretty     text;
    v_active_connections bigint;
    v_audit_24h          bigint;
    v_total_orgs         bigint;
    v_total_jurors       bigint;
  BEGIN
    SELECT pg_database_size(current_database())
      INTO v_db_size_bytes;

    SELECT pg_size_pretty(v_db_size_bytes)
      INTO v_db_size_pretty;

    SELECT count(*)
      INTO v_active_connections
      FROM pg_stat_activity
     WHERE state = 'active';

    SELECT count(*)
      INTO v_audit_24h
      FROM audit_logs
     WHERE created_at > now() - interval '24 hours';

    SELECT count(*)
      INTO v_total_orgs
      FROM organizations;

    SELECT count(*)
      INTO v_total_jurors
      FROM jurors;

    RETURN jsonb_build_object(
      'db_size_bytes',       v_db_size_bytes,
      'db_size_pretty',      v_db_size_pretty,
      'active_connections',  v_active_connections,
      'audit_requests_24h',  v_audit_24h,
      'total_organizations', v_total_orgs,
      'total_jurors',        v_total_jurors
    );
  END;
  $$;

  -- Only service role should call this directly; no authenticated grant needed
  -- (Edge Function uses service role client)
  REVOKE ALL ON FUNCTION public.rpc_platform_metrics() FROM PUBLIC, authenticated, anon;
  ```

---

## Task 2: Apply migration to vera-prod

**Files:** Supabase MCP only (no local file changes)

- [ ] **Step 1: Apply to vera-prod**

  Use `mcp__claude_ai_Supabase__apply_migration` with:
  - `project_id`: `etxgvkvxvbyserhrugjw`
  - `name`: `033_platform_metrics_rpc`
  - `query`: full SQL content from Task 1

- [ ] **Step 2: Verify the function exists**

  Use `mcp__claude_ai_Supabase__execute_sql` on `etxgvkvxvbyserhrugjw`:

  ```sql
  SELECT proname, prosecdef
  FROM pg_proc
  WHERE proname = 'rpc_platform_metrics';
  ```

  Expected: one row with `proname = rpc_platform_metrics`, `prosecdef = true`.

---

## Task 3: Apply migration to vera-demo

**Files:** Supabase MCP only

- [ ] **Step 1: Apply to vera-demo**

  Use `mcp__claude_ai_Supabase__apply_migration` with:
  - `project_id`: `kmprsxrofnemmsryjhfj`
  - `name`: `033_platform_metrics_rpc`
  - `query`: same SQL as Task 1

- [ ] **Step 2: Verify**

  Use `mcp__claude_ai_Supabase__execute_sql` on `kmprsxrofnemmsryjhfj`:

  ```sql
  SELECT proname, prosecdef
  FROM pg_proc
  WHERE proname = 'rpc_platform_metrics';
  ```

  Expected: one row, `prosecdef = true`.

---

## Task 4: Deploy `platform-metrics` edge function to both projects

**Files:** `supabase/functions/platform-metrics/index.ts` (no code change — deploy only)

- [ ] **Step 1: Deploy to vera-prod**

  Use `mcp__claude_ai_Supabase__deploy_edge_function` with:
  - `project_id`: `etxgvkvxvbyserhrugjw`
  - `name`: `platform-metrics`
  - `entrypoint_path`: `supabase/functions/platform-metrics/index.ts`

- [ ] **Step 2: Deploy to vera-demo**

  Use `mcp__claude_ai_Supabase__deploy_edge_function` with:
  - `project_id`: `kmprsxrofnemmsryjhfj`
  - `name`: `platform-metrics`
  - `entrypoint_path`: `supabase/functions/platform-metrics/index.ts`

- [ ] **Step 3: Check vera-prod logs**

  Use `mcp__claude_ai_Supabase__get_logs` with:
  - `project_id`: `etxgvkvxvbyserhrugjw`
  - `service`: `edge-functions`

  Look for any startup errors. A clean deploy produces no error lines. If you see `rpc_platform_metrics does not exist`, the migration from Task 2 did not apply — re-run Task 2 Step 1.

---

## Task 5: Add recharts import and localStorage helpers to `GovernanceDrawers.jsx`

**Files:**
- Modify: `src/admin/drawers/GovernanceDrawers.jsx`

- [ ] **Step 1: Add recharts import**

  At line 7, the existing import block starts with React hooks. Add recharts import after line 7:

  Current line 7:
  ```js
  import { useState, useEffect, useCallback } from "react";
  ```

  Add immediately after (as line 8):
  ```js
  import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
  ```

- [ ] **Step 2: Add localStorage helpers**

  Add two helper functions immediately before `function statusColor(ok)` at line 821 (after the `// ── 6. System Health ──` comment at line 819):

  ```js
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem("vera_health_history") || "[]"); }
    catch { return []; }
  }

  function saveHistory(h) {
    localStorage.setItem("vera_health_history", JSON.stringify(h.slice(-20)));
  }
  ```

---

## Task 6: Add history state and wire it into `runChecks`

**Files:**
- Modify: `src/admin/drawers/GovernanceDrawers.jsx`

- [ ] **Step 1: Add history state**

  Inside `SystemHealthDrawer` at line 858, after the existing `useState` declarations, add:

  Current state block (lines 859–867):
  ```js
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState(null);
  const [health, setHealth] = useState({
    api:         { ok: null, latency: null, errorMsg: null },
    db:          { ok: null, latency: null, errorMsg: null },
    auth:        { ok: null, latency: null, errorMsg: null },
    edge:        { ok: null, latency: null, errorMsg: null },
    metricsData: null,
  });
  ```

  Replace with (adds `history` state on the last line):
  ```js
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState(null);
  const [health, setHealth] = useState({
    api:         { ok: null, latency: null, errorMsg: null },
    db:          { ok: null, latency: null, errorMsg: null },
    auth:        { ok: null, latency: null, errorMsg: null },
    edge:        { ok: null, latency: null, errorMsg: null },
    metricsData: null,
  });
  const [history, setHistory] = useState(loadHistory);
  ```

- [ ] **Step 2: Extend `runChecks` to append a history snapshot**

  Current `runChecks` (lines 869–881):
  ```js
  const runChecks = useCallback(async () => {
    setChecking(true);
    const [db, auth, metrics] = await Promise.all([pingDb(), pingAuth(), pingMetrics()]);
    setHealth({
      api:         { ok: db.ok, latency: db.latency, errorMsg: db.errorMsg ? `API: ${db.errorMsg}` : null },
      db:          { ok: db.ok, latency: db.latency, errorMsg: db.errorMsg ? `DB: ${db.errorMsg}` : null },
      auth:        { ok: auth.ok, latency: auth.latency, errorMsg: auth.errorMsg ? `Auth: ${auth.errorMsg}` : null },
      edge:        { ok: metrics.ok, latency: metrics.latency, errorMsg: metrics.errorMsg ? `Edge Functions: ${metrics.errorMsg}` : null },
      metricsData: metrics.data,
    });
    setCheckedAt(new Date());
    setChecking(false);
  }, []);
  ```

  Replace with (adds `setHistory` call after `setHealth`):
  ```js
  const runChecks = useCallback(async () => {
    setChecking(true);
    const [db, auth, metrics] = await Promise.all([pingDb(), pingAuth(), pingMetrics()]);
    setHealth({
      api:         { ok: db.ok, latency: db.latency, errorMsg: db.errorMsg ? `API: ${db.errorMsg}` : null },
      db:          { ok: db.ok, latency: db.latency, errorMsg: db.errorMsg ? `DB: ${db.errorMsg}` : null },
      auth:        { ok: auth.ok, latency: auth.latency, errorMsg: auth.errorMsg ? `Auth: ${auth.errorMsg}` : null },
      edge:        { ok: metrics.ok, latency: metrics.latency, errorMsg: metrics.errorMsg ? `Edge Functions: ${metrics.errorMsg}` : null },
      metricsData: metrics.data,
    });
    setHistory((prev) => {
      const next = [...prev, { ts: Date.now(), dbMs: db.latency, authMs: auth.latency, edgeMs: metrics.latency }];
      saveHistory(next);
      return next;
    });
    setCheckedAt(new Date());
    setChecking(false);
  }, []);
  ```

---

## Task 7: Add AreaChart section to JSX

**Files:**
- Modify: `src/admin/drawers/GovernanceDrawers.jsx`

- [ ] **Step 1: Insert AreaChart section between Performance table and Overall Status**

  Find the closing `</div>` of the PERF table at line 1003 (the line that ends `{PERF.map(...)}` block and closes the border div):

  ```jsx
        </div>

        <SectionLabel style={{ marginTop: 4 }}>Overall Status</SectionLabel>
  ```

  Replace with:

  ```jsx
        </div>

        {history.length >= 2 && (
          <>
            <SectionLabel style={{ marginTop: 4 }}>
              Latency Trend — Last {history.length} Check{history.length !== 1 ? "s" : ""}
            </SectionLabel>
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
              <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
                {[
                  { color: "#22c55e", label: "DB" },
                  { color: "#60a5fa", label: "Auth" },
                  { color: "#f97316", label: "Edge" },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--text-tertiary)" }}>
                    <div style={{ width: 10, height: 2, borderRadius: 1, background: color }} />
                    {label}
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={90}>
                <AreaChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="shDB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="shEdge" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="ts" hide />
                  <YAxis tick={{ fontSize: 9, fill: "var(--text-tertiary)" }} width={32} unit="ms" />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
                    formatter={(v, name) => [`${v}ms`, name]}
                    labelFormatter={() => ""}
                  />
                  <Area type="monotone" dataKey="dbMs" name="DB" stroke="#22c55e" strokeWidth={1.8} fill="url(#shDB)" dot={false} />
                  <Area type="monotone" dataKey="authMs" name="Auth" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="4 2" fill="none" dot={false} />
                  <Area type="monotone" dataKey="edgeMs" name="Edge" stroke="#f97316" strokeWidth={1.8} fill="url(#shEdge)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        <SectionLabel style={{ marginTop: 4 }}>Overall Status</SectionLabel>
  ```

---

## Task 8: Verify the build and test visually

**Files:** No changes

- [ ] **Step 1: Run the build check**

  ```bash
  npm run build 2>&1 | tail -20
  ```

  Expected: `built in Xs` with no errors. If recharts import fails, check the import path — recharts 3.x exports `AreaChart`, `Area`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer` from the root package.

- [ ] **Step 2: Start dev server and test**

  ```bash
  npm run dev
  ```

  Open the admin panel → Organizations page → Platform Governance card → "System Health" button.

  **First open:** Drawer opens, auto-runs checks. After checks complete, the "Latency Trend" section does NOT appear (only 1 data point).

  **Click Refresh:** After second check completes, the "Latency Trend" section appears with a 2-point chart. Hover the chart — tooltip shows `dbMs`, `authMs`, `edgeMs`.

  **Close and reopen drawer:** History persists (loaded from localStorage). Chart shows previously accumulated points.

  **Edge function fixed:** Active Connections, API Requests (24h), DB Storage Used now show real values instead of `—`. Edge Functions status shows "Running" (green) instead of "Degraded".

- [ ] **Step 3: Verify localStorage**

  In DevTools → Application → Local Storage → `localhost`:
  - Key `vera_health_history` exists
  - Value is a JSON array of objects with keys `ts`, `dbMs`, `authMs`, `edgeMs`
  - After 20+ refreshes, array length stays at 20 (oldest dropped)
