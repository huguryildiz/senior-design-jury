// src/admin/modals/ImportJurorsModal.jsx
// Unified import modal: drag-and-drop file selection + CSV preview + confirm.
//
// Props:
//   open       — boolean
//   onClose    — () => void
//   parseFile  — async (file: File) => { file, rows, stats, warningMessage }
//   onImport   — async (rows) => void   (receives valid rows)

import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle, Info, Icon } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

const STATUS_LABELS = { ok: "Valid", skip: "Duplicate", err: "Error" };

export default function ImportJurorsModal({ open, onClose, parseFile, onImport }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);

  const [file, setFile]               = useState(null);
  const [rows, setRows]               = useState([]);
  const [stats, setStats]             = useState({ valid: 0, duplicate: 0, error: 0, total: 0 });
  const [detectedColumns, setDetected] = useState([]);
  const [warningMessage, setWarning]  = useState(null);

  const [importing, setImporting]     = useState(false);
  const [importError, setImportError] = useState("");
  const [phase, setPhase]             = useState("preview"); // "preview" | "result"
  const [resultData, setResult]       = useState(null);      // { imported, skipped, failed }

  const handleClose = () => {
    setFile(null); setRows([]); setStats({ valid: 0, duplicate: 0, error: 0, total: 0 });
    setDetected([]); setWarning(null); setImportError(""); setParsing(false); setImporting(false);
    setPhase("preview"); setResult(null);
    onClose();
  };

  const handleFile = useCallback(async (f) => {
    if (!f || parsing) return;
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setImportError(`"${f.name}" is not a CSV file. Please upload a .csv file.`);
      return;
    }
    setParsing(true);
    setImportError("");
    try {
      const parsed = await parseFile(f);
      setFile(parsed.file);
      setRows(parsed.rows);
      setStats(parsed.stats);
      setDetected(parsed.detectedColumns ?? []);
      setWarning(parsed.warningMessage);
    } catch {
      setImportError("Could not parse file. Make sure it is a valid CSV.");
    } finally {
      setParsing(false);
    }
  }, [parseFile, parsing]);

  function onInputChange(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    handleFile(f);
  }

  function onDragOver(e)  { e.preventDefault(); setDragging(true); }
  function onDragLeave(e) { e.preventDefault(); setDragging(false); }
  function onDrop(e)      { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }

  const handleImport = async () => {
    setImporting(true);
    setImportError("");
    try {
      const result = await onImport?.(rows.filter((r) => r.status === "ok"));
      setResult({
        imported: result?.imported ?? validCount,
        skipped:  (result?.skipped ?? 0) + (stats.duplicate ?? 0),
        failed:   result?.failed ?? 0,
      });
      setPhase("result");
    } catch (e) {
      setImportError(e?.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const validCount = stats.valid ?? 0;
  const totalCount = stats.total ?? rows.length;

  return (
    <Modal open={open} onClose={handleClose} size="xl">
      {/* Header */}
      <div className="fs-modal-header">
        <div className="fs-modal-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="fs-icon accent">
              <Icon
                iconNode={[]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </Icon>
            </div>
            <div className="fs-title-group">
              <div className="fs-title">Import Jurors</div>
              <div className="fs-subtitle">Upload a CSV with juror names and affiliations.</div>
            </div>
          </div>
          <button className="fs-close" type="button" onClick={handleClose} aria-label="Close">
            <Icon
              iconNode={[]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </Icon>
          </button>
        </div>
      </div>
      {phase === "preview" ? (
        <>
          <div className="fs-modal-body">
            {importError && (
              <div className="fs-alert danger" style={{ marginBottom: 12 }}>
                <div className="fs-alert-icon"><AlertCircle size={15} /></div>
                <div className="fs-alert-body">{importError}</div>
              </div>
            )}

            {/* Drop zone — shown when no file selected */}
            {!file && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => !parsing && inputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                style={{
                  border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "var(--radius)",
                  padding: "36px 20px",
                  textAlign: "center",
                  cursor: parsing ? "default" : "pointer",
                  background: dragging ? "rgba(59,130,246,0.05)" : "var(--surface-1)",
                  transition: "border-color .15s, background .15s",
                  userSelect: "none",
                  marginBottom: 0,
                }}
              >
                <div style={{
                  width: 46, height: 46, borderRadius: "50%",
                  background: dragging ? "rgba(59,130,246,0.12)" : "var(--bg-card)",
                  border: "1px solid var(--border)",
                  display: "grid", placeItems: "center",
                  margin: "0 auto 12px",
                  transition: "background .15s",
                }}>
                  <Icon
                    iconNode={[]}
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={dragging ? "var(--accent)" : "var(--text-tertiary)"}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transition: "stroke .15s" }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </Icon>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                  {parsing ? "Parsing…" : dragging ? "Release to upload" : "Drop CSV file here"}
                </div>
                {!parsing && (
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    or{" "}
                    <span style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}
                      onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                      browse files
                    </span>
                  </div>
                )}
                <div style={{
                  marginTop: 14, padding: "8px 12px",
                  background: "var(--bg-card)", borderRadius: "var(--radius-sm)",
                  display: "inline-block", fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6,
                }}>
                  <strong>Format:</strong> Name, Affiliation
                  <br />
                  <strong>Example:</strong> Prof. Dr. Hasan Göktaş, TED University / EE
                </div>
              </div>
            )}

            {/* File info row — shown after file selected */}
            {file && (
              <div className="fs-upload-file" style={{ marginBottom: 14 }}>
                <div className="fs-upload-file-icon">
                  <Icon
                    iconNode={[]}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                  </Icon>
                </div>
                <div className="fs-upload-file-info">
                  <div className="fs-upload-file-name">{file.name}</div>
                  <div className="fs-upload-file-meta">
                    {file.sizeLabel} · {totalCount} rows detected ·{" "}
                    <span
                      style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}
                      onClick={() => inputRef.current?.click()}
                    >
                      Replace file
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Preview — shown after file selected */}
            {file && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)" }}>Preview</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {stats.valid > 0    && <span className="fs-badge green">{stats.valid} valid</span>}
                    {stats.duplicate > 0 && <span className="fs-badge amber">{stats.duplicate} duplicate</span>}
                    {stats.error > 0    && <span className="fs-badge red">{stats.error} error</span>}
                  </div>
                </div>

                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                  <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table className="fs-preview-table">
                      <thead>
                        <tr>
                          <th style={{ width: 36 }}>Row</th>
                          <th>Name</th>
                          <th>Affiliation</th>
                          <th style={{ width: 76 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.rowNum} className={row.status === "skip" ? "row-skip" : row.status === "err" ? "row-error" : undefined}>
                            <td style={{ fontFamily: "var(--mono)", color: "var(--text-tertiary)", fontSize: 10 }}>{row.rowNum}</td>
                            <td>{row.name ?? "—"}</td>
                            <td style={{ color: row.status === "ok" ? "var(--text-secondary)" : undefined }}>{row.affiliation}</td>
                            <td>
                              <span className={`row-status ${row.status}`}>
                                {row.statusLabel || STATUS_LABELS[row.status] || row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length < totalCount && (
                    <div style={{
                      padding: "6px 10px", background: "var(--surface-1)",
                      fontSize: 10, color: "var(--text-tertiary)", borderTop: "1px solid var(--border)",
                    }}>
                      Showing {rows.length} of {totalCount} rows
                    </div>
                  )}
                </div>

              </>
            )}
          </div>

          <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={onInputChange} />

          <div className="fs-modal-footer">
            {file
              ? <div className="fs-footer-meta">{validCount} of {totalCount} jurors ready</div>
              : <div className="fs-footer-meta" />
            }
            <button className="fs-btn fs-btn-secondary" type="button" onClick={handleClose} disabled={importing}>
              Cancel
            </button>
            <button
              type="button"
              className="fs-btn fs-btn-primary"
              onClick={handleImport}
              disabled={importing || !file || validCount === 0}
            >
              <span className="btn-loading-content">
                <AsyncButtonContent loading={importing} loadingText="Importing…">
                  {file ? `Import ${validCount} Juror${validCount !== 1 ? "s" : ""}` : "Import Jurors"}
                </AsyncButtonContent>
              </span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="fs-modal-body" style={{ textAlign: "center", paddingTop: 8 }}>
            <div className="fs-modal-icon success" style={{ margin: "0 auto 10px" }}>
              <CheckCircle size={20} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              Import Complete
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 2 }}>
              {resultData.imported} juror{resultData.imported !== 1 ? "s" : ""} added.
            </div>
            <div className="fs-impact">
              <div className="fs-impact-item">
                <div className="fs-impact-value" style={{ color: "var(--success)" }}>{resultData.imported}</div>
                <div className="fs-impact-label">Imported</div>
              </div>
              <div className="fs-impact-item">
                <div className="fs-impact-value" style={{ color: "var(--warning)" }}>{resultData.skipped}</div>
                <div className="fs-impact-label">Skipped</div>
              </div>
              <div className="fs-impact-item">
                <div className="fs-impact-value" style={{ color: "var(--danger)" }}>{resultData.failed}</div>
                <div className="fs-impact-label">Failed</div>
              </div>
            </div>
            {(resultData.skipped > 0 || resultData.failed > 0) && (
              <div className="fs-alert info" style={{ marginTop: 12, textAlign: "left" }}>
                <div className="fs-alert-icon"><Info size={15} /></div>
                <div className="fs-alert-body">
                  <div className="fs-alert-title">What to do next</div>
                  <div className="fs-alert-desc">
                    Skipped rows already exist for this period. Fix any failed rows manually or re-import a corrected CSV.
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="fs-modal-footer" style={{ justifyContent: "center", borderTop: "none", background: "transparent", paddingTop: 0 }}>
            <button className="fs-btn fs-btn-primary" style={{ minWidth: 140 }} onClick={handleClose}>
              Done
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
