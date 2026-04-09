// src/admin/pages/PeriodsPage.jsx — Phase 7
// Evaluation Periods management page.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAdminContext } from "../hooks/useAdminContext";
import { useToast } from "@/shared/hooks/useToast";
import { useAuth } from "@/auth";
import { useManagePeriods } from "../hooks/useManagePeriods";
import ExportPanel from "../components/ExportPanel";
import { downloadTable, generateTableBlob } from "../utils/downloadTable";
import CustomSelect from "@/shared/ui/CustomSelect";
import FbAlert from "@/shared/ui/FbAlert";
import AddEditPeriodDrawer from "../drawers/AddEditPeriodDrawer";
import { FilterButton } from "@/shared/ui/FilterButton.jsx";
import { setEvalLock, deletePeriod, listPeriodCriteria, savePeriodCriteria } from "@/shared/api";
import { Lock, LockOpen, Trash2, FileEdit, Play, CheckCircle } from "lucide-react";
import PremiumTooltip from "@/shared/ui/PremiumTooltip";
import SetCurrentPeriodModal from "../modals/SetCurrentPeriodModal";
import UnlockPeriodModal from "../modals/UnlockPeriodModal";
import LockPeriodModal from "../modals/LockPeriodModal";
import DeletePeriodModal from "../modals/DeletePeriodModal";
import "../../styles/pages/periods.css";

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

function formatFull(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("en-GB", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return ""; }
}

function getPeriodStatus(period) {
  if (period.is_locked) return "locked";
  if (period.is_current) return "active";
  if (period.activated_at) return "completed";
  return "draft";
}

function StatusPill({ status }) {
  if (status === "draft") {
    return (
      <span className="sem-status sem-status-draft">
        <FileEdit size={12} />
        Draft
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="sem-status sem-status-active">
        <Play size={12} />
        Active
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="sem-status sem-status-completed">
        <CheckCircle size={12} />
        Completed
      </span>
    );
  }
  return (
    <span className="sem-status sem-status-locked">
      <Lock size={12} />
      Locked
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

export default function PeriodsPage() {
  const {
    organizationId,
    selectedPeriodId,
    isDemoMode = false,
    onDirtyChange,
    onCurrentSemesterChange,
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

  // Filter/export panel state
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("updated_at");
  const [sortDir, setSortDir] = useState("desc");

  // Active filter count
  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  // Set-current confirmation dialog
  const [switchTarget, setSwitchTarget] = useState(null);

  // Delete period modal
  const [deletePeriodTarget, setDeletePeriodTarget] = useState(null);

  // Unlock period modal
  const [unlockTarget, setUnlockTarget] = useState(null);

  // Lock period confirmation dialog (lock-only, with typed confirmation)
  const [lockTarget, setLockTarget] = useState(null);

  // Add/edit period drawer
  const [periodDrawerOpen, setPeriodDrawerOpen] = useState(false);
  const [periodDrawerTarget, setPeriodDrawerTarget] = useState(null);

  // Action menu open state
  const [openMenuId, setOpenMenuId] = useState(null);
  const [openMenuPlacement, setOpenMenuPlacement] = useState("down");
  const menuRef = useRef(null);

  const shouldOpenMenuUp = useCallback((anchorEl) => {
    if (!anchorEl || typeof window === "undefined") return false;
    const rect = anchorEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedMenuHeight = 280;
    return spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;
  }, []);

  useEffect(() => {
    incLoading();
    periods.loadPeriods()
      .catch(() => setPanelError("period", "Could not load periods."))
      .finally(() => decLoading());
  }, [periods.loadPeriods]);

  // Close action menus on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [openMenuId]);

  const periodList = periods.periodList || [];

  // Derived stats
  const totalPeriods = periodList.length;
  const draftPeriods = periodList.filter((p) => !p.is_locked && !p.is_current && !p.activated_at).length;
  const activePeriods = periodList.filter((p) => !p.is_locked && p.is_current).length;
  const completedPeriods = periodList.filter((p) => !p.is_locked && !p.is_current && p.activated_at).length;
  const lockedPeriods = periodList.filter((p) => p.is_locked).length;

  // Filtered list
  const filteredList = useMemo(() => periodList.filter((p) => {
    const status = getPeriodStatus(p);
    if (statusFilter !== "all" && status !== statusFilter) return false;
    return true;
  }), [periodList, statusFilter]);

  const sortedFilteredList = useMemo(() => {
    const statusRank = { draft: 1, active: 2, completed: 3, locked: 4 };
    const rows = [...filteredList];
    rows.sort((a, b) => {
      const direction = sortDir === "asc" ? 1 : -1;
      const aName = String(a.name || "");
      const bName = String(b.name || "");
      let cmp = 0;
      if (sortKey === "name") {
        cmp = aName.localeCompare(bName, "tr", { sensitivity: "base", numeric: true });
      } else if (sortKey === "status") {
        cmp = (statusRank[getPeriodStatus(a)] || 0) - (statusRank[getPeriodStatus(b)] || 0);
      } else if (sortKey === "updated_at") {
        const aTs = Date.parse(a.updated_at || "");
        const bTs = Date.parse(b.updated_at || "");
        const aValue = Number.isFinite(aTs) ? aTs : Number.NEGATIVE_INFINITY;
        const bValue = Number.isFinite(bTs) ? bTs : Number.NEGATIVE_INFINITY;
        cmp = aValue - bValue;
      }
      if (cmp !== 0) return cmp * direction;
      return aName.localeCompare(bName, "tr", { sensitivity: "base", numeric: true });
    });
    return rows;
  }, [filteredList, sortKey, sortDir]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "updated_at" ? "desc" : "asc");
  }


  function openSetCurrentModal(period) {
    setSwitchTarget(period);
    setOpenMenuId(null);
  }

  async function confirmSetCurrent() {
    if (!switchTarget) return;
    await periods.handleSetCurrentPeriod(switchTarget.id);
  }

  function openAddDrawer() {
    setPeriodDrawerTarget(null);
    setPeriodDrawerOpen(true);
  }

  function openEditDrawer(period) {
    setPeriodDrawerTarget(period);
    setPeriodDrawerOpen(true);
    setOpenMenuId(null);
  }

  async function handleLockPeriod() {
    if (!lockTarget) return;
    await setEvalLock(lockTarget.id, true);
    periods.applyPeriodPatch({ id: lockTarget.id, is_locked: true });
    _toast.success(`${lockTarget.name || "Period"} locked — scores finalized.`);
    setLockTarget(null);
  }

  async function handleUnlockPeriod() {
    if (!unlockTarget) return;
    await setEvalLock(unlockTarget.id, false);
    periods.applyPeriodPatch({ id: unlockTarget.id, is_locked: false });
    _toast.success(`${unlockTarget.name || "Period"} unlocked — scoring re-enabled.`);
    setUnlockTarget(null);
  }

  async function handleDeletePeriodViaModal() {
    if (!deletePeriodTarget) return;
    await deletePeriod(deletePeriodTarget.id);
    periods.removePeriod(deletePeriodTarget.id);
    _toast.success(`${deletePeriodTarget.name || "Period"} deleted.`);
    setDeletePeriodTarget(null);
  }

  async function handleSavePeriod(data) {
    if (periodDrawerTarget) {
      const result = await periods.handleUpdatePeriod({
        id: periodDrawerTarget.id,
        name: data.name,
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date,
        is_locked: data.is_locked,
        is_visible: data.is_visible,
      });
      if (result && !result.ok && result.fieldErrors?.name) {
        throw new Error(result.fieldErrors.name);
      }
    } else {
      const result = await periods.handleCreatePeriod({
        name: data.name,
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date,
        is_locked: data.is_locked,
        is_visible: data.is_visible,
      });
      if (result && !result.ok && result.fieldErrors?.name) {
        throw new Error(result.fieldErrors.name);
      }
      if (result?.ok && result?.id && data.copyCriteriaFromPeriodId) {
        try {
          const sourceRows = await listPeriodCriteria(data.copyCriteriaFromPeriodId);
          if (sourceRows.length > 0) {
            await savePeriodCriteria(result.id, sourceRows);
          }
        } catch {
          // Criteria copy failure is non-fatal; period was created successfully
        }
      }
    }
  }

  return (
    <div className="periods-page">
      {/* Page header */}
      <div className="sem-header">
        <div className="sem-header-left">
          <div className="page-title">Evaluation Periods</div>
          <div className="page-desc">Manage evaluation periods, active sessions, and locked historical records.</div>
        </div>
        <div className="sem-header-actions">
          <FilterButton
            activeCount={activeFilterCount}
            isOpen={filterOpen}
            onClick={() => { setFilterOpen((v) => !v); setExportOpen(false); }}
          />
          <button className="btn btn-outline btn-sm" onClick={() => { setExportOpen((v) => !v); setFilterOpen(false); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {" "}Export
          </button>
          <button
            className="btn btn-primary btn-sm"
            style={{ width: "auto", padding: "6px 14px", fontSize: "12px", background: "var(--accent)", boxShadow: "none" }}
            onClick={openAddDrawer}
          >
            + Add Period
          </button>
        </div>
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
                Filter Periods
              </h4>
              <div className="filter-panel-sub">Narrow evaluation periods by status and lock state.</div>
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
                  { value: "all", label: "All" },
                  { value: "draft", label: "Draft" },
                  { value: "active", label: "Active" },
                  { value: "completed", label: "Completed" },
                  { value: "locked", label: "Locked" },
                ]}
                ariaLabel="Status"
              />
            </div>
            <button className="btn btn-outline btn-sm filter-clear-btn" onClick={() => setStatusFilter("all")}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
              {" "}Clear
            </button>
          </div>
        </div>
      )}

      {/* Export panel */}
      {exportOpen && (
        <ExportPanel
          title="Export Periods"
          subtitle="Download period records with project counts, juror counts, and status history."
          meta={`${totalPeriods} periods · All records`}
          organization={activeOrganization?.name || ""}
          onClose={() => setExportOpen(false)}
          generateFile={async (fmt) => {
            const header = ["Name", "Season", "Status", "Current", "Locked", "Created"];
            const rows = sortedFilteredList.map((p) => [
              p.name ?? "", p.season ?? "", getPeriodStatus(p), p.is_current ? "Yes" : "No", p.is_locked ? "Yes" : "No", formatFull(p.created_at),
            ]);
            return generateTableBlob(fmt, {
              filenameType: "Periods", sheetName: "Evaluation Periods", periodName: "all",
              tenantCode: activeOrganization?.code || "", organization: activeOrganization?.name || "",
              department: activeOrganization?.subtitle || "", pdfTitle: "VERA — Evaluation Periods",
              header, rows, colWidths: [28, 14, 12, 10, 10, 18],
            });
          }}
          onExport={async (fmt) => {
            try {
              const header = ["Name", "Season", "Status", "Current", "Locked", "Created"];
              const rows = sortedFilteredList.map((p) => [
                p.name ?? "", p.season ?? "", getPeriodStatus(p), p.is_current ? "Yes" : "No", p.is_locked ? "Yes" : "No", formatFull(p.created_at),
              ]);
              await downloadTable(fmt, {
                filenameType: "Periods", sheetName: "Evaluation Periods", periodName: "all",
                tenantCode: activeOrganization?.code || "", organization: activeOrganization?.name || "",
                department: activeOrganization?.subtitle || "", pdfTitle: "VERA — Evaluation Periods",
                header, rows, colWidths: [28, 14, 12, 10, 10, 18],
              });
              setExportOpen(false);
              const fmtLabel = fmt === "pdf" ? "PDF" : fmt === "csv" ? "CSV" : "Excel";
              _toast.success(`${filteredList.length} period${filteredList.length !== 1 ? "s" : ""} exported · ${fmtLabel}`);
            } catch (e) {
              _toast.error(e?.message || "Periods export failed — please try again");
            }
          }}
        />
      )}

      {/* KPI strip */}
      <div className="scores-kpi-strip">
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{totalPeriods}</div>
          <div className="scores-kpi-item-label">Periods</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value" style={{ color: "#4f46e5" }}>{draftPeriods}</div>
          <div className="scores-kpi-item-label">Draft</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value"><span className="success">{activePeriods}</span></div>
          <div className="scores-kpi-item-label">Active</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value" style={{ color: "#b45309" }}>{completedPeriods}</div>
          <div className="scores-kpi-item-label">Completed</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{lockedPeriods}</div>
          <div className="scores-kpi-item-label">Locked</div>
        </div>
      </div>

      {/* Error */}
      {panelError && (
        <FbAlert variant="danger" style={{ marginBottom: "12px" }}>
          {panelError}
        </FbAlert>
      )}

      {/* Table */}
      <div className="sem-table-wrap">
        <table className="sem-table">
          <thead>
            <tr>
              <th
                className={`sortable${sortKey === "name" ? " sorted" : ""}`}
                style={{ minWidth: "200px" }}
                onClick={() => handleSort("name")}
              >
                Evaluation Period <SortIcon colKey="name" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th
                className={`sortable${sortKey === "status" ? " sorted" : ""}`}
                style={{ width: "120px" }}
                onClick={() => handleSort("status")}
              >
                Status <SortIcon colKey="status" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th
                className={`sortable${sortKey === "updated_at" ? " sorted" : ""}`}
                style={{ width: "130px" }}
                onClick={() => handleSort("updated_at")}
              >
                Last Updated <SortIcon colKey="updated_at" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th style={{ width: "52px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingCount > 0 && filteredList.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "32px" }}>
                  Loading periods…
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "48px 24px" }}>
                  <div style={{ color: "var(--text-tertiary)", marginBottom: 12 }}>
                    {statusFilter !== "all"
                      ? "No periods match the current filter."
                      : "No evaluation periods yet. Create your first period to get started."}
                  </div>
                  {statusFilter === "all" && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: "auto", padding: "8px 20px" }}
                      onClick={openAddDrawer}
                    >
                      + Create First Period
                    </button>
                  )}
                </td>
              </tr>
            ) : sortedFilteredList.map((period) => {
              const status = getPeriodStatus(period);
              const isCurrent = !!period.is_current && !period.is_locked;
              return (
                <tr
                  key={period.id}
                  className={
                    isCurrent ? "sem-row-current"
                    : status === "draft" ? "sem-row-draft"
                    : undefined
                  }
                >
                  <td>
                    <div className="sem-name" style={period.is_locked ? { color: "var(--text-secondary)" } : undefined}>
                      {period.name}
                      {isCurrent && (
                        <span className="sem-badge-current">
                          <span className="dot" />
                          Current
                        </span>
                      )}
                    </div>
                    <div className="sem-name-sub">
                      {status === "locked"
                        ? "Locked · scores finalized · read-only"
                        : status === "active"
                        ? "Evaluation in progress"
                        : status === "completed"
                        ? "Completed · all evaluations submitted"
                        : "Setup in progress"}
                    </div>
                  </td>
                  <td><StatusPill status={status} /></td>
                  <td>
                    <PremiumTooltip text={formatFull(period.updated_at)}>
                      <span className="vera-datetime-text">{formatRelative(period.updated_at)}</span>
                    </PremiumTooltip>
                  </td>
                  <td>
                    <div
                      className={`sem-action-wrap${openMenuId === period.id && openMenuPlacement === "up" ? " menu-up" : ""}`}
                      ref={openMenuId === period.id ? menuRef : null}
                    >
                      <button
                        className="sem-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuPlacement(shouldOpenMenuUp(e.currentTarget) ? "up" : "down");
                          setOpenMenuId((prev) => (prev === period.id ? null : period.id));
                        }}
                        title="Actions"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                      {openMenuId === period.id && (
                        <div className="sem-action-menu open">
                          {/* Activation row */}
                          {isCurrent ? (
                            <div className="juror-action-item disabled">
                              <CheckCircle size={14} />
                              Current Period
                            </div>
                          ) : period.is_locked ? (
                            <div className="juror-action-item disabled">
                              <Lock size={14} />
                              Set as Current (Locked)
                            </div>
                          ) : (
                            <div
                              className="juror-action-item"
                              style={{ background: "var(--accent-soft)", color: "var(--accent-dark)", fontWeight: 600 }}
                              onClick={() => openSetCurrentModal(period)}
                            >
                              <Play size={14} />
                              Set as Current Period
                            </div>
                          )}

                          {/* Edit */}
                          <div className="juror-action-sep" />
                          <div className="juror-action-item" onClick={() => openEditDrawer(period)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit Evaluation Period
                          </div>

                          {/* Configure */}
                          <div className="juror-action-sep" />
                          <div className="juror-action-item" onClick={() => { setOpenMenuId(null); onNavigate?.("criteria"); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                            Criteria Mapping
                          </div>
                          <div className="juror-action-item" onClick={() => { setOpenMenuId(null); onNavigate?.("outcomes"); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <circle cx="12" cy="12" r="10" />
                              <path d="m9 12 2 2 4-4" />
                            </svg>
                            Outcomes & Mapping
                          </div>
                          <div className="juror-action-sep" />
                          <div className="juror-action-item" onClick={() => { setOpenMenuId(null); onNavigate?.("analytics"); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <line x1="18" y1="20" x2="18" y2="10" />
                              <line x1="12" y1="20" x2="12" y2="4" />
                              <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                            View Analytics
                          </div>

                          {/* Danger zone */}
                          <div className="juror-action-sep" />
                          {period.is_locked ? (
                            <div
                              className="juror-action-item"
                              onClick={() => { setOpenMenuId(null); setUnlockTarget(period); }}
                            >
                              <LockOpen size={14} />
                              Unlock Period
                            </div>
                          ) : (
                            <div
                              className="juror-action-item danger"
                              onClick={() => { setOpenMenuId(null); setLockTarget(period); }}
                            >
                              <Lock size={14} />
                              Lock Period
                            </div>
                          )}
                          {isCurrent ? (
                            <div className="juror-action-item disabled">
                              <Trash2 size={14} />
                              Delete Period
                            </div>
                          ) : (
                            <div
                              className="juror-action-item danger"
                              onClick={() => { setOpenMenuId(null); setDeletePeriodTarget(period); }}
                            >
                              <Trash2 size={14} />
                              Delete Period
                            </div>
                          )}
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

      {/* Set as Current period modal */}
      <SetCurrentPeriodModal
        open={!!switchTarget}
        onClose={() => setSwitchTarget(null)}
        period={switchTarget}
        onConfirm={confirmSetCurrent}
      />

      {/* Delete period modal */}
      <DeletePeriodModal
        open={!!deletePeriodTarget}
        onClose={() => setDeletePeriodTarget(null)}
        period={deletePeriodTarget}
        onDelete={handleDeletePeriodViaModal}
      />

      {/* Unlock period modal */}
      <UnlockPeriodModal
        open={!!unlockTarget}
        onClose={() => setUnlockTarget(null)}
        period={unlockTarget}
        onUnlock={handleUnlockPeriod}
      />

      {/* Lock period modal */}
      <LockPeriodModal
        open={!!lockTarget}
        onClose={() => setLockTarget(null)}
        period={lockTarget}
        onLock={handleLockPeriod}
      />

      {/* Add / Edit period drawer */}
      <AddEditPeriodDrawer
        open={periodDrawerOpen}
        onClose={() => setPeriodDrawerOpen(false)}
        period={periodDrawerTarget}
        onSave={handleSavePeriod}
        allPeriods={periodList}
        onNavigateToCriteria={() => onNavigate?.("criteria")}
      />
    </div>
  );
}
