// src/admin/settings/ManageOrganizationsPanel.jsx
// ============================================================
// Organization/tenant identity management panel.
// Super-admin only — conditionally rendered from SettingsPage.
// ============================================================

import { useEffect, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  Clock3Icon,
  CirclePlusIcon,
  CodeIcon,
  HistoryIcon,
  LandmarkIcon,
  MailIcon,
  PencilIcon,
  SearchIcon,
  TrashIcon,
  UserStarIcon,
  UniversityIcon,
} from "../../shared/Icons";
import AlertCard from "../../shared/AlertCard";
import Tooltip from "../../shared/Tooltip";
import ConfirmDialog from "../../shared/ConfirmDialog";
import LastActivity from "../LastActivity";

// ── Status badge colors ───────────────────────────────────────

const STATUS_STYLES = {
  active:   "manage-pill--active",
  disabled: "manage-pill--disabled",
  archived: "manage-pill--archived",
};

const STATUS_LABELS = {
  active:   "Active",
  disabled: "Disabled",
  archived: "Archived",
};

function formatTimestamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (v) => String(v).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Main component ────────────────────────────────────────────

export default function ManageOrganizationsPanel({
  isMobile,
  isOpen,
  onToggle,
  // From useManageOrganizations
  orgList,
  filteredOrgs,
  error,
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
  openEdit,
  closeEdit,
  handleUpdateOrg,
  handleApproveApplication,
  handleRejectApplication,
  applicationActionLoading,
  handleCreateTenantAdminApplication,
  handleUpdateTenantAdmin,
  handleDeleteTenantAdmin,
  isDirty,
  isDemoMode = false,
}) {
  const [showAll, setShowAll] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [adminsDialogOrg, setAdminsDialogOrg] = useState(null);
  const [adminEditOpen, setAdminEditOpen] = useState(false);
  const [adminEditError, setAdminEditError] = useState("");
  const [adminEditSaving, setAdminEditSaving] = useState(false);
  const [adminEditForm, setAdminEditForm] = useState({ tenantId: "", userId: "", name: "", email: "" });
  const [adminCreateOpen, setAdminCreateOpen] = useState(false);
  const [adminCreateSaving, setAdminCreateSaving] = useState(false);
  const [adminCreateError, setAdminCreateError] = useState("");
  const [adminCreateForm, setAdminCreateForm] = useState({
    tenantId: "",
    name: "",
    email: "",
    password: "",
  });
  const [adminDeleteTarget, setAdminDeleteTarget] = useState(null);
  const adminCreateErrorLower = adminCreateError.trim().toLowerCase();
  const adminCreateNameError = adminCreateErrorLower.includes("name");
  const adminCreateEmailError = adminCreateErrorLower.includes("email");
  const adminCreatePasswordError = adminCreateErrorLower.includes("password");
  const adminEditErrorLower = adminEditError.trim().toLowerCase();
  const adminEditNameError = adminEditErrorLower.includes("name");
  const adminEditEmailError = adminEditErrorLower.includes("email");

  const handleToggle = () => {
    if (isOpen && isDirty) {
      setLeaveDialogOpen(true);
      return;
    }
    onToggle();
  };

  const handleLeaveConfirm = () => {
    setLeaveDialogOpen(false);
    closeCreate();
    closeEdit();
    setAdminsDialogOrg(null);
    setAdminCreateOpen(false);
    setAdminEditOpen(false);
    setAdminDeleteTarget(null);
    onToggle();
  };

  useEffect(() => {
    if (!adminsDialogOrg?.id) return;
    const fresh = orgList.find((org) => org.id === adminsDialogOrg.id);
    if (!fresh) {
      setAdminsDialogOrg(null);
      setAdminCreateOpen(false);
      return;
    }
    setAdminsDialogOrg(fresh);
  }, [orgList, adminsDialogOrg?.id]);

  const openAdminCreate = (org) => {
    setAdminCreateError("");
    setAdminCreateForm({
      tenantId: org?.id || "",
      name: "",
      email: "",
      password: "",
    });
    setAdminCreateOpen(true);
  };

  const saveAdminCreate = async () => {
    const tenantId = adminCreateForm.tenantId;
    const name = adminCreateForm.name.trim();
    const email = adminCreateForm.email.trim().toLowerCase();
    const password = adminCreateForm.password;

    if (!tenantId) {
      setAdminCreateError("Organization is missing.");
      return;
    }
    if (!name) {
      setAdminCreateError("Name is required.");
      return;
    }
    if (!email || !email.includes("@")) {
      setAdminCreateError("A valid email is required.");
      return;
    }
    if (!password || password.length < 10) {
      setAdminCreateError("Password must be at least 10 characters.");
      return;
    }

    setAdminCreateSaving(true);
    setAdminCreateError("");
    const result = await handleCreateTenantAdminApplication?.({
      tenantId,
      name,
      email,
      password,
      university: adminsDialogOrg?.university || "",
      department: adminsDialogOrg?.department || "",
    });
    setAdminCreateSaving(false);
    if (result?.ok) {
      setAdminCreateOpen(false);
      return;
    }
    setAdminCreateError(result?.error || "Could not create admin application.");
  };

  const openAdminEdit = (tenantId, admin) => {
    setAdminEditError("");
    setAdminEditForm({
      tenantId,
      userId: admin?.userId || "",
      name: admin?.name || "",
      email: admin?.email || "",
    });
    setAdminEditOpen(true);
  };

  const saveAdminEdit = async () => {
    const name = adminEditForm.name.trim();
    const email = adminEditForm.email.trim().toLowerCase();
    if (!adminEditForm.tenantId || !adminEditForm.userId) {
      setAdminEditError("Admin identity is missing.");
      return;
    }
    if (!name) {
      setAdminEditError("Name is required.");
      return;
    }
    if (!email || !email.includes("@")) {
      setAdminEditError("A valid email is required.");
      return;
    }
    setAdminEditSaving(true);
    setAdminEditError("");
    const ok = await handleUpdateTenantAdmin?.({
      tenantId: adminEditForm.tenantId,
      userId: adminEditForm.userId,
      name,
      email,
    });
    setAdminEditSaving(false);
    if (ok) {
      setAdminEditOpen(false);
      return;
    }
    setAdminEditError("Could not update admin.");
  };

  const confirmAdminDelete = async () => {
    if (!adminDeleteTarget?.tenantId || !adminDeleteTarget?.userId) return;
    await handleDeleteTenantAdmin?.({
      tenantId: adminDeleteTarget.tenantId,
      userId: adminDeleteTarget.userId,
    });
    setAdminDeleteTarget(null);
  };

  // ── Create form validation ──────────────────────────────────
  const createCanSubmit =
    createForm.code.trim() !== "" &&
    createForm.shortLabel.trim() !== "" &&
    createForm.university.trim() !== "" &&
    createForm.department.trim() !== "";

  // ── Edit form validation ────────────────────────────────────
  const editCanSubmit =
    editForm.shortLabel.trim() !== "" &&
    editForm.university.trim() !== "" &&
    editForm.department.trim() !== "";

  // ── Visible items (paginated — show 3 by default) ───────────
  const normalizedSearch = search.trim().toLowerCase();
  const visibleOrgs = normalizedSearch
    ? filteredOrgs
    : showAll
      ? orgList
      : orgList.slice(0, 3);

  return (
    <div className={`manage-card${isMobile ? " is-collapsible" : ""}`}>
      <button
        type="button"
        className="manage-card-header"
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <div className="manage-card-title">
          <span className="manage-card-icon" aria-hidden="true">
            <UniversityIcon />
          </span>
          <span className="section-label">Organization Management</span>
        </div>
        <ChevronDownIcon className={`settings-chevron${isOpen ? " open" : ""}`} />
      </button>

      {isOpen && (
        <div className="manage-card-body">
          <div className="manage-card-desc">
            Manage organizations and lifecycle.
          </div>

          {error && <AlertCard variant="error">{error}</AlertCard>}

          {/* ── Organization list ── */}
          <div className="manage-list">
            <div className="manage-list-header">All Organizations</div>
            <div className="manage-list-controls">
              <div className="manage-search">
                <span className="manage-search-icon" aria-hidden="true"><SearchIcon /></span>
                <input
                  className="manage-input manage-search-input"
                  type="text"
                  placeholder="Search organizations"
                  aria-label="Search organizations"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className="manage-btn primary" type="button" onClick={openCreate} disabled={isDemoMode}>
                <span aria-hidden="true"><CirclePlusIcon className="manage-btn-icon" /></span>
                Organization
              </button>
            </div>

            {visibleOrgs.map((org) => (
              <div key={org.id} className="manage-item manage-item--org">
                <div>
                  <div className="manage-item-title-row">
                    <div className="manage-item-title">{org.shortLabel}</div>
                    <span className={`manage-pill ${STATUS_STYLES[org.status] || ""}`}>
                      {STATUS_LABELS[org.status] || org.status}
                    </span>
                  </div>
                  <div className="manage-item-sub manage-meta-line">
                    <span className="manage-meta-icon" aria-hidden="true"><CodeIcon /></span>
                    <span>{org.code}</span>
                  </div>
                  <div className="manage-item-sub manage-meta-line">
                    <span className="manage-meta-icon" aria-hidden="true"><UniversityIcon /></span>
                    <span>{org.university || "—"}</span>
                  </div>
                  <div className="manage-item-sub manage-meta-line">
                    <span className="manage-meta-icon" aria-hidden="true"><LandmarkIcon /></span>
                    <span>{org.department || "—"}</span>
                  </div>
                  <div className="manage-item-sub manage-meta-line manage-meta-line--org-admin-summary">
                    <span className="manage-meta-icon" aria-hidden="true"><UserStarIcon /></span>
                    <span className="manage-org-admin-summary">
                      <span>{org.tenantAdmins?.length || 0} approved</span>
                      <span aria-hidden="true"> · </span>
                      <span
                        className={(org.pendingApplications?.length || 0) > 0 ? "manage-org-admin-summary-pending" : ""}
                      >
                        {(org.pendingApplications?.length || 0)} pending
                      </span>
                    </span>
                  </div>
                  <div className="manage-item-sub manage-meta-line">
                    <LastActivity value={org.updated_at || null} />
                  </div>
                </div>
                <div className="manage-item-actions">
                  <Tooltip text="Edit organization">
                    <button
                      className="manage-icon-btn"
                      type="button"
                      aria-label={`Edit ${org.shortLabel}`}
                      onClick={() => openEdit(org)}
                      disabled={isDemoMode}
                    >
                      <PencilIcon />
                    </button>
                  </Tooltip>
                  <Tooltip text="Review admins">
                    <button
                      className="manage-icon-btn"
                      type="button"
                      aria-label={`Review admins for ${org.shortLabel}`}
                      onClick={() => setAdminsDialogOrg(org)}
                      disabled={isDemoMode}
                    >
                      <UserStarIcon />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))}

            {normalizedSearch && filteredOrgs.length === 0 && (
              <div className="manage-empty manage-empty-search">No organizations match your search.</div>
            )}

            {!normalizedSearch && orgList.length === 0 && (
              <div className="manage-empty">
                No organizations found.{" "}
                <button className="manage-btn manage-btn--inline-link" type="button" onClick={openCreate}>
                  Create one
                </button>
              </div>
            )}
          </div>

          {!normalizedSearch && orgList.length > 3 && (
            <button
              className="manage-btn ghost"
              type="button"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Show fewer organizations" : `Show all organizations (${orgList.length})`}
            </button>
          )}

          {/* ── Create Organization modal ── */}
          {showCreate && (
            <div className="manage-modal" role="dialog" aria-modal="true">
              <div className="manage-modal-card">
                <div className="edit-dialog__header">
                  <span className="edit-dialog__icon" aria-hidden="true"><CirclePlusIcon /></span>
                  <div className="edit-dialog__title">Create Organization</div>
                </div>

                <div className="manage-modal-body">
                  <label className="manage-label">Code</label>
                  <input
                    className={`manage-input${createError && createError.toLowerCase().includes("code") ? " is-danger" : ""}`}
                    value={createForm.code}
                    onChange={(e) => {
                      setCreateForm((f) => ({ ...f, code: e.target.value.toLowerCase().replace(/\s/g, "-") }));
                    }}
                    placeholder="tedu-ee"
                  />
                  <p className="manage-hint">Immutable identifier. Lowercase slug format (e.g. tedu-ee).</p>

                  <label className="manage-label">Short Label</label>
                  <input
                    className="manage-input"
                    value={createForm.shortLabel}
                    onChange={(e) => setCreateForm((f) => ({ ...f, shortLabel: e.target.value }))}
                    placeholder="TEDU EE"
                  />

                  <label className="manage-label">University</label>
                  <input
                    className="manage-input"
                    value={createForm.university}
                    onChange={(e) => setCreateForm((f) => ({ ...f, university: e.target.value }))}
                    placeholder="TED University"
                  />

                  <label className="manage-label">Department</label>
                  <input
                    className="manage-input"
                    value={createForm.department}
                    onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))}
                    placeholder="Electrical & Electronics Engineering"
                  />

                  {createError && <div className="manage-field-error">{createError}</div>}
                </div>

                <div className="manage-modal-actions">
                  <button className="manage-btn" type="button" onClick={closeCreate}>Cancel</button>
                  <button
                    className="manage-btn primary"
                    type="button"
                    disabled={!createCanSubmit || isDemoMode}
                    onClick={handleCreateOrg}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Edit Organization modal ── */}
          {showEdit && (
            <div className="manage-modal" role="dialog" aria-modal="true">
              <div className="manage-modal-card">
                <div className="edit-dialog__header">
                  <span className="edit-dialog__icon" aria-hidden="true"><PencilIcon /></span>
                  <div className="edit-dialog__title">Edit Organization</div>
                </div>

                <div className="manage-modal-body">
                  {/* Code — disabled input (immutable) */}
                  <label className="manage-label">Code</label>
                  <input
                    className="manage-input"
                    value={editForm.code}
                    disabled
                  />

                  {/* Editable fields */}
                  <label className="manage-label">Short Label</label>
                  <input
                    className="manage-input"
                    value={editForm.shortLabel}
                    onChange={(e) => setEditForm((f) => ({ ...f, shortLabel: e.target.value }))}
                  />

                  <label className="manage-label">University</label>
                  <input
                    className="manage-input"
                    value={editForm.university}
                    onChange={(e) => setEditForm((f) => ({ ...f, university: e.target.value }))}
                  />

                  <label className="manage-label">Department</label>
                  <input
                    className="manage-input"
                    value={editForm.department}
                    onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                  />

                  <label className="manage-label">Status</label>
                  <select
                    className="manage-select"
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                    <option value="archived">Archived</option>
                  </select>

                  {editError && <div className="manage-field-error">{editError}</div>}
                </div>

                <div className="manage-modal-actions">
                  <button className="manage-btn" type="button" onClick={closeEdit}>Cancel</button>
                  <button
                    className="manage-btn primary"
                    type="button"
                    disabled={!editCanSubmit || isDemoMode}
                    onClick={handleUpdateOrg}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Organization admins modal ── */}
          {adminsDialogOrg && (
            <div
              className="manage-modal"
              role="dialog"
              aria-modal="true"
              aria-label={`Admins for ${adminsDialogOrg.shortLabel}`}
            >
              <div className="manage-modal-card">
                <div className="edit-dialog__header">
                  <span className="edit-dialog__icon" aria-hidden="true"><UserStarIcon /></span>
                  <div className="edit-dialog__title">
                    {adminsDialogOrg.shortLabel} · Admins
                  </div>
                </div>

                <div className="manage-modal-body manage-org-admin-modal-body">
                  <div className="manage-org-admin-section-title">Approved</div>
                  <div className="manage-org-admins">
                    {adminsDialogOrg.tenantAdmins?.length ? (
                      adminsDialogOrg.tenantAdmins.map((admin, idx) => (
                        <div key={`${adminsDialogOrg.id}-approved-${idx}`} className="manage-org-admin-row manage-org-admin-row--approved">
                          <div className="manage-org-admin-line manage-org-admin-line--name">
                            <span className="manage-org-admin-line-icon" aria-hidden="true"><UserStarIcon /></span>
                            <span className="manage-org-admin-name swipe-x">{admin.name || "—"}</span>
                          </div>
                          <a className="manage-org-admin-line manage-org-admin-mail-link" href={`mailto:${admin.email}`}>
                            <span className="manage-org-admin-line-icon" aria-hidden="true"><MailIcon /></span>
                            <span className="manage-org-admin-email-text swipe-x">{admin.email}</span>
                          </a>
                          <div className="manage-org-admin-line manage-org-admin-line--time">
                            <span className="manage-org-admin-line-icon" aria-hidden="true"><HistoryIcon /></span>
                            <span>{formatTimestamp(admin.updatedAt || admin.updated_at || adminsDialogOrg.updated_at || null)}</span>
                          </div>
                          <div className="manage-org-admin-side">
                            <div className="manage-org-admin-status">
                              <span className="manage-org-admin-chip manage-org-admin-chip--approved">
                                <span aria-hidden="true"><CheckIcon /></span>
                                Approved
                              </span>
                            </div>
                            <div className="manage-org-admin-inline-actions">
                              <Tooltip text="Edit admin">
                                <button
                                  type="button"
                                  className="manage-icon-btn"
                                  aria-label={`Edit admin ${admin.name || admin.email}`}
                                  onClick={() => openAdminEdit(adminsDialogOrg.id, admin)}
                                  disabled={!admin.userId || isDemoMode}
                                >
                                  <PencilIcon />
                                </button>
                              </Tooltip>
                              <Tooltip text="Delete admin">
                                <button
                                  type="button"
                                  className="manage-icon-btn danger"
                                  aria-label={`Delete admin ${admin.name || admin.email}`}
                                  onClick={() => setAdminDeleteTarget({
                                    tenantId: adminsDialogOrg.id,
                                    userId: admin.userId,
                                    name: admin.name,
                                    email: admin.email,
                                  })}
                                  disabled={!admin.userId || isDemoMode}
                                >
                                  <TrashIcon />
                                </button>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="manage-org-admin-empty">No approved admin yet.</div>
                    )}
                  </div>

                  <div className="manage-org-admin-section-title">Pending Applications</div>
                  <div className="manage-org-admins">
                    {adminsDialogOrg.pendingApplications?.length ? (
                      adminsDialogOrg.pendingApplications.map((entry) => {
                        const isApproveLoading =
                          applicationActionLoading?.id === entry.applicationId
                          && applicationActionLoading?.action === "approve";
                        const isRejectLoading =
                          applicationActionLoading?.id === entry.applicationId
                          && applicationActionLoading?.action === "reject";
                        const isRowLoading = isApproveLoading || isRejectLoading;

                        return (
                          <div key={entry.applicationId} className="manage-org-admin-row manage-org-admin-row--pending">
                          <div className="manage-org-admin-line manage-org-admin-line--name">
                            <span className="manage-org-admin-line-icon" aria-hidden="true"><UserStarIcon /></span>
                            <span className="manage-org-admin-name swipe-x">{entry.name || "—"}</span>
                          </div>
                          <a className="manage-org-admin-line manage-org-admin-mail-link" href={`mailto:${entry.email}`}>
                            <span className="manage-org-admin-line-icon" aria-hidden="true"><MailIcon /></span>
                            <span className="manage-org-admin-email-text swipe-x">{entry.email}</span>
                          </a>
                          <div className="manage-org-admin-line manage-org-admin-line--time">
                            <span className="manage-org-admin-line-icon" aria-hidden="true"><HistoryIcon /></span>
                            <span>{formatTimestamp(entry.updatedAt || entry.updated_at || entry.createdAt || null)}</span>
                          </div>
                          <div className="manage-org-admin-status">
                            <span className="manage-org-admin-chip manage-org-admin-chip--pending">
                              <span aria-hidden="true"><Clock3Icon /></span>
                              Pending approval
                            </span>
                          </div>
                          <div className="manage-org-admin-actions">
                            <button
                              type="button"
                              className={`manage-btn primary${isApproveLoading ? " is-spinning" : ""}`}
                              onClick={() => handleApproveApplication(entry.applicationId)}
                              disabled={isRowLoading || isDemoMode}
                            >
                              {isApproveLoading && <span className="spinner" aria-hidden="true" />}
                              Approve
                            </button>
                            <button
                              type="button"
                              className={`manage-btn${isRejectLoading ? " is-spinning" : ""}`}
                              onClick={() => handleRejectApplication(entry.applicationId)}
                              disabled={isRowLoading || isDemoMode}
                            >
                              {isRejectLoading && <span className="spinner" aria-hidden="true" />}
                              Reject
                            </button>
                          </div>
                        </div>
                        );
                      })
                    ) : (
                      <div className="manage-org-admin-empty">No pending applications.</div>
                    )}
                  </div>
                </div>

                <div className="manage-modal-actions manage-modal-actions--org-admin">
                  <button
                    type="button"
                    className="manage-btn primary manage-org-admin-add-btn"
                    onClick={() => openAdminCreate(adminsDialogOrg)}
                    disabled={isDemoMode}
                  >
                    <span aria-hidden="true"><CirclePlusIcon className="manage-btn-icon" /></span>
                    Add admin
                  </button>
                  <button
                    className="manage-btn"
                    type="button"
                    onClick={() => {
                      setAdminCreateOpen(false);
                      setAdminsDialogOrg(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {adminCreateOpen && (
            <div className="manage-modal" role="dialog" aria-modal="true" aria-label="Add admin">
              <div className="manage-modal-card">
                <div className="edit-dialog__header">
                  <span className="edit-dialog__icon" aria-hidden="true"><CirclePlusIcon /></span>
                  <div className="edit-dialog__title">Add Admin</div>
                </div>
                <div className="manage-modal-body">
                  <label className="manage-label">Name</label>
                  <input
                    className={`manage-input${adminCreateNameError ? " is-danger" : ""}`}
                    value={adminCreateForm.name}
                    onChange={(e) => setAdminCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Admin name"
                  />
                  <label className="manage-label">Email</label>
                  <input
                    className={`manage-input${adminCreateEmailError ? " is-danger" : ""}`}
                    type="email"
                    value={adminCreateForm.email}
                    onChange={(e) => setAdminCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@example.edu"
                  />
                  <label className="manage-label">Temporary Password</label>
                  <input
                    className={`manage-input${adminCreatePasswordError ? " is-danger" : ""}`}
                    type="password"
                    value={adminCreateForm.password}
                    onChange={(e) => setAdminCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Minimum 10 characters"
                  />
                  {adminCreateError && <div className="manage-field-error">{adminCreateError}</div>}
                </div>
                <div className="manage-modal-actions">
                  <button className="manage-btn" type="button" onClick={() => setAdminCreateOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="manage-btn primary"
                    type="button"
                    onClick={saveAdminCreate}
                    disabled={adminCreateSaving || isDemoMode}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {adminEditOpen && (
            <div className="manage-modal" role="dialog" aria-modal="true" aria-label="Edit admin">
              <div className="manage-modal-card">
                <div className="edit-dialog__header">
                  <span className="edit-dialog__icon" aria-hidden="true"><PencilIcon /></span>
                  <div className="edit-dialog__title">Edit Admin</div>
                </div>
                <div className="manage-modal-body">
                  <label className="manage-label">Name</label>
                  <input
                    className={`manage-input${adminEditNameError ? " is-danger" : ""}`}
                    value={adminEditForm.name}
                    onChange={(e) => setAdminEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Admin name"
                  />
                  <label className="manage-label">Email</label>
                  <input
                    className={`manage-input${adminEditEmailError ? " is-danger" : ""}`}
                    type="email"
                    value={adminEditForm.email}
                    onChange={(e) => setAdminEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@example.com"
                  />
                  {adminEditError && <div className="manage-field-error">{adminEditError}</div>}
                </div>
                <div className="manage-modal-actions">
                  <button className="manage-btn" type="button" onClick={() => setAdminEditOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="manage-btn primary"
                    type="button"
                    onClick={saveAdminEdit}
                    disabled={adminEditSaving || isDemoMode}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          <ConfirmDialog
            open={!!adminDeleteTarget}
            onOpenChange={(open) => { if (!open) setAdminDeleteTarget(null); }}
            title="Delete Confirmation"
            body={
              adminDeleteTarget
                ? `This will permanently remove ${adminDeleteTarget.name || adminDeleteTarget.email} (${adminDeleteTarget.email}).`
                : ""
            }
            warning="This action is permanent and cannot be undone."
            typedConfirmation={adminDeleteTarget?.name || adminDeleteTarget?.email || undefined}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            tone="danger"
            icon="alert"
            onConfirm={confirmAdminDelete}
          />

          {/* Unsaved-changes leave dialog */}
          <ConfirmDialog
            open={leaveDialogOpen}
            onOpenChange={setLeaveDialogOpen}
            title="Unsaved changes"
            body="You have unsaved organization changes. Leave anyway?"
            confirmLabel="Leave anyway"
            cancelLabel="Keep editing"
            tone="caution"
            onConfirm={handleLeaveConfirm}
          />
        </div>
      )}
    </div>
  );
}
