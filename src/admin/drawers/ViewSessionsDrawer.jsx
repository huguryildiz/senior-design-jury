// src/admin/drawers/ViewSessionsDrawer.jsx
// Drawer: view and revoke active login sessions.
//
// Props:
//   open      — boolean
//   onClose   — () => void
//   sessions  — [{ id, device, ip, location, lastActive, signedIn, isCurrent }]
//   onRevoke  — (sessionId) => Promise<void>

import { useState } from "react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

export default function ViewSessionsDrawer({ open, onClose, sessions = [], onRevoke }) {
  const [revoking, setRevoking] = useState(null);

  const handleRevoke = async (id) => {
    setRevoking(id);
    try {
      await onRevoke?.(id);
    } finally {
      setRevoking(null);
    }
  };

  const activeSessions = sessions.filter((s) => !s._revoked);

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: 9, display: "grid", placeItems: "center",
                background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.12)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" style={{ width: 17, height: 17 }}>
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Active Sessions</div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                {activeSessions.length} device{activeSessions.length !== 1 ? "s" : ""} currently signed in
              </div>
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="fs-drawer-body" style={{ gap: 10 }}>
        {sessions.length === 0 && (
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-quaternary)", fontSize: 12 }}>
            No active sessions found.
          </div>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            style={
              session.isCurrent
                ? { border: "1px solid rgba(22,163,74,0.18)", borderRadius: 10, padding: "14px 16px", background: "rgba(22,163,74,0.03)" }
                : { border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }
            }
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 650, color: "var(--text-primary)" }}>
                {session.device}
              </div>
              {session.isCurrent ? (
                <span className="badge badge-success" style={{ fontSize: 9 }}>Current</span>
              ) : (
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  style={{ padding: "3px 10px", fontSize: 10, borderColor: "rgba(225,29,72,0.2)", color: "var(--danger)" }}
                  onClick={() => handleRevoke(session.id)}
                  disabled={revoking === session.id}
                >
                  <span className="btn-loading-content">
                    <AsyncButtonContent loading={revoking === session.id} loadingText="Revoking…">Revoke</AsyncButtonContent>
                  </span>
                </button>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
              {session.ip && <div>IP: {session.ip}{session.location ? ` · ${session.location}` : ""}</div>}
              {session.lastActive && <div>Last active: {session.lastActive}</div>}
              {session.signedIn && <div>Signed in: {session.signedIn}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="fs-drawer-footer">
        <div style={{ flex: 1, fontSize: 11, color: "var(--text-tertiary)" }}>
          {activeSessions.length} active session{activeSessions.length !== 1 ? "s" : ""}
        </div>
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </Drawer>
  );
}
