// src/admin/pages/SettingsPage.jsx
// Simplified: profile + security for both roles.
// Organization management moved to OrganizationsPage.jsx.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/auth";
import { useUpdatePolicy } from "@/auth/SecurityPolicyContext";
import { useToast } from "@/shared/hooks/useToast";
import SecurityPolicyDrawer from "../drawers/SecurityPolicyDrawer";
import EditProfileDrawer from "../drawers/EditProfileDrawer";
import ChangePasswordDrawer from "../drawers/ChangePasswordDrawer";
import ViewSessionsDrawer from "../drawers/ViewSessionsDrawer";
import SecuritySignalPill from "../components/SecuritySignalPill.jsx";
import { computeSecuritySignal } from "../utils/computeSecuritySignal.js";
import Avatar from "@/shared/ui/Avatar";
import { upsertProfile, getSecurityPolicy, setSecurityPolicy, listAdminSessions, deleteAdminSession } from "@/shared/api";
import { getAdminDeviceId, getAuthMethodLabelFromSession } from "@/shared/lib/adminSession";
import { supabase } from "@/shared/lib/supabaseClient";

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

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];
function getAvatarColor(name) {
  const code = (name || "?").charCodeAt(0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function formatShortDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatShortDate(ts);
}

function normalizePasswordChangeError(raw) {
  const msg = String(raw?.message || raw || "").toLowerCase().trim();
  if (!msg) return "Could not update password. Please try again.";
  if (msg.includes("current password is incorrect")) return "Current password is incorrect.";
  if (msg.includes("invalid login credentials")) return "Current password is incorrect.";
  if (msg.includes("session expired")) return "Session expired. Please sign in again.";
  if (msg.includes("current password is required")) return "Current password is required.";
  if (msg.includes("new password should be different")) return "New password must be different from current password.";
  if (msg.includes("same password")) return "New password must be different from current password.";
  if (msg.includes("weak password")) return "Password does not meet security requirements.";
  return String(raw?.message || raw || "Could not update password. Please try again.");
}

// ── Main Component ────────────────────────────────────────────

export default function SettingsPage() {
  const {
    user,
    session,
    displayName,
    setDisplayName,
    avatarUrl,
    setAvatarUrl,
    isSuper,
    activeOrganization,
    signOut,
    signOutAll,
    refreshUser,
    clearPendingEmail,
    updatePassword,
    reauthenticateWithPassword,
    loading,
  } = useAuth();
  const updatePolicy = useUpdatePolicy();
  const _toast = useToast();

  const initials = getInitials(displayName, user?.email);
  const avatarBg = getAvatarColor(displayName || user?.email);
  const joinedAt = session?.user?.created_at || null;
  const lastActiveAt = session?.user?.last_sign_in_at || null;
  const lastLoginAt = session?.user?.last_sign_in_at || null;
  const authMethod = getAuthMethodLabelFromSession(session, user);
  const currentDeviceId = getAdminDeviceId();

  // Drawer states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [securityPolicyOpen, setSecurityPolicyOpen] = useState(false);
  const [viewSessionsOpen, setViewSessionsOpen] = useState(false);

  // Security policy state
  const [securityPolicy, setSecurityPolicyState] = useState(null);
  const [securityPolicyError, setSecurityPolicyError] = useState(null);
  const policyFetched = useRef(false);
  const [adminSessions, setAdminSessions] = useState([]);
  const [adminSessionsLoading, setAdminSessionsLoading] = useState(false);
  const knownSessionCount = adminSessions.length > 0 ? adminSessions.length : (session ? 1 : 0);
  const sessionCount = `${knownSessionCount} Active`;
  const securitySignal = useMemo(
    () => computeSecuritySignal({
      adminSessions,
      lastLoginAt,
      loading: loading || adminSessionsLoading,
    }),
    [adminSessions, lastLoginAt, loading, adminSessionsLoading],
  );

  const loadAdminSessions = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id) {
      setAdminSessions([]);
      return;
    }

    setAdminSessionsLoading(true);
    try {
      const rows = await listAdminSessions();
      setAdminSessions(rows);
    } catch (e) {
      if (!silent) {
        _toast.error(e?.message || "Failed to load session history.");
      }
    } finally {
      setAdminSessionsLoading(false);
    }
  }, [user?.id, _toast]);

  useEffect(() => {
    if (!user?.id) {
      setAdminSessions([]);
      return;
    }
    loadAdminSessions({ silent: true });
  }, [user?.id, loadAdminSessions]);

  useEffect(() => {
    if (!viewSessionsOpen) return;
    loadAdminSessions();
  }, [viewSessionsOpen, loadAdminSessions]);

  const handleRevokeSession = useCallback(async (id) => {
    try {
      await deleteAdminSession(id);
      const rows = await listAdminSessions();
      setAdminSessions(rows);
      _toast.success("Session revoked");
    } catch (e) {
      _toast.error(e?.message || "Failed to revoke session.");
    }
  }, [_toast]);

  const handleOpenSecurityPolicy = useCallback(async () => {
    setSecurityPolicyError(null);
    setSecurityPolicyOpen(true);
    if (policyFetched.current) return;
    try {
      const data = await getSecurityPolicy();
      setSecurityPolicyState(data);
      policyFetched.current = true;
    } catch (e) {
      setSecurityPolicyError(e?.message || "Failed to load security policy.");
    }
  }, []);

  const handleSaveSecurityPolicy = useCallback(async (policy) => {
    await setSecurityPolicy(policy);
    setSecurityPolicyState(policy);
    updatePolicy(policy);
    _toast.success("Security policy saved");
  }, [_toast, updatePolicy]);

  const handleSaveProfile = useCallback(async ({ displayName: newName, email: newEmail, avatarFile }) => {
    const trimmedName = newName.trim();
    const trimmedEmail = newEmail.trim();

    const result = await upsertProfile(trimmedName || null);
    const saved = result?.display_name ?? trimmedName;
    setDisplayName(saved);

    if (trimmedEmail && trimmedEmail !== user?.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: trimmedEmail });
      if (emailError) throw emailError;
      _toast.success("Confirmation link sent to your new email address.");
    }

    if (avatarFile) {
      const userId = user?.id;
      if (userId) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const path = `${userId}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
        await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
        setAvatarUrl(publicUrl);
      }
    }

    if (!avatarFile && (trimmedEmail === user?.email || !trimmedEmail)) {
      _toast.success("Display name saved");
    } else if (avatarFile && trimmedEmail === user?.email) {
      _toast.success("Profile saved");
    }
  }, [setDisplayName, setAvatarUrl, user, _toast]);

  const handleCancelEmailChange = useCallback(async () => {
    clearPendingEmail();
    const { error } = await supabase.auth.updateUser({ email: user?.email });
    if (error) {
      await refreshUser();
      _toast.error("Could not cancel email change.");
    } else {
      _toast.success("Email change cancelled.");
    }
  }, [user, _toast, refreshUser, clearPendingEmail]);

  const handleSavePassword = useCallback(async ({ currentPassword, newPassword }) => {
    try {
      await reauthenticateWithPassword(currentPassword);
      await updatePassword(newPassword);
      _toast.success("Password updated");
    } catch (e) {
      throw new Error(normalizePasswordChangeError(e));
    }
  }, [reauthenticateWithPassword, updatePassword, _toast]);

  return (
    <>
      <EditProfileDrawer
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        profile={{
          displayName: displayName || "",
          email: user?.email || "",
          role: isSuper ? "Super Admin" : "Organization Admin",
          organization: activeOrganization?.name || "",
          subtitle: activeOrganization?.subtitle || "",
          avatarUrl: avatarUrl || null,
        }}
        onSave={handleSaveProfile}
        onCancelEmailChange={handleCancelEmailChange}
        pendingEmail={user?.newEmail || null}
        initials={initials}
        avatarBg={avatarBg}
        isSuper={isSuper}
      />

      <SecurityPolicyDrawer
        open={securityPolicyOpen}
        onClose={() => setSecurityPolicyOpen(false)}
        policy={securityPolicy}
        onSave={handleSaveSecurityPolicy}
        error={securityPolicyError}
      />
      <ChangePasswordDrawer
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        onSave={handleSavePassword}
        error={null}
      />
      <ViewSessionsDrawer
        open={viewSessionsOpen}
        onClose={() => setViewSessionsOpen(false)}
        sessions={adminSessions}
        loading={adminSessionsLoading}
        currentDeviceId={currentDeviceId}
        onRevoke={handleRevokeSession}
      />

      <div className="page">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div className="page-title">Settings</div>
            <div className="page-desc">Manage your profile, security, and account preferences.</div>
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <span className="badge badge-neutral">{isSuper ? "Super Admin" : "Organization Admin"}</span>
            {!isSuper && activeOrganization?.code && (
              <span className="badge" style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid rgba(59,130,246,0.18)" }}>
                {activeOrganization.code}
              </span>
            )}
          </div>
        </div>

        <div className="grid-2" style={{ gap: 10 }}>
          {/* ── Left column: Profile + Security ────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Profile card */}
            <div className="card settings-role-card" style={{ padding: 14 }}>
              <div className="card-header" style={{ marginBottom: 8 }}>
                <div className="card-title">Profile</div>
                <span className="badge badge-neutral">Personal</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                <Avatar avatarUrl={avatarUrl} initials={initials} bg={avatarBg} size={44} fontSize={14} className="sb-avatar" style={{ boxShadow: "0 0 0 2px var(--accent-soft)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: "-0.2px" }}>
                    {displayName || "Admin"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1, fontFamily: "var(--mono)" }}>
                    {user?.email}
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                    <span className="badge badge-neutral" style={{ fontSize: 9, padding: "1px 7px" }}>{isSuper ? "Super Admin" : "Organization Admin"}</span>
                    {isSuper ? (
                      <span className="badge badge-success" style={{ fontSize: 9, padding: "1px 7px" }}>Cross-Organization Access</span>
                    ) : activeOrganization?.name ? (
                      <span className="badge badge-success" style={{ fontSize: 9, padding: "1px 7px" }}>{activeOrganization.name}</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                <div style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 12, color: "var(--text-primary)" }}>{formatShortDate(joinedAt)}</div>
                  <div style={{ fontSize: 8.5, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 1 }}>Joined</div>
                </div>
                <div style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 12, color: "var(--text-primary)" }}>{formatRelativeDate(lastActiveAt)}</div>
                  <div style={{ fontSize: 8.5, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 1 }}>Last Active</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <button className="btn btn-outline btn-sm" onClick={() => setEditProfileOpen(true)}>Edit Profile</button>
                <button className="btn btn-outline btn-sm" onClick={() => setChangePasswordOpen(true)}>Change Password</button>
              </div>
            </div>

            {/* Security & Sessions card */}
            <div className="card settings-role-card" style={{ padding: 14 }}>
              <div className="card-header" style={{ marginBottom: 8 }}>
                <div className="card-title">Security &amp; Sessions</div>
                <SecuritySignalPill
                  signal={securitySignal}
                  onReviewSessions={() => setViewSessionsOpen(true)}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {[
                  { label: "Last Login", value: loading ? "..." : formatRelativeDate(lastLoginAt) },
                  { label: "Sessions", value: loading || adminSessionsLoading ? "..." : sessionCount },
                  { label: "Auth Method", value: loading ? "..." : authMethod },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: "7px 8px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 11.5, color: "var(--text-primary)" }}>{value}</div>
                    <div style={{ fontSize: 8.5, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 1 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button className="btn btn-outline btn-sm" onClick={() => setViewSessionsOpen(true)}>View Sessions</button>
                <button className="btn btn-outline btn-sm" style={{ borderColor: "rgba(225,29,72,0.25)", color: "var(--danger)" }} onClick={signOutAll} title="Sign out from all devices">Sign Out All</button>
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

          {/* ── Right column ──────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Security Policy — super admin only */}
            {isSuper && (
              <div className="card settings-role-card" style={{ padding: 14 }}>
                <div className="card-header" style={{ marginBottom: 8 }}>
                  <div className="card-title">Security Policy</div>
                  <span className="badge badge-neutral">Platform-wide</span>
                </div>
                <div className="text-sm text-muted" style={{ marginBottom: 10 }}>
                  Password requirements, auth methods, and session policies that apply to all admin accounts.
                </div>
                <button className="btn btn-outline btn-sm" onClick={handleOpenSecurityPolicy}>Edit Security Policy</button>
              </div>
            )}

            {/* Organization Access — org admin only */}
            {!isSuper && (
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
            )}

            {/* Permissions Summary — org admin only */}
            {!isSuper && (
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
            )}
          </div>
        </div>
      </div>
    </>
  );
}
