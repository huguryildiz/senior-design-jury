// src/charts/MudekBadge.jsx
// ════════════════════════════════════════════════════════════
// MÜDEK BADGE — per-chart dropdown with two tabs
// Tab 1: MÜDEK outcome codes + EN descriptions (TR on hover)
// Tab 2: Rubric bands per criterion (from CRITERIA config)
// ════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { CRITERIA, MUDEK_OUTCOMES } from "../config";
import LevelPill, { isKnownBandVariant, getBandPositionStyle, getBandScoreRank } from "../shared/LevelPill";
import { GraduationCapIcon, ChevronDownIcon, SearchIcon, InfoIcon } from "../shared/Icons";
import { CHART_OUTCOMES, compareOutcomeCodes } from "./chartUtils";
import { normalizeCriterion } from "../shared/criteriaHelpers";

function MudekOutcomesTab({ codes, mudekLookup }) {
  const [lang, setLang] = useState("en");
  const [query, setQuery] = useState("");
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches
  ));
  const [expanded, setExpanded] = useState(() => !(
    typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches
  ));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.addEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);

  useEffect(() => {
    setExpanded(!isMobile);
  }, [isMobile]);

  // When mudekLookup is provided (semester-specific), use it.
  // Otherwise fall back to MUDEK_OUTCOMES from config keyed by display code.
  const items = mudekLookup
    ? Object.values(mudekLookup)
        .filter((o) => o.code && (o.desc_en || o.desc_tr))
        .map((o) => ({ code: o.code, en: o.desc_en, tr: o.desc_tr }))
        .sort((a, b) => compareOutcomeCodes(a.code, b.code))
    : (codes || [])
        .map((code) => ({ code, ...(MUDEK_OUTCOMES[code] || {}) }))
        .filter((o) => o.code && (o.en || o.tr))
        .sort((a, b) => compareOutcomeCodes(a.code, b.code));

  const q = query.trim().toLowerCase();
  const filtered = !q
    ? items
    : items.filter((o) => {
        const en = (o.en || "").toLowerCase();
        const tr = (o.tr || "").toLowerCase();
        const code = (o.code || "").toLowerCase();
        return code.includes(q) || en.includes(q) || tr.includes(q);
      });

  const renderOutcome = (o) => {
    const en = o.en || "";
    const tr = o.tr || "";
    if (lang === "tr") {
      return <div className="mudek-outcome-text">{tr || en}</div>;
    }
    return <div className="mudek-outcome-text">{en || tr}</div>;
  };

  return (
    <div className="mudek-outcomes">
      <div className="mudek-outcomes-controls">
        <label className="mudek-search" aria-label="Search outcomes">
          <span className="mudek-search-icon" aria-hidden="true"><SearchIcon /></span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code or text"
          />
        </label>
        <button
          type="button"
          className="mudek-lang-toggle"
          onClick={() => setLang((prev) => (prev === "en" ? "tr" : "en"))}
          aria-label={lang === "en" ? "Switch to Turkish" : "Switch to English"}
          title={lang === "en" ? "Türkçe" : "English"}
        >
          <span aria-hidden="true">{lang === "en" ? "🇬🇧" : "🇹🇷"}</span>
        </button>
        {q && (
          <span className="mudek-results-count">{filtered.length} results</span>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="mudek-empty">No outcomes match your search.</div>
      )}

      <div className="mudek-table-scroll">
        <div className={`mudek-outcomes-table${isMobile && !expanded ? " compact" : ""}${isMobile && expanded ? " expanded" : ""}`}>
          <div className="mudek-outcomes-head">
            <div className="mudek-col-code">{lang === "tr" ? "Kod" : "Code"}</div>
            <div className="mudek-col-outcome">
              {lang === "tr" ? "Çıktı" : "Outcome"}
            </div>
          </div>
          <div className="mudek-outcomes-body">
            {(isMobile && !expanded ? filtered.slice(0, 5) : filtered).map((o) => (
              <div key={o.code} className="mudek-outcomes-row">
                <div className="mudek-col-code">
                  <span className="mudek-code">{o.code}</span>
                </div>
                <div className="mudek-col-outcome">
                  {renderOutcome(o)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isMobile && filtered.length > 5 && (
        <button
          type="button"
          className="mudek-outcomes-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Collapse ↑" : "Show all outcomes ↓"}
        </button>
      )}
    </div>
  );
}

function MudekRubricTab({ criteria = CRITERIA }) {
  const activeCriteria = (criteria || CRITERIA).map(normalizeCriterion);
  return (
    <div className="mudek-rubric-list">
      {activeCriteria.map((c) => {
        const id = c.id ?? c.key;
        const mudekCodes = Array.isArray(c.mudek) ? c.mudek : [];
        const rubric = Array.isArray(c.rubric) ? c.rubric : [];
        return (
          <div key={id} className="mudek-rubric-criterion">
            <div
              className="mudek-rubric-criterion-title"
              style={{ borderLeftColor: c.color || "#94A3B8" }}
            >
              {c.shortLabel || c.label}
              <span className="mudek-rubric-criterion-meta">
                {mudekCodes.length > 0 && `(${mudekCodes.join(", ")}) · `}max {c.max} pts
              </span>
            </div>
            {c.blurb && (
              <div className="mudek-rubric-criterion-blurb">{c.blurb}</div>
            )}
            {rubric.length > 0 ? (
              <div className="mudek-table-scroll">
                <table className="mudek-table">
                  <thead>
                    <tr>
                      <th>Range</th>
                      <th>Level</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rubric.map((band, bi) => {
                      const pillStyle = isKnownBandVariant(band.level)
                        ? undefined
                        : getBandPositionStyle(getBandScoreRank(rubric, band), rubric.length);
                      return (
                        <tr key={band.level || bi}>
                          <td data-label="Range">{band.range || `${band.min}–${band.max}`}</td>
                          <td data-label="Level">
                            <LevelPill variant={band.level} style={pillStyle}>{band.level}</LevelPill>
                          </td>
                          <td data-label="Description">{band.desc}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mudek-rubric-empty">No rubric bands defined.</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MudekBadge({ outcomeCodes = CHART_OUTCOMES, mudekLookup, criteria }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("outcomes");
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // Close on Escape, return focus to badge button
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="mudek-badge-wrap" ref={wrapRef}>
      <button
        ref={btnRef}
        className="mudek-badge"
        onClick={() => setOpen((v) => !v)}
        aria-label="MÜDEK outcome mapping"
        aria-expanded={open}
      >
        <GraduationCapIcon />
        <span>MÜDEK</span>
        <span className={`mudek-chevron${open ? " open" : ""}`} aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </button>

      {open && (
        <div className="mudek-dropdown" role="dialog" aria-label="MÜDEK outcome mapping">
          <div className="mudek-dropdown-header">
            <span>MÜDEK Outcome Mapping</span>
            <button
              className="mudek-dropdown-close"
              onClick={() => { setOpen(false); btnRef.current?.focus(); }}
              aria-label="Close"
            >✕</button>
          </div>
          <div className="mudek-tabs">
            <button
              className={`mudek-tab-btn${tab === "outcomes" ? " active" : ""}`}
              onClick={() => setTab("outcomes")}
            >MÜDEK Outcomes</button>
            <button
              className={`mudek-tab-btn${tab === "rubric" ? " active" : ""}`}
              onClick={() => setTab("rubric")}
            >Rubric Bands</button>
          </div>
          <div className="mudek-dropdown-body">
            {tab === "outcomes" && <MudekOutcomesTab codes={outcomeCodes} mudekLookup={mudekLookup} />}
            {tab === "rubric"   && <MudekRubricTab criteria={criteria} />}
          </div>
          <div className="mudek-dropdown-footer">
            <span className="mudek-info-icon" aria-hidden="true"><InfoIcon /></span>
            <span>This chart provides evidence for the outcomes above.</span>
          </div>
        </div>
      )}
    </div>
  );
}
