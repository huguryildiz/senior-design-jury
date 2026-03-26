// supabase/functions/rpc-proxy/index.ts
// ============================================================
// Supabase Edge Function — proxies admin RPC calls.
//
// v1 legacy (V1_LEGACY_RPCS set): Injects p_rpc_secret
//   server-side, uses service-role client. Password-based auth.
//
// v2 / current (rpc_admin_*): Forwards the client's JWT. Uses
//   anon-key client so auth.uid() resolves to the caller.
//   No p_rpc_secret injection. Tenant scoping is enforced
//   by the RPCs via _assert_tenant_admin()/auth.uid().
//
// Old rpc_v2_* names are also accepted during transition
// (they delegate to rpc_admin_* via SQL wrappers).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const matchesOriginPattern = (
  pattern: string,
  origin: string,
  wildcardAllowed: boolean,
) => {
  if (pattern === "*") return wildcardAllowed;
  if (!pattern.includes("*")) return pattern === origin;
  if (!wildcardAllowed) return false;

  const regex = new RegExp(`^${pattern.split("*").map(escapeRegex).join(".*")}$`);
  return regex.test(origin);
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOriginsRaw = Deno.env.get("ALLOWED_ORIGINS") || "";
  const allowedOrigins = allowedOriginsRaw
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const wildcardAllowed = Deno.env.get("ALLOW_WILDCARD_ORIGIN") === "true";
  const normalizedOrigin = origin ? origin.replace(/\/$/, "") : null;

  const isAllowed =
    !normalizedOrigin ||
    allowedOrigins.some((pattern) =>
      matchesOriginPattern(pattern, normalizedOrigin, wildcardAllowed)
    );

  return {
    "Access-Control-Allow-Origin": isAllowed ? (origin ?? "*") : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const { fn, params } = await req.json();

    if (!fn || typeof fn !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'fn' parameter." }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Legacy v1 RPCs: password-based auth, service-role client + p_rpc_secret.
    const V1_LEGACY_RPCS = new Set([
      "rpc_admin_login",
      "rpc_admin_security_state",
      "rpc_admin_change_password",
      // v1 domain RPCs (deprecated, kept for backward compat)
      "rpc_admin_get_scores",
      "rpc_admin_project_summary",
      "rpc_admin_outcome_trends",
      "rpc_admin_set_current_semester",
      "rpc_admin_create_semester",
      "rpc_admin_update_semester",
      "rpc_admin_set_semester_eval_lock",
      "rpc_admin_list_projects",
      "rpc_admin_create_project",
      "rpc_admin_upsert_project",
      "rpc_admin_list_jurors",
      "rpc_admin_create_juror",
      "rpc_admin_update_juror",
      "rpc_admin_reset_juror_pin",
      "rpc_admin_set_juror_edit_mode",
      "rpc_admin_force_close_juror_edit_mode",
      "rpc_admin_list_audit_logs",
      "rpc_admin_generate_entry_token",
      "rpc_admin_revoke_entry_token",
      "rpc_admin_get_entry_token_status",
      "rpc_admin_get_settings",
      "rpc_admin_set_setting",
      "rpc_admin_delete_counts",
    ]);

    const isV1 = V1_LEGACY_RPCS.has(fn);
    // Current JWT-based RPCs: rpc_admin_* (not in v1 set) + old rpc_v2_* names (transition)
    const isV2 = !isV1 && (fn.startsWith("rpc_admin_") || fn.startsWith("rpc_v2_"));

    if (!isV1 && !isV2) {
      return new Response(
        JSON.stringify({ error: `Function '${fn}' is not allowed through proxy.` }),
        { status: 403, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    let supabase;
    let callParams = params;

    if (isV2) {
      // JWT-based: Forward the client's JWT via anon-key client.
      // auth.uid() resolves to the actual caller, NOT the service role.
      // Tenant scoping enforced by RPCs via _assert_tenant_admin().
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const clientJwt = req.headers.get("authorization")?.replace("Bearer ", "") || "";

      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${clientJwt}`,
          },
        },
      });
    } else {
      // v1 legacy: service-role client + inject p_rpc_secret.
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const rpcSecret = Deno.env.get("RPC_SECRET")!;

      supabase = createClient(supabaseUrl, supabaseServiceKey);
      callParams = { ...params, p_rpc_secret: rpcSecret };
    }

    const { data, error } = await supabase.rpc(fn, callParams);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message, code: error.code }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Internal server error" }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
