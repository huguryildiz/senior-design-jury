// src/admin/criteria/RubricBandEditor.jsx

import { useState, useEffect } from "react";
import { clampToCriterionMax, getDescPlaceholder } from "./criteriaFormHelpers";
import CoverageBar from "./CoverageBar";
import { Icon, AlertCircle, Wand2, X, ChevronRight } from "lucide-react";

const BAND_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

export default function RubricBandEditor({ bands, onChange, disabled, criterionMax, rubricErrors }) {
  const [expandedIndex, setExpandedIndex] = useState(0); // first band expanded by default

  const bandRangeErrors = rubricErrors?.bandRangeErrors ?? {};
  const bandLevelErrors = rubricErrors?.bandLevelErrors ?? {};
  const bandDescErrors  = rubricErrors?.bandDescErrors  ?? {};
  const coverageError   = rubricErrors?.coverageError   ?? null;

  // Auto-expand the first band that has an error when errors appear
  useEffect(() => {
    if (!rubricErrors) return;
    const allErroredBands = new Set([
      ...Object.keys(bandRangeErrors),
      ...Object.keys(bandLevelErrors),
      ...Object.keys(bandDescErrors),
    ].map(Number));
    if (allErroredBands.size === 0) return;
    const firstErrored = Math.min(...allErroredBands);
    setExpandedIndex(firstErrored);
  }, [rubricErrors]); // eslint-disable-line react-hooks/exhaustive-deps

  const addBand = () => {
    onChange([...bands, { level: "", min: 0, max: 0, desc: "" }]);
  };

  const autoDistribute = () => {
    const max = Number(criterionMax);
    if (!max || max <= 0 || bands.length < 2) return;
    const n = bands.length;
    const width = Math.floor(max / n);
    const next = bands.map((b, i) => ({
      ...b,
      min: i * width,
      max: i === n - 1 ? max : (i + 1) * width - 1,
    }));
    onChange(next);
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
  // Display bands sorted high→low by max score; original indices preserved for ops
  const sortedIndices = [...bands.keys()].sort(
    (a, b) => Number(bands[b].max) - Number(bands[a].max)
  );

  return (
    <div className="crt-band-grid">
      {sortedIndices.map((bi, sortedPos) => {
        const band = bands[bi];
        const rangeError    = bandRangeErrors[bi];
        const rangeInvalid  = !!(rangeError || coverageError); // drives red border; coverage doesn't repeat inline
        const levelError    = bandLevelErrors[bi];
        const descError     = bandDescErrors[bi];
        const hasError      = !!(rangeInvalid || levelError || descError);
        const isValid    = !hasError && band.level && band.min !== "" && band.max !== "";
        const bandColor  = BAND_COLORS[sortedPos % BAND_COLORS.length];
        const isExpanded = expandedIndex === bi;

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
                style={{ background: hasError ? "var(--danger)" : bandColor }}
              />
              <span className="crt-band-level">
                {band.level || "Untitled"}
              </span>
              <span className="crt-band-range-text">
                {band.min}–{band.max}
              </span>
              {hasError && !isExpanded && (
                <span className="crt-band-error-badge" title="This band has errors">!</span>
              )}
              {!disabled && bands.length > 0 && (
                <button
                  className="crt-band-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBand(bi);
                  }}
                  type="button"
                  aria-label={`Remove band ${bi + 1}`}
                >
                  <X size={13} strokeWidth={2} />
                </button>
              )}
              <span className="crt-band-chevron"><ChevronRight size={14} strokeWidth={2} /></span>
            </div>

            {/* Expanded body */}
            {isExpanded && (
              <div className="crt-band-body">
                {/* Level input */}
                <div className="crt-field">
                  <div className="crt-field-label">Level label <span style={{color:"var(--danger)"}}>*</span></div>
                  <input
                    className={`crt-band-input${levelError ? " error" : ""}`}
                    value={band.level}
                    onChange={(e) => setBand(bi, "level", e.target.value)}
                    placeholder="e.g. Excellent"
                    disabled={disabled}
                    aria-label={`Band ${bi + 1} level`}
                  />
                  {levelError && <p className="crt-field-error"><AlertCircle size={12} strokeWidth={2} />{levelError}</p>}
                </div>

                {/* Range inputs */}
                <div className="crt-field">
                  <div className="crt-field-label">Score range <span style={{color:"var(--danger)"}}>*</span></div>
                  <div className="crt-band-range-inputs">
                    <input
                      className={`crt-band-input${rangeInvalid ? " error" : ""}`}
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
                      className={`crt-band-input${rangeInvalid ? " error" : ""}`}
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
                  {rangeError && <p className="crt-field-error"><AlertCircle size={12} strokeWidth={2} />{rangeError}</p>}
                </div>

                {/* Description */}
                <div className="crt-field">
                  <div className="crt-field-label">Description <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>(optional)</span></div>
                  <textarea
                    className={`crt-textarea${descError ? " error" : ""}`}
                    value={band.desc}
                    onChange={(e) => setBand(bi, "desc", e.target.value)}
                    disabled={disabled}
                    placeholder={getDescPlaceholder(band.level)}
                    aria-label={`Band ${bi + 1} description`}
                    rows={3}
                  />
                  {descError && <p className="crt-field-error"><AlertCircle size={12} strokeWidth={2} />{descError}</p>}
                </div>

              </div>
            )}
          </div>
        );
      })}

      {/* Coverage bar */}
      <CoverageBar bands={bands} maxScore={Number(criterionMax) || 0} />
      {coverageError && (
        <p className="crt-field-error crt-coverage-error">
          <AlertCircle size={12} strokeWidth={2} />
          {coverageError}
        </p>
      )}

      {/* Band actions row */}
      {!disabled && (
        <div className="crt-band-actions">
          <button
            type="button"
            className="crt-band-auto"
            onClick={autoDistribute}
            disabled={!criterionMax || Number(criterionMax) <= 0 || bands.length < 2}
            title="Evenly distribute score ranges across all bands"
          >
            <Wand2 size={13} strokeWidth={2} />
            Auto Distribute
          </button>
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
        </div>
      )}
    </div>
  );
}
