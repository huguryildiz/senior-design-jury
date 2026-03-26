// src/admin/settings/ExportBackupPanel.jsx
import {
  ChevronDownIcon,
  CircleXLucideIcon,
  CloudUploadIcon,
  DatabaseBackupIcon,
  DownloadIcon,
  FileDownIcon,
  FileUpIcon,
  TriangleAlertIcon,
  UploadIcon,
  InfoIcon,
} from "../../shared/Icons";
import AlertCard from "../../shared/AlertCard";

const SAMPLE_DB_BACKUP_JSON = `{
  "schema_version": 1,
  "semesters": [{ "...": "..." }],
  "jurors": [{ "...": "..." }],
  "projects": [{ "...": "..." }],
  "scores": [{ "...": "..." }],
  "juror_semester_auth": [{ "...": "..." }]
}`;

export default function ExportBackupPanel({
  isMobile,
  openPanels,
  dbBackupMode,
  dbBackupLoading,
  dbBackupConfirmText,
  dbBackupError,
  dbImportData,
  dbImportFileName,
  dbImportFileSize,
  dbImportDragging,
  dbImportSuccess,
  dbImportWarning,
  importFileRef,
  onToggleExport,
  onToggleDbBackup,
  onExportScores,
  onExportJurors,
  onExportProjects,
  onDbExportStart,
  onDbImportStart,
  onDbImportFileSelect,
  onSetDbImportDragging,
  onDbImportFile,
  onSetDbBackupError,
  onSetDbBackupConfirmText,
  onCancelBackupDialog,
  onDbExportConfirm,
  onDbImportConfirm,
}) {
  return (
    <>
      <div className={`manage-card${isMobile ? " is-collapsible" : ""}`}>
        <button
          type="button"
          className="manage-card-header"
          onClick={onToggleExport}
          aria-expanded={openPanels.export}
        >
          <div className="manage-card-title">
            <span className="manage-card-icon" aria-hidden="true"><FileDownIcon /></span>
            <span className="section-label">Export Tools</span>
          </div>
          <ChevronDownIcon className={`settings-chevron${openPanels.export ? " open" : ""}`} />
        </button>

        {(!isMobile || openPanels.export) && (
          <div className="manage-card-body">
            <div className="manage-card-desc">Download Excel exports for scores, jurors, and groups.</div>
            <div className="manage-export-actions">
              <button className="manage-btn" type="button" onClick={onExportScores}>
                <DownloadIcon /> Scores
              </button>
              <button className="manage-btn" type="button" onClick={onExportJurors}>
                <DownloadIcon /> Jurors
              </button>
              <button className="manage-btn" type="button" onClick={onExportProjects}>
                <DownloadIcon /> Groups
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={`manage-card${isMobile ? " is-collapsible" : ""}`}>
        <button
          type="button"
          className="manage-card-header"
          onClick={onToggleDbBackup}
          aria-expanded={openPanels.dbbackup}
        >
          <div className="manage-card-title">
            <span className="manage-card-icon" aria-hidden="true"><DatabaseBackupIcon /></span>
            <span className="section-label">Database Backup</span>
          </div>
          <ChevronDownIcon className={`settings-chevron${openPanels.dbbackup ? " open" : ""}`} />
        </button>

        {(!isMobile || openPanels.dbbackup) && (
          <div className="manage-card-body">
            <div className="manage-card-desc">
              Export or restore the database for this tenant.
            </div>
            <input
              ref={importFileRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={onDbImportFileSelect}
            />

            <div className="manage-export-actions">
              <button
                className="manage-btn"
                type="button"
                onClick={onDbExportStart}
                disabled={dbBackupLoading}
              >
                <DownloadIcon /> Export JSON
              </button>
              <button
                className="manage-btn"
                type="button"
                onClick={onDbImportStart}
                disabled={dbBackupLoading}
              >
                <UploadIcon /> Import / Restore
              </button>
            </div>
          </div>
        )}
      </div>

      {dbBackupMode && (
        <div className="manage-modal" role="dialog" aria-modal="true">
          <div className={`manage-modal-card${dbBackupMode === "import" ? " manage-modal-card--db-restore" : ""}`}>
            {dbBackupMode === "export" ? (
              <div className="edit-dialog__header">
                <span className="edit-dialog__icon" aria-hidden="true">
                  <FileDownIcon />
                </span>
                <div className="edit-dialog__title">Export Database Backup</div>
              </div>
            ) : (
              <div className="edit-dialog__header">
                <span className="edit-dialog__icon" aria-hidden="true">
                  <FileUpIcon />
                </span>
                <div className="edit-dialog__title">Import / Restore Database</div>
              </div>
            )}
            <div className="manage-modal-body">
              <AlertCard variant="info">
                {dbBackupMode === "export"
                  ? "Export a full backup of semesters, jurors, groups, and scores."
                  : "Upload a backup JSON exported from this portal to restore all data."}
              </AlertCard>
              {dbBackupMode === "import" && (
                <div className="manage-field">
                  <div
                    className={`manage-dropzone${dbImportDragging ? " is-dragging" : ""}`}
                    onDragEnter={(e) => { e.preventDefault(); onSetDbImportDragging(true); }}
                    onDragOver={(e) => { e.preventDefault(); onSetDbImportDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); onSetDbImportDragging(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      onSetDbImportDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      onDbImportFile(file);
                    }}
                    onClick={() => {
                      if (dbBackupLoading) return;
                      importFileRef.current?.click();
                    }}
                    role="button"
                    tabIndex={0}
                    aria-disabled={dbBackupLoading}
                    onKeyDown={(e) => {
                      if (dbBackupLoading) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        importFileRef.current?.click();
                      }
                    }}
                  >
                    <div className="manage-dropzone-icon" aria-hidden="true"><CloudUploadIcon /></div>
                    <div className="manage-dropzone-title">Drag &amp; Drop your JSON here</div>
                    <div className="manage-dropzone-sub">
                      Only `.json` files exported from this portal.
                    </div>
                    <button className="manage-btn manage-btn--db-restore-select" type="button" tabIndex={-1}>
                      Select Backup File
                    </button>
                    <div className="manage-dropzone-sub manage-dropzone-sub--muted">Max file size: 10 MB</div>
                  </div>
                  {dbImportFileName && (
                    <div className="manage-hint" style={{ marginTop: "0.5rem" }}>
                      Selected: {dbImportFileName} ({Math.ceil(dbImportFileSize / 1024)} KB)
                    </div>
                  )}
                  {dbBackupMode === "import" && dbBackupError && (
                    <AlertCard variant="error" className="manage-alerts" style={{ marginTop: "0.5rem" }}>
                      {dbBackupError}
                    </AlertCard>
                  )}
                  {dbBackupMode === "import" && dbImportSuccess && !dbBackupError && (
                    <AlertCard variant="success" className="manage-alerts" style={{ marginTop: "0.5rem" }}>
                      {dbImportSuccess}
                    </AlertCard>
                  )}
                  {dbBackupMode === "import" && dbImportWarning && !dbBackupError && (
                    <AlertCard variant="warning" className="manage-alerts" style={{ marginTop: "0.5rem" }}>
                      {dbImportWarning}
                    </AlertCard>
                  )}
                </div>
              )}
              {dbBackupMode === "import" && (
                <>
                  <details className="manage-collapsible">
                    <summary className="manage-collapsible-summary">
                      <span>JSON example</span>
                      <ChevronDownIcon className="manage-collapsible-chevron" aria-hidden="true" />
                    </summary>
                    <div className="manage-collapsible-content">
                      <pre className="manage-code" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{SAMPLE_DB_BACKUP_JSON}</pre>
                    </div>
                  </details>
                  <details className="manage-collapsible">
                    <summary className="manage-collapsible-summary">
                      <span>Rules</span>
                      <ChevronDownIcon className="manage-collapsible-chevron" aria-hidden="true" />
                    </summary>
                    <div className="manage-collapsible-content">
                      <ul className="manage-hint-list manage-rules-list">
                        <li>Only .json files exported from this portal are supported.</li>
                        <li>Backup contains semesters, jurors, groups, scores, and assignments.</li>
                        <li>Maximum file size: 10 MB.</li>
                        <li>This operation overwrites existing data.</li>
                        <li>Type RESTORE to confirm import.</li>
                      </ul>
                    </div>
                  </details>
                </>
              )}
              {dbBackupMode === "import" && (
                <div className="manage-field">
                  <label className="manage-label">Type RESTORE to confirm</label>
                  <input
                    type="text"
                    className="manage-input"
                    value={dbBackupConfirmText}
                    onChange={(e) => { onSetDbBackupConfirmText(e.target.value.toUpperCase()); onSetDbBackupError(""); }}
                    disabled={dbBackupLoading}
                    autoComplete="off"
                  />
                </div>
              )}
              {dbBackupMode !== "import" && dbBackupError && (
                <AlertCard variant="error" className="manage-alerts">
                  {dbBackupError}
                </AlertCard>
              )}
            </div>
            <div className="manage-modal-actions">
              <button
                className={`manage-btn${dbBackupMode === "import" ? " manage-btn--db-restore-cancel" : ""}`}
                type="button"
                disabled={dbBackupLoading}
                onClick={onCancelBackupDialog}
              >
                Cancel
              </button>
              <button
                className={`manage-btn ${dbBackupMode === "import" ? "manage-btn--delete-confirm" : "primary"}`}
                type="button"
                disabled={
                  dbBackupLoading
                  || (dbBackupMode === "import" && (!dbImportData || dbBackupConfirmText.trim() !== "RESTORE"))
                }
                onClick={dbBackupMode === "export" ? onDbExportConfirm : onDbImportConfirm}
              >
                {dbBackupLoading
                  ? (dbBackupMode === "export" ? "Exporting…" : "Restoring…")
                  : (dbBackupMode === "export" ? "Download Backup" : "Restore Database")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
