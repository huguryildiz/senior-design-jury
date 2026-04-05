// src/admin/pages/JurorsPage.jsx — Phase 7
// Jurors management page. Structure from prototype lines 13492–13989.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import AddJurorDrawer from "../drawers/AddJurorDrawer";
import EditJurorDrawer from "../drawers/EditJurorDrawer";
import { sendJurorPinEmail, getActiveEntryTokenPlain } from "@/shared/api";
import { parseJurorsCsv } from "../utils/csvParser";
import ExportPanel from "../components/ExportPanel";
import { downloadTable, generateTableBlob } from "../utils/downloadTable";
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

// ── Component ────────────────────────────────────────────────

export default function JurorsPage({
  organizationId,
  selectedPeriodId,
  isDemoMode = false,
  onDirtyChange,
  onCurrentSemesterChange,
  onViewReviews,
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

  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

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

  // Enable editing mode modal
  const [editModeJuror, setEditModeJuror] = useState(null);

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
    return list;
  }, [jurorList, statusFilter, affilFilter, search]);

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

  // KPI stats
  const totalJurors = jurorList.length;
  const completedJurors = jurorList.filter((j) => j.overviewStatus === "completed").length;
  const inProgressJurors = jurorList.filter((j) => j.overviewStatus === "in_progress").length;
  const editingJurors = jurorList.filter((j) => j.overviewStatus === "editing").length;
  const readyJurors = jurorList.filter((j) => j.overviewStatus === "ready_to_submit").length;
  const notStartedJurors = jurorList.filter((j) => j.overviewStatus === "not_started").length;

  const editingBannerJurors = jurorList.filter((j) => j.overviewStatus === "editing");

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
        if (plain) tokenUrl = `${window.location.origin}?eval=${encodeURIComponent(plain)}`;
      }
    }
    await sendJurorPinEmail({
      recipientEmail: email,
      jurorName: target?.juryName || target?.juror_name || info?.juror_name || "",
      jurorAffiliation: target?.affiliation || info?.affiliation || "",
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
    <div>
      {/* Editing mode banners */}
      {editingBannerJurors.map((j) => (
        <div key={j.jurorId || j.juror_id} className="fb-banner fbb-editing">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span className="fb-banner-text">
            Editing enabled for <strong>{j.juryName || j.juror_name}</strong> — changes will overwrite existing scores
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
        <div className="filter-panel">
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
    const rows = filteredList.map((j) => JUROR_COLUMNS.map((c) => getJurorCell(j, c.key, jurorAvgMap)));
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
      const rows = filteredList.map((j) => JUROR_COLUMNS.map((c) => getJurorCell(j, c.key, jurorAvgMap)));
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
          <div className="fb-alert-body">{panelError}</div>
        </div>
      )}

      {/* Table */}
      <div className="table-wrap" style={{ borderRadius: "var(--radius) var(--radius) 0 0", overflow: openMenuId ? "visible" : undefined }}>
        <table id="jurors-main-table">
          <thead>
            <tr>
              <th>Juror Name</th>
              <th className="text-center">Projects Evaluated</th>
              <th className="text-center">Avg. Score{periodMaxScore != null ? ` / ${periodMaxScore}` : ""}</th>
              <th>Status</th>
              <th>Last Active</th>
              <th style={{ width: "48px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingCount > 0 && filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "32px" }}>
                  Loading jurors…
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "32px" }}>
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
                <tr key={jid} onClick={() => openEditModal(juror)}>
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
                  <td className="text-center avg-score-cell">
                    {jurorAvgMap.get(String(jid)) ? (
                      <>
                        <span className="avg-score-value">{jurorAvgMap.get(String(jid))}</span>
                        {periodMaxScore != null && <span className="avg-score-max"> /{periodMaxScore}</span>}
                      </>
                    ) : (
                      <span className="avg-score-empty">—</span>
                    )}
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
                        title="Actions"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                      {openMenuId === jid && (
                        <div className="juror-action-menu open">
                          <div className="juror-action-item" onClick={(e) => { e.stopPropagation(); openEditModal(juror); }}>
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
                          <div className="juror-action-sep" />
                          {status !== "editing" && (
                            status === "completed" ? (
                              <div
                                className="juror-action-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  setEditModeJuror(juror);
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <rect x="3" y="11" width="18" height="10" rx="2" />
                                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                  <path d="M11 15h1v2" />
                                </svg>
                                Enable Editing Mode
                              </div>
                            ) : (
                              <span
                                className="juror-action-item-tooltip-wrap"
                                data-tooltip="Juror must complete their submission before editing can be unlocked."
                              >
                                <div className="juror-action-item disabled">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <rect x="14" y="11" width="7" height="10" rx="2" />
                                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                  </svg>
                                  Enable Editing Mode
                                </div>
                              </span>
                            )
                          )}
                          <div className="juror-action-item" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onViewReviews?.(juror); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
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
          name: removeJuror.juror_name || "",
          affiliation: removeJuror.affiliation || "",
        } : null}
        impact={{
          scores: removeJuror?.overviewScoredProjects ?? 0,
          groupsAffected: removeJuror?.overviewScoredProjects ?? 0,
          avgScore: "—",
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
