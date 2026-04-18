// src/admin/pages/ProjectsPage.jsx — Phase 7
// Projects management page. Structure from prototype lines 14001–14241.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Pagination from "@/shared/ui/Pagination";
import { useAdminContext } from "../hooks/useAdminContext";
import { ClipboardList, Filter, UserRound, MoreVertical, Pencil, Copy, Trash2, Icon, FolderOpen, Upload, Plus, Info, LockKeyhole, Lock, Download, Search, XCircle } from "lucide-react";
import { useToast } from "@/shared/hooks/useToast";
import { useAuth } from "@/auth";
import FbAlert from "@/shared/ui/FbAlert";
import DeleteProjectModal from "../modals/DeleteProjectModal";
import { FilterButton } from "@/shared/ui/FilterButton";
import CustomSelect from "@/shared/ui/CustomSelect";
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
import useCardSelection from "@/shared/hooks/useCardSelection";
import { formatDateTime as formatFull } from "@/shared/lib/dateUtils";
import "../../styles/pages/projects.css";

// ── Column config — single source of truth for table headers and export ──
const COLUMNS = [
  { key: "group_no",   label: "No",            colWidth: "4%",  exportWidth: 8  },
  { key: "title",      label: "Project Title",  colWidth: "38%", exportWidth: 36 },
  { key: "members",    label: "Team Members",   colWidth: "28%", exportWidth: 42, colClass: "col-members" },
  { key: "avg_score",  label: "Avg Score",      colWidth: "9%",  exportWidth: 10 },
  { key: "updated_at", label: "Last Updated",   colWidth: "13%", exportWidth: 18, colClass: "col-updated" },
];

function getProjectCell(p, key, avgMap) {
  if (key === "group_no")   return p.group_no ?? "";
  if (key === "title")      return p.title ?? "";
  if (key === "members") return membersToString(p.members);
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
    bgRefresh,
  } = useAdminContext();
  const _toast = useToast();
  const { activeOrganization } = useAuth();
  const rowsScopeRef = useCardSelection();
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
    bgRefresh,
  });

  const isLocked = !!(periods.viewPeriod?.is_locked);

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
  const [filters, setFilters] = useState({
    evalStatus: "all",
    advisor:    "",
    scoreBand:  "all",
    teamSize:   "all",
  });
  const [exportOpen, setExportOpen] = useState(false);
  const [sortKey, setSortKey] = useState("group_no");
  const [sortDir, setSortDir] = useState("asc");
  const [openMenuId, setOpenMenuId] = useState(null);

  // Edit / Add drawers
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editDrawerProject, setEditDrawerProject] = useState(null);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);

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

  const distinctAdvisors = useMemo(() => {
    const set = new Set();
    for (const p of projectList) {
      (p.advisor || "").split(",").map((s) => s.trim()).filter(Boolean).forEach((a) => set.add(a));
    }
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [projectList]);

  const filterActiveCount = [
    filters.evalStatus !== "all",
    filters.advisor !== "",
    filters.scoreBand !== "all",
    filters.teamSize !== "all",
  ].filter(Boolean).length;

  // Filter by search + criteria
  const filteredList = useMemo(() => {
    let list = projectList;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        (p.title || "").toLowerCase().includes(q) ||
        membersToString(p.members).toLowerCase().includes(q) ||
        String(p.group_no || "").includes(q)
      );
    }

    list = list.filter((p) => {
      if (filters.evalStatus === "evaluated" && !projectAvgMap.has(p.id)) return false;
      if (filters.evalStatus === "not_evaluated" && projectAvgMap.has(p.id)) return false;

      if (filters.advisor) {
        const advisors = (p.advisor || "").split(",").map((s) => s.trim());
        if (!advisors.includes(filters.advisor)) return false;
      }

      if (filters.scoreBand !== "all" && projectAvgMap.has(p.id)) {
        const max = periodMaxScore || 100;
        const pct = (Number(projectAvgMap.get(p.id)) / max) * 100;
        if (filters.scoreBand === "high" && pct < 85) return false;
        if (filters.scoreBand === "mid" && (pct < 70 || pct >= 85)) return false;
        if (filters.scoreBand === "low" && pct >= 70) return false;
      }

      if (filters.teamSize !== "all") {
        const count = membersToArray(p.members).length;
        if (filters.teamSize === "small" && count > 2) return false;
        if (filters.teamSize === "mid" && (count < 3 || count > 4)) return false;
        if (filters.teamSize === "large" && count < 5) return false;
      }

      return true;
    });

    return list;
  }, [projectList, search, filters, projectAvgMap, periodMaxScore]);

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
  const kpiBase = filteredList.length !== projectList.length ? filteredList : projectList;
  const kpiTotalProjects = kpiBase.length;
  const kpiTotalMembers = kpiBase.reduce((sum, p) => sum + membersToArray(p.members).length, 0);
  const kpiEvaluated = kpiBase.filter((p) => projectAvgMap.has(p.id)).length;

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

  async function handleDuplicate(project) {
    setOpenMenuId(null);
    const maxNo = Math.max(0, ...projectList.map((p) => Number(p.group_no) || 0));
    const result = await projects.handleAddProject({
      title: `Copy of ${project.title}`.slice(0, 100),
      advisor: project.advisor || "",
      description: project.description || "",
      group_no: maxNo + 1,
      members: membersToArray(project.members),
    });
    if (result?.ok === false) {
      _toast.error(result.message || "Could not duplicate project.");
    } else {
      _toast.success("Project duplicated.");
    }
  }

  return (
    <div id="page-projects">
      {/* Header */}
      <div className="sem-header">
        <div className="sem-header-left">
          <div className="page-title">Projects</div>
          <div className="page-desc">Manage project records, student teams, and evaluation coverage for the active term.</div>
        </div>
        <div className="sem-header-actions mobile-toolbar-stack">
          <div className="jurors-search-wrap mobile-toolbar-search">
            <Search size={14} strokeWidth={2} style={{ opacity: 0.45 }} />
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
            activeCount={filterActiveCount}
            isOpen={filterOpen}
            onClick={() => { setFilterOpen((v) => !v); setExportOpen(false); }}
          />
          <button className="btn btn-outline btn-sm mobile-toolbar-export" onClick={() => { setExportOpen((v) => !v); setFilterOpen(false); }}>
            <Download size={14} strokeWidth={2} style={{ verticalAlign: "-1px" }} />
            {" "}Export
          </button>
          <button className="btn btn-outline btn-sm mobile-toolbar-secondary" onClick={() => !isLocked && setImportOpen(true)} disabled={isLocked}>
            <Upload size={14} strokeWidth={2} style={{ verticalAlign: "-1px" }} />
            {" "}Import
          </button>
          <button
            className="btn btn-primary btn-sm mobile-toolbar-primary"
            onClick={() => !isLocked && setAddDrawerOpen(true)}
            disabled={isLocked}
          >
            <Plus size={13} strokeWidth={2.2} />
            Add Project
          </button>
        </div>
      </div>
      {/* KPI strip */}
      <div className="scores-kpi-strip">
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{kpiTotalProjects}</div>
          <div className="scores-kpi-item-label">Projects</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{kpiTotalMembers}</div>
          <div className="scores-kpi-item-label">Team Members</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{kpiEvaluated} / {kpiTotalProjects}</div>
          <div className="scores-kpi-item-label">Evaluated</div>
        </div>
      </div>
      <button
        className="btn btn-primary btn-sm mobile-primary-below-kpi"
        onClick={() => !isLocked && setAddDrawerOpen(true)}
        disabled={isLocked}
      >
        <Plus size={13} strokeWidth={2.2} />
        Add Project
      </button>
      {/* Lock banner */}
      {isLocked && periods.viewPeriodId && (
        <div className="lock-notice">
          <div className="lock-notice-left">
            <div className="lock-notice-icon-wrap">
              <LockKeyhole size={20} strokeWidth={1.8} />
            </div>
            <div className="lock-notice-badge">locked</div>
          </div>
          <div className="lock-notice-body">
            <div className="lock-notice-title">Evaluation in progress — project list locked</div>
            <div className="lock-notice-desc">
              Projects cannot be added, edited, or deleted while scores exist for this period.
            </div>
            <div className="lock-notice-chips">
              <span className="lock-notice-chip active"><ClipboardList size={11} strokeWidth={2} /> View Scores</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Add Projects</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Import CSV</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Edit Projects</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Duplicate Projects</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Delete Projects</span>
            </div>
          </div>
        </div>
      )}
      {/* Filter panel */}
      {filterOpen && (
        <div className="filter-panel show">
          <div className="filter-panel-header">
            <div>
              <h4>
                <Filter size={14} style={{ verticalAlign: "-1px", marginRight: "4px", opacity: 0.5, display: "inline" }} />
                Filter Projects
              </h4>
              <div className="filter-panel-sub">Narrow projects by evaluation coverage, advisor, score band, or team size.</div>
            </div>
            <button className="filter-panel-close" onClick={() => setFilterOpen(false)}>&#215;</button>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label>Evaluation Status</label>
              <div className="filter-toggle-group">
                {[["all", "All"], ["evaluated", "Evaluated"], ["not_evaluated", "Not Evaluated"]].map(([val, lbl]) => (
                  <button
                    key={val}
                    className={`filter-toggle-btn${filters.evalStatus === val ? " filter-toggle-btn--active" : ""}`}
                    onClick={() => setFilters((f) => ({ ...f, evalStatus: val }))}
                  >{lbl}</button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <label>Advisor</label>
              <CustomSelect
                compact
                value={filters.advisor}
                onChange={(val) => setFilters((f) => ({ ...f, advisor: val }))}
                options={[{ value: "", label: "All Advisors" }, ...distinctAdvisors.map((a) => ({ value: a, label: a }))]}
                placeholder="All Advisors"
                ariaLabel="Advisor"
              />
            </div>
            <div className="filter-group">
              <label>Score Band</label>
              <div className="filter-toggle-group">
                {[["all", "All"], ["high", "High ≥85%"], ["mid", "Mid 70–84%"], ["low", "Low <70%"]].map(([val, lbl]) => (
                  <button
                    key={val}
                    className={`filter-toggle-btn${filters.scoreBand === val ? " filter-toggle-btn--active" : ""}`}
                    onClick={() => setFilters((f) => ({ ...f, scoreBand: val }))}
                  >{lbl}</button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <label>Team Size</label>
              <div className="filter-toggle-group">
                {[["all", "All"], ["small", "1–2"], ["mid", "3–4"], ["large", "5+"]].map(([val, lbl]) => (
                  <button
                    key={val}
                    className={`filter-toggle-btn${filters.teamSize === val ? " filter-toggle-btn--active" : ""}`}
                    onClick={() => setFilters((f) => ({ ...f, teamSize: val }))}
                  >{lbl}</button>
                ))}
              </div>
            </div>
            {filterActiveCount > 0 && (
              <button
                className="btn btn-outline btn-sm filter-clear-btn"
                onClick={() => setFilters({ evalStatus: "all", advisor: "", scoreBand: "all", teamSize: "all" })}
              >
                <XCircle size={12} strokeWidth={2} style={{ opacity: 0.5, verticalAlign: "-1px" }} />
                {" "}Clear all
              </button>
            )}
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
          department={activeOrganization?.institution || ""}
          onClose={() => setExportOpen(false)}
          generateFile={async (fmt) => {
            const header = COLUMNS.map((c) => c.key === "avg_score" && periodMaxScore != null ? `Avg Score (${periodMaxScore})` : c.label);
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
              const header = COLUMNS.map((c) => c.key === "avg_score" && periodMaxScore != null ? `Avg Score (${periodMaxScore})` : c.label);
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
      <div className="table-wrap table-wrap--split">
        <table id="projects-main-table" className="table-standard table-pill-balance">
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
              <th style={{ width: "8%", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody ref={rowsScopeRef}>
            {loadingCount > 0 && filteredList.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "32px" }}>
                  Loading projects…
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr className="es-row">
                <td colSpan={7} style={{ padding: 0 }}>
                  {!periods.viewPeriodId && !periods.periodList?.length ? (
                    /* Case 1: no periods exist at all */
                    <div style={{ display: "flex", justifyContent: "center", padding: "40px 24px" }}>
                      <div className="vera-es-card">
                        <div className="vera-es-hero vera-es-hero--fw">
                          <div className="vera-es-icon vera-es-icon--fw">
                            <FolderOpen size={22} strokeWidth={1.65} />
                          </div>
                          <div>
                            <div className="vera-es-title">No evaluation periods yet</div>
                            <div className="vera-es-desc">
                              Projects are organized by evaluation period. Create a period first, then start adding your capstone projects to it.
                            </div>
                          </div>
                        </div>
                        <div className="vera-es-actions">
                          <button
                            className="vera-es-action vera-es-action--primary-fw"
                            onClick={() => onNavigate?.("periods")}
                          >
                            <div className="vera-es-num vera-es-num--fw">1</div>
                            <div className="vera-es-action-text">
                              <div className="vera-es-action-label">Go to Evaluation Periods</div>
                              <div className="vera-es-action-sub">Create a period to unlock project management</div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : !periods.viewPeriodId ? (
                    /* Case 2: periods exist but none selected */
                    <div style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-tertiary)", fontSize: 13 }}>
                      Select an evaluation period above to manage projects.
                    </div>
                  ) : projectList.length > 0 ? (
                    /* Case 2b: projects exist but filters/search hide them all */
                    <div className="vera-es-no-data">
                      <div className="vera-es-icon vera-es-icon--project">
                        <Search size={20} strokeWidth={1.8} />
                      </div>
                      <div className="vera-es-no-data-title">No projects match your filters</div>
                      <div className="vera-es-no-data-desc">
                        {filterActiveCount > 0 && search.trim()
                          ? "Try adjusting your search or clearing active filters to see more projects."
                          : filterActiveCount > 0
                            ? "Try adjusting or clearing the active filters to see more projects."
                            : "No projects match your current search. Try a different keyword."}
                      </div>
                      <div className="vera-es-no-data-actions">
                        {search.trim() && (
                          <button className="btn btn-outline btn-sm" onClick={() => setSearch("")}>
                            <XCircle size={13} strokeWidth={2} /> Clear search
                          </button>
                        )}
                        {filterActiveCount > 0 && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setFilters({ evalStatus: "all", advisor: "", scoreBand: "all", teamSize: "all" })}
                          >
                            <XCircle size={13} strokeWidth={2.2} /> Clear filters
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Case 3: period selected but no projects */
                    <div className="vera-es-no-data">
                      <div className="vera-es-ghost-rows" aria-hidden="true">
                        <div className="vera-es-ghost-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px" }}>
                          <div className="vera-es-ghost-num" />
                          <div className="vera-es-ghost-bar" style={{ width: 140 }} />
                          <div className="vera-es-ghost-spacer" />
                          <div className="vera-es-ghost-bar" style={{ width: 72 }} />
                          <div className="vera-es-ghost-bar" style={{ width: 44 }} />
                        </div>
                        <div className="vera-es-ghost-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px" }}>
                          <div className="vera-es-ghost-num" />
                          <div className="vera-es-ghost-bar" style={{ width: 108 }} />
                          <div className="vera-es-ghost-spacer" />
                          <div className="vera-es-ghost-bar" style={{ width: 72 }} />
                          <div className="vera-es-ghost-bar" style={{ width: 44 }} />
                        </div>
                        <div className="vera-es-ghost-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px" }}>
                          <div className="vera-es-ghost-num" />
                          <div className="vera-es-ghost-bar" style={{ width: 126 }} />
                          <div className="vera-es-ghost-spacer" />
                          <div className="vera-es-ghost-bar" style={{ width: 72 }} />
                          <div className="vera-es-ghost-bar" style={{ width: 44 }} />
                        </div>
                      </div>
                      <div className="vera-es-icon vera-es-icon--project">
                        <FolderOpen size={22} strokeWidth={1.65} />
                      </div>
                      <div className="vera-es-no-data-title">No projects added yet</div>
                      <div className="vera-es-no-data-desc">
                        Add projects individually or import them via CSV. Each project needs a title and group number — team members and advisor can be added later.
                      </div>
                      <div className="vera-es-no-data-actions">
                        <button className="btn btn-outline btn-sm" style={{ whiteSpace: "nowrap" }} onClick={() => !isLocked && setImportOpen(true)} disabled={isLocked}>
                          <Upload size={13} strokeWidth={2} /> Import CSV
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => !isLocked && setAddDrawerOpen(true)} disabled={isLocked}>
                          <Plus size={13} strokeWidth={2.2} /> Add Project
                        </button>
                      </div>
                      <div className="vera-es-no-data-hint">
                        <Info size={12} strokeWidth={2} />
                        CSV columns: <strong>group_no</strong>, <strong>title</strong>, <strong>members</strong> (optional), <strong>advisor</strong> (optional)
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ) : pagedList.map((project) => (
              <tr key={project.id} data-card-selectable="" className="mcard">
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
                        className="row-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((prev) => (prev === project.id ? null : project.id));
                        }}
                        title="Actions"
                      >
                        <MoreVertical size={18} strokeWidth={2} />
                      </button>
                    }
                  >
                    <button
                      className="floating-menu-item"
                      onMouseDown={() => { if (!isLocked) { setOpenMenuId(null); openEditDrawer(project); } }}
                      disabled={isLocked}
                      style={isLocked ? { opacity: 0.4, pointerEvents: "none" } : {}}
                    >
                      <Pencil size={13} />
                      Edit Project
                    </button>
                    <button
                      className="floating-menu-item"
                      onMouseDown={() => { if (!isLocked) handleDuplicate(project); }}
                      disabled={isLocked}
                      style={isLocked ? { opacity: 0.4, pointerEvents: "none" } : {}}
                    >
                      <Copy size={13} />
                      Duplicate Project
                    </button>
                    <button
                      className={`floating-menu-item${isLocked ? " floating-menu-item--highlight" : ""}`}
                      onMouseDown={() => { setOpenMenuId(null); setScoresProject(project); }}
                    >
                      <ClipboardList size={13} />
                      View Scores
                    </button>
                    <div className="floating-menu-divider" />
                    <button
                      className="floating-menu-item danger"
                      onMouseDown={() => {
                        if (!isLocked) { setOpenMenuId(null); setDeleteTarget(project); }
                      }}
                      disabled={isLocked}
                      style={isLocked ? { opacity: 0.4, pointerEvents: "none" } : {}}
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
        parseFile={(f) => parseProjectsCsv(f, projects.projects || [])}
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
