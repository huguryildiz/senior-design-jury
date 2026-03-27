// supabase/functions/notify-application/index.ts
// ============================================================
// Phase C: Email notification Edge Function for admin
// application workflow events.
//
// Called by pg_net from approval/rejection/submission RPCs.
//
// Email provider: Resend (via RESEND_API_KEY env var).
// Falls back to logging-only if RESEND_API_KEY is not set.
//
// Failure handling:
// - Application state is already committed before this is called
// - Failures are logged but never affect the workflow
// ============================================================

interface NotificationPayload {
  type: "application_submitted" | "application_approved" | "application_rejected";
  application_id: string;
  recipient_email: string;
  tenant_id: string;
  applicant_name?: string;
  applicant_email?: string;
  tenant_name?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sendViaResend(
  apiKey: string,
  to: string,
  subject: string,
  body: string,
  html: string,
  from: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text: body,
        html,
      }),
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

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveTargetEnv(req: Request): "dev" | "prod" {
  const explicitEnv = (Deno.env.get("NOTIFICATION_ENV") || "").trim().toLowerCase();
  if (explicitEnv === "dev" || explicitEnv === "prod") return explicitEnv;

  const hostHeader = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").toLowerCase();
  if (hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1") || hostHeader.includes("192.168.")) {
    return "dev";
  }
  return "prod";
}

function pickByEnv(req: Request, devUrl: string, prodUrl: string): string {
  const env = resolveTargetEnv(req);
  if (env === "dev" && devUrl) return devUrl;
  if (env === "prod" && prodUrl) return prodUrl;
  return prodUrl || devUrl || "";
}

function resolvePortalUrl(req: Request): string {
  const explicit = (Deno.env.get("NOTIFICATION_APP_URL") || "").trim();
  if (explicit) return explicit;

  const devExplicit = (Deno.env.get("NOTIFICATION_APP_URL_DEV") || "").trim();
  const prodExplicit = (Deno.env.get("NOTIFICATION_APP_URL_PROD") || "").trim();
  const byEnv = pickByEnv(req, devExplicit, prodExplicit);
  if (byEnv) return byEnv;

  let hostname = "";
  try {
    hostname = new URL(req.url).hostname.toLowerCase();
  } catch {
    hostname = "";
  }

  const isDevHost = hostname === "localhost"
    || hostname === "::1"
    || hostname.startsWith("127.")
    || hostname.startsWith("192.168.");

  if (isDevHost) {
    if (devExplicit) return devExplicit;
    const devHost = hostname.startsWith("127.") ? "localhost" : hostname;
    return `http://${devHost}:5173`;
  }

  if (prodExplicit) return prodExplicit;
  return "https://vera-eval.app";
}

function resolveReviewUrl(req: Request, portalUrl: string): string {
  const explicit = (Deno.env.get("NOTIFICATION_REVIEW_URL") || "").trim();
  if (explicit) return explicit;

  const devExplicit = (Deno.env.get("NOTIFICATION_REVIEW_URL_DEV") || "").trim();
  const prodExplicit = (Deno.env.get("NOTIFICATION_REVIEW_URL_PROD") || "").trim();
  const byEnv = pickByEnv(req, devExplicit, prodExplicit);
  if (byEnv) return byEnv;

  return portalUrl;
}

function buildHtmlTemplate(params: {
  title: string;
  intro: string;
  lines: string[];
  rawHtmlLines?: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  logoUrl?: string;
}): string {
  const lineHtml = (params.rawHtmlLines && params.rawHtmlLines.length > 0
    ? params.rawHtmlLines
    : params.lines.map((line) => `<p style="margin:0 0 8px; font-size:14px; line-height:1.7; color:#a0aec0;">${escapeHtml(line)}</p>`))
    .join("");
  const cta =
    params.ctaLabel && params.ctaUrl
      ? `<a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block; background:linear-gradient(135deg,#6c47ff,#a78bfa); color:#ffffff; text-decoration:none; font-size:16px; font-weight:600; padding:14px 36px; border-radius:50px; letter-spacing:0.3px; box-shadow:0 4px 20px rgba(108,71,255,0.45);">${escapeHtml(params.ctaLabel)} &rarr;</a>`
      : "";

  const logo =
    params.logoUrl && params.logoUrl.trim() !== ""
      ? `<img src="${escapeHtml(params.logoUrl)}" alt="VERA" width="160" style="display:block; margin:0 auto; height:auto;" />`
      : `<div style="color:#fff; font-size:22px; font-weight:700; letter-spacing:0.6px;">VERA</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0; padding:0; background-color:#0f0f1a; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f0f1a; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background:linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%); border-radius:16px; overflow:hidden; box-shadow:0 8px 40px rgba(0,0,0,0.5);">
          <tr><td style="background:linear-gradient(90deg,#6c47ff,#a78bfa,#6c47ff); height:4px; font-size:0; line-height:0;">&nbsp;</td></tr>
          <tr><td align="center" style="padding:40px 40px 20px;">${logo}</td></tr>
          <tr><td align="center" style="padding:8px 48px 12px;"><h1 style="margin:0; font-size:25px; font-weight:700; color:#ffffff; letter-spacing:-0.5px;">${escapeHtml(params.title)}</h1></td></tr>
          <tr><td align="center" style="padding:0 48px 20px;"><p style="margin:0; font-size:15px; line-height:1.7; color:#a0aec0;">${escapeHtml(params.intro)}</p></td></tr>
          <tr><td style="padding:0 48px 8px;">${lineHtml}</td></tr>
          <tr><td align="center" style="padding:16px 48px 24px;">${cta}</td></tr>
          <tr><td style="padding:0 48px;"><div style="border-top:1px solid rgba(255,255,255,0.08); font-size:0;">&nbsp;</div></td></tr>
          <tr><td align="center" style="padding:16px 48px 30px;"><p style="margin:0; font-size:12px; color:#4a5568; line-height:1.6;">&copy; 2026 VERA. All rights reserved.</p></td></tr>
          <tr><td style="background:linear-gradient(90deg,#6c47ff,#a78bfa,#6c47ff); height:4px; font-size:0; line-height:0;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();

    if (!payload.type || !payload.application_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, application_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build email content
    let subject = "";
    let body = "";
    let to = payload.recipient_email || "";
    let html = "";
    const tenantLabel = payload.tenant_name || "the requested department";
    const portalUrl = resolvePortalUrl(req);
    const reviewUrl = resolveReviewUrl(req, portalUrl);
    const appUrl = portalUrl;
    const logoUrl = Deno.env.get("NOTIFICATION_LOGO_URL") || "";

    switch (payload.type) {
      case "application_submitted":
        subject = `New admin application: ${payload.applicant_name || "Unknown"} → ${tenantLabel}`;
        body = [
          `${payload.applicant_name || "A user"}${payload.applicant_email ? ` (${payload.applicant_email})` : ""} has applied for admin access to ${tenantLabel}.`,
        ].join("\n");
        html = buildHtmlTemplate({
          title: "New Admin Application",
          intro: "A new admin application was submitted.",
          lines: [
            `${payload.applicant_name || "A user"}${payload.applicant_email ? ` (${payload.applicant_email})` : ""} requested admin access to ${tenantLabel}.`,
          ],
          ctaLabel: reviewUrl ? "Review Application" : undefined,
          ctaUrl: reviewUrl || undefined,
          logoUrl: logoUrl || undefined,
        });
        break;

      case "application_approved":
        subject = "Your VERA admin application has been approved";
        body = [
          `Your application for admin access to ${tenantLabel} has been approved. You can now sign in with your registered email and password.`,
        ].join("\n");
        html = buildHtmlTemplate({
          title: "Application Approved",
          intro: "Your VERA admin application has been approved.",
          rawHtmlLines: [
            `<p style="margin:0 0 8px; font-size:14px; line-height:1.7; color:#a0aec0;">Your application for admin access to ${escapeHtml(tenantLabel)} has been approved, and you can now sign in with your registered email and password.</p>`,
          ],
          ctaLabel: appUrl ? "Sign In" : undefined,
          ctaUrl: appUrl || undefined,
          logoUrl: logoUrl || undefined,
        });
        break;

      case "application_rejected":
        subject = "Your VERA admin application has been rejected";
        body = [
          `Your application for admin access to ${tenantLabel} was not approved at this time. Please contact the department administrator for details.`,
        ].join("\n");
        html = buildHtmlTemplate({
          title: "Application Rejected",
          intro: "Your VERA admin application has been rejected.",
          rawHtmlLines: [
            `<p style="margin:0 0 8px; font-size:14px; line-height:1.7; color:#a0aec0;">Your application for admin access to ${escapeHtml(tenantLabel)} was not approved at this time. Please contact the department administrator for details.</p>`,
          ],
          logoUrl: logoUrl || undefined,
        });
        break;
    }

    // Try to send via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromAddr = Deno.env.get("NOTIFICATION_FROM") || "VERA <noreply@vera-eval.app>";
    let sent = false;
    let sendError = "";

    if (resendKey && to) {
      const result = await sendViaResend(resendKey, to, subject, body, html || body, fromAddr);
      sent = result.ok;
      sendError = result.error || "";
    } else {
      sendError = !resendKey
        ? "RESEND_API_KEY not configured"
        : "No recipient email";
    }

    // Log result
    const logEntry = {
      type: payload.type,
      application_id: payload.application_id,
      to,
      subject,
      sent,
      error: sendError || undefined,
    };

    console.log("Notification result:", JSON.stringify(logEntry));

    return new Response(
      JSON.stringify({ ok: true, sent, error: sendError || undefined }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Notification error:", (e as Error).message);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
