// supabase/functions/audit-anomaly-sweep/index.ts
// ============================================================
// Hourly anomaly detection sweep for audit_logs.
//
// Called by Supabase Edge Function scheduler (or pg_cron) — not by users.
// Protected by X-Cron-Secret header (must match AUDIT_SWEEP_SECRET env var).
//
// Anomaly rules (last 60 min window):
//   ip_multi_org   — same ip_address seen in ≥5 distinct org login events
//   pin_flood      — same org_id, ≥10 juror.pin_locked events
//
// Writes security.anomaly.detected rows via service role (actor_type=system).
// Returns { checked: true, anomalies: N }.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // Authenticate cron caller via shared secret
  const cronSecret = Deno.env.get("AUDIT_SWEEP_SECRET") || "";
  const providedSecret = req.headers.get("x-cron-secret") || "";
  if (!cronSecret || providedSecret !== cronSecret) {
    return json(401, { error: "Unauthorized: invalid or missing cron secret" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: "Supabase environment not configured." });
  }

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Window: last 60 minutes
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Fetch recent audit_logs rows
  const { data: rows, error: fetchErr } = await service
    .from("audit_logs")
    .select("id, action, organization_id, ip_address, created_at")
    .gte("created_at", windowStart);

  if (fetchErr) {
    console.error("audit-anomaly-sweep: fetch failed:", fetchErr);
    return json(500, { error: "Failed to fetch audit logs", details: fetchErr.message });
  }

  const logs = rows || [];
  const anomalies: Array<Record<string, unknown>> = [];

  // ── Rule 1: ip_multi_org ─────────────────────────────────────────────────
  // Same IP seen in login events across ≥5 distinct orgs
  const loginActions = new Set([
    "auth.admin.login.success",
    "auth.admin.login.failed",
    "auth.admin.login",
  ]);

  const ipOrgMap: Map<string, Set<string>> = new Map();
  for (const row of logs) {
    if (!row.ip_address || !loginActions.has(row.action)) continue;
    if (!ipOrgMap.has(row.ip_address)) ipOrgMap.set(row.ip_address, new Set());
    if (row.organization_id) ipOrgMap.get(row.ip_address)!.add(row.organization_id);
  }

  for (const [ip, orgs] of ipOrgMap.entries()) {
    if (orgs.size >= 5) {
      anomalies.push({
        type: "ip_multi_org",
        ip_address: ip,
        org_count: orgs.size,
        org_ids: Array.from(orgs),
      });
    }
  }

  // ── Rule 2: pin_flood ────────────────────────────────────────────────────
  // Same org, ≥10 juror.pin_locked events in the window
  const pinFloodMap: Map<string, number> = new Map();
  for (const row of logs) {
    if (row.action !== "juror.pin_locked") continue;
    const org = row.organization_id || "__null__";
    pinFloodMap.set(org, (pinFloodMap.get(org) || 0) + 1);
  }

  for (const [org, count] of pinFloodMap.entries()) {
    if (count >= 10) {
      anomalies.push({
        type: "pin_flood",
        organization_id: org === "__null__" ? null : org,
        event_count: count,
      });
    }
  }

  // ── Write anomaly rows ───────────────────────────────────────────────────
  let writeErrors = 0;
  for (const anomaly of anomalies) {
    const { type, organization_id, ...rest } = anomaly;
    const org = (organization_id && organization_id !== "__null__") ? organization_id as string : null;

    const { error: writeErr } = await service.from("audit_logs").insert({
      action: "security.anomaly.detected",
      organization_id: org,
      user_id: null,
      resource_type: null,
      resource_id: null,
      category: "security",
      severity: "high",
      actor_type: "system",
      details: { anomaly_type: type, window_start: windowStart, ...rest },
      diff: null,
      ip_address: null,
      user_agent: null,
    });

    if (writeErr) {
      console.error(`audit-anomaly-sweep: failed to write anomaly (${type}):`, writeErr);
      writeErrors++;
    }
  }

  console.log(`audit-anomaly-sweep: checked ${logs.length} rows, detected ${anomalies.length} anomalies, ${writeErrors} write errors`);

  return json(200, {
    checked: true,
    window_start: windowStart,
    logs_scanned: logs.length,
    anomalies: anomalies.length,
    write_errors: writeErrors,
  });
});
