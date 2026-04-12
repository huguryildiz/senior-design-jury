// supabase/functions/log-export-event/index.ts
// ============================================================
// Audit proxy for export events.
//
// Receives: { action, organizationId, resourceType, resourceId, details }
// Validates the caller JWT, then writes to audit_logs via service role so
// IP + user-agent are captured server-side (not possible from the browser
// RPC path). Also ensures future backend-triggered exports are captured.
//
// Auth: verify_jwt=false — Kong may reject valid ES256 JWTs.
// Custom auth is implemented below (auth.getUser + membership check).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { writeEdgeAuditLog } from "../_shared/audit-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function readBearerToken(req: Request): string {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.replace(/^Bearer\s+/i, "").trim();
}

function toNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeExportDetails(raw: unknown): Record<string, unknown> {
  const input =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const filtersRaw = input.filters;
  const filters =
    filtersRaw && typeof filtersRaw === "object" && !Array.isArray(filtersRaw)
      ? (filtersRaw as Record<string, unknown>)
      : {};
  const periodName =
    typeof input.period_name === "string"
      ? input.period_name
      : (typeof input.periodName === "string" ? input.periodName : null);

  return {
    format: String(input.format || "unknown").toLowerCase(),
    row_count: toNullableNumber(input.row_count ?? input.rowCount),
    period_name: periodName,
    project_count: toNullableNumber(input.project_count ?? input.projectCount),
    juror_count: toNullableNumber(input.juror_count ?? input.jurorCount),
    filters,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  if (!supabaseUrl || !anonKey) {
    return json(500, { error: "Supabase environment not configured." });
  }

  // Authenticate caller
  const token = readBearerToken(req);
  if (!token) return json(401, { error: "Missing bearer token" });

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await caller.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    return json(401, { error: "Unauthorized", details: userErr?.message || "Invalid token" });
  }

  // Parse body
  let body: {
    action?: unknown;
    organizationId?: unknown;
    resourceType?: unknown;
    resourceId?: unknown;
    details?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const { action, organizationId, resourceType, resourceId, details } = body;

  if (!action || typeof action !== "string" || !action.startsWith("export.")) {
    return json(400, { error: "action must be a string starting with 'export.'" });
  }

  // Tenant scope check for org-bound exports.
  if (typeof organizationId === "string" && organizationId.length > 0) {
    const { data: memberships, error: memErr } = await caller
      .from("memberships")
      .select("organization_id")
      .eq("user_id", userData.user.id)
      .limit(50);

    if (memErr) {
      return json(403, { error: "Membership check failed", details: memErr.message });
    }
    const allowed = (memberships || []).some((m) => {
      const org = (m as { organization_id?: string | null }).organization_id ?? null;
      return org === null || org === organizationId;
    });
    if (!allowed) {
      return json(403, { error: "Forbidden: organization access denied" });
    }
  }

  // Write audit log server-side (captures IP + UA)
  try {
    await writeEdgeAuditLog(req, {
      action,
      organization_id: typeof organizationId === "string" ? organizationId : null,
      user_id: userData.user.id,
      resource_type: typeof resourceType === "string" ? resourceType : null,
      resource_id: typeof resourceId === "string" ? resourceId : null,
      details: normalizeExportDetails(details),
      category: "security",
      severity: "info",
      actor_type: "admin",
    });
  } catch (err) {
    console.error("log-export-event: audit write failed:", err);
    // Return 500 so the caller (logExportInitiated) aborts the export.
    // This preserves the "no file without a log" guarantee.
    return json(500, { error: "Audit write failed", details: String(err) });
  }

  return json(200, { ok: true });
});
