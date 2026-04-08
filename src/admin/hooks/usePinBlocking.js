// src/admin/hooks/usePinBlocking.js
// ============================================================
// Manages PIN lockout state: load locked jurors, unlock handler.
// Threshold and lock duration are policy-driven.
// ============================================================

import { useCallback, useState } from "react";
import { listLockedJurors, countTodayLockEvents, unlockJurorPin } from "../../shared/api";
import { useToast } from "@/shared/hooks/useToast";

export function usePinBlocking({ periodId }) {
  const _toast = useToast();
  const [lockedJurors, setLockedJurors] = useState([]);
  const [todayLockEvents, setTodayLockEvents] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLockedJurors = useCallback(async () => {
    if (!periodId) {
      setLockedJurors([]);
      setTodayLockEvents(0);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [rows, todayCount] = await Promise.all([
        listLockedJurors({ periodId }),
        countTodayLockEvents({ periodId }),
      ]);
      setLockedJurors(rows || []);
      setTodayLockEvents(todayCount || 0);
    } catch (e) {
      setLockedJurors([]);
      setTodayLockEvents(0);
      setError(e?.message || "Could not load locked jurors.");
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  const handleUnlock = useCallback(async (jurorId) => {
    if (!jurorId || !periodId) return;
    try {
      await unlockJurorPin({ jurorId, periodId });
      setLockedJurors((prev) => prev.filter((j) => j.jurorId !== jurorId));
      _toast.success("Juror unlocked");
    } catch (e) {
      _toast.error(e?.message || "Could not unlock juror.");
    }
  }, [periodId, _toast]);

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
  };
}
