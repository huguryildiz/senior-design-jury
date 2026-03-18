// src/admin/hooks/useResultsViewState.js
// ============================================================
// Manages the scores sub-view selection (rankings / analytics /
// grid / details) with localStorage persistence.
//
// Extracted from useAdminTabs.js (Phase 5 — Final Decomposition).
// ============================================================

import { useState } from "react";
import { readSection, writeSection } from "../persist";

export const VALID_EVALUATION_VIEWS = new Set(["rankings", "analytics", "grid", "details"]);

export const normalizeScoresView = (value) => {
  if (value === "table") return "details";
  if (value === "matrix") return "grid";
  if (value === "analysis") return "analytics";
  if (VALID_EVALUATION_VIEWS.has(value)) return value;
  return "";
};

/**
 * useResultsViewState — scores sub-view selection state.
 *
 * @returns {{
 *   scoresView: string,
 *   setScoresViewRaw: Function,
 *   switchScoresView: (view: string) => void,
 * }}
 */
export function useResultsViewState() {
  const [scoresView, setScoresViewRaw] = useState(() => {
    const saved = readSection("scores");
    const legacy = readSection("evaluations");
    const legacyOld = readSection("results");
    const savedView = saved.view || legacy.view || legacyOld.view;
    const normalized = normalizeScoresView(savedView);
    return VALID_EVALUATION_VIEWS.has(normalized) ? normalized : "rankings";
  });

  function switchScoresView(id) {
    setScoresViewRaw(id);
    writeSection("scores", { view: id });
  }

  return { scoresView, setScoresViewRaw, switchScoresView };
}
