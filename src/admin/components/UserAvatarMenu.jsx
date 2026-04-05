// src/admin/components/UserAvatarMenu.jsx
// ============================================================
// Avatar button + minimal session/profile dropdown.
// Compact header · Settings · Organizations (super) · Sign Out
// ============================================================

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/auth";
import { SettingsIcon, BuildingIcon, LogOutIcon } from "@/shared/ui/Icons";
import Avatar from "@/shared/ui/Avatar";

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

// ── Main Component ───────────────────────────────────────────

export default function UserAvatarMenu({ onLogout, onNavigate }) {
  const { user, displayName, avatarUrl, activeOrganization, isSuper } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState(null);

  const initials = getInitials(displayName, user?.email);
  const avatarBg = getAvatarColor(displayName || user?.email);

  // Smart positioning — opens toward center of viewport, stays within bounds
  useLayoutEffect(() => {
    if (!menuOpen) return;
    function update() {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pw = panel?.offsetWidth || 280;
      const ph = panel?.offsetHeight || 200;

      // Vertical: below trigger, or above if not enough space below
      let top = rect.bottom + 6;
      if (top + ph > vh - 12) {
        const above = rect.top - ph - 6;
        top = above >= 8 ? above : Math.max(8, vh - ph - 12);
      }

      // Horizontal: align to trigger's near edge, clamped within viewport
      const triggerCenterX = (rect.left + rect.right) / 2;
      let left;
      if (triggerCenterX > vw / 2) {
        // Right side — align right edges
        left = rect.right - pw;
      } else {
        // Left side — align left edges
        left = rect.left;
      }
      left = Math.max(8, Math.min(left, vw - pw - 8));

      setPanelStyle({
        position: "fixed",
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
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

  // Outside-click to close
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

  // Escape to close
  useEffect(() => {
    if (!menuOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  const handleAction = useCallback((action) => {
    setMenuOpen(false);
    if (action === "settings" || action === "organizations") onNavigate?.("settings");
    else if (action === "logout") onLogout?.();
  }, [onNavigate, onLogout]);

  return (
    <>
      <button
        ref={triggerRef}
        className="ph-avatar-btn"
        style={{ background: "transparent", padding: 0, overflow: "hidden" }}
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="true"
        aria-expanded={menuOpen}
        title={displayName || user?.email || "Account"}
      >
        <Avatar avatarUrl={avatarUrl} initials={initials} bg={avatarBg} size={34} style={{ borderRadius: "50%", pointerEvents: "none" }} />
      </button>

      {menuOpen && createPortal(
        <div
          ref={panelRef}
          className="ph-avatar-menu"
          style={panelStyle}
          role="menu"
          aria-label="Account menu"
        >
          {/* Compact header */}
          <div className="ph-avatar-menu-header">
            <Avatar avatarUrl={avatarUrl} initials={initials} bg={avatarBg} size={36} style={{ borderRadius: "50%", flexShrink: 0 }} />
            <div className="ph-avatar-menu-identity">
              <span className="ph-avatar-menu-name">{displayName || "Admin"}</span>
              <span className={`ph-avatar-role-badge${isSuper ? " ph-avatar-role-badge--super" : ""}`}>
                {isSuper ? "Super Admin" : "Admin"}
              </span>
              {!isSuper && activeOrganization && (
                <span className="ph-avatar-menu-tenant">{activeOrganization.name}</span>
              )}
            </div>
          </div>

          <div className="ph-avatar-menu-divider" />

          <button className="ph-avatar-menu-item" role="menuitem" onClick={() => handleAction("settings")}>
            <SettingsIcon /> Settings
          </button>

          {isSuper && (
            <button className="ph-avatar-menu-item" role="menuitem" onClick={() => handleAction("organizations")}>
              <BuildingIcon /> Organizations
            </button>
          )}

          <div className="ph-avatar-menu-divider" />

          <button className="ph-avatar-menu-item ph-avatar-menu-item--danger" role="menuitem" onClick={() => handleAction("logout")}>
            <LogOutIcon /> Sign Out
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
