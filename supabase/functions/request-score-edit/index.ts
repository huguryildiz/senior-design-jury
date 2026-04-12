// supabase/functions/request-score-edit/index.ts
// ============================================================
// Sends a score-edit request email to the tenant admin(s). CC to
// super admin is controlled by security_policy.ccOnScoreEdit
// (defaults to false) when a juror requests the ability to edit
// their already-submitted scores.
//
// Payload: { periodId, jurorName, affiliation, sessionToken }
//
// Auth: validates the juror session token against the DB before
// sending, to prevent unauthenticated abuse.
//
// Email provider: Resend (via RESEND_API_KEY env var).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSuperAdminEmails, shouldCcOn } from "../_shared/super-admin-cc.ts";
import { writeEdgeAuditLog } from "../_shared/audit-log.ts";

interface Payload {
  periodId: string;
  jurorName: string;
  affiliation?: string;
  sessionToken: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendViaResend(
  apiKey: string,
  to: string[],
  subject: string,
  body: string,
  html: string,
  from: string,
  cc?: string[],
): Promise<{ ok: boolean; error?: string }> {
  const toArr = to.filter(Boolean);
  const ccArr = (cc || []).filter(Boolean);
  if (toArr.length === 0) return { ok: false, error: "No recipients" };

  try {
    const payload: Record<string, unknown> = { from, to: toArr, subject, text: body, html };
    if (ccArr.length > 0) payload.cc = ccArr;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${err}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ── DB helpers ───────────────────────────────────────────────

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function validateSession(
  client: ReturnType<typeof createClient>,
  periodId: string,
  sessionToken: string,
): Promise<boolean> {
  try {
    const tokenHash = await sha256Hex(sessionToken);
    const { data } = await client
      .from("juror_period_auth")
      .select("juror_id")
      .eq("period_id", periodId)
      .eq("session_token_hash", tokenHash)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

interface PeriodInfo {
  periodName: string;
  orgId: string;
  orgName: string;
  contactEmail: string;
}

async function resolvePeriodInfo(
  client: ReturnType<typeof createClient>,
  periodId: string,
): Promise<PeriodInfo | null> {
  const { data } = await client
    .from("periods")
    .select("name, organization_id, organizations(name, contact_email)")
    .eq("id", periodId)
    .single();

  if (!data) return null;
  const org = data.organizations as { name?: string; contact_email?: string } | null;
  return {
    periodName: data.name || "",
    orgId: data.organization_id || "",
    orgName: org?.name || "",
    contactEmail: org?.contact_email || "",
  };
}

async function resolveAdminEmails(
  client: ReturnType<typeof createClient>,
  orgId: string,
): Promise<{ to: string[]; cc: string[] }> {
  if (!orgId) return { to: [], cc: [] };

  const { data: orgMembers } = await client
    .from("memberships")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("role", "org_admin");

  async function getEmail(userId: string): Promise<string> {
    try {
      const { data } = await client.auth.admin.getUserById(userId);
      return data?.user?.email || "";
    } catch {
      return "";
    }
  }

  const toEmails = await Promise.all((orgMembers || []).map((m) => getEmail(m.user_id)));
  const ccEmails = await getSuperAdminEmails(client);

  return {
    to: toEmails.filter(Boolean),
    cc: ccEmails,
  };
}

async function shouldCcSuperAdmin(client: ReturnType<typeof createClient>): Promise<boolean> {
  return await shouldCcOn(client, "ccOnScoreEdit");
}

// ── HTML builder ─────────────────────────────────────────────

function buildHtml(params: {
  jurorName: string;
  affiliation: string;
  periodName: string;
  orgName: string;
  logoUrl: string;
}): string {
  const logo = params.logoUrl
    ? `<img src="${escapeHtml(params.logoUrl)}" alt="VERA" width="160" style="display:block;margin:0 auto;height:auto;" />`
    : `<img src="https://vera-eval.app/vera_logo_dark.png" alt="VERA" width="120" style="display:block; border:0;" />`;

  const metaParts: string[] = [];
  if (params.affiliation) metaParts.push(escapeHtml(params.affiliation));
  if (params.orgName) metaParts.push(escapeHtml(params.orgName));
  const affilLine = metaParts.length
    ? `<p style="margin:0 0 16px;font-size:13px;color:#718096;">${metaParts.join(" &middot; ")}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Score Edit Request</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f0f1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%);border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.5);">
          <tr><td style="background:linear-gradient(90deg,#3b82f6,#6366f1,#3b82f6);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td align="center" style="padding:40px 40px 20px;">${logo}</td></tr>
          <tr><td align="center" style="padding:8px 48px 12px;">
            <h1 style="margin:0;font-size:25px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Score Edit Request</h1>
          </td></tr>
          <tr><td align="center" style="padding:0 48px 20px;">
            <p style="margin:0;font-size:15px;line-height:1.7;color:#a0aec0;">A juror has submitted their scores and is requesting the ability to edit them.</p>
          </td></tr>
          <tr><td style="padding:0 48px 20px;">
            <div style="padding:16px;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
              <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#ffffff;">${escapeHtml(params.jurorName)}</p>
              ${affilLine}
              <p style="margin:0;font-size:13px;color:#718096;">Period: <strong style="color:#a0aec0;">${escapeHtml(params.periodName || "—")}</strong></p>
            </div>
          </td></tr>
          <tr><td style="padding:0 48px 20px;">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#a0aec0;">To allow this juror to edit their scores, go to <strong style="color:#f1f5f9;">Settings &rarr; Jurors</strong> in your admin panel and enable <strong style="color:#f1f5f9;">Edit Mode</strong> for this juror.</p>
          </td></tr>
          <tr><td style="padding:0 48px;"><div style="border-top:1px solid rgba(255,255,255,0.08);font-size:0;">&nbsp;</div></td></tr>
          <tr><td align="center" style="padding:16px 48px 30px;"><p style="margin:0;font-size:12px;color:#4a5568;line-height:1.6;">&copy; 2026 VERA. All rights reserved.</p></td></tr>
          <tr><td style="background:linear-gradient(90deg,#3b82f6,#6366f1,#3b82f6);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Main handler ─────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: Payload = await req.json();

    if (!payload.periodId || !payload.jurorName || !payload.sessionToken) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: periodId, jurorName, sessionToken" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const client = getServiceClient();
    if (!client) {
      return new Response(
        JSON.stringify({ ok: false, error: "Service client unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate session token — prevents unauthenticated abuse
    const sessionValid = await validateSession(client, payload.periodId, payload.sessionToken);
    if (!sessionValid) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const info = await resolvePeriodInfo(client, payload.periodId);
    if (!info) {
      return new Response(
        JSON.stringify({ ok: false, error: "Period not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const emails = await resolveAdminEmails(client, info.orgId);
    if (emails.to.length === 0 && info.contactEmail) {
      emails.to = [info.contactEmail];
    }

    if (emails.to.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "No admin email found for this organization" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const subject = `Score Edit Request — ${payload.jurorName} (${info.periodName || "Evaluation"})`;
    const textBody = [
      `Score Edit Request`,
      `Juror: ${payload.jurorName}`,
      payload.affiliation ? `Affiliation: ${payload.affiliation}` : "",
      `Period: ${info.periodName || "—"}`,
      `Organization: ${info.orgName || "—"}`,
      "",
      "This juror has submitted their scores and is requesting the ability to edit them.",
      "",
      "To enable edit mode, go to Settings → Jurors in your admin panel.",
    ].filter(Boolean).join("\n");

    const html = buildHtml({
      jurorName: payload.jurorName,
      affiliation: payload.affiliation || "",
      periodName: info.periodName,
      orgName: info.orgName,
      logoUrl: Deno.env.get("NOTIFICATION_LOGO_URL") || "",
    });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromAddr = Deno.env.get("NOTIFICATION_FROM") || "VERA <noreply@vera-eval.app>";
    let sent = false;
    let sendError = "";

    const ccEnabled = await shouldCcSuperAdmin(client);
    const cc = ccEnabled ? emails.cc : [];

    if (resendKey) {
      const result = await sendViaResend(resendKey, emails.to, subject, textBody, html, fromAddr, cc);
      sent = result.ok;
      sendError = result.error || "";
    } else {
      sendError = "RESEND_API_KEY not configured";
    }

    console.log("request-score-edit:", JSON.stringify({
      type: "score_edit_request",
      periodId: payload.periodId,
      jurorName: payload.jurorName,
      to: emails.to,
      cc: cc.length ? cc : undefined,
      sent,
      error: sendError || undefined,
    }));

    try {
      await writeEdgeAuditLog(req, {
        action: "data.score.edit_requested",
        actor_type: "juror",
        user_id: null,
        organization_id: info.orgId || null,
        resource_type: "juror_period_auth",
        resource_id: payload.periodId,
        category: "data",
        severity: "low",
        details: {
          jurorName: payload.jurorName,
          affiliation: payload.affiliation || null,
          periodName: info.periodName || null,
          orgName: info.orgName || null,
          sent,
        },
      });
    } catch (auditErr) {
      console.error("audit write failed (data.score.edit_requested):", (auditErr as Error)?.message);
    }

    return new Response(
      JSON.stringify({ ok: true, sent, error: sendError || undefined }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("request-score-edit error:", (e as Error).message);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
