// src/jury/components/RubricSheet.jsx
// Rubric bottom sheet — slides up when juror taps "Rubric" on a criterion card.
// Matches prototype djOpenRubricSheet / dj-rub-sheet HTML exactly.
import { useState } from "react";

const BAND_COLORS = {
  Excellent: "#22c55e",
  Good: "#84cc16",
  Developing: "#eab308",
  Insufficient: "#ef4444",
};

function levelToTag(level = "") {
  return level.toLowerCase().replace(/\s+/g, "_");
}

function getActiveBandIndex(rubric, score) {
  if (score === "" || score == null) return -1;
  const n = Number(score);
  return rubric.findIndex((b) => n >= Number(b.min) && n <= Number(b.max));
}

export default function RubricSheet({ crit, score, outcomeLookup, onClose }) {
  const [metaOpen, setMetaOpen] = useState(false);

  if (!crit) return null;

  const rubric = Array.isArray(crit.rubric) ? crit.rubric : [];
  const mudek = Array.isArray(crit.mudek) ? crit.mudek : [];
  const activeBand = getActiveBandIndex(rubric, score);
  const hasMudek = mudek.length > 0;

  const hasScore = score !== "" && score != null;
  const numScore = hasScore ? Number(score) : null;
  const activeLevelLabel = activeBand >= 0 ? rubric[activeBand]?.level : null;
  const activeLevelColor = activeLevelLabel ? (BAND_COLORS[activeLevelLabel] || "#94a3b8") : null;

  return (
    <>
      <div className="dj-rub-sheet-backdrop open" onClick={onClose} />
      <div className="dj-rub-sheet open">
        <div className="dj-rub-sheet-handle" />
        <div className="dj-rub-sheet-header">
          <div className="dj-rub-sheet-title" style={{ color: crit.color }}>
            {crit.label}
          </div>
          <button className="dj-rub-sheet-close" onClick={onClose}>✕</button>
        </div>

        {crit.blurb && (
          <div className="dj-rub-sheet-blurb">{crit.blurb}</div>
        )}

        {/* ── Mapped Outcomes (collapsible) ── */}
        {hasMudek && (
          <div className={`dj-rub-meta${metaOpen ? " open" : ""}`}>
            <button
              className="dj-rub-meta-toggle"
              type="button"
              aria-expanded={metaOpen}
              onClick={() => setMetaOpen((v) => !v)}
            >
              <span className="dj-rub-meta-label">Mapped Outcomes</span>
              <svg
                className="dj-rub-meta-toggle-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div className="dj-rub-meta-collapse" aria-hidden={!metaOpen}>
              <div className="dj-rub-meta-collapse-inner">
                <div className="dj-rub-meta-rows">
                  {mudek.map((code) => {
                    const id = "po_" + String(code).replace(/\./g, "_");
                    const outcome = outcomeLookup?.[id];
                    const desc = outcome?.desc_en || outcome?.desc_tr || "";
                    return (
                      <div key={code} className="dj-rub-meta-row">
                        <span className="dj-rub-meta-code">{code}</span>
                        {desc && <span className="dj-rub-meta-desc">{desc}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Rubric band rows ── */}
        <div>
          {rubric.map((band, i) => {
            const tag = levelToTag(band.level);
            const range = band.range || `${band.min}–${band.max}`;
            return (
              <div key={i} className={`dj-rub-sheet-row${i === activeBand ? " active" : ""}`}>
                <span className="dj-rub-sheet-range">{range}</span>
                <span className={`dj-rub-tag dj-rub-tag-${tag}`}>{band.level}</span>
                <span className="dj-rub-sheet-desc">{band.desc}</span>
              </div>
            );
          })}
        </div>

        {/* ── Current score badge ── */}
        {hasScore && (
          <div className="dj-rub-sheet-badge">
            <span className="val">
              {numScore}{" "}
              <span style={{ fontSize: 11, color: "#475569" }}>/ {crit.max}</span>
            </span>
            <span className="band">
              {activeLevelLabel ? (
                <span style={{ color: activeLevelColor }}>● {activeLevelLabel}</span>
              ) : (
                <span style={{ color: "#94a3b8" }}>—</span>
              )}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
