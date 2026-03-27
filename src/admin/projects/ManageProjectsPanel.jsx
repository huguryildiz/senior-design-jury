// src/admin/projects/ManageProjectsPanel.jsx

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, MonitorCogIcon, CirclePlusIcon, UploadIcon } from "../../shared/Icons";
import ConfirmDialog from "../../shared/ConfirmDialog";
import AlertCard from "../../shared/AlertCard";
import { normalizeStudents, parseStudentInputList } from "./projectHelpers";
import ProjectForm from "./ProjectForm";
import ProjectImport from "./ProjectImport";
import ProjectsTable from "./ProjectsTable";

export default function ManageProjectsPanel({
  projects,
  semesterName,
  currentSemesterId,
  semesterOptions = [],
  panelError = "",
  isDemoMode = false,
  isMobile,
  isOpen,
  onToggle,
  onDirtyChange,
  onImport,
  onAddGroup,
  onEditGroup,
  onDeleteProject,
  onRetry,
}) {
  const panelRef = useRef(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({
    group_no: "",
    project_title: "",
    group_students: [""],
    semester_id: currentSemesterId || "",
  });
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ group_no: "", project_title: "", group_students: [""], semesterId: null, _id: null, _updatedAt: null });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [guardError, setGuardError] = useState("");
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const isDirty =
    (showAdd && (form.group_no.trim() !== "" || form.project_title.trim() !== "" || form.group_students.some((s) => s.trim() !== ""))) ||
    showEdit;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = () => {
    if (isOpen && isDirty) {
      setShowUnsavedConfirm(true);
      return;
    }
    onToggle();
  };

  const normalizedAddStudents = normalizeStudents(form.group_students);
  const normalizedEditStudents = normalizeStudents(editForm.group_students);

  const canAddSubmit =
    String(form.group_no).trim() &&
    form.project_title.trim() &&
    String(normalizedAddStudents).trim() &&
    String(form.semester_id || "").trim();
  const canEditSubmit =
    String(editForm.group_no).trim() &&
    editForm.project_title.trim() &&
    String(normalizedEditStudents).trim();

  // Detect external delete while edit modal is open and close it safely.
  useEffect(() => {
    if (!showEdit || !editForm._id) return;
    const stillExists = (projects || []).some((p) => p.id === editForm._id);
    if (!stillExists) {
      setShowEdit(false);
      setGuardError("This group was deleted elsewhere. Your edit session has been closed.");
    }
  }, [showEdit, projects, editForm._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddSubmit = async () => {
    const groupNoRaw = String(form.group_no).trim();
    const groupNo = Number(groupNoRaw);
    const isInteger = Number.isInteger(groupNo) && groupNoRaw !== "" && groupNo > 0;
    if (!isInteger) {
      setAddError("Group number must be a positive integer.");
      return;
    }
    if (groupNo > 999) {
      setAddError("Group number must be between 1 and 999.");
      return;
    }
    if (!form.semester_id) {
      setAddError("Please select a semester.");
      return;
    }
    const existingGroupNos = new Set(
      (projects || [])
        .map((p) => Number(p.group_no))
        .filter((n) => Number.isFinite(n) && n > 0)
    );
    if (form.semester_id === currentSemesterId && Number.isFinite(groupNo) && existingGroupNos.has(groupNo)) {
      setAddError(`Group ${groupNo} already exists. Use 'Edit' to update.`);
      return;
    }
    setAddSaving(true);
    let res;
    try {
      res = await onAddGroup({
        group_no: groupNo,
        project_title: form.project_title.trim(),
        group_students: normalizedAddStudents,
        semesterId: form.semester_id,
      });
    } finally {
      setAddSaving(false);
    }
    if (res?.fieldErrors?.group_no) {
      setAddError(res.fieldErrors.group_no);
      return;
    }
    setShowAdd(false);
    if (res?.ok === false) return;
    setForm({
      group_no: "",
      project_title: "",
      group_students: [""],
      semester_id: currentSemesterId || "",
    });
  };

  const handleEditSubmit = async () => {
    setEditSaving(true);
    setEditError("");
    // Stale-edit check: block save if the project was updated elsewhere while modal was open.
    if (editForm._id && editForm._updatedAt) {
      const currentVersion = (projects || []).find((proj) => proj.id === editForm._id);
      if (currentVersion && currentVersion.updated_at && currentVersion.updated_at !== editForm._updatedAt) {
        setEditSaving(false);
        setEditError("This group was updated elsewhere. Close and reopen to edit the latest version.");
        return;
      }
    }
    const res = await onEditGroup?.({
      group_no: Number(editForm.group_no),
      project_title: editForm.project_title.trim(),
      group_students: normalizedEditStudents,
      semesterId: editForm.semesterId,
    });
    setEditSaving(false);
    if (res?.ok === false) {
      setEditError(res.message || "Could not save changes. Please try again.");
    } else {
      setShowEdit(false);
    }
  };

  const handleEditProject = (p) => {
    setEditError("");
    setEditForm({
      group_no: p.group_no ?? "",
      project_title: p.project_title || "",
      group_students: parseStudentInputList(p.group_students || ""),
      semesterId: p.semester_id || null,
      _id: p.id || null,
      _updatedAt: p.updated_at || p.updatedAt || null,
    });
    setShowEdit(true);
  };

  const handleDeleteProject = (p, groupLabel) => {
    if (!p?.id) {
      setGuardError("Cannot delete this group right now. Refresh the page and try again.");
      return;
    }
    setGuardError("");
    onDeleteProject?.(p, groupLabel);
  };

  return (
    <div ref={panelRef} className={`manage-card${isMobile ? " is-collapsible" : ""}`}>
      <button
        type="button"
        className="manage-card-header"
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <div className="manage-card-title">
          <span className="manage-card-icon" aria-hidden="true"><MonitorCogIcon /></span>
          <span className="section-label">Group Settings</span>
        </div>
        <ChevronDownIcon className={`settings-chevron${isOpen ? " open" : ""}`} />
      </button>

      {(!isMobile || isOpen) && (
        <div className="manage-card-body">
          <div className="manage-card-desc">
            Manage groups, projects, and students for{" "}
            <span className="manage-semester-emphasis-blink">{semesterName || "the selected"}</span>{" "}
            semester.
          </div>
          {(panelError || guardError) && (
            <AlertCard variant="error">
              <span>{panelError || guardError}</span>
              {panelError && onRetry && (
                <button className="manage-btn manage-btn--retry" type="button" onClick={onRetry}>
                  Retry
                </button>
              )}
            </AlertCard>
          )}
          <div className="manage-hint manage-hint-inline">
            Use the header to switch semesters and view other groups.
          </div>
          <div className="manage-card-actions">
            <button
              className="manage-btn"
              type="button"
              onClick={() => {
                setShowImport(true);
              }}
            >
              <span aria-hidden="true"><UploadIcon className="manage-btn-icon" /></span>
              Import CSV
            </button>
            <button
              className="manage-btn primary"
              type="button"
              onClick={() => {
                setAddError("");
                setForm((f) => ({ ...f, semester_id: currentSemesterId || f.semester_id || "" }));
                setShowAdd(true);
              }}
            >
              <span aria-hidden="true"><CirclePlusIcon className="manage-btn-icon" /></span>
              Group
            </button>
          </div>

          <ProjectsTable
            projects={projects}
            semesterName={semesterName}
            isDemoMode={isDemoMode}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
          />

          {showAdd && (
            <ProjectForm
              form={form}
              setForm={setForm}
              error={addError}
              saving={addSaving}
              canSubmit={canAddSubmit}
              onSubmit={handleAddSubmit}
              onCancel={() => setShowAdd(false)}
              onClearError={() => setAddError("")}
              mode="add"
              isDemoMode={isDemoMode}
              semesterOptions={semesterOptions}
            />
          )}

          {showEdit && (
            <ProjectForm
              form={editForm}
              setForm={setEditForm}
              error={editError}
              saving={editSaving}
              canSubmit={canEditSubmit}
              onSubmit={handleEditSubmit}
              onCancel={() => { setShowEdit(false); setEditError(""); }}
              onClearError={() => setEditError("")}
              mode="edit"
              isDemoMode={isDemoMode}
            />
          )}

          <ProjectImport
            show={showImport}
            onClose={() => setShowImport(false)}
            onImport={onImport}
            semesterName={semesterName}
            projects={projects}
          />
        </div>
      )}

      <ConfirmDialog
        open={showUnsavedConfirm}
        onOpenChange={(open) => setShowUnsavedConfirm(open)}
        title="Unsaved Changes"
        body="You have unsaved changes. If you close the panel now, your changes will be lost."
        confirmLabel="Leave Anyway"
        cancelLabel="Keep Editing"
        tone="caution"
        onConfirm={() => {
          setShowUnsavedConfirm(false);
          onToggle();
        }}
      />
    </div>
  );
}
