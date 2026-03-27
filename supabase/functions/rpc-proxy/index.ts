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

    // Demo mode guard: only allow read-only RPCs.
    // Bypass users listed in DEMO_BYPASS_UIDS get full write access (e.g. E2E test admin).
    const DEMO_MODE = Deno.env.get("DEMO_MODE") === "true";
    if (DEMO_MODE) {
      let bypassDemo = false;
      const bypassUids = (Deno.env.get("DEMO_BYPASS_UIDS") || "").split(",").map(s => s.trim()).filter(Boolean);
      if (bypassUids.length > 0) {
        const jwt = req.headers.get("authorization")?.replace("Bearer ", "") || "";
        if (jwt) {
          try {
            const payload = JSON.parse(atob(jwt.split(".")[1]));
            if (payload.sub && bypassUids.includes(payload.sub)) {
              bypassDemo = true;
            }
          } catch { /* invalid JWT — proceed with demo guard */ }
        }
      }

      if (!bypassDemo) {
        const DEMO_ALLOWED = new Set([
          "rpc_admin_login",
          "rpc_admin_security_state",
          "rpc_admin_auth_get_session",
          "rpc_admin_tenant_list_public",
          "rpc_admin_application_get_mine",
          "rpc_admin_application_list_pending",
          "rpc_admin_tenant_list",
          "rpc_admin_semester_list",
          "rpc_admin_project_list",
          "rpc_admin_scores_get",
          "rpc_admin_juror_list",
          "rpc_admin_project_summary",
          "rpc_admin_outcome_trends",
          "rpc_admin_delete_counts",
          "rpc_admin_settings_get",
          "rpc_admin_audit_list",
          "rpc_admin_profile_get",
          "rpc_admin_entry_token_status",
          "rpc_admin_export_full",
        ]);
        if (!DEMO_ALLOWED.has(fn)) {
          return new Response(
            JSON.stringify({ error: "This action is disabled in demo mode." }),
            { status: 403, headers: { ...headers, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Legacy v1 RPCs: password-based auth, service-role client + p_rpc_secret.
    const V1_LEGACY_RPCS = new Set([
      "rpc_admin_login",
      "rpc_admin_security_state",
      "rpc_admin_change_password",
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
      const globalHeaders = clientJwt
        ? { Authorization: `Bearer ${clientJwt}` }
        : undefined;

      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: globalHeaders ? { headers: globalHeaders } : undefined,
      });
    } else {
      // v1 legacy: service-role client + inject p_rpc_secret.
      const supabaseServiceKey = Deno.env.get("SB_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
