// src/admin/drawers/EditProjectDrawer.jsx
// Drawer: edit an existing project.
// Group number is read-only once created.
//
// Props:
//   open       — boolean
//   onClose    — () => void
//   project    — { id, groupNo, title, advisor, description, members: string[] }
//   onSave     — (id, data) => Promise<void>
//   error      — string | null

import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";

export default function EditProjectDrawer({ open, onClose, project, onSave, error }) {
  const [form, setForm] = useState({ title: "", advisor: "", description: "", members: [""] });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (open && project) {
      setForm({
        title: project.title ?? "",
        advisor: project.advisor ?? "",
        description: project.description ?? "",
        members: project.members?.length ? [...project.members] : [""],
      });
      setSaveError("");
      setSaving(false);
    }
  }, [open, project]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const setMember = (i, val) =>
    setForm((f) => { const m = [...f.members]; m[i] = val; return { ...f, members: m }; });

  const addMember = () => setForm((f) => ({ ...f, members: [...f.members, ""] }));

  const removeMember = (i) =>
    setForm((f) => ({ ...f, members: f.members.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    setSaveError("");
    setSaving(true);
    try {
      await onSave?.(project.id, {
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

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="fs-icon accent" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </span>
            <div className="fs-title-group">
              <div className="fs-title">Edit Project</div>
              <div className="fs-subtitle">
                Project {project?.groupNo ? `#${project.groupNo}` : ""}
              </div>
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
          <label className="fs-field-label">Project No</label>
          <input
            className="fs-input locked"
            type="text"
            value={project?.groupNo ?? ""}
            readOnly
            title="Project number cannot be changed"
          />
          <div className="fs-field-helper hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Project number cannot be changed after creation
          </div>
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
            placeholder="Advisor name"
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
          ))}
          <button className="fs-list-add" type="button" onClick={addMember} disabled={saving}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Add member
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
          disabled={saving || !form.title.trim()}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </Drawer>
  );
}
