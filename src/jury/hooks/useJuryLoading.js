// src/jury/hooks/useJuryLoading.js
// ============================================================
// Owns semester/project loading state and the abort/lock refs
// that protect in-flight requests.
//
// State:
//   loadingState         — null | { stage: "loading"|"error", message: string }
//   semesters            — active semester list (from listSemesters)
//   semesterId           — selected semester UUID
//   semesterName         — selected semester display name
//   activeSemesterInfo   — result of getActiveSemester() (for landing page)
//   activeProjectCount   — project count in the active semester (landing page)
//   progressCheck        — null | progress data for SheetsProgressDialog
//   projects             — current project list for eval step
//
// Refs:
//   loadAbortRef          — AbortController for active data-load; replaced on
//                           each new _loadSemester or listSemesters call so
//                           stale in-flight fetches are cancelled.
//   semesterSelectLockRef — Prevents concurrent semester selections (e.g. double-
//                           tap). Intentionally NOT reset on success: once the
//                           juror advances past semester selection the lock is
//                           permanent for the session. Only reset on error or
//                           on resetAll().
//
// The _loadSemester function itself lives in the orchestrator because it writes
// to state owned by multiple hooks (scoring, editState, workflow, identity).
//
// The on-mount useEffect that fetches activeSemesterInfo lives here because
// all its state is owned by this hook.
// ============================================================

import { useState, useEffect, useRef } from "react";
import { getActiveSemester, listProjects } from "../../shared/api";

export function useJuryLoading() {
  const [loadingState, setLoadingState] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [semesterId, setSemesterId] = useState("");
  const [semesterName, setSemesterName] = useState("");
  const [activeSemesterInfo, setActiveSemesterInfo] = useState(null);
  const [activeProjectCount, setActiveProjectCount] = useState(null);
  const [progressCheck, setProgressCheck] = useState(null);
  const [projects, setProjects] = useState([]);

  const loadAbortRef = useRef(null);
  const semesterSelectLockRef = useRef(false);

  // Fetch the active semester info on mount for the landing page display.
  // This effect is independent of all other state and can safely live here.
  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();
    const run = async () => {
      try {
        const res = await getActiveSemester(ctrl.signal);
        if (!alive) return;
        setActiveSemesterInfo(res || null);
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
    semesters, setSemesters,
    semesterId, setSemesterId,
    semesterName, setSemesterName,
    activeSemesterInfo,
    activeProjectCount, setActiveProjectCount,
    progressCheck, setProgressCheck,
    projects, setProjects,
    loadAbortRef,
    semesterSelectLockRef,
  };
}
