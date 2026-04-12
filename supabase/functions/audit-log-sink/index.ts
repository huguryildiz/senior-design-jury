// supabase/functions/audit-log-sink/index.ts
// ============================================================
// External log sink forwarder for audit_logs rows.
//
// Triggered by a Supabase Database Webhook on audit_logs INSERT.
// Forwards the inserted row as a JSON POST to AUDIT_SINK_WEBHOOK_URL
// with Authorization: Bearer AUDIT_SINK_API_KEY.
//
// Compatible with any sink that accepts a JSON POST body:
//   Axiom, Logtail, Logflare, or a generic webhook.
//
// Auth: verify_jwt=false — called by Supabase infra, not a user.
// Request is authenticated by HMAC-SHA256 in X-Supabase-Signature.
//
// Always returns 200 — Supabase retries on non-2xx which would
// create duplicate sink entries. Errors are logged only.
// ============================================================

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
  const sinkUrl = Deno.env.get("AUDIT_SINK_WEBHOOK_URL") || "";
  const sinkApiKey = Deno.env.get("AUDIT_SINK_API_KEY") || "";

  // Verify shared secret header
  if (webhookSecret) {
    const incoming = req.headers.get("x-webhook-secret") || "";
    if (!constantTimeEqual(incoming, webhookSecret)) {
      console.error("audit-log-sink: Invalid or missing X-Webhook-Secret");
      return json(200, { ok: false, error: "Unauthorized" });
    }
  }

  if (!sinkUrl) {
    // Sink not configured — log and return ok so webhook doesn't retry
    console.warn("audit-log-sink: AUDIT_SINK_WEBHOOK_URL not set, skipping forward");
    return json(200, { ok: true, skipped: true, reason: "sink not configured" });
  }

  const bodyText = await req.text();

  let payload: {
    type?: string;
    table?: string;
    schema?: string;
    record?: Record<string, unknown> | null;
  };

  try {
    payload = JSON.parse(bodyText);
  } catch {
    console.error("audit-log-sink: Invalid JSON payload");
    return json(200, { ok: false, error: "Invalid JSON" });
  }

  // Only forward INSERT events on audit_logs
  if (payload.type !== "INSERT" || payload.table !== "audit_logs") {
    return json(200, { ok: true, skipped: true });
  }

  const record = payload.record;
  if (!record) {
    return json(200, { ok: true, skipped: true, reason: "no record" });
  }

  // Forward to external sink
  try {
    const sinkHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (sinkApiKey) {
      sinkHeaders["Authorization"] = `Bearer ${sinkApiKey}`;
    }

    const sinkRes = await fetch(sinkUrl, {
      method: "POST",
      headers: sinkHeaders,
      body: JSON.stringify(record),
    });

    if (!sinkRes.ok) {
      const text = await sinkRes.text().catch(() => "");
      console.error(`audit-log-sink: sink returned ${sinkRes.status}: ${text}`);
      // Still return 200 — don't let a sink failure block audit inserts
      return json(200, { ok: false, sink_status: sinkRes.status, error: text });
    }

    return json(200, { ok: true, sink_status: sinkRes.status });
  } catch (err) {
    console.error("audit-log-sink: fetch to sink failed:", err);
    return json(200, { ok: false, error: String(err) });
  }
});
