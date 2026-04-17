import { useCallback } from "react";
import { exportOutcomesXLSX } from "../utils/exportXLSX";
import { downloadTable, generateTableBlob } from "../utils/downloadTable";
import { logExportInitiated } from "@/shared/api";
import { useAuth } from "@/auth";

const COLUMNS = [
  { label: "Code",            width: 10 },
  { label: "Outcome",         width: 30 },
  { label: "Mapped Criteria", width: 40 },
  { label: "Coverage",        width: 12 },
];

function mappedCriteriaText(outcomeId, criteria, mappings) {
  return (mappings || [])
    .filter((m) => m.period_outcome_id === outcomeId)
    .map((m) => {
      const c = (criteria || []).find((cr) => cr.id === m.period_criterion_id);
      const type = m.coverage_type === "direct" ? "Direct" : "Indirect";
      return c ? `${c.label} (${type})` : "";
    })
    .filter(Boolean)
    .join(", ");
}

function getOutcomesRows(outcomes, criteria, mappings) {
  return (outcomes || []).map((o) => {
    const om           = (mappings || []).filter((m) => m.period_outcome_id === o.id);
    const directCount  = om.filter((m) => m.coverage_type === "direct").length;
    const indirectCount = om.filter((m) => m.coverage_type === "indirect").length;
    const coverage     = directCount > 0 ? "Direct" : indirectCount > 0 ? "Indirect" : "Unmapped";
    return [o.code || "", o.label || "", mappedCriteriaText(o.id, criteria, mappings), coverage];
  });
}

export function useOutcomesExport({ outcomes, criteria, mappings, periodName }) {
  const { activeOrganization } = useAuth();
  const tenantCode    = activeOrganization?.code        || "";
  const orgName       = activeOrganization?.name        || "";
  const deptName      = activeOrganization?.institution || "";
  const organizationId = activeOrganization?.id         || null;

  const generateFile = useCallback(
    async (fmt) =>
      generateTableBlob(fmt, {
        filenameType: "Outcomes",
        sheetName:    "Outcomes",
        periodName,
        tenantCode,
        organization: orgName,
        department:   deptName,
        pdfTitle:     "VERA — Outcomes & Mapping",
        header:       COLUMNS.map((c) => c.label),
        rows:         getOutcomesRows(outcomes, criteria, mappings),
        colWidths:    COLUMNS.map((c) => c.width),
      }),
    [outcomes, criteria, mappings, periodName, tenantCode, orgName, deptName]
  );

  const handleExport = useCallback(
    async (fmt) => {
      await logExportInitiated({
        action:         "export.outcomes",
        organizationId,
        resourceType:   "outcomes",
        details: {
          format:          fmt,
          row_count:       (outcomes || []).length,
          period_name:     periodName || null,
          filters:         { outcome_count: (outcomes || []).length },
        },
      });
      if (fmt === "xlsx") {
        await exportOutcomesXLSX(outcomes || [], criteria || [], mappings || [], { periodName, tenantCode });
        return;
      }
      await downloadTable(fmt, {
        filenameType: "Outcomes",
        sheetName:    "Outcomes",
        periodName,
        tenantCode,
        organization: orgName,
        department:   deptName,
        pdfTitle:     "VERA — Outcomes & Mapping",
        header:       COLUMNS.map((c) => c.label),
        rows:         getOutcomesRows(outcomes, criteria, mappings),
        colWidths:    COLUMNS.map((c) => c.width),
      });
    },
    [outcomes, criteria, mappings, periodName, tenantCode, orgName, deptName, organizationId]
  );

  return { generateFile, handleExport };
}
