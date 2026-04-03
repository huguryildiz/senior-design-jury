// src/admin/useGridExport.js
// ── Export workflow for HeatmapPage ──────────────────────────

import { useCallback } from "react";
import { exportGridXLSX } from "./xlsx/exportXLSX";
import { useAuth } from "@/auth";

export function useGridExport({ buildExportRows, groups, periodName, visibleJurors }) {
  const { activeOrganization } = useAuth();
  const tenantCode = activeOrganization?.code || "";
  const doExport = useCallback((jurorList) => {
    const exportRows = buildExportRows(jurorList);
    void exportGridXLSX(exportRows, groups, { periodName, tenantCode });
  }, [buildExportRows, groups, periodName, tenantCode]);

  const requestExport = useCallback(() => {
    doExport(visibleJurors);
  }, [visibleJurors, doExport]);

  return {
    requestExport,
  };
}
