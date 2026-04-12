// src/admin/drawers/OutcomeDetailDrawer.jsx
// Drawer: edit an existing programme outcome.
// Targets the framework_outcomes table.
//
// Props:
//   open         — boolean
//   onClose      — () => void
//   outcome      — { id, code, shortLabel, description, criterionIds }
//   criteria     — [{ id, label, color }] — for criterion mapping chips
//   onSave       — ({ description, criterionIds }) => Promise<void>
//   error        — string | null

import { useState, useEffect } from "react";
import { AlertCircle, Info, Icon } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import useShakeOnError from "@/shared/hooks/useShakeOnError";

export default function OutcomeDetailDrawer({ open, onClose, outcome, criteria = [], onSave, error }) {
  const [description, setDescription] = useState("");
  const [criterionIds, setCriterionIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (open && outcome) {
      setDescription(outcome.description ?? "");
      setCriterionIds(outcome.criterionIds ?? []);
      setSaveError("");
      setSaving(false);
    }
  }, [open, outcome]);

  const toggleCriterion = (id) =>
    setCriterionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSave = async () => {
    setSaveError("");
    setSaving(true);
    try {
      await onSave?.({
        description: description.trim() || null,
        criterionIds,
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
    <Drawer open={open} onClose={onClose} className="fs-drawer-narrow">
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {outcome?.code && (
              <div className="acc-drawer-outcome-code">{outcome.code}</div>
            )}
            <div className="fs-title-group">
              <div className="fs-title">Edit Outcome</div>
              <div className="fs-subtitle">Update descriptions and criterion mappings.</div>
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></Icon>
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

        <div className="acc-detail-section-label">Description</div>
        <div className="acc-drawer-field">
          <textarea
            className="fs-input"
            style={{ height: 90, resize: "vertical", padding: "10px 12px", fontSize: 13, marginTop: 6 }}
            placeholder="Outcome description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="acc-detail-section-label" style={{ marginTop: 18 }}>Criterion Mapping</div>
        <div className="fs-alert info" style={{ marginBottom: 10, padding: "10px 12px" }}>
          <div className="fs-alert-icon" style={{ width: 24, height: 24 }}><Info size={15} /></div>
          <div className="fs-alert-body">
            <div className="fs-alert-desc" style={{ fontSize: 11 }}>
              Select criteria that explicitly assess this outcome. Mapped criteria contribute to <strong style={{ color: "var(--success)" }}>Direct</strong> coverage. Outcomes with no selected criteria remain <strong style={{ color: "var(--warning)" }}>Indirect</strong> or <strong>Not mapped</strong>.
            </div>
          </div>
        </div>
        {criteria.length > 0 && (
          <div className="acc-drawer-criteria-grid">
            {criteria.map((c) => (
              <label
                key={c.id}
                className={`acc-drawer-crit-chip${criterionIds.includes(c.id) ? " selected" : ""}`}
                onClick={() => !saving && toggleCriterion(c.id)}
                style={{ cursor: saving ? "not-allowed" : "pointer" }}
              >
                <span className="acc-crit-dot" style={{ background: c.color }} />
                {c.label}
                <span className="acc-crit-check">
                  <Icon
                    iconNode={[]}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></Icon>
                </span>
              </label>
            ))}
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
            strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></Icon>
          <span>Changes saved on confirm</span>
        </div>
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button
          ref={saveBtnRef}
          className="fs-btn fs-btn-primary"
          type="button"
          onClick={handleSave}
          disabled={saving}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={saving} loadingText="Saving…">Save Changes</AsyncButtonContent>
          </span>
        </button>
      </div>
    </Drawer>
  );
}
