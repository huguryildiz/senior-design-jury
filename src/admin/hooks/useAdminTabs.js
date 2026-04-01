// src/admin/hooks/useAdminTabs.js
// ============================================================
// Manages admin panel navigation state, URL sync, and
// localStorage persistence.
//
// Phase 2B: Extended with new sidebar pages (jurors, projects,
// semesters, entry-control, audit-log, export). The old 3-tab
// system is preserved as a subset.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { readSection } from "../persist";
import {
  useResultsViewState,
  VALID_EVALUATION_VIEWS,
  normalizeScoresView,
} from "./useResultsViewState";

// ── Tab normalizers ────────────────────────────────────────────

const VALID_TABS = new Set([
  "overview",
  "scores",
  "settings",
  // Phase 2B — decomposed from Settings
  "jurors",
  "projects",
  "semesters",
  "entry-control",
  "audit-log",
  "export",
  // Phase 11 — extracted from Settings
  "criteria",
  "outcomes",
]);

// Tabs that have editable forms — dirty guard applies
const DIRTY_TABS = new Set(["settings", "jurors", "projects", "semesters", "criteria", "outcomes"]);

const normalizeTab = (value) => {
  if (value === "results" || value === "analysis") return "scores";
  if (value === "manage") return "settings";
  if (value === "evaluations") return "scores";
  if (VALID_TABS.has(value)) return value;
  return "overview";
};

// ── Hook ──────────────────────────────────────────────────────

/**
 * useAdminTabs — sidebar navigation, URL sync, localStorage persistence.
 *
 * @param {object} opts
 * @param {React.MutableRefObject<boolean>} opts.settingsDirtyRef
 * @param {boolean} [opts.isDemoMode]
 *
 * @returns {{
 *   adminTab: string,
 *   setAdminTab: (tab: string) => void,
 *   scoresView: string,
 *   switchScoresView: (view: string) => void,
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

  // Tracks whether we've pushed the initial URL entry (use replaceState first)
  const hasInitialUrlPush = useRef(false);

  // ── setAdminTab — guards against leaving dirty pages ─────
  const setAdminTab = (tab) => {
    if (DIRTY_TABS.has(adminTab) && settingsDirtyRef?.current) {
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

  return {
    adminTab,
    setAdminTab,
    scoresView,
    switchScoresView,
  };
}
