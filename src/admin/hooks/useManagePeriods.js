// src/admin/hooks/useManagePeriods.js
// ============================================================
// Manages period CRUD state, eval-lock state, and derived
// period selection values.
//
// Extracted from useSettingsCrud.js (Phase 6 — Settings
// CRUD Decomposition).
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  listPeriods,
  setCurrentPeriod,
  createPeriod,
  updatePeriod,
  savePeriodCriteria,
  deletePeriod,
  setEvalLock,
  listPeriodCriteria,
  listPeriodOutcomes,
} from "../../shared/api";
import { getActiveCriteria } from "../../shared/criteria/criteriaHelpers";
import { sortPeriodsByStartDateDesc } from "../../shared/periodSort";
import {
  APP_DATE_MIN_DATE,
  APP_DATE_MAX_DATE,
  isIsoDateWithinBounds,
} from "../../shared/dateBounds";

const defaultSettings = { evalLockActive: false };

const PERIOD_MIN_DATE = APP_DATE_MIN_DATE;
const PERIOD_MAX_DATE = APP_DATE_MAX_DATE;

const isPeriodPosterDateInRange = (value) =>
  isIsoDateWithinBounds(value, { minDate: PERIOD_MIN_DATE, maxDate: PERIOD_MAX_DATE });

/**
 * useManagePeriods — period CRUD, eval-lock, and derived period selection.
 *
 * @param {object} opts
 * @param {string}   opts.organizationId
 * @param {string}   opts.selectedPeriodId     Controlled by AdminPanel (current view period).
 * @param {Function} opts.setMessage             Toast setter from SettingsPage.
 * @param {Function} opts.setLoading             Loading setter from SettingsPage.
 * @param {Function} opts.onCurrentPeriodChange Called when the current period changes.
 * @param {Function} opts.setPanelError          (panel, msg) → sets a panel-level error.
 * @param {Function} opts.clearPanelError        (panel) → clears a panel-level error.
 */
export function useManagePeriods({
  organizationId,
  selectedPeriodId,
  setMessage,
  incLoading,
  decLoading,
  onCurrentPeriodChange,
  setPanelError,
  clearPanelError,
}) {
  const [periodList, setPeriodList] = useState([]);
  const [currentPeriodId, setCurrentPeriodId] = useState("");
  const [settings, setSettings] = useState(defaultSettings);

  // In-flight guard for handleSetCurrentPeriod (Fix 3)
  const setCurrentInFlightRef = useRef(false);

  // Tracks the ID of a period that was updated externally via Realtime while edit modal is open
  const [externalUpdatedPeriodId, setExternalUpdatedPeriodId] = useState(null);

  // Tracks the ID of a period that was deleted externally via Realtime while edit modal is open
  const [externalDeletedPeriodId, setExternalDeletedPeriodId] = useState(null);

  // Eval-lock dialog state (owned here because it is driven by period state)
  const [evalLockError, setEvalLockError] = useState("");
  const [evalLockConfirmOpen, setEvalLockConfirmOpen] = useState(false);
  const [evalLockConfirmNext, setEvalLockConfirmNext] = useState(false);
  const [evalLockConfirmLoading, setEvalLockConfirmLoading] = useState(false);

  // ── Derived period values ──────────────────────────────
  const currentPeriod = useMemo(
    () => periodList.find((s) => s.id === currentPeriodId) || null,
    [periodList, currentPeriodId]
  );
  const currentPeriodLabel = currentPeriod?.name || "—";

  const viewPeriodId = useMemo(() => {
    if (selectedPeriodId && periodList.some((s) => s.id === selectedPeriodId))
      return selectedPeriodId;
    return currentPeriodId || "";
  }, [selectedPeriodId, periodList, currentPeriodId]);

  const viewPeriod = useMemo(
    () => periodList.find((s) => s.id === viewPeriodId) || null,
    [periodList, viewPeriodId]
  );
  const viewPeriodLabel = viewPeriod?.name || "—";

  // ── Period criteria & outcomes (from DB snapshot tables) ──
  const [criteriaConfig, setCriteriaConfig] = useState([]);
  const [outcomeConfig, setOutcomeConfig] = useState([]);

  useEffect(() => {
    if (!viewPeriodId) {
      setCriteriaConfig([]);
      setOutcomeConfig([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const [criteriaRows, outcomeRows] = await Promise.all([
          listPeriodCriteria(viewPeriodId),
          listPeriodOutcomes(viewPeriodId),
        ]);
        if (!alive) return;
        setCriteriaConfig(getActiveCriteria(criteriaRows));
        setOutcomeConfig(outcomeRows.map((o) => ({
          id: o.id,
          code: o.code,
          desc_en: o.label || o.description || "",
          desc_tr: o.description || "",
        })));
      } catch {
        if (alive) {
          setCriteriaConfig([]);
          setOutcomeConfig([]);
        }
      }
    })();
    return () => { alive = false; };
  }, [viewPeriodId]);

  // ── Sync settings when viewPeriod changes ──────────────
  useEffect(() => {
    setSettings({ evalLockActive: Boolean(viewPeriod?.is_locked) });
  }, [viewPeriod?.id, viewPeriod?.is_locked]);

  // ── Patch / remove helpers ───────────────────────────────
  const applyPeriodPatch = useCallback((patch) => {
    if (!patch?.id) return;
    setPeriodList((prev) => {
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
      return sortPeriodsByStartDateDesc(next);
    });
  }, []);

  const removePeriod = useCallback((deletedId) => {
    if (!deletedId) return;
    setPeriodList((prev) => {
      const next = prev.filter((s) => s.id !== deletedId);
      setCurrentPeriodId((cur) => {
        if (cur !== deletedId) return cur;
        const active = next.find((s) => s.is_current) || next[0];
        return active?.id || "";
      });
      return next;
    });
  }, []);

  // ── Load functions ───────────────────────────────────────
  const loadPeriods = useCallback(async () => {
    if (!organizationId) {
      setPeriodList([]);
      setCurrentPeriodId("");
      return [];
    }
    const periods = await listPeriods(organizationId);
    setPeriodList(periods);
    const active = periods.find((s) => s.is_current) || periods[0];
    setCurrentPeriodId(active?.id || "");
    return periods;
  }, [organizationId]);

  const refreshPeriods = useCallback(async () => {
    if (!organizationId) return;
    const periods = await listPeriods(organizationId);
    setPeriodList(periods);
    if (!currentPeriodId || !periods.some((s) => s.id === currentPeriodId)) {
      const active = periods.find((s) => s.is_current) || periods[0];
      setCurrentPeriodId(active?.id || "");
    }
  }, [organizationId, currentPeriodId]);

  // ── Period CRUD handlers ───────────────────────────────
  const handleSetCurrentPeriod = async (periodId) => {
    if (setCurrentInFlightRef.current) return { ok: false };
    setMessage("");
    clearPanelError("period");
    if (!organizationId) {
      setPanelError("period", "Organization context missing. Please re-login.");
      return { ok: false };
    }
    setCurrentInFlightRef.current = true;
    incLoading();
    try {
      const nextPeriodName = periodList.find((s) => s.id === periodId)?.name || "";
      const updatedPeriod = await setCurrentPeriod(periodId, organizationId);
      setPeriodList((prev) => prev.map((s) => {
        if (s.id === periodId) return { ...s, ...updatedPeriod, is_current: true };
        return { ...s, is_current: false };
      }));
      setCurrentPeriodId(periodId);
      onCurrentPeriodChange?.(periodId);
      setMessage(nextPeriodName ? `Current period set to ${nextPeriodName}.` : "Current period set.");
      return { ok: true };
    } catch (e) {
      setPanelError("period", e?.message || "Could not update current period. Try again or re-login.");
      return { ok: false };
    } finally {
      decLoading();
      setCurrentInFlightRef.current = false;
    }
  };

  const handleCreatePeriod = async (payload) => {
    setMessage("");
    clearPanelError("period");
    if (!organizationId) {
      setPanelError("period", "Organization context missing. Please re-login.");
      return { ok: false };
    }
    incLoading();
    try {
      const created = await createPeriod({ ...payload, organizationId });
      if (created?.id) {
        applyPeriodPatch(created);
      } else {
        applyPeriodPatch({
          id: `temp-${Date.now()}`,
          name: payload.name,
          is_current: false,
        });
        // Reconcile the temp entry with the real server state
        refreshPeriods();
      }
      const periodName = String(payload?.name || created?.name || "").trim();
      setMessage(periodName ? `Period ${periodName} created` : "Period created");
      return { ok: true, id: created?.id || null };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (
        msg.includes("period_name_exists") ||
        msgLower.includes("periods_name_ci_unique") || msgLower.includes("periods_organization_name_ci_unique") ||
        msgLower.includes("duplicate key value violates unique constraint")
      ) {
        return { ok: false, fieldErrors: { name: "Period name already exists." } };
      } else if (msg.includes("period_name_required")) {
        return { ok: false, fieldErrors: { name: "Period name is required." } };
      } else {
        setPanelError("period", msg || "Could not create period. Try again or check your session.");
        return { ok: false };
      }
    } finally {
      decLoading();
    }
  };

  const handleUpdatePeriod = async (payload) => {
    setMessage("");
    clearPanelError("period");
    if (!organizationId) {
      setPanelError("period", "Organization context missing. Please re-login.");
      return { ok: false };
    }
    incLoading();
    try {
      await updatePeriod(payload);
      applyPeriodPatch({
        id: payload.id,
        name: payload.name,
        description: payload.description,
        start_date: payload.start_date,
        end_date: payload.end_date,
        is_locked: payload.is_locked,
        is_visible: payload.is_visible,
        ...(payload.criteria_config !== undefined ? { criteria_config: payload.criteria_config } : {}),
        ...(payload.outcome_config !== undefined ? { outcome_config: payload.outcome_config } : {}),
      });
      const periodName = String(payload?.name || "").trim();
      setMessage(periodName ? `Period ${periodName} updated` : "Period updated");
      return { ok: true };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      if (
        msg.includes("period_name_exists") ||
        msgLower.includes("periods_name_ci_unique") || msgLower.includes("periods_organization_name_ci_unique") ||
        msgLower.includes("duplicate key value violates unique constraint")
      ) {
        return { ok: false, fieldErrors: { name: "Period name already exists." } };
      } else if (msg.includes("period_name_required")) {
        return { ok: false, fieldErrors: { name: "Period name is required." } };
      } else {
        setPanelError("period", msg || "Could not update period. Try again or check your session.");
        return { ok: false };
      }
    } finally {
      decLoading();
    }
  };

  // ── Criteria config update ──────────────────────────────────────────
  // Product rule: once scoring has started (is_locked), the config is fully
  // immutable. Reject updates here before the RPC to ensure the UI lock can't
  // be bypassed through browser devtools.
  const handleUpdateCriteriaConfig = async (periodId, config) => {
    clearPanelError("period");
    if (!organizationId) {
      setPanelError("period", "Organization context missing. Please re-login.");
      return { ok: false };
    }
    const period = periodList.find((s) => s.id === periodId);
    if (period?.is_locked) {
      return {
        ok: false,
        error: "This period's evaluation config is locked because scoring has already started.",
      };
    }
    incLoading();
    try {
      await savePeriodCriteria(periodId, config);
      // Re-fetch from DB to get canonical normalized shape
      const criteriaRows = await listPeriodCriteria(periodId);
      setCriteriaConfig(getActiveCriteria(criteriaRows));
      setMessage("Evaluation criteria updated.");
      return { ok: true };
    } catch (e) {
      const msg = String(e?.message || "");
      setPanelError("period", msg || "Could not update criteria config. Try again or check your session.");
      return { ok: false, error: msg };
    } finally {
      decLoading();
    }
  };

  // ── Outcome config update ─────────────────────────────────────────────
  // Same is_locked guard as handleUpdateCriteriaConfig above.
  const handleUpdateOutcomeConfig = async (periodId, config) => {
    clearPanelError("period");
    if (!organizationId) {
      setPanelError("period", "Organization context missing. Please re-login.");
      return { ok: false };
    }
    const period = periodList.find((s) => s.id === periodId);
    if (period?.is_locked) {
      return {
        ok: false,
        error: "This period's evaluation config is locked because scoring has already started.",
      };
    }
    incLoading();
    try {
      await updatePeriodOutcomeConfig(periodId, config);
      applyPeriodPatch({ id: periodId, outcome_config: config });
      setMessage("Outcome mappings updated.");
      return { ok: true };
    } catch (e) {
      const msg = String(e?.message || "");
      setPanelError("period", msg || "Could not update outcome config. Try again or check your session.");
      return { ok: false, error: msg };
    } finally {
      decLoading();
    }
  };

  const handleDeletePeriod = async (periodId) => {
    if (!periodId) return;
    setMessage("");
    clearPanelError("period");
    incLoading();
    const periodToDelete = periodList.find((p) => p.id === periodId);
    const deletedPeriodName = String(periodToDelete?.name || "").trim();
    try {
      await deletePeriod(periodId);
      removePeriod(periodId);
      setMessage(deletedPeriodName ? `Period "${deletedPeriodName}" deleted` : "Period deleted");
    } catch (e) {
      setPanelError("period", e?.message || "Could not delete period. Try again.");
    } finally {
      decLoading();
    }
  };

  // ── Eval-lock handler ────────────────────────────────────
  const handleSaveSettings = async (next) => {
    if (!organizationId) {
      setEvalLockError("Organization context missing. Please re-login.");
      return;
    }
    if (!viewPeriodId) {
      setEvalLockError("Select a period from the header before changing lock settings.");
      return;
    }
    incLoading();
    setMessage("");
    setEvalLockError("");
    try {
      await setEvalLock(viewPeriodId, !!next.evalLockActive);
      applyPeriodPatch({ id: viewPeriodId, is_locked: !!next.evalLockActive });
      setSettings(next);
      const periodContext =
        viewPeriodLabel && viewPeriodLabel !== "—" ? viewPeriodLabel : "the selected";
      setMessage(
        next.evalLockActive
          ? `Scoring for ${periodContext} period is now closed.`
          : `Scoring for ${periodContext} period is now open.`
      );
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("period_not_found") || msg.includes("period_inactive")) {
        setEvalLockError("Selected period could not be found. Refresh and try again.");
      } else if (msg.includes("unauthorized")) {
        setEvalLockError("Session is invalid. Please re-login.");
      } else {
        setEvalLockError(e?.message || "Could not save settings. Try again or check your session.");
      }
    } finally {
      decLoading();
    }
  };

  return {
    periodList,
    currentPeriodId,
    settings,
    evalLockError,
    setEvalLockError,
    evalLockConfirmOpen,
    setEvalLockConfirmOpen,
    evalLockConfirmNext,
    setEvalLockConfirmNext,
    evalLockConfirmLoading,
    setEvalLockConfirmLoading,
    currentPeriod,
    currentPeriodLabel,
    viewPeriodId,
    viewPeriod,
    viewPeriodLabel,
    criteriaConfig,
    outcomeConfig,
    applyPeriodPatch,
    removePeriod,
    loadPeriods,
    refreshPeriods,
    handleSetCurrentPeriod,
    handleCreatePeriod,
    handleUpdatePeriod,
    handleUpdateCriteriaConfig,
    handleUpdateOutcomeConfig,
    handleDeletePeriod,
    updateCriteriaTemplate: handleUpdateCriteriaConfig,
    updateMudekTemplate: handleUpdateOutcomeConfig,
    handleSaveSettings,
    externalUpdatedPeriodId,
    notifyExternalPeriodUpdate: (id) => setExternalUpdatedPeriodId(id),
    externalDeletedPeriodId,
    notifyExternalPeriodDelete: (id) => setExternalDeletedPeriodId(id),
  };
}
