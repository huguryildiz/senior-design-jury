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
  adminProjectSummary,
  listSemesters,
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
 * @param {string}   opts.adminPass                 Current resolved admin password string.
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
  adminPass,
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
  // passRef: always reflects the latest adminPass without re-creating
  // callbacks on every password change.
  const passRef = useRef(adminPass);
  useEffect(() => { passRef.current = adminPass; }, [adminPass]);
  const getAdminPass = () => passRef.current || "";

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
      const pass = getAdminPass();
      if (!pass) {
        setRawScores([]);
        setSummaryData([]);
        setAuthError("Enter the admin password to load scores.");
        return;
      }

      // Always refresh semester list (IDs change after reseed)
      const sems = await listSemesters();
      setSemesterList(sems);

      // Determine target semester
      const activeId = sems.find((s) => s.is_active)?.id || "";
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
        adminGetScores(targetId, pass),
        adminProjectSummary(targetId, pass),
        adminListJurors(targetId, pass).catch(() => []),
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
      if (onAuthError) { onAuthError("Connection error — try again."); return; }
      setError("Could not load data: " + e.message);
      setRawScores([]);
      setSummaryData([]);
    } finally {
      setLoading(false);
    }
  }, [onSelectedSemesterChange, onAuthError, onInitialLoadDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch on mount
  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Background (silent) refresh ────────────────────────────
  // Assigned each render so the Realtime hook always calls the latest
  // closure without needing to rebuild the subscription.
  bgRefresh.current = async () => {
    const pass = getAdminPass();
    if (!pass) return;
    try {
      const sems = await listSemesters();
      setSemesterList(sems);
      const activeId = sems.find((s) => s.is_active)?.id || sems[0]?.id || "";
      const selectedId = selectedSemesterRef.current;
      const selectedIsValid = !!selectedId && sems.some((s) => s.id === selectedId);
      const semId = selectedIsValid ? selectedId : activeId;
      if (!semId) return;
      if (semId !== selectedSemesterRef.current) {
        onSelectedSemesterChange(semId);
      }
      const [scores, summary, jurors] = await Promise.all([
        adminGetScores(semId, pass),
        adminProjectSummary(semId, pass),
        adminListJurors(semId, pass).catch(() => []),
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
  useAdminRealtime({ adminPass, onRefreshRef: bgRefresh });

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
    const pass = getAdminPass();
    if (!pass) return;
    if (detailsKeyRef.current === detailsKey && detailsScores.length) return;
    let cancelled = false;
    setDetailsLoading(true);
    (async () => {
      try {
        const results = await Promise.all(
          sortedSemesters.map(async (sem) => {
            const [scores, summary] = await Promise.all([
              adminGetScores(sem.id, pass),
              adminProjectSummary(sem.id, pass).catch(() => []),
            ]);
            const summaryMap = new Map(summary.map((p) => [p.id, p]));
            const rows = scores.map((r) => ({
              ...r,
              semester: sem.name || "",
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
    useAnalyticsData({ adminPass, semesterList, sortedSemesters, lastRefresh });

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
