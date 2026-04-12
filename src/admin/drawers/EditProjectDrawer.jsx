// src/admin/drawers/EditProjectDrawer.jsx
// Drawer: edit an existing project.
// Project number is read-only once created.
//
// Props:
//   open       — boolean
//   onClose    — () => void
//   project    — { id, groupNo, title, advisor, description, members: string[] }
//   onSave     — (id, data) => Promise<void>
//   error      — string | null

import { useState, useEffect, useRef, useCallback } from "react";
import { AlertCircle, Icon } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import useShakeOnError from "@/shared/hooks/useShakeOnError";

const HANDLE_SVG = (
  <Icon
    iconNode={[]}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2">
    <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
    <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
  </Icon>
);

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

  const dragIndex = useRef(null);
  const dragOverIndex = useRef(null);

  const onDragStart = (i) => { dragIndex.current = i; };
  const onDragEnter = (i) => { dragOverIndex.current = i; };
  const onDragEnd = () => {
    const from = dragIndex.current;
    const to = dragOverIndex.current;
    if (from === null || to === null || from === to) return;
    setForm((f) => {
      const m = [...f.members];
      const [moved] = m.splice(from, 1);
      m.splice(to, 0, moved);
      return { ...f, members: m };
    });
    dragIndex.current = null;
    dragOverIndex.current = null;
  };

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

  const titleRef = useRef(null);
  const autoResizeTitle = useCallback(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => { autoResizeTitle(); }, [form.title, autoResizeTitle]);

  const displayError = saveError || error;
  const saveBtnRef = useShakeOnError(displayError);
  const memberCount = form.members.filter((m) => m.trim()).length;
  const titleTrimmed = form.title.trim();

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="fs-icon muted" aria-hidden="true">
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
              </Icon>
            </span>
            <div className="fs-title-group">
              <div className="fs-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Edit Project
                {project?.groupNo != null && (
                  <span style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    lineHeight: 1,
                    padding: "3px 7px",
                    borderRadius: 99,
                    background: "var(--bg-tertiary, #f1f5f9)",
                    color: "var(--text-secondary, #64748b)",
                    letterSpacing: "0.02em",
                    fontFamily: "var(--mono)",
                  }}>
                    #{project.groupNo}
                  </span>
                )}
              </div>
              <div className="fs-subtitle">Update project details and team member roster.</div>
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

        {/* ── Project Details ── */}
        <div className="fs-section">
          <div className="fs-section-header">
            <div className="fs-section-title">Project Details</div>
          </div>

          <div className="fs-field">
            <label className="fs-field-label">
              Project No{" "}
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                width="11"
                height="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ color: "var(--text-quaternary)", verticalAlign: "-1px" }}>
                <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </Icon>
            </label>
            <input
              className="fs-input locked"
              type="text"
              value={project?.groupNo ?? ""}
              readOnly
              disabled
              style={{ fontFamily: "var(--mono)" }}
            />
            <div className="fs-field-helper hint">Project number is locked after creation.</div>
          </div>

          <div className="fs-field">
            <label className="fs-field-label">
              Title <span className="fs-field-req">*</span>
            </label>
            <textarea
              ref={titleRef}
              className="fs-textarea"
              placeholder="Project title"
              value={form.title}
              onChange={(e) => { set("title", e.target.value); autoResizeTitle(); }}
              disabled={saving}
              autoFocus
              rows={1}
              style={{ resize: "none", overflow: "hidden", minHeight: "40px", lineHeight: "1.5" }}
            />
            {titleTrimmed && (
              <div className="fs-field-helper" style={{ color: "var(--success, #22c55e)" }}>
                <Icon
                  iconNode={[]}
                  viewBox="0 0 24 24"
                  width="11"
                  height="11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></Icon>
                {" "}Looks good
              </div>
            )}
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
              placeholder="Brief project description..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              disabled={saving}
              rows={3}
              style={{ minHeight: 52 }}
            />
          </div>
        </div>

        {/* ── Team Members ── */}
        <div className="fs-section">
          <div className="fs-section-header">
            <div className="fs-section-title">
              Team Members <span className="fs-field-req">*</span>
            </div>
            <div className="fs-section-badge">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </div>
          </div>

          {form.members.map((m, i) => (
            <div
              key={i}
              className="fs-list-row"
              draggable
              onDragStart={() => onDragStart(i)}
              onDragEnter={() => onDragEnter(i)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => e.preventDefault()}
              style={{ cursor: "grab" }}
            >
              <div className="fs-list-handle" title="Drag to reorder" style={{ cursor: "grab" }}>{HANDLE_SVG}</div>
              <input
                className="fs-input"
                type="text"
                placeholder={`Member ${i + 1}`}
                value={m}
                onChange={(e) => setMember(i, e.target.value)}
                disabled={saving}
                style={{ cursor: "text" }}
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
              strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>
            </Icon>
            Add Member
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
          disabled={saving || !titleTrimmed}
        >
          <AsyncButtonContent loading={saving} loadingText="Saving…">Save Changes</AsyncButtonContent>
        </button>
      </div>
    </Drawer>
  );
}
