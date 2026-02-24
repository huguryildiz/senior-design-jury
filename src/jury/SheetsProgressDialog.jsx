// src/jury/SheetsProgressDialog.jsx
// ============================================================
// Modal dialog shown after PIN verification.
//
// Always displayed — Sheets is the master source of truth.
// Shows how many groups have data in the sheet and lets the
// juror decide whether to:
//   • Continue  — load sheet data into the form
//   • Start Fresh — ignore sheet data, start with empty form
//
// Props:
//   progress  { rows, filledCount, totalCount, allSubmitted }
//   onConfirm () → load sheet data and proceed
//   onFresh   () → ignore sheet data and proceed
// ============================================================

import { PROJECTS } from "../config";

// Status label + colour for each row returned by myscores.
function rowStatusChip(status) {
  if (status === "all_submitted")   return { label: "Submitted",   color: "#166534", bg: "#dcfce7" };
  if (status === "group_submitted") return { label: "Complete",    color: "#1e40af", bg: "#dbeafe" };
  if (status === "in_progress")     return { label: "In progress", color: "#92400e", bg: "#fef9c3" };
  return { label: "—", color: "#64748b", bg: "#f1f5f9" };
}

export default function SheetsProgressDialog({ progress, onConfirm, onFresh }) {
  if (!progress) return null;

  // Loading sentinel — shown while fetchMyScores is in flight.
  if (progress.loading) {
    return (
      <div className="spd-overlay">
        <div className="spd-card">
          <div className="spd-header">
            <div className="spd-icon">⏳</div>
            <div>
              <div className="spd-title">Checking your progress…</div>
              <div className="spd-sub">Connecting to server</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { rows, filledCount, totalCount, allSubmitted } = progress;
  const hasData = rows && rows.length > 0;

  return (
    <div className="spd-overlay">
      <div className="spd-card">

        {/* Header */}
        <div className="spd-header">
          <div className="spd-icon">{allSubmitted ? "✅" : hasData ? "☁️" : "📋"}</div>
          <div>
            <div className="spd-title">
              {allSubmitted
                ? "All evaluations submitted"
                : hasData
                ? "Saved progress found"
                : "No saved data found"}
            </div>
            <div className="spd-sub">
              {filledCount} / {totalCount} groups completed on server
            </div>
          </div>
        </div>

        {/* Per-group status list */}
        {hasData && (
          <div className="spd-list">
            {PROJECTS.map((p) => {
              const row    = rows.find((r) => Number(r.projectId) === p.id);
              const chip   = rowStatusChip(row?.status);
              const total  = row?.total ?? "—";
              return (
                <div key={p.id} className="spd-row">
                  <span className="spd-row-name">{p.name}</span>
                  <span className="spd-row-total">{total !== "—" ? `${total}/100` : "—"}</span>
                  <span className="spd-chip" style={{ color: chip.color, background: chip.bg }}>
                    {chip.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {!hasData && (
          <p className="spd-empty">
            No evaluations were found on the server for your account.
            {" "}You can start a fresh evaluation below.
          </p>
        )}

        {/* Actions */}
        <div className="spd-actions">
          <button className="btn-primary" onClick={onConfirm}>
            {allSubmitted ? "View / Edit My Scores" : hasData ? "Continue from here" : "Start Evaluation"}
          </button>
          {hasData && !allSubmitted && (
            <button className="btn-secondary" onClick={onFresh}>
              Start Fresh
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
