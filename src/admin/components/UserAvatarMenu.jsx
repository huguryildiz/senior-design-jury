// src/admin/components/UserAvatarMenu.jsx
// ============================================================
// Avatar button + dropdown menu + profile/password modal.
// Replaces the standalone logout button in the admin header.
// ============================================================

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/auth";
import { useFocusTrap } from "../../shared/useFocusTrap";
import { useProfileEdit } from "../hooks/useProfileEdit";
import {
  UserPenIcon,
  KeyRoundIcon,
  LogOutIcon,
  BuildingIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeOffIcon,
} from "../../shared/Icons";
import AlertCard from "../../shared/AlertCard";

// ── Helpers ──────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];

function getInitials(displayName, email) {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

function getAvatarColor(name) {
  const code = (name || "?").charCodeAt(0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function roleBadgeLabel(isSuper) {
  return isSuper ? "Super Admin" : "Admin";
}

// ── Main Component ───────────────────────────────────────────

import { DEMO_MODE as isDemoMode } from "@/shared/lib/demoMode";

export default function UserAvatarMenu({ onLogout }) {
  const { user, displayName, activeOrganization, isSuper } = useAuth();
  const profile = useProfileEdit();

  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState(null);

  // Right-anchored positioning — dropdown aligns its right edge to trigger's right edge
  useLayoutEffect(() => {
    if (!menuOpen) return;
    function update() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Right-align: dropdown's right edge matches trigger's right edge
      let right = vw - rect.right;
      right = Math.max(8, right);

      let top = rect.bottom + 6;
      if (panelRef.current) {
        const ph = panelRef.current.offsetHeight;
        if (top + ph > vh - 12) {
          const above = rect.top - ph - 6;
          top = above >= 8 ? above : Math.max(8, vh - ph - 12);
        }
      }

      setPanelStyle({
        position: "fixed",
        top: `${Math.round(top)}px`,
        right: `${Math.round(right)}px`,
      });
    }
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [menuOpen]);

  // Outside-click to close dropdown
  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e) {
      if (triggerRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  // Escape to close dropdown
  useEffect(() => {
    if (!menuOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  const initials = getInitials(displayName, user?.email);
  const avatarBg = getAvatarColor(displayName || user?.email);

  const handleMenuAction = useCallback((action) => {
    setMenuOpen(false);
    if (action === "profile") profile.openModal("profile");
    else if (action === "password") profile.openModal("password");
    else if (action === "logout") onLogout();
  }, [profile, onLogout]);

  return (
    <>
      {/* Avatar trigger button */}
      <button
        ref={triggerRef}
        className="ph-avatar-btn"
        style={{ background: avatarBg }}
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="true"
        aria-expanded={menuOpen}
        title={displayName || user?.email || "Account"}
      >
        {initials}
      </button>

      {/* Dropdown menu */}
      {menuOpen && createPortal(
        <div
          ref={panelRef}
          className="ph-avatar-menu"
          style={panelStyle}
          role="menu"
          aria-label="Account menu"
        >
          {/* Header */}
          <div className="ph-avatar-menu-header">
            <div
              className="ph-avatar-circle-lg"
              style={{ background: avatarBg }}
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="ph-avatar-menu-identity">
              <span className="ph-avatar-menu-name">{displayName || "Admin"}</span>
              <span className="ph-avatar-menu-email">{user?.email}</span>
              <span className={`ph-avatar-role-badge${isSuper ? " ph-avatar-role-badge--super" : ""}`}>
                {roleBadgeLabel(isSuper)}
              </span>
              {!isSuper && activeOrganization && (
                <span className="ph-avatar-menu-tenant">{activeOrganization.name}</span>
              )}
            </div>
          </div>

          <div className="ph-avatar-menu-divider" />

          <button className="ph-avatar-menu-item" role="menuitem" onClick={() => handleMenuAction("profile")}>
            <UserPenIcon /> My Profile
          </button>
          <button className="ph-avatar-menu-item" role="menuitem" onClick={() => handleMenuAction("password")}>
            <KeyRoundIcon /> Change Password
          </button>

          <div className="ph-avatar-menu-divider" />

          <button className="ph-avatar-menu-item ph-avatar-menu-item--danger" role="menuitem" onClick={() => handleMenuAction("logout")}>
            <LogOutIcon /> Sign Out
          </button>
        </div>,
        document.body
      )}

      {/* Profile / Password Modal */}
      {profile.modalOpen && (
        <ProfileModal profile={profile} isSuper={isSuper} activeOrganization={activeOrganization} avatarBg={avatarBg} initials={initials} isDemoMode={isDemoMode} />
      )}
    </>
  );
}

// ── Profile Modal ────────────────────────────────────────────

function ProfileModal({ profile, isSuper, activeOrganization, avatarBg, initials, isDemoMode }) {
  const modalRef = useRef(null);
  const mouseDownTargetRef = useRef(null);
  useFocusTrap({ containerRef: modalRef, isOpen: true, onClose: profile.closeModal });

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => { mouseDownTargetRef.current = e.target; }}
      onClick={(e) => {
        if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
          profile.closeModal();
        }
      }}
    >
      <div className="w-full max-w-lg rounded-lg border bg-card shadow-lg" ref={modalRef} role="dialog" aria-modal="true">
        {profile.modalView === "profile" ? (
          <ProfileView
            profile={profile}
            isSuper={isSuper}
            activeOrganization={activeOrganization}
            avatarBg={avatarBg}
            initials={initials}
            isDemoMode={isDemoMode}
          />
        ) : (
          <PasswordView profile={profile} isDemoMode={isDemoMode} />
        )}
      </div>
    </div>,
    document.body
  );
}

// ── Profile View ─────────────────────────────────────────────

function ProfileView({ profile, isSuper, activeOrganization, avatarBg, initials, isDemoMode }) {
  const { form, setField, errors, saving, isDirty, handleSave } = profile;

  return (
    <>
      <div className="profile-modal-header">
        <span className="profile-modal-header-icon"><UserPenIcon /></span>
        <h2 className="profile-modal-title">Edit Profile</h2>
      </div>

      <div className="profile-modal-body">
        {/* Decorative avatar */}
        <div className="profile-modal-avatar" style={{ background: avatarBg }} aria-hidden="true">
          {initials}
        </div>

        {errors._general && <AlertCard variant="error">{errors._general}</AlertCard>}

        {/* Editable fields */}
        <label className="admin-auth-label">
          Full Name
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setField("displayName", e.target.value)}
            placeholder="Your full name"
            disabled={saving}

            className={`admin-auth-input${errors.displayName ? " input-error" : ""}`}
          />
          {errors.displayName && <AlertCard variant="error">{errors.displayName}</AlertCard>}
        </label>

        <label className="admin-auth-label">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="your.email@institution.edu"
            disabled={saving}

            className={`admin-auth-input${errors.email ? " input-error" : ""}`}
          />
          {errors.email && <AlertCard variant="error">{errors.email}</AlertCard>}
          {form.email !== profile.form.email || null}
        </label>

        {/* Read-only fields */}
        <div className="profile-readonly-section">
          {!isSuper && activeOrganization && (
            <div className="profile-readonly-field">
              <span className="profile-readonly-label"><BuildingIcon /> Organization</span>
              <span className="profile-readonly-value">{activeOrganization.name}</span>
            </div>
          )}
          <div className="profile-readonly-field">
            <span className="profile-readonly-label"><ShieldCheckIcon /> Role</span>
            <span className="profile-readonly-value">{roleBadgeLabel(isSuper)}</span>
          </div>
        </div>

        {/* Password link */}
        <button
          type="button"
          className="profile-password-link"
          onClick={() => profile.setModalView("password")}
        >
          <KeyRoundIcon /> Change Password
        </button>
      </div>

      <div className="profile-modal-actions">
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50" onClick={profile.closeModal} disabled={saving}>
          Cancel
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          onClick={handleSave}
          disabled={saving || !isDirty || isDemoMode}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </>
  );
}

// ── Password View ────────────────────────────────────────────

function PasswordView({ profile, isDemoMode }) {
  const { passwordForm, setPasswordField, passwordErrors, passwordSaving, handlePasswordSave } = profile;
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <div className="profile-modal-header">
        <span className="profile-modal-header-icon"><KeyRoundIcon /></span>
        <h2 className="profile-modal-title">Change Password</h2>
      </div>

      <div className="profile-modal-body">
        {passwordErrors._general && <AlertCard variant="error">{passwordErrors._general}</AlertCard>}

        <label className="admin-auth-label">
          New Password
          <div className="admin-auth-pass-wrap">
            <input
              type={showPass ? "text" : "password"}
              value={passwordForm.password}
              onChange={(e) => setPasswordField("password", e.target.value)}
              placeholder="Min 10 chars, upper, lower, digit, symbol"
              autoComplete="new-password"
              disabled={passwordSaving}
  
              className={`admin-auth-input${passwordErrors.password ? " input-error" : ""}`}
            />
            <button type="button" onClick={() => setShowPass((v) => !v)} className="admin-auth-toggle-pass" tabIndex={-1}>
              {showPass ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {passwordErrors.password && <AlertCard variant="error">{passwordErrors.password}</AlertCard>}
        </label>

        <label className="admin-auth-label">
          Confirm Password
          <div className="admin-auth-pass-wrap">
            <input
              type={showConfirm ? "text" : "password"}
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordField("confirmPassword", e.target.value)}
              placeholder="Enter your new password"
              autoComplete="new-password"
              disabled={passwordSaving}
  
              className={`admin-auth-input${passwordErrors.confirmPassword ? " input-error" : ""}`}
            />
            <button type="button" onClick={() => setShowConfirm((v) => !v)} className="admin-auth-toggle-pass" tabIndex={-1}>
              {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {passwordErrors.confirmPassword && <AlertCard variant="error">{passwordErrors.confirmPassword}</AlertCard>}
        </label>

        <p className="profile-password-hint">
          Password must be at least 10 characters with uppercase, lowercase, digit, and symbol.
        </p>
      </div>

      <div className="profile-modal-actions">
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50" onClick={() => profile.setModalView("profile")} disabled={passwordSaving}>
          Back
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          onClick={handlePasswordSave}
          disabled={passwordSaving || isDemoMode}
        >
          {passwordSaving ? "Updating…" : "Update"}
        </button>
      </div>
    </>
  );
}
