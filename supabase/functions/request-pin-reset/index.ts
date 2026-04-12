// supabase/functions/request-pin-reset/index.ts
// ============================================================
// Sends a PIN-reset request email to the tenant's org_admins
// on behalf of a locked juror. CCs the super admin when
// security_policy.ccOnPinReset is true (default).
//
// Called from the jury Locked Recovery Screen when a juror is
// locked out after too many failed PIN attempts.
//
// Payload: { periodId, jurorName, affiliation, message? }
//
// The function resolves admin email addresses from the DB
// (period → organization → memberships → auth.users).
//
// Email provider: Resend (via RESEND_API_KEY env var).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSuperAdminEmails, shouldCcOn } from "../_shared/super-admin-cc.ts";
import { writeEdgeAuditLog } from "../_shared/audit-log.ts";

interface Payload {
  periodId: string;
  jurorName: string;
  affiliation: string;
  message?: string;
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
    const payload: Record<string, unknown> = {
      from,
      to: toArr,
      subject,
      text: body,
      html,
    };
    if (ccArr.length > 0) payload.cc = ccArr;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
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

interface PeriodInfo {
  periodName: string;
  orgId: string;
  orgName: string;
  contactEmail: string;
}

async function resolvePeriodInfo(periodId: string): Promise<PeriodInfo | null> {
  const client = getServiceClient();
  if (!client) return null;

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

async function resolveAdminEmails(orgId: string): Promise<{ to: string[]; cc: string[] }> {
  const client = getServiceClient();
  if (!client || !orgId) return { to: [], cc: [] };

  const { data: orgMembers } = await client
    .from("memberships")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("role", "org_admin");

  async function getEmail(userId: string): Promise<string> {
    try {
      const { data } = await client!.auth.admin.getUserById(userId);
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

async function shouldCcSuperAdmin(): Promise<boolean> {
  const client = getServiceClient();
  if (!client) return true;
  return await shouldCcOn(client, "ccOnPinReset");
}

// ── HTML builder ─────────────────────────────────────────────

function buildHtml(params: {
  jurorName: string;
  affiliation: string;
  periodName: string;
  orgName: string;
  message: string;
  logoUrl: string;
}): string {
  const logo = params.logoUrl
    ? `<img src="${escapeHtml(params.logoUrl)}" alt="VERA" width="160" style="display:block;margin:0 auto;height:auto;" />`
    : `<img src="https://vera-eval.app/vera_logo_dark.png" alt="VERA" width="120" style="display:block; border:0;" />`;

  const messageBlock = params.message
    ? `<tr><td style="padding:0 48px 16px;">
        <div style="padding:14px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#718096;">Message from juror</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#e2e8f0;font-style:italic;">&ldquo;${escapeHtml(params.message)}&rdquo;</p>
        </div>
      </td></tr>`
    : "";

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
  <title>PIN Reset Request</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f0f1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%);border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.5);">
          <tr><td style="background:linear-gradient(90deg,#f59e0b,#ef4444,#f59e0b);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td align="center" style="padding:40px 40px 20px;">${logo}</td></tr>
          <tr><td align="center" style="padding:8px 48px 12px;">
            <h1 style="margin:0;font-size:25px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">PIN Reset Request</h1>
          </td></tr>
          <tr><td align="center" style="padding:0 48px 8px;">
            <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#a0aec0;">A juror has been locked out and is requesting a PIN reset.</p>
          </td></tr>
          <tr><td style="padding:0 48px 16px;">
            <div style="padding:16px;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
              <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#ffffff;">${escapeHtml(params.jurorName)}</p>
              ${affilLine}
              <p style="margin:0;font-size:13px;color:#718096;">Period: <strong style="color:#a0aec0;">${escapeHtml(params.periodName || "—")}</strong></p>
            </div>
          </td></tr>
          ${messageBlock}
          <tr><td style="padding:0 48px 16px;">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#a0aec0;">To reset this juror's PIN, go to <strong style="color:#f1f5f9;">Settings &rarr; Jurors</strong> in your admin panel and use the &ldquo;Reset PIN&rdquo; action.</p>
          </td></tr>
          <tr><td style="padding:0 48px;"><div style="border-top:1px solid rgba(255,255,255,0.08);font-size:0;">&nbsp;</div></td></tr>
          <tr><td align="center" style="padding:16px 48px 30px;"><p style="margin:0;font-size:12px;color:#4a5568;line-height:1.6;">&copy; 2026 VERA. All rights reserved.</p></td></tr>
          <tr><td style="background:linear-gradient(90deg,#f59e0b,#ef4444,#f59e0b);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
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

    if (!payload.periodId || !payload.jurorName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: periodId, jurorName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve period + org info from DB
    const info = await resolvePeriodInfo(payload.periodId);
    if (!info) {
      return new Response(
        JSON.stringify({ ok: false, error: "Period not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve admin emails from memberships
    const emails = await resolveAdminEmails(info.orgId);

    // Fall back to organization's contact_email if no membership-based emails
    if (emails.to.length === 0 && info.contactEmail) {
      emails.to = [info.contactEmail];
    }

    if (emails.to.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "No admin email found for this organization" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const subject = `PIN Reset Request — ${payload.jurorName} (${info.periodName || "Evaluation"})`;
    const textBody = [
      `PIN Reset Request`,
      `Juror: ${payload.jurorName}`,
      payload.affiliation ? `Affiliation: ${payload.affiliation}` : "",
      `Period: ${info.periodName || "—"}`,
      `Organization: ${info.orgName || "—"}`,
      "",
      "This juror has been locked out after too many failed PIN attempts and is requesting a PIN reset.",
      payload.message ? `\nMessage from juror: "${payload.message}"` : "",
      "",
      "To reset their PIN, go to Settings → Jurors in your admin panel.",
    ].filter(Boolean).join("\n");

    const html = buildHtml({
      jurorName: payload.jurorName,
      affiliation: payload.affiliation || "",
      periodName: info.periodName,
      orgName: info.orgName,
      message: payload.message || "",
      logoUrl: Deno.env.get("NOTIFICATION_LOGO_URL") || "",
    });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromAddr = Deno.env.get("NOTIFICATION_FROM") || "VERA <noreply@vera-eval.app>";
    let sent = false;
    let sendError = "";

    const ccEnabled = await shouldCcSuperAdmin();
    const cc = ccEnabled ? emails.cc : [];

    // Critical security action: fail-closed on audit write.
    await writeEdgeAuditLog(req, {
      action: "security.pin_reset.requested",
      actor_type: "juror",
      user_id: null,
      organization_id: info.orgId || null,
      resource_type: "juror_period_auth",
      resource_id: payload.periodId,
      category: "security",
      severity: "medium",
      details: {
        jurorName: payload.jurorName,
        affiliation: payload.affiliation || null,
        periodName: info.periodName || null,
        orgName: info.orgName || null,
      },
    });

    if (resendKey) {
      const result = await sendViaResend(resendKey, emails.to, subject, textBody, html, fromAddr, cc);
      sent = result.ok;
      sendError = result.error || "";
    } else {
      sendError = "RESEND_API_KEY not configured";
    }

    const logEntry = {
      type: "pin_reset_request",
      periodId: payload.periodId,
      jurorName: payload.jurorName,
      to: emails.to,
      cc: cc.length ? cc : undefined,
      sent,
      error: sendError || undefined,
    };
    console.log("request-pin-reset:", JSON.stringify(logEntry));

    return new Response(
      JSON.stringify({ ok: true, sent, error: sendError || undefined }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("request-pin-reset error:", (e as Error).message);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
