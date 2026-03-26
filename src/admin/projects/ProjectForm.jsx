// src/admin/projects/ProjectForm.jsx

import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PencilIcon, CirclePlusIcon } from "../../shared/Icons";
import Tooltip from "../../shared/Tooltip";
import { splitStudents, digitsOnly } from "./projectHelpers";

function CircleMinusIcon({ className = "" } = {}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
    </svg>
  );
}

function SortableStudentRow({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };
  return children({ attributes, listeners, setNodeRef, style });
}

const dragHandle = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="19" r="1" />
  </svg>
);

function updateStudentInput(setter, index, nextValue) {
  setter((prev) => ({
    ...prev,
    group_students: prev.group_students.map((entry, idx) => (idx === index ? nextValue : entry)),
  }));
}

function blurStudentInput(setter, index) {
  setter((prev) => {
    const current = [...prev.group_students];
    const expanded = splitStudents(current[index]);
    if (expanded.length > 1) {
      current.splice(index, 1, ...expanded);
    } else {
      current[index] = expanded[0] || "";
    }
    return {
      ...prev,
      group_students: current,
    };
  });
}

function addStudentInputRow(setter) {
  setter((prev) => ({
    ...prev,
    group_students: [...prev.group_students, ""],
  }));
}

function moveStudentInput(setter, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
  setter((prev) => {
    const list = [...prev.group_students];
    if (fromIndex >= list.length || toIndex >= list.length) return prev;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    return {
      ...prev,
      group_students: list,
    };
  });
}

function removeStudentInput(setter, index) {
  setter((prev) => {
    const next = prev.group_students.filter((_, idx) => idx !== index);
    return {
      ...prev,
      group_students: next.length ? next : [""],
    };
  });
}

export default function ProjectForm({
  form,
  setForm,
  error,
  saving,
  canSubmit,
  onSubmit,
  onCancel,
  onClearError,
  mode,
  isDemoMode = false,
  semesterOptions,
}) {
  const studentIds = form.group_students.map((_, idx) => `${mode}-${idx}`);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  );

  const isAdd = mode === "add";

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const fromIndex = studentIds.indexOf(String(active.id));
    const toIndex = studentIds.indexOf(String(over.id));
    if (fromIndex < 0 || toIndex < 0) return;
    moveStudentInput(setForm, fromIndex, toIndex);
  };

  const cardClass = isAdd ? "manage-modal-card--create-group" : "manage-modal-card--edit-group";
  const cancelClass = isAdd ? "manage-btn--create-cancel" : "manage-btn--edit-cancel";
  const saveClass = isAdd ? "manage-btn--create-save" : "manage-btn--edit-save";
  const removeClass = isAdd ? "manage-btn--create-remove" : "manage-btn--edit-remove";
  const addClass = isAdd ? "manage-btn--create-add" : "manage-btn--edit-add";

  return (
    <div className="manage-modal">
      <div className={`manage-modal-card ${cardClass}`}>
        <div className="edit-dialog__header">
          <span className="edit-dialog__icon" aria-hidden="true">
            {isAdd ? <CirclePlusIcon /> : <PencilIcon />}
          </span>
          <div className="edit-dialog__title">{isAdd ? "Create Group" : "Edit Group"}</div>
        </div>
        <div className="manage-modal-body">
          {isAdd && (
            <>
              <div className="manage-field">
                <label className="manage-label">Semester</label>
                <select
                  className={`manage-select${error && !form.semester_id ? " is-danger" : ""}`}
                  value={form.semester_id || ""}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, semester_id: e.target.value }));
                    if (error) onClearError();
                  }}
                >
                  <option value="" disabled>Select semester</option>
                  {(semesterOptions || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.semester_name}</option>
                  ))}
                </select>
                {semesterOptions.length === 0 && (
                  <div className="manage-hint manage-hint-warn" role="status">
                    No semesters exist. Create a semester in Semester Settings before adding groups.
                  </div>
                )}
              </div>
              <div className="manage-field">
                <label className="manage-label">Group number</label>
                <input
                  className={`manage-input${error ? " is-danger" : ""}`}
                  value={form.group_no}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, group_no: digitsOnly(e.target.value) }));
                    if (error) onClearError();
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  placeholder="1"
                />
              </div>
              {error && <div className="manage-field-error">{error}</div>}
              <div className="manage-field">
                <label className="manage-label">Project title</label>
                <input
                  className="manage-input"
                  value={form.project_title}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, project_title: e.target.value }));
                    if (error) onClearError();
                  }}
                  placeholder="Smart Traffic AI"
                />
              </div>
            </>
          )}
          {!isAdd && (
            <>
              <label className="manage-label">Group number <span className="manage-label-note">(locked)</span></label>
              <input
                className="manage-input is-locked"
                value={form.group_no}
                disabled
              />
              <label className="manage-label">Project title</label>
              <input
                className="manage-input"
                value={form.project_title}
                onChange={(e) => setForm((f) => ({ ...f, project_title: e.target.value }))}
              />
            </>
          )}
          <label className="manage-label">
            Students{" "}
            <span className="manage-label-note">
              (one student per line item)
            </span>
          </label>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={studentIds} strategy={verticalListSortingStrategy}>
              {form.group_students.map((student, idx) => (
                <SortableStudentRow key={studentIds[idx]} id={studentIds[idx]}>
                  {({ attributes, listeners, setNodeRef, style }) => (
                    <div
                      ref={setNodeRef}
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        marginBottom: "0.5rem",
                        ...style,
                      }}
                    >
                      <Tooltip text="Drag to reorder">
                        <button
                          className="manage-icon-btn"
                          type="button"
                          aria-label={`Drag student ${idx + 1} to reorder`}
                          style={{ cursor: "grab", alignSelf: "center", touchAction: "none" }}
                          {...attributes}
                          {...listeners}
                        >
                          {dragHandle}
                        </button>
                      </Tooltip>
                      <input
                        className="manage-input"
                        value={student}
                        onChange={(e) => {
                          updateStudentInput(setForm, idx, e.target.value);
                          if (isAdd && error) onClearError();
                        }}
                        onBlur={() => blurStudentInput(setForm, idx)}
                        placeholder={idx === 0 ? "Ali Yilmaz" : "Ayse Demir"}
                      />
                      <button
                        className={`manage-btn ${removeClass}`}
                        type="button"
                        onClick={() => removeStudentInput(setForm, idx)}
                        disabled={form.group_students.length === 1}
                        title="Remove student"
                        aria-label={`Remove student ${idx + 1}`}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                          <CircleMinusIcon />
                          Student
                        </span>
                      </button>
                    </div>
                  )}
                </SortableStudentRow>
              ))}
            </SortableContext>
          </DndContext>
          <button
            className={`manage-btn ${addClass}`}
            type="button"
            onClick={() => addStudentInputRow(setForm)}
            style={{ width: "auto", alignSelf: "flex-start" }}
            title="Add student"
            aria-label="Add student"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <CirclePlusIcon />
              Student
            </span>
          </button>
        </div>
        {!isAdd && error && (
          <div role="alert" className="manage-field-error">
            {error}
          </div>
        )}
        <div className="manage-modal-actions">
          <button className={`manage-btn ${cancelClass}`} type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`manage-btn primary ${saveClass}`}
            type="button"
            disabled={!canSubmit || saving || isDemoMode}
            onClick={onSubmit}
          >
            {saving ? (isAdd ? "Creating…" : "Saving…") : (isAdd ? "Create" : "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
