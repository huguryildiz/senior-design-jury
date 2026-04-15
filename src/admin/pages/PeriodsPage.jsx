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
import PeriodCriteriaDrawer from "../drawers/PeriodCriteriaDrawer";
import { FilterButton } from "@/shared/ui/FilterButton.jsx";
import {
  setEvalLock,
  deletePeriod,
  listPeriodCriteria,
  savePeriodCriteria,
  listPeriodStats,
  requestPeriodUnlock,
  listUnlockRequests,
  cloneFramework,
  assignFrameworkToPeriod,
  freezePeriodSnapshot,
} from "@/shared/api";
import { getActiveCriteria } from "@/shared/criteria/criteriaHelpers";
import {
  Lock,
  LockOpen,
  Trash2,
  FileEdit,
  Play,
  CheckCircle,
  MoreVertical,
  Pencil,
  Eye,
  CalendarRange,
  Filter,
  Download,
  Plus,
  BadgeCheck,
  X,
  Info,
  ListChecks,
} from "lucide-react";
import PremiumTooltip from "@/shared/ui/PremiumTooltip";
import SetCurrentPeriodModal from "../modals/SetCurrentPeriodModal";
import UnlockPeriodModal from "../modals/UnlockPeriodModal";
import LockPeriodModal from "../modals/LockPeriodModal";
import RequestUnlockModal from "../modals/RequestUnlockModal";
import DeletePeriodModal from "../modals/DeletePeriodModal";
import FloatingMenu from "@/shared/ui/FloatingMenu";
import Pagination from "@/shared/ui/Pagination";
import { formatDateTime as formatFull } from "@/shared/lib/dateUtils";
import "../../styles/pages/periods.css";
import "../../styles/pages/setup-wizard.css";

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

function LifecycleBar({ draft, active, completed, locked }) {
  const total = draft + active + completed + locked;
  if (total === 0) return null;
  const pct = (n) => `${(n / total) * 100}%`;

  const parts = [];
  if (active > 0) parts.push(`${active} active`);
  if (locked > 0) parts.push(`${locked} locked`);
  if (draft > 0) parts.push(`${draft} draft`);
  if (completed > 0) parts.push(`${completed} completed`);

  return (
    <div className="periods-lifecycle-bar">
      <div className="periods-lifecycle-top">
        <span className="periods-lifecycle-label">Period Lifecycle</span>
        <span className="periods-lifecycle-summary">{parts.join(" · ")}</span>
      </div>
      <div className="periods-lifecycle-track">
        {draft > 0 && <div className="periods-lifecycle-segment draft" style={{ width: pct(draft) }} />}
        {active > 0 && <div className="periods-lifecycle-segment active" style={{ width: pct(active) }} />}
        {completed > 0 && <div className="periods-lifecycle-segment completed" style={{ width: pct(completed) }} />}
        {locked > 0 && <div className="periods-lifecycle-segment locked" style={{ width: pct(locked) }} />}
      </div>
      <div className="periods-lifecycle-legend">
        <span className="periods-lifecycle-legend-item"><span className="periods-legend-dot draft" /> Draft ({draft})</span>
        <span className="periods-lifecycle-legend-item"><span className="periods-legend-dot active" /> Active ({active})</span>
        <span className="periods-lifecycle-legend-item"><span className="periods-legend-dot completed" /> Completed ({completed})</span>
        <span className="periods-lifecycle-legend-item"><span className="periods-legend-dot locked" /> Locked ({locked})</span>
      </div>
    </div>
  );
}

function ProgressCell({ period, stats }) {
  const status = getPeriodStatus(period);
  const progress = stats?.[period.id]?.progress;

  if (status === "draft") {
    return (
      <div className="periods-progress-cell">
        <span className="periods-progress-val muted">—</span>
        <div className="periods-progress-bar"><div className="periods-progress-fill" style={{ width: "0%" }} /></div>
      </div>
    );
  }

  const pct = progress ?? (status === "locked" || status === "completed" ? 100 : null);
  if (pct === null) {
    return (
      <div className="periods-progress-cell">
        <span className="periods-progress-val muted">—</span>
        <div className="periods-progress-bar"><div className="periods-progress-fill" style={{ width: "0%" }} /></div>
      </div>
    );
  }

  return (
    <div className="periods-progress-cell">
      <span className={`periods-progress-val${pct >= 100 ? " done" : ""}`}>{pct}%</span>
      <div className="periods-progress-bar"><div className="periods-progress-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export default function PeriodsPage() {
  const {
    organizationId,
    selectedPeriodId,
    frameworks = [],
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

  // Period stats state
  const [periodStats, setPeriodStats] = useState({});

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

  // Request-unlock modal (org admin asks super admin to unlock)
  const [requestUnlockTarget, setRequestUnlockTarget] = useState(null);

  // Map of period_id → pending unlock_requests row (refreshed after actions)
  const [pendingRequests, setPendingRequests] = useState({});

  // Lock period confirmation dialog (lock-only, with typed confirmation)
  const [lockTarget, setLockTarget] = useState(null);

  // Add/edit period drawer
  const [periodDrawerOpen, setPeriodDrawerOpen] = useState(false);
  const [periodDrawerTarget, setPeriodDrawerTarget] = useState(null);

  // Criteria summary drawer
  const [criteriaDrawerOpen, setCriteriaDrawerOpen] = useState(false);
  const [criteriaDrawerPeriod, setCriteriaDrawerPeriod] = useState(null);
  const [criteriaDrawerCriteria, setCriteriaDrawerCriteria] = useState([]);

  // Action menu open state
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    incLoading();
    periods.loadPeriods()
      .catch(() => setPanelError("period", "Could not load periods."))
      .finally(() => decLoading());
  }, [periods.loadPeriods]);


  const periodList = periods.periodList || [];

  // Load period stats
  useEffect(() => {
    if (!organizationId) return;
    listPeriodStats(organizationId)
      .then(setPeriodStats)
      .catch(() => {}); // Non-fatal — columns show "—" on failure
  }, [organizationId, periodList.length]);

  // Load pending unlock requests (map by period_id for O(1) lookup)
  const reloadPendingRequests = useCallback(async () => {
    try {
      const rows = await listUnlockRequests("pending");
      const map = {};
      for (const r of rows || []) {
        if (r?.period_id) map[r.period_id] = r;
      }
      setPendingRequests(map);
    } catch {
      // Non-fatal — direct unlock still attempts and server guard enforces correctness
    }
  }, []);

  useEffect(() => {
    reloadPendingRequests();
  }, [reloadPendingRequests, periodList.length]);

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

  // Pagination state
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => { setCurrentPage(1); }, [filteredList]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
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
    const target = unlockTarget;
    const result = await setEvalLock(target.id, false);
    // Server guards org admin from unlocking a period with scores.
    // Route them into the request-unlock flow instead.
    if (result && result.ok === false) {
      if (result.error_code === "cannot_unlock_period_has_scores") {
        setUnlockTarget(null);
        setRequestUnlockTarget(target);
        return;
      }
      _toast.error(`Could not unlock ${target.name || "period"}.`);
      setUnlockTarget(null);
      return;
    }
    periods.applyPeriodPatch({ id: target.id, is_locked: false });
    _toast.success(`${target.name || "Period"} unlocked — scoring re-enabled.`);
    setUnlockTarget(null);
  }

  async function handleRequestUnlock(reason) {
    if (!requestUnlockTarget) return { ok: false };
    const result = await requestPeriodUnlock(requestUnlockTarget.id, reason);
    if (result?.ok) {
      _toast.success(`Unlock request submitted for ${requestUnlockTarget.name || "period"}.`);
      reloadPendingRequests();
    }
    return result;
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
      // If a new framework was selected (or framework changed), clone + assign + freeze
      if (data.frameworkId && data.frameworkId !== periodDrawerTarget.framework_id) {
        try {
          const autoName = `${data.name} Framework`;
          const { id: clonedId } = await cloneFramework(data.frameworkId, autoName, organizationId);
          await assignFrameworkToPeriod(periodDrawerTarget.id, clonedId);
          periods.applyPeriodPatch({ id: periodDrawerTarget.id, framework_id: clonedId });
          try {
            await freezePeriodSnapshot(periodDrawerTarget.id);
          } catch {
            // Non-fatal: jury flow will freeze lazily on first load
          }
        } catch {
          // Non-fatal: period was updated, framework assignment failed
          // User can assign from Outcomes page
        }
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
        <div className="sem-header-actions mobile-toolbar-stack">
          <FilterButton
            className="mobile-toolbar-filter"
            activeCount={activeFilterCount}
            isOpen={filterOpen}
            onClick={() => { setFilterOpen((v) => !v); setExportOpen(false); }}
          />
          <button className="btn btn-outline btn-sm mobile-toolbar-export" onClick={() => { setExportOpen((v) => !v); setFilterOpen(false); }}>
            <Download size={14} strokeWidth={2} style={{ verticalAlign: "-1px" }} />
            {" "}Export
          </button>
          <button className="btn btn-primary btn-sm mobile-toolbar-secondary" onClick={openAddDrawer}>
            <Plus size={13} strokeWidth={2.2} />
            Add Period
          </button>
        </div>
      </div>
      {/* Filter panel */}
      {filterOpen && (
        <div className="filter-panel show">
          <div className="filter-panel-header">
            <div>
              <h4>
                <Filter size={14} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: "4px", opacity: 0.5, display: "inline" }} />
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
              <X size={12} strokeWidth={2} style={{ opacity: 0.5 }} />
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
            const header = ["Name", "Season", "Status", "Start Date", "End Date", "Projects", "Jurors", "Criteria", "Framework", "Current", "Locked", "Created"];
            const rows = sortedFilteredList.map((p) => {
              const st = periodStats[p.id] || {};
              const fw = frameworks.find((f) => f.id === p.framework_id);
              return [
                p.name ?? "", p.season ?? "", getPeriodStatus(p),
                p.start_date ?? "", p.end_date ?? "",
                st.projectCount ?? "", st.jurorCount ?? "", st.criteriaCount ?? "",
                fw?.name ?? "",
                p.is_current ? "Yes" : "No", p.is_locked ? "Yes" : "No",
                formatFull(p.created_at),
              ];
            });
            return generateTableBlob(fmt, {
              filenameType: "Periods", sheetName: "Evaluation Periods", periodName: "all",
              tenantCode: activeOrganization?.code || "", organization: activeOrganization?.name || "",
              department: activeOrganization?.institution || "", pdfTitle: "VERA — Evaluation Periods",
              header, rows, colWidths: [24, 10, 12, 12, 12, 10, 10, 10, 18, 8, 8, 16],
            });
          }}
          onExport={async (fmt) => {
            try {
              const header = ["Name", "Season", "Status", "Start Date", "End Date", "Projects", "Jurors", "Criteria", "Framework", "Current", "Locked", "Created"];
              const rows = sortedFilteredList.map((p) => {
                const st = periodStats[p.id] || {};
                const fw = frameworks.find((f) => f.id === p.framework_id);
                return [
                  p.name ?? "", p.season ?? "", getPeriodStatus(p),
                  p.start_date ?? "", p.end_date ?? "",
                  st.projectCount ?? "", st.jurorCount ?? "", st.criteriaCount ?? "",
                  fw?.name ?? "",
                  p.is_current ? "Yes" : "No", p.is_locked ? "Yes" : "No",
                  formatFull(p.created_at),
                ];
              });
              await downloadTable(fmt, {
                filenameType: "Periods", sheetName: "Evaluation Periods", periodName: "all",
                tenantCode: activeOrganization?.code || "", organization: activeOrganization?.name || "",
                department: activeOrganization?.institution || "", pdfTitle: "VERA — Evaluation Periods",
                header, rows, colWidths: [24, 10, 12, 12, 12, 10, 10, 10, 18, 8, 8, 16],
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
      {/* Lifecycle Bar */}
      <LifecycleBar
        draft={draftPeriods}
        active={activePeriods}
        completed={completedPeriods}
        locked={lockedPeriods}
      />
      {/* Error */}
      {panelError && (
        <FbAlert variant="danger" style={{ marginBottom: "12px" }}>
          {panelError}
        </FbAlert>
      )}
      {/* Table */}
      <div className="periods-table-card">
        <div className="periods-table-card-header">
          <div className="periods-table-card-title">All Evaluation Periods</div>
          <div className="periods-summary-badge">
            <CalendarRange size={13} strokeWidth={2.2} />
            {totalPeriods} {totalPeriods === 1 ? "period" : "periods"}{activePeriods > 0 ? ` · ${activePeriods} active` : ""}
          </div>
        </div>
        <div className="periods-table-scroll">
          <div className="sem-table-wrap">
        <table className="sem-table">
          <thead>
            <tr>
              <th className={`sortable${sortKey === "name" ? " sorted" : ""}`} style={{ minWidth: "160px" }} onClick={() => handleSort("name")}>
                Period <SortIcon colKey="name" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={`sortable${sortKey === "status" ? " sorted" : ""}`} style={{ width: "90px" }} onClick={() => handleSort("status")}>
                Status <SortIcon colKey="status" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th style={{ width: "130px" }}>Date Range</th>
              <th style={{ width: "64px", textAlign: "center" }}>Progress</th>
              <th style={{ width: "56px", textAlign: "center" }}>Projects</th>
              <th style={{ width: "50px", textAlign: "center" }}>Jurors</th>
              <th style={{ width: "110px" }}>Criteria Set</th>
              <th style={{ width: "90px" }}>Framework</th>
              <th className={`sortable${sortKey === "updated_at" ? " sorted" : ""}`} style={{ width: "80px" }} onClick={() => handleSort("updated_at")}>
                Updated <SortIcon colKey="updated_at" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th style={{ width: "36px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingCount > 0 && filteredList.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "32px" }}>
                  Loading periods…
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: "48px 24px" }}>
                  {statusFilter !== "all" ? (
                    <div style={{ color: "var(--text-tertiary)" }}>
                      No periods match the current filter.
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <div className="vera-es-card">
                        <div className="vera-es-hero vera-es-hero--period">
                          <div className="vera-es-icon vera-es-icon--period">
                            <CalendarRange size={24} strokeWidth={1.65} />
                          </div>
                          <div>
                            <div className="vera-es-title">No evaluation periods yet</div>
                            <div className="vera-es-desc">
                              An evaluation period defines the timeframe, criteria, and scope for jury evaluations. It is the foundation of your setup.
                            </div>
                          </div>
                        </div>
                        <div className="vera-es-actions">
                          <button
                            className="vera-es-action vera-es-action--primary-period"
                            onClick={() => onNavigate?.("setup")}
                          >
                            <div className="vera-es-num vera-es-num--period">1</div>
                            <div className="vera-es-action-text">
                              <div className="vera-es-action-label">Use Setup Wizard</div>
                              <div className="vera-es-action-sub">Guided 7-step configuration from scratch</div>
                            </div>
                            <span className="vera-es-badge vera-es-badge--period">Step 1</span>
                          </button>
                          <div className="vera-es-divider">or</div>
                          <button
                            className="vera-es-action vera-es-action--secondary"
                            onClick={openAddDrawer}
                          >
                            <div className="vera-es-num vera-es-num--secondary">2</div>
                            <div className="vera-es-action-text">
                              <div className="vera-es-action-label">Create manually</div>
                              <div className="vera-es-action-sub">Set name, dates, and options yourself</div>
                            </div>
                            <span className="vera-es-badge vera-es-badge--secondary">Manual</span>
                          </button>
                        </div>
                        <div className="vera-es-footer">
                          <Info size={12} strokeWidth={2} />
                          Required · Step 1 of 7 in minimum setup
                        </div>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ) : pagedList.map((period) => {
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
                  {/* Period name */}
                  <td data-label="Evaluation Period">
                    <div className="sem-name" style={period.is_locked ? { color: "var(--text-secondary)" } : undefined}>
                      {period.name}
                      {isCurrent && (
                        <span className="sem-badge-current"><span className="dot" /> Current</span>
                      )}
                    </div>
                    {(status === "active" || status === "draft") && (
                      <div className="sem-name-sub">
                        {status === "active" ? "Evaluation in progress" : "Setup in progress"}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td data-label="Status"><StatusPill status={status} /></td>

                  {/* Date Range */}
                  <td data-label="Date Range">
                    {period.start_date || period.end_date ? (
                      <span className="periods-date-range">
                        {period.start_date ? new Date(period.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                        <span className="periods-date-sep">→</span>
                        {period.end_date ? new Date(period.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-quaternary)", fontSize: 11 }}>—</span>
                    )}
                  </td>

                  {/* Progress */}
                  <td data-label="Progress" style={{ textAlign: "center" }}>
                    <ProgressCell period={period} stats={periodStats} />
                  </td>

                  {/* Projects */}
                  <td data-label="Projects" style={{ textAlign: "center" }}>
                    <span className={`periods-stat-val${(periodStats[period.id]?.projectCount || 0) === 0 ? " zero" : ""}`}>
                      {periodStats[period.id]?.projectCount ?? "—"}
                    </span>
                  </td>

                  {/* Jurors */}
                  <td data-label="Jurors" style={{ textAlign: "center" }}>
                    <span className={`periods-stat-val${(periodStats[period.id]?.jurorCount || 0) === 0 ? " zero" : ""}`}>
                      {periodStats[period.id]?.jurorCount ?? "—"}
                    </span>
                  </td>

                  {/* Mobile stats strip */}
                  <td className="periods-mobile-stats">
                    <div className="periods-mobile-stats-row">
                      <span className="periods-m-stat"><span className={`val${(periodStats[period.id]?.projectCount || 0) === 0 ? " zero" : ""}`}>{periodStats[period.id]?.projectCount ?? "—"}</span> projects</span>
                      <span className="periods-m-stat"><span className={`val${(periodStats[period.id]?.jurorCount || 0) === 0 ? " zero" : ""}`}>{periodStats[period.id]?.jurorCount ?? "—"}</span> jurors</span>
                      <span className="periods-m-stat"><span className={`val${(periodStats[period.id]?.criteriaCount || 0) === 0 ? " zero" : ""}`}>{periodStats[period.id]?.criteriaCount ?? "—"}</span> criteria</span>
                    </div>
                  </td>

                  {/* Criteria Set */}
                  <td data-label="Criteria Set">
                    {(() => {
                      const count = periodStats[period.id]?.criteriaCount ?? null;
                      if (!count) return <span className="periods-cset-badge muted">—</span>;
                      return (
                        <button
                          className="periods-cset-badge"
                          onClick={async () => {
                            try {
                              const rows = await listPeriodCriteria(period.id);
                              setCriteriaDrawerCriteria(getActiveCriteria(rows));
                            } catch {
                              setCriteriaDrawerCriteria([]);
                            }
                            setCriteriaDrawerPeriod(period);
                            setCriteriaDrawerOpen(true);
                          }}
                          title="View criteria summary"
                        >
                          <ListChecks size={12} strokeWidth={1.75} />
                          {count} {count === 1 ? "criterion" : "criteria"}
                        </button>
                      );
                    })()}
                  </td>

                  {/* Framework */}
                  <td data-label="Framework">
                    {(() => {
                      const fw = frameworks.find((f) => f.id === period.framework_id);
                      return fw ? (
                        <button
                          className="periods-fw-badge clickable"
                          onClick={() => onNavigate?.("outcomes")}
                          title="Go to Outcome Mapping"
                        >
                          <BadgeCheck size={11} strokeWidth={2} /> {fw.name}
                        </button>
                      ) : (
                        <span className="periods-fw-badge none">—</span>
                      );
                    })()}
                  </td>

                  {/* Updated */}
                  <td data-label="Last Updated">
                    <PremiumTooltip text={formatFull(period.updated_at)}>
                      <span className="vera-datetime-text">{formatRelative(period.updated_at)}</span>
                    </PremiumTooltip>
                  </td>

                  {/* Actions */}
                  <td className="col-actions">
                    <FloatingMenu
                      isOpen={openMenuId === period.id}
                      onClose={() => setOpenMenuId(null)}
                      placement="bottom-end"
                      trigger={
                        <button
                          className="sem-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId((prev) => (prev === period.id ? null : period.id));
                          }}
                          title="Actions"
                        >
                          <MoreVertical size={14} />
                        </button>
                      }
                    >
                      {/* Activation row */}
                      {isCurrent ? (
                        <button className="floating-menu-item" disabled>
                          <CheckCircle size={13} />
                          Current Period
                        </button>
                      ) : period.is_locked ? (
                        <button className="floating-menu-item" disabled>
                          <Lock size={13} />
                          Set as Current (Locked)
                        </button>
                      ) : (
                        <button
                          className="floating-menu-item"
                          onMouseDown={() => { setOpenMenuId(null); openSetCurrentModal(period); }}
                        >
                          <Play size={13} />
                          Set as Current Period
                        </button>
                      )}

                      {/* Edit */}
                      <div className="floating-menu-divider" />
                      <button className="floating-menu-item" onMouseDown={() => { setOpenMenuId(null); openEditDrawer(period); }}>
                        <Pencil size={13} />
                        Edit Evaluation Period
                      </button>

                      {/* Danger zone */}
                      <div className="floating-menu-divider" />
                      {period.is_locked && pendingRequests[period.id] ? (
                        <button className="floating-menu-item" disabled>
                          <LockOpen size={13} />
                          Unlock Requested — awaiting super admin
                        </button>
                      ) : period.is_locked ? (
                        <button
                          className="floating-menu-item"
                          onMouseDown={() => { setOpenMenuId(null); setUnlockTarget(period); }}
                        >
                          <LockOpen size={13} />
                          Unlock Period
                        </button>
                      ) : (
                        <button
                          className="floating-menu-item danger"
                          onMouseDown={() => { setOpenMenuId(null); setLockTarget(period); }}
                        >
                          <Lock size={13} />
                          Lock Period
                        </button>
                      )}
                      {isCurrent ? (
                        <button className="floating-menu-item" disabled>
                          <Trash2 size={13} />
                          Delete Period
                        </button>
                      ) : (
                        <button
                          className="floating-menu-item danger"
                          onMouseDown={() => { setOpenMenuId(null); setDeletePeriodTarget(period); }}
                        >
                          <Trash2 size={13} />
                          Delete Period
                        </button>
                      )}
                    </FloatingMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
          </div>
        </div>
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredList.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          itemLabel="periods"
        />
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
      {/* Request-unlock modal (org admin → super admin approval) */}
      <RequestUnlockModal
        open={!!requestUnlockTarget}
        onClose={() => setRequestUnlockTarget(null)}
        period={requestUnlockTarget}
        onRequest={handleRequestUnlock}
      />
      {/* Add / Edit period drawer */}
      <AddEditPeriodDrawer
        open={periodDrawerOpen}
        onClose={() => setPeriodDrawerOpen(false)}
        period={periodDrawerTarget}
        onSave={handleSavePeriod}
        allPeriods={periodList}
        frameworks={frameworks}
        onNavigateToCriteria={() => onNavigate?.("criteria")}
        onNavigateToOutcomes={() => onNavigate?.("outcomes")}
      />
      {/* Criteria summary drawer */}
      <PeriodCriteriaDrawer
        open={criteriaDrawerOpen}
        onClose={() => setCriteriaDrawerOpen(false)}
        period={criteriaDrawerPeriod}
        criteria={criteriaDrawerCriteria}
        isLocked={criteriaDrawerPeriod?.is_locked}
        otherPeriods={[]}
        onApplyTemplate={() => { setCriteriaDrawerOpen(false); onNavigate?.("criteria"); }}
        onCopyFromPeriod={() => { setCriteriaDrawerOpen(false); onNavigate?.("criteria"); }}
        onEditCriteria={() => { setCriteriaDrawerOpen(false); onNavigate?.("criteria"); }}
        onClearCriteria={() => { setCriteriaDrawerOpen(false); onNavigate?.("criteria"); }}
        onRenamePeriod={(p) => { setCriteriaDrawerOpen(false); openEditDrawer(p); }}
        onDeletePeriod={(p) => { setCriteriaDrawerOpen(false); setDeletePeriodTarget(p); }}
      />
    </div>
  );
}
