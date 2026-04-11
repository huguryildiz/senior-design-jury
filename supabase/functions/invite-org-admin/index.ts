// supabase/functions/invite-org-admin/index.ts
// ============================================================
// Invites a new admin (or adds an existing user) to an organization.
//
// Flow:
// 1) Caller JWT is verified; _assert_org_admin ensures they're an org admin.
// 2) Validate email. Check for existing membership (early return 409).
// 3) Look up user in auth.users by email (service-only RPC).
//    a) Existing confirmed user  → insert membership 'active',  status:'added'
//    b) Existing unconfirmed     → re-generate invite link + re-send custom email,
//                                  insert membership 'invited', status:'reinvited'
//    c) New user                 → generateLink invite + send custom email via Resend
//                                  insert membership 'invited', status:'invited'
//
// Email: sent via Resend (custom branded HTML — not Supabase default template).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function ensureProfile(service: ReturnType<typeof createClient>, userId: string) {
  await service.from("profiles").insert({ id: userId }).then(() => null).catch(() => null);
}

function escapeHtml(input: string): string {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildInviteEmail(params: {
  organization: string;
  programName: string;
  inviteUrl: string;
  logoUrl?: string;
}): { subject: string; text: string; html: string } {
  const { organization, programName, inviteUrl, logoUrl } = params;

  const hasOrg = organization && organization.trim() !== "";
  const scopeInline = hasOrg
    ? `${organization} — ${programName}`
    : programName;

  const subject = `You've been invited to join ${scopeInline} on VERA`;

  const textLines = [
    `You've been invited as an organization administrator on VERA.`,
    "",
  ];
  if (hasOrg) textLines.push(`Organization: ${organization}`);
  textLines.push(`Program: ${programName}`);
  textLines.push(
    "",
    "Click the link below to accept your invitation and set up your account:",
    inviteUrl,
    "",
    "This invite link expires after 1 day.",
    "",
    "© 2026 VERA. All rights reserved.",
  );
  const text = textLines.join("\n");

  const logo = logoUrl && logoUrl.trim() !== ""
    ? `<img src="${escapeHtml(logoUrl)}" alt="VERA" width="160" style="display:block; margin:0 auto; height:auto;" />`
    : `<img src="https://vera-eval.app/vera_logo_dark.png" alt="VERA" width="120" style="display:block; border:0;" />`;

  const scopeCard = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(108,71,255,0.08); border:1px solid rgba(108,71,255,0.25); border-radius:12px; margin:4px 0 8px;">
      ${hasOrg ? `
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.8px; color:#6c47ff; font-weight:600; margin-bottom:4px;">Organization</div>
          <div style="font-size:15px; color:#f1f5f9; font-weight:600;">${escapeHtml(organization)}</div>
        </td>
      </tr>` : ""}
      <tr>
        <td style="padding:12px 16px;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.8px; color:#6c47ff; font-weight:600; margin-bottom:4px;">Program</div>
          <div style="font-size:15px; color:#f1f5f9; font-weight:600;">${escapeHtml(programName)}</div>
        </td>
      </tr>
    </table>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background-color:#0f0f1a; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f0f1a; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background:linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%); border-radius:16px; overflow:hidden; box-shadow:0 8px 40px rgba(0,0,0,0.5);">
          <tr><td style="background:linear-gradient(90deg,#6c47ff,#a78bfa,#6c47ff); height:4px; font-size:0; line-height:0;">&nbsp;</td></tr>
          <tr><td align="center" style="padding:40px 40px 20px;">${logo}</td></tr>
          <tr><td align="center" style="padding:8px 48px 12px;">
            <h1 style="margin:0; font-size:25px; font-weight:700; color:#ffffff; letter-spacing:-0.5px;">You've Been Invited</h1>
          </td></tr>
          <tr><td align="center" style="padding:0 48px 16px;">
            <p style="margin:0; font-size:15px; line-height:1.7; color:#a0aec0;">
              You've been invited to join VERA as an organization administrator with access to the following scope:
            </p>
          </td></tr>
          <tr><td style="padding:0 48px 12px;">${scopeCard}</td></tr>
          <tr><td style="padding:0 48px 8px;">
            <p style="margin:0 0 8px; font-size:14px; line-height:1.7; color:#a0aec0;">
              Click the button below to accept your invitation and set up your account. You will be asked to choose a password to complete the process.
            </p>
          </td></tr>
          <tr><td align="center" style="padding:16px 48px 8px;">
            <a href="${escapeHtml(inviteUrl)}" style="display:inline-block; background:linear-gradient(135deg,#6c47ff,#a78bfa); color:#ffffff; text-decoration:none; font-size:16px; font-weight:600; padding:14px 36px; border-radius:50px; letter-spacing:0.3px; box-shadow:0 4px 20px rgba(108,71,255,0.45);">
              Accept Invite &rarr;
            </a>
          </td></tr>
          <tr><td align="center" style="padding:8px 48px 24px;">
            <p style="margin:0; font-size:12px; color:#4a5568; line-height:1.6;">
              This invite link expires after 1 day. If it has expired, ask the admin who invited you to send a new one.
            </p>
          </td></tr>
          <tr><td style="padding:0 48px;"><div style="border-top:1px solid rgba(255,255,255,0.08); font-size:0;">&nbsp;</div></td></tr>
          <tr><td align="center" style="padding:16px 48px 30px;">
            <p style="margin:0; font-size:12px; color:#4a5568; line-height:1.6;">&copy; 2026 VERA. All rights reserved.</p>
          </td></tr>
          <tr><td style="background:linear-gradient(90deg,#6c47ff,#a78bfa,#6c47ff); height:4px; font-size:0; line-height:0;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
        html: params.html,
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json(401, { error: "Missing bearer token" });

    const { org_id, email, approval_flow } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    // When called from an approval flow, create membership as 'active' directly
    // so the admin panel reflects the approval immediately without waiting for
    // the user to click the invite link.
    const initialMembershipStatus = approval_flow ? "active" : "invited";

    if (!org_id || typeof org_id !== "string") {
      return json(400, { error: "Missing required field: org_id" });
    }
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return json(400, { error: "A valid email is required." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json(500, { error: "Supabase environment is not configured." });
    }

    // Caller client — user JWT, validates auth + org admin access
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    // Service client — bypasses RLS for admin operations
    const service = createClient(supabaseUrl, serviceKey);

    // ── 1. Auth check: caller must be org admin ─────────────────────────────
    const { error: authErr } = await caller.rpc("_assert_org_admin", {
      p_org_id: org_id,
    });
    if (authErr) {
      const status = authErr.message === "unauthorized" ? 403 : 400;
      return json(status, { error: authErr.message });
    }

    // ── 2. Resolve organization + program names ─────────────────────────────
    // In VERA: organizations.institution → "Organization" label (e.g. "TED University")
    //          organizations.name        → "Program" label       (e.g. "Electrical Engineering")
    const { data: orgData } = await service
      .from("organizations")
      .select("name, institution")
      .eq("id", org_id)
      .single();
    const programName = orgData?.name || "the program";
    const organization = orgData?.institution || "";

    // ── 3. Find user in auth.users by email ─────────────────────────────────
    const { data: userRows, error: findErr } = await service.rpc(
      "rpc_admin_find_user_by_email",
      { p_email: normalizedEmail },
    );
    if (findErr) return json(500, { error: findErr.message });

    const existingUser = Array.isArray(userRows) && userRows.length > 0
      ? userRows[0] as { id: string; email_confirmed_at: string | null }
      : null;

    // ── 4. If user exists, check for existing membership ────────────────────
    if (existingUser?.id) {
      const { data: existingMembership } = await service
        .from("memberships")
        .select("id, status")
        .eq("user_id", existingUser.id)
        .eq("organization_id", org_id)
        .maybeSingle();

      if (existingMembership) {
        return json(409, {
          error: "already_member",
          status: existingMembership.status,
        });
      }
    }

    const appUrl = (Deno.env.get("NOTIFICATION_APP_URL") || "https://vera-eval.app").trim();
    const redirectTo = `${appUrl}/invite/accept`;
    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    const fromAddr = Deno.env.get("NOTIFICATION_FROM") || "VERA <noreply@vera-eval.app>";
    const logoUrl = (Deno.env.get("NOTIFICATION_LOGO_URL") || "").trim();

    // ── 5a. Existing confirmed user → add as active (no invite email) ───────
    if (existingUser?.id && existingUser.email_confirmed_at) {
      const userId = existingUser.id;
      await ensureProfile(service, userId);

      const { error: memErr } = await service.from("memberships").insert({
        user_id: userId,
        organization_id: org_id,
        role: "org_admin",
        status: "active",
      });
      if (memErr) return json(400, { error: memErr.message });

      return json(200, { status: "added", user_id: userId });
    }

    // ── 5b/c. New or unconfirmed user → generate invite link + custom email ─
    // generateLink creates the user (if new) or refreshes the invite link
    // (if unconfirmed) WITHOUT sending Supabase's default email.
    const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
      type: "invite",
      email: normalizedEmail,
      options: { redirectTo },
    });
    if (linkErr) return json(400, { error: linkErr.message });

    const inviteUrl = linkData?.properties?.action_link;
    if (!inviteUrl) return json(500, { error: "Could not generate invite link." });

    const newUserId = linkData?.user?.id;
    if (!newUserId) return json(500, { error: "Could not create invited user." });

    // Send custom branded email via Resend
    if (resendKey) {
      const { subject, text, html } = buildInviteEmail({
        organization,
        programName,
        inviteUrl,
        logoUrl,
      });
      const sendResult = await sendViaResend({
        apiKey: resendKey,
        from: fromAddr,
        to: normalizedEmail,
        subject,
        text,
        html,
      });
      if (!sendResult.ok) {
        console.error("Invite email send failed:", sendResult.error);
        // Non-fatal: membership is still created; log error but continue
      }
    } else {
      console.warn("RESEND_API_KEY not set — invite email not sent");
    }

    await ensureProfile(service, newUserId);

    const isReinvite = existingUser?.id === newUserId;
    const { error: memErr } = await service.from("memberships").insert({
      user_id: newUserId,
      organization_id: org_id,
      role: "org_admin",
      status: initialMembershipStatus,
    });
    if (memErr) return json(400, { error: memErr.message });

    return json(200, {
      status: isReinvite ? "reinvited" : "invited",
      user_id: newUserId,
      email: normalizedEmail,
    });

  } catch (e) {
    return json(500, { error: (e as Error).message || "Internal server error" });
  }
});
