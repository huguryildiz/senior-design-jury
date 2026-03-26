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

// ── Count summary (moved from DeleteConfirmDialog) ────────────

export function buildCountSummary(counts) {
  if (!counts) return null;
  const parts = [];
  if (counts.active_semesters > 0) {
    if ((counts.scores || 0) === 0) {
      parts.push(`${counts.active_semesters} semester${counts.active_semesters !== 1 ? "s" : ""} with no completed evaluations`);
    } else {
      parts.push(`${counts.active_semesters} semester${counts.active_semesters !== 1 ? "s" : ""} with ${counts.scores || 0} completed evaluation${counts.scores !== 1 ? "s" : ""}`);
    }
  } else if (counts.juror_auths > 0) {
    if ((counts.scores || 0) === 0) {
      parts.push(`${counts.juror_auths} semester${counts.juror_auths !== 1 ? "s" : ""} with no completed evaluations`);
    } else {
      parts.push(`${counts.juror_auths} juror assignment${counts.juror_auths !== 1 ? "s" : ""}`);
    }
  }
  if (counts.projects > 0) {
    parts.push(`${counts.projects} group project${counts.projects !== 1 ? "s" : ""}`);
  }
  if (counts.scores > 0 && counts.active_semesters <= 0 && counts.juror_auths <= 0) {
    parts.push(`${counts.scores} completed evaluation${counts.scores !== 1 ? "s" : ""}`);
  }
  if (parts.length === 0) return null;
  const line =
    parts.length === 1
      ? parts[0]
      : parts.length === 2
        ? parts.join(" and ")
        : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
  return `This will also permanently delete: ${line}.`;
}

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
 * Derives a typed-confirmation string for high-impact deletes.
 * Semesters require typing the exact semester name.
 * Other entities use simple confirmation (null = no typed input).
 */
const deriveTypedConfirmation = (target) => {
  if (!target) return null;
  const raw = String(target.name || target.label || "").trim();
  if (target.type === "semester") {
    return raw.replace(/^Semester\s+/i, "").trim() || null;
  }
  if (target.type === "juror") {
    return raw.replace(/^Juror\s+/i, "").trim() || null;
  }
  if (target.type === "project") {
    return raw || null;
  }
  return raw || null;
};

/**
 * useDeleteConfirm — cross-cutting delete dialog.
 *
 * @param {object} opts
 * @param {string}   opts.tenantId
 * @param {Function} opts.setMessage          Toast setter from SettingsPage.
 * @param {Function} opts.clearAllPanelErrors Clears all panel-level errors before delete.
 * @param {Function} opts.onSemesterDeleted   (id) → called after semester delete.
 * @param {Function} opts.onProjectDeleted    (id) → called after project delete.
 * @param {Function} opts.onJurorDeleted      (id) → called after juror delete.
 */
export function useDeleteConfirm({
  tenantId,
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
    const typedConfirmation = deriveTypedConfirmation(target);
    setDeleteTarget({ ...target, typedConfirmation });
    setDeleteCounts(null);
    if (!tenantId) return;
    try {
      const counts = await adminDeleteCounts(target.type, target.id);
      setDeleteCounts(counts);
    } catch (_) {
      // counts are optional — dialog still opens
    }
  };

  const mapDeleteError = (e) => {
    const msg = String(e?.message || "");
    if (msg.includes("not_found")) {
      return "Item not found. Refresh the list and try again.";
    }
    if (msg.includes("semester_locked")) {
      return "Cannot delete: semester is locked.";
    }
    if (msg.includes("project_has_scored_data")) {
      return "Cannot delete: project has scored data.";
    }
    return "Could not delete. Please try again.";
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) throw new Error("Nothing selected for deletion.");
    const { type, id, label } = deleteTarget;
    setMessage("");
    clearAllPanelErrors?.();
    await adminDeleteEntity({ targetType: type, targetId: id });
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
