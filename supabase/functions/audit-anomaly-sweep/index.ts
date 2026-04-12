// supabase/functions/audit-anomaly-sweep/index.ts
// ============================================================
// Hourly anomaly detection sweep for audit_logs.
//
// Called by Supabase Edge Function scheduler (or pg_cron) — not by users.
// Protected by X-Cron-Secret header (must match AUDIT_SWEEP_SECRET env var).
//
// Anomaly rules (last 60 min window):
//   ip_multi_org        — same ip_address seen across ≥2 distinct orgs (any action)
//   pin_flood           — same org_id, ≥10 juror.pin_locked events
//   login_failure_burst — same org_id, ≥5 auth.admin.login.failure events
//   org_suspended       — any organization.status_changed with newStatus=suspended
//   token_revoke_burst  — same org_id, ≥2 entry-token revocations
//   export_burst        — same org_id, ≥5 export.* events
//
// Deduplication: anomalies already written in the last 2 h are skipped.
// Chain verification: _audit_verify_chain_internal(null) runs each sweep;
//   broken links write a security.chain.broken row (severity=critical).
//
// Writes via service role (actor_type=system, user_id=null).
// Returns { checked: true, anomalies: N, chain_ok: bool }.
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

/** Stable dedup key for an anomaly candidate before it is written. */
function anomalyDedupKey(type: string, anomaly: Record<string, unknown>): string {
  const discriminator =
    (anomaly.ip_address as string) ||
    (anomaly.organization_id as string) ||
    "__global__";
  return `${type}:${discriminator}`;
}

/** Reconstruct the dedup key from a previously-written details JSONB blob. */
function detailsDedupKey(details: Record<string, unknown>): string {
  const type = (details.anomaly_type as string) || "";
  const discriminator =
    (details.ip_address as string) ||
    (details.organization_id as string) ||
    "__global__";
  return `${type}:${discriminator}`;
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
  // Dedup window: last 2 hours (2× sweep interval)
  const dedupWindow = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  // ── Fetch recent audit rows for rule evaluation ──────────────────────────
  const { data: rows, error: fetchErr } = await service
    .from("audit_logs")
    .select("id, action, organization_id, ip_address, created_at, details")
    .gte("created_at", windowStart);

  if (fetchErr) {
    console.error("audit-anomaly-sweep: fetch failed:", fetchErr);
    return json(500, { error: "Failed to fetch audit logs", details: fetchErr.message });
  }

  // ── Fetch recently-written anomalies for deduplication ──────────────────
  const { data: recentAnomalyRows } = await service
    .from("audit_logs")
    .select("details")
    .eq("action", "security.anomaly.detected")
    .gte("created_at", dedupWindow);

  const recentAnomalyKeys = new Set<string>(
    (recentAnomalyRows || []).map((r: { details: Record<string, unknown> }) =>
      detailsDedupKey(r.details || {})
    )
  );

  const logs = rows || [];
  const anomalies: Array<Record<string, unknown>> = [];

  // ── Rule 1: ip_multi_org ─────────────────────────────────────────────────
  // Same IP seen across ≥2 distinct orgs (any action).
  const ipOrgMap: Map<string, Set<string>> = new Map();
  for (const row of logs) {
    if (!row.ip_address || !row.organization_id) continue;
    if (!ipOrgMap.has(row.ip_address)) ipOrgMap.set(row.ip_address, new Set());
    ipOrgMap.get(row.ip_address)!.add(row.organization_id);
  }

  for (const [ip, orgs] of ipOrgMap.entries()) {
    if (orgs.size >= 2) {
      anomalies.push({
        type: "ip_multi_org",
        ip_address: ip,
        org_count: orgs.size,
        org_ids: Array.from(orgs),
      });
    }
  }

  // ── Rule 2: pin_flood ────────────────────────────────────────────────────
  // Same org, ≥10 juror.pin_locked events in the window.
  const pinFloodMap: Map<string, number> = new Map();
  for (const row of logs) {
    if (row.action !== "juror.pin_locked" && row.action !== "data.juror.pin.locked") continue;
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

  // ── Rule 3: login_failure_burst ──────────────────────────────────────────
  // Same org, ≥5 auth.admin.login.failure events in the window.
  const loginFailureMap: Map<string, number> = new Map();
  for (const row of logs) {
    if (row.action !== "auth.admin.login.failure" && row.action !== "admin.login.failure") continue;
    const org = row.organization_id || "__null__";
    loginFailureMap.set(org, (loginFailureMap.get(org) || 0) + 1);
  }

  for (const [org, count] of loginFailureMap.entries()) {
    if (count >= 5) {
      anomalies.push({
        type: "login_failure_burst",
        organization_id: org === "__null__" ? null : org,
        event_count: count,
      });
    }
  }

  // ── Rule 4: org_suspended ────────────────────────────────────────────────
  // Any organization suspended in the window.
  for (const row of logs) {
    if (row.action !== "organization.status_changed") continue;
    const det = (row as { details?: Record<string, unknown> }).details;
    if (!det || det.newStatus !== "suspended") continue;
    anomalies.push({
      type: "org_suspended",
      organization_id: row.organization_id || null,
      event_count: 1,
    });
  }

  // ── Rule 5: token_revoke_burst ──────────────────────────────────────────
  // Same org, ≥2 entry-token revocations in the window.
  const tokenRevokeMap: Map<string, number> = new Map();
  for (const row of logs) {
    if (row.action !== "security.entry_token.revoked" && row.action !== "token.revoke") continue;
    const org = row.organization_id || "__null__";
    tokenRevokeMap.set(org, (tokenRevokeMap.get(org) || 0) + 1);
  }

  for (const [org, count] of tokenRevokeMap.entries()) {
    if (count >= 2) {
      anomalies.push({
        type: "token_revoke_burst",
        organization_id: org === "__null__" ? null : org,
        event_count: count,
      });
    }
  }

  // ── Rule 6: export_burst ────────────────────────────────────────────────
  // Same org, ≥5 export events in the window.
  const exportBurstMap: Map<string, number> = new Map();
  for (const row of logs) {
    if (!row.action?.startsWith("export.")) continue;
    const org = row.organization_id || "__null__";
    exportBurstMap.set(org, (exportBurstMap.get(org) || 0) + 1);
  }

  for (const [org, count] of exportBurstMap.entries()) {
    if (count >= 5) {
      anomalies.push({
        type: "export_burst",
        organization_id: org === "__null__" ? null : org,
        event_count: count,
      });
    }
  }

  // ── Write anomaly rows (with dedup) ──────────────────────────────────────
  let writeErrors = 0;
  let skipped = 0;

  for (const anomaly of anomalies) {
    const { type, organization_id, ...rest } = anomaly;
    const org = (organization_id && organization_id !== "__null__") ? organization_id as string : null;
    const dedupKey = anomalyDedupKey(type as string, anomaly);

    if (recentAnomalyKeys.has(dedupKey)) {
      console.log(`audit-anomaly-sweep: dedup skip (${type}) key=${dedupKey}`);
      skipped++;
      continue;
    }

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
    } else {
      // Add to dedup set so subsequent iterations in the same run don't double-write
      recentAnomalyKeys.add(dedupKey);
    }
  }

  // ── Auto chain verification ──────────────────────────────────────────────
  // Runs every sweep so broken links are caught without manual intervention.
  let chainOk = true;
  const { data: chainResult, error: chainErr } = await service.rpc(
    "_audit_verify_chain_internal",
    { p_org_id: null }
  );

  if (chainErr) {
    // Fail closed: if verification itself fails, never report chain_ok=true.
    chainOk = false;
    console.error("audit-anomaly-sweep: chain verify RPC failed:", chainErr);
  } else {
    const broken: unknown[] = Array.isArray(chainResult) ? chainResult : (chainResult?.broken_links ?? chainResult?.broken ?? []);
    chainOk = broken.length === 0;

    if (!chainOk) {
      const { error: chainWriteErr } = await service.from("audit_logs").insert({
        action: "security.chain.broken",
        organization_id: null,
        user_id: null,
        resource_type: null,
        resource_id: null,
        category: "security",
        severity: "critical",
        actor_type: "system",
        details: {
          broken_count: broken.length,
          earliest_break: broken[0],
        },
        diff: null,
        ip_address: null,
        user_agent: null,
      });

      if (chainWriteErr) {
        console.error("audit-anomaly-sweep: failed to write chain.broken event:", chainWriteErr);
      } else {
        console.warn(`audit-anomaly-sweep: hash chain broken at ${broken.length} point(s) — earliest: ${broken[0]}`);
      }
    }
  }

  console.log(
    `audit-anomaly-sweep: scanned ${logs.length} rows, ` +
    `detected ${anomalies.length} anomalies (${skipped} deduped, ${writeErrors} write errors), ` +
    `chain_ok=${chainOk}`
  );

  return json(200, {
    checked: true,
    window_start: windowStart,
    logs_scanned: logs.length,
    anomalies: anomalies.length,
    anomalies_skipped_dedup: skipped,
    write_errors: writeErrors,
    chain_ok: chainOk,
    chain_error: chainErr ? (chainErr.message || String(chainErr)) : null,
  });
});
