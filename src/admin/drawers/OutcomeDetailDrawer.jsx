// src/admin/drawers/OutcomeDetailDrawer.jsx
// Drawer: edit an existing programme outcome.
// Targets the framework_outcomes table.
//
// Props:
//   open         — boolean
//   onClose      — () => void
//   outcome      — { id, code, shortLabel, description, criterionIds }
//   criteria     — [{ id, label, color }] — for criterion mapping chips
//   onSave       — ({ code, shortLabel, description, criterionIds, coverageType }) => Promise<void>
//   error        — string | null

import { useState, useEffect } from "react";
import { AlertCircle, Info, X, Check, CheckCircle2 } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import useShakeOnError from "@/shared/hooks/useShakeOnError";
import AutoTextarea from "@/shared/ui/AutoTextarea";
import InlineError from "@/shared/ui/InlineError";

export default function OutcomeDetailDrawer({ open, onClose, outcome, criteria = [], onSave, error }) {
  const [code, setCode] = useState("");
  const [shortLabel, setShortLabel] = useState("");
  const [description, setDescription] = useState("");
  const [criterionIds, setCriterionIds] = useState([]);
  const [coverageType, setCoverageType] = useState("direct");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (open && outcome) {
      setCode(outcome.code ?? "");
      setShortLabel(outcome.shortLabel ?? "");
      setDescription(outcome.description ?? "");
      setCriterionIds(outcome.criterionIds ?? []);
      setCoverageType(outcome.coverageType ?? "direct");
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
        code: code.trim(),
        shortLabel: shortLabel.trim(),
        description: description.trim() || null,
        criterionIds,
        coverageType,
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
  const canSave = code.trim() && shortLabel.trim();

  return (
    <Drawer open={open} onClose={onClose} className="fs-drawer-narrow">
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {code && (
              <div className="acc-drawer-outcome-code">{code}</div>
            )}
            <div className="fs-title-group">
              <div className="fs-title">Edit Outcome</div>
              <div className="fs-subtitle">Update descriptions and criterion mappings.</div>
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

        {/* Identity */}
        <div className="acc-detail-section-label">Outcome Identity</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          <div className="fs-field">
            <label className="fs-field-label">Code <span className="fs-field-req">*</span></label>
            <input
              className="fs-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={saving}
              maxLength={12}
            />
          </div>
          <div className="fs-field">
            <label className="fs-field-label">Short Label <span className="fs-field-req">*</span></label>
            {(() => {
              const slWords = (shortLabel || "").trim().split(/\s+/).filter(Boolean).length;
              const slOver  = slWords > 20;
              return (
                <>
                  <input
                    className={["fs-input", slOver && "error"].filter(Boolean).join(" ")}
                    style={{ textTransform: "capitalize", marginTop: 2 }}
                    value={shortLabel}
                    onChange={(e) => setShortLabel(e.target.value)}
                    disabled={saving}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", fontSize: "10.5px", marginTop: 3 }}>
                    <span style={{ color: slOver ? "var(--danger)" : "var(--text-quaternary)", fontVariantNumeric: "tabular-nums" }}>
                      {slWords}/20 words
                    </span>
                  </div>
                  {slOver && <InlineError>Max 20 words</InlineError>}
                </>
              );
            })()}
          </div>
        </div>

        <div className="acc-detail-section-label">Description</div>
        <div className="acc-drawer-field">
          <AutoTextarea
            className="fs-input"
            style={{ resize: "none", overflow: "hidden", padding: "10px 12px", fontSize: 13, marginTop: 6, minHeight: 40 }}
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
                  <Check size={16} strokeWidth={2.5} />
                </span>
              </label>
            ))}
          </div>
        )}

        {/* Coverage Type */}
        <div className="acc-detail-section-label" style={{ marginTop: 18 }}>Coverage Type</div>
        <div className="acc-coverage-type-selector">
          <div
            className={`acc-coverage-type-option${coverageType === "direct" ? " selected cov-direct" : ""}`}
            onClick={() => !saving && setCoverageType("direct")}
          >
            <div className="acc-cov-radio" />
            <div>
              <div className="acc-cov-type-label">Direct</div>
              <div className="acc-cov-type-desc">Explicitly assessed by criteria</div>
            </div>
          </div>
          <div
            className={`acc-coverage-type-option${coverageType === "indirect" ? " selected cov-indirect" : ""}`}
            onClick={() => !saving && setCoverageType("indirect")}
          >
            <div className="acc-cov-radio" />
            <div>
              <div className="acc-cov-type-label">Indirect</div>
              <div className="acc-cov-type-desc">Tangentially assessed</div>
            </div>
          </div>
        </div>
      </div>
      <div className="fs-drawer-footer">
        <div className="fs-footer-meta">
          <CheckCircle2 size={16} strokeWidth={2} />
          <span>Changes saved on confirm</span>
        </div>
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button
          ref={saveBtnRef}
          className="fs-btn fs-btn-primary"
          type="button"
          onClick={handleSave}
          disabled={saving || !canSave}
        >
          <span className="btn-loading-content">
            <AsyncButtonContent loading={saving} loadingText="Saving…">Save Changes</AsyncButtonContent>
          </span>
        </button>
      </div>
    </Drawer>
  );
}
