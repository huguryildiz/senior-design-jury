// supabase/functions/on-auth-event/index.ts
// ============================================================
// Database Webhook handler for auth.sessions INSERT / DELETE.
//
// Triggered by a Supabase Database Webhook (not a user request).
// Writes auth.admin.login.success (INSERT) or admin.logout (DELETE)
// to audit_logs via service role so the event is server-side durable.
//
// Auth: verify_jwt=false — this is called by Supabase infra, not a user JWT.
// Request is authenticated by HMAC-SHA256 signature in X-Supabase-Signature.
//
// Always returns 200 — Supabase retries on non-2xx which would create
// duplicate audit rows. Errors are logged but not propagated.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Constant-time string comparison to prevent timing attacks. */
function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const webhookSecret = Deno.env.get("WEBHOOK_HMAC_SECRET") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !serviceKey) {
    console.error("on-auth-event: Supabase environment not configured");
    return json(200, { ok: false, error: "Environment not configured" });
  }

  // Verify shared secret header (constant-time to prevent timing attacks)
  if (webhookSecret) {
    const incoming = req.headers.get("x-webhook-secret") || "";
    if (!constantTimeEqual(incoming, webhookSecret)) {
      console.error("on-auth-event: Invalid or missing X-Webhook-Secret");
      return json(200, { ok: false, error: "Unauthorized" });
    }
  }

  // Read the body
  const bodyText = await req.text();

  let payload: {
    type?: string;
    table?: string;
    schema?: string;
    record?: Record<string, unknown> | null;
    old_record?: Record<string, unknown> | null;
  };

  try {
    payload = JSON.parse(bodyText);
  } catch {
    console.error("on-auth-event: Invalid JSON payload");
    return json(200, { ok: false, error: "Invalid JSON" });
  }

  const { type, table, schema, record, old_record } = payload;

  // Only handle auth.sessions events
  if (schema !== "auth" || table !== "sessions") {
    return json(200, { ok: true, skipped: true });
  }

  // Determine action and the session record to use
  let action: string;
  let sessionRecord: Record<string, unknown> | null | undefined;

  if (type === "INSERT") {
    action = "auth.admin.login.success";
    sessionRecord = record;
  } else if (type === "DELETE") {
    action = "admin.logout";
    sessionRecord = old_record;
  } else {
    // UPDATE, TRUNCATE — not relevant
    return json(200, { ok: true, skipped: true });
  }

  if (!sessionRecord?.user_id) {
    console.error("on-auth-event: No user_id in session record");
    return json(200, { ok: false, error: "No user_id" });
  }

  const userId = String(sessionRecord.user_id);

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Resolve organization_id from memberships (first active tenant membership)
  let organizationId: string | null = null;
  try {
    const { data: membership } = await service
      .from("memberships")
      .select("organization_id")
      .eq("user_id", userId)
      .not("organization_id", "is", null)
      .limit(1)
      .single();
    organizationId = membership?.organization_id ?? null;
  } catch {
    // Super-admin has no org membership — leave null
  }

  // Extract IP/UA from session record if available (auth.sessions stores these)
  const ipAddress = (sessionRecord.ip as string | null) ?? null;
  const userAgent = (sessionRecord.user_agent as string | null) ?? null;

  try {
    const { error: insertErr } = await service.from("audit_logs").insert({
      action,
      organization_id: organizationId,
      user_id: userId,
      resource_type: "profiles",
      resource_id: userId,
      category: "auth",
      severity: "info",
      actor_type: "admin",
      details: {
        method: type === "INSERT" ? "session" : "logout",
        session_id: sessionRecord.id ?? null,
      },
      diff: null,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (insertErr) {
      console.error(`on-auth-event: audit insert failed for ${action}:`, insertErr);
      return json(200, { ok: false, error: insertErr.message });
    }
  } catch (err) {
    console.error(`on-auth-event: unexpected error for ${action}:`, err);
    return json(200, { ok: false, error: String(err) });
  }

  return json(200, { ok: true, action });
});
