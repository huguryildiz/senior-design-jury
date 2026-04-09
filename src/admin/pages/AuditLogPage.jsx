// src/admin/AuditLogPage.jsx — Phase 9
// Audit Log page: track admin actions, score changes, and access events.
// Prototype: vera-premium-prototype.html lines 15159–15621
// Hook connections: useAuditLogFilters, usePageRealtime

import { useMemo, useState } from "react";
import { useAdminContext } from "../hooks/useAdminContext";
import { Filter } from "lucide-react";
import { useToast } from "@/shared/hooks/useToast";
import FbAlert from "@/shared/ui/FbAlert";
import { FilterButton } from "@/shared/ui/FilterButton";
import { useAuditLogFilters } from "../hooks/useAuditLogFilters";
import { usePageRealtime } from "../hooks/usePageRealtime";
import ExportPanel from "../components/ExportPanel";
import CustomSelect from "@/shared/ui/CustomSelect";
import { getActorInfo, formatActionLabel, formatActionDetail } from "../utils/auditUtils";

// ── Chip helpers ──────────────────────────────────────────────
const CHIP_MAP = {
  entry_tokens:  { type: "token",    label: "Token" },
  score_sheets:  { type: "eval",     label: "Evaluation" },
  jurors:        { type: "juror",    label: "Juror" },
  periods:       { type: "semester", label: "Period" },
  projects:      { type: "project",  label: "Project" },
  organizations: { type: "security", label: "Security" },
  memberships:   { type: "security", label: "Security" },
};

function getChip(resourceType) {
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

// ── Component ─────────────────────────────────────────────────
export default function AuditLogPage() {
  const { organizationId } = useAdminContext();
  const _toast = useToast();
  const setMessage = (msg) => { if (msg) _toast.success(msg); };

  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [datePreset, setDatePreset] = useState("all");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const {
    auditLogs,
    auditLoading,
    auditError,
    auditFilters,
    setAuditFilters,
    auditSearch,
    setAuditSearch,
    auditHasMore,
    auditExporting,
    showAuditSkeleton,
    isAuditStaleRefresh,
    hasAuditFilters,
    auditRangeError,
    handleAuditRefresh,
    handleAuditReset,
    handleAuditLoadMore,
    handleAuditExport,
    scheduleAuditRefresh,
    formatAuditTimestamp,
  } = useAuditLogFilters({ organizationId, isMobile: false, setMessage });

  // Active filter count
  const auditActiveFilterCount =
    (auditSearch?.trim() ? 1 : 0) +
    (auditFilters?.startDate ? 1 : 0) +
    (auditFilters?.endDate ? 1 : 0);

  // Real-time: refresh on new audit log inserts
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
    }
  }

  // ── KPI derived values ────────────────────────────────────
  const total = auditLogs.length;
  const today = auditLogs.filter((l) => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  }).length;
  const systemEvents = auditLogs.filter((l) => getActorInfo(l).type === "system").length;
  const adminActions = total - systemEvents;

  const sortedAuditLogs = useMemo(() => {
    const rows = [...auditLogs];
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
        cmp = getChip(a.resource_type).label.localeCompare(getChip(b.resource_type).label, "tr", { sensitivity: "base", numeric: true });
      } else if (sortKey === "actor") {
        const aActor = getActorInfo(a).name;
        const bActor = getActorInfo(b).name;
        cmp = aActor.localeCompare(bActor, "tr", { sensitivity: "base", numeric: true });
      } else if (sortKey === "action") {
        cmp = formatActionLabel(a.action).localeCompare(
          formatActionLabel(b.action),
          "tr",
          { sensitivity: "base", numeric: true }
        );
      }
      if (cmp !== 0) return cmp * direction;
      const aTs = Date.parse(a.created_at || "");
      const bTs = Date.parse(b.created_at || "");
      const aValue = Number.isFinite(aTs) ? aTs : Number.NEGATIVE_INFINITY;
      const bValue = Number.isFinite(bTs) ? bTs : Number.NEGATIVE_INFINITY;
      return (bValue - aValue);
    });
    return rows;
  }, [auditLogs, sortKey, sortDir]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "created_at" ? "desc" : "asc");
  }

  return (
    <div className="page">
      <div className="page-title">Audit Log</div>
      <div className="page-desc" style={{ marginBottom: 12 }}>
        Track admin actions, score changes, and access events for compliance and accountability.
      </div>

      {/* Insight banner */}
      <div className="insight-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <div>Complete activity trail for compliance and operational monitoring.</div>
      </div>

      {/* KPI strip */}
      <div className="scores-kpi-strip" style={{ marginBottom: 14 }}>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{auditLoading && total === 0 ? "—" : total}</div>
          <div className="scores-kpi-item-label">Total Events</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value"><span className="accent">{auditLoading && total === 0 ? "—" : today}</span></div>
          <div className="scores-kpi-item-label">Today</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{auditLoading && total === 0 ? "—" : systemEvents}</div>
          <div className="scores-kpi-item-label">System Events</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{auditLoading && total === 0 ? "—" : adminActions}</div>
          <div className="scores-kpi-item-label">Admin Actions</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value"><span className="success">0</span></div>
          <div className="scores-kpi-item-label">Anomalies</div>
        </div>
      </div>

      {/* Error */}
      {(auditError || auditRangeError) && (
        <FbAlert variant="danger" style={{ marginBottom: 12 }}>
          {auditRangeError || auditError}
        </FbAlert>
      )}

      {/* Toolbar */}
      <div className="audit-toolbar">
        <div className="audit-search-wrap">
          <svg className="audit-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="audit-search-input"
            type="text"
            placeholder="Search events, actors, actions…"
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
          />
        </div>

        <FilterButton
          activeCount={auditActiveFilterCount}
          isOpen={filterOpen}
          onClick={() => { setFilterOpen((v) => !v); setExportOpen(false); }}
        />

        <div style={{ flex: 1 }} />

        <button
          className="btn btn-outline btn-sm"
          type="button"
          disabled={auditExporting}
          onClick={() => { setExportOpen((v) => !v); setFilterOpen(false); }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13, marginRight: 4 }}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
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
              <div className="filter-panel-sub">Narrow events by date range.</div>
            </div>
            <button className="filter-panel-close" type="button" onClick={() => setFilterOpen(false)}>×</button>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label>Date Range</label>
              <div className="filter-dropdown" style={{ position: "relative" }}>
                <CustomSelect
                  compact
                  value={datePreset}
                  onChange={(v) => applyDatePreset(v)}
                  options={[
                    { value: "all", label: "All time" },
                    { value: "today", label: "Today" },
                    { value: "7d", label: "Last 7 days" },
                    { value: "30d", label: "Last 30 days" },
                    { value: "custom", label: "Custom range…" },
                  ]}
                  ariaLabel="Date range"
                />
              </div>
            </div>
            {datePreset === "custom" && (
              <div className="filter-group">
                <label>From</label>
                <input
                  type="datetime-local"
                  className="audit-date-input"
                  style={{ height: 32, padding: "0 8px", border: "1px solid var(--field-border)", borderRadius: 6, fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-primary)", background: "var(--field-bg)" }}
                  value={auditFilters.startDate}
                  onChange={(e) => setAuditFilters((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
            )}
            {datePreset === "custom" && (
              <div className="filter-group">
                <label>To</label>
                <input
                  type="datetime-local"
                  className="audit-date-input"
                  style={{ height: 32, padding: "0 8px", border: "1px solid var(--field-border)", borderRadius: 6, fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-primary)", background: "var(--field-bg)" }}
                  value={auditFilters.endDate}
                  onChange={(e) => setAuditFilters((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            )}
          </div>
          <button
            className="btn btn-outline btn-sm filter-clear-btn"
            type="button"
            onClick={() => { handleAuditReset(); setDatePreset("all"); }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
            Clear all
          </button>
        </div>
      )}

      {/* Export Panel */}
      {exportOpen && (
        <ExportPanel
          title="Export Audit Log"
          subtitle="Download the full activity trail with timestamps, actors, and event details."
          meta={`${total} events · ${hasAuditFilters ? "Filtered" : "All time"}`}
          loading={auditExporting}
          onClose={() => setExportOpen(false)}
          onExport={async (fmt) => {
            await handleAuditExport(fmt);
            setExportOpen(false);
          }}
          style={{ marginBottom: 12 }}
        />
      )}

      {/* Audit table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th
                  className={`sortable${sortKey === "created_at" ? " sorted" : ""}`}
                  style={{ width: 170 }}
                  onClick={() => handleSort("created_at")}
                >
                  Timestamp <SortIcon colKey="created_at" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th
                  className={`sortable${sortKey === "resource_type" ? " sorted" : ""}`}
                  style={{ width: 95 }}
                  onClick={() => handleSort("resource_type")}
                >
                  Type <SortIcon colKey="resource_type" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th
                  className={`sortable${sortKey === "actor" ? " sorted" : ""}`}
                  style={{ width: 200 }}
                  onClick={() => handleSort("actor")}
                >
                  Actor <SortIcon colKey="actor" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className={`sortable${sortKey === "action" ? " sorted" : ""}`} onClick={() => handleSort("action")}>
                  Action <SortIcon colKey="action" sortKey={sortKey} sortDir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {showAuditSkeleton && (
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={4}>
                      <div style={{ height: 14, background: "var(--surface-2)", borderRadius: 4, opacity: 0.5, animation: "pulse 1.5s ease-in-out infinite" }} />
                    </td>
                  </tr>
                ))
              )}

              {!auditLoading && auditLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-sm text-muted" style={{ textAlign: "center", padding: "22px 0" }}>
                    {hasAuditFilters ? "No results for the current filters." : "No audit events yet."}
                  </td>
                </tr>
              )}

              {sortedAuditLogs.map((log) => {
                const chip = getChip(log.resource_type);
                const actor = getActorInfo(log);
                const ts = formatAuditTimestamp(log.created_at);
                const detail = formatActionDetail(log);
                return (
                  <tr key={log.id} className={actor.type === "system" ? "audit-row-system" : ""}>
                    <td className="audit-ts">
                      <div className="audit-ts-main">{ts}</div>
                    </td>
                    <td>
                      <span className={`audit-chip audit-chip-${chip.type}`}>{chip.label}</span>
                    </td>
                    <td className="audit-actor">
                      {actor.type === "system" ? (
                        <div className="audit-actor-avatar audit-actor-system">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                            <path d="M12 2a10 10 0 110 20 10 10 0 010-20z" /><path d="M12 6v6l4 2" />
                          </svg>
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
                    <td>
                      <div className={`audit-action-main${isAuditStaleRefresh ? " opacity-40" : ""}`}>
                        {formatActionLabel(log.action)}
                      </div>
                      {detail && (
                        <div className="audit-action-detail">{detail}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="audit-footer">
          <div className="text-sm text-muted">
            {auditLoading ? "Loading…" : `Showing ${auditLogs.length} event${auditLogs.length !== 1 ? "s" : ""}${auditHasMore ? "+" : ""}`}
          </div>
          <div className="audit-pagination">
            <button
              className="audit-page-btn"
              type="button"
              disabled={!auditHasMore || auditLoading}
              onClick={handleAuditLoadMore}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button
              className="btn btn-outline btn-sm"
              type="button"
              style={{ padding: "3px 10px", fontSize: 11 }}
              disabled={auditLoading}
              onClick={handleAuditRefresh}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
