// src/admin/pages/OrganizationsPage.jsx
// Super-admin only: organization management, pending approvals, governance.
// Extracted from SettingsPage.jsx as part of Settings restructure.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAdminContext } from "../hooks/useAdminContext";
import { useAuth } from "@/auth";
import { useToast } from "@/shared/hooks/useToast";
import FbAlert from "@/shared/ui/FbAlert";
import Drawer from "@/shared/ui/Drawer";
import Modal from "@/shared/ui/Modal";
import { useManageOrganizations } from "../hooks/useManageOrganizations";
import Avatar from "@/shared/ui/Avatar";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import CustomSelect from "@/shared/ui/CustomSelect";
import { listPeriods, setCurrentPeriod, updateOrganization, writeAuditLog } from "@/shared/api";
import {
  GlobalSettingsDrawer,
  ExportBackupDrawer,
  MaintenanceDrawer,
  SystemHealthDrawer,
} from "../drawers/GovernanceDrawers";
import { jurorInitials, jurorAvatarBg, jurorAvatarFg } from "../utils/jurorIdentity";
import { Archive, CheckCircle2, Clock, Filter, Lock, Mail, Trash2, TriangleAlert, UserPlus, X } from "lucide-react";
import { FilterButton } from "@/shared/ui/FilterButton";

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
  if (status === "archived") return <span className="badge badge-neutral"><Archive size={11} strokeWidth={2.2} />Archived</span>;
  return <span className="badge badge-warning">{status ? String(status).charAt(0).toUpperCase() + String(status).slice(1) : "—"}</span>;
}

function formatShortDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (v) => String(v).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return formatShortDate(dateStr);
}

function SortIcon({ colKey, sortKey, sortDir }) {
  if (sortKey !== colKey) {
    return <span className="sort-icon sort-icon-inactive">▲</span>;
  }
  return (
    <span className="sort-icon sort-icon-active">
      {sortDir === "asc" ? "▲" : "▼"}
    </span>
  );
}

function splitInstitution(institution) {
  const raw = String(institution || "").trim();
  if (!raw) return { university: "—", department: "—" };
  const parts = raw.split("·").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      university: parts.slice(0, parts.length - 1).join(" · "),
      department: parts[parts.length - 1],
    };
  }
  return { university: raw, department: "—" };
}

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];
function getAvatarColor(name) {
  const code = (name || "?").charCodeAt(0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

// ── Main Component ────────────────────────────────────────────

export default function OrganizationsPage() {
  const { organizationId } = useAdminContext();
  const { user, isSuper, activeOrganization, refreshMemberships } = useAuth();
  const _toast = useToast();
  const setMessage = useCallback((msg) => { if (msg) _toast.success(msg); }, [_toast]);
  const noop = useCallback(() => {}, []);

  // ── Guard: super admin only ──────────────────────────────────
  if (!isSuper) {
    return <Navigate to="../overview" replace />;
  }

  const {
    orgList,
    filteredOrgs,
    search,
    setSearch,
    showCreate,
    createForm,
    setCreateForm,
    createError,
    openCreate,
    closeCreate,
    handleCreateOrg,
    showEdit,
    editForm,
    setEditForm,
    editError,
    handleApproveApplication,
    handleRejectApplication,
    applicationActionLoading,
    openEdit,
    closeEdit,
    handleUpdateOrg,
    handleDeleteTenantAdmin,
    loadOrgs,
    inviteLoading,
    handleInviteAdmin: hookHandleInviteAdmin,
    handleCancelInvite,
  } = useManageOrganizations({
    enabled: true,
    setMessage,
    incLoading: noop,
    decLoading: noop,
  });

  // ── Local state ──────────────────────────────────────────────
  const [orgStatusFilter, setOrgStatusFilter] = useState("all");
  const [orgStaffingFilter, setOrgStaffingFilter] = useState("all");
  const [orgFilterOpen, setOrgFilterOpen] = useState(false);
  const [openOrgActionMenuId, setOpenOrgActionMenuId] = useState(null);
  const [viewOrg, setViewOrg] = useState(null);
  const [reviewApp, setReviewApp] = useState(null);
  const [allApplicationsOpen, setAllApplicationsOpen] = useState(false);

  const [manageAdminsOrg, setManageAdminsOrg] = useState(null);
  const [adminInviteEmail, setAdminInviteEmail] = useState("");
  const [adminInviteLoading, setAdminInviteLoading] = useState(false);
  const [adminInviteError, setAdminInviteError] = useState("");
  const [adminRemoveLoadingId, setAdminRemoveLoadingId] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [setPeriodOrg, setSetPeriodOrg] = useState(null);
  const [periodOptions, setPeriodOptions] = useState([]);
  const [periodSelection, setPeriodSelection] = useState("");
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodSaving, setPeriodSaving] = useState(false);
  const [periodError, setPeriodError] = useState("");
  const [orgPeriodOverrides, setOrgPeriodOverrides] = useState({});
  const [toggleOrg, setToggleOrg] = useState(null);
  const [toggleStatus, setToggleStatus] = useState("active");
  const [toggleReason, setToggleReason] = useState("");
  const [toggleSaving, setToggleSaving] = useState(false);
  const [toggleError, setToggleError] = useState("");

  // Governance drawer states
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);
  const [exportBackupOpen, setExportBackupOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [systemHealthOpen, setSystemHealthOpen] = useState(false);

  const [orgSortKey, setOrgSortKey] = useState("name");
  const [orgSortDir, setOrgSortDir] = useState("asc");

  // ── Derived / memos ──────────────────────────────────────────

  const getOrgMeta = useCallback((org) => {
    const lookup = {};
    const periodFromSettings = org?.settings?.currentPeriodName || org?.settings?.activePeriod || org?.settings?.active_period;
    const period = orgPeriodOverrides[org.id] || org?.active_period_name || periodFromSettings || lookup.period || "—";
    const jurors = org?.juror_count != null ? Number(org.juror_count) : "—";
    const projects = org?.project_count != null ? Number(org.project_count) : "—";
    const status = org?.status || "active";
    const { university, department } = splitInstitution(org?.institution);
    return { period, jurors, projects, status, university, department };
  }, [orgPeriodOverrides]);

  const kpis = useMemo(() => {
    const total = orgList.length;
    const active = orgList.filter((o) => o.status === "active").length;
    const archived = orgList.filter((o) => o.status === "archived").length;
    const orgAdmins = orgList.reduce((sum, o) => sum + (o.tenantAdmins?.filter((a) => a.status === "active").length ?? 0), 0);
    const unstaffedOrgs = orgList.filter((o) => (o.tenantAdmins?.filter((a) => a.status === "active").length ?? 0) === 0).length;
    const pending = orgList.reduce((sum, o) => sum + (o.pendingApplications?.length ?? 0), 0);

    // Oldest pending application age (days), across all orgs
    let oldestPendingDays = 0;
    const nowMs = Date.now();
    for (const o of orgList) {
      for (const a of o.pendingApplications || []) {
        const ts = Date.parse(a.createdAt || "");
        if (!Number.isFinite(ts)) continue;
        const days = Math.floor((nowMs - ts) / 86400000);
        if (days > oldestPendingDays) oldestPendingDays = days;
      }
    }

    const liveEvaluations = orgList.reduce(
      (sum, o) => (getOrgMeta(o).period && getOrgMeta(o).period !== "—" ? sum + 1 : sum),
      0,
    );
    const totalJurors = orgList.reduce((sum, o) => {
      const jurors = getOrgMeta(o).jurors;
      return sum + (Number.isFinite(jurors) ? jurors : 0);
    }, 0);
    const totalProjects = orgList.reduce((sum, o) => {
      const projects = getOrgMeta(o).projects;
      return sum + (Number.isFinite(projects) ? projects : 0);
    }, 0);
    return {
      total,
      active,
      archived,
      orgAdmins,
      unstaffedOrgs,
      pending,
      oldestPendingDays,
      liveEvaluations,
      totalJurors,
      totalProjects,
    };
  }, [orgList, getOrgMeta]);

  const allPending = useMemo(() =>
    orgList.flatMap((o) =>
      (o.pendingApplications || []).map((a) => ({
        ...a,
        orgId: o.id,
        orgCode: o.code,
        orgName: o.name,
        orgSubtitle: o.institution || "",
      }))
    ),
    [orgList]
  );

  const orgActiveFilterCount =
    (orgStatusFilter !== "all" ? 1 : 0) +
    (orgStaffingFilter !== "all" ? 1 : 0);

  const statusFilteredOrgs = useMemo(() => {
    let rows = orgStatusFilter === "all"
      ? filteredOrgs
      : filteredOrgs.filter((org) => String(org.status || "").toLowerCase() === orgStatusFilter);
    if (orgStaffingFilter === "unstaffed") {
      rows = rows.filter((org) => (org.tenantAdmins?.filter((a) => a.status === "active").length ?? 0) === 0);
    } else if (orgStaffingFilter === "staffed") {
      rows = rows.filter((org) => (org.tenantAdmins?.filter((a) => a.status === "active").length ?? 0) > 0);
    }
    return rows;
  }, [filteredOrgs, orgStatusFilter, orgStaffingFilter]);

  const sortedFilteredOrgs = useMemo(() => {
    const statusRank = { active: 1, archived: 2 };
    const rows = [...statusFilteredOrgs];
    rows.sort((a, b) => {
      const direction = orgSortDir === "asc" ? 1 : -1;
      const aName = String(a.name || "");
      const bName = String(b.name || "");
      let cmp = 0;
      if (orgSortKey === "name") {
        cmp = aName.localeCompare(bName, "tr", { sensitivity: "base", numeric: true });
      } else if (orgSortKey === "code") {
        cmp = String(a.code || "").localeCompare(String(b.code || ""), "tr", { sensitivity: "base", numeric: true });
      } else if (orgSortKey === "institution") {
        cmp = String(a.institution || "").localeCompare(String(b.institution || ""), "tr", { sensitivity: "base", numeric: true });
      } else if (orgSortKey === "status") {
        cmp = (statusRank[a.status] || 99) - (statusRank[b.status] || 99);
      } else if (orgSortKey === "admins") {
        cmp = (a.tenantAdmins?.filter((x) => x.status === "active").length || 0) - (b.tenantAdmins?.filter((x) => x.status === "active").length || 0);
      } else if (orgSortKey === "created_at") {
        const aTs = Date.parse(a.created_at || "");
        const bTs = Date.parse(b.created_at || "");
        const aValue = Number.isFinite(aTs) ? aTs : Number.NEGATIVE_INFINITY;
        const bValue = Number.isFinite(bTs) ? bTs : Number.NEGATIVE_INFINITY;
        cmp = aValue - bValue;
      }
      if (cmp !== 0) return cmp * direction;
      return aName.localeCompare(bName, "tr", { sensitivity: "base", numeric: true });
    });
    return rows;
  }, [statusFilteredOrgs, orgSortKey, orgSortDir]);

  // ── Effects ──────────────────────────────────────────────────

  useEffect(() => {
    function handleOutsideClick(e) {
      if (!(e.target instanceof Element)) return;
      if (!e.target.closest(".sa-org-action-wrap")) {
        setOpenOrgActionMenuId(null);
      }
    }
    if (!openOrgActionMenuId) return undefined;
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [openOrgActionMenuId]);

  useEffect(() => {
    if (!manageAdminsOrg?.id) return;
    const fresh = orgList.find((org) => org.id === manageAdminsOrg.id);
    if (!fresh) {
      setManageAdminsOrg(null);
      return;
    }
    setManageAdminsOrg(fresh);
  }, [orgList, manageAdminsOrg?.id]);

  useEffect(() => {
    if (!setPeriodOrg?.id) return undefined;
    let active = true;
    setPeriodLoading(true);
    setPeriodError("");
    setPeriodOptions([]);
    setPeriodSelection("");

    listPeriods(setPeriodOrg.id)
      .then((rows) => {
        if (!active) return;
        const list = Array.isArray(rows) ? rows : [];
        setPeriodOptions(list);
        const current = list.find((p) => p.is_current) || list[0] || null;
        setPeriodSelection(current?.id || "");
      })
      .catch((e) => {
        if (!active) return;
        setPeriodError(e?.message || "Could not load periods for this organization.");
      })
      .finally(() => {
        if (active) setPeriodLoading(false);
      });

    return () => { active = false; };
  }, [setPeriodOrg?.id]);

  // ── Handlers ─────────────────────────────────────────────────

  const runOrgMenuAction = useCallback((event, action) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenOrgActionMenuId(null);
    action?.();
  }, []);

  const handleSaveCreateOrganization = useCallback(async () => {
    setCreateSaving(true);
    try {
      await handleCreateOrg();
    } finally {
      setCreateSaving(false);
    }
  }, [handleCreateOrg]);

  const handleSaveEditOrganization = useCallback(async () => {
    setEditSaving(true);
    try {
      await handleUpdateOrg();
    } finally {
      setEditSaving(false);
    }
  }, [handleUpdateOrg]);

  const handleInviteAdmin = useCallback(async () => {
    if (!manageAdminsOrg?.id) return;
    const email = String(adminInviteEmail || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setAdminInviteError("A valid email is required.");
      return;
    }
    setAdminInviteLoading(true);
    setAdminInviteError("");
    const result = await hookHandleInviteAdmin(manageAdminsOrg.id, email);
    setAdminInviteLoading(false);
    if (result?.ok) {
      setAdminInviteEmail("");
      setAdminInviteError("");
      // Refresh the drawer with the updated org (hook already reloaded orgs)
      const fresh = orgList.find((o) => o.id === manageAdminsOrg.id);
      if (fresh) setManageAdminsOrg(fresh);
      return;
    }
    setAdminInviteError(result?.error || "Could not invite admin.");
  }, [adminInviteEmail, manageAdminsOrg, hookHandleInviteAdmin, orgList]);

  const handleRemoveAdmin = useCallback(async (orgId, userId) => {
    if (!orgId || !userId) return;
    setAdminRemoveLoadingId(userId);
    const ok = await handleDeleteTenantAdmin({ organizationId: orgId, userId });
    setAdminRemoveLoadingId("");
    if (!ok) {
      _toast.error("Could not remove admin.");
    }
  }, [handleDeleteTenantAdmin, _toast]);

  const handleSaveSetCurrentPeriod = useCallback(async () => {
    if (!setPeriodOrg?.id || !periodSelection) return;
    setPeriodSaving(true);
    setPeriodError("");
    try {
      await setCurrentPeriod(periodSelection, setPeriodOrg.id);
      const selected = periodOptions.find((p) => p.id === periodSelection);
      if (selected?.name) {
        setOrgPeriodOverrides((prev) => ({ ...prev, [setPeriodOrg.id]: selected.name }));
      }
      writeAuditLog("period.set_current", {
        resourceType: "periods",
        resourceId: periodSelection,
        organizationId: setPeriodOrg.id,
        details: { organizationCode: setPeriodOrg.code, periodName: selected?.name ?? null },
      }).catch((e) => console.warn("Audit write failed:", e?.message));
      setMessage(selected?.name ? `Current period set to ${selected.name}` : "Current period updated");
      setSetPeriodOrg(null);
      await loadOrgs();
    } catch (e) {
      setPeriodError(e?.message || "Could not set current period.");
    } finally {
      setPeriodSaving(false);
    }
  }, [loadOrgs, periodOptions, periodSelection, setPeriodOrg, setMessage]);

  const handleSaveToggleStatus = useCallback(async () => {
    if (!toggleOrg?.id) return;
    setToggleSaving(true);
    setToggleError("");
    try {
      const prevStatus = toggleOrg.status;
      await updateOrganization({
        organizationId: toggleOrg.id,
        status: toggleStatus,
      });
      writeAuditLog("organization.status_changed", {
        resourceType: "organizations",
        resourceId: toggleOrg.id,
        organizationId: toggleOrg.id,
        details: { organizationCode: toggleOrg.code, previousStatus: prevStatus, newStatus: toggleStatus, ...(toggleReason.trim() ? { reason: toggleReason.trim() } : {}) },
      }).catch((e) => console.warn("Audit write failed:", e?.message));
      setMessage(`Organization status updated to ${toggleStatus}`);
      setToggleOrg(null);
      setToggleReason("");
      await loadOrgs();
      refreshMemberships().catch(() => {});
    } catch (e) {
      setToggleError(e?.message || "Could not update organization status.");
    } finally {
      setToggleSaving(false);
    }
  }, [loadOrgs, refreshMemberships, setMessage, toggleOrg, toggleReason, toggleStatus]);

  function handleOrgSort(key) {
    if (orgSortKey === key) {
      setOrgSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setOrgSortKey(key);
    setOrgSortDir(key === "created_at" ? "desc" : "asc");
  }

  const viewOrgMeta = viewOrg ? getOrgMeta(viewOrg) : null;
  const reviewAppMeta = reviewApp ? splitSubtitle(reviewApp.orgSubtitle) : null;

  // ── Render ───────────────────────────────────────────────────

  return (
    <>
      {/* Governance drawers */}
      <GlobalSettingsDrawer open={globalSettingsOpen} onClose={() => setGlobalSettingsOpen(false)} />
      <ExportBackupDrawer open={exportBackupOpen} onClose={() => setExportBackupOpen(false)} />
      <MaintenanceDrawer open={maintenanceOpen} onClose={() => setMaintenanceOpen(false)} />
      <SystemHealthDrawer open={systemHealthOpen} onClose={() => setSystemHealthOpen(false)} />

      {/* Create Organization drawer */}
      <Drawer open={showCreate} onClose={closeCreate}>
        <div className="fs-drawer-header">
          <div className="fs-drawer-header-row">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="vera-icon-surface" style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, padding: 9 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Create Organization</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                  Register a new organization
                </div>
              </div>
            </div>
            <button className="fs-close" onClick={closeCreate}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="fs-drawer-body" style={{ gap: 16 }}>
          <div className="fs-field">
            <label className="fs-field-label">Organization</label>
            <input className="fs-input" type="text" value={createForm.university || ""} onChange={(e) => setCreateForm((prev) => ({ ...prev, university: e.target.value }))} placeholder="e.g. IEEE Antennas and Propagation Society" />
          </div>
          <div className="fs-field">
            <label className="fs-field-label">Program</label>
            <input className="fs-input" type="text" value={createForm.department || ""} onChange={(e) => setCreateForm((prev) => ({ ...prev, department: e.target.value }))} placeholder="e.g. AP-S Student Design Contest" />
          </div>
          <div className="fs-field">
            <label className="fs-field-label">Code</label>
            <input className="fs-input" type="text" value={createForm.shortLabel || ""} onChange={(e) => { const shortLabel = e.target.value.toUpperCase(); setCreateForm((prev) => ({ ...prev, shortLabel, code: shortLabel.toLowerCase().replace(/\s+/g, "-") })); }} placeholder="e.g. IEEE-APSSDC" style={{ textTransform: "uppercase", fontFamily: "var(--mono)" }} />
          </div>
          <div className="fs-field">
            <label className="fs-field-label">Contact Email</label>
            <input className="fs-input" type="email" value={createForm.contact_email || ""} onChange={(e) => setCreateForm((prev) => ({ ...prev, contact_email: e.target.value }))} placeholder="admin@organization.org" />
          </div>
          <div className="fs-field">
            <label className="fs-field-label">Initial Status</label>
            <CustomSelect value={createForm.status || "active"} onChange={(val) => setCreateForm((prev) => ({ ...prev, status: val }))} options={[{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }]} />
          </div>
          {createError && <FbAlert variant="danger">{createError}</FbAlert>}
        </div>
        <div className="fs-drawer-footer">
          <button className="fs-btn fs-btn-secondary" onClick={closeCreate} disabled={createSaving}>Cancel</button>
          <button className="fs-btn fs-btn-primary" onClick={handleSaveCreateOrganization} disabled={createSaving}>
            <AsyncButtonContent loading={createSaving} loadingText="Creating…">Create Organization</AsyncButtonContent>
          </button>
        </div>
      </Drawer>

      {/* Edit Organization drawer */}
      <Drawer open={showEdit} onClose={closeEdit}>
        <div className="fs-drawer-header">
          <div className="fs-drawer-header-row">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="vera-icon-surface" style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, padding: 9 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Edit Organization</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{editForm.shortLabel || editForm.code || "Update organization identity and settings"}</div>
              </div>
            </div>
            <button className="fs-close" onClick={closeEdit}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="fs-drawer-body" style={{ gap: 16 }}>
          <div className="fs-field">
            <label className="fs-field-label">Organization</label>
            <input className="fs-input" type="text" value={editForm.university || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, university: e.target.value }))} placeholder="e.g. IEEE Antennas and Propagation Society" />
          </div>
          <div className="fs-field">
            <label className="fs-field-label">Program</label>
            <input className="fs-input" type="text" value={editForm.name || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. AP-S Student Design Contest" />
          </div>
          <div className="fs-field">
            <label className="fs-field-label">Code</label>
            <input className="fs-input" type="text" value={editForm.shortLabel || ""} onChange={(e) => { const shortLabel = e.target.value.toUpperCase(); setEditForm((prev) => ({ ...prev, shortLabel, code: shortLabel.toLowerCase().replace(/\s+/g, "-") })); }} placeholder="e.g. APSSDC" style={{ textTransform: "uppercase", fontFamily: "var(--mono)" }} />
          </div>
          <div className="fs-field">
            <label className="fs-field-label">Status</label>
            <CustomSelect value={editForm.status || "active"} onChange={(val) => setEditForm((prev) => ({ ...prev, status: val }))} options={[{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }]} />
          </div>
          <div className="fs-field">
            <label className="fs-field-label">Contact Email</label>
            <input className="fs-input" type="email" value={editForm.contact_email || ""} onChange={(e) => setEditForm((prev) => ({ ...prev, contact_email: e.target.value }))} placeholder="admin@organization.org" />
          </div>
          {editError && <FbAlert variant="danger">{editError}</FbAlert>}
        </div>
        <div className="fs-drawer-footer">
          <button className="fs-btn fs-btn-secondary" onClick={closeEdit} disabled={editSaving}>Cancel</button>
          <button className="fs-btn fs-btn-primary" onClick={handleSaveEditOrganization} disabled={editSaving}>
            <AsyncButtonContent loading={editSaving} loadingText="Saving…">Save Changes</AsyncButtonContent>
          </button>
        </div>
      </Drawer>

      {/* View Organization drawer */}
      <Drawer open={!!viewOrg} onClose={() => setViewOrg(null)}>
        <div className="fs-drawer-header">
          <div className="fs-drawer-header-row">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="vera-icon-surface" style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, padding: 9 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{viewOrgMeta?.university || viewOrg?.name || "Organization Profile"}</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{viewOrg?.name || "—"}</div>
              </div>
            </div>
            <button className="fs-close" onClick={() => setViewOrg(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="fs-drawer-body" style={{ gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ padding: "10px 14px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
              <div className="text-xs text-muted">Status</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: viewOrgMeta?.status === "active" ? "var(--success)" : "var(--text-secondary)" }}>
                {viewOrgMeta?.status ? viewOrgMeta.status.charAt(0).toUpperCase() + viewOrgMeta.status.slice(1) : "—"}
              </div>
            </div>
            <div style={{ padding: "10px 14px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
              <div className="text-xs text-muted">Active Admins</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{viewOrg?.tenantAdmins?.filter((a) => a.status === "active").length ?? 0}</div>
            </div>
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid var(--border)" }}><span className="text-sm text-muted">Organization</span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{viewOrgMeta?.university || "—"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid var(--border)" }}><span className="text-sm text-muted">Program</span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{viewOrg?.name || "—"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid var(--border)" }}><span className="text-sm text-muted">Code</span><span style={{ fontSize: 12.5, fontWeight: 600, fontFamily: "var(--mono)" }}>{String(viewOrg?.code || "").toUpperCase() || "—"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid var(--border)" }}><span className="text-sm text-muted">Current Period</span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{viewOrgMeta?.period || "—"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid var(--border)" }}><span className="text-sm text-muted">Total Jurors</span><span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "var(--mono)" }}>{viewOrgMeta?.jurors ?? "—"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid var(--border)" }}><span className="text-sm text-muted">Total Projects</span><span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "var(--mono)" }}>{viewOrgMeta?.projects ?? "—"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px" }}><span className="text-sm text-muted">Created</span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{formatShortDate(viewOrg?.created_at)}</span></div>
          </div>
        </div>
        <div className="fs-drawer-footer">
          <button className="fs-btn fs-btn-secondary" onClick={() => setViewOrg(null)}>Close</button>
          <button className="fs-btn fs-btn-primary" onClick={() => { if (viewOrg) openEdit(viewOrg); setViewOrg(null); }}>Edit Organization</button>
        </div>
      </Drawer>

      {/* Manage Admins drawer */}
      <Drawer open={!!manageAdminsOrg} onClose={() => setManageAdminsOrg(null)}>
        <div className="fs-drawer-header">
          <div className="fs-drawer-header-row">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="fs-icon identity">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
              </div>
              <div className="fs-title-group">
                <div className="fs-title">Manage Admins</div>
                <div className="fs-subtitle">{String(manageAdminsOrg?.code || "").toUpperCase()} admin memberships</div>
              </div>
            </div>
            <button className="fs-close" onClick={() => setManageAdminsOrg(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="fs-drawer-body" style={{ gap: 10 }}>
          {(manageAdminsOrg?.tenantAdmins || []).length === 0 && (manageAdminsOrg?.pendingApplications || []).length === 0 && (
            <div className="text-sm text-muted" style={{ textAlign: "center", padding: "8px 0" }}>No admins yet.</div>
          )}
          {(manageAdminsOrg?.tenantAdmins || []).map((admin, idx) => {
            const isInvited = admin.status === "invited";
            return (
              <div key={admin.userId || `${admin.email}-${idx}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: `1px ${isInvited ? "dashed" : "solid"} var(--border)`, borderRadius: "var(--radius-sm)", opacity: isInvited ? 0.85 : 1 }}>
                {isInvited ? (
                  <div style={{ width: 34, height: 34, borderRadius: "50%", border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Mail size={14} style={{ color: "var(--text-tertiary)" }} />
                  </div>
                ) : (
                  <Avatar initials={jurorInitials(admin.name || admin.email)} bg={jurorAvatarBg(admin.name || admin.email)} size={34} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: isInvited ? 500 : 600, color: isInvited ? "var(--text-secondary)" : undefined }}>{admin.name || admin.email || "—"}</div>
                  <div className="text-xs text-muted">{admin.email || "—"}</div>
                </div>
                {isInvited ? (
                  <>
                    <span className="badge badge-warning" style={{ fontSize: 9 }}>Invited</span>
                    <button
                      title="Cancel invite"
                      disabled={inviteLoading}
                      onClick={() => handleCancelInvite(admin.membershipId)}
                      style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)", background: "color-mix(in srgb, var(--danger) 8%, transparent)", color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <button
                    title="Remove admin"
                    onClick={() => handleRemoveAdmin(manageAdminsOrg.id, admin.userId)}
                    disabled={adminRemoveLoadingId === admin.userId}
                    style={{
                      width: 30, height: 30, borderRadius: "var(--radius-sm)",
                      border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)",
                      background: "color-mix(in srgb, var(--danger) 8%, transparent)",
                      color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", flexShrink: 0, transition: "background 0.15s, border-color 0.15s",
                      opacity: adminRemoveLoadingId === admin.userId ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--danger) 16%, transparent)"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--danger) 45%, transparent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--danger) 8%, transparent)"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--danger) 25%, transparent)"; }}
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                )}
              </div>
            );
          })}
          {(manageAdminsOrg?.pendingApplications || []).map((app) => (
            <div key={app.applicationId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", opacity: 0.8 }}>
              <Avatar initials={jurorInitials(app.name || app.email)} bg={jurorAvatarBg(app.name || app.email)} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{app.name || app.email || "—"}</div>
                <div className="text-xs text-muted">{app.email || "—"}</div>
              </div>
              <span className="badge badge-warning" style={{ fontSize: 9 }}>Pending</span>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button type="button" title="Approve application" disabled={applicationActionLoading.id === app.applicationId} onClick={() => handleApproveApplication(app.applicationId)} style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", border: "1px solid color-mix(in srgb, var(--success) 35%, transparent)", background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, opacity: applicationActionLoading.id === app.applicationId ? 0.5 : 1 }}>
                  <CheckCircle2 size={13} strokeWidth={2} />
                </button>
                <button type="button" title="Reject application" disabled={applicationActionLoading.id === app.applicationId} onClick={() => handleRejectApplication(app.applicationId)} style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)", background: "color-mix(in srgb, var(--danger) 8%, transparent)", color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, opacity: applicationActionLoading.id === app.applicationId ? 0.5 : 1 }}>
                  <Trash2 size={13} strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "color-mix(in srgb, var(--accent) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <UserPlus size={15} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 650, color: "var(--text-primary)", lineHeight: 1.3 }}>Invite Admin</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.3 }}>They'll receive an email to set their password</div>
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <Mail size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none" }} />
              <input className="fs-input" type="email" placeholder="admin@university.edu" value={adminInviteEmail} onChange={(e) => { setAdminInviteEmail(e.target.value); if (adminInviteError) setAdminInviteError(""); }} onKeyDown={(e) => { if (e.key === "Enter" && !adminInviteLoading) handleInviteAdmin(); }} style={{ paddingLeft: 32 }} />
            </div>
            {adminInviteError && <div style={{ marginTop: 8 }}><FbAlert variant="danger">{adminInviteError}</FbAlert></div>}
          </div>
        </div>
        <div className="fs-drawer-footer">
          <button className="fs-btn fs-btn-secondary" onClick={() => setManageAdminsOrg(null)}>Close</button>
          <button className="fs-btn fs-btn-primary" onClick={handleInviteAdmin} disabled={adminInviteLoading || !adminInviteEmail.trim()}>
            <AsyncButtonContent loading={adminInviteLoading} loadingText="Sending…">Send Invite</AsyncButtonContent>
          </button>
        </div>
      </Drawer>

      {/* Review Application drawer */}
      <Drawer open={!!reviewApp} onClose={() => setReviewApp(null)}>
        <div className="fs-drawer-header">
          <div className="fs-drawer-header-row">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="fs-icon identity">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
              </div>
              <div className="fs-title-group">
                <div className="fs-title">Review Application</div>
                <div className="fs-subtitle">{reviewApp?.name} — {String(reviewApp?.orgCode || "").toUpperCase()}</div>
              </div>
            </div>
            <button className="fs-close" onClick={() => setReviewApp(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="fs-drawer-body" style={{ gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--surface-1)", borderRadius: "var(--radius-sm)" }}>
            <div className="fs-avatar" style={{ width: 42, height: 42, fontSize: 14 }}>{getInitials(reviewApp?.name, reviewApp?.email)}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{reviewApp?.name}</div>
              <div className="text-sm text-muted">{reviewApp?.email}</div>
            </div>
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid var(--border)" }}><span className="text-sm text-muted">Requested Organization</span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{String(reviewApp?.orgCode || "").toUpperCase()}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid var(--border)" }}><span className="text-sm text-muted">University</span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{reviewAppMeta?.university || "—"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid var(--border)" }}><span className="text-sm text-muted">Department</span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{reviewAppMeta?.department || "—"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px" }}><span className="text-sm text-muted">Submitted</span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{formatShortDate(reviewApp?.createdAt)}</span></div>
          </div>
        </div>
        <div className="fs-drawer-footer" style={{ gap: 8 }}>
          <button className="fs-btn fs-btn-secondary" style={{ flex: 1 }} onClick={() => setReviewApp(null)}>Close</button>
          <button className="btn btn-outline btn-sm" style={{ borderColor: "rgba(225,29,72,0.2)", color: "var(--danger)", padding: "8px 18px", fontSize: 12 }} onClick={async () => { if (!reviewApp?.applicationId) return; await handleRejectApplication(reviewApp.applicationId); setReviewApp(null); }} disabled={applicationActionLoading.id === reviewApp?.applicationId}>Reject</button>
          <button className="fs-btn fs-btn-primary" style={{ flex: 1 }} onClick={async () => { if (!reviewApp?.applicationId) return; await handleApproveApplication(reviewApp.applicationId); setReviewApp(null); }} disabled={applicationActionLoading.id === reviewApp?.applicationId}>Approve</button>
        </div>
      </Drawer>

      {/* All Applications drawer */}
      <Drawer open={allApplicationsOpen} onClose={() => setAllApplicationsOpen(false)}>
        <div className="fs-drawer-header">
          <div className="fs-drawer-header-row">
            <div className="fs-title-group">
              <div className="fs-title">All Applications</div>
              <div className="fs-subtitle">{allPending.length} pending applications</div>
            </div>
            <button className="fs-close" onClick={() => setAllApplicationsOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="fs-drawer-body" style={{ gap: 8 }}>
          {allPending.map((app) => (
            <div key={app.applicationId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
              <div className="fs-avatar" style={{ width: 34, height: 34, fontSize: 11, background: jurorAvatarBg(app.name || app.email), color: jurorAvatarFg(app.name || app.email) }}>{getInitials(app.name, app.email)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{app.name}</div>
                <div className="text-xs text-muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.email} · <span style={{ fontWeight: 600, color: "var(--accent)" }}>{String(app.orgCode || "").toUpperCase()}</span></div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ padding: "4px 8px", fontSize: 10, borderColor: "rgba(225,29,72,0.25)", color: "var(--danger)" }}
                  disabled={applicationActionLoading.id === app.applicationId}
                  onClick={async () => { await handleRejectApplication(app.applicationId); }}
                  title="Reject"
                >
                  ✕
                </button>
                <button
                  className="btn btn-success btn-sm"
                  style={{ padding: "4px 10px", fontSize: 10 }}
                  disabled={applicationActionLoading.id === app.applicationId}
                  onClick={async () => { await handleApproveApplication(app.applicationId); }}
                >
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="fs-drawer-footer">
          <button className="fs-btn fs-btn-secondary" onClick={() => setAllApplicationsOpen(false)}>Close</button>
        </div>
      </Drawer>

      {/* Set Current Period modal */}
      <Modal open={!!setPeriodOrg} onClose={() => setSetPeriodOrg(null)} size="sm">
        <div className="fs-modal-header">
          <div className="fs-modal-header-row">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="fs-icon accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m8 12 2.5 2.5L16 9" /></svg>
              </div>
              <div className="fs-title-group">
                <div className="fs-title">Set Current Period</div>
                <div className="fs-subtitle">Select the active evaluation period for {String(setPeriodOrg?.code || "").toUpperCase()}</div>
              </div>
            </div>
            <button className="fs-close" onClick={() => setSetPeriodOrg(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="fs-modal-body">
          {periodLoading && <div className="text-sm text-muted">Loading periods…</div>}
          {!periodLoading && periodOptions.length === 0 && <div className="text-sm text-muted">No periods available for this organization.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {periodOptions.map((period) => (
              <label key={period.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: periodSelection === period.id ? "1px solid rgba(59,130,246,0.25)" : "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer", background: periodSelection === period.id ? "rgba(59,130,246,0.04)" : "transparent" }}>
                <input type="radio" name="org-period" checked={periodSelection === period.id} onChange={() => setPeriodSelection(period.id)} style={{ accentColor: "var(--accent)" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{period.name}</div>
                  <div className="text-xs text-muted">{period.is_current ? "Active" : period.is_locked ? "Locked" : "Available"}</div>
                </div>
              </label>
            ))}
          </div>
          {periodError && <div className="text-xs" style={{ color: "var(--danger)", marginTop: 8 }}>{periodError}</div>}
        </div>
        <div className="fs-modal-footer">
          <button className="fs-btn fs-btn-secondary" onClick={() => setSetPeriodOrg(null)}>Cancel</button>
          <button className="fs-btn fs-btn-primary" onClick={handleSaveSetCurrentPeriod} disabled={periodSaving || !periodSelection}>
            <AsyncButtonContent loading={periodSaving} loadingText="Setting…">Set Period</AsyncButtonContent>
          </button>
        </div>
      </Modal>

      {/* Toggle Organization Status modal */}
      <Modal open={!!toggleOrg} onClose={() => setToggleOrg(null)} size="sm">
        <div className="fs-modal-header" style={{ textAlign: "center", borderBottom: "none", paddingBottom: 4, position: "relative" }}>
          <button className="fs-close" onClick={() => setToggleOrg(null)} style={{ position: "absolute", top: 0, right: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          <div className="eem-icon" style={{ margin: "0 auto 10px", display: "grid", placeItems: "center" }}>
            <Lock size={20} />
          </div>
          <div className="fs-title" style={{ letterSpacing: "-0.3px" }}>Organization Status</div>
          <div className="fs-subtitle" style={{ marginTop: 4 }}>
            Update lifecycle state for{" "}
            <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>{String(toggleOrg?.code || "").toUpperCase()}</strong>
          </div>
          {toggleOrg?.status && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
              <OrgStatusBadge status={toggleOrg.status} />
            </div>
          )}
        </div>
        <div className="fs-modal-body" style={{ paddingTop: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-tertiary)", marginBottom: 8 }}>Select new status</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {[
              { value: "active", label: "Active", desc: "Accepting jurors and evaluations", icon: <CheckCircle2 size={15} />, borderColor: "var(--success)", bg: "var(--success-soft)", ring: "0 0 0 3px var(--success-ring)", textColor: "var(--success)" },
              { value: "archived", label: "Archived", desc: "Preserved for historical reference only", icon: <Archive size={15} />, borderColor: "rgba(148,163,184,0.6)", bg: "var(--surface-1)", ring: "0 0 0 3px rgba(148,163,184,0.18)", textColor: "var(--text-secondary)" },
            ].map((opt) => {
              const sel = toggleStatus === opt.value;
              return (
                <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: "var(--radius)", border: `1.5px solid ${sel ? opt.borderColor : "var(--border)"}`, background: sel ? opt.bg : "transparent", cursor: "pointer", boxShadow: sel ? opt.ring : "none", transition: "border-color .15s, background .15s, box-shadow .15s", userSelect: "none" }}>
                  <input type="radio" name="toggle-org-status" checked={sel} onChange={() => setToggleStatus(opt.value)} style={{ display: "none" }} />
                  <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${sel ? opt.borderColor : "var(--border-strong)"}`, background: sel ? opt.borderColor : "transparent", flexShrink: 0, display: "grid", placeItems: "center", transition: "all .15s" }}>
                    {sel && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />}
                  </span>
                  <span style={{ color: sel ? opt.textColor : "var(--text-tertiary)", flexShrink: 0, display: "flex" }}>{opt.icon}</span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: sel ? opt.textColor : "var(--text-primary)", lineHeight: 1 }}>{opt.label}</span>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.35 }}>{opt.desc}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <div>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-tertiary)" }}>Reason</span>
              <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Optional</span>
            </label>
            <textarea className="fs-input" rows={2} placeholder="Describe the reason for this status change…" style={{ resize: "vertical", width: "100%", lineHeight: 1.55, fontSize: 13, height: "auto", padding: "9px 12px" }} value={toggleReason} onChange={(e) => setToggleReason(e.target.value)} />
          </div>
          {toggleError && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--danger)" }}>
              <TriangleAlert size={13} />
              {toggleError}
            </div>
          )}
        </div>
        <div className="fs-modal-footer" style={{ justifyContent: "center", borderTop: "none", background: "transparent", paddingTop: 0, paddingBottom: 20, gap: 8 }}>
          <button className="fs-btn fs-btn-secondary" onClick={() => setToggleOrg(null)} style={{ minWidth: 88 }}>Cancel</button>
          <button className="fs-btn fs-btn-primary" onClick={handleSaveToggleStatus} disabled={toggleSaving} style={{ minWidth: 130 }}>
            <AsyncButtonContent loading={toggleSaving} loadingText="Updating…">Update Status</AsyncButtonContent>
          </button>
        </div>
      </Modal>

      {/* ── Page Content ────────────────────────────────────────── */}
      <div className="page" id="page-organizations">
        <div className="page-title">Organizations</div>
        <div className="page-desc" style={{ marginBottom: 12 }}>
          Platform-wide organization management, admin memberships, and governance controls.
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 16 }}>
          <span className="badge badge-neutral">Super Admin</span>
          <span className="badge" style={{ background: "var(--success-soft)", color: "var(--success)", border: "1px solid rgba(22,163,74,0.18)" }}>
            Platform Scope
          </span>
        </div>

        {/* KPI strip — governance-first ordering with sub-metrics */}
        <div className="scores-kpi-strip" style={{ marginBottom: 14 }}>
          <div className="scores-kpi-item">
            <div className="scores-kpi-item-value">
              <span className={kpis.pending > 0 ? "warning" : undefined}>
                {kpis.pending || "—"}
              </span>
            </div>
            <div className="scores-kpi-item-label">Pending Review</div>
            <div className="scores-kpi-item-sub">
              {kpis.pending > 0 ? (
                kpis.oldestPendingDays > 0 ? (
                  <span className="sub-warn">oldest {kpis.oldestPendingDays}d</span>
                ) : (
                  <span className="sub-warn">new today</span>
                )
              ) : (
                <span className="sub-muted">all caught up</span>
              )}
            </div>
          </div>

          <div className="scores-kpi-item">
            <div className="scores-kpi-item-value">
              <span className={kpis.unstaffedOrgs > 0 ? "danger" : undefined}>
                {kpis.unstaffedOrgs || "—"}
              </span>
            </div>
            <div className="scores-kpi-item-label">Unstaffed Orgs</div>
            <div className="scores-kpi-item-sub">
              {kpis.unstaffedOrgs > 0 ? (
                <span className="sub-danger">need an admin</span>
              ) : (
                <span className="sub-muted">all staffed</span>
              )}
            </div>
          </div>

          <div className="scores-kpi-item">
            <div className="scores-kpi-item-value">
              <span className="success">{kpis.active || "—"}</span>
            </div>
            <div className="scores-kpi-item-label">Active Orgs</div>
            <div className="scores-kpi-item-sub">
              <span className="sub-muted">
                {kpis.total} total
                {kpis.archived > 0 ? ` · ${kpis.archived} archived` : ""}
              </span>
            </div>
          </div>

          <div className="scores-kpi-item">
            <div className="scores-kpi-item-value">{kpis.liveEvaluations || "—"}</div>
            <div className="scores-kpi-item-label">Live Evaluations</div>
            <div className="scores-kpi-item-sub">
              <span className="sub-muted">
                {kpis.liveEvaluations === 1 ? "org running" : "orgs running"}
              </span>
            </div>
          </div>

          <div className="scores-kpi-item">
            <div className="scores-kpi-item-value">{kpis.orgAdmins || "—"}</div>
            <div className="scores-kpi-item-label">Admin Seats</div>
            <div className="scores-kpi-item-sub">
              <span className="sub-muted">across {kpis.total || 0} orgs</span>
            </div>
          </div>

          <div className="scores-kpi-item">
            <div className="scores-kpi-item-value">
              {kpis.totalJurors || "—"} · {kpis.totalProjects || 0}
            </div>
            <div className="scores-kpi-item-label">Platform Reach</div>
            <div className="scores-kpi-item-sub">
              <span className="sub-muted">jurors · projects</span>
            </div>
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
            <div className="organizations-toolbar" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                className="form-input organizations-toolbar-search"
                style={{ width: 180, height: 30, fontSize: 12, flex: "1 1 180px", minWidth: 160 }}
                placeholder="Search organizations…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <FilterButton
                activeCount={orgActiveFilterCount}
                isOpen={orgFilterOpen}
                onClick={() => setOrgFilterOpen((v) => !v)}
              />
              <button
                className="btn btn-primary btn-sm organizations-toolbar-create"
                style={{ width: "auto", padding: "6px 14px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, whiteSpace: "nowrap" }}
                onClick={openCreate}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Organization
              </button>
            </div>
          </div>

          {/* Filter panel */}
          {orgFilterOpen && (
            <div className="filter-panel show">
              <div className="filter-panel-header">
                <div>
                  <h4>
                    <Filter size={14} style={{ display: "inline", marginRight: 4, opacity: 0.5, verticalAlign: "-1px" }} />
                    Filter Organizations
                  </h4>
                  <div className="filter-panel-sub">Narrow organizations by status and admin staffing.</div>
                </div>
                <button className="filter-panel-close" onClick={() => setOrgFilterOpen(false)}>&#215;</button>
              </div>
              <div className="filter-row">
                <div className="filter-group">
                  <label>Status</label>
                  <CustomSelect
                    compact
                    value={orgStatusFilter}
                    onChange={(v) => setOrgStatusFilter(v)}
                    options={[
                      { value: "all", label: "All statuses" },
                      { value: "active", label: "Active" },
                      { value: "archived", label: "Archived" },
                    ]}
                    ariaLabel="Status"
                  />
                </div>
                <div className="filter-group">
                  <label>Staffing</label>
                  <CustomSelect
                    compact
                    value={orgStaffingFilter}
                    onChange={(v) => setOrgStaffingFilter(v)}
                    options={[
                      { value: "all", label: "All orgs" },
                      { value: "staffed", label: "Has admin" },
                      { value: "unstaffed", label: "Unstaffed" },
                    ]}
                    ariaLabel="Staffing"
                  />
                </div>
                <button
                  className="btn btn-outline btn-sm filter-clear-btn"
                  onClick={() => { setOrgStatusFilter("all"); setOrgStaffingFilter("all"); }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                  {" "}Clear all
                </button>
              </div>
            </div>
          )}

          <div className="table-wrap" style={{ overflow: "visible" }}>
            <table className="organizations-table">
              <thead>
                <tr>
                  <th className={`sortable${orgSortKey === "institution" ? " sorted" : ""}`} onClick={() => handleOrgSort("institution")}>Organization <SortIcon colKey="institution" sortKey={orgSortKey} sortDir={orgSortDir} /></th>
                  <th className={`sortable${orgSortKey === "name" ? " sorted" : ""}`} onClick={() => handleOrgSort("name")}>Program <SortIcon colKey="name" sortKey={orgSortKey} sortDir={orgSortDir} /></th>
                  <th className={`sortable${orgSortKey === "code" ? " sorted" : ""}`} onClick={() => handleOrgSort("code")}>Code <SortIcon colKey="code" sortKey={orgSortKey} sortDir={orgSortDir} /></th>
                  <th className={`sortable${orgSortKey === "status" ? " sorted" : ""}`} onClick={() => handleOrgSort("status")}>Status <SortIcon colKey="status" sortKey={orgSortKey} sortDir={orgSortDir} /></th>
                  <th>Active Period</th>
                  <th className={`text-center sortable${orgSortKey === "admins" ? " sorted" : ""}`} onClick={() => handleOrgSort("admins")}>Admins <SortIcon colKey="admins" sortKey={orgSortKey} sortDir={orgSortDir} /></th>
                  <th className={`sortable${orgSortKey === "created_at" ? " sorted" : ""}`} onClick={() => handleOrgSort("created_at")}>Created <SortIcon colKey="created_at" sortKey={orgSortKey} sortDir={orgSortDir} /></th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedFilteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-sm text-muted" style={{ textAlign: "center", padding: "18px 0" }}>
                      No organizations found.
                    </td>
                  </tr>
                ) : (
                  sortedFilteredOrgs.map((org) => {
                    const meta = getOrgMeta(org);
                    const code = String(org.code || "").toUpperCase();
                    return (
                      <tr key={org.id}>
                        <td data-label="Organization" style={{ fontWeight: 600 }}>{org.institution || "—"}</td>
                        <td data-label="Program">{org.name}</td>
                        <td data-label="Code" className="mono">{code || "—"}</td>
                        <td data-label="Status"><OrgStatusBadge status={org.status} /></td>
                        <td data-label="Active Period">{meta.period || "—"}</td>
                        <td data-label="Admins" className="text-center mono org-admin-count-cell">
                          <span className="org-admin-count-label">Admins:</span>{" "}
                          {org.tenantAdmins?.filter((a) => a.status === "active").length ?? 0}
                        </td>
                        <td data-label="Created"><span className="vera-datetime-text">{formatShortDate(org.created_at)}</span></td>
                        <td data-label="Actions" className="text-right">
                          <div className="juror-action-wrap sa-org-action-wrap menu-up" style={{ display: "inline-flex" }}>
                            <button className="juror-action-btn" title="Actions" onClick={(e) => { e.stopPropagation(); setOpenOrgActionMenuId((prev) => (prev === org.id ? null : org.id)); }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                            </button>
                            <div className={`juror-action-menu${openOrgActionMenuId === org.id ? " show" : ""}`} style={{ zIndex: 300 }}>
                              <button type="button" className="juror-action-item" style={{ width: "100%", border: "none", background: "transparent", textAlign: "left" }} onClick={(event) => runOrgMenuAction(event, () => setViewOrg(org))}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                View Organization
                              </button>
                              <button type="button" className="juror-action-item" style={{ width: "100%", border: "none", background: "transparent", textAlign: "left" }} onClick={(event) => runOrgMenuAction(event, () => openEdit(org))}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                Edit Organization
                              </button>
                              <button type="button" className="juror-action-item" style={{ width: "100%", border: "none", background: "transparent", textAlign: "left" }} onClick={(event) => runOrgMenuAction(event, () => { setManageAdminsOrg(org); loadOrgs(); })}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
                                Manage Admins
                              </button>
                              <button type="button" className="juror-action-item" style={{ width: "100%", border: "none", background: "transparent", textAlign: "left" }} onClick={(event) => runOrgMenuAction(event, () => setSetPeriodOrg(org))}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="m8 12 2.5 2.5L16 9" /></svg>
                                Set Current Period
                              </button>
                              <div className="juror-action-sep" />
                              <button type="button" className="juror-action-item danger" style={{ width: "100%", border: "none", background: "transparent", textAlign: "left" }} onClick={(event) => runOrgMenuAction(event, () => { setToggleOrg(org); setToggleStatus(org.status || "active"); setToggleReason(""); setToggleError(""); })}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                Enable / Disable Organization
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {allPending.length === 0 ? (
                <div className="text-sm text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                  No pending applications.
                </div>
              ) : (
                allPending.slice(0, 2).map((app) => {
                  const initials = getInitials(app.name, app.email);
                  const bgColor = jurorAvatarBg(app.name || app.email || "?");
                  const fgColor = "#f0f4ff";
                  const isLoading = applicationActionLoading.id === app.applicationId;
                  return (
                    <div
                      key={app.applicationId}
                      className="org-pending-item"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 14px",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        transition: "border-color 0.15s, box-shadow 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--accent)";
                        e.currentTarget.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--accent) 12%, transparent)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {/* Avatar */}
                      <div className="org-pending-item-avatar" style={{
                        flexShrink: 0,
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: bgColor,
                        color: fgColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 13,
                        letterSpacing: "0.02em",
                      }}>
                        {initials}
                      </div>

                      {/* Info */}
                      <div className="org-pending-item-body" style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{app.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span className="text-xs text-muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                            {app.email}
                          </span>
                          {app.orgCode && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 600,
                              letterSpacing: "0.04em",
                              padding: "1px 7px",
                              borderRadius: 99,
                              background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                              color: "var(--accent)",
                              border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                              whiteSpace: "nowrap",
                            }}>
                              {String(app.orgCode).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                          <Clock size={10} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {formatRelativeTime(app.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="org-pending-item-actions" style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                        <button
                          className="btn btn-sm btn-success"
                          style={{ padding: "5px 14px", fontSize: 11 }}
                          onClick={() => handleApproveApplication(app.applicationId)}
                          disabled={isLoading}
                        >
                          {isLoading && applicationActionLoading.action === "approve" ? "…" : "Approve"}
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{
                            padding: "5px 12px",
                            fontSize: 11,
                            fontWeight: 500,
                            background: "transparent",
                            color: "var(--text-tertiary)",
                            border: "1px solid var(--border)",
                            opacity: isLoading ? 0.6 : 1,
                          }}
                          onClick={() => handleRejectApplication(app.applicationId)}
                          disabled={isLoading}
                        >
                          {isLoading && applicationActionLoading.action === "reject" ? "…" : "Reject"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              {allPending.length > 0 && (
                <div style={{ textAlign: "center", padding: "4px 0 2px" }}>
                  <button
                    className="text-xs"
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--accent)", fontWeight: 500 }}
                    onClick={() => setAllApplicationsOpen(true)}
                  >
                    View all {allPending.length} applications →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Platform Governance */}
          <div className="card" style={{ padding: 14 }}>
            <div className="card-header" style={{ marginBottom: 10 }}>
              <div>
                <div className="card-title">Platform Governance</div>
                <div className="text-sm text-muted" style={{ marginTop: 3 }}>System-wide controls and operational tools.</div>
              </div>
              <span className="badge badge-neutral" style={{ fontSize: 9 }}>Super Admin Only</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                {
                  label: "Global Settings",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M19.07 19.07A10 10 0 0 0 4.93 4.93" /></svg>,
                  onClick: () => setGlobalSettingsOpen(true),
                },
                {
                  label: "Export & Backup",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
                  onClick: () => setExportBackupOpen(true),
                },
                {
                  label: "Maintenance",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>,
                  onClick: () => setMaintenanceOpen(true),
                },
                {
                  label: "System Health",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
                  onClick: () => setSystemHealthOpen(true),
                },
              ].map(({ label, icon, onClick }) => (
                <button
                  key={label}
                  className="btn btn-outline btn-sm"
                  style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-start", padding: "8px 10px", fontSize: 12 }}
                  onClick={onClick}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
