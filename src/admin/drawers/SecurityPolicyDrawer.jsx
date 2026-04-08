// src/admin/drawers/SecurityPolicyDrawer.jsx
// Drawer: edit platform-wide security policy (Super Admin only).
//
// Props:
//   open    — boolean
//   onClose — () => void
//   policy  — {
//     googleOAuth, emailPassword, rememberMe,
//     minPasswordLength, maxLoginAttempts, requireSpecialChars,
//     tokenTtl, pinLockCooldown, ccOnPinReset, ccOnScoreEdit
//   }
//   onSave  — (policy) => Promise<void>
//   error   — string | null

import { useState, useEffect } from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import CustomSelect from "@/shared/ui/CustomSelect";
import useShakeOnError from "@/shared/hooks/useShakeOnError";

const DEFAULT_POLICY = {
  googleOAuth: true,
  emailPassword: true,
  rememberMe: true,
  minPasswordLength: 8,
  maxLoginAttempts: 5,
  requireSpecialChars: true,
  tokenTtl: "24h",
  pinLockCooldown: "30m",
  ccOnPinReset: true,
  ccOnScoreEdit: false,
};

const PIN_LOCK_COOLDOWN_OPTIONS = [
  { value: "5m", label: "5 minutes" },
  { value: "10m", label: "10 minutes" },
  { value: "15m", label: "15 minutes" },
  { value: "30m", label: "30 minutes" },
  { value: "60m", label: "60 minutes" },
];

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
  const selectedPinLockCooldown =
    PIN_LOCK_COOLDOWN_OPTIONS.find((opt) => opt.value === form.pinLockCooldown)?.label ||
    "30 minutes";

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
  const saveBtnRef = useShakeOnError(displayError);

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
          <CustomSelect
            value={form.tokenTtl}
            onChange={(v) => set("tokenTtl", v)}
            disabled={saving}
            options={[
              { value: "12h", label: "12 hours" },
              { value: "24h", label: "24 hours" },
              { value: "48h", label: "48 hours" },
              { value: "7d", label: "7 days" },
            ]}
            ariaLabel="Entry token TTL"
          />
          <div className="fs-field-helper hint">
            How long jury entry tokens remain valid after generation.
          </div>
        </div>
        <div
          style={{
            border: "1px solid rgba(96,165,250,0.2)",
            background: "linear-gradient(180deg, rgba(59,130,246,0.08) 0%, rgba(15,23,42,0.02) 100%)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 12px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(59,130,246,0.12)",
                  border: "1px solid rgba(96,165,250,0.24)",
                  color: "var(--accent)",
                }}
              >
                <ShieldAlert size={13} />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 650, color: "var(--text-primary)" }}>
                PIN Lockout Cooldown
              </div>
            </div>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 650,
                letterSpacing: "0.3px",
                textTransform: "uppercase",
                color: "var(--accent)",
                background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(96,165,250,0.24)",
                borderRadius: 999,
                padding: "2px 7px",
              }}
            >
              Risk Control
            </span>
          </div>
          <div className="fs-field-row">
            <label className="fs-label">Cooldown Duration</label>
            <CustomSelect
              value={form.pinLockCooldown}
              onChange={(v) => set("pinLockCooldown", v)}
              disabled={saving}
              options={PIN_LOCK_COOLDOWN_OPTIONS}
              ariaLabel="PIN lock cooldown duration"
            />
          </div>
          <div className="fs-field-helper hint">
            After max failed PIN attempts, juror access is locked for {selectedPinLockCooldown.toLowerCase()}.
          </div>
        </div>

        <SectionLabel>Notifications</SectionLabel>
        <ToggleRow
          title="CC Me on PIN Reset Requests"
          desc="Receive a copy when a juror requests a PIN reset"
          checked={form.ccOnPinReset}
          onChange={(v) => set("ccOnPinReset", v)}
          disabled={saving}
        />
        <ToggleRow
          title="CC Me on Score Edit Requests"
          desc="Receive a copy when a juror requests score editing"
          checked={form.ccOnScoreEdit}
          onChange={(v) => set("ccOnScoreEdit", v)}
          disabled={saving}
        />
      </div>

      <div className="fs-drawer-footer">
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button
          ref={saveBtnRef}
          className="fs-btn fs-btn-primary"
          type="button"
          onClick={handleSave}
          disabled={saving}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={saving} loadingText="Saving…">Save Policy</AsyncButtonContent>
          </span>
        </button>
      </div>
    </Drawer>
  );
}
