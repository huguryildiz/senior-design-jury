// src/auth/PendingReviewScreen.jsx — Phase 12
// Pending-approval gate showing application status list, using vera.css design tokens.
// Replaces src/admin/components/PendingReviewGate.jsx.

import { useEffect, useState } from "react";
import { getMyApplications } from "@/shared/api";

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function PendingReviewScreen({ user, onSignOut, onBack }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMyApplications()
      .then((data) => { if (active) setApplications(data || []); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const pending = applications.filter((a) => a.status === "pending");
  const rejected = applications.filter((a) => a.status === "rejected");

  return (
    <div className="login-screen">
      <div style={{ width: "420px", maxWidth: "92vw" }}>
        <div className="login-card" style={{ padding: "36px 32px 24px" }}>
          <div className="login-header">
            <div className="login-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="login-title">Application Pending</div>
            <div className="login-sub">
              Your account <strong style={{ color: "var(--text-primary)" }}>{user?.email}</strong> is not yet approved for admin access.
            </div>
          </div>

          {!loading && (
            <div style={{ marginTop: "8px" }}>
              {pending.length > 0 && (
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-tertiary)", marginBottom: "8px" }}>
                    Pending Applications
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {pending.map((app) => (
                      <div key={app.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "8px" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "13px" }}>{app.tenant_name || app.organization_name || "Unknown department"}</div>
                          {app.created_at && (
                            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "1px" }}>
                              Applied {formatDate(app.created_at)}
                            </div>
                          )}
                        </div>
                        <span className="badge badge-warning" style={{ fontSize: "9px" }}>Pending review</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rejected.length > 0 && (
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-tertiary)", marginBottom: "8px" }}>
                    Rejected Applications
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {rejected.map((app) => (
                      <div key={app.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 12px", border: "1px solid rgba(225,29,72,0.12)",
                        borderRadius: "8px", background: "rgba(225,29,72,0.02)",
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "13px" }}>{app.tenant_name || app.organization_name || "Unknown department"}</div>
                          {app.created_at && (
                            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "1px" }}>
                              Applied {formatDate(app.created_at)}
                            </div>
                          )}
                        </div>
                        <span className="badge badge-danger" style={{ fontSize: "9px" }}>Not approved</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pending.length === 0 && rejected.length === 0 && !loading && (
                <div style={{ textAlign: "center", padding: "12px 0", color: "var(--text-tertiary)", fontSize: "13px" }}>
                  No applications found. Please apply for access first.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="login-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onBack}
            style={{ gap: "5px", display: "flex", alignItems: "center" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Return Home
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="form-link"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "12px" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
