// src/admin/pages/PeriodsPage.jsx — Phase 7
// Evaluation Periods management page.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import {
  setEvalLock,
  deletePeriod,
  listPeriodStats,
  requestPeriodUnlock,
  listUnlockRequests,
  checkPeriodReadiness,
  publishPeriod,
  closePeriod,
  generateEntryToken,
  getActiveEntryTokenPlain,
} from "@/shared/api";
import {
  Lock,
  LockOpen,
  Trash2,
  FileEdit,
  Play,
  CheckCircle2,
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
  Copy,
  AlertCircle,
  ArrowRight,
  Send,
  Archive,
  QrCode,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Workflow,
} from "lucide-react";
import PremiumTooltip from "@/shared/ui/PremiumTooltip";
import { useFloating } from "@/shared/hooks/useFloating";
import RevertToDraftModal from "../modals/RevertToDraftModal";
import RequestRevertModal from "../modals/RequestRevertModal";
import PublishPeriodModal from "../modals/PublishPeriodModal";
import ClosePeriodModal from "../modals/ClosePeriodModal";
import DeletePeriodModal from "../modals/DeletePeriodModal";
import FloatingMenu from "@/shared/ui/FloatingMenu";
import Pagination from "@/shared/ui/Pagination";
import { formatDateTime as formatFull } from "@/shared/lib/dateUtils";
import {
  setRawToken as storageSetRawToken,
  clearRawToken as storageClearRawToken,
} from "@/shared/storage/adminStorage";
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


// Five-state lifecycle derivation. Draft splits into "incomplete" / "ready" as
// a UI nuance — the readiness check flips this flag automatically whenever
// criteria or projects change. State transitions (Draft→Published→Live→Closed)
// require deliberate admin actions; readiness does not.
function getPeriodState(period, hasScores, readiness) {
  if (period.closed_at) return "closed";
  if (period.is_locked && hasScores) return "live";
  if (period.is_locked) return "published";
  return readiness?.ok ? "draft_ready" : "draft_incomplete";
}

function StatusPill({ status }) {
  if (status === "draft_incomplete" || status === "draft_ready" || status === "draft") {
    return (
      <span className="sem-status sem-status-draft">
        <FileEdit size={12} />
        Draft
      </span>
    );
  }
  if (status === "published") {
    return (
      <span className="sem-status sem-status-published">
        <Send size={12} />
        Published
      </span>
    );
  }
  if (status === "live") {
    return (
      <span className="sem-status sem-status-live">
        <Play size={12} />
        Live
      </span>
    );
  }
  if (status === "closed") {
    return (
      <span className="sem-status sem-status-closed">
        <Archive size={12} />
        Closed
      </span>
    );
  }
  // Legacy fallback — should not hit after rollout completes.
  return (
    <span className="sem-status sem-status-locked">
      <Lock size={12} />
      Locked
    </span>
  );
}

// ReadinessPopover: self-contained badge + portal inspector for Draft periods.
// Uses useFloating so the panel is never clipped by ancestor overflow:hidden.
function ReadinessPopover({ readiness, onFix }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const { floatingRef, floatingStyle } = useFloating({
    triggerRef,
    isOpen,
    onClose: () => setIsOpen(false),
    placement: 'bottom-start',
    offset: 6,
    zIndex: 'var(--z-dropdown)',
  });

  if (!readiness) return null;

  const required = (readiness.issues || []).filter((i) => i.severity === "required");
  const optional = (readiness.issues || []).filter((i) => i.severity === "optional");
  const isReady = readiness.ok;

  const fixTargetFor = (check) => {
    if (["criteria_name_missing", "no_criteria", "weight_mismatch", "missing_rubric_bands"].includes(check)) return "criteria";
    if (check === "no_projects") return "projects";
    if (check === "no_framework" || check === "no_outcomes") return "outcomes";
    if (check === "no_jurors") return "jurors";
    return null;
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`periods-readiness-badge${isReady ? " ready" : " blocked"}`}
        onClick={() => setIsOpen((o) => !o)}
      >
        {isReady ? (
          <>
            <CheckCircle2 size={11} strokeWidth={2} />
            Ready
          </>
        ) : (
          <>
            <AlertCircle size={11} strokeWidth={2} />
            {required.length} issue{required.length === 1 ? "" : "s"}
          </>
        )}
      </button>
      {isOpen && createPortal(
        <div
          ref={floatingRef}
          className="periods-readiness-inspector"
          style={floatingStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="periods-readiness-inspector-header">
            <div>
              <div className="periods-readiness-inspector-title">Publish readiness</div>
              <div className="periods-readiness-inspector-sub">
                {isReady
                  ? "All required checks pass. You can publish this period."
                  : `${required.length} required check${required.length === 1 ? "" : "s"} remaining.`}
              </div>
            </div>
            <button className="periods-readiness-inspector-close" onClick={() => setIsOpen(false)} aria-label="Close">
              <X size={13} strokeWidth={2} />
            </button>
          </div>
          {required.length > 0 && (
            <div className="periods-readiness-section">
              <div className="periods-readiness-section-label required">Required</div>
              {required.map((issue) => {
                const target = fixTargetFor(issue.check);
                return (
                  <div key={issue.check} className="periods-readiness-row required">
                    <AlertCircle size={12} strokeWidth={2} />
                    <span className="periods-readiness-msg">{issue.msg}</span>
                    {target && (
                      <button className="periods-readiness-fix" onClick={() => { onFix?.(target); setIsOpen(false); }}>
                        Fix <ArrowRight size={10} strokeWidth={2.2} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {optional.length > 0 && (
            <div className="periods-readiness-section">
              <div className="periods-readiness-section-label optional">Informational</div>
              {optional.map((issue) => {
                const target = fixTargetFor(issue.check);
                return (
                  <div key={issue.check} className="periods-readiness-row optional">
                    <Info size={12} strokeWidth={2} />
                    <span className="periods-readiness-msg">{issue.msg}</span>
                    {target && (
                      <button className="periods-readiness-fix" onClick={() => { onFix?.(target); setIsOpen(false); }}>
                        Fix <ArrowRight size={10} strokeWidth={2.2} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
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

function LifecycleBar({ draft, published, live, closed }) {
  const total = draft + published + live + closed;
  if (total === 0) return null;
  const pct = (n) => `${(n / total) * 100}%`;

  const parts = [];
  if (draft > 0) parts.push(`${draft} draft`);
  if (published > 0) parts.push(`${published} published`);
  if (live > 0) parts.push(`${live} live`);
  if (closed > 0) parts.push(`${closed} closed`);

  return (
    <div className="periods-lifecycle-bar">
      <div className="periods-lifecycle-top">
        <span className="periods-lifecycle-label">Period Lifecycle</span>
        <span className="periods-lifecycle-summary">{parts.join(" · ")}</span>
      </div>
      <div className="periods-lifecycle-track">
        {draft > 0 && <div className="periods-lifecycle-segment draft" style={{ width: pct(draft) }} />}
        {published > 0 && <div className="periods-lifecycle-segment published" style={{ width: pct(published) }} />}
        {live > 0 && <div className="periods-lifecycle-segment live" style={{ width: pct(live) }} />}
        {closed > 0 && <div className="periods-lifecycle-segment closed" style={{ width: pct(closed) }} />}
      </div>
      <div className="periods-lifecycle-legend">
        <span className="periods-lifecycle-legend-item"><span className="periods-legend-dot draft" /> Draft ({draft})</span>
        <span className="periods-lifecycle-legend-item"><span className="periods-legend-dot published" /> Published ({published})</span>
        <span className="periods-lifecycle-legend-item"><span className="periods-legend-dot live" /> Live ({live})</span>
        <span className="periods-lifecycle-legend-item"><span className="periods-legend-dot closed" /> Closed ({closed})</span>
      </div>
    </div>
  );
}

function ProgressCell({ period, stats }) {
  const pstats = stats?.[period.id] || {};
  const progress = pstats.progress;
  const isDraft = !period.is_locked;
  const isClosed = !!period.closed_at;

  if (isDraft) {
    return (
      <div className="periods-progress-cell">
        <span className="periods-progress-val muted">—</span>
        <div className="periods-progress-bar"><div className="periods-progress-fill" style={{ width: "0%" }} /></div>
      </div>
    );
  }

  const pct = progress ?? (isClosed ? 100 : null);
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

// LifecycleGuide: collapsible explanatory block shown between the KPI strip
// and the LifecycleBar. Teaches admins what each stage means and what action
// is required to advance. Collapse state is persisted to localStorage so
// experienced admins can permanently dismiss it.
const GUIDE_KEY = "vera_periods_lifecycle_guide_open";

function LifecycleGuide() {
  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(GUIDE_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      try { localStorage.setItem(GUIDE_KEY, String(next)); } catch { /* noop */ }
      return next;
    });
  }

  const stages = [
    {
      key: "draft",
      icon: <FileEdit size={12} strokeWidth={2.2} />,
      label: "Draft",
      desc: "Set up criteria, projects & jurors",
      action: "Publish →",
    },
    {
      key: "published",
      icon: <Send size={12} strokeWidth={2.2} />,
      label: "Published",
      desc: "Jurors can join via QR or entry link",
      action: "Scores arrive →",
    },
    {
      key: "live",
      icon: <Play size={12} strokeWidth={2.2} />,
      label: "Live",
      desc: "Evaluation in progress, scores incoming",
      action: "Close →",
    },
    {
      key: "closed",
      icon: <Archive size={12} strokeWidth={2.2} />,
      label: "Closed",
      desc: "Rankings archived, period complete",
      action: null,
    },
  ];

  return (
    <div className="periods-lifecycle-guide">
      <div
        className="periods-lifecycle-guide-header"
        onClick={toggle}
        role="button"
        aria-expanded={open}
        aria-controls="periods-lifecycle-guide-body"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
      >
        <div className="periods-lifecycle-guide-left">
          <div className="periods-lifecycle-guide-icon">
            <Workflow size={14} strokeWidth={2} />
          </div>
          <div>
            <div className="periods-lifecycle-guide-title">Period Lifecycle</div>
            <div className="periods-lifecycle-guide-sub">How a period progresses from setup to completion</div>
          </div>
        </div>
        <button
          type="button"
          className="periods-lifecycle-guide-collapse-btn"
          aria-label={open ? "Collapse lifecycle guide" : "Expand lifecycle guide"}
          tabIndex={-1}
          onClick={(e) => { e.stopPropagation(); toggle(); }}
        >
          {open ? <ChevronUp size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
        </button>
      </div>

      {open && (
        <div className="periods-lifecycle-guide-body" id="periods-lifecycle-guide-body">
          <div className="periods-lifecycle-guide-flow">
            {stages.map((stage, idx) => (
              <div key={stage.key} className="periods-lifecycle-guide-step">
                <div className="periods-lifecycle-guide-stage">
                  <span className={`periods-lifecycle-guide-pill ${stage.key}`}>
                    {stage.icon}
                    {stage.label}
                  </span>
                  <span className="periods-lifecycle-guide-stage-desc">{stage.desc}</span>
                  {stage.action && (
                    <span className="periods-lifecycle-guide-action-label">{stage.action}</span>
                  )}
                </div>
                {idx < stages.length - 1 && (
                  <div className="periods-lifecycle-guide-arrow">
                    <ArrowRight size={13} strokeWidth={1.8} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <FbAlert variant="info" style={{ marginTop: 12 }}>
            Each transition requires an explicit admin action. Closed periods are permanent and cannot be re-opened.
          </FbAlert>
        </div>
      )}
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

  // Readiness state — map of period_id → { ok, issues, counts } for Draft rows.
  // Populated after periodList loads; refreshed when stats reload (proxy for
  // underlying criteria/project changes). Locked periods don't need readiness.
  const [periodReadiness, setPeriodReadiness] = useState({});

  // Filter/export panel state
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [frameworkFilter, setFrameworkFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all");
  const [readinessFilter, setReadinessFilter] = useState("all");
  const [hasProjectsFilter, setHasProjectsFilter] = useState("all");
  const [hasJurorsFilter, setHasJurorsFilter] = useState("all");
  const [sortKey, setSortKey] = useState("start_date");
  const [sortDir, setSortDir] = useState("desc");

  // Active filter count
  const activeFilterCount = [statusFilter, dateRangeFilter, frameworkFilter, progressFilter, readinessFilter, hasProjectsFilter, hasJurorsFilter].filter((v) => v !== "all").length;

  function clearAllFilters() {
    setStatusFilter("all");
    setDateRangeFilter("all");
    setFrameworkFilter("all");
    setProgressFilter("all");
    setReadinessFilter("all");
    setHasProjectsFilter("all");
    setHasJurorsFilter("all");
  }

  // Delete period modal
  const [deletePeriodTarget, setDeletePeriodTarget] = useState(null);

  // Revert-to-Draft modal (direct revert when no scores)
  const [revertTarget, setRevertTarget] = useState(null);

  // Request-revert modal (org admin asks super admin to approve revert)
  const [requestRevertTarget, setRequestRevertTarget] = useState(null);

  // Map of period_id → pending unlock_requests row (refreshed after actions)
  const [pendingRequests, setPendingRequests] = useState({});

  // Publish period confirmation dialog (Draft → Published transition)
  const [publishTarget, setPublishTarget] = useState(null);

  // Close period confirmation dialog (Published/Live → Closed terminal state)
  const [closeTarget, setCloseTarget] = useState(null);

  // Add/edit period drawer
  const [periodDrawerOpen, setPeriodDrawerOpen] = useState(false);
  const [periodDrawerTarget, setPeriodDrawerTarget] = useState(null);

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

  // Load readiness for all Draft (not-yet-locked) periods. Locked periods
  // already passed readiness, so we skip them. Runs alongside stats reloads
  // to catch criteria/project edits that may have shifted readiness.
  useEffect(() => {
    const draftIds = periodList.filter((p) => !p.is_locked).map((p) => p.id);
    if (draftIds.length === 0) {
      setPeriodReadiness({});
      return;
    }
    let cancelled = false;
    Promise.all(
      draftIds.map((id) =>
        checkPeriodReadiness(id).then((r) => [id, r]).catch(() => [id, null])
      )
    ).then((pairs) => {
      if (cancelled) return;
      const next = {};
      for (const [id, r] of pairs) if (r) next[id] = r;
      setPeriodReadiness(next);
    });
    return () => { cancelled = true; };
  }, [periodList.map((p) => `${p.id}:${p.is_locked}:${p.closed_at ?? ""}`).sort().join(","), periodStats]);

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
  // Simplified state-based KPI tallies — derived from the new 5-state model.
  const draftPeriods = periodList.filter((p) => !p.is_locked).length;
  const publishedPeriods = periodList.filter((p) => p.is_locked && !p.closed_at && !(periodStats[p.id]?.hasScores)).length;
  const livePeriods = periodList.filter((p) => p.is_locked && !p.closed_at && periodStats[p.id]?.hasScores).length;
  const closedPeriods = periodList.filter((p) => !!p.closed_at).length;

  // Helper to pull the canonical state label for a period inside filter/sort
  // callbacks. Filter maps "draft" → both draft_ready and draft_incomplete.
  const getState = (p) => getPeriodState(
    p,
    !!periodStats[p.id]?.hasScores,
    periodReadiness[p.id]
  );

  // Filtered list
  const filteredList = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    return periodList.filter((p) => {
      const state = getState(p);
      const stats = periodStats[p.id] || {};

      // Status
      if (statusFilter !== "all") {
        if (statusFilter === "draft" && state !== "draft_ready" && state !== "draft_incomplete") return false;
        if (statusFilter !== "draft" && state !== statusFilter) return false;
      }

      // Date range
      if (dateRangeFilter !== "all") {
        const start = p.start_date ? new Date(p.start_date) : null;
        const end = p.end_date ? new Date(p.end_date) : null;
        if (dateRangeFilter === "this_year") {
          const inYear = (start && start.getFullYear() === currentYear) || (end && end.getFullYear() === currentYear);
          if (!inYear) return false;
        } else if (dateRangeFilter === "past") {
          if (!end || end >= now) return false;
        } else if (dateRangeFilter === "future") {
          if (!start || start <= now) return false;
        }
      }

      // Framework
      if (frameworkFilter !== "all") {
        if (frameworkFilter === "not_set" && p.framework_id) return false;
        if (frameworkFilter !== "not_set" && p.framework_id !== frameworkFilter) return false;
      }

      // Progress
      if (progressFilter !== "all") {
        const progress = stats.progress ?? null;
        const isClosed = !!p.closed_at;
        if (progressFilter === "not_started" && (stats.hasScores && progress > 0)) return false;
        if (progressFilter === "in_progress" && (!stats.hasScores || progress === null || progress >= 100 || isClosed)) return false;
        if (progressFilter === "complete" && !isClosed && (progress === null || progress < 100)) return false;
      }

      // Readiness (draft periods only)
      if (readinessFilter !== "all") {
        if (readinessFilter === "ready" && state !== "draft_ready") return false;
        if (readinessFilter === "incomplete" && state !== "draft_incomplete") return false;
      }

      // Has projects
      if (hasProjectsFilter !== "all") {
        const count = stats.projectCount ?? 0;
        if (hasProjectsFilter === "yes" && count === 0) return false;
        if (hasProjectsFilter === "no" && count > 0) return false;
      }

      // Has jurors
      if (hasJurorsFilter !== "all") {
        const count = stats.jurorCount ?? 0;
        if (hasJurorsFilter === "yes" && count === 0) return false;
        if (hasJurorsFilter === "no" && count > 0) return false;
      }

      return true;
    });
  }, [periodList, statusFilter, dateRangeFilter, frameworkFilter, progressFilter, readinessFilter, hasProjectsFilter, hasJurorsFilter, periodStats, periodReadiness]);

  const sortedFilteredList = useMemo(() => {
    const statusRank = { draft_incomplete: 1, draft_ready: 2, published: 3, live: 4, closed: 5 };
    const rows = [...filteredList];
    rows.sort((a, b) => {
      const direction = sortDir === "asc" ? 1 : -1;
      const aName = String(a.name || "");
      const bName = String(b.name || "");
      let cmp = 0;
      if (sortKey === "name") {
        cmp = aName.localeCompare(bName, "tr", { sensitivity: "base", numeric: true });
      } else if (sortKey === "status") {
        cmp = (statusRank[getState(a)] || 0) - (statusRank[getState(b)] || 0);
      } else if (sortKey === "start_date") {
        const aTs = Date.parse(a.start_date || "");
        const bTs = Date.parse(b.start_date || "");
        const aValue = Number.isFinite(aTs) ? aTs : Number.NEGATIVE_INFINITY;
        const bValue = Number.isFinite(bTs) ? bTs : Number.NEGATIVE_INFINITY;
        cmp = aValue - bValue;
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


  function openAddDrawer() {
    setPeriodDrawerTarget(null);
    setPeriodDrawerOpen(true);
  }

  function openEditDrawer(period) {
    setPeriodDrawerTarget(period);
    setPeriodDrawerOpen(true);
    setOpenMenuId(null);
  }

  async function handlePublishPeriod() {
    if (!publishTarget) return;
    const target = publishTarget;
    const result = await publishPeriod(target.id);
    if (result && result.ok === false) {
      if (result.error_code === "readiness_failed") {
        _toast.error(`${target.name || "Period"} is not ready to publish. Review the readiness panel.`);
      } else {
        _toast.error(`Could not publish ${target.name || "period"}.`);
      }
      throw new Error(result.error_code || "publish_failed");
    }
    periods.applyPeriodPatch({
      id: target.id,
      is_locked: true,
      activated_at: result?.activated_at || new Date().toISOString(),
    });
    // Refresh readiness so the badge clears.
    setPeriodReadiness((prev) => {
      const next = { ...prev };
      delete next[target.id];
      return next;
    });

    // Auto-generate a QR entry token on first publish so the admin doesn't
    // have to make a second trip to Entry Control. If publish was a no-op
    // (already published) we skip this — the existing token is still valid.
    // Critical: the freshly-issued plaintext must be persisted to storage
    // using the same key Entry Control reads from, otherwise Entry Control
    // will show the QR of a stale/revoked token left over from a previous
    // run and jurors will scan an invalid code.
    let tokenToastSuffix = "";
    if (!result?.already_published) {
      // Clear any stale plaintext first — generateEntryToken revokes old
      // tokens server-side, but the localStorage plaintext must not linger.
      storageClearRawToken(target.id);
      try {
        const freshToken = await generateEntryToken(target.id);
        if (freshToken) storageSetRawToken(target.id, freshToken);
        tokenToastSuffix = " QR ready.";
      } catch {
        tokenToastSuffix = " (Generate QR manually.)";
      }
    }

    _toast.success(
      result?.already_published
        ? `${target.name || "Period"} was already published.`
        : `${target.name || "Period"} published.${tokenToastSuffix}`
    );
    setPublishTarget(null);
  }

  async function handleCopyEntryLink(period) {
    try {
      const token = await getActiveEntryTokenPlain(period.id);
      if (!token) {
        _toast.error("No active QR token. Open Entry Control to generate one.");
        return;
      }
      const basePath = isDemoMode ? "/demo" : "";
      const url = `${window.location.origin}${basePath}/eval?t=${encodeURIComponent(token)}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch { /* noop */ }
        document.body.removeChild(ta);
      }
      _toast.success("Entry link copied to clipboard.");
    } catch {
      _toast.error("Could not copy entry link. Try Entry Control.");
    }
  }

  async function handleRevertPeriod() {
    if (!revertTarget) return;
    const target = revertTarget;
    // Underlying RPC remains rpc_admin_set_period_lock (wrapped by
    // setEvalLock). Server rejects when scores exist, prompting the
    // request-revert flow.
    const result = await setEvalLock(target.id, false);
    if (result && result.ok === false) {
      if (result.error_code === "cannot_unlock_period_has_scores") {
        setRevertTarget(null);
        setRequestRevertTarget(target);
        return;
      }
      _toast.error(`Could not revert ${target.name || "period"}.`);
      setRevertTarget(null);
      return;
    }
    periods.applyPeriodPatch({ id: target.id, is_locked: false, closed_at: null });
    // Server-side RPCs revoke entry_tokens on revert; mirror that on the
    // client so Entry Control doesn't display a stale plaintext QR.
    storageClearRawToken(target.id);
    _toast.success(`${target.name || "Period"} reverted to Draft — structural editing re-enabled.`);
    setRevertTarget(null);
  }

  async function handleRequestRevert(reason) {
    if (!requestRevertTarget) return { ok: false };
    const result = await requestPeriodUnlock(requestRevertTarget.id, reason);
    if (result?.ok) {
      _toast.success(`Revert request submitted for ${requestRevertTarget.name || "period"}.`);
      reloadPendingRequests();
    }
    return result;
  }

  async function handleClosePeriodAction() {
    if (!closeTarget) return;
    const target = closeTarget;
    const result = await closePeriod(target.id);
    if (result && result.ok === false) {
      if (result.error_code === "period_not_published") {
        _toast.error("Publish the period before closing it.");
      } else {
        _toast.error(`Could not close ${target.name || "period"}.`);
      }
      throw new Error(result.error_code || "close_failed");
    }
    periods.applyPeriodPatch({
      id: target.id,
      closed_at: result?.closed_at || new Date().toISOString(),
    });
    _toast.success(
      result?.already_closed
        ? `${target.name || "Period"} was already closed.`
        : `${target.name || "Period"} closed — rankings archived.`
    );
    setCloseTarget(null);
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
              <div className="filter-panel-sub">Narrow evaluation periods by status, date, framework, and setup state.</div>
            </div>
            <button className="filter-panel-close" onClick={() => setFilterOpen(false)}>&#215;</button>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label>Status</label>
              <CustomSelect
                compact
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "draft", label: "Draft" },
                  { value: "published", label: "Published" },
                  { value: "live", label: "Live" },
                  { value: "closed", label: "Closed" },
                ]}
                ariaLabel="Status"
              />
            </div>
            <div className="filter-group">
              <label>Date Range</label>
              <CustomSelect
                compact
                value={dateRangeFilter}
                onChange={setDateRangeFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "this_year", label: "This year" },
                  { value: "past", label: "Past" },
                  { value: "future", label: "Future" },
                ]}
                ariaLabel="Date Range"
              />
            </div>
            <div className="filter-group">
              <label>Framework</label>
              <CustomSelect
                compact
                value={frameworkFilter}
                onChange={setFrameworkFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "not_set", label: "Not set" },
                  ...(frameworks || []).map((fw) => ({ value: fw.id, label: fw.name })),
                ]}
                ariaLabel="Framework"
              />
            </div>
            <div className="filter-group">
              <label>Progress</label>
              <CustomSelect
                compact
                value={progressFilter}
                onChange={setProgressFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "not_started", label: "Not started" },
                  { value: "in_progress", label: "In progress" },
                  { value: "complete", label: "Complete" },
                ]}
                ariaLabel="Progress"
              />
            </div>
            <div className="filter-group">
              <label>Readiness</label>
              <CustomSelect
                compact
                value={readinessFilter}
                onChange={setReadinessFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "ready", label: "Ready to publish" },
                  { value: "incomplete", label: "Has issues" },
                ]}
                ariaLabel="Readiness"
              />
            </div>
            <div className="filter-group">
              <label>Has Projects</label>
              <CustomSelect
                compact
                value={hasProjectsFilter}
                onChange={setHasProjectsFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                ariaLabel="Has Projects"
              />
            </div>
            <div className="filter-group">
              <label>Has Jurors</label>
              <CustomSelect
                compact
                value={hasJurorsFilter}
                onChange={setHasJurorsFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                ariaLabel="Has Jurors"
              />
            </div>
            <button className="btn btn-outline btn-sm filter-clear-btn" onClick={clearAllFilters}>
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
            const header = ["Period", "Status", "Date Range", "Progress", "Projects", "Jurors", "Criteria Set", "Outcome", "Updated At"];
            const rows = sortedFilteredList.map((p) => {
              const st = periodStats[p.id] || {};
              const fw = frameworks.find((f) => f.id === p.framework_id);
              const isDraft = !p.is_locked;
              const pct = isDraft ? null : (st.progress ?? (p.closed_at ? 100 : null));
              const criteriaCount = st.criteriaCount ?? 0;
              return [
                p.name ?? "",
                getState(p),
                p.start_date && p.end_date ? `${p.start_date} – ${p.end_date}` : (p.start_date ?? p.end_date ?? "—"),
                pct !== null ? `${pct}%` : "—",
                st.projectCount ?? "",
                st.jurorCount ?? "",
                p.criteria_name || (criteriaCount > 0 ? `${criteriaCount} criteria` : "Not set"),
                fw?.name ?? "Not set",
                formatFull(p.updated_at),
              ];
            });
            return generateTableBlob(fmt, {
              filenameType: "Periods", sheetName: "Evaluation Periods", periodName: "",
              tenantCode: activeOrganization?.code || "", organization: activeOrganization?.name || "",
              department: activeOrganization?.institution || "", pdfTitle: "VERA — Evaluation Periods",
              header, rows, colWidths: [24, 12, 22, 12, 10, 10, 16, 16, 16],
            });
          }}
          onExport={async (fmt) => {
            try {
              const header = ["Period", "Status", "Date Range", "Progress", "Projects", "Jurors", "Criteria Set", "Outcome", "Updated At"];
              const rows = sortedFilteredList.map((p) => {
                const st = periodStats[p.id] || {};
                const fw = frameworks.find((f) => f.id === p.framework_id);
                const isDraft = !p.is_locked;
                const pct = isDraft ? null : (st.progress ?? (p.closed_at ? 100 : null));
                const criteriaCount = st.criteriaCount ?? 0;
                return [
                  p.name ?? "",
                  getState(p),
                  p.start_date && p.end_date ? `${p.start_date} – ${p.end_date}` : (p.start_date ?? p.end_date ?? "—"),
                  pct !== null ? `${pct}%` : "—",
                  st.projectCount ?? "",
                  st.jurorCount ?? "",
                  p.criteria_name || (criteriaCount > 0 ? `${criteriaCount} criteria` : "Not set"),
                  fw?.name ?? "Not set",
                  formatFull(p.updated_at),
                ];
              });
              await downloadTable(fmt, {
                filenameType: "Periods", sheetName: "Evaluation Periods", periodName: "",
                tenantCode: activeOrganization?.code || "", organization: activeOrganization?.name || "",
                department: activeOrganization?.institution || "", pdfTitle: "VERA — Evaluation Periods",
                header, rows, colWidths: [24, 12, 22, 12, 10, 10, 16, 16, 16],
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
          <div className="scores-kpi-item-value" style={{ color: "#2563eb" }}>{publishedPeriods}</div>
          <div className="scores-kpi-item-label">Published</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value"><span className="success">{livePeriods}</span></div>
          <div className="scores-kpi-item-label">Live</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value" style={{ color: "#64748b" }}>{closedPeriods}</div>
          <div className="scores-kpi-item-label">Closed</div>
        </div>
      </div>
      {/* Lifecycle Guide — explanatory block */}
      <LifecycleGuide />
      {/* Lifecycle Bar — distribution of current periods */}
      <LifecycleBar
        draft={draftPeriods}
        published={publishedPeriods}
        live={livePeriods}
        closed={closedPeriods}
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
        </div>
        <div className="periods-table-scroll">
          <div className="sem-table-wrap">
        <table className="sem-table table-standard table-pill-balance">
          <thead>
            <tr>
              <th className={`sortable${sortKey === "name" ? " sorted" : ""}`} style={{ minWidth: "140px" }} onClick={() => handleSort("name")}>
                Period <SortIcon colKey="name" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={`sortable${sortKey === "status" ? " sorted" : ""}`} style={{ width: "84px" }} onClick={() => handleSort("status")}>
                Status <SortIcon colKey="status" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={`sortable${sortKey === "start_date" ? " sorted" : ""}`} style={{ width: "110px" }} onClick={() => handleSort("start_date")}>
                Date Range <SortIcon colKey="start_date" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th style={{ width: "60px", textAlign: "center" }}>Progress</th>
              <th className="col-projects" style={{ width: "48px", textAlign: "center" }}>Projects</th>
              <th className="col-jurors" style={{ width: "44px", textAlign: "center" }}>Jurors</th>
              <th style={{ width: "100px" }}>Criteria Set</th>
              <th style={{ width: "80px" }}>Outcome</th>
              <th className={`sortable${sortKey === "updated_at" ? " sorted" : ""}`} style={{ width: "70px" }} onClick={() => handleSort("updated_at")}>
                Updated At <SortIcon colKey="updated_at" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th style={{ width: "32px" }}>Actions</th>
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
                  {activeFilterCount > 0 ? (
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
              const state = getState(period);
              const isDraft = state === "draft_ready" || state === "draft_incomplete";
              return (
                <tr
                  key={period.id}
                  className={[
                    "mcard",
                    isDraft ? "sem-row-draft" : "",
                    openMenuId === period.id ? "is-active" : "",
                  ].filter(Boolean).join(" ")}
                >
                  {/* Period name */}
                  <td data-label="Evaluation Period">
                    <div className="sem-name" style={period.is_locked ? { color: "var(--text-secondary)" } : undefined}>
                      {period.name}
                    </div>
                    {(state === "live" || isDraft) && (
                      <div className="sem-name-sub">
                        {state === "live" ? "Evaluation in progress" : "Setup in progress"}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td data-label="Status">
                    <div className="periods-status-cell">
                      <StatusPill status={state} />
                      {isDraft && (
                        <ReadinessPopover
                          readiness={periodReadiness[period.id]}
                          onFix={(target) => {
                            onCurrentSemesterChange?.(period.id);
                            onNavigate?.(target);
                          }}
                        />
                      )}
                    </div>
                  </td>

                  {/* Date Range */}
                  <td data-label="Date Range">
                    {period.start_date || period.end_date ? (
                      <span className="periods-date-range">
                        {period.start_date ? new Date(period.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                        <span className="periods-date-sep">→</span>
                        {period.end_date ? new Date(period.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—"}
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
                  <td data-label="Projects" className="col-projects" style={{ textAlign: "center" }}>
                    <span className={`periods-stat-val${(periodStats[period.id]?.projectCount || 0) === 0 ? " zero" : ""}`}>
                      {periodStats[period.id]?.projectCount ?? "—"}
                    </span>
                  </td>

                  {/* Jurors */}
                  <td data-label="Jurors" className="col-jurors" style={{ textAlign: "center" }}>
                    <span className={`periods-stat-val${(periodStats[period.id]?.jurorCount || 0) === 0 ? " zero" : ""}`}>
                      {periodStats[period.id]?.jurorCount ?? "—"}
                    </span>
                  </td>

                  {/* Mobile stats strip */}
                  <td className="periods-mobile-stats">
                    <div className="periods-mobile-stats-row">
                      <span className="periods-m-stat"><span className={`val${(periodStats[period.id]?.projectCount || 0) === 0 ? " zero" : ""}`}>{periodStats[period.id]?.projectCount ?? "—"}</span> projects</span>
                      <span className="periods-m-stat"><span className={`val${(periodStats[period.id]?.jurorCount || 0) === 0 ? " zero" : ""}`}>{periodStats[period.id]?.jurorCount ?? "—"}</span> jurors</span>
                    </div>
                  </td>

                  {/* Criteria Set */}
                  <td data-label="Criteria Set">
                    {(() => {
                      const count = periodStats[period.id]?.criteriaCount ?? 0;
                      const cname = period.criteria_name;
                      const hasData = count > 0 || !!cname;
                      return (
                        <div className="periods-cset-cell">
                          {hasData ? (
                            <PremiumTooltip text="Go to Criteria page">
                              <button
                                className="periods-cset-badge"
                                onClick={() => {
                                  onCurrentSemesterChange?.(period.id);
                                  onNavigate?.("criteria");
                                }}
                              >
                                <ListChecks size={12} strokeWidth={1.75} />
                                {cname || `${count} criteria`}
                              </button>
                            </PremiumTooltip>
                          ) : (
                            <div className="periods-notset-row">
                              <span className="periods-notset-label">Not set</span>
                              <PremiumTooltip text="Configure criteria">
                                <button
                                  className="periods-notset-add-btn"
                                  onClick={() => {
                                    onCurrentSemesterChange?.(period.id);
                                    onNavigate?.("criteria");
                                  }}
                                >
                                  <Plus size={11} strokeWidth={2.5} />
                                </button>
                              </PremiumTooltip>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  {/* Outcome */}
                  <td data-label="Outcome">
                    {(() => {
                      const fw = frameworks.find((f) => f.id === period.framework_id);
                      return (
                        <div className="periods-fw-cell">
                          {fw ? (
                            <PremiumTooltip text="Go to Outcomes page">
                              <button
                                className="periods-fw-badge clickable"
                                onClick={() => {
                                  onCurrentSemesterChange?.(period.id);
                                  onNavigate?.("outcomes");
                                }}
                              >
                                <BadgeCheck size={11} strokeWidth={2} /> {fw.name}
                              </button>
                            </PremiumTooltip>
                          ) : (
                            <div className="periods-notset-row">
                              <span className="periods-notset-label">Not set</span>
                              <PremiumTooltip text="Configure framework">
                                <button
                                  className="periods-notset-add-btn"
                                  onClick={() => {
                                    onCurrentSemesterChange?.(period.id);
                                    onNavigate?.("outcomes");
                                  }}
                                >
                                  <Plus size={11} strokeWidth={2.5} />
                                </button>
                              </PremiumTooltip>
                            </div>
                          )}
                        </div>
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
                      {/* Edit */}
                      <button className="floating-menu-item" onMouseDown={() => { setOpenMenuId(null); openEditDrawer(period); }}>
                        <Pencil size={13} />
                        Edit Evaluation Period
                      </button>

                      {/* Duplicate */}
                      <button
                        className="floating-menu-item"
                        onMouseDown={() => { setOpenMenuId(null); periods.handleDuplicatePeriod(period.id); }}
                      >
                        <Copy size={13} />
                        Duplicate Period
                      </button>

                      {/* Entry access — only for Published/Live (locked, not closed) */}
                      {period.is_locked && !period.closed_at && (
                        <>
                          <div className="floating-menu-divider" />
                          <button
                            className="floating-menu-item"
                            onMouseDown={() => { setOpenMenuId(null); handleCopyEntryLink(period); }}
                          >
                            <LinkIcon size={13} />
                            Copy Entry Link
                          </button>
                          <button
                            className="floating-menu-item"
                            onMouseDown={() => {
                              setOpenMenuId(null);
                              onCurrentSemesterChange?.(period.id);
                              onNavigate?.("entry-control");
                            }}
                          >
                            <QrCode size={13} />
                            View QR Code
                          </button>
                        </>
                      )}

                      {/* Close Period — only for Published/Live (locked but not yet closed) */}
                      {period.is_locked && !period.closed_at && (
                        <button
                          className="floating-menu-item"
                          onMouseDown={() => { setOpenMenuId(null); setCloseTarget(period); }}
                        >
                          <Archive size={13} />
                          Close Period
                        </button>
                      )}

                      {/* Danger zone */}
                      <div className="floating-menu-divider" />
                      {period.is_locked && pendingRequests[period.id] ? (
                        <button className="floating-menu-item" disabled>
                          <LockOpen size={13} />
                          Revert Requested — awaiting super admin
                        </button>
                      ) : period.is_locked ? (
                        <button
                          className="floating-menu-item"
                          onMouseDown={() => { setOpenMenuId(null); setRevertTarget(period); }}
                        >
                          <LockOpen size={13} />
                          Revert to Draft
                        </button>
                      ) : (
                        (() => {
                          const readiness = periodReadiness[period.id];
                          const isReady = readiness?.ok === true;
                          const blockerCount = (readiness?.issues || []).filter((i) => i.severity === "required").length;
                          return (
                            <button
                              className="floating-menu-item"
                              disabled={!isReady}
                              onMouseDown={() => {
                                if (!isReady) return;
                                setOpenMenuId(null);
                                setPublishTarget(period);
                              }}
                              title={isReady ? undefined : `Fix ${blockerCount} issue${blockerCount === 1 ? "" : "s"} first`}
                            >
                              <Send size={13} />
                              {isReady ? "Publish Period" : `Publish Period (${blockerCount} issue${blockerCount === 1 ? "" : "s"})`}
                            </button>
                          );
                        })()
                      )}
                      {period.is_locked ? (
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
      {/* Delete period modal */}
      <DeletePeriodModal
        open={!!deletePeriodTarget}
        onClose={() => setDeletePeriodTarget(null)}
        period={deletePeriodTarget}
        onDelete={handleDeletePeriodViaModal}
      />
      {/* Revert-to-Draft modal */}
      <RevertToDraftModal
        open={!!revertTarget}
        onClose={() => setRevertTarget(null)}
        period={revertTarget}
        onRevert={handleRevertPeriod}
      />
      {/* Publish period modal */}
      <PublishPeriodModal
        open={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        period={publishTarget}
        onPublish={handlePublishPeriod}
      />
      {/* Close period modal */}
      <ClosePeriodModal
        open={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        period={closeTarget}
        onCloseAction={handleClosePeriodAction}
      />
      {/* Request-revert modal (org admin → super admin approval) */}
      <RequestRevertModal
        open={!!requestRevertTarget}
        onClose={() => setRequestRevertTarget(null)}
        period={requestRevertTarget}
        onRequest={handleRequestRevert}
      />
      {/* Add / Edit period drawer */}
      <AddEditPeriodDrawer
        open={periodDrawerOpen}
        onClose={() => setPeriodDrawerOpen(false)}
        period={periodDrawerTarget}
        onSave={handleSavePeriod}
        allPeriods={periodList}
      />
    </div>
  );
}
