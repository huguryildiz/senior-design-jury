// supabase/functions/send-entry-token-email/index.ts
// ============================================================
// Sends an evaluation access link (QR token URL) to a recipient
// via Resend. Called from the admin Entry Control page.
//
// Payload: {
//   recipientEmail, tokenUrl, expiresIn, periodName,
//   organizationName?, organizationInstitution?, organizationId?
// }
//
// Email provider: Resend (via RESEND_API_KEY env var).
// Audit: notification.entry_token written server-side after email send.
// ============================================================

import { writeEdgeAuditLog } from "../_shared/audit-log.ts";
import { requireAdminCaller } from "../_shared/admin-auth.ts";

interface Payload {
  recipientEmail: string;
  tokenUrl: string;
  expiresIn?: string;   // e.g. "2h 30m left"
  periodName?: string;
  organizationName?: string;
  organizationInstitution?: string;
  organizationId?: string;
  periodId?: string;
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
      body: JSON.stringify({ from, to: [to], subject, text: body, html }),
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

function buildHtml(params: {
  title: string;
  intro: string;
  rawHtmlLines: string[];
  ctaLabel: string;
  ctaUrl: string;
  logoUrl: string;
}): string {
  const linesHtml = params.rawHtmlLines.join("");
  const logo = params.logoUrl
    ? `<img src="${escapeHtml(params.logoUrl)}" alt="VERA" width="160" style="display:block;margin:0 auto;height:auto;" />`
    : `<img src="https://vera-eval.app/vera_logo_dark.png" alt="VERA" width="120" style="display:block; border:0;" />`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f0f1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%);border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.5);">
          <tr><td style="background:linear-gradient(90deg,#6c47ff,#a78bfa,#6c47ff);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td align="center" style="padding:40px 40px 20px;">${logo}</td></tr>
          <tr><td align="center" style="padding:8px 48px 12px;"><h1 style="margin:0;font-size:25px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${escapeHtml(params.title)}</h1></td></tr>
          <tr><td align="center" style="padding:0 48px 20px;"><p style="margin:0;font-size:15px;line-height:1.7;color:#a0aec0;">${escapeHtml(params.intro)}</p></td></tr>
          <tr><td style="padding:0 48px 8px;">${linesHtml}</td></tr>
          <tr><td align="center" style="padding:20px 48px 28px;">
            <a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;background:linear-gradient(135deg,#6c47ff,#a78bfa);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 36px;border-radius:50px;letter-spacing:0.3px;box-shadow:0 4px 20px rgba(108,71,255,0.45);">${escapeHtml(params.ctaLabel)} &rarr;</a>
          </td></tr>
          <tr><td style="padding:0 48px 16px;">
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px 16px;word-break:break-all;">
              <p style="margin:0 0 4px;font-size:11px;color:#4a5568;text-transform:uppercase;letter-spacing:0.5px;">Access Link</p>
              <p style="margin:0;font-size:12px;color:#a0aec0;font-family:monospace;">${escapeHtml(params.ctaUrl)}</p>
            </div>
          </td></tr>
          <tr><td style="padding:0 48px;"><div style="border-top:1px solid rgba(255,255,255,0.08);font-size:0;">&nbsp;</div></td></tr>
          <tr><td align="center" style="padding:16px 48px 30px;"><p style="margin:0;font-size:12px;color:#4a5568;line-height:1.6;">&copy; 2026 VERA. All rights reserved.</p></td></tr>
          <tr><td style="background:linear-gradient(90deg,#6c47ff,#a78bfa,#6c47ff);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
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
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const payload: Payload = await req.json();

    if (!payload.recipientEmail || !payload.tokenUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: recipientEmail, tokenUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const auth = await requireAdminCaller(req, payload.organizationId || null);
    if (!auth.ok) {
      return new Response(
        JSON.stringify({ error: auth.error }),
        { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const periodLabel = payload.periodName ? ` — ${payload.periodName}` : "";
    const expiryNote = payload.expiresIn ? `Your link is valid for ${payload.expiresIn}.` : "Your link is time-limited — use it promptly.";

    const scopeRows: Array<{ label: string; value: string }> = [];
    if (payload.organizationInstitution) {
      scopeRows.push({ label: "ORGANIZATION", value: escapeHtml(payload.organizationInstitution) });
    }
    if (payload.organizationName) {
      scopeRows.push({ label: "PROGRAM", value: escapeHtml(payload.organizationName) });
    }
    if (payload.periodName) {
      scopeRows.push({ label: "PERIOD", value: escapeHtml(payload.periodName) });
    }
    const scopeBlock = scopeRows.length
      ? `<div style="margin:0 0 18px;border:1px solid rgba(108,71,255,0.5);border-radius:16px;background:rgba(255,255,255,0.03);overflow:hidden;">` +
        scopeRows
          .map((row, index) =>
            `<div style="padding:14px 18px;${index > 0 ? "border-top:1px solid rgba(255,255,255,0.08);" : ""}">` +
            `<p style="margin:0;font-size:11px;line-height:1.3;letter-spacing:1.2px;color:#7c5cff;font-weight:700;">${row.label}</p>` +
            `<p style="margin:6px 0 0;font-size:16px;line-height:1.4;color:#f1f5f9;font-weight:700;">${row.value}</p>` +
            `</div>`
          )
          .join("") +
        `</div>`
      : "";

    const subject = `Your evaluation access link${periodLabel}`;
    const body = [
      `You have been invited to participate in a jury evaluation.`,
      payload.organizationInstitution ? `Organization: ${payload.organizationInstitution}` : "",
      payload.organizationName ? `Program: ${payload.organizationName}` : "",
      payload.periodName ? `Period: ${payload.periodName}` : "",
      `Click the link below to access the evaluation platform:`,
      payload.tokenUrl,
      expiryNote,
    ].filter(Boolean).join("\n\n");

    const html = buildHtml({
      title: "Jury Evaluation Access",
      intro: `You have been invited to participate in a jury evaluation.`,
      rawHtmlLines: [
        scopeBlock,
        `<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#a0aec0;">Tap the button below or scan the QR code to open the evaluation platform. ${escapeHtml(expiryNote)}</p>`,
        `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:0 0 16px;">` +
        `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=12&color=ffffff&bgcolor=1a1a2e&data=${encodeURIComponent(payload.tokenUrl)}" alt="Scan to join evaluation" width="180" height="180" style="display:block;border-radius:12px;" />` +
        `<p style="margin:8px 0 0;font-size:12px;color:#718096;">Scan with your phone camera</p>` +
        `</td></tr></table>`,
      ],
      ctaLabel: "Join Evaluation",
      ctaUrl: payload.tokenUrl,
      logoUrl: Deno.env.get("NOTIFICATION_LOGO_URL") || "",
    });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromAddr = Deno.env.get("NOTIFICATION_FROM") || "VERA <noreply@vera-eval.app>";
    let sent = false;
    let sendError = "";

    if (resendKey && payload.recipientEmail) {
      const result = await sendViaResend(resendKey, payload.recipientEmail, subject, body, html, fromAddr);
      sent = result.ok;
      sendError = result.error || "";
    } else {
      sendError = !resendKey ? "RESEND_API_KEY not configured" : "No recipient email";
    }

    console.log("send-entry-token-email:", JSON.stringify({ to: payload.recipientEmail, sent, error: sendError || undefined }));

    // Server-side audit write — runs before the response leaves the function.
    // No client crash can drop this event.
    if (sent) {
      try {
        await writeEdgeAuditLog(req, {
          action: "notification.entry_token",
          organization_id: payload.organizationId || null,
          resource_type: "entry_tokens",
          resource_id: payload.periodId || null,
          details: {
            recipientEmail: payload.recipientEmail,
            periodName: payload.periodName ?? null,
            organizationName: payload.organizationName ?? null,
            organizationInstitution: payload.organizationInstitution ?? null,
          },
        });
      } catch (auditErr) {
        console.error("audit write failed (notification.entry_token):", (auditErr as Error)?.message);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent, error: sendError || undefined }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("send-entry-token-email error:", (e as Error).message);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
