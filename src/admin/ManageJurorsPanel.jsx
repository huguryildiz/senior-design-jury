// src/admin/ManageJurorsPanel.jsx

import { useEffect, useRef, useState } from "react";
import {
  ChevronDownIcon,
  UploadIcon,
  FileUpIcon,
  CloudUploadIcon,
  UserCogIcon,
  CirclePlusIcon,
  PencilIcon,
} from "../shared/Icons";
import { parseCsv } from "./utils";
import AlertCard from "../shared/AlertCard";
import JurorsTable from "./jurors/JurorsTable";

function normalizeKey(name, inst) {
  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  return `${norm(name)}|${norm(inst)}`;
}

function renderImportMessage(text) {
  return <span className="manage-import-msg">{String(text || "")}</span>;
}

export default function ManageJurorsPanel({
  jurors,
  semesterList = [],
  panelError = "",
  isDemoMode = false,
  isMobile,
  isOpen,
  onToggle,
  onDirtyChange,
  onImport,
  onAddJuror,
  onEditJuror,
  onResetPin,
  onDeleteJuror,
  // Permissions props (merged from ManagePermissionsPanel)
  settings,
  currentSemesterId,
  currentSemesterName,
  onToggleEdit,
  onForceCloseEdit,
}) {
  const panelRef = useRef(null);
  const fileRef = useRef(null);
  const [showAdd, setShowAdd] = useState(false);
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
  const [pendingEdits, setPendingEdits] = useState(() => new Set());

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

  // ── Permission helpers ──
  const toBool = (v) => v === true || v === "true" || v === "t" || v === 1;
  const evalLockActive = toBool(settings?.evalLockActive);
  const hasActiveSemester = !!currentSemesterId;

  const handleToggleEditWithPending = async ({ jurorId, enabled }) => {
    if (!jurorId || pendingEdits.has(jurorId)) return;
    const start = Date.now();
    setPendingEdits((prev) => { const next = new Set(prev); next.add(jurorId); return next; });
    try {
      await Promise.resolve(onToggleEdit?.({ jurorId, enabled }));
    } finally {
      const remaining = Math.max(0, 1200 - (Date.now() - start));
      setTimeout(() => setPendingEdits((prev) => { const next = new Set(prev); next.delete(jurorId); return next; }), remaining);
    }
  };
  const handleForceCloseEditWithPending = async ({ jurorId }) => {
    if (!jurorId || pendingEdits.has(jurorId)) return;
    const start = Date.now();
    setPendingEdits((prev) => { const next = new Set(prev); next.add(jurorId); return next; });
    try {
      await Promise.resolve(onForceCloseEdit?.({ jurorId }));
    } finally {
      const remaining = Math.max(0, 1200 - (Date.now() - start));
      setTimeout(() => setPendingEdits((prev) => { const next = new Set(prev); next.delete(jurorId); return next; }), remaining);
    }
  };

  const canSubmit = form.juror_name.trim() && form.juror_inst.trim();
  const canEdit = editForm.juror_name.trim() && editForm.juror_inst.trim();
  const existingJurorKeys = new Set(
    (jurors || []).map((j) =>
      normalizeKey(j.juryName || j.juror_name, j.juryDept || j.juror_inst)
    )
  );

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
        <ChevronDownIcon className={`settings-chevron${isOpen ? " open" : ""}`} />
      </button>

      {(!isMobile || isOpen) && (
        <div className="manage-card-body">
          <div className="manage-card-desc">Manage jurors, evaluation status, edit permissions, and PIN resets.</div>
          {panelError && <AlertCard variant="error">{panelError}</AlertCard>}
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

          <JurorsTable
            jurors={jurors}
            isDemoMode={isDemoMode}
            evalLockActive={evalLockActive}
            hasActiveSemester={hasActiveSemester}
            pendingEdits={pendingEdits}
            onEdit={({ jurorId, juror_name, juror_inst }) => {
              setEditTarget({ jurorId, juror_name, juror_inst });
              setEditForm({ juror_name, juror_inst });
              setShowEdit(true);
            }}
            onDelete={(j) => onDeleteJuror?.(j)}
            onResetPin={(j) => onResetPin?.(j)}
            onToggleEdit={handleToggleEditWithPending}
            onForceCloseEdit={handleForceCloseEditWithPending}
          />

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
                    disabled={!canSubmit || isDemoMode}
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
                    disabled={!canEdit || editSaving || isDemoMode}
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
                    <AlertCard variant="error" className="manage-import-feedback">
                      {renderImportMessage(importError)}
                    </AlertCard>
                  )}
                  {importSuccess && !importError && (
                    <AlertCard variant="success" className="manage-import-feedback">
                      {renderImportMessage(importSuccess)}
                    </AlertCard>
                  )}
                  {importWarning && !importError && (
                    <AlertCard variant="warning" className="manage-import-feedback">
                      {renderImportMessage(importWarning)}
                    </AlertCard>
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
