// src/shared/api/admin/notifications.js
// Wrappers for transactional email Edge Functions (Resend via Supabase).

import { supabase } from "../core/client";

/**
 * Sends the evaluation access link (QR token URL) to a recipient.
 * @param {object} params
 * @param {string} params.recipientEmail
 * @param {string} params.tokenUrl
 * @param {string} [params.expiresIn]  e.g. "2h 30m left"
 * @param {string} [params.periodName]
 * @returns {Promise<{ ok: boolean, sent: boolean, error?: string }>}
 */
export async function sendEntryTokenEmail({ recipientEmail, tokenUrl, expiresIn, periodName }) {
  const { data, error } = await supabase.functions.invoke("send-entry-token-email", {
    body: { recipientEmail, tokenUrl, expiresIn, periodName },
  });
  if (error) throw error;
  return data;
}

/**
 * Sends a juror's new PIN (and optionally the evaluation entry URL) to a recipient.
 * @param {object} params
 * @param {string} params.recipientEmail
 * @param {string} params.jurorName
 * @param {string} params.pin
 * @param {string} [params.jurorAffiliation]
 * @param {string} [params.tokenUrl]
 * @param {string} [params.periodName]
 * @returns {Promise<{ ok: boolean, sent: boolean, error?: string }>}
 */
export async function sendJurorPinEmail({ recipientEmail, jurorName, pin, jurorAffiliation, tokenUrl, periodName }) {
  const { data, error } = await supabase.functions.invoke("send-juror-pin-email", {
    body: { recipientEmail, jurorName, pin, jurorAffiliation, tokenUrl, periodName },
  });
  if (error) throw error;
  return data;
}

/**
 * Sends an export report as an email attachment to one or more recipients.
 * @param {object} params
 * @param {string[]} params.recipients     — email addresses
 * @param {string}   params.fileName       — e.g. "VERA_Rankings_2026-04-04.xlsx"
 * @param {string}   params.fileBase64     — base64-encoded file content
 * @param {string}   params.mimeType       — e.g. "application/pdf"
 * @param {string}   [params.reportTitle]  — e.g. "Score Rankings"
 * @param {string}   [params.periodName]
 * @param {string}   [params.organization]
 * @param {string}   [params.department]
 * @param {string}   [params.message]      — optional note from sender
 * @param {string}   [params.senderName]   — display name of sender
 * @param {string}   [params.ccSenderEmail] — CC sender if requested
 * @returns {Promise<{ ok: boolean, sent: boolean, error?: string }>}
 */
export async function sendExportReport({
  recipients, fileName, fileBase64, mimeType,
  reportTitle, periodName, organization, department, message,
  senderName, ccSenderEmail,
}) {
  const { data, error } = await supabase.functions.invoke("send-export-report", {
    body: {
      recipients, fileName, fileBase64, mimeType,
      reportTitle, periodName, organization, department, message,
      senderName, ccSenderEmail,
    },
  });
  if (error) throw error;
  return data;
}
