// src/admin/MudekManager.jsx
// ============================================================
// MÜDEK outcome template editor for semester settings.
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
//   mudekTemplate — current outcomes array [{ id, code, desc_en, desc_tr }]
//   onSave        — (newTemplate) => Promise<{ ok, error? }>
//   disabled      — disables all inputs and the save button
//   isLocked      — when true, structural edits (add/delete/reorder/code)
//                   are disabled; only en and tr remain editable
// ============================================================

import { useEffect, useId, useRef, useState } from "react";
import AutoGrow from "../shared/AutoGrow";
import BlockingValidationAlert from "../shared/BlockingValidationAlert";
import ConfirmDialog from "../shared/ConfirmDialog";
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
  XIcon,
} from "../shared/Icons";
import DangerIconButton from "../components/admin/DangerIconButton";
import Tooltip from "../shared/Tooltip";
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

function MudekLanguageFlag({ language, label }) {
  const symbol = language === "tr" ? "🇹🇷" : "🇬🇧";
  return (
    <Tooltip text={label}>
      <span className="mudek-manager-row-flag" role="img" aria-label={label}>
        {symbol}
      </span>
    </Tooltip>
  );
}

// ── Sortable row wrapper ──────────────────────────────────────

function SortableMudekRow({ id, children }) {
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

export default function MudekManager({
  mudekTemplate = [],
  criteriaTemplate = [],
  onSave,
  onDraftChange,
  onDirtyChange,
  disabled = false,
  isLocked = false,
}) {
  const instanceId = useId();

  const buildRows = (tpl) =>
    tpl.length > 0 ? tpl.map((o, i) => templateToRow(o, i)) : [];

  const [rows, setRows] = useState(() => buildRows(mudekTemplate));
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(() => new Set());
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [removeConfirmIdx, setRemoveConfirmIdx] = useState(null);
  const draftChangeRef = useRef(onDraftChange);
  const lastEmittedRowsSigRef = useRef("");
  const rowsSignature = JSON.stringify(rows.map((r) => [r.code.trim(), r.en.trim(), r.tr.trim()]));
  const templateSignature = mudekTemplateSignature(mudekTemplate);

  useEffect(() => {
    draftChangeRef.current = onDraftChange;
  }, [onDraftChange, draftChangeRef]);

  // Sync when mudekTemplate prop changes; reset all interaction state
  useEffect(() => {
    if (templateSignature === rowsSignature) return;
    if (lastEmittedRowsSigRef.current === rowsSignature) return;
    setRows(buildRows(mudekTemplate));
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

  // structurallyLocked: code, drag, delete, add are all disabled
  // EN/TR only use `disabled` (the prop), NOT structurallyLocked —
  // this preserves editability of descriptions when isLocked=true.
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
        setSaveError(result?.error || "Could not save MÜDEK template. Try again.");
      } else {
        setTouched(new Set());
        setSaveAttempted(false);
        onDirtyChange?.(false);
      }
    } catch (e) {
      setSaveError(e?.message || "Could not save MÜDEK template. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const rowIds = rows.map((r) => r._rowId);

  const removeRowCode = removeConfirmIdx !== null ? rows[removeConfirmIdx]?.code.trim() : "";
  const usageCount = removeRowCode
    ? criteriaTemplate.filter(c => Array.isArray(c.mudek) && c.mudek.includes(removeRowCode)).length
    : 0;

  return (
    <div className="mudek-manager">
      <div className="mudek-manager-header">
        <span className="mudek-manager-title">MÜDEK Outcomes</span>
        <span className="mudek-manager-count">
          {rows.length} outcome{rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {rows.length === 0 && (
        <div className="manage-hint" role="status">
          No custom MÜDEK Outcomes defined. Using default outcomes from config as fallback.
          Add rows below to define semester-specific outcomes.
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
            <div className="mudek-manager-rows">
              {rows.map((row, i) => (
                <SortableMudekRow key={row._rowId} id={row._rowId}>
                  {({ attributes, listeners, setNodeRef, style }) => (
                    <div
                      ref={setNodeRef}
                      style={style}
                      className={`mudek-manager-row-shell${row._expanded ? " is-expanded" : ""}`}
                    >
                      <div className="mudek-manager-row-top">
                        <div className="mudek-manager-row-head">
                          <div className="mudek-manager-row-leading">
                            <Tooltip text="Drag to reorder">
                              <button
                                type="button"
                                className="manage-icon-btn mudek-manager-drag-handle"
                                disabled={structurallyLocked}
                                aria-label={`Drag to reorder outcome ${i + 1}`}
                                {...attributes}
                                {...listeners}
                              >
                                <GripVerticalIcon />
                              </button>
                            </Tooltip>

                            <div className="mudek-manager-row-main">
                              <div className="mudek-manager-row-title-line">
                                <span className="mudek-manager-row-goal" aria-hidden="true">
                                  <GoalIcon />
                                </span>
                                <span className="mudek-manager-row-code">{getMudekDisplayName(row, i)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mudek-manager-row-actions">
                            <Tooltip text={row._expanded ? "Collapse outcome" : "Expand outcome"}>
                              <button
                                type="button"
                                className="manage-icon-btn mudek-manager-row-expand-btn"
                                onClick={() => toggleRow(i)}
                                aria-expanded={row._expanded}
                                aria-controls={`mudek-body-${row._rowId}`}
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
                          <div className="mudek-manager-row-preview" aria-label={`Outcome ${i + 1} preview`}>
                            <div className="mudek-manager-row-preview-line">
                              <MudekLanguageFlag language="en" label="English" />
                              <span className="mudek-manager-row-preview-text">
                                {getPreviewText(row.en, "No English text")}
                              </span>
                            </div>
                            <div className="mudek-manager-row-preview-line">
                              <MudekLanguageFlag language="tr" label="Turkish" />
                              <span className="mudek-manager-row-preview-text">
                                {getPreviewText(row.tr, "No Turkish text")}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {row._expanded && (
                        <div id={`mudek-body-${row._rowId}`} className="mudek-manager-row-editor">
                          <div className="mudek-manager-row-expanded-fields">
                            <div className="mudek-manager-field-group mudek-manager-field-group--code">
                              <label className="mudek-manager-cell-label">Program outcome</label>
                              <input
                                className={`manage-input mudek-manager-input${displayErrors[`code_${i}`] ? " is-danger" : ""}`}
                                value={row.code}
                                onChange={(e) => setRow(i, "code", e.target.value)}
                                onBlur={() => touch(`code_${i}`)}
                                placeholder="1.2"
                                disabled={structurallyLocked}
                                aria-label={`Outcome ${i + 1} code`}
                              />
                              {displayErrors[`code_${i}`] && (
                                <div className="manage-field-error manage-field-error--simple">
                                  {displayErrors[`code_${i}`]}
                                </div>
                              )}
                            </div>

                            <div className="mudek-manager-field-group">
                              <label className="mudek-manager-cell-label">English description</label>
                              <AutoGrow
                                value={row.en}
                                onChange={(e) => setRow(i, "en", e.target.value)}
                                onBlur={() => touch(`en_${i}`)}
                                disabled={disabled}
                                placeholder="English description"
                                ariaLabel={`Outcome ${i + 1} English description`}
                                hasError={!!displayErrors[`en_${i}`]}
                                className="mudek-manager-textarea"
                              />
                              {displayErrors[`en_${i}`] && (
                                <div className="manage-field-error manage-field-error--simple">
                                  {displayErrors[`en_${i}`]}
                                </div>
                              )}
                            </div>

                            <div className="mudek-manager-field-group">
                              <label className="mudek-manager-cell-label">Turkish description</label>
                              <AutoGrow
                                value={row.tr}
                                onChange={(e) => setRow(i, "tr", e.target.value)}
                                onBlur={() => touch(`tr_${i}`)}
                                disabled={disabled}
                                placeholder="Türkçe açıklama"
                                ariaLabel={`Outcome ${i + 1} Turkish description`}
                                hasError={!!displayErrors[`tr_${i}`]}
                                className="mudek-manager-textarea"
                              />
                              {displayErrors[`tr_${i}`] && (
                                <div className="manage-field-error manage-field-error--simple">
                                  {displayErrors[`tr_${i}`]}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </SortableMudekRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="mudek-manager-footer">
        <button
          type="button"
          className="manage-btn"
          onClick={addRow}
          disabled={structurallyLocked}
        >
          <span aria-hidden="true"><CirclePlusIcon className="manage-btn-icon" /></span>
          Add MÜDEK Outcome
        </button>
        <button
          type="button"
          className="manage-btn primary"
          onClick={handleSave}
          disabled={disabled || saving}
        >
          {saving ? "Saving…" : "Save MÜDEK Outcomes"}
        </button>
      </div>

      {saveAttempted && saveBlockReasons.length > 0 && (
        <BlockingValidationAlert>
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
        </BlockingValidationAlert>
      )}

      {isLocked && (
        <div className="manage-hint manage-hint-warning" role="status">
          Structure locked — scoring has started for this semester. Only descriptions can be edited.
        </div>
      )}
      {saveError && (
        <div className="manage-hint manage-hint-error" role="alert">
          {saveError}
        </div>
      )}

      <ConfirmDialog
        open={removeConfirmIdx !== null}
        onOpenChange={(open) => { if (!open) setRemoveConfirmIdx(null); }}
        title="Delete Confirmation"
        body={
          usageCount > 0
            ? `This MÜDEK outcome is used by ${usageCount} criteria. Deleting it will remove those mappings automatically. Some criteria may remain without a MÜDEK mapping.`
            : "This MÜDEK outcome contains entered content. Are you sure you want to remove it?"
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
