// src/admin/drawers/AddOutcomeDrawer.jsx
// Drawer: add a new programme outcome to a framework.
// Targets the framework_outcomes table.
//
// Props:
//   open           — boolean
//   onClose        — () => void
//   frameworkName  — string — shown in header tag
//   criteria       — [{ id, label, color }] — for criterion mapping chips
//   onSave         — ({ code, shortLabel, description, criterionIds }) => Promise<void>
//   error          — string | null

import { useState, useEffect } from "react";
import { AlertCircle, Info } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

const EMPTY = { code: "", shortLabel: "", description: "", criterionIds: [] };

export default function AddOutcomeDrawer({ open, onClose, frameworkName = "", criteria = [], onSave, error }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (open) { setForm(EMPTY); setSaveError(""); setSaving(false); }
  }, [open]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleCriterion = (id) =>
    setForm((f) => ({
      ...f,
      criterionIds: f.criterionIds.includes(id)
        ? f.criterionIds.filter((x) => x !== id)
        : [...f.criterionIds, id],
    }));

  const handleSave = async () => {
    setSaveError("");
    setSaving(true);
    try {
      await onSave?.({
        code: form.code.trim(),
        shortLabel: form.shortLabel.trim(),
        description: form.description.trim() || null,
        criterionIds: form.criterionIds,
      });
      onClose();
    } catch (e) {
      setSaveError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const displayError = saveError || error;
  const canSave = form.code.trim() && form.shortLabel.trim();

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              className="fs-icon"
              style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.08))", borderColor: "rgba(16,185,129,0.18)" }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" />
              </svg>
            </span>
            <div className="fs-title-group">
              <div className="fs-title">Add Outcome</div>
              <div className="fs-subtitle">Define a new programme outcome for the active framework.</div>
              {frameworkName && (
                <div className="fw-drawer-header-ctx">
                  <span className="fw-drawer-tag">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
                    </svg>
                    {frameworkName}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div className="fs-drawer-body" style={{ padding: "18px 20px" }}>
        {displayError && (
          <div className="fs-alert danger" style={{ marginBottom: 14 }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">{displayError}</div>
          </div>
        )}

        {/* Outcome Identity */}
        <div className="fs-section" style={{ padding: 0, background: "none", border: "none", marginBottom: 0 }}>
          <div className="fs-section-header" style={{ padding: "0 0 10px 0" }}>
            <span className="fs-section-title">Outcome Identity</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="fs-field">
              <label className="fs-field-label">Code <span className="fs-field-req">*</span></label>
              <input
                className="fs-input"
                type="text"
                placeholder="e.g. PÇ-5"
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                disabled={saving}
                maxLength={12}
              />
              <div className="fs-field-helper hint" style={{ fontSize: "10.5px" }}>
                Short unique identifier (PÇ-5, SO-3, 1.2)
              </div>
            </div>
            <div className="fs-field">
              <label className="fs-field-label">Short Label <span className="fs-field-req">*</span></label>
              <input
                className="fs-input"
                type="text"
                placeholder="e.g. Problem Solving"
                value={form.shortLabel}
                onChange={(e) => set("shortLabel", e.target.value)}
                disabled={saving}
                maxLength={48}
              />
              <div className="fs-field-helper hint" style={{ fontSize: "10.5px" }}>Shown in table rows</div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginTop: 16 }}>
          <div className="acc-detail-section-label">Outcome Description</div>
          <textarea
            className="fs-input"
            style={{ height: 90, resize: "vertical", padding: "10px 12px", fontSize: 13, marginTop: 6 }}
            placeholder="Full statement of the programme outcome as defined by the accreditation body…"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            disabled={saving}
          />
        </div>

        {/* Criterion mapping */}
        {criteria.length > 0 && (
          <>
            <div className="acc-detail-section-label" style={{ marginTop: 18 }}>
              Criterion Mapping <span style={{ fontSize: 10, color: "var(--text-quaternary)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
            </div>
            <div className="fs-alert info" style={{ marginBottom: 10, padding: "10px 12px" }}>
              <div className="fs-alert-icon" style={{ width: 24, height: 24 }}><Info size={15} /></div>
              <div className="fs-alert-body">
                <div className="fs-alert-desc" style={{ fontSize: 11 }}>
                  Select criteria that explicitly assess this outcome. Mapped criteria give <strong style={{ color: "var(--success)" }}>Direct</strong> coverage.
                </div>
              </div>
            </div>
            <div className="acc-drawer-criteria-grid">
              {criteria.map((c) => (
                <label
                  key={c.id}
                  className={`acc-drawer-crit-chip${form.criterionIds.includes(c.id) ? " selected" : ""}`}
                  onClick={() => !saving && toggleCriterion(c.id)}
                  style={{ cursor: saving ? "not-allowed" : "pointer" }}
                >
                  <span className="acc-crit-dot" style={{ background: c.color }} />
                  {c.label}
                  <span className="acc-crit-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="fs-drawer-footer">
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button
          className="fs-btn fs-btn-primary"
          type="button"
          onClick={handleSave}
          disabled={saving || !canSave}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={saving} loadingText="Adding…">Add Outcome</AsyncButtonContent>
          </span>
        </button>
      </div>
    </Drawer>
  );
}
