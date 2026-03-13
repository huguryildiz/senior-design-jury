// src/admin/useScoreGridData.js
// ── Data preparation for ScoreGrid ───────────────────────────
// Encapsulates lookup building, workflow maps, averages, and export rows.

import { useMemo, useCallback } from "react";
import { rowKey } from "./utils";
import { CRITERIA } from "../config";
import { getCellState, getPartialTotal, getJurorWorkflowState, jurorStatusMeta } from "./scoreHelpers";

export function useScoreGridData({ data, jurors, groups }) {
  // Build lookup: jurorKey → { [projectId]: entry }
  // Field list driven by CRITERIA — stays in sync with config.js automatically.
  const lookup = useMemo(() => {
    const map = {};
    (data || []).forEach((r) => {
      const key = rowKey(r);
      if (!map[key]) map[key] = {};
      map[key][r.projectId] = {
        total:            r.total,
        status:           r.status,
        editingFlag:      r.editingFlag,
        finalSubmittedAt: r.finalSubmittedAt || "",
        ...Object.fromEntries(CRITERIA.map((c) => [c.id, r[c.id]])),
      };
    });
    return map;
  }, [data]);

  // Juror final-status map
  const jurorFinalMap = useMemo(
    () => new Map((jurors || []).map((j) => [j.key, Boolean(j.finalSubmitted || j.finalSubmittedAt)])),
    [jurors]
  );

  // Juror workflow state map (computed once per render)
  const jurorWorkflowMap = useMemo(() => {
    const map = new Map();
    const safeGroups = groups || [];
    (jurors || []).forEach((j) => {
      map.set(j.key, getJurorWorkflowState(j, safeGroups, lookup, jurorFinalMap));
    });
    return map;
  }, [jurors, groups, lookup, jurorFinalMap]);

  // Completed = finalSubmitted AND not currently in edit mode
  const completedJurors = useMemo(
    () => (jurors || []).filter((j) => (j.finalSubmitted || j.finalSubmittedAt) && !j.editEnabled),
    [jurors]
  );

  // Average row: completed jurors only, fully scored cells only
  const groupAverages = useMemo(() =>
    (groups || []).map((g) => {
      const vals = completedJurors
        .map((j) => {
          const entry = lookup[j.key]?.[g.id];
          return getCellState(entry) === "scored" ? Number(entry.total) : null;
        })
        .filter((v) => Number.isFinite(v));
      return vals.length
        ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
        : null;
    }),
  [completedJurors, groups, lookup]);

  // Export row builder (kept here to avoid UI component owning data logic)
  const buildExportRows = useCallback((jurorList) => {
    const safeGroups = groups || [];
    return (jurorList || []).map((juror) => {
      const wfState     = jurorWorkflowMap.get(juror.key) ?? getJurorWorkflowState(juror, safeGroups, lookup, jurorFinalMap);
      const statusLabel = jurorStatusMeta[wfState]?.label ?? wfState;
      const scores      = {};
      safeGroups.forEach((g) => {
        const entry = lookup[juror.key]?.[g.id] ?? null;
        const state = getCellState(entry);
        scores[g.id] =
          state === "scored"  ? Number(entry.total) :
          state === "partial" ? getPartialTotal(entry) :
          null;
      });
      return { name: juror.name, dept: juror.dept ?? "", statusLabel, scores };
    });
  }, [groups, lookup, jurorFinalMap, jurorWorkflowMap]);

  return {
    lookup,
    jurorFinalMap,
    jurorWorkflowMap,
    groupAverages,
    buildExportRows,
  };
}
