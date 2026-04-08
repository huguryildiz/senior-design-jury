// src/admin/layout/AdminSidebar.jsx — Phase 1
// Prototype source: lines 11580–11711
import { useRef, useState } from "react";
import { useAuth } from "@/auth";
import { useTheme } from "../../shared/theme/ThemeProvider";
import Avatar from "@/shared/ui/Avatar";
import { LogOutIcon } from "@/shared/ui/Icons";

const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];
function getInitials(name, email) {
  if (name) { const p = name.trim().split(/\s+/); return p.length >= 2 ? (p[0][0]+p[1][0]).toUpperCase() : p[0][0].toUpperCase(); }
  return email ? email[0].toUpperCase() : "?";
}
function getAvatarColor(name) { return AVATAR_COLORS[(name||"?").charCodeAt(0) % AVATAR_COLORS.length]; }

// Maps adminTab + scoresView → sidebar active state per nav item
function isActive(itemKey, adminTab, scoresView) {
  if (itemKey === "overview")      return adminTab === "overview";
  if (itemKey === "rankings")      return adminTab === "scores" && scoresView === "rankings";
  if (itemKey === "analytics")     return adminTab === "scores" && scoresView === "analytics";
  if (itemKey === "grid")          return adminTab === "scores" && scoresView === "grid";
  if (itemKey === "details")       return adminTab === "scores" && scoresView === "details";
  if (itemKey === "jurors")        return adminTab === "jurors";
  if (itemKey === "projects")      return adminTab === "projects";
  if (itemKey === "periods")       return adminTab === "periods";
  if (itemKey === "criteria")      return adminTab === "criteria";
  if (itemKey === "outcomes")      return adminTab === "outcomes";
  if (itemKey === "entry-control") return adminTab === "entry-control";
  if (itemKey === "pin-lock")      return adminTab === "pin-lock";
  if (itemKey === "audit-log")     return adminTab === "audit-log";
  if (itemKey === "settings")      return adminTab === "settings";
  return false;
}

export default function AdminSidebar({ adminTab, scoresView, setAdminTab, switchScoresView, mobileOpen, onClose }) {
  const { user, displayName, avatarUrl, organizations, activeOrganization, setActiveOrganization, isSuper, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const [tenantMenuOpen, setTenantMenuOpen] = useState(false);
  const tenantMenuRef = useRef(null);

  const orgLabel = activeOrganization?.name || activeOrganization?.code || "Organization";

  function navTo(tab) {
    setAdminTab(tab);
    onClose();
  }

  function navToScores(view) {
    setAdminTab("scores");
    switchScoresView(view);
    onClose();
  }

  function handleTenantSelect(org) {
    setActiveOrganization(org.id);
    setTenantMenuOpen(false);
  }

  const showTenantWrap = organizations.length > 1 || isSuper;

  return (
    <aside className={`sidebar${mobileOpen ? " mobile-open" : ""}`} id="sidebar-nav">
      {/* Logo */}
      <div className="sb-logo">
        <div className="sb-logo-icon">
          <img src="/src/assets/favicon/web-app-manifest-512x512.png" alt="V" width="34" height="34" />
        </div>
        <div className="sb-logo-text"><span>V</span>ERA<small>v1.0</small></div>
        <button className="sidebar-close-btn" type="button" aria-label="Close navigation" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tenant switcher */}
      {showTenantWrap && (
        <div className="sb-tenant-wrap" ref={tenantMenuRef}>
          <div
            className={`sb-tenant${tenantMenuOpen ? " open" : ""}`}
            onClick={() => setTenantMenuOpen((v) => !v)}
          >
            <span className="sb-tenant-dot" />
            <div className="sb-tenant-labels">
              <span className="sb-tenant-name">{orgLabel}</span>
              {activeOrganization?.subtitle && (
                <span className="sb-tenant-inst">{activeOrganization.subtitle}</span>
              )}
            </div>
            <span className="sb-tenant-chevron">▾</span>
          </div>
          <div className={`sb-tenant-menu${tenantMenuOpen ? " show" : ""}`}>
            <div className="sb-tenant-menu-header">
              <div className="sb-tenant-menu-header-title">Select organization</div>
              <div className="sb-tenant-menu-header-sub">Switch between departments</div>
            </div>
            <div className="sb-tenant-menu-list">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className={`sb-tenant-item${org.id === activeOrganization?.id ? " active" : ""}`}
                  onClick={() => handleTenantSelect(org)}
                >
                  <div className="sb-tenant-item-info">
                    <div className="sb-tenant-item-dept">{org.name || org.code}</div>
                    {org.subtitle && (
                      <div className="sb-tenant-item-uni">{org.subtitle}</div>
                    )}
                  </div>
                  {org.id === activeOrganization?.id && <span className="sb-tenant-item-check">✓</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="sb-nav">
        <div className="sb-section">Overview</div>
        <button
          className={`sb-item${isActive("overview", adminTab, scoresView) ? " active" : ""}`}
          onClick={() => navTo("overview")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Overview
        </button>

        <div className="sb-section">Evaluation</div>
        <button
          className={`sb-item${isActive("rankings", adminTab, scoresView) ? " active" : ""}`}
          onClick={() => navToScores("rankings")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
          </svg>
          Rankings
        </button>
        <button
          className={`sb-item${isActive("analytics", adminTab, scoresView) ? " active" : ""}`}
          onClick={() => navToScores("analytics")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
          </svg>
          Analytics
        </button>
        <button
          className={`sb-item${isActive("grid", adminTab, scoresView) ? " active" : ""}`}
          onClick={() => navToScores("grid")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <rect x="7" y="7" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.15" />
            <rect x="11" y="7" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
            <rect x="15" y="7" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.1" />
            <rect x="7" y="11" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.25" />
            <rect x="11" y="11" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.4" />
            <rect x="15" y="11" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.2" />
            <rect x="7" y="15" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.35" />
            <rect x="11" y="15" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.1" />
            <rect x="15" y="15" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.45" />
          </svg>
          Heatmap
        </button>
        <button
          className={`sb-item${isActive("details", adminTab, scoresView) ? " active" : ""}`}
          onClick={() => navToScores("details")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 13H8" /><path d="M16 17H8" /><path d="M16 13h-2" />
          </svg>
          Reviews
        </button>

        <div className="sb-section">Manage</div>
        <button
          className={`sb-item${isActive("jurors", adminTab, scoresView) ? " active" : ""}`}
          onClick={() => navTo("jurors")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Jurors
        </button>
        <button
          className={`sb-item${isActive("projects", adminTab, scoresView) ? " active" : ""}`}
          onClick={() => navTo("projects")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9.5 12 4l10 5.5" /><path d="M2 14.5 12 20l10-5.5" /><path d="m2 9.5 10 5.5 10-5.5" />
          </svg>
          Projects
        </button>
        <button
          className={`sb-item${isActive("periods", adminTab, scoresView) ? " active" : ""}`}
          onClick={() => navTo("periods")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" />
            <path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" />
          </svg>
          Periods
        </button>

        <div className="sb-section">Configuration</div>
        <button
          className={`sb-item${isActive("criteria", adminTab, scoresView) ? " active" : ""}`}
          onClick={() => navTo("criteria")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Evaluation Criteria
        </button>
        <button
          className={`sb-item${isActive("outcomes", adminTab, scoresView) ? " active" : ""}`}
          onClick={() => navTo("outcomes")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
          </svg>
          Outcomes &amp; Mapping
        </button>

        <div className="sb-section">System</div>
        <button
          className={`sb-item${isActive("entry-control", adminTab, scoresView) ? " active" : ""}`}
          onClick={() => navTo("entry-control")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Entry Control
        </button>
        <button
          className={`sb-item${isActive("pin-lock", adminTab, scoresView) ? " active" : ""}`}
          onClick={() => navTo("pin-lock")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1v6" /><path d="M8 7h8" /><path d="M5 11h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
            <path d="M9 15a3 3 0 0 1 6 0" />
          </svg>
          PIN Blocking
        </button>
        <button
          className={`sb-item${isActive("audit-log", adminTab, scoresView) ? " active" : ""}`}
          onClick={() => navTo("audit-log")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 12H3" /><path d="M16 6H3" /><path d="M12 18H3" /><path d="m16 12 5 3-5 3v-6Z" />
          </svg>
          Audit Log
        </button>
        <button
          className={`sb-item${isActive("settings", adminTab, scoresView) ? " active" : ""}`}
          onClick={() => navTo("settings")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Settings
        </button>
      </nav>

      {/* Bottom: theme toggle + user menu */}
      <div className="sb-bottom">
        <button
          className="sb-theme-toggle"
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Toggle dark mode"
        >
          {isDark ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" /><path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
          <span className="toggle-label">{isDark ? "Light Mode" : "Dark Mode"}</span>
        </button>

        <div className="sb-user">
          <Avatar
            avatarUrl={avatarUrl}
            initials={getInitials(displayName, user?.email)}
            bg={getAvatarColor(displayName || user?.email)}
            size={30}
            style={{ borderRadius: "50%", flexShrink: 0 }}
          />
          <div className="sb-user-info">
            <span className="sb-user-name">{displayName || "Admin"}</span>
            <span className="sb-user-role">
              {isSuper ? "Super Admin" : activeOrganization?.name || "Admin"}
            </span>
          </div>
          <button
            className="sb-signout-btn"
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            title="Sign Out"
          >
            <LogOutIcon size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
