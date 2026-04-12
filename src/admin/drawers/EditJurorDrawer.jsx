// src/admin/drawers/EditJurorDrawer.jsx
// Drawer: view/edit juror identity, evaluation progress, security & access.
//
// Props:
//   open           — boolean
//   onClose        — () => void
//   juror          — { id, name, affiliation, email, progress: { scored, total },
//                      lastActive, overviewStatus }
//   onSave         — (id, { name, affiliation, email }) => Promise<void>
//   onResetPin     — (juror) => void
//   onRemove       — (juror) => void
//   error          — string | null

import { useState, useEffect } from "react";
import { AlertCircle, Icon } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import useShakeOnError from "@/shared/hooks/useShakeOnError";

function formatRelative(ts) {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) {
    const m = Math.floor(diff / 60_000);
    return `${m}m ago`;
  }
  if (diff < 86_400_000) {
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
  }
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function SessionStatusPill({ status }) {
  const active = status === "in_progress" || status === "editing";
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
        background: active ? "rgba(16,185,129,0.12)" : "var(--surface-2)",
        color: active ? "var(--success)" : "var(--text-tertiary)",
        border: `1px solid ${active ? "rgba(16,185,129,0.25)" : "var(--border)"}`,
      }}
    >
      {active && (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
      )}
      {active ? "Active session" : "No active session"}
    </span>
  );
}

export default function EditJurorDrawer({ open, onClose, juror, onSave, onResetPin, onRemove, error }) {
  const [form, setForm] = useState({ name: "", affiliation: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [pinCopied, setPinCopied] = useState(false);

  useEffect(() => {
    if (open && juror) {
      setForm({ name: juror.name ?? "", affiliation: juror.affiliation ?? "", email: juror.email ?? "" });
      setSaveError("");
      setSaving(false);
      setPinCopied(false);
    }
  }, [open, juror?.id]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaveError("");
    setSaving(true);
    try {
      await onSave?.(juror.id, {
        name: form.name.trim(),
        affiliation: form.affiliation.trim(),
        email: form.email.trim() || null,
      });
      onClose();
    } catch (e) {
      setSaveError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const displayError = saveError || error;
  const saveBtnRef = useShakeOnError(displayError);
  const progress = juror?.progress;
  const scored = progress?.scored ?? 0;
  const total = progress?.total ?? 0;
  const allDone = total > 0 && scored >= total;

  return (
    <Drawer open={open} onClose={onClose}>
      {/* ── Header ── */}
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="fs-icon" style={{ background: "var(--surface-2)" }}>
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </Icon>
            </div>
            <div className="fs-title-group">
              <div className="fs-title">Juror Profile</div>
              <div className="fs-subtitle">View and update juror details for the active evaluation period.</div>
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </Icon>
          </button>
        </div>
      </div>
      <div className="fs-drawer-body">
        {displayError && (
          <div className="fs-alert danger" style={{ marginBottom: 14 }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">{displayError}</div>
          </div>
        )}

        {/* ── Identity ── */}
        <div className="fs-section">
          <div className="fs-section-header">
            <span className="fs-section-title">Identity</span>
          </div>

          <div className="fs-field">
            <label className="fs-field-label">Full Name <span className="fs-field-req">*</span></label>
            <input
              className="fs-input"
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="fs-field">
            <label className="fs-field-label">Affiliation <span className="fs-field-req">*</span></label>
            <input
              className="fs-input"
              type="text"
              value={form.affiliation}
              onChange={(e) => set("affiliation", e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="fs-field">
            <label className="fs-field-label">
              Email <span className="fs-field-opt">(optional)</span>
            </label>
            <input
              className="fs-input"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="juror@university.edu"
              disabled={saving}
            />
            <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 5, color: "var(--text-tertiary)", fontSize: 11 }}>
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                width="11"
                height="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
              </Icon>
              Used to send PIN and evaluation QR code via email.
            </div>
          </div>
        </div>

        {/* ── Evaluation Progress ── */}
        {progress && (
          <div className="fs-section">
            <div className="fs-section-header">
              <span className="fs-section-title">Evaluation Progress</span>
            </div>

            <div className="fs-info-row">
              <span className="fs-info-row-label">Progress</span>
              <span className="fs-info-row-value">
                <span
                  style={{
                    display: "inline-flex", alignItems: "center",
                    padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: allDone ? "rgba(16,185,129,0.12)" : "var(--surface-2)",
                    color: allDone ? "var(--success)" : "var(--text-secondary)",
                    border: `1px solid ${allDone ? "rgba(16,185,129,0.25)" : "var(--border)"}`,
                  }}
                >
                  {scored} / {total} groups scored
                </span>
              </span>
            </div>

            {juror?.lastActive && (
              <div className="fs-info-row">
                <span className="fs-info-row-label">Last Activity</span>
                <span className="fs-info-row-value">{formatRelative(juror.lastActive)}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Security & Access ── */}
        <div className="fs-section">
          <div className="fs-section-header">
            <span className="fs-section-title">Security &amp; Access</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 12, lineHeight: 1.5 }}>
            PIN-based authentication for the jury evaluation form. Manage access credentials and session control.
          </div>

          <div className="fs-info-row">
            <span className="fs-info-row-label">Current PIN</span>
            <span className="fs-info-row-value" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-tertiary)", fontSize: 12 }}>
              <span style={{ fontFamily: "var(--mono)", letterSpacing: "0.35em", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                • • • •
              </span>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>hidden</span>
            </span>
          </div>

          <div className="fs-info-row">
            <span className="fs-info-row-label">Session Status</span>
            <span className="fs-info-row-value">
              <SessionStatusPill status={juror?.overviewStatus} />
            </span>
          </div>

          {juror?.email && (
            <div className="fs-info-row">
              <span className="fs-info-row-label">Email</span>
              <span className="fs-info-row-value" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
                {form.email || juror.email}
              </span>
            </div>
          )}
        </div>

        {/* ── Irreversible Actions ── */}
        <div className="fs-danger-zone">
          <div className="fs-danger-zone-title">
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </Icon>
            Irreversible Actions
          </div>
          <div className="fs-danger-zone-desc">
            Resetting the PIN invalidates the current one. Removing the juror permanently deletes all their scores for this evaluation period.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="fs-btn fs-btn-danger-outline fs-btn-sm"
              type="button"
              onClick={() => onResetPin?.(juror)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </Icon>
              Reset PIN
            </button>
            <button
              className="fs-btn fs-btn-danger-outline fs-btn-sm"
              type="button"
              onClick={() => onRemove?.(juror)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </Icon>
              Remove Juror
            </button>
          </div>
        </div>
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
          disabled={saving || !form.name.trim() || !form.affiliation.trim()}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={saving} loadingText="Saving…">Save Changes</AsyncButtonContent>
          </span>
        </button>
      </div>
    </Drawer>
  );
}
