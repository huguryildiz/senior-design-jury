// src/admin/settings/ManageOrganizationsPanel.jsx
// ============================================================
// Organization/tenant identity management panel.
// Super-admin only — rendered from OrgSettingsPage.
// ============================================================

import { useEffect, useState } from "react";
import {
  CheckIcon,
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
} from "@/shared/ui/Icons";
import AlertCard from "@/shared/ui/AlertCard";
import Tooltip from "@/shared/ui/Tooltip";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import CustomSelect from "@/shared/ui/CustomSelect";
import LastActivity from "../components/LastActivity";

// ── Status badge ─────────────────────────────────────────────

function statusBadgeClass(status) {
  const key = status || "disabled";
  return `vera-status-badge vera-status-badge--${key}`;
}

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

function copyEmailToClipboard(email) {
  if (!email) return;
  const write = navigator.clipboard?.writeText
    ? () => navigator.clipboard.writeText(email)
    : () => {
        const ta = document.createElement("textarea");
        ta.value = email;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      };
  write();
  showCopyToast(email);
}

function showCopyToast(email) {
  const existing = document.querySelector(".copy-toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "copy-toast";
  toast.textContent = `Copied: ${email}`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("copy-toast--visible"));
  setTimeout(() => {
    toast.classList.remove("copy-toast--visible");
    setTimeout(() => toast.remove(), 250);
  }, 2000);
}

// ── Shared sub-components ────────────────────────────────────

function ModalOverlay({ children, ...props }) {
  return (
    <div className="mop-modal-overlay" {...props}>
      {children}
    </div>
  );
}

function ModalCard({ children, className }) {
  return (
    <div className={["mop-modal-card", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

function ModalHeader({ icon: Icon, title }) {
  return (
    <div className="mop-modal-header">
      {Icon && <span className="mop-modal-header-icon" aria-hidden="true"><Icon /></span>}
      <h3 className="mop-modal-title">{title}</h3>
    </div>
  );
}

function ModalBody({ children, className }) {
  return <div className={["mop-modal-body", className].filter(Boolean).join(" ")}>{children}</div>;
}

function ModalActions({ children, className }) {
  return <div className={["mop-modal-actions", className].filter(Boolean).join(" ")}>{children}</div>;
}

function FieldLabel({ children }) {
  return <label className="mop-field-label">{children}</label>;
}

function FieldInput({ className, danger, ...props }) {
  return (
    <input
      className={["vera-field-input", danger && "vera-field-input--error", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

function FieldError({ children }) {
  if (!children) return null;
  return <p className="mop-field-error">{children}</p>;
}

function BtnPrimary({ children, className, ...props }) {
  return (
    <button
      type="button"
      className={["mop-btn-primary", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

function BtnOutline({ children, className, ...props }) {
  return (
    <button
      type="button"
      className={["mop-btn-outline", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

function BtnGhost({ children, className, ...props }) {
  return (
    <button
      type="button"
      className={["mop-btn-ghost", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

function IconBtn({ children, className, danger, ...props }) {
  return (
    <button
      type="button"
      className={[
        "mop-icon-btn",
        "mop-icon-btn--label",
        danger && "mop-icon-btn--danger",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────

export default function ManageOrganizationsPanel({
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
  const [adminsDialogOrg, setAdminsDialogOrg] = useState(null);
  const [adminEditOpen, setAdminEditOpen] = useState(false);
  const [adminEditError, setAdminEditError] = useState("");
  const [adminEditSaving, setAdminEditSaving] = useState(false);
  const [adminEditForm, setAdminEditForm] = useState({ organizationId: "", userId: "", name: "", email: "" });
  const [adminCreateOpen, setAdminCreateOpen] = useState(false);
  const [adminCreateSaving, setAdminCreateSaving] = useState(false);
  const [adminCreateError, setAdminCreateError] = useState("");
  const [adminCreateForm, setAdminCreateForm] = useState({
    organizationId: "",
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
      organizationId: org?.id || "",
      name: "",
      email: "",
      password: "",
    });
    setAdminCreateOpen(true);
  };

  const saveAdminCreate = async () => {
    const organizationId = adminCreateForm.organizationId;
    const name = adminCreateForm.name.trim();
    const email = adminCreateForm.email.trim().toLowerCase();
    const password = adminCreateForm.password;

    if (!organizationId) { setAdminCreateError("Organization is missing."); return; }
    if (!name) { setAdminCreateError("Name is required."); return; }
    if (!email || !email.includes("@")) { setAdminCreateError("A valid email is required."); return; }
    if (!password || password.length < 10) { setAdminCreateError("Password must be at least 10 characters."); return; }

    setAdminCreateSaving(true);
    setAdminCreateError("");
    const result = await handleCreateTenantAdminApplication?.({
      organizationId,
      name,
      email,
      password,
      university: adminsDialogOrg?.university || "",
      department: adminsDialogOrg?.department || "",
    });
    setAdminCreateSaving(false);
    if (result?.ok) { setAdminCreateOpen(false); return; }
    setAdminCreateError(result?.error || "Could not create admin application.");
  };

  const openAdminEdit = (organizationId, admin) => {
    setAdminEditError("");
    setAdminEditForm({
      organizationId,
      userId: admin?.userId || "",
      name: admin?.name || "",
      email: admin?.email || "",
    });
    setAdminEditOpen(true);
  };

  const saveAdminEdit = async () => {
    const name = adminEditForm.name.trim();
    const email = adminEditForm.email.trim().toLowerCase();
    if (!adminEditForm.organizationId || !adminEditForm.userId) { setAdminEditError("Admin identity is missing."); return; }
    if (!name) { setAdminEditError("Name is required."); return; }
    if (!email || !email.includes("@")) { setAdminEditError("A valid email is required."); return; }
    setAdminEditSaving(true);
    setAdminEditError("");
    const ok = await handleUpdateTenantAdmin?.({
      organizationId: adminEditForm.organizationId,
      userId: adminEditForm.userId,
      name,
      email,
    });
    setAdminEditSaving(false);
    if (ok) { setAdminEditOpen(false); return; }
    setAdminEditError("Could not update admin.");
  };

  const confirmAdminDelete = async () => {
    if (isDemoMode) throw new Error("Demo mode: delete is disabled.");
    if (!adminDeleteTarget?.organizationId || !adminDeleteTarget?.userId) return;
    await handleDeleteTenantAdmin?.({
      organizationId: adminDeleteTarget.organizationId,
      userId: adminDeleteTarget.userId,
    });
    setAdminDeleteTarget(null);
  };

  const createCanSubmit =
    createForm.code.trim() !== "" &&
    createForm.shortLabel.trim() !== "" &&
    createForm.university.trim() !== "" &&
    createForm.department.trim() !== "";

  const editCanSubmit =
    editForm.shortLabel.trim() !== "" &&
    editForm.university.trim() !== "" &&
    editForm.department.trim() !== "";

  const normalizedSearch = search.trim().toLowerCase();
  const visibleOrgs = normalizedSearch
    ? filteredOrgs
    : showAll
      ? orgList
      : orgList.slice(0, 3);

  return (
    <div className="mop-container">
      {error && <AlertCard variant="error">{error}</AlertCard>}

      {/* ── Organization list ── */}
      <div className="mop-org-list-card">
        <div className="mop-list-header">
          <h3 className="mop-list-title">All Organizations</h3>
          <div className="mop-list-actions">
            <div className="mop-search-input-wrap">
              <span className="mop-search-icon" aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                className="mop-search-input"
                type="text"
                placeholder="Search organizations"
                aria-label="Search organizations"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <BtnPrimary onClick={openCreate}>
              <CirclePlusIcon />
              <span>Organization</span>
            </BtnPrimary>
          </div>
        </div>

        <div className="mop-org-divide">
          {visibleOrgs.map((org) => (
            <div key={org.id} className="mop-org-row">
              <div className="mop-org-info">
                <div className="mop-org-name-row">
                  <span className="mop-org-name">{org.shortLabel}</span>
                  <span className={statusBadgeClass(org.status)}>
                    {STATUS_LABELS[org.status] || org.status}
                  </span>
                </div>
                <div className="mop-org-meta-row">
                  <CodeIcon />
                  <span style={{ fontFamily: "monospace" }}>{org.code}</span>
                </div>
                <div className="mop-org-meta-row">
                  <UniversityIcon />
                  <span>{org.university || "—"}</span>
                </div>
                <div className="mop-org-meta-row">
                  <LandmarkIcon />
                  <span>{org.department || "—"}</span>
                </div>
                <div className="mop-org-meta-row">
                  <UserStarIcon />
                  <span>
                    {org.tenantAdmins?.length || 0} approved
                    {" · "}
                    <span className={(org.pendingApplications?.length || 0) > 0 ? "mop-pending-count" : ""}>
                      {org.pendingApplications?.length || 0} pending
                    </span>
                    {" "}admin(s)
                  </span>
                </div>
                <div className="mop-org-meta-row">
                  <LastActivity value={org.updated_at || null} />
                </div>
              </div>
              <div className="mop-org-card__actions">
                <Tooltip text="Edit organization">
                  <IconBtn aria-label={`Edit ${org.shortLabel}`} onClick={() => openEdit(org)}>
                    <PencilIcon />
                    <span>Edit</span>
                  </IconBtn>
                </Tooltip>
                <Tooltip text="Review admins">
                  <IconBtn aria-label={`Review admins for ${org.shortLabel}`} onClick={() => setAdminsDialogOrg(org)}>
                    <UserStarIcon />
                    <span>Admins</span>
                  </IconBtn>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>

        {normalizedSearch && filteredOrgs.length === 0 && (
          <div className="mop-empty-state">
            No organizations match your search.
          </div>
        )}

        {!normalizedSearch && orgList.length === 0 && (
          <div className="mop-empty-state">
            No organizations found.{" "}
            <button className="mop-link-btn" type="button" onClick={openCreate}>
              Create one
            </button>
          </div>
        )}

        {!normalizedSearch && orgList.length > 3 && (
          <div className="mop-show-more">
            <BtnGhost onClick={() => setShowAll((v) => !v)} style={{ width: "100%" }}>
              {showAll ? "Show fewer organizations" : `Show all organizations (${orgList.length})`}
            </BtnGhost>
          </div>
        )}
      </div>

      {/* ── Create Organization modal ── */}
      {showCreate && (
        <ModalOverlay role="dialog" aria-modal="true">
          <ModalCard>
            <ModalHeader icon={CirclePlusIcon} title="Create Organization" />
            <ModalBody>
              <FieldLabel>Code</FieldLabel>
              <FieldInput
                danger={createError && createError.toLowerCase().includes("code")}
                value={createForm.code}
                onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value.toLowerCase().replace(/\s/g, "-") }))}
                placeholder="tedu-ee"
              />
              <p className="vera-text-muted">Immutable identifier. Lowercase slug format (e.g. tedu-ee).</p>

              <FieldLabel>Short Label</FieldLabel>
              <FieldInput
                value={createForm.shortLabel}
                onChange={(e) => setCreateForm((f) => ({ ...f, shortLabel: e.target.value }))}
                placeholder="EE"
              />

              <FieldLabel>University</FieldLabel>
              <FieldInput
                value={createForm.university}
                onChange={(e) => setCreateForm((f) => ({ ...f, university: e.target.value }))}
                placeholder="TED University"
              />

              <FieldLabel>Department</FieldLabel>
              <FieldInput
                value={createForm.department}
                onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))}
                placeholder="Electrical & Electronics Engineering"
              />

              <FieldError>{createError}</FieldError>
            </ModalBody>
            <ModalActions>
              <BtnOutline onClick={closeCreate}>Cancel</BtnOutline>
              <BtnPrimary disabled={!createCanSubmit || isDemoMode} onClick={handleCreateOrg}>
                Create
              </BtnPrimary>
            </ModalActions>
          </ModalCard>
        </ModalOverlay>
      )}

      {/* ── Edit Organization modal ── */}
      {showEdit && (
        <ModalOverlay role="dialog" aria-modal="true">
          <ModalCard>
            <ModalHeader icon={PencilIcon} title="Edit Organization" />
            <ModalBody>
              <FieldLabel>Code</FieldLabel>
              <FieldInput value={editForm.code} disabled />

              <FieldLabel>Short Label</FieldLabel>
              <FieldInput
                value={editForm.shortLabel}
                onChange={(e) => setEditForm((f) => ({ ...f, shortLabel: e.target.value }))}
              />

              <FieldLabel>University</FieldLabel>
              <FieldInput
                value={editForm.university}
                onChange={(e) => setEditForm((f) => ({ ...f, university: e.target.value }))}
              />

              <FieldLabel>Department</FieldLabel>
              <FieldInput
                value={editForm.department}
                onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
              />

              <FieldLabel>Status</FieldLabel>
              <CustomSelect
                className="vera-field-input"
                value={editForm.status}
                onChange={(v) => setEditForm((f) => ({ ...f, status: v }))}
                options={[
                  { value: "active", label: "Active" },
                  { value: "disabled", label: "Disabled" },
                  { value: "archived", label: "Archived" },
                ]}
                ariaLabel="Status"
              />

              <FieldError>{editError}</FieldError>
            </ModalBody>
            <ModalActions>
              <BtnOutline onClick={closeEdit}>Cancel</BtnOutline>
              <BtnPrimary disabled={!editCanSubmit || isDemoMode} onClick={handleUpdateOrg}>
                Save
              </BtnPrimary>
            </ModalActions>
          </ModalCard>
        </ModalOverlay>
      )}

      {/* ── Organization admins modal ── */}
      {adminsDialogOrg && (
        <ModalOverlay role="dialog" aria-modal="true" aria-label={`Admins for ${adminsDialogOrg.shortLabel}`}>
          <ModalCard className="mop-modal-card--wide">
            <ModalHeader icon={UserStarIcon} title={`${adminsDialogOrg.shortLabel} · Admins`} />
            <ModalBody className="mop-modal-body--scroll">
              {/* Approved admins */}
              <h4 className="mop-section-heading">Approved</h4>
              <div className="mop-section-list">
                {adminsDialogOrg.tenantAdmins?.length ? (
                  adminsDialogOrg.tenantAdmins.map((admin, idx) => (
                    <div key={`${adminsDialogOrg.id}-approved-${idx}`} className="mop-admin-row">
                      <div className="mop-admin-info">
                        <div className="mop-admin-name-row">
                          <UserStarIcon />
                          <span className="mop-admin-name">{admin.name || "—"}</span>
                        </div>
                        <button
                          type="button"
                          className="mop-admin-email-btn"
                          onClick={() => copyEmailToClipboard(admin.email)}
                          title="Copy email to clipboard"
                        >
                          <MailIcon />
                          <span>{admin.email}</span>
                        </button>
                        <div className="mop-admin-meta-row">
                          <HistoryIcon />
                          <span>{formatTimestamp(admin.updatedAt || admin.updated_at || adminsDialogOrg.updated_at || null)}</span>
                        </div>
                      </div>
                      <div className="mop-admin-actions">
                        <span className="vera-status-badge vera-status-badge--active">
                          <CheckIcon />
                          Approved
                        </span>
                        <div className="mop-admin-btn-row">
                          <Tooltip text="Edit admin">
                            <IconBtn
                              aria-label={`Edit admin ${admin.name || admin.email}`}
                              onClick={() => openAdminEdit(adminsDialogOrg.id, admin)}
                              disabled={!admin.userId}
                            >
                              <PencilIcon />
                            </IconBtn>
                          </Tooltip>
                          <Tooltip text="Delete admin">
                            <IconBtn
                              danger
                              aria-label={`Delete admin ${admin.name || admin.email}`}
                              onClick={() => setAdminDeleteTarget({
                                organizationId: adminsDialogOrg.id,
                                userId: admin.userId,
                                name: admin.name,
                                email: admin.email,
                              })}
                              disabled={!admin.userId}
                            >
                              <TrashIcon />
                            </IconBtn>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="mop-empty-text">No approved admin yet.</p>
                )}
              </div>

              {/* Pending applications */}
              <h4 className="mop-section-heading" style={{ marginTop: 16 }}>Pending Applications</h4>
              <div className="mop-section-list">
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
                      <div key={entry.applicationId} className="mop-pending-item">
                        <div className="mop-admin-info">
                          <div className="mop-admin-name-row">
                            <UserStarIcon />
                            <span className="mop-admin-name">{entry.name || "—"}</span>
                          </div>
                          <button
                            type="button"
                            className="mop-admin-email-btn"
                            onClick={() => copyEmailToClipboard(entry.email)}
                            title="Copy email to clipboard"
                          >
                            <MailIcon />
                            <span>{entry.email}</span>
                          </button>
                          <div className="mop-admin-meta-row">
                            <HistoryIcon />
                            <span>{formatTimestamp(entry.updatedAt || entry.updated_at || entry.createdAt || null)}</span>
                          </div>
                        </div>
                        <div className="mop-pending-footer">
                          <span className="vera-status-badge vera-status-badge--pending">
                            <Clock3Icon />
                            Pending approval
                          </span>
                          <div className="mop-pending-actions">
                            <BtnPrimary
                              className="mop-btn-sm"
                              onClick={() => handleApproveApplication(entry.applicationId)}
                              disabled={isRowLoading || isDemoMode}
                            >
                              {isApproveLoading && <span className="spinner" aria-hidden="true" />}
                              Approve
                            </BtnPrimary>
                            <BtnOutline
                              className="mop-btn-sm"
                              onClick={() => handleRejectApplication(entry.applicationId)}
                              disabled={isRowLoading || isDemoMode}
                            >
                              {isRejectLoading && <span className="spinner" aria-hidden="true" />}
                              Reject
                            </BtnOutline>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="mop-empty-text">No pending applications.</p>
                )}
              </div>
            </ModalBody>
            <ModalActions>
              <BtnPrimary onClick={() => openAdminCreate(adminsDialogOrg)}>
                <CirclePlusIcon />
                Add admin
              </BtnPrimary>
              <BtnOutline onClick={() => { setAdminCreateOpen(false); setAdminsDialogOrg(null); }}>
                Close
              </BtnOutline>
            </ModalActions>
          </ModalCard>
        </ModalOverlay>
      )}

      {/* ── Add admin modal ── */}
      {adminCreateOpen && (
        <ModalOverlay role="dialog" aria-modal="true" aria-label="Add admin">
          <ModalCard>
            <ModalHeader icon={CirclePlusIcon} title="Add Admin" />
            <ModalBody>
              <FieldLabel>Name</FieldLabel>
              <FieldInput
                danger={adminCreateNameError}
                value={adminCreateForm.name}
                onChange={(e) => setAdminCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Admin name"
              />
              <FieldLabel>Email</FieldLabel>
              <FieldInput
                danger={adminCreateEmailError}
                type="email"
                value={adminCreateForm.email}
                onChange={(e) => setAdminCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="admin@example.edu"
              />
              <FieldLabel>Temporary Password</FieldLabel>
              <FieldInput
                danger={adminCreatePasswordError}
                type="password"
                value={adminCreateForm.password}
                onChange={(e) => setAdminCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Minimum 10 characters"
              />
              <FieldError>{adminCreateError}</FieldError>
            </ModalBody>
            <ModalActions>
              <BtnOutline onClick={() => setAdminCreateOpen(false)}>Cancel</BtnOutline>
              <BtnPrimary onClick={saveAdminCreate} disabled={adminCreateSaving || isDemoMode}>
                Create
              </BtnPrimary>
            </ModalActions>
          </ModalCard>
        </ModalOverlay>
      )}

      {/* ── Edit admin modal ── */}
      {adminEditOpen && (
        <ModalOverlay role="dialog" aria-modal="true" aria-label="Edit admin">
          <ModalCard>
            <ModalHeader icon={PencilIcon} title="Edit Admin" />
            <ModalBody>
              <FieldLabel>Name</FieldLabel>
              <FieldInput
                danger={adminEditNameError}
                value={adminEditForm.name}
                onChange={(e) => setAdminEditForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Admin name"
              />
              <FieldLabel>Email</FieldLabel>
              <FieldInput
                danger={adminEditEmailError}
                type="email"
                value={adminEditForm.email}
                onChange={(e) => setAdminEditForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="admin@example.com"
              />
              <FieldError>{adminEditError}</FieldError>
            </ModalBody>
            <ModalActions>
              <BtnOutline onClick={() => setAdminEditOpen(false)}>Cancel</BtnOutline>
              <BtnPrimary onClick={saveAdminEdit} disabled={adminEditSaving || isDemoMode}>
                Save
              </BtnPrimary>
            </ModalActions>
          </ModalCard>
        </ModalOverlay>
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
    </div>
  );
}
