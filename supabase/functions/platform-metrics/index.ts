// supabase/functions/platform-metrics/index.ts
// ============================================================
// Returns live platform metrics for the System Health drawer.
// Caller must be authenticated as super_admin (verified via DB).
//
// Response shape:
// {
//   db_size_bytes: number,
//   db_size_pretty: string,       // e.g. "1.2 GB"
//   active_connections: number,
//   audit_requests_24h: number,   // audit_logs rows in last 24h (API proxy)
//   total_organizations: number,
//   total_jurors: number,
// }
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { error: "Missing bearer token" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json(500, { error: "Supabase environment not configured." });
  }

  // Verify caller is super_admin using their JWT
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: isSuperAdmin, error: authErr } = await caller.rpc("current_user_is_super_admin");
  if (authErr || !isSuperAdmin) {
    return json(403, { error: "Super admin access required." });
  }

  // Fetch metrics via service role (bypasses RLS)
  const service = createClient(supabaseUrl, serviceKey);

  const { data: metrics, error: metricsErr } = await service.rpc("rpc_platform_metrics");
  if (metricsErr) {
    return json(500, { error: metricsErr.message });
  }

  return json(200, metrics);
});
