// src/shared/api/admin/backups.js
// API module for platform_backups: list, create, delete, download.
// All mutating operations go through SECURITY DEFINER RPCs; file bytes
// are moved via the client-side Storage SDK.

import { supabase } from "../../lib/supabaseClient";
import { randomUUID as generateUUID } from "../../lib/randomUUID";
import { fullExport, logExportInitiated } from "./export.js";

const BUCKET = "backups";

/**
 * List all backups for an organization.
 * @param {string} organizationId
 * @returns {Promise<Array>}
 */
export async function listBackups(organizationId) {
  const { data, error } = await supabase.rpc("rpc_backup_list", {
    p_organization_id: organizationId,
  });
  if (error) throw error;
  return data || [];
}

/**
 * Create a new manual backup.
 * Builds JSON via fullExport(), uploads to Storage, registers the row.
 * @param {string} organizationId
 * @returns {Promise<{ id: string, path: string }>}
 */
export async function createBackup(organizationId) {
  await logExportInitiated({
    action: "export.backup",
    organizationId,
    resourceType: "platform_backups",
    resourceId: null,
    details: {
      format: "json",
      row_count: null,
      period_name: null,
      project_count: null,
      juror_count: null,
      filters: { origin: "manual" },
    },
  });

  const payload = await fullExport(organizationId);

  const rowCounts = {
    periods: (payload.periods || []).length,
    projects: (payload.projects || []).length,
    jurors: (payload.jurors || []).length,
    scores: (payload.scores || []).length,
    audit_logs: (payload.audit_logs || []).length,
  };

  const periodIds = (payload.periods || []).map((p) => p.id).filter(Boolean);

  const backupUuid = generateUUID();
  const path = `${organizationId}/${backupUuid}.json`;
  const json = JSON.stringify(payload);
  const blob = new Blob([json], { type: "application/json" });

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: "application/json",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data: insertedId, error: rpcError } = await supabase.rpc(
    "rpc_backup_register",
    {
      p_organization_id: organizationId,
      p_storage_path: path,
      p_size_bytes: blob.size,
      p_format: "json",
      p_row_counts: rowCounts,
      p_period_ids: periodIds,
      p_origin: "manual",
    },
  );
  if (rpcError) {
    // Best-effort rollback of the Storage file
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    throw rpcError;
  }

  return { id: insertedId, path };
}

/**
 * Delete a backup (both row and Storage file).
 * @param {string} backupId
 */
export async function deleteBackup(backupId) {
  const { data, error } = await supabase.rpc("rpc_backup_delete", {
    p_backup_id: backupId,
  });
  if (error) throw error;

  const path = Array.isArray(data) ? data[0]?.storage_path : data?.storage_path;
  if (path) {
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove([path]);
    if (removeError) {
      console.warn("[backups] Storage remove failed:", removeError.message);
    }
  }
}

/**
 * Get a 60-second signed URL for downloading a backup file.
 * @param {string} storagePath
 * @returns {Promise<string>}
 */
export async function getBackupSignedUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Record a download event for audit purposes.
 * @param {string} backupId
 */
export async function recordBackupDownload(backupId) {
  const { error } = await supabase.rpc("rpc_backup_record_download", {
    p_backup_id: backupId,
  });
  if (error) throw error;
}

/**
 * Get the current automatic backup schedule.
 * @returns {Promise<{ cron_expr: string }>}
 */
export async function getBackupSchedule() {
  const { data, error } = await supabase.rpc("rpc_admin_get_backup_schedule");
  if (error) throw error;
  return data;
}

/**
 * Update the automatic backup schedule and reschedule the pg_cron job.
 * @param {string} cronExpr  Standard 5-field cron expression (e.g. "0 3 * * *")
 */
export async function updateBackupSchedule(cronExpr) {
  const { error } = await supabase.rpc("rpc_admin_set_backup_schedule", {
    p_cron_expr: cronExpr,
  });
  if (error) throw error;
}
