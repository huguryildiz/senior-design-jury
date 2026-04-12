// src/shared/api/admin/notifications.js
// Wrappers for transactional email Edge Functions (Resend via Supabase).
//
// Each Edge Function writes its own audit_logs row server-side AFTER
// the email sends successfully — client-side code here never touches
// audit_logs. No fire-and-forget.

import { invokeEdgeFunction } from "../core/invokeEdgeFunction";

/**
 * Sends the evaluation access link (QR token URL) to a recipient.
 * @returns {Promise<{ ok: boolean, sent: boolean, error?: string }>}
 */
export async function sendEntryTokenEmail({
  recipientEmail,
  tokenUrl,
  expiresIn,
  periodName,
  organizationName,
  organizationInstitution,
  organizationId,
  periodId,
}) {
  const { data, error } = await invokeEdgeFunction("send-entry-token-email", {
    body: {
      recipientEmail,
      tokenUrl,
      expiresIn,
      periodName,
      organizationName,
      organizationInstitution,
      organizationId: organizationId ?? null,
      periodId: periodId ?? null,
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Sends a juror's new PIN (and optionally the evaluation entry URL) to a recipient.
 * @returns {Promise<{ ok: boolean, sent: boolean, error?: string }>}
 */
export async function sendJurorPinEmail({
  recipientEmail,
  jurorName,
  pin,
  jurorAffiliation,
  tokenUrl,
  periodName,
  organizationName,
  organizationId,
  jurorId,
}) {
  const { data, error } = await invokeEdgeFunction("send-juror-pin-email", {
    body: {
      recipientEmail,
      jurorName,
      pin,
      jurorAffiliation,
      tokenUrl,
      periodName,
      organizationName,
      organizationId: organizationId ?? null,
      jurorId: jurorId ?? null,
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Sends an export report as an email attachment to one or more recipients.
 * @returns {Promise<{ ok: boolean, sent: boolean, error?: string }>}
 */
export async function sendExportReport({
  recipients,
  fileName,
  fileBase64,
  mimeType,
  reportTitle,
  periodName,
  organization,
  department,
  message,
  senderName,
  ccSenderEmail,
  organizationId,
}) {
  const { data, error } = await invokeEdgeFunction("send-export-report", {
    body: {
      recipients,
      fileName,
      fileBase64,
      mimeType,
      reportTitle,
      periodName,
      organization,
      department,
      message,
      senderName,
      ccSenderEmail,
      organizationId: organizationId ?? null,
    },
  });
  if (error) throw error;
  return data;
}
