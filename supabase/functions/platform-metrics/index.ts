// supabase/functions/platform-metrics/index.ts
// ============================================================
// Returns live platform metrics for the System Health drawer.
// Caller must be authenticated as super_admin.
//
// Auth flow:
//   1. Read Bearer token from Authorization header.
//   2. Resolve user via auth.getUser(token) — Auth-v1 endpoint,
//      which supports both legacy HS256 and new asymmetric
//      (ES256/JWKS) signing keys.
//      (PostgREST-backed RPC is NOT used for caller verification
//      because PostgREST in some projects still rejects JWTs
//      signed with new asymmetric keys → "Invalid JWT".)
//   3. Check super_admin membership via service role.
//   4. Fetch metrics via service role (bypasses RLS).
//
// Response shape:
// {
//   db_size_bytes: number,
//   db_size_pretty: string,       // e.g. "1.2 GB"
//   active_connections: number,
//   audit_requests_24h: number,
//   total_organizations: number,
//   total_jurors: number,
// }
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { error: "Missing bearer token" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json(500, { error: "Supabase environment not configured." });
  }

  // Resolve caller via Auth-v1 (tolerant of new asymmetric signing keys).
  const authClient = createClient(supabaseUrl, anonKey);
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  const userId = userData?.user?.id || null;
  if (userErr || !userId) {
    return json(401, { error: "Unauthorized", details: userErr?.message || "User not found" });
  }

  // Check super_admin membership via service role.
  const service = createClient(supabaseUrl, serviceKey);
  const { data: membership, error: memberErr } = await service
    .from("memberships")
    .select("user_id")
    .eq("user_id", userId)
    .is("organization_id", null)
    .maybeSingle();

  if (memberErr) return json(500, { error: memberErr.message });
  if (!membership) return json(403, { error: "Super admin access required." });

  // Fetch metrics via service role RPC.
  const { data: metrics, error: metricsErr } = await service.rpc("rpc_platform_metrics");
  if (metricsErr) return json(500, { error: metricsErr.message });

  return json(200, metrics);
});
