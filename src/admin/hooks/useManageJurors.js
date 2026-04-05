// src/admin/hooks/useManageJurors.js
// ============================================================
// Manages juror CRUD, PIN reset, and edit-mode state.
//
// Extracted from useSettingsCrud.js (Phase 6 — Settings
// CRUD Decomposition).
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listJurorsSummary,
  getScores,
  getPeriodMaxScore,
  createJuror,
  updateJuror,
  deleteJuror,
  resetJurorPin,
  setJurorEditMode,
  forceCloseJurorEditMode,
} from "../../shared/api";

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
 * @param {string}   opts.organizationId
 * @param {string}   opts.viewPeriodId      Controlled by useManagePeriods.
 * @param {string}   opts.viewPeriodLabel   Human-readable label for toast messages.
 * @param {Array}    opts.projects          Current project list (for total_projects count).
 * @param {Function} opts.setMessage        Toast setter from SettingsPage.
 * @param {Function} opts.setLoading        Loading setter from SettingsPage.
 * @param {Function} opts.setPanelError     (panel, msg) → sets a panel-level error.
 * @param {Function} opts.clearPanelError   (panel) → clears a panel-level error.
 * @param {Function} opts.setEvalLockError  Owned by useManagePeriods; juror edit errors go here.
 */
export function useManageJurors({
  organizationId,
  viewPeriodId,
  viewPeriodLabel,
  projects,
  setMessage,
  incLoading,
  decLoading,
  setPanelError,
  clearPanelError,
  setEvalLockError,
}) {
  const [jurors, setJurors] = useState([]);
  const [scoreRows, setScoreRows] = useState([]);
  const [periodMaxScore, setPeriodMaxScore] = useState(null);
  const [pinResetTarget, setPinResetTarget] = useState(null);
  const [resetPinInfo, setResetPinInfo] = useState(null);
  const [pinResetLoading, setPinResetLoading] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);

  const jurorTimerRef = useRef(null);
  const pinCopyTimerRef = useRef(null);

  // ── Stable refs for values used inside callbacks ─────────
  // These refs allow loadJurors / enrichJurorScores identity to remain
  // stable across renders, preventing effect re-triggers.
  const organizationIdRef = useRef(organizationId);
  organizationIdRef.current = organizationId;
  const viewPeriodIdRef = useRef(viewPeriodId);
  viewPeriodIdRef.current = viewPeriodId;

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
    // Count score sheets per juror. A score sheet row in getScores means the
    // juror has saved at least one score for that project. We can't call
    // getCellState without a criteria list, so we use presence of the row as
    // "started" and a non-null total as "scored".
    const scoredByJuror = new Map();
    const startedByJuror = new Map();
    (scoreRows || []).forEach((r) => {
      const jurorId = String(r?.jurorId || "").trim();
      if (!jurorId) return;
      startedByJuror.set(jurorId, (startedByJuror.get(jurorId) || 0) + 1);
      if (r.total != null) {
        scoredByJuror.set(jurorId, (scoredByJuror.get(jurorId) || 0) + 1);
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
    const oid = organizationIdRef.current;
    const pid = viewPeriodIdRef.current;
    if (!oid) return;
    const rows = await listJurorsSummary(pid);
    // Map without score data — overview fields default to "not_started"
    setJurors(_buildEnrichedJurors(rows, []));
  }, []); // stable identity — reads from refs

  // ── Deferred enrichment: fetch scores and update overview ──
  // Called separately after initial render, or by Realtime refresh.
  const enrichJurorScores = useCallback(async () => {
    const oid = organizationIdRef.current;
    const pid = viewPeriodIdRef.current;
    if (!oid) return;
    const [rows, scores] = await Promise.all([
      listJurorsSummary(pid),
      getScores(pid),
    ]);
    setScoreRows(scores);
    setJurors(_buildEnrichedJurors(rows, scores));
  }, []); // stable identity — reads from refs

  // ── Full load: list + enrich in one call (for CRUD/Realtime) ──
  const loadJurorsAndEnrich = useCallback(async () => {
    const oid = organizationIdRef.current;
    const pid = viewPeriodIdRef.current;
    if (!oid) return;
    const [rows, scores, maxScore] = await Promise.all([
      listJurorsSummary(pid),
      getScores(pid),
      getPeriodMaxScore(pid),
    ]);
    setScoreRows(scores);
    setPeriodMaxScore(maxScore);
    setJurors(_buildEnrichedJurors(rows, scores));
  }, []); // stable identity — reads from refs

  // ── scheduleJurorRefresh ──────────────────────────────────
  // Uses the full load+enrich path (Realtime changes may be score changes).
  const scheduleJurorRefresh = useCallback(() => {
    if (!organizationIdRef.current) return;
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
      const created = await createJuror({ ...row, organizationId, periodId: viewPeriodId });
      if (created?.juror_id) {
        applyJurorPatch({
          juror_id: created.juror_id,
          juror_name: created.juror_name,
          affiliation: created.affiliation,
          locked_until: null,
          last_seen_at: null,
          is_locked: false,
          is_assigned: false,
          scored_periods: [],
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
        msgLower.includes("jurors_name_affiliation_norm_uniq") ||
        msgLower.includes("duplicate key value violates unique constraint")
      ) {
        return {
          ok: false,
          fieldErrors: {
            duplicate:
              "A juror with the same name and affiliation already exists.",
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
      let imported = 0, skipped = 0, failed = 0;
      for (const row of rows) {
        try {
          const created = await createJuror({ ...row, organizationId, periodId: viewPeriodId });
          if (created?.juror_id) {
            applyJurorPatch({
              juror_id: created.juror_id,
              juror_name: created.juror_name,
              affiliation: created.affiliation,
              locked_until: null,
              last_seen_at: null,
              is_locked: false,
              is_assigned: false,
              scored_periods: [],
              edit_enabled: false,
              final_submitted_at: null,
              last_activity_at: null,
              total_projects: (projects || []).length,
              completed_projects: 0,
            });
            imported += 1;
          }
        } catch (e) {
          const msg = String(e?.message || "");
          const msgLower = msg.toLowerCase();
          if (
            msg.includes("juror_exists") ||
            msgLower.includes("jurors_name_affiliation_norm_uniq") ||
            msgLower.includes("duplicate key value violates unique constraint")
          ) {
            skipped += 1;
            continue;
          }
          failed += 1;
        }
      }
      setMessage(
        skipped > 0
          ? `Jurors imported. Skipped ${skipped} existing jurors`
          : "Jurors imported"
      );
      return { ok: true, imported, skipped, failed };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (
        msg.includes("juror_exists") ||
        msgLower.includes("jurors_name_affiliation_norm_uniq") ||
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
      await updateJuror(row);
      applyJurorPatch({
        juror_id: row.jurorId,
        juror_name: row.juror_name,
        juryName: row.juror_name,
        affiliation: row.affiliation,
        email: row.email,
      });
      const jurorName = String(row?.juror_name || "").trim();
      setMessage(jurorName ? `Juror ${jurorName} updated` : "Juror updated");
      return { ok: true };
    } catch (e) {
      setPanelError(
        "jurors",
        e?.message || "Could not update juror. Try again or check admin password."
      );
      return { ok: false, message: e?.message || "Could not update juror." };
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
    const jurorAffiliation = juror?.affiliation || juror?.affiliation;
    if (!viewPeriodId || !jurorId) {
      setPanelError("jurors", "Select a period from the header before resetting a PIN.");
      return { ok: false };
    }
    setMessage("");
    clearPanelError("jurors");
    incLoading();
    try {
      const res = await resetJurorPin({ periodId: viewPeriodId, jurorId });
      setResetPinInfo({
        ...res,
        juror_name: jurorName || res?.juror_name || null,
        affiliation: jurorAffiliation || res?.affiliation || null,
      });
      applyJurorPatch({
        juror_id: jurorId,
        locked_until: null,
        failed_attempts: 0,
        is_locked: false,
        last_seen_at: null,
      });
      const jurorDisplayName = String(jurorName || res?.juror_name || "").trim();
      const periodLabel = viewPeriodLabel || "";
      const toastJuror = jurorDisplayName || "juror";
      setMessage(
        periodLabel
          ? `PIN reset for ${toastJuror} — ${periodLabel}`
          : `PIN reset for ${toastJuror}`
      );
      return { ok: true, data: res };
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("period_inactive")) {
        setPanelError("jurors", "Only the period selected in header can be edited.");
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

  // One-shot reset that bypasses the two-step requestResetPin/confirmResetPin
  // flow — use this when the caller already has its own confirmation dialog.
  const resetPinForJuror = async (juror) => {
    if (!juror || pinResetLoading) return;
    setResetPinInfo(null);
    setPinCopied(false);
    setPinResetTarget(juror);
    setPinResetLoading(true);
    try {
      const result = await handleResetPin(juror);
      if (result?.ok) setPinCopied(false);
      return result;
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

  // ── Delete handler ────────────────────────────────────────
  const handleDeleteJuror = async (jurorId) => {
    if (!jurorId) return;
    setMessage("");
    clearPanelError("jurors");
    incLoading();
    const jurorName = getJurorNameById(jurors, jurorId);
    try {
      await deleteJuror(jurorId);
      removeJuror(jurorId);
      setMessage(jurorName ? `${jurorName} removed` : "Juror removed");
    } catch (e) {
      setPanelError("jurors", e?.message || "Could not delete juror. Try again.");
    } finally {
      decLoading();
    }
  };

  // ── Juror edit-mode handlers ──────────────────────────────
  const handleToggleJurorEdit = async ({ jurorId, enabled, reason, durationMinutes }) => {
    if (!viewPeriodId || !jurorId) return { ok: false };
    setMessage("");
    setEvalLockError?.("");
    if (!enabled) {
      setEvalLockError?.("Edit mode can only be closed by juror resubmission.");
      return { ok: false };
    }
    applyJurorPatch({
      juror_id: jurorId,
      edit_enabled: true,
      editEnabled: true,
      overviewStatus: "editing",
      final_submitted_at: null,
      finalSubmittedAt: null,
    });
    incLoading();
    try {
      await setJurorEditMode({ periodId: viewPeriodId, jurorId, enabled: true, reason, durationMinutes });
      const jurorName = getJurorNameById(jurors, jurorId);
      setMessage(
        jurorName ? `Editing unlocked for Juror ${jurorName}` : "Editing unlocked for juror"
      );
      scheduleJurorRefresh();
      return { ok: true };
    } catch (e) {
      scheduleJurorRefresh();
      const msg = String(e?.message || "");
      if (
        msg.includes("edit_mode_disable_not_allowed") ||
        msg.includes("final_submit_required")
      ) {
        setEvalLockError?.("Edit mode can only be closed by juror resubmission.");
      } else if (msg.includes("edit_window_expired")) {
        setEvalLockError?.("Editing window has expired. Re-enable editing if needed.");
      } else if (msg.includes("final_submission_required")) {
        setEvalLockError?.(
          "Juror must have a completed submission before edit mode can be enabled."
        );
      } else if (msg.includes("reason_too_short")) {
        setEvalLockError?.("Please provide a reason with at least 5 characters.");
      } else if (msg.includes("invalid_duration")) {
        setEvalLockError?.("Duration is out of allowed range. Please choose a valid value.");
      } else if (msg.includes("no_pin")) {
        setEvalLockError?.("Juror PIN is missing for this period. Reset the PIN first.");
      } else if (
        msg.includes("period_not_found") ||
        msg.includes("period_inactive")
      ) {
        setEvalLockError?.("Selected period could not be found. Refresh and try again.");
      } else if (msg.includes("period_locked")) {
        setEvalLockError?.("Evaluation lock is active. Unlock the period first.");
      } else if (msg.includes("unauthorized")) {
        setEvalLockError?.("Admin password is invalid. Please re-login.");
      } else {
        setEvalLockError?.(
          e?.message || "Could not update edit mode. Try again or check admin password."
        );
      }
      return { ok: false, message: e?.message || "Could not enable editing mode." };
    } finally {
      decLoading();
    }
  };

  const handleForceCloseJurorEdit = async ({ jurorId }) => {
    if (!viewPeriodId || !jurorId) return;
    setMessage("");
    setEvalLockError?.("");
    applyJurorPatch({
      juror_id: jurorId,
      edit_enabled: false,
      editEnabled: false,
      overviewStatus: "completed",
      final_submitted_at: new Date().toISOString(),
      finalSubmittedAt: new Date().toISOString()
    });
    incLoading();
    try {
      await forceCloseJurorEditMode(
        { periodId: viewPeriodId, jurorId }
      );
      const jurorName = getJurorNameById(jurors, jurorId);
      setMessage(
        jurorName ? `Editing locked for Juror ${jurorName}` : "Editing locked for juror"
      );
      scheduleJurorRefresh();
    } catch (e) {
      scheduleJurorRefresh();
      const msg = String(e?.message || "");
      if (msg.includes("no_pin")) {
        setEvalLockError?.("Juror PIN is missing for this period. Reset the PIN first.");
      } else if (
        msg.includes("period_not_found") ||
        msg.includes("period_inactive")
      ) {
        setEvalLockError?.("Selected period could not be found. Refresh and try again.");
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
    scoreRows,
    periodMaxScore,
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
    handleDeleteJuror,
    requestResetPin,
    confirmResetPin,
    resetPinForJuror,
    closeResetPinDialog,
    handleCopyPin,
    handleToggleJurorEdit,
    handleForceCloseJurorEdit,
  };
}
