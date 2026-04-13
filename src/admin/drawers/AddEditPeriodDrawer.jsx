// src/admin/drawers/AddEditPeriodDrawer.jsx
// Drawer: add or edit an evaluation period.
//
// Props:
//   open              — boolean
//   onClose           — () => void
//   period            — null (add) or period object (edit)
//   onSave            — (data) => Promise<void>
//   allPeriods        — array of all periods (for "Copy Criteria From" in add mode)
//   onNavigateToCriteria — () => void

import { useState, useEffect } from "react";
import {
  AlertCircle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy,
  BarChart2,
  ChevronRight,
  Icon,
} from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import CustomSelect from "@/shared/ui/CustomSelect";
import { getPeriodCounts } from "@/shared/api";
import useShakeOnError from "@/shared/hooks/useShakeOnError";
import { formatDate } from "@/shared/lib/dateUtils";
import FrameworkPickerModal from "../modals/FrameworkPickerModal";


const LOCK_OPTIONS = [
  { value: "open", label: "Open — scoring enabled" },
  { value: "locked", label: "Locked — scores finalized" },
];

const VISIBILITY_OPTIONS = [
  { value: "visible", label: "Visible to all admins" },
  { value: "hidden", label: "Hidden (archived)" },
];

export default function AddEditPeriodDrawer({
  open,
  onClose,
  period,
  onSave,
  allPeriods = [],
  frameworks = [],
  onNavigateToCriteria,
}) {
  const isEdit = !!period;

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formIsLocked, setFormIsLocked] = useState("open");
  const [formIsVisible, setFormIsVisible] = useState("visible");
  const [formCopyCriteriaFrom, setFormCopyCriteriaFrom] = useState("");
  const [formFrameworkId, setFormFrameworkId] = useState(null);
  const [formFrameworkName, setFormFrameworkName] = useState("");
  const [fwPickerOpen, setFwPickerOpen] = useState(false);

  const [counts, setCounts] = useState(null);
  const [countsLoading, setCountsLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (!open) return;
    setFormName(period?.name ?? "");
    setFormDescription(period?.description ?? "");
    setFormStartDate(period?.start_date ? period.start_date.slice(0, 10) : "");
    setFormEndDate(period?.end_date ? period.end_date.slice(0, 10) : "");
    setFormIsLocked(period?.is_locked ? "locked" : "open");
    setFormIsVisible(period?.is_visible === false ? "hidden" : "visible");
    setFormCopyCriteriaFrom("");
    setFormFrameworkId(period?.framework_id ?? null);
    setFormFrameworkName(
      period?.framework_id ? (frameworks.find((f) => f.id === period.framework_id)?.name || "") : ""
    );
    setSaveError("");
    setNameError("");
    setSaving(false);
    setCounts(null);

    if (isEdit && period?.id) {
      setCountsLoading(true);
      getPeriodCounts(period.id)
        .then(setCounts)
        .catch(() => setCounts(null))
        .finally(() => setCountsLoading(false));
    }
  }, [open, period?.id]);

  // Name uniqueness check (edit mode)
  useEffect(() => {
    if (!isEdit || !formName.trim()) { setNameError(""); return; }
    const dup = allPeriods.some(
      (p) => p.id !== period?.id && p.name.trim().toLowerCase() === formName.trim().toLowerCase()
    );
    setNameError(dup ? "Period name already exists." : "");
  }, [formName, allPeriods, isEdit, period?.id]);

  const criteriaItems = Array.isArray(period?.criteria_config) ? period.criteria_config : [];

  const copyFromOptions = [
    { value: "", label: "None — start fresh" },
    ...allPeriods
      .filter((p) => p.id !== period?.id)
      .map((p) => ({ value: p.id, label: p.name })),
  ];

  const handleSave = async () => {
    if (!formName.trim() || nameError) return;
    setSaveError("");
    setSaving(true);
    try {
      await onSave?.({
        name: formName.trim(),
        description: formDescription.trim() || null,
        start_date: formStartDate || null,
        end_date: formEndDate || null,
        is_locked: formIsLocked === "locked",
        is_visible: formIsVisible === "visible",
        ...(!isEdit && formCopyCriteriaFrom ? { copyCriteriaFromPeriodId: formCopyCriteriaFrom } : {}),
        frameworkId: formFrameworkId || null,
      });
      onClose();
    } catch (e) {
      setSaveError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = formName.trim() && !nameError && !saving;
  const saveBtnRef = useShakeOnError(saveError);

  return (
    <Drawer open={open} onClose={onClose}>
      {/* ── Header ── */}
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
                {isEdit
                  ? <><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></>
                  : <><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></>}
              </Icon>
            </span>
            <div className="fs-title-group">
              <div className="fs-title">{isEdit ? `Edit Period — ${period.name}` : "Add Evaluation Period"}</div>
              <div className="fs-subtitle">
                {isEdit ? "Update period details and evaluation settings." : "Create a new evaluation period for this organization."}
              </div>
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
      {/* ── Body ── */}
      <div className="fs-drawer-body">
        {saveError && (
          <div className="fs-alert danger" style={{ marginBottom: 14 }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">{saveError}</div>
          </div>
        )}

        {/* ── PERIOD DETAILS ── */}
        <div className="fs-section">
          <div className="fs-section-header">
            <div className="fs-section-title">Period Details</div>
          </div>

          <div className="fs-field">
            <label className="fs-field-label">
              Period Name <span className="fs-field-req">*</span>
            </label>
            <input
              className={`fs-input${nameError ? " fs-input-error" : ""}`}
              type="text"
              placeholder="e.g. Spring 2026"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={saving}
              autoFocus
            />
            {nameError && (
              <div className="fs-field-helper" style={{ color: "var(--danger, #ef4444)" }}>
                <AlertCircle size={11} style={{ verticalAlign: "-1px" }} /> {nameError}
              </div>
            )}
            {!nameError && formName.trim() && (
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
              Description <span className="fs-field-opt">(optional)</span>
            </label>
            <textarea
              className="fs-textarea"
              rows={2}
              placeholder="Brief description of this evaluation period…"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              disabled={saving}
              style={{ resize: "vertical", minHeight: 60 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="fs-field" style={{ margin: 0 }}>
              <label className="fs-field-label">
                Start Date <span className="fs-field-opt">(optional)</span>
              </label>
              <input
                className="fs-input"
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="fs-field" style={{ margin: 0 }}>
              <label className="fs-field-label">
                End Date <span className="fs-field-opt">(optional)</span>
              </label>
              <input
                className="fs-input"
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                min={formStartDate || undefined}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {/* ── ADD MODE: SCORING SETUP ── */}
        {!isEdit && (
          <div className="fs-section">
            <div className="fs-section-header">
              <div className="fs-section-title">Scoring Setup</div>
            </div>

            <div
              style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "10px 12px", borderRadius: "var(--radius)",
                background: "rgba(59,130,246,.06)", border: "1px solid rgba(59,130,246,.14)",
                fontSize: 12, color: "var(--text-secondary)", marginBottom: 14,
              }}
            >
              <BarChart2 size={14} style={{ flexShrink: 0, marginTop: 1, color: "var(--accent)" }} />
              <span>Criteria can be configured in detail after creation via <strong>Configure Criteria</strong>.</span>
            </div>

            <div className="fs-field">
              <label className="fs-field-label">
                Copy Criteria From <span className="fs-field-opt">(optional)</span>
              </label>
              <CustomSelect
                value={formCopyCriteriaFrom}
                onChange={setFormCopyCriteriaFrom}
                options={copyFromOptions}
                disabled={saving}
                ariaLabel="Copy criteria from period"
              />
              <div className="fs-field-helper hint">Inherit scoring criteria and rubrics from an existing period.</div>
            </div>

            <div className="fs-field">
              <label className="fs-field-label">
                Framework <span className="fs-field-opt">(optional)</span>
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    background: "var(--surface-1)",
                    fontSize: 13,
                    color: formFrameworkName ? "var(--text-primary)" : "var(--text-tertiary)",
                  }}
                >
                  {formFrameworkName || "— Select or add later from the Outcomes page —"}
                </div>
                <button
                  type="button"
                  className="fs-btn fs-btn-secondary"
                  style={{ flexShrink: 0, fontSize: 12, padding: "6px 12px" }}
                  onClick={() => setFwPickerOpen(true)}
                  disabled={saving}
                >
                  {formFrameworkName ? "Change" : "Select…"}
                </button>
                {formFrameworkName && (
                  <button
                    type="button"
                    className="fs-btn fs-btn-secondary"
                    style={{ flexShrink: 0, fontSize: 12, padding: "6px 10px", color: "var(--text-tertiary)" }}
                    onClick={() => { setFormFrameworkId(null); setFormFrameworkName(""); }}
                    disabled={saving}
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="fs-field-helper hint">
                The selected framework will be cloned for this period. You can also set it later from the Outcomes page.
              </div>
            </div>

            <div className="fs-field">
              <label className="fs-field-label">Evaluation Lock</label>
              <CustomSelect
                value={formIsLocked}
                onChange={setFormIsLocked}
                options={LOCK_OPTIONS}
                disabled={saving}
                ariaLabel="Evaluation lock"
              />
            </div>

            <div className="fs-field">
              <label className="fs-field-label">Visibility</label>
              <CustomSelect
                value={formIsVisible}
                onChange={setFormIsVisible}
                options={VISIBILITY_OPTIONS}
                disabled={saving}
                ariaLabel="Visibility"
              />
            </div>
          </div>
        )}

        {/* ── EDIT MODE: EVALUATION SETTINGS ── */}
        {isEdit && (
          <div className="fs-section">
            <div className="fs-section-header">
              <div className="fs-section-title">Evaluation Settings</div>
            </div>

            <div className="fs-field">
              <label className="fs-field-label">Evaluation Lock</label>
              <CustomSelect
                value={formIsLocked}
                onChange={setFormIsLocked}
                options={LOCK_OPTIONS}
                disabled={saving}
                ariaLabel="Evaluation lock"
              />
              <div className="fs-field-helper hint">
                {formIsLocked === "locked"
                  ? "Scoring is closed — scores are finalized and read-only."
                  : "Scoring is open — jurors can submit and edit evaluations."}
              </div>
            </div>

            <div className="fs-field">
              <label className="fs-field-label">Visibility</label>
              <CustomSelect
                value={formIsVisible}
                onChange={setFormIsVisible}
                options={VISIBILITY_OPTIONS}
                disabled={saving}
                ariaLabel="Visibility"
              />
            </div>
          </div>
        )}

        {/* ── EDIT MODE: SCORING CRITERIA ── */}
        {isEdit && (
          <div className="fs-section">
            <div className="fs-section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="fs-section-title">Scoring Criteria</div>
              {onNavigateToCriteria && (
                <button
                  type="button"
                  onClick={() => { onClose(); onNavigateToCriteria(); }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 11.5, fontWeight: 600, color: "var(--accent)",
                    background: "none", border: "none", cursor: "pointer", padding: "2px 0",
                  }}
                >
                  Edit Criteria &amp; Rubrics
                  <ChevronRight size={12} />
                </button>
              )}
            </div>

            {criteriaItems.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {criteriaItems.map((c, i) => (
                  <span
                    key={c.id || i}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "3px 10px", borderRadius: 99,
                      fontSize: 11.5, fontWeight: 600,
                      background: c.color ? `${c.color}18` : "var(--surface-1)",
                      color: c.color || "var(--text-secondary)",
                      border: `1px solid ${c.color ? `${c.color}30` : "var(--border)"}`,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color || "var(--border)", flexShrink: 0 }} />
                    {c.label || c.short_label || c.id}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "8px 0" }}>
                No criteria configured yet. Use <strong>Edit Criteria &amp; Rubrics</strong> to set up scoring.
              </div>
            )}
          </div>
        )}

        {/* ── EDIT MODE: OVERVIEW ── */}
        {isEdit && (
          <div className="fs-section">
            <div className="fs-section-header">
              <div className="fs-section-title">Overview</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Project Groups", value: countsLoading ? "…" : (Number(counts?.project_count) > 0 ? counts.project_count : "—") },
                { label: "Jurors", value: countsLoading ? "…" : counts?.juror_count ?? "—" },
                { label: "Scores Recorded", value: countsLoading ? "…" : counts?.score_count ?? "—" },
                { label: "Created", value: formatDate(period?.created_at) },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    padding: "10px 12px",
                    background: "var(--surface-1)",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--mono)", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2, fontWeight: 500 }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* ── Footer ── */}
      <div className="fs-drawer-footer">
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button
          ref={saveBtnRef}
          className="fs-btn fs-btn-primary"
          type="button"
          onClick={handleSave}
          disabled={!canSave}
        >
          <AsyncButtonContent loading={saving} loadingText="Saving…">
            {isEdit ? "Save Changes" : "Create Period"}
          </AsyncButtonContent>
        </button>
      </div>
      <FrameworkPickerModal
        open={fwPickerOpen}
        onClose={() => setFwPickerOpen(false)}
        frameworks={frameworks}
        onSelect={(fw) => {
          setFormFrameworkId(fw.id);
          setFormFrameworkName(fw.name);
        }}
      />
    </Drawer>
  );
}
