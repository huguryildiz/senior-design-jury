// src/jury/utils/periodSelection.js
// ============================================================
// Shared period selection helpers used by jury loading/session
// flows to avoid duplicated and drifting period-picking logic.
// ============================================================

export function buildTokenPeriod(tokenResult) {
  if (!tokenResult?.period_id) return null;
  return {
    id: tokenResult.period_id,
    name: tokenResult.period_name || "",
    is_current: tokenResult.is_current ?? true,
    is_locked: tokenResult.is_locked ?? false,
  };
}

export function isEvaluablePeriod(period) {
  return !!period?.is_current && !period?.is_locked;
}

export function listEvaluablePeriods(periods = []) {
  return (periods || []).filter(isEvaluablePeriod);
}

export function pickDemoPeriod(periods = [], tokenPeriod = null) {
  const all = periods || [];
  if (tokenPeriod?.id) {
    const fromList = all.find((p) => p.id === tokenPeriod.id);
    return fromList ? { ...tokenPeriod, ...fromList } : tokenPeriod;
  }
  return listEvaluablePeriods(all)[0] || all[0] || null;
}
