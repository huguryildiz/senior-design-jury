// src/admin/drawers/AddProjectDrawer.jsx
// Drawer: add a new project (group/entry) to the current period.
//
// Props:
//   open       — boolean
//   onClose    — () => void
//   onSave     — (data) => Promise<void>
//   error      — string | null

import { useState, useEffect } from "react";
import { AlertCircle, Icon } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import useShakeOnError from "@/shared/hooks/useShakeOnError";

const EMPTY = { groupNo: "", title: "", advisor: "", description: "", members: [""] };

export default function AddProjectDrawer({ open, onClose, onSave, error }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (open) { setForm(EMPTY); setSaveError(""); setSaving(false); }
  }, [open]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const setMember = (i, val) =>
    setForm((f) => { const m = [...f.members]; m[i] = val; return { ...f, members: m }; });

  const addMember = () =>
    setForm((f) => ({ ...f, members: [...f.members, ""] }));

  const removeMember = (i) =>
    setForm((f) => ({ ...f, members: f.members.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    setSaveError("");
    setSaving(true);
    try {
      await onSave?.({
        groupNo: form.groupNo.trim(),
        title: form.title.trim(),
        advisor: form.advisor.trim() || null,
        description: form.description.trim() || null,
        members: form.members.map((m) => m.trim()).filter(Boolean),
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

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="fs-icon accent" aria-hidden="true">
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></Icon>
            </span>
            <div className="fs-title-group">
              <div className="fs-title">Add Project</div>
              <div className="fs-subtitle">Create a new project entry for this period</div>
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></Icon>
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
          <label className="fs-field-label">
            Project No <span className="fs-field-req">*</span>
          </label>
          <input
            className="fs-input"
            type="text"
            placeholder="e.g. 1, 2, 3A"
            value={form.groupNo}
            onChange={(e) => set("groupNo", e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="fs-field">
          <label className="fs-field-label">
            Title <span className="fs-field-req">*</span>
          </label>
          <input
            className="fs-input"
            type="text"
            placeholder="Project title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="fs-field">
          <label className="fs-field-label">
            Advisor <span className="fs-field-opt">(optional)</span>
          </label>
          <input
            className="fs-input"
            type="text"
            placeholder="e.g. Dr. Ali Yılmaz, Prof. Aylin Kaya"
            value={form.advisor}
            onChange={(e) => set("advisor", e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="fs-field">
          <label className="fs-field-label">
            Description <span className="fs-field-opt">(optional)</span>
          </label>
          <textarea
            className="fs-textarea"
            placeholder="Brief project description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            disabled={saving}
            rows={3}
          />
        </div>

        <div className="fs-field">
          <label className="fs-field-label">Team Members</label>
          {form.members.map((m, i) => (
            <div key={i} className="fs-list-row">
              <span className="fs-list-num">{i + 1}</span>
              <input
                className="fs-input"
                type="text"
                placeholder={`Member ${i + 1}`}
                value={m}
                onChange={(e) => setMember(i, e.target.value)}
                disabled={saving}
              />
              {form.members.length > 1 && (
                <button
                  className="fs-list-remove"
                  type="button"
                  onClick={() => removeMember(i)}
                  disabled={saving}
                  aria-label="Remove member"
                >
                  <Icon
                    iconNode={[]}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></Icon>
                </button>
              )}
            </div>
          ))}
          <button className="fs-list-add" type="button" onClick={addMember} disabled={saving}>
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></Icon>
            Add member
          </button>
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
          disabled={saving || !form.groupNo.trim() || !form.title.trim()}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={saving} loadingText="Saving…">Add Project</AsyncButtonContent>
          </span>
        </button>
      </div>
    </Drawer>
  );
}
