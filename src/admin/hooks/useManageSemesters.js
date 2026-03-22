// src/admin/hooks/useManageSemesters.js
// ============================================================
// Manages semester CRUD state, eval-lock state, and derived
// semester selection values.
//
// Extracted from useSettingsCrud.js (Phase 6 — Settings
// CRUD Decomposition).
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  listSemesters,
  adminSetActiveSemester,
  adminCreateSemester,
  adminUpdateSemester,
  adminUpdateSemesterCriteriaTemplate,
  adminUpdateSemesterMudekTemplate,
  adminSetSemesterEvalLock,
} from "../../shared/api";
import { sortSemestersByPosterDateDesc } from "../../shared/semesterSort";
import {
  APP_DATE_MIN_DATE,
  APP_DATE_MAX_DATE,
  isIsoDateWithinBounds,
} from "../../shared/dateBounds";

const defaultSettings = { evalLockActive: false };

const SEMESTER_MIN_DATE = APP_DATE_MIN_DATE;
const SEMESTER_MAX_DATE = APP_DATE_MAX_DATE;

const isSemesterPosterDateInRange = (value) =>
  isIsoDateWithinBounds(value, { minDate: SEMESTER_MIN_DATE, maxDate: SEMESTER_MAX_DATE });

/**
 * useManageSemesters — semester CRUD, eval-lock, and derived semester selection.
 *
 * @param {object} opts
 * @param {string}   opts.adminPass
 * @param {string}   opts.selectedSemesterId     Controlled by AdminPanel (current view semester).
 * @param {Function} opts.setMessage             Toast setter from SettingsPage.
 * @param {Function} opts.setLoading             Loading setter from SettingsPage.
 * @param {Function} opts.onActiveSemesterChange Called when the active semester changes.
 * @param {Function} opts.setPanelError          (panel, msg) → sets a panel-level error.
 * @param {Function} opts.clearPanelError        (panel) → clears a panel-level error.
 */
export function useManageSemesters({
  adminPass,
  selectedSemesterId,
  setMessage,
  incLoading,
  decLoading,
  onActiveSemesterChange,
  setPanelError,
  clearPanelError,
}) {
  const [semesterList, setSemesterList] = useState([]);
  const [activeSemesterId, setActiveSemesterId] = useState("");
  const [settings, setSettings] = useState(defaultSettings);

  // In-flight guard for handleSetActiveSemester (Fix 3)
  const setActiveInFlightRef = useRef(false);

  // Tracks the ID of a semester that was updated externally via Realtime while edit modal is open
  const [externalUpdatedSemesterId, setExternalUpdatedSemesterId] = useState(null);

  // Eval-lock dialog state (owned here because it is driven by semester state)
  const [evalLockError, setEvalLockError] = useState("");
  const [evalLockConfirmOpen, setEvalLockConfirmOpen] = useState(false);
  const [evalLockConfirmNext, setEvalLockConfirmNext] = useState(false);
  const [evalLockConfirmLoading, setEvalLockConfirmLoading] = useState(false);

  // ── Derived semester values ──────────────────────────────
  const activeSemester = useMemo(
    () => semesterList.find((s) => s.id === activeSemesterId) || null,
    [semesterList, activeSemesterId]
  );
  const activeSemesterLabel = activeSemester?.name || "—";

  const viewSemesterId = useMemo(() => {
    if (selectedSemesterId && semesterList.some((s) => s.id === selectedSemesterId))
      return selectedSemesterId;
    return activeSemesterId || "";
  }, [selectedSemesterId, semesterList, activeSemesterId]);

  const viewSemester = useMemo(
    () => semesterList.find((s) => s.id === viewSemesterId) || null,
    [semesterList, viewSemesterId]
  );
  const viewSemesterLabel = viewSemester?.name || "—";

  // ── Sync settings when viewSemester changes ──────────────
  useEffect(() => {
    setSettings({ evalLockActive: Boolean(viewSemester?.is_locked) });
  }, [viewSemester?.id, viewSemester?.is_locked]);

  // ── Patch / remove helpers ───────────────────────────────
  const applySemesterPatch = useCallback((patch) => {
    if (!patch?.id) return;
    setSemesterList((prev) => {
      const next = [...prev];
      const idx = next.findIndex((s) => s.id === patch.id);
      if (idx >= 0) {
        next[idx] = {
          ...next[idx],
          ...patch,
          updated_at: patch.updated_at || next[idx].updated_at || new Date().toISOString(),
        };
      } else {
        next.push({ ...patch, updated_at: patch.updated_at || new Date().toISOString() });
      }
      return sortSemestersByPosterDateDesc(next);
    });
  }, []);

  const removeSemester = useCallback((deletedId) => {
    if (!deletedId) return;
    setSemesterList((prev) => {
      const next = prev.filter((s) => s.id !== deletedId);
      setActiveSemesterId((cur) => {
        if (cur !== deletedId) return cur;
        const active = next.find((s) => s.is_active) || next[0];
        return active?.id || "";
      });
      return next;
    });
  }, []);

  // ── Load functions ───────────────────────────────────────
  const loadSemesters = useCallback(async () => {
    let sems = await listSemesters();
    if (!sems.length) {
      await new Promise((r) => setTimeout(r, 600));
      sems = await listSemesters();
    }
    setSemesterList(sems);
    const active = sems.find((s) => s.is_active) || sems[0];
    setActiveSemesterId(active?.id || "");
  }, []);

  const refreshSemesters = useCallback(async () => {
    const sems = await listSemesters();
    setSemesterList(sems);
    if (!activeSemesterId || !sems.some((s) => s.id === activeSemesterId)) {
      const active = sems.find((s) => s.is_active) || sems[0];
      setActiveSemesterId(active?.id || "");
    }
  }, [activeSemesterId]);

  // ── Semester CRUD handlers ───────────────────────────────
  const handleSetActiveSemester = async (semesterId) => {
    if (setActiveInFlightRef.current) return { ok: false };
    setMessage("");
    clearPanelError("semester");
    if (!adminPass) {
      setPanelError("semester", "Admin password missing. Please re-login.");
      return { ok: false };
    }
    setActiveInFlightRef.current = true;
    incLoading();
    try {
      const nextSemesterName = semesterList.find((s) => s.id === semesterId)?.name || "";
      await adminSetActiveSemester(semesterId, adminPass);
      setSemesterList((prev) => prev.map((s) => ({ ...s, is_active: s.id === semesterId })));
      setActiveSemesterId(semesterId);
      onActiveSemesterChange?.(semesterId);
      setMessage(nextSemesterName ? `Current semester set to ${nextSemesterName}.` : "Current semester set.");
      return { ok: true };
    } catch (e) {
      setPanelError("semester", e?.message || "Could not update active semester. Try again or re-login.");
      return { ok: false };
    } finally {
      decLoading();
      setActiveInFlightRef.current = false;
    }
  };

  const handleCreateSemester = async (payload) => {
    setMessage("");
    clearPanelError("semester");
    if (!adminPass) {
      setPanelError("semester", "Admin password missing. Please re-login.");
      return { ok: false };
    }
    if (!isSemesterPosterDateInRange(payload?.poster_date)) {
      return { ok: false, fieldErrors: { poster_date: `Poster date must be between ${SEMESTER_MIN_DATE} and ${SEMESTER_MAX_DATE}.` } };
    }
    incLoading();
    try {
      const created = await adminCreateSemester(payload, adminPass);
      if (created?.id) {
        applySemesterPatch(created);
      } else {
        applySemesterPatch({
          id: `temp-${Date.now()}`,
          name: payload.name,
          poster_date: payload.poster_date,
          is_active: false,
        });
        // Reconcile the temp entry with the real server state
        refreshSemesters();
      }
      const semesterName = String(payload?.name || created?.name || "").trim();
      setMessage(semesterName ? `Semester ${semesterName} created` : "Semester created");
      return { ok: true };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (
        msg.includes("semester_name_exists") ||
        msgLower.includes("semesters_name_ci_unique") ||
        msgLower.includes("duplicate key value violates unique constraint")
      ) {
        return { ok: false, fieldErrors: { name: "Semester name already exists." } };
      } else if (msg.includes("semester_name_required")) {
        return { ok: false, fieldErrors: { name: "Semester name is required." } };
      } else {
        setPanelError("semester", msg || "Could not create semester. Try again or check admin password.");
        return { ok: false };
      }
    } finally {
      decLoading();
    }
  };

  const handleUpdateSemester = async (payload) => {
    setMessage("");
    clearPanelError("semester");
    if (!adminPass) {
      setPanelError("semester", "Admin password missing. Please re-login.");
      return { ok: false };
    }
    if (!isSemesterPosterDateInRange(payload?.poster_date)) {
      return { ok: false, fieldErrors: { poster_date: `Poster date must be between ${SEMESTER_MIN_DATE} and ${SEMESTER_MAX_DATE}.` } };
    }
    incLoading();
    try {
      await adminUpdateSemester(payload, adminPass);
      applySemesterPatch({
        id: payload.id,
        name: payload.name,
        poster_date: payload.poster_date,
        ...(payload.criteria_template !== undefined ? { criteria_template: payload.criteria_template } : {}),
        ...(payload.mudek_template !== undefined ? { mudek_template: payload.mudek_template } : {}),
      });
      const semesterName = String(payload?.name || "").trim();
      setMessage(semesterName ? `Semester ${semesterName} updated` : "Semester updated");
      return { ok: true };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (
        msg.includes("semester_name_exists") ||
        msgLower.includes("semesters_name_ci_unique") ||
        msgLower.includes("duplicate key value violates unique constraint")
      ) {
        return { ok: false, fieldErrors: { name: "Semester name already exists." } };
      } else if (msg.includes("semester_name_required")) {
        return { ok: false, fieldErrors: { name: "Semester name is required." } };
      } else {
        setPanelError("semester", msg || "Could not update semester. Try again or check admin password.");
        return { ok: false };
      }
    } finally {
      decLoading();
    }
  };

  // ── Criteria template update ─────────────────────────────
  const handleUpdateCriteriaTemplate = async (semesterId, name, posterDate, template) => {
    clearPanelError("semester");
    if (!adminPass) {
      setPanelError("semester", "Admin password missing. Please re-login.");
      return { ok: false };
    }
    incLoading();
    try {
      await adminUpdateSemesterCriteriaTemplate(semesterId, name, posterDate, template, adminPass);
      applySemesterPatch({ id: semesterId, criteria_template: template });
      setMessage("Evaluation criteria updated.");
      return { ok: true };
    } catch (e) {
      const msg = String(e?.message || "");
      setPanelError("semester", msg || "Could not update criteria template. Try again or check admin password.");
      return { ok: false, error: msg };
    } finally {
      decLoading();
    }
  };

  // ── MÜDEK template update ────────────────────────────────
  const handleUpdateMudekTemplate = async (semesterId, name, posterDate, template) => {
    clearPanelError("semester");
    if (!adminPass) {
      setPanelError("semester", "Admin password missing. Please re-login.");
      return { ok: false };
    }
    incLoading();
    try {
      await adminUpdateSemesterMudekTemplate(semesterId, name, posterDate, template, adminPass);
      applySemesterPatch({ id: semesterId, mudek_template: template });
      setMessage("MÜDEK Outcomes updated.");
      return { ok: true };
    } catch (e) {
      const msg = String(e?.message || "");
      setPanelError("semester", msg || "Could not update MÜDEK template. Try again or check admin password.");
      return { ok: false, error: msg };
    } finally {
      decLoading();
    }
  };

  // ── Eval-lock handler ────────────────────────────────────
  const handleSaveSettings = async (next) => {
    if (!adminPass) {
      setEvalLockError("Admin password missing. Please re-login.");
      return;
    }
    if (!viewSemesterId) {
      setEvalLockError("Select a semester from the header before changing lock settings.");
      return;
    }
    incLoading();
    setMessage("");
    setEvalLockError("");
    try {
      await adminSetSemesterEvalLock(viewSemesterId, !!next.evalLockActive, adminPass);
      applySemesterPatch({ id: viewSemesterId, is_locked: !!next.evalLockActive });
      setSettings(next);
      const semesterContext =
        viewSemesterLabel && viewSemesterLabel !== "—" ? viewSemesterLabel : "the selected";
      setMessage(
        next.evalLockActive
          ? `Scoring for ${semesterContext} semester is now closed.`
          : `Scoring for ${semesterContext} semester is now open.`
      );
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("semester_not_found") || msg.includes("semester_inactive")) {
        setEvalLockError("Selected semester could not be found. Refresh and try again.");
      } else if (msg.includes("unauthorized")) {
        setEvalLockError("Admin password is invalid. Please re-login.");
      } else {
        setEvalLockError(e?.message || "Could not save settings. Try again or check admin password.");
      }
    } finally {
      decLoading();
    }
  };

  return {
    semesterList,
    activeSemesterId,
    settings,
    evalLockError,
    setEvalLockError,
    evalLockConfirmOpen,
    setEvalLockConfirmOpen,
    evalLockConfirmNext,
    setEvalLockConfirmNext,
    evalLockConfirmLoading,
    setEvalLockConfirmLoading,
    activeSemester,
    activeSemesterLabel,
    viewSemesterId,
    viewSemester,
    viewSemesterLabel,
    applySemesterPatch,
    removeSemester,
    loadSemesters,
    refreshSemesters,
    handleSetActiveSemester,
    handleCreateSemester,
    handleUpdateSemester,
    handleUpdateCriteriaTemplate,
    handleUpdateMudekTemplate,
    handleSaveSettings,
    externalUpdatedSemesterId,
    notifyExternalSemesterUpdate: (id) => setExternalUpdatedSemesterId(id),
  };
}
