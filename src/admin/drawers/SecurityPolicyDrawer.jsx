// src/admin/drawers/SecurityPolicyDrawer.jsx
// Drawer: edit platform-wide security policy (Super Admin only).
//
// Props:
//   open    — boolean
//   onClose — () => void
//   policy  — {
//     googleOAuth, emailPassword, rememberMe,
//     minPasswordLength, maxLoginAttempts, requireSpecialChars,
//     tokenTtl, allowMultiDevice
//   }
//   onSave  — (policy) => Promise<void>
//   error   — string | null

import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";

const DEFAULT_POLICY = {
  googleOAuth: true,
  emailPassword: true,
  rememberMe: true,
  minPasswordLength: 8,
  maxLoginAttempts: 5,
  requireSpecialChars: true,
  tokenTtl: "24h",
  allowMultiDevice: false,
};

function Toggle({ checked, onChange, disabled }) {
  return (
    <label
      style={{ position: "relative", width: 38, height: 22, cursor: disabled ? "not-allowed" : "pointer", flexShrink: 0 }}
      onClick={(e) => { e.preventDefault(); if (!disabled) onChange(!checked); }}
    >
      <div
        style={{
          position: "absolute", inset: 0,
          background: checked ? "var(--accent)" : "var(--surface-2)",
          borderRadius: 11, transition: "background .2s",
        }}
      />
      <div
        style={{
          position: "absolute", top: 2, left: 2,
          width: 18, height: 18, background: "white", borderRadius: "50%",
          transition: "transform .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transform: checked ? "translateX(16px)" : "translateX(0)",
        }}
      />
    </label>
  );
}

function ToggleRow({ title, desc, checked, onChange, disabled }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
        <div className="text-xs text-muted" style={{ marginTop: 2 }}>{desc}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 12, fontWeight: 650, color: "var(--text-secondary)",
        textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: -4,
      }}
    >
      {children}
    </div>
  );
}

export default function SecurityPolicyDrawer({ open, onClose, policy, onSave, error }) {
  const [form, setForm] = useState(DEFAULT_POLICY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({ ...DEFAULT_POLICY, ...policy });
      setSaveError(""); setSaving(false);
    }
  }, [open, policy]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaveError("");
    setSaving(true);
    try {
      await onSave?.({ ...form });
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
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Security Policy</div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                Platform-wide authentication and access controls
              </div>
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

        <SectionLabel>Authentication</SectionLabel>
        <ToggleRow
          title="Google OAuth"
          desc="Allow sign-in with Google accounts"
          checked={form.googleOAuth}
          onChange={(v) => set("googleOAuth", v)}
          disabled={saving}
        />
        <ToggleRow
          title="Email/Password Login"
          desc="Allow traditional email and password authentication"
          checked={form.emailPassword}
          onChange={(v) => set("emailPassword", v)}
          disabled={saving}
        />
        <ToggleRow
          title="Remember Me (30-day sessions)"
          desc="Allow persistent sessions across browser restarts"
          checked={form.rememberMe}
          onChange={(v) => set("rememberMe", v)}
          disabled={saving}
        />

        <SectionLabel>Password Requirements</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="fs-field-row">
            <label className="fs-label">Minimum Length</label>
            <input
              className="fs-input"
              type="number"
              value={form.minPasswordLength}
              onChange={(e) => set("minPasswordLength", Number(e.target.value))}
              min={6}
              max={32}
              disabled={saving}
            />
          </div>
          <div className="fs-field-row">
            <label className="fs-label">Max Login Attempts</label>
            <input
              className="fs-input"
              type="number"
              value={form.maxLoginAttempts}
              onChange={(e) => set("maxLoginAttempts", Number(e.target.value))}
              min={3}
              max={20}
              disabled={saving}
            />
          </div>
        </div>
        <ToggleRow
          title="Require Special Characters"
          desc="Enforce at least one special character in passwords"
          checked={form.requireSpecialChars}
          onChange={(v) => set("requireSpecialChars", v)}
          disabled={saving}
        />

        <SectionLabel>Jury Access</SectionLabel>
        <div className="fs-field-row">
          <label className="fs-label">Entry Token TTL</label>
          <select
            className="fs-input"
            style={{ cursor: "pointer" }}
            value={form.tokenTtl}
            onChange={(e) => set("tokenTtl", e.target.value)}
            disabled={saving}
          >
            <option value="12h">12 hours</option>
            <option value="24h">24 hours</option>
            <option value="48h">48 hours</option>
            <option value="7d">7 days</option>
          </select>
          <div className="fs-field-helper hint">
            How long jury entry tokens remain valid after generation.
          </div>
        </div>
        <ToggleRow
          title="Allow Multi-Device Jury Sessions"
          desc="Let jurors use the same PIN on multiple devices simultaneously"
          checked={form.allowMultiDevice}
          onChange={(v) => set("allowMultiDevice", v)}
          disabled={saving}
        />
      </div>

      <div className="fs-drawer-footer">
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button
          className="fs-btn fs-btn-primary"
          type="button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Policy"}
        </button>
      </div>
    </Drawer>
  );
}
