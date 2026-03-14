// src/jury/SheetsProgressDialog.jsx
// ============================================================
// Modal dialog shown after PIN verification.
//
// Always displayed — Supabase is the master source of truth.
// Shows how many groups have been scored and lets the juror
// decide whether to continue (resume) or start fresh.
// Both actions advance to the eval step; scores are always
// seeded from the database regardless of which button is used.
//
// Props:
//   progress  { rows, filledCount, totalCount, allSubmitted, editAllowed }
//   projects  [{ project_id, group_no, project_title, group_students }]
//   onConfirm () → advance to eval (used when hasData)
//   onFresh   () → advance to eval (used when no prior data)
// ============================================================

import { useEffect, useRef, useState } from "react";
import {
  BadgeCheckIcon,
  SaveIcon,
  ChevronDownIcon,
  LoaderIcon,
  HistoryIcon,
  InfoIcon,
} from "../shared/Icons";
import { jurorStatusMeta } from "../admin/scoreHelpers";
import MinimalLoaderOverlay from "../shared/MinimalLoaderOverlay";
import { formatTs as formatShortTs } from "../admin/utils";
import { GroupLabel, ProjectTitle, StudentNames } from "../components/EntityMeta";

// Status label + colour for each row returned by myscores.
function rowStatusChip(status) {
  const key =
    status === "scored" ||
    status === "group_submitted" ||
    status === "all_submitted" ||
    status === "submitted"
      ? "scored"
      : (status === "partial" || status === "in_progress" ? "partial" : "empty");
  const meta = jurorStatusMeta[key] ?? jurorStatusMeta.empty;
  const Icon = meta.icon;
  return { label: meta.label, tone: key, colorClass: meta.colorClass, icon: <Icon /> };
}

function jurorStatusChip({ isEditing, allSubmitted, filledCount, totalCount, hasData }) {
  const key = isEditing
    ? "editing"
    : allSubmitted
      ? "completed"
      : (totalCount > 0 && filledCount >= totalCount)
        ? "ready_to_submit"
        : hasData
          ? "in_progress"
          : "not_started";
  const meta = jurorStatusMeta[key] ?? jurorStatusMeta.not_started;
  const Icon = meta.icon;
  return { label: meta.label, tone: key, colorClass: meta.colorClass, icon: <Icon /> };
}

export default function SheetsProgressDialog({ progress, projects, onConfirm, onFresh }) {
  if (!progress) return null;

  // Loading sentinel — shown while fetchMyScores is in flight.
  const suppress = typeof document !== "undefined" &&
    document.body?.classList?.contains("auth-overlay-open");
  const showLoader = progress.loading && !suppress;

  const {
    rows,
    filledCount,
    totalCount,
    criteriaFilledCount,
    criteriaTotalCount,
    allSubmitted,
    editAllowed,
  } = progress;
  const progressPct = (criteriaTotalCount || 0) > 0
    ? Math.round(((criteriaFilledCount || 0) / criteriaTotalCount) * 100)
    : (totalCount ? Math.round((filledCount / totalCount) * 100) : 0);
  const projectGroupLabel = totalCount === 1 ? "project group" : "project groups";
  const progressText = totalCount === 0
    ? "No project groups available"
    : `${filledCount} of ${totalCount} ${projectGroupLabel} scored`;
  const barColor =
    progressPct === 100 ? "#22c55e" :
    progressPct > 66    ? "#84cc16" :
    progressPct > 33    ? "#eab308" :
    progressPct > 0     ? "#f97316" : "#e2e8f0";
  const hasData = rows && rows.length > 0;
  const projectList = Array.isArray(projects) ? projects : [];
  const [openGroup, setOpenGroup] = useState(null);
  const overlayRef = useRef(null);
  const listRef = useRef(null);
  const isEditing = hasData && rows.some((r) => r.editingFlag === "editing");
  const jurorChip = jurorStatusChip({ isEditing, allSubmitted, filledCount, totalCount, hasData });

  const toggleGroup = (groupId) => {
    setOpenGroup((prev) => (prev === groupId ? null : groupId));
  };

  useEffect(() => {
    overlayRef.current?.scrollTo?.(0, 0);
  }, [showLoader, progress?.loading, hasData]);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll(".spd-row-details .swipe-x"));
    if (!targets.length) return;

    const updateHint = (el) => {
      const hasOverflow = el.scrollWidth > el.clientWidth + 1;
      el.classList.toggle("is-overflowing", hasOverflow);
      el.classList.toggle("is-scrolled", el.scrollLeft > 0);
    };
    const handleScroll = (e) => updateHint(e.currentTarget);

    targets.forEach((el) => {
      el.scrollLeft = 0;
      updateHint(el);
      el.addEventListener("scroll", handleScroll, { passive: true });
      el.addEventListener("pointerenter", handleScroll);
      el.addEventListener("touchstart", handleScroll, { passive: true });
    });

    const rafId = requestAnimationFrame(() => {
      targets.forEach(updateHint);
    });
    const timerId = setTimeout(() => {
      targets.forEach(updateHint);
    }, 220);

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        targets.forEach(updateHint);
      });
      targets.forEach((el) => ro.observe(el));
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      targets.forEach((el) => {
        el.removeEventListener("scroll", handleScroll);
        el.removeEventListener("pointerenter", handleScroll);
        el.removeEventListener("touchstart", handleScroll);
      });
      ro?.disconnect();
    };
  }, [projectList, openGroup, rows]);

  return (
    <>
      <MinimalLoaderOverlay open={showLoader} minDuration={400} />
      {!progress.loading && (
        <div className="premium-overlay spd-overlay" ref={overlayRef}>
          <div className="premium-card spd-card">

        {/* Header */}
        <div className="spd-header">
          <div className="spd-header-left">
            <div className="spd-icon spd-icon-state" aria-hidden="true">
              {allSubmitted ? (
                <BadgeCheckIcon />
              ) : hasData ? (
                <SaveIcon />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-save-icon lucide-save" aria-hidden="true">
                  <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                  <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
                  <path d="M7 3v4a1 1 0 0 0 1 1h7" />
                </svg>
              )}
            </div>
            <div className="spd-header-main">
              <div className="spd-title" title={allSubmitted
                ? "All evaluations submitted"
                : hasData
                ? "Previous progress found"
                : "No evaluations found"}>
                {allSubmitted
                  ? "All evaluations submitted"
                  : hasData
                  ? "Previous progress found"
                  : "No evaluations found"}
              </div>
              <div className="spd-sub-row">
                <div className="spd-sub" title={progressText}>
                  {progressText}
                </div>
                <div className="spd-header-meta">
                  <span className={`status-badge ${jurorChip.colorClass} spd-juror-pill spd-pill-${jurorChip.tone}`}>
                    {jurorChip.icon}
                    {jurorChip.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="spd-progress-wrap spd-progress-full">
          <span className="spd-progress-icon" aria-hidden="true">
            <LoaderIcon />
          </span>
          <div className="spd-progress-bar-bg">
            <div
              className="spd-progress-bar-fill"
              style={{ width: `${progressPct}%`, background: barColor }}
            />
          </div>
          <span className="spd-progress-label">{progressPct}%</span>
        </div>

        {/* Per-group status list */}
        <div className="spd-list" ref={listRef}>
          {hasData ? (
            <>
              <div className="spd-table-head" aria-hidden="true">
                <span className="spd-table-head-group">Group</span>
                <span className="spd-table-head-time">Last Update</span>
                <span className="spd-table-head-status">Status</span>
                <span className="spd-table-head-score">Score</span>
              </div>
              {projectList.map((p) => {
              const row = rows.find((r) => r.projectId === p.project_id);
              const chip = rowStatusChip(row?.scoreStatus || row?.status);
              const total = row?.total
                ?? (chip.tone === "partial" && Number.isFinite(row?.partialTotal) ? row.partialTotal : "—");
              const timestamp = formatShortTs(row?.timestamp || "—");
              const isOpen = openGroup === p.project_id;
                  const name = `Group ${p.group_no}`;
              const students = p.group_students
                ? p.group_students.split(",").map((s) => s.trim()).filter(Boolean)
                : [];
              const hasDetails = Boolean(p.project_title) || students.length > 0;

              return (
                <div key={p.project_id} className="spd-row-wrap">
                  <div className="spd-row">
                    <button
                      className="spd-row-left group-accordion-header"
                      type="button"
                      onClick={() => { if (hasDetails) toggleGroup(p.project_id); }}
                      aria-expanded={isOpen}
                      style={{ cursor: hasDetails ? "pointer" : "default" }}
                    >
                      <span className="spd-row-header-line">
                        <span className="spd-row-name">
                          <GroupLabel text={name} shortText={`Group ${p.group_no}`} />
                          {hasDetails && (
                            <span className={`group-accordion-chevron${isOpen ? " open" : ""}`} aria-hidden="true">
                              <ChevronDownIcon />
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                    <span className="spd-row-ts" title={timestamp}>
                      <span className="spd-row-ts-icon" aria-hidden="true"><HistoryIcon /></span>
                      <span className="spd-row-ts-text">{timestamp}</span>
                    </span>
                    <span className={`status-badge ${chip.colorClass} spd-row-pill`}>
                      {chip.icon}
                      {chip.label}
                    </span>
                    <span className={`spd-row-score ${chip.tone}`}>{total !== "—" ? `${total}` : "—"}</span>
                  </div>

                  {hasDetails && (
                    <div className={`group-accordion-panel${isOpen ? " open" : ""}`}>
                      <div className="group-accordion-panel-inner spd-row-details">
                        {p.project_title && (
                          <div className="spd-detail">
                            <ProjectTitle text={p.project_title} />
                          </div>
                        )}
                        {students.length > 0 && (
                          <div className="spd-detail">
                            <StudentNames names={students} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </>
          ) : (
            <div className="premium-info-strip spd-empty">
              <span className="info-strip-icon" aria-hidden="true">
                <InfoIcon />
              </span>
              <span>You have not started any evaluations yet.</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="spd-actions">
          <button className="premium-btn-primary" onClick={hasData ? onConfirm : onFresh}>
            {allSubmitted && editAllowed && (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil-icon lucide-pencil" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
            )}
            {allSubmitted
              ? (editAllowed ? "Edit My Scores" : "Done")
              : hasData ? "Resume Evaluation →" : "Start Evaluation →"}
          </button>
        </div>

          </div>
        </div>
      )}
    </>
  );
}
