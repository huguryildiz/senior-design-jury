// src/admin/settings/AuditLogCard.jsx
import { ChevronDownIcon, DownloadIcon, HistoryIcon, SearchIcon } from "../../shared/Icons";

const AUDIT_MIN_DATETIME = "2020-01-01T00:00";
const AUDIT_MAX_DATETIME = "2035-12-31T23:59";

export default function AuditLogCard({
  isMobile,
  isOpen,
  onToggle,
  auditCardRef,
  auditScrollRef,
  auditSentinelRef,
  auditFilters,
  auditSearch,
  auditRangeError,
  auditError,
  auditExporting,
  auditLoading,
  auditHasMore,
  visibleAuditLogs,
  showAuditSkeleton,
  isAuditStaleRefresh,
  hasAuditFilters,
  hasAuditToggle,
  showAllAuditLogs,
  localTimeZone,
  AUDIT_COMPACT_COUNT,
  supportsInfiniteScroll,
  onSetAuditFilters,
  onSetAuditSearch,
  onAuditExport,
  onToggleShowAll,
  onAuditLoadMore,
  formatAuditTimestamp,
}) {
  return (
    <div
      className={`manage-card manage-card-audit${isMobile ? " is-collapsible" : ""}`}
      ref={auditCardRef}
    >
      <div className="manage-card-header-row">
        <button
          type="button"
          className="manage-card-header"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <div className="manage-card-title">
            <span className="manage-card-icon" aria-hidden="true"><HistoryIcon /></span>
            <span className="section-label">Audit Log</span>
          </div>
          {isMobile && <ChevronDownIcon className={`settings-chevron${isOpen ? " open" : ""}`} />}
        </button>
      </div>

      {(!isMobile || isOpen) && (
        <div className="manage-card-body manage-audit-body">
          <div className="manage-audit-header">
            <div className="manage-card-desc">Audit trail of administrative actions and security events.</div>
            <div className="manage-audit-filters">
              <div className="manage-field">
                <label className="manage-label" htmlFor="auditStartDate">From</label>
                <input
                  id="auditStartDate"
                  type="datetime-local"
                  step="60"
                  placeholder="YYYY-MM-DDThh:mm"
                  className={`manage-input manage-date${auditFilters.startDate ? "" : " is-empty"}${auditRangeError ? " is-error" : ""}`}
                  value={auditFilters.startDate}
                  min={AUDIT_MIN_DATETIME}
                  max={AUDIT_MAX_DATETIME}
                  onChange={(e) => onSetAuditFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="manage-field">
                <label className="manage-label" htmlFor="auditEndDate">To</label>
                <input
                  id="auditEndDate"
                  type="datetime-local"
                  step="60"
                  placeholder="YYYY-MM-DDThh:mm"
                  className={`manage-input manage-date${auditFilters.endDate ? "" : " is-empty"}${auditRangeError ? " is-error" : ""}`}
                  value={auditFilters.endDate}
                  min={AUDIT_MIN_DATETIME}
                  max={AUDIT_MAX_DATETIME}
                  onChange={(e) => onSetAuditFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <div className="manage-field">
                <label className="manage-label" htmlFor="auditSearch">Search</label>
                <div className="manage-search">
                  <span className="manage-search-icon" aria-hidden="true"><SearchIcon /></span>
                  <input
                    id="auditSearch"
                    type="text"
                    className="manage-input manage-search-input"
                    placeholder="Search message, action, entity, or metadata"
                    value={auditSearch}
                    onChange={(e) => onSetAuditSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="manage-audit-export">
                <button
                  type="button"
                  className="manage-btn manage-btn-ghost-pill"
                  onClick={onAuditExport}
                  disabled={auditExporting}
                >
                  <DownloadIcon /> Export
                </button>
                <span className="manage-hint manage-hint-inline">
                  Times shown in your local timezone ({localTimeZone}).
                </span>
              </div>
            </div>
            {auditRangeError && <div className="manage-hint manage-hint-error">{auditRangeError}</div>}
            {auditError && !auditRangeError && (
              <div className="manage-hint manage-hint-error">{auditError}</div>
            )}
            {auditExporting && <div className="manage-hint">Preparing export…</div>}
          </div>

          <div
            className={`manage-audit-scroll${showAllAuditLogs ? " is-expanded" : " is-compact"}`}
            ref={auditScrollRef}
            role="region"
            aria-label="Audit log list"
            aria-busy={auditLoading}
          >
            {showAuditSkeleton && (
              <div className="manage-audit-skeleton" aria-hidden="true">
                {Array.from({ length: AUDIT_COMPACT_COUNT }, (_, i) => (
                  <div key={i} className="manage-audit-skeleton-row" />
                ))}
              </div>
            )}

            {!auditLoading && visibleAuditLogs.length === 0 && (
              <div className="manage-empty manage-empty-subtle">
                {hasAuditFilters ? "No results for the current filters." : "No audit entries yet."}
              </div>
            )}

            {visibleAuditLogs.length > 0 && (
              <div className={`manage-audit-list${isAuditStaleRefresh ? " manage-audit-list--stale" : ""}`}>
                {visibleAuditLogs.map((log) => (
                  <div key={log.id} className="manage-audit-row">
                    <span className="manage-audit-time">{formatAuditTimestamp(log.created_at)}</span>
                    <span className="manage-audit-sep" aria-hidden="true">—</span>
                    <span className="manage-audit-message">{log.message}</span>
                  </div>
                ))}
              </div>
            )}

            {auditHasMore && (
              <div ref={auditSentinelRef} className="manage-audit-sentinel" aria-hidden="true" />
            )}

            {auditLoading && auditHasMore && (
              <div className="manage-audit-footer">
                <span className="manage-hint">Loading older events…</span>
              </div>
            )}
          </div>
          {hasAuditToggle && (
            <button
              className={`manage-btn ${isMobile ? "primary" : "ghost"}`}
              type="button"
              onClick={onToggleShowAll}
            >
              {showAllAuditLogs
                ? "Show fewer audit logs"
                : "Show all audit logs"}
            </button>
          )}
          {!supportsInfiniteScroll && !auditLoading && auditHasMore && (
            <div className="manage-audit-footer">
              <button
                className="manage-btn ghost"
                type="button"
                onClick={onAuditLoadMore}
                disabled={auditLoading || !auditHasMore}
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
