// src/admin/drawers/AddFrameworkDrawer.jsx
// Drawer: add a new accreditation framework.
// Targets the accreditation_frameworks table.
//
// Props:
//   open         — boolean
//   onClose      — () => void
//   periods      — [{ id, name }] — available evaluation periods
//   onSave       — ({ type, name, version, periodId, description, threshold, prefix, starterOutcomes }) => Promise<void>
//   error        — string | null

import { useState, useEffect } from "react";
import { AlertCircle, Info, Icon } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import CustomSelect from "@/shared/ui/CustomSelect";
import useShakeOnError from "@/shared/hooks/useShakeOnError";

const TYPES = [
  {
    key: "national",
    colorClass: "blue",
    title: "National Accreditation",
    desc: "MÜDEK, YÖK, or other national accreditation body standards",
    icon: (
      <Icon
        iconNode={[]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
      </Icon>
    ),
  },
  {
    key: "international",
    colorClass: "purple",
    title: "International Accreditation",
    desc: "ABET, EUR-ACE, Washington Accord aligned frameworks",
    icon: (
      <Icon
        iconNode={[]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </Icon>
    ),
  },
  {
    key: "internal",
    colorClass: "amber",
    title: "Internal Outcomes",
    desc: "Institution-defined programme outcomes not tied to external bodies",
    icon: (
      <Icon
        iconNode={[]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </Icon>
    ),
  },
  {
    key: "custom",
    colorClass: "green",
    title: "Custom Framework",
    desc: "Build a fully custom outcome set with your own structure",
    icon: (
      <Icon
        iconNode={[]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </Icon>
    ),
  },
];

const EMPTY_FORM = {
  type: "",
  name: "",
  version: "",
  periodId: "",
  description: "",
  threshold: 70,
  prefix: "",
};

const EMPTY_SEED = () => ({ id: Date.now() + Math.random(), code: "", label: "" });

export default function AddFrameworkDrawer({ open, onClose, periods = [], onSave, error }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [seedRows, setSeedRows] = useState([]);
  const [showSeeds, setShowSeeds] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setSeedRows([]);
      setShowSeeds(false);
      setSaveError("");
      setSaving(false);
    }
  }, [open]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const addSeedRow = () => setSeedRows((r) => [...r, EMPTY_SEED()]);
  const removeSeedRow = (id) => setSeedRows((r) => r.filter((row) => row.id !== id));
  const updateSeedRow = (id, key, val) =>
    setSeedRows((r) => r.map((row) => (row.id === id ? { ...row, [key]: val } : row)));

  const handleSave = async () => {
    setSaveError("");
    setSaving(true);
    try {
      await onSave?.({
        type: form.type,
        name: form.name.trim(),
        version: form.version.trim() || null,
        periodId: form.periodId || null,
        description: form.description.trim() || null,
        threshold: Number(form.threshold),
        prefix: form.prefix.trim() || null,
        starterOutcomes: seedRows
          .filter((r) => r.code.trim() || r.label.trim())
          .map((r) => ({ code: r.code.trim(), label: r.label.trim() })),
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
  const canSave = form.type && form.name.trim();

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              className="fs-icon"
              style={{
                background: "linear-gradient(135deg,rgba(139,92,246,0.12),rgba(59,130,246,0.08))",
                borderColor: "rgba(139,92,246,0.18)",
              }}
            >
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#a78bfa"
                strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </Icon>
            </div>
            <div className="fs-title-group">
              <div className="fs-title">Add Accreditation Framework</div>
              <div className="fs-subtitle">
                Define a new framework to track programme outcomes and accreditation compliance.
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
      <div className="fs-drawer-body">
        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18 }}>
          <span
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 20, height: 20, borderRadius: "50%",
              background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 700,
            }}
          >
            1
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>Framework details</span>
          <span style={{ flex: 1, height: 1, background: "var(--border)", margin: "0 4px" }} />
          <span
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 20, height: 20, borderRadius: "50%",
              background: "var(--surface-1)", border: "1px solid var(--border)",
              color: "var(--text-quaternary)", fontSize: 10, fontWeight: 700,
            }}
          >
            2
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-quaternary)" }}>Starter outcomes</span>
        </div>

        {displayError && (
          <div className="fs-alert danger" style={{ marginBottom: 14 }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">{displayError}</div>
          </div>
        )}

        {/* Framework Type */}
        <div className="fw-form-group">
          <label className="fw-form-label">Framework Type</label>
          <div className="fw-type-grid">
            {TYPES.map((t) => (
              <div
                key={t.key}
                className={`fw-type-card${form.type === t.key ? " selected" : ""}`}
                onClick={() => !saving && set("type", t.key)}
                style={{ cursor: saving ? "not-allowed" : "pointer" }}
              >
                <div className={`fw-type-card-icon ${t.colorClass}`}>{t.icon}</div>
                <div className="fw-type-card-body">
                  <div className="fw-type-card-title">{t.title}</div>
                  <div className="fw-type-card-desc">{t.desc}</div>
                </div>
                <div className="fw-type-check">
                  <Icon
                    iconNode={[]}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </Icon>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Name & Version */}
        <div className="fw-form-row">
          <div className="fw-form-group">
            <label className="fw-form-label">
              Framework Name <span className="fs-field-req">*</span>
            </label>
            <input
              type="text"
              className="fw-form-input"
              placeholder="e.g. ABET EAC"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="fw-form-group">
            <label className="fw-form-label">Version / Year</label>
            <input
              type="text"
              className="fw-form-input"
              placeholder="e.g. 2025"
              value={form.version}
              onChange={(e) => set("version", e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        {/* Evaluation Period */}
        <div className="fw-form-group">
          <label className="fw-form-label">Apply to Evaluation Period</label>
          <CustomSelect
            className="fw-form-select"
            value={form.periodId}
            onChange={(v) => set("periodId", v)}
            disabled={saving}
            options={[
              { value: "", label: "All future periods" },
              ...periods.map((p) => ({ value: p.id, label: p.name })),
            ]}
            ariaLabel="Apply to evaluation period"
          />
          <div className="fw-form-hint">
            The framework will be available for outcome mapping in the selected period.
          </div>
        </div>

        {/* Description */}
        <div className="fw-form-group">
          <label className="fw-form-label">
            Description{" "}
            <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
          </label>
          <textarea
            className="fw-form-textarea"
            placeholder="Brief description of the accreditation framework and its intended use..."
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            disabled={saving}
          />
        </div>

        {/* Threshold & Prefix */}
        <div className="fw-form-row">
          <div className="fw-form-group">
            <label className="fw-form-label">Attainment Threshold</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                className="fw-form-input"
                value={form.threshold}
                onChange={(e) => set("threshold", e.target.value)}
                min={0}
                max={100}
                disabled={saving}
                style={{ width: 72, textAlign: "center" }}
              />
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                % of evaluations must meet the scoring threshold for each outcome
              </span>
            </div>
          </div>
          <div className="fw-form-group">
            <label className="fw-form-label">Outcome Code Prefix</label>
            <input
              type="text"
              className="fw-form-input"
              placeholder="e.g. SO, PÇ, PO"
              value={form.prefix}
              onChange={(e) => set("prefix", e.target.value)}
              disabled={saving}
            />
            <div className="fw-form-hint">Used as a prefix for auto-generated outcome codes.</div>
          </div>
        </div>

        <div className="fw-form-divider" />

        {/* Starter Outcomes collapsible */}
        <button
          className="fw-template-toggle"
          type="button"
          onClick={() => setShowSeeds((v) => !v)}
          disabled={saving}
        >
          <Icon
            iconNode={[]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="fw-template-toggle-icon"
            style={{ transform: showSeeds ? "rotate(90deg)" : "none", transition: "transform 0.18s" }}>
            <path d="m9 18 6-6-6-6" />
          </Icon>
          <span className="fw-template-toggle-title">Starter Outcomes</span>
          <span className="fw-template-toggle-badge">Optional</span>
        </button>

        {showSeeds && (
          <div className="fw-template-body">
            <div className="fs-alert info" style={{ margin: "10px 0", padding: "10px 12px" }}>
              <div className="fs-alert-icon" style={{ width: 24, height: 24 }}><Info size={15} /></div>
              <div className="fs-alert-body">
                <div className="fs-alert-desc" style={{ fontSize: 11 }}>
                  Pre-populate your framework with initial outcomes. You can always add, edit, or remove
                  outcomes later from the Outcomes Manager.
                </div>
              </div>
            </div>

            <div>
              {seedRows.map((row) => (
                <div key={row.id} className="fw-seed-row">
                  <input
                    type="text"
                    className="fw-form-input"
                    placeholder="Code"
                    value={row.code}
                    onChange={(e) => updateSeedRow(row.id, "code", e.target.value)}
                    disabled={saving}
                    style={{ width: 80, flexShrink: 0 }}
                  />
                  <input
                    type="text"
                    className="fw-form-input"
                    placeholder="Outcome description..."
                    value={row.label}
                    onChange={(e) => updateSeedRow(row.id, "label", e.target.value)}
                    disabled={saving}
                  />
                  <button
                    className="fw-seed-remove"
                    type="button"
                    title="Remove"
                    onClick={() => removeSeedRow(row.id)}
                    disabled={saving}
                  >
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
              ))}
            </div>

            <button className="fw-seed-add" type="button" onClick={addSeedRow} disabled={saving}>
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </Icon>
              Add outcome row
            </button>
          </div>
        )}
      </div>
      <div className="fs-drawer-footer">
        <div className="fs-footer-meta">
          <Icon
            iconNode={[]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: "var(--text-quaternary)" }}>
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
          </Icon>
          <span style={{ color: "var(--text-quaternary)" }}>New framework</span>
        </div>
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
            <AsyncButtonContent
              loading={saving}
              loadingText="Creating…"
            >
              <>
                <Icon
                  iconNode={[]}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ width: 13, height: 13 }}>
                  <path d="M12 5v14M5 12h14" />
                </Icon>
                Create Framework
              </>
            </AsyncButtonContent>
          </span>
        </button>
      </div>
    </Drawer>
  );
}
