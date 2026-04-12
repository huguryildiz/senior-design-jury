// src/admin/drawers/ManageBackupsDrawer.jsx
// Drawer: create, list, download, and delete org backups.
// Backups are JSON snapshots stored in Supabase Storage and tracked
// in the platform_backups table. Uses the fs-drawer / fs-backup-card
// design system (see ViewSessionsDrawer for the reference pattern).

import { useState } from "react";
import {
  Database,
  X,
  Plus,
  Download,
  Trash2,
  Clock,
  RefreshCw,
  AlertCircle,
  Pencil,
} from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import FbAlert from "@/shared/ui/FbAlert";
import CustomSelect from "@/shared/ui/CustomSelect";
import DeleteBackupModal from "../modals/DeleteBackupModal";
import { useToast } from "@/shared/hooks/useToast";
import { useBackups } from "../hooks/useBackups";
import { formatDateTime as formatDate, formatDate as fmtDateOnly } from "@/shared/lib/dateUtils";

const STORAGE_QUOTA_BYTES = 500 * 1024 * 1024; // 500 MB

const FREQ_OPTIONS = [
  { label: "Daily",        value: "daily"  },
  { label: "Every 2 days", value: "2days"  },
  { label: "Every 3 days", value: "3days"  },
  { label: "Weekly (Mon)", value: "weekly" },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  label: `${String(i).padStart(2, "0")}:00 UTC`,
  value: String(i),
}));

function parseCron(expr) {
  if (!expr) return { freq: "daily", hour: 2 };
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return { freq: "daily", hour: 2 };
  const [, h, dom, , dow] = parts;
  const hour = parseInt(h, 10) || 0;
  if (dow !== "*") return { freq: "weekly", hour };
  if (dom === "*/2") return { freq: "2days", hour };
  if (dom === "*/3") return { freq: "3days", hour };
  return { freq: "daily", hour };
}

function buildCron(freq, hour) {
  const h = Math.max(0, Math.min(23, Number(hour)));
  if (freq === "2days") return `0 ${h} */2 * *`;
  if (freq === "3days") return `0 ${h} */3 * *`;
  if (freq === "weekly") return `0 ${h} * * 1`;
  return `0 ${h} * * *`;
}

function describeSchedule(cronExpr) {
  const { freq, hour } = parseCron(cronExpr);
  const time = `${String(hour).padStart(2, "0")}:00 UTC`;
  if (freq === "daily")  return `Daily at ${time}`;
  if (freq === "2days")  return `Every 2 days at ${time}`;
  if (freq === "3days")  return `Every 3 days at ${time}`;
  if (freq === "weekly") return `Weekly (Mon) at ${time}`;
  return cronExpr;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[idx]}`;
}


function formatExpiry(ts) {
  if (!ts) return "Never expires";
  const d = new Date(ts);
  const now = Date.now();
  const diffDays = Math.ceil((d.getTime() - now) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return "Expired";
  if (diffDays === 0) return "Expires today";
  if (diffDays <= 7) return `Expires in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
  return `Expires ${fmtDateOnly(ts)}`;
}

function BackupRow({ backup, onDownload, onDelete, isDeleting }) {
  const isPinned = backup.origin === "snapshot";
  const expiringSoon =
    backup.expires_at && new Date(backup.expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className={`fs-backup-card origin-${backup.origin}${isPinned ? " pinned" : ""}`}>
      <div className="fs-backup-icon">
        <Database size={15} strokeWidth={2} />
      </div>
      <div className="fs-backup-body">
        <div className="fs-backup-title">
          {formatDate(backup.created_at)}
          <span className={`fs-session-pill backup-${backup.origin}`}>
            {backup.origin[0].toUpperCase() + backup.origin.slice(1)}
          </span>
          {isPinned && <span className="fs-session-pill muted">Pinned</span>}
          {expiringSoon && !isPinned && (
            <span className="fs-session-pill warning">Expires soon</span>
          )}
        </div>
        <div className="fs-backup-sub">
          {backup.period_ids?.length || 0} period{backup.period_ids?.length !== 1 ? "s" : ""} ·
          {" "}{formatBytes(backup.size_bytes)} · {backup.format?.toUpperCase() || "JSON"}
        </div>
        <div className="fs-backup-meta">
          By {backup.created_by_name || "System"} · {formatExpiry(backup.expires_at)}
        </div>
      </div>
      <div className="fs-backup-actions">
        <button
          type="button"
          className="fs-icon-btn"
          aria-label="Download backup"
          onClick={() => onDownload(backup)}
        >
          <Download size={12} strokeWidth={2} />
        </button>
        {!isPinned && (
          <button
            type="button"
            className="fs-btn fs-btn-danger"
            style={{ fontSize: 11, padding: "4px 10px", height: 28, gap: 5 }}
            disabled={isDeleting}
            onClick={() => onDelete(backup)}
          >
            <Trash2 size={11} strokeWidth={2} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default function ManageBackupsDrawer({ open, onClose, organizationId }) {
  const toast = useToast();
  const {
    backups,
    loading,
    error,
    creating,
    deletingId,
    totalBytes,
    create,
    remove,
    download,
    schedule,
    scheduleLoading,
    updatingSchedule,
    saveSchedule,
  } = useBackups(organizationId);

  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [draftFreq, setDraftFreq] = useState("daily");
  const [draftHour, setDraftHour] = useState("2");

  const handleCreate = async () => {
    try {
      await create();
      toast.success("Backup created");
    } catch (e) {
      toast.error(e?.message || "Backup failed");
    }
  };

  const handleDownload = async (backup) => {
    try {
      await download(backup);
    } catch (e) {
      toast.error(e?.message || "Download failed");
    }
  };

  const handleDeleteConfirmed = async () => {
    const target = confirmDeleteTarget;
    if (!target) return;
    await remove(target.id);
    toast.success("Backup deleted");
    setConfirmDeleteTarget(null);
  };

  const handleEditSchedule = () => {
    const parsed = parseCron(schedule?.cron_expr || "0 2 * * *");
    setDraftFreq(parsed.freq);
    setDraftHour(String(parsed.hour));
    setEditingSchedule(true);
  };

  const handleSaveSchedule = async () => {
    try {
      await saveSchedule(buildCron(draftFreq, draftHour));
      setEditingSchedule(false);
      toast.success("Schedule updated");
    } catch (e) {
      toast.error(e?.message || "Failed to update schedule");
    }
  };

  const meterPct = Math.min(100, (totalBytes / STORAGE_QUOTA_BYTES) * 100);
  const currentCron = schedule?.cron_expr || "0 2 * * *";

  return (
    <>
      <Drawer open={open} onClose={onClose}>
        <div className="fs-drawer-header">
          <div className="fs-drawer-header-row">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="fs-icon identity">
                <Database size={18} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                  Database Backups
                </div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                  Snapshots stored securely · 90-day retention
                </div>
              </div>
            </div>
            <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="fs-drawer-body">
          {error && (
            <FbAlert variant="danger" style={{ marginBottom: 14 }}>
              {error}
            </FbAlert>
          )}

          {/* Schedule section */}
          <div className="fs-section">
            <div className="fs-section-header">
              <span className="fs-section-title">Schedule</span>
              {!editingSchedule && !scheduleLoading && (
                <button
                  type="button"
                  className="fs-icon-btn"
                  aria-label="Edit schedule"
                  onClick={handleEditSchedule}
                >
                  <Pencil size={11} strokeWidth={2} />
                </button>
              )}
            </div>

            {!editingSchedule ? (
              <div className="fs-status-card">
                <Clock size={14} strokeWidth={2} />
                <div style={{ flex: 1 }}>
                  <div className="fs-status-title">
                    {scheduleLoading ? "Loading…" : describeSchedule(currentCron)}
                  </div>
                  <div className="fs-status-desc">
                    All organizations are backed up automatically. Manual backups are available below.
                  </div>
                </div>
              </div>
            ) : (
              <div className="fs-schedule-editor">
                <div className="fs-schedule-selects">
                  <CustomSelect
                    value={draftFreq}
                    onChange={setDraftFreq}
                    options={FREQ_OPTIONS}
                    ariaLabel="Backup frequency"
                    compact
                  />
                  <CustomSelect
                    value={draftHour}
                    onChange={setDraftHour}
                    options={HOUR_OPTIONS}
                    ariaLabel="Backup hour (UTC)"
                    compact
                  />
                </div>
                <div className="fs-schedule-actions">
                  <button
                    type="button"
                    className="fs-btn fs-btn-secondary"
                    onClick={() => setEditingSchedule(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="fs-btn fs-btn-primary"
                    disabled={updatingSchedule}
                    onClick={handleSaveSchedule}
                  >
                    {updatingSchedule ? (
                      <>
                        <RefreshCw size={11} className="spin" strokeWidth={2.5} />
                        Saving…
                      </>
                    ) : (
                      "Save"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Storage stats */}
          <div className="fs-section">
            <div className="fs-section-header">
              <span className="fs-section-title">Storage</span>
            </div>
            <div className="fs-inline-stats">
              <div className="fs-inline-stat">
                <div className="fs-inline-stat-value">{backups.length}</div>
                <div className="fs-inline-stat-label">Total</div>
              </div>
              <div className="fs-inline-stat">
                <div className="fs-inline-stat-value">{formatBytes(totalBytes)}</div>
                <div className="fs-inline-stat-label">Used</div>
              </div>
              <div className="fs-inline-stat">
                <div className="fs-inline-stat-value">
                  {backups.filter((b) => b.origin === "manual").length}
                </div>
                <div className="fs-inline-stat-label">Manual</div>
              </div>
            </div>
            <div className="fs-meter-wrap">
              <div className="fs-meter-row">
                <span>Storage quota</span>
                <span>
                  <strong>{formatBytes(totalBytes)}</strong> / 500 MB
                </span>
              </div>
              <div className="fs-meter-track">
                <div className="fs-meter-fill" style={{ width: `${meterPct}%` }} />
              </div>
            </div>
          </div>

          {/* Backup list */}
          <div className="fs-section">
            <div className="fs-section-header">
              <span className="fs-section-title">Recent Backups</span>
              <span className="fs-section-badge">{backups.length} total</span>
            </div>

            {loading && (
              <div
                style={{
                  padding: "20px 0",
                  textAlign: "center",
                  color: "var(--text-quaternary)",
                  fontSize: 12,
                }}
              >
                Loading backups…
              </div>
            )}

            {!loading && backups.length === 0 && (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                  fontSize: 12,
                  border: "1px dashed var(--border)",
                  borderRadius: 9,
                }}
              >
                <AlertCircle
                  size={22}
                  style={{ marginBottom: 8, opacity: 0.5 }}
                  strokeWidth={1.5}
                />
                <div>No backups yet</div>
                <div style={{ marginTop: 4, fontSize: 11 }}>
                  Create your first backup to protect your data
                </div>
              </div>
            )}

            {!loading &&
              backups.map((b) => (
                <BackupRow
                  key={b.id}
                  backup={b}
                  onDownload={handleDownload}
                  onDelete={(backup) => setConfirmDeleteTarget(backup)}
                  isDeleting={deletingId === b.id}
                />
              ))}
          </div>
        </div>

        <div className="fs-drawer-footer">
          <div style={{ flex: 1, fontSize: 11, color: "var(--text-tertiary)" }}>
            {backups.length} backup{backups.length !== 1 ? "s" : ""} · {formatBytes(totalBytes)} used
          </div>
          <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose}>
            Close
          </button>
          <button
            className="fs-btn fs-btn-primary"
            type="button"
            disabled={creating || !organizationId}
            onClick={handleCreate}
          >
            {creating ? (
              <>
                <RefreshCw size={12} className="spin" strokeWidth={2.5} />
                Creating…
              </>
            ) : (
              <>
                <Plus size={12} strokeWidth={2.5} />
                Create backup
              </>
            )}
          </button>
        </div>
      </Drawer>

      <DeleteBackupModal
        open={!!confirmDeleteTarget}
        onClose={() => setConfirmDeleteTarget(null)}
        backup={confirmDeleteTarget}
        onDelete={handleDeleteConfirmed}
      />
    </>
  );
}
