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
import { cn } from "@/lib/utils";

function normalizeKey(name, inst) {
  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  return `${norm(name)}|${norm(inst)}`;
}

function renderImportMessage(text) {
  return <span className="inline">{String(text || "")}</span>;
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
    <div ref={panelRef} className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <div className="flex items-center gap-2 text-base font-semibold">
          <span className="size-5 text-muted-foreground" aria-hidden="true"><UserCogIcon /></span>
          <span>Juror Settings</span>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="text-sm text-muted-foreground mb-3">Manage jurors, evaluation status, edit permissions, and PIN resets.</div>
        {panelError && <AlertCard variant="error">{panelError}</AlertCard>}
        <div className="flex flex-wrap gap-2.5">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            type="button"
            onClick={() => {
              setImportError("");
              setImportWarning("");
              setImportSuccess("");
              setAddError("");
              setShowImport(true);
            }}
          >
            <span aria-hidden="true"><UploadIcon className="size-4" /></span>
            Import CSV
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            type="button"
            onClick={() => {
              setAddError("");
              setShowAdd(true);
            }}
          >
            <span aria-hidden="true"><CirclePlusIcon className="size-4" /></span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-lg border bg-card shadow-lg">
              <div className="flex items-center gap-3 border-b px-6 py-4">
                <span className="text-muted-foreground" aria-hidden="true">
                  <CirclePlusIcon />
                </span>
                <div className="text-base font-semibold">Create Juror</div>
              </div>
              <div className="flex flex-col gap-3 px-6 py-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Full name</label>
                  <input
                    className={cn(
                      "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring",
                      addError && "border-destructive"
                    )}
                    value={form.juror_name}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, juror_name: e.target.value }));
                      if (addError) setAddError("");
                    }}
                    placeholder="Dr. Andrew Collins"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Affiliation</label>
                  <input
                    className={cn(
                      "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring",
                      addError && "border-destructive"
                    )}
                    value={form.juror_inst}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, juror_inst: e.target.value }));
                      if (addError) setAddError("");
                    }}
                    placeholder="Middle East Technical University / Electrical Engineering"
                  />
                </div>
                {addError && <div className="text-sm text-destructive">{addError}</div>}
              </div>
              <div className="flex justify-end gap-3 border-t px-6 py-4">
                <button className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50" type="button" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-lg border bg-card shadow-lg">
              <div className="flex items-center gap-3 border-b px-6 py-4">
                <span className="text-muted-foreground" aria-hidden="true">
                  <PencilIcon />
                </span>
                <div className="text-base font-semibold">Edit Juror</div>
              </div>
              <div className="flex flex-col gap-3 px-6 py-4">
                <label className="text-sm font-medium">Full name</label>
                <input
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
                  value={editForm.juror_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, juror_name: e.target.value }))}
                />
                <label className="text-sm font-medium">Affiliation</label>
                <input
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
                  value={editForm.juror_inst}
                  onChange={(e) => setEditForm((f) => ({ ...f, juror_inst: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-3 border-t px-6 py-4">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                  type="button"
                  onClick={() => {
                    setShowEdit(false);
                    setEditTarget(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
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
                  {editSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showImport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-lg border bg-card shadow-lg">
              <div className="flex items-center gap-3 border-b px-6 py-4">
                <span className="text-muted-foreground" aria-hidden="true">
                  <FileUpIcon />
                </span>
                <div className="text-base font-semibold">Import CSV</div>
              </div>
              <div className="block text-xs leading-snug text-muted-foreground px-6 pt-2">
                Jurors will be added to the global juror pool.
              </div>
              <div className="flex flex-col gap-3 px-6 py-4">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/40 p-5 text-center",
                    isDragging && "border-primary bg-primary/5",
                    importError && "border-destructive bg-destructive/5"
                  )}
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
                  <div className="text-muted-foreground" aria-hidden="true"><CloudUploadIcon className="size-6" /></div>
                  <div className="font-bold text-foreground">Drag & Drop your CSV here</div>
                  <button className="inline-flex items-center justify-center gap-2 rounded-md bg-primary/10 border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20" type="button">
                    Select CSV File
                  </button>
                  <div className="text-xs text-muted-foreground">Only .csv files supported</div>
                  <div className="text-xs text-muted-foreground/60">Max file size: 2MB</div>
                </div>
                {importError && (
                  <AlertCard variant="error">
                    {renderImportMessage(importError)}
                  </AlertCard>
                )}
                {importSuccess && !importError && (
                  <AlertCard variant="success">
                    {renderImportMessage(importSuccess)}
                  </AlertCard>
                )}
                {importWarning && !importError && (
                  <AlertCard variant="warning">
                    {renderImportMessage(importWarning)}
                  </AlertCard>
                )}
                <details className="rounded-lg border bg-card">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden [&::marker]:content-['']">
                    <span>CSV example</span>
                    <ChevronDownIcon className="size-3.5 text-muted-foreground/60 transition-transform duration-200 [[open]>&]:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="flex flex-col gap-1.5 px-3 pb-3">
                    <div className="font-mono text-xs font-medium text-slate-600 whitespace-nowrap">juror_name,juror_inst</div>
                    <div className="font-mono text-xs font-medium text-slate-600 whitespace-nowrap">Ava Johnson,Harvard University / Applied Physics</div>
                    <div className="font-mono text-xs font-medium text-slate-600 whitespace-nowrap">Ayse Demir,Middle East Technical University / Electrical Engineering</div>
                    <div className="font-mono text-xs font-medium text-slate-600 whitespace-nowrap">Kerem Yildiz,TED University / Electrical and Electronics Engineering</div>
                  </div>
                </details>
                <details className="rounded-lg border bg-card">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden [&::marker]:content-['']">
                    <span>Rules</span>
                    <ChevronDownIcon className="size-3.5 text-muted-foreground/60 transition-transform duration-200 [[open]>&]:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="flex flex-col gap-1.5 px-3 pb-3">
                    <ul className="m-0 list-disc pl-4 text-xs leading-relaxed text-muted-foreground">
                      <li>Header row is required with exact field names: <span className="font-mono text-[0.9em] rounded-md border border-border bg-muted/50 px-1 text-foreground whitespace-nowrap">juror_name</span>, <span className="font-mono text-[0.9em] rounded-md border border-border bg-muted/50 px-1 text-foreground whitespace-nowrap">juror_inst</span>.</li>
                      <li><span className="font-mono text-[0.9em] rounded-md border border-border bg-muted/50 px-1 text-foreground whitespace-nowrap">juror_name</span> and <span className="font-mono text-[0.9em] rounded-md border border-border bg-muted/50 px-1 text-foreground whitespace-nowrap">juror_inst</span> cannot be empty.</li>
                      <li>One row must represent one juror.</li>
                      <li>Existing jurors with the same name and institution / department are skipped during import.</li>
                    </ul>
                  </div>
                </details>
              </div>
              <div className="flex justify-end gap-3 border-t px-6 py-4">
                <button className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50" type="button" onClick={() => setShowImport(false)} disabled={isImporting}>
                  {isImporting ? "Importing..." : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
