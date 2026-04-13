// src/admin/criteria/RubricBandEditor.jsx

import { useState } from "react";
import InlineError, { CoverageBanner } from "@/shared/ui/InlineError";
import { clampToCriterionMax, getDescPlaceholder } from "./criteriaFormHelpers";
import CoverageBar from "./CoverageBar";
import AutoTextarea from "@/shared/ui/AutoTextarea";
import { Icon } from "lucide-react";

const BAND_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

export default function RubricBandEditor({ bands, onChange, disabled, criterionMax, rubricErrors }) {
  const [expandedIndex, setExpandedIndex] = useState(0); // first band expanded by default

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
  const toggleDescription = (bi) => {
    const band = bands[bi];
    const hasDesc = band.desc && band.desc.trim().length > 0;
    setBand(bi, "desc", hasDesc ? "" : " ");
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
        const bandColor  = BAND_COLORS[bi % BAND_COLORS.length];
        const isExpanded = expandedIndex === bi;
        const hasDesc    = band.desc && band.desc.trim().length > 0;

        return (
          <div
            key={bi}
            className={`crt-band-card ${isExpanded ? "expanded" : ""}`}
          >
            {/* Collapsed header */}
            <div
              className="crt-band-header"
              onClick={() => setExpandedIndex(isExpanded ? -1 : bi)}
            >
              <span
                className="crt-band-dot"
                style={{ background: bandColor }}
              />
              <span className="crt-band-level">
                {band.level || "Untitled"}
              </span>
              <span className="crt-band-range-text">
                {band.min}–{band.max}
              </span>
              {!disabled && bands.length > 2 && (
                <button
                  className="crt-band-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBand(bi);
                  }}
                  type="button"
                  aria-label={`Remove band ${bi + 1}`}
                >
                  ×
                </button>
              )}
              <span className="crt-band-chevron">▸</span>
            </div>

            {/* Expanded body */}
            {isExpanded && (
              <div className="crt-band-body">
                {/* Level input */}
                <div className="crt-field">
                  <div className="crt-field-label">Level label</div>
                  <input
                    className={`crt-band-input${levelError ? " error" : ""}`}
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

                {/* Range inputs */}
                <div className="crt-field">
                  <div className="crt-field-label">Score range</div>
                  <div className="crt-band-range-inputs">
                    <input
                      className={`crt-band-input${rangeError ? " error" : ""}`}
                      type="number"
                      min="0"
                      max={criterionMax}
                      value={band.min}
                      onChange={(e) => setBand(bi, "min", e.target.value)}
                      placeholder="0"
                      disabled={disabled}
                      aria-label={`Band ${bi + 1} min`}
                    />
                    <span className="crt-band-range-sep">–</span>
                    <input
                      className={`crt-band-input${rangeError ? " error" : ""}`}
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

                {/* Optional description */}
                <div className="crt-field">
                  {!hasDesc ? (
                    <button
                      type="button"
                      className="crt-band-desc-toggle"
                      onClick={() => toggleDescription(bi)}
                      disabled={disabled}
                    >
                      + Add description (optional)
                    </button>
                  ) : (
                    <>
                      <div className="crt-field-label">
                        Description{" "}
                        <button
                          type="button"
                          className="crt-band-desc-toggle"
                          onClick={() => toggleDescription(bi)}
                          disabled={disabled}
                          style={{ marginLeft: "8px" }}
                        >
                          Remove
                        </button>
                      </div>
                      <AutoTextarea
                        className={`crt-textarea${descError ? " error" : ""}`}
                        value={band.desc}
                        onChange={(e) => setBand(bi, "desc", e.target.value)}
                        disabled={disabled}
                        placeholder={getDescPlaceholder(band.level)}
                        aria-label={`Band ${bi + 1} description`}
                      />
                      {descError && (
                        <InlineError>{descError}</InlineError>
                      )}
                    </>
                  )}
                </div>

                {/* Validation feedback */}
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
                          aria-hidden="true"
                        >
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
                          aria-hidden="true"
                        >
                          <polyline points="2,6.5 5,9.5 10,3" />
                        </Icon>
                        Looks good
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Coverage bar */}
      <CoverageBar bands={bands} maxScore={Number(criterionMax) || 0} />

      {/* Add Band button */}
      {!disabled && (
        <button type="button" className="crt-band-add" onClick={addBand}>
          <Icon
            iconNode={[]}
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="6" />
            <path d="M7 4v6M4 7h6" />
          </Icon>
          Add Band
        </button>
      )}
    </div>
  );
}
