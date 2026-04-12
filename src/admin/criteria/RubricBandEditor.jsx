// src/admin/criteria/RubricBandEditor.jsx

import InlineError, { CoverageBanner } from "@/shared/ui/InlineError";
import { clampToCriterionMax, getDescPlaceholder } from "./criteriaFormHelpers";

import { Icon } from "lucide-react";

const BAND_TAG_CLASSES = ["tag-exemplary", "tag-strong", "tag-adequate", "tag-needs-work"];

function getBandTagClass(bi, bands) {
  // Position 0 = best band (highest score = first in array by prototype convention)
  // We use index position relative to total bands
  const idx = Math.min(bi, BAND_TAG_CLASSES.length - 1);
  return BAND_TAG_CLASSES[idx] || "";
}

function getBandColor(bi) {
  const colors = ["#16a34a", "#0f766e", "#b45309", "#dc2626"];
  return colors[Math.min(bi, colors.length - 1)];
}

export default function RubricBandEditor({ bands, onChange, disabled, criterionMax, rubricErrors }) {
  const bandRangeErrors = rubricErrors?.bandRangeErrors ?? {};
  const bandLevelErrors = rubricErrors?.bandLevelErrors ?? {};
  const bandDescErrors  = rubricErrors?.bandDescErrors  ?? {};
  const coverageError   = rubricErrors?.coverageError   ?? null;

  const addBand = () => {
    onChange([...bands, { level: "", min: 0, max: 0, desc: "" }]);
  };
  const removeBand = (bi) => {
    onChange(bands.filter((_, idx) => idx !== bi));
  };
  const setBand = (bi, field, value) => {
    const finalValue = field === "min" || field === "max"
      ? clampToCriterionMax(value, criterionMax)
      : value;
    const next = bands.map((b, idx) => idx === bi ? { ...b, [field]: finalValue } : b);
    onChange(next);
  };

  return (
    <div className="crt-band-grid">
      {coverageError && (
        <CoverageBanner>{coverageError}</CoverageBanner>
      )}
      {bands.map((band, bi) => {
        const rangeError = bandRangeErrors[bi];
        const levelError = bandLevelErrors[bi];
        const descError  = bandDescErrors[bi];
        const hasError   = !!(rangeError || levelError || descError);
        const isValid    = !hasError && band.level && band.min !== "" && band.max !== "";
        const bandColor  = getBandColor(bi);
        const tagClass   = getBandTagClass(bi, bands);

        return (
          <div
            key={bi}
            className={`crt-band-edit${isValid ? " band-valid" : ""}${hasError ? " band-error" : ""}`}
          >
            <div className="crt-band-edit-color" style={{ background: bandColor }} />
            <div className="crt-band-edit-header">
              <div className="crt-band-edit-header-left">
                <span className="crt-band-edit-ordinal">{bi + 1}</span>
                <span className={`crt-band-edit-level-tag ${tagClass}`}>
                  {band.level || `Band ${bi + 1}`}
                </span>
              </div>
              {!disabled && (
                <button
                  type="button"
                  className="crt-band-edit-remove"
                  onClick={() => removeBand(bi)}
                  aria-label={`Remove band ${bi + 1}`}
                  title="Remove band"
                >
                  <Icon
                    iconNode={[]}
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2">
                    <path d="M2 2l8 8M10 2l-8 8" />
                  </Icon>
                </button>
              )}
            </div>
            <div className="crt-band-edit-fields">
              <div className="crt-field">
                <div className="crt-field-label">Level label</div>
                <input
                  className={`crt-field-input${levelError ? " error" : ""}`}
                  value={band.level}
                  onChange={(e) => setBand(bi, "level", e.target.value)}
                  placeholder="e.g. Excellent"
                  disabled={disabled}
                  aria-label={`Band ${bi + 1} level`}
                />
                {levelError && (
                  <InlineError>{levelError}</InlineError>
                )}
              </div>

              <div className="crt-field">
                <div className="crt-field-label">Score range</div>
                <div className="crt-band-edit-range">
                  <input
                    className={`crt-field-input mono${rangeError ? " error" : ""}`}
                    type="number"
                    min="0"
                    max={criterionMax}
                    value={band.min}
                    onChange={(e) => setBand(bi, "min", e.target.value)}
                    placeholder="0"
                    disabled={disabled}
                    aria-label={`Band ${bi + 1} min`}
                  />
                  <span className="range-sep">–</span>
                  <input
                    className={`crt-field-input mono${rangeError ? " error" : ""}`}
                    type="number"
                    min="0"
                    max={criterionMax}
                    value={band.max}
                    onChange={(e) => setBand(bi, "max", e.target.value)}
                    placeholder={criterionMax || "30"}
                    disabled={disabled}
                    aria-label={`Band ${bi + 1} max`}
                  />
                </div>
                {rangeError && (
                  <InlineError>{rangeError}</InlineError>
                )}
              </div>

              <div className="crt-field full">
                <div className="crt-field-label">
                  Description <span className="crt-opt">(optional)</span>
                </div>
                <textarea
                  className={`crt-textarea${descError ? " error" : ""}`}
                  value={band.desc}
                  onChange={(e) => setBand(bi, "desc", e.target.value)}
                  disabled={disabled}
                  placeholder={getDescPlaceholder(band.level)}
                  aria-label={`Band ${bi + 1} description`}
                  rows={2}
                />
                {descError && (
                  <InlineError>{descError}</InlineError>
                )}
              </div>
            </div>
            {(isValid || hasError) && (
              <div className={`crt-band-edit-helper ${hasError ? "helper-error" : "helper-success"}`}>
                {hasError ? (
                  <>
                    <Icon
                      iconNode={[]}
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true">
                      <circle cx="6" cy="6" r="5" />
                      <path d="M6 4v3M6 8.5v.5" />
                    </Icon>
                    {rangeError || levelError || descError}
                  </>
                ) : (
                  <>
                    <Icon
                      iconNode={[]}
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true">
                      <polyline points="2,6.5 5,9.5 10,3" />
                    </Icon>
                    Looks good
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
      {!disabled && (
        <button type="button" className="crt-band-add" onClick={addBand}>
          <Icon
            iconNode={[]}
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true">
            <circle cx="7" cy="7" r="6" />
            <path d="M7 4v6M4 7h6" />
          </Icon>
          Add Band
        </button>
      )}
    </div>
  );
}
