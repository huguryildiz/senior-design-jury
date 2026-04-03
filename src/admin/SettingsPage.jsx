// src/admin/SettingsPage.jsx — Phase 9
// Settings page: org-admin profile/security view vs super-admin control center.
// Prototype: vera-premium-prototype.html lines 15647–16066

import { useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/auth";
import { useToast } from "@/shared/hooks/useToast";
import { useProfileEdit } from "./hooks/useProfileEdit";
import { useManageOrganizations } from "./hooks/useManageOrganizations";

import { DEMO_MODE as isDemoMode } from "@/shared/lib/demoMode";

// ── Helpers ───────────────────────────────────────────────────

function getInitials(name, email) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

function OrgStatusBadge({ status }) {
  if (status === "active") return (
    <span className="badge badge-success">
      <svg className="badge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      Active
    </span>
  );
  if (status === "disabled") return (
    <span className="badge badge-neutral">
      <svg className="badge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M4.93 4.93l14.14 14.14" />
      </svg>
      Disabled
    </span>
  );
  if (status === "archived") return <span className="badge badge-neutral">Archived</span>;
  return <span className="badge badge-warning">{status || "—"}</span>;
}

function formatShortDate(dateStr) {
  if (!dateStr) return "—";
  return String(dateStr).slice(0, 10);
}

// ── Profile Edit Modal ────────────────────────────────────────

function ProfileEditModal({ profile }) {
  if (!profile.modalOpen) return null;
  const isPassword = profile.modalView === "password";
  return createPortal(
    <div
      className="crud-overlay"
      style={{ display: "flex" }}
      onClick={(e) => { if (e.target === e.currentTarget) profile.closeModal(); }}
    >
      <div className="crud-modal" style={{ maxWidth: 440 }}>
        <div className="crud-modal-header">
          <h3>{isPassword ? "Change Password" : "Edit Profile"}</h3>
          <button className="crud-modal-close" onClick={profile.closeModal}>&#215;</button>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {!isPassword ? (
            <>
              {profile.errors._general && (
                <div className="fb-alert fba-error">
                  <div className="fb-alert-body"><div className="fb-alert-desc">{profile.errors._general}</div></div>
                </div>
              )}
              <label className="form-label" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                Full Name
                <input
                  className="form-input"
                  type="text"
                  value={profile.form.displayName}
                  onChange={(e) => profile.setField("displayName", e.target.value)}
                  disabled={profile.saving}
                  placeholder="Your full name"
                />
                {profile.errors.displayName && (
                  <span style={{ fontSize: 11, color: "var(--danger)" }}>{profile.errors.displayName}</span>
                )}
              </label>
              <label className="form-label" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                Email
                <input
                  className="form-input"
                  type="email"
                  value={profile.form.email}
                  onChange={(e) => profile.setField("email", e.target.value)}
                  disabled={profile.saving}
                  placeholder="your.email@institution.edu"
                />
                {profile.errors.email && (
                  <span style={{ fontSize: 11, color: "var(--danger)" }}>{profile.errors.email}</span>
                )}
              </label>
              <button
                type="button"
                style={{ fontSize: 12, color: "var(--accent)", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                onClick={() => profile.setModalView("password")}
              >
                Change Password →
              </button>
            </>
          ) : (
            <>
              {profile.passwordErrors._general && (
                <div className="fb-alert fba-error">
                  <div className="fb-alert-body"><div className="fb-alert-desc">{profile.passwordErrors._general}</div></div>
                </div>
              )}
              <label className="form-label" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                New Password
                <input
                  className="form-input"
                  type="password"
                  value={profile.passwordForm.password}
                  onChange={(e) => profile.setPasswordField("password", e.target.value)}
                  disabled={profile.passwordSaving}
                  placeholder="Min 10 chars, upper, lower, digit, symbol"
                  autoComplete="new-password"
                />
                {profile.passwordErrors.password && (
                  <span style={{ fontSize: 11, color: "var(--danger)" }}>{profile.passwordErrors.password}</span>
                )}
              </label>
              <label className="form-label" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                Confirm Password
                <input
                  className="form-input"
                  type="password"
                  value={profile.passwordForm.confirmPassword}
                  onChange={(e) => profile.setPasswordField("confirmPassword", e.target.value)}
                  disabled={profile.passwordSaving}
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                />
                {profile.passwordErrors.confirmPassword && (
                  <span style={{ fontSize: 11, color: "var(--danger)" }}>{profile.passwordErrors.confirmPassword}</span>
                )}
              </label>
              <button
                type="button"
                style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                onClick={() => profile.setModalView("profile")}
              >
                ← Back to Profile
              </button>
            </>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", background: "var(--surface-1)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={profile.closeModal}
            disabled={profile.saving || profile.passwordSaving}
          >
            Cancel
          </button>
          {!isPassword ? (
            <button
              className="btn btn-sm"
              style={{ background: "var(--accent)", color: "#fff" }}
              onClick={profile.handleSave}
              disabled={profile.saving || !profile.isDirty || isDemoMode}
            >
              {profile.saving ? "Saving…" : "Save Changes"}
            </button>
          ) : (
            <button
              className="btn btn-sm"
              style={{ background: "var(--accent)", color: "#fff" }}
              onClick={profile.handlePasswordSave}
              disabled={profile.passwordSaving || isDemoMode}
            >
              {profile.passwordSaving ? "Saving…" : "Update Password"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main Component ────────────────────────────────────────────

export default function SettingsPage({ organizationId }) {
  const { user, displayName, isSuper, activeOrganization, signOut } = useAuth();
  const _toast = useToast();
  const setMessage = useCallback((msg) => { if (msg) _toast.success(msg); }, [_toast]);
  const noop = useCallback(() => {}, []);

  const profile = useProfileEdit();

  const {
    orgList,
    filteredOrgs,
    search,
    setSearch,
    openCreate,
    handleApproveApplication,
    handleRejectApplication,
    applicationActionLoading,
    openEdit,
  } = useManageOrganizations({
    enabled: isSuper,
    setMessage,
    incLoading: noop,
    decLoading: noop,
  });

  const initials = getInitials(displayName, user?.email);

  // Super-admin KPIs
  const kpis = useMemo(() => {
    const active = orgList.filter((o) => o.status === "active").length;
    const orgAdmins = orgList.reduce((sum, o) => sum + (o.tenantAdmins?.length ?? 0), 0);
    const pending = orgList.reduce((sum, o) => sum + (o.pendingApplications?.length ?? 0), 0);
    return { total: orgList.length, active, orgAdmins, pending };
  }, [orgList]);

  const allPending = useMemo(() =>
    orgList.flatMap((o) =>
      (o.pendingApplications || []).map((a) => ({ ...a, orgCode: o.code, orgName: o.name }))
    ),
    [orgList]
  );

  const crossOrgAdmins = useMemo(() => {
    const map = new Map();
    orgList.forEach((o) => {
      (o.tenantAdmins || []).forEach((a) => {
        if (!map.has(a.userId)) {
          map.set(a.userId, { ...a, orgs: [{ code: o.code, name: o.name }] });
        } else {
          map.get(a.userId).orgs.push({ code: o.code, name: o.name });
        }
      });
    });
    return [...map.values()];
  }, [orgList]);

  return (
    <>
      <ProfileEditModal profile={profile} />

      {isSuper ? (
        /* ── Super-Admin Control Center ─────────────────────────────── */
        <div className="page">
          <div className="page-title">Super Admin Control Center</div>
          <div className="page-desc" style={{ marginBottom: 12 }}>
            Platform-wide administration, organization management, and governance controls.
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 16 }}>
            <span className="badge badge-neutral">Super Admin</span>
            <span className="badge" style={{ background: "var(--success-soft)", color: "var(--success)", border: "1px solid rgba(22,163,74,0.18)" }}>
              Platform Scope
            </span>
          </div>

          {/* Profile card */}
          <div className="card settings-role-card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div className="sb-avatar sa-avatar" style={{ width: 54, height: 54, fontSize: 17 }}>{initials}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{displayName || "Platform Owner"}</div>
                  <div className="text-sm text-muted" style={{ marginTop: 2 }}>{user?.email}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    <span className="badge badge-neutral">Super Admin</span>
                    <span className="badge badge-success">Cross-Organization Access</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-outline btn-sm" onClick={() => profile.openModal("profile")}>Edit Profile</button>
                <button className="btn btn-outline btn-sm" disabled>Security Policy</button>
              </div>
            </div>
          </div>

          {/* KPI strip */}
          <div className="scores-kpi-strip" style={{ marginBottom: 14 }}>
            <div className="scores-kpi-item">
              <div className="scores-kpi-item-value">{kpis.total || "—"}</div>
              <div className="scores-kpi-item-label">Organizations</div>
            </div>
            <div className="scores-kpi-item">
              <div className="scores-kpi-item-value">
                <span style={{ color: "var(--success)" }}>{kpis.active || "—"}</span>
              </div>
              <div className="scores-kpi-item-label">Active</div>
            </div>
            <div className="scores-kpi-item">
              <div className="scores-kpi-item-value">{kpis.orgAdmins || "—"}</div>
              <div className="scores-kpi-item-label">Org Admins</div>
            </div>
            <div className="scores-kpi-item">
              <div className="scores-kpi-item-value" style={{ color: kpis.pending > 0 ? "var(--warning)" : undefined }}>
                {kpis.pending || "—"}
              </div>
              <div className="scores-kpi-item-label">Pending Review</div>
            </div>
            <div className="scores-kpi-item">
              <div className="scores-kpi-item-value">—</div>
              <div className="scores-kpi-item-label">Active Periods</div>
            </div>
            <div className="scores-kpi-item">
              <div className="scores-kpi-item-value">—</div>
              <div className="scores-kpi-item-label">Total Jurors</div>
            </div>
          </div>

          {/* Organization Management table */}
          <div className="card" style={{ marginBottom: 14, padding: 14 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Organization Management</div>
                <div className="text-sm text-muted" style={{ marginTop: 3 }}>
                  Organization identity, health, admin capacity, and operational actions.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  className="form-input"
                  style={{ width: 180, height: 30, fontSize: 12 }}
                  placeholder="Search organizations…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  className="btn btn-sm"
                  style={{ background: "var(--accent)", color: "#fff", boxShadow: "none", display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, whiteSpace: "nowrap" }}
                  onClick={openCreate}
                  disabled={isDemoMode}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create Organization
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Short Label</th>
                    <th>Institution</th>
                    <th>Status</th>
                    <th className="text-center">Admins</th>
                    <th>Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrgs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-sm text-muted" style={{ textAlign: "center", padding: "18px 0" }}>
                        No organizations found.
                      </td>
                    </tr>
                  ) : (
                    filteredOrgs.map((org) => (
                      <tr key={org.id}>
                        <td style={{ fontWeight: 600 }}>{org.name}</td>
                        <td className="mono">{org.code}</td>
                        <td>{org.institution_name || "—"}</td>
                        <td><OrgStatusBadge status={org.status} /></td>
                        <td className="text-center mono">
                          <span className="org-admin-count-label">Admins:</span>{" "}
                          {org.tenantAdmins?.length ?? 0}
                        </td>
                        <td className="mono text-sm">{formatShortDate(org.created_at)}</td>
                        <td className="text-right">
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: 11, padding: "3px 10px" }}
                            onClick={() => openEdit(org)}
                            disabled={isDemoMode}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Approvals + Platform Governance */}
          <div className="grid-2" style={{ marginBottom: 14 }}>
            {/* Pending Approvals */}
            <div className="card" style={{ padding: 14 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Pending Approvals</div>
                  <div className="text-sm text-muted" style={{ marginTop: 3 }}>Review admin applications and onboarding queue.</div>
                </div>
                {allPending.length > 0 && (
                  <span className="badge badge-warning">{allPending.length} Pending</span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {allPending.length === 0 ? (
                  <div className="text-sm text-muted" style={{ textAlign: "center", padding: "12px 0" }}>
                    No pending applications.
                  </div>
                ) : (
                  allPending.slice(0, 2).map((app) => (
                    <div key={app.applicationId} style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{app.name}</div>
                          <div className="text-sm text-muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {app.email} · {app.orgCode}
                          </div>
                          <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                            Submitted {formatShortDate(app.createdAt)}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: "5px 10px", fontSize: 11, borderColor: "rgba(22,163,74,0.25)", color: "var(--success)" }}
                            onClick={() => handleApproveApplication(app.applicationId)}
                            disabled={applicationActionLoading.id === app.applicationId || isDemoMode}
                          >
                            {applicationActionLoading.id === app.applicationId && applicationActionLoading.action === "approve" ? "…" : "Approve"}
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: "5px 10px", fontSize: 11, borderColor: "rgba(225,29,72,0.2)", color: "var(--text-tertiary)" }}
                            onClick={() => handleRejectApplication(app.applicationId)}
                            disabled={applicationActionLoading.id === app.applicationId || isDemoMode}
                          >
                            {applicationActionLoading.id === app.applicationId && applicationActionLoading.action === "reject" ? "…" : "Reject"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {allPending.length > 2 && (
                  <div style={{ textAlign: "center", padding: "6px 0 2px" }}>
                    <span className="text-xs text-muted">
                      View all {allPending.length} applications
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Platform Governance */}
            <div className="card" style={{ padding: 14 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Platform Governance</div>
                  <div className="text-sm text-muted" style={{ marginTop: 3 }}>Global configuration, compliance, and operational controls.</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { label: "Global Settings", icon: <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /> },
                  { label: "Audit Center", icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /> },
                  { label: "Export & Backup", icon: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></> },
                  { label: "Maintenance", icon: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /> },
                  { label: "Feature Flags", icon: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></> },
                  { label: "System Health", icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2" /> },
                ].map(({ label, icon }) => (
                  <button
                    key={label}
                    className="btn btn-outline btn-sm"
                    style={{ justifyContent: "flex-start", gap: 7, padding: "9px 12px" }}
                    disabled
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.45, flexShrink: 0 }}>
                      {icon}
                    </svg>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cross-Organization Access & Memberships */}
          <div className="card" style={{ marginBottom: 14, padding: 14 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Cross-Organization Access &amp; Memberships</div>
                <div className="text-sm text-muted" style={{ marginTop: 3 }}>
                  Who is admin where, organization coverage, and membership health visibility.
                </div>
              </div>
              <button className="btn btn-outline btn-sm" disabled>Export Memberships</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Admin</th>
                    <th>Email</th>
                    <th>Primary Org</th>
                    <th className="text-center">Orgs Covered</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {crossOrgAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-sm text-muted" style={{ textAlign: "center", padding: "18px 0" }}>
                        No admin memberships found.
                      </td>
                    </tr>
                  ) : (
                    crossOrgAdmins.map((admin) => (
                      <tr key={admin.userId}>
                        <td style={{ fontWeight: 600 }}>{admin.name}</td>
                        <td>{admin.email}</td>
                        <td>{admin.orgs[0]?.code || "—"}</td>
                        <td className="text-center mono">{admin.orgs.length}</td>
                        <td>
                          {admin.orgs.length > 1 ? (
                            <span className="badge badge-warning">Multi-org</span>
                          ) : (
                            <span className="badge badge-success">
                              <svg className="badge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                              Healthy
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: "3px 10px" }} disabled>Inspect</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Platform Danger Zone */}
          <div className="settings-danger-card" style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" style={{ width: 15, height: 15, opacity: 0.6, flexShrink: 0 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <path d="M12 9v4m0 4h.01" />
                </svg>
                <div className="card-title" style={{ color: "var(--danger)", fontSize: 13 }}>Platform Danger Zone</div>
              </div>
              <span className="badge badge-danger" style={{ fontSize: 9 }}>Requires Confirmation</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Disable Organization", "Revoke Admin Access", "Start Maintenance Mode"].map((label) => (
                <button
                  key={label}
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: "rgba(225,29,72,0.2)", color: "var(--danger)", fontSize: 11, padding: "6px 12px" }}
                  disabled
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Org-Admin Settings ──────────────────────────────────────── */
        <div className="page">
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div className="page-title">Settings</div>
              <div className="page-desc">Manage your profile, security, and organization-scoped permissions.</div>
            </div>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <span className="badge badge-neutral">Organization Admin</span>
              {activeOrganization?.code && (
                <span className="badge" style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid rgba(59,130,246,0.18)" }}>
                  {activeOrganization.code}
                </span>
              )}
            </div>
          </div>

          <div className="grid-2" style={{ gap: 10 }}>
            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Profile card */}
              <div className="card settings-role-card" style={{ padding: 14 }}>
                <div className="card-header" style={{ marginBottom: 8 }}>
                  <div className="card-title">Profile</div>
                  <span className="badge badge-neutral">Personal</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                  <div className="sb-avatar" style={{ width: 44, height: 44, fontSize: 14, boxShadow: "0 0 0 2px var(--accent-soft)" }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: "-0.2px" }}>
                      {displayName || "Admin"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1, fontFamily: "var(--mono)" }}>
                      {user?.email}
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                      <span className="badge badge-neutral" style={{ fontSize: 9, padding: "1px 7px" }}>Organization Admin</span>
                      {activeOrganization?.name && (
                        <span className="badge badge-success" style={{ fontSize: 9, padding: "1px 7px" }}>{activeOrganization.name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                  <div style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 12, color: "var(--text-primary)" }}>—</div>
                    <div style={{ fontSize: 8.5, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 1 }}>Joined</div>
                  </div>
                  <div style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 12, color: "var(--text-primary)" }}>—</div>
                    <div style={{ fontSize: 8.5, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 1 }}>Last Active</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  <button className="btn btn-outline btn-sm" onClick={() => profile.openModal("profile")}>Edit Profile</button>
                  <button className="btn btn-outline btn-sm" onClick={() => profile.openModal("password")}>Change Password</button>
                </div>
              </div>

              {/* Security & Sessions card */}
              <div className="card settings-role-card" style={{ padding: 14 }}>
                <div className="card-header" style={{ marginBottom: 8 }}>
                  <div className="card-title">Security &amp; Sessions</div>
                  <span className="badge badge-success">
                    <span className="status-dot dot-success" />
                    Secure
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  {[
                    { label: "Last Login", value: "—" },
                    { label: "Sessions", value: "—" },
                    { label: "Auth Method", value: "—" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ padding: "7px 8px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)", textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 11.5, color: "var(--text-primary)" }}>{value}</div>
                      <div style={{ fontSize: 8.5, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 1 }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button className="btn btn-outline btn-sm" disabled>View Sessions</button>
                  <button className="btn btn-outline btn-sm" style={{ borderColor: "rgba(225,29,72,0.2)", color: "var(--text-secondary)" }} disabled>Sign Out All</button>
                  <div style={{ flex: 1 }} />
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ borderColor: "rgba(225,29,72,0.25)", color: "var(--danger)" }}
                    onClick={signOut}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Organization Access card */}
              <div className="card settings-role-card" style={{ padding: 14 }}>
                <div className="card-header" style={{ marginBottom: 8 }}>
                  <div className="card-title">Organization Access</div>
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    <span className="badge badge-neutral" style={{ fontSize: 9 }}>Read Only</span>
                    <span className="badge badge-neutral" style={{ fontSize: 9 }}>&#128274; Managed by Super Admin</span>
                  </div>
                </div>
                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden", fontSize: 12 }}>
                  {[
                    { label: "Organization", value: activeOrganization?.name || "—" },
                    { label: "Short label", value: <span className="mono">{activeOrganization?.code || "—"}</span> },
                    { label: "Membership status", value: <span className="badge badge-success"><svg className="badge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>Active</span> },
                  ].map(({ label, value }, i) => (
                    <div
                      key={label}
                      style={{ display: "grid", gridTemplateColumns: "140px 1fr", padding: "7px 10px", background: i % 2 === 0 ? "var(--surface-1)" : undefined, borderBottom: i < 2 ? "1px solid var(--border)" : undefined }}
                    >
                      <div className="text-xs text-muted">{label}</div>
                      <div style={{ fontWeight: label === "Organization" ? 600 : undefined }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 8 }}>
                  Organization identity fields are locked. Name, code, ownership, and metadata can only be edited by Super Admin.
                </div>
              </div>

              {/* Permissions Summary card */}
              <div className="card settings-role-card" style={{ padding: 14 }}>
                <div className="card-header" style={{ marginBottom: 6 }}>
                  <div className="card-title">Permissions Summary</div>
                  <span className="badge badge-neutral" style={{ fontSize: 9 }}>Scope Clarification</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    { allowed: true, text: "Manage evaluation periods, jurors, projects, and scoring templates" },
                    { allowed: true, text: "View and export scores and analytics" },
                    { allowed: true, text: "Control jury entry tokens for own organization" },
                    { allowed: false, text: "Edit organization identity (name, short label, code, ownership)" },
                    { allowed: false, text: "Approve admin applications platform-wide" },
                    { allowed: false, text: "Access or manage other organizations" },
                    { allowed: false, text: "Access platform governance controls" },
                  ].map(({ allowed, text }) => (
                    <div
                      key={text}
                      style={{
                        display: "flex", alignItems: "center", gap: 7, padding: "6px 8px",
                        border: allowed ? "1px solid rgba(22,163,74,0.14)" : "1px solid rgba(225,29,72,0.12)",
                        borderRadius: "var(--radius-sm)",
                        background: allowed ? "var(--success-soft)" : "var(--danger-soft)",
                      }}
                    >
                      <span style={{ color: allowed ? "var(--success)" : "var(--danger)", fontSize: 11, flexShrink: 0 }}>
                        {allowed ? "✓" : "✕"}
                      </span>
                      <div style={{ fontSize: 11.5, color: allowed ? "var(--text-secondary)" : "var(--text-tertiary)" }}>{text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card" style={{ marginTop: 10, padding: "12px 14px", borderColor: "rgba(225,29,72,0.15)", background: "var(--danger-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" style={{ width: 14, height: 14, opacity: 0.5, flexShrink: 0 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <path d="M12 9v4m0 4h.01" />
                </svg>
                <div className="card-title" style={{ color: "var(--danger)", fontSize: 12.5 }}>Danger Zone</div>
              </div>
              <span className="badge badge-danger" style={{ fontSize: 9 }}>Restricted</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180, padding: 10, border: "1px solid rgba(225,29,72,0.12)", borderRadius: "var(--radius-sm)", background: "var(--bg-card)" }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>Leave Organization</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 8, lineHeight: 1.4 }}>
                  Remove yourself from {activeOrganization?.name || "this organization"}. Account stays active.
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: "rgba(225,29,72,0.2)", color: "var(--danger)", fontSize: 11, padding: "4px 10px" }}
                  disabled
                >
                  Request Leave
                </button>
              </div>
              <div style={{ flex: 1, minWidth: 180, padding: 10, border: "1px solid rgba(225,29,72,0.12)", borderRadius: "var(--radius-sm)", background: "var(--bg-card)" }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>Deactivate Account</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 8, lineHeight: 1.4 }}>
                  Full deactivation. All memberships and data access revoked.
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: "rgba(225,29,72,0.2)", color: "var(--danger)", fontSize: 11, padding: "4px 10px" }}
                  disabled
                >
                  Request Deactivation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
