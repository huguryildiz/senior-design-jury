// supabase/functions/rpc-proxy/index.ts
// ============================================================
// Supabase Edge Function — proxies admin RPC calls so that the
// RPC_SECRET never leaves the server. The client sends:
//   { fn: "rpc_admin_login", params: { p_password: "..." } }
// and this function injects p_rpc_secret from Deno.env before
// calling Supabase.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",").map((o: string) => o.trim()) || [];

  // Wildcard CORS bypass is only permitted when ALLOW_WILDCARD_ORIGIN=true is explicitly
  // set in the Edge Function environment. This env var must NEVER be set in production;
  // it exists solely for local Supabase CLI development (supabase start).
  const wildcardAllowed = Deno.env.get("ALLOW_WILDCARD_ORIGIN") === "true";
  const isAllowed =
    !origin ||
    allowedOrigins.includes(origin) ||
    (wildcardAllowed && allowedOrigins.includes("*"));

  return {
    "Access-Control-Allow-Origin": isAllowed ? (origin ?? "*") : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    // Only allow admin RPC functions. All admin functions use the rpc_admin_ prefix.
    // rpc_admin_bootstrap_password matches this prefix and requires no special case.
    // (Previously, "rpc_bootstrap_admin_password" was listed as an ALLOWED_EXTRA,
    //  but that name does not match any real RPC — it was a phantom entry and has
    //  been removed. The real function is rpc_admin_bootstrap_password.)
    const ALLOWED_PREFIX = "rpc_admin_";
    if (!fn.startsWith(ALLOWED_PREFIX)) {
      return new Response(
        JSON.stringify({ error: `Function '${fn}' is not allowed through proxy.` }),
        { status: 403, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const rpcSecret = Deno.env.get("RPC_SECRET")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Inject the RPC secret into the params
    const enrichedParams = {
      ...params,
      p_rpc_secret: rpcSecret,
    };

    const { data, error } = await supabase.rpc(fn, enrichedParams);

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
