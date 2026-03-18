// src/admin/useGridExport.js
// ── Export workflow for ScoreGrid ────────────────────────────

import { useCallback } from "react";
import { exportGridXLSX } from "./xlsx/exportXLSX";

export function useGridExport({ buildExportRows, groups, semesterName, visibleJurors }) {
  const doExport = useCallback((jurorList) => {
    const exportRows = buildExportRows(jurorList);
    void exportGridXLSX(exportRows, groups, { semesterName });
  }, [buildExportRows, groups, semesterName]);

  const requestExport = useCallback(() => {
    doExport(visibleJurors);
  }, [visibleJurors, doExport]);

  return {
    requestExport,
  };
}
