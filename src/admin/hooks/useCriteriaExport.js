import { useCallback } from "react";
import { exportCriteriaXLSX } from "../utils/exportXLSX";
import { downloadTable, generateTableBlob } from "../utils/downloadTable";
import { logExportInitiated } from "@/shared/api";
import { useAuth } from "@/auth";

const COLUMNS = [
  { label: "#",            width: 6  },
  { label: "Criterion",    width: 28 },
  { label: "Weight",       width: 10 },
  { label: "Rubric Bands", width: 36 },
  { label: "Mapping",      width: 24 },
];

function rubricBandsText(criterion) {
  const bands = [...(criterion.rubric || [])].sort((a, b) => (b.min ?? 0) - (a.min ?? 0));
  if (!bands.length) return "";
  return bands
    .map((b) => `${b.label || b.level || ""} (${b.min ?? ""}–${b.max ?? ""})`)
    .join(", ");
}

function mappingText(criterion) {
  return (criterion.outcomes || [])
    .map((code) => {
      const type = criterion.outcomeTypes?.[code] === "indirect" ? "Indirect" : "Direct";
      return `${code} (${type})`;
    })
    .join(", ");
}

function getCriteriaRows(criteria) {
  return (criteria || []).map((c, i) => [
    i + 1,
    c.label || "",
    c.max ?? "",
    rubricBandsText(c),
    mappingText(c),
  ]);
}

export function useCriteriaExport({ criteria, periodName }) {
  const { activeOrganization } = useAuth();
  const tenantCode    = activeOrganization?.code        || "";
  const orgName       = activeOrganization?.name        || "";
  const deptName      = activeOrganization?.institution || "";
  const organizationId = activeOrganization?.id         || null;

  const generateFile = useCallback(
    async (fmt) =>
      generateTableBlob(fmt, {
        filenameType: "Criteria",
        sheetName:    "Criteria",
        periodName,
        tenantCode,
        organization: orgName,
        department:   deptName,
        pdfTitle:     "VERA — Evaluation Criteria",
        header:       COLUMNS.map((c) => c.label),
        rows:         getCriteriaRows(criteria),
        colWidths:    COLUMNS.map((c) => c.width),
      }),
    [criteria, periodName, tenantCode, orgName, deptName]
  );

  const handleExport = useCallback(
    async (fmt) => {
      await logExportInitiated({
        action:         "export.criteria",
        organizationId,
        resourceType:   "criteria",
        details: {
          format:          fmt,
          row_count:       (criteria || []).length,
          period_name:     periodName || null,
          filters:         { criterion_count: (criteria || []).length },
        },
      });
      if (fmt === "xlsx") {
        await exportCriteriaXLSX(criteria || [], { periodName, tenantCode });
        return;
      }
      await downloadTable(fmt, {
        filenameType: "Criteria",
        sheetName:    "Criteria",
        periodName,
        tenantCode,
        organization: orgName,
        department:   deptName,
        pdfTitle:     "VERA — Evaluation Criteria",
        header:       COLUMNS.map((c) => c.label),
        rows:         getCriteriaRows(criteria),
        colWidths:    COLUMNS.map((c) => c.width),
      });
    },
    [criteria, periodName, tenantCode, orgName, deptName, organizationId]
  );

  return { generateFile, handleExport };
}
