// src/jury/GroupStatusPanel.jsx
// ============================================================
// Status banners shown at the top of the EvalStep body:
//   - Group synced (all scores saved)
//   - Edit mode active
//   - Lock (read-only)
//   - Save error + Retry
// ============================================================

import { memo } from "react";
import { CheckCircle2Icon, PencilIcon, LockIcon, TriangleAlertIcon } from "../shared/Icons";

const GroupStatusPanel = memo(function GroupStatusPanel({
  pid,
  groupSynced,
  editMode,
  lockActive,
  saveStatus,
  handleCommentBlur,
}) {
  return (
    <>
      {groupSynced[pid] && !editMode && (
        <div className="group-done-banner">
          <CheckCircle2Icon />
          All scores saved for this group.
        </div>
      )}
      {editMode && (
        <div className="group-done-banner edit-mode-banner">
          <PencilIcon />
          Edit mode enabled — adjust scores and click "Submit Final Scores" when ready.
        </div>
      )}
      {lockActive && (
        <div className="group-done-banner lock-readonly-banner">
          <LockIcon />
          Your evaluations are locked. Contact the administrator to request changes.
        </div>
      )}
      {saveStatus === "error" && (
        <div className="group-done-banner save-error-banner">
          <TriangleAlertIcon />
          Could not save. Check your connection.
          <button className="retry-btn" onClick={() => handleCommentBlur(pid)}>
            Retry
          </button>
        </div>
      )}
    </>
  );
});

export default GroupStatusPanel;
