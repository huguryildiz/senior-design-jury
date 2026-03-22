// src/admin/ManageJurorsPanel.jsx

import { useEffect, useRef, useState } from "react";
import {
  ChevronDownIcon,
  UploadIcon,
  FileUpIcon,
  CloudUploadIcon,
  CalendarCheckIcon,
  LandmarkIcon,
  UserCheckIcon,
  LockIcon,
  KeyRoundIcon,
  PencilIcon,
  SearchIcon,
  UserCogIcon,
  CirclePlusIcon,
} from "../shared/Icons";
import DangerIconButton from "../components/admin/DangerIconButton";
import LastActivity from "./LastActivity";
import { buildSemesterSearchText, buildTimestampSearchText, parseCsv } from "./utils";

function normalizeKey(name, inst) {
  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  return `${norm(name)}|${norm(inst)}`;
}

function getScoredSemesters(juror) {
  return Array.isArray(juror?.scoredSemesters)
    ? juror.scoredSemesters.filter(Boolean)
    : Array.isArray(juror?.scored_semesters)
      ? juror.scored_semesters.filter(Boolean)
      : [];
}

function renderImportMessage(text) {
  return <span className="manage-import-msg">{String(text || "")}</span>;
}

export default function ManageJurorsPanel({
  jurors,
  panelError = "",
  isMobile,
  isOpen,
  onToggle,
  onDirtyChange,
  onImport,
  onAddJuror,
  onEditJuror,
  onResetPin,
  onDeleteJuror,
}) {
  const panelRef = useRef(null);
  const fileRef = useRef(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [form, setForm] = useState({ juror_name: "", juror_inst: "" });
  const [addError, setAddError] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ juror_name: "", juror_inst: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importSuccess, setImportSuccess] = useState("");
  const [importError, setImportError] = useState("");
  const [importWarning, setImportWarning] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openSemesterMenuId, setOpenSemesterMenuId] = useState(null);
  const PREVIEW_JUROR_COUNT = 4;

  const isDirty =
    (showAdd && (form.juror_name.trim() !== "" || form.juror_inst.trim() !== "")) ||
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

  const canSubmit = form.juror_name.trim() && form.juror_inst.trim();
  const canEdit = editForm.juror_name.trim() && editForm.juror_inst.trim();
  const isJurorLocked = (j) => {
    const lockedUntil = j.locked_until || j.lockedUntil;
    if (typeof j.is_locked === "boolean") return j.is_locked;
    if (typeof j.is_locked === "string") {
      return j.is_locked.toLowerCase() === "true" || j.is_locked.toLowerCase() === "t";
    }
    if (!lockedUntil) return false;
    const d = new Date(lockedUntil);
    return !Number.isNaN(d.getTime()) && d > new Date();
  };
  const orderedJurors = [...jurors].sort((a, b) => {
    const aLocked = isJurorLocked(a);
    const bLocked = isJurorLocked(b);
    if (aLocked !== bLocked) return Number(bLocked) - Number(aLocked);
    const aName = (a.juryName || a.juror_name || "").toLowerCase();
    const bName = (b.juryName || b.juror_name || "").toLowerCase();
    return aName.localeCompare(bName);
  });
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredJurors = normalizedSearch
    ? orderedJurors.filter((j) => {
      const name = j.juryName || j.juror_name || "";
      const inst = j.juryDept || j.juror_inst || "";
      const scoredSemesters = getScoredSemesters(j);
      const semestersText = scoredSemesters.join(" ");
      const semestersLabel = scoredSemesters.join(" · ");
      const semestersSearch = scoredSemesters.map((s) => buildSemesterSearchText(s)).join(" ");
      const lastActivity =
        j.lastActivityAt
        || j.last_activity_at
        || j.lastSeenAt
        || j.last_seen_at
        || j.updatedAt
        || j.updated_at
        || "";
      const lastActivitySearch = buildTimestampSearchText(lastActivity);
      const haystack = [
        name,
        inst,
        semestersText,
        semestersLabel,
        semestersSearch,
        lastActivitySearch,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    })
    : orderedJurors;
  const visibleJurors = normalizedSearch
    ? filteredJurors
    : (showAll ? orderedJurors : orderedJurors.slice(0, PREVIEW_JUROR_COUNT));
  const existingJurorKeys = new Set(
    (jurors || []).map((j) =>
      normalizeKey(j.juryName || j.juror_name, j.juryDept || j.juror_inst)
    )
  );

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
  }, [visibleJurors, showAll, searchTerm, isOpen, isMobile]);

  useEffect(() => {
    if (!openSemesterMenuId) return;
    const onPointerDown = (e) => {
      if (!(e.target instanceof Element)) return;
      if (e.target.closest(".manage-semesters-menu")) return;
      setOpenSemesterMenuId(null);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpenSemesterMenuId(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openSemesterMenuId]);

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
    const idxName = header.indexOf("juror_name");
    const idxInst = header.indexOf("juror_inst");
    if (idxName < 0 || idxInst < 0) {
      setImportError("Header row is required and must include: juror_name, juror_inst.");
      return;
    }
    const invalidNameRows = [];
    const invalidInstRows = [];
    const duplicateRows = [];
    const seenKeys = new Set();
    const data = rows.slice(1).map((r, idx) => {
      const name = String(r[idxName] || "").trim();
      const instRaw = idxInst >= 0 ? r.slice(idxInst).join(",") : "";
      const inst = String(instRaw || "").trim();
      return {
        juror_name: name,
        juror_inst: inst,
        _row: idx + 2,
        _key: normalizeKey(name, inst),
      };
    }).filter((r) => {
      let isValid = true;
      if (!r.juror_name) {
        invalidNameRows.push(r._row);
        isValid = false;
      }
      if (!r.juror_inst) {
        invalidInstRows.push(r._row);
        isValid = false;
      }
      if (r._key && seenKeys.has(r._key)) {
        duplicateRows.push(r._row);
        isValid = false;
      }
      if (r._key) {
        seenKeys.add(r._key);
      }
      return isValid;
    });
    if (invalidNameRows.length || invalidInstRows.length || duplicateRows.length) {
      const parts = [];
      if (invalidNameRows.length) {
        parts.push(`Missing juror_name at rows: ${invalidNameRows.slice(0, 6).join(", ")}.`);
      }
      if (invalidInstRows.length) {
        parts.push(`Missing juror_inst at rows: ${invalidInstRows.slice(0, 6).join(", ")}.`);
      }
      if (duplicateRows.length) {
        parts.push(`Duplicate juror rows at: ${duplicateRows.slice(0, 6).join(", ")}.`);
      }
      setImportError(parts.join(" "));
      return;
    }
    if (!data.length) {
      setImportError("No valid rows found in CSV.");
      return;
    }

    const existingKeys = new Set(
      (jurors || []).map((j) => normalizeKey(j.juryName || j.juror_name, j.juryDept || j.juror_inst))
    );
    const skippedExisting = data.filter((r) => existingKeys.has(r._key));
    const toImport = data.filter((r) => !existingKeys.has(r._key));

    const successMsg = toImport.length > 0
      ? `• Import complete: ${toImport.length} added, ${skippedExisting.length} skipped.`
      : "";
    setImportSuccess(successMsg);

    const warningParts = [];
    if (skippedExisting.length) {
      const preview = skippedExisting
        .slice(0, 4)
        .map((r) => `${r.juror_name} / ${r.juror_inst}`)
        .join("; ");
      const more = skippedExisting.length > 4 ? ` (+${skippedExisting.length - 4} more)` : "";
      warningParts.push(`• Skipped existing jurors: ${preview}${more}.`);
    }
    const localWarning = warningParts.join("\n");
    setImportWarning(localWarning);

    if (!toImport.length) {
      return;
    }

    setIsImporting(true);
    let res;
    try {
      res = await onImport?.(toImport.map(({ juror_name, juror_inst }) => ({ juror_name, juror_inst })));
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
      const extra = `• Skipped ${serverSkipped} existing jurors during import.`;
      setImportWarning(localWarning ? `${localWarning}\n${extra}` : extra);
    }
    if (!skippedExisting.length && serverSkipped === 0) setShowImport(false);
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
          <span className="manage-card-icon" aria-hidden="true"><UserCogIcon /></span>
          <span className="section-label">Juror Settings</span>
        </div>
        {isMobile && <ChevronDownIcon className={`settings-chevron${isOpen ? " open" : ""}`} />}
      </button>

      {(!isMobile || isOpen) && (
        <div className="manage-card-body">
          <div className="manage-card-desc">Manage jurors, institution/department details, and PIN resets.</div>
          {panelError && <div className="manage-hint manage-hint-error" role="alert">{panelError}</div>}
          <div className="manage-card-actions">
            <button
              className="manage-btn"
              type="button"
              onClick={() => {
                setImportError("");
                setImportWarning("");
                setImportSuccess("");
                setAddError("");
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
                setShowAdd(true);
              }}
            >
              <span aria-hidden="true"><CirclePlusIcon className="manage-btn-icon" /></span>
              Juror
            </button>
          </div>

          <div className="manage-list">
            <div className="manage-search">
              <span className="manage-search-icon" aria-hidden="true"><SearchIcon /></span>
              <input
                className="manage-input manage-search-input"
                type="text"
                placeholder="Search jurors"
                aria-label="Search jurors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {isMobile && (
              <div className="manage-hint manage-hint-inline">Swipe horizontally on text to view full content.</div>
            )}
            {visibleJurors.map((j) => {
              const isLocked = isJurorLocked(j);
              const scoredSemesters = getScoredSemesters(j);
              const completedCount = scoredSemesters.length;
              const jurorId = j.jurorId || j.juror_id;
              const isSemesterMenuOpen = openSemesterMenuId === jurorId;
              const hasScoredSemester = completedCount > 0;
              const completedLabel = `${completedCount} semester${completedCount === 1 ? "" : "s"}`;
              const lastActivityAt =
                j.lastActivityAt
                || j.last_activity_at
                || j.lastSeenAt
                || j.last_seen_at
                || j.updatedAt
                || j.updated_at
                || "";
              return (
                <div
                  key={jurorId}
                  className={`manage-item manage-item--juror${isLocked ? " is-pin-locked" : ""}`}
                >
                  <div className="manage-item-main--juror">
                    <div className="manage-item-title">
                      <span className="manage-item-juror-name">
                        <span className="manage-item-icon" aria-hidden="true">
                          <UserCheckIcon />
                        </span>
                        <span className="manage-item-text manage-meta-scroll" onScroll={handleMetaScroll}>
                          {j.juryName || j.juror_name}
                        </span>
                      </span>
                    </div>
                    <div className="manage-item-sub manage-item-juror-inst">
                      <span className="manage-item-icon" aria-hidden="true">
                        <LandmarkIcon />
                      </span>
                      <span className="manage-item-text manage-meta-scroll" onScroll={handleMetaScroll}>
                        {j.juryDept || j.juror_inst}
                      </span>
                    </div>
                    <div className="manage-item-sub manage-meta-line manage-meta-line--juror-completed">
                      <span className="manage-meta-icon" aria-hidden="true">
                        <CalendarCheckIcon />
                      </span>
                      <div className="manage-semesters-menu">
                        <button
                          type="button"
                          className="manage-completed-summary"
                          aria-haspopup="dialog"
                          aria-expanded={isSemesterMenuOpen}
                          aria-label={isSemesterMenuOpen
                            ? "Hide completed semesters"
                            : "Show completed semesters"}
                          onClick={() => setOpenSemesterMenuId((prev) => (prev === jurorId ? null : jurorId))}
                        >
                          {completedLabel}
                        </button>
                        {isSemesterMenuOpen && (
                          <div className="manage-semesters-dropdown manage-semesters-dropdown--list" role="dialog" aria-label="Completed semesters">
                            <div className="manage-semesters-dropdown-title">
                              Completed semesters
                            </div>
                            {hasScoredSemester ? (
                              scoredSemesters.map((s, idx) => (
                                <div key={`${jurorId}-all-sem-${idx}`} className="manage-semester-row">
                                  {s}
                                </div>
                              ))
                            ) : (
                              <div className="manage-semester-row manage-semester-row--empty">No completed semesters yet.</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {isLocked && (
                    <span className="manage-pin-lock-chip" aria-label="PIN Locked">
                      <span className="manage-pin-lock-chip-icon" aria-hidden="true">
                        <LockIcon />
                      </span>
                      <span className="manage-pin-lock-chip-text">PIN Locked</span>
                    </span>
                  )}
                  <div className="manage-item-footer manage-item-footer--juror">
                    {lastActivityAt ? (
                      <div className="manage-item-sub manage-meta-line manage-meta-line--juror-last">
                        <LastActivity value={lastActivityAt} />
                      </div>
                    ) : (
                      <span />
                    )}
                    <div className="manage-item-actions-row manage-item-actions-row--juror-actions">
                      <button
                        className={`manage-icon-btn${isLocked ? " is-warning" : ""}`}
                        type="button"
                        title={isLocked ? "Reset PIN" : "Set or reset PIN"}
                        aria-label={`Reset PIN for ${j.juryName || j.juror_name}`}
                        onClick={() => {
                          onResetPin?.({
                            jurorId: j.jurorId || j.juror_id,
                            juror_name: j.juryName || j.juror_name || "",
                            juror_inst: j.juryDept || j.juror_inst || "",
                          });
                        }}
                      >
                        <KeyRoundIcon />
                      </button>
                      <button
                        className="manage-icon-btn"
                        type="button"
                        title="Edit juror"
                        aria-label={`Edit ${j.juryName || j.juror_name}`}
                        onClick={() => {
                          setEditTarget(j);
                          setEditForm({
                            juror_name: j.juryName || j.juror_name || "",
                            juror_inst: j.juryDept || j.juror_inst || "",
                          });
                          setShowEdit(true);
                        }}
                      >
                        <PencilIcon />
                      </button>
                      <DangerIconButton
                        ariaLabel={`Delete ${j.juryName || j.juror_name}`}
                        title="Delete juror"
                        showLabel={false}
                        onClick={() => onDeleteJuror?.(j)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {!normalizedSearch && jurors.length === 0 && (
              <div className="manage-empty">No jurors found.</div>
            )}
            {normalizedSearch && filteredJurors.length === 0 && (
              <div className="manage-empty manage-empty-search">No results.</div>
            )}
          </div>

          {!normalizedSearch && jurors.length > PREVIEW_JUROR_COUNT && (
            <button
              className="manage-btn ghost"
              type="button"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Show fewer jurors" : `Show all jurors (${jurors.length})`}
            </button>
          )}

          {showAdd && (
            <div className="manage-modal">
              <div className="manage-modal-card">
                <div className="edit-dialog__header">
                  <span className="edit-dialog__icon" aria-hidden="true">
                    <CirclePlusIcon />
                  </span>
                  <div className="edit-dialog__title">Create Juror</div>
                </div>
                <div className="manage-modal-body">
                  <div className="manage-field">
                    <label className="manage-label">Full name</label>
                    <input
                      className={`manage-input${addError ? " is-danger" : ""}`}
                      value={form.juror_name}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, juror_name: e.target.value }));
                        if (addError) setAddError("");
                      }}
                      placeholder="Dr. Andrew Collins"
                    />
                  </div>
                  <div className="manage-field">
                    <label className="manage-label">Institution / Department</label>
                    <input
                      className={`manage-input${addError ? " is-danger" : ""}`}
                      value={form.juror_inst}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, juror_inst: e.target.value }));
                        if (addError) setAddError("");
                      }}
                      placeholder="Middle East Technical University / Electrical Engineering"
                    />
                  </div>
                  {addError && <div className="manage-field-error">{addError}</div>}
                </div>
                <div className="manage-modal-actions">
                  <button className="manage-btn" type="button" onClick={() => setShowAdd(false)}>
                    Cancel
                  </button>
                  <button
                    className="manage-btn primary"
                    type="button"
                    disabled={!canSubmit}
                    onClick={async () => {
                      const name = form.juror_name.trim();
                      const inst = form.juror_inst.trim();
                      const key = normalizeKey(name, inst);
                      if (existingJurorKeys.has(key)) {
                        setAddError("A juror with the same name and institution/department already exists.");
                        return;
                      }
                      const res = await onAddJuror({
                        juror_name: name,
                        juror_inst: inst,
                      });
                      if (res?.fieldErrors?.duplicate) {
                        setAddError(res.fieldErrors.duplicate);
                        return;
                      }
                      setShowAdd(false);
                      if (res?.ok === false) return;
                      setForm({ juror_name: "", juror_inst: "" });
                      setAddError("");
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
                  <div className="edit-dialog__title">Edit Juror</div>
                </div>
                <div className="manage-modal-body">
                  <label className="manage-label">Full name</label>
                  <input
                    className="manage-input"
                    value={editForm.juror_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, juror_name: e.target.value }))}
                  />
                  <label className="manage-label">Institution / Department</label>
                  <input
                    className="manage-input"
                    value={editForm.juror_inst}
                    onChange={(e) => setEditForm((f) => ({ ...f, juror_inst: e.target.value }))}
                  />
                </div>
                <div className="manage-modal-actions">
                  <button
                    className="manage-btn"
                    type="button"
                    onClick={() => {
                      setShowEdit(false);
                      setEditTarget(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="manage-btn primary"
                    type="button"
                    disabled={!canEdit || editSaving}
                    onClick={async () => {
                      setEditSaving(true);
                      await onEditJuror?.({
                        jurorId: editTarget?.jurorId || editTarget?.juror_id,
                        juror_name: editForm.juror_name.trim(),
                        juror_inst: editForm.juror_inst.trim(),
                      });
                      setEditSaving(false);
                      setShowEdit(false);
                      setEditTarget(null);
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
              <div className="manage-modal-card manage-modal-card--import-juror-csv">
                <div className="edit-dialog__header">
                  <span className="edit-dialog__icon" aria-hidden="true">
                    <FileUpIcon />
                  </span>
                  <div className="edit-dialog__title">Import CSV</div>
                </div>
                <div className="manage-import-context-line">
                  Jurors will be added to the global juror pool.
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
                    <button className="manage-btn manage-btn--import-juror-select" type="button">
                      Select CSV File
                    </button>
                    <div className="manage-dropzone-sub">Only .csv files supported</div>
                    <div className="manage-dropzone-sub manage-dropzone-sub--muted">Max file size: 2MB</div>
                  </div>
                  {importError && (
                    <div className="manage-import-feedback manage-import-feedback--error" role="alert">
                      {renderImportMessage(importError)}
                    </div>
                  )}
                  {importSuccess && !importError && (
                    <div className="manage-import-feedback manage-import-feedback--success" role="status">
                      {renderImportMessage(importSuccess)}
                    </div>
                  )}
                  {importWarning && !importError && (
                    <div className="manage-import-feedback manage-import-feedback--warn" role="status">
                      {renderImportMessage(importWarning)}
                    </div>
                  )}
                  <details className="manage-collapsible">
                    <summary className="manage-collapsible-summary">
                      <span>CSV example</span>
                      <ChevronDownIcon className="manage-collapsible-chevron" aria-hidden="true" />
                    </summary>
                    <div className="manage-collapsible-content">
                      <div className="manage-code">juror_name,juror_inst</div>
                      <div className="manage-code">Ava Johnson,Harvard University / Applied Physics</div>
                      <div className="manage-code">Ayse Demir,Middle East Technical University / Electrical Engineering</div>
                      <div className="manage-code">Kerem Yildiz,TED University / Electrical and Electronics Engineering</div>
                    </div>
                  </details>
                  <details className="manage-collapsible">
                    <summary className="manage-collapsible-summary">
                      <span>Rules</span>
                      <ChevronDownIcon className="manage-collapsible-chevron" aria-hidden="true" />
                    </summary>
                    <div className="manage-collapsible-content">
                      <ul className="manage-hint-list manage-rules-list">
                        <li>Header row is required with exact field names: <span className="manage-code-inline">juror_name</span>, <span className="manage-code-inline">juror_inst</span>.</li>
                        <li><span className="manage-code-inline">juror_name</span> and <span className="manage-code-inline">juror_inst</span> cannot be empty.</li>
                        <li>One row must represent one juror.</li>
                        <li>Existing jurors with the same name and institution / department are skipped during import.</li>
                      </ul>
                    </div>
                  </details>
                </div>
                <div className="manage-modal-actions">
                  <button className="manage-btn manage-btn--import-juror-cancel" type="button" onClick={() => setShowImport(false)} disabled={isImporting}>
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
