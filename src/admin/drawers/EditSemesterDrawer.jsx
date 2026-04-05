// src/admin/drawers/EditSemesterDrawer.jsx
// Drawer: edit an existing evaluation period.
// Shows criteria chips + overview stats + danger zone.
// When locked=true the eval lock field is disabled and a warning is shown.
//
// Props:
//   open        — boolean
//   onClose     — () => void
//   period      — { id, name, description, startDate, endDate, evalLock, visibility, isLocked, stats, criteriaCount }
//   onSave      — (id, data) => Promise<void>
//   onDelete    — (period) => void — opens delete confirmation modal
//   error       — string | null

import { useState, useEffect } from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";

export default function EditSemesterDrawer({ open, onClose, period, onSave, onDelete, error }) {
  const [form, setForm] = useState({ name: "", description: "", startDate: "", endDate: "", evalLock: "unlocked", visibility: "visible" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (open && period) {
      setForm({
        name: period.name ?? "",
        description: period.description ?? "",
        startDate: period.startDate ?? "",
        endDate: period.endDate ?? "",
        evalLock: period.evalLock ?? "unlocked",
        visibility: period.visibility ?? "visible",
      });
      setSaveError("");
      setSaving(false);
    }
  }, [open, period]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaveError("");
    setSaving(true);
    try {
      await onSave?.(period.id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        evalLock: form.evalLock,
        visibility: form.visibility,
      });
      onClose();
    } catch (e) {
      setSaveError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const displayError = saveError || error;
  const locked = period?.isLocked;

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="fs-icon accent" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            </span>
            <div className="fs-title-group">
              <div className="fs-title">Edit Period</div>
              <div className="fs-subtitle">{period?.name || ""}</div>
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
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

        {locked && (
          <div className="fs-alert warning" style={{ marginBottom: 14 }}>
            <div className="fs-alert-icon"><AlertTriangle size={15} /></div>
            <div className="fs-alert-body">
              <div className="fs-alert-title">Evaluation locked</div>
              <div className="fs-alert-desc">Scores are frozen. Unlock to allow jurors to edit scores again.</div>
            </div>
          </div>
        )}

        <div className="fs-field">
          <label className="fs-field-label">Period Name <span className="fs-field-req">*</span></label>
          <input className="fs-input" type="text" value={form.name} onChange={(e) => set("name", e.target.value)} disabled={saving} />
        </div>

        <div className="fs-field">
          <label className="fs-field-label">Description <span className="fs-field-opt">(optional)</span></label>
          <textarea className="fs-textarea" value={form.description} onChange={(e) => set("description", e.target.value)} disabled={saving} rows={2} />
        </div>

        <div className="fs-field-row">
          <div className="fs-field">
            <label className="fs-field-label">Start Date</label>
            <input className="fs-input" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} disabled={saving} />
          </div>
          <div className="fs-field">
            <label className="fs-field-label">End Date</label>
            <input className="fs-input" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} disabled={saving} />
          </div>
        </div>

        <div className="fs-field">
          <label className="fs-field-label">Evaluation Lock</label>
          <select className="fs-input" value={form.evalLock} onChange={(e) => set("evalLock", e.target.value)} disabled={saving || locked}>
            <option value="unlocked">Unlocked — jurors can edit scores</option>
            <option value="locked">Locked — scores are frozen</option>
          </select>
          {locked && (
            <div className="fs-field-helper hint">Eval lock setting is managed via the lock toggle on the periods list.</div>
          )}
        </div>

        <div className="fs-field">
          <label className="fs-field-label">Visibility</label>
          <select className="fs-input" value={form.visibility} onChange={(e) => set("visibility", e.target.value)} disabled={saving}>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>

        {/* Stats */}
        {period?.stats && (
          <div className="fs-section">
            <div className="fs-section-header">
              <span className="fs-section-title">Overview</span>
            </div>
            <div className="fs-info-row">
              <span className="fs-info-row-label">Projects</span>
              <span className="fs-info-row-value">{period.stats.projects ?? 0}</span>
            </div>
            <div className="fs-info-row">
              <span className="fs-info-row-label">Jurors</span>
              <span className="fs-info-row-value">{period.stats.jurors ?? 0}</span>
            </div>
            <div className="fs-info-row">
              <span className="fs-info-row-label">Score entries</span>
              <span className="fs-info-row-value">{period.stats.scores ?? 0}</span>
            </div>
          </div>
        )}

        {/* Danger zone */}
        <div className="fs-danger-zone">
          <div className="fs-danger-zone-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Danger Zone
          </div>
          <div className="fs-danger-zone-desc">
            Deleting this period permanently removes all projects, jurors, and scores. Type the period name to confirm.
          </div>
          <button
            className="fs-btn fs-btn-danger-outline fs-btn-sm"
            type="button"
            onClick={() => onDelete?.(period)}
          >
            Delete Period
          </button>
        </div>
      </div>

      <div className="fs-drawer-footer">
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button
          className="fs-btn fs-btn-primary"
          type="button"
          onClick={handleSave}
          disabled={saving || !form.name.trim()}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </Drawer>
  );
}
