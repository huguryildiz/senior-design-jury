// src/admin/ManagePermissionsPanel.jsx

import { useEffect, useRef, useState } from "react";
import { CalendarClockIcon, ChevronDownIcon, UserKeyIcon, SearchIcon, UserCheckIcon, LandmarkIcon, LoaderIcon, LockIcon, InfoIcon, CircleDotIcon } from "../shared/Icons";
import { jurorStatusMeta } from "./scoreHelpers";
import LastActivity from "./LastActivity";
import { formatTs } from "./utils";

export default function ManagePermissionsPanel({
  settings,
  jurors,
  activeSemesterId,
  activeSemesterName,
  evalLockError = "",
  isMobile,
  isOpen,
  onToggle,
  onRequestEvalLockChange,
  onToggleEdit,
  onForceCloseEdit,
}) {
  const panelRef = useRef(null);
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  const [local, setLocal] = useState(settings);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingEdits, setPendingEdits] = useState(() => new Set());
  const [evalLockPending, setEvalLockPending] = useState(false);
  const PREVIEW_JUROR_COUNT = 3;

  const updateScrollState = (el) => {
    if (!el) return;
    const isOverflowing = el.scrollWidth > el.clientWidth + 1;
    el.classList.toggle("is-overflowing", isOverflowing);
    el.classList.toggle("is-scrolled", el.scrollLeft > 0);
  };
  const handleTextScroll = (e) => updateScrollState(e.currentTarget);

  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mql = window.matchMedia("(max-width: 900px) and (orientation: landscape)");
    const handleChange = (e) => setIsLandscapeMobile(e.matches);
    setIsLandscapeMobile(mql.matches);
    if (mql.addEventListener) mql.addEventListener("change", handleChange);
    else mql.addListener(handleChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handleChange);
      else mql.removeListener(handleChange);
    };
  }, []);

  const handleEvalLockChange = async (checked) => {
    if (!activeSemesterId || evalLockPending) return;
    const start = Date.now();
    setEvalLockPending(true);
    // Optimistic update — flip the toggle immediately
    setLocal((prev) => ({ ...prev, evalLockActive: checked }));
    try {
      await Promise.resolve(onRequestEvalLockChange?.(checked));
    } catch {
      // Revert optimistic update on error — settings useEffect will also correct it
      setLocal((prev) => ({ ...prev, evalLockActive: !checked }));
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
  const handleForceCloseEdit = async ({ jurorId }) => {
    if (!jurorId) return;
    if (pendingEdits.has(jurorId)) return;
    const start = Date.now();
    setPendingEdits((prev) => {
      const next = new Set(prev);
      next.add(jurorId);
      return next;
    });
    try {
      await Promise.resolve(onForceCloseEdit?.({ jurorId }));
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
  const formatProgressLabel = (label, completed, total) => `${label} (${completed}/${total})`;
  const getProgressMeta = (j) => {
    const safeTotal = Math.max(
      0,
      Number(j.overviewTotalProjects ?? j.totalProjects ?? j.total_projects ?? 0) || 0
    );
    const scoredProjectsRaw = Number(
      j.overviewScoredProjects ?? j.completedProjects ?? j.completed_projects ?? 0
    ) || 0;
    const startedProjectsRaw = Number(
      j.overviewStartedProjects ?? scoredProjectsRaw
    ) || 0;
    const displayCompleted = safeTotal > 0
      ? Math.min(Math.max(scoredProjectsRaw, 0), safeTotal)
      : Math.max(scoredProjectsRaw, 0);
    const startedProjects = Math.max(startedProjectsRaw, displayCompleted);
    const editEnabled = toBool(j.editEnabled ?? j.edit_enabled);
    const isCompleted = Boolean(j.finalSubmittedAt ?? j.final_submitted_at);
    const hasGroups = safeTotal > 0;
    const hasStartedAny = startedProjects > 0;
    const isReadyToSubmit = hasGroups && !editEnabled && !isCompleted && displayCompleted >= safeTotal;
    const statusKey = j.overviewStatus
      || (editEnabled
        ? "editing"
        : (isCompleted
          ? "completed"
          : (isReadyToSubmit
            ? "ready_to_submit"
            : (hasStartedAny ? "in_progress" : "not_started"))));
    return {
      safeTotal,
      displayCompleted,
      editEnabled,
      isCompleted,
      hasGroups,
      hasStartedAny,
      isReadyToSubmit,
      statusKey,
    };
  };
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
        const {
          safeTotal,
          displayCompleted,
          editEnabled,
          isCompleted,
          hasStartedAny,
          statusKey,
        } = getProgressMeta(j);
        // Search haystack: English + Turkish aliases so admins can search in either language.
        const actionTokens = editEnabled
          ? "lock editing cancel edit close edit"
          : (isCompleted ? "unlock editing enable edit open edit" : "");
        const editStatusLabel = editEnabled
          ? "edit mode open on enabled editing true acik açık"
          : "edit mode closed off disabled false kapali kapalı";
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
            ? formatProgressLabel("Editing", displayCompleted, safeTotal)
            : statusKey === "ready_to_submit"
              ? formatProgressLabel("Ready to submit", displayCompleted, safeTotal)
            : isCompleted
              ? formatProgressLabel("Completed", displayCompleted, safeTotal)
              : (hasStartedAny
                ? formatProgressLabel("In progress", displayCompleted, safeTotal)
                : formatProgressLabel("Not started", displayCompleted, safeTotal)))
          : "No groups assigned";
        const lastActivityAt =
          j.lastActivityAt
          || j.last_activity_at
          || j.lastSeenAt
          || j.last_seen_at
          || j.updatedAt
          || j.updated_at
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
          actionTokens,
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
        const actionQuery = normalizedSearch.replace(/\s+/g, " ").trim();
        if (actionQuery === "lock editing") return editEnabled;
        if (actionQuery === "unlock editing") return !editEnabled && isCompleted;
        return haystack.includes(normalizedSearch);
      })
    : permissionJurors;
  const visibleJurors = normalizedSearch
    ? filteredJurors
    : (showAll ? permissionJurors : permissionJurors.slice(0, PREVIEW_JUROR_COUNT));

  useEffect(() => {
    const root = panelRef.current;
    if (!root) return;
    const updateAll = () => {
      root.querySelectorAll(".manage-item-text--full").forEach((el) => updateScrollState(el));
    };
    const raf = requestAnimationFrame(updateAll);
    window.addEventListener("resize", updateAll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateAll);
    };
  }, [visibleJurors, showAll, searchTerm, isOpen, isMobile, activeSemesterName]);

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
          <div className="manage-card-desc">
            Enable edit access per juror and lock evaluations for{" "}
            <span className="manage-semester-emphasis-blink">{activeSemesterName || "the selected"}</span>{" "}
            semester.
          </div>
          <div className="manage-field">
            <label className="manage-toggle">
              <span className="manage-toggle-text">
                Lock evaluations for {activeSemesterName || "the selected"} semester
              </span>
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
          {evalLockError && (
            <div className="manage-hint manage-hint-error">{evalLockError}</div>
          )}

          <div className="manage-list" ref={panelRef}>
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
            {!hasAssignedFlag && orderedJurors.length > 0 && (
              <div className="manage-hint manage-hint-warn">
                All jurors are shown because assignment data is unavailable. Assign jurors to groups first.
              </div>
            )}
            {visibleJurors.map((j) => {
              const jurorId = j.jurorId || j.juror_id;
              const {
                safeTotal,
                displayCompleted,
                isCompleted,
                hasGroups,
                hasStartedAny,
                editEnabled,
                statusKey,
              } = getProgressMeta(j);
              const lastActivityAt =
                j.lastActivityAt
                || j.last_activity_at
                || j.lastSeenAt
                || j.last_seen_at
                || j.updatedAt
                || j.updated_at
                || "";
              const lockHint = evalLockActive
                ? "Evaluations are locked. Unlock to let jurors edit."
                : (!hasActiveSemester ? "No semester selected in header." : "");
              const inlineLockChip = evalLockActive && (!isMobile || isLandscapeMobile);
              const isPending = pendingEdits.has(jurorId);
              const canForceClose = hasActiveSemester && editEnabled && !isPending;
              const canEnableEdit =
                hasActiveSemester &&
                !evalLockActive &&
                !editEnabled &&
                isCompleted &&
                !isPending;
              const showActionControls = editEnabled || (isCompleted && !evalLockActive);
              const enableEditTitle = canEnableEdit
                ? "Allow juror to reopen and resubmit the evaluation."
                : (lockHint || "Edit mode can be enabled only after completion.");
              const completionStatusKey = hasGroups ? statusKey : "not_started";
              const completionStatusMeta = jurorStatusMeta[completionStatusKey] || jurorStatusMeta.not_started;
              const CompletionIcon = completionStatusMeta.icon;
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
                <div key={jurorId} className="manage-item manage-item--permissions">
                  <div>
                    <div className="manage-item-title">
                      <span className="manage-item-juror-name">
                        <span className="manage-item-icon" aria-hidden="true">
                          <UserCheckIcon />
                        </span>
                        <span className="manage-item-text manage-item-text--full" onScroll={handleTextScroll}>
                          {j.juryName || j.juror_name}
                        </span>
                      </span>
                    </div>
                    <div className="manage-item-sub manage-item-juror-inst">
                      <span className="manage-item-icon" aria-hidden="true">
                        <LandmarkIcon />
                      </span>
                      <span className="manage-item-text manage-item-text--full" onScroll={handleTextScroll}>
                        {j.juryDept || j.juror_inst}
                      </span>
                    </div>
                    <div className="manage-item-sub manage-meta-line manage-meta-line--semester-chip">
                      <span className="manage-meta-icon manage-semester-date-icon" aria-hidden="true">
                        <CalendarClockIcon />
                      </span>
                      <span className="manage-item-semester-chip">{activeSemesterName || "—"}</span>
                    </div>
                    <div className="manage-item-meta">
                      <div className="manage-item-status-row manage-meta-line manage-meta-line--status">
                        <span className="manage-meta-icon manage-status-dot-icon" aria-hidden="true">
                          <CircleDotIcon />
                        </span>
                        <span className={completionClassName}>
                          <span className="manage-status-chip-icon" aria-hidden="true"><CompletionIcon /></span>
                          <span className="manage-status-chip-text">
                            {hasGroups ? formatProgressLabel(completionStatusMeta.label, displayCompleted, safeTotal) : "No groups assigned"}
                          </span>
                        </span>
                        {inlineLockChip && (
                          <span className="manage-item-helper manage-status-chip is-info manage-status-chip--inline-lock">
                            <span className="manage-status-chip-icon" aria-hidden="true">
                              <LockIcon />
                            </span>
                            <span className="manage-status-chip-text">Evaluations locked</span>
                          </span>
                        )}
                      </div>
                      {editEnabled && !evalLockActive && (
                        <div className="manage-item-status-row manage-meta-line manage-meta-line--status-wait">
                          <span className="manage-meta-icon manage-status-dot-icon manage-status-dot-icon--spacer" aria-hidden="true" />
                          <span className="manage-item-helper manage-status-chip manage-item-helper--editing-wait">
                            <span className="manage-status-chip-icon manage-editing-wait-spinner" aria-hidden="true">
                              <LoaderIcon />
                            </span>
                            <span className="manage-status-chip-text">Awaiting resubmission</span>
                          </span>
                        </div>
                      )}
                      {((evalLockActive && !inlineLockChip) || !hasActiveSemester) && (
                        <div className="manage-item-status-row manage-meta-line manage-meta-line--status-info">
                          <span className="manage-meta-icon manage-status-dot-icon manage-status-dot-icon--spacer" aria-hidden="true" />
                          <span className={`manage-item-helper manage-status-chip${evalLockActive ? " is-info" : " is-muted"}`}>
                            <span className="manage-status-chip-icon" aria-hidden="true">
                              {evalLockActive ? <LockIcon /> : <InfoIcon />}
                            </span>
                            <span className="manage-status-chip-text">
                              {evalLockActive ? "Evaluations locked" : lockHint}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="manage-item-sub manage-meta-line">
                      <LastActivity value={lastActivityAt} />
                    </div>
                  </div>
                  {showActionControls && (
                    <div className="manage-item-actions manage-item-actions--permissions">
                      <div className="manage-toggle-wrap">
                        <div className="manage-toggle-action-row">
                          {isPending && (
                            <span className="manage-toggle-spinner manage-toggle-spinner--left" aria-hidden="true">
                              <LoaderIcon />
                            </span>
                          )}
                          {editEnabled && !evalLockActive && (
                            <button
                              type="button"
                              className="manage-icon-btn with-label manage-cancel-edit-action"
                              disabled={!canForceClose}
                              title="Lock editing and return juror to completed state."
                              aria-label="Lock editing"
                              onClick={() => {
                                if (!canForceClose) return;
                                handleForceCloseEdit({ jurorId: j.jurorId || j.juror_id });
                              }}
                            >
                              <span aria-hidden="true"><LockIcon /></span>
                              <span className="manage-icon-btn-label">Lock Editing</span>
                            </button>
                          )}
                          {!editEnabled && isCompleted && !evalLockActive && (
                            <button
                              type="button"
                              className="manage-icon-btn with-label manage-enable-edit-action"
                              disabled={!canEnableEdit}
                              title={enableEditTitle}
                              aria-label="Unlock editing"
                              onClick={() => {
                                if (!canEnableEdit) return;
                                handleToggleEdit({
                                  jurorId: j.jurorId || j.juror_id,
                                  enabled: true,
                                });
                              }}
                            >
                              <span aria-hidden="true">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                  className="lucide lucide-lock-open-icon lucide-lock-open">
                                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                                  <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                                </svg>
                              </span>
                              <span className="manage-icon-btn-label">Unlock Editing</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {!normalizedSearch && permissionJurors.length === 0 && (
              <div className="manage-empty manage-empty-search">No jurors assigned to the selected semester.</div>
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
