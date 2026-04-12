// src/admin/criteria/CriteriaManager.jsx
// ============================================================
// Rich evaluation criteria editor for period settings.
//
// Admin-facing canonical model per criterion:
//   label, shortLabel, color, max, blurb, outcomes[], rubric[]
//
// Internal machine-safe `key` is NEVER shown to the admin.
// It is silently preserved from the existing template (row._key)
// or auto-derived from label in criterionToTemplate().
//
// Props:
//   template      — current criteria array (any stored shape)
//   outcomeConfig — period's outcomes [{ id, code, ... }]
//   onSave        — (newTemplate) => Promise<{ ok, error? }>
//   onClose       — () => void — closes the parent drawer
//   disabled      — disables all inputs and the save button
//   isLocked      — when true, the entire template is read-only; no field or action is editable
// ============================================================

import { useEffect, useId } from "react";
import AlertCard from "@/shared/ui/AlertCard"; // used for saveError
import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { LockIcon } from "@/shared/ui/Icons";
import { CSS } from "@dnd-kit/utilities";
import { getCriterionDisplayName } from "./criteriaFormHelpers";
import { useCriteriaForm } from "./useCriteriaForm";
import CriterionEditor from "./CriterionEditor";
import CriterionDeleteDialog from "./CriterionDeleteDialog";

import { Icon } from "lucide-react";

// ── Sortable row wrapper ──────────────────────────────────────

function SortableCriterionRow({ id, disabled, children }) {
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

export default function CriteriaManager({
  template = [],
  outcomeConfig = [],
  onSave,
  onClose,
  onSaveState,
  onDirtyChange,
  disabled = false,
  isLocked = false,
  saveDisabled = false,
}) {
  const instanceId = useId();

  const {
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
  } = useCriteriaForm({ template, outcomeConfig, onSave, onDirtyChange, disabled, isLocked });

  useEffect(() => {
    onSaveState?.({
      saving,
      canSave,
      handleSave,
      saveAttempted,
      saveBlockReasons,
      totalOk,
      activeRowsCount: activeRows.length,
      totalMax,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, canSave, handleSave, saveAttempted, saveBlockReasons, totalOk, activeRows.length, totalMax]);

  const rowIds = activeRows.map((r) => r._id);

  const rowActions = {
    setRow,
    markTouched,
    toggleCriterionCard,
    toggleOutcome,
    toggleRubric,
    requestRemoveRow,
  };

  const fillPct = Math.min(100, totalMax);
  const fillColor = totalOk ? "var(--success)" : totalMax > 100 ? "var(--danger)" : "var(--accent)";

  return (
    <div className="criteria-manager">
      {/* Weight summary bar */}
      <div className="crt-weight-summary">
        <div className="crt-weight-summary-info">
          <div className="crt-weight-summary-label">Total weight</div>
          <div className="crt-weight-summary-value">
            {totalMax}<span>/ 100</span>
          </div>
        </div>
        <div className="crt-weight-summary-track">
          <div
            className="crt-weight-summary-fill"
            style={{ width: `${fillPct}%`, background: fillColor }}
          />
        </div>
        {totalOk ? (
          <span className="fs-badge green">Valid</span>
        ) : (
          <span className="fs-badge red">Must equal 100</span>
        )}
      </div>
      {isLocked && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200" style={{ marginBottom: 12 }}>
          <LockIcon className="size-4 shrink-0" />
          <span>Scores exist for this period — criteria weights and rubric ranges are locked to preserve result integrity.</span>
        </div>
      )}
      <DndContext
        id={instanceId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          <div className="criteria-manager-rows">
            {rows.map((row, i) => (
              <SortableCriterionRow key={row._id} id={row._id} disabled={fullyLocked}>
                {({ setNodeRef, style }) => (
                  <CriterionEditor
                    row={row}
                    index={i}
                    errors={errors}
                    rubricErrorsByCriterion={rubricErrorsByCriterion}
                    saveAttempted={saveAttempted}
                    fullyLocked={fullyLocked}
                    outcomeConfig={outcomeConfig}
                    outcomeByCode={outcomeByCode}
                    sanitizeOutcomeSelection={sanitizeOutcomeSelection}
                    rowActions={rowActions}
                    rowCount={rows.length}
                    setNodeRef={setNodeRef}
                    style={style}
                  />
                )}
              </SortableCriterionRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {!fullyLocked && (
        <button
          type="button"
          className="crt-add-criterion-btn"
          onClick={addRow}
        >
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
          Add Criterion
        </button>
      )}
      {saveError && (
        <AlertCard variant="error">
          {saveError}
        </AlertCard>
      )}
      <CriterionDeleteDialog
        open={pendingDeleteIndex !== null}
        rowLabel={pendingDeleteIndex !== null ? getCriterionDisplayName(rows[pendingDeleteIndex], pendingDeleteIndex) : ""}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingDeleteIndex(null);
        }}
        onConfirm={confirmRemoveRow}
        saveDisabled={saveDisabled}
      />
    </div>
  );
}
