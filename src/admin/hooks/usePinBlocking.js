// src/admin/hooks/usePinBlocking.js
// ============================================================
// Manages PIN lockout state: load locked jurors, unlock handler.
// Threshold and lock duration are policy-driven.
// ============================================================

import { useCallback, useState } from "react";
import {
  listLockedJurors,
  countTodayLockEvents,
  unlockJurorPin,
  listJurorsSummary,
} from "../../shared/api";
import { useToast } from "@/shared/hooks/useToast";

export function usePinBlocking({ periodId }) {
  const _toast = useToast();
  const [lockedJurors, setLockedJurors] = useState([]);
  const [todayLockEvents, setTodayLockEvents] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unlockModal, setUnlockModal] = useState(null); // { pin, jurorId, jurorName, affiliation, email }

  const loadLockedJurors = useCallback(async ({ silent = false } = {}) => {
    if (!periodId) {
      setLockedJurors([]);
      setTodayLockEvents(0);
      setError("");
      return;
    }
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const [rows, todayCount, summaries] = await Promise.all([
        listLockedJurors({ periodId }),
        countTodayLockEvents({ periodId }),
        listJurorsSummary(periodId),
      ]);
      const progressByJuror = new Map();
      (summaries || []).forEach((s) => {
        progressByJuror.set(String(s.jurorId), {
          totalProjects: s.totalProjects || 0,
          completedProjects: s.completedProjects || 0,
        });
      });
      const enriched = (rows || []).map((r) => {
        const p = progressByJuror.get(String(r.jurorId)) || { totalProjects: 0, completedProjects: 0 };
        return { ...r, totalProjects: p.totalProjects, completedProjects: p.completedProjects };
      });
      setLockedJurors(enriched);
      setTodayLockEvents(todayCount || 0);
      if (silent) setError("");
    } catch (e) {
      if (!silent) {
        setLockedJurors([]);
        setTodayLockEvents(0);
        setError(e?.message || "Could not load locked jurors.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [periodId]);

  const handleUnlock = useCallback(async (jurorId) => {
    if (!jurorId || !periodId) return;
    try {
      const juror = lockedJurors.find((j) => j.jurorId === jurorId);
      const result = await unlockJurorPin({ jurorId, periodId });
      setLockedJurors((prev) => prev.filter((j) => j.jurorId !== jurorId));
      setUnlockModal({
        pin: result?.pin_plain_once || "",
        jurorId,
        jurorName: juror?.jurorName || "",
        affiliation: juror?.affiliation || "",
        email: juror?.email || "",
      });
    } catch (e) {
      _toast.error(e?.message || "Could not unlock juror.");
    }
  }, [periodId, lockedJurors, _toast]);

  const handleUnlockAll = useCallback(async () => {
    if (!periodId || lockedJurors.length === 0) return;
    const toUnlock = [...lockedJurors];
    let failed = 0;
    for (const j of toUnlock) {
      try {
        await unlockJurorPin({ jurorId: j.jurorId, periodId });
        setLockedJurors((prev) => prev.filter((r) => r.jurorId !== j.jurorId));
      } catch {
        failed += 1;
      }
    }
    if (failed === 0) {
      _toast.success(`Unlocked ${toUnlock.length} juror${toUnlock.length !== 1 ? "s" : ""}`);
    } else {
      _toast.error(`Unlocked ${toUnlock.length - failed}, failed ${failed}`);
    }
  }, [periodId, lockedJurors, _toast]);

  return {
    lockedJurors,
    todayLockEvents,
    loading,
    error,
    loadLockedJurors,
    handleUnlock,
    handleUnlockAll,
    unlockModal,
    closeUnlockModal: () => setUnlockModal(null),
  };
}
