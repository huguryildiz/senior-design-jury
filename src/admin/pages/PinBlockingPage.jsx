// src/admin/pages/PinBlockingPage.jsx
// ============================================================
// PIN Blocking page: real backend wiring via usePinBlocking.
// Threshold: 3 failed attempts → 15m auto-lock (DB value).
// Props: organizationId, selectedPeriodId from AdminLayout.
// ============================================================

import { useEffect } from "react";
import { usePinBlocking } from "../hooks/usePinBlocking";
import FbAlert from "@/shared/ui/FbAlert";

function formatEta(lockedUntil) {
  if (!lockedUntil) return "—";
  const ms = new Date(lockedUntil) - Date.now();
  if (ms <= 0) return "Expired";
  const mins = Math.ceil(ms / 60000);
  return `${mins}m`;
}

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function PinBlockingPage({ organizationId: _organizationId, selectedPeriodId }) {
  const { lockedJurors, loading, error, loadLockedJurors, handleUnlock, handleUnlockAll } =
    usePinBlocking({ periodId: selectedPeriodId });

  useEffect(() => {
    loadLockedJurors();
  }, [loadLockedJurors]);

  const noPeriod = !selectedPeriodId;

  return (
    <div className="page">
      <div className="page-title">PIN Blocking</div>
      <div className="page-desc" style={{ marginBottom: 14 }}>
        Monitor temporary PIN lockouts, review risk signals, and unlock juror access when required.
      </div>

      {/* Lock policy alert */}
      <FbAlert variant="warning" style={{ marginBottom: 12 }} title="Lock policy is active">
        Jurors are locked for 15 minutes after 3 failed attempts. Manual unlock is logged in Audit Log.
      </FbAlert>

      {noPeriod ? (
        <div className="card" style={{ marginBottom: 12, padding: "24px 16px", textAlign: "center" }}>
          <div className="text-sm text-muted">Select an evaluation period to view PIN lockout data.</div>
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="scores-kpi-strip" style={{ marginBottom: 14 }}>
            <div className="scores-kpi-item">
              <div
                className="scores-kpi-item-value"
                style={lockedJurors.length > 0 ? { color: "var(--danger)" } : undefined}
              >
                {loading ? "…" : lockedJurors.length}
              </div>
              <div className="scores-kpi-item-label">Currently Locked</div>
            </div>
            <div className="scores-kpi-item">
              <div className="scores-kpi-item-value">3</div>
              <div className="scores-kpi-item-label">Fail Threshold</div>
            </div>
            <div className="scores-kpi-item">
              <div className="scores-kpi-item-value">15m</div>
              <div className="scores-kpi-item-label">Auto Unlock Window</div>
            </div>
          </div>

          {error && (
            <FbAlert variant="danger" style={{ marginBottom: 12 }}>
              {error}
            </FbAlert>
          )}

          {/* Active Lockouts */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-header">
              <div className="card-title">Active Lockouts</div>
              <button
                className="btn btn-sm"
                style={{ background: "var(--danger)", color: "#fff" }}
                disabled={lockedJurors.length === 0 || loading}
                onClick={handleUnlockAll}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                </svg>
                Unlock All
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Juror</th>
                    <th>Affiliation</th>
                    <th>Failed Attempts</th>
                    <th>Lock Started</th>
                    <th>Unlock ETA</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-sm text-muted" style={{ textAlign: "center", padding: "18px 0" }}>
                        Loading…
                      </td>
                    </tr>
                  ) : lockedJurors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-sm text-muted" style={{ textAlign: "center", padding: "18px 0" }}>
                        No active lockouts.
                      </td>
                    </tr>
                  ) : (
                    lockedJurors.map((j) => (
                      <tr key={j.jurorId}>
                        <td>{j.jurorName || "—"}</td>
                        <td>{j.affiliation || "—"}</td>
                        <td>{j.failedAttempts ?? "—"}</td>
                        <td>{formatTime(j.lockedAt)}</td>
                        <td>{j.isBlocked ? "Permanent" : formatEta(j.lockedUntil)}</td>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-sm)",
                              fontSize: 12,
                              fontWeight: 600,
                              background: j.isBlocked ? "var(--danger-muted, #fee2e2)" : "var(--warning-muted, #fef9c3)",
                              color: j.isBlocked ? "var(--danger)" : "var(--warning-fg, #854d0e)",
                            }}
                          >
                            {j.isBlocked ? "Blocked" : "Locked"}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleUnlock(j.jurorId)}
                          >
                            Unlock
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Policy Snapshot */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Policy Snapshot</div>
          <span className="text-sm text-muted">Applies to all jury access channels</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
          <div style={{ padding: "11px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)" }}>
            <div className="text-xs text-muted" style={{ marginBottom: 3 }}>Max failed attempts</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>3 attempts</div>
          </div>
          <div style={{ padding: "11px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)" }}>
            <div className="text-xs text-muted" style={{ marginBottom: 3 }}>Temporary lock duration</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>15 minutes</div>
          </div>
          <div style={{ padding: "11px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)" }}>
            <div className="text-xs text-muted" style={{ marginBottom: 3 }}>Audit integration</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Enabled</div>
          </div>
        </div>
      </div>
    </div>
  );
}
