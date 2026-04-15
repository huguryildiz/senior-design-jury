// src/admin/drawers/EditSingleCriterionDrawer.jsx
// Single-criterion editor drawer with weight budget indicator.
// Opens from CriteriaPage row actions ("Edit") or "Add Criterion" button.

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Check, AlertCircle, X, Plus, Pencil, Lock } from "lucide-react";
import AutoTextarea from "@/shared/ui/AutoTextarea";
import Drawer from "@/shared/ui/Drawer";
import AlertCard from "@/shared/ui/AlertCard";
import InlineError from "@/shared/ui/InlineError";
import { RUBRIC_EDITOR_TEXT } from "../../shared/constants";
import { validateCriterion } from "../../shared/criteriaValidation";
import { criterionToConfig } from "../../shared/criteria/criteriaHelpers";
import {
  templateToRow,
  emptyRow,
  clampRubricBandsToCriterionMax,
  rescaleRubricBandsByWeight,
  defaultRubricBands,
  getConfigRubricSeed,
} from "../criteria/criteriaFormHelpers";
import OutcomePillSelector from "../criteria/OutcomePillSelector";
import RubricBandEditor from "../criteria/RubricBandEditor";
import { usePeriodOutcomes } from "../hooks/usePeriodOutcomes";

export default function EditSingleCriterionDrawer({
  open,
  onClose,
  period,
  criterion,        // null → add new, object → edit existing
  editIndex,        // index in criteriaConfig; -1 or null → add
  criteriaConfig,   // full criteria array (stored shape)
  outcomeConfig,
  onSave,
  disabled,
  isLocked,
  initialTab,       // optional: 'details' | 'rubric' | 'mapping'
}) {
  const isNew = editIndex == null || editIndex < 0;
  const formRef = useRef(null);
  const saveBtnRef = useRef(null);

  // ── Form state ──────────────────────────────────────────────
  const [row, setRowState] = useState(() =>
    criterion ? templateToRow(criterion, 0) : emptyRow(criteriaConfig || [])
  );
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [touched, setTouched] = useState({});
  const [activeTab, setActiveTab] = useState("details");

  // Reset when drawer opens with a new target
  useEffect(() => {
    if (open) {
      const newRow = criterion
        ? templateToRow(criterion, 0)
        : emptyRow(criteriaConfig || []);
      setRowState(newRow);
      setSaveAttempted(false);
      setSaving(false);
      setSaveError("");
      setTouched({});
      setActiveTab(initialTab || "details");
    }
  }, [open, editIndex, initialTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Budget ──────────────────────────────────────────────────
  const otherTotal = useMemo(
    () =>
      (criteriaConfig || []).reduce(
        (sum, c, i) => (!isNew && i === editIndex ? sum : sum + (Number(c.max) || 0)),
        0
      ),
    [criteriaConfig, editIndex, isNew]
  );

  const currentMax = Number(row.max) || 0;
  const newTotal = otherTotal + currentMax;
  const available = 100 - otherTotal;

  // ── Period outcomes + mappings (source of truth: period_criterion_outcome_maps)
  const periodId = period?.id || null;
  const criterionId = !isNew ? criterion?.id || null : null;
  const po = usePeriodOutcomes({ periodId });

  // Outcome options for the Mapping tab: prefer hook data (period-scoped),
  // fall back to parent's outcomeConfig (framework-level) when the hook
  // hasn't loaded yet or a non-frozen period is being edited.
  const outcomeOptions = useMemo(() => {
    if (po.outcomes && po.outcomes.length > 0) {
      return po.outcomes.map((o) => ({
        id: o.id,
        code: o.code,
        desc_en: o.label || o.description || "",
        desc_tr: o.description || "",
      }));
    }
    return outcomeConfig || [];
  }, [po.outcomes, outcomeConfig]);

  // Currently-mapped outcome codes for this criterion (from pcom).
  const mappedCodes = useMemo(() => {
    if (!criterionId || !po.mappings) return [];
    const outcomeById = new Map(po.outcomes.map((o) => [o.id, o.code]));
    return po.mappings
      .filter((m) => m.period_criterion_id === criterionId)
      .map((m) => outcomeById.get(m.period_outcome_id))
      .filter(Boolean);
  }, [criterionId, po.mappings, po.outcomes]);

  const outcomeIdByCode = useMemo(
    () => new Map(po.outcomes.map((o) => [o.code, o.id])),
    [po.outcomes]
  );

  // Toggle mapping by diffing current vs next code list.
  const [mappingBusy, setMappingBusy] = useState(false);
  const handleMappingChange = useCallback(async (nextCodes) => {
    if (!periodId || !criterionId || mappingBusy) return;
    const current = new Set(mappedCodes);
    const next = new Set(nextCodes);
    const toAdd = [...next].filter((c) => !current.has(c));
    const toRemove = [...current].filter((c) => !next.has(c));
    if (toAdd.length === 0 && toRemove.length === 0) return;
    setMappingBusy(true);
    try {
      for (const code of toAdd) {
        const outcomeId = outcomeIdByCode.get(code);
        if (outcomeId) await po.addMapping(criterionId, outcomeId, "direct");
      }
      for (const code of toRemove) {
        const outcomeId = outcomeIdByCode.get(code);
        if (outcomeId) await po.removeMapping(criterionId, outcomeId);
      }
    } finally {
      setMappingBusy(false);
    }
  }, [periodId, criterionId, mappingBusy, mappedCodes, outcomeIdByCode, po]);

  // Legacy sanitizer kept for disposable-draft check compatibility.
  const sanitizeOutcomes = useCallback(() => mappedCodes, [mappedCodes]);

  // ── Validation ──────────────────────────────────────────────
  const allRows = useMemo(() => {
    if (isNew) return [...(criteriaConfig || []), row];
    return (criteriaConfig || []).map((c, i) => (i === editIndex ? row : c));
  }, [criteriaConfig, editIndex, isNew, row]);

  const rowIndex = isNew ? allRows.length - 1 : editIndex;
  const { errors: fieldErrors, rubricErrors } = validateCriterion(
    row,
    allRows,
    outcomeConfig,
    rowIndex
  );

  const showError = (field) =>
    (saveAttempted || touched[field]) && fieldErrors[field];

  const fullyLocked = isLocked || disabled;

  // ── Field setters ───────────────────────────────────────────
  const setField = useCallback((field, value) => {
    let finalValue = value;
    if (field === "max" && value !== "") {
      const n = Number(value);
      if (!isNaN(n)) {
        if (n < 0) finalValue = "0";
        else if (n > 100) finalValue = "100";
        else if (Number.isInteger(n)) finalValue = String(n);
      }
    }
    setRowState((prev) => {
      let next = { ...prev, [field]: finalValue };
      if (field === "max" && finalValue !== "" && next.rubric.length > 0) {
        next.rubric = rescaleRubricBandsByWeight(next.rubric, Number(finalValue));
      }
      if (field === "rubric") next._rubricTouched = true;
      return next;
    });
    setSaveError("");
  }, []);

  const markTouched = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // ── Tab switching with rubric auto-seed ─────────────────────
  const handleTabChange = useCallback((tab) => {
    if (tab === "rubric" && row.rubric.length === 0) {
      const seeded =
        getConfigRubricSeed(row) ||
        defaultRubricBands(Number(row.max) || 30);
      const cMax = Number(row.max);
      const bounded =
        Number.isFinite(cMax) && cMax >= 0
          ? clampRubricBandsToCriterionMax(seeded, cMax)
          : seeded;
      setRowState((r) => ({ ...r, rubric: bounded, _rubricTouched: true }));
    }
    setActiveTab(tab);
  }, [row.rubric.length, row.max]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save ────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (isLocked) {
      setSaveError("Locked — scores exist for this period.");
      return;
    }

    setSaveAttempted(true);

    const hasFieldErrors = Object.keys(fieldErrors).length > 0;
    const hasRubricErrors =
      rubricErrors &&
      (Object.keys(rubricErrors.bandRangeErrors).length > 0 ||
        Object.keys(rubricErrors.bandLevelErrors).length > 0 ||
        Object.keys(rubricErrors.bandDescErrors).length > 0 ||
        rubricErrors.coverageError);

    if (hasFieldErrors || hasRubricErrors) {
      if (hasRubricErrors) setActiveTab("rubric");
      if (fieldErrors.outcome) setActiveTab("mapping");

      // Shake the save button
      if (saveBtnRef.current) {
        saveBtnRef.current.classList.remove("vera-btn-shake");
        // Force reflow so re-adding the class restarts the animation
        void saveBtnRef.current.offsetWidth;
        saveBtnRef.current.classList.add("vera-btn-shake");
      }

      // Scroll to first error field
      requestAnimationFrame(() => {
        const firstError = formRef.current?.querySelector(".vera-inline-error, .vera-coverage-banner, .error");
        if (firstError) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });

      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const boundedRubric = clampRubricBandsToCriterionMax(
        row.rubric,
        Number(row.max)
      );
      // Outcome mappings are managed separately via period_criterion_outcome_maps
      // RPCs. Criteria payload carries metadata only.
      const config = criterionToConfig({
        ...row,
        outcomes: [],
        rubric: boundedRubric,
      });

      const newTemplate = isNew
        ? [...(criteriaConfig || []), config]
        : (criteriaConfig || []).map((c, i) =>
            i === editIndex ? config : c
          );

      const result = await onSave(newTemplate);
      if (!result?.ok) {
        setSaveError(result?.error || "Could not save. Try again.");
      } else {
        onClose();
      }
    } catch (e) {
      setSaveError(e?.message || "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }, [
    isLocked,
    fieldErrors,
    rubricErrors,
    row,
    isNew,
    criteriaConfig,
    editIndex,
    onSave,
    onClose,
  ]);

  // ── Derived ─────────────────────────────────────────────────
  const budgetFillOther = Math.min(100, otherTotal);
  const budgetFillCurrent = Math.min(
    100 - budgetFillOther,
    Math.max(0, currentMax)
  );
  const budgetColor =
    newTotal === 100
      ? "var(--success)"
      : newTotal > 100
        ? "var(--danger)"
        : "var(--accent)";

  return (
    <Drawer open={open} onClose={onClose} id="drawer-edit-single-criterion">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="crt-drawer-icon">
              {isNew ? <Plus size={17} strokeWidth={2} /> : <Pencil size={17} strokeWidth={2} />}
            </div>
            <div>
              <div className="crt-drawer-title">
                {isNew ? "Add Criterion" : "Edit Criterion"}
              </div>
              <div className="crt-drawer-subtitle">
                {isNew ? "New criterion" : (criterion?.label ?? "Criterion")}
                {period?.name && ` · ${period.name}`}
              </div>
            </div>
          </div>
          <button
            className="fs-close"
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 7 }}
            aria-label="Close"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────── */}
      <div className="crt-drawer-tabs">
        <button
          className={`crt-drawer-tab${activeTab === "details" ? " active" : ""}`}
          onClick={() => setActiveTab("details")}
          type="button"
        >
          Details
        </button>
        <button
          className={`crt-drawer-tab${activeTab === "rubric" ? " active" : ""}`}
          onClick={() => handleTabChange("rubric")}
          type="button"
        >
          Rubric
          <span className="crt-drawer-tab-badge">{row.rubric.length}</span>
        </button>
        <button
          className={`crt-drawer-tab${activeTab === "mapping" ? " active" : ""}`}
          onClick={() => setActiveTab("mapping")}
          type="button"
        >
          Mapping
          <span className="crt-drawer-tab-badge">{mappedCodes.length}</span>
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────── */}
      <div className="fs-drawer-body">
        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="crt-tab-panel">
            {/* Budget bar */}
            <div className="crt-drawer-budget">
              <div className="crt-drawer-budget-header">
                <span className="crt-drawer-budget-label">Weight Budget</span>
                <span
                  className="crt-drawer-budget-value"
                  style={{ color: budgetColor }}
                >
                  {newTotal} / 100{newTotal === 100 ? " ✓" : ""}
                </span>
              </div>
              <div className="crt-drawer-budget-track">
                <div
                  className="crt-drawer-budget-fill-current"
                  style={{
                    width: `${Math.min(100, newTotal)}%`,
                    background: budgetColor,
                  }}
                />
              </div>
            </div>

            {/* Form */}
            <div className="crt-single-form" ref={formRef}>
              {/* Label */}
              <div className="crt-field">
                <div className="crt-field-label">
                  Label <span className="crt-req">*</span>
                </div>
                <input
                  className={[
                    "crt-field-input",
                    showError("label") && "error",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  value={row.label}
                  onChange={(e) => setField("label", e.target.value)}
                  onBlur={() => markTouched("label")}
                  placeholder="Technical Content"
                  aria-label="Criterion label"
                />
                {showError("label") && (
                  <InlineError>{fieldErrors.label}</InlineError>
                )}
              </div>

              {/* Short label */}
              {(() => {
                const slLen  = (row.shortLabel || "").trim().length;
                const slOver = slLen > 25;
                return (
                  <div className="crt-field">
                    <div className="crt-field-label">
                      Short label <span className="crt-req">*</span>
                    </div>
                    <input
                      className={[
                        "crt-field-input crt-field-capitalize",
                        (showError("shortLabel") || slOver) && "error",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      value={row.shortLabel}
                      onChange={(e) => setField("shortLabel", e.target.value)}
                      onBlur={() => markTouched("shortLabel")}
                      placeholder="Technical"
                      aria-label="Criterion short label"
                      maxLength={30}
                    />
                    <div className="crt-field-hint" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      {slOver
                        ? <span style={{ color: "var(--danger)", fontSize: "11px" }}>Max 25 characters</span>
                        : showError("shortLabel")
                          ? <span style={{ color: "var(--danger)", fontSize: "11px" }}>{fieldErrors.shortLabel}</span>
                          : <span>Shown in juror scoring interface</span>
                      }
                      <span style={{ color: slOver ? "var(--danger)" : "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
                        {slLen}/25 characters
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Weight */}
              <div className="crt-field">
                <div className="crt-field-label">
                  Weight (points) <span className="crt-req">*</span>
                </div>
                {fullyLocked ? (
                  <>
                    <input
                      className="crt-field-input mono locked"
                      value={row.max}
                      readOnly
                      aria-label="Criterion weight (locked)"
                    />
                    <div className="crt-locked-hint">
                      <Lock size={12} /> Locked
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      className={[
                        "crt-field-input mono",
                        showError("max") && "error",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      type="number"
                      min="1"
                      max="100"
                      value={row.max}
                      onChange={(e) => setField("max", e.target.value)}
                      onBlur={() => markTouched("max")}
                      placeholder="30"
                      aria-label="Criterion weight"
                    />
                    {!currentMax ? (
                      <div className="crt-field-hint">
                        Other criteria use {otherTotal} pts · {available} pts available
                      </div>
                    ) : newTotal === 100 ? (
                      <div className="crt-field-hint hint-success">
                        ✓ Perfect — budget fully allocated
                      </div>
                    ) : newTotal > 100 ? (
                      <div className="crt-field-hint hint-danger">
                        Over budget by {newTotal - 100} pts
                      </div>
                    ) : (
                      <div className="crt-field-hint hint-warning">
                        {100 - newTotal} pts remaining
                      </div>
                    )}
                    {showError("max") && (
                      <InlineError>{fieldErrors.max}</InlineError>
                    )}
                  </>
                )}
              </div>

              {/* Description */}
              <div className="crt-field">
                <div className="crt-field-label">
                  Description <span className="crt-opt">(optional)</span>
                </div>
                <AutoTextarea
                  className={[
                    "crt-textarea",
                    showError("blurb") && "error",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  value={row.blurb}
                  onChange={(e) => setField("blurb", e.target.value)}
                  onBlur={() => markTouched("blurb")}
                  placeholder={RUBRIC_EDITOR_TEXT.criterionBlurbPlaceholder}
                  aria-label="Criterion description"
                />
                {showError("blurb") && (
                  <InlineError>{fieldErrors.blurb}</InlineError>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rubric Tab */}
        {activeTab === "rubric" && (
          <div className="crt-tab-panel">
            <RubricBandEditor
              bands={row.rubric}
              onChange={(next) => setField("rubric", next)}
              disabled={fullyLocked}
              criterionMax={row.max}
              rubricErrors={
                row._rubricTouched || saveAttempted ? rubricErrors : null
              }
            />
          </div>
        )}

        {/* Mapping Tab */}
        {activeTab === "mapping" && (
          <div className="crt-tab-panel">
            {isNew ? (
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "20px 0" }}>
                Save the criterion first to configure outcome mappings.
              </div>
            ) : outcomeOptions.length > 0 ? (
              <OutcomePillSelector
                selected={mappedCodes}
                outcomeConfig={outcomeOptions}
                onChange={handleMappingChange}
                disabled={fullyLocked || mappingBusy}
              />
            ) : (
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "20px 0" }}>
                No outcomes configured. Go to Outcomes page to define them.
              </div>
            )}
          </div>
        )}

        {/* Save error - always visible */}
        {saveError && (
          <div style={{ marginTop: 16 }}>
            <AlertCard variant="error">{saveError}</AlertCard>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <div className="fs-drawer-footer">
        <div className="crt-footer-meta">
          {!row.label?.trim() ? (
            <>
              <AlertCircle size={14} style={{ color: "var(--danger)", flexShrink: 0 }} />
              <span style={{ color: "var(--danger)" }}>Label required</span>
            </>
          ) : !currentMax ? (
            <>
              <AlertCircle size={14} style={{ color: "var(--danger)", flexShrink: 0 }} />
              <span style={{ color: "var(--danger)" }}>Weight required</span>
            </>
          ) : (
            <>
              <Check size={14} style={{ color: "var(--success)", flexShrink: 0 }} />
              <span style={{ color: "var(--success)" }}>
                {row.label} · <span className="crt-footer-count">{currentMax}</span> pts
              </span>
            </>
          )}
        </div>
        <button className="crt-cancel-btn" onClick={onClose}>
          Cancel
        </button>
        <button
          ref={saveBtnRef}
          className="crt-save-btn"
          disabled={saving || fullyLocked}
          onClick={handleSave}
        >
          {saving ? "Saving…" : isNew ? "Add Criterion" : "Done"}
        </button>
      </div>
    </Drawer>
  );
}
