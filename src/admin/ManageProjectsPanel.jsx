// src/admin/ManageProjectsPanel.jsx

import { useEffect, useRef, useState } from "react";
import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClockIcon, ChevronDownIcon, FileTextIcon, MonitorCogIcon, PencilIcon, SearchIcon, UsersLucideIcon, CirclePlusIcon, UploadIcon, FileUpIcon, CloudUploadIcon } from "../shared/Icons";
import DangerIconButton from "../components/admin/DangerIconButton";
import Tooltip from "../shared/Tooltip";
import LastActivity from "./LastActivity";
import { buildTimestampSearchText, parseCsv } from "./utils";

function splitStudents(text) {
  if (!text) return [];
  return String(text)
    .replace(/\r\n?/g, "\n")
    .replace(/\n+/g, ";")
    .replace(/[,/|&]+/g, ";")
    .replace(/\s+-\s+/g, ";")
    .replace(/;+/g, ";")
    .split(";")
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

function normalizeStudents(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => splitStudents(entry))
      .join("; ");
  }
  return splitStudents(value).join("; ");
}

function parseStudentInputList(value) {
  const parsed = Array.isArray(value)
    ? value.flatMap((entry) => splitStudents(entry))
    : splitStudents(value);
  return parsed.length ? parsed : [""];
}

function getInvalidStudentSeparators(text) {
  const matches = String(text || "").match(/(?:\.{2,}|\s+\.\s+|[,#&|/+*=:!?@$%^~`<>()[\]{}\\\n\r])/g) || [];
  const normalized = matches
    .map((token) => {
      if (/\.{2,}/.test(token)) return "..";
      if (/\s+\.\s+/.test(token)) return ".";
      if (/[\n\r]/.test(token)) return "newline";
      return token.trim();
    })
    .filter(Boolean);
  return [...new Set(normalized)];
}

function buildCsvSeparatorReason(tokens) {
  if (!tokens.length) return "invalid separator";
  const quoted = tokens.map((t) => `"${t}"`).join(", ");
  return `invalid separator${tokens.length > 1 ? "s" : ""} ${quoted}`;
}

function digitsOnly(value) {
  return String(value ?? "").replace(/\D+/g, "");
}

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

export default function ManageProjectsPanel({
  projects,
  semesterName,
  activeSemesterId,
  activeSemesterName,
  semesterOptions = [],
  panelError = "",
  isMobile,
  isOpen,
  onToggle,
  onDirtyChange,
  onImport,
  onAddGroup,
  onEditGroup,
  onDeleteProject,
}) {
  const panelRef = useRef(null);
  const fileRef = useRef(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [form, setForm] = useState({
    group_no: "",
    project_title: "",
    group_students: [""],
    semester_id: activeSemesterId || "",
  });
  const [addError, setAddError] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ group_no: "", project_title: "", group_students: [""] });
  const [editSaving, setEditSaving] = useState(false);
  const [importSuccess, setImportSuccess] = useState("");
  const [importError, setImportError] = useState("");
  const [importWarning, setImportWarning] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const isDirty =
    (showAdd && (form.group_no.trim() !== "" || form.project_title.trim() !== "" || form.group_students.some((s) => s.trim() !== ""))) ||
    showEdit;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = () => {
    if (isOpen && isDirty) {
      if (!window.confirm("You have unsaved changes. Leave anyway?")) return;
    }
    onToggle();
  };

  const updateScrollState = (el) => {
    if (!el) return;
    const isOverflowing = el.scrollWidth > el.clientWidth + 1;
    el.classList.toggle("is-overflowing", isOverflowing);
    el.classList.toggle("is-scrolled", el.scrollLeft > 0);
  };
  const handleMetaScroll = (e) => updateScrollState(e.currentTarget);

  const normalizedAddStudents = normalizeStudents(form.group_students);
  const normalizedEditStudents = normalizeStudents(editForm.group_students);
  const addStudentIds = form.group_students.map((_, idx) => `add-${idx}`);
  const editStudentIds = editForm.group_students.map((_, idx) => `edit-${idx}`);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  );

  const updateStudentInput = (setter, index, nextValue) => {
    setter((prev) => ({
      ...prev,
      group_students: prev.group_students.map((entry, idx) => (idx === index ? nextValue : entry)),
    }));
  };

  const blurStudentInput = (setter, index) => {
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
  };

  const addStudentInput = (setter) => {
    setter((prev) => ({
      ...prev,
      group_students: [...prev.group_students, ""],
    }));
  };

  const moveStudentInput = (setter, fromIndex, toIndex) => {
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
  };

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

  const removeStudentInput = (setter, index) => {
    setter((prev) => {
      const next = prev.group_students.filter((_, idx) => idx !== index);
      return {
        ...prev,
        group_students: next.length ? next : [""],
      };
    });
  };

  const canSubmit =
    String(form.group_no).trim() &&
    form.project_title.trim() &&
    String(normalizedAddStudents).trim() &&
    String(form.semester_id || "").trim();
  const canEditSubmit =
    String(editForm.group_no).trim() &&
    editForm.project_title.trim() &&
    String(normalizedEditStudents).trim();

  const handleAddStudentsDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const fromIndex = addStudentIds.indexOf(String(active.id));
    const toIndex = addStudentIds.indexOf(String(over.id));
    if (fromIndex < 0 || toIndex < 0) return;
    moveStudentInput(setForm, fromIndex, toIndex);
  };

  const handleEditStudentsDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const fromIndex = editStudentIds.indexOf(String(active.id));
    const toIndex = editStudentIds.indexOf(String(over.id));
    if (fromIndex < 0 || toIndex < 0) return;
    moveStudentInput(setEditForm, fromIndex, toIndex);
  };

  const orderedProjects = [...projects].sort((a, b) => {
    const aNo = Number(a.group_no || 0);
    const bNo = Number(b.group_no || 0);
    return aNo - bNo;
  });
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredProjects = normalizedSearch
    ? orderedProjects.filter((p) => {
        const lastActivity = p.updated_at || p.updatedAt || "";
        const lastActivitySearch = buildTimestampSearchText(lastActivity);
        const groupNo = p?.group_no ?? "";
        const haystack = [
          "group",
          groupNo,
          `group ${groupNo}`,
          p?.project_title || "",
          p?.group_students || "",
          semesterName || "",
          lastActivitySearch,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : orderedProjects;
  const visibleProjects = normalizedSearch ? filteredProjects : orderedProjects.slice(0, 3);
  const hiddenProjects = normalizedSearch ? [] : orderedProjects.slice(3);

  useEffect(() => {
    const root = panelRef.current;
    if (!root) return;
    const updateAll = () => {
      root.querySelectorAll(".manage-meta-scroll").forEach((el) => updateScrollState(el));
    };
    const raf = requestAnimationFrame(updateAll);
    window.addEventListener("resize", updateAll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateAll);
    };
  }, [visibleProjects, hiddenProjects, showMore, searchTerm, isOpen, isMobile]);

  const renderProject = (p, idx) => {
    const students = splitStudents(p.group_students);
    const groupLabel = Number.isFinite(Number(p.group_no)) && Number(p.group_no) > 0
      ? Number(p.group_no)
      : idx + 1;
    const lastActivity = p.updated_at || p.updatedAt || null;
    return (
      <div key={p.id || `${p.group_no}-${p.project_title}`} className="manage-item manage-item--project">
        <div>
          <div className="manage-item-title">Group {groupLabel}</div>
          <div className="manage-item-sub manage-meta-line">
            <span className="manage-meta-icon" aria-hidden="true"><FileTextIcon /></span>
            <span className="manage-meta-scroll" onScroll={handleMetaScroll}>{p.project_title || "—"}</span>
          </div>
          <div className="manage-item-sub manage-meta-line">
            <span className="manage-meta-icon" aria-hidden="true"><UsersLucideIcon /></span>
            <span className="manage-students manage-meta-scroll" onScroll={handleMetaScroll}>
              {students.length
                ? students.map((name, sidx) => (
                    <span key={`${p.id}-student-${sidx}`} className="manage-student">
                      <em>{name}</em>{sidx < students.length - 1 ? " · " : ""}
                    </span>
                  ))
                : "—"}
            </span>
          </div>
          <div className="manage-item-footer manage-item-footer--project">
            <div className="manage-item-meta-block">
              <div className="manage-item-sub manage-meta-line manage-meta-line--semester-chip">
                <span className="manage-meta-icon manage-semester-date-icon" aria-hidden="true">
                  <CalendarClockIcon />
                </span>
                <span className="manage-item-semester-chip">{semesterName || "—"}</span>
              </div>
              <div className="manage-item-sub manage-meta-line">
                <LastActivity value={lastActivity} />
              </div>
            </div>
            <div className="manage-item-actions manage-item-actions--project">
              <button
                className="manage-icon-btn"
                type="button"
                title="Edit group"
                aria-label={`Edit Group ${groupLabel}`}
                onClick={() => {
                  setEditForm({
                    group_no: p.group_no,
                    project_title: p.project_title || "",
                    group_students: parseStudentInputList(p.group_students || ""),
                  });
                  setShowEdit(true);
                }}
              >
                <PencilIcon />
              </button>
              <DangerIconButton
                ariaLabel={`Delete Group ${groupLabel}`}
                title="Delete group"
                showLabel={false}
                onClick={() => onDeleteProject?.(p, groupLabel)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2MB

  const handleFile = async (file) => {
    if (!file) return;
    setImportSuccess("");
    setImportError("");
    setImportWarning("");
    if (file.size > MAX_CSV_BYTES) {
      setImportError("File is too large. Maximum allowed size is 2MB.");
      return;
    }
    const fileName = String(file.name || "").toLowerCase();
    if (!fileName.endsWith(".csv")) {
      setImportError("Only .csv files are supported.");
      return;
    }
    const text = await file.text();
    const rows = parseCsv(text);
    if (!rows.length) return;
    const header = rows[0].map((h) => h.toLowerCase());
    const idxGroup = header.indexOf("group_no");
    const idxTitle = header.indexOf("project_title");
    const idxStudents = header.indexOf("group_students");
    if (idxGroup < 0 || idxTitle < 0 || idxStudents < 0) {
      setImportError("Header row is required and must include: group_no, project_title, group_students.");
      return;
    }
    const invalidGroupRows = [];
    const invalidTitleRows = [];
    const invalidStudentsRows = [];
    const invalidStudentSeparatorSkips = [];
    const duplicateGroupRows = [];
    const seenGroups = new Set();
    const data = rows.slice(1).map((r) => {
      const studentsRaw = idxStudents >= 0 ? r[idxStudents] : "";
      const studentsText = String(studentsRaw || "").trim();
      const groupNo = Number(r[idxGroup] || 0);
      const title = String(r[idxTitle] || "").trim();
      const hasExtraValues = r.slice(idxStudents + 1).some((cell) => String(cell || "").trim() !== "");
      return {
        group_no: groupNo,
        project_title: title,
        group_students: studentsText,
        has_extra_values: hasExtraValues,
      };
    }).filter((r, idx) => {
      const rowNo = idx + 2; // include header row
      let isValid = true;
      if (!Number.isFinite(r.group_no) || r.group_no <= 0) {
        invalidGroupRows.push(rowNo);
        isValid = false;
      }
      if (!r.project_title) {
        invalidTitleRows.push(rowNo);
        isValid = false;
      }
      if (!r.group_students) {
        invalidStudentsRows.push(rowNo);
        isValid = false;
      }
      const invalidSeparators = getInvalidStudentSeparators(r.group_students);
      if (r.group_students.includes(",") || r.has_extra_values) {
        invalidSeparators.push(",");
      }
      const uniqueInvalidSeparators = [...new Set(invalidSeparators)];
      if (uniqueInvalidSeparators.length > 0) {
        invalidStudentSeparatorSkips.push({
          rowNo,
          groupNo: Number.isFinite(r.group_no) && r.group_no > 0 ? r.group_no : null,
          separators: uniqueInvalidSeparators,
        });
        isValid = false;
      }
      if (isValid && seenGroups.has(r.group_no)) {
        duplicateGroupRows.push(rowNo);
        isValid = false;
      }
      if (isValid && Number.isFinite(r.group_no) && r.group_no > 0) {
        seenGroups.add(r.group_no);
      }
      return isValid;
    });
    if (
      invalidGroupRows.length ||
      invalidTitleRows.length ||
      invalidStudentsRows.length ||
      duplicateGroupRows.length
    ) {
      const parts = [];
      if (invalidGroupRows.length) {
        parts.push(`Invalid group_no at rows: ${invalidGroupRows.slice(0, 6).join(", ")}.`);
      }
      if (invalidTitleRows.length) {
        parts.push(`Missing project_title at rows: ${invalidTitleRows.slice(0, 6).join(", ")}.`);
      }
      if (invalidStudentsRows.length) {
        parts.push(`Missing group_students at rows: ${invalidStudentsRows.slice(0, 6).join(", ")}.`);
      }
      if (duplicateGroupRows.length) {
        parts.push(`Duplicate group_no at rows: ${duplicateGroupRows.slice(0, 6).join(", ")}.`);
      }
      setImportError(parts.join(" "));
      return;
    }
    if (!data.length) {
      if (invalidStudentSeparatorSkips.length) {
        const details = invalidStudentSeparatorSkips
          .slice(0, 6)
          .map((item) => {
            const target = item.groupNo ? `group_no ${item.groupNo}` : `row ${item.rowNo}`;
            return `${target} (${buildCsvSeparatorReason(item.separators)})`;
          })
          .join("; ");
        const extraCount = Math.max(0, invalidStudentSeparatorSkips.length - 6);
        const extraText = extraCount > 0 ? ` +${extraCount} more` : "";
        setImportWarning(`• Skipped rows with invalid student separators: ${details}${extraText}.`);
        return;
      }
      setImportError("No valid rows found in CSV.");
      return;
    }
    const existingGroupNos = new Set(
      (projects || [])
        .map((p) => Number(p.group_no))
        .filter((n) => Number.isFinite(n) && n > 0)
    );
    const skippedExisting = data.filter((r) => existingGroupNos.has(r.group_no));
    const toImport = data.filter((r) => !existingGroupNos.has(r.group_no));
    const successMsg = toImport.length > 0
      ? `• Import complete: ${toImport.length} added, ${skippedExisting.length} skipped.`
      : "";
    setImportSuccess(successMsg);

    const warningParts = [];
    if (skippedExisting.length) {
      warningParts.push(`• Skipped existing group_no: ${Array.from(new Set(skippedExisting.map((r) => r.group_no))).join(", ")}.`);
    }
    if (invalidStudentSeparatorSkips.length) {
      const details = invalidStudentSeparatorSkips
        .slice(0, 6)
        .map((item) => {
          const target = item.groupNo ? `group_no ${item.groupNo}` : `row ${item.rowNo}`;
          return `${target} (${buildCsvSeparatorReason(item.separators)})`;
        })
        .join("; ");
      const extraCount = Math.max(0, invalidStudentSeparatorSkips.length - 6);
      const extraText = extraCount > 0 ? ` +${extraCount} more` : "";
      warningParts.push(`• Skipped rows with invalid student separators: ${details}${extraText}.`);
    }
    const localWarning = warningParts.join("\n");
    setImportWarning(localWarning);

    if (!toImport.length) {
      return;
    }

    setIsImporting(true);
    let res;
    try {
      res = await onImport(toImport);
    } finally {
      setIsImporting(false);
    }
    if (res?.formError) {
      setImportSuccess("");
      setImportError(res.formError);
      return;
    }
    if (res?.ok === false) {
      return;
    }
    const serverSkipped = Number(res?.skipped || 0);
    if (serverSkipped > 0) {
      const extra = `• Skipped ${serverSkipped} existing groups during import.`;
      setImportWarning(localWarning ? `${localWarning}\n${extra}` : extra);
    }
    if (!skippedExisting.length && !invalidStudentSeparatorSkips.length && serverSkipped === 0) setShowImport(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    await handleFile(file);
    e.target.value = "";
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
        {isMobile && <ChevronDownIcon className={`settings-chevron${isOpen ? " open" : ""}`} />}
      </button>

      {(!isMobile || isOpen) && (
        <div className="manage-card-body">
          <div className="manage-card-desc">
            Manage groups, projects, and students for{" "}
            <span className="manage-semester-emphasis-blink">{activeSemesterName || "the selected"}</span>{" "}
            semester.
          </div>
          {panelError && <div className="manage-hint manage-hint-error" role="alert">{panelError}</div>}
          <div className="manage-hint manage-hint-inline">
            Use the header to switch semesters and view other groups.
          </div>
          <div className="manage-card-actions">
            <button
              className="manage-btn"
              type="button"
              onClick={() => {
                setImportError("");
                setImportWarning("");
                setImportSuccess("");
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
                setForm((f) => ({ ...f, semester_id: activeSemesterId || f.semester_id || "" }));
                setShowAdd(true);
              }}
            >
              <span aria-hidden="true"><CirclePlusIcon className="manage-btn-icon" /></span>
              Group
            </button>
          </div>

          <div className="manage-search">
            <span className="manage-search-icon" aria-hidden="true"><SearchIcon /></span>
            <input
              className="manage-input manage-search-input"
              type="text"
              placeholder="Search groups, projects, or students"
              aria-label="Search groups, projects, or students"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isMobile && (
            <div className="manage-hint manage-hint-inline">Swipe horizontally on text to view full content.</div>
          )}

          <div className="manage-list">
            {visibleProjects.map((p, idx) => renderProject(p, idx))}
            {!normalizedSearch && orderedProjects.length === 0 && (
              <div className="manage-empty manage-empty-search">No groups for the selected semester.</div>
            )}
            {normalizedSearch && filteredProjects.length === 0 && (
              <div className="manage-empty manage-empty-search">No results.</div>
            )}
          </div>

          {hiddenProjects.length > 0 && (
            <>
              <div className="manage-accordion">
                <div id="manage-more-groups" className={`group-accordion-panel${showMore ? " open" : ""}`}>
                  <div className="group-accordion-panel-inner manage-list">
                    {hiddenProjects.map((p, idx) => renderProject(p, idx + visibleProjects.length))}
                  </div>
                </div>
                {!showMore && (
                  <button
                    className="manage-btn ghost"
                    type="button"
                    aria-expanded={showMore}
                    aria-controls="manage-more-groups"
                    onClick={() => setShowMore((v) => !v)}
                  >
                    {`Show all groups (${orderedProjects.length})`}
                  </button>
                )}
              </div>
              {showMore && (
                <button
                  className="manage-btn ghost"
                  type="button"
                  aria-expanded={showMore}
                  aria-controls="manage-more-groups"
                  onClick={() => setShowMore((v) => !v)}
                >
                  Show fewer groups
                </button>
              )}
            </>
          )}

          {showAdd && (
            <div className="manage-modal">
              <div className="manage-modal-card manage-modal-card--create-group">
                <div className="edit-dialog__header">
                  <span className="edit-dialog__icon" aria-hidden="true">
                    <CirclePlusIcon />
                  </span>
                  <div className="edit-dialog__title">Create Group</div>
                </div>
                <div className="manage-modal-body">
                  <div className="manage-field">
                    <label className="manage-label">Semester</label>
                    <select
                      className={`manage-select${addError && !form.semester_id ? " is-danger" : ""}`}
                      value={form.semester_id || ""}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, semester_id: e.target.value }));
                        if (addError) setAddError("");
                      }}
                    >
                      <option value="" disabled>Select semester</option>
                      {(semesterOptions || []).map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="manage-field">
                    <label className="manage-label">Group number</label>
                    <input
                      className={`manage-input${addError ? " is-danger" : ""}`}
                      value={form.group_no}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, group_no: digitsOnly(e.target.value) }));
                        if (addError) setAddError("");
                      }}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      placeholder="1"
                    />
                  </div>
                  {addError && <div className="manage-field-error">{addError}</div>}
                  <div className="manage-field">
                    <label className="manage-label">Project title</label>
                    <input
                      className="manage-input"
                      value={form.project_title}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, project_title: e.target.value }));
                        if (addError) setAddError("");
                      }}
                      placeholder="Smart Traffic AI"
                    />
                  </div>
                  <div className="manage-field">
                    <label className="manage-label">
                      Students{" "}
                      <span className="manage-label-note">
                        (one student per line item)
                      </span>
                    </label>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleAddStudentsDragEnd}>
                      <SortableContext items={addStudentIds} strategy={verticalListSortingStrategy}>
                        {form.group_students.map((student, idx) => (
                          <SortableStudentRow key={addStudentIds[idx]} id={addStudentIds[idx]}>
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
                                    if (addError) setAddError("");
                                  }}
                                  onBlur={() => blurStudentInput(setForm, idx)}
                                  placeholder={idx === 0 ? "Ali Yilmaz" : "Ayse Demir"}
                                />
                                <button
                                  className="manage-btn manage-btn--create-remove"
                                  type="button"
                                  onClick={() => removeStudentInput(setForm, idx)}
                                  disabled={form.group_students.length === 1}
                                  title="Remove student"
                                  aria-label={`tudent ${idx + 1}`}
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
                      className="manage-btn manage-btn--create-add"
                      type="button"
                      onClick={() => addStudentInput(setForm)}
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
                </div>
                <div className="manage-modal-actions">
                  <button className="manage-btn manage-btn--create-cancel" type="button" onClick={() => setShowAdd(false)}>
                    Cancel
                  </button>
                  <button
                    className="manage-btn primary manage-btn--create-save"
                    type="button"
                    disabled={!canSubmit}
                    onClick={async () => {
                      const groupNoRaw = String(form.group_no).trim();
                      const groupNo = Number(groupNoRaw);
                      const isInteger = Number.isInteger(groupNo) && groupNoRaw !== "" && groupNo > 0;
                      if (!isInteger) {
                        setAddError("Group number must be a positive integer.");
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
                      if (form.semester_id === activeSemesterId && Number.isFinite(groupNo) && existingGroupNos.has(groupNo)) {
                        setAddError(`Group ${groupNo} already exists. Use 'Edit' to update.`);
                        return;
                      }
                      const res = await onAddGroup({
                        group_no: groupNo,
                        project_title: form.project_title.trim(),
                        group_students: normalizedAddStudents,
                        semesterId: form.semester_id,
                      });
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
                        semester_id: activeSemesterId || "",
                      });
                    }}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {showEdit && (
            <div className="manage-modal">
              <div className="manage-modal-card manage-modal-card--edit-group">
                <div className="edit-dialog__header">
                  <span className="edit-dialog__icon" aria-hidden="true">
                    <PencilIcon />
                  </span>
                  <div className="edit-dialog__title">Edit Group</div>
                </div>
                <div className="manage-modal-body">
                  <label className="manage-label">Group number <span className="manage-label-note">(locked)</span></label>
                  <input
                    className="manage-input is-locked"
                    value={editForm.group_no}
                    disabled
                  />
                  <label className="manage-label">Project title</label>
                  <input
                    className="manage-input"
                    value={editForm.project_title}
                    onChange={(e) => setEditForm((f) => ({ ...f, project_title: e.target.value }))}
                  />
                  <label className="manage-label">
                    Students{" "}
                    <span className="manage-label-note">
                      (one student per line item)
                    </span>
                  </label>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEditStudentsDragEnd}>
                    <SortableContext items={editStudentIds} strategy={verticalListSortingStrategy}>
                      {editForm.group_students.map((student, idx) => (
                        <SortableStudentRow key={editStudentIds[idx]} id={editStudentIds[idx]}>
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
                                onChange={(e) => updateStudentInput(setEditForm, idx, e.target.value)}
                                onBlur={() => blurStudentInput(setEditForm, idx)}
                                placeholder={idx === 0 ? "Ali Yilmaz" : "Ayse Demir"}
                              />
                              <button
                                className="manage-btn manage-btn--edit-remove"
                                type="button"
                                onClick={() => removeStudentInput(setEditForm, idx)}
                                disabled={editForm.group_students.length === 1}
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
                    className="manage-btn manage-btn--edit-add"
                    type="button"
                    onClick={() => addStudentInput(setEditForm)}
                    style={{ width: "auto", alignSelf: "flex-start" }}
                    title="Add student"
                    aria-label="Add student"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                      <CirclePlusSmallIcon />
                      Student
                    </span>
                  </button>
                </div>
                <div className="manage-modal-actions">
                  <button className="manage-btn manage-btn--edit-cancel" type="button" onClick={() => setShowEdit(false)}>
                    Cancel
                  </button>
                  <button
                    className="manage-btn primary manage-btn--edit-save"
                    type="button"
                    disabled={!canEditSubmit || editSaving}
                    onClick={async () => {
                      setEditSaving(true);
                      await onEditGroup?.({
                        group_no: Number(editForm.group_no),
                        project_title: editForm.project_title.trim(),
                        group_students: normalizedEditStudents,
                      });
                      setEditSaving(false);
                      setShowEdit(false);
                    }}
                  >
                    {editSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showImport && (
            <div className="manage-modal">
              <div className="manage-modal-card manage-modal-card--import-csv">
                <div className="edit-dialog__header">
                  <span className="edit-dialog__icon" aria-hidden="true">
                    <FileUpIcon />
                  </span>
                  <div className="edit-dialog__title">Import CSV</div>
                </div>
                <div className="manage-import-context-line">
                  Groups will be added to{" "}
                  <span className="manage-semester-emphasis-blink">{activeSemesterName || "selected"}</span>{" "}
                  semester.
                </div>
                <div className="manage-modal-body">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    className="manage-input"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                  <div
                    className={`manage-dropzone${isDragging ? " is-dragging" : ""}${importError ? " is-error" : ""}`}
                    onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      handleFile(file);
                    }}
                    onClick={() => fileRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileRef.current?.click();
                      }
                    }}
                  >
                    <div className="manage-dropzone-icon" aria-hidden="true"><CloudUploadIcon /></div>
                    <div className="manage-dropzone-title">Drag & Drop your CSV here</div>
                    <button className="manage-btn manage-btn--import-select" type="button">
                      Select CSV File
                    </button>
                    <div className="manage-dropzone-sub">Only .csv files supported</div>
                    <div className="manage-dropzone-sub manage-dropzone-sub--muted">Max file size: 2MB</div>
                  </div>
                  {importError && (
                    <div className="manage-import-feedback manage-import-feedback--error" role="alert">
                      {importError}
                    </div>
                  )}
                  {importSuccess && !importError && (
                    <div className="manage-import-feedback manage-import-feedback--success" role="status">
                      {importSuccess}
                    </div>
                  )}
                  {importWarning && !importError && (
                    <div className="manage-import-feedback manage-import-feedback--warn" role="status">
                      {importWarning}
                    </div>
                  )}
                  <details className="manage-collapsible">
                    <summary className="manage-collapsible-summary">
                      <span>CSV example</span>
                      <ChevronDownIcon className="manage-collapsible-chevron" aria-hidden="true" />
                    </summary>
                    <div className="manage-collapsible-content">
                      <div className="manage-code">group_no,project_title,group_students</div>
                      <div className="manage-code">1,Autonomous Drone Navigation,Ali Yilmaz; Ayse Demir; Mehmet Can</div>
                      <div className="manage-code">2,Power Quality Monitoring,Elif Kaya; Mert Arslan</div>
                      <div className="manage-code">3,Embedded Vision for Robots,Zeynep Acar; Kerem Sahin</div>
                    </div>
                  </details>
                  <details className="manage-collapsible">
                    <summary className="manage-collapsible-summary">
                      <span>Rules</span>
                      <ChevronDownIcon className="manage-collapsible-chevron" aria-hidden="true" />
                    </summary>
                    <div className="manage-collapsible-content">
                      <ul className="manage-hint-list manage-rules-list">
                        <li>Header row is required with exact field names: <span className="manage-code-inline">group_no</span>, <span className="manage-code-inline">project_title</span>, <span className="manage-code-inline">group_students</span>.</li>
                        <li><span className="manage-code-inline">group_no</span> must be a positive number and unique in the CSV.</li>
                        <li><span className="manage-code-inline">project_title</span> and <span className="manage-code-inline">group_students</span> cannot be empty.</li>
                        <li>One row must represent one group. Separate students with <span className="manage-code-inline">;</span> in <span className="manage-code-inline">group_students</span>.</li>
                        <li>Existing <span className="manage-code-inline">group_no</span> values are skipped during import.</li>
                      </ul>
                    </div>
                  </details>
                </div>
                <div className="manage-modal-actions">
                  <button className="manage-btn manage-btn--import-cancel" type="button" onClick={() => setShowImport(false)} disabled={isImporting}>
                    {isImporting ? "Importing…" : "Cancel"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
