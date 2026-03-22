// src/admin/hooks/useManageJurors.js
// ============================================================
// Manages juror CRUD, PIN reset, and edit-mode state.
//
// Extracted from useSettingsCrud.js (Phase 6 — Settings
// CRUD Decomposition).
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminListJurors,
  adminGetScores,
  adminCreateJuror,
  adminUpdateJuror,
  adminResetJurorPin,
  adminSetJurorEditMode,
  adminForceCloseJurorEditMode,
} from "../../shared/api";
import { getCellState } from "../scoreHelpers";

const getJurorNameById = (list, jurorId) => {
  const target = (list || []).find(
    (j) => String(j?.juror_id || j?.jurorId || "") === String(jurorId || "")
  );
  return String(target?.juryName || target?.juror_name || "").trim();
};

/**
 * useManageJurors — juror CRUD, PIN reset, and edit-mode toggles.
 *
 * @param {object} opts
 * @param {string}   opts.adminPass
 * @param {string}   opts.viewSemesterId    Controlled by useManageSemesters.
 * @param {string}   opts.viewSemesterLabel Human-readable label for toast messages.
 * @param {Array}    opts.projects          Current project list (for total_projects count).
 * @param {Function} opts.setMessage        Toast setter from SettingsPage.
 * @param {Function} opts.setLoading        Loading setter from SettingsPage.
 * @param {Function} opts.setPanelError     (panel, msg) → sets a panel-level error.
 * @param {Function} opts.clearPanelError   (panel) → clears a panel-level error.
 * @param {Function} opts.setEvalLockError  Owned by useManageSemesters; juror edit errors go here.
 */
export function useManageJurors({
  adminPass,
  viewSemesterId,
  viewSemesterLabel,
  projects,
  setMessage,
  incLoading,
  decLoading,
  setPanelError,
  clearPanelError,
  setEvalLockError,
}) {
  const [jurors, setJurors] = useState([]);
  const [pinResetTarget, setPinResetTarget] = useState(null);
  const [resetPinInfo, setResetPinInfo] = useState(null);
  const [pinResetLoading, setPinResetLoading] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);

  const jurorTimerRef = useRef(null);
  const pinCopyTimerRef = useRef(null);

  // ── Stable refs for values used inside callbacks ─────────
  // These refs allow loadJurors / enrichJurorScores identity to remain
  // stable across renders, preventing effect re-triggers.
  const adminPassRef = useRef(adminPass);
  adminPassRef.current = adminPass;
  const viewSemesterIdRef = useRef(viewSemesterId);
  viewSemesterIdRef.current = viewSemesterId;

  // ── Reset pinCopied when resetPinInfo changes ─────────────
  useEffect(() => {
    setPinCopied(false);
    if (pinCopyTimerRef.current) {
      clearTimeout(pinCopyTimerRef.current);
      pinCopyTimerRef.current = null;
    }
  }, [resetPinInfo]);

  // ── Patch / remove helpers ───────────────────────────────
  const applyJurorPatch = useCallback((patch) => {
    if (!patch) return;
    const jurorId = patch.juror_id || patch.jurorId || patch.id;
    if (!jurorId) return;
    setJurors((prev) => {
      const next = [...prev];
      const idx = next.findIndex((j) => (j.juror_id || j.jurorId) === jurorId);
      const updated = {
        ...((idx >= 0 ? next[idx] : {}) || {}),
        ...patch,
      };
      if (idx >= 0) next[idx] = updated;
      else next.push(updated);
      return next;
    });
  }, []);

  const removeJuror = useCallback((deletedId) => {
    if (!deletedId) return;
    setJurors((prev) => prev.filter((j) => (j.juror_id || j.jurorId) !== deletedId));
  }, []);

  // ── Score enrichment helper (pure, no state dep) ─────────
  const _buildEnrichedJurors = (rows, scoreRows) => {
    const scoredByJuror = new Map();
    const startedByJuror = new Map();
    (scoreRows || []).forEach((r) => {
      const jurorId = String(r?.jurorId || "").trim();
      if (!jurorId) return;
      const cellState = getCellState(r);
      if (cellState === "scored") {
        scoredByJuror.set(jurorId, (scoredByJuror.get(jurorId) || 0) + 1);
      }
      if (cellState !== "empty") {
        startedByJuror.set(jurorId, (startedByJuror.get(jurorId) || 0) + 1);
      }
    });
    return (rows || []).map((j) => {
      const toBool = (v) => v === true || v === "true" || v === "t" || v === 1;
      const jurorId = String(j?.jurorId || j?.juror_id || "").trim();
      const totalProjects = Math.max(
        0,
        Number(j?.totalProjects ?? j?.total_projects ?? 0) || 0
      );
      const scoredProjects = scoredByJuror.get(jurorId) || 0;
      const startedProjects = startedByJuror.get(jurorId) || 0;
      const editEnabled = toBool(j?.editEnabled ?? j?.edit_enabled);
      const isCompleted = Boolean(j?.finalSubmittedAt || j?.final_submitted_at);
      const overviewStatus = editEnabled
        ? "editing"
        : isCompleted
          ? "completed"
          : totalProjects > 0 && scoredProjects >= totalProjects
            ? "ready_to_submit"
            : startedProjects > 0
              ? "in_progress"
              : "not_started";
      return {
        ...j,
        overviewStatus,
        overviewTotalProjects: totalProjects,
        overviewScoredProjects: scoredProjects,
        overviewStartedProjects: startedProjects,
      };
    });
  };

  // ── Fast load: juror list only (no score fetch) ──────────
  // Renders the juror panel immediately.  Score enrichment is deferred.
  const loadJurors = useCallback(async () => {
    const pass = adminPassRef.current;
    const semId = viewSemesterIdRef.current;
    if (!pass) return;
    const rows = await adminListJurors(semId, pass);
    // Map without score data — overview fields default to "not_started"
    setJurors(_buildEnrichedJurors(rows, []));
  }, []); // stable identity — reads from refs

  // ── Deferred enrichment: fetch scores and update overview ──
  // Called separately after initial render, or by Realtime refresh.
  const enrichJurorScores = useCallback(async () => {
    const pass = adminPassRef.current;
    const semId = viewSemesterIdRef.current;
    if (!pass) return;
    const [rows, scoreRows] = await Promise.all([
      adminListJurors(semId, pass),
      adminGetScores(semId, pass),
    ]);
    setJurors(_buildEnrichedJurors(rows, scoreRows));
  }, []); // stable identity — reads from refs

  // ── Full load: list + enrich in one call (for CRUD/Realtime) ──
  const loadJurorsAndEnrich = useCallback(async () => {
    const pass = adminPassRef.current;
    const semId = viewSemesterIdRef.current;
    if (!pass) return;
    const [rows, scoreRows] = await Promise.all([
      adminListJurors(semId, pass),
      adminGetScores(semId, pass),
    ]);
    setJurors(_buildEnrichedJurors(rows, scoreRows));
  }, []); // stable identity — reads from refs

  // ── scheduleJurorRefresh ──────────────────────────────────
  // Uses the full load+enrich path (Realtime changes may be score changes).
  const scheduleJurorRefresh = useCallback(() => {
    if (!adminPassRef.current) return;
    if (jurorTimerRef.current) return;
    jurorTimerRef.current = setTimeout(() => {
      jurorTimerRef.current = null;
      loadJurorsAndEnrich().catch(() => {});
    }, 400);
  }, [loadJurorsAndEnrich]);

  // ── Juror CRUD handlers ──────────────────────────────────
  const handleAddJuror = async (row) => {
    setMessage("");
    clearPanelError("jurors");
    incLoading();
    try {
      const created = await adminCreateJuror(row, adminPass);
      if (created?.juror_id) {
        applyJurorPatch({
          juror_id: created.juror_id,
          juror_name: created.juror_name,
          juror_inst: created.juror_inst,
          locked_until: null,
          last_seen_at: null,
          is_locked: false,
          is_assigned: false,
          scored_semesters: [],
          edit_enabled: false,
          final_submitted_at: null,
          last_activity_at: null,
          total_projects: (projects || []).length,
          completed_projects: 0,
        });
      }
      const jurorName = String(created?.juror_name || row?.juror_name || "").trim();
      setMessage(jurorName ? `Juror ${jurorName} added` : "Juror added");
      return { ok: true };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (
        msg.includes("juror_exists") ||
        msgLower.includes("jurors_name_inst_norm_uniq") ||
        msgLower.includes("duplicate key value violates unique constraint")
      ) {
        return {
          ok: false,
          fieldErrors: {
            duplicate:
              "A juror with the same name and institution / department already exists.",
          },
        };
      } else {
        setPanelError(
          "jurors",
          msg || "Could not add juror. Try again or check admin password."
        );
        return { ok: false };
      }
    } finally {
      decLoading();
    }
  };

  const handleImportJurors = async (rows) => {
    setMessage("");
    clearPanelError("jurors");
    incLoading();
    try {
      let skipped = 0;
      for (const row of rows) {
        try {
          const created = await adminCreateJuror(row, adminPass);
          if (created?.juror_id) {
            applyJurorPatch({
              juror_id: created.juror_id,
              juror_name: created.juror_name,
              juror_inst: created.juror_inst,
              locked_until: null,
              last_seen_at: null,
              is_locked: false,
              is_assigned: false,
              scored_semesters: [],
              edit_enabled: false,
              final_submitted_at: null,
              last_activity_at: null,
              total_projects: (projects || []).length,
              completed_projects: 0,
            });
          }
        } catch (e) {
          const msg = String(e?.message || "");
          const msgLower = msg.toLowerCase();
          if (
            msg.includes("juror_exists") ||
            msgLower.includes("jurors_name_inst_norm_uniq") ||
            msgLower.includes("duplicate key value violates unique constraint")
          ) {
            skipped += 1;
            continue;
          }
          throw e;
        }
      }
      setMessage(
        skipped > 0
          ? `Jurors imported. Skipped ${skipped} existing jurors`
          : "Jurors imported"
      );
      return { ok: true, skipped };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (
        msg.includes("juror_exists") ||
        msgLower.includes("jurors_name_inst_norm_uniq") ||
        msgLower.includes("duplicate key value violates unique constraint")
      ) {
        return { ok: false, formError: "Some jurors already exist. Refresh and try again." };
      } else {
        return {
          ok: false,
          formError: msg || "Could not import jurors. Check the CSV format and try again.",
        };
      }
    } finally {
      decLoading();
    }
  };

  const handleEditJuror = async (row) => {
    if (!row?.jurorId) return;
    setMessage("");
    clearPanelError("jurors");
    incLoading();
    try {
      await adminUpdateJuror(row, adminPass);
      applyJurorPatch({
        juror_id: row.jurorId,
        juror_name: row.juror_name,
        juror_inst: row.juror_inst,
      });
      const jurorName = String(row?.juror_name || "").trim();
      setMessage(jurorName ? `Juror ${jurorName} updated` : "Juror updated");
      return { ok: true };
    } catch (e) {
      setPanelError(
        "jurors",
        e?.message || "Could not update juror. Try again or check admin password."
      );
      return { ok: false };
    } finally {
      decLoading();
    }
  };

  // ── PIN reset handlers ────────────────────────────────────
  const copyPinToClipboard = async (pinValue) => {
    if (!pinValue) return false;
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(pinValue);
        return true;
      }
    } catch (_) {
      // fallback below
    }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = pinValue;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch (_) {
      return false;
    }
  };

  const handleResetPin = async (juror) => {
    const jurorId = juror?.jurorId || juror?.juror_id;
    const jurorName = juror?.juror_name || juror?.juryName;
    const jurorInst = juror?.juror_inst || juror?.juryDept;
    if (!viewSemesterId || !jurorId) {
      setPanelError("jurors", "Select a semester from the header before resetting a PIN.");
      return { ok: false };
    }
    setMessage("");
    clearPanelError("jurors");
    incLoading();
    try {
      const res = await adminResetJurorPin({ semesterId: viewSemesterId, jurorId }, adminPass);
      setResetPinInfo({
        ...res,
        juror_name: jurorName || res?.juror_name || null,
        juror_inst: jurorInst || res?.juror_inst || null,
      });
      applyJurorPatch({
        juror_id: jurorId,
        locked_until: null,
        failed_attempts: 0,
        is_locked: false,
        last_seen_at: null,
      });
      const jurorDisplayName = String(jurorName || res?.juror_name || "").trim();
      const semesterLabel = viewSemesterLabel || "";
      const toastJuror = jurorDisplayName || "juror";
      setMessage(
        semesterLabel
          ? `PIN reset for ${toastJuror} — ${semesterLabel}`
          : `PIN reset for ${toastJuror}`
      );
      return { ok: true, data: res };
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("semester_inactive")) {
        setPanelError("jurors", "Only the semester selected in header can be edited.");
      } else if (msg.includes("unauthorized")) {
        setPanelError("jurors", "Admin password is invalid. Please re-login.");
      } else {
        setPanelError(
          "jurors",
          e?.message || "Could not reset PIN. Try again or check admin password."
        );
      }
      return { ok: false };
    } finally {
      decLoading();
    }
  };

  const requestResetPin = (juror) => {
    if (!juror) return;
    setResetPinInfo(null);
    setPinCopied(false);
    setPinResetTarget(juror);
  };

  const confirmResetPin = async () => {
    if (!pinResetTarget || pinResetLoading) return;
    setPinResetLoading(true);
    try {
      const result = await handleResetPin(pinResetTarget);
      if (result?.ok) {
        setPinCopied(false);
      }
    } finally {
      setPinResetLoading(false);
    }
  };

  const closeResetPinDialog = () => {
    setPinResetTarget(null);
    setResetPinInfo(null);
    setPinCopied(false);
  };

  const handleCopyPin = async () => {
    const pinValue = resetPinInfo?.pin_plain_once;
    if (!pinValue) return;
    const ok = await copyPinToClipboard(pinValue);
    if (ok) {
      setPinCopied(true);
      if (pinCopyTimerRef.current) {
        clearTimeout(pinCopyTimerRef.current);
      }
      pinCopyTimerRef.current = setTimeout(() => {
        setPinCopied(false);
      }, 2000);
    }
  };

  // ── Juror edit-mode handlers ──────────────────────────────
  const handleToggleJurorEdit = async ({ jurorId, enabled }) => {
    if (!viewSemesterId || !jurorId) return;
    setMessage("");
    setEvalLockError?.("");
    if (!enabled) {
      setEvalLockError?.("Edit mode can only be closed by juror resubmission.");
      return;
    }
    applyJurorPatch({ juror_id: jurorId, edit_enabled: true });
    incLoading();
    try {
      await adminSetJurorEditMode(
        { semesterId: viewSemesterId, jurorId, enabled: true },
        adminPass
      );
      const jurorName = getJurorNameById(jurors, jurorId);
      setMessage(
        jurorName ? `Editing unlocked for Juror ${jurorName}` : "Editing unlocked for juror"
      );
    } catch (e) {
      applyJurorPatch({ juror_id: jurorId, edit_enabled: false });
      const msg = String(e?.message || "");
      if (
        msg.includes("edit_mode_disable_not_allowed") ||
        msg.includes("final_submit_required")
      ) {
        setEvalLockError?.("Edit mode can only be closed by juror resubmission.");
      } else if (msg.includes("final_submission_required")) {
        setEvalLockError?.(
          "Juror must have a completed submission before edit mode can be enabled."
        );
      } else if (msg.includes("no_pin")) {
        setEvalLockError?.("Juror PIN is missing for this semester. Reset the PIN first.");
      } else if (
        msg.includes("semester_not_found") ||
        msg.includes("semester_inactive")
      ) {
        setEvalLockError?.("Selected semester could not be found. Refresh and try again.");
      } else if (msg.includes("semester_locked")) {
        setEvalLockError?.("Evaluation lock is active. Unlock the semester first.");
      } else if (msg.includes("unauthorized")) {
        setEvalLockError?.("Admin password is invalid. Please re-login.");
      } else {
        setEvalLockError?.(
          e?.message || "Could not update edit mode. Try again or check admin password."
        );
      }
    } finally {
      decLoading();
    }
  };

  const handleForceCloseJurorEdit = async ({ jurorId }) => {
    if (!viewSemesterId || !jurorId) return;
    setMessage("");
    setEvalLockError?.("");
    applyJurorPatch({ juror_id: jurorId, edit_enabled: false });
    incLoading();
    try {
      await adminForceCloseJurorEditMode(
        { semesterId: viewSemesterId, jurorId },
        adminPass
      );
      const jurorName = getJurorNameById(jurors, jurorId);
      setMessage(
        jurorName ? `Editing locked for Juror ${jurorName}` : "Editing locked for juror"
      );
    } catch (e) {
      applyJurorPatch({ juror_id: jurorId, edit_enabled: true });
      const msg = String(e?.message || "");
      if (msg.includes("no_pin")) {
        setEvalLockError?.("Juror PIN is missing for this semester. Reset the PIN first.");
      } else if (
        msg.includes("semester_not_found") ||
        msg.includes("semester_inactive")
      ) {
        setEvalLockError?.("Selected semester could not be found. Refresh and try again.");
      } else if (msg.includes("unauthorized")) {
        setEvalLockError?.("Admin password is invalid. Please re-login.");
      } else {
        setEvalLockError?.(
          e?.message || "Could not lock editing. Try again or check admin password."
        );
      }
    } finally {
      decLoading();
    }
  };

  return {
    jurors,
    pinResetTarget,
    resetPinInfo,
    pinResetLoading,
    pinCopied,
    applyJurorPatch,
    removeJuror,
    loadJurors,
    enrichJurorScores,
    loadJurorsAndEnrich,
    scheduleJurorRefresh,
    handleAddJuror,
    handleImportJurors,
    handleEditJuror,
    requestResetPin,
    confirmResetPin,
    closeResetPinDialog,
    handleCopyPin,
    handleToggleJurorEdit,
    handleForceCloseJurorEdit,
  };
}
