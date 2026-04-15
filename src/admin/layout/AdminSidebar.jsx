// src/admin/layout/AdminSidebar.jsx — Phase 1
// Prototype source: lines 11580–11711
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building, ClipboardList, KeyRound, Medal, QrCode, Route, ScrollText, Cog, ShieldAlert, Icon } from "lucide-react";
import { useAuth } from "@/auth";
import { useTheme } from "../../shared/theme/ThemeProvider";
import Avatar from "@/shared/ui/Avatar";
import { LogOutIcon } from "@/shared/ui/Icons";
import logoImg from "@/assets/favicon/web-app-manifest-512x512.png";

const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];
function getInitials(name, email) {
  if (name) { const p = name.trim().split(/\s+/); return p.length >= 2 ? (p[0][0]+p[1][0]).toUpperCase() : p[0][0].toUpperCase(); }
  return email ? email[0].toUpperCase() : "?";
}
function getAvatarColor(name) { return AVATAR_COLORS[(name||"?").charCodeAt(0) % AVATAR_COLORS.length]; }


export default function AdminSidebar({ currentPage, basePath, mobileOpen, onClose, setupIncomplete = false }) {
  const { user, displayName, avatarUrl, organizations, activeOrganization, setActiveOrganization, isSuper, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const [tenantMenuOpen, setTenantMenuOpen] = useState(false);
  const tenantMenuRef = useRef(null);

  const orgLabel = activeOrganization?.name || activeOrganization?.code || "Organization";

  function navTo(page) {
    navigate(`${basePath}/${page}`);
    onClose();
  }

  // Pages that stay fully visible even when setup is incomplete
  const ALWAYS_ACTIVE = new Set(["overview", "setup", "settings", "organizations"]);
  function itemClass(page) {
    const active = currentPage === page ? " active" : "";
    const dim = setupIncomplete && !ALWAYS_ACTIVE.has(page) ? " sb-item--dim" : "";
    return `sb-item${active}${dim}`;
  }

  function handleTenantSelect(org) {
    setActiveOrganization(org.id);
    setTenantMenuOpen(false);
  }

  const showTenantWrap = Boolean(activeOrganization) || organizations.length > 0 || isSuper;
  const canSwitchTenants = isSuper && organizations.length > 1;

  return (
    <aside className={`sidebar${mobileOpen ? " mobile-open" : ""}`} id="sidebar-nav">
      {/* Logo */}
      <div className="sb-logo">
        <div className="sb-logo-icon">
          <img src={logoImg} alt="V" width="34" height="34" />
        </div>
        <div className="sb-logo-text"><span>V</span>ERA<small>v1.0</small></div>
        <button className="sidebar-close-btn" type="button" aria-label="Close navigation" onClick={onClose}>
          <Icon
            iconNode={[]}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </Icon>
        </button>
      </div>
      {/* Nav */}
      <nav className="sb-nav">
        {/* Tenant switcher */}
        {showTenantWrap && (
          <div className="sb-tenant-wrap" ref={tenantMenuRef}>
            <div
              className={`sb-tenant${canSwitchTenants && tenantMenuOpen ? " open" : ""}${!canSwitchTenants ? " readonly" : ""}`}
              onClick={canSwitchTenants ? () => setTenantMenuOpen((v) => !v) : undefined}
            >
              <span className="sb-tenant-dot" />
              <div className="sb-tenant-labels">
                <span className="sb-tenant-name">{orgLabel}</span>
                {activeOrganization?.institution && (
                  <span className="sb-tenant-inst">{activeOrganization.institution}</span>
                )}
              </div>
              {canSwitchTenants && <span className="sb-tenant-chevron">▾</span>}
            </div>
            {canSwitchTenants && (
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
                        {org.institution && (
                          <div className="sb-tenant-item-uni">{org.institution}</div>
                        )}
                      </div>
                      {org.id === activeOrganization?.id && <span className="sb-tenant-item-check">✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="sb-section">Overview</div>
        <button
          className={itemClass("overview")}
          onClick={() => navTo("overview")}
        >
          <Icon
            iconNode={[]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </Icon>
          Overview
        </button>
        <button
          className={itemClass("setup")}
          onClick={() => navTo("setup")}
        >
          <Cog size={18} strokeWidth={1.8} />
          Setup
        </button>

        <div className="sb-section">Evaluation</div>
        <button
          className={itemClass("rankings")}
          onClick={() => navTo("rankings")}
        >
          <Medal size={18} strokeWidth={1.8} />
          Rankings
        </button>
        <button
          className={itemClass("analytics")}
          onClick={() => navTo("analytics")}
        >
          <Icon
            iconNode={[]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
          </Icon>
          Analytics
        </button>
        <button
          className={itemClass("heatmap")}
          onClick={() => navTo("heatmap")}
        >
          <Icon
            iconNode={[]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round">
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
          </Icon>
          Heatmap
        </button>
        <button
          className={itemClass("reviews")}
          onClick={() => navTo("reviews")}
        >
          <Icon
            iconNode={[]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 13H8" /><path d="M16 17H8" /><path d="M16 13h-2" />
          </Icon>
          Reviews
        </button>

        <div className="sb-section">Manage</div>
        <button
          className={itemClass("jurors")}
          onClick={() => navTo("jurors")}
        >
          <Icon
            iconNode={[]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </Icon>
          Jurors
        </button>
        <button
          className={itemClass("projects")}
          onClick={() => navTo("projects")}
        >
          <Icon
            iconNode={[]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M2 9.5 12 4l10 5.5" /><path d="M2 14.5 12 20l10-5.5" /><path d="m2 9.5 10 5.5 10-5.5" />
          </Icon>
          Projects
        </button>
        <button
          className={itemClass("periods")}
          onClick={() => navTo("periods")}
        >
          <Icon
            iconNode={[]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" />
            <path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" />
          </Icon>
          Periods
        </button>

        <div className="sb-section">Configuration</div>
        <button
          className={itemClass("criteria")}
          onClick={() => navTo("criteria")}
        >
          <ClipboardList size={18} strokeWidth={1.8} />
          Evaluation Criteria
        </button>
        <button
          className={itemClass("outcomes")}
          onClick={() => navTo("outcomes")}
        >
          <Route size={18} strokeWidth={1.8} />
          Outcomes &amp; Mapping
        </button>

        <div className="sb-section">System</div>
        <button
          className={itemClass("entry-control")}
          onClick={() => navTo("entry-control")}
        >
          <QrCode size={18} strokeWidth={1.8} />
          Entry Control
        </button>
        <button
          className={itemClass("pin-blocking")}
          onClick={() => navTo("pin-blocking")}
        >
          <KeyRound size={18} strokeWidth={1.8} />
          PIN Blocking
        </button>
        <button
          className={itemClass("audit-log")}
          onClick={() => navTo("audit-log")}
        >
          <ScrollText size={18} strokeWidth={1.8} />
          Audit Log
        </button>
        {isSuper && (
          <>
            <div className="sb-section">Platform</div>
            <button
              className={itemClass("organizations")}
              onClick={() => navTo("organizations")}
            >
              <Building size={18} strokeWidth={1.8} />
              Organizations
            </button>
            <button
              className={itemClass("unlock-requests")}
              onClick={() => navTo("unlock-requests")}
            >
              <ShieldAlert size={18} strokeWidth={1.8} />
              Unlock Requests
            </button>
          </>
        )}

        <button
          className={itemClass("settings")}
          onClick={() => navTo("settings")}
        >
          <Icon
            iconNode={[]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </Icon>
          Settings
        </button>
      </nav>
      {/* Bottom: theme toggle + user menu */}
      <div className="sb-bottom">
        <button
          className={`sb-theme-toggle${isDark ? " sb-theme-toggle--sun" : ""}`}
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Toggle dark mode"
        >
          {isDark ? (
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" /><path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
            </Icon>
          ) : (
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </Icon>
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
            onClick={() => signOut().then(() => navigate("/"))}
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
