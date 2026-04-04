// src/admin/components/OutcomeEditor.jsx
// ============================================================
// Outcome template editor for period settings.
//
// Admin-facing canonical editor model per outcome:
//   code, en, tr
//
// Internal `id` is NEVER shown in the UI. It is auto-derived
// from `code` in the save normalizer: id = "po_" + code.replace(/\./g, "_")
//
// The DB persists { id, code, desc_en, desc_tr }; the UI maps
//   en → desc_en, tr → desc_tr at save time.
//
// Rows support drag-and-drop reordering via @dnd-kit.
//
// Props:
//   outcomeConfig — current outcomes array [{ id, code, desc_en, desc_tr }]
//   onSave        — (newTemplate) => Promise<{ ok, error? }>
//   disabled      — disables all inputs and the save button
//   isLocked      — when true, the entire template is read-only;
//                   all fields and actions are disabled
// ============================================================

import { useEffect, useId, useRef, useState } from "react";
import AutoGrow from "@/shared/ui/AutoGrow";
import BlockingValidationAlert from "@/shared/ui/BlockingValidationAlert";
import AlertCard from "@/shared/ui/AlertCard";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";
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
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CirclePlusIcon,
  GripVerticalIcon,
  GoalIcon,
  TriangleAlertLucideIcon,
  XIcon,
} from "@/shared/ui/Icons";
import DangerIconButton from "./DangerIconButton";
import Tooltip from "@/shared/ui/Tooltip";
import { CSS } from "@dnd-kit/utilities";

// ── Internal helpers ──────────────────────────────────────────

function codeToId(code) {
  return "po_" + String(code).replace(/\./g, "_");
}

// ── View-model row ────────────────────────────────────────────

/**
 * Normalize any incoming shape (DB or legacy) to { code, en, tr }.
 * Does not fabricate missing content — missing fields remain empty.
 */
function normalizeMudekOutcome(o) {
  return {
    code: o.code ?? "",
    en:   o.desc_en ?? o.en ?? "",
    tr:   o.desc_tr ?? o.tr ?? "",
  };
}

function mudekRowsToTemplate(rows) {
  return rows.map((r) => ({
    id:      codeToId(r.code.trim()),
    code:    r.code.trim(),
    desc_en: r.en.trim(),
    desc_tr: r.tr.trim(),
  }));
}

function mudekTemplateSignature(template) {
  return JSON.stringify(
    (Array.isArray(template) ? template : []).map((o) => {
      const n = normalizeMudekOutcome(o);
      return [n.code, n.en, n.tr];
    })
  );
}

function templateToRow(o, idx) {
  const n = normalizeMudekOutcome(o);
  return { _rowId: `mudek-row-${idx}-${Date.now()}`, _expanded: false, ...n };
}

function emptyRow(idx) {
  return {
    _rowId: `mudek-row-new-${idx}-${Date.now()}`,
    _expanded: true,
    code:   "",
    en:     "",
    tr:     "",
  };
}

// ── Validation ────────────────────────────────────────────────

/**
 * PRODUCT RULE: MÜDEK codes are hierarchical numerics (e.g. 1, 2.1, 3.1.2).
 * Each segment must start with 1-9. Leading zeros and bare 0 are intentionally
 * rejected. Do not relax this rule without a conscious product decision.
 *
 * Valid:   1, 2, 10, 2.1, 2.1.4
 * Invalid: 0, 01, 1.0, 01.2, 2.01, 1., .1, 1..2, abc, 2.a
 */
function validateMudekCode(code) {
  const trimmed = code.trim();
  if (!trimmed) return "Required";
  if (!/^[1-9]\d*(\.[1-9]\d*)*$/.test(trimmed)) {
    return "Invalid format (e.g. 1, 2.1, 3.1.2)";
  }
  return null;
}

/**
 * Returns all errors unconditionally — used for canSave gating,
 * not for display. Duplicate check is trim-normalized: "2.1" and " 2.1 "
 * are treated as the same code.
 */
function computeAllErrors(rows) {
  const errors = {};
  const codes = rows.map((r) => r.code.trim());

  rows.forEach((r, i) => {
    const codeErr = validateMudekCode(r.code);
    if (codeErr) {
      errors[`code_${i}`] = codeErr;
    } else {
      const trimmed = r.code.trim();
      if (codes.some((c, j) => j !== i && c === trimmed))
        errors[`code_${i}`] = "Duplicate code";
    }
    if (!r.en.trim()) errors[`en_${i}`] = "Required";
    if (!r.tr.trim()) errors[`tr_${i}`] = "Required";
  });

  return errors;
}

/**
 * Returns display errors for a single row, respecting touch/saveAttempted state.
 * A field's error is only shown if it has been blurred or save was attempted.
 */
function validateMudekOutcome(row, i, allRows, touchedSet, saveAttempted) {
  const errors = {};
  const show = (key) => saveAttempted || touchedSet.has(key);
  const codeKey = `code_${i}`, enKey = `en_${i}`, trKey = `tr_${i}`;

  if (show(codeKey)) {
    const err = validateMudekCode(row.code);
    if (err) {
      errors[codeKey] = err;
    } else {
      const trimmed = row.code.trim();
      if (allRows.some((r, j) => j !== i && r.code.trim() === trimmed))
        errors[codeKey] = "Duplicate code";
    }
  }
  if (show(enKey) && !row.en.trim()) errors[enKey] = "Required";
  if (show(trKey) && !row.tr.trim()) errors[trKey] = "Required";
  return errors;
}

/** True only when all three fields are blank/whitespace. */
function isEmptyMudekOutcomeDraft(row) {
  return !row.code.trim() && !row.en.trim() && !row.tr.trim();
}

/** True when any field has non-blank content. */
function hasMeaningfulMudekOutcomeContent(row) {
  return !!row.code.trim() || !!row.en.trim() || !!row.tr.trim();
}

function truncateText(value, max = 56) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function getPreviewText(value, emptyLabel) {
  const text = truncateText(value, 82);
  return text || emptyLabel;
}

function getMudekDisplayName(row, index) {
  return String(row?.code ?? "").trim() || `Outcome ${index + 1}`;
}

function OutcomeLanguageFlag({ language, label }) {
  const symbol = language === "tr" ? "🇹🇷" : "🇬🇧";
  return (
    <Tooltip text={label}>
      <span className="outcome-editor-row-flag" role="img" aria-label={label}>
        {symbol}
      </span>
    </Tooltip>
  );
}

// ── Sortable row wrapper ──────────────────────────────────────

function SortableOutcomeRow({ id, disabled, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };
  return children({ attributes, listeners, setNodeRef, style });
}

// ── Main component ───────────────────────────────────────────

export default function OutcomeEditor({
  outcomeConfig = [],
  criteriaConfig = [],
  onSave,
  onDraftChange,
  onDirtyChange,
  disabled = false,
  isLocked = false,
  saveDisabled = false,
}) {
  const instanceId = useId();

  const buildRows = (tpl) =>
    tpl.length > 0 ? tpl.map((o, i) => templateToRow(o, i)) : [];

  const [rows, setRows] = useState(() => buildRows(outcomeConfig));
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(() => new Set());
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [removeConfirmIdx, setRemoveConfirmIdx] = useState(null);
  const draftChangeRef = useRef(onDraftChange);
  const lastEmittedRowsSigRef = useRef("");
  const rowsSignature = JSON.stringify(rows.map((r) => [r.code.trim(), r.en.trim(), r.tr.trim()]));
  const templateSignature = mudekTemplateSignature(outcomeConfig);

  useEffect(() => {
    draftChangeRef.current = onDraftChange;
  }, [onDraftChange, draftChangeRef]);

  // Sync when outcomeConfig prop changes; reset all interaction state
  useEffect(() => {
    if (templateSignature === rowsSignature) return;
    if (lastEmittedRowsSigRef.current === rowsSignature) return;
    setRows(buildRows(outcomeConfig));
    setSaveError("");
    setTouched(new Set());
    setSaveAttempted(false);
    onDirtyChange?.(false);
  }, [templateSignature]); // eslint-disable-line react-hooks/exhaustive-deps

  const touch = (key) =>
    setTouched((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });

  const allErrors = computeAllErrors(rows);
  const hasErrors = Object.keys(allErrors).length > 0;

  const displayErrors = rows.reduce((acc, row, i) =>
    Object.assign(acc, validateMudekOutcome(row, i, rows, touched, saveAttempted)), {});

  const saveBlockReasons = (() => {
    if (!hasErrors) return [];

    const reasons = [];
    rows.forEach((row, i) => {
      const codeVal = row.code.trim();
      const labelName = codeVal ? `"${codeVal}"` : `"Untitled outcome"`;
      const prefix = `Outcome ${labelName} — `;

      const codeE = allErrors[`code_${i}`];
      if (codeE) {
        if (codeE === "Required") reasons.push(`${prefix}Code is required.`);
        else if (codeE === "Duplicate code") reasons.push(`${prefix}Duplicate code.`);
        else reasons.push(`${prefix}Invalid code format.`);
      }
      if (allErrors[`en_${i}`]) reasons.push(`${prefix}English description is required.`);
      if (allErrors[`tr_${i}`]) reasons.push(`${prefix}Turkish description is required.`);
    });

    return [...new Set(reasons)];
  })();

  // structurallyLocked: ALL fields and actions are disabled when isLocked or disabled.
  // This enforces the product rule: once scoring starts, the template is fully immutable.
  const structurallyLocked = isLocked || disabled;

  const emitDraft = (nextRows) => {
    const sig = JSON.stringify(nextRows.map((r) => [r.code.trim(), r.en.trim(), r.tr.trim()]));
    lastEmittedRowsSigRef.current = sig;
    draftChangeRef.current?.(mudekRowsToTemplate(nextRows));
  };

  const toggleRow = (i) => {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], _expanded: !next[i]._expanded };
      return next;
    });
  };

  const setRow = (i, field, value) => {
    const next = [...rows];
    next[i] = { ...next[i], [field]: value };
    setRows(next);
    emitDraft(next);
    setSaveError("");
    onDirtyChange?.(true);
  };

  const addRow = () => {
    const next = [...rows, emptyRow(rows.length)];
    setRows(next);
    emitDraft(next);
    setSaveError("");
    onDirtyChange?.(true);
  };

  const removeRow = (i) => {
    const row = rows[i];
    if (hasMeaningfulMudekOutcomeContent(row)) {
      setRemoveConfirmIdx(i);
      return;
    }
    const next = rows.filter((_, idx) => idx !== i);
    setRows(next);
    emitDraft(next);
    setSaveError("");
    onDirtyChange?.(true);
  };

  const confirmRemoveRow = () => {
    const next = rows.filter((_, idx) => idx !== removeConfirmIdx);
    setRows(next);
    emitDraft(next);
    setSaveError("");
    setRemoveConfirmIdx(null);
    onDirtyChange?.(true);
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    onDirtyChange?.(true);
    const fromIndex = rows.findIndex((r) => r._rowId === String(active.id));
    const toIndex   = rows.findIndex((r) => r._rowId === String(over.id));
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...rows];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setRows(next);
    emitDraft(next);
  };

  const handleSave = async () => {
    // Guard: if template is locked (scoring started), reject any save attempt.
    if (isLocked) {
      setSaveError("This period's evaluation template is locked because scoring has already started.");
      return;
    }
    if (disabled) return;

    // 1. Mark saveAttempted so all errors become visible in displayErrors
    setSaveAttempted(true);

    // 2. Validate; block if errors remain
    if (hasErrors) {
      setRows((prev) =>
        prev.map((r, i) => {
          const rowHasErrors = !!allErrors[`code_${i}`] || !!allErrors[`en_${i}`] || !!allErrors[`tr_${i}`];
          return rowHasErrors ? { ...r, _expanded: true } : r;
        })
      );
      return;
    }

    // 3. Save
    setSaving(true);
    setSaveError("");
    try {
      const normalized = mudekRowsToTemplate(rows);
      const result = await onSave(normalized);
      if (!result?.ok) {
        setSaveError(result?.error || "Could not save outcome template. Try again.");
      } else {
        setTouched(new Set());
        setSaveAttempted(false);
        onDirtyChange?.(false);
      }
    } catch (e) {
      setSaveError(e?.message || "Could not save outcome template. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const rowIds = rows.map((r) => r._rowId);

  const removeRowCode = removeConfirmIdx !== null ? rows[removeConfirmIdx]?.code.trim() : "";
  const usageCount = removeRowCode
    ? criteriaConfig.filter(c => Array.isArray(c.mudek) && c.mudek.includes(removeRowCode)).length
    : 0;

  return (
    <div className="outcome-editor">
      <div className="outcome-editor-header">
        <span className="outcome-editor-title">MÜDEK Outcomes</span>
        <span className="outcome-editor-count">
          {rows.length} outcome{rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {isLocked && (
        <AlertCard variant="warning">
          Evaluation template locked — scoring has started for this period. No criteria changes are allowed.
        </AlertCard>
      )}

      {rows.length === 0 && (
        <div className="vera-text-muted" role="status">
          No custom MÜDEK Outcomes defined. Using default outcomes from config as fallback.
          Add rows below to define period-specific outcomes.
        </div>
      )}

      {rows.length > 0 && (
        <DndContext
          id={instanceId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
            <div className="outcome-editor-rows">
              {rows.map((row, i) => (
                <SortableOutcomeRow key={row._rowId} id={row._rowId} disabled={structurallyLocked}>
                  {({ attributes, listeners, setNodeRef, style }) => (
                    <div
                      ref={setNodeRef}
                      style={style}
                      className={`outcome-editor-row-shell${row._expanded ? " is-expanded" : ""}`}
                    >
                      <div className="outcome-editor-row-top">
                        <div className="outcome-editor-row-head">
                          <div className="outcome-editor-row-leading">
                            <Tooltip text="Drag to reorder">
                              <button
                                type="button"
                                className="vera-drag-handle"
                                disabled={structurallyLocked}
                                aria-label={`Drag to reorder outcome ${i + 1}`}
                                {...attributes}
                                {...listeners}
                              >
                                <GripVerticalIcon />
                              </button>
                            </Tooltip>

                            <div className="outcome-editor-row-main">
                              <div className="outcome-editor-row-title-line">
                                <span className="outcome-editor-row-goal" aria-hidden="true">
                                  <GoalIcon />
                                </span>
                                <span className="outcome-editor-row-code">{getMudekDisplayName(row, i)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="outcome-editor-row-actions">
                            <Tooltip text={row._expanded ? "Collapse outcome" : "Expand outcome"}>
                              <button
                                type="button"
                                className="outcome-editor-row-expand-btn vera-expand-btn"
                                onClick={() => toggleRow(i)}
                                aria-expanded={row._expanded}
                                aria-controls={`outcome-editor-body-${row._rowId}`}
                                aria-label={`${row._expanded ? "Collapse" : "Expand"} ${getMudekDisplayName(row, i)}`}
                              >
                                {row._expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                              </button>
                            </Tooltip>
                            <DangerIconButton
                              Icon={XIcon}
                              onClick={() => removeRow(i)}
                              disabled={structurallyLocked || rows.length === 1}
                              ariaLabel={`Remove outcome ${i + 1}`}
                              title="Remove outcome"
                            />
                          </div>
                        </div>

                        {!row._expanded && (
                          <div className="outcome-editor-row-preview" aria-label={`Outcome ${i + 1} preview`}>
                            <div className="outcome-editor-row-preview-line">
                              <OutcomeLanguageFlag language="en" label="English" />
                              <span className="outcome-editor-row-preview-text">
                                {getPreviewText(row.en, "No English text")}
                              </span>
                            </div>
                            <div className="outcome-editor-row-preview-line">
                              <OutcomeLanguageFlag language="tr" label="Turkish" />
                              <span className="outcome-editor-row-preview-text">
                                {getPreviewText(row.tr, "No Turkish text")}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {row._expanded && (
                        <div id={`outcome-editor-body-${row._rowId}`} className="outcome-editor-row-editor">
                          <div className="outcome-editor-row-expanded-fields">
                            <div className="outcome-editor-field-group outcome-editor-field-group--code">
                              <label className="outcome-editor-cell-label">Program outcome</label>
                              <input
                                className={["vera-field-input", "outcome-editor-input", displayErrors[`code_${i}`] && "vera-field-input--error"].filter(Boolean).join(" ")}
                                value={row.code}
                                onChange={(e) => setRow(i, "code", e.target.value)}
                                onBlur={() => touch(`code_${i}`)}
                                placeholder="1.2"
                                disabled={structurallyLocked}
                                aria-label={`Outcome ${i + 1} code`}
                              />
                              {displayErrors[`code_${i}`] && (
                                <div className="vera-field-error--xs">
                                  {displayErrors[`code_${i}`]}
                                </div>
                              )}
                            </div>

                            <div className="outcome-editor-field-group">
                              <label className="outcome-editor-cell-label">English description</label>
                              <AutoGrow
                                value={row.en}
                                onChange={(e) => setRow(i, "en", e.target.value)}
                                onBlur={() => touch(`en_${i}`)}
                                disabled={structurallyLocked}
                                placeholder="English description"
                                ariaLabel={`Outcome ${i + 1} English description`}
                                hasError={!!displayErrors[`en_${i}`]}
                                className="outcome-editor-textarea"
                              />
                              {displayErrors[`en_${i}`] && (
                                <div className="vera-field-error--xs">
                                  {displayErrors[`en_${i}`]}
                                </div>
                              )}
                            </div>

                            <div className="outcome-editor-field-group">
                              <label className="outcome-editor-cell-label">Turkish description</label>
                              <AutoGrow
                                value={row.tr}
                                onChange={(e) => setRow(i, "tr", e.target.value)}
                                onBlur={() => touch(`tr_${i}`)}
                                disabled={structurallyLocked}
                                placeholder="Türkçe açıklama"
                                ariaLabel={`Outcome ${i + 1} Turkish description`}
                                hasError={!!displayErrors[`tr_${i}`]}
                                className="outcome-editor-textarea"
                              />
                              {displayErrors[`tr_${i}`] && (
                                <div className="vera-field-error--xs">
                                  {displayErrors[`tr_${i}`]}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </SortableOutcomeRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="outcome-editor-footer">
        <button
          type="button"
          className="vera-btn-add-pill"
          onClick={addRow}
          disabled={structurallyLocked}
        >
          <span aria-hidden="true"><CirclePlusIcon className="size-3.5" /></span>
          Add MÜDEK Outcome
        </button>
        <button
          type="button"
          className="vera-btn-save-pill"
          onClick={handleSave}
          disabled={structurallyLocked || saving || saveDisabled}
        >
          {saving ? "Saving..." : "Save MÜDEK Outcomes"}
        </button>
      </div>

      {saveAttempted && saveBlockReasons.length > 0 && (
        <BlockingValidationAlert>
          {saveBlockReasons.length === 1
            ? saveBlockReasons[0]
            : (
              <ul className="outcome-editor-block-reasons-list">
                {saveBlockReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )
          }
        </BlockingValidationAlert>
      )}

      {saveError && (
        <AlertCard variant="error">
          {saveError}
        </AlertCard>
      )}

      <ConfirmDialog
        open={removeConfirmIdx !== null}
        onOpenChange={(open) => { if (!open) setRemoveConfirmIdx(null); }}
        title="Delete Confirmation"
        body={
          usageCount > 0
            ? `This outcome is used by ${usageCount} criteria. Deleting it will remove those mappings automatically. Some criteria may remain without an outcome mapping.`
            : "This outcome contains entered content. Are you sure you want to remove it?"
        }
        warning={
          usageCount > 0
            ? ""
            : "This action will discard the unsaved content in this row."
        }
        confirmLabel="Remove"
        onConfirm={confirmRemoveRow}
        tone="danger"
      />
    </div>
  );
}
