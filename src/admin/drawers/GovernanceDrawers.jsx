// src/admin/drawers/GovernanceDrawers.jsx
// Six super-admin governance drawers:
//   GlobalSettingsDrawer, AuditCenterDrawer, ExportBackupDrawer,
//   MaintenanceDrawer, FeatureFlagsDrawer, SystemHealthDrawer
// Prototype: vera-premium-prototype.html lines 25671–26130

import { useState, useEffect, useCallback } from "react";
import Drawer from "@/shared/ui/Drawer";
import { useToast } from "@/shared/hooks/useToast";
import { supabase } from "@/shared/lib/supabaseClient";
import { getMaintenanceConfig, setMaintenance, cancelMaintenance } from "@/shared/api/admin/maintenance";

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

function DrawerHeader({ icon, iconBg, iconBorder, iconStroke, title, subtitle, onClose }) {
  return (
    <div className="fs-drawer-header">
      <div className="fs-drawer-header-row">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 9, display: "grid", placeItems: "center",
              background: iconBg, border: `1px solid ${iconBorder}`,
            }}
          >
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

export function GlobalSettingsDrawer({ open, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({
    platformName: "VERA Evaluation Platform",
    supportEmail: "support@vera-eval.app",
    defaultScale: "percentage",
    maxCriteria: 10,
    autoApproveOrgs: false,
    enableDemo: false,
    notificationProvider: "resend",
    sendWelcomeEmails: true,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Drawer open={open} onClose={onClose}>
      <DrawerHeader
        icon={(stroke) => (
          <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" style={{ width: 17, height: 17 }}>
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
        iconBg="rgba(59,130,246,0.08)"
        iconBorder="rgba(59,130,246,0.12)"
        iconStroke="var(--accent)"
        title="Global Settings"
        subtitle="Platform-wide defaults and configuration"
        onClose={onClose}
      />
      <div className="fs-drawer-body" style={{ gap: 16 }}>
        <SectionLabel>Platform Identity</SectionLabel>
        <div className="fs-field-row">
          <label className="fs-label">Platform Name</label>
          <input className="fs-input" type="text" value={form.platformName} onChange={(e) => set("platformName", e.target.value)} />
        </div>
        <div className="fs-field-row">
          <label className="fs-label">Support Email</label>
          <input className="fs-input" type="email" value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
        </div>

        <SectionLabel style={{ marginTop: 4 }}>Default Evaluation Settings</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="fs-field-row">
            <label className="fs-label">Default Scoring Scale</label>
            <select className="fs-input" style={{ cursor: "pointer" }} value={form.defaultScale} onChange={(e) => set("defaultScale", e.target.value)}>
              <option value="percentage">0–100 (Percentage)</option>
              <option value="weighted">0–30 (Weighted)</option>
              <option value="likert">1–5 (Likert)</option>
            </select>
          </div>
          <div className="fs-field-row">
            <label className="fs-label">Max Criteria per Period</label>
            <input className="fs-input" type="number" value={form.maxCriteria} min={3} max={20} onChange={(e) => set("maxCriteria", Number(e.target.value))} />
          </div>
        </div>
        <ToggleRow
          title="Auto-approve New Organizations"
          desc="Skip manual review for new org applications"
          checked={form.autoApproveOrgs}
          onChange={(v) => set("autoApproveOrgs", v)}
        />
        <ToggleRow
          title="Enable Demo Mode"
          desc="Allow demo credentials on login screen"
          checked={form.enableDemo}
          onChange={(v) => set("enableDemo", v)}
        />

        <SectionLabel style={{ marginTop: 4 }}>Email &amp; Notifications</SectionLabel>
        <div className="fs-field-row">
          <label className="fs-label">Notification Provider</label>
          <select className="fs-input" style={{ cursor: "pointer" }} value={form.notificationProvider} onChange={(e) => set("notificationProvider", e.target.value)}>
            <option value="resend">Resend</option>
            <option value="sendgrid">SendGrid</option>
            <option value="ses">AWS SES</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        <ToggleRow
          title="Send Welcome Emails"
          desc="Automatically email new admins upon approval"
          checked={form.sendWelcomeEmails}
          onChange={(v) => set("sendWelcomeEmails", v)}
        />
      </div>
      <div className="fs-drawer-footer">
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose}>Cancel</button>
        <button
          className="fs-btn fs-btn-primary"
          type="button"
          onClick={() => { toast.success("Global settings saved"); onClose(); }}
        >
          Save Settings
        </button>
      </div>
    </Drawer>
  );
}

// ── 2. Audit Center ────────────────────────────────────────────

const AUDIT_EVENTS = [
  { color: "var(--success)", title: "Organization created: BILKENT-CS", meta: "super.admin@vera-platform.io · 2 hours ago", tag: "org.create" },
  { color: "var(--accent)",  title: "Admin approved: Merve Aksoy",        meta: "super.admin@vera-platform.io · 5 hours ago", tag: "admin.approve" },
  { color: "var(--warning)", title: "Security policy updated: token TTL changed", meta: "super.admin@vera-platform.io · 1 day ago", tag: "security.update" },
  { color: "var(--danger)",  title: "Organization disabled: METU-IE",     meta: "super.admin@vera-platform.io · 2 days ago", tag: "org.disable" },
  { color: "var(--success)", title: "Login: selim.karatas@tedu.edu.tr",    meta: "TEDU-EE · 3 days ago",                       tag: "auth.login" },
];

export function AuditCenterDrawer({ open, onClose }) {
  const toast = useToast();
  return (
    <Drawer open={open} onClose={onClose}>
      <DrawerHeader
        icon={(stroke) => (
          <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" style={{ width: 17, height: 17 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        )}
        iconBg="rgba(139,92,246,0.08)"
        iconBorder="rgba(139,92,246,0.12)"
        iconStroke="#8b5cf6"
        title="Audit Center"
        subtitle="Platform-wide activity log and compliance events"
        onClose={onClose}
      />
      <div className="fs-drawer-body" style={{ gap: 10 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <select className="fs-input" style={{ flex: 1, cursor: "pointer", fontSize: 12, padding: "7px 10px" }}>
            <option>All Events</option>
            <option>Authentication</option>
            <option>Organization Changes</option>
            <option>Admin Actions</option>
            <option>Score Modifications</option>
          </select>
          <select className="fs-input" style={{ flex: 1, cursor: "pointer", fontSize: 12, padding: "7px 10px" }}>
            <option>All Organizations</option>
            <option>TEDU-EE</option>
            <option>BOUN-CHEM</option>
            <option>METU-IE</option>
          </select>
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
          {AUDIT_EVENTS.map((ev, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderBottom: i < AUDIT_EVENTS.length - 1 ? "1px solid var(--border)" : undefined,
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: ev.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{ev.title}</div>
                <div className="text-xs text-muted">{ev.meta}</div>
              </div>
              <span className="badge badge-neutral" style={{ fontSize: 9, flexShrink: 0 }}>{ev.tag}</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", padding: "4px 0" }}>
          <span className="text-xs text-muted">Showing 5 of 1,247 events</span>
        </div>
      </div>
      <div className="fs-drawer-footer">
        <button
          className="fs-btn fs-btn-secondary"
          type="button"
          onClick={() => { toast.success("Export started"); onClose(); }}
        >
          Export Log
        </button>
        <button className="fs-btn fs-btn-primary" type="button" onClick={onClose}>Close</button>
      </div>
    </Drawer>
  );
}

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
        icon={(stroke) => (
          <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" style={{ width: 17, height: 17 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        )}
        iconBg="rgba(59,130,246,0.08)"
        iconBorder="rgba(59,130,246,0.12)"
        iconStroke="var(--accent)"
        title="Export & Backup"
        subtitle="Platform-wide data export and backup controls"
        onClose={onClose}
      />
      <div className="fs-drawer-body" style={{ gap: 14 }}>
        <SectionLabel>Export Scope</SectionLabel>
        <div className="fs-field-row">
          <label className="fs-label">Organization</label>
          <select className="fs-input" style={{ cursor: "pointer" }}>
            <option>All Organizations</option>
            <option>TEDU-EE</option>
            <option>BOUN-CHEM</option>
            <option>METU-IE</option>
          </select>
        </div>
        <div className="fs-field-row">
          <label className="fs-label">Data Type</label>
          <select className="fs-input" style={{ cursor: "pointer" }}>
            <option>Full Database Backup</option>
            <option>Scores Only</option>
            <option>User &amp; Membership Data</option>
            <option>Audit Logs</option>
            <option>Configuration</option>
          </select>
        </div>
        <div className="fs-field-row">
          <label className="fs-label">Format</label>
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

  // Load current config when drawer opens
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
        }
      })
      .catch(() => {}); // non-critical — drawer still works without pre-fill
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSchedule() {
    setSaving(true);
    try {
      await setMaintenance({
        mode,
        startTime: mode === "scheduled" ? new Date(startTime).toISOString() : null,
        durationMin,
        message,
        affectedOrgIds: null,
        notifyAdmins,
      });
      toast.success(mode === "immediate" ? "Maintenance activated" : "Maintenance scheduled");
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to set maintenance mode");
    } finally {
      setSaving(false);
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
        icon={(stroke) => (
          <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" style={{ width: 17, height: 17 }}>
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        )}
        iconBg="rgba(217,119,6,0.08)"
        iconBorder="rgba(217,119,6,0.12)"
        iconStroke="var(--warning)"
        title="Maintenance Mode"
        subtitle="Schedule or activate platform maintenance"
        onClose={onClose}
      />
      <div className="fs-drawer-body" style={{ gap: 16 }}>
        {/* Active status banner */}
        {isCurrentlyActive && (
          <div className="fs-alert" style={{ margin: 0, background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)" }}>
            <div className="fs-alert-icon" style={{ color: "var(--danger)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <div className="fs-alert-body">
              <div className="fs-alert-title" style={{ color: "var(--danger)" }}>Maintenance is currently active</div>
              <div className="fs-alert-desc">Users cannot access the platform right now.</div>
            </div>
          </div>
        )}

        <div className="fs-alert warning" style={{ margin: 0 }}>
          <div className="fs-alert-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
          </div>
          <div className="fs-alert-body">
            <div className="fs-alert-title">Maintenance blocks all user access</div>
            <div className="fs-alert-desc">Jurors and org admins will see a maintenance page. Only super admins retain access.</div>
          </div>
        </div>

        <div className="fs-field-row">
          <label className="fs-label">Mode</label>
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
            <div className="fs-field-row">
              <label className="fs-label">Start Time</label>
              <input
                className="fs-input"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="fs-field-row">
              <label className="fs-label">Estimated Duration</label>
              <select
                className="fs-input"
                style={{ cursor: "pointer" }}
                value={durationMin ?? ""}
                onChange={(e) => setDurationMin(e.target.value === "" ? null : Number(e.target.value))}
              >
                {DURATION_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value ?? ""}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {mode === "immediate" && (
          <div className="fs-field-row">
            <label className="fs-label">Estimated Duration</label>
            <select
              className="fs-input"
              style={{ cursor: "pointer" }}
              value={durationMin ?? ""}
              onChange={(e) => setDurationMin(e.target.value === "" ? null : Number(e.target.value))}
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.label} value={o.value ?? ""}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="fs-field-row">
          <label className="fs-label">Maintenance Message</label>
          <textarea
            className="fs-input"
            rows={2}
            style={{ resize: "vertical" }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
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
              {cancelling ? "Cancelling…" : "Cancel Maintenance"}
            </button>
          </>
        ) : (
          <>
            <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose}>Cancel</button>
            <button
              className="fs-btn"
              type="button"
              style={{ background: mode === "immediate" ? "var(--danger)" : "var(--warning)", color: "white", border: "none" }}
              disabled={saving}
              onClick={handleSchedule}
            >
              {saving ? "Saving…" : mode === "immediate" ? "Activate Now" : "Schedule Maintenance"}
            </button>
          </>
        )}
      </div>
    </Drawer>
  );
}

// ── 5. Feature Flags ───────────────────────────────────────────

const DEFAULT_FLAGS = {
  analytics: true,
  mudek: true,
  qrEntry: true,
  emailNotifications: false,
  reportSharing: false,
  multiLanguage: false,
};

export function FeatureFlagsDrawer({ open, onClose }) {
  const toast = useToast();
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const toggle = (k) => setFlags((f) => ({ ...f, [k]: !f[k] }));

  const FEATURE_ROWS = [
    { key: "analytics",           title: "Analytics Dashboard",        desc: "Charts, trends, and outcome analytics for org admins" },
    { key: "mudek",               title: "MUDEK/Outcome Frameworks",   desc: "Outcome mapping, competency radar, and framework management" },
    { key: "qrEntry",             title: "QR Code Entry",              desc: "Allow jury entry via QR code scanning" },
    { key: "emailNotifications",  title: "Email Notifications",        desc: "Send email notifications for approvals, resets, and invites", badge: { type: "warning", label: "Beta" } },
    { key: "reportSharing",       title: "Report Sharing",             desc: "Allow org admins to share score reports externally", badge: { type: "neutral", label: "Coming Soon" } },
    { key: "multiLanguage",       title: "Multi-Language Support",     desc: "Enable Turkish/English language switching for all interfaces", badge: { type: "neutral", label: "Coming Soon" } },
  ];

  return (
    <Drawer open={open} onClose={onClose}>
      <DrawerHeader
        icon={(stroke) => (
          <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" style={{ width: 17, height: 17 }}>
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
        )}
        iconBg="rgba(139,92,246,0.08)"
        iconBorder="rgba(139,92,246,0.12)"
        iconStroke="#8b5cf6"
        title="Feature Flags"
        subtitle="Toggle platform features on or off globally"
        onClose={onClose}
      />
      <div className="fs-drawer-body" style={{ gap: 8 }}>
        {FEATURE_ROWS.map((row) => (
          <ToggleRow
            key={row.key}
            title={row.title}
            desc={row.desc}
            badge={row.badge}
            checked={flags[row.key]}
            onChange={() => toggle(row.key)}
          />
        ))}
      </div>
      <div className="fs-drawer-footer">
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose}>Cancel</button>
        <button
          className="fs-btn fs-btn-primary"
          type="button"
          onClick={() => { toast.success("Feature flags saved"); onClose(); }}
        >
          Save Flags
        </button>
      </div>
    </Drawer>
  );
}

// ── 6. System Health ───────────────────────────────────────────

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
    const { data, error } = await supabase.functions.invoke("platform-metrics", { method: "GET" });
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
        icon={(stroke) => (
          <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" style={{ width: 17, height: 17 }}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        )}
        iconBg="rgba(22,163,74,0.08)"
        iconBorder="rgba(22,163,74,0.12)"
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
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
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
                      <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" style={{ width: 13, height: 13, flexShrink: 0, marginTop: 1 }}>
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
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
          {checking ? "Checking…" : "Refresh"}
        </button>
        <button className="fs-btn fs-btn-primary" type="button" onClick={onClose}>Close</button>
      </div>
    </Drawer>
  );
}
