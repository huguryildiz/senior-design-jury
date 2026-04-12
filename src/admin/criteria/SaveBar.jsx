import { AlertCircle } from "lucide-react";

export default function SaveBar({ isDirty, canSave, total, onSave, onDiscard, saving }) {
  if (!isDirty) return null;

  const remaining = 100 - total;
  const statusText = total === 100
    ? "Ready to save"
    : `${Math.abs(remaining)} pts ${remaining > 0 ? "remaining" : "over"}`;

  return (
    <div className="crt-save-bar">
      <div className="crt-save-bar-left">
        <div className="crt-save-bar-pulse" />
        <span className="crt-save-bar-text">
          Unsaved changes — {statusText}
        </span>
      </div>
      <div className="crt-save-bar-actions">
        <button
          className="crt-save-btn-secondary"
          onClick={onDiscard}
          disabled={saving}
          type="button"
        >
          Discard
        </button>
        <button
          className="crt-save-btn-primary"
          onClick={onSave}
          disabled={!canSave || saving}
          type="button"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
