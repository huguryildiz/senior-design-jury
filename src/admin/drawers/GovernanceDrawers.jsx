// src/admin/drawers/GovernanceDrawers.jsx
// Six super-admin governance drawers:
//   GlobalSettingsDrawer, AuditCenterDrawer, ExportBackupDrawer,
//   MaintenanceDrawer, FeatureFlagsDrawer, SystemHealthDrawer
// Prototype: vera-premium-prototype.html lines 25671–26130

import { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, AlertCircle, Settings, Download, Wrench, Activity } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import FbAlert from "@/shared/ui/FbAlert";
import { useToast } from "@/shared/hooks/useToast";
import useShakeOnError from "@/shared/hooks/useShakeOnError";
import { supabase } from "@/shared/lib/supabaseClient";
import { invokeEdgeFunction } from "@/shared/api/core/invokeEdgeFunction";
import { getMaintenanceConfig, setMaintenance, cancelMaintenance, getActiveJurorCount, sendTestMaintenanceEmail } from "@/shared/api/admin/maintenance";
import { getPlatformSettings, setPlatformSettings } from "@/shared/api/admin/platform";
import { listOrganizationsPublic } from "@/shared/api/admin/organizations";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import CustomSelect from "@/shared/ui/CustomSelect";

// ── Shared primitives ──────────────────────────────────────────

function SectionLabel({ children, style }) {
  return (
    <div
      style={{
        fontSize: 12, fontWeight: 650, color: "var(--text-secondary)",
        textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: -4,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

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
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "transform .2s",
          transform: checked ? "translateX(16px)" : "translateX(0)",
        }}
      />
    </label>
  );
}

function ToggleRow({ title, desc, checked, onChange, disabled, badge }) {
  const isOn = checked;
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px",
        border: isOn ? "1px solid rgba(22,163,74,0.15)" : "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: isOn ? "rgba(22,163,74,0.03)" : undefined,
      }}
    >
      <div style={{ flex: 1, marginRight: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
        <div className="text-xs text-muted" style={{ marginTop: 2 }}>{desc}</div>
        {badge && <span className={`badge badge-${badge.type}`} style={{ fontSize: 9, marginTop: 4, display: "inline-block" }}>{badge.label}</span>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function DrawerHeader({ icon, iconStroke, title, subtitle, onClose }) {
  return (
    <div className="fs-drawer-header">
      <div className="fs-drawer-header-row">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="vera-icon-surface" style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, padding: 9 }}>
            {icon(iconStroke)}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{title}</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{subtitle}</div>
          </div>
        </div>
        <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── 1. Global Settings ─────────────────────────────────────────

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const DEFAULT_PLATFORM_SETTINGS = {
  platform_name: "VERA Evaluation Platform",
  support_email: "support@vera-eval.app",
  auto_approve_new_orgs: false,
};

function formatRelativeUpdatedAt(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Date.now() - then;
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

export function GlobalSettingsDrawer({ open, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState(DEFAULT_PLATFORM_SETTINGS);
  const [initial, setInitial] = useState(DEFAULT_PLATFORM_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Load current settings whenever the drawer opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setSaveError("");
    getPlatformSettings()
      .then((data) => {
        if (cancelled) return;
        const next = {
          platform_name: data?.platform_name ?? DEFAULT_PLATFORM_SETTINGS.platform_name,
          support_email: data?.support_email ?? DEFAULT_PLATFORM_SETTINGS.support_email,
          auto_approve_new_orgs: Boolean(data?.auto_approve_new_orgs),
        };
        setForm(next);
        setInitial(next);
        setUpdatedAt(data?.updated_at ?? null);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e?.message || "Failed to load platform settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const nameError =
    form.platform_name.trim().length === 0
      ? "Platform name is required."
      : form.platform_name.length > 100
      ? "Platform name must be 100 characters or fewer."
      : "";
  const emailError =
    form.support_email.trim().length === 0
      ? "Support email is required."
      : !EMAIL_RE.test(form.support_email.trim())
      ? "Enter a valid email address."
      : "";

  const isDirty =
    form.platform_name !== initial.platform_name ||
    form.support_email !== initial.support_email ||
    form.auto_approve_new_orgs !== initial.auto_approve_new_orgs;

  const canSave = !loading && !saving && !nameError && !emailError && isDirty;

  const saveBtnRef = useShakeOnError(saveError);

  const handleSave = async () => {
    if (!canSave) return;
    setSaveError("");
    setSaving(true);
    try {
      await setPlatformSettings({
        platform_name: form.platform_name.trim(),
        support_email: form.support_email.trim(),
        auto_approve_new_orgs: form.auto_approve_new_orgs,
      });
      toast.success("Global settings saved");
      onClose();
    } catch (e) {
      setSaveError(e?.message || "Failed to save platform settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleCloseAttempt = () => {
    if (isDirty && !saving) {
      const discard = window.confirm("You have unsaved changes. Discard them?");
      if (!discard) return;
    }
    onClose();
  };

  const lastUpdatedLabel = formatRelativeUpdatedAt(updatedAt);

  return (
    <Drawer open={open} onClose={handleCloseAttempt}>
      <DrawerHeader
        icon={(stroke) => <Settings size={17} stroke={stroke} strokeWidth={2} />}
        iconStroke="var(--accent)"
        title="Global Settings"
        subtitle="Platform-wide defaults and configuration"
        onClose={handleCloseAttempt}
      />
      <div className="fs-drawer-body" style={{ gap: 16 }}>
        {loadError && <FbAlert variant="danger">{loadError}</FbAlert>}
        {saveError && <FbAlert variant="danger">{saveError}</FbAlert>}

        <SectionLabel>Platform Identity</SectionLabel>
        <div className="fs-field">
          <label className="fs-field-label">Platform Name</label>
          <input
            className={`fs-input${nameError && form.platform_name !== initial.platform_name ? " fs-input-error" : ""}`}
            type="text"
            maxLength={100}
            value={form.platform_name}
            onChange={(e) => set("platform_name", e.target.value)}
            disabled={loading || saving}
            placeholder="VERA Evaluation Platform"
          />
          <div className="fs-field-helper hint">Shown in email templates and future login/landing surfaces.</div>
        </div>
        <div className="fs-field">
          <label className="fs-field-label">Support Email</label>
          <input
            className={`fs-input${emailError && form.support_email !== initial.support_email ? " fs-input-error" : ""}`}
            type="email"
            value={form.support_email}
            onChange={(e) => set("support_email", e.target.value)}
            disabled={loading || saving}
            placeholder="support@vera-eval.app"
          />
          <div className="fs-field-helper hint">Contact address included in notification email footers.</div>
        </div>

        <SectionLabel style={{ marginTop: 4 }}>Organization Settings</SectionLabel>
        <ToggleRow
          title="Auto-approve New Organizations"
          desc="Skip manual review for new org applications"
          checked={form.auto_approve_new_orgs}
          onChange={() => {}}
          disabled
        />
        <div className="fs-field-helper hint" style={{ marginTop: -8 }}>
          <AlertCircle size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} />
          Automatic approval wiring coming in v2.
        </div>

        <SectionLabel style={{ marginTop: 4 }}>Localization</SectionLabel>
        <div className="fs-field">
          <label className="fs-field-label">Platform Language</label>
          <CustomSelect
            value="en"
            onChange={() => {}}
            disabled
            options={[{ value: "en", label: "English" }]}
            ariaLabel="Platform language"
          />
          <div className="fs-field-helper hint">
            <AlertCircle size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} />
            Turkish and multi-language support coming in v2.
          </div>
        </div>

        {lastUpdatedLabel && (
          <div
            className="text-xs text-muted"
            style={{
              marginTop: 4,
              paddingTop: 10,
              borderTop: "1px dashed var(--border)",
              textAlign: "right",
            }}
          >
            Last updated {lastUpdatedLabel}
          </div>
        )}
      </div>
      <div className="fs-drawer-footer">
        <button
          className="fs-btn fs-btn-secondary"
          type="button"
          onClick={handleCloseAttempt}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          ref={saveBtnRef}
          className="fs-btn fs-btn-primary"
          type="button"
          onClick={handleSave}
          disabled={!canSave}
        >
          <AsyncButtonContent loading={saving} loadingText="Saving…">
            Save Settings
          </AsyncButtonContent>
        </button>
      </div>
    </Drawer>
  );
}

// ── 2. Audit Center — REMOVED (redundant with /audit page) ────

// ── 3. Export & Backup ─────────────────────────────────────────

const RECENT_BACKUPS = [
  { name: "full-backup-20260329.sql", size: "42.3 MB", date: "Mar 29, 2026 at 02:00" },
  { name: "full-backup-20260322.sql", size: "41.8 MB", date: "Mar 22, 2026 at 02:00" },
  { name: "full-backup-20260315.sql", size: "40.1 MB", date: "Mar 15, 2026 at 02:00" },
];

export function ExportBackupDrawer({ open, onClose }) {
  const toast = useToast();
  const [format, setFormat] = useState("sql");
  return (
    <Drawer open={open} onClose={onClose}>
      <DrawerHeader
        icon={(stroke) => <Download size={17} stroke={stroke} strokeWidth={2} />}
        iconStroke="var(--accent)"
        title="Export & Backup"
        subtitle="Platform-wide data export and backup controls"
        onClose={onClose}
      />
      <div className="fs-drawer-body" style={{ gap: 14 }}>
        <SectionLabel>Export Scope</SectionLabel>
        <div className="fs-field">
          <label className="fs-field-label">Organization</label>
          <CustomSelect
            value="All Organizations"
            onChange={() => {}}
            options={[
              { value: "All Organizations", label: "All Organizations" },
              { value: "TEDU-EE", label: "TEDU-EE" },
              { value: "BOUN-CHEM", label: "BOUN-CHEM" },
              { value: "METU-IE", label: "METU-IE" },
            ]}
            ariaLabel="Organization"
          />
        </div>
        <div className="fs-field">
          <label className="fs-field-label">Data Type</label>
          <CustomSelect
            value="Full Database Backup"
            onChange={() => {}}
            options={[
              { value: "Full Database Backup", label: "Full Database Backup" },
              { value: "Scores Only", label: "Scores Only" },
              { value: "User & Membership Data", label: "User & Membership Data" },
              { value: "Audit Logs", label: "Audit Logs" },
              { value: "Configuration", label: "Configuration" },
            ]}
            ariaLabel="Data type"
          />
        </div>
        <div className="fs-field">
          <label className="fs-field-label">Format</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[["sql", "SQL Dump"], ["csv", "CSV"], ["json", "JSON"]].map(([val, label]) => (
              <label
                key={val}
                style={{
                  display: "flex", alignItems: "center", gap: 6, fontSize: 12.5,
                  cursor: "pointer", padding: "8px 14px",
                  border: format === val ? "1px solid rgba(59,130,246,0.25)" : "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)", flex: 1,
                  background: format === val ? "rgba(59,130,246,0.04)" : undefined,
                }}
              >
                <input
                  type="radio"
                  name="export-fmt"
                  value={val}
                  checked={format === val}
                  onChange={() => setFormat(val)}
                  style={{ accentColor: "var(--accent)" }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <SectionLabel style={{ marginTop: 4 }}>Recent Backups</SectionLabel>
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
          {RECENT_BACKUPS.map((b, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 12px",
                borderBottom: i < RECENT_BACKUPS.length - 1 ? "1px solid var(--border)" : undefined,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{b.name}</div>
                <div className="text-xs text-muted">{b.size} · {b.date}</div>
              </div>
              <button
                className="btn btn-outline btn-sm"
                style={{ fontSize: 10, padding: "4px 10px" }}
                onClick={() => toast.success("Download started")}
              >
                Download
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="fs-drawer-footer">
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose}>Cancel</button>
        <button
          className="fs-btn fs-btn-primary"
          type="button"
          onClick={() => { toast.success("Export started"); onClose(); }}
        >
          Start Export
        </button>
      </div>
    </Drawer>
  );
}

// ── 4. Maintenance ─────────────────────────────────────────────

// Default start time: next 3am (local time)
function defaultStartTime() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(3, 0, 0, 0);
  return d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
}

const DURATION_OPTIONS = [
  { label: "30 minutes", value: 30 },
  { label: "1 hour",     value: 60 },
  { label: "2 hours",    value: 120 },
  { label: "4 hours",    value: 240 },
  { label: "Until manually lifted", value: null },
];

export function MaintenanceDrawer({ open, onClose }) {
  const toast = useToast();
  const [mode, setMode] = useState("scheduled");
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [durationMin, setDurationMin] = useState(30);
  const [message, setMessage] = useState("VERA is undergoing scheduled maintenance. We'll be back shortly.");
  const [notifyAdmins, setNotifyAdmins] = useState(true);
  const [currentStatus, setCurrentStatus] = useState(null); // loaded from DB
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [activeJurorCount, setActiveJurorCount] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [orgScope, setOrgScope] = useState("all"); // "all" | "specific"
  const [affectedOrgIds, setAffectedOrgIds] = useState([]);
  const [sendingTest, setSendingTest] = useState(false);

  // Load current config, active juror count, and org list when drawer opens
  useEffect(() => {
    if (!open) return;
    getMaintenanceConfig()
      .then((cfg) => {
        setCurrentStatus(cfg);
        if (cfg) {
          setMode(cfg.mode || "scheduled");
          setMessage(cfg.message || message);
          setNotifyAdmins(cfg.notify_admins ?? true);
          if (cfg.start_time) {
            setStartTime(new Date(cfg.start_time).toISOString().slice(0, 16));
          }
          if (cfg.affected_org_ids?.length) {
            setOrgScope("specific");
            setAffectedOrgIds(cfg.affected_org_ids);
          } else {
            setOrgScope("all");
            setAffectedOrgIds([]);
          }
        }
      })
      .catch(() => {}); // non-critical — drawer still works without pre-fill
    getActiveJurorCount()
      .then(setActiveJurorCount)
      .catch(() => setActiveJurorCount(null));
    listOrganizationsPublic()
      .then(setOrgs)
      .catch(() => setOrgs([]));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSchedule() {
    setSaving(true);
    try {
      const result = await setMaintenance({
        mode,
        startTime: mode === "scheduled" ? new Date(startTime).toISOString() : null,
        durationMin,
        message,
        affectedOrgIds: orgScope === "specific" && affectedOrgIds.length > 0 ? affectedOrgIds : null,
        notifyAdmins,
      });
      const label = mode === "immediate" ? "Maintenance activated" : "Maintenance scheduled";
      if (notifyAdmins && result?.mailResult) {
        const { sent, total, errors } = result.mailResult;
        if (!errors?.length) {
          toast.success(`${label} — email sent to ${sent}/${total} org admins`);
        } else {
          toast.warning(`${label} — email sent to ${sent}/${total} org admins (${errors.length} failed)`);
        }
      } else {
        toast.success(label);
      }
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to set maintenance mode");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    setSendingTest(true);
    try {
      await sendTestMaintenanceEmail({
        mode,
        startTime: mode === "scheduled" ? new Date(startTime).toISOString() : null,
        message,
      });
      toast.success("Test email sent to your inbox");
    } catch (err) {
      toast.error(err?.message || "Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancelMaintenance();
      toast.success("Maintenance cancelled");
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to cancel maintenance");
    } finally {
      setCancelling(false);
    }
  }

  const isCurrentlyActive = currentStatus?.is_active;

  return (
    <Drawer open={open} onClose={onClose}>
      <DrawerHeader
        icon={(stroke) => <Wrench size={17} stroke={stroke} strokeWidth={2} />}
        iconStroke="var(--warning)"
        title="Maintenance Mode"
        subtitle="Schedule or activate platform maintenance"
        onClose={onClose}
      />
      <div className="fs-drawer-body" style={{ gap: 16 }}>
        {/* Active status banner */}
        {isCurrentlyActive && (
          <FbAlert variant="danger" title="Maintenance is currently active" style={{ margin: 0 }}>
            Users cannot access the platform right now.
          </FbAlert>
        )}

        {/* Active juror safety warning */}
        {activeJurorCount > 0 && !isCurrentlyActive && (
          <FbAlert variant="warning" title={`${activeJurorCount} juror${activeJurorCount === 1 ? "" : "s"} currently scoring`} style={{ margin: 0 }}>
            Activating maintenance will interrupt their active sessions.
          </FbAlert>
        )}

        <FbAlert variant="warning" title="Maintenance blocks all user access" style={{ margin: 0 }}>
          Jurors and org admins will see a maintenance page. Only super admins retain access.
        </FbAlert>

        <div className="fs-field">
          <label className="fs-field-label">Mode</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[["scheduled", "Scheduled", "rgba(217,119,6,0.04)", "rgba(217,119,6,0.25)"], ["immediate", "Immediate", "rgba(239,68,68,0.04)", "rgba(239,68,68,0.25)"]].map(([val, label, bg, border]) => (
              <label
                key={val}
                style={{
                  display: "flex", alignItems: "center", gap: 6, fontSize: 12.5,
                  cursor: "pointer", padding: "8px 14px", flex: 1,
                  border: mode === val ? `1px solid ${border}` : "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background: mode === val ? bg : undefined,
                }}
              >
                <input
                  type="radio"
                  name="maint-mode"
                  value={val}
                  checked={mode === val}
                  onChange={() => setMode(val)}
                  style={{ accentColor: val === "scheduled" ? "var(--warning)" : "var(--danger)" }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {mode === "scheduled" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="fs-field">
              <label className="fs-field-label">Start Time</label>
              <input
                className="fs-input"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="fs-field">
              <label className="fs-field-label">Estimated Duration</label>
              <CustomSelect
                value={durationMin ?? ""}
                onChange={(v) => setDurationMin(v === "" ? null : Number(v))}
                options={DURATION_OPTIONS.map((o) => ({ value: o.value ?? "", label: o.label }))}
                ariaLabel="Estimated duration"
              />
            </div>
          </div>
        )}

        {mode === "immediate" && (
          <div className="fs-field">
            <label className="fs-field-label">Estimated Duration</label>
            <CustomSelect
              value={durationMin ?? ""}
              onChange={(v) => setDurationMin(v === "" ? null : Number(v))}
              options={DURATION_OPTIONS.map((o) => ({ value: o.value ?? "", label: o.label }))}
              ariaLabel="Estimated duration"
            />
          </div>
        )}

        <div className="fs-field">
          <label className="fs-field-label">Maintenance Message</label>
          <textarea
            className="fs-input"
            rows={2}
            style={{ resize: "vertical" }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {/* Affected organizations */}
        <div className="fs-field">
          <label className="fs-field-label">Affected Organizations</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {[["all", "All organizations"], ["specific", "Specific organizations"]].map(([val, label]) => (
              <label
                key={val}
                style={{
                  display: "flex", alignItems: "center", gap: 6, fontSize: 12.5,
                  cursor: "pointer", padding: "7px 12px", flex: 1,
                  border: orgScope === val ? "1px solid var(--accent)" : "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background: orgScope === val ? "rgba(99,102,241,0.06)" : undefined,
                }}
              >
                <input
                  type="radio"
                  name="maint-org-scope"
                  value={val}
                  checked={orgScope === val}
                  onChange={() => { setOrgScope(val); if (val === "all") setAffectedOrgIds([]); }}
                  style={{ accentColor: "var(--accent)" }}
                />
                {label}
              </label>
            ))}
          </div>
          {orgScope === "specific" && (
            <div style={{
              maxHeight: 160, overflowY: "auto", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", padding: "4px 0",
            }}>
              {orgs.length === 0 ? (
                <div style={{ padding: "10px 14px", fontSize: 12.5, color: "var(--text-tertiary)" }}>
                  No active organizations found
                </div>
              ) : orgs.map((org) => (
                <label
                  key={org.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 14px", cursor: "pointer", fontSize: 13,
                    background: affectedOrgIds.includes(org.id) ? "rgba(99,102,241,0.06)" : undefined,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={affectedOrgIds.includes(org.id)}
                    onChange={(e) => setAffectedOrgIds(
                      e.target.checked
                        ? [...affectedOrgIds, org.id]
                        : affectedOrgIds.filter((id) => id !== org.id)
                    )}
                    style={{ accentColor: "var(--accent)", flexShrink: 0 }}
                  />
                  <span style={{ fontWeight: 500 }}>{org.name}</span>
                  {org.code && (
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: "auto" }}>{org.code}</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        <ToggleRow
          title="Notify Org Admins"
          desc="Send email notification before maintenance starts"
          checked={notifyAdmins}
          onChange={setNotifyAdmins}
        />
      </div>

      <div className="fs-drawer-footer">
        {isCurrentlyActive ? (
          <>
            <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose}>Close</button>
            <button
              className="fs-btn"
              type="button"
              style={{ background: "var(--danger)", color: "white", border: "none" }}
              disabled={cancelling}
              onClick={handleCancel}
            >
              <span className="btn-loading-content">
                <AsyncButtonContent loading={cancelling} loadingText="Cancelling…">Cancel Maintenance</AsyncButtonContent>
              </span>
            </button>
          </>
        ) : (
          <>
            <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose}>Cancel</button>
            <button
              className="fs-btn fs-btn-secondary"
              type="button"
              disabled={sendingTest}
              onClick={handleSendTest}
              title="Send a test email to your inbox without changing any DB state"
            >
              <AsyncButtonContent loading={sendingTest} loadingText="Sending…">Test Email</AsyncButtonContent>
            </button>
            <button
              className="fs-btn"
              type="button"
              style={{ background: mode === "immediate" ? "var(--danger)" : "var(--warning)", color: "white", border: "none" }}
              disabled={saving}
              onClick={handleSchedule}
            >
              <span className="btn-loading-content">
                <AsyncButtonContent loading={saving} loadingText="Saving…">
                  {mode === "immediate" ? "Activate Now" : "Schedule Maintenance"}
                </AsyncButtonContent>
              </span>
            </button>
          </>
        )}
      </div>
    </Drawer>
  );
}

// ── 6. System Health ───────────────────────────────────────────

function loadHistory() {
  try { return JSON.parse(localStorage.getItem("vera_health_history") || "[]"); }
  catch { return []; }
}

function saveHistory(h) {
  localStorage.setItem("vera_health_history", JSON.stringify(h.slice(-20)));
}

function statusColor(ok) {
  return ok ? "var(--success)" : "var(--danger)";
}
function latencyColor(ms) {
  if (ms === null) return "var(--text-tertiary)";
  if (ms < 300) return "var(--success)";
  if (ms < 800) return "var(--warning)";
  return "var(--danger)";
}

async function pingDb() {
  const t0 = performance.now();
  const { error } = await supabase.from("organizations").select("id").limit(1);
  const latency = Math.round(performance.now() - t0);
  return { ok: !error, latency, errorMsg: error ? (error.message || error.code || "Query failed") : null };
}

async function pingAuth() {
  const t0 = performance.now();
  const { error } = await supabase.auth.getSession();
  const latency = Math.round(performance.now() - t0);
  return { ok: !error, latency, errorMsg: error ? (error.message || "Auth failed") : null };
}

async function pingMetrics() {
  const t0 = performance.now();
  try {
    const { data, error } = await invokeEdgeFunction("platform-metrics", {});
    const latency = Math.round(performance.now() - t0);
    if (error) return { ok: false, latency, data: null, errorMsg: error.message || "Edge Function failed" };
    return { ok: true, latency, data, errorMsg: null };
  } catch (e) {
    const latency = Math.round(performance.now() - t0);
    return { ok: false, latency, data: null, errorMsg: e?.message || "Edge Function unreachable" };
  }
}

export function SystemHealthDrawer({ open, onClose }) {
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState(null);
  const [health, setHealth] = useState({
    api:         { ok: null, latency: null, errorMsg: null },
    db:          { ok: null, latency: null, errorMsg: null },
    auth:        { ok: null, latency: null, errorMsg: null },
    edge:        { ok: null, latency: null, errorMsg: null },
    metricsData: null,
  });
  const [history, setHistory] = useState(loadHistory);

  const runChecks = useCallback(async () => {
    setChecking(true);
    const [db, auth, metrics] = await Promise.all([pingDb(), pingAuth(), pingMetrics()]);
    setHealth({
      api:         { ok: db.ok, latency: db.latency, errorMsg: db.errorMsg ? `API: ${db.errorMsg}` : null },
      db:          { ok: db.ok, latency: db.latency, errorMsg: db.errorMsg ? `DB: ${db.errorMsg}` : null },
      auth:        { ok: auth.ok, latency: auth.latency, errorMsg: auth.errorMsg ? `Auth: ${auth.errorMsg}` : null },
      edge:        { ok: metrics.ok, latency: metrics.latency, errorMsg: metrics.errorMsg ? `Edge Functions: ${metrics.errorMsg}` : null },
      metricsData: metrics.data,
    });
    setHistory((prev) => {
      const next = [...prev, { ts: Date.now(), dbMs: db.latency, authMs: auth.latency, edgeMs: metrics.latency }];
      saveHistory(next);
      return next;
    });
    setCheckedAt(new Date());
    setChecking(false);
  }, []);

  useEffect(() => {
    if (open) runChecks();
  }, [open, runChecks]);

  const avgLatency = (() => {
    const vals = [health.api.latency, health.db.latency, health.auth.latency, health.edge.latency].filter((v) => v !== null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  })();

  const allOk = [health.api.ok, health.db.ok, health.auth.ok, health.edge.ok].every((v) => v === true);
  const issues = [health.api.errorMsg, health.db.errorMsg, health.auth.errorMsg, health.edge.errorMsg].filter(Boolean);

  const m = health.metricsData;

  const SERVICES = [
    { label: "API Status",     ok: health.api.ok,  statusOk: "Operational", statusErr: "Unreachable" },
    { label: "Database",       ok: health.db.ok,   statusOk: "Healthy",     statusErr: "Degraded"    },
    { label: "Edge Functions", ok: health.edge.ok, statusOk: "Running",     statusErr: "Degraded"    },
    { label: "Auth Service",   ok: health.auth.ok, statusOk: "Active",      statusErr: "Degraded"    },
  ];

  const PERF = [
    {
      label: "Avg Response Time",
      value: avgLatency !== null ? `${avgLatency}ms` : "—",
      color: latencyColor(avgLatency),
    },
    {
      label: "DB Latency",
      value: health.db.latency !== null ? `${health.db.latency}ms` : "—",
      color: latencyColor(health.db.latency),
    },
    {
      label: "Auth Latency",
      value: health.auth.latency !== null ? `${health.auth.latency}ms` : "—",
      color: latencyColor(health.auth.latency),
    },
    {
      label: "Active Connections",
      value: m?.active_connections != null ? String(m.active_connections) : "—",
      color: undefined,
    },
    {
      label: "API Requests (24h)",
      value: m?.audit_requests_24h != null ? m.audit_requests_24h.toLocaleString() : "—",
      color: undefined,
    },
    {
      label: "DB Storage Used",
      value: m?.db_size_pretty ?? "—",
      color: undefined,
    },
  ];

  const refreshedLabel = checking
    ? "Checking…"
    : checkedAt
    ? `Last refreshed: ${checkedAt.toLocaleTimeString()}`
    : "Not yet checked";

  return (
    <Drawer open={open} onClose={onClose}>
      <DrawerHeader
        icon={(stroke) => <Activity size={17} stroke={stroke} strokeWidth={2} />}
        iconStroke="var(--success)"
        title="System Health"
        subtitle="Real-time platform status and performance metrics"
        onClose={onClose}
      />
      <div className="fs-drawer-body" style={{ gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {SERVICES.map((svc) => {
            const ok = svc.ok;
            const loading = ok === null;
            const color = loading ? "var(--text-tertiary)" : statusColor(ok);
            const borderColor = loading ? "var(--border)" : ok ? "rgba(22,163,74,0.15)" : "rgba(225,29,72,0.15)";
            const bg = loading ? undefined : ok ? "rgba(22,163,74,0.03)" : "rgba(225,29,72,0.03)";
            return (
              <div
                key={svc.label}
                style={{ padding: "12px 14px", border: `1px solid ${borderColor}`, borderRadius: "var(--radius-sm)", background: bg }}
              >
                <div className="text-xs text-muted" style={{ marginBottom: 4 }}>{svc.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {loading ? (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--text-tertiary)", opacity: 0.4 }} />
                  ) : (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                  )}
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>
                    {loading ? "Checking…" : ok ? svc.statusOk : svc.statusErr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <SectionLabel style={{ marginTop: 4 }}>Performance (Live Measurements)</SectionLabel>
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden", maxHeight: "50vh", overflowY: "auto" }}>
          {PERF.map((row, i) => (
            <div
              key={row.label}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 14px",
                borderBottom: i < PERF.length - 1 ? "1px solid var(--border)" : undefined,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600 }}>{row.label}</div>
              <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: row.color ?? "var(--text-primary)" }}>
                {checking ? "…" : row.value}
              </span>
            </div>
          ))}
        </div>

        {history.length >= 2 && (
          <>
            <SectionLabel style={{ marginTop: 4 }}>
              Latency Trend — Last {history.length} Check{history.length !== 1 ? "s" : ""}
            </SectionLabel>
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
              <div style={{ display: "flex", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
                {[
                  { color: "#22c55e", label: "DB" },
                  { color: "#60a5fa", label: "Auth" },
                  { color: "#f97316", label: "Edge" },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--text-tertiary)" }}>
                    <div style={{ width: 10, height: 2, borderRadius: 1, background: color }} />
                    {label}
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={90}>
                <AreaChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="shDB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="shEdge" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="ts"
                    tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    tick={{ fontSize: 8, fill: "var(--text-tertiary)" }}
                    height={18}
                  />
                  <YAxis tick={{ fontSize: 9, fill: "var(--text-tertiary)" }} width={32} unit="ms" />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
                    formatter={(v, name) => [`${v}ms`, name]}
                    labelFormatter={() => ""}
                  />
                  <Area type="monotone" dataKey="dbMs" name="DB" stroke="#22c55e" strokeWidth={1.8} fill="url(#shDB)" dot={false} />
                  <Area type="monotone" dataKey="authMs" name="Auth" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="4 2" fill="none" dot={false} />
                  <Area type="monotone" dataKey="edgeMs" name="Edge" stroke="#f97316" strokeWidth={1.8} fill="url(#shEdge)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        <SectionLabel style={{ marginTop: 4 }}>Overall Status</SectionLabel>
        <div style={{ padding: "12px 14px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
          {checking || !checkedAt ? (
            <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Running checks…</div>
          ) : (
            <>
              <div style={{ fontSize: 28, fontWeight: 800, color: allOk ? "var(--success)" : "var(--danger)" }}>
                {allOk ? "All Systems Go" : "Issues Detected"}
              </div>
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                {allOk
                  ? `All ${SERVICES.length} services responding normally`
                  : `${SERVICES.filter((s) => s.ok === false).length} service(s) reporting issues`}
              </div>
              {!allOk && issues.length > 0 && (
                <div style={{ marginTop: 10, textAlign: "left", display: "flex", flexDirection: "column", gap: 5 }}>
                  {issues.map((msg) => (
                    <div
                      key={msg}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 7,
                        padding: "7px 10px",
                        background: "rgba(225,29,72,0.06)",
                        border: "1px solid rgba(225,29,72,0.15)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <AlertCircle size={13} stroke="var(--danger)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 11.5, color: "var(--danger)", fontFamily: "var(--mono)", lineHeight: 1.4 }}>{msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="fs-drawer-footer">
        <div style={{ flex: 1, fontSize: 11, color: "var(--text-tertiary)" }}>{refreshedLabel}</div>
        <button className="fs-btn fs-btn-secondary" type="button" onClick={runChecks} disabled={checking}>
          <span className="btn-loading-content">
            <AsyncButtonContent loading={checking} loadingText="Checking…">Refresh</AsyncButtonContent>
          </span>
        </button>
        <button className="fs-btn fs-btn-primary" type="button" onClick={onClose}>Close</button>
      </div>
    </Drawer>
  );
}
