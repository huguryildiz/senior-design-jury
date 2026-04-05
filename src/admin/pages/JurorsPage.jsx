// src/admin/pages/JurorsPage.jsx — Phase 7
// Jurors management page. Structure from prototype lines 13492–13989.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/shared/hooks/useToast";
import { useAuth } from "@/auth";
import { useManagePeriods } from "../hooks/useManagePeriods";
import { useManageProjects } from "../hooks/useManageProjects";
import { useManageJurors } from "../hooks/useManageJurors";
import PinResultModal from "../modals/PinResultModal";
import PinResetConfirmModal from "../modals/PinResetConfirmModal";
import ImportJurorsModal from "../modals/ImportJurorsModal";
import Modal from "@/shared/ui/Modal";
import AddJurorDrawer from "../drawers/AddJurorDrawer";
import EditJurorDrawer from "../drawers/EditJurorDrawer";
import { sendJurorPinEmail, getActiveEntryToken } from "@/shared/api";
import { getRawToken } from "@/shared/storage/adminStorage";
import { parseJurorsCsv } from "../utils/csvParser";
import ExportPanel from "../components/ExportPanel";
import { downloadTable, generateTableBlob } from "../utils/downloadTable";
import { AlertCircle } from "lucide-react";
import "../../styles/pages/jurors.css";

// ── Helpers ──────────────────────────────────────────────────

import JurorBadge from "../components/JurorBadge";
import JurorStatusPill from "../components/JurorStatusPill";

function formatRelative(ts) {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

function formatFull(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("en-GB", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return ""; }
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

// ── Column config — single source of truth for table headers and export ──

const JUROR_COLUMNS = [
  { key: "name",       label: "Juror Name",         exportWidth: 28 },
  { key: "progress",   label: "Projects Evaluated",  exportWidth: 20 },
  { key: "status",     label: "Status",              exportWidth: 14 },
  { key: "lastActive", label: "Last Active",          exportWidth: 18 },
];

function getJurorCell(j, key) {
  if (key === "name")       return j.juryName || j.juror_name || "";
  if (key === "progress") {
    const scored = j.overviewScoredProjects ?? 0;
    const total  = j.overviewTotalProjects  ?? 0;
    return `${scored} / ${total}`;
  }
  if (key === "status")     return j.overviewStatus || "";
  if (key === "lastActive") {
    const ts = j.lastSeenAt || j.last_activity_at || j.finalSubmittedAt || j.final_submitted_at;
    return formatFull(ts);
  }
  return "";
}

// ── Sort icon ────────────────────────────────────────────────

function SortIcon({ colKey, sortKey, sortDir }) {
  if (sortKey !== colKey) return <span className="sort-icon sort-icon-inactive">▲</span>;
  return <span className="sort-icon sort-icon-active">{sortDir === "asc" ? "▲" : "▼"}</span>;
}

// ── Component ────────────────────────────────────────────────

export default function JurorsPage({
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

  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Edit juror drawer
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editDrawerJuror, setEditDrawerJuror] = useState(null);

  // Enable Editing Mode modal
  const [enableEditOpen, setEnableEditOpen] = useState(false);
  const [enableEditJuror, setEnableEditJuror] = useState(null);
  const [enableEditDuration, setEnableEditDuration] = useState("30m");
  const [enableEditReason, setEnableEditReason] = useState("");
  const [enableEditBusy, setEnableEditBusy] = useState(false);

  // View Reviews modal
  const [viewReviewsOpen, setViewReviewsOpen] = useState(false);
  const [viewReviewsJuror, setViewReviewsJuror] = useState(null);

  // Import CSV state
  const [importOpen, setImportOpen] = useState(false);

  // Add juror drawer
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);

  // Reset PIN modal
  const [pinResetJuror, setPinResetJuror] = useState(null);

  // Remove juror modal
  const [removeJuror, setRemoveJuror] = useState(null);
  const [removeConfirm, setRemoveConfirm] = useState("");

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

  // Close menus on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    }
    if (openMenuId) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [openMenuId]);

  const jurorList = jurorsHook.jurors || [];

  // Unique affiliations for filter
  const affiliations = useMemo(() => {
    const set = new Set();
    jurorList.forEach((j) => { if (j.affiliation) set.add(j.affiliation); });
    return [...set].sort();
  }, [jurorList]);

  // Filtered + searched + sorted list
  const filteredList = useMemo(() => {
    let list = jurorList;
    if (statusFilter !== "all") {
      list = list.filter((j) => j.overviewStatus === statusFilter);
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
    list = [...list].sort((a, b) => {
      let va, vb;
      if (sortKey === "name") {
        va = (a.juryName || a.juror_name || "").toLowerCase();
        vb = (b.juryName || b.juror_name || "").toLowerCase();
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      if (sortKey === "progress") {
        const pa = a.overviewTotalProjects > 0 ? a.overviewScoredProjects / a.overviewTotalProjects : -1;
        const pb = b.overviewTotalProjects > 0 ? b.overviewScoredProjects / b.overviewTotalProjects : -1;
        return sortDir === "asc" ? pa - pb : pb - pa;
      }
      if (sortKey === "status") {
        va = a.overviewStatus || "";
        vb = b.overviewStatus || "";
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      if (sortKey === "lastActive") {
        va = new Date(a.lastSeenAt || a.last_activity_at || a.finalSubmittedAt || a.final_submitted_at || 0).getTime();
        vb = new Date(b.lastSeenAt || b.last_activity_at || b.finalSubmittedAt || b.final_submitted_at || 0).getTime();
        return sortDir === "asc" ? va - vb : vb - va;
      }
      return 0;
    });
    return list;
  }, [jurorList, statusFilter, affilFilter, search, sortKey, sortDir]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // KPI stats
  const totalJurors = jurorList.length;
  const completedJurors = jurorList.filter((j) => j.overviewStatus === "completed").length;
  const inProgressJurors = jurorList.filter((j) => j.overviewStatus === "in_progress").length;
  const editingJurors = jurorList.filter((j) => j.overviewStatus === "editing").length;
  const readyJurors = jurorList.filter((j) => j.overviewStatus === "ready_to_submit").length;
  const notStartedJurors = jurorList.filter((j) => j.overviewStatus === "not_started").length;

  // Editing banner (first juror with editing enabled)
  const editingBannerJuror = jurorList.find((j) => j.overviewStatus === "editing");

  // ── Modal handlers ──────────────────────────────────────────

  function openAddModal() {
    setAddDrawerOpen(true);
  }

  function openEditDrawer(juror) {
    setEditDrawerJuror(juror);
    setEditDrawerOpen(true);
    setOpenMenuId(null);
  }

  async function handleAddJurorDrawer({ name, affiliation, email }) {
    const result = await jurorsHook.handleAddJuror({
      juror_name: name,
      affiliation,
      email: email || null,
    });
    if (result?.ok === false) {
      const errMsg = result?.fieldErrors?.duplicate || "Could not add juror.";
      throw new Error(errMsg);
    }
  }

  async function handleEditJurorSave(id, { name, affiliation, email }) {
    const result = await jurorsHook.handleEditJuror({
      jurorId: id,
      juror_name: name,
      affiliation,
      email: email || null,
    });
    if (result?.ok === false) {
      throw new Error("Could not update juror.");
    }
  }

  function openPinResetModal(juror) {
    setPinResetJuror(juror);
    setOpenMenuId(null);
  }

  function openEnableEditModal(juror) {
    setEnableEditJuror(juror);
    setEnableEditDuration("30m");
    setEnableEditReason("");
    setEnableEditOpen(true);
    setOpenMenuId(null);
  }

  async function handleConfirmEnableEdit() {
    if (!enableEditJuror || !enableEditReason.trim()) return;
    setEnableEditBusy(true);
    try {
      await jurorsHook.handleToggleJurorEdit({
        jurorId: enableEditJuror.juror_id || enableEditJuror.jurorId,
        enabled: true,
      });
      setEnableEditOpen(false);
    } catch (e) {
      _toast.error(e?.message || "Could not enable editing mode.");
    } finally {
      setEnableEditBusy(false);
    }
  }

  function openViewReviews(juror) {
    setViewReviewsJuror(juror);
    setViewReviewsOpen(true);
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
    if (includeQr && periods.viewPeriodId) {
      let raw = getRawToken(periods.viewPeriodId);
      if (!raw) {
        try { raw = await getActiveEntryToken(periods.viewPeriodId); } catch {}
      }
      if (raw) tokenUrl = `${window.location.origin}?eval=${encodeURIComponent(raw)}`;
    }
    const result = await sendJurorPinEmail({
      recipientEmail: email,
      jurorName: target?.juror_name || target?.juryName || info?.juror_name || "",
      jurorAffiliation: target?.affiliation || info?.affiliation || "",
      pin: info.pin_plain_once,
      tokenUrl,
      periodName: periods.viewPeriodLabel,
      organizationName: activeOrganization?.name || "",
    });
    return result;
  }

  function openRemoveModal(juror) {
    setRemoveJuror(juror);
    setRemoveConfirm("");
    setOpenMenuId(null);
  }

  async function handleRemoveJuror() {
    if (!removeJuror) return;
    const name = removeJuror.juryName || removeJuror.juror_name || "";
    if (removeConfirm.trim() !== name.trim()) return;
    try {
      await jurorsHook.handleDeleteJuror(removeJuror.juror_id || removeJuror.jurorId);
      setRemoveJuror(null);
    } catch (e) {
      _toast.error(e?.message || "Could not remove juror.");
    }
  }

  async function handleImport(validRows) {
    const result = await jurorsHook.handleImportJurors(validRows);
    if (result?.ok !== false) {
      _toast.success(`Imported ${validRows.length - (result?.skipped || 0)} juror${validRows.length !== 1 ? "s" : ""}`);
    }
  }

  return (
    <div>
      {/* Editing mode banner */}
      {editingBannerJuror && (
        <div className="fb-banner fbb-editing">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span className="fb-banner-text">
            Editing enabled for <strong>{editingBannerJuror.juror_name}</strong> — changes will overwrite existing scores
          </span>
          <span className="fb-banner-action" style={{ color: "var(--fb-editing-text)" }}>Disable editing →</span>
        </div>
      )}

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
      <div className="jurors-toolbar">
        <div className="jurors-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Search jurors..."
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
        <button className="btn btn-outline btn-sm" onClick={() => setImportOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {" "}Import
        </button>
        <button
          className="btn btn-primary btn-sm"
          style={{ width: "auto", padding: "6px 14px", fontSize: "12px", background: "var(--accent)", boxShadow: "none" }}
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: "4px", opacity: 0.5 }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                Filter Jurors
              </h4>
              <div className="filter-panel-sub">Narrow jurors by status, affiliation, and scoring progress.</div>
            </div>
            <button className="filter-panel-close" onClick={() => setFilterOpen(false)}>&#215;</button>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label>Status</label>
              <select className="modal-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ height: "32px", fontSize: "12px" }}>
                <option value="all">All statuses</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="not_started">Not Started</option>
                <option value="editing">Editing</option>
                <option value="ready_to_submit">Ready to Submit</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Affiliation</label>
              <select className="modal-input" value={affilFilter} onChange={(e) => setAffilFilter(e.target.value)} style={{ height: "32px", fontSize: "12px" }}>
                <option value="all">All affiliations</option>
                {affiliations.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <button className="btn btn-outline btn-sm filter-clear-btn" onClick={() => { setStatusFilter("all"); setAffilFilter("all"); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
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
            const rows = filteredList.map((j) => JUROR_COLUMNS.map((c) => getJurorCell(j, c.key)));
            return generateTableBlob(fmt, {
              filenameType: "Jurors", sheetName: "Jurors",
              periodName: periods.viewPeriodLabel, tenantCode: activeOrganization?.code || "",
              organization: activeOrganization?.name || "", department: activeOrganization?.institution_name || "",
              pdfTitle: "VERA — Jurors", header, rows,
              colWidths: JUROR_COLUMNS.map((c) => c.exportWidth),
            });
          }}
          onExport={async (fmt) => {
            try {
              const header = JUROR_COLUMNS.map((c) => c.label);
              const rows = filteredList.map((j) => JUROR_COLUMNS.map((c) => getJurorCell(j, c.key)));
              await downloadTable(fmt, {
                filenameType: "Jurors", sheetName: "Jurors",
                periodName: periods.viewPeriodLabel, tenantCode: activeOrganization?.code || "",
                organization: activeOrganization?.name || "", department: activeOrganization?.institution_name || "",
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
        <div className="fb-alert fba-danger" style={{ marginBottom: "12px" }}>
          <div className="fb-alert-body" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            {panelError}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-wrap" style={{ borderRadius: "var(--radius) var(--radius) 0 0" }}>
        <table id="jurors-main-table">
          <thead>
            <tr>
              {JUROR_COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={`${c.key === "progress" ? "text-center " : ""}sortable${sortKey === c.key ? " sorted" : ""}`}
                  onClick={() => handleSort(c.key)}
                >
                  {c.label} <SortIcon colKey={c.key} sortKey={sortKey} sortDir={sortDir} />
                </th>
              ))}
              <th style={{ width: "48px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingCount > 0 && filteredList.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "32px" }}>
                  Loading jurors…
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "32px" }}>
                  No jurors found.
                </td>
              </tr>
            ) : filteredList.map((juror) => {
              const jid = juror.juror_id || juror.jurorId;
              const name = juror.juryName || juror.juror_name || "";
              const scored = juror.overviewScoredProjects || 0;
              const total = juror.overviewTotalProjects || 0;
              const pct = total > 0 ? Math.round((scored / total) * 100) : 0;
              const status = juror.overviewStatus || "not_started";
              const lastActive = juror.lastSeenAt || juror.last_activity_at || juror.finalSubmittedAt || juror.final_submitted_at;

              return (
                <tr key={jid} onClick={() => openEditDrawer(juror)}>
                  <td>
                    <JurorBadge name={name} affiliation={juror.affiliation} size="sm" />
                  </td>
                  <td className="text-center">
                    <span className={groupTextClass(scored, total)}>
                      {scored} / {total}
                      <span className="jurors-group-bar">
                        <span className="jurors-group-bar-fill" style={{ width: `${pct}%`, background: groupBarColor(scored, total) }} />
                      </span>
                    </span>
                  </td>
                  <td>
                    <JurorStatusPill status={status} />
                  </td>
                  <td className="jurors-table-active" data-tooltip={formatFull(lastActive)}>
                    {formatRelative(lastActive)}
                  </td>
                  <td>
                    <div className="juror-action-wrap" ref={openMenuId === jid ? menuRef : null}>
                      <button
                        className="juror-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((prev) => (prev === jid ? null : jid));
                        }}
                        aria-label="Actions"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                      {openMenuId === jid && (
                        <div className="juror-action-menu open">
                          <div className="juror-action-item" onClick={(e) => { e.stopPropagation(); openEditDrawer(juror); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                            Edit Juror
                          </div>
                          <div className="juror-action-item" onClick={(e) => { e.stopPropagation(); openPinResetModal(juror); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            Reset PIN
                          </div>
                          <div className="juror-action-item" onClick={(e) => { e.stopPropagation(); openEnableEditModal(juror); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Enable Editing Mode
                          </div>
                          <div className="juror-action-item" onClick={(e) => { e.stopPropagation(); openViewReviews(juror); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            View Reviews
                          </div>
                          <div className="juror-action-sep" />
                          <div className="juror-action-item danger" onClick={(e) => { e.stopPropagation(); openRemoveModal(juror); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Remove Juror
                          </div>
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
      <div className="jurors-pagination">
        <div className="jurors-pagination-info">
          <span>Showing 1–{filteredList.length} of {filteredList.length} jurors</span>
        </div>
        <div className="jurors-pagination-pages">
          <button disabled>‹ Prev</button>
          <button className="active" disabled aria-current="page" title="Current page">1</button>
          <button disabled>Next ›</button>
        </div>
      </div>


      {/* ═══════ MODALS / DRAWERS ═══════ */}

      {/* Add Juror Drawer */}
      <AddJurorDrawer
        open={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        onSave={handleAddJurorDrawer}
        periodName={periods.viewPeriodLabel}
      />

      {/* Edit Juror Drawer */}
      <EditJurorDrawer
        open={editDrawerOpen}
        onClose={() => { setEditDrawerOpen(false); setEditDrawerJuror(null); }}
        juror={editDrawerJuror ? {
          id: editDrawerJuror.juror_id || editDrawerJuror.jurorId,
          name: editDrawerJuror.juryName || editDrawerJuror.juror_name || "",
          affiliation: editDrawerJuror.affiliation || "",
          email: editDrawerJuror.email || "",
          progress: {
            scored: editDrawerJuror.overviewScoredProjects || 0,
            total: editDrawerJuror.overviewTotalProjects || 0,
          },
          lastActive: editDrawerJuror.lastSeenAt || editDrawerJuror.last_activity_at || editDrawerJuror.finalSubmittedAt || editDrawerJuror.final_submitted_at || null,
          overviewStatus: editDrawerJuror.overviewStatus || "not_started",
        } : null}
        onSave={handleEditJurorSave}
        onResetPin={(juror) => { setEditDrawerOpen(false); openPinResetModal(editDrawerJuror); }}
        onRemove={(juror) => { setEditDrawerOpen(false); openRemoveModal(editDrawerJuror); }}
      />

      {/* Reset PIN — Step 1: Confirm */}
      <PinResetConfirmModal
        open={!!pinResetJuror}
        onClose={() => setPinResetJuror(null)}
        juror={pinResetJuror}
        loading={jurorsHook.pinResetLoading}
        onConfirm={handleResetPin}
      />

      {/* Enable Editing Mode Modal */}
      {enableEditOpen && enableEditJuror && (
        <div className="modal-overlay show" onClick={() => setEnableEditOpen(false)}>
          <div className="modal-card" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Enable Editing Mode</span>
              <button className="juror-drawer-close" onClick={() => setEnableEditOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "14px" }}>
                Allow <strong>{enableEditJuror.juryName || enableEditJuror.juror_name}</strong> to modify their submitted scores.
              </div>
              <div className="modal-field">
                <label className="modal-label">Duration</label>
                <select
                  className="modal-input"
                  value={enableEditDuration}
                  onChange={(e) => setEnableEditDuration(e.target.value)}
                  style={{ height: "36px", fontSize: "13px" }}
                >
                  <option value="15m">15 minutes</option>
                  <option value="30m">30 minutes</option>
                  <option value="1h">1 hour</option>
                  <option value="session">Until resubmission</option>
                </select>
              </div>
              <div className="modal-field" style={{ marginTop: "12px" }}>
                <label className="modal-label">Reason <span className="field-req">*</span></label>
                <textarea
                  className="modal-input"
                  placeholder="e.g. Juror requested correction to Group 3 scores"
                  value={enableEditReason}
                  onChange={(e) => setEnableEditReason(e.target.value)}
                  rows={3}
                  style={{ resize: "vertical", fontSize: "13px" }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setEnableEditOpen(false)} disabled={enableEditBusy}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ background: "var(--accent)", color: "#fff" }}
                onClick={handleConfirmEnableEdit}
                disabled={enableEditBusy || !enableEditReason.trim()}
              >
                {enableEditBusy ? "Enabling…" : "Enable Editing"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Reviews Modal */}
      {viewReviewsOpen && viewReviewsJuror && (() => {
        const jid = String(viewReviewsJuror.juror_id || viewReviewsJuror.jurorId || "");
        const reviews = (jurorsHook.scoreRows || []).filter((r) => String(r.jurorId || "") === jid);
        return (
          <div className="modal-overlay show" onClick={() => setViewReviewsOpen(false)}>
            <div className="modal-card" style={{ maxWidth: "620px", width: "95vw" }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <span className="modal-title">Reviews</span>
                  <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                    {viewReviewsJuror.juryName || viewReviewsJuror.juror_name} · {reviews.length} evaluation{reviews.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <button className="juror-drawer-close" onClick={() => setViewReviewsOpen(false)}>×</button>
              </div>
              <div className="modal-body" style={{ padding: 0 }}>
                {reviews.length === 0 ? (
                  <div style={{ padding: "32px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
                    No evaluations found for this juror.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Group</th>
                          <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)" }}>Project</th>
                          <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600, color: "var(--text-secondary)" }}>Score</th>
                          <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600, color: "var(--text-secondary)" }}>Status</th>
                          <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviews.map((r, i) => (
                          <tr key={r.id || i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                            <td style={{ padding: "10px 14px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                              {r.groupNo != null ? `#${r.groupNo}` : "—"}
                            </td>
                            <td style={{ padding: "10px 14px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {r.projectName || "—"}
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600 }}>
                              {r.total != null ? r.total : "—"}
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "center" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "999px",
                                fontSize: "11px",
                                fontWeight: 600,
                                background: r.status === "submitted" ? "var(--success-soft, rgba(34,197,94,0.1))" : "var(--warning-soft, rgba(234,179,8,0.1))",
                                color: r.status === "submitted" ? "var(--success)" : "var(--warning)",
                              }}>
                                {r.status === "submitted" ? "Submitted" : "Draft"}
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                              {r.updatedAt ? formatFull(r.updatedAt) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline btn-sm" onClick={() => setViewReviewsOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PIN Result Modal */}
      <PinResultModal
        open={!!jurorsHook.resetPinInfo}
        onClose={jurorsHook.closeResetPinDialog}
        juror={jurorsHook.pinResetTarget}
        newPin={jurorsHook.resetPinInfo?.pin_plain_once}
        onSendEmail={handleSendPinEmail}
      />

      {/* Remove Juror Modal */}
      {removeJuror && (
        <div className="modal-overlay show" onClick={() => setRemoveJuror(null)}>
          <div className="modal-card" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title" style={{ color: "var(--danger)" }}>Remove Juror</span>
              <button className="juror-drawer-close" onClick={() => setRemoveJuror(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--danger-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>This action cannot be undone</div>
                  <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Removing <strong>{removeJuror.juryName || removeJuror.juror_name}</strong> will delete all their scores and evaluation data for this evaluation period. Type the juror's name to confirm.
                  </div>
                  <input
                    className="modal-input"
                    type="text"
                    placeholder="Type juror name..."
                    value={removeConfirm}
                    onChange={(e) => setRemoveConfirm(e.target.value)}
                    style={{ marginTop: "10px" }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setRemoveJuror(null)}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ background: "var(--danger)", color: "#fff" }}
                onClick={handleRemoveJuror}
                disabled={removeConfirm.trim() !== (removeJuror.juryName || removeJuror.juror_name || "").trim()}
              >
                Remove Juror
              </button>
            </div>
          </div>
        </div>
      )}

      <ImportJurorsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        parseFile={(f) => parseJurorsCsv(f, jurorsHook.jurors)}
        onImport={handleImport}
      />
    </div>
  );
}
