// src/admin/drawers/AddSemesterDrawer.jsx
// Drawer: create a new evaluation period.
//
// Props:
//   open            — boolean
//   onClose         — () => void
//   onSave          — (data) => Promise<void>
//   existingPeriods — [{ id, name }] for "copy criteria from" dropdown
//   error           — string | null

import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import CustomSelect from "@/shared/ui/CustomSelect";

const EMPTY = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
  copyCriteriaFrom: "",
  evalLock: "unlocked",
  visibility: "visible",
};

export default function AddSemesterDrawer({ open, onClose, onSave, existingPeriods = [], error }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (open) { setForm(EMPTY); setSaveError(""); setSaving(false); }
  }, [open]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaveError("");
    setSaving(true);
    try {
      await onSave?.({
        name: form.name.trim(),
        description: form.description.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        copyCriteriaFrom: form.copyCriteriaFrom || null,
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

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="fs-icon accent" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            </span>
            <div className="fs-title-group">
              <div className="fs-title">New Evaluation Period</div>
              <div className="fs-subtitle">Set up a new evaluation period</div>
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

        <div className="fs-field">
          <label className="fs-field-label">Period Name <span className="fs-field-req">*</span></label>
          <input className="fs-input" type="text" placeholder="e.g. Fall 2025" value={form.name} onChange={(e) => set("name", e.target.value)} disabled={saving} />
        </div>

        <div className="fs-field">
          <label className="fs-field-label">Description <span className="fs-field-opt">(optional)</span></label>
          <textarea className="fs-textarea" placeholder="Brief description" value={form.description} onChange={(e) => set("description", e.target.value)} disabled={saving} rows={2} />
        </div>

        <div className="fs-field-row">
          <div className="fs-field">
            <label className="fs-field-label">Start Date <span className="fs-field-opt">(optional)</span></label>
            <input className="fs-input" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} disabled={saving} />
          </div>
          <div className="fs-field">
            <label className="fs-field-label">End Date <span className="fs-field-opt">(optional)</span></label>
            <input className="fs-input" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} disabled={saving} />
          </div>
        </div>

        <div className="fs-field">
          <label className="fs-field-label">Copy Criteria From <span className="fs-field-opt">(optional)</span></label>
          <CustomSelect
            value={form.copyCriteriaFrom}
            onChange={(v) => set("copyCriteriaFrom", v)}
            disabled={saving}
            options={[
              { value: "", label: "— Start fresh —" },
              ...existingPeriods.map((p) => ({ value: p.id, label: p.name })),
            ]}
            ariaLabel="Copy criteria from"
          />
        </div>

        <div className="fs-field">
          <label className="fs-field-label">Evaluation Lock</label>
          <CustomSelect
            value={form.evalLock}
            onChange={(v) => set("evalLock", v)}
            disabled={saving}
            options={[
              { value: "unlocked", label: "Unlocked — jurors can edit scores" },
              { value: "locked", label: "Locked — scores are frozen" },
            ]}
            ariaLabel="Evaluation lock"
          />
        </div>

        <div className="fs-field">
          <label className="fs-field-label">Visibility</label>
          <CustomSelect
            value={form.visibility}
            onChange={(v) => set("visibility", v)}
            disabled={saving}
            options={[
              { value: "visible", label: "Visible — shown in juror period select" },
              { value: "hidden", label: "Hidden — not shown to jurors" },
            ]}
            ariaLabel="Visibility"
          />
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
          <span className="btn-loading-content">
            <AsyncButtonContent loading={saving} loadingText="Creating…">Create Period</AsyncButtonContent>
          </span>
        </button>
      </div>
    </Drawer>
  );
}
