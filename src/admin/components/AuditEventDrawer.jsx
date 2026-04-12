// src/admin/components/AuditEventDrawer.jsx
// Sticky inline aside panel — opens when a feed event is clicked.
// v2: tabbed layout (Overview / Context / Changes / Raw)

import { X, Clipboard, Check, Bot } from "lucide-react";
import { useState } from "react";
import {
  getActorInfo,
  formatActionLabel,
  formatAuditTimestamp,
  formatSentence,
  formatDiffChips,
  CATEGORY_META,
  SEVERITY_META,
} from "../utils/auditUtils";

// Trigger-based CRUD events — narrative sentence is awkward for these
const TRIGGER_CRUD = /^\w+\.(insert|update|delete)$/;

function buildDetailRows(log) {
  const d = log.details || {};
  const rows = [];
  if (d.period_name || d.periodName)         rows.push({ key: "Period",    value: d.period_name || d.periodName });
  // Use actor_name column first (migration 043+), fall back to details
  const jurorName = log.actor_name || d.juror_name || (log.actor_type === "juror" ? d.actor_name : null);
  if (jurorName && log.actor_type === "juror")         rows.push({ key: "Juror",     value: jurorName });
  if (d.adminName || d.adminEmail)           rows.push({ key: "Admin",     value: d.adminName || d.adminEmail });
  if (d.applicant_email || d.applicantEmail) rows.push({ key: "Applicant", value: d.applicant_email || d.applicantEmail });
  if (d.recipientEmail)                      rows.push({ key: "Recipient", value: d.recipientEmail });
  if (d.format) {
    const parts = [d.format.toUpperCase()];
    const rowCount = d.row_count ?? d.rowCount;
    const jurorCount = d.juror_count ?? d.jurorCount;
    const projectCount = d.project_count ?? d.projectCount;
    if (rowCount != null) parts.push(`${rowCount} rows`);
    if (jurorCount != null) parts.push(`${jurorCount} jurors`);
    if (projectCount != null) parts.push(`${projectCount} projects`);
    rows.push({ key: "Export", value: parts.join(" · ") });
  }
  if (d.fileName) {
    const parts = [d.fileName];
    if (d.fileSizeBytes != null) parts.push(`${(d.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`);
    rows.push({ key: "File", value: parts.join(" · ") });
  }
  if (d.criteriaCount   != null)             rows.push({ key: "Criteria",  value: String(d.criteriaCount) });
  if (d.previousStatus && d.newStatus)       rows.push({ key: "Status",    value: `${d.previousStatus} → ${d.newStatus}` });
  if (d.method)                              rows.push({ key: "Method",    value: d.method });
  return rows;
}

export default function AuditEventDrawer({ log, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [copied, setCopied] = useState(false);
  if (!log) return null;

  const actor      = getActorInfo(log);
  const ts         = formatAuditTimestamp(log.created_at);
  const sentence   = formatSentence(log);
  const diffs      = formatDiffChips(log);
  const details    = buildDetailRows(log);
  const isCrud     = TRIGGER_CRUD.test(log.action || "");
  const hasContext = !!(log.ip_address || log.user_agent || log.session_id);

  const showSevBadge = log.severity && log.severity !== "info" && SEVERITY_META[log.severity];

  function handleCopy() {
    navigator.clipboard?.writeText(JSON.stringify(log.details || {}, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "context",  label: "Context" },
    { id: "changes",  label: "Changes", badge: diffs.length > 0 ? diffs.length : null },
    { id: "raw",      label: "Raw" },
  ];

  return (
    <aside className="audit-event-drawer-panel">
      {/* Header */}
      <div className="audit-drawer-head">
        <div className="audit-drawer-title-group">
          <div className="audit-drawer-title">
            {formatActionLabel(log.action)}
            {showSevBadge && (
              <span className={`audit-sev-pill audit-sev-${log.severity}`} style={{ marginLeft: 8, verticalAlign: "middle" }}>
                {SEVERITY_META[log.severity].label}
              </span>
            )}
          </div>
          <div className="audit-drawer-sub">
            {ts}
            {log.category && CATEGORY_META[log.category] && (
              <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.6 }}>· {CATEGORY_META[log.category].label}</span>
            )}
          </div>
        </div>
        <button className="audit-drawer-close fs-close" type="button" aria-label="Close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="audit-drawer-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`audit-drawer-tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.badge != null && (
              <span className="audit-drawer-tab-badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="audit-drawer-body">
          {/* Narrative sentence — skip for raw CRUD trigger events */}
          {!isCrud && (
            <p className="audit-drawer-narrative audit-drawer-section">
              <span className="audit-drawer-narrative-actor">{actor.name}</span>{" "}
              {sentence.resource
                ? <>{sentence.verb}{" "}<span className="audit-drawer-narrative-resource">{sentence.resource}</span></>
                : sentence.verb.replace(/\s+(on|for|from|in|to|at|of|via)$/i, "")
              }.
            </p>
          )}

          {/* Actor */}
          <div className="audit-drawer-actor-row audit-drawer-section">
            <div className={`audit-drawer-avatar${actor.type === "system" ? " system" : actor.type === "juror" ? " juror" : ""}`}>
              {actor.initials ?? <Bot size={11} />}
            </div>
            <div className="audit-drawer-actor-info">
              <div className="audit-drawer-actor-name">{actor.name}</div>
              <div className="audit-drawer-actor-role">{actor.role}</div>
            </div>
          </div>

          {/* Contextual details */}
          {details.length > 0 && (
            <div className="audit-drawer-details audit-drawer-section">
              {details.map(({ key, value }) => (
                <div key={key} className="audit-drawer-detail-row">
                  <span className="audit-drawer-detail-key">{key}</span>
                  <span className="audit-drawer-detail-val">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Context */}
      {activeTab === "context" && (
        <div className="audit-drawer-body">
          {hasContext ? (
            <div className="audit-drawer-context audit-drawer-section">
              <div className="audit-drawer-section-label">Session Context</div>
              {log.ip_address && (
                <div className="audit-drawer-detail-row">
                  <span className="audit-drawer-detail-key">IP</span>
                  <span className="audit-drawer-detail-val" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{log.ip_address}</span>
                </div>
              )}
              {log.user_agent && (
                <div className="audit-drawer-detail-row">
                  <span className="audit-drawer-detail-key">Browser</span>
                  <span className="audit-drawer-detail-val" style={{ fontSize: 11 }}>{log.user_agent.split(" ").slice(0, 4).join(" ")}</span>
                </div>
              )}
              {log.session_id && (
                <div className="audit-drawer-detail-row">
                  <span className="audit-drawer-detail-key">Session</span>
                  <span className="audit-drawer-detail-val" style={{ fontFamily: "var(--mono)", fontSize: 10, wordBreak: "break-all" }}>{log.session_id}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="audit-drawer-empty-tab">
              No session context available for this event.<br />
              <span style={{ fontSize: 11, opacity: 0.6 }}>IP, browser, and session data captured from migration 043+.</span>
            </div>
          )}
        </div>
      )}

      {/* Tab: Changes */}
      {activeTab === "changes" && (
        <div className="audit-drawer-body">
          {diffs.length > 0 ? (
            <div className="audit-drawer-diffs audit-drawer-section">
              <div className="audit-drawer-section-label">Changes</div>
              {diffs.map((d) => (
                <div key={d.key} className="audit-drawer-diff-row">
                  <span className="audit-drawer-diff-key">{d.key.replace(/_/g, " ")}</span>
                  {d.from && <span className="audit-drawer-diff-from">{d.from}</span>}
                  {d.from && d.to && <span className="audit-drawer-diff-arrow">→</span>}
                  {d.to && <span className="audit-drawer-diff-to">{d.to}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="audit-drawer-empty-tab">
              No field changes recorded for this event.
            </div>
          )}
        </div>
      )}

      {/* Tab: Raw */}
      {activeTab === "raw" && (
        <div className="audit-drawer-body">
          <div className="audit-drawer-section-label" style={{ marginBottom: 8 }}>Raw payload</div>
          <pre className="audit-drawer-raw-json">{JSON.stringify(log.details || {}, null, 2)}</pre>
          <div className="audit-drawer-actions" style={{ marginTop: 10 }}>
            <button className="fs-btn fs-btn-secondary fs-btn-sm audit-drawer-raw-btn" type="button" onClick={handleCopy}>
              {copied ? <Check size={12} /> : <Clipboard size={12} />}
              {copied ? "Copied" : "Copy JSON"}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
