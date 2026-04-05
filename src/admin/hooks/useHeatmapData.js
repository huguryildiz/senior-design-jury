// src/admin/useHeatmapData.js
// ── Data preparation for HeatmapPage ────────────────────────
// Thin React wrapper around pure selectors in ./selectors/gridSelectors.
// All computation logic lives in the selectors; this hook only wires
// useMemo / useCallback and provides the stable return shape.

import { useMemo, useCallback } from "react";
import { getJurorWorkflowState } from "../utils/scoreHelpers";
import {
  buildLookup,
  buildJurorFinalMap,
  buildExportRowsData,
} from "../selectors/gridSelectors";

export function useHeatmapData({ data, jurors, groups, criteriaConfig }) {
  const activeCriteria = criteriaConfig || [];

  const lookup = useMemo(
    () => buildLookup(data, activeCriteria),
    [data, activeCriteria] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const jurorFinalMap = useMemo(
    () => buildJurorFinalMap(jurors),
    [jurors]
  );

  const jurorWorkflowMap = useMemo(() => {
    const map = new Map();
    (jurors || []).forEach((j) => {
      map.set(j.key, getJurorWorkflowState(j, groups || [], lookup, jurorFinalMap, activeCriteria));
    });
    return map;
  }, [jurors, groups, lookup, jurorFinalMap]);

  const buildExportRows = useCallback(
    (jurorList) => buildExportRowsData(jurorList, groups, lookup, jurorFinalMap, jurorWorkflowMap, activeCriteria),
    [groups, lookup, jurorFinalMap, jurorWorkflowMap, activeCriteria]
  );

  return {
    lookup,
    jurorWorkflowMap,
    buildExportRows,
  };
}
