// supabase/functions/send-export-report/index.ts
// ============================================================
// Sends an export report (XLSX / CSV / PDF) as an email
// attachment to one or more recipients via Resend.
//
// Called from the admin Send Report dialog.
//
// Payload:
//   recipients     — string[]  (email addresses)
//   fileName       — string    (e.g. "VERA_Rankings_TEDU_2026-04-04.xlsx")
//   fileBase64     — string    (base64-encoded file content)
//   mimeType       — string    (e.g. "application/pdf")
//   reportTitle    — string    (e.g. "Score Rankings")
//   periodName     — string?   (e.g. "Spring 2026")
//   organization   — string?   (e.g. "TEDU EE")
//   message        — string?   (optional note from sender)
//   senderName     — string?   (display name of sender)
//   ccSenderEmail  — string?   (CC sender if requested)
//
// Email provider: Resend (via RESEND_API_KEY env var).
// Audit: notification.export_report written server-side after email send.
// ============================================================

import { writeEdgeAuditLog } from "../_shared/audit-log.ts";
import { requireAdminCaller } from "../_shared/admin-auth.ts";

interface Payload {
  recipients: string[];
  fileName: string;
  fileBase64: string;
  mimeType: string;
  reportTitle?: string;
  periodName?: string;
  organization?: string;
  department?: string;
  message?: string;
  senderName?: string;
  ccSenderEmail?: string;
  organizationId?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

function formatIcon(mime: string): { label: string; color: string } {
  if (mime.includes("pdf")) return { label: "PDF", color: "#ef4444" };
  if (mime.includes("csv") || mime.includes("text"))
    return { label: "CSV", color: "#3b82f6" };
  return { label: "XLSX", color: "#16a34a" };
}

function buildHtml(params: {
  reportTitle: string;
  periodName: string;
  organization: string;
  department: string;
  message: string;
  fileName: string;
  mimeType: string;
  senderName: string;
  logoUrl: string;
}): string {
  const logo = params.logoUrl
    ? `<img src="${escapeHtml(params.logoUrl)}" alt="VERA" width="160" style="display:block;margin:0 auto;height:auto;" />`
    : `<img src="https://vera-eval.app/vera_logo_dark.png" alt="VERA" width="120" style="display:block; border:0;" />`;

  const icon = formatIcon(params.mimeType);

  const metaParts: string[] = [];
  if (params.organization) metaParts.push(escapeHtml(params.organization));
  if (params.department) metaParts.push(escapeHtml(params.department));
  if (params.periodName) metaParts.push(escapeHtml(params.periodName));
  const metaLine = metaParts.length
    ? `<p style="margin:0 0 16px;font-size:13px;color:#718096;">${metaParts.join(" &middot; ")}</p>`
    : "";

  const sentByLine = params.senderName
    ? `<p style="margin:4px 0 16px;font-size:13px;color:#718096;">Sent by <strong style="color:#a0aec0;">${escapeHtml(params.senderName)}</strong></p>`
    : "";

  const messageBlock = params.message
    ? `<div style="margin:0 0 20px;padding:14px 16px;background:rgba(255,255,255,0.05);border-radius:10px;border:1px solid rgba(255,255,255,0.08);">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#718096;">Message from ${escapeHtml(params.senderName || "the sender")}</p>
        <p style="margin:0;font-size:14px;line-height:1.7;color:#a0aec0;white-space:pre-wrap;">${escapeHtml(params.message)}</p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>VERA Export Report</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f0f1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%);border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.5);">
          <tr><td style="background:linear-gradient(90deg,#6c47ff,#a78bfa,#6c47ff);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td align="center" style="padding:40px 40px 20px;">${logo}</td></tr>
          <tr><td align="center" style="padding:8px 48px 12px;">
            <h1 style="margin:0;font-size:25px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Export Report</h1>
          </td></tr>
          <tr><td style="padding:0 48px 8px;">
            <p style="margin:0;font-size:15px;line-height:1.7;color:#a0aec0;">A VERA evaluation report has been shared with you.</p>
            ${sentByLine}
            ${metaLine}
            ${messageBlock}
            <!-- File attachment card -->
            <div style="padding:16px;background:rgba(0,0,0,0.3);border-radius:12px;border:1px solid rgba(108,71,255,0.3);display:flex;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                <td width="48" valign="middle" style="padding-right:14px;">
                  <div style="width:42px;height:48px;border-radius:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);text-align:center;line-height:48px;">
                    <span style="font-family:monospace;font-size:11px;font-weight:700;color:${icon.color};letter-spacing:0.3px;">${icon.label}</span>
                  </div>
                </td>
                <td valign="middle">
                  <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">${escapeHtml(params.reportTitle || "Report")}</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#718096;">${escapeHtml(params.fileName)}</p>
                </td>
              </tr></table>
            </div>
            <p style="margin:14px 0 0;font-size:12px;color:#4a5568;">The report file is included as an attachment to this email.</p>
          </td></tr>
          <tr><td style="padding:16px 48px 0;"><div style="border-top:1px solid rgba(255,255,255,0.08);font-size:0;">&nbsp;</div></td></tr>
          <tr><td align="center" style="padding:16px 48px 30px;"><p style="margin:0;font-size:12px;color:#4a5568;line-height:1.6;">&copy; 2026 VERA. All rights reserved.</p></td></tr>
          <tr><td style="background:linear-gradient(90deg,#6c47ff,#a78bfa,#6c47ff);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendViaResend(
  apiKey: string,
  recipients: string[],
  subject: string,
  textBody: string,
  html: string,
  from: string,
  attachment: { filename: string; content: string },
  cc?: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    const payload: Record<string, unknown> = {
      from,
      to: recipients,
      subject,
      text: textBody,
      html,
      attachments: [attachment],
    };
    if (cc && cc.length > 0) {
      payload.cc = cc;
    }
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const payload: Payload = await req.json();

    if (
      !payload.recipients ||
      payload.recipients.length === 0 ||
      !payload.fileName ||
      !payload.fileBase64
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: recipients, fileName, fileBase64",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const auth = await requireAdminCaller(req, payload.organizationId || null);
    if (!auth.ok) {
      return new Response(
        JSON.stringify({ error: auth.error }),
        {
          status: auth.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const reportTitle = payload.reportTitle || "Report";
    const periodName = payload.periodName || "";
    const organization = payload.organization || "";
    const department = payload.department || "";
    const senderName = payload.senderName || "";

    const subject = "VERA Evaluation Report";

    const textBody = [
      "A VERA evaluation report has been shared with you.",
      senderName ? `Sent by ${senderName}` : "",
      "",
      organization ? `Organization: ${organization}` : "",
      department ? `Department: ${department}` : "",
      periodName ? `Period: ${periodName}` : "",
      payload.message ? `\nMessage:\n${payload.message}` : "",
      `\nFile: ${payload.fileName} (attached)`,
    ]
      .filter((l) => l !== undefined)
      .join("\n");

    const html = buildHtml({
      reportTitle,
      periodName,
      organization,
      department,
      message: payload.message || "",
      fileName: payload.fileName,
      mimeType: payload.mimeType || "",
      senderName,
      logoUrl: Deno.env.get("NOTIFICATION_LOGO_URL") || "",
    });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromAddr =
      Deno.env.get("NOTIFICATION_FROM") || "VERA <noreply@vera-eval.app>";

    let sent = false;
    let sendError = "";

    if (resendKey) {
      const cc = payload.ccSenderEmail ? [payload.ccSenderEmail] : undefined;
      const result = await sendViaResend(
        resendKey,
        payload.recipients,
        subject,
        textBody,
        html,
        fromAddr,
        { filename: payload.fileName, content: payload.fileBase64 },
        cc,
      );
      sent = result.ok;
      sendError = result.error || "";
    } else {
      sendError = "RESEND_API_KEY not configured";
    }

    console.log(
      "send-export-report:",
      JSON.stringify({
        to: payload.recipients,
        reportTitle,
        fileName: payload.fileName,
        sent,
        error: sendError || undefined,
      }),
    );

    if (sent) {
      try {
        await writeEdgeAuditLog(req, {
          action: "notification.export_report",
          organization_id: payload.organizationId || null,
          resource_type: "score_sheets",
          details: {
            recipients: payload.recipients,
            reportTitle,
            periodName: payload.periodName ?? null,
            fileName: payload.fileName,
          },
        });
      } catch (auditErr) {
        console.error("audit write failed (notification.export_report):", (auditErr as Error)?.message);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent, error: sendError || undefined }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("send-export-report error:", (e as Error).message);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
