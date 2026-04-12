// supabase/functions/notify-maintenance/index.ts
// ============================================================
// Sends maintenance notice emails to all active org-admin users.
//
// Called from the frontend after rpc_admin_set_maintenance succeeds
// when notifyAdmins === true.
//
// Auth: caller must supply a valid bearer JWT (super_admin). The
// function validates this is a super_admin before sending emails.
//
// Email provider: Resend (via RESEND_API_KEY env var).
// Falls back to logging-only if RESEND_API_KEY is not set.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSuperAdminEmails, shouldCcOn } from "../_shared/super-admin-cc.ts";
import { writeEdgeAuditLog } from "../_shared/audit-log.ts";

interface MaintenancePayload {
  message?: string;
  startTime?: string | null;   // ISO datetime
  endTime?: string | null;     // ISO datetime
  mode?: "scheduled" | "immediate";
  affectedOrgIds?: string[] | null;
  /** When set: skip org_admin lookup and send a single test email to this address (must match caller). */
  testRecipient?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getServiceClientOrNull() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

function buildMaintenanceEmail(params: {
  message: string;
  startTime: string | null;
  endTime: string | null;
  mode: string;
  recipientName?: string;
  logoUrl?: string;
}): string {
  const logoHtml = params.logoUrl && params.logoUrl.trim() !== ""
    ? `<img src="${escapeHtml(params.logoUrl)}" alt="VERA" width="160" style="display:block; margin:0 auto; height:auto;" />`
    : `<img src="https://vera-eval.app/vera_logo_dark.png" alt="VERA" width="120" style="display:block; border:0;" />`;

  const greeting = params.recipientName
    ? `<p style="margin:0 0 8px; font-size:15px; line-height:1.7; color:#a0aec0;">Hello, <strong style="color:#fff;">${escapeHtml(params.recipientName)}</strong>.</p>`
    : "";

  const startFormatted = formatDateTime(params.startTime);
  const endFormatted = formatDateTime(params.endTime);
  const isImmediate = params.mode === "immediate";

  const windowLines: string[] = [];
  if (isImmediate) {
    windowLines.push(`<p style="margin:0 0 6px; font-size:14px; line-height:1.7; color:#a0aec0;"><strong style="color:#fbbf24;">Start:</strong> Immediately (in progress)</p>`);
  } else if (startFormatted) {
    windowLines.push(`<p style="margin:0 0 6px; font-size:14px; line-height:1.7; color:#a0aec0;"><strong style="color:#fbbf24;">Start:</strong> ${escapeHtml(startFormatted)}</p>`);
  }
  if (endFormatted) {
    windowLines.push(`<p style="margin:0 0 6px; font-size:14px; line-height:1.7; color:#a0aec0;"><strong style="color:#fbbf24;">Estimated end:</strong> ${escapeHtml(endFormatted)}</p>`);
  } else {
    windowLines.push(`<p style="margin:0 0 6px; font-size:14px; line-height:1.7; color:#a0aec0;"><strong style="color:#fbbf24;">Duration:</strong> Until manually lifted</p>`);
  }

  const windowBlock = windowLines.length > 0 ? `
    <div style="margin:12px 0 20px; padding:14px 16px; background:rgba(217,119,6,0.08); border-radius:10px; border:1px solid rgba(217,119,6,0.25);">
      ${windowLines.join("")}
    </div>` : "";

  const messageBlock = params.message ? `
    <div style="margin:0 0 20px; padding:14px 16px; background:rgba(255,255,255,0.04); border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
      <p style="margin:0 0 6px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:#718096;">Notice</p>
      <p style="margin:0; font-size:14px; line-height:1.7; color:#a0aec0; white-space:pre-wrap;">${escapeHtml(params.message)}</p>
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>VERA Maintenance Notice</title>
</head>
<body style="margin:0; padding:0; background-color:#0f0f1a; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f0f1a; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background:linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%); border-radius:16px; overflow:hidden; box-shadow:0 8px 40px rgba(0,0,0,0.5);">
          <tr><td style="background:linear-gradient(90deg,#d97706,#fbbf24,#d97706); height:4px; font-size:0; line-height:0;">&nbsp;</td></tr>
          <tr><td align="center" style="padding:40px 40px 20px;">${logoHtml}</td></tr>
          <tr><td align="center" style="padding:8px 48px 12px;">
            <h1 style="margin:0; font-size:25px; font-weight:700; color:#ffffff; letter-spacing:-0.5px;">Scheduled Maintenance</h1>
          </td></tr>
          <tr><td align="center" style="padding:0 48px 20px;">
            <p style="margin:0; font-size:15px; line-height:1.7; color:#a0aec0;">VERA will be temporarily unavailable for scheduled maintenance.</p>
          </td></tr>
          <tr><td style="padding:0 48px 8px;">
            ${greeting}
            <p style="margin:0 0 8px; font-size:14px; line-height:1.7; color:#a0aec0;">The VERA platform will be entering maintenance mode. During this window, regular users will not be able to access the platform.</p>
            ${windowBlock}
            ${messageBlock}
            <p style="margin:0 0 16px; font-size:13px; line-height:1.7; color:#718096;">Super admins retain full access during the maintenance window. All evaluation data is preserved and unaffected.</p>
          </td></tr>
          <tr><td style="padding:0 48px;"><div style="border-top:1px solid rgba(255,255,255,0.08); font-size:0;">&nbsp;</div></td></tr>
          <tr><td align="center" style="padding:16px 48px 30px;"><p style="margin:0; font-size:12px; color:#4a5568; line-height:1.6;">&copy; 2026 VERA. All rights reserved.</p></td></tr>
          <tr><td style="background:linear-gradient(90deg,#d97706,#fbbf24,#d97706); height:4px; font-size:0; line-height:0;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPlainText(params: {
  message: string;
  startTime: string | null;
  endTime: string | null;
  mode: string;
}): string {
  const lines = ["VERA Maintenance Notice", "======================", ""];
  lines.push("The VERA platform will be entering maintenance mode.");
  if (params.mode === "immediate") {
    lines.push("Start: Immediately");
  } else if (params.startTime) {
    lines.push(`Start: ${formatDateTime(params.startTime)}`);
  }
  if (params.endTime) {
    lines.push(`Estimated end: ${formatDateTime(params.endTime)}`);
  } else {
    lines.push("Duration: Until manually lifted");
  }
  if (params.message) {
    lines.push("", "Notice:", params.message);
  }
  lines.push("", "Super admins retain full access during the maintenance window.");
  return lines.join("\n");
}

async function sendViaResend(
  apiKey: string,
  to: string,
  subject: string,
  text: string,
  html: string,
  from: string,
  cc?: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ccArr = (cc || []).filter(Boolean);
    const payload: Record<string, unknown> = {
      from,
      to: [to],
      subject,
      text,
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json(401, { error: "Missing bearer token" });

    const payload: MaintenancePayload = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json(500, { error: "Supabase environment is not configured." });
    }

    // Verify caller is super_admin
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: isSuperAdmin, error: authErr } = await caller.rpc("current_user_is_super_admin");
    if (authErr || !isSuperAdmin) {
      return json(403, { error: "super_admin required" });
    }

    // ── Test mode: send a single email to the caller, no DB changes ──────────
    if (payload.testRecipient) {
      const { data: callerData } = await caller.auth.getUser();
      const callerEmail = callerData?.user?.email || "";
      if (!callerEmail || callerEmail !== payload.testRecipient) {
        return json(400, { error: "testRecipient must match the authenticated caller's email" });
      }

      const resendKey = Deno.env.get("RESEND_API_KEY");
      const fromAddr = Deno.env.get("NOTIFICATION_FROM") || "VERA <noreply@vera-eval.app>";
      const logoUrl = Deno.env.get("NOTIFICATION_LOGO_URL") || "";
      const testMessage = payload.message || "VERA is undergoing scheduled maintenance. We'll be back shortly.";
      const testStart = payload.startTime ?? null;
      const testEnd = payload.endTime ?? null;
      const testMode = payload.mode || "scheduled";

      if (!resendKey) {
        console.log(`[notify-maintenance] Test mode: would send to ${callerEmail} (RESEND_API_KEY not set)`);
        return json(200, { ok: true, sent: 1, test: true });
      }
      const html = buildMaintenanceEmail({ message: testMessage, startTime: testStart, endTime: testEnd, mode: testMode, logoUrl });
      const plainText = buildPlainText({ message: testMessage, startTime: testStart, endTime: testEnd, mode: testMode });
      const result = await sendViaResend(resendKey, callerEmail, "[TEST] VERA Maintenance Notice", plainText, html, fromAddr);
      if (result.ok) return json(200, { ok: true, sent: 1, test: true });
      return json(500, { error: result.error });
    }

    // Use service client to get org_admin memberships + emails
    const service = createClient(supabaseUrl, serviceKey);

    const { data: members, error: membersErr } = await service
      .from("memberships")
      .select("user_id, organization_id, organizations(id, name, status)")
      .eq("role", "org_admin");

    if (membersErr) {
      return json(500, { error: `Failed to list members: ${membersErr.message}` });
    }

    // Filter by affectedOrgIds if specified
    const affectedSet = payload.affectedOrgIds && payload.affectedOrgIds.length > 0
      ? new Set(payload.affectedOrgIds)
      : null;

    const targetUserIds: string[] = [];
    const orgNameByUserId = new Map<string, string>();

    for (const m of (members || [])) {
      const org = (m as { organizations?: { id: string; name: string; status: string } | null }).organizations;
      if (!org || org.status !== "active") continue;
      if (affectedSet && !affectedSet.has(org.id)) continue;
      targetUserIds.push(m.user_id);
      orgNameByUserId.set(m.user_id, org.name);
    }

    if (targetUserIds.length === 0) {
      return json(200, { ok: true, sent: 0, skipped: "no active org admins found" });
    }

    // Get auth user emails via service role
    const { data: authData, error: usersErr } = await service.auth.admin.listUsers({ perPage: 1000 });
    if (usersErr) {
      return json(500, { error: `Failed to list auth users: ${usersErr.message}` });
    }

    const emailByUserId = new Map(
      (authData?.users || []).map((u: { id: string; email?: string }) => [u.id, u.email || ""]),
    );

    // Get display names from profiles
    const { data: profiles } = await service
      .from("profiles")
      .select("id, display_name")
      .in("id", targetUserIds);

    const nameByUserId = new Map(
      (profiles || []).map((p: { id: string; display_name?: string }) => [p.id, p.display_name || ""]),
    );

    // Build email content
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromAddr = Deno.env.get("NOTIFICATION_FROM") || "VERA <noreply@vera-eval.app>";
    const logoUrl = Deno.env.get("NOTIFICATION_LOGO_URL") || "";
    const subject = "VERA Maintenance Notice";

    const message = payload.message || "VERA is undergoing scheduled maintenance. We'll be back shortly.";
    const startTime = payload.startTime ?? null;
    const endTime = payload.endTime ?? null;
    const mode = payload.mode || "scheduled";

    const plainText = buildPlainText({ message, startTime, endTime, mode });

    let sentCount = 0;
    const errors: string[] = [];

    for (const userId of targetUserIds) {
      const email = emailByUserId.get(userId);
      if (!email) continue;

      const displayName = nameByUserId.get(userId) || undefined;
      const html = buildMaintenanceEmail({ message, startTime, endTime, mode, recipientName: displayName, logoUrl });

      if (!resendKey) {
        console.log(`[notify-maintenance] Would send to ${email} (RESEND_API_KEY not set)`);
        sentCount++;
        continue;
      }

      // CC super admins if ccOnMaintenance is on.
      let ccEmails: string[] = [];
      const service = getServiceClientOrNull();
      if (service) {
        const ccOn = await shouldCcOn(service, "ccOnMaintenance");
        if (ccOn) {
          ccEmails = await getSuperAdminEmails(service);
        }
      }

      const result = await sendViaResend(resendKey, email, subject, plainText, html, fromAddr, ccEmails);
      if (result.ok) {
        sentCount++;
        console.log(`[notify-maintenance] Sent to ${email}`);
      } else {
        errors.push(`${email}: ${result.error}`);
        console.error(`[notify-maintenance] Failed to send to ${email}: ${result.error}`);
      }
    }

    try {
      await writeEdgeAuditLog(req, {
        action: "notification.maintenance",
        organization_id: null,
        actor_type: "admin",
        details: {
          mode,
          startTime: startTime ?? null,
          endTime: endTime ?? null,
          sentCount,
          totalCount: targetUserIds.length,
          affectedOrgIds: payload.affectedOrgIds ?? null,
        },
      });
    } catch (auditErr) {
      console.error("audit write failed (notification.maintenance):", (auditErr as Error)?.message);
    }

    return json(200, {
      ok: true,
      sent: sentCount,
      total: targetUserIds.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    console.error("[notify-maintenance] Error:", (e as Error).message);
    return json(500, { error: (e as Error).message || "Internal server error" });
  }
});
