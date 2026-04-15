// src/admin/drawers/AddOutcomeDrawer.jsx
// Drawer: add a new programme outcome to a framework.
// Targets the framework_outcomes table.
//
// Props:
//   open                — boolean
//   onClose             — () => void
//   frameworkName       — string — shown in header tag
//   frameworkId         — string | null — current period's framework
//   platformFrameworks  — [{ id, name, description }] — global templates
//   organizationId      — string
//   selectedPeriodId    — string
//   onFrameworksChange  — () => void — triggers reload after framework assignment
//   criteria            — [{ id, label, color }] — for criterion mapping chips
//   onSave              — ({ code, shortLabel, description, criterionIds }) => Promise<void>
//   error               — string | null

import { useState, useEffect } from "react";
import { AlertCircle, BadgeCheck, Info, PlusCircle, X, Check } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import useShakeOnError from "@/shared/hooks/useShakeOnError";
import AutoTextarea from "@/shared/ui/AutoTextarea";
import InlineError from "@/shared/ui/InlineError";
import { useToast } from "@/shared/hooks/useToast";
import { cloneFramework, assignFrameworkToPeriod, createFramework } from "@/shared/api";

const EMPTY = { code: "", shortLabel: "", description: "", criterionIds: [] };

export default function AddOutcomeDrawer({
  open,
  onClose,
  frameworkName = "",
  frameworkId = null,
  platformFrameworks = [],
  organizationId,
  selectedPeriodId,
  onFrameworksChange,
  criteria = [],
  onSave,
  error,
}) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [assigningFw, setAssigningFw] = useState(false);

  useEffect(() => {
    if (open) { setForm(EMPTY); setSaveError(""); setSaving(false); setAssigningFw(false); }
  }, [open]);

  const handleSelectTemplate = async (fw) => {
    if (!organizationId || !selectedPeriodId) return;
    setAssigningFw(true);
    try {
      const autoName = fw ? fw.name : "Custom Framework";
      const newFw = fw
        ? await cloneFramework(fw.id, autoName, organizationId)
        : await createFramework({ name: autoName, organization_id: organizationId });
      await assignFrameworkToPeriod(selectedPeriodId, newFw.id);
      toast.success(fw ? `"${fw.name}" framework assigned` : "Blank framework created");
      onFrameworksChange?.();
    } catch (e) {
      toast.error(e?.message || "Failed to assign framework");
    } finally {
      setAssigningFw(false);
    }
  };

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

  const noFramework = !frameworkId;

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className={`fs-icon ${noFramework ? "accent" : "success"}`} aria-hidden="true">
              {noFramework ? <BadgeCheck size={18} strokeWidth={2} /> : <PlusCircle size={18} strokeWidth={2} />}
            </div>
            <div className="fs-title-group">
              <div className="fs-title">Add Outcome</div>
              <div className="fs-subtitle">
                {noFramework
                  ? "Choose a starting framework for this period."
                  : "Define a new programme outcome for the active framework."}
              </div>
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="fs-drawer-body" style={{ padding: "18px 20px" }}>
        {noFramework ? (
          /* ── Step 1: No framework assigned — pick a default template ── */
          <>
            <div className="fpd-section-label" style={{ marginBottom: 10 }}>Default Templates</div>
            <div className="fw-template-cards">
              {platformFrameworks.map((fw) => (
                <button
                  key={fw.id}
                  type="button"
                  className="fw-template-card"
                  onClick={() => handleSelectTemplate(fw)}
                  disabled={assigningFw}
                >
                  <div className="fw-template-card-icon">
                    <BadgeCheck size={20} strokeWidth={1.75} />
                  </div>
                  <div className="fw-template-card-body">
                    <div className="fw-template-card-name">{fw.name}</div>
                    {fw.description && (
                      <div className="fw-template-card-desc">{fw.description}</div>
                    )}
                  </div>
                </button>
              ))}
              {platformFrameworks.length === 0 && (
                <div style={{ fontSize: 12, color: "var(--text-quaternary)", padding: "8px 0" }}>
                  No platform templates available.
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: 11, color: "var(--text-quaternary)", fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
            <button
              type="button"
              className="fw-template-card"
              style={{ width: "100%" }}
              onClick={() => handleSelectTemplate(null)}
              disabled={assigningFw}
            >
              <div className="fw-template-card-icon">
                <PlusCircle size={20} strokeWidth={1.75} />
              </div>
              <div className="fw-template-card-body">
                <div className="fw-template-card-name">Start with a blank framework</div>
                <div className="fw-template-card-desc">Add your own outcomes from scratch</div>
              </div>
            </button>
          </>
        ) : (
          /* ── Step 2: Framework assigned — add the outcome ── */
          <>
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
                    Short unique identifier (PO-5, SO-3, 1.2)
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
          </>
        )}
      </div>
      <div className="fs-drawer-footer">
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose} disabled={saving || assigningFw}>
          Cancel
        </button>
        {!noFramework && (
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
        )}
      </div>
    </Drawer>
  );
}
