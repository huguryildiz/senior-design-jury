// src/admin/modals/UploadCsvModal.jsx
// Drag-and-drop CSV upload modal — shown before the preview dialog.
//
// Props:
//   open     — boolean
//   onClose  — () => void
//   variant  — "jurors" | "projects"
//   onFile   — async (file: File) => void

import { useCallback, useRef, useState } from "react";
import Modal from "@/shared/ui/Modal";

const VARIANTS = {
  jurors: {
    title: "Import Jurors",
    hint: (
      <>
        <strong>Expected columns:</strong> Name, Affiliation
        <br />
        <strong>Example:</strong> Prof. Dr. Hasan Göktaş, TED University / EE
      </>
    ),
  },
  projects: {
    title: "Import Projects",
    hint: (
      <>
        <strong>Expected columns:</strong> Group, Title, Team Members
        <br />
        <strong>Example:</strong> G01, Smart Grid Monitor, Ali Yıldız; Zeynep Kaya
      </>
    ),
  },
};

export default function UploadCsvModal({ open, onClose, variant = "jurors", onFile }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const v = VARIANTS[variant] ?? VARIANTS.jurors;

  const handleFile = useCallback(async (file) => {
    if (!file || busy) return;
    setBusy(true);
    try { await onFile?.(file); }
    finally { setBusy(false); }
  }, [onFile, busy]);

  function onInputChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    handleFile(file);
  }

  function onDragOver(e) { e.preventDefault(); setDragging(true); }
  function onDragLeave(e) { e.preventDefault(); setDragging(false); }
  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div style={{ padding: "20px 20px 16px" }}>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{v.title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-tertiary)", padding: 4, borderRadius: 6,
              display: "grid", placeItems: "center",
            }}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => !busy && inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "var(--radius)",
            padding: "32px 20px",
            textAlign: "center",
            cursor: busy ? "default" : "pointer",
            background: dragging ? "rgba(59,130,246,0.05)" : "var(--surface-1)",
            transition: "border-color .15s, background .15s",
            userSelect: "none",
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: dragging ? "rgba(59,130,246,0.12)" : "var(--bg-card)",
            border: "1px solid var(--border)",
            display: "grid", placeItems: "center",
            margin: "0 auto 10px",
            transition: "background .15s",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke={dragging ? "var(--accent)" : "var(--text-tertiary)"}
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: "stroke .15s" }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>
            {busy ? "Parsing…" : dragging ? "Release to upload" : "Drop CSV file here"}
          </div>
          {!busy && (
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              or{" "}
              <span
                style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              >
                browse files
              </span>
            </div>
          )}
        </div>

        <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={onInputChange} />

        {/* Hint */}
        <div style={{
          marginTop: 10,
          padding: "9px 12px",
          background: "var(--surface-1)",
          borderRadius: "var(--radius-sm)",
          fontSize: 11,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}>
          {v.hint}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              padding: "6px 14px", fontSize: 12, fontWeight: 500,
              background: "none", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", cursor: "pointer",
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
        </div>

      </div>
    </Modal>
  );
}
