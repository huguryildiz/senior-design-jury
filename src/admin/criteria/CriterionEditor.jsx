// src/admin/criteria/CriterionEditor.jsx
// Renders a single criterion row's expanded/collapsed content.

import Tooltip from "@/shared/ui/Tooltip";
import {
  GripVerticalIcon,
  XIcon,
  ChevronRightIcon,
  GraduationCapIcon,
  ListChecksIcon,
  LockIcon,
} from "@/shared/ui/Icons";
import { RUBRIC_EDITOR_TEXT } from "../../shared/constants";
import {
  getCriterionDisplayName,
  getBandRangeLabel,
} from "./criteriaFormHelpers";
import { getOutcomeTooltipContent, getOutcomeTooltipLabel } from "./OutcomePillSelector";
import OutcomePillSelector from "./OutcomePillSelector";
import RubricBandEditor from "./RubricBandEditor";

export default function CriterionEditor({
  row, index, errors, rubricErrorsByCriterion, saveAttempted, fullyLocked,
  outcomeConfig, outcomeByCode, sanitizeOutcomeSelection,
  rowActions, // { setRow, markTouched, toggleCriterionCard, toggleOutcome, toggleRubric, requestRemoveRow }
  rowCount, attributes, listeners, setNodeRef, style
}) {
  const i = index;
  const { setRow, markTouched, toggleCriterionCard, toggleOutcome, toggleRubric, requestRemoveRow } = rowActions;

  const hasError =
    (saveAttempted && (errors[`label_${i}`] || errors[`shortLabel_${i}`] || errors[`blurb_${i}`] || errors[`max_${i}`] || errors[`outcome_${i}`])) ||
    (saveAttempted && rubricErrorsByCriterion?.[i]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`crt-card${row._expanded ? " crt-expanded" : ""}${hasError ? " crt-card-error" : ""}`}
    >
      {/* Card header — always visible */}
      <div className="crt-card-header">
        <div className="crt-card-header-left">
          <Tooltip text="Drag up or down to reorder">
            <button
              type="button"
              className="vera-drag-handle"
              disabled={fullyLocked}
              aria-label={`Drag to reorder criterion ${i + 1}`}
              {...attributes}
              {...listeners}
            >
              <GripVerticalIcon />
            </button>
          </Tooltip>

          <Tooltip text="Change color accent">
            <label
              className="crt-card-color-dot"
              style={{ backgroundColor: row.color || "#94A3B8", cursor: fullyLocked ? "default" : "pointer" }}
              title="Change color"
            >
              <input
                type="color"
                className="criterion-color-input--hidden"
                value={row.color}
                onChange={(e) => setRow(i, "color", e.target.value)}
                disabled={fullyLocked}
                aria-label={`Criterion ${i + 1} color`}
              />
            </label>
          </Tooltip>

          <span className="crt-card-name">{getCriterionDisplayName(row, i)}</span>
        </div>

        <div className="crt-card-header-right">
          <span className="crt-card-pts">
            {row.max !== "" ? `${row.max} pts` : "—"}
          </span>

          <Tooltip text={row._expanded ? "Collapse" : "Expand"}>
            <button
              type="button"
              className={`crt-card-toggle${row._expanded ? " open" : ""}`}
              onClick={() => toggleCriterionCard(i)}
              aria-expanded={row._expanded}
              aria-controls={`criterion-body-${row._id}`}
              aria-label={`${row._expanded ? "Collapse" : "Expand"} ${getCriterionDisplayName(row, i)}`}
            >
              <ChevronRightIcon />
            </button>
          </Tooltip>

          <button
            type="button"
            className="crt-delete-btn"
            onClick={() => requestRemoveRow(i)}
            disabled={fullyLocked || rowCount === 1}
            aria-label={`Remove criterion ${i + 1}`}
            title="Remove criterion"
          >
            <XIcon />
          </button>
        </div>
      </div>

      {/* Expanded body — CSS hides this when not .crt-expanded */}
      <div id={`criterion-body-${row._id}`}>

        {/* ── Field grid: Label / Short label / Max ── */}
        <div className="crt-field-grid">
          <div className="crt-field">
            <div className="crt-field-label">Label</div>
            <input
              className={[
                "crt-field-input",
                (saveAttempted || row._fieldTouched?.label) && errors[`label_${i}`] && "error",
              ].filter(Boolean).join(" ")}
              value={row.label}
              onChange={(e) => setRow(i, "label", e.target.value)}
              onBlur={() => markTouched(i, "label")}
              placeholder="Technical Content"
              aria-label={`Criterion ${i + 1} label`}
            />
            {(saveAttempted || row._fieldTouched?.label) && errors[`label_${i}`] && (
              <div className="vera-field-error--xs">{errors[`label_${i}`]}</div>
            )}
          </div>

          <div className="crt-field">
            <div className="crt-field-label">Short label</div>
            <input
              className={[
                "crt-field-input",
                (saveAttempted || row._fieldTouched?.shortLabel) && errors[`shortLabel_${i}`] && "error",
              ].filter(Boolean).join(" ")}
              value={row.shortLabel}
              onChange={(e) => setRow(i, "shortLabel", e.target.value)}
              onBlur={() => markTouched(i, "shortLabel")}
              placeholder="Technical"
              aria-label={`Criterion ${i + 1} short label`}
            />
            {(saveAttempted || row._fieldTouched?.shortLabel) && errors[`shortLabel_${i}`] && (
              <div className="vera-field-error--xs">{errors[`shortLabel_${i}`]}</div>
            )}
          </div>

          <div className="crt-field">
            <div className="crt-field-label">Max pts</div>
            {fullyLocked ? (
              <>
                <input
                  className="crt-field-input mono locked"
                  value={row.max}
                  readOnly
                  aria-label={`Criterion ${i + 1} max score (locked)`}
                />
                <div className="crt-locked-hint">
                  <LockIcon />
                  Score-locked
                </div>
              </>
            ) : (
              <>
                <input
                  className={[
                    "crt-field-input mono",
                    (saveAttempted || row._fieldTouched?.max) && errors[`max_${i}`] && "error",
                  ].filter(Boolean).join(" ")}
                  type="number"
                  min="1"
                  max="100"
                  value={row.max}
                  onChange={(e) => setRow(i, "max", e.target.value)}
                  onBlur={() => markTouched(i, "max")}
                  placeholder="30"
                  aria-label={`Criterion ${i + 1} max score`}
                />
                {(saveAttempted || row._fieldTouched?.max) && errors[`max_${i}`] && (
                  <div className="vera-field-error--xs">{errors[`max_${i}`]}</div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Description ── */}
        <div className="crt-field" style={{ marginTop: 10 }}>
          <div className="crt-field-label">
            Description
          </div>
          <textarea
            className={[
              "crt-textarea",
              (saveAttempted || row._fieldTouched?.blurb) && errors[`blurb_${i}`] && "error",
            ].filter(Boolean).join(" ")}
            value={row.blurb}
            onChange={(e) => setRow(i, "blurb", e.target.value)}
            onBlur={() => markTouched(i, "blurb")}
            placeholder={RUBRIC_EDITOR_TEXT.criterionBlurbPlaceholder}
            aria-label={`Criterion ${i + 1} description`}
            rows={2}
          />
          {(saveAttempted || row._fieldTouched?.blurb) && errors[`blurb_${i}`] && (
            <div className="vera-field-error--xs">{errors[`blurb_${i}`]}</div>
          )}
        </div>

        {/* ── Outcome mapping ── */}
        {outcomeConfig.length > 0 && (
          <div className="crt-sub">
            <button
              type="button"
              className={`crt-sub-toggle${row._outcomeOpen ? " open" : ""}`}
              onClick={() => !fullyLocked && toggleOutcome(i)}
              aria-expanded={row._outcomeOpen}
              disabled={fullyLocked}
            >
              <GraduationCapIcon />
              Outcomes
              <span className="crt-sub-count">
                {sanitizeOutcomeSelection(row.mudek).length} mapped
              </span>
            </button>
            {row._outcomeOpen && (
              <div className="crt-sub-body">
                <OutcomePillSelector
                  selected={sanitizeOutcomeSelection(row.mudek)}
                  outcomeConfig={outcomeConfig}
                  onChange={(next) => setRow(i, "mudek", next)}
                  disabled={fullyLocked}
                />
                {errors[`outcome_${i}`] && (
                  <div className="vera-field-error--xs" style={{ marginTop: 6 }}>{errors[`outcome_${i}`]}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Rubric bands ── */}
        <div className="crt-sub">
          <button
            type="button"
            className={`crt-sub-toggle${row._rubricOpen ? " open" : ""}`}
            onClick={() => toggleRubric(i)}
            aria-expanded={row._rubricOpen}
          >
            <ListChecksIcon />
            Rubric
            <span className="crt-sub-count">
              {row.rubric.length} band{row.rubric.length !== 1 ? "s" : ""}
            </span>
          </button>
          {row._rubricOpen && (
            <div className="crt-sub-body">
              <RubricBandEditor
                bands={row.rubric}
                onChange={(next) => setRow(i, "rubric", next)}
                disabled={fullyLocked}
                criterionMax={row.max}
                rubricErrors={(row._rubricTouched || saveAttempted) ? rubricErrorsByCriterion?.[i] : null}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
