// src/admin/drawers/ViewSessionsDrawer.jsx
// Drawer: inspect tracked admin sessions (device-scoped).
//
// Props:
//   open            — boolean
//   onClose         — () => void
//   sessions        — admin_user_sessions rows
//   loading         — boolean
//   currentDeviceId — current browser device_id
//   onRevoke        — (id: string) => Promise<void>  (optional)

import { Laptop, Smartphone, Monitor, X } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import { maskIpAddress, normalizeCountryCode } from "@/shared/lib/adminSession";
import { formatDateTime as formatAbsoluteDate } from "@/shared/lib/dateUtils";


function formatRelative(ts) {
  if (!ts) return "Unknown";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "Unknown";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatAbsoluteDate(ts);
}

function describeDevice(session) {
  const browser = session?.browser || "Unknown";
  const os = session?.os || "Unknown";
  return `${browser} / ${os}`;
}

function isExpiringWithinHours(ts, hours) {
  if (!ts) return false;
  const remaining = new Date(ts).getTime() - Date.now();
  return remaining > 0 && remaining < hours * 3600000;
}

function DeviceIcon({ os }) {
  const lower = (os || "").toLowerCase();
  if (lower === "ios" || lower === "android") return <Smartphone size={18} />;
  if (lower === "macos" || lower === "windows" || lower === "linux") return <Laptop size={18} />;
  return <Monitor size={18} />;
}

export default function ViewSessionsDrawer({
  open,
  onClose,
  sessions = [],
  loading = false,
  currentDeviceId = "",
  onRevoke,
}) {
  const sortedSessions = Array.isArray(sessions)
    ? [...sessions].sort((a, b) => {
        const aMs = Date.parse(a?.last_activity_at || "");
        const bMs = Date.parse(b?.last_activity_at || "");
        return (Number.isNaN(bMs) ? 0 : bMs) - (Number.isNaN(aMs) ? 0 : aMs);
      })
    : [];
  const totalSessions = sortedSessions.length;

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="fs-icon identity">
              <Monitor size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Active Sessions</div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                {totalSessions} device{totalSessions !== 1 ? "s" : ""} currently tracked
              </div>
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="fs-drawer-body" style={{ gap: 0 }}>
        {loading && (
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-quaternary)", fontSize: 12 }}>
            Loading sessions...
          </div>
        )}
        {!loading && sortedSessions.length === 0 && (
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-quaternary)", fontSize: 12 }}>
            No sessions found.
          </div>
        )}
        {!loading && sortedSessions.map((session) => {
          const isCurrent = session?.device_id === currentDeviceId;
          const usedSignedInFallback = !session?.signed_in_at && !!session?.first_seen_at;
          const signedInAt = session?.signed_in_at || session?.first_seen_at || null;
          const expiringSoon = isExpiringWithinHours(session?.expires_at, 2);
          const maskedIp = maskIpAddress(session?.ip_address);
          const country = normalizeCountryCode(session?.country_code);

          return (
            <div key={session.id} className={`fs-session-card${isCurrent ? " current" : ""}`}>
              <div className="fs-session-card-icon">
                <DeviceIcon os={session?.os} />
              </div>

              <div className="fs-session-card-body">
                <div className="fs-session-card-name">
                  {isCurrent && <span className="fs-session-card-dot" />}
                  {describeDevice(session)}
                </div>

                <div className="fs-session-card-sub">
                  {maskedIp}
                  {country !== "Unknown" ? ` · ${country}` : ""}
                </div>

                <div className="fs-session-card-pills">
                  {isCurrent && (
                    <span className="fs-session-pill success">Current Session</span>
                  )}
                  {session?.auth_method && (
                    <span className="fs-session-pill accent">{session.auth_method}</span>
                  )}
                  {session?.expires_at && (
                    <span className={`fs-session-pill${expiringSoon ? " warning" : ""}`}>
                      Exp: {formatAbsoluteDate(session.expires_at)}
                    </span>
                  )}
                </div>

                <div className="fs-session-card-meta">
                  Signed in {formatAbsoluteDate(signedInAt)}
                  {usedSignedInFallback && (
                    <span
                      style={{ marginLeft: 5 }}
                      aria-label="signed-in-fallback-info"
                    >
                      {" "}(first seen)
                    </span>
                  )}
                  {" · "}Last active {formatRelative(session?.last_activity_at)}
                </div>
              </div>

              {!isCurrent && onRevoke && (
                <div className="fs-session-card-actions">
                  <button
                    type="button"
                    className="fs-session-revoke-btn"
                    onClick={() => onRevoke(session.id)}
                  >
                    Revoke
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="fs-drawer-footer">
        <div style={{ flex: 1, fontSize: 11, color: "var(--text-tertiary)" }}>{totalSessions} session(s)</div>
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </Drawer>
  );
}
