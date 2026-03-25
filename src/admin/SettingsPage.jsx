// src/admin/SettingsPage.jsx
// ============================================================
// Admin settings page: semesters, projects, jurors, permissions.
// Thin orchestrator — state and handlers live in hooks.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../components/toast/useToast";
import {
  adminListSemesters,
  adminListJurors,
  adminGetScores,
  adminProjectSummary,
  adminSecurityState,
  adminFullExport,
  adminFullImport,
} from "../shared/api";
import PinResetDialog from "./settings/PinResetDialog";
import EvalLockConfirmDialog from "./settings/EvalLockConfirmDialog";
import AuditLogCard from "./settings/AuditLogCard";
import ExportBackupPanel from "./settings/ExportBackupPanel";
import JuryEntryControlPanel from "./settings/JuryEntryControlPanel";
import { exportXLSX, buildExportFilename } from "./xlsx/exportXLSX";
import SemesterSettingsPanel from "./ManageSemesterPanel";
import ProjectSettingsPanel from "./ManageProjectsPanel";
import JurorSettingsPanel from "./ManageJurorsPanel";
import AccessSettingsPanel from "./ManagePermissionsPanel";
import AdminSecurityPanel from "../components/admin/AdminSecurityPanel";
import DeleteConfirmDialog from "../components/admin/DeleteConfirmDialog";
import { useSettingsCrud } from "./hooks/useSettingsCrud";
import { useManageOrganizations } from "./hooks/useManageOrganizations";
import { useAuditLogFilters } from "./hooks/useAuditLogFilters";
import { formatAuditTimestamp } from "./utils/auditUtils";
import ManageOrganizationsPanel from "./settings/ManageOrganizationsPanel";
import { useAuth } from "../shared/auth";

const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const MIN_BACKUP_DELAY = 1200;

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    if (mql.addEventListener) mql.addEventListener("change", handler);
    else mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handler);
      else mql.removeListener(handler);
    };
  }, [query]);
  return matches;
}

export default function SettingsPage({ tenantId, selectedSemesterId = "", onDirtyChange, onCurrentSemesterChange }) {
  const { isSuper, activeTenant } = useAuth();
  const tenantCode = activeTenant?.code || "";
  const isMobile = useMediaQuery("(max-width: 900px)");
  const isSmallMobile = useMediaQuery("(max-width: 500px)");
  const supportsInfiniteScroll = typeof window !== "undefined" && "IntersectionObserver" in window;

  const [openPanels, setOpenPanels] = useState(() => {
    const isSM = typeof window !== "undefined" && window.innerWidth <= 500;
    return {
      org: !isSM,
      semester: !isSM,
      projects: !isSM,
      jurors: !isSM,
      permissions: !isSM,
      security: !isSM,
      audit: !isSM,
      export: !isSM,
      dbbackup: !isSM,
      juryEntry: false,
    };
  });

  const [loadingCount, setLoadingCount] = useState(0);
  const incLoading = useCallback(() => setLoadingCount((c) => c + 1), []);
  const decLoading = useCallback(() => setLoadingCount((c) => Math.max(0, c - 1)), []);
  const loading = loadingCount > 0;
  const _toast = useToast();
  const setMessage = (msg) => { if (msg) _toast.success(msg); };

  const [backupPasswordSet, setBackupPasswordSet] = useState(true);
  const [dbBackupMode, setDbBackupMode] = useState(null);
  const [dbBackupPassword, setDbBackupPassword] = useState("");
  const [dbImportData, setDbImportData] = useState(null);
  const [dbImportFileName, setDbImportFileName] = useState("");
  const [dbImportFileSize, setDbImportFileSize] = useState(0);
  const [dbImportDragging, setDbImportDragging] = useState(false);
  const [dbBackupConfirmText, setDbBackupConfirmText] = useState("");
  const [dbBackupLoading, setDbBackupLoading] = useState(false);
  const [dbBackupError, setDbBackupError] = useState("");
  const [dbImportSuccess, setDbImportSuccess] = useState("");
  const [dbImportWarning, setDbImportWarning] = useState("");

  const adminSecurityRef = useRef(null);
  const importFileRef = useRef(null);

  const localTimeZone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
    } catch {
      return "Local time";
    }
  })();

  // ── Audit log hook ────────────────────────────────────────
  const audit = useAuditLogFilters({ tenantId, isMobile, setMessage });

  // ── Organization dirty state ref (set before useSettingsCrud so it can be read) ──
  const orgDirtyRef = useRef(false);

  // ── CRUD hook ─────────────────────────────────────────────
  // Wrap onDirtyChange to combine CRUD panel dirty with org dirty.
  const combinedDirtyChange = useCallback(
    (crudDirty) => onDirtyChange?.(crudDirty || orgDirtyRef.current),
    [onDirtyChange]
  );
  const crud = useSettingsCrud({
    tenantId,
    selectedSemesterId,
    onDirtyChange: combinedDirtyChange,
    onCurrentSemesterChange,
    setMessage,
    incLoading,
    decLoading,
    onAuditChange: audit.scheduleAuditRefresh,
  });

  // ── Organization management hook (super-admin only) ───────
  const handleOrgDirtyChange = useCallback((dirty) => {
    orgDirtyRef.current = dirty;
    const crudDirty = Object.values(crud.panelDirty).some(Boolean);
    onDirtyChange?.(dirty || crudDirty);
  }, [onDirtyChange, crud.panelDirty]);

  const org = useManageOrganizations({
    enabled: isSuper,
    setMessage,
    incLoading,
    decLoading,
    onDirtyChange: handleOrgDirtyChange,
  });

  // ── Security state (backup password check) ────────────────
  useEffect(() => {
    let active = true;
    adminSecurityState()
      .then((state) => {
        if (!active) return;
        setBackupPasswordSet(Boolean(state?.backup_password_set));
      })
      .catch(() => {
        if (!active) return;
        setBackupPasswordSet(true);
      });
    return () => { active = false; };
  }, []);

  const togglePanel = (id) => {
    setOpenPanels((prev) => {
      const isCurrentlyOpen = prev[id];
      if (isCurrentlyOpen) {
        return { ...prev, [id]: false };
      }
      const next = {};
      for (const key of Object.keys(prev)) {
        next[key] = key === id;
      }
      return next;
    });
  };

  // ── Export handlers (stay here because they need semesterList) ──
  const handleExportProjects = async () => {
    if (!tenantId) return;
    const sems = (crud.semesterList && crud.semesterList.length ? crud.semesterList : await adminListSemesters(tenantId)) || [];
    if (!sems.length) return;
    const orderedSemesters = [...sems].sort((a, b) => {
      const aTs = a?.poster_date ? Date.parse(a.poster_date) : 0;
      const bTs = b?.poster_date ? Date.parse(b.poster_date) : 0;
      return bTs - aTs;
    });
    const projectsBySemester = await Promise.all(
      orderedSemesters.map(async (sem) => {
        const { adminListProjects } = await import("../shared/api");
        return {
          semesterName: (sem?.semester_name) || "",
          rows: await adminListProjects(sem.id),
        };
      })
    );
    const XLSX = await import("xlsx-js-style");
    const headers = ["Semester", "Group No", "Project Title", "Students"];
    const data = projectsBySemester.flatMap(({ semesterName, rows }) =>
      (rows || []).map((p) => [
        semesterName,
        p?.group_no ?? "",
        p?.project_title ?? "",
        p?.group_students || "",
      ])
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws["!cols"] = [18, 8, 36, 42].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Groups");
    XLSX.writeFile(wb, buildExportFilename("groups", "all-semesters", "xlsx", tenantCode));
  };

  const handleExportJurors = async () => {
    if (!tenantId) return;
    const sems = (crud.semesterList && crud.semesterList.length ? crud.semesterList : await adminListSemesters(tenantId)) || [];
    if (!sems.length) return;
    const orderedSemesters = [...sems].sort((a, b) => {
      const aTs = a?.poster_date ? Date.parse(a.poster_date) : 0;
      const bTs = b?.poster_date ? Date.parse(b.poster_date) : 0;
      return bTs - aTs;
    });
    const jurorsBySemester = await Promise.all(
      orderedSemesters.map(async (sem) => ({
        semesterName: (sem?.semester_name) || "",
        rows: await adminListJurors(sem.id),
      }))
    );
    const isAssignedJuror = (j) => {
      if (j?.isAssigned === true) return true;
      if (j?.is_assigned === true) return true;
      if (typeof j?.isAssigned === "string") return ["true", "t", "1"].includes(j.isAssigned.toLowerCase());
      if (typeof j?.is_assigned === "string") return ["true", "t", "1"].includes(j.is_assigned.toLowerCase());
      return false;
    };
    const XLSX = await import("xlsx-js-style");
    const headers = ["Semester", "Juror Name", "Institution / Department"];
    const data = jurorsBySemester.flatMap(({ semesterName, rows }) => {
      const hasAssignedFlag = (rows || []).some((j) =>
        j?.isAssigned !== undefined && j?.isAssigned !== null
        || j?.is_assigned !== undefined && j?.is_assigned !== null
      );
      const exportRows = hasAssignedFlag ? (rows || []).filter(isAssignedJuror) : (rows || []);
      return exportRows.map((j) => [
        semesterName,
        j?.juryName || j?.juror_name || j?.jurorName || "",
        j?.juryDept || j?.juror_inst || j?.jurorInst || "",
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws["!cols"] = [18, 28, 32].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jurors");
    XLSX.writeFile(wb, buildExportFilename("jurors", "all-semesters", "xlsx", tenantCode));
  };

  const handleExportScores = async () => {
    if (!tenantId) return;
    const sems = (crud.semesterList && crud.semesterList.length ? crud.semesterList : await adminListSemesters(tenantId)) || [];
    if (!sems.length) return;
    const orderedSemesters = [...sems].sort((a, b) => {
      const aTs = a?.poster_date ? Date.parse(a.poster_date) : 0;
      const bTs = b?.poster_date ? Date.parse(b.poster_date) : 0;
      return bTs - aTs;
    });
    const results = await Promise.all(
      orderedSemesters.map(async (sem) => {
        const [rows, summary] = await Promise.all([
          adminGetScores(sem.id),
          adminProjectSummary(sem.id).catch(() => []),
        ]);
        const summaryMap = new Map((summary || []).map((p) => [p.id, p]));
        const mappedRows = (rows || []).map((r) => ({
          ...r,
          semester: (sem?.semester_name) || "",
          students: summaryMap.get(r.projectId)?.students ?? "",
        }));
        return { rows: mappedRows, summary: summary || [] };
      })
    );
    await exportXLSX(results.flatMap((x) => x.rows), {
      semesterName: "all-semesters",
      summaryData: results.flatMap((x) => x.summary),
      tenantCode,
    });
  };

  // ── DB backup helpers ─────────────────────────────────────
  const handleDbExportStart = () => {
    if (!backupPasswordSet || dbBackupLoading) return;
    setDbBackupMode("export");
    setDbBackupPassword("");
    setDbBackupConfirmText("");
    setDbBackupError("");
    setDbImportSuccess("");
    setDbImportWarning("");
    setDbImportData(null);
    setDbImportFileName("");
    setDbImportFileSize(0);
    setDbImportDragging(false);
  };

  const handleDbImportStart = () => {
    if (!backupPasswordSet || dbBackupLoading) return;
    setDbBackupMode("import");
    setDbBackupPassword("");
    setDbBackupConfirmText("");
    setDbBackupError("");
    setDbImportSuccess("");
    setDbImportWarning("");
    setDbImportData(null);
    setDbImportFileName("");
    setDbImportFileSize(0);
    setDbImportDragging(false);
  };

  const validateBackupPayload = (payload) => {
    if (!payload || typeof payload !== "object") return "Invalid backup file format.";
    if (!Number.isFinite(Number(payload.schema_version))) return "Missing schema_version in backup file.";
    const required = ["semesters", "jurors", "projects", "scores", "juror_semester_auth"];
    for (const key of required) {
      if (!Array.isArray(payload[key])) return `Backup file is missing '${key}' data.`;
    }
    return "";
  };

  const buildBackupLoadFeedback = (payload) => {
    const semesters = Array.isArray(payload?.semesters) ? payload.semesters.length : 0;
    const jurors = Array.isArray(payload?.jurors) ? payload.jurors.length : 0;
    const projects = Array.isArray(payload?.projects) ? payload.projects.length : 0;
    const scores = Array.isArray(payload?.scores) ? payload.scores.length : 0;
    const assignments = Array.isArray(payload?.juror_semester_auth) ? payload.juror_semester_auth.length : 0;
    const schemaVersion = Number(payload?.schema_version);
    const success = [
      "• Backup file loaded successfully.",
      `• Found: ${semesters} semesters, ${jurors} jurors, ${projects} groups, ${scores} scores, ${assignments} assignments (schema v${Number.isFinite(schemaVersion) ? schemaVersion : "?"}).`,
    ].join("\n");
    const emptySections = [];
    if (semesters === 0) emptySections.push("semesters");
    if (jurors === 0) emptySections.push("jurors");
    if (projects === 0) emptySections.push("groups");
    if (scores === 0) emptySections.push("scores");
    if (assignments === 0) emptySections.push("assignments");
    const warning = emptySections.length
      ? `• Empty sections in this backup: ${emptySections.join(", ")}.`
      : "";
    return { success, warning };
  };

  const handleDbImportFile = (file) => {
    if (!file) return;
    setDbBackupError("");
    setDbImportSuccess("");
    setDbImportWarning("");
    setDbImportData(null);
    if (!file.name.toLowerCase().endsWith(".json")) {
      setDbImportFileName("");
      setDbImportFileSize(0);
      setDbBackupError("Only .json backup files are supported.");
      return;
    }
    if (file.size > MAX_BACKUP_BYTES) {
      setDbImportFileName("");
      setDbImportFileSize(0);
      setDbBackupError("Backup file is too large (max 10 MB).");
      return;
    }
    setDbImportFileName(file.name);
    setDbImportFileSize(file.size);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const schemaError = validateBackupPayload(parsed);
        if (schemaError) {
          setDbBackupError(schemaError);
          setDbImportSuccess("");
          setDbImportWarning("");
          setDbImportData(null);
          return;
        }
        setDbImportData(parsed);
        setDbBackupError("");
        const feedback = buildBackupLoadFeedback(parsed);
        setDbImportSuccess(feedback.success);
        setDbImportWarning(feedback.warning);
      } catch {
        setDbBackupError("Invalid backup file. Could not parse JSON.");
        setDbImportSuccess("");
        setDbImportWarning("");
      }
    };
    reader.readAsText(file);
  };

  const handleDbImportFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleDbImportFile(file);
    e.target.value = "";
  };

  const mapDbBackupError = (e) => {
    const msg = String(e?.message || "");
    if (msg.includes("backup_password_missing")) {
      return "Backup & restore password is not configured. Set it in Admin Security, then try again.";
    }
    if (msg.includes("incorrect_backup_password")) return "Incorrect backup & restore password. Try again.";
    if (msg.includes("unauthorized")) return "Unauthorized. Please re-login.";
    return null;
  };

  const handleDbExportConfirm = async () => {
    if (!dbBackupPassword || !tenantId) return;
    const start = Date.now();
    setDbBackupLoading(true);
    setDbBackupError("");
    try {
      const data = await adminFullExport(dbBackupPassword, tenantId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildExportFilename("backup", crud.currentSemester?.semester_name, "json", tenantCode);
      a.click();
      URL.revokeObjectURL(url);
      setDbBackupMode(null);
      setDbBackupPassword("");
      setDbBackupConfirmText("");
      setDbImportDragging(false);
      setMessage("Database backup downloaded");
    } catch (e) {
      setDbBackupError(mapDbBackupError(e) || "Export failed. Try again or check your passwords.");
    } finally {
      const remaining = Math.max(0, MIN_BACKUP_DELAY - (Date.now() - start));
      if (remaining) await new Promise((r) => setTimeout(r, remaining));
      setDbBackupLoading(false);
    }
  };

  const handleDbImportConfirm = async () => {
    if (!dbImportData || !dbBackupPassword || !tenantId) return;
    if (dbBackupConfirmText.trim() !== "RESTORE") {
      setDbBackupError("Type RESTORE to confirm.");
      return;
    }
    const start = Date.now();
    setDbBackupLoading(true);
    setDbBackupError("");
    try {
      await adminFullImport(dbImportData, dbBackupPassword, tenantId);
      setDbBackupMode(null);
      setDbBackupPassword("");
      setDbBackupConfirmText("");
      setDbImportDragging(false);
      setDbImportData(null);
      setDbImportFileName("");
      setDbImportFileSize(0);
      setDbImportSuccess("");
      setDbImportWarning("");
      setMessage("Database restored from backup");
    } catch (e) {
      setDbBackupError(mapDbBackupError(e) || "Import failed. Check the backup file and try again.");
    } finally {
      const remaining = Math.max(0, MIN_BACKUP_DELAY - (Date.now() - start));
      if (remaining) await new Promise((r) => setTimeout(r, remaining));
      setDbBackupLoading(false);
    }
  };

  return (
    <div className="manage-page manage-page--settings">
      {loading && (
        <div className="manage-alerts-sticky">
          <div className="manage-alerts">
            <span className="manage-alert">Working…</span>
          </div>
        </div>
      )}
      <PinResetDialog
        pinResetTarget={crud.pinResetTarget}
        resetPinInfo={crud.resetPinInfo}
        pinResetLoading={crud.pinResetLoading}
        pinCopied={crud.pinCopied}
        viewSemesterLabel={crud.viewSemesterLabel}
        onCopyPin={crud.handleCopyPin}
        onClose={crud.closeResetPinDialog}
        onConfirmReset={crud.confirmResetPin}
      />
      <DeleteConfirmDialog
        open={!!crud.deleteTarget}
        targetType={crud.deleteTarget?.type}
        targetLabel={crud.deleteTarget?.label}
        targetName={crud.deleteTarget?.name}
        targetInst={crud.deleteTarget?.inst}
        counts={crud.deleteCounts}
        onOpenChange={(open) => {
          if (!open) { crud.setDeleteTarget(null); crud.setDeleteCounts(null); }
        }}
        onConfirm={async (password) => {
          try {
            await crud.handleConfirmDelete(password);
          } catch (e) {
            const msg = crud.mapDeleteError(e);
            throw new Error(msg);
          }
        }}
      />

      <div className="manage-grid">
        {/* ── Organization + Semester (side-by-side for super-admin) ── */}
        <section className="manage-section" style={{ gridColumn: "1 / -1" }}>
          {isSuper && <h3 className="manage-section-title">Organization &amp; Semester Management</h3>}
          {!isSuper && <h3 className="manage-section-title">Data Management</h3>}
          <div className="manage-section-grid">
            {isSuper && (
              <ManageOrganizationsPanel
                isMobile={isMobile}
                isOpen={openPanels.org}
                onToggle={() => togglePanel("org")}
                {...org}
              />
            )}

            <div>
              <SemesterSettingsPanel
                semesters={crud.semesterList}
                currentSemesterId={crud.currentSemesterId}
                currentSemesterName={crud.currentSemesterLabel}
                formatSemesterName={(n) => n || ""}
                panelError={crud.panelErrors.semester}
                isMobile={isMobile}
                isOpen={openPanels.semester}
                onToggle={() => togglePanel("semester")}
                onDirtyChange={(dirty) => crud.handlePanelDirty("semester", dirty)}
                onSetCurrent={crud.handleSetCurrentSemester}
                onCreateSemester={crud.handleCreateSemester}
                onUpdateSemester={crud.handleUpdateSemester}
                onUpdateCriteriaTemplate={crud.handleUpdateCriteriaTemplate}
                onUpdateMudekTemplate={crud.handleUpdateMudekTemplate}
                isLockedFn={crud.isLockedFn}
                externalUpdatedSemesterId={crud.externalUpdatedSemesterId}
                externalDeletedSemesterId={crud.externalDeletedSemesterId}
                onDeleteSemester={(s) => {
                  if (s?.id === crud.currentSemesterId) {
                    crud.setPanelError("semester", "Current semester cannot be deleted. Select another semester first.");
                    return;
                  }
                  if (crud.semesterList.length === 1) {
                    crud.setPanelError("semester", "Cannot delete the only remaining semester.");
                    return;
                  }
                  if (!tenantId) {
                    crud.setPanelError("semester", "Tenant ID missing. Please re-login.");
                    return;
                  }
                  crud.handleRequestDelete({
                    type: "semester",
                    id: s?.id,
                    label: `Semester ${(s?.semester_name) || ""}`.trim(),
                  });
                }}
              />
            </div>

            {!isSuper && (
              <ProjectSettingsPanel
                projects={crud.projects}
                semesterName={crud.viewSemesterLabel}
                currentSemesterId={crud.viewSemesterId}
                semesterOptions={crud.semesterList}
                panelError={crud.panelErrors.projects}
                isMobile={isMobile}
                isOpen={openPanels.projects}
                onToggle={() => togglePanel("projects")}
                onDirtyChange={(dirty) => crud.handlePanelDirty("projects", dirty)}
                onImport={crud.handleImportProjects}
                onAddGroup={crud.handleAddProject}
                onEditGroup={crud.handleEditProject}
                onRetry={crud.reloadProjects}
                onDeleteProject={(p, groupLabel) =>
                  crud.handleRequestDelete({
                    type: "project",
                    id: p?.id,
                    label: `Group ${groupLabel}`,
                  })
                }
              />
            )}

            {!isSuper && (
              <JurorSettingsPanel
                jurors={crud.jurors}
                panelError={crud.panelErrors.jurors}
                isMobile={isMobile}
                isOpen={openPanels.jurors}
                onToggle={() => togglePanel("jurors")}
                onDirtyChange={(dirty) => crud.handlePanelDirty("jurors", dirty)}
                onImport={crud.handleImportJurors}
                onAddJuror={crud.handleAddJuror}
                onEditJuror={crud.handleEditJuror}
                onResetPin={crud.requestResetPin}
                onDeleteJuror={(j) =>
                  crud.handleRequestDelete({
                    type: "juror",
                    id: j?.jurorId || j?.juror_id,
                    label: `Juror ${j?.juryName || j?.juror_name || ""}`.trim(),
                    name: j?.juryName || j?.juror_name || "",
                    inst: j?.juryDept || j?.juror_inst || "",
                  })
                }
              />
            )}

            {!isSuper && (
              <AccessSettingsPanel
                settings={crud.settings}
                jurors={crud.jurors}
                currentSemesterId={crud.viewSemesterId}
                currentSemesterName={crud.viewSemesterLabel}
                evalLockError={crud.evalLockError}
                isMobile={isMobile}
                isOpen={openPanels.permissions}
                onToggle={() => togglePanel("permissions")}
                onRequestEvalLockChange={(checked) => {
                  crud.setEvalLockError("");
                  crud.setEvalLockConfirmNext(Boolean(checked));
                  crud.setEvalLockConfirmOpen(true);
                }}
                onToggleEdit={crud.handleToggleJurorEdit}
                onForceCloseEdit={crud.handleForceCloseJurorEdit}
              />
            )}
          </div>
        </section>

        <section className="manage-section" style={{ gridColumn: "1 / -1" }}>
          <h3 className="manage-section-title">
            {isSuper ? "Data & Access Management" : "Access & Security Management"}
          </h3>
          <div className="manage-section-grid">
            {isSuper && (
              <ProjectSettingsPanel
                projects={crud.projects}
                semesterName={crud.viewSemesterLabel}
                currentSemesterId={crud.viewSemesterId}
                semesterOptions={crud.semesterList}
                panelError={crud.panelErrors.projects}
                isMobile={isMobile}
                isOpen={openPanels.projects}
                onToggle={() => togglePanel("projects")}
                onDirtyChange={(dirty) => crud.handlePanelDirty("projects", dirty)}
                onImport={crud.handleImportProjects}
                onAddGroup={crud.handleAddProject}
                onEditGroup={crud.handleEditProject}
                onRetry={crud.reloadProjects}
                onDeleteProject={(p, groupLabel) =>
                  crud.handleRequestDelete({
                    type: "project",
                    id: p?.id,
                    label: `Group ${groupLabel}`,
                  })
                }
              />
            )}

            {isSuper && (
              <JurorSettingsPanel
                jurors={crud.jurors}
                panelError={crud.panelErrors.jurors}
                isMobile={isMobile}
                isOpen={openPanels.jurors}
                onToggle={() => togglePanel("jurors")}
                onDirtyChange={(dirty) => crud.handlePanelDirty("jurors", dirty)}
                onImport={crud.handleImportJurors}
                onAddJuror={crud.handleAddJuror}
                onEditJuror={crud.handleEditJuror}
                onResetPin={crud.requestResetPin}
                onDeleteJuror={(j) =>
                  crud.handleRequestDelete({
                    type: "juror",
                    id: j?.jurorId || j?.juror_id,
                    label: `Juror ${j?.juryName || j?.juror_name || ""}`.trim(),
                    name: j?.juryName || j?.juror_name || "",
                    inst: j?.juryDept || j?.juror_inst || "",
                  })
                }
              />
            )}

            {isSuper && (
              <AccessSettingsPanel
                settings={crud.settings}
                jurors={crud.jurors}
                currentSemesterId={crud.viewSemesterId}
                currentSemesterName={crud.viewSemesterLabel}
                evalLockError={crud.evalLockError}
                isMobile={isMobile}
                isOpen={openPanels.permissions}
                onToggle={() => togglePanel("permissions")}
                onRequestEvalLockChange={(checked) => {
                  crud.setEvalLockError("");
                  crud.setEvalLockConfirmNext(Boolean(checked));
                  crud.setEvalLockConfirmOpen(true);
                }}
                onToggleEdit={crud.handleToggleJurorEdit}
                onForceCloseEdit={crud.handleForceCloseJurorEdit}
              />
            )}

            <AdminSecurityPanel
              isMobile={isMobile}
              isOpen={openPanels.security}
              onToggle={() => togglePanel("security")}
              tenantId={tenantId}
              innerRef={adminSecurityRef}
            />

            <JuryEntryControlPanel
              isMobile={isMobile}
              isOpen={openPanels.juryEntry}
              onToggle={() => togglePanel("juryEntry")}
              semesterId={crud.viewSemesterId}
              semesterName={(crud.semesterList.find((s) => s.id === crud.viewSemesterId)?.semester_name) || ""}
              tenantId={tenantId}
            />

            <AuditLogCard
              isMobile={isMobile}
              isOpen={openPanels.audit}
              onToggle={() => togglePanel("audit")}
              auditCardRef={audit.auditCardRef}
              auditScrollRef={audit.auditScrollRef}
              auditSentinelRef={audit.auditSentinelRef}
              auditFilters={audit.auditFilters}
              auditSearch={audit.auditSearch}
              auditRangeError={audit.auditRangeError}
              auditError={audit.auditError}
              auditExporting={audit.auditExporting}
              auditLoading={audit.auditLoading}
              auditHasMore={audit.auditHasMore}
              visibleAuditLogs={audit.visibleAuditLogs}
              showAuditSkeleton={audit.showAuditSkeleton}
              isAuditStaleRefresh={audit.isAuditStaleRefresh}
              hasAuditFilters={audit.hasAuditFilters}
              hasAuditToggle={audit.hasAuditToggle}
              showAllAuditLogs={audit.showAllAuditLogs}
              localTimeZone={localTimeZone}
              AUDIT_COMPACT_COUNT={audit.AUDIT_COMPACT_COUNT}
              supportsInfiniteScroll={supportsInfiniteScroll}
              onSetAuditFilters={audit.setAuditFilters}
              onSetAuditSearch={audit.setAuditSearch}
              onAuditExport={audit.handleAuditExport}
              onToggleShowAll={() => {
                audit.setShowAllAuditLogs((prev) => {
                  const next = !prev;
                  if (!next && audit.auditScrollRef.current) {
                    audit.auditScrollRef.current.scrollTop = 0;
                  }
                  return next;
                });
              }}
              onAuditLoadMore={audit.handleAuditLoadMore}
              formatAuditTimestamp={formatAuditTimestamp}
            />

            <ExportBackupPanel
              isMobile={isMobile}
              openPanels={openPanels}
              backupPasswordSet={backupPasswordSet}
              dbBackupMode={dbBackupMode}
              dbBackupLoading={dbBackupLoading}
              dbBackupPassword={dbBackupPassword}
              dbBackupConfirmText={dbBackupConfirmText}
              dbBackupError={dbBackupError}
              dbImportData={dbImportData}
              dbImportFileName={dbImportFileName}
              dbImportFileSize={dbImportFileSize}
              dbImportDragging={dbImportDragging}
              dbImportSuccess={dbImportSuccess}
              dbImportWarning={dbImportWarning}
              importFileRef={importFileRef}
              onToggleExport={() => togglePanel("export")}
              onToggleDbBackup={() => togglePanel("dbbackup")}
              onExportScores={handleExportScores}
              onExportJurors={handleExportJurors}
              onExportProjects={handleExportProjects}
              onDbExportStart={handleDbExportStart}
              onDbImportStart={handleDbImportStart}
              onDbImportFileSelect={handleDbImportFileSelect}
              onSetDbImportDragging={setDbImportDragging}
              onDbImportFile={handleDbImportFile}
              onSetDbBackupPassword={setDbBackupPassword}
              onSetDbBackupError={setDbBackupError}
              onSetDbBackupConfirmText={setDbBackupConfirmText}
              onCancelBackupDialog={() => {
                setDbBackupMode(null);
                setDbBackupPassword("");
                setDbBackupConfirmText("");
                setDbImportData(null);
                setDbImportFileName("");
                setDbImportFileSize(0);
                setDbImportDragging(false);
                setDbBackupError("");
                setDbImportSuccess("");
                setDbImportWarning("");
              }}
              onDbExportConfirm={handleDbExportConfirm}
              onDbImportConfirm={handleDbImportConfirm}
            />
          </div>
        </section>
      </div>

      <EvalLockConfirmDialog
        evalLockConfirmOpen={crud.evalLockConfirmOpen}
        evalLockConfirmNext={crud.evalLockConfirmNext}
        evalLockConfirmLoading={crud.evalLockConfirmLoading}
        viewSemesterLabel={crud.viewSemesterLabel}
        onCancel={() => crud.setEvalLockConfirmOpen(false)}
        onConfirm={async () => {
          crud.setEvalLockConfirmLoading(true);
          await crud.handleSaveSettings({ ...crud.settings, evalLockActive: crud.evalLockConfirmNext });
          crud.setEvalLockConfirmLoading(false);
          crud.setEvalLockConfirmOpen(false);
        }}
      />
    </div>
  );
}
