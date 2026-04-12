// src/admin/drawers/ChangePasswordDrawer.jsx
// Drawer: change the current user's password.
// Shows strength bar + checklist for the new password field.
//
// Props:
//   open    — boolean
//   onClose — () => void
//   onSave  — ({ currentPassword, newPassword }) => Promise<void>
//   error   — string | null

import { useState, useEffect } from "react";
import { AlertCircle, Icon } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import InlineError from "@/shared/ui/InlineError";
import useShakeOnError from "@/shared/hooks/useShakeOnError";
import {
  evaluatePassword,
  getStrengthMeta,
  isStrongPassword,
  PASSWORD_POLICY_PLACEHOLDER,
  PASSWORD_REQUIREMENTS,
} from "@/shared/passwordPolicy";
import { useAuth } from "@/auth";

function EyeIcon() {
  return (
    <Icon
      iconNode={[]}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ width: 15, height: 15 }}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

function EyeOffIcon() {
  return (
    <Icon
      iconNode={[]}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ width: 15, height: 15 }}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </Icon>
  );
}

function CheckIcon() {
  return (
    <Icon
      iconNode={[]}
      className="pwd-check-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  );
}

function PasswordField({ label, value, onChange, placeholder, disabled, id, name, autoComplete, error }) {
  const [show, setShow] = useState(false);
  return (
    <div className="fs-field">
      <label className="fs-field-label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          name={name}
          autoComplete={autoComplete}
          className={`fs-input${error ? " input-error" : ""}`}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={{ paddingRight: 40 }}
        />
        <button
          type="button"
          className="pwd-toggle"
          onClick={() => setShow((v) => !v)}
          title={show ? "Hide password" : "Show password"}
          disabled={disabled}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      <InlineError>{error}</InlineError>
    </div>
  );
}

export default function ChangePasswordDrawer({ open, onClose, onSave, error }) {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (open) {
      setCurrent(""); setNewPwd(""); setConfirm("");
      setSaveError(""); setSaving(false);
    }
  }, [open]);

  const { checks, score } = evaluatePassword(newPwd);
  const strength = { checks, score, ...getStrengthMeta(score) };
  const passwordsMatch = newPwd && confirm && newPwd === confirm;
  const confirmMismatch = Boolean(confirm && !passwordsMatch);
  const canSave = Boolean(current && isStrongPassword(newPwd) && passwordsMatch);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave || saving) return;
    
    setSaveError("");
    setSaving(true);
    try {
      await onSave?.({ currentPassword: current, newPassword: newPwd });
      onClose();
    } catch (err) {
      setSaveError(err?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const displayError = saveError || error;
  const errorText = String(displayError || "").trim();
  const lowerError = errorText.toLowerCase();
  const currentFieldError = lowerError.includes("current password") ? errorText : "";
  const newPasswordFieldError = (
    lowerError.includes("new password")
    || lowerError.includes("security requirements")
    || lowerError.includes("weak password")
    || lowerError.includes("same password")
  ) ? errorText : "";
  const showGlobalError = Boolean(errorText && !currentFieldError && !newPasswordFieldError);
  const saveBtnRef = useShakeOnError(displayError);

  return (
    <Drawer open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "contents" }}>
        {/* Hidden username field for accessibility / password manager autofill */}
        <input 
          type="text" 
          name="username" 
          id="cp-username" 
          autoComplete="username" 
          value={user?.email || ""} 
          readOnly 
          style={{ display: "none" }} 
          aria-hidden="true" 
        />
        <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="fs-icon warning">
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </Icon>
            </div>
            <div className="fs-title-group">
              <div className="fs-title">Change Password</div>
              <div className="fs-subtitle">Update your account password</div>
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </Icon>
          </button>
        </div>
      </div>

      <div className="fs-drawer-body" style={{ gap: 16 }}>
        {showGlobalError && (
          <div className="fs-alert danger" style={{ marginBottom: 4 }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">{errorText}</div>
          </div>
        )}

        <PasswordField
          label="Current Password"
          value={current}
          onChange={(e) => {
            if (saveError) setSaveError("");
            setCurrent(e.target.value);
          }}
          placeholder="Enter current password"
          disabled={saving}
          id="cp-current"
          name="currentPassword"
          autoComplete="current-password"
          error={currentFieldError}
        />

        {/* New password with strength */}
        <div className="fs-field">
          <label className="fs-field-label">New Password</label>
          <div style={{ position: "relative" }}>
            <NewPasswordField
              value={newPwd}
              onChange={(value) => {
                if (saveError) setSaveError("");
                setNewPwd(value);
              }}
              disabled={saving}
              error={newPasswordFieldError}
            />
          </div>
          <InlineError>{newPasswordFieldError}</InlineError>

          {newPwd && (
            <>
              <div className="pwd-strength">
                <div className="pwd-strength-bar">
                  <div
                    className="pwd-strength-fill"
                    style={{ width: `${strength.pct}%`, background: strength.color }}
                  />
                </div>
                <span className="pwd-strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
              <div className="pwd-checklist">
                {PASSWORD_REQUIREMENTS.map(({ key, label }) => (
                  <div key={key} className={`pwd-check${strength.checks[key] ? " pass" : ""}`}>
                    <CheckIcon />
                    {label}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Confirm */}
        <div className="fs-field">
          <label className="fs-field-label">Confirm New Password</label>
          <ConfirmPasswordField
            value={confirm}
            onChange={(value) => {
              if (saveError) setSaveError("");
              setConfirm(value);
            }}
            disabled={saving}
            error={confirmMismatch}
          />
          {confirm && (
            passwordsMatch ? (
              <div className="pwd-match-msg match">Passwords match</div>
            ) : (
              <InlineError>Passwords do not match</InlineError>
            )
          )}
        </div>
      </div>

      <div className="fs-drawer-footer">
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button
          ref={saveBtnRef}
          className="fs-btn fs-btn-primary"
          type="submit"
          disabled={saving || !canSave}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={saving} loadingText="Updating…">Update Password</AsyncButtonContent>
          </span>
        </button>
      </div>
      </form>
    </Drawer>
  );
}

// Separate sub-components to avoid rules-of-hooks issues with inline show/hide state

function NewPasswordField({ value, onChange, disabled, error }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        id="cp-new"
        name="newPassword"
        autoComplete="new-password"
        className={`fs-input${error ? " input-error" : ""}`}
        type={show ? "text" : "password"}
        placeholder={PASSWORD_POLICY_PLACEHOLDER}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{ paddingRight: 40 }}
      />
      <button
        type="button"
        className="pwd-toggle"
        onClick={() => setShow((v) => !v)}
        title={show ? "Hide password" : "Show password"}
        disabled={disabled}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function ConfirmPasswordField({ value, onChange, disabled, error = false }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        id="cp-confirm"
        name="confirmPassword"
        autoComplete="new-password"
        className={`fs-input${error ? " input-error" : ""}`}
        type={show ? "text" : "password"}
        placeholder="Re-enter new password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{ paddingRight: 40 }}
      />
      <button
        type="button"
        className="pwd-toggle"
        onClick={() => setShow((v) => !v)}
        title={show ? "Hide password" : "Show password"}
        disabled={disabled}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
