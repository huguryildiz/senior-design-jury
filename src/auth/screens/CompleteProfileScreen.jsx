// src/auth/CompleteProfileScreen.jsx — Phase 12
// First-time Google OAuth profile completion, using vera.css design tokens.
// Replaces src/components/auth/CompleteProfileForm.jsx.

import { useEffect, useState } from "react";
import TenantSearchDropdown from "../components/TenantSearchDropdown";
import { listOrganizationsPublic } from "@/shared/api";

export default function CompleteProfileScreen({ user, onComplete, onSignOut }) {
  const [fullName, setFullName] = useState(user?.name || "");
  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [tenantId, setTenantId] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    listOrganizationsPublic()
      .then((data) => { if (active) setTenants(data || []); })
      .catch(() => {})
      .finally(() => { if (active) setTenantsLoading(false); });
    return () => { active = false; };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!tenantId) { setError("Please select a department to apply to."); return; }
    setLoading(true);
    try {
      await onComplete({ name: fullName.trim(), university: university.trim(), department: department.trim(), tenantId });
    } catch (err) {
      setError(String(err?.message || "Failed to complete profile. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div style={{ width: "420px", maxWidth: "92vw" }}>
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon-wrap">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="login-title">Complete Your Profile</div>
            <div className="login-sub">One more step before you can start managing your department.</div>
          </div>

          {error && (
            <div className="fb-alert fba-danger" style={{ marginBottom: "16px" }}>
              <div className="fb-alert-body">
                <div className="fb-alert-desc">{error}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                value={user?.email || ""}
                disabled
                style={{ opacity: 0.6, cursor: "not-allowed" }}
                readOnly
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-name">Full Name</label>
              <input
                id="profile-name"
                className="form-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                autoFocus
                disabled={loading}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-uni">University</label>
                <input
                  id="profile-uni"
                  className="form-input"
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="Your university"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-dept">Department</label>
                <input
                  id="profile-dept"
                  className="form-input"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Your department"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Apply to Department</label>
              <TenantSearchDropdown
                tenants={tenants}
                value={tenantId}
                onChange={setTenantId}
                loading={tenantsLoading}
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Submitting…" : "Submit Application"}
            </button>
          </form>
        </div>

        <div className="login-footer" style={{ display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            onClick={onSignOut}
            className="form-link"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "12px", color: "var(--text-tertiary)" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
