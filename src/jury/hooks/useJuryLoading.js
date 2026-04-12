// src/jury/hooks/useJuryLoading.js
// ============================================================
// Owns period/project loading state and the abort/lock refs
// that protect in-flight requests.
//
// State:
//   loadingState         — null | { stage: "loading"|"error", message: string }
//   periods              — active period list (from listPeriods)
//   periodId             — selected period UUID
//   periodName           — selected period display name
//   criteriaConfig       — criteria_config from the selected period ([])
//   currentPeriodInfo    — result of getCurrentPeriod() (for landing page)
//   activeProjectCount   — project count in the active period (landing page)
//   progressCheck        — null | progress data for SheetsProgressDialog
//   projects             — current project list for eval step
//
// Refs:
//   loadAbortRef         — AbortController for active data-load; replaced on
//                          each new _loadPeriod or listPeriods call so
//                          stale in-flight fetches are cancelled.
//   periodSelectLockRef  — Prevents concurrent period selections (e.g. double-
//                          tap). Intentionally NOT reset on success: once the
//                          juror advances past period selection the lock is
//                          permanent for the session. Only reset on error or
//                          on resetAll().
//
// The _loadPeriod function itself lives in the orchestrator because it writes
// to state owned by multiple hooks (scoring, editState, workflow, identity).
//
// The on-mount useEffect that fetches currentPeriodInfo lives here because
// all its state is owned by this hook.
// ============================================================

import { useState, useEffect, useRef } from "react";
import { getCurrentPeriod, listProjects, listPeriodsPublic as listPeriods, verifyEntryToken } from "../../shared/api";
import { getJuryAccess, KEYS } from "../../shared/storage";
import { DEMO_MODE } from "@/shared/lib/demoMode";
import { supabase, clearPersistedSession } from "@/shared/lib/supabaseClient";
import { buildTokenPeriod, pickDemoPeriod } from "../utils/periodSelection";

const DEMO_ENTRY_TOKEN = import.meta.env.VITE_DEMO_ENTRY_TOKEN || "";

export function useJuryLoading() {
  const [loadingState, setLoadingState] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState(() => {
    try { return localStorage.getItem(KEYS.JURY_PERIOD_ID) || ""; } catch { return ""; }
  });
  const [periodName, setPeriodName] = useState(() => {
    try { return localStorage.getItem(KEYS.JURY_PERIOD_NAME) || ""; } catch { return ""; }
  });
  const [tenantAdminEmail, setTenantAdminEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [criteriaConfig, setCriteriaConfig] = useState([]);
  const [outcomeConfig, setOutcomeConfig] = useState([]);
  const [currentPeriodInfo, setCurrentPeriodInfo] = useState(null);
  const [activeProjectCount, setActiveProjectCount] = useState(null);
  const [progressCheck, setProgressCheck] = useState(null);
  const [projects, setProjects] = useState([]);

  const loadAbortRef = useRef(null);
  const periodSelectLockRef = useRef(false);

  // Fetch the active period info on mount for the landing page display.
  // This effect is independent of all other state and can safely live here.
  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();
    const run = async () => {
      try {
        // Demo mode: clear any stale admin session (from ?explore) before making
        // anon PostgREST queries. An expired Bearer token causes 401.
        // Must clear BOTH localStorage (so Supabase client can't restore it) AND
        // in-memory session to fully prevent the stale token from being sent.
        if (DEMO_MODE) {
          clearPersistedSession();
          try { await supabase.auth.signOut({ scope: "local" }); } catch (_) {}
        }

        // Demo mode: prefer the period granted by the scanned entry token.
        // Only fall back to VITE_DEMO_ENTRY_TOKEN when no granted period exists.
        if (DEMO_MODE) {
          const grantedPeriodId = getJuryAccess();
          let tokenPeriod = null;
          if (grantedPeriodId) {
            tokenPeriod = { id: grantedPeriodId };
          } else if (DEMO_ENTRY_TOKEN) {
            try {
              const tokenRes = await verifyEntryToken(DEMO_ENTRY_TOKEN);
              if (!alive) return;
              tokenPeriod = buildTokenPeriod(tokenRes);
            } catch (_) {
              // Non-fatal: fall back to active demo period list/current period query.
            }
          }

          let res = tokenPeriod;
          try {
            const allPeriods = await listPeriods(ctrl.signal);
            if (!alive) return;
            if (grantedPeriodId) {
              res = (allPeriods || []).find((p) => p.id === grantedPeriodId) || tokenPeriod;
            } else {
              res = pickDemoPeriod(allPeriods, tokenPeriod);
            }
          } catch (_) {
            // Non-fatal: listPeriods might fail due transient network/RLS.
          }

          if (!res) {
            try {
              res = await getCurrentPeriod(ctrl.signal);
            } catch (_) {
              res = null;
            }
          }

          setCurrentPeriodInfo(res || null);
          if (res?.id) {
            try {
              const projectList = await listProjects(res.id, null, ctrl.signal);
              if (!alive) return;
              setActiveProjectCount(projectList.length);
            } catch (e) {
              if (e?.name === "AbortError") return;
              if (alive) setActiveProjectCount(null);
            }
          } else {
            setActiveProjectCount(null);
          }

          // Demo mode always resolves from demo queries and should not hit prod path.
          return;
        }

        const grantedPeriodId = getJuryAccess();
        let res = null;
        if (grantedPeriodId) {
          // Entry token grants access to a specific period — fetch with organizations join.
          const allPeriods = await listPeriods(ctrl.signal);
          res = (allPeriods || []).find((p) => p.id === grantedPeriodId) || null;
        }
        if (!res) {
          // No entry token (or period not in list) — fall back to is_current period.
          res = await getCurrentPeriod(ctrl.signal);
        }
        if (!alive) return;
        setCurrentPeriodInfo(res || null);
        if (res?.id) {
          try {
            const projectList = await listProjects(res.id, null, ctrl.signal);
            if (!alive) return;
            setActiveProjectCount(projectList.length);
          } catch (e) {
            if (e?.name === "AbortError") return;
            if (alive) setActiveProjectCount(null);
          }
        } else {
          setActiveProjectCount(null);
        }
      } catch (e) {
        if (e?.name === "AbortError") return;
        if (alive) setActiveProjectCount(null);
      }
    };
    run();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, []);

  return {
    loadingState, setLoadingState,
    periods, setPeriods,
    periodId, setPeriodId,
    periodName, setPeriodName,
    tenantAdminEmail, setTenantAdminEmail,
    orgName, setOrgName,
    criteriaConfig, setCriteriaConfig,
    outcomeConfig, setOutcomeConfig,
    currentPeriodInfo,
    activeProjectCount, setActiveProjectCount,
    progressCheck, setProgressCheck,
    projects, setProjects,
    loadAbortRef,
    periodSelectLockRef,
  };
}
