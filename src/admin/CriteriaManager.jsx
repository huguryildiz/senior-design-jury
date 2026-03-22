// src/admin/CriteriaManager.jsx
// ============================================================
// Rich evaluation criteria editor for semester settings.
//
// Admin-facing canonical model per criterion:
//   label, shortLabel, color, max, blurb, mudek[], rubric[]
//
// Internal machine-safe `key` is NEVER shown to the admin.
// It is silently preserved from the existing template (row._key)
// or auto-derived from label in criterionToTemplate().
//
// `mudek_outcomes` is a legacy field — it is never stored in editor
// state and is only emitted in the save normalizer (criterionToTemplate).
//
// Props:
//   template      — current criteria array (any stored shape)
//   mudekTemplate — semester's MÜDEK outcomes [{ id, code, ... }]
//   onSave        — (newTemplate) => Promise<{ ok, error? }>
//   disabled      — disables all inputs and the save button
//   isLocked      — when true, structural edits disabled; only label/shortLabel/blurb editable
// ============================================================

import { useCallback, useEffect, useId, useRef, useState } from "react";
import AutoGrow from "../shared/AutoGrow";
import BlockingValidationAlert from "../shared/BlockingValidationAlert";
import Tooltip from "../shared/Tooltip";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVerticalIcon, TrashIcon, XIcon, ChevronDownIcon, ChevronUpIcon, CirclePlusIcon } from "../shared/Icons";
import DangerIconButton from "../components/admin/DangerIconButton";
import { CSS } from "@dnd-kit/utilities";
import { normalizeCriterion, criterionToTemplate } from "../shared/criteriaHelpers";
import { validateSemesterCriteria, isDisposableEmptyDraftCriterion } from "../shared/criteriaValidation";
import LevelPill from "../shared/LevelPill";
import { CRITERIA, RUBRIC_DEFAULT_LEVELS, RUBRIC_EDITOR_TEXT } from "../config";

// ── Default rubric seed for a new criterion ───────────────────

function defaultRubricBands(max) {
  const m = Number(max) || 30;
  const [excellent = "Excellent", good = "Good", developing = "Developing", insufficient = "Insufficient"] = RUBRIC_DEFAULT_LEVELS;
  // Excellent: top ~10%, Good: next ~20%, Developing: next ~30%, Insufficient: rest
  const e = Math.round(m * 0.9);
  const g = Math.round(m * 0.7);
  const d = Math.round(m * 0.4);
  return [
    { level: excellent,    min: e,     max: m,     desc: "" },
    { level: good,         min: g,     max: e - 1, desc: "" },
    { level: developing,   min: d,     max: g - 1, desc: "" },
    { level: insufficient, min: 0,     max: d - 1, desc: "" },
  ];
}

function getConfigRubricSeed(row) {
  const rowKey = String(row?._key ?? "").trim();
  const byKey = rowKey
    ? CRITERIA.find((c) => (c.id ?? c.key) === rowKey)
    : null;
  const rowLabel = String(row?.label ?? "").trim().toLowerCase();
  const byLabel = !byKey && rowLabel
    ? CRITERIA.find((c) => String(c.label ?? "").trim().toLowerCase() === rowLabel)
    : null;
  const matched = byKey || byLabel;
  if (!Array.isArray(matched?.rubric) || matched.rubric.length === 0) return null;
  return matched.rubric.map((band) => ({ ...band }));
}

// ── View-model row shape ──────────────────────────────────────

function templateToRow(c, idx) {
  const n = normalizeCriterion(c);
  const boundedRubric = clampRubricBandsToCriterionMax(
    n.rubric.length > 0 ? n.rubric : defaultRubricBands(n.max),
    n.max
  );
  return {
    _id:        `row-${idx}-${Date.now()}`,
    _key:       n.key,                          // hidden stable key
    label:      n.label,
    shortLabel: n.shortLabel,
    color:      n.color,
    max:        String(n.max),
    blurb:      n.blurb,
    mudek:      n.mudek,                        // display codes only
    rubric:     boundedRubric,
    _mudekOpen: false,
    _rubricOpen: false,
    _rubricTouched: true,
    _fieldTouched: {},
  };
}

function emptyRow(idx) {
  const id = `row-new-${idx}-${Date.now()}`;
  const [excellent = "Excellent", good = "Good", developing = "Developing", insufficient = "Insufficient"] = RUBRIC_DEFAULT_LEVELS;
  return {
    _id:        id,
    _key:       "",                             // will be derived on save
    label:      "",
    shortLabel: "",
    color:      "#94A3B8",
    max:        "",
    blurb:      "",
    mudek:      [],
    rubric:     [
      { level: excellent, min: "", max: "", desc: "" },
      { level: good, min: "", max: "", desc: "" },
      { level: developing, min: "", max: "", desc: "" },
      { level: insufficient, min: "", max: "", desc: "" },
    ],
    _mudekOpen: false,
    _rubricOpen: false,
    _rubricTouched: false,
    _fieldTouched: {},
  };
}

// ── Band display helpers ──────────────────────────────────────

function getBandDisplayLabel(bands, bi) {
  const label = bands?.[bi]?.level;
  const trimmed = typeof label === "string" ? label.trim() : "";
  return trimmed || `Band ${bi + 1}`;
}

// ── Clamping helpers ──────────────────────────────────────────

function clampToCriterionMax(rawValue, criterionMax) {
  if (rawValue === "") return "";
  const n = Number(rawValue);
  if (!Number.isFinite(n)) return rawValue;
  if (n < 0) return "0";
  if (criterionMax === "" || criterionMax === null || criterionMax === undefined) return String(n);
  const max = Number(criterionMax);
  if (!Number.isFinite(max) || max < 0) return String(n);
  if (n > max) return String(max);
  return String(n);
}

function clampRubricBandsToCriterionMax(rubric, criterionMax) {
  const newMax = Number(criterionMax);
  if (!Number.isFinite(newMax) || newMax < 0) return rubric ?? [];

  const bands = Array.isArray(rubric) ? rubric : [];

  // Simple per-value clamp
  const clamped = bands.map((band) => ({
    ...band,
    min: clampToCriterionMax(band.min, newMax),
    max: clampToCriterionMax(band.max, newMax),
  }));

  if (clamped.length < 2) return clamped;

  // Detect overlaps introduced by clamping
  const sorted = [...clamped]
    .map((b, idx) => ({ ...b, _idx: idx }))
    .sort((a, b) => Number(a.min) - Number(b.min));

  const hasOverlap = sorted.some(
    (b, j) => j < sorted.length - 1 && Number(b.max) >= Number(sorted[j + 1].min)
  );

  if (!hasOverlap) return clamped;

  // Overlaps were introduced by clamping — rebuild ranges proportionally.
  // Pre-existing overlaps in the original rubric are left to the validator.
  const origMax = Math.max(0, ...bands.map((b) => {
    const n = Number(b.max);
    return Number.isFinite(n) ? n : 0;
  }));

  // Only rebuild when we actually reduced the max; skip when origMax ≤ newMax
  // (overlaps were already there before clamping — not our problem to fix here)
  if (origMax <= 0 || origMax <= newMax) return clamped;

  // Sort by original min to establish band order (lowest range → highest)
  const sortedByOrigMin = bands
    .map((band, idx) => ({ band, idx }))
    .sort((a, b) => (Number(a.band.min) || 0) - (Number(b.band.min) || 0));

  const n = sortedByOrigMin.length;
  const result = [...clamped];

  // Proportionally scale each band's min/max to [0, newMax]
  sortedByOrigMin.forEach(({ band, idx }, j) => {
    const scaledMin = j === 0 ? 0 : Math.round((Number(band.min) / origMax) * newMax);
    const scaledMax = j === n - 1 ? newMax : Math.round((Number(band.max) / origMax) * newMax);
    result[idx] = {
      ...clamped[idx],
      min: String(Math.max(0, Math.min(scaledMin, newMax))),
      max: String(Math.max(0, Math.min(scaledMax, newMax))),
    };
  });

  // Fix rounding-induced gaps/overlaps between consecutive bands
  const finalSorted = result
    .map((b, idx) => ({ b, idx }))
    .sort((a, b) => Number(a.b.min) - Number(b.b.min));

  for (let j = 0; j < finalSorted.length - 1; j++) {
    const curr = finalSorted[j];
    const next = finalSorted[j + 1];
    if (Number(curr.b.max) !== Number(next.b.min) - 1) {
      const adjusted = { ...result[curr.idx], max: String(Number(next.b.min) - 1) };
      result[curr.idx] = adjusted;
      finalSorted[j].b = adjusted;
    }
  }

  // Guarantee last band ends exactly at newMax
  const lastEntry = finalSorted[finalSorted.length - 1];
  result[lastEntry.idx] = { ...result[lastEntry.idx], max: String(newMax) };

  return result;
}

function getBandRangeLabel(band) {
  const min = Number(band?.min);
  const max = Number(band?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return "";
  return `${min}\u2013${max}`;
}


// ── MÜDEK pill selector ───────────────────────────────────────

function MudekPillSelector({ selected, mudekTemplate, onChange, disabled, criterionColor, open = false }) {
  const [query, setQuery] = useState("");
  const options = (mudekTemplate || []);
  const outcomeByCode = new Map(options.map((o) => [o.code, o]));
  const color = criterionColor || "#94A3B8";

  if (options.length === 0) {
    return (
      <span className="criteria-mudek-empty">
        No MÜDEK Outcomes defined yet.
      </span>
    );
  }

  const filtered = query.trim()
    ? options.filter((o) =>
        o.code.includes(query.trim()) ||
        (o.desc_en || "").toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  const toggle = (code) => {
    if (disabled) return;
    const next = selected.includes(code)
      ? selected.filter((c) => c !== code)
      : [...selected, code];
    onChange(next);
  };

  return (
    <div className="criteria-mudek-selector">
      <div className="manage-hint manage-hint-inline">Select the MÜDEK outcomes mapped to this criterion.</div>
      <div className="criteria-mudek-pills">
        {selected.length === 0 && (
          <span className="criteria-mudek-none">None selected</span>
        )}
        {selected.map((code) => (
          <span
            key={code}
            className="criteria-mudek-pill"
            style={{ backgroundColor: color + "22", borderColor: color, color }}
          >
            <Tooltip
              text={(
                <span className="criteria-tooltip-content">
                  <span className="criteria-tooltip-line criteria-tooltip-line--title">{code}</span>
                  {outcomeByCode.get(code)?.desc_en?.trim() && (
                    <span className="criteria-tooltip-line criteria-tooltip-line--desc">{outcomeByCode.get(code).desc_en.trim()}</span>
                  )}
                </span>
              )}
            >
              <span
                className="criteria-mudek-pill-label criteria-pill-typography"
                tabIndex={0}
                aria-label={`MÜDEK ${code} details`}
              >
                {code}
              </span>
            </Tooltip>
            {!disabled && (
              <Tooltip text={`Remove MÜDEK ${code}`}>
                <button
                  type="button"
                  className="criteria-mudek-pill-remove"
                  onClick={() => toggle(code)}
                  aria-label={`Remove MÜDEK ${code}`}
                >
                  ✕
                </button>
              </Tooltip>
            )}
          </span>
        ))}
      </div>

      {open && !disabled && (
        <div className="criteria-mudek-panel">
          <input
            className="manage-input criteria-mudek-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={RUBRIC_EDITOR_TEXT.mudekFilterPlaceholder}
            aria-label="Filter MÜDEK Outcomes"
          />
          <div className="criteria-mudek-chips">
            {filtered.map((o) => {
              const checked = selected.includes(o.code);
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`criteria-mudek-chip${checked ? " selected" : ""}`}
                  style={checked ? { backgroundColor: color + "33", borderColor: color } : {}}
                  onClick={() => toggle(o.code)}
                  title={o.desc_en || o.code}
                >
                  {o.code}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Rubric band editor ────────────────────────────────────────

function getDescPlaceholder(level) {
  const [excellent = "Excellent", good = "Good", developing = "Developing", insufficient = "Insufficient"] = RUBRIC_DEFAULT_LEVELS;
  const norm = String(level).trim().toLowerCase();
  if (norm === excellent.toLowerCase()) return `Describe what ${excellent.toLowerCase()} performance .`;
  if (norm === good.toLowerCase()) return `Describe what ${good.toLowerCase()} performance looks like.`;
  if (norm === developing.toLowerCase()) return `Describe what ${developing.toLowerCase()} performance looks like.`;
  if (norm === insufficient.toLowerCase()) return `Describe what ${insufficient.toLowerCase()} performance looks like.`;
  return "Describe expectations for this band";
}

function RubricBandEditor({ bands, onChange, disabled, criterionMax, rubricErrors }) {
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

  const hasBandErrors = Object.keys(bandRangeErrors).length > 0;

  return (
    <div className="rubric-band-editor">
      {hasBandErrors && (
        <BlockingValidationAlert message="Fix highlighted score ranges." />
      )}
      {coverageError && (
        <BlockingValidationAlert message={coverageError} />
      )}
      {bands.map((band, bi) => {
        const rangeError = bandRangeErrors[bi];
        const levelError = bandLevelErrors[bi];
        const descError  = bandDescErrors[bi];
        return (
          <div key={bi} className="rubric-band-card">
            <div className="rubric-band-header">
              <div className="rubric-band-level-group">
                <label className="criteria-manager-cell-label small-label">Band Name</label>
                <input
                  className={`manage-input rubric-band-level${levelError ? " is-danger" : ""}`}
                  value={band.level}
                  onChange={(e) => setBand(bi, "level", e.target.value)}
                  placeholder={RUBRIC_EDITOR_TEXT.rubricBandNamePlaceholder}
                  disabled={disabled}
                  aria-label={`Band ${bi + 1} level`}
                />
                {levelError && (
                  <div className="manage-field-error manage-field-error--simple rubric-band-error">{levelError}</div>
                )}
              </div>

              <div className="rubric-band-score-group">
                <label className="criteria-manager-cell-label small-label">Score Range</label>
                <div className="rubric-band-range-inputs">
                  <input
                    className={`manage-input rubric-band-score-input${rangeError ? " is-danger" : ""}`}
                    type="number"
                    min="0"
                    max={criterionMax}
                    value={band.min}
                    onChange={(e) => setBand(bi, "min", e.target.value)}
                    placeholder={RUBRIC_EDITOR_TEXT.rubricBandMinPlaceholder}
                    disabled={disabled}
                    aria-label={`Band ${bi + 1} min`}
                  />
                  <span className="rubric-band-separator">–</span>
                  <input
                    className={`manage-input rubric-band-score-input${rangeError ? " is-danger" : ""}`}
                    type="number"
                    min="0"
                    max={criterionMax}
                    value={band.max}
                    onChange={(e) => setBand(bi, "max", e.target.value)}
                    placeholder={RUBRIC_EDITOR_TEXT.rubricBandMaxPlaceholder}
                    disabled={disabled}
                    aria-label={`Band ${bi + 1} max`}
                  />
                </div>
                {rangeError && (
                  <div className="manage-field-error manage-field-error--simple rubric-band-error">{rangeError}</div>
                )}
              </div>

              {!disabled && (
                <div className="rubric-band-actions">
                  <DangerIconButton
                    Icon={XIcon}
                    onClick={() => removeBand(bi)}
                    disabled={disabled}
                    ariaLabel={`Remove band ${bi + 1}`}
                    title="Remove band"
                    className="rubric-band-remove-btn"
                  />
                </div>
              )}
            </div>

            <div className="rubric-band-description-row">
              <label className="criteria-manager-cell-label small-label">Description</label>
              <AutoGrow
                value={band.desc}
                onChange={(e) => setBand(bi, "desc", e.target.value)}
                disabled={disabled}
                placeholder={getDescPlaceholder(band.level)}
                ariaLabel={`Band ${bi + 1} description`}
                hasError={!!descError}
                className="rubric-band-desc-textarea"
                rows={2}
              />
              {descError && (
                <div className="manage-field-error manage-field-error--simple rubric-band-error">{descError}</div>
              )}
            </div>
          </div>
        );
      })}
      {!disabled && (
        <button type="button" className="manage-btn rubric-add-band-btn" onClick={addBand}>
          <span aria-hidden="true"><CirclePlusIcon className="manage-btn-icon" /></span>
          Add Band
        </button>
      )}
    </div>
  );
}

// ── Sortable row wrapper ──────────────────────────────────────

function SortableCriterionRow({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };
  return children({ attributes, listeners, setNodeRef, style });
}

// ── Main component ───────────────────────────────────────────

export default function CriteriaManager({
  template = [],
  mudekTemplate = [],
  onSave,
  disabled = false,
  isLocked = false,
}) {
  const instanceId = useId();

  const buildRows = useCallback(
    (tpl) =>
      tpl.length > 0
        ? tpl.map((c, i) => templateToRow(c, i))
        : [emptyRow(0)],
    []
  );

  const [rows, setRows] = useState(() => buildRows(template));
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);

  // Sync when template prop changes
  useEffect(() => {
    setRows(buildRows(template));
    setSaveError("");
    setSaveAttempted(false);
  }, [JSON.stringify(template)]); // eslint-disable-line react-hooks/exhaustive-deps

  const { errors, rubricErrorsByCriterion, totalMax } = validateSemesterCriteria(rows, mudekTemplate);
  const totalOk = totalMax === 100;
  const hasValidationErrors =
    Object.keys(errors).length > 0 ||
    Object.values(rubricErrorsByCriterion).some((e) =>
      Object.keys(e.bandRangeErrors).length > 0 ||
      Object.keys(e.bandLevelErrors).length > 0 ||
      Object.keys(e.bandDescErrors).length > 0 ||
      e.coverageError
    ) ||
    !totalOk;
  const canSave = !disabled && !saving;
  const saveBlockReasons = (() => {
    if (!hasValidationErrors) return [];

    const reasons = [];
    if (!totalOk) reasons.push(`Current total: ${totalMax} / 100.`);

    rows.forEach((row, i) => {
      const name = String(row.label ?? row.shortLabel ?? "").trim() || "Untitled criterion";
      const prefix = `Criteria: "${name}" — `;

      if (errors[`mudek_${i}`]) {
        reasons.push(`${prefix}Select at least one MÜDEK outcome.`);
      }
      if (errors[`shortLabel_${i}`]) {
        reasons.push(`${prefix}Fix duplicate or missing short labels.`);
      }
      if (errors[`label_${i}`] || errors[`blurb_${i}`] || errors[`max_${i}`]) {
        reasons.push(`${prefix}Fill in the required criterion fields.`);
      }

      const rubric = rubricErrorsByCriterion[i];
      if (
        rubric &&
        (rubric.coverageError ||
          Object.keys(rubric.bandRangeErrors).length > 0 ||
          Object.keys(rubric.bandLevelErrors).length > 0 ||
          Object.keys(rubric.bandDescErrors).length > 0)
      ) {
        reasons.push(`${prefix}Fix highlighted score ranges.`);
      }
    });

    return [...new Set(reasons)];
  })();

  const structurallyLocked = isLocked || disabled;

  const markTouched = (i, field) => {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], _fieldTouched: { ...next[i]._fieldTouched, [field]: true } };
      return next;
    });
  };

  const setRow = (i, field, value) => {
    let finalValue = value;
    if (field === "max" && value !== "") {
      const n = Number(value);
      if (!isNaN(n)) {
        if (n < 0) finalValue = "0";
        else if (n > 100) finalValue = "100";
        else if (Number.isInteger(n)) finalValue = String(n);
      }
    }
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: finalValue };
      if (field === "max" && finalValue !== "") {
        next[i] = {
          ...next[i],
          rubric: clampRubricBandsToCriterionMax(next[i].rubric, Number(finalValue)),
        };
      }
      if (field === "rubric") {
        next[i]._rubricTouched = true;
      }
      return next;
    });
    setSaveError("");
  };

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow(prev.length)]);
    setSaveError("");
  };

  const removeRow = (i) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
    setSaveError("");
  };

  const toggleRubric = (i) => {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], _rubricOpen: !next[i]._rubricOpen };
      if (next[i]._rubricOpen && next[i].rubric.length === 0) {
        const seeded = getConfigRubricSeed(next[i]) || defaultRubricBands(Number(next[i].max) || 30);
        const criterionMax = Number(next[i].max);
        next[i] = {
          ...next[i],
          rubric:
            Number.isFinite(criterionMax) && criterionMax >= 0
              ? clampRubricBandsToCriterionMax(seeded, criterionMax)
              : seeded,
        };
      }
      return next;
    });
  };

  const toggleMudek = (i) => {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], _mudekOpen: !next[i]._mudekOpen };
      return next;
    });
  };

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const fromIndex = prev.findIndex((r) => r._id === String(active.id));
      const toIndex   = prev.findIndex((r) => r._id === String(over.id));
      if (fromIndex < 0 || toIndex < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleSave = async () => {
    setSaveAttempted(true);

    // Strip truly empty new-draft rows
    const activeRows = rows.filter((r) => !isDisposableEmptyDraftCriterion(r));

    if (activeRows.length === 0) {
      setSaveError("Add at least one criterion before saving.");
      return;
    }

    if (activeRows.length !== rows.length) {
      setRows(activeRows);
      return; // next render re-validates remaining rows
    }

    // Validate against the same row set that will be saved
    const {
      errors: localErrors,
      rubricErrorsByCriterion: localRubricErrors,
      totalMax: localTotal,
    } = validateSemesterCriteria(activeRows, mudekTemplate);

    // Auto-expand sections that have errors
    setRows((prev) =>
      prev.map((r, i) => ({
        ...r,
        _mudekOpen: localErrors[`mudek_${i}`] ? true : r._mudekOpen,
        _rubricOpen:
          localRubricErrors[i] &&
          (Object.keys(localRubricErrors[i].bandRangeErrors).length > 0 ||
            Object.keys(localRubricErrors[i].bandLevelErrors).length > 0 ||
            Object.keys(localRubricErrors[i].bandDescErrors).length > 0 ||
            localRubricErrors[i].coverageError)
            ? true
            : r._rubricOpen,
      }))
    );

    const localHasErrors =
      Object.keys(localErrors).length > 0 ||
      Object.values(localRubricErrors).some(
        (e) =>
          Object.keys(e.bandRangeErrors).length > 0 ||
          Object.keys(e.bandLevelErrors).length > 0 ||
          Object.keys(e.bandDescErrors).length > 0 ||
          e.coverageError
      );

    if (localHasErrors || localTotal !== 100 || disabled) return;

    setSaving(true);
    setSaveError("");
    try {
      const normalized = activeRows.map((r) => {
        const boundedRubric = clampRubricBandsToCriterionMax(r.rubric, Number(r.max));
        return criterionToTemplate({ ...r, rubric: boundedRubric });
      });
      const result = await onSave(normalized);
      if (!result?.ok) {
        setSaveError(result?.error || "Could not save criteria template. Try again.");
      }
    } catch (e) {
      setSaveError(e?.message || "Could not save criteria template. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const rowIds = rows.map((r) => r._id);

  return (
    <div className="criteria-manager">
      <div className="criteria-manager-header">
        <span className="criteria-manager-title">Evaluation Criteria</span>
        <div className={`criteria-total-bar${totalOk ? " criteria-total-valid" : " criteria-total-invalid"}`}>
          Total: {totalMax} / 100 {totalOk ? "✓" : "— must equal 100"}
        </div>
      </div>

      <DndContext
        id={instanceId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          <div className="criteria-manager-rows">
            {rows.map((row, i) => (
              <SortableCriterionRow key={row._id} id={row._id}>
                {({ attributes, listeners, setNodeRef, style }) => (
                  <div
                    ref={setNodeRef}
                    style={{ ...style, borderLeftColor: row.color || "#94A3B8" }}
                    className="criterion-card"
                  >
                    {/* ── Card header row ── */}
                    <div className="criterion-card-header">
                      {/* ── Toolbar: Drag, Swatch, Remove ── */}
                      <div className="criterion-card-toolbar">
                        <label className="criteria-manager-cell-label toolbar-label-placeholder">&nbsp;</label>
                        <div className="criterion-card-toolbar-actions">
                          <Tooltip text="Drag up or down to reorder criterion">
                            <button
                              type="button"
                              className="manage-icon-btn manage-drag-handle"
                              disabled={structurallyLocked}
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
                                disabled={structurallyLocked}
                                aria-label={`Criterion ${i + 1} color`}
                              />
                            </label>
                          </Tooltip>

                          <DangerIconButton
                            Icon={XIcon}
                            onClick={() => removeRow(i)}
                            disabled={structurallyLocked || rows.length === 1}
                            ariaLabel={`Remove criterion ${i + 1}`}
                            title="Remove criterion"
                          />
                        </div>
                      </div>

                      {/* Label */}
                      <div className="criterion-field criterion-field--label">
                        <label className="criteria-manager-cell-label">Label</label>
                        <input
                          className={`manage-input${(saveAttempted || row._fieldTouched?.label) && errors[`label_${i}`] ? " is-danger" : ""}`}
                          value={row.label}
                          onChange={(e) => setRow(i, "label", e.target.value)}
                          onBlur={() => markTouched(i, "label")}
                          placeholder="Technical Content"
                          disabled={disabled}
                          aria-label={`Criterion ${i + 1} label`}
                        />
                        {(saveAttempted || row._fieldTouched?.label) && errors[`label_${i}`] && (
                          <div className="manage-field-error manage-field-error--simple">{errors[`label_${i}`]}</div>
                        )}
                      </div>

                      {/* ShortLabel */}
                      <div className="criterion-field criterion-field--short">
                        <label className="criteria-manager-cell-label">Short label</label>
                        <input
                          className={`manage-input${(saveAttempted || row._fieldTouched?.shortLabel) && errors[`shortLabel_${i}`] ? " is-danger" : ""}`}
                          value={row.shortLabel}
                          onChange={(e) => setRow(i, "shortLabel", e.target.value)}
                          onBlur={() => markTouched(i, "shortLabel")}
                          placeholder="Technical"
                          disabled={disabled}
                          aria-label={`Criterion ${i + 1} short label`}
                        />
                        {(saveAttempted || row._fieldTouched?.shortLabel) && errors[`shortLabel_${i}`] && (
                          <div className="manage-field-error manage-field-error--simple">{errors[`shortLabel_${i}`]}</div>
                        )}
                      </div>

                      {/* Max */}
                      <div className="criterion-field criterion-field--max">
                        <label className="criteria-manager-cell-label">Max</label>
                        <input
                          className={`manage-input${(saveAttempted || row._fieldTouched?.max) && errors[`max_${i}`] ? " is-danger" : ""}`}
                          type="number"
                          min="1"
                          max="100"
                          value={row.max}
                          onChange={(e) => setRow(i, "max", e.target.value)}
                          onBlur={() => markTouched(i, "max")}
                          placeholder="30"
                          disabled={structurallyLocked}
                          aria-label={`Criterion ${i + 1} max score`}
                        />
                        {(saveAttempted || row._fieldTouched?.max) && errors[`max_${i}`] && (
                          <div className="manage-field-error manage-field-error--simple">{errors[`max_${i}`]}</div>
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
                        disabled={disabled}
                        placeholder={RUBRIC_EDITOR_TEXT.criterionBlurbPlaceholder}
                        ariaLabel={`Criterion ${i + 1} description`}
                        hasError={(saveAttempted || row._fieldTouched?.blurb) && !!errors[`blurb_${i}`]}
                        className="criterion-blurb-textarea"
                      />
                      {(saveAttempted || row._fieldTouched?.blurb) && errors[`blurb_${i}`] && (
                        <div className="manage-field-error manage-field-error--simple">{errors[`blurb_${i}`]}</div>
                      )}
                    </div>

                    {/* ── MÜDEK mapping ── */}
                    {mudekTemplate.length > 0 && (
                      <div className={`criterion-field criterion-field--mudek criterion-subsection${row._mudekOpen ? " is-open" : " is-collapsed"}`}>
                        <div className="criterion-subsection-header">
                          <div className="criterion-subsection-title-wrap">
                            <span className="criterion-subsection-title">MÜDEK Outcomes</span>
                          </div>
                          {!structurallyLocked && (
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
                            selected={row.mudek}
                            mudekTemplate={mudekTemplate}
                            onChange={(next) => setRow(i, "mudek", next)}
                            disabled={structurallyLocked}
                            criterionColor={row.color}
                            open={row._mudekOpen}
                          />
                          {errors[`mudek_${i}`] && mudekTemplate.length > 0 && (
                            <div className="manage-field-error manage-field-error--simple">{errors[`mudek_${i}`]}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Rubric bands ── */}
                    <div className={`criterion-field criterion-field--rubric criterion-subsection${row._rubricOpen ? " is-open" : " is-collapsed"}`}>
                      <div className="criterion-subsection-header">
                        <div className="criterion-subsection-title-wrap">
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
                        <div className="manage-hint manage-hint-inline">Define score ranges so bands cover the full criterion score without overlap.</div>
                        {!row._rubricOpen && row.rubric.length > 0 && (
                          <div className="criteria-rubric-summary" aria-label="Rubric summary">
                            {row.rubric.map((band, bi) => {
                              const label = getBandDisplayLabel(row.rubric, bi);
                              const rangeLabel = getBandRangeLabel(band);
                              const desc = String(band?.desc || "").trim();
                              return (
                                <Tooltip
                                  key={`${label}-${bi}`}
                                  text={(
                                    <span className="criteria-tooltip-content">
                                      <span className="criteria-tooltip-line criteria-tooltip-line--title">{label}</span>
                                      {rangeLabel && (
                                        <span className="criteria-tooltip-line criteria-tooltip-line--muted">
                                          Range: {rangeLabel}
                                        </span>
                                      )}
                                      {desc && <span className="criteria-tooltip-line criteria-tooltip-line--desc">{desc}</span>}
                                    </span>
                                  )}
                                >
                                  <span
                                    className="criteria-rubric-summary-pill-trigger"
                                    tabIndex={0}
                                    aria-label={`Rubric ${label} details`}
                                  >
                                    <LevelPill variant={band?.level} className="criteria-rubric-summary-pill">
                                      <span className="criteria-rubric-summary-pill-text criteria-pill-typography">{label}</span>
                                    </LevelPill>
                                  </span>
                                </Tooltip>
                              );
                            })}
                          </div>
                        )}
                        {row._rubricOpen && (
                          <RubricBandEditor
                            bands={row.rubric}
                            onChange={(next) => setRow(i, "rubric", next)}
                            disabled={structurallyLocked}
                            criterionMax={row.max}
                            rubricErrors={(row._rubricTouched || saveAttempted) ? rubricErrorsByCriterion[i] : null}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </SortableCriterionRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="criteria-manager-footer">
        <button
          type="button"
          className="manage-btn"
          onClick={addRow}
          disabled={structurallyLocked}
        >
          <span aria-hidden="true"><CirclePlusIcon className="manage-btn-icon" /></span>
          Add Criterion
        </button>
        <button
          type="button"
          className="manage-btn primary"
          onClick={handleSave}
          disabled={!canSave}
        >
          {saving ? "Saving…" : "Save Criteria"}
        </button>
      </div>
      {saveAttempted && saveBlockReasons.length > 0 && (
        <div className="manage-hint manage-hint-error" role="status">
          {saveBlockReasons.length === 1
            ? saveBlockReasons[0]
            : (
              <ul className="manage-hint-list">
                {saveBlockReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )
          }
        </div>
      )}

      {isLocked && (
        <div className="manage-hint manage-hint-warning" role="status">
          Structure locked — scoring has started for this semester. Only labels and descriptions can be edited.
        </div>
      )}
      {saveError && (
        <div className="manage-hint manage-hint-error" role="alert">
          {saveError}
        </div>
      )}
    </div>
  );
}
