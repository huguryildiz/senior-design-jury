// src/admin/hooks/useDeleteConfirm.js
// ============================================================
// Cross-cutting delete confirmation dialog: fetches cascade
// counts, dispatches to domain-specific remove callbacks.
//
// Extracted from useSettingsCrud.js (Phase 6 — Settings
// CRUD Decomposition).
// ============================================================

import { useState } from "react";
import { adminDeleteEntity, adminDeleteCounts } from "../../shared/api";

const buildDeleteToastMessage = (type, label) => {
  const raw = String(label || "").trim();
  if (type === "project") {
    const groupNo = raw.replace(/^Group\s+/i, "").trim();
    return groupNo ? `Group ${groupNo} deleted` : "Group deleted";
  }
  if (type === "juror") {
    const jurorName = raw.replace(/^Juror\s+/i, "").trim();
    return jurorName ? `Juror ${jurorName} deleted` : "Juror deleted";
  }
  if (type === "semester") {
    const semesterName = raw.replace(/^Semester\s+/i, "").trim();
    return semesterName ? `Semester ${semesterName} deleted` : "Semester deleted";
  }
  return raw ? `${raw} deleted` : "Item deleted";
};

/**
 * useDeleteConfirm — cross-cutting delete dialog.
 *
 * @param {object} opts
 * @param {string}   opts.adminPass
 * @param {Function} opts.setMessage          Toast setter from SettingsPage.
 * @param {Function} opts.clearAllPanelErrors Clears all panel-level errors before delete.
 * @param {Function} opts.onSemesterDeleted   (id) → called after semester delete.
 * @param {Function} opts.onProjectDeleted    (id) → called after project delete.
 * @param {Function} opts.onJurorDeleted      (id) → called after juror delete.
 */
export function useDeleteConfirm({
  adminPass,
  setMessage,
  clearAllPanelErrors,
  onSemesterDeleted,
  onProjectDeleted,
  onJurorDeleted,
}) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteCounts, setDeleteCounts] = useState(null);

  const handleRequestDelete = async (target) => {
    if (!target || !target.id) return;
    setDeleteTarget(target);
    setDeleteCounts(null);
    if (!adminPass) return;
    try {
      const counts = await adminDeleteCounts(target.type, target.id, adminPass);
      setDeleteCounts(counts);
    } catch (_) {
      // counts are optional — dialog still opens
    }
  };

  const mapDeleteError = (e) => {
    const msg = String(e?.message || "");
    if (msg.includes("delete_password_missing")) {
      return "Delete password is not configured. Set it in Admin Security, then try again.";
    }
    if (msg.includes("incorrect_delete_password") || msg.includes("unauthorized")) {
      return "Incorrect delete password. Try again.";
    }
    if (msg.includes("not_found")) {
      return "Item not found. Refresh the list and try again.";
    }
    return "Could not delete. Please try again.";
  };

  const handleConfirmDelete = async (password) => {
    if (!deleteTarget) throw new Error("Nothing selected for deletion.");
    const { type, id, label } = deleteTarget;
    setMessage("");
    clearAllPanelErrors?.();
    await adminDeleteEntity({ targetType: type, targetId: id, deletePassword: password });
    if (type === "semester") {
      onSemesterDeleted?.(id);
    } else if (type === "project") {
      onProjectDeleted?.(id);
    } else if (type === "juror") {
      onJurorDeleted?.(id);
    }
    setMessage(buildDeleteToastMessage(type, label));
  };

  return {
    deleteTarget,
    setDeleteTarget,
    deleteCounts,
    setDeleteCounts,
    handleRequestDelete,
    handleConfirmDelete,
    mapDeleteError,
  };
}
