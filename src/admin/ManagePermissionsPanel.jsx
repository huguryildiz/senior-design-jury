// src/admin/ManagePermissionsPanel.jsx

import { useEffect, useState } from "react";
import { ChevronDownIcon, UserKeyIcon, SearchIcon, UserCheckIcon, LandmarkIcon, LoaderIcon, LockIcon, InfoIcon } from "../shared/Icons";
import { jurorStatusMeta } from "./scoreHelpers";
import LastActivity from "./LastActivity";
import { formatTs } from "./utils";

export default function ManagePermissionsPanel({
  settings,
  jurors,
  activeSemesterId,
  isMobile,
  isOpen,
  onToggle,
  onRequestEvalLockChange,
  onToggleEdit,
}) {
  const [local, setLocal] = useState(settings);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingEdits, setPendingEdits] = useState(() => new Set());
  const [evalLockPending, setEvalLockPending] = useState(false);
  const PREVIEW_JUROR_COUNT = 4;

  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  const handleEvalLockChange = async (checked) => {
    if (!activeSemesterId || evalLockPending) return;
    const start = Date.now();
    setEvalLockPending(true);
    try {
      await Promise.resolve(onRequestEvalLockChange?.(checked));
    } finally {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 1200 - elapsed);
      setTimeout(() => {
        setEvalLockPending(false);
      }, remaining);
    }
  };
  const handleToggleEdit = async ({ jurorId, enabled }) => {
    if (!jurorId) return;
    if (pendingEdits.has(jurorId)) return;
    const start = Date.now();
    setPendingEdits((prev) => {
      const next = new Set(prev);
      next.add(jurorId);
      return next;
    });
    try {
      await Promise.resolve(onToggleEdit?.({ jurorId, enabled }));
    } finally {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 1200 - elapsed);
      setTimeout(() => {
        setPendingEdits((prev) => {
          const next = new Set(prev);
          next.delete(jurorId);
          return next;
        });
      }, remaining);
    }
  };
  const toBool = (v) => v === true || v === "true" || v === "t" || v === 1;
  const evalLockActive = toBool(local?.evalLockActive ?? settings?.evalLockActive);
  const hasActiveSemester = !!activeSemesterId;
  const orderedJurors = Array.isArray(jurors)
    ? [...jurors].sort((a, b) => {
        const aName = (a.juryName || a.juror_name || "").toLowerCase();
        const bName = (b.juryName || b.juror_name || "").toLowerCase();
        return aName.localeCompare(bName);
      })
    : [];
  const hasAssignedFlag = orderedJurors.some((j) =>
    j.isAssigned !== undefined && j.isAssigned !== null
    || j.is_assigned !== undefined && j.is_assigned !== null
  );
  const permissionJurors = hasAssignedFlag
    ? orderedJurors.filter((j) => toBool(j.isAssigned ?? j.is_assigned))
    : orderedJurors;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredJurors = normalizedSearch
    ? permissionJurors.filter((j) => {
        const name = j.juryName || j.juror_name || "";
        const inst = j.juryDept || j.juror_inst || "";
        const totalProjects = Number(j.totalProjects ?? j.total_projects ?? 0);
        const completedProjects = Number(j.completedProjects ?? j.completed_projects ?? 0);
        const safeTotal = Math.max(totalProjects, 0);
        const safeCompleted = Math.max(completedProjects, 0);
        const displayCompleted = safeTotal > 0 ? Math.min(safeCompleted, safeTotal) : safeCompleted;
        const finalSubmittedAt = j.finalSubmittedAt ?? j.final_submitted_at ?? null;
        const isCompleted = Boolean(finalSubmittedAt);
        const editEnabled = toBool(j.editEnabled ?? j.edit_enabled);
        const isReadyToSubmit = safeTotal > 0 && !editEnabled && !isCompleted && displayCompleted >= safeTotal;
        const editStatusLabel = editEnabled
          ? "edit mode open on enabled editing true acik açık"
          : "edit mode closed off disabled false kapali kapalı";
        const statusKey = editEnabled
          ? "editing"
          : (isCompleted ? "completed" : (isReadyToSubmit ? "ready_to_submit" : (displayCompleted > 0 ? "in_progress" : "not_started")));
        const statusTokens = statusKey === "completed"
          ? "juror status state durum completed tamamlandi tamamlandı"
          : statusKey === "ready_to_submit"
            ? "juror status state durum ready to submit ready_to_submit ready submit hazır hazir"
            : statusKey === "in_progress"
              ? "juror status state durum in progress in_progress devam ediyor"
              : statusKey === "editing"
                ? "juror status state durum editing edit mode"
                : "juror status state durum not started not_started baslamadi başlamadı";
        const progressLabel = safeTotal > 0
          ? (statusKey === "editing"
            ? `Editing ${displayCompleted}/${safeTotal}`
            : statusKey === "ready_to_submit"
              ? `Ready to submit ${displayCompleted}/${safeTotal}`
            : isCompleted
            ? `Completed ${displayCompleted}/${safeTotal}`
            : (displayCompleted > 0
              ? `In progress ${displayCompleted}/${safeTotal}`
              : `Not started ${displayCompleted}/${safeTotal}`))
          : "No groups assigned";
        const lastActivityAt =
          j.lastActivityAt
          || j.last_activity_at
          || j.lastSeenAt
          || j.last_seen_at
          || "";
        const formattedActivity = lastActivityAt ? formatTs(lastActivityAt) : "";
        const [formattedDatePart = "", formattedTimePart = ""] = formattedActivity ? formattedActivity.split(" ") : [];
        const formattedActivityAlt = formattedActivity
          ? `${formattedActivity} ${formattedActivity.replace(/\./g, "/")} ${formattedActivity.replace(/\./g, "-")} ${formattedDatePart} ${formattedTimePart}`
          : "";
        const haystack = [
          name,
          inst,
          progressLabel,
          statusTokens,
          editStatusLabel,
          formattedActivityAlt,
          lastActivityAt,
          `last updated ${formattedActivity}`,
          `updated at ${formattedActivity}`,
          `updated ${formattedActivity}`,
          `last activity ${formattedActivity}`,
          `last seen ${formattedActivity}`,
          `date ${formattedDatePart}`,
          `time ${formattedTimePart}`,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : permissionJurors;
  const visibleJurors = normalizedSearch
    ? filteredJurors
    : (showAll ? permissionJurors : permissionJurors.slice(0, PREVIEW_JUROR_COUNT));

  return (
    <div className={`manage-card${isMobile ? " is-collapsible" : ""}`}>
      <button
        type="button"
        className="manage-card-header"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="manage-card-title">
          <span className="manage-card-icon" aria-hidden="true"><UserKeyIcon /></span>
          <span className="section-label">Evaluation Permissions</span>
        </div>
        {isMobile && <ChevronDownIcon className={`settings-chevron${isOpen ? " open" : ""}`} />}
      </button>

      {(!isMobile || isOpen) && (
        <div className="manage-card-body">
          <div className="manage-card-desc">Toggle edit access per juror and lock evaluations for the active semester.</div>
          <div className="manage-field">
            <label className="manage-toggle">
              <span className="manage-toggle-text">Lock evaluations for the active semester</span>
              <span className="manage-toggle-control">
                <input
                  type="checkbox"
                  checked={local.evalLockActive}
                  disabled={!hasActiveSemester || evalLockPending}
                  onChange={(e) => handleEvalLockChange(e.target.checked)}
                />
                <span className="manage-toggle-track" />
                {evalLockPending && (
                  <span className="manage-toggle-spinner" aria-hidden="true">
                    <LoaderIcon />
                  </span>
                )}
              </span>
            </label>
          </div>
          <div className="manage-hint manage-hint-inline">
            When locked, jurors can view but cannot edit or submit scores.
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
              const jurorId = j.jurorId || j.juror_id;
              const totalProjects = Number(j.totalProjects ?? j.total_projects ?? 0);
              const completedProjects = Number(j.completedProjects ?? j.completed_projects ?? 0);
              const safeTotal = Math.max(totalProjects, 0);
              const safeCompleted = Math.max(completedProjects, 0);
              const displayCompleted = safeTotal > 0 ? Math.min(safeCompleted, safeTotal) : safeCompleted;
              const finalSubmittedAt = j.finalSubmittedAt ?? j.final_submitted_at ?? null;
              const isCompleted = Boolean(finalSubmittedAt);
              const isFullyComplete = safeTotal === 0 || displayCompleted >= safeTotal;
              const hasGroups = safeTotal > 0;
              const hasStartedAny = displayCompleted > 0;
              const editEnabled = toBool(j.editEnabled ?? j.edit_enabled);
              const isReadyToSubmit = hasGroups && !editEnabled && !isCompleted && displayCompleted >= safeTotal;
              const isReadyToFinalize = isReadyToSubmit;
              const completionHint = isReadyToFinalize ? `Ready to finalize (${displayCompleted}/${safeTotal})` : "";
              const disableHint = hasGroups
                ? `Cannot disable edit mode until all scores are re-submitted (${displayCompleted}/${safeTotal}).`
                : "No groups assigned.";
              const lastActivityAt =
                j.lastActivityAt
                || j.last_activity_at
                || j.lastSeenAt
                || j.last_seen_at
                || "";
              const lockHint = evalLockActive
                ? "Evaluations are locked. Unlock to let jurors edit."
                : (!hasActiveSemester ? "No active semester selected." : "");
              const baseTitle = editEnabled
                ? (!isFullyComplete ? disableHint : "")
                : (!isCompleted ? completionHint : "");
              const editTitle = [baseTitle, lockHint].filter(Boolean).join(" ");
              const isPending = pendingEdits.has(jurorId);
              const isToggleDisabled =
                !hasActiveSemester ||
                evalLockActive ||
                (editEnabled ? !isFullyComplete : !isCompleted) ||
                isPending;
              const completionStatusKey = hasGroups
                ? (editEnabled ? "editing" : (isCompleted ? "completed" : (isReadyToSubmit ? "ready_to_submit" : (hasStartedAny ? "in_progress" : "not_started"))))
                : "not_started";
              const CompletionIcon = jurorStatusMeta[completionStatusKey]?.icon || jurorStatusMeta.not_started.icon;
              const InProgressIcon = jurorStatusMeta.in_progress.icon;
              const completionClassName = [
                "manage-item-completion",
                "manage-status-chip",
                completionStatusKey === "completed"
                  ? "is-complete"
                  : completionStatusKey === "ready_to_submit"
                    ? "is-ready-to-submit"
                  : completionStatusKey === "in_progress"
                    ? "is-in-progress"
                    : completionStatusKey === "editing"
                      ? "is-editing"
                      : "is-not-started",
              ].join(" ");
              return (
                <div key={jurorId} className="manage-item">
                  <div>
                    <div className="manage-item-title">
                      <span className="manage-item-juror-name">
                        <span className="manage-item-icon" aria-hidden="true">
                          <UserCheckIcon />
                        </span>
                        <span className="manage-item-text">
                          {j.juryName || j.juror_name}
                        </span>
                      </span>
                    </div>
                    <div className="manage-item-sub manage-item-juror-inst">
                      <span className="manage-item-icon" aria-hidden="true">
                        <LandmarkIcon />
                      </span>
                      <span className="manage-item-text">
                        {j.juryDept || j.juror_inst}
                      </span>
                    </div>
                    <div className="manage-item-meta">
                      <span className={completionClassName}>
                        <span className="manage-status-chip-icon" aria-hidden="true"><CompletionIcon /></span>
                        {hasGroups
                          ? (completionStatusKey === "editing"
                            ? `Editing ${displayCompleted}/${safeTotal}`
                            : completionStatusKey === "ready_to_submit"
                              ? `Ready to submit ${displayCompleted}/${safeTotal}`
                            : isCompleted
                              ? `Completed ${displayCompleted}/${safeTotal}`
                              : (hasStartedAny
                                ? `In progress ${displayCompleted}/${safeTotal}`
                                : `Not started ${displayCompleted}/${safeTotal}`))
                          : "No groups assigned"}
                      </span>
                      {isReadyToFinalize && (
                        <span className="manage-item-helper manage-item-helper--ready-finalize">
                          {completionHint}
                        </span>
                      )}
                      {editEnabled && !isFullyComplete && hasGroups && (
                        <span className="manage-item-helper manage-status-chip is-warning">
                          <span className="manage-status-chip-icon" aria-hidden="true"><InProgressIcon /></span>
                          {disableHint}
                        </span>
                      )}
                      {(evalLockActive || !hasActiveSemester) && (
                        <span className={`manage-item-helper manage-status-chip${evalLockActive ? " is-info" : " is-muted"}`}>
                          <span className="manage-status-chip-icon" aria-hidden="true">
                            {evalLockActive ? <LockIcon /> : <InfoIcon />}
                          </span>
                          {evalLockActive ? "Evaluation lock is active." : lockHint}
                        </span>
                      )}
                    </div>
                    <div className="manage-item-sub manage-meta-line">
                      <LastActivity value={lastActivityAt} />
                    </div>
                  </div>
                  <div className="manage-item-actions">
                    <div className="manage-toggle-wrap">
                      <span className="manage-toggle-label">
                        Edit Mode
                        {isPending && (
                          <span className="manage-toggle-spinner" aria-hidden="true">
                            <LoaderIcon />
                          </span>
                        )}
                      </span>
                      <label className={`manage-switch${(editEnabled ? isFullyComplete : isCompleted) ? " is-ready" : " is-locked"}`}>
                        <input
                          type="checkbox"
                          checked={editEnabled}
                          disabled={isToggleDisabled}
                          title={editTitle}
                          onChange={(e) => {
                            if (isToggleDisabled) return;
                            handleToggleEdit({
                              jurorId: j.jurorId || j.juror_id,
                              enabled: e.target.checked,
                            });
                          }}
                        />
                        <span className="manage-switch-slider" />
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
            {!normalizedSearch && permissionJurors.length === 0 && (
              <div className="manage-empty manage-empty-search">No jurors assigned to the active semester.</div>
            )}
            {normalizedSearch && filteredJurors.length === 0 && (
              <div className="manage-empty manage-empty-search">No results.</div>
            )}
          </div>
          {!normalizedSearch && permissionJurors.length > PREVIEW_JUROR_COUNT && (
            <button
              className="manage-btn ghost"
              type="button"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Show fewer jurors" : `Show all jurors (${permissionJurors.length})`}
            </button>
          )}

        </div>
      )}
    </div>
  );
}
