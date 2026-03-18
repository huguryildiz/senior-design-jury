// src/admin/hooks/useAnalyticsData.js
// ============================================================
// Manages trend / analytics data for the admin panel.
//
// Extracted from useAdminData.js (Phase 5 — Final Decomposition).
//
// Owns: trendSemesterIds selection (with localStorage persistence),
// stale-ID cleanup when semesterList changes, and the trend fetch.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { adminGetOutcomeTrends } from "../../shared/api";
import { readSection, writeSection } from "../persist";

/**
 * useAnalyticsData — trend/analytics loading for the admin panel.
 *
 * @param {object} opts
 * @param {string}    opts.adminPass        Current resolved admin password.
 * @param {object[]}  opts.semesterList     Full semester list (for stale-ID cleanup).
 * @param {object[]}  opts.sortedSemesters  Sorted semesters (for initial seed).
 * @param {Date|null} opts.lastRefresh      Bumped by useAdminData after a fresh fetch;
 *                                          causes the trend to re-fetch with latest data.
 *
 * @returns {{
 *   trendData: object[],
 *   trendLoading: boolean,
 *   trendError: string,
 *   trendSemesterIds: string[],
 *   setTrendSemesterIds: Function,
 * }}
 */
export function useAnalyticsData({ adminPass, semesterList, sortedSemesters, lastRefresh }) {
  const [trendSemesterIds, setTrendSemesterIds] = useState(() => {
    const s = readSection("trend");
    return Array.isArray(s.semesterIds) ? s.semesterIds : [];
  });
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState("");

  // Ensures trendSemesterIds is seeded from sortedSemesters exactly once.
  const trendInitRef = useRef(false);

  // ── Trend initialization ──────────────────────────────────
  // Seed from sortedSemesters once (if not already set by localStorage).
  useEffect(() => {
    if (trendInitRef.current) return;
    if (!sortedSemesters.length) return;
    setTrendSemesterIds((prev) => (
      prev.length ? prev : sortedSemesters.map((s) => s.id)
    ));
    trendInitRef.current = true;
  }, [sortedSemesters]);

  // Persist trend selection to localStorage.
  useEffect(() => {
    writeSection("trend", { semesterIds: trendSemesterIds });
  }, [trendSemesterIds]);

  // Remove stale semester IDs when semesterList changes.
  useEffect(() => {
    if (!trendSemesterIds.length) return;
    const valid = new Set(semesterList.map((s) => s.id));
    const filtered = trendSemesterIds.filter((id) => valid.has(id));
    if (filtered.length !== trendSemesterIds.length) {
      setTrendSemesterIds(filtered);
    }
  }, [semesterList, trendSemesterIds]);

  // ── Trend fetch ────────────────────────────────────────────
  useEffect(() => {
    if (!adminPass) {
      setTrendData([]);
      setTrendError("");
      return;
    }
    if (!trendSemesterIds.length) {
      setTrendData([]);
      setTrendError("");
      return;
    }
    let cancelled = false;
    setTrendLoading(true);
    setTrendError("");
    adminGetOutcomeTrends(trendSemesterIds, adminPass)
      .then((data) => {
        if (cancelled) return;
        setTrendData(data);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e?.unauthorized) {
          setTrendError("Incorrect password.");
          return;
        }
        setTrendError("Could not load trend data.");
      })
      .finally(() => {
        if (cancelled) return;
        setTrendLoading(false);
      });
    return () => { cancelled = true; };
  }, [trendSemesterIds, adminPass, lastRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  return { trendData, trendLoading, trendError, trendSemesterIds, setTrendSemesterIds };
}
