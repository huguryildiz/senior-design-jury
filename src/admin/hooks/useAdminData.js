// src/admin/hooks/useAdminData.js
// ============================================================
// Manages admin data fetching and details view lazy-loading.
//
// Extracted from AdminPanel.jsx (Phase 4 — Admin Layer Decomposition).
// Phase 5: Realtime subscription extracted to useAdminRealtime.js;
// trend/analytics loading extracted to useAnalyticsData.js.
//
// sortedSemesters is returned from this hook (not AdminPanel.jsx)
// because it is derived purely from semesterList state, which lives
// here. All other derived useMemo values (groups, ranked, etc.)
// remain in AdminPanel.jsx because they are tightly coupled to the
// rendering layer and use data from multiple sources.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminGetScores,
  adminListJurors,
  adminListSemesters,
  adminProjectSummary,
} from "../../shared/api";
import { sortSemestersByPosterDateDesc } from "../../shared/semesterSort";
import { useAdminRealtime } from "./useAdminRealtime";
import { useAnalyticsData } from "./useAnalyticsData";

// ── Hook ──────────────────────────────────────────────────────

/**
 * useAdminData — data fetching and details view lazy-loading.
 *
 * Realtime subscription is delegated to useAdminRealtime.
 * Trend/analytics loading is delegated to useAnalyticsData.
 *
 * @param {object} opts
 * @param {string}   opts.tenantId                  Current tenant ID for scoping admin queries.
 * @param {string}   opts.selectedSemesterId        Controlled by AdminPanel (UI state).
 * @param {Function} opts.onSelectedSemesterChange  Setter for selectedSemesterId in AdminPanel.
 * @param {Function} [opts.onAuthError]             Called on auth failure during initial load.
 * @param {Function} [opts.onInitialLoadDone]       Called once after the first successful fetch.
 * @param {string}   opts.scoresView                Current scores view; used to gate details fetch.
 *
 * @returns {{
 *   rawScores: object[],
 *   summaryData: object[],
 *   allJurors: object[],
 *   semesterList: object[],
 *   sortedSemesters: object[],
 *   trendData: object[],
 *   trendLoading: boolean,
 *   trendError: string,
 *   trendSemesterIds: string[],
 *   setTrendSemesterIds: Function,
 *   detailsScores: object[],
 *   detailsSummary: object[],
 *   detailsLoading: boolean,
 *   loading: boolean,
 *   loadError: string,
 *   authError: string,
 *   lastRefresh: Date | null,
 *   fetchData: (forceSemesterId?: string) => Promise<void>,
 * }}
 */
export function useAdminData({
  tenantId,
  selectedSemesterId,
  onSelectedSemesterChange,
  onAuthError,
  onInitialLoadDone,
  scoresView,
}) {
  // ── Core data state ────────────────────────────────────────
  const [rawScores, setRawScores] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [allJurors, setAllJurors] = useState([]);
  const [semesterList, setSemesterList] = useState([]);

  // ── Details view state (all-semesters lazy load) ──────────
  const [detailsScores, setDetailsScores] = useState([]);
  const [detailsSummary, setDetailsSummary] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const detailsKeyRef = useRef("");

  // ── Loading / error state ──────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [loadError, setError] = useState("");
  const [authError, setAuthError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);

  // ── Refs for async closures ────────────────────────────────
  // tenantRef: always reflects the latest tenantId without re-creating
  // callbacks on every change.
  const tenantRef = useRef(tenantId);
  useEffect(() => { tenantRef.current = tenantId; }, [tenantId]);

  // selectedSemesterRef: latest selection without stale closure risk.
  const selectedSemesterRef = useRef(selectedSemesterId);
  useEffect(() => { selectedSemesterRef.current = selectedSemesterId; }, [selectedSemesterId]);

  // initialLoadFiredRef: ensures onInitialLoadDone is called exactly once.
  const initialLoadFiredRef = useRef(false);

  // bgRefresh: mutable ref holding the background-refresh callback.
  // Passed to useAdminRealtime so the subscription stays stable.
  const bgRefresh = useRef(null);

  // ── sortedSemesters ────────────────────────────────────────
  // Derived from semesterList (owned here). Returned to AdminPanel so
  // it can pass it to SemesterDropdown and the details fetch key.
  const sortedSemesters = useMemo(
    () => sortSemestersByPosterDateDesc(semesterList),
    [semesterList]
  );

  // ── fetchData ──────────────────────────────────────────────
  // Stable via useCallback; all mutable reads go through refs so the
  // dependency array only includes the stable prop callbacks.
  const fetchData = useCallback(async (forceSemesterId) => {
    setLoading(true);
    setError("");
    try {
      if (!tenantRef.current) {
        // Tenant not yet resolved (e.g. super-admin initial load).
        // Release the initial overlay; the effect re-triggers when tenant resolves.
        if (!initialLoadFiredRef.current) {
          initialLoadFiredRef.current = true;
          onInitialLoadDone?.();
        }
        return;
      }

      // Always refresh semester list (IDs change after reseed).
      // Uses the v2 tenant-scoped RPC for server-side filtering.
      let sems = await adminListSemesters(tenantRef.current);
      setSemesterList(sems);

      // Determine target semester
      const activeId = sems.find((s) => s.is_current)?.id || "";
      const selectedId = selectedSemesterRef.current;
      const selectedIsValid = !!selectedId && sems.some((s) => s.id === selectedId);
      const targetId =
        forceSemesterId ||
        (selectedIsValid ? selectedId : "") ||
        activeId ||
        sems[0]?.id;

      if (!targetId) {
        setRawScores([]);
        setSummaryData([]);
        setLoading(false);
        return;
      }
      onSelectedSemesterChange(targetId);

      // Fetch scores + summary + juror list in parallel.
      // adminListJurors is non-fatal: degrades gracefully if RPC not yet deployed.
      const [scores, summary, jurors] = await Promise.all([
        adminGetScores(targetId),
        adminProjectSummary(targetId),
        adminListJurors(targetId).catch(() => []),
      ]);

      setRawScores(scores);
      setSummaryData(summary);
      setAllJurors(jurors);
      setLastRefresh(new Date());
      setAuthError("");

      if (!initialLoadFiredRef.current) {
        initialLoadFiredRef.current = true;
        onInitialLoadDone?.();
      }
    } catch (e) {
      if (e.unauthorized) {
        if (onAuthError) { onAuthError("Invalid password"); return; }
        setAuthError("Incorrect password.");
        return;
      }
      setError("Could not load data — check your connection and try refreshing.");
      setRawScores([]);
      setSummaryData([]);
      if (!initialLoadFiredRef.current) {
        initialLoadFiredRef.current = true;
        onInitialLoadDone?.();
      }
    } finally {
      setLoading(false);
    }
  }, [onSelectedSemesterChange, onAuthError, onInitialLoadDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch data when tenant is available; re-fetch when tenant changes.
  // Super-admin: tenantId starts as "" (resolves after AuthProvider
  // processes memberships). When empty, clear loading so the UI isn't
  // stuck behind loading indicators while the tenant resolves.
  useEffect(() => {
    if (tenantId) {
      fetchData();
    } else {
      // No tenant yet — release loading indicators so the UI isn't
      // stuck. fetchData will run once tenantId becomes available.
      setLoading(false);
      if (!initialLoadFiredRef.current) {
        initialLoadFiredRef.current = true;
        onInitialLoadDone?.();
      }
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Failsafe for first paint: release the App-level initial overlay even if
  // initial network/auth requests hang and never resolve.
  useEffect(() => {
    if (!loading) return;
    if (initialLoadFiredRef.current) return;
    const t = setTimeout(() => {
      if (initialLoadFiredRef.current) return;
      initialLoadFiredRef.current = true;
      onInitialLoadDone?.();
    }, 5000);
    return () => clearTimeout(t);
  }, [loading, onInitialLoadDone]);

  // ── Background (silent) refresh ────────────────────────────
  // Assigned each render so the Realtime hook always calls the latest
  // closure without needing to rebuild the subscription.
  bgRefresh.current = async () => {
    if (!tenantRef.current) return;
    try {
      let sems = await adminListSemesters(tenantRef.current);
      setSemesterList(sems);
      const activeId = sems.find((s) => s.is_current)?.id || sems[0]?.id || "";
      const selectedId = selectedSemesterRef.current;
      const selectedIsValid = !!selectedId && sems.some((s) => s.id === selectedId);
      const semId = selectedIsValid ? selectedId : activeId;
      if (!semId) return;
      if (semId !== selectedSemesterRef.current) {
        onSelectedSemesterChange(semId);
      }
      const [scores, summary, jurors] = await Promise.all([
        adminGetScores(semId),
        adminProjectSummary(semId),
        adminListJurors(semId).catch(() => []),
      ]);
      setRawScores(scores);
      setSummaryData(summary);
      setAllJurors(jurors);
      setLastRefresh(new Date());
    } catch {
      // Silent — don't flash error on background sync
    }
  };

  // ── Realtime subscription (delegated) ─────────────────────
  useAdminRealtime({ tenantId, onRefreshRef: bgRefresh });

  // ── Details invalidation ───────────────────────────────────
  // Reset the cache key when rawScores changes so the next visit to
  // the Details view triggers a full reload.
  useEffect(() => {
    detailsKeyRef.current = "";
  }, [rawScores]);

  // ── Details fetch (lazy, triggered by scoresView === "details") ─
  const detailsKey = useMemo(
    () => sortedSemesters.map((s) => s.id).join("|"),
    [sortedSemesters]
  );

  useEffect(() => {
    if (scoresView !== "details") return;
    if (!sortedSemesters.length) return;
    if (!tenantRef.current) return;
    if (detailsKeyRef.current === detailsKey && detailsScores.length) return;
    let cancelled = false;
    setDetailsLoading(true);
    (async () => {
      try {
        const results = await Promise.all(
          sortedSemesters.map(async (sem) => {
            const [scores, summary] = await Promise.all([
              adminGetScores(sem.id),
              adminProjectSummary(sem.id).catch(() => []),
            ]);
            const summaryMap = new Map(summary.map((p) => [p.id, p]));
            const rows = scores.map((r) => ({
              ...r,
              semester: sem.semester_name || "",
              students: summaryMap.get(r.projectId)?.students ?? "",
            }));
            return { rows, summary };
          })
        );
        if (cancelled) return;
        setDetailsScores(results.flatMap((r) => r.rows));
        setDetailsSummary(results.flatMap((r) => r.summary));
        detailsKeyRef.current = detailsKey;
      } catch {
        if (!cancelled) {
          setDetailsScores([]);
          setDetailsSummary([]);
        }
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [scoresView, detailsKey, sortedSemesters, detailsScores.length, rawScores]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trend / analytics (delegated) ─────────────────────────
  const { trendData, trendLoading, trendError, trendSemesterIds, setTrendSemesterIds } =
    useAnalyticsData({ tenantId, semesterList, sortedSemesters, lastRefresh });

  return {
    rawScores,
    summaryData,
    allJurors,
    semesterList,
    sortedSemesters,
    trendData,
    trendLoading,
    trendError,
    trendSemesterIds,
    setTrendSemesterIds,
    detailsScores,
    detailsSummary,
    detailsLoading,
    loading,
    loadError,
    authError,
    lastRefresh,
    fetchData,
  };
}
