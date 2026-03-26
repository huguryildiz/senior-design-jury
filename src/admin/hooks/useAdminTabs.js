// src/admin/hooks/useAdminTabs.js
// ============================================================
// Manages admin panel tab navigation state, URL sync, localStorage
// persistence, and tab bar overflow hints.
//
// Extracted from AdminPanel.jsx (Phase 4 — Admin Layer Decomposition).
// Phase 5: scoresView sub-navigation extracted to useResultsViewState.js.
//
// AdminPanel.jsx retains: TABS / EVALUATION_VIEWS render constants,
// settingsDirtyRef creation, and the inline click handler that guards
// against unsaved Settings changes.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { readSection } from "../persist";
import {
  useResultsViewState,
  VALID_EVALUATION_VIEWS,
  normalizeScoresView,
} from "./useResultsViewState";

// ── Tab normalizers ────────────────────────────────────────────

const VALID_TABS = new Set(["overview", "scores", "settings"]);

const normalizeTab = (value) => {
  if (value === "results" || value === "analysis") return "scores";
  if (value === "manage") return "settings";
  if (value === "evaluations") return "scores";
  if (VALID_TABS.has(value)) return value;
  return "overview";
};

// ── Hook ──────────────────────────────────────────────────────

/**
 * useAdminTabs — tab navigation, URL sync, and tab bar overflow.
 *
 * @param {object} opts
 * @param {React.MutableRefObject<boolean>} opts.settingsDirtyRef
 *   Ref owned by AdminPanel; the hook reads it in the setAdminTab
 *   guard so that AdminPanel's JSX click handler can use the same
 *   ref without passing it back through state.
 *
 * @returns {{
 *   adminTab: string,
 *   setAdminTab: (tab: string) => void,
 *   scoresView: string,
 *   switchScoresView: (view: string) => void,
 *   semesterOpen: boolean,
 *   setSemesterOpen: Function,
 *   scoreMenuOpen: boolean,
 *   setScoreMenuOpen: Function,
 *   tabOverflow: boolean,
 *   tabHintLeft: boolean,
 *   tabHintRight: boolean,
 *   tabBarRef: React.RefObject<HTMLDivElement>,
 *   updateTabHints: () => void,
 * }}
 */
export function useAdminTabs({ settingsDirtyRef, isDemoMode = false }) {
  // ── Tab state ────────────────────────────────────────────
  const [adminTab, setAdminTabRaw] = useState(() => {
    const sp = new URLSearchParams(window.location.search);
    const urlTab = sp.get("tab");
    if (urlTab) return normalizeTab(urlTab);
    if (isDemoMode) return "overview";
    const saved = readSection("tab");
    const savedTab = saved.adminTab || saved.activeTab;
    const normalized = normalizeTab(savedTab);
    return VALID_TABS.has(normalized) ? normalized : "overview";
  });

  // ── Scores sub-view (delegated) ──────────────────────────
  const { scoresView, setScoresViewRaw, switchScoresView } = useResultsViewState();

  // Dropdown open/close state
  const [semesterOpen, setSemesterOpen] = useState(false);
  const [scoreMenuOpen, setScoreMenuOpen] = useState(false);

  // Tab overflow scroll hints
  const [tabOverflow, setTabOverflow] = useState(false);
  const [tabHintLeft, setTabHintLeft] = useState(false);
  const [tabHintRight, setTabHintRight] = useState(false);
  const tabBarRef = useRef(null);

  // Tracks whether we've pushed the initial URL entry (use replaceState first)
  const hasInitialUrlPush = useRef(false);

  // ── setAdminTab — guards against leaving dirty Settings ───
  const setAdminTab = (tab) => {
    if (adminTab === "settings" && settingsDirtyRef?.current) {
      if (!window.confirm("You have unsaved changes. Leave anyway?")) return;
    }
    setAdminTabRaw(tab);
  };

  // ── URL sync: read on mount ────────────────────────────────
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const tabParam = sp.get("tab");
    const viewParam = sp.get("view");
    if (tabParam) {
      const normalized = normalizeTab(tabParam);
      if (VALID_TABS.has(normalized)) setAdminTabRaw(normalized);
    }
    if (viewParam) {
      const normalized = normalizeScoresView(viewParam);
      if (VALID_EVALUATION_VIEWS.has(normalized)) setScoresViewRaw(normalized);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── URL sync: push on tab/view change ─────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentTab = params.get("tab");
    const currentView = params.get("view");

    const normalizedCurrentView = currentTab === "scores" ? (currentView || "rankings") : null;
    const normalizedTargetView = adminTab === "scores" ? (scoresView || "rankings") : null;

    if (currentTab !== adminTab || normalizedCurrentView !== normalizedTargetView) {
      const nextParams = new URLSearchParams();
      nextParams.set("tab", adminTab);
      if (adminTab === "scores") nextParams.set("view", scoresView || "rankings");
      const method = hasInitialUrlPush.current ? "pushState" : "replaceState";
      window.history[method](null, "", "?" + nextParams.toString());
      hasInitialUrlPush.current = true;
    }
  }, [adminTab, scoresView]);

  // ── URL sync: handle browser back/forward ─────────────────
  useEffect(() => {
    function handlePopState() {
      const sp = new URLSearchParams(window.location.search);
      const tab = sp.get("tab");
      const view = sp.get("view");
      if (tab && VALID_TABS.has(normalizeTab(tab))) setAdminTabRaw(normalizeTab(tab));
      if (view && VALID_EVALUATION_VIEWS.has(normalizeScoresView(view))) setScoresViewRaw(normalizeScoresView(view));
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dropdown mutual exclusion ──────────────────────────────
  useEffect(() => {
    if (semesterOpen) setScoreMenuOpen(false);
  }, [semesterOpen]);

  useEffect(() => {
    if (scoreMenuOpen) setSemesterOpen(false);
  }, [scoreMenuOpen]);

  // ── Tab bar overflow scroll hints ──────────────────────────
  const updateTabHints = () => {
    const el = tabBarRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const hasOverflow = maxScroll > 2;
    setTabOverflow(hasOverflow);
    if (!hasOverflow) { setTabHintLeft(false); setTabHintRight(false); return; }
    setTabHintLeft(el.scrollLeft > 4);
    setTabHintRight(el.scrollLeft < maxScroll - 4);
  };

  useEffect(() => {
    updateTabHints();
    window.addEventListener("resize", updateTabHints);
    return () => window.removeEventListener("resize", updateTabHints);
  }, [adminTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Orientation-change reflow ──────────────────────────────
  useEffect(() => {
    let rafId1 = null;
    let rafId2 = null;
    const handleOrientation = () => {
      rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(() => {
          window.dispatchEvent(new Event("resize"));
        });
      });
    };
    window.addEventListener("orientationchange", handleOrientation);
    return () => {
      window.removeEventListener("orientationchange", handleOrientation);
      if (rafId1 !== null) cancelAnimationFrame(rafId1);
      if (rafId2 !== null) cancelAnimationFrame(rafId2);
    };
  }, []);

  return {
    adminTab,
    setAdminTab,
    scoresView,
    switchScoresView,
    semesterOpen,
    setSemesterOpen,
    scoreMenuOpen,
    setScoreMenuOpen,
    tabOverflow,
    tabHintLeft,
    tabHintRight,
    tabBarRef,
    updateTabHints,
  };
}
