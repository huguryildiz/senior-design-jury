// src/admin/pages/ProjectsPage.jsx — Phase 7
// Projects management page. Structure from prototype lines 14001–14241.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Pagination from "@/shared/ui/Pagination";
import { useAdminContext } from "../hooks/useAdminContext";
import { BarChart2, Filter, UserRound, MoreVertical, Pencil, Eye, Trash2, Icon } from "lucide-react";
import { useToast } from "@/shared/hooks/useToast";
import { useAuth } from "@/auth";
import FbAlert from "@/shared/ui/FbAlert";
import DeleteProjectModal from "../modals/DeleteProjectModal";
import { FilterButton } from "@/shared/ui/FilterButton";
import { getPeriodMaxScore, logExportInitiated } from "@/shared/api";
import { useManagePeriods } from "../hooks/useManagePeriods";
import { useManageProjects } from "../hooks/useManageProjects";
import ImportCsvModal from "../modals/ImportCsvModal";
import { parseProjectsCsv } from "../utils/csvParser";
import ExportPanel from "../components/ExportPanel";
import EditProjectDrawer from "../drawers/EditProjectDrawer";
import AddProjectDrawer from "../drawers/AddProjectDrawer";
import ProjectScoresDrawer from "../drawers/ProjectScoresDrawer";
import { downloadTable, generateTableBlob } from "../utils/downloadTable";
import { StudentNames } from "@/shared/ui/EntityMeta";
import { avatarGradient, initials } from "@/shared/ui/avatarColor";
import JurorBadge from "../components/JurorBadge";
import PremiumTooltip from "@/shared/ui/PremiumTooltip";
import FloatingMenu from "@/shared/ui/FloatingMenu";
import { formatDateTime as formatFull } from "@/shared/lib/dateUtils";
import "../../styles/pages/projects.css";

// ── Column config — single source of truth for table headers and export ──
const COLUMNS = [
  { key: "group_no",   label: "No",            colWidth: 52,   exportWidth: 8  },
  { key: "title",      label: "Project Title",  colWidth: null, exportWidth: 36 },
  { key: "members",    label: "Team Members",   colWidth: null, exportWidth: 42, colClass: "col-members" },
  { key: "avg_score",  label: "Avg Score",      colWidth: 90,   exportWidth: 10 },
  { key: "updated_at", label: "Last Updated",   colWidth: 130,  exportWidth: 18, colClass: "col-updated" },
];

function getProjectCell(p, key, avgMap) {
  if (key === "group_no")   return p.group_no ?? "";
  if (key === "title")      return p.title ?? "";
  if (key === "members") {
    if (Array.isArray(p.members)) return p.members.join(", ");
    return String(p.members || "");
  }
  if (key === "avg_score")  return avgMap?.get(p.id) ?? "—";
  if (key === "updated_at") return formatFull(p.updated_at) || "—";
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

function formatRelative(ts) {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  if (diff < 31_536_000_000) return `${Math.floor(diff / 2_592_000_000)}mo ago`;
  const yrs = Math.round(diff / 31_536_000_000 * 10) / 10;
  return `${yrs % 1 === 0 ? yrs : yrs.toFixed(1)}yr ago`;
}

// Score band color for mobile ring. Matches variables.css semantic tokens.
function scoreBandToken(score, max) {
  if (score == null || !Number.isFinite(Number(score))) return "var(--text-tertiary)";
  const pct = (Number(score) / (max || 100)) * 100;
  if (pct >= 85) return "var(--success)";
  if (pct >= 70) return "var(--warning)";
  return "var(--danger)";
}

// Render up to 4 member chips + optional +N pill.
function MemberChips({ members }) {
  const arr = membersToArray(members);
  if (!arr.length) {
    return <span className="member-chips member-chips-empty">No team</span>;
  }
  const visible = arr.slice(0, 4);
  const extra = arr.length - visible.length;
  return (
    <span className="member-chips">
      {visible.map((name) => (
        <PremiumTooltip key={name} text={name}>
          <span
            className="member-chip"
            style={{ background: avatarGradient(name) }}
          >
            {initials(name)}
          </span>
        </PremiumTooltip>
      ))}
      {extra > 0 && (
        <span className="member-chip member-chip-more">+{extra}</span>
      )}
    </span>
  );
}

function SortIcon({ colKey, sortKey, sortDir }) {
  if (sortKey !== colKey) {
    return <span className="sort-icon sort-icon-inactive">▲</span>;
  }
  return (
    <span className="sort-icon sort-icon-active">
      {sortDir === "asc" ? "▲" : "▼"}
    </span>
  );
}

export default function ProjectsPage() {
  const {
    organizationId,
    selectedPeriodId,
    isDemoMode = false,
    onDirtyChange,
    onCurrentSemesterChange,
    onNavigate,
    rawScores,
    summaryData,
    allJurors,
    sortedPeriods,
  } = useAdminContext();
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
  const [sortKey, setSortKey] = useState("group_no");
  const [sortDir, setSortDir] = useState("asc");
  const [openMenuId, setOpenMenuId] = useState(null);

  // Edit / Add drawers
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editDrawerProject, setEditDrawerProject] = useState(null);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);

  // Detail drawer
  const [drawerProject, setDrawerProject] = useState(null);

  // View Scores drawer
  const [scoresProject, setScoresProject] = useState(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Per-project average score map
  const projectAvgMap = useMemo(() => {
    const map = new Map();
    if (!rawScores?.length) return map;
    const byProject = new Map();
    for (const r of rawScores) {
      const pid = r.projectId || r.project_id;
      if (!pid) continue;
      const total = Number(r.total);
      if (!Number.isFinite(total)) continue;
      if (!byProject.has(pid)) byProject.set(pid, []);
      byProject.get(pid).push(total);
    }
    for (const [pid, totals] of byProject) {
      map.set(pid, (totals.reduce((s, v) => s + v, 0) / totals.length).toFixed(1));
    }
    return map;
  }, [rawScores]);

  // Per-project distinct juror count (for mobile footer "N evaluations").
  const projectEvalCountMap = useMemo(() => {
    const map = new Map();
    if (!rawScores?.length) return map;
    const byProject = new Map();
    for (const r of rawScores) {
      const pid = r.projectId || r.project_id;
      const jid = r.jurorId || r.juror_id;
      if (!pid || !jid) continue;
      if (!byProject.has(pid)) byProject.set(pid, new Set());
      byProject.get(pid).add(jid);
    }
    for (const [pid, set] of byProject) map.set(pid, set.size);
    return map;
  }, [rawScores]);

  const deleteImpact = useMemo(() => {
    if (!deleteTarget || !rawScores?.length) return { scores: 0, jurors: 0, avgScore: "—" };
    const projectScores = rawScores.filter(
      (r) => r.projectId === deleteTarget.id || r.project_id === deleteTarget.id
    );
    const jurors = new Set(projectScores.map((r) => r.jurorId || r.juror_id).filter(Boolean)).size;
    const totals = projectScores.map((r) => Number(r.total)).filter(Number.isFinite);
    const avgScore = totals.length > 0
      ? (totals.reduce((s, v) => s + v, 0) / totals.length).toFixed(1)
      : "—";
    return { scores: projectScores.length, jurors, avgScore };
  }, [deleteTarget, rawScores]);

  // Period max score (for column header + /N suffix)
  const [periodMaxScore, setPeriodMaxScore] = useState(null);
  useEffect(() => {
    if (!periods.viewPeriodId) return;
    getPeriodMaxScore(periods.viewPeriodId).then(setPeriodMaxScore).catch(() => {});
  }, [periods.viewPeriodId]);

  // Import CSV state
  const cancelImportRef = useRef(false);
  const [importOpen, setImportOpen] = useState(false);

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

  // Pagination state
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => { setCurrentPage(1); }, [filteredList]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));

  const sortedFilteredList = useMemo(() => {
    const rows = [...filteredList];
    rows.sort((a, b) => {
      const direction = sortDir === "asc" ? 1 : -1;
      const aTitle = String(a.title || "");
      const bTitle = String(b.title || "");
      let cmp = 0;

      if (sortKey === "group_no") {
        const aNo = Number(a.group_no);
        const bNo = Number(b.group_no);
        const aValue = Number.isFinite(aNo) ? aNo : Number.POSITIVE_INFINITY;
        const bValue = Number.isFinite(bNo) ? bNo : Number.POSITIVE_INFINITY;
        cmp = aValue - bValue;
      } else if (sortKey === "title") {
        cmp = aTitle.localeCompare(bTitle, "tr", { sensitivity: "base", numeric: true });
      } else if (sortKey === "members") {
        cmp = membersToString(a.members).localeCompare(membersToString(b.members), "tr", { sensitivity: "base", numeric: true });
      } else if (sortKey === "avg_score") {
        const aAvg = Number(projectAvgMap.get(a.id));
        const bAvg = Number(projectAvgMap.get(b.id));
        const aValue = Number.isFinite(aAvg) ? aAvg : Number.NEGATIVE_INFINITY;
        const bValue = Number.isFinite(bAvg) ? bAvg : Number.NEGATIVE_INFINITY;
        cmp = aValue - bValue;
      } else if (sortKey === "updated_at") {
        const aTs = Date.parse(a.updated_at || "");
        const bTs = Date.parse(b.updated_at || "");
        const aValue = Number.isFinite(aTs) ? aTs : Number.NEGATIVE_INFINITY;
        const bValue = Number.isFinite(bTs) ? bTs : Number.NEGATIVE_INFINITY;
        cmp = aValue - bValue;
      }

      if (cmp !== 0) return cmp * direction;
      return aTitle.localeCompare(bTitle, "tr", { sensitivity: "base", numeric: true });
    });
    return rows;
  }, [filteredList, sortKey, sortDir, projectAvgMap]);

  const safePage = Math.min(currentPage, totalPages);
  const pagedList = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedFilteredList.slice(start, start + pageSize);
  }, [sortedFilteredList, safePage, pageSize]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "updated_at" ? "desc" : "asc");
  }

  // KPI stats
  const totalProjects = projectList.length;
  const totalMembers = projectList.reduce((sum, p) => {
    return sum + membersToArray(p.members).length;
  }, 0);

  function openEditDrawer(project) {
    setEditDrawerProject({
      id: project.id,
      groupNo: project.group_no,
      title: project.title || "",
      advisor: project.advisor || "",
      description: project.description || "",
      members: membersToArray(project.members),
    });
    setEditDrawerOpen(true);
    setOpenMenuId(null);
  }

  async function handleEditSave(id, data) {
    const project = (projects.projects || []).find((p) => p.id === id);
    const result = await projects.handleEditProject({
      id,
      title: data.title,
      advisor: data.advisor,
      description: data.description,
      group_no: project?.group_no,
      members: data.members,
    });
    if (result?.ok === false) throw new Error(result.message || "Could not save project.");
  }

  async function handleAddSave(data) {
    const result = await projects.handleAddProject({
      title: data.title,
      advisor: data.advisor,
      description: data.description,
      group_no: parseInt(data.groupNo, 10) || (totalProjects + 1),
      members: data.members,
    });
    if (result?.ok === false) {
      const fieldErr = result.fieldErrors?.group_no;
      throw new Error(fieldErr || result.message || "Could not add project.");
    }
  }

  function openDrawer(project) {
    setDrawerProject(project);
  }

  return (
    <div id="page-projects">
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
      <div className="jurors-toolbar mobile-toolbar-stack">
        <div className="jurors-search-wrap mobile-toolbar-search">
          <Icon
            iconNode={[]}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </Icon>
          <input
            className="search-input"
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterButton
          className="mobile-toolbar-filter"
          activeCount={0}
          isOpen={filterOpen}
          onClick={() => { setFilterOpen((v) => !v); setExportOpen(false); }}
        />
        <div className="jurors-toolbar-spacer mobile-toolbar-spacer" />
        <button className="btn btn-outline btn-sm mobile-toolbar-export" onClick={() => { setExportOpen((v) => !v); setFilterOpen(false); }}>
          <Icon
            iconNode={[]}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ verticalAlign: "-1px" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </Icon>
          {" "}Export
        </button>
        <button className="btn btn-outline btn-sm mobile-toolbar-secondary" onClick={() => setImportOpen(true)}>
          <Icon
            iconNode={[]}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ verticalAlign: "-1px" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </Icon>
          {" "}Import
        </button>
        <button
          className="btn btn-primary btn-sm mobile-toolbar-secondary"
          style={{ width: "auto", padding: "6px 14px", fontSize: "12px", background: "var(--accent)", boxShadow: "none" }}
          onClick={() => setAddDrawerOpen(true)}
        >
          + Add Project
        </button>
      </div>
      {/* Filter panel */}
      {filterOpen && (
        <div className="filter-panel show">
          <div className="filter-panel-header">
            <div>
              <h4>
                <Filter size={14} style={{ verticalAlign: "-1px", marginRight: "4px", opacity: 0.5, display: "inline" }} />
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
            const rows = sortedFilteredList.map((p) => COLUMNS.map((c) => getProjectCell(p, c.key, projectAvgMap)));
            return generateTableBlob(fmt, {
              filenameType: "Projects", sheetName: "Projects",
              periodName: periods.viewPeriodLabel, tenantCode: activeOrganization?.code || "",
              organization: activeOrganization?.name || "", department: activeOrganization?.institution || "",
              pdfTitle: "VERA — Projects", header, rows,
              colWidths: COLUMNS.map((c) => c.exportWidth),
            });
          }}
          onExport={async (fmt) => {
            try {
              const header = COLUMNS.map((c) => c.label);
              const rows = sortedFilteredList.map((p) => COLUMNS.map((c) => getProjectCell(p, c.key, projectAvgMap)));
              await logExportInitiated({
                action: "export.projects",
                organizationId: activeOrganization?.id || null,
                resourceType: "projects",
                details: {
                  format: fmt,
                  row_count: rows.length,
                  period_name: periods.viewPeriodLabel || null,
                  project_count: rows.length,
                  juror_count: null,
                  filters: {
                    search: search || null,
                  },
                },
              });
              await downloadTable(fmt, {
                filenameType: "Projects", sheetName: "Projects",
                periodName: periods.viewPeriodLabel, tenantCode: activeOrganization?.code || "",
                organization: activeOrganization?.name || "", department: activeOrganization?.institution || "",
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
        <FbAlert variant="danger" style={{ marginBottom: "12px" }}>
          {panelError}
        </FbAlert>
      )}
      {/* Table */}
      <div className="table-wrap" style={{ borderRadius: "var(--radius) var(--radius) 0 0", overflow: openMenuId ? "visible" : undefined }}>
        <table id="projects-main-table">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={`${c.key === "group_no" || c.key === "avg_score" ? "text-center " : ""}sortable${sortKey === c.key ? " sorted" : ""}${c.colClass ? ` ${c.colClass}` : ""}`}
                  style={c.colWidth ? { width: c.colWidth } : {}}
                  onClick={() => handleSort(c.key)}
                >
                  {c.key === "avg_score" && periodMaxScore != null
                    ? `Avg Score (${periodMaxScore})`
                    : c.label} <SortIcon colKey={c.key} sortKey={sortKey} sortDir={sortDir} />
                </th>
              ))}
              <th style={{ width: 48, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingCount > 0 && filteredList.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "32px" }}>
                  Loading projects…
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "48px 24px" }}>
                  {!periods.viewPeriodId ? (
                    <div>
                      <div style={{ color: "var(--text-tertiary)", marginBottom: 12 }}>
                        Create an evaluation period first, then add projects to it.
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ width: "auto", padding: "8px 20px" }}
                        onClick={() => onNavigate?.("periods")}
                      >
                        Go to Evaluation Periods
                      </button>
                    </div>
                  ) : (
                    <div style={{ color: "var(--text-tertiary)" }}>
                      No projects found. Click "+ Add Project" or "Import" to get started.
                    </div>
                  )}
                </td>
              </tr>
            ) : pagedList.map((project) => (
              <tr key={project.id} onClick={() => openDrawer(project)}>
                <td className="text-center col-no" data-label="No">
                  <span className="mobile-rank-ring" aria-hidden="true">
                    <span
                      className="mobile-rank-ring-fill"
                      style={(() => {
                        const avg = projectAvgMap.get(project.id);
                        const max = periodMaxScore || 100;
                        const pct = avg != null && Number.isFinite(Number(avg))
                          ? Math.min(360, (Number(avg) / max) * 360)
                          : 0;
                        return {
                          "--pct": `${pct}deg`,
                          "--ring": scoreBandToken(avg, max),
                        };
                      })()}
                    >
                      <span className="mobile-rank-ring-inner">
                        <span className="mobile-rank-ring-num">
                          {projectAvgMap.has(project.id)
                            ? Math.round(Number(projectAvgMap.get(project.id)))
                            : "—"}
                        </span>
                        <span className="mobile-rank-ring-lbl">AVG</span>
                      </span>
                    </span>
                  </span>
                  {project.group_no != null
                    ? <span className="project-no-badge">P{project.group_no}</span>
                    : <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>—</span>}
                </td>
                <td data-label="Project Title" className="col-title">
                  <span className="mobile-eyebrow">
                    PROJECT{project.group_no != null ? ` · P${project.group_no}` : ""}
                  </span>
                  <div className="proj-title-text">{project.title}</div>
                  {project.advisor && (() => {
                    const advisors = project.advisor.split(",").map((s) => s.trim()).filter(Boolean);
                    if (!advisors.length) return null;
                    return (
                      <>
                        <div className="proj-advisors">
                          <div className="proj-advisors-eyebrow">Advised by</div>
                          <div className="proj-advisors-row">
                            {advisors.map((name, i) => (
                              <JurorBadge key={`${name}-${i}`} name={name} size="sm" nameOnly />
                            ))}
                          </div>
                        </div>
                        <div className="advisor-mobile-line">
                          <UserRound size={12} strokeWidth={2} style={{ color: "var(--text-quaternary)", flexShrink: 0 }} />
                          <span>{advisors.join(", ")}</span>
                        </div>
                      </>
                    );
                  })()}
                </td>
                <td className="col-members" data-label="Team Members">
                  <span className="members-text"><StudentNames names={project.members} /></span>
                  <span className="members-chips-wrap">
                    <span className="members-chips-label">Team</span>
                    <MemberChips members={project.members} />
                  </span>
                </td>
                <td className="text-center avg-score-cell" data-label="Avg Score">
                  {projectAvgMap.has(project.id)
                    ? <>
                        <span className="avg-score-value">{projectAvgMap.get(project.id)}</span>
                        {periodMaxScore != null && <span className="avg-score-max"> /{periodMaxScore}</span>}
                      </>
                    : <span className="avg-score-empty">—</span>}
                </td>
                <td className="col-updated" data-label="Last Updated">
                  <PremiumTooltip text={formatFull(project.updated_at)}>
                    <span className="vera-datetime-text">{formatRelative(project.updated_at)}</span>
                  </PremiumTooltip>
                </td>
                <td className="col-actions" style={{ textAlign: "right" }}>
                  <FloatingMenu
                    isOpen={openMenuId === project.id}
                    onClose={() => setOpenMenuId(null)}
                    placement="bottom-end"
                    trigger={
                      <button
                        className="juror-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((prev) => (prev === project.id ? null : project.id));
                        }}
                        title="Actions"
                      >
                        <MoreVertical size={14} />
                      </button>
                    }
                  >
                    <button className="floating-menu-item" onMouseDown={() => { setOpenMenuId(null); openEditDrawer(project); }}>
                      <Pencil size={13} />
                      Edit Project
                    </button>
                    <button
                      className="floating-menu-item"
                      onMouseDown={() => { setOpenMenuId(null); setScoresProject(project); }}
                    >
                      <BarChart2 size={13} />
                      View Scores
                    </button>
                    <div className="floating-menu-divider" />
                    <button
                      className="floating-menu-item danger"
                      onMouseDown={() => {
                        setOpenMenuId(null);
                        setDeleteTarget(project);
                      }}
                    >
                      <Trash2 size={13} />
                      Delete Project
                    </button>
                  </FloatingMenu>
                </td>
                <td className="col-footer" aria-hidden="true">
                  <span><strong>{membersToArray(project.members).length}</strong> members</span>
                  <span><strong>{projectEvalCountMap.get(project.id) ?? 0}</strong> evaluations</span>
                  <PremiumTooltip text={formatFull(project.updated_at) || "—"}>
                    <span>{formatRelative(project.updated_at)}</span>
                  </PremiumTooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={filteredList.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        itemLabel="projects"
      />
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
              <div style={{ marginTop: "6px" }}>
                {drawerProject.group_no != null
                  ? <span className="project-no-badge">P{drawerProject.group_no}</span>
                  : <span className="text-xs text-muted">—</span>}
              </div>
            </div>
            <div className="juror-drawer-details" style={{ marginTop: "8px" }}>
              {drawerProject.advisor && (
                <div className="juror-drawer-row">
                  <span className="juror-drawer-row-label">Advisor</span>
                  <span className="juror-drawer-row-value">{drawerProject.advisor}</span>
                </div>
              )}
              <div className="juror-drawer-row">
                <span className="juror-drawer-row-label">Team Members</span>
                <span className="juror-drawer-row-value">
                  <StudentNames names={drawerProject.members} />
                  {!membersToArray(drawerProject.members).length ? "—" : null}
                </span>
              </div>
              <div className="juror-drawer-row">
                <span className="juror-drawer-row-label">Last Updated</span>
                <span className="juror-drawer-row-value">
                  <PremiumTooltip text={formatFull(drawerProject.updated_at)}>
                    <span>{formatRelative(drawerProject.updated_at)}</span>
                  </PremiumTooltip>
                </span>
              </div>
            </div>
            <div className="juror-drawer-actions">
              <button className="btn btn-outline btn-sm" onClick={() => { const p = drawerProject; setDrawerProject(null); openEditDrawer(p); }}>
                <Icon
                  iconNode={[]}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </Icon>
                Edit Project
              </button>
              <button
                className="btn btn-outline btn-sm"
                style={{ color: "var(--danger)", borderColor: "rgba(225,29,72,0.3)" }}
                onClick={() => {
                  const t = drawerProject;
                  setDrawerProject(null);
                  setDeleteTarget(t);
                }}
              >
                <Icon
                  iconNode={[]}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </Icon>
                Delete Project
              </button>
            </div>
          </div>
        </>
      )}
      {/* Edit project drawer */}
      <EditProjectDrawer
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        project={editDrawerProject}
        onSave={handleEditSave}
      />
      {/* Add project drawer */}
      <AddProjectDrawer
        open={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        onSave={handleAddSave}
      />
      <ImportCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        parseFile={(f) => parseProjectsCsv(f, projects.projects)}
        onImport={async (rows) => {
          cancelImportRef.current = false;
          const result = await projects.handleImportProjects(rows, { cancelRef: cancelImportRef });
          if (result?.ok === false) throw new Error(result.formError || "Import failed.");
          return result;
        }}
      />
      <ProjectScoresDrawer
        open={!!scoresProject}
        onClose={() => setScoresProject(null)}
        project={scoresProject}
        periodId={periods.viewPeriodId}
        periodLabel={periods.viewPeriodLabel}
        rawScores={rawScores}
        summaryData={summaryData}
        allJurors={allJurors}
        onOpenReviews={() => onNavigate?.("reviews")}
      />
      <DeleteProjectModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        project={deleteTarget}
        impact={deleteImpact}
        periodName={sortedPeriods?.find((p) => p.id === selectedPeriodId)?.name}
        onDelete={async () => {
          await projects.handleDeleteProject(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
