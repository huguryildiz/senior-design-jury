// src/admin/ManageSemesterPanel.jsx

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2Icon, ChevronDownIcon, PencilIcon, SearchIcon, CirclePlusIcon, CalendarPlusIcon } from "../shared/Icons";
import LastActivity from "./LastActivity";
import DangerIconButton from "../components/admin/DangerIconButton";
import { buildTimestampSearchText } from "./utils";
import {
  APP_DATE_MIN_YEAR,
  APP_DATE_MAX_YEAR,
  APP_DATE_MIN_DATE,
  APP_DATE_MAX_DATE,
  isIsoDateWithinBounds,
} from "../shared/dateBounds";
import { sortSemestersByPosterDateDesc } from "../shared/semesterSort";

export default function ManageSemesterPanel({
  semesters,
  activeSemesterId,
  activeSemesterName,
  panelError = "",
  isMobile,
  isOpen,
  onToggle,
  onDirtyChange,
  onSetActive,
  onCreateSemester,
  onUpdateSemester,
  onDeleteSemester,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [createForm, setCreateForm] = useState({ name: "", poster_date: "" });
  const [editForm, setEditForm] = useState({ id: "", name: "", poster_date: "" });
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");

  const isDirty =
    (showCreate && (createForm.name.trim() !== "" || createForm.poster_date !== "")) ||
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

  const minYear = APP_DATE_MIN_YEAR;
  const maxYear = APP_DATE_MAX_YEAR;
  const minPosterDate = APP_DATE_MIN_DATE;
  const maxPosterDate = APP_DATE_MAX_DATE;
  const getFormMeta = (value) => {
    const hasPosterDate = !!value.poster_date;
    const yearError =
      hasPosterDate && !isIsoDateWithinBounds(value.poster_date)
        ? `Year must be between ${minYear} and ${maxYear}.`
        : "";
    const canSubmit = value.name.trim() && hasPosterDate && !yearError;
    return { yearError, canSubmit };
  };
  const createMeta = getFormMeta(createForm);
  const editMeta = getFormMeta(editForm);

  const uniqueSemesters = useMemo(() => {
    const byId = new Map();
    (semesters || []).forEach((s) => {
      const key = s?.id || `${s?.name || ""}|${s?.poster_date || ""}`;
      if (!key) return;
      const prev = byId.get(key);
      if (!prev) {
        byId.set(key, s);
        return;
      }
      const prevTs = new Date(prev?.updated_at || prev?.updatedAt || 0).getTime();
      const nextTs = new Date(s?.updated_at || s?.updatedAt || 0).getTime();
      if (Number.isFinite(nextTs) && nextTs > prevTs) byId.set(key, s);
    });
    return Array.from(byId.values());
  }, [semesters]);

  const normalizeDateInput = (value) => {
    if (!value) return "";
    return String(value).slice(0, 10);
  };
  const formatDate = (value) => {
    if (!value) return "—";
    // Parse as local date by splitting — new Date("YYYY-MM-DD") is UTC midnight
    // which shows the previous day in timezones east of UTC.
    const parts = String(value).slice(0, 10).split("-");
    if (parts.length !== 3) return value;
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return value;
    const pad = (v) => String(v).padStart(2, "0");
    return `${pad(d)}.${pad(m)}.${y}`;
  };
  const orderedSemesters = sortSemestersByPosterDateDesc(uniqueSemesters);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredSemesters = normalizedSearch
    ? orderedSemesters.filter((s) => {
        const rawDate = s?.poster_date || "";
        const prettyDate = formatDate(rawDate);
        const updatedRaw = s?.updated_at || s?.updatedAt || "";
        const updatedSearch = buildTimestampSearchText(updatedRaw);
        const prettyDateAlt = prettyDate
          ? `${prettyDate} ${prettyDate.replace(/\./g, "/")} ${prettyDate.replace(/\./g, "-")}`
          : "";
        const haystack = [
          s?.name || "",
          rawDate,
          prettyDateAlt,
          updatedSearch,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : orderedSemesters;
  const visibleSemesters = normalizedSearch
    ? filteredSemesters
    : (showAll ? orderedSemesters : orderedSemesters.slice(0, 4));
  const getLastActivity = (s) => s.updated_at || s.updatedAt || null;

  return (
    <div className={`manage-card${isMobile ? " is-collapsible" : ""}`}>
      <button
        type="button"
        className="manage-card-header"
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <div className="manage-card-title">
          <span className="manage-card-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15.228 16.852-.923-.383" />
              <path d="m15.228 19.148-.923.383" />
              <path d="M16 2v4" />
              <path d="m16.47 14.305.382.923" />
              <path d="m16.852 20.772-.383.924" />
              <path d="m19.148 15.228.383-.923" />
              <path d="m19.53 21.696-.382-.924" />
              <path d="m20.772 16.852.924-.383" />
              <path d="m20.772 19.148.924.383" />
              <path d="M21 10.592V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
              <path d="M3 10h18" />
              <path d="M8 2v4" />
              <circle cx="18" cy="18" r="3" />
            </svg>
          </span>
          <span className="section-label">Semester Settings</span>
        </div>
        {isMobile && <ChevronDownIcon className={`settings-chevron${isOpen ? " open" : ""}`} />}
      </button>

      {isOpen && (
        <div className="manage-card-body">
          <div className="manage-card-desc">Manage semesters, dates, and the system-wide active term.</div>
          {panelError && <div className="manage-hint manage-hint-error" role="alert">{panelError}</div>}
          <div className="manage-field manage-current-semester-card">
            <label className="manage-list-header">Set Current Semester</label>
            <div className="manage-hint manage-hint-inline manage-current-semester-desc">
              The jury form opens for the selected semester and its groups.
            </div>
            <div className="manage-row">
              <select
                className="manage-select"
                value={activeSemesterId || ""}
                onChange={(e) => onSetActive(e.target.value)}
              >
                {orderedSemesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="manage-list">
            <div className="manage-list-header">All Semesters</div>
            <div className="manage-list-controls">
              <div className="manage-search">
                <span className="manage-search-icon" aria-hidden="true"><SearchIcon /></span>
                <input
                  className="manage-input manage-search-input"
                type="text"
                placeholder="Search semesters"
                aria-label="Search semesters"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="manage-btn primary" type="button" onClick={() => setShowCreate(true)}>
                <span aria-hidden="true"><CirclePlusIcon className="manage-btn-icon" /></span>
                Semester
              </button>
            </div>
            {visibleSemesters.map((s) => (
              <div key={s.id} className={`manage-item manage-item--semester${s.is_active ? " is-active" : ""}`}>
                <div>
                  <div className="manage-item-title-row">
                    <div className="manage-item-title">{s.name}</div>
                  </div>
                  {(s.is_active || s.id === activeSemesterId) && (
                    <span className="manage-pill manage-current-semester-pill">
                      <span aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 14v2.2l1.6 1" />
                          <path d="M16 2v4" />
                          <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
                          <path d="M3 10h5" />
                          <path d="M8 2v4" />
                          <circle cx="16" cy="16" r="6" />
                        </svg>
                      </span>
                      <span>Current Semester</span>
                    </span>
                  )}
                  <div className="manage-item-sub manage-meta-line">
                    <span className="manage-meta-icon manage-semester-date-icon" aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M8 2v4" />
                        <path d="M16 2v4" />
                        <rect width="18" height="18" x="3" y="4" rx="2" />
                        <path d="M3 10h18" />
                        <path d="M8 14h.01" />
                        <path d="M12 14h.01" />
                        <path d="M16 14h.01" />
                        <path d="M8 18h.01" />
                        <path d="M12 18h.01" />
                        <path d="M16 18h.01" />
                      </svg>
                    </span>
                    <span>{formatDate(s.poster_date)}</span>
                  </div>
                  <div className="manage-item-sub manage-meta-line">
                    <LastActivity value={getLastActivity(s)} />
                  </div>
                </div>
                <div className="manage-item-actions manage-item-actions--semester">
                  <button
                    className="manage-icon-btn"
                    type="button"
                    title="Edit semester"
                    aria-label={`Edit ${s.name}`}
                    onClick={() => {
                      setEditForm({
                        id: s.id,
                        name: s.name || "",
                        poster_date: normalizeDateInput(s.poster_date),
                      });
                      setShowEdit(true);
                    }}
                  >
                    <PencilIcon />
                  </button>
                  <DangerIconButton
                    ariaLabel={`Delete ${s.name}`}
                    title={s.id === activeSemesterId
                      ? "Cannot delete the current semester"
                      : "Delete semester"}
                    showLabel={false}
                    disabled={s.id === activeSemesterId}
                    onClick={() => onDeleteSemester?.(s)}
                  />
                </div>
              </div>
            ))}
            {normalizedSearch && filteredSemesters.length === 0 && (
              <div className="manage-empty manage-empty-search">No results.</div>
            )}
          </div>

          {!normalizedSearch && orderedSemesters.length > 4 && (
            <button
              className="manage-btn ghost"
              type="button"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Show fewer semesters" : `Show all semesters (${orderedSemesters.length})`}
            </button>
          )}

          {showCreate && (
            <div className="manage-modal">
              <div className="manage-modal-card">
                <div className="edit-dialog__header">
                  <span className="edit-dialog__icon" aria-hidden="true">
                    <CalendarPlusIcon />
                  </span>
                  <div className="edit-dialog__title">Create Semester</div>
                </div>
                <div className="manage-modal-body">
                  <label className="manage-label">Semester name</label>
                  <input
                    className={`manage-input${createError ? " is-danger" : ""}`}
                    value={createForm.name}
                    onChange={(e) => {
                      setCreateForm((f) => ({ ...f, name: e.target.value }));
                      if (createError) setCreateError("");
                    }}
                    placeholder="2026 Spring"
                  />
                  {createError && <div className="manage-field-error">{createError}</div>}
                  <div className="manage-field">
                    <label className="manage-label">Poster date</label>
                    <input
                      type="date"
                      className={`manage-input manage-date${createForm.poster_date ? "" : " is-empty"}${createMeta.yearError ? " is-danger" : ""}`}
                      value={createForm.poster_date}
                      onChange={(e) => setCreateForm((f) => ({ ...f, poster_date: e.target.value }))}
                      min={minPosterDate}
                      max={maxPosterDate}
                      aria-invalid={!!createMeta.yearError}
                    />
                  </div>
                  {createMeta.yearError && <div className="manage-field-error">{createMeta.yearError}</div>}
                </div>
                <div className="manage-modal-actions">
                  <button
                    className="manage-btn"
                    type="button"
                    onClick={() => {
                      setShowCreate(false);
                      setCreateError("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="manage-btn primary"
                    type="button"
                    disabled={!createMeta.canSubmit}
                    onClick={async () => {
                      const trimmedName = createForm.name.trim();
                      const duplicate = uniqueSemesters.some(
                        (s) => (s.name || "").trim().toLowerCase() === trimmedName.toLowerCase()
                      );
                      if (duplicate) {
                        setCreateError(`A semester named "${trimmedName}" already exists.`);
                        return;
                      }
                      const res = await onCreateSemester({
                        name: trimmedName,
                        poster_date: createForm.poster_date,
                      });
                      if (res?.fieldErrors) {
                        setCreateError(res.fieldErrors.name || res.fieldErrors.poster_date || "Invalid semester data.");
                        return;
                      }
                      setCreateError("");
                      setShowCreate(false);
                      setCreateForm({ name: "", poster_date: "" });
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
              <div className="manage-modal-card">
                <div className="edit-dialog__header">
                  <span className="edit-dialog__icon" aria-hidden="true">
                    <PencilIcon />
                  </span>
                  <div className="edit-dialog__title">Edit Semester</div>
                </div>
                <div className="manage-modal-body">
                  <label className="manage-label">Semester name</label>
                  <input
                    className={`manage-input${editError ? " is-danger" : ""}`}
                    value={editForm.name}
                    onChange={(e) => {
                      setEditForm((f) => ({ ...f, name: e.target.value }));
                      if (editError) setEditError("");
                    }}
                    placeholder="2026 Spring"
                  />
                  {editError && <div className="manage-field-error">{editError}</div>}
                  <div className="manage-field">
                    <label className="manage-label">Poster date</label>
                    <input
                      type="date"
                      className={`manage-input manage-date${editForm.poster_date ? "" : " is-empty"}${editMeta.yearError ? " is-danger" : ""}`}
                      value={editForm.poster_date}
                      onChange={(e) => setEditForm((f) => ({ ...f, poster_date: e.target.value }))}
                      min={minPosterDate}
                      max={maxPosterDate}
                      aria-invalid={!!editMeta.yearError}
                    />
                  </div>
                  {editMeta.yearError && <div className="manage-field-error">{editMeta.yearError}</div>}
                </div>
                <div className="manage-modal-actions">
                  <button
                    className="manage-btn"
                    type="button"
                    onClick={() => {
                      setShowEdit(false);
                      setEditError("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="manage-btn primary"
                    type="button"
                    disabled={!editMeta.canSubmit}
                    onClick={async () => {
                      const res = await onUpdateSemester({
                        id: editForm.id,
                        name: editForm.name.trim(),
                        poster_date: editForm.poster_date,
                      });
                      if (res?.fieldErrors) {
                        setEditError(res.fieldErrors.name || res.fieldErrors.poster_date || "Invalid semester data.");
                        return;
                      }
                      setEditError("");
                      setShowEdit(false);
                      setEditForm({ id: "", name: "", poster_date: "" });
                    }}
                  >
                    Save
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
