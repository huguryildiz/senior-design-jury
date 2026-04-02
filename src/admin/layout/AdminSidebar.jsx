// src/admin/layout/AdminSidebar.jsx
// Matches prototype HTML lines 11580–11711 exactly.
// Flat navigation — NO accordion. Sections always visible.

import { useState } from "react";
import { useTheme } from "../../shared/theme/ThemeProvider";
import veraLogo from "../../assets/vera_logo.png";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// Nav items — maps prototype page IDs to app tab/view destinations
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  {
    section: "Overview",
    items: [
      {
        id: "overview",
        label: "Overview",
        tab: "overview",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Evaluation",
    items: [
      {
        id: "rankings",
        label: "Rankings",
        tab: "scores",
        view: "rankings",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
          </svg>
        ),
      },
      {
        id: "analytics",
        label: "Analytics",
        tab: "scores",
        view: "analytics",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
          </svg>
        ),
      },
      {
        id: "score-grid",
        label: "Heatmap",
        tab: "scores",
        view: "grid",
        icon: (
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
        ),
      },
      {
        id: "score-details",
        label: "Reviews",
        tab: "scores",
        view: "details",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M10 13H8" /><path d="M16 17H8" /><path d="M16 13h-2" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Manage",
    items: [
      {
        id: "jurors",
        label: "Jurors",
        tab: "jurors",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        id: "projects",
        label: "Projects",
        tab: "projects",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9.5 12 4l10 5.5" />
            <path d="M2 14.5 12 20l10-5.5" />
            <path d="m2 9.5 10 5.5 10-5.5" />
          </svg>
        ),
      },
      {
        id: "semesters",
        label: "Periods",
        tab: "periods",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
            <path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" />
            <path d="M8 18h.01" /><path d="M12 18h.01" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Configuration",
    items: [
      {
        id: "criteria",
        label: "Evaluation Criteria",
        tab: "criteria",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        ),
      },
      {
        id: "accreditation",
        label: "Outcomes & Mapping",
        tab: "outcomes",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "System",
    items: [
      {
        id: "entry-control",
        label: "Entry Control",
        tab: "entry-control",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ),
      },
      {
        id: "pin-lock",
        label: "PIN Blocking",
        tab: "pin-lock",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1v6" /><path d="M8 7h8" />
            <path d="M5 11h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
            <path d="M9 15a3 3 0 0 1 6 0" />
          </svg>
        ),
      },
      {
        id: "audit",
        label: "Audit Log",
        tab: "audit-log",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 12H3" /><path d="M16 6H3" /><path d="M12 18H3" />
            <path d="m16 12 5 3-5 3v-6Z" />
          </svg>
        ),
      },
      {
        id: "settings",
        label: "Settings",
        tab: "settings",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ),
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// isActive helper
// ---------------------------------------------------------------------------

function isItemActive(item, adminTab, scoresView) {
  if (item.view) {
    return adminTab === "scores" && scoresView === item.view;
  }
  return adminTab === item.tab;
}

function handleItemClick(item, onNavigate, onScoresViewChange) {
  if (item.view) {
    onNavigate("scores");
    onScoresViewChange(item.view);
  } else {
    onNavigate(item.tab);
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdminSidebar({
  adminTab,
  scoresView,
  onNavigate,
  onScoresViewChange,
  activeOrganization,
  organizations,
  onTenantSwitch,
  isSuper,
  user,
  displayName,
  onLogout,
  isOpen,
  onClose,
}) {
  const { theme, setTheme } = useTheme();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false);

  const initials = getInitials(displayName || user?.email || "");
  const orgName = activeOrganization?.name || "";
  const roleLabel = isSuper ? "Platform Owner" : `${orgName} · Organization Admin`;

  const hasMultipleOrgs = isSuper && organizations && organizations.length > 1;

  return (
    <aside className={`sidebar${isOpen ? " mobile-open" : ""}`} id="sidebar-nav">
      {/* Logo / Brand */}
      <div className="sb-logo">
        <div className="sb-logo-icon">
          <img src={veraLogo} alt="V" />
        </div>
        <div className="sb-logo-text">
          <span>V</span>ERA<small>v1.0</small>
        </div>
        <button
          className="sidebar-close-btn"
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tenant switcher (super admin only, multiple orgs) */}
      {hasMultipleOrgs && (
        <div className="sb-tenant-wrap">
          <div
            className="sb-tenant"
            id="tenant-trigger"
            onClick={() => setTenantMenuOpen((v) => !v)}
          >
            <span className="sb-tenant-dot" />
            <span className="sb-tenant-name">{orgName || "Select Organization"}</span>
            <span className="sb-tenant-chevron">▾</span>
          </div>
          {tenantMenuOpen && (
            <div className="sb-tenant-menu" id="tenant-menu">
              <div className="sb-tenant-menu-header">
                <div className="sb-tenant-menu-header-title">Select organization</div>
                <div className="sb-tenant-menu-header-sub">Switch between departments</div>
              </div>
              <div className="sb-tenant-menu-list">
                {organizations.filter((o) => o.id != null).map((org) => (
                  <div
                    key={org.id}
                    className={`sb-tenant-item${activeOrganization?.id === org.id ? " active" : ""}`}
                    onClick={() => { onTenantSwitch(org); setTenantMenuOpen(false); }}
                  >
                    <div className="sb-tenant-item-info">
                      <div className="sb-tenant-item-dept">{org.name}</div>
                    </div>
                    {activeOrganization?.id === org.id && (
                      <span className="sb-tenant-item-check">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="sb-nav">
        {NAV_ITEMS.map(({ section, items }) => (
          <div key={section}>
            <div className="sb-section">{section}</div>
            {items.map((item) => (
              <div
                key={item.id}
                className={`sb-item${isItemActive(item, adminTab, scoresView) ? " active" : ""}`}
                onClick={() => handleItemClick(item, onNavigate, onScoresViewChange)}
              >
                {item.icon}
                {item.label}
              </div>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom: theme toggle + account */}
      <div className="sb-bottom">
        <button
          className="sb-theme-toggle"
          id="theme-toggle"
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" /><path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" /><path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
          <span className="toggle-label">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>

        <button
          className="sb-user"
          id="account-trigger"
          type="button"
          onClick={() => setAccountMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={accountMenuOpen}
          aria-controls="account-menu"
        >
          <div className="sb-avatar">{initials}</div>
          <div className="sb-user-info">
            <div className="sb-user-name">{displayName || user?.email || "Admin"}</div>
            <div className="sb-user-role">{roleLabel}</div>
          </div>
          <span className="sb-user-chevron">▾</span>
        </button>

        {accountMenuOpen && (
          <div className="sb-account-menu" id="account-menu" role="menu" aria-label="Account menu">
            <div className="sb-account-head">
              <div className="sb-avatar">{initials}</div>
              <div className="sb-account-meta">
                <div className="sb-user-name">{displayName || user?.email || "Admin"}</div>
                <div className="sb-user-role">{roleLabel}</div>
              </div>
            </div>
            <div className="sb-account-list">
              <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
              <button
                className="sb-account-item danger"
                type="button"
                role="menuitem"
                onClick={() => { setAccountMenuOpen(false); onLogout?.(); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
