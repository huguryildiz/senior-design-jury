// src/admin/pages/JurorsPage.jsx — Phase 7
// Jurors management page. Structure from prototype lines 13492–13989.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAdminContext } from "../hooks/useAdminContext";
import { useToast } from "@/shared/hooks/useToast";
import { useAuth } from "@/auth";
import { useManagePeriods } from "../hooks/useManagePeriods";
import { useManageProjects } from "../hooks/useManageProjects";
import { useManageJurors } from "../hooks/useManageJurors";
import PinResultModal from "../modals/PinResultModal";
import RemoveJurorModal from "../modals/RemoveJurorModal";
import ResetPinModal from "../modals/ResetPinModal";
import ImportJurorsModal from "../modals/ImportJurorsModal";
import EnableEditingModal from "../modals/EnableEditingModal";
import JurorReviewsModal from "../modals/JurorReviewsModal";
import AddJurorDrawer from "../drawers/AddJurorDrawer";
import EditJurorDrawer from "../drawers/EditJurorDrawer";
import { sendJurorPinEmail, getActiveEntryTokenPlain } from "@/shared/api";
import { parseJurorsCsv } from "../utils/csvParser";
import ExportPanel from "../components/ExportPanel";
import {
  SquarePen,
  Filter,
  LockOpen,
  Lock,
  FileText,
  Trash2,
  Clock,
  MoreVertical,
  Pencil,
  Icon,
} from "lucide-react";
import { downloadTable, generateTableBlob } from "../utils/downloadTable";
import { FilterButton } from "@/shared/ui/FilterButton";
import PremiumTooltip from "@/shared/ui/PremiumTooltip";
import CustomSelect from "@/shared/ui/CustomSelect";
import FbAlert from "@/shared/ui/FbAlert";
import Pagination from "@/shared/ui/Pagination";
import FloatingMenu from "@/shared/ui/FloatingMenu";
import { formatDateTime as formatFull } from "@/shared/lib/dateUtils";
import "../../styles/pages/jurors.css";

// ── Helpers ──────────────────────────────────────────────────

import JurorBadge from "../components/JurorBadge";
import JurorStatusPill from "../components/JurorStatusPill";

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


function formatEditWindowLeft(ts, nowMs = Date.now()) {
  if (!ts) return "";
  const expiresMs = Date.parse(ts);
  if (!Number.isFinite(expiresMs)) return "";
  const diff = expiresMs - nowMs;
  if (diff <= 0) return "window expired";
  if (diff < 60_000) return `${Math.ceil(diff / 1000)}s left`;
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${Math.max(1, mins)}m left`;
}

function isEditWindowActive(ts, nowMs = Date.now()) {
  if (!ts) return false;
  const expiresMs = Date.parse(ts);
  return Number.isFinite(expiresMs) && expiresMs > nowMs;
}

function getLiveOverviewStatus(juror, nowMs = Date.now()) {
  const status = juror?.overviewStatus || "not_started";
  if (status !== "editing") return status;
  return isEditWindowActive(juror?.editExpiresAt || juror?.edit_expires_at, nowMs)
    ? "editing"
    : "completed";
}

function formatEditWindowText(juror, nowMs) {
  const left = formatEditWindowLeft(juror?.editExpiresAt || juror?.edit_expires_at, nowMs);
  return left ? ` (${left})` : "";
}


// ── Column config — single source of truth for table headers and export ──

const JUROR_COLUMNS = [
  { key: "name",       label: "Juror Name",         exportWidth: 28 },
  { key: "progress",   label: "Projects Evaluated",  exportWidth: 20 },
  { key: "avgScore",   label: "Avg. Score",          exportWidth: 14 },
  { key: "status",     label: "Status",              exportWidth: 14 },
  { key: "lastActive", label: "Last Active",          exportWidth: 18 },
];

function getJurorCell(j, key, avgMap) {
  if (key === "name")       return j.juryName || j.juror_name || "";
  if (key === "progress") {
    const scored = j.overviewScoredProjects ?? 0;
    const total  = j.overviewTotalProjects  ?? 0;
    return `${scored} / ${total}`;
  }
  if (key === "avgScore") {
    const jid = String(j.jurorId || j.juror_id || "");
    return avgMap?.get(jid) ?? "—";
  }
  if (key === "status")     return j.overviewStatus || "";
  if (key === "lastActive") {
    const ts = j.lastSeenAt || j.last_activity_at || j.finalSubmittedAt || j.final_submitted_at;
    return formatFull(ts);
  }
  return "";
}


function groupBarColor(scored, total) {
  if (total === 0) return "var(--text-tertiary)";
  if (scored >= total) return "var(--success)";
  if (scored > 0) return "var(--warning)";
  return "var(--text-tertiary)";
}

function groupTextClass(scored, total) {
  if (total === 0) return "jurors-table-groups jt-zero";
  if (scored >= total) return "jurors-table-groups jt-done";
  if (scored > 0) return "jurors-table-groups jt-partial";
  return "jurors-table-groups jt-zero";
}

function mobileScoreStyle(score) {
  if (!score && score !== 0) return { color: "#475569" };
  const n = parseFloat(score);
  if (isNaN(n)) return { color: "#475569" };
  if (n >= 90) return { color: "#34d399" };
  if (n >= 74) return { color: "#60a5fa" };
  if (n >= 60) return { color: "#fb923c" };
  return { color: "#475569" };
}

function mobileBarFill(status) {
  if (status === "completed") return "var(--success)";
  if (status === "editing")   return "#60a5fa";
  if (status === "in_progress" || status === "ready_to_submit") return "var(--warning)";
  return "rgba(100,116,139,0.3)";
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

// ── Component ────────────────────────────────────────────────

export default function JurorsPage() {
  const {
    organizationId,
    selectedPeriodId,
    isDemoMode = false,
    onDirtyChange,
    onCurrentSemesterChange,
    onViewReviews,
    onNavigate,
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

  const projectsHook = useManageProjects({
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

  const jurorsHook = useManageJurors({
    organizationId,
    viewPeriodId: periods.viewPeriodId,
    viewPeriodLabel: periods.viewPeriodLabel,
    projects: projectsHook.projects,
    setMessage,
    incLoading,
    decLoading,
    setPanelError,
    clearPanelError,
    setEvalLockError: periods.setEvalLockError,
  });

  // ── Local UI state ──────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [affilFilter, setAffilFilter] = useState("all");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (affilFilter !== "all" ? 1 : 0);

  const [openMenuId, setOpenMenuId] = useState(null);

  // Import CSV state
  const [importOpen, setImportOpen] = useState(false);

  // Add/edit juror drawers
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [editDrawerJuror, setEditDrawerJuror] = useState(null);

  // Reset PIN modal
  const [pinResetJuror, setPinResetJuror] = useState(null);
  const [pinResetting, setPinResetting] = useState(false);

  // Remove juror modal
  const [removeJuror, setRemoveJuror] = useState(null);
  const [editWindowNowMs, setEditWindowNowMs] = useState(() => Date.now());

  // Enable editing mode modal
  const [editModeJuror, setEditModeJuror] = useState(null);
  const [reviewsJuror, setReviewsJuror] = useState(null);

  // ── Data loading ────────────────────────────────────────────
  useEffect(() => {
    incLoading();
    periods.loadPeriods()
      .catch(() => setPanelError("period", "Could not load periods."))
      .finally(() => decLoading());
  }, [periods.loadPeriods]);

  useEffect(() => {
    if (!periods.viewPeriodId) return;
    incLoading();
    projectsHook.loadProjects()
      .catch(() => setPanelError("project", "Could not load projects."))
      .finally(() => decLoading());
  }, [periods.viewPeriodId, projectsHook.loadProjects]);

  useEffect(() => {
    if (!periods.viewPeriodId) return;
    incLoading();
    jurorsHook.loadJurorsAndEnrich()
      .catch(() => setPanelError("juror", "Could not load jurors."))
      .finally(() => decLoading());
  }, [periods.viewPeriodId, jurorsHook.loadJurorsAndEnrich]);


  const jurorList = jurorsHook.jurors || [];
  const periodMaxScore = jurorsHook.periodMaxScore;

  // Unique affiliations for filter
  const affiliations = useMemo(() => {
    const set = new Set();
    jurorList.forEach((j) => { if (j.affiliation) set.add(j.affiliation); });
    return [...set].sort();
  }, [jurorList]);

  // Filtered + searched list
  const filteredList = useMemo(() => {
    let list = jurorList;
    if (statusFilter !== "all") {
      list = list.filter((j) => getLiveOverviewStatus(j, editWindowNowMs) === statusFilter);
    }
    if (affilFilter !== "all") {
      list = list.filter((j) => (j.affiliation || "").includes(affilFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j) =>
        (j.juror_name || "").toLowerCase().includes(q) ||
        (j.affiliation || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [jurorList, statusFilter, affilFilter, search, editWindowNowMs]);

  // Per-juror average score map (only completed scores, i.e. total != null)
  const jurorAvgMap = useMemo(() => {
    const byJuror = new Map();
    for (const r of jurorsHook.scoreRows || []) {
      if (r.total == null || !r.jurorId) continue;
      if (!byJuror.has(r.jurorId)) byJuror.set(r.jurorId, []);
      byJuror.get(r.jurorId).push(r.total);
    }
    const result = new Map();
    for (const [id, totals] of byJuror) {
      result.set(id, (totals.reduce((s, v) => s + v, 0) / totals.length).toFixed(1));
    }
    return result;
  }, [jurorsHook.scoreRows]);

  // Pagination state
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => { setCurrentPage(1); }, [filteredList]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));

  const sortedFilteredList = useMemo(() => {
    const statusRank = {
      not_started: 1,
      in_progress: 2,
      ready_to_submit: 3,
      editing: 4,
      completed: 5,
    };
    const rows = [...filteredList];
    rows.sort((a, b) => {
      const aName = (a.juryName || a.juror_name || "").trim();
      const bName = (b.juryName || b.juror_name || "").trim();
      const direction = sortDir === "asc" ? 1 : -1;
      let cmp = 0;

      if (sortKey === "name") {
        cmp = aName.localeCompare(bName, "tr", { sensitivity: "base", numeric: true });
      } else if (sortKey === "progress") {
        const aScored = Number(a.overviewScoredProjects || 0);
        const bScored = Number(b.overviewScoredProjects || 0);
        const aTotal = Number(a.overviewTotalProjects || 0);
        const bTotal = Number(b.overviewTotalProjects || 0);
        const aPct = aTotal > 0 ? (aScored / aTotal) * 100 : -1;
        const bPct = bTotal > 0 ? (bScored / bTotal) * 100 : -1;
        cmp = aPct - bPct;
        if (cmp === 0) cmp = aScored - bScored;
        if (cmp === 0) cmp = aTotal - bTotal;
      } else if (sortKey === "avgScore") {
        const aId = String(a.juror_id || a.jurorId || "");
        const bId = String(b.juror_id || b.jurorId || "");
        const aAvg = Number(jurorAvgMap.get(aId));
        const bAvg = Number(jurorAvgMap.get(bId));
        const aValue = Number.isFinite(aAvg) ? aAvg : Number.NEGATIVE_INFINITY;
        const bValue = Number.isFinite(bAvg) ? bAvg : Number.NEGATIVE_INFINITY;
        cmp = aValue - bValue;
      } else if (sortKey === "status") {
        const aStatus = getLiveOverviewStatus(a, editWindowNowMs);
        const bStatus = getLiveOverviewStatus(b, editWindowNowMs);
        cmp = (statusRank[aStatus] || 0) - (statusRank[bStatus] || 0);
      } else if (sortKey === "lastActive") {
        const aTs = Date.parse(a.lastSeenAt || a.last_activity_at || a.finalSubmittedAt || a.final_submitted_at || "");
        const bTs = Date.parse(b.lastSeenAt || b.last_activity_at || b.finalSubmittedAt || b.final_submitted_at || "");
        const aValue = Number.isFinite(aTs) ? aTs : Number.NEGATIVE_INFINITY;
        const bValue = Number.isFinite(bTs) ? bTs : Number.NEGATIVE_INFINITY;
        cmp = aValue - bValue;
      }

      if (cmp !== 0) return cmp * direction;
      return aName.localeCompare(bName, "tr", { sensitivity: "base", numeric: true });
    });
    return rows;
  }, [filteredList, sortKey, sortDir, jurorAvgMap, editWindowNowMs]);

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
    setSortDir(key === "lastActive" ? "desc" : "asc");
  }

  // KPI stats
  const totalJurors = jurorList.length;
  const completedJurors = jurorList.filter((j) => getLiveOverviewStatus(j, editWindowNowMs) === "completed").length;
  const inProgressJurors = jurorList.filter((j) => j.overviewStatus === "in_progress").length;
  const editingJurors = jurorList.filter((j) => getLiveOverviewStatus(j, editWindowNowMs) === "editing").length;
  const readyJurors = jurorList.filter((j) => j.overviewStatus === "ready_to_submit").length;
  const notStartedJurors = jurorList.filter((j) => j.overviewStatus === "not_started").length;

  const editingBannerJurors = useMemo(
    () =>
      jurorList.filter(
        (j) =>
          j.overviewStatus === "editing" &&
          isEditWindowActive(j.editExpiresAt || j.edit_expires_at, editWindowNowMs)
      ),
    [jurorList, editWindowNowMs]
  );

  useEffect(() => {
    if (!editingBannerJurors.length) return;
    setEditWindowNowMs(Date.now());
    const timerId = setInterval(() => {
      setEditWindowNowMs(Date.now());
    }, 1_000);
    return () => clearInterval(timerId);
  }, [editingBannerJurors.length]);

  // ── Modal handlers ──────────────────────────────────────────

  function openAddModal() {
    setAddDrawerOpen(true);
  }

  function openEditModal(juror) {
    setEditDrawerJuror(juror);
    setOpenMenuId(null);
  }

  async function handleSaveAddJuror({ name, affiliation, email }) {
    await jurorsHook.handleAddJuror({ juror_name: name, affiliation, email });
  }

  async function handleSaveEditJuror(jurorId, { name, affiliation, email }) {
    const result = await jurorsHook.handleEditJuror({ jurorId, juror_name: name, affiliation, email });
    if (!result?.ok) throw new Error(result?.message || "Could not update juror.");
  }

  const handleEnableEditMode = async ({ reason, durationMinutes }) => {
    const jurorId = editModeJuror?.juror_id || editModeJuror?.jurorId;
    const result = await jurorsHook.handleToggleJurorEdit({
      jurorId,
      enabled: true,
      reason,
      durationMinutes,
    });
    if (!result?.ok) throw new Error(result?.message || "Could not enable editing mode.");
    setEditModeJuror(null);
  };

  function openPinResetModal(juror) {
    setPinResetJuror(juror);
    setOpenMenuId(null);
  }

  async function handleResetPin() {
    if (!pinResetJuror) return;
    const juror = pinResetJuror;
    setPinResetJuror(null);
    await jurorsHook.resetPinForJuror(juror);
  }

  async function handleSendPinEmail({ email, includeQr }) {
    const info = jurorsHook.resetPinInfo;
    const target = jurorsHook.pinResetTarget;
    if (!info?.pin_plain_once || !email) return;
    let tokenUrl;
    if (includeQr) {
      const pid = selectedPeriodId || periods.viewPeriodId;
      if (pid) {
        const plain = await getActiveEntryTokenPlain(pid);
        if (plain) tokenUrl = `${window.location.origin}${isDemoMode ? "/demo" : ""}/eval?t=${encodeURIComponent(plain)}`;
      }
    }
    await sendJurorPinEmail({
      recipientEmail: email,
      jurorName: target?.juryName || target?.juror_name || info?.juror_name || "",
      jurorAffiliation: target?.affiliation || info?.affiliation || "",
      organizationName: activeOrganization?.name || "",
      organizationId: activeOrganization?.id || undefined,
      jurorId: target?.jurorId || target?.juror_id || undefined,
      pin: info.pin_plain_once,
      tokenUrl,
      periodName: periods.viewPeriodLabel,
    });
  }

  function openRemoveModal(juror) {
    setRemoveJuror(juror);
    setOpenMenuId(null);
  }

  async function handleRemoveJuror() {
    if (!removeJuror) return;
    try {
      await jurorsHook.handleDeleteJuror(removeJuror.juror_id || removeJuror.jurorId);
      setRemoveJuror(null);
    } catch (e) {
      _toast.error(e?.message || "Could not remove juror.");
    }
  }

  return (
    <div id="page-jurors">
      {/* Editing mode banners */}
      {editingBannerJurors.map((j) => (
        <div key={j.jurorId || j.juror_id} className="fb-banner fbb-editing">
          <SquarePen size={16} />
          <span className="fb-banner-text">
            Editing enabled for <strong>{j.juryName || j.juror_name}</strong> — changes will overwrite existing scores
            {formatEditWindowText(j, editWindowNowMs)}
          </span>
          <button
            className="fb-banner-action"
            style={{ color: "var(--fb-editing-text)", background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
            onClick={() => jurorsHook.handleForceCloseJurorEdit({ jurorId: j.jurorId || j.juror_id })}
          >
            Disable editing →
          </button>
        </div>
      ))}
      {/* Header */}
      <div className="jurors-page-header">
        <div className="jurors-page-header-top">
          <div className="jurors-page-header-left">
            <div className="page-title">Jurors</div>
            <div className="page-desc">Manage juror assignments, progress, access, and scoring activity across the active term.</div>
          </div>
        </div>
      </div>
      {/* KPI strip */}
      <div className="scores-kpi-strip">
        <div className="scores-kpi-item"><div className="scores-kpi-item-value">{totalJurors}</div><div className="scores-kpi-item-label">Jurors</div></div>
        <div className="scores-kpi-item"><div className="scores-kpi-item-value"><span className="success">{completedJurors}</span></div><div className="scores-kpi-item-label">Completed</div></div>
        <div className="scores-kpi-item"><div className="scores-kpi-item-value" style={{ color: "var(--warning)" }}>{inProgressJurors}</div><div className="scores-kpi-item-label">In Progress</div></div>
        <div className="scores-kpi-item"><div className="scores-kpi-item-value" style={{ color: "#a78bfa" }}>{editingJurors}</div><div className="scores-kpi-item-label">Editing</div></div>
        <div className="scores-kpi-item"><div className="scores-kpi-item-value"><span className="accent">{readyJurors}</span></div><div className="scores-kpi-item-label">Ready to Submit</div></div>
        <div className="scores-kpi-item"><div className="scores-kpi-item-value">{notStartedJurors}</div><div className="scores-kpi-item-label">Not Started</div></div>
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
            placeholder="Search jurors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterButton
          className="mobile-toolbar-filter"
          activeCount={activeFilterCount}
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
          style={{ width: "auto", padding: "6px 14px", fontSize: "12px" }}
          onClick={openAddModal}
        >
          + Add Juror
        </button>
      </div>
      {/* Filter panel */}
      {filterOpen && (
        <div className="filter-panel show">
          <div className="filter-panel-header">
            <div>
              <h4>
                <Filter size={14} style={{ display: "inline", marginRight: "4px", opacity: 0.5, verticalAlign: "-1px" }} />
                Filter Jurors
              </h4>
              <div className="filter-panel-sub">Narrow jurors by status, affiliation, and scoring progress.</div>
            </div>
            <button className="filter-panel-close" onClick={() => setFilterOpen(false)}>&#215;</button>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label>Status</label>
              <CustomSelect
                compact
                value={statusFilter}
                onChange={(v) => setStatusFilter(v)}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "completed", label: "Completed" },
                  { value: "in_progress", label: "In Progress" },
                  { value: "not_started", label: "Not Started" },
                  { value: "editing", label: "Editing" },
                  { value: "ready_to_submit", label: "Ready to Submit" },
                ]}
                ariaLabel="Status"
              />
            </div>
            <div className="filter-group">
              <label>Affiliation</label>
              <CustomSelect
                compact
                value={affilFilter}
                onChange={(v) => setAffilFilter(v)}
                options={[
                  { value: "all", label: "All affiliations" },
                  ...affiliations.map((a) => ({ value: a, label: a })),
                ]}
                ariaLabel="Affiliation"
              />
            </div>
            <button className="btn btn-outline btn-sm filter-clear-btn" onClick={() => { setStatusFilter("all"); setAffilFilter("all"); }}>
              <Icon
                iconNode={[]}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.5 }}>
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </Icon>
              {" "}Clear all
            </button>
          </div>
        </div>
      )}
      {/* Export panel */}
      {exportOpen && (
        <ExportPanel
          title="Export Jurors"
          subtitle="Download the juror roster with status, affiliation, and scoring progress."
          meta={`${periods.viewPeriodLabel} · ${totalJurors} jurors`}
          periodName={periods.viewPeriodLabel}
          organization={activeOrganization?.name || ""}
          onClose={() => setExportOpen(false)}
          generateFile={async (fmt) => {
    const header = JUROR_COLUMNS.map((c) => c.label);
    const rows = sortedFilteredList.map((j) => JUROR_COLUMNS.map((c) => getJurorCell(j, c.key, jurorAvgMap)));
    return generateTableBlob(fmt, {
      filenameType: "Jurors", sheetName: "Jurors",
      periodName: periods.viewPeriodLabel, tenantCode: activeOrganization?.code || "",
      organization: activeOrganization?.name || "", department: activeOrganization?.institution || "",
      pdfTitle: "VERA — Jurors", header, rows,
      colWidths: JUROR_COLUMNS.map((c) => c.exportWidth),
    });
  }}
          onExport={async (fmt) => {
    try {
      const header = JUROR_COLUMNS.map((c) => c.label);
      const rows = sortedFilteredList.map((j) => JUROR_COLUMNS.map((c) => getJurorCell(j, c.key, jurorAvgMap)));
      await downloadTable(fmt, {
        filenameType: "Jurors", sheetName: "Jurors",
        periodName: periods.viewPeriodLabel, tenantCode: activeOrganization?.code || "",
        organization: activeOrganization?.name || "", department: activeOrganization?.institution || "",
        pdfTitle: "VERA — Jurors", header, rows,
        colWidths: JUROR_COLUMNS.map((c) => c.exportWidth),
      });
      setExportOpen(false);
      const fmtLabel = fmt === "pdf" ? "PDF" : fmt === "csv" ? "CSV" : "Excel";
      _toast.success(`${filteredList.length} juror${filteredList.length !== 1 ? "s" : ""} exported · ${fmtLabel}`);
    } catch (e) {
      _toast.error(e?.message || "Jurors export failed — please try again");
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
        <table id="jurors-main-table">
          <thead>
            <tr>
              <th className={`sortable${sortKey === "name" ? " sorted" : ""}`} onClick={() => handleSort("name")}>
                Juror Name <SortIcon colKey="name" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={`text-center sortable${sortKey === "progress" ? " sorted" : ""}`} onClick={() => handleSort("progress")}>
                Projects Evaluated <SortIcon colKey="progress" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={`text-center sortable${sortKey === "avgScore" ? " sorted" : ""}`} onClick={() => handleSort("avgScore")}>
                Average Score{periodMaxScore != null ? ` (${periodMaxScore})` : ""} <SortIcon colKey="avgScore" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={`sortable${sortKey === "status" ? " sorted" : ""}`} onClick={() => handleSort("status")}>
                Status <SortIcon colKey="status" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={`sortable${sortKey === "lastActive" ? " sorted" : ""}`} onClick={() => handleSort("lastActive")}>
                Last Active <SortIcon colKey="lastActive" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th style={{ width: "48px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody className={openMenuId ? "has-open-menu" : ""}>
            {loadingCount > 0 && filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "32px" }}>
                  Loading jurors…
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "48px 24px" }}>
                  {!periods.viewPeriodId ? (
                    <div>
                      <div style={{ color: "var(--text-tertiary)", marginBottom: 12 }}>
                        Create an evaluation period first, then add jurors to it.
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
                      No jurors found. Click "+ Add Juror" to get started.
                    </div>
                  )}
                </td>
              </tr>
            ) : pagedList.map((juror) => {
              const jid = juror.juror_id || juror.jurorId;
              const name = juror.juryName || juror.juror_name || "";
              const scored = juror.overviewScoredProjects || 0;
              const total = juror.overviewTotalProjects || 0;
              const pct = total > 0 ? Math.round((scored / total) * 100) : 0;
              const status = getLiveOverviewStatus(juror, editWindowNowMs);
              const lastActive = juror.lastSeenAt || juror.last_activity_at || juror.finalSubmittedAt || juror.final_submitted_at;

              return (
                <tr key={jid} onClick={() => openEditModal(juror)}>
                  <td className="col-juror">
                    <JurorBadge name={name} affiliation={juror.affiliation} size="sm" />
                  </td>
                  <td className="col-projects text-center">
                    <span className={groupTextClass(scored, total)}>
                      {scored} / {total}
                      <span className="jurors-group-bar">
                        <span className="jurors-group-bar-fill" style={{ width: `${pct}%`, background: groupBarColor(scored, total) }} />
                      </span>
                    </span>
                  </td>
                  <td className="col-avg text-center avg-score-cell">
                    {jurorAvgMap.get(String(jid)) ? (
                      <>
                        <span className="avg-score-value">{jurorAvgMap.get(String(jid))}</span>
                        {periodMaxScore != null && <span className="avg-score-max"> /{periodMaxScore}</span>}
                      </>
                    ) : (
                      <span className="avg-score-empty">—</span>
                    )}
                  </td>
                  <td className="col-status">
                    <JurorStatusPill status={status} />
                  </td>
                  <td className="col-active jurors-table-active">
                    <PremiumTooltip text={formatFull(lastActive)}>
                      <span className="vera-datetime-text">{formatRelative(lastActive)}</span>
                    </PremiumTooltip>
                  </td>
                  <td className="col-actions" style={{ textAlign: "right" }}>
                    <FloatingMenu
                      isOpen={openMenuId === jid}
                      onClose={() => setOpenMenuId(null)}
                      placement="bottom-end"
                      trigger={
                        <button
                          className="juror-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId((prev) => (prev === jid ? null : jid));
                          }}
                          title="Actions"
                        >
                          <MoreVertical size={14} />
                        </button>
                      }
                    >
                      <button className="floating-menu-item" onMouseDown={() => { setOpenMenuId(null); openEditModal(juror); }}>
                        <Pencil size={13} />
                        Edit Juror
                      </button>
                      <button className="floating-menu-item" onMouseDown={() => { setOpenMenuId(null); openPinResetModal(juror); }}>
                        <Lock size={13} />
                        Reset PIN
                      </button>
                      <div className="floating-menu-divider" />
                      {status !== "editing" && (
                        status === "completed" ? (
                          <button
                            className="floating-menu-item"
                            onMouseDown={() => {
                              setOpenMenuId(null);
                              setEditModeJuror(juror);
                            }}
                          >
                            <LockOpen size={13} />
                            Enable Editing Mode
                          </button>
                        ) : (
                          <PremiumTooltip text="Juror must complete their submission before editing can be unlocked.">
                            <button
                              className="floating-menu-item disabled"
                              disabled
                            >
                              <Lock size={13} />
                              Enable Editing Mode
                            </button>
                          </PremiumTooltip>
                        )
                      )}
                      <button
                        className="floating-menu-item"
                        onMouseDown={() => {
                          setOpenMenuId(null);
                          setReviewsJuror(juror);
                        }}
                      >
                        <FileText size={13} />
                        View Reviews
                      </button>
                      <div className="floating-menu-divider" />
                      <button className="floating-menu-item danger" onMouseDown={() => { setOpenMenuId(null); openRemoveModal(juror); }}>
                        <Trash2 size={13} />
                        Remove Juror
                      </button>
                    </FloatingMenu>
                  </td>
                  {/* Mobile card — hidden on desktop, shown at ≤768px */}
                  <td className="col-mobile-card">
                    <div className={`jc${openMenuId === jid ? " menu-open" : ""}`}>
                      <div className="jc-main">
                        <JurorBadge name={name} affiliation={juror.affiliation} size="lg" />
                        <div className="jc-right">
                          <JurorStatusPill status={status} />
                          <FloatingMenu
                            isOpen={openMenuId === jid}
                            onClose={() => setOpenMenuId(null)}
                            placement="bottom-end"
                            trigger={
                              <button
                                className="jc-kebab"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId((prev) => (prev === jid ? null : jid));
                                }}
                              >
                                ···
                              </button>
                            }
                          >
                            <button className="floating-menu-item" onMouseDown={() => { setOpenMenuId(null); openEditModal(juror); }}>
                              <SquarePen size={13} />
                              Edit Juror
                            </button>
                            <button className="floating-menu-item" onMouseDown={() => { setOpenMenuId(null); openPinResetModal(juror); }}>
                              <Lock size={13} />
                              Reset PIN
                            </button>
                            <button className="floating-menu-item" onMouseDown={() => { setOpenMenuId(null); setReviewsJuror(juror); }}>
                              <FileText size={13} />
                              View Reviews
                            </button>
                            <div className="floating-menu-divider" />
                            <button className="floating-menu-item danger" onMouseDown={() => { setOpenMenuId(null); openRemoveModal(juror); }}>
                              <Trash2 size={13} />
                              Remove Juror
                            </button>
                          </FloatingMenu>
                        </div>
                      </div>
                      <div className="jc-divider" />
                      <div className="jc-progress">
                        <div className="jc-bar-wrap">
                          {total > 0 && (
                            <div
                              className="jc-bar-fill"
                              style={{ width: `${pct}%`, background: mobileBarFill(status) }}
                            />
                          )}
                        </div>
                        <span className="jc-proj-count">
                          {total > 0
                            ? <><span>{scored}</span>/{total}</>
                            : <span style={{ color: "var(--text-tertiary)" }}>0/0</span>
                          }
                        </span>
                      </div>
                      {lastActive && (
                        <div className="jc-footer">
                          <Clock size={9} strokeWidth={2.5} />
                          <span>{formatRelative(lastActive)}</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
        itemLabel="jurors"
      />
      {/* ═══════ MODALS ═══════ */}
      {/* Add Juror Drawer */}
      <AddJurorDrawer
        open={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        onSave={handleSaveAddJuror}
        periodName={periods.viewPeriodLabel}
      />
      {/* Edit Juror Drawer */}
      <EditJurorDrawer
        open={!!editDrawerJuror}
        onClose={() => setEditDrawerJuror(null)}
        juror={editDrawerJuror ? {
          id: editDrawerJuror.juror_id || editDrawerJuror.jurorId,
          name: editDrawerJuror.juror_name || editDrawerJuror.juryName || "",
          affiliation: editDrawerJuror.affiliation || "",
          email: editDrawerJuror.email || "",
          progress: {
            scored: editDrawerJuror.overviewScoredProjects ?? 0,
            total: editDrawerJuror.overviewTotalProjects ?? 0,
          },
          lastActive: editDrawerJuror.lastSeenAt || editDrawerJuror.last_activity_at,
          overviewStatus: editDrawerJuror.overviewStatus,
        } : null}
        onSave={handleSaveEditJuror}
        onResetPin={(j) => { setEditDrawerJuror(null); setPinResetJuror(editDrawerJuror); }}
        onRemove={(j) => { setEditDrawerJuror(null); setRemoveJuror(editDrawerJuror); }}
      />
      {/* Reset PIN Modal */}
      <ResetPinModal
        open={!!pinResetJuror && !jurorsHook.resetPinInfo}
        onClose={() => setPinResetJuror(null)}
        juror={pinResetJuror ? {
          name: pinResetJuror.juryName || pinResetJuror.juror_name || "",
          affiliation: pinResetJuror.affiliation || "",
        } : null}
        onConfirm={handleResetPin}
      />
      {/* PIN Result Modal */}
      <PinResultModal
        open={!!jurorsHook.resetPinInfo}
        onClose={jurorsHook.closeResetPinDialog}
        juror={jurorsHook.pinResetTarget ? {
          name: jurorsHook.pinResetTarget.juryName || jurorsHook.pinResetTarget.juror_name || "",
          affiliation: jurorsHook.pinResetTarget.affiliation || "",
          email: jurorsHook.pinResetTarget.email || "",
        } : null}
        newPin={jurorsHook.resetPinInfo?.pin_plain_once}
        onSendEmail={handleSendPinEmail}
      />
      {/* Remove Juror Modal */}
      <RemoveJurorModal
        open={!!removeJuror}
        onClose={() => setRemoveJuror(null)}
        juror={removeJuror ? {
          name: removeJuror.juryName || removeJuror.juror_name || "",
          affiliation: removeJuror.affiliation || "",
        } : null}
        impact={{
          scores: removeJuror?.overviewScoredProjects ?? 0,
          groupsAffected: removeJuror?.overviewScoredProjects ?? 0,
          avgScore: removeJuror
            ? (jurorAvgMap.get(String(removeJuror.juror_id || removeJuror.jurorId || "")) ?? "—")
            : "—",
        }}
        periodName={periods.viewPeriodLabel}
        onRemove={handleRemoveJuror}
      />
      {/* Enable Editing Mode Modal */}
      <EnableEditingModal
        open={!!editModeJuror}
        onClose={() => setEditModeJuror(null)}
        juror={editModeJuror ? {
          name: editModeJuror.juryName || editModeJuror.juror_name || "",
          affiliation: editModeJuror.affiliation || "",
        } : null}
        onEnable={handleEnableEditMode}
      />
      <JurorReviewsModal
        open={!!reviewsJuror}
        onClose={() => setReviewsJuror(null)}
        juror={reviewsJuror}
        scoreRows={jurorsHook.scoreRows}
        projects={projectsHook.projects}
        onOpenFullReviews={() => {
          setReviewsJuror(null);
          onViewReviews?.(reviewsJuror);
        }}
      />
      <ImportJurorsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        parseFile={(f) => parseJurorsCsv(f, jurorsHook.jurors)}
        onImport={async (rows) => {
          const result = await jurorsHook.handleImportJurors(rows);
          if (result?.ok === false) throw new Error(result.formError || "Import failed.");
          return result;
        }}
      />
    </div>
  );
}
