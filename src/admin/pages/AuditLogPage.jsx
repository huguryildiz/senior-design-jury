// src/admin/AuditLogPage.jsx — Phase 10
// Audit Log page: track admin actions, score changes, and access events.
// Hook connections: useAuditLogFilters, usePageRealtime

import { useMemo, useState } from "react";
import { useAdminContext } from "../hooks/useAdminContext";
import { Search, Download, X, Clock, AlertTriangle, Filter, Lock, Shield, UserCheck, Activity, Key, Package, Calendar, LogIn, FileText, ShieldCheck } from "lucide-react";
import { useToast } from "@/shared/hooks/useToast";
import { verifyAuditChain } from "@/shared/api";
import { useAuth } from "@/auth";
import FbAlert from "@/shared/ui/FbAlert";
import { FilterButton } from "@/shared/ui/FilterButton";
import { useAuditLogFilters } from "../hooks/useAuditLogFilters";
import { usePageRealtime } from "../hooks/usePageRealtime";
import ExportPanel from "../components/ExportPanel";
import CustomSelect from "@/shared/ui/CustomSelect";
import { getActorInfo, formatActionLabel, formatActionDetail, formatSentence, formatDiffChips, detectAnomalies, CATEGORY_META, SEVERITY_META, groupBulkEvents, formatEventMeta, addDaySeparators } from "../utils/auditUtils";
import { AUDIT_TABLE_COLUMNS } from "../utils/auditColumns";
import AuditEventDrawer from "../components/AuditEventDrawer";
import Pagination from "@/shared/ui/Pagination";

// ── Chip helpers ──────────────────────────────────────────────
const CHIP_MAP = {
  entry_tokens:       { type: "token",    label: "QR Access" },
  score_sheets:       { type: "eval",     label: "Evaluation" },
  jurors:             { type: "juror",    label: "Juror" },
  periods:            { type: "period",   label: "Period" },
  projects:           { type: "project",  label: "Project" },
  organizations:      { type: "security", label: "Security" },
  memberships:        { type: "security", label: "Security" },
  juror_period_auth:  { type: "juror",    label: "Juror" },
  profiles:           { type: "security", label: "Auth" },
  audit_logs:         { type: "security", label: "Audit" },
  period_criteria:    { type: "period",   label: "Criteria" },
  framework_outcomes: { type: "period",   label: "Outcome" },
  org_applications:   { type: "security", label: "Application" },
  admin_user_sessions:{ type: "security", label: "Session" },
  platform_backups:   { type: "backup",   label: "Backup" },
  frameworks:         { type: "framework", label: "Framework" },
};

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  ...Object.values(
    Object.entries(CHIP_MAP).reduce((acc, [, chip]) => {
      if (!acc[chip.label]) acc[chip.label] = chip.label;
      return acc;
    }, {})
  )
    .concat(["Export", "Outcome"])
    .filter((label, i, arr) => arr.indexOf(label) === i)
    .sort()
    .map((label) => ({ value: label, label })),
];

const SAVED_VIEWS = [
  { label: "All activity",   filterFn: null },
  { label: "Failed auth",    filterFn: (l) => l.action?.includes("login.failure") || l.action === "admin.login.failure" || l.action === "auth.admin.login.failure" },
  { label: "High risk",      filterFn: (l) => l.severity === "high" || l.severity === "critical" },
  { label: "Exports",        filterFn: (l) => l.action?.startsWith("export.") || l.action?.startsWith("security.export.") },
  { label: "Config changes", filterFn: (l) => l.category === "config" },
];

const ACTOR_TYPES = [
  { value: "", label: "All actors" },
  { value: "admin", label: "Admin" },
  { value: "juror", label: "Juror" },
  { value: "system", label: "System" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  ...Object.entries(CATEGORY_META).map(([k, v]) => ({ value: k, label: v.label })),
];

const SEVERITY_OPTIONS = [
  { value: "", label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "high",     label: "High" },
  { value: "medium",   label: "Medium" },
  { value: "low",      label: "Low" },
  { value: "info",     label: "Info" },
];

function getChip(resourceType, action) {
  if (action && action.startsWith("export.")) return { type: "export", label: "Export" };
  if (action && (action.startsWith("frameworks.") || action === "snapshot.freeze")) return { type: "framework", label: "Framework" };
  if (action && action.startsWith("backup.")) return { type: "backup", label: "Backup" };
  return CHIP_MAP[resourceType] || { type: "eval", label: "System" };
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

function isWarningAuditEvent(log) {
  const action = String(log?.action || "");
  const resourceType = String(log?.resource_type || "");
  if (action === "juror.pin_locked") return true;
  if (action.startsWith("security.") || action.startsWith("organization.status_changed")) return true;
  if (action.includes("failed") || action.includes("blocked") || action.includes("rejected")) return true;
  return resourceType === "organizations" || resourceType === "memberships";
}

function getRelativeTime(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function ActionIcon({ action = "", chipType = "" }) {
  const a = String(action);
  const props = { size: 14, strokeWidth: 2 };
  if (a.startsWith("export.")) return <Download {...props} />;
  if (a.startsWith("backup.")) return <Package {...props} />;
  if (a === "juror.pin_locked" || a.includes("pin")) return <Lock {...props} />;
  if (a.startsWith("security.") || chipType === "security") return <Shield {...props} />;
  if (a.startsWith("period.") || chipType === "period") return <Calendar {...props} />;
  if (a.startsWith("juror.") || chipType === "juror") return <UserCheck {...props} />;
  if (a.startsWith("evaluation.") || chipType === "eval" || a.includes("score")) return <FileText {...props} />;
  if (a.includes("login") || a.includes("session") || a.startsWith("auth.")) return <LogIn {...props} />;
  if (a.startsWith("token") || chipType === "token") return <Key {...props} />;
  return <Activity {...props} />;
}

// ── Component ─────────────────────────────────────────────────
export default function AuditLogPage() {
  const { organizationId, selectedPeriod } = useAdminContext();
  const { isSuper } = useAuth();
  const _toast = useToast();
  const setMessage = (msg) => { if (msg) _toast.success(msg); };

  const [verifying, setVerifying] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [datePreset, setDatePreset] = useState("all");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedLog, setSelectedLog] = useState(null);
  const [savedView, setSavedView] = useState("All activity");

  const [typeFilter, setTypeFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");

  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const {
    auditLogs,
    auditLoading,
    auditError,
    auditFilters,
    setAuditFilters,
    auditSearch,
    setAuditSearch,
    auditHasMore,
    auditTotalCount,
    auditExporting,
    showAuditSkeleton,
    isAuditStaleRefresh,
    hasAuditFilters,
    auditRangeError,
    handleAuditReset,
    handleAuditLoadMore,
    handleAuditExport,
    scheduleAuditRefresh,
    formatAuditTimestamp,
  } = useAuditLogFilters({ organizationId, isMobile: false, setMessage });

  usePageRealtime({
    organizationId,
    channelName: "audit-log-page-live",
    subscriptions: [
      { table: "audit_logs", event: "INSERT", onPayload: scheduleAuditRefresh },
    ],
  });

  // ── Date preset handler ───────────────────────────────────
  function applyDatePreset(preset) {
    setDatePreset(preset);
    setCurrentPage(1);
    const now = new Date();
    if (preset === "all") {
      setAuditFilters((f) => ({ ...f, startDate: "", endDate: "" }));
    } else if (preset === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      setAuditFilters((f) => ({ ...f, startDate: start.toISOString().slice(0, 16), endDate: "" }));
    } else if (preset === "7d") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setAuditFilters((f) => ({ ...f, startDate: start.toISOString().slice(0, 16), endDate: "" }));
    } else if (preset === "30d") {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setAuditFilters((f) => ({ ...f, startDate: start.toISOString().slice(0, 16), endDate: "" }));
    } else if (preset === "period" && selectedPeriod?.start_date) {
      setAuditFilters((f) => ({
        ...f,
        startDate: `${selectedPeriod.start_date}T00:00`,
        endDate: selectedPeriod.end_date ? `${selectedPeriod.end_date}T23:59` : "",
      }));
    }
  }

  // ── Client-side filtering ─────────────────────────────────
  // Base: typeFilter + actorFilter + categoryFilter + severityFilter (used for tab counts + KPIs)
  const baseFilteredLogs = useMemo(() => {
    let rows = auditLogs;
    if (typeFilter) rows = rows.filter((l) => getChip(l.resource_type, l.action).label === typeFilter);
    if (actorFilter) rows = rows.filter((l) => getActorInfo(l).type === actorFilter);
    if (categoryFilter) rows = rows.filter((l) => l.category === categoryFilter);
    if (severityFilter) rows = rows.filter((l) => l.severity === severityFilter);
    return rows;
  }, [auditLogs, typeFilter, actorFilter, categoryFilter, severityFilter]);

  // Full: base + saved view filter (used for table)
  const filteredLogs = useMemo(() => {
    const sv = SAVED_VIEWS.find((v) => v.label === savedView);
    if (!sv?.filterFn) return baseFilteredLogs;
    return baseFilteredLogs.filter(sv.filterFn);
  }, [baseFilteredLogs, savedView]);

  // ── KPI derived values ────────────────────────────────────
  // Use server-side total count when available; fall back to loaded row count.
  const total = auditTotalCount ?? baseFilteredLogs.length;
  const today = baseFilteredLogs.filter((l) => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  }).length;
  const adminCount = baseFilteredLogs.filter((l) => getActorInfo(l).type === "admin").length;

  const oneDayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const failedAuthCount = auditLogs.filter(
    (l) => (l.action?.includes("login.failure") || l.action === "admin.login.failure") &&
            l.created_at && (now - Date.parse(l.created_at)) < oneDayMs
  ).length;
  const highRiskCount = baseFilteredLogs.filter(
    (l) => l.severity === "high" || l.severity === "critical"
  ).length;

  const yesterdayCount = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return baseFilteredLogs.filter((l) => {
      if (!l.created_at) return false;
      const d = new Date(l.created_at);
      return d.toDateString() === yesterday.toDateString();
    }).length;
  }, [baseFilteredLogs]);

  const todayDelta = yesterdayCount > 0
    ? Math.round(((today - yesterdayCount) / yesterdayCount) * 100)
    : null;

  // ── Sorting ───────────────────────────────────────────────
  const sortedLogs = useMemo(() => {
    const rows = [...filteredLogs];
    rows.sort((a, b) => {
      const direction = sortDir === "asc" ? 1 : -1;
      let cmp = 0;
      if (sortKey === "created_at") {
        const aTs = Date.parse(a.created_at || "");
        const bTs = Date.parse(b.created_at || "");
        const aValue = Number.isFinite(aTs) ? aTs : Number.NEGATIVE_INFINITY;
        const bValue = Number.isFinite(bTs) ? bTs : Number.NEGATIVE_INFINITY;
        cmp = aValue - bValue;
      } else if (sortKey === "resource_type") {
        cmp = getChip(a.resource_type, a.action).label.localeCompare(getChip(b.resource_type, b.action).label, "tr", { sensitivity: "base", numeric: true });
      } else if (sortKey === "actor") {
        cmp = getActorInfo(a).name.localeCompare(getActorInfo(b).name, "tr", { sensitivity: "base", numeric: true });
      } else if (sortKey === "action") {
        cmp = formatActionLabel(a.action).localeCompare(formatActionLabel(b.action), "tr", { sensitivity: "base", numeric: true });
      }
      if (cmp !== 0) return cmp * direction;
      const aTs = Date.parse(a.created_at || "");
      const bTs = Date.parse(b.created_at || "");
      return (Number.isFinite(bTs) ? bTs : -Infinity) - (Number.isFinite(aTs) ? aTs : -Infinity);
    });
    return rows;
  }, [filteredLogs, sortKey, sortDir]);

  // ── Anomaly detection ────────────────────────────────────
  // UI-only: instant feedback for the currently-loaded log window.
  // Production detection is handled by the audit-anomaly-sweep Edge Function (runs hourly).
  const anomaly = useMemo(() => detectAnomalies(auditLogs), [auditLogs]);

  // ── Pagination ────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pagedLogs = sortedLogs.slice(pageStart, pageStart + pageSize);
  const pagedItems = useMemo(
    () => addDaySeparators(groupBulkEvents(pagedLogs), sortedLogs),
    [pagedLogs, sortedLogs]
  );

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "created_at" ? "desc" : "asc");
  }

  const auditActiveFilterCount =
    (datePreset !== "all" ? 1 : 0) +
    (typeFilter ? 1 : 0) +
    (actorFilter ? 1 : 0) +
    (categoryFilter ? 1 : 0) +
    (severityFilter ? 1 : 0);

  function handleClearAllFilters() {
    handleAuditReset();
    setDatePreset("all");
    setTypeFilter("");
    setActorFilter("");
    setCategoryFilter("");
    setSeverityFilter("");
    setCurrentPage(1);
  }

  async function handleVerifyIntegrity() {
    setVerifying(true);
    try {
      const result = await verifyAuditChain(organizationId);
      const broken = Array.isArray(result) ? result : (result?.broken_links ?? result?.broken ?? []);
      if (!broken.length) {
        _toast.success("Hash chain intact — no tampering detected.");
      } else {
        _toast.error(`Chain broken at ${broken.length} point(s). Earliest: ${broken[0]}`);
      }
    } catch (e) {
      _toast.error(`Integrity check failed: ${e?.message || "Unknown error"}`);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div id="page-audit" className="page audit-log-page">
      <div className="page-title">Audit Log</div>
      <div className="page-desc">
        Track admin actions, score changes, and access events for compliance and accountability.
      </div>

      {/* Anomaly banner */}
      {anomaly && (
        <div className="anomaly-banner" style={{ marginBottom: 14 }}>
          <AlertTriangle size={17} className="anomaly-banner-icon" />
          <div className="anomaly-banner-text">
            <div className="anomaly-banner-title">{anomaly.title}</div>
            <div className="anomaly-banner-desc">{anomaly.desc}</div>
          </div>
          <button
            className="anomaly-banner-action"
            type="button"
            onClick={() => {
              const view = anomaly.filterAction?.includes("login") ? "Failed auth" : "High risk";
              setSavedView(view);
              setCurrentPage(1);
            }}
          >
            View events →
          </button>
        </div>
      )}

      {/* KPI strip */}
      <div className="scores-kpi-strip">
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{auditLoading && total === 0 ? "—" : total}</div>
          <div className="scores-kpi-item-label">Total Events</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value"><span className="accent">{auditLoading && total === 0 ? "—" : today}</span></div>
          <div className="scores-kpi-item-label">Today</div>
          {todayDelta != null && (
            <div className={`scores-kpi-delta${todayDelta < 0 ? " down" : ""}`}>
              {todayDelta > 0 ? "+" : ""}{todayDelta}% vs yesterday
            </div>
          )}
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{auditLoading && total === 0 ? "—" : adminCount}</div>
          <div className="scores-kpi-item-label">Admin Actions</div>
        </div>
        <div className="scores-kpi-item" style={{ cursor: failedAuthCount > 0 ? "pointer" : "default" }} onClick={() => failedAuthCount > 0 && setSavedView("Failed auth")}>
          <div className={`scores-kpi-item-value${failedAuthCount > 0 ? " kpi-danger" : ""}`}>{auditLoading ? "—" : failedAuthCount}</div>
          <div className="scores-kpi-item-label">Failed Auth (24h)</div>
        </div>
        <div className="scores-kpi-item" style={{ cursor: highRiskCount > 0 ? "pointer" : "default" }} onClick={() => highRiskCount > 0 && setSavedView("High risk")}>
          <div className={`scores-kpi-item-value${highRiskCount > 0 ? " kpi-warning" : ""}`}>{auditLoading && total === 0 ? "—" : highRiskCount}</div>
          <div className="scores-kpi-item-label">High Risk</div>
        </div>
      </div>

      {/* Error */}
      {(auditError || auditRangeError) && (
        <FbAlert variant="danger" style={{ marginBottom: 12 }}>
          {auditRangeError || auditError}
        </FbAlert>
      )}

      {/* Toolbar */}
      <div className="audit-toolbar mobile-toolbar-stack">
        <div className="audit-search-wrap mobile-toolbar-search">
          <Search size={14} className="audit-search-icon" />
          <input
            className="audit-search-input"
            type="text"
            placeholder="Search events, actors, actions…"
            value={auditSearch}
            onChange={(e) => { setAuditSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <FilterButton
          className="mobile-toolbar-filter"
          activeCount={auditActiveFilterCount}
          isOpen={filterOpen}
          onClick={() => { setFilterOpen((v) => !v); setExportOpen(false); }}
        />

        <div className="mobile-toolbar-spacer" />

        <button
          className="btn btn-outline btn-sm mobile-toolbar-export"
          type="button"
          disabled={auditExporting}
          onClick={() => { setExportOpen((v) => !v); setFilterOpen(false); }}
        >
          <Download size={13} style={{ marginRight: 4 }} />
          Export
        </button>

        {isSuper && (
          <button
            className="btn btn-outline btn-sm"
            type="button"
            disabled={verifying}
            onClick={handleVerifyIntegrity}
          >
            <ShieldCheck size={13} style={{ marginRight: 4 }} />
            {verifying ? "Verifying…" : "Verify Integrity"}
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {filterOpen && (
        <div className="filter-panel show" style={{ marginBottom: 12 }}>
          <div className="filter-panel-header">
            <div>
              <h4>
                <Filter size={14} style={{ verticalAlign: "-1px", marginRight: 4, opacity: 0.5 }} />
                Filter Audit Log
              </h4>
              <div className="filter-panel-sub">Narrow events by date range, type, and actor.</div>
            </div>
            <button className="filter-panel-close" type="button" onClick={() => setFilterOpen(false)}>×</button>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label>Date Range</label>
              <CustomSelect
                compact
                value={datePreset}
                onChange={(v) => applyDatePreset(v)}
                options={[
                  { value: "all",    label: "All time" },
                  { value: "today",  label: "Today" },
                  { value: "7d",     label: "Last 7 days" },
                  { value: "30d",    label: "Last 30 days" },
                  ...(selectedPeriod?.start_date ? [{ value: "period", label: selectedPeriod.name }] : []),
                  { value: "custom", label: "Custom range…" },
                ]}
                ariaLabel="Date range"
              />
            </div>
            {datePreset === "period" && selectedPeriod?.start_date && (
              <div className="filter-group">
                <label>Date Range</label>
                <div className="audit-period-range-label">
                  {selectedPeriod.start_date}
                  {selectedPeriod.end_date && selectedPeriod.end_date !== selectedPeriod.start_date
                    ? ` – ${selectedPeriod.end_date}`
                    : ""}
                </div>
              </div>
            )}
            {datePreset === "custom" && (
              <div className="filter-group">
                <label>From</label>
                <input
                  type="datetime-local"
                  className="audit-date-input"
                  value={auditFilters.startDate}
                  onChange={(e) => { setAuditFilters((f) => ({ ...f, startDate: e.target.value })); setCurrentPage(1); }}
                />
              </div>
            )}
            {datePreset === "custom" && (
              <div className="filter-group">
                <label>To</label>
                <input
                  type="datetime-local"
                  className="audit-date-input"
                  value={auditFilters.endDate}
                  onChange={(e) => { setAuditFilters((f) => ({ ...f, endDate: e.target.value })); setCurrentPage(1); }}
                />
              </div>
            )}
            <div className="filter-group">
              <label>Type</label>
              <CustomSelect
                compact
                value={typeFilter}
                onChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}
                options={TYPE_OPTIONS}
                ariaLabel="Event type"
              />
            </div>
            <div className="filter-group">
              <label>Actor</label>
              <CustomSelect
                compact
                value={actorFilter}
                onChange={(v) => { setActorFilter(v); setAuditFilters((f) => ({ ...f, actorTypes: v ? [v] : [] })); setCurrentPage(1); }}
                options={ACTOR_TYPES}
                ariaLabel="Actor type"
              />
            </div>
            <div className="filter-group">
              <label>Category</label>
              <CustomSelect
                compact
                value={categoryFilter}
                onChange={(v) => { setCategoryFilter(v); setAuditFilters((f) => ({ ...f, categories: v ? [v] : [] })); setCurrentPage(1); }}
                options={CATEGORY_OPTIONS}
                ariaLabel="Event category"
              />
            </div>
            <div className="filter-group">
              <label>Severity</label>
              <CustomSelect
                compact
                value={severityFilter}
                onChange={(v) => { setSeverityFilter(v); setAuditFilters((f) => ({ ...f, severities: v ? [v] : [] })); setCurrentPage(1); }}
                options={SEVERITY_OPTIONS}
                ariaLabel="Event severity"
              />
            </div>
          </div>
          <button
            className="btn btn-outline btn-sm filter-clear-btn"
            type="button"
            onClick={handleClearAllFilters}
          >
            <X size={12} style={{ opacity: 0.5 }} />
            Clear all
          </button>
        </div>
      )}

      {/* Export Panel */}
      {exportOpen && (
        <ExportPanel
          title="Export Audit Log"
          subtitle="Download the full activity trail with timestamps, actors, and event details."
          meta={`${total} events · ${hasAuditFilters || typeFilter || actorFilter || categoryFilter || severityFilter ? "Filtered" : "All time"}`}
          loading={auditExporting}
          onClose={() => setExportOpen(false)}
          onExport={async (fmt) => {
            await handleAuditExport(fmt);
            setExportOpen(false);
          }}
          style={{ marginBottom: 12 }}
        />
      )}

      {/* Saved view tabs */}
      <div className="audit-saved-views">
        <span className="audit-saved-views-label">Views</span>
        {SAVED_VIEWS.map((sv) => (
          <button
            key={sv.label}
            type="button"
            className={`audit-view-chip${savedView === sv.label ? " active" : ""}`}
            onClick={() => { setSavedView(sv.label); setCurrentPage(1); setSelectedLog(null); }}
          >
            {sv.label}
            <span className="audit-view-chip-count">
              {sv.filterFn ? baseFilteredLogs.filter(sv.filterFn).length : baseFilteredLogs.length}
            </span>
          </button>
        ))}
      </div>

      {/* Table + detail panel */}
      <div className="audit-feed-layout" style={selectedLog ? {} : { gridTemplateColumns: "1fr" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table className="audit-table table-standard table-pill-balance">
              <colgroup>
                <col style={{ width: 170 }} />
                <col style={{ width: 95 }} />
                <col style={{ width: 200 }} />
                <col />
                <col style={{ width: 90 }} />
              </colgroup>
              <thead>
                <tr>
                  {AUDIT_TABLE_COLUMNS.map(col => (
                    <th
                      key={col.key}
                      className={`sortable${sortKey === col.sortKey ? " sorted" : ""}`}
                      style={col.style}
                      onClick={() => handleSort(col.sortKey)}
                    >
                      {col.label} <SortIcon colKey={col.sortKey} sortKey={sortKey} sortDir={sortDir} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {showAuditSkeleton && (
                  Array.from({ length: 5 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={5}>
                        <div className="audit-skeleton-row" />
                      </td>
                    </tr>
                  ))
                )}

                {!auditLoading && sortedLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-sm text-muted" style={{ textAlign: "center", padding: "22px 0" }}>
                      {hasAuditFilters || typeFilter || actorFilter || categoryFilter || severityFilter ? "No results for the current filters." : "No audit events yet."}
                    </td>
                  </tr>
                )}

                {pagedItems.map((item) => {
                  if (item.type === "day") {
                    return (
                      <tr key={`day-${item.label}`} className="audit-day-header">
                        <td colSpan={5}>
                          {item.label} — {item.count} event{item.count !== 1 ? "s" : ""}
                        </td>
                      </tr>
                    );
                  }

                  if (item.type === "bulk") {
                    const log = item.representative;
                    const chip = getChip(log.resource_type, log.action);
                    const actor = getActorInfo(log);
                    const ts = formatAuditTimestamp(log.created_at);
                    const showBulkSevPill = log.severity && log.severity !== "info" && log.severity !== "low" && SEVERITY_META[log.severity];
                    return (
                      <tr key={`bulk-${log.id}`} className="audit-row-bulk" style={{ cursor: "pointer" }} onClick={() => setSelectedLog(log)}>
                        <td className="audit-ts" data-label="Timestamp"><div className="audit-ts-main">{ts}</div></td>
                        <td data-label="Type">
                          <span className={`audit-chip audit-chip-${chip.type}`}>{chip.label}</span>
                        </td>
                        <td className="audit-actor" data-label="Actor">
                          <div className={`audit-actor-avatar${actor.type === "juror" ? " audit-actor-juror" : actor.type === "system" ? " audit-actor-system" : ""}`}>
                            {actor.type === "system" ? <Clock size={13} /> : actor.initials}
                          </div>
                          <div className="audit-actor-info">
                            <div className="audit-actor-name">{actor.name}</div>
                            <div className="audit-actor-role">{actor.role}</div>
                          </div>
                        </td>
                        <td data-label="Action">
                          <div className="audit-action-row">
                            <span className="audit-action-main">
                              {item.count}× {formatActionLabel(log.action)}
                            </span>
                          </div>
                          <div className="audit-event-code">
                            {(() => {
                              const ts0 = item.logs?.[0]?.created_at ? Date.parse(item.logs[0].created_at) : 0;
                              const tsN = item.logs?.[item.logs.length - 1]?.created_at
                                ? Date.parse(item.logs[item.logs.length - 1].created_at) : 0;
                              const spanMs = Math.abs(ts0 - tsN);
                              return formatEventMeta(log, { bulkCount: item.count, bulkSpanMs: spanMs });
                            })()}
                          </div>
                        </td>
                        <td className="audit-sev-cell" data-label="Severity">
                          {showBulkSevPill && (
                            <span className={`audit-sev-pill audit-sev-${log.severity}`}>
                              {SEVERITY_META[log.severity].label}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  const log = item.log;
                  const chip = getChip(log.resource_type, log.action);
                  const actor = getActorInfo(log);
                  const ts = formatAuditTimestamp(log.created_at);
                  const sentence = formatSentence(log);
                  const isSelected = selectedLog?.id === log.id;
                  const isWarning = isWarningAuditEvent(log);
                  const showSevPill = log.severity && log.severity !== "info" && log.severity !== "low" && SEVERITY_META[log.severity];
                  return (
                    <tr
                      key={log.id}
                      className={[
                        actor.type === "system" ? "audit-row-system" : "",
                        isSelected ? "selected" : "",
                        isWarning ? "audit-row-warning" : "",
                      ].filter(Boolean).join(" ")}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedLog(isSelected ? null : log)}
                    >
                      <td className="audit-ts" data-label="Timestamp">
                        <div className="audit-ts-main">{ts}</div>
                      </td>
                      <td data-label="Type">
                        <span className={`audit-chip audit-chip-${chip.type}`}>{chip.label}</span>
                      </td>
                      <td className="audit-actor" data-label="Actor">
                        {actor.type === "system" ? (
                          <div className="audit-actor-avatar audit-actor-system">
                            <Clock size={13} />
                          </div>
                        ) : (
                          <div className={`audit-actor-avatar${actor.type === "juror" ? " audit-actor-juror" : ""}`}>
                            {actor.initials}
                          </div>
                        )}
                        <div className="audit-actor-info">
                          <div className="audit-actor-name" style={actor.type === "system" ? { color: "var(--text-tertiary)" } : {}}>
                            {actor.name}
                          </div>
                          <div className="audit-actor-role">{actor.role}</div>
                        </div>
                      </td>
                      <td data-label="Action">
                        <div className="audit-action-row">
                          <span className={`audit-action-main${isAuditStaleRefresh ? " opacity-40" : ""}`}>
                            {sentence.verb}
                            {sentence.resource && (
                              <> <span className="audit-action-resource">{sentence.resource}</span></>
                            )}
                          </span>
                        </div>
                        <div className="audit-event-code">{formatEventMeta(log)}</div>
                      </td>
                      <td className="audit-sev-cell" data-label="Severity">
                        {showSevPill && (
                          <span className={`audit-sev-pill audit-sev-${log.severity}`}>
                            {SEVERITY_META[log.severity].label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile portrait card list */}
          <div className="audit-card-list">
            {showAuditSkeleton && Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="mcard amc">
                <div className="amc-body">
                  <div className="audit-skeleton-row" style={{ width: "40%", marginBottom: 10 }} />
                  <div className="audit-skeleton-row" style={{ width: "70%", marginBottom: 8 }} />
                  <div className="audit-skeleton-row" style={{ width: "55%" }} />
                </div>
              </div>
            ))}

            {!auditLoading && sortedLogs.length === 0 && (
              <div style={{ textAlign: "center", padding: "28px 0", fontSize: 13, color: "var(--text-tertiary)" }}>
                {hasAuditFilters || typeFilter || actorFilter || categoryFilter || severityFilter ? "No results for the current filters." : "No audit events yet."}
              </div>
            )}

            {pagedItems.map((item) => {
              if (item.type === "day") return null;
              const log = item.type === "bulk" ? item.representative : item.log;
              const chip = getChip(log.resource_type, log.action);
              const actor = getActorInfo(log);
              const ts = formatAuditTimestamp(log.created_at);
              const detail = item.type === "bulk" ? `${item.count}× grouped` : formatActionDetail(log);
              const cardSentence = item.type === "bulk" ? null : formatSentence(log);
              const diffs = item.type === "bulk" ? [] : formatDiffChips(log);
              const isSelected = selectedLog?.id === log.id;
              const isWarning = isWarningAuditEvent(log);
              const relTime = getRelativeTime(log.created_at);

              let badge = null;
              if (log.severity === "high" || log.severity === "critical") badge = { type: "security", label: (log.severity || "HIGH").toUpperCase() };
              else if (isWarning) badge = { type: "security", label: "SECURITY" };
              else if (chip.type === "export") badge = { type: "export", label: "CSV" };
              else if (actor.type === "system") badge = { type: "system", label: "AUTO" };

              return (
                <div
                  key={log.id}
                  className={["mcard", "amc", isWarning ? "amc-warning" : "", isSelected ? "is-active" : ""].filter(Boolean).join(" ")}
                  data-cat={log.category || undefined}
                  data-sev={(log.severity === "high" || log.severity === "critical") ? log.severity : undefined}
                  onClick={() => setSelectedLog(isSelected ? null : log)}
                >
                  <div className="amc-body">
                    <div className="amc-header">
                      <span className={`audit-chip audit-chip-${chip.type}`}>{chip.label}</span>
                      <span className="amc-rel">{relTime}</span>
                    </div>
                    <div className="amc-actor">
                      <div className={`amc-avatar${actor.type === "system" ? " amc-avatar-system" : actor.type === "juror" ? " amc-avatar-juror" : ""}`}>
                        {actor.type === "system" ? <Clock size={14} /> : actor.initials}
                      </div>
                      <div className="amc-actor-info">
                        <div className="amc-actor-name">{actor.name}</div>
                        <div className="amc-actor-role">{actor.role}</div>
                      </div>
                    </div>
                    <div className="amc-divider" />
                    <div className="amc-action">
                      <div className="amc-icon">
                        <ActionIcon action={log.action} chipType={chip.type} />
                      </div>
                      <div className="amc-action-content">
                        <div className="amc-action-title">
                          {cardSentence?.verb ?? formatActionLabel(log.action)}
                          {cardSentence?.resource && (
                            <> <span className="audit-action-resource">{cardSentence.resource}</span></>
                          )}
                        </div>
                        {diffs.length > 0 ? (
                          <div className="amc-diff-list">
                            {diffs.map((d, i) => (
                              <span key={i} className="amc-diff-chip">
                                <span className="amc-diff-key">{d.key}: </span>
                                {d.from != null && <span className="amc-diff-from">{d.from}</span>}
                                {d.from != null && d.to != null && <span className="amc-diff-arrow"> → </span>}
                                {d.to != null && <span className="amc-diff-to">{d.to}</span>}
                              </span>
                            ))}
                          </div>
                        ) : detail ? (
                          <div className="amc-action-detail">{detail}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="amc-footer">
                    <span className="amc-ts">{ts}</span>
                    {badge && <span className={`amc-badge amc-badge-${badge.type}`}>{badge.label}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={sortedLogs.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            itemLabel="events"
            pageSizeOptions={[25, 50, 100]}
            hasMore={auditHasMore}
            onLoadMore={handleAuditLoadMore}
          />
        </div>

        <AuditEventDrawer key={selectedLog?.id} log={selectedLog} onClose={() => setSelectedLog(null)} />
      </div>
    </div>
  );
}
