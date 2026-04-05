# Avatar Menu — Tenant Admin List & Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Super-admins see all tenant admins in the avatar dropdown, grouped by organization, and can edit their display name inline without leaving the menu.

**Architecture:** `UserAvatarMenu.jsx` is extended with a `menuView` state machine (`"main" | "team" | "detail"`). Org/admin data is fetched via the existing `listOrganizations()` API when the menu opens. Three view sub-components render inside a clip container with CSS slide transitions. CSS classes are added to `src/styles/components.css`.

**Tech Stack:** React (hooks, createPortal), existing Supabase API (`listOrganizations`, `updateMemberAdmin`), CSS custom properties from `src/styles/variables.css`.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/admin/components/UserAvatarMenu.jsx` | Modify | Add `menuView`, `prevView`, `selectedAdmin`, `orgList`, `orgLoading`, `orgError`, `adminEditName`, `adminSaving` state; add `TeamPreview`, `TeamListView`, `AdminDetailView` sub-components |
| `src/styles/components.css` | Modify (append) | Add `.ph-avatar-*` base styles (currently missing) + team/admin-row/view-transition classes |

No new files. No new API functions.

---

## Task 1: Add CSS base styles for UserAvatarMenu

The `ph-avatar-*` and `profile-modal-*` classes used in `UserAvatarMenu.jsx` are missing from all tracked CSS files. Before adding team-specific styles, establish the base.

**Files:**
- Modify: `src/styles/components.css` (append at end)

- [ ] **Step 1: Append base avatar menu CSS to components.css**

Open `src/styles/components.css` and append at the very end:

```css
/* ── UserAvatarMenu ─────────────────────────────────────────── */

.ph-avatar-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  transition: opacity 0.15s, box-shadow 0.15s;
}
.ph-avatar-btn:hover { opacity: 0.88; box-shadow: 0 0 0 3px rgba(99,102,241,0.25); }

.ph-avatar-menu {
  min-width: 280px;
  max-width: 320px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
  overflow: hidden;
  z-index: 9999;
}

.ph-avatar-menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}
.ph-avatar-circle-lg {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.ph-avatar-menu-identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.ph-avatar-menu-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ph-avatar-menu-email {
  font-size: 11.5px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ph-avatar-role-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(99,102,241,0.12);
  color: #818cf8;
  width: fit-content;
  margin-top: 2px;
}
.ph-avatar-role-badge--super {
  background: rgba(245,158,11,0.12);
  color: #f59e0b;
}
.ph-avatar-menu-tenant {
  font-size: 10.5px;
  color: var(--text-tertiary);
}
.ph-avatar-menu-divider {
  height: 1px;
  background: var(--border);
  margin: 0;
}
.ph-avatar-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}
.ph-avatar-menu-item:hover { background: var(--accent); }
.ph-avatar-menu-item svg { width: 15px; height: 15px; opacity: 0.7; }
.ph-avatar-menu-item--danger { color: #ef4444; }
.ph-avatar-menu-item--danger:hover { background: rgba(239,68,68,0.08); }

/* ── Profile modal styles ─────────────────────────────────── */

.profile-modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
}
.profile-modal-header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(99,102,241,0.1);
  color: #818cf8;
  flex-shrink: 0;
}
.profile-modal-header-icon svg { width: 16px; height: 16px; }
.profile-modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
.profile-modal-body {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.profile-modal-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  align-self: center;
}
.profile-readonly-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: var(--accent);
  border-radius: 8px;
  border: 1px solid var(--border);
}
.profile-readonly-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.profile-readonly-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
}
.profile-readonly-label svg { width: 13px; height: 13px; }
.profile-readonly-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
.profile-password-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: #818cf8;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-weight: 500;
  transition: color 0.12s;
}
.profile-password-link:hover { color: #6366f1; }
.profile-password-link svg { width: 13px; height: 13px; }
.profile-password-hint {
  font-size: 11.5px;
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.5;
}
.profile-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--border);
}

body:not(.dark-mode) .ph-avatar-menu {
  background: #fff;
  border-color: rgba(148,163,184,0.28);
  box-shadow: 0 16px 40px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06);
}
body:not(.dark-mode) .ph-avatar-menu-item:hover { background: rgba(241,245,249,0.9); }
body:not(.dark-mode) .ph-avatar-menu-item--danger:hover { background: rgba(239,68,68,0.06); }
body:not(.dark-mode) .profile-readonly-section { background: #f8fafc; }
```

- [ ] **Step 2: Verify dev server still compiles**

```bash
npm run build -- --mode development 2>&1 | tail -5
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/styles/components.css
git commit -m "style: add base CSS for UserAvatarMenu and ProfileModal"
```

---

## Task 2: Add multi-view state + views clip container

Refactor the dropdown to support view switching before adding the actual team content.

**Files:**
- Modify: `src/admin/components/UserAvatarMenu.jsx`
- Modify: `src/styles/components.css`

- [ ] **Step 1: Add view state and clip container CSS**

Append to `src/styles/components.css`:

```css
/* ── Avatar menu multi-view ────────────────────────────────── */

.ph-avatar-menu-views {
  position: relative;
  overflow: hidden;
}
.ph-avatar-menu-view {
  width: 100%;
  transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1),
              opacity 180ms ease;
}
.ph-avatar-menu-view--hidden-right {
  position: absolute;
  top: 0;
  left: 0;
  transform: translateX(100%);
  pointer-events: none;
  opacity: 0;
}
.ph-avatar-menu-view--hidden-left {
  position: absolute;
  top: 0;
  left: 0;
  transform: translateX(-100%);
  pointer-events: none;
  opacity: 0;
}
.ph-avatar-view-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 10px;
  border-bottom: 1px solid var(--border);
}
.ph-avatar-view-back {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 6px;
  transition: background 0.12s, color 0.12s;
  flex-shrink: 0;
}
.ph-avatar-view-back:hover { background: var(--accent); color: var(--text-primary); }
.ph-avatar-view-back svg { width: 13px; height: 13px; }
.ph-avatar-view-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
body:not(.dark-mode) .ph-avatar-view-back:hover { background: #f1f5f9; }
```

- [ ] **Step 2: Add view state to UserAvatarMenu**

In `src/admin/components/UserAvatarMenu.jsx`, add state after the existing `useState` declarations (around line 57):

```jsx
const [menuView, setMenuView] = useState("main"); // "main" | "team" | "detail"
const [prevView, setPrevView] = useState("main");
const [selectedAdmin, setSelectedAdmin] = useState(null);
const [orgList, setOrgList] = useState([]);
const [orgLoading, setOrgLoading] = useState(false);
const [orgError, setOrgError] = useState("");
```

Also add this import at the top (with existing imports from `@/shared/api`):

```jsx
import { listOrganizations } from "@/shared/api";
```

- [ ] **Step 3: Fetch orgs when menu opens**

Add a `useEffect` after the existing escape-key effect (around line 122):

```jsx
// Fetch org/admin data when menu opens (super-admin only)
useEffect(() => {
  if (!menuOpen || !isSuper) return;
  setOrgLoading(true);
  setOrgError("");
  listOrganizations()
    .then((data) => setOrgList(data))
    .catch((e) => setOrgError(e?.message || "Could not load admins."))
    .finally(() => setOrgLoading(false));
}, [menuOpen, isSuper]);
```

- [ ] **Step 4: Reset view when menu closes**

Add to the existing outside-click handler and escape handler — after `setMenuOpen(false)` in both places, reset the view:

Find the `handleMenuAction` callback and add view reset on menu close:

```jsx
// Replace the existing handleMenuAction with:
const handleMenuAction = useCallback((action) => {
  setMenuOpen(false);
  setMenuView("main");
  setPrevView("main");
  setSelectedAdmin(null);
  if (action === "profile") profile.openModal("profile");
  else if (action === "password") profile.openModal("password");
  else if (action === "logout") onLogout();
}, [profile, onLogout]);
```

Also reset on outside-click and escape by replacing those handlers:

```jsx
// Outside-click to close dropdown
useEffect(() => {
  if (!menuOpen) return;
  function handleOutside(e) {
    if (triggerRef.current?.contains(e.target)) return;
    if (panelRef.current?.contains(e.target)) return;
    setMenuOpen(false);
    setMenuView("main");
    setSelectedAdmin(null);
  }
  document.addEventListener("mousedown", handleOutside);
  return () => document.removeEventListener("mousedown", handleOutside);
}, [menuOpen]);

// Escape to close dropdown
useEffect(() => {
  if (!menuOpen) return;
  function handleKey(e) {
    if (e.key === "Escape") {
      setMenuOpen(false);
      setMenuView("main");
      setSelectedAdmin(null);
    }
  }
  document.addEventListener("keydown", handleKey);
  return () => document.removeEventListener("keydown", handleKey);
}, [menuOpen]);
```

- [ ] **Step 5: Wrap dropdown content in views clip container**

In the `createPortal` dropdown JSX (around line 151), wrap the inner content with the clip container. Replace the inner `<div>` content structure:

```jsx
{menuOpen && createPortal(
  <div
    ref={panelRef}
    className="ph-avatar-menu"
    style={panelStyle}
    role="menu"
    aria-label="Account menu"
  >
    <div className="ph-avatar-menu-views">
      {/* Main view */}
      <div className={`ph-avatar-menu-view${menuView !== "main" ? " ph-avatar-menu-view--hidden-left" : ""}`}>
        {/* Header */}
        <div className="ph-avatar-menu-header">
          <div className="ph-avatar-circle-lg" style={{ background: avatarBg }} aria-hidden="true">
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
      </div>

      {/* Team list view — placeholder, filled in Task 4 */}
      <div className={`ph-avatar-menu-view${menuView !== "team" ? " ph-avatar-menu-view--hidden-right" : ""}`}>
        <div className="ph-avatar-view-header">
          <button className="ph-avatar-view-back" onClick={() => setMenuView("main")} aria-label="Back">
            ← <span>Back</span>
          </button>
          <span className="ph-avatar-view-title">All Admins</span>
        </div>
        <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-tertiary)" }}>Loading…</div>
      </div>

      {/* Admin detail view — placeholder, filled in Task 5 */}
      <div className={`ph-avatar-menu-view${menuView !== "detail" ? " ph-avatar-menu-view--hidden-right" : ""}`}>
        <div className="ph-avatar-view-header">
          <button className="ph-avatar-view-back" onClick={() => setMenuView(prevView)} aria-label="Back">
            ← <span>Back</span>
          </button>
          <span className="ph-avatar-view-title">Admin Profile</span>
        </div>
        <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-tertiary)" }}>Loading…</div>
      </div>
    </div>
  </div>,
  document.body
)}
```

- [ ] **Step 6: Verify dev server and menu still opens/closes**

```bash
npm run dev &
# Open browser, click avatar button, verify menu opens, Escape closes it, view state resets
```

- [ ] **Step 7: Commit**

```bash
git add src/admin/components/UserAvatarMenu.jsx src/styles/components.css
git commit -m "feat(avatar-menu): add multi-view state and slide clip container"
```

---

## Task 3: Team preview section in main view

Add the "Team" section to the bottom of the main view, showing up to 3 admins and a "View all →" link for super-admins.

**Files:**
- Modify: `src/admin/components/UserAvatarMenu.jsx`
- Modify: `src/styles/components.css`

- [ ] **Step 1: Add team preview CSS**

Append to `src/styles/components.css`:

```css
/* ── Team preview in main view ─────────────────────────────── */

.ph-avatar-team-section {
  padding: 8px 0 4px;
}
.ph-avatar-team-label {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--text-tertiary);
  padding: 4px 16px 6px;
}
.ph-avatar-admin-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 16px;
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  transition: background 0.12s;
}
.ph-avatar-admin-row:hover { background: var(--accent); }
.ph-avatar-admin-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.ph-avatar-admin-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}
.ph-avatar-admin-name {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ph-avatar-admin-org {
  font-size: 10.5px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ph-avatar-team-viewall {
  display: block;
  width: 100%;
  padding: 6px 16px 10px;
  font-size: 11.5px;
  font-weight: 500;
  color: #818cf8;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: color 0.12s;
}
.ph-avatar-team-viewall:hover { color: #6366f1; }
.ph-avatar-team-error {
  font-size: 11.5px;
  color: #ef4444;
  padding: 6px 16px;
}
body:not(.dark-mode) .ph-avatar-admin-row:hover { background: #f1f5f9; }
```

- [ ] **Step 2: Add TeamPreview sub-component**

Add this sub-component to `UserAvatarMenu.jsx` (above the `UserAvatarMenu` default export, after the helper functions):

```jsx
function TeamPreview({ orgList, orgLoading, orgError, onSelectAdmin, onViewAll }) {
  // Collect up to 3 admins across all orgs, sorted by org name then admin name
  const preview = [];
  const sorted = [...orgList].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  for (const org of sorted) {
    for (const admin of (org.tenantAdmins || [])) {
      if (preview.length >= 3) break;
      preview.push({ ...admin, organizationId: org.id, organizationName: org.name });
    }
    if (preview.length >= 3) break;
  }

  const totalAdmins = orgList.reduce((sum, o) => sum + (o.tenantAdmins?.length || 0), 0);

  return (
    <div className="ph-avatar-team-section">
      <div className="ph-avatar-team-label">Team</div>
      {orgLoading && (
        <div style={{ padding: "6px 16px", fontSize: 12, color: "var(--text-tertiary)" }}>Loading…</div>
      )}
      {orgError && <div className="ph-avatar-team-error">{orgError}</div>}
      {!orgLoading && !orgError && preview.length === 0 && (
        <div style={{ padding: "6px 16px", fontSize: 12, color: "var(--text-tertiary)" }}>No admins yet.</div>
      )}
      {!orgLoading && preview.map((admin) => (
        <button
          key={admin.userId}
          className="ph-avatar-admin-row"
          role="menuitem"
          onClick={() => onSelectAdmin(admin)}
        >
          <div
            className="ph-avatar-admin-avatar"
            style={{ background: getAvatarColor(admin.name || admin.email) }}
            aria-hidden="true"
          >
            {getInitials(admin.name, admin.email)}
          </div>
          <div className="ph-avatar-admin-info">
            <span className="ph-avatar-admin-name">{admin.name || admin.email}</span>
            <span className="ph-avatar-admin-org">{admin.organizationName}</span>
          </div>
        </button>
      ))}
      {!orgLoading && totalAdmins > 3 && (
        <button className="ph-avatar-team-viewall" onClick={onViewAll}>
          View all ({totalAdmins}) →
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire TeamPreview into main view**

In `UserAvatarMenu`, add navigation helpers:

```jsx
const navigateTo = useCallback((view, from = "main") => {
  setPrevView(from);
  setMenuView(view);
}, []);

const handleSelectAdmin = useCallback((admin) => {
  setSelectedAdmin(admin);
  setAdminEditName(admin.name || "");
  navigateTo("detail", menuView);
}, [menuView, navigateTo]);
```

Also add `adminEditName` and `adminSaving` state (used in Task 5):

```jsx
const [adminEditName, setAdminEditName] = useState("");
const [adminSaving, setAdminSaving] = useState(false);
const [adminSaveError, setAdminSaveError] = useState("");
```

Then in the main view JSX (in the clip container), replace the divider before Sign Out with:

```jsx
{isSuper && (
  <>
    <div className="ph-avatar-menu-divider" />
    <TeamPreview
      orgList={orgList}
      orgLoading={orgLoading}
      orgError={orgError}
      onSelectAdmin={(admin) => handleSelectAdmin(admin)}
      onViewAll={() => navigateTo("team", "main")}
    />
  </>
)}

<div className="ph-avatar-menu-divider" />

<button className="ph-avatar-menu-item ph-avatar-menu-item--danger" role="menuitem" onClick={() => handleMenuAction("logout")}>
  <LogOutIcon /> Sign Out
</button>
```

- [ ] **Step 4: Verify team preview renders for super-admin**

```bash
npm run dev
```

Open the avatar menu as super-admin. Verify:
- "TEAM" label appears above Sign Out
- Admin rows show (colored avatars, name, org)
- Clicking an admin changes `menuView` to "detail" (shows placeholder detail view)
- "View all →" appears if >3 admins, navigates to team list (placeholder)

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/UserAvatarMenu.jsx src/styles/components.css
git commit -m "feat(avatar-menu): add team preview section with up to 3 admins"
```

---

## Task 4: Team list view (all admins grouped by org)

**Files:**
- Modify: `src/admin/components/UserAvatarMenu.jsx`
- Modify: `src/styles/components.css`

- [ ] **Step 1: Add team list CSS**

Append to `src/styles/components.css`:

```css
/* ── Team list view ────────────────────────────────────────── */

.ph-avatar-team-list {
  max-height: 340px;
  overflow-y: auto;
  padding: 4px 0 8px;
}
.ph-avatar-org-section { }
.ph-avatar-org-label {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--text-tertiary);
  padding: 10px 16px 4px;
}
.ph-avatar-org-label:first-child { padding-top: 6px; }
.ph-avatar-team-empty {
  padding: 16px;
  font-size: 12.5px;
  color: var(--text-tertiary);
  text-align: center;
}
```

- [ ] **Step 2: Add TeamListView sub-component**

Add to `UserAvatarMenu.jsx` (after `TeamPreview`):

```jsx
function TeamListView({ orgList, orgLoading, orgError, onBack, onSelectAdmin }) {
  const sorted = [...orgList]
    .filter((o) => (o.tenantAdmins?.length || 0) > 0)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return (
    <>
      <div className="ph-avatar-view-header">
        <button className="ph-avatar-view-back" onClick={onBack} aria-label="Back">
          ← <span>Back</span>
        </button>
        <span className="ph-avatar-view-title">All Admins</span>
      </div>

      <div className="ph-avatar-team-list">
        {orgLoading && (
          <div className="ph-avatar-team-empty">Loading…</div>
        )}
        {orgError && (
          <div className="ph-avatar-team-error" style={{ padding: "12px 16px" }}>{orgError}</div>
        )}
        {!orgLoading && !orgError && sorted.length === 0 && (
          <div className="ph-avatar-team-empty">No admins found.</div>
        )}
        {!orgLoading && sorted.map((org) => (
          <div key={org.id} className="ph-avatar-org-section">
            <div className="ph-avatar-org-label">{org.name}</div>
            {(org.tenantAdmins || []).map((admin) => {
              const enriched = { ...admin, organizationId: org.id, organizationName: org.name };
              return (
                <button
                  key={admin.userId}
                  className="ph-avatar-admin-row"
                  role="menuitem"
                  onClick={() => onSelectAdmin(enriched)}
                >
                  <div
                    className="ph-avatar-admin-avatar"
                    style={{ background: getAvatarColor(admin.name || admin.email) }}
                    aria-hidden="true"
                  >
                    {getInitials(admin.name, admin.email)}
                  </div>
                  <div className="ph-avatar-admin-info">
                    <span className="ph-avatar-admin-name">{admin.name || admin.email}</span>
                    <span className="ph-avatar-admin-org">{admin.email}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Replace placeholder team view in clip container**

In `UserAvatarMenu`'s JSX, replace the placeholder team view div:

```jsx
{/* Team list view */}
<div className={`ph-avatar-menu-view${menuView !== "team" ? " ph-avatar-menu-view--hidden-right" : ""}`}>
  <TeamListView
    orgList={orgList}
    orgLoading={orgLoading}
    orgError={orgError}
    onBack={() => setMenuView("main")}
    onSelectAdmin={(admin) => handleSelectAdmin(admin)}
  />
</div>
```

- [ ] **Step 4: Verify team list view**

```bash
npm run dev
```

Click "View all →" in the avatar menu. Verify:
- Back button returns to main view
- Orgs rendered as section headers (alphabetical)
- Admin rows clickable (navigates to detail placeholder)
- Scrolls if many admins

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/UserAvatarMenu.jsx src/styles/components.css
git commit -m "feat(avatar-menu): add team list view grouped by organization"
```

---

## Task 5: Admin detail view with editable display name

**Files:**
- Modify: `src/admin/components/UserAvatarMenu.jsx`
- Modify: `src/styles/components.css`

- [ ] **Step 1: Add admin detail CSS**

Append to `src/styles/components.css`:

```css
/* ── Admin detail view ─────────────────────────────────────── */

.ph-avatar-detail-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ph-avatar-detail-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 4px 0 8px;
}
.ph-avatar-detail-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  font-weight: 700;
  color: #fff;
}
.ph-avatar-detail-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}
.ph-avatar-detail-email {
  font-size: 11.5px;
  color: var(--text-tertiary);
  text-align: center;
}
.ph-avatar-detail-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: var(--accent);
  border-radius: 8px;
  border: 1px solid var(--border);
}
.ph-avatar-detail-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ph-avatar-detail-meta-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 500;
}
.ph-avatar-detail-meta-label svg { width: 12px; height: 12px; }
.ph-avatar-detail-meta-value {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-primary);
}
.ph-avatar-detail-field-label {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-tertiary);
  display: block;
  margin-bottom: 4px;
}
.ph-avatar-detail-input {
  width: 100%;
  padding: 7px 10px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--background);
  color: var(--text-primary);
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}
.ph-avatar-detail-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
}
.ph-avatar-detail-input:disabled { opacity: 0.5; cursor: default; }
.ph-avatar-detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px 14px;
  border-top: 1px solid var(--border);
}
.ph-avatar-detail-save-error {
  font-size: 11px;
  color: #ef4444;
  padding: 0 16px 6px;
  text-align: right;
}
body:not(.dark-mode) .ph-avatar-detail-meta { background: #f8fafc; }
```

- [ ] **Step 2: Add AdminDetailView sub-component**

Add to `UserAvatarMenu.jsx` (after `TeamListView`):

```jsx
function AdminDetailView({ admin, editName, setEditName, saving, saveError, onSave, onCancel, onBack, isDemoMode }) {
  if (!admin) return null;
  const isDirty = editName.trim() !== (admin.name || "").trim();
  const avatarBg = getAvatarColor(admin.name || admin.email);
  const initials = getInitials(admin.name, admin.email);

  return (
    <>
      <div className="ph-avatar-view-header">
        <button className="ph-avatar-view-back" onClick={onBack} aria-label="Back">
          ← <span>Back</span>
        </button>
        <span className="ph-avatar-view-title">Admin Profile</span>
      </div>

      <div className="ph-avatar-detail-body">
        <div className="ph-avatar-detail-hero">
          <div className="ph-avatar-detail-circle" style={{ background: avatarBg }} aria-hidden="true">
            {initials}
          </div>
          <span className="ph-avatar-detail-name">{admin.name || "—"}</span>
          <span className="ph-avatar-detail-email">{admin.email}</span>
        </div>

        <div className="ph-avatar-detail-meta">
          <div className="ph-avatar-detail-meta-row">
            <span className="ph-avatar-detail-meta-label"><BuildingIcon /> Organization</span>
            <span className="ph-avatar-detail-meta-value">{admin.organizationName}</span>
          </div>
          <div className="ph-avatar-detail-meta-row">
            <span className="ph-avatar-detail-meta-label"><ShieldCheckIcon /> Role</span>
            <span className="ph-avatar-detail-meta-value">{admin.role || "Admin"}</span>
          </div>
        </div>

        <div>
          <label className="ph-avatar-detail-field-label" htmlFor="admin-detail-name">Full Name</label>
          <input
            id="admin-detail-name"
            type="text"
            className="ph-avatar-detail-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={saving}
            placeholder="Display name"
          />
        </div>

        <div>
          <label className="ph-avatar-detail-field-label">Email</label>
          <input
            type="email"
            className="ph-avatar-detail-input"
            value={admin.email}
            disabled
            readOnly
          />
        </div>
      </div>

      {saveError && <div className="ph-avatar-detail-save-error">{saveError}</div>}

      <div className="ph-avatar-detail-actions">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          onClick={onSave}
          disabled={saving || !isDirty || isDemoMode}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Add save handler in UserAvatarMenu and wire detail view**

Add this import at top:

```jsx
import { listOrganizations, updateMemberAdmin } from "@/shared/api";
```

(Replace the existing `listOrganizations` import.)

Add save handler in `UserAvatarMenu` component body:

```jsx
const handleAdminSave = useCallback(async () => {
  if (!selectedAdmin) return;
  setAdminSaving(true);
  setAdminSaveError("");
  try {
    await updateMemberAdmin({ userId: selectedAdmin.userId, displayName: adminEditName.trim() });
    // Refresh org list so preview reflects new name
    const updated = await listOrganizations();
    setOrgList(updated);
    // Update selectedAdmin so detail view hero reflects new name
    setSelectedAdmin((prev) => prev ? { ...prev, name: adminEditName.trim() } : prev);
  } catch (e) {
    setAdminSaveError(e?.message || "Could not save.");
  } finally {
    setAdminSaving(false);
  }
}, [selectedAdmin, adminEditName]);

const handleAdminCancel = useCallback(() => {
  setAdminEditName(selectedAdmin?.name || "");
  setAdminSaveError("");
}, [selectedAdmin]);
```

Then replace the placeholder detail view in the clip container:

```jsx
{/* Admin detail view */}
<div className={`ph-avatar-menu-view${menuView !== "detail" ? " ph-avatar-menu-view--hidden-right" : ""}`}>
  <AdminDetailView
    admin={selectedAdmin}
    editName={adminEditName}
    setEditName={setAdminEditName}
    saving={adminSaving}
    saveError={adminSaveError}
    onSave={handleAdminSave}
    onCancel={handleAdminCancel}
    onBack={() => setMenuView(prevView)}
    isDemoMode={isDemoMode}
  />
</div>
```

- [ ] **Step 4: Verify end-to-end admin edit flow**

```bash
npm run dev
```

1. Open avatar menu as super-admin
2. Click an admin in the Team preview
3. Verify: detail view slides in, hero shows avatar/name/email, meta shows org/role, name field is editable
4. Change the name → Save button activates
5. Click Save → "Saving…" state → name updates in hero + team preview on success
6. Cancel resets the name field
7. Back button returns to correct previous view

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/UserAvatarMenu.jsx src/styles/components.css
git commit -m "feat(avatar-menu): add admin detail view with editable display name"
```

---

## Task 6: Non-super-admin guard + dark/light mode polish

Verify the full feature is hidden from non-super-admin users and styled correctly in both modes.

**Files:**
- Modify: `src/admin/components/UserAvatarMenu.jsx` (guard check)
- Modify: `src/styles/components.css` (light-mode overrides if missing)

- [ ] **Step 1: Verify super-admin guard**

The `TeamPreview` section is already gated with `{isSuper && ...}`. Confirm by logging in as a tenant-admin (non-super) and verifying the Team section is absent from the menu.

- [ ] **Step 2: Verify light mode**

Toggle Light Mode in the app. Check:
- Dropdown background is white (`#fff`)
- Admin rows have readable contrast on hover
- Detail view inputs have visible borders
- Meta section has light gray background

If any issue found, add the missing override to `src/styles/components.css` under the existing `body:not(.dark-mode)` block for avatar menu styles.

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | tail -10
```

Expected: No errors, no warnings about missing imports.

- [ ] **Step 4: Final commit**

```bash
git add src/admin/components/UserAvatarMenu.jsx src/styles/components.css
git commit -m "feat(avatar-menu): complete tenant admin list — guard, polish, light mode"
```

---

## Self-Review Against Spec

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Super-admin only | Task 3 (`{isSuper && ...}`) + Task 6 guard verification |
| Multi-view: main / team / detail | Task 2 (state + clip container) |
| CSS slide transitions | Task 2 (CSS) |
| Fetch `listOrganizations()` on menu open | Task 2 Step 3 |
| Team preview: up to 3 admins, "View all →" | Task 3 |
| Team list: grouped by org, sorted alphabetically | Task 4 |
| Admin detail: avatar + read-only header | Task 5 |
| Admin detail: editable Full Name | Task 5 |
| Admin detail: read-only Email | Task 5 |
| Save via `updateMemberAdmin` | Task 5 |
| Save disabled when not dirty or demo mode | Task 5 (`AdminDetailView`) |
| Cancel resets dirty state | Task 5 (`handleAdminCancel`) |
| Back button respects `prevView` | Task 5 (`onBack={() => setMenuView(prevView)}`) |
| Delete out of scope | Confirmed absent |
| Email edit out of scope | Confirmed (email field `disabled readOnly`) |
| Loading state | Task 2 + Task 3 (`orgLoading`) |
| Error state | Task 3 + Task 4 (`orgError`) |
| Refresh org list after save | Task 5 (`handleAdminSave`) |
| Light mode polish | Task 1 + Task 6 |

No gaps found.

**Placeholder scan:** No TBDs, no "implement later", no missing code blocks.

**Type consistency:** `admin` object shape (`userId`, `name`, `email`, `organizationId`, `organizationName`, `role`) is consistent across `TeamPreview`, `TeamListView`, `AdminDetailView`, `handleSelectAdmin`, and `handleAdminSave`.
