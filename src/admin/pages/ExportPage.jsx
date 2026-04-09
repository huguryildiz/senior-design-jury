// src/admin/ExportPage.jsx — Phase 9
// Export & Backup page wired to export handlers.
// Prototype: vera-premium-prototype.html lines 15621–15647

import { useCallback, useRef, useState } from "react";
import { useAdminContext } from "../hooks/useAdminContext";
import { useToast } from "@/shared/hooks/useToast";
import { useAuth } from "@/auth";
import FbAlert from "@/shared/ui/FbAlert";
import {
  listPeriods,
  listJurorsSummary,
  getScores,
  getProjectSummary,
  fullExport,
  writeAuditLog,
} from "@/shared/api";
import { exportXLSX, buildExportFilename } from "../utils/exportXLSX";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const MIN_BACKUP_DELAY = 1200;

export default function ExportPage() {
  const { organizationId, isDemoMode = false } = useAdminContext();
  const { activeOrganization } = useAuth();
  const tenantCode = activeOrganization?.code || "";
  const _toast = useToast();
  const setMessage = (msg) => { if (msg) _toast.success(msg); };

  const [dbBackupLoading, setDbBackupLoading] = useState(false);
  const [dbBackupError, setDbBackupError] = useState("");
  const [scoresLoading, setScoresLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [jurorsLoading, setJurorsLoading] = useState(false);
  const importFileRef = useRef(null);

  // ── Export helpers ────────────────────────────────────────────
  const sortSemesters = (sems) =>
    [...sems].sort((a, b) => {
      const aTs = a?.end_date ? Date.parse(a.end_date) : 0;
      const bTs = b?.end_date ? Date.parse(b.end_date) : 0;
      return bTs - aTs;
    });

  const handleExportScores = useCallback(async () => {
    if (!organizationId) return;
    setScoresLoading(true);
    try {
      const sems = (await listPeriods(organizationId)) || [];
      if (!sems.length) { _toast.error("No evaluation periods found."); return; }
      const orderedSemesters = sortSemesters(sems);
      const results = await Promise.all(
        orderedSemesters.map(async (sem) => {
          const [rows, summary] = await Promise.all([
            getScores(sem.id),
            getProjectSummary(sem.id).catch(() => []),
          ]);
          const summaryMap = new Map((summary || []).map((p) => [p.id, p]));
          const mappedRows = (rows || []).map((r) => ({
            ...r,
            period: sem?.name || sem?.period_name || "",
            students: summaryMap.get(r.projectId)?.students ?? "",
          }));
          return { rows: mappedRows, summary: summary || [] };
        }),
      );
      await exportXLSX(results.flatMap((x) => x.rows), {
        periodName: "all-periods",
        summaryData: results.flatMap((x) => x.summary),
        tenantCode,
      });
      writeAuditLog("export.backup", {
        resourceType: "score_sheets",
        details: { format: "xlsx", periodCount: orderedSemesters.length },
      }).catch(() => {});
      _toast.success(`Score report downloaded · ${orderedSemesters.length} period${orderedSemesters.length !== 1 ? "s" : ""} · Excel`);
    } catch (e) {
      _toast.error(e?.message || "Score report export failed — please try again");
    } finally {
      setScoresLoading(false);
    }
  }, [organizationId, tenantCode]);

  const handleExportProjects = useCallback(async () => {
    if (!organizationId) return;
    setProjectsLoading(true);
    try {
      const sems = (await listPeriods(organizationId)) || [];
      if (!sems.length) { _toast.error("No evaluation periods found."); return; }
      const orderedSemesters = sortSemesters(sems);
      const projectsBySemester = await Promise.all(
        orderedSemesters.map(async (sem) => {
          const { adminListProjects } = await import("../../shared/api");
          return {
            periodName: sem?.name || sem?.period_name || "",
            rows: await adminListProjects(sem.id),
          };
        }),
      );
      const XLSX = await import("xlsx-js-style");
      const headers = ["Period", "Project", "Title", "Team Members"];
      const data = projectsBySemester.flatMap(({ periodName, rows }) =>
        (rows || []).map((p) => [
          periodName,
          p?.group_no ?? "",
          p?.title ?? "",
          p?.members || "",
        ]),
      );
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      ws["!cols"] = [18, 8, 36, 42].map((w) => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Groups");
      XLSX.writeFile(wb, buildExportFilename("Projects", "all-periods", "xlsx", tenantCode));
      _toast.success(`${data.length} project${data.length !== 1 ? "s" : ""} exported · all periods · Excel`);
    } catch (e) {
      _toast.error(e?.message || "Projects export failed — please try again");
    } finally {
      setProjectsLoading(false);
    }
  }, [organizationId, tenantCode]);

  const handleExportJurors = useCallback(async () => {
    if (!organizationId) return;
    setJurorsLoading(true);
    try {
      const sems = (await listPeriods(organizationId)) || [];
      if (!sems.length) { _toast.error("No evaluation periods found."); return; }
      const orderedSemesters = sortSemesters(sems);
      const jurorsBySemester = await Promise.all(
        orderedSemesters.map(async (sem) => ({
          periodName: sem?.name || sem?.period_name || "",
          rows: await listJurorsSummary(sem.id),
        })),
      );
      const isAssignedJuror = (j) => {
        if (j?.isAssigned === true) return true;
        if (j?.is_assigned === true) return true;
        if (typeof j?.isAssigned === "string")
          return ["true", "t", "1"].includes(j.isAssigned.toLowerCase());
        if (typeof j?.is_assigned === "string")
          return ["true", "t", "1"].includes(j.is_assigned.toLowerCase());
        return false;
      };
      const XLSX = await import("xlsx-js-style");
      const headers = ["Period", "Juror Name", "Affiliation"];
      const data = jurorsBySemester.flatMap(({ periodName, rows }) => {
        const hasAssignedFlag = (rows || []).some(
          (j) =>
            (j?.isAssigned !== undefined && j?.isAssigned !== null) ||
            (j?.is_assigned !== undefined && j?.is_assigned !== null),
        );
        const exportRows = hasAssignedFlag
          ? (rows || []).filter(isAssignedJuror)
          : rows || [];
        return exportRows.map((j) => [
          periodName,
          j?.juryName || j?.juror_name || j?.jurorName || "",
          j?.affiliation || "",
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      ws["!cols"] = [18, 28, 32].map((w) => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Jurors");
      XLSX.writeFile(wb, buildExportFilename("Jurors", "all-periods", "xlsx", tenantCode));
      _toast.success(`${data.length} juror${data.length !== 1 ? "s" : ""} exported · all periods · Excel`);
    } catch (e) {
      _toast.error(e?.message || "Jurors export failed — please try again");
    } finally {
      setJurorsLoading(false);
    }
  }, [organizationId, tenantCode]);

  // ── DB backup ─────────────────────────────────────────────────
  const mapDbBackupError = (e) => {
    const msg = String(e?.message || "");
    if (msg.includes("unauthorized")) return "Unauthorized. Please re-login.";
    return null;
  };

  const handleDbExportConfirm = async () => {
    if (!organizationId) return;
    const start = Date.now();
    setDbBackupLoading(true);
    setDbBackupError("");
    try {
      const data = await fullExport(organizationId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildExportFilename("Backup", "full", "json", tenantCode);
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Database backup downloaded");
    } catch (e) {
      setDbBackupError(mapDbBackupError(e) || "Export failed. Please try again.");
    } finally {
      const remaining = Math.max(0, MIN_BACKUP_DELAY - (Date.now() - start));
      if (remaining) await new Promise((r) => setTimeout(r, remaining));
      setDbBackupLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-title">Export &amp; Backup</div>
      <div className="page-desc" style={{ marginBottom: 18 }}>
        Download evaluation data, generate reports, and create backups for compliance records.
      </div>

      {dbBackupError && (
        <FbAlert variant="danger" style={{ marginBottom: 12 }}>
          {dbBackupError}
        </FbAlert>
      )}

      <div className="grid-3">
        <div className="card" style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
          <div className="section-title">Score Report</div>
          <div className="text-sm text-muted" style={{ marginBottom: 14 }}>
            Rankings, averages, and per-juror breakdown as Excel
          </div>
          <button
            className="btn btn-outline btn-sm"
            type="button"
            onClick={handleExportScores}
            disabled={!organizationId || scoresLoading}
          >
            <span className="btn-loading-content">
              <AsyncButtonContent loading={scoresLoading} loadingText="Exporting…">Download .xlsx</AsyncButtonContent>
            </span>
          </button>
        </div>

        <div className="card" style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
          <div className="section-title">Raw Data</div>
          <div className="text-sm text-muted" style={{ marginBottom: 14 }}>
            All individual scores as CSV for custom analysis
          </div>
          <button
            className="btn btn-outline btn-sm"
            type="button"
            onClick={handleExportJurors}
            disabled={!organizationId || jurorsLoading}
          >
            <span className="btn-loading-content">
              <AsyncButtonContent loading={jurorsLoading} loadingText="Exporting…">Download .xlsx</AsyncButtonContent>
            </span>
          </button>
        </div>

        <div className="card" style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
          <div className="section-title">Projects</div>
          <div className="text-sm text-muted" style={{ marginBottom: 14 }}>
            All project titles and team members across periods as Excel
          </div>
          <button
            className="btn btn-outline btn-sm"
            type="button"
            onClick={handleExportProjects}
            disabled={!organizationId || projectsLoading}
          >
            <span className="btn-loading-content">
              <AsyncButtonContent loading={projectsLoading} loadingText="Exporting…">Download .xlsx</AsyncButtonContent>
            </span>
          </button>
        </div>

        <div className="card" style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
          <div className="section-title">Full Backup</div>
          <div className="text-sm text-muted" style={{ marginBottom: 14 }}>
            Complete evaluation period data as JSON archive
          </div>
          <button
            className="btn btn-outline btn-sm"
            type="button"
            onClick={handleDbExportConfirm}
            disabled={dbBackupLoading || !organizationId}
          >
            <span className="btn-loading-content">
              <AsyncButtonContent loading={dbBackupLoading} loadingText="Exporting…">Download .json</AsyncButtonContent>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
