// src/admin/drawers/SecurityPolicyDrawer.jsx
// Drawer: edit platform-wide security policy (Super Admin only).
//
// Three sections:
//   1. Authentication Methods — Google OAuth, Email/Password, Remember Me
//      + safeguard: at least one of Google OAuth or Email/Password must be on
//      + typed-confirmation dialog when the save transitions from both
//      methods on to only one on (prevents accidental lockout)
//   2. QR Access — QR Code TTL, Max PIN Attempts, PIN Lockout Cooldown
//   3. Notifications — master "CC Super Admin on All Notifications" toggle
//      + five granular child toggles (PIN Reset, Score Edit, Tenant
//      Application, Maintenance, Password Changed)
//
// Props:
//   open    — boolean
//   onClose — () => void
//   policy  — eleven-key policy (see DEFAULT_POLICY below)
//   onSave  — (policy) => Promise<void>
//   error   — string | null

import { useState, useEffect } from "react";
import { AlertCircle, ShieldAlert, Icon } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import CustomSelect from "@/shared/ui/CustomSelect";
import DisableAuthMethodModal from "../modals/DisableAuthMethodModal";
import useShakeOnError from "@/shared/hooks/useShakeOnError";

const DEFAULT_POLICY = {
  googleOAuth: true,
  emailPassword: true,
  rememberMe: true,
  qrTtl: "24h",
  maxPinAttempts: 5,
  pinLockCooldown: "30m",
  ccOnPinReset: true,
  ccOnScoreEdit: false,
  ccOnTenantApplication: true,
  ccOnMaintenance: true,
  ccOnPasswordChanged: true,
};

const QR_TTL_OPTIONS = [
  { value: "12h", label: "12 hours" },
  { value: "24h", label: "24 hours" },
  { value: "48h", label: "48 hours" },
  { value: "7d", label: "7 days" },
];

const PIN_LOCK_COOLDOWN_OPTIONS = [
  { value: "5m", label: "5 minutes" },
  { value: "10m", label: "10 minutes" },
  { value: "15m", label: "15 minutes" },
  { value: "30m", label: "30 minutes" },
  { value: "60m", label: "60 minutes" },
];

function Toggle({ checked, onChange, disabled, indeterminate = false }) {
  const trackBg = checked ? "var(--accent)" : "var(--surface-2)";
  const trackOpacity = indeterminate ? 0.5 : 1;
  const thumbX = indeterminate ? 8 : checked ? 16 : 0;

  return (
    <label
      style={{
        position: "relative",
        width: 38,
        height: 22,
        cursor: disabled ? "not-allowed" : "pointer",
        flexShrink: 0,
      }}
      onClick={(e) => {
        e.preventDefault();
        if (!disabled) onChange(!checked);
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: trackBg,
          borderRadius: 11,
          transition: "background .2s, opacity .2s",
          opacity: trackOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 2,
          left: 2,
          width: 18,
          height: 18,
          background: "white",
          borderRadius: "50%",
          transition: "transform .2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transform: `translateX(${thumbX}px)`,
        }}
      />
    </label>
  );
}

function ToggleRow({ title, desc, checked, onChange, disabled, indeterminate = false }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
        <div className="text-xs text-muted" style={{ marginTop: 2 }}>{desc}</div>
      </div>
      <Toggle
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        indeterminate={indeterminate}
      />
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 650,
        color: "var(--text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        marginBottom: -4,
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
  const [soleAuthConfirmOpen, setSoleAuthConfirmOpen] = useState(false);

  const selectedPinLockCooldown =
    PIN_LOCK_COOLDOWN_OPTIONS.find((opt) => opt.value === form.pinLockCooldown)?.label ||
    "30 minutes";

  useEffect(() => {
    if (open) {
      setForm({ ...DEFAULT_POLICY, ...policy });
      setSaveError("");
      setSaving(false);
      setSoleAuthConfirmOpen(false);
    }
  }, [open, policy]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // Master CC toggle derived state
  const ccChildren = [
    form.ccOnPinReset,
    form.ccOnScoreEdit,
    form.ccOnTenantApplication,
    form.ccOnMaintenance,
    form.ccOnPasswordChanged,
  ];
  const ccAllOn = ccChildren.every(Boolean);
  const ccAnyOn = ccChildren.some(Boolean);
  const ccMixed = ccAnyOn && !ccAllOn;

  const handleMasterToggle = () => {
    const next = !ccAllOn;
    setForm((f) => ({
      ...f,
      ccOnPinReset: next,
      ccOnScoreEdit: next,
      ccOnTenantApplication: next,
      ccOnMaintenance: next,
      ccOnPasswordChanged: next,
    }));
  };

  // Detect a transition from "both auth methods on" → "only one on".
  // This is the point where we force a typed confirmation because a
  // super admin is about to cut off one way of signing in.
  const prevGoogle = policy?.googleOAuth ?? true;
  const prevEmail = policy?.emailPassword ?? true;
  const bothWereOn = prevGoogle && prevEmail;
  const onlyOneNowOn =
    (form.googleOAuth && !form.emailPassword) ||
    (!form.googleOAuth && form.emailPassword);
  const needsSoleAuthConfirm = bothWereOn && onlyOneNowOn;

  const disabledMethod = !form.emailPassword ? "Email/Password" : "Google OAuth";
  const remainingMethod = form.googleOAuth ? "Google OAuth" : "Email/Password";

  const performSave = async () => {
    setSaveError("");
    setSaving(true);
    try {
      await onSave?.({ ...form });
      onClose();
    } catch (e) {
      setSaveError(e?.message || "Something went wrong.");
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaveError("");
    // Safeguard: at least one authentication method must remain enabled.
    if (!form.googleOAuth && !form.emailPassword) {
      setSaveError("At least one authentication method must remain enabled.");
      return;
    }
    if (needsSoleAuthConfirm) {
      setSoleAuthConfirmOpen(true);
      return;
    }
    await performSave();
  };

  // The modal drives its own close on success and stays open if performSave
  // throws, so we just forward the call here.
  const handleSoleAuthConfirm = async () => {
    await performSave();
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
                width: 36,
                height: 36,
                borderRadius: 9,
                display: "grid",
                placeItems: "center",
                background: "rgba(217,119,6,0.08)",
                border: "1px solid rgba(217,119,6,0.12)",
              }}
            >
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--warning)"
                strokeWidth="2"
                style={{ width: 17, height: 17 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </Icon>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Security Policy</div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                Platform-wide authentication, access, and notifications
              </div>
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
        {displayError && (
          <div className="fs-alert danger" style={{ marginBottom: 4 }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">{displayError}</div>
          </div>
        )}

        {/* ── Section 1: Authentication Methods ─────────────────────────── */}
        <SectionLabel>Authentication Methods</SectionLabel>
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

        {/* ── Section 2: QR Access ──────────────────────────────────────── */}
        <SectionLabel>QR Access</SectionLabel>
        <div
          style={{
            border: "1px solid rgba(96,165,250,0.2)",
            background: "linear-gradient(180deg, rgba(59,130,246,0.08) 0%, rgba(15,23,42,0.02) 100%)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 12px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
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
                Jury QR Controls
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

          <div className="fs-field">
            <label className="fs-field-label">QR Code TTL</label>
            <CustomSelect
              value={form.qrTtl}
              onChange={(v) => set("qrTtl", v)}
              disabled={saving}
              options={QR_TTL_OPTIONS}
              ariaLabel="QR code TTL"
            />
            <div className="fs-field-helper hint">
              How long jury QR codes remain valid after generation.
            </div>
          </div>

          <div className="fs-field">
            <label className="fs-field-label">Max PIN Attempts</label>
            <input
              className="fs-input"
              type="number"
              value={form.maxPinAttempts}
              onChange={(e) => set("maxPinAttempts", Number(e.target.value))}
              min={3}
              max={20}
              disabled={saving}
            />
            <div className="fs-field-helper hint">
              Number of failed PIN attempts before a juror is locked out.
            </div>
          </div>

          <div className="fs-field">
            <label className="fs-field-label">PIN Lockout Cooldown</label>
            <CustomSelect
              value={form.pinLockCooldown}
              onChange={(v) => set("pinLockCooldown", v)}
              disabled={saving}
              options={PIN_LOCK_COOLDOWN_OPTIONS}
              ariaLabel="PIN lock cooldown duration"
            />
            <div className="fs-field-helper hint">
              After max failed PIN attempts, juror access is locked for {selectedPinLockCooldown.toLowerCase()}.
            </div>
          </div>
        </div>

        {/* ── Section 3: Notifications ──────────────────────────────────── */}
        <SectionLabel>Notifications</SectionLabel>
        <ToggleRow
          title="CC Super Admin on All Notifications"
          desc="Toggle all five notification CC flags at once"
          checked={ccAllOn}
          onChange={handleMasterToggle}
          disabled={saving}
          indeterminate={ccMixed}
        />
        <ToggleRow
          title="PIN Reset Requests"
          desc="Receive a copy when a juror requests a PIN reset"
          checked={form.ccOnPinReset}
          onChange={(v) => set("ccOnPinReset", v)}
          disabled={saving}
        />
        <ToggleRow
          title="Score Edit Requests"
          desc="Receive a copy when a juror requests score editing"
          checked={form.ccOnScoreEdit}
          onChange={(v) => set("ccOnScoreEdit", v)}
          disabled={saving}
        />
        <ToggleRow
          title="Tenant Application Events"
          desc="Receive a copy when a tenant application is submitted, approved, or rejected"
          checked={form.ccOnTenantApplication}
          onChange={(v) => set("ccOnTenantApplication", v)}
          disabled={saving}
        />
        <ToggleRow
          title="Maintenance Notifications"
          desc="Receive a copy when platform maintenance windows are announced"
          checked={form.ccOnMaintenance}
          onChange={(v) => set("ccOnMaintenance", v)}
          disabled={saving}
        />
        <ToggleRow
          title="Password Changed"
          desc="Receive a copy when an admin changes their account password"
          checked={form.ccOnPasswordChanged}
          onChange={(v) => set("ccOnPasswordChanged", v)}
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
      <DisableAuthMethodModal
        open={soleAuthConfirmOpen}
        onClose={() => setSoleAuthConfirmOpen(false)}
        disabledMethod={disabledMethod}
        remainingMethod={remainingMethod}
        onConfirm={handleSoleAuthConfirm}
      />
    </Drawer>
  );
}
