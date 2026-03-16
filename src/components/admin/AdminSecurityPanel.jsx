// src/components/admin/AdminSecurityPanel.jsx

import { useEffect, useState } from "react";
import { ChevronDownIcon, ShieldUserIcon, CircleXLucideIcon, TriangleAlertIcon, InfoIcon } from "../../shared/Icons";
import {
  adminBootstrapBackupPassword,
  adminBootstrapDeletePassword,
  adminChangePassword,
  adminChangeDeletePassword,
  adminChangeBackupPassword,
  adminSecurityState,
} from "../../shared/api";
import { useToast } from "../toast/useToast";

export default function AdminSecurityPanel({
  isMobile,
  isOpen,
  onToggle,
  onPasswordChanged,
  adminPass,
  innerRef,
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [adminFormError, setAdminFormError] = useState("");
  const [missingHash, setMissingHash] = useState(false);
  const [deleteMissingHash, setDeleteMissingHash] = useState(false);
  const [deleteCurrent, setDeleteCurrent] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteErrors, setDeleteErrors] = useState({});
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteFormError, setDeleteFormError] = useState("");

  const [backupMissingHash, setBackupMissingHash] = useState(false);
  const [backupCurrent, setBackupCurrent] = useState("");
  const [backupPassword, setBackupPassword] = useState("");
  const [backupConfirm, setBackupConfirm] = useState("");
  const [backupErrors, setBackupErrors] = useState({});
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupFormError, setBackupFormError] = useState("");

  const _toast = useToast();
  const setSuccess       = (m) => { if (m) _toast.success(m); };
  const setDeleteSuccess = (m) => { if (m) _toast.success(m); };
  const setBackupSuccess = (m) => { if (m) _toast.success(m); };
  const [activeTab, setActiveTab] = useState("admin");

  const isStrongPassword = (value) => {
    const v = String(value || "");
    return (
      v.length >= 10
      && /[a-z]/.test(v)
      && /[A-Z]/.test(v)
      && /\d/.test(v)
      && /[^A-Za-z0-9]/.test(v)
    );
  };

  useEffect(() => {
    let active = true;
    adminSecurityState()
      .then((state) => {
        if (!active) return;
        setMissingHash(!state?.admin_password_set);
        setDeleteMissingHash(!state?.delete_password_set);
        setBackupMissingHash(!state?.backup_password_set);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const validate = () => {
    const nextErrors = {};
    if (!missingHash && !currentPassword.trim()) {
      nextErrors.current = "Current password is required.";
    }
    if (!newPassword.trim()) {
      nextErrors.next = "New password is required.";
    } else if (!isStrongPassword(newPassword)) {
      nextErrors.next = "Use at least 10 characters, including an uppercase letter (A-Z), a lowercase letter (a-z), a number (0-9), and a symbol (e.g. !@#$%^&*).";
    }
    if (!confirmPassword.trim()) nextErrors.confirm = "Confirm your new password.";
    if (newPassword.trim() && confirmPassword.trim() && newPassword !== confirmPassword) {
      nextErrors.confirm = "Passwords do not match.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    setSuccess("");
    setAdminFormError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await adminChangePassword(currentPassword, newPassword);
      setSuccess("Admin password updated");
      if (onPasswordChanged) {
        onPasswordChanged(newPassword);
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("incorrect_password")) {
        setErrors((prev) => ({ ...prev, current: "Incorrect current password." }));
      } else if (msg.includes("admin_password_hash_missing")) {
        setAdminFormError("Admin password has not been set yet. Create it to enable secure admin access.");
        setMissingHash(true);
      } else if (msg.includes("already_initialized")) {
        setAdminFormError("Admin password is already configured.");
      } else {
        setAdminFormError("Could not update password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const validateDelete = () => {
    const nextErrors = {};
    if (!deleteMissingHash && !deleteCurrent.trim()) {
      nextErrors.current = "Current delete password is required.";
    }
    if (!deletePassword.trim()) {
      nextErrors.next = "New delete password is required.";
    } else if (!isStrongPassword(deletePassword)) {
      nextErrors.next = "Use at least 10 characters, including an uppercase letter (A-Z), a lowercase letter (a-z), a number (0-9), and a symbol (e.g. !@#$%^&*).";
    }
    if (!deleteConfirm.trim()) nextErrors.confirm = "Confirm your delete password.";
    if (deletePassword.trim() && deleteConfirm.trim() && deletePassword !== deleteConfirm) {
      nextErrors.confirm = "Passwords do not match.";
    }
    setDeleteErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleDeleteSubmit = async () => {
    setDeleteSuccess("");
    setDeleteFormError("");
    if (!validateDelete()) return;
    if (!adminPass) {
      setDeleteFormError("Admin password missing. Please re-login.");
      return;
    }
    setDeleteLoading(true);
    try {
      if (deleteMissingHash) {
        await adminBootstrapDeletePassword(deletePassword, adminPass);
        setDeleteSuccess("Delete password initialized");
        setDeleteMissingHash(false);
      } else {
        await adminChangeDeletePassword(deleteCurrent, deletePassword, adminPass);
        setDeleteSuccess("Delete password updated");
      }
      setDeleteCurrent("");
      setDeletePassword("");
      setDeleteConfirm("");
      setDeleteErrors({});
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("delete_password_missing")) {
        setDeleteFormError("Delete password is not configured yet.");
        setDeleteMissingHash(true);
      } else if (msg.includes("incorrect_delete_password")) {
        setDeleteErrors((prev) => ({ ...prev, current: "Incorrect current delete password." }));
        setDeleteMissingHash(false);
      } else if (msg.includes("already_initialized")) {
        setDeleteFormError("Delete password is already configured.");
        setDeleteMissingHash(false);
      } else if (msg.includes("unauthorized")) {
        setDeleteFormError("Incorrect admin password.");
      } else {
        setDeleteFormError("Could not update delete password. Please try again.");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const validateBackup = () => {
    const nextErrors = {};
    if (!backupMissingHash && !backupCurrent.trim()) {
      nextErrors.current = "Current backup & restore password is required.";
    }
    if (!backupPassword.trim()) {
      nextErrors.next = "New backup & restore password is required.";
    } else if (!isStrongPassword(backupPassword)) {
      nextErrors.next = "Use at least 10 characters, including an uppercase letter (A-Z), a lowercase letter (a-z), a number (0-9), and a symbol (e.g. !@#$%^&*).";
    }
    if (!backupConfirm.trim()) nextErrors.confirm = "Confirm your backup & restore password.";
    if (backupPassword.trim() && backupConfirm.trim() && backupPassword !== backupConfirm) nextErrors.confirm = "Passwords do not match.";
    setBackupErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleBackupPasswordSubmit = async () => {
    setBackupSuccess("");
    setBackupFormError("");
    if (!validateBackup()) return;
    if (!adminPass) {
      setBackupFormError("Admin password missing. Please re-login.");
      return;
    }
    setBackupLoading(true);
    try {
      if (backupMissingHash) {
        await adminBootstrapBackupPassword(backupPassword, adminPass);
        setBackupSuccess("Backup and restore password initialized");
        setBackupMissingHash(false);
      } else {
        await adminChangeBackupPassword(backupCurrent, backupPassword, adminPass);
        setBackupSuccess("Backup and restore password updated");
      }
      setBackupCurrent("");
      setBackupPassword("");
      setBackupConfirm("");
      setBackupErrors({});
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("backup_password_missing")) {
        setBackupFormError("Backup & restore password is not configured yet.");
        setBackupMissingHash(true);
      } else if (msg.includes("incorrect_backup_password")) {
        setBackupErrors((prev) => ({ ...prev, current: "Incorrect current backup & restore password." }));
        setBackupMissingHash(false);
      } else if (msg.includes("already_initialized")) {
        setBackupFormError("Backup & restore password is already configured.");
        setBackupMissingHash(false);
      } else if (msg.includes("unauthorized")) {
        setBackupFormError("Incorrect admin password.");
      } else {
        setBackupFormError("Could not update backup & restore password. Please try again.");
      }
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <div className={`manage-card${isMobile ? " is-collapsible" : ""}`} ref={innerRef}>
      <button
        type="button"
        className="manage-card-header"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="manage-card-title">
          <span className="manage-card-icon" aria-hidden="true"><ShieldUserIcon /></span>
          <span className="section-label">Admin Security</span>
        </div>
        {isMobile && <ChevronDownIcon className={`manage-chevron${isOpen ? " open" : ""}`} />}
      </button>

      {(!isMobile || isOpen) && (
        <div className="manage-card-body">
          <div className="manage-card-desc">
            Manage passwords for admin access, deletion, and backup &amp; restore.
          </div>
          <div className="manage-security-tabs" role="tablist" aria-label="Admin security tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "admin"}
              className={`manage-security-tab${activeTab === "admin" ? " is-active" : ""}`}
              onClick={() => setActiveTab("admin")}
            >
              Admin
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "delete"}
              className={`manage-security-tab${activeTab === "delete" ? " is-active" : ""}`}
              onClick={() => setActiveTab("delete")}
            >
              Delete
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "backup"}
              className={`manage-security-tab${activeTab === "backup" ? " is-active" : ""}`}
              onClick={() => setActiveTab("backup")}
            >
              Backup & Restore
            </button>
          </div>

          <div className="manage-security-stack">
            {activeTab === "admin" && (
              <div className="manage-mini-card">
                <div className="manage-mini-card-body">
                  {adminFormError && (
                    <div className="manage-alert error with-icon">
                      <span className="manage-alert-icon" aria-hidden="true"><CircleXLucideIcon /></span>
                      <span>{adminFormError}</span>
                    </div>
                  )}
                  <div className="manage-alert with-icon">
                    <span className="manage-alert-icon" aria-hidden="true"><InfoIcon /></span>
                    <span>
                      This password secures admin login and controls access to Settings, Scores, and Analytics.
                    </span>
                  </div>
                  <div className="manage-field">
                    <label className="manage-label">Current Password</label>
                    <input
                      type="password"
                      className={`manage-input${errors.current ? " is-danger" : ""}`}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={missingHash}
                      autoComplete="off"
                    />
                    {errors.current && <div className="manage-field-error">{errors.current}</div>}
                  </div>

                  <div className="manage-field">
                    <label className="manage-label">New Password</label>
                    <input
                      type="password"
                      className={`manage-input${errors.next ? " is-danger" : ""}`}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    {errors.next && <div className="manage-field-error">{errors.next}</div>}
                  </div>

                  <div className="manage-field">
                    <label className="manage-label">Confirm New Password</label>
                    <input
                      type="password"
                      className={`manage-input${errors.confirm ? " is-danger" : ""}`}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    {errors.confirm && <div className="manage-field-error">{errors.confirm}</div>}
                  </div>

                  {missingHash && (
                    <div className="manage-delete-warning manage-delete-warning--caution" role="status">
                      <span className="manage-delete-warning-icon" aria-hidden="true"><TriangleAlertIcon /></span>
                      <span className="manage-delete-warning-text">
                        Admin password has not been set yet. Create it to enable secure admin access.
                      </span>
                    </div>
                  )}

                  <div className="manage-alert with-icon">
                    <span className="manage-alert-icon" aria-hidden="true"><InfoIcon /></span>
                    <span>
                      If no admin password is set, you will be prompted to create one.
                    </span>
                  </div>

                  <div className="manage-card-actions">
                    <button
                      className="manage-btn primary"
                      type="button"
                      disabled={loading || missingHash}
                      onClick={handleSubmit}
                    >
                      {loading ? "Updating..." : "Update Admin Password"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "delete" && (
              <div className="manage-mini-card">
                <div className="manage-mini-card-body">
                  {deleteFormError && (
                    <div className="manage-alert error with-icon">
                      <span className="manage-alert-icon" aria-hidden="true"><CircleXLucideIcon /></span>
                      <span>{deleteFormError}</span>
                    </div>
                  )}
                  {!adminPass && (
                    <div className="manage-hint manage-hint-warn">
                      Admin session required. Re-login to update the delete password.
                    </div>
                  )}
                  <div className="manage-alert with-icon">
                    <span className="manage-alert-icon" aria-hidden="true"><InfoIcon /></span>
                    <span>
                      This password is required to confirm destructive actions such as deleting semesters, groups, and jurors.
                    </span>
                  </div>
                  {deleteMissingHash && (
                    <div className="manage-alert with-icon">
                    <span className="manage-alert-icon" aria-hidden="true"><InfoIcon /></span>
                    <span>
                      Optional. Required before destructive actions can be performed.
                    </span>
                  </div>
                  )}
                  <div className="manage-field">
                    <label className="manage-label">Current Delete Password</label>
                    <input
                      type="password"
                      className={`manage-input${deleteErrors.current ? " is-danger" : ""}${deleteMissingHash ? " is-disabled" : ""}`}
                      value={deleteCurrent}
                      onChange={(e) => setDeleteCurrent(e.target.value)}
                      disabled={deleteLoading || !adminPass || deleteMissingHash}
                      autoComplete="off"
                    />
                    {deleteErrors.current && <div className="manage-field-error">{deleteErrors.current}</div>}
                  </div>
                  <div className="manage-field">
                    <label className="manage-label">New Delete Password</label>
                    <input
                      type="password"
                      className={`manage-input${deleteErrors.next ? " is-danger" : ""}`}
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      disabled={deleteLoading || !adminPass}
                      autoComplete="new-password"
                    />
                    {deleteErrors.next && <div className="manage-field-error">{deleteErrors.next}</div>}
                  </div>

                  <div className="manage-field">
                    <label className="manage-label">Confirm Delete Password</label>
                    <input
                      type="password"
                      className={`manage-input${deleteErrors.confirm ? " is-danger" : ""}`}
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      disabled={deleteLoading || !adminPass}
                      autoComplete="new-password"
                    />
                    {deleteErrors.confirm && <div className="manage-field-error">{deleteErrors.confirm}</div>}
                  </div>

                  {deleteMissingHash && (
                    <div className="manage-delete-warning manage-delete-warning--caution" role="status">
                      <span className="manage-delete-warning-icon" aria-hidden="true"><TriangleAlertIcon /></span>
                      <span className="manage-delete-warning-text">
                        Delete password is not set. Create one to protect destructive actions.
                      </span>
                    </div>
                  )}

                  <div className="manage-alert with-icon">
                    <span className="manage-alert-icon" aria-hidden="true"><InfoIcon /></span>
                    <span>
                      If no delete password is set, you will be prompted to create one.
                    </span>
                  </div>

                  <div className="manage-card-actions">
                    <button
                      className="manage-btn primary"
                      type="button"
                      disabled={deleteLoading || !adminPass}
                      onClick={handleDeleteSubmit}
                    >
                      {deleteLoading ? "Updating..." : "Update Delete Password"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "backup" && (
              <div className="manage-mini-card">
                <div className="manage-mini-card-body">
                  {backupFormError && (
                    <div className="manage-alert error with-icon">
                      <span className="manage-alert-icon" aria-hidden="true"><CircleXLucideIcon /></span>
                      <span>{backupFormError}</span>
                    </div>
                  )}
                  {!adminPass && (
                    <div className="manage-hint manage-hint-warn">
                      Admin session required. Re-login to update the backup &amp; restore password.
                    </div>
                  )}
                  <div className="manage-alert with-icon">
                    <span className="manage-alert-icon" aria-hidden="true"><InfoIcon /></span>
                    <span>
                      This password protects full data export/import and restore operations.
                    </span>
                  </div>
                  {backupMissingHash && (
                    <div className="manage-alert with-icon">
                    <span className="manage-alert-icon" aria-hidden="true"><InfoIcon /></span>
                    <span>
                      Optional. Required before export, import, or restore operations.
                    </span>
                  </div>
                  )}
                  <div className="manage-field">
                    <label className="manage-label">Current Backup & Restore Password</label>
                    <input
                      type="password"
                      className={`manage-input${backupErrors.current ? " is-danger" : ""}${backupMissingHash ? " is-disabled" : ""}`}
                      value={backupCurrent}
                      onChange={(e) => setBackupCurrent(e.target.value)}
                      disabled={backupLoading || backupMissingHash || !adminPass}
                      autoComplete="off"
                    />
                    {backupErrors.current && <div className="manage-field-error">{backupErrors.current}</div>}
                  </div>
                  <div className="manage-field">
                    <label className="manage-label">New Backup & Restore Password</label>
                    <input
                      type="password"
                      className={`manage-input${backupErrors.next ? " is-danger" : ""}`}
                      value={backupPassword}
                      onChange={(e) => setBackupPassword(e.target.value)}
                      disabled={backupLoading || !adminPass}
                      autoComplete="new-password"
                    />
                    {backupErrors.next && <div className="manage-field-error">{backupErrors.next}</div>}
                  </div>
                  <div className="manage-field">
                    <label className="manage-label">Confirm Backup & Restore Password</label>
                    <input
                      type="password"
                      className={`manage-input${backupErrors.confirm ? " is-danger" : ""}`}
                      value={backupConfirm}
                      onChange={(e) => setBackupConfirm(e.target.value)}
                      disabled={backupLoading || !adminPass}
                      autoComplete="new-password"
                    />
                    {backupErrors.confirm && <div className="manage-field-error">{backupErrors.confirm}</div>}
                  </div>

                  {backupMissingHash && (
                    <div className="manage-delete-warning manage-delete-warning--caution" role="status">
                      <span className="manage-delete-warning-icon" aria-hidden="true"><TriangleAlertIcon /></span>
                      <span className="manage-delete-warning-text">
                        Backup &amp; restore password is not set. Create one to protect export/import.
                      </span>
                    </div>
                  )}

                  <div className="manage-alert with-icon">
                    <span className="manage-alert-icon" aria-hidden="true"><InfoIcon /></span>
                    <span>
                      If no backup &amp; restore password is set, you will be prompted to create one.
                    </span>
                  </div>

                  <div className="manage-card-actions">
                    <button
                      className="manage-btn primary"
                      type="button"
                      disabled={backupLoading || !adminPass}
                      onClick={handleBackupPasswordSubmit}
                    >
                      {backupLoading ? "Updating..." : "Update Backup & Restore Password"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
