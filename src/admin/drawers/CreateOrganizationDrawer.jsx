// src/admin/drawers/CreateOrganizationDrawer.jsx
// Drawer: create a new organization (Super Admin only).
// Targets the tenants / organizations table.
//
// Props:
//   open    — boolean
//   onClose — () => void
//   onSave  — ({ name, shortLabel, university, department, contactEmail, initialAdminEmail, status, notes }) => Promise<void>
//   error   — string | null

import { useState, useEffect } from "react";
import { AlertCircle, Icon } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import useShakeOnError from "@/shared/hooks/useShakeOnError";

const EMPTY = {
  name: "",
  shortLabel: "",
  university: "",
  department: "",
  contactEmail: "",
  initialAdminEmail: "",
  status: "active",
  notes: "",
};

export default function CreateOrganizationDrawer({ open, onClose, onSave, error }) {
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
        shortLabel: form.shortLabel.trim().toUpperCase(),
        university: form.university.trim() || null,
        department: form.department.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        initialAdminEmail: form.initialAdminEmail.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
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
  const canSave = form.name.trim() && form.shortLabel.trim();

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: 9, display: "grid", placeItems: "center",
                background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.12)",
              }}
            >
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                style={{ width: 17, height: 17 }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </Icon>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Create Organization</div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                Register a new university department or institution
              </div>
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </Icon>
          </button>
        </div>
      </div>
      <div className="fs-drawer-body" style={{ gap: 16 }}>
        {displayError && (
          <div className="fs-alert danger" style={{ marginBottom: 4 }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">{displayError}</div>
          </div>
        )}

        <div className="fs-field">
          <label className="fs-field-label">
            Organization Name <span className="fs-field-req">*</span>
          </label>
          <input
            className="fs-input"
            type="text"
            placeholder="e.g. Bilkent Computer Engineering"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="fs-field">
          <label className="fs-field-label">
            Short Label <span className="fs-field-req">*</span>
          </label>
          <input
            className="fs-input"
            type="text"
            placeholder="e.g. BILKENT-CS"
            value={form.shortLabel}
            onChange={(e) => set("shortLabel", e.target.value.toUpperCase())}
            disabled={saving}
            style={{ textTransform: "uppercase" }}
          />
          <div className="fs-field-helper hint">Used in exports and cross-org reports. Must be unique.</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="fs-field">
            <label className="fs-field-label">University</label>
            <input
              className="fs-input"
              type="text"
              placeholder="e.g. Bilkent University"
              value={form.university}
              onChange={(e) => set("university", e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="fs-field">
            <label className="fs-field-label">Department</label>
            <input
              className="fs-input"
              type="text"
              placeholder="e.g. CS"
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div className="fs-field">
          <label className="fs-field-label">Contact Email</label>
          <input
            className="fs-input"
            type="email"
            placeholder="admin@university.edu.tr"
            value={form.contactEmail}
            onChange={(e) => set("contactEmail", e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="fs-field">
          <label className="fs-field-label">Initial Admin</label>
          <input
            className="fs-input"
            type="email"
            placeholder="Email of first organization admin"
            value={form.initialAdminEmail}
            onChange={(e) => set("initialAdminEmail", e.target.value)}
            disabled={saving}
          />
          <div className="fs-field-helper hint">
            An invitation will be sent to this email with admin onboarding instructions.
          </div>
        </div>

        <div className="fs-field">
          <label className="fs-field-label">Initial Status</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { value: "active", label: "Active", activeStyle: { background: "rgba(22,163,74,0.04)", borderColor: "rgba(22,163,74,0.25)" } },
              { value: "limited", label: "Limited", activeStyle: {} },
            ].map(({ value, label, activeStyle }) => (
              <label
                key={value}
                style={{
                  display: "flex", alignItems: "center", gap: 6, fontSize: 12.5,
                  cursor: "pointer", padding: "8px 14px",
                  border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", flex: 1,
                  ...(form.status === value ? activeStyle : {}),
                }}
              >
                <input
                  type="radio"
                  name="co-status"
                  value={value}
                  checked={form.status === value}
                  onChange={() => set("status", value)}
                  disabled={saving}
                  style={{ accentColor: value === "active" ? "var(--success)" : "var(--warning)" }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="fs-field">
          <label className="fs-field-label">Notes</label>
          <textarea
            className="fs-input"
            rows={2}
            placeholder="Optional internal notes about this organization..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            disabled={saving}
            style={{ resize: "vertical" }}
          />
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
          disabled={saving || !canSave}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={saving} loadingText="Creating…">Create Organization</AsyncButtonContent>
          </span>
        </button>
      </div>
    </Drawer>
  );
}
