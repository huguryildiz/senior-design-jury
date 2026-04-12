// src/admin/useGridExport.js
// ── Export workflow for HeatmapPage ──────────────────────────

import { useCallback } from "react";
import { exportGridXLSX } from "../utils/exportXLSX";
import { downloadTable } from "../utils/downloadTable";
import { logExportInitiated } from "@/shared/api";
import { useAuth } from "@/auth";

export function useGridExport({ buildExportRows, groups, periodName, visibleJurors, lookup, activeCriteria = [] }) {
  const { activeOrganization } = useAuth();
  const tenantCode = activeOrganization?.code || "";
  const orgName = activeOrganization?.name || "";
  const deptName = activeOrganization?.institution || "";
  const organizationId = activeOrganization?.id || null;

  // Build per-criterion rows (one tab per criterion showing that criterion's score)
  function buildCriterionTabs(jurorList) {
    return activeCriteria.map((c) => ({
      id: c.id,
      label: `${c.shortLabel || c.label || c.id} (${c.max})`,
      rows: (jurorList || []).map((juror) => {
        const scores = {};
        (groups || []).forEach((g) => {
          const entry = lookup?.[juror.key]?.[g.id];
          const val = entry?.[c.id];
          scores[g.id] = val !== null && val !== undefined ? val : null;
        });
        return { name: juror.name, dept: juror.dept ?? "", scores };
      }),
    }));
  }

  const requestExport = useCallback(async (format = "xlsx") => {
    const exportRows = buildExportRows(visibleJurors);
    const criterionTabs = buildCriterionTabs(visibleJurors);

    // Blocking pre-export audit — if this fails the export is aborted so
    // there is no "user downloaded a file but we can't prove it" window.
    await logExportInitiated({
      action: "export.heatmap",
      organizationId,
      resourceType: "score_sheets",
      details: {
        format,
        jurorCount: exportRows.length,
        projectCount: groups.length,
        periodName: periodName ?? null,
      },
    });

    if (format === "xlsx") {
      void exportGridXLSX(exportRows, groups, { periodName, tenantCode, criterionTabs });
      return;
    }

    const groupHeaders = groups.map((g) => g.group_no != null ? `P${g.group_no}` : (g.title || g.id));

    if (format === "csv") {
      // Long-format (unpivoted): one row per juror × project × criterion
      const header = ["Juror", "Affiliation", "Project", "Criterion", "Max", "Score"];
      const rows = [];
      exportRows.forEach((r) => {
        groups.forEach((g, gi) => {
          const projLabel = groupHeaders[gi];
          activeCriteria.forEach((c) => {
            const entry = lookup?.[visibleJurors.find((j) => j.name === r.name && (j.dept ?? "") === (r.dept ?? ""))?.key]?.[g.id];
            const val = entry?.[c.id];
            rows.push([
              r.name,
              r.dept ?? "",
              projLabel,
              c.shortLabel || c.label || c.id,
              c.max,
              val !== null && val !== undefined ? val : "",
            ]);
          });
        });
      });
      await downloadTable("csv", {
        filenameType: "Heatmap",
        sheetName: "Heatmap",
        periodName,
        tenantCode,
        header,
        rows,
        colWidths: [28, 28, 14, 16, 8, 8],
      });
    } else {
      // PDF: section-based (All Criteria page + per-criterion pages)
      const header = ["Juror", "Affiliation", "Status", ...groupHeaders];
      const rows = exportRows.map((r) => [
        r.name,
        r.dept ?? "",
        r.statusLabel,
        ...groups.map((g) => {
          const v = r.scores[g.id];
          return v !== null && v !== undefined ? v : "";
        }),
      ]);
      const extraSections = criterionTabs.map((tab) => ({
        title: tab.label,
        header: ["Juror", "Affiliation", ...groupHeaders],
        rows: tab.rows.map((r) => [
          r.name,
          r.dept ?? "",
          ...groups.map((g) => {
            const v = r.scores[g.id];
            return v !== null && v !== undefined ? v : "";
          }),
        ]),
      }));
      await downloadTable("pdf", {
        filenameType: "Heatmap",
        sheetName: "All Criteria",
        periodName,
        tenantCode,
        organization: orgName,
        department: deptName,
        pdfTitle: "VERA — Heatmap",
        pdfSubtitle: `${periodName || "All Periods"} · ${exportRows.length} jurors · ${groups.length} projects`,
        header,
        rows,
        colWidths: [28, 28, 18, ...groups.map(() => 10)],
        extraSections,
      });
    }
  }, [buildExportRows, visibleJurors, groups, periodName, tenantCode, orgName, deptName, lookup, activeCriteria, organizationId]);

  return {
    requestExport,
  };
}
