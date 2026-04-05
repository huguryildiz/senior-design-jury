// supabase/functions/send-juror-pin-email/index.ts
// ============================================================
// Sends a juror's newly-generated PIN (and optionally the
// evaluation entry URL) via Resend. Called from the admin
// Jurors page after a PIN reset.
//
// Payload: { recipientEmail, jurorName, jurorAffiliation,
//            pin, tokenUrl?, periodName? }
//
// Email provider: Resend (via RESEND_API_KEY env var).
// ============================================================

interface Payload {
  recipientEmail: string;
  jurorName: string;
  pin: string;
  jurorAffiliation?: string;
  tokenUrl?: string;
  periodName?: string;
  organizationName?: string;
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
  jurorName: string;
  jurorAffiliation: string;
  organizationName: string;
  pin: string;
  tokenUrl: string;
  periodLabel: string;
  logoUrl: string;
}): string {
  const logo = params.logoUrl
    ? `<img src="${escapeHtml(params.logoUrl)}" alt="VERA" width="160" style="display:block;margin:0 auto;height:auto;" />`
    : `<div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;"><span style="color:#f1f5f9;">V</span><span style="color:#93c5fd;">ERA</span></div>`;

  const pinDigits = params.pin.split("").map((d) =>
    `<span style="display:inline-block;width:52px;height:64px;line-height:64px;text-align:center;background:rgba(255,255,255,0.06);border:2px solid rgba(108,71,255,0.4);border-radius:8px;font-size:36px;font-weight:800;color:#ffffff;font-family:monospace;margin:0 4px;">${escapeHtml(d)}</span>`
  ).join("");

  const qrUrl = params.tokenUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=12&color=ffffff&bgcolor=1a1a2e&data=${encodeURIComponent(params.tokenUrl)}`
    : "";

  const ctaBlock = params.tokenUrl
    ? `<tr><td align="center" style="padding:8px 48px 20px;">
        <img src="${qrUrl}" alt="Scan to join evaluation" width="180" height="180" style="display:block;margin:0 auto;border-radius:12px;" />
        <p style="margin:10px 0 0;font-size:12px;color:#718096;">Scan with your phone camera</p>
      </td></tr>
      <tr><td align="center" style="padding:4px 48px 28px;">
        <a href="${escapeHtml(params.tokenUrl)}" style="display:inline-block;background:linear-gradient(135deg,#6c47ff,#a78bfa);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 36px;border-radius:50px;letter-spacing:0.3px;box-shadow:0 4px 20px rgba(108,71,255,0.45);">Join Evaluation &rarr;</a>
      </td></tr>`
    : "";

  const metaParts: string[] = [];
  if (params.jurorAffiliation) metaParts.push(escapeHtml(params.jurorAffiliation));
  if (params.organizationName) metaParts.push(escapeHtml(params.organizationName));
  const affilNote = metaParts.length
    ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#a0aec0;">${metaParts.join(" &middot; ")}</p>`
    : "";

  const periodNote = params.periodLabel
    ? `<p style="margin:0 0 8px;font-size:13px;color:#718096;">Evaluation period: <strong style="color:#a0aec0;">${escapeHtml(params.periodLabel)}</strong></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your VERA Evaluation PIN</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f0f1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%);border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.5);">
          <tr><td style="background:linear-gradient(90deg,#6c47ff,#a78bfa,#6c47ff);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td align="center" style="padding:40px 40px 20px;">${logo}</td></tr>
          <tr><td align="center" style="padding:8px 48px 12px;">
            <h1 style="margin:0;font-size:25px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Your Evaluation PIN</h1>
          </td></tr>
          <tr><td align="center" style="padding:0 48px 8px;">
            <p style="margin:0;font-size:15px;line-height:1.7;color:#a0aec0;">Hello, <strong style="color:#fff;">${escapeHtml(params.jurorName)}</strong>.</p>
            ${affilNote}
            <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#a0aec0;">Your jury evaluation PIN has been set. Use it to authenticate when you access the evaluation platform. Keep it confidential — it will not be shown again.</p>
            ${periodNote}
          </td></tr>
          <tr><td align="center" style="padding:12px 48px 20px;">
            <div style="display:inline-block;padding:24px 20px;background:rgba(0,0,0,0.3);border-radius:12px;border:1px solid rgba(108,71,255,0.3);">
              ${pinDigits}
            </div>
            <p style="margin:12px 0 0;font-size:11px;color:#4a5568;">This PIN will not be shown again after this email.</p>
          </td></tr>
          ${ctaBlock}
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

  try {
    const payload: Payload = await req.json();

    if (!payload.recipientEmail || !payload.jurorName || !payload.pin) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: recipientEmail, jurorName, pin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const periodLabel = payload.periodName || "";
    const subject = periodLabel
      ? `Your VERA evaluation PIN — ${periodLabel}`
      : "Your VERA evaluation PIN";

    const body = [
      `Hello, ${payload.jurorName}.`,
      `Your jury evaluation PIN has been set${periodLabel ? ` for ${periodLabel}` : ""}.`,
      `PIN: ${payload.pin}`,
      "Use this PIN to authenticate when you access the evaluation platform. Keep it confidential — it will not be shown again.",
      payload.tokenUrl ? `Evaluation link: ${payload.tokenUrl}` : "",
    ].filter(Boolean).join("\n\n");

    const html = buildHtml({
      jurorName: payload.jurorName,
      jurorAffiliation: payload.jurorAffiliation || "",
      organizationName: payload.organizationName || "",
      pin: payload.pin,
      tokenUrl: payload.tokenUrl || "",
      periodLabel,
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

    console.log("send-juror-pin-email:", JSON.stringify({ to: payload.recipientEmail, jurorName: payload.jurorName, sent, error: sendError || undefined }));

    return new Response(
      JSON.stringify({ ok: true, sent, error: sendError || undefined }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("send-juror-pin-email error:", (e as Error).message);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
