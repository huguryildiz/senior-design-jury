// src/admin/criteria/CriterionEditor.jsx
// Renders a single criterion row's expanded/collapsed content.

import Tooltip from "@/shared/ui/Tooltip";
import InlineError from "@/shared/ui/InlineError";
import AutoTextarea from "@/shared/ui/AutoTextarea";
import {
  XIcon,
  ChevronRightIcon,
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
  rowCount, setNodeRef, style
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
          <span
            className="crt-card-color-dot"
            style={{ backgroundColor: row.color || "#94A3B8" }}
          />

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

          {!fullyLocked && (
            <button
              type="button"
              className="crt-delete-btn"
              onClick={() => requestRemoveRow(i)}
              disabled={rowCount === 1}
              aria-label={`Remove criterion ${i + 1}`}
              title="Remove criterion"
            >
              <XIcon />
            </button>
          )}
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
              <InlineError>{errors[`label_${i}`]}</InlineError>
            )}
          </div>

          {(() => {
            const slWords = (row.shortLabel || "").trim().split(/\s+/).filter(Boolean).length;
            const slOver  = slWords > 20;
            return (
              <div className="crt-field">
                <div className="crt-field-label">Short label</div>
                <input
                  className={[
                    "crt-field-input crt-field-capitalize",
                    (slOver || ((saveAttempted || row._fieldTouched?.shortLabel) && errors[`shortLabel_${i}`])) && "error",
                  ].filter(Boolean).join(" ")}
                  value={row.shortLabel}
                  onChange={(e) => setRow(i, "shortLabel", e.target.value)}
                  onBlur={() => markTouched(i, "shortLabel")}
                  placeholder="Technical"
                  aria-label={`Criterion ${i + 1} short label`}
                />
                <div className="crt-field-hint" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span />
                  <span style={{ color: slOver ? "var(--danger)" : "var(--text-quaternary)", fontVariantNumeric: "tabular-nums" }}>
                    {slWords}/20 words
                  </span>
                </div>
                {slOver && <InlineError>Max 20 words</InlineError>}
                {!slOver && (saveAttempted || row._fieldTouched?.shortLabel) && errors[`shortLabel_${i}`] && (
                  <InlineError>{errors[`shortLabel_${i}`]}</InlineError>
                )}
              </div>
            );
          })()}

          <div className="crt-field">
            <div className="crt-field-label">Weight</div>
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
                  Locked — scores exist
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
                  <InlineError>{errors[`max_${i}`]}</InlineError>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Description ── */}
        <div className="crt-field" style={{ marginTop: 10 }}>
          <div className="crt-field-label">
            Description <span className="crt-opt">(optional)</span>
          </div>
          <AutoTextarea
            className={[
              "crt-textarea",
              (saveAttempted || row._fieldTouched?.blurb) && errors[`blurb_${i}`] && "error",
            ].filter(Boolean).join(" ")}
            value={row.blurb}
            onChange={(e) => setRow(i, "blurb", e.target.value)}
            onBlur={() => markTouched(i, "blurb")}
            placeholder={RUBRIC_EDITOR_TEXT.criterionBlurbPlaceholder}
            aria-label={`Criterion ${i + 1} description`}
          />
          {(saveAttempted || row._fieldTouched?.blurb) && errors[`blurb_${i}`] && (
            <InlineError>{errors[`blurb_${i}`]}</InlineError>
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
              <ChevronRightIcon />
              Outcome Mapping
              <span className="crt-sub-count">
                {sanitizeOutcomeSelection(row.outcomes).length} mapped
              </span>
            </button>
            {row._outcomeOpen && (
              <div className="crt-sub-body">
                <OutcomePillSelector
                  selected={sanitizeOutcomeSelection(row.outcomes)}
                  outcomeConfig={outcomeConfig}
                  onChange={(next) => setRow(i, "outcomes", next)}
                  disabled={fullyLocked}
                />
                {errors[`outcome_${i}`] && (
                  <InlineError>{errors[`outcome_${i}`]}</InlineError>
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
            <ChevronRightIcon />
            Rubric Bands
            <span className="crt-sub-count">
              {row.rubric.length} level{row.rubric.length !== 1 ? "s" : ""}
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
