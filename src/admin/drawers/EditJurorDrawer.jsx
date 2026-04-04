// src/admin/drawers/EditJurorDrawer.jsx
// Drawer: view/edit juror identity + security section.
// Shows evaluation progress stats and current PIN.
// Danger zone: Reset PIN / Remove Juror actions (trigger modals).
//
// Props:
//   open           — boolean
//   onClose        — () => void
//   juror          — { id, name, affiliation, email, pin, progress: { scored, total } }
//   onSave         — (id, { name, affiliation, email }) => Promise<void>
//   onResetPin     — (juror) => void  — opens the ResetPinModal
//   onRemove       — (juror) => void  — opens remove confirmation
//   error          — string | null

import { useState, useEffect } from "react";
import Drawer from "@/shared/ui/Drawer";
import JurorBadge from "../components/JurorBadge";

export default function EditJurorDrawer({ open, onClose, juror, onSave, onResetPin, onRemove, error }) {
  const [form, setForm] = useState({ name: "", affiliation: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (open && juror) {
      setForm({ name: juror.name ?? "", affiliation: juror.affiliation ?? "", email: juror.email ?? "" });
      setSaveError("");
      setSaving(false);
    }
  }, [open, juror]);

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
  const progress = juror?.progress;

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <JurorBadge name={juror?.name} affiliation={juror?.affiliation} size="lg" />
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <div className="fs-drawer-body">
        {displayError && (
          <div className="fs-alert danger" style={{ marginBottom: 14 }}>
            <div className="fs-alert-body">{displayError}</div>
          </div>
        )}

        {/* Identity */}
        <div className="fs-section">
          <div className="fs-section-header">
            <span className="fs-section-title">Identity</span>
          </div>

          <div className="fs-field">
            <label className="fs-field-label">Full Name <span className="fs-field-req">*</span></label>
            <input className="fs-input" type="text" value={form.name} onChange={(e) => set("name", e.target.value)} disabled={saving} />
          </div>
          <div className="fs-field">
            <label className="fs-field-label">Affiliation <span className="fs-field-req">*</span></label>
            <input className="fs-input" type="text" value={form.affiliation} onChange={(e) => set("affiliation", e.target.value)} disabled={saving} />
          </div>
          <div className="fs-field">
            <label className="fs-field-label">Email <span className="fs-field-opt">(optional)</span></label>
            <input className="fs-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} disabled={saving} />
          </div>
        </div>

        {/* Progress */}
        {progress && (
          <div className="fs-section">
            <div className="fs-section-header">
              <span className="fs-section-title">Evaluation Progress</span>
            </div>
            <div className="fs-info-row">
              <span className="fs-info-row-label">Projects scored</span>
              <span className="fs-info-row-value">{progress.scored} / {progress.total}</span>
            </div>
            <div className="fs-info-row">
              <span className="fs-info-row-label">Status</span>
              <span className="fs-info-row-value">
                {progress.scored >= progress.total
                  ? <span className="fs-badge green">Complete</span>
                  : <span className="fs-badge amber">In progress</span>
                }
              </span>
            </div>
          </div>
        )}

        {/* Security */}
        <div className="fs-section">
          <div className="fs-section-header">
            <span className="fs-section-title">Security</span>
          </div>
          <div className="fs-info-row">
            <span className="fs-info-row-label">Current PIN</span>
            <span className="fs-info-row-value" style={{ fontFamily: "var(--mono)", letterSpacing: "0.15em" }}>
              {juror?.pin || "••••"}
            </span>
          </div>
          <div style={{ marginTop: 10 }}>
            <button
              className="fs-btn fs-btn-secondary fs-btn-sm"
              type="button"
              onClick={() => onResetPin?.(juror)}
            >
              Reset PIN
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="fs-danger-zone">
          <div className="fs-danger-zone-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Danger Zone
          </div>
          <div className="fs-danger-zone-desc">
            Removing this juror will delete all their scores for this period and cannot be undone.
          </div>
          <button
            className="fs-btn fs-btn-danger-outline fs-btn-sm"
            type="button"
            onClick={() => onRemove?.(juror)}
          >
            Remove Juror
          </button>
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
          disabled={saving || !form.name.trim() || !form.affiliation.trim()}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </Drawer>
  );
}
