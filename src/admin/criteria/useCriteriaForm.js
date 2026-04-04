// src/admin/criteria/useCriteriaForm.js
// Form state management hook for the criteria editor.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { validatePeriodCriteria, isDisposableEmptyDraftCriterion } from "../../shared/criteriaValidation";
import { criterionToConfig } from "../../shared/criteria/criteriaHelpers";
import {
  templateToRow,
  emptyRow,
  clampRubricBandsToCriterionMax,
  defaultRubricBands,
  getConfigRubricSeed,
} from "./criteriaFormHelpers";

export function useCriteriaForm({ template, outcomeConfig, onSave, onDirtyChange, disabled, isLocked }) {
  const outcomeByCode = new Map((outcomeConfig || []).map((o) => [o.code, o]));
  const outcomeCodes = useMemo(
    () => new Set((outcomeConfig || []).map((o) => o.code)),
    [outcomeConfig]
  );
  const sanitizeOutcomeSelection = useCallback(
    (selected = []) => (Array.isArray(selected) ? selected.filter((code) => outcomeCodes.has(code)) : []),
    [outcomeCodes]
  );

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
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState(null);
  const activeRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        mudek: sanitizeOutcomeSelection(row.mudek),
      })),
    [rows, sanitizeOutcomeSelection]
  );

  // Sync when template prop changes
  useEffect(() => {
    setRows(buildRows(template));
    setSaveError("");
    setSaveAttempted(false);
    onDirtyChange?.(false);
  }, [JSON.stringify(template)]); // eslint-disable-line react-hooks/exhaustive-deps

  const { errors, rubricErrorsByCriterion, totalMax } = validatePeriodCriteria(activeRows, outcomeConfig);
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
  const canSave = !disabled && !isLocked && !saving;

  const saveBlockReasons = (() => {
    if (!hasValidationErrors) return [];

    const reasons = [];
    if (!totalOk) reasons.push(`Current total: ${totalMax} / 100.`);

    activeRows.forEach((row, i) => {
      const name = String(row.label ?? row.shortLabel ?? "").trim() || "Untitled criterion";
      const prefix = `Criteria: "${name}" — `;

      if (errors[`outcome_${i}`]) {
        reasons.push(`${prefix}Select at least one outcome.`);
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

  // fullyLocked: when scoring has started (isLocked) OR the component is externally disabled,
  // every field, button, and interaction must be non-editable.
  const fullyLocked = isLocked || disabled;

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
    onDirtyChange?.(true);
  };

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow(prev.length)]);
    setSaveError("");
    onDirtyChange?.(true);
  };

  const removeRow = (i) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
    setSaveError("");
    onDirtyChange?.(true);
  };

  const requestRemoveRow = (i) => {
    setPendingDeleteIndex(i);
  };

  const confirmRemoveRow = () => {
    if (pendingDeleteIndex === null) return;
    removeRow(pendingDeleteIndex);
    setPendingDeleteIndex(null);
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

  const toggleOutcome = (i) => {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], _outcomeOpen: !next[i]._outcomeOpen };
      return next;
    });
  };

  const toggleCriterionCard = (i) => {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], _expanded: !next[i]._expanded };
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
    onDirtyChange?.(true);
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
    // Guard: if template is locked (scoring started), reject any save attempt.
    if (isLocked) {
      setSaveError("This period's evaluation template is locked because scoring has already started.");
      return;
    }

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
    } = validatePeriodCriteria(activeRows, outcomeConfig);

    // Auto-expand sections that have errors
    setRows((prev) =>
      prev.map((r, i) => ({
        ...r,
        _outcomeOpen: localErrors[`outcome_${i}`] ? true : r._outcomeOpen,
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

    if (localHasErrors || localTotal !== 100) {
      setRows((prev) =>
        prev.map((r, i) => {
          const rubric = localRubricErrors[i];
          const rowHasErrors =
            !!localErrors[`label_${i}`] ||
            !!localErrors[`shortLabel_${i}`] ||
            !!localErrors[`blurb_${i}`] ||
            !!localErrors[`max_${i}`] ||
            !!localErrors[`outcome_${i}`] ||
            !!localErrors[`outcome_dup_${i}`] ||
            !!rubric;
          if (!rowHasErrors) return r;
          return {
            ...r,
            _expanded: true,
            _outcomeOpen: outcomeConfig.length > 0 ? true : r._outcomeOpen,
            _rubricOpen: true,
          };
        })
      );
    }

    if (localHasErrors || localTotal !== 100 || disabled) return;

    setSaving(true);
    setSaveError("");
    try {
      const normalized = activeRows.map((r) => {
        const boundedRubric = clampRubricBandsToCriterionMax(r.rubric, Number(r.max));
        return criterionToConfig({ ...r, mudek: sanitizeOutcomeSelection(r.mudek), rubric: boundedRubric });
      });
      const result = await onSave(normalized);
      if (!result?.ok) {
        setSaveError(result?.error || "Could not save criteria template. Try again.");
      } else {
        onDirtyChange?.(false);
      }
    } catch (e) {
      setSaveError(e?.message || "Could not save criteria template. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return {
    rows,
    activeRows,
    saveError,
    saving,
    saveAttempted,
    pendingDeleteIndex,
    setPendingDeleteIndex,
    errors,
    rubricErrorsByCriterion,
    totalMax,
    totalOk,
    hasValidationErrors,
    saveBlockReasons,
    canSave,
    fullyLocked,
    outcomeByCode,
    sanitizeOutcomeSelection,
    markTouched,
    setRow,
    addRow,
    requestRemoveRow,
    confirmRemoveRow,
    toggleRubric,
    toggleOutcome,
    toggleCriterionCard,
    sensors,
    handleDragEnd,
    handleSave,
  };
}
