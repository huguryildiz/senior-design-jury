// src/admin/criteria/CriterionEditor.jsx
// Renders a single criterion row's expanded/collapsed content.

import AutoGrow from "../../shared/AutoGrow";
import Tooltip from "../../shared/Tooltip";
import DangerIconButton from "../../components/admin/DangerIconButton";
import { cn } from "@/lib/utils";
import LevelPill, { isKnownBandVariant, getBandPositionStyle, getBandScoreRank } from "../../shared/LevelPill";
import {
  GripVerticalIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  GraduationCapIcon,
  ListChecksIcon,
  LockIcon,
} from "../../shared/Icons";
import { RUBRIC_EDITOR_TEXT } from "../../config";
import {
  getCriterionDisplayName,
  getCriterionTintStyle,
  getBandDisplayLabel,
  getBandRangeLabel,
} from "./criteriaFormHelpers";
import { getMudekTooltipContent, getMudekTooltipLabel } from "./MudekPillSelector";
import MudekPillSelector from "./MudekPillSelector";
import RubricBandEditor from "./RubricBandEditor";

function getRubricTooltipContent(label, rangeLabel, desc) {
  return (
    <span className="criteria-tooltip-content">
      <span className="criteria-tooltip-line criteria-tooltip-line--title">{label}</span>
      {rangeLabel && (
        <span className="criteria-tooltip-line criteria-tooltip-line--muted">
          Range: {rangeLabel}
        </span>
      )}
      {desc && (
        <span className="criteria-tooltip-line criteria-tooltip-line--desc">
          Description: {desc}
        </span>
      )}
    </span>
  );
}

function getRubricTooltipLabel(label, rangeLabel, desc) {
  const parts = [label];
  if (rangeLabel) parts.push(`Range: ${rangeLabel}`);
  if (desc) parts.push(desc);
  return parts.join(" — ");
}

export default function CriterionEditor({
  row, index, errors, rubricErrorsByCriterion, saveAttempted, fullyLocked,
  mudekTemplate, mudekOutcomeByCode, sanitizeMudekSelection,
  rowActions, // { setRow, markTouched, toggleCriterionCard, toggleMudek, toggleRubric, requestRemoveRow }
  rowCount, attributes, listeners, setNodeRef, style
}) {
  const i = index;
  const { setRow, markTouched, toggleCriterionCard, toggleMudek, toggleRubric, requestRemoveRow } = rowActions;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeftColor: row.color || "#94A3B8" }}
      className={`criterion-row${row._expanded ? " is-expanded" : ""}`}
    >
      <div className="criterion-row-top">
        <div className="criterion-row-head">
          <div className="criterion-row-leading">
            <Tooltip text="Drag up or down to reorder criterion">
              <button
                type="button"
                className="touch-none inline-flex items-center justify-center size-[34px] rounded-lg border border-input bg-background text-muted-foreground shadow-sm cursor-grab hover:-translate-y-px hover:border-border hover:shadow-md disabled:opacity-50 disabled:cursor-default disabled:pointer-events-none"
                disabled={fullyLocked}
                aria-label={`Drag to reorder criterion ${i + 1}`}
                {...attributes}
                {...listeners}
              >
                <GripVerticalIcon />
              </button>
            </Tooltip>

            <Tooltip text="Change criterion color accent">
              <label
                className="criterion-color-picker-trigger"
                style={{ backgroundColor: row.color }}
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
          </div>

          <div className="criterion-row-main">
            <div className="criterion-row-title-line">
              <span className="criterion-row-swatch" style={{ backgroundColor: row.color || "#94A3B8" }} aria-hidden="true" />
              <span className="criterion-row-title">{getCriterionDisplayName(row, i)}</span>
            </div>
            <div className="criterion-row-meta">
              {String(row.shortLabel || "No short label")} · {row.max !== "" ? `${row.max} pts` : "No max"}
            </div>
          </div>
        </div>

        <div className="criterion-row-actions">
          <Tooltip text={row._expanded ? "Collapse criterion" : "Expand criterion"}>
            <button
              type="button"
              className="criterion-row-expand-btn inline-flex items-center justify-center size-[34px] rounded-lg border border-input bg-background text-muted-foreground shadow-sm cursor-pointer hover:-translate-y-px hover:border-border hover:shadow-md"
              onClick={() => toggleCriterionCard(i)}
              aria-expanded={row._expanded}
              aria-controls={`criterion-body-${row._id}`}
              aria-label={`${row._expanded ? "Collapse" : "Expand"} criterion ${getCriterionDisplayName(row, i)}`}
            >
              {row._expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>
          </Tooltip>
          <DangerIconButton
            Icon={XIcon}
            onClick={() => requestRemoveRow(i)}
            disabled={fullyLocked || rowCount === 1}
            ariaLabel={`Remove criterion ${i + 1}`}
            title="Remove criterion"
          />
        </div>
      </div>

      <div className="criterion-row-preview">
        <div className="criterion-row-preview-line">
          <span className="criterion-row-kicker">
            <span className="criterion-row-kicker-icon criterion-row-kicker-icon--mudek" aria-hidden="true">
              <GraduationCapIcon />
            </span>
            <span>MÜDEK</span>
          </span>
          <div className="criterion-row-chip-row">
            {sanitizeMudekSelection(row.mudek).length > 0 ? (
              <>
                {sanitizeMudekSelection(row.mudek).map((code) => (
                  <Tooltip
                    key={code}
                    text={getMudekTooltipContent(code, mudekOutcomeByCode.get(code))}
                  >
                    <span
                      className="criterion-row-chip criterion-row-chip--mudek"
                      style={getCriterionTintStyle(row.color)}
                      tabIndex={0}
                      aria-label={getMudekTooltipLabel(code, mudekOutcomeByCode.get(code))}
                    >
                      {code}
                    </span>
                  </Tooltip>
                ))}
              </>
            ) : (
              <span className="criterion-row-empty">None selected</span>
            )}
          </div>
        </div>
        <div className="criterion-row-preview-line">
          <span className="criterion-row-kicker">
            <span className="criterion-row-kicker-icon criterion-row-kicker-icon--rubric" aria-hidden="true">
              <ListChecksIcon />
            </span>
            <span>Rubric</span>
          </span>
          <div className="criterion-row-pill-row">
            {row.rubric.length > 0 ? (
              <>
                {row.rubric.map((band, bi) => {
                    const label = getBandDisplayLabel(row.rubric, bi);
                    const rangeLabel = getBandRangeLabel(band);
                    const desc = String(band?.desc || "").trim();
                    const pillStyle = isKnownBandVariant(band?.level)
                      ? undefined
                      : getBandPositionStyle(getBandScoreRank(row.rubric, band), row.rubric.length);
                    return (
                      <Tooltip
                        key={`${label}-${bi}`}
                        text={getRubricTooltipContent(label, rangeLabel, desc)}
                      >
                        <span
                          className="criteria-rubric-summary-pill-trigger criterion-row-pill-trigger"
                          tabIndex={0}
                          aria-label={getRubricTooltipLabel(label, rangeLabel, desc)}
                        >
                          <LevelPill
                            variant={band?.level}
                            className="criterion-row-pill"
                            style={pillStyle}
                          >
                            <span className="criterion-row-pill-text criteria-pill-typography">{label}</span>
                          </LevelPill>
                        </span>
                      </Tooltip>
                    );
                  })}
                </>
            ) : (
              <span className="criterion-row-empty">No rubric bands</span>
            )}
          </div>
        </div>
      </div>

      {row._expanded && (
        <div id={`criterion-body-${row._id}`} className="criterion-row-editor">
          <div className="criterion-row-expanded-fields">
            {/* Label */}
            <div className="criterion-field criterion-field--label">
              <label className="criteria-manager-cell-label">Label</label>
              <input
                className={cn(
                  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring",
                  (saveAttempted || row._fieldTouched?.label) && errors[`label_${i}`] && "border-destructive"
                )}
                value={row.label}
                onChange={(e) => setRow(i, "label", e.target.value)}
                onBlur={() => markTouched(i, "label")}
                placeholder="Technical Content"
                disabled={fullyLocked}
                aria-label={`Criterion ${i + 1} label`}
              />
              {(saveAttempted || row._fieldTouched?.label) && errors[`label_${i}`] && (
                <div className="text-xs text-destructive">{errors[`label_${i}`]}</div>
              )}
            </div>

            {/* ShortLabel */}
            <div className="criterion-field criterion-field--short">
              <label className="criteria-manager-cell-label">Short label</label>
              <input
                className={cn(
                  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring",
                  (saveAttempted || row._fieldTouched?.shortLabel) && errors[`shortLabel_${i}`] && "border-destructive"
                )}
                value={row.shortLabel}
                onChange={(e) => setRow(i, "shortLabel", e.target.value)}
                onBlur={() => markTouched(i, "shortLabel")}
                placeholder="Technical"
                disabled={fullyLocked}
                aria-label={`Criterion ${i + 1} short label`}
              />
              {(saveAttempted || row._fieldTouched?.shortLabel) && errors[`shortLabel_${i}`] && (
                <div className="text-xs text-destructive">{errors[`shortLabel_${i}`]}</div>
              )}
            </div>

            {/* Max */}
            <div className="criterion-field criterion-field--max relative">
              <label className="criteria-manager-cell-label">Max</label>
              <div className="relative">
                <input
                  className={cn(
                    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring",
                    fullyLocked && "opacity-60 cursor-not-allowed",
                    (saveAttempted || row._fieldTouched?.max) && errors[`max_${i}`] && "border-destructive"
                  )}
                  type="number"
                  min="1"
                  max="100"
                  value={row.max}
                  onChange={(e) => setRow(i, "max", e.target.value)}
                  onBlur={() => markTouched(i, "max")}
                  placeholder="30"
                  disabled={fullyLocked}
                  aria-label={`Criterion ${i + 1} max score`}
                />
                {fullyLocked && (
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                    <LockIcon className="size-4" />
                  </div>
                )}
              </div>
              {(saveAttempted || row._fieldTouched?.max) && errors[`max_${i}`] && (
                <div className="text-xs text-destructive">{errors[`max_${i}`]}</div>
              )}
            </div>
          </div>

          {/* ── Description ── */}
          <div className="criterion-field criterion-field--blurb">
            <label className="criteria-manager-cell-label">Description</label>
            <AutoGrow
              value={row.blurb}
              onChange={(e) => setRow(i, "blurb", e.target.value)}
              onBlur={() => markTouched(i, "blurb")}
              disabled={fullyLocked}
              placeholder={RUBRIC_EDITOR_TEXT.criterionBlurbPlaceholder}
              ariaLabel={`Criterion ${i + 1} description`}
              hasError={(saveAttempted || row._fieldTouched?.blurb) && !!errors[`blurb_${i}`]}
              className="criterion-blurb-textarea"
            />
            {(saveAttempted || row._fieldTouched?.blurb) && errors[`blurb_${i}`] && (
              <div className="text-xs text-destructive">{errors[`blurb_${i}`]}</div>
            )}
          </div>

          {/* ── MÜDEK mapping ── */}
          {mudekTemplate.length > 0 && (
            <div className={`criterion-field criterion-field--mudek criterion-subsection${row._mudekOpen ? " is-open" : " is-collapsed"}`}>
              <div className="criterion-subsection-header">
                <div className="criterion-subsection-title-wrap">
                  <span className="criterion-subsection-title-icon criterion-subsection-title-icon--mudek" aria-hidden="true">
                    <GraduationCapIcon />
                  </span>
                  <span className="criterion-subsection-title">MÜDEK Outcomes</span>
                </div>
                {!fullyLocked && (
                  <Tooltip text={row._mudekOpen ? "Hide MÜDEK selection panel" : "Map this criterion to one or more MÜDEK outcomes"}>
                    <button
                      type="button"
                      className="criterion-subsection-action criterion-subsection-action--mudek"
                      onClick={() => toggleMudek(i)}
                      aria-expanded={row._mudekOpen}
                      aria-label="Select MÜDEK Outcomes"
                    >
                      {row._mudekOpen ? (
                        <><ChevronUpIcon className="criteria-btn-icon" /> Close</>
                      ) : (
                        <><ChevronDownIcon className="criteria-btn-icon" /> Select</>
                      )}
                    </button>
                  </Tooltip>
                )}
              </div>
              <div className="criterion-subsection-body">
                <MudekPillSelector
                  selected={sanitizeMudekSelection(row.mudek)}
                  mudekTemplate={mudekTemplate}
                  onChange={(next) => setRow(i, "mudek", next)}
                  disabled={fullyLocked}
                  criterionColor={row.color}
                  open={row._mudekOpen}
                />
                {errors[`mudek_${i}`] && mudekTemplate.length > 0 && (
                  <div className="text-xs text-destructive">{errors[`mudek_${i}`]}</div>
                )}
              </div>
            </div>
          )}

          {/* ── Rubric bands ── */}
          <div className={`criterion-field criterion-field--rubric criterion-subsection${row._rubricOpen ? " is-open" : " is-collapsed"}`}>
            <div className="criterion-subsection-header">
              <div className="criterion-subsection-title-wrap">
                <span className="criterion-subsection-title-icon criterion-subsection-title-icon--rubric" aria-hidden="true">
                  <ListChecksIcon />
                </span>
                <span className="criterion-subsection-title">Rubric</span>
                <span className="criterion-subsection-meta">
                  {row.rubric.length} band{row.rubric.length !== 1 ? "s" : ""}
                </span>
              </div>
              <Tooltip text={row._rubricOpen ? "Collapse the scoring rubric for this criterion" : "Expand to edit scoring levels and descriptions"}>
                <button
                  type="button"
                  className="criterion-subsection-action rubric-toggle-btn"
                  onClick={() => toggleRubric(i)}
                  aria-expanded={row._rubricOpen}
                >
                  {row._rubricOpen ? (
                    <><ChevronUpIcon className="criteria-btn-icon" /> Hide Rubric</>
                  ) : (
                    <><ChevronDownIcon className="criteria-btn-icon" /> Edit Rubric</>
                  )}
                </button>
              </Tooltip>
            </div>
            <div className="criterion-subsection-body">
              <div className="text-xs text-muted-foreground">Define score ranges so bands cover the full criterion score without overlap.</div>
              {!row._rubricOpen && row.rubric.length > 0 && (
                <div className="criteria-rubric-summary" aria-label="Rubric summary">
                  {row.rubric.map((band, bi) => {
                    const label = getBandDisplayLabel(row.rubric, bi);
                    const rangeLabel = getBandRangeLabel(band);
                    const desc = String(band?.desc || "").trim();
                    const pillStyle = isKnownBandVariant(band?.level)
                      ? undefined
                      : getBandPositionStyle(getBandScoreRank(row.rubric, band), row.rubric.length);
                    return (
                      <Tooltip
                        key={`${label}-${bi}`}
                        text={getRubricTooltipContent(label, rangeLabel, desc)}
                      >
                        <span
                          className="criteria-rubric-summary-pill-trigger"
                          tabIndex={0}
                          aria-label={getRubricTooltipLabel(label, rangeLabel, desc)}
                        >
                          <LevelPill variant={band?.level} className="criteria-rubric-summary-pill" style={pillStyle}>
                            <span className="criteria-rubric-summary-pill-text criteria-pill-typography">{label}</span>
                          </LevelPill>
                        </span>
                      </Tooltip>
                    );
                  })}
                </div>
              )}
              {row._rubricOpen && (
                <div className={fullyLocked ? "opacity-60 cursor-not-allowed" : ""}>
                  <RubricBandEditor
                    bands={row.rubric}
                    onChange={(next) => setRow(i, "rubric", next)}
                    disabled={fullyLocked}
                    criterionMax={row.max}
                    rubricErrors={(row._rubricTouched || saveAttempted) ? rubricErrorsByCriterion[i] : null}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
