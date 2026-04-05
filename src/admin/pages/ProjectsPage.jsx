// src/admin/pages/ProjectsPage.jsx — Phase 7
// Projects management page. Structure from prototype lines 14001–14241.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/shared/hooks/useToast";
import { useAuth } from "@/auth";
import { useManagePeriods } from "../hooks/useManagePeriods";
import { useManageProjects } from "../hooks/useManageProjects";
import ImportCsvModal from "../modals/ImportCsvModal";
import { parseProjectsCsv } from "../utils/csvParser";
import ExportPanel from "../components/ExportPanel";
import { downloadTable, generateTableBlob } from "../utils/downloadTable";
import "../../styles/pages/projects.css";

// ── Column config — single source of truth for table headers and export ──
const COLUMNS = [
  { key: "group_no",   label: "#",             colWidth: 40,   exportWidth: 8  },
  { key: "title",      label: "Project Title",  colWidth: null, exportWidth: 36 },
  { key: "members",    label: "Team Members",   colWidth: null, exportWidth: 42 },
  { key: "updated_at", label: "Last Updated",   colWidth: 130,  exportWidth: 18 },
];

function getProjectCell(p, key) {
  if (key === "group_no")   return p.group_no ?? "";
  if (key === "title")      return p.title ?? "";
  if (key === "members") {
    if (Array.isArray(p.members)) return p.members.join(", ");
    return String(p.members || "");
  }
  if (key === "updated_at") return formatUpdated(p.updated_at);
  return "";
}

function membersToArray(m) {
  if (!m) return [];
  if (Array.isArray(m)) return m.map((s) => (s?.name || s || "").toString().trim()).filter(Boolean);
  if (typeof m === "string") return m.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  return [];
}
function membersToString(m) {
  return membersToArray(m).join(", ");
}

function formatUpdated(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function ProjectsPage({
  organizationId,
  selectedPeriodId,
  isDemoMode = false,
  onDirtyChange,
  onCurrentSemesterChange,
}) {
  const _toast = useToast();
  const { activeOrganization } = useAuth();
  const setMessage = (msg) => { if (msg) _toast.success(msg); };
  const [panelError, setPanelErrorState] = useState("");
  const setPanelError = useCallback((_panel, msg) => setPanelErrorState(msg || ""), []);
  const clearPanelError = useCallback(() => setPanelErrorState(""), []);
  const [loadingCount, setLoadingCount] = useState(0);
  const incLoading = useCallback(() => setLoadingCount((c) => c + 1), []);
  const decLoading = useCallback(() => setLoadingCount((c) => Math.max(0, c - 1)), []);

  const periods = useManagePeriods({
    organizationId,
    selectedPeriodId,
    setMessage,
    incLoading,
    decLoading,
    onCurrentPeriodChange: onCurrentSemesterChange,
    setPanelError,
    clearPanelError,
  });

  const projects = useManageProjects({
    organizationId,
    viewPeriodId: periods.viewPeriodId,
    viewPeriodLabel: periods.viewPeriodLabel,
    periodList: periods.periodList,
    setMessage,
    incLoading,
    decLoading,
    setPanelError,
    clearPanelError,
  });

  // Local UI state
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Add/edit modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formGroupNo, setFormGroupNo] = useState("");
  const [formMembers, setFormMembers] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  // Drawer
  const [drawerProject, setDrawerProject] = useState(null);

  // Import CSV state
  const csvInputRef = useRef(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [importStats, setImportStats] = useState({ valid: 0, duplicate: 0, error: 0, total: 0 });
  const [importWarning, setImportWarning] = useState(null);
  const [importBusy, setImportBusy] = useState(false);
  const cancelImportRef = useRef(false);

  // Load periods, then projects
  useEffect(() => {
    incLoading();
    periods.loadPeriods()
      .catch(() => setPanelError("period", "Could not load periods."))
      .finally(() => decLoading());
  }, [periods.loadPeriods]);

  useEffect(() => {
    if (!periods.viewPeriodId) return;
    incLoading();
    projects.loadProjects()
      .catch(() => setPanelError("project", "Could not load projects."))
      .finally(() => decLoading());
  }, [periods.viewPeriodId, projects.loadProjects]);

  // Close action menus on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    }
    if (openMenuId) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [openMenuId]);

  const projectList = projects.projects || [];

  // Filter by search
  const filteredList = useMemo(() => {
    if (!search.trim()) return projectList;
    const q = search.toLowerCase();
    return projectList.filter((p) =>
      (p.title || "").toLowerCase().includes(q) ||
      membersToString(p.members).toLowerCase().includes(q) ||
      String(p.group_no || "").includes(q)
    );
  }, [projectList, search]);

  // KPI stats
  const totalProjects = projectList.length;
  const totalMembers = projectList.reduce((sum, p) => {
    return sum + membersToArray(p.members).length;
  }, 0);

  function openAddModal() {
    setEditTarget(null);
    setFormTitle("");
    setFormGroupNo("");
    setFormMembers("");
    setAddModalOpen(true);
  }

  function openEditModal(project) {
    setEditTarget(project);
    setFormTitle(project.title || "");
    setFormGroupNo(String(project.group_no || ""));
    setFormMembers(membersToString(project.members));
    setAddModalOpen(true);
    setOpenMenuId(null);
  }

  async function handleSaveProject() {
    if (!formTitle.trim()) return;
    setFormSaving(true);
    try {
      if (editTarget) {
        await projects.handleEditProject({
          id: editTarget.id,
          title: formTitle.trim(),
          group_no: parseInt(formGroupNo, 10) || editTarget.group_no,
          members: membersToArray(formMembers),
        });
      } else {
        await projects.handleAddProject({
          title: formTitle.trim(),
          group_no: parseInt(formGroupNo, 10) || (totalProjects + 1),
          members: membersToArray(formMembers),
        });
      }
      setAddModalOpen(false);
    } catch (e) {
      _toast.error(e?.message || "Could not save project.");
    } finally {
      setFormSaving(false);
    }
  }

  function openDrawer(project) {
    setDrawerProject(project);
  }

  async function handleImport() {
    const validRows = importRows.filter((r) => r.status === "ok");
    if (validRows.length === 0) return;
    cancelImportRef.current = false;
    setImportBusy(true);
    try {
      const result = await projects.handleImportProjects(validRows, { cancelRef: cancelImportRef });
      if (result?.ok !== false) {
        setImportOpen(false);
        _toast.success(`Imported ${validRows.length - (result?.skipped || 0)} project${validRows.length !== 1 ? "s" : ""}`);
      }
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="jurors-page-header">
        <div className="jurors-page-header-top">
          <div className="jurors-page-header-left">
            <div className="page-title">Projects</div>
            <div className="page-desc">Manage project records, student teams, and evaluation coverage for the active term.</div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="scores-kpi-strip">
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{totalProjects}</div>
          <div className="scores-kpi-item-label">Projects</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{totalMembers}</div>
          <div className="scores-kpi-item-label">Team Members</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="jurors-toolbar">
        <div className="jurors-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => { setFilterOpen((v) => !v); setExportOpen(false); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px" }}>
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          {" "}Filter
        </button>
        <div className="jurors-toolbar-spacer" />
        <button className="btn btn-outline btn-sm" onClick={() => { setExportOpen((v) => !v); setFilterOpen(false); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {" "}Export
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => csvInputRef.current?.click()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {" "}Import
        </button>
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const parsed = await parseProjectsCsv(file);
            setImportFile(parsed.file);
            setImportRows(parsed.rows);
            setImportStats(parsed.stats);
            setImportWarning(parsed.warningMessage);
            setImportOpen(true);
          }}
        />
        <button
          className="btn btn-primary btn-sm"
          style={{ width: "auto", padding: "6px 14px", fontSize: "12px", background: "var(--accent)", boxShadow: "none" }}
          onClick={openAddModal}
        >
          + Add Project
        </button>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="filter-panel">
          <div className="filter-panel-header">
            <div>
              <h4>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: "4px", opacity: 0.5 }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                Filter Projects
              </h4>
              <div className="filter-panel-sub">Narrow projects by evaluation coverage and advisor, or change sort order.</div>
            </div>
            <button className="filter-panel-close" onClick={() => setFilterOpen(false)}>&#215;</button>
          </div>
        </div>
      )}

      {/* Export panel */}
      {exportOpen && (
        <ExportPanel
          title="Export Projects"
          subtitle="Download the project list with team members and evaluation coverage."
          meta={`${periods.viewPeriodLabel} · ${totalProjects} projects`}
          periodName={periods.viewPeriodLabel}
          organization={activeOrganization?.name || ""}
          onClose={() => setExportOpen(false)}
          generateFile={async (fmt) => {
            const header = COLUMNS.map((c) => c.label);
            const rows = filteredList.map((p) => COLUMNS.map((c) => getProjectCell(p, c.key)));
            return generateTableBlob(fmt, {
              filenameType: "Projects", sheetName: "Projects",
              periodName: periods.viewPeriodLabel, tenantCode: activeOrganization?.code || "",
              organization: activeOrganization?.name || "", department: activeOrganization?.institution_name || "",
              pdfTitle: "VERA — Projects", header, rows,
              colWidths: COLUMNS.map((c) => c.exportWidth),
            });
          }}
          onExport={async (fmt) => {
            try {
              const header = COLUMNS.map((c) => c.label);
              const rows = filteredList.map((p) => COLUMNS.map((c) => getProjectCell(p, c.key)));
              await downloadTable(fmt, {
                filenameType: "Projects", sheetName: "Projects",
                periodName: periods.viewPeriodLabel, tenantCode: activeOrganization?.code || "",
                organization: activeOrganization?.name || "", department: activeOrganization?.institution_name || "",
                pdfTitle: "VERA — Projects", header, rows,
                colWidths: COLUMNS.map((c) => c.exportWidth),
              });
              setExportOpen(false);
              const fmtLabel = fmt === "pdf" ? "PDF" : fmt === "csv" ? "CSV" : "Excel";
              _toast.success(`${filteredList.length} project${filteredList.length !== 1 ? "s" : ""} exported · ${fmtLabel}`);
            } catch (e) {
              _toast.error(e?.message || "Projects export failed — please try again");
            }
          }}
        />
      )}

      {/* Error */}
      {panelError && (
        <div className="fb-alert fba-danger" style={{ marginBottom: "12px" }}>
          <div className="fb-alert-body">{panelError}</div>
        </div>
      )}

      {/* Table */}
      <div className="table-wrap" style={{ borderRadius: "var(--radius) var(--radius) 0 0" }}>
        <table id="projects-main-table">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} style={c.colWidth ? { width: c.colWidth } : {}}>
                  {c.label}
                </th>
              ))}
              <th style={{ width: 48 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingCount > 0 && filteredList.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "32px" }}>
                  Loading projects…
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "32px" }}>
                  No projects found.
                </td>
              </tr>
            ) : filteredList.map((project) => (
              <tr key={project.id} onClick={() => openDrawer(project)}>
                <td className="mono text-center">{project.group_no}</td>
                <td>
                  <div style={{ fontWeight: 600, lineHeight: 1.35 }}>{project.title}</div>
                </td>
                <td>
                  <div className="proj-member-list">
                    {membersToArray(project.members).map((name, i) => (
                      <span key={i} className="proj-member-chip">
                        <span className="proj-member-avatar">{name[0]?.toUpperCase() || "?"}</span>
                        <span className="proj-member-name">{name}</span>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="text-sm" style={{ color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                  {formatUpdated(project.updated_at)}
                </td>
                <td>
                  <div className="juror-action-wrap" ref={openMenuId === project.id ? menuRef : null}>
                    <button
                      className="juror-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId((prev) => (prev === project.id ? null : project.id));
                      }}
                      title="Actions"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                    {openMenuId === project.id && (
                      <div className="juror-action-menu open">
                        <div className="juror-action-item" onClick={(e) => { e.stopPropagation(); openEditModal(project); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edit Project
                        </div>
                        <div className="juror-action-sep" />
                        <div
                          className="juror-action-item danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            if (window.confirm(`Delete project "${project.title}"?`)) {
                              projects.handleDeleteProject(project.id);
                            }
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          Delete Project
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="jurors-pagination">
        <div className="jurors-pagination-info">
          <span>Showing 1–{filteredList.length} of {filteredList.length} projects</span>
        </div>
        <div className="jurors-pagination-pages">
          <button disabled>‹ Prev</button>
          <button className="active" disabled aria-current="page" title="Current page">1</button>
          <button disabled>Next ›</button>
        </div>
      </div>

      {/* Project detail drawer */}
      {drawerProject && (
        <>
          <div className="juror-drawer-overlay show" onClick={() => setDrawerProject(null)} />
          <div className="juror-drawer show">
            <div className="juror-drawer-header">
              <span className="jd-title">Project Details</span>
              <button className="juror-drawer-close" onClick={() => setDrawerProject(null)}>×</button>
            </div>
            <div style={{ padding: "20px 24px 0" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", lineHeight: 1.4, letterSpacing: "-0.2px" }}>
                {drawerProject.title}
              </div>
              <div className="text-xs text-muted" style={{ marginTop: "4px" }}>
                No. {drawerProject.group_no}
              </div>
            </div>
            <div className="juror-drawer-details" style={{ marginTop: "8px" }}>
              <div className="juror-drawer-row">
                <span className="juror-drawer-row-label">Team Members</span>
                <span className="juror-drawer-row-value">
                  {membersToString(drawerProject.members) || "—"}
                </span>
              </div>
              <div className="juror-drawer-row">
                <span className="juror-drawer-row-label">Last Updated</span>
                <span className="juror-drawer-row-value">{formatUpdated(drawerProject.updated_at)}</span>
              </div>
            </div>
            <div className="juror-drawer-actions">
              <button className="btn btn-outline btn-sm" onClick={() => { setDrawerProject(null); openEditModal(drawerProject); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Project
              </button>
              <button
                className="btn btn-outline btn-sm"
                style={{ color: "var(--danger)", borderColor: "rgba(225,29,72,0.3)" }}
                onClick={async () => {
                  const t = drawerProject;
                  setDrawerProject(null);
                  if (window.confirm(`Delete project "${t.title}"?`)) {
                    try { await projects.handleDeleteProject(t.id); }
                    catch (e) { _toast.error(e?.message || "Could not delete project."); }
                  }
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete Project
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit project modal */}
      {addModalOpen && (
        <div className="modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: "500px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editTarget ? "Edit Project" : "Add Project"}</span>
              <button className="juror-drawer-close" onClick={() => setAddModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label className="modal-label">Project Title</label>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="e.g. Multi-Channel EEG Acquisition Board"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-field" style={{ marginTop: "12px" }}>
                <label className="modal-label">Group Number</label>
                <input
                  className="modal-input"
                  type="number"
                  min="1"
                  placeholder="e.g. 1"
                  value={formGroupNo}
                  onChange={(e) => setFormGroupNo(e.target.value)}
                />
              </div>
              <div className="modal-field" style={{ marginTop: "12px" }}>
                <label className="modal-label">Team Members (comma or newline separated)</label>
                <textarea
                  className="modal-input"
                  rows={3}
                  placeholder="e.g. Gökçe Aras, Yui Sato"
                  value={formMembers}
                  onChange={(e) => setFormMembers(e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setAddModalOpen(false)} disabled={formSaving}>Cancel</button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSaveProject}
                disabled={formSaving || !formTitle.trim()}
              >
                {formSaving ? "Saving…" : editTarget ? "Save Changes" : "Add Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ImportCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        file={importFile}
        rows={importRows}
        stats={importStats}
        warningMessage={importWarning}
        onImport={handleImport}
        onReplaceFile={() => csvInputRef.current?.click()}
        busy={importBusy}
      />
    </div>
  );
}
