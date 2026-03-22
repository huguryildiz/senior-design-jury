// src/admin/hooks/useSettingsCrud.js
// ============================================================
// Thin orchestrator — wires the four domain hooks together,
// owns the Supabase Realtime subscription, and exposes the
// same flat API that SettingsPage.jsx already consumes.
//
// Domain hooks (Phase 6 — Settings CRUD Decomposition):
//   useManageSemesters  — semester CRUD + eval-lock
//   useManageProjects   — project CRUD
//   useManageJurors     — juror CRUD + PIN reset + edit-mode
//   useDeleteConfirm    — cross-cutting delete dialog
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useManageSemesters } from "./useManageSemesters";
import { useManageProjects } from "./useManageProjects";
import { useManageJurors } from "./useManageJurors";
import { useDeleteConfirm } from "./useDeleteConfirm";

/**
 * useSettingsCrud
 *
 * Orchestrates all semester/project/juror CRUD state and handlers.
 * SettingsPage.jsx calls this hook and receives the flat return object —
 * the call site is unchanged from before Phase 6.
 *
 * @param {object} params
 * @param {string}   params.adminPass
 * @param {string}   params.selectedSemesterId  From parent (AdminPanel → SettingsPage).
 * @param {Function} params.onDirtyChange        Callback to notify parent of dirty state.
 * @param {Function} params.onActiveSemesterChange Callback when active semester changes.
 * @param {Function} params.setMessage           Toast message setter.
 * @param {Function} params.setLoading           Loading state setter (from SettingsPage).
 * @param {Function} params.onAuditChange        Callback from useAuditLogFilters.scheduleAuditRefresh.
 */
export function useSettingsCrud({
  adminPass,
  selectedSemesterId,
  onDirtyChange,
  onActiveSemesterChange,
  setMessage,
  incLoading,
  decLoading,
  onAuditChange,
}) {
  // ── Cross-cutting panel state ─────────────────────────────
  const [panelDirty, setPanelDirty] = useState({
    semester: false,
    projects: false,
    jurors: false,
  });
  const [panelErrors, setPanelErrors] = useState({
    semester: "",
    projects: "",
    jurors: "",
  });

  const setPanelError = (panel, err) => {
    setPanelErrors((prev) => ({ ...prev, [panel]: err || "" }));
  };
  const clearPanelError = (panel) => setPanelError(panel, "");
  const clearAllPanelErrors = () => {
    setPanelErrors({ semester: "", projects: "", jurors: "" });
  };

  const handlePanelDirty = useCallback(
    (panel, dirty) => {
      setPanelDirty((prev) => {
        if (prev[panel] === dirty) return prev;
        const next = { ...prev, [panel]: dirty };
        const anyDirty = Object.values(next).some(Boolean);
        onDirtyChange?.(anyDirty);
        return next;
      });
    },
    [onDirtyChange]
  );

  // ── Domain hooks ──────────────────────────────────────────
  const semesters = useManageSemesters({
    adminPass,
    selectedSemesterId,
    setMessage,
    incLoading,
    decLoading,
    onActiveSemesterChange,
    setPanelError,
    clearPanelError,
  });

  const projects = useManageProjects({
    adminPass,
    viewSemesterId: semesters.viewSemesterId,
    viewSemesterLabel: semesters.viewSemesterLabel,
    semesterList: semesters.semesterList,
    setMessage,
    incLoading,
    decLoading,
    setPanelError,
    clearPanelError,
  });

  const jurors = useManageJurors({
    adminPass,
    viewSemesterId: semesters.viewSemesterId,
    viewSemesterLabel: semesters.viewSemesterLabel,
    projects: projects.projects,
    setMessage,
    incLoading,
    decLoading,
    setPanelError,
    clearPanelError,
    setEvalLockError: semesters.setEvalLockError,
  });

  const deleteConfirm = useDeleteConfirm({
    adminPass,
    setMessage,
    clearAllPanelErrors,
    onSemesterDeleted: semesters.removeSemester,
    onProjectDeleted: projects.removeProject,
    onJurorDeleted: jurors.removeJuror,
  });

  // ── Load on mount ─────────────────────────────────────────
  const jurorTimerRef = useRef(null);

  useEffect(() => {
    incLoading();
    clearPanelError("semester");
    semesters
      .loadSemesters()
      .catch(() =>
        setPanelError(
          "semester",
          "Could not load semesters. Try refreshing or check your connection."
        )
      )
      .finally(() => decLoading());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesters.loadSemesters]);

  // ── Load projects + jurors when viewSemesterId / adminPass changes ──
  // Uses Promise.allSettled so one panel failure doesn't block the other.
  // Juror score enrichment is deferred — the fast juror list renders first.
  useEffect(() => {
    if (!semesters.viewSemesterId) return;
    if (!adminPass) {
      semesters.setEvalLockError("Admin password missing. Please re-login.");
      return;
    }
    incLoading();
    clearPanelError("projects");
    clearPanelError("jurors");

    const semId = semesters.viewSemesterId;

    Promise.allSettled([
      projects.loadProjects(semId),
      jurors.loadJurors(),
    ]).then((results) => {
      // Handle project load failure
      if (results[0].status === "rejected") {
        const msg = results[0].reason?.message ||
          "Could not load groups. Check admin password or refresh.";
        setPanelError("projects", msg);
      }
      // Handle juror load failure
      if (results[1].status === "rejected") {
        const msg = results[1].reason?.message ||
          "Could not load jurors. Check admin password or refresh.";
        setPanelError("jurors", msg);
      }
    }).finally(() => decLoading());

    // Deferred: enrich jurors with score data after first paint.
    // Runs independently — failures are silently ignored (non-critical for initial render).
    const enrichTimer = setTimeout(() => {
      jurors.enrichJurorScores().catch(() => {});
    }, 100);

    return () => clearTimeout(enrichTimer);
    // Stable deps only — loadProjects/loadJurors/enrichJurorScores use refs internally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesters.viewSemesterId, adminPass]);

  // ── Supabase Realtime subscription ───────────────────────
  useEffect(() => {
    if (!adminPass) return;

    const channel = supabase
      .channel("admin-manage-live")

      // semesters: patch in-place, no full reload
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "semesters" },
        (payload) => {
          if (payload.new?.id) semesters.applySemesterPatch(payload.new);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "semesters" },
        (payload) => {
          if (payload.new?.id) {
            semesters.applySemesterPatch(payload.new);
            semesters.notifyExternalSemesterUpdate(payload.new.id);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "semesters" },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) semesters.removeSemester(deletedId);
        }
      )

      // projects: patch in-place for viewed semester
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "projects" },
        (payload) => {
          if (payload.new?.semester_id === semesters.viewSemesterId) {
            projects.applyProjectPatch(payload.new);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "projects" },
        (payload) => {
          if (payload.new?.semester_id === semesters.viewSemesterId) {
            projects.applyProjectPatch(payload.new);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "projects" },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) projects.removeProject(deletedId);
        }
      )

      // jurors / auth / scores: enriched — refetch jurors only
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jurors" },
        jurors.scheduleJurorRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "juror_semester_auth" },
        jurors.scheduleJurorRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scores" },
        jurors.scheduleJurorRefresh
      )

      // audit_logs: delegated to the audit hook via callback
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_logs" },
        () => {
          onAuditChange?.();
        }
      )

      .subscribe();

    return () => {
      if (jurorTimerRef.current) {
        clearTimeout(jurorTimerRef.current);
        jurorTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [
    adminPass,
    semesters.viewSemesterId,
    semesters.applySemesterPatch,
    semesters.removeSemester,
    semesters.notifyExternalSemesterUpdate,
    projects.applyProjectPatch,
    projects.removeProject,
    jurors.scheduleJurorRefresh,
    onAuditChange,
  ]);

  // ── Flat return — same shape as before Phase 6 ───────────
  return {
    // State
    semesterList: semesters.semesterList,
    activeSemesterId: semesters.activeSemesterId,
    projects: projects.projects,
    jurors: jurors.jurors,
    settings: semesters.settings,
    panelDirty,
    panelErrors,
    setPanelError,
    clearPanelError,
    resetPinInfo: jurors.resetPinInfo,
    pinResetTarget: jurors.pinResetTarget,
    pinResetLoading: jurors.pinResetLoading,
    pinCopied: jurors.pinCopied,
    deleteTarget: deleteConfirm.deleteTarget,
    setDeleteTarget: deleteConfirm.setDeleteTarget,
    deleteCounts: deleteConfirm.deleteCounts,
    setDeleteCounts: deleteConfirm.setDeleteCounts,
    evalLockError: semesters.evalLockError,
    setEvalLockError: semesters.setEvalLockError,
    evalLockConfirmOpen: semesters.evalLockConfirmOpen,
    setEvalLockConfirmOpen: semesters.setEvalLockConfirmOpen,
    evalLockConfirmNext: semesters.evalLockConfirmNext,
    setEvalLockConfirmNext: semesters.setEvalLockConfirmNext,
    evalLockConfirmLoading: semesters.evalLockConfirmLoading,
    setEvalLockConfirmLoading: semesters.setEvalLockConfirmLoading,
    // Computed / derived
    viewSemesterId: semesters.viewSemesterId,
    viewSemester: semesters.viewSemester,
    viewSemesterLabel: semesters.viewSemesterLabel,
    activeSemester: semesters.activeSemester,
    activeSemesterLabel: semesters.activeSemesterLabel,
    // Handlers — semesters
    handleSetActiveSemester: semesters.handleSetActiveSemester,
    handleCreateSemester: semesters.handleCreateSemester,
    handleUpdateSemester: semesters.handleUpdateSemester,
    handleUpdateCriteriaTemplate: semesters.handleUpdateCriteriaTemplate,
    handleUpdateMudekTemplate: semesters.handleUpdateMudekTemplate,
    handleSaveSettings: semesters.handleSaveSettings,
    // isLockedFn(semesterId): true when the semester is eval-locked or has any submitted scores.
    // is_locked covers all semesters via semesterList. finalSubmitted covers the viewed semester only.
    isLockedFn: (semesterId) => {
      const semester = semesters.semesterList.find((s) => s.id === semesterId);
      if (semester?.is_locked) return true;
      return (
        semesterId === semesters.viewSemesterId &&
        (jurors.jurors || []).some((j) => j.finalSubmitted)
      );
    },
    // Handlers — projects
    handleImportProjects: projects.handleImportProjects,
    handleAddProject: projects.handleAddProject,
    handleEditProject: projects.handleEditProject,
    reloadProjects: () => projects.loadProjects(semesters.viewSemesterId),
    // Handlers — jurors
    handleAddJuror: jurors.handleAddJuror,
    handleImportJurors: jurors.handleImportJurors,
    handleEditJuror: jurors.handleEditJuror,
    requestResetPin: jurors.requestResetPin,
    confirmResetPin: jurors.confirmResetPin,
    closeResetPinDialog: jurors.closeResetPinDialog,
    handleCopyPin: jurors.handleCopyPin,
    handleToggleJurorEdit: jurors.handleToggleJurorEdit,
    handleForceCloseJurorEdit: jurors.handleForceCloseJurorEdit,
    // Handlers — delete
    handleRequestDelete: deleteConfirm.handleRequestDelete,
    handleConfirmDelete: deleteConfirm.handleConfirmDelete,
    mapDeleteError: deleteConfirm.mapDeleteError,
    // Cross-cutting
    handlePanelDirty,
    loadSemesters: semesters.loadSemesters,
    loadJurors: jurors.loadJurors,
    enrichJurorScores: jurors.enrichJurorScores,
    loadJurorsAndEnrich: jurors.loadJurorsAndEnrich,
    scheduleJurorRefresh: jurors.scheduleJurorRefresh,
    refreshSemesters: semesters.refreshSemesters,
    externalUpdatedSemesterId: semesters.externalUpdatedSemesterId,
  };
}
