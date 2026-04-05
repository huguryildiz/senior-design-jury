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
import { AlertCircle } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

function getStrength(password) {
  const checks = {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const labels = ["", "Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const colors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];
  return { checks, score, label: labels[score] || "", color: colors[score] || "", pct: score * 20 };
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="pwd-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function PasswordField({ label, value, onChange, placeholder, disabled, id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="fs-field-row">
      <label className="fs-label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          className="fs-input"
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
    </div>
  );
}

export default function ChangePasswordDrawer({ open, onClose, onSave, error }) {
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

  const strength = getStrength(newPwd);
  const passwordsMatch = newPwd && confirm && newPwd === confirm;
  const passwordsMismatch = confirm && newPwd !== confirm;
  const canSave = current && strength.checks.length && passwordsMatch;

  const handleSave = async () => {
    setSaveError("");
    setSaving(true);
    try {
      await onSave?.({ currentPassword: current, newPassword: newPwd });
      onClose();
    } catch (e) {
      setSaveError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const displayError = saveError || error;

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: 9, display: "grid", placeItems: "center",
                background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.12)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" style={{ width: 17, height: 17 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Change Password</div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>Update your account password</div>
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="fs-drawer-body" style={{ gap: 16 }}>
        {displayError && (
          <div className="fs-alert danger" style={{ marginBottom: 4 }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">{displayError}</div>
          </div>
        )}

        <PasswordField
          label="Current Password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Enter current password"
          disabled={saving}
          id="cp-current"
        />

        {/* New password with strength */}
        <div className="fs-field-row">
          <label className="fs-label">New Password</label>
          <div style={{ position: "relative" }}>
            <NewPasswordField value={newPwd} onChange={setNewPwd} disabled={saving} />
          </div>

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
                {[
                  { key: "length", label: "Minimum 8 characters" },
                  { key: "lower", label: "At least one lowercase letter" },
                  { key: "upper", label: "At least one uppercase letter" },
                  { key: "number", label: "At least one number" },
                  { key: "special", label: "At least one special character" },
                ].map(({ key, label }) => (
                  <div key={key} className={`pwd-check${strength.checks[key] ? " met" : ""}`}>
                    <CheckIcon />
                    {label}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Confirm */}
        <div className="fs-field-row">
          <label className="fs-label">Confirm New Password</label>
          <ConfirmPasswordField value={confirm} onChange={setConfirm} disabled={saving} />
          {confirm && (
            <div
              className="pwd-match-msg"
              style={{ color: passwordsMatch ? "var(--success)" : "var(--danger)" }}
            >
              {passwordsMatch ? "Passwords match" : "Passwords do not match"}
            </div>
          )}
        </div>
      </div>

      <div className="fs-drawer-footer">
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button
          className="fs-btn fs-btn-primary"
          type="button"
          onClick={handleSave}
          disabled={saving || !canSave}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={saving} loadingText="Updating…">Update Password</AsyncButtonContent>
          </span>
        </button>
      </div>
    </Drawer>
  );
}

// Separate sub-components to avoid rules-of-hooks issues with inline show/hide state

function NewPasswordField({ value, onChange, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        className="fs-input"
        type={show ? "text" : "password"}
        placeholder="Enter new password"
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

function ConfirmPasswordField({ value, onChange, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        className="fs-input"
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
