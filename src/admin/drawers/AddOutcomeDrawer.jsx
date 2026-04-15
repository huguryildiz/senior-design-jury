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
import { AlertCircle, Info, PlusCircle, X, Check } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import useShakeOnError from "@/shared/hooks/useShakeOnError";
import AutoTextarea from "@/shared/ui/AutoTextarea";
import InlineError from "@/shared/ui/InlineError";

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
  const saveBtnRef = useShakeOnError(displayError);
  const canSave = form.code.trim() && form.shortLabel.trim();

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="fs-icon success" aria-hidden="true">
              <PlusCircle size={18} strokeWidth={2} />
            </div>
            <div className="fs-title-group">
              <div className="fs-title">Add Outcome</div>
              <div className="fs-subtitle">Define a new programme outcome for the active framework.</div>
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={2} />
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="fs-field">
              <label className="fs-field-label">Code <span className="fs-field-req">*</span></label>
              <input
                className="fs-input"
                type="text"
                placeholder="e.g., PO-5"
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
              <label className="fs-field-label">Label <span className="fs-field-req">*</span></label>
              <input
                className="fs-input"
                type="text"
                placeholder="e.g., Engineering Knowledge"
                value={form.shortLabel}
                onChange={(e) => set("shortLabel", e.target.value)}
                disabled={saving}
                maxLength={25}
              />
              <div className="fs-field-helper hint" style={{ fontSize: "10.5px" }}>
                Short name shown in charts and tables ({25 - form.shortLabel.length} chars left)
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginTop: 16 }}>
          <div className="acc-detail-section-label">Outcome Description <span style={{fontSize:10,fontWeight:500,color:"var(--text-quaternary)",textTransform:"none",letterSpacing:0}}>(optional)</span></div>
          <AutoTextarea
            className="fs-input"
            style={{ resize: "none", overflow: "hidden", padding: "10px 12px", fontSize: 13, marginTop: 6, minHeight: 40 }}
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
                    <Check size={14} strokeWidth={2.5} />
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
          ref={saveBtnRef}
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
