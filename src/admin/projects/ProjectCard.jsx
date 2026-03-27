// src/admin/projects/ProjectCard.jsx
// ============================================================
// Single project card used inside ManageProjectsPanel's list.
// ============================================================

import { CalendarClockIcon, FileTextIcon, PencilIcon, UsersLucideIcon } from "../../shared/Icons";
import DangerIconButton from "../../components/admin/DangerIconButton";
import Tooltip from "../../shared/Tooltip";
import LastActivity from "../LastActivity";
import { splitStudents, parseStudentInputList } from "./projectHelpers";

export default function ProjectCard({
  project: p,
  index: idx,
  semesterName,
  isDemoMode = false,
  onMetaScroll,
  onEdit,
  onDelete,
}) {
  const students = splitStudents(p.group_students);
  const groupLabel = Number.isFinite(Number(p.group_no)) && Number(p.group_no) > 0
    ? Number(p.group_no)
    : idx + 1;
  const lastActivity = p.updated_at || p.updatedAt || null;

  return (
    <div key={p.id || `${p.group_no}-${p.project_title}`} className="manage-item manage-item--project">
      <div>
        <div className="manage-item-title">Group {groupLabel}</div>
        <div className="manage-item-sub manage-meta-line">
          <span className="manage-meta-icon" aria-hidden="true"><FileTextIcon /></span>
          <span className="manage-meta-scroll" onScroll={onMetaScroll}>{p.project_title || "\u2014"}</span>
        </div>
        <div className="manage-item-sub manage-meta-line">
          <span className="manage-meta-icon" aria-hidden="true"><UsersLucideIcon /></span>
          <span className="manage-students manage-meta-scroll" onScroll={onMetaScroll}>
            {students.length
              ? students.map((name, sidx) => (
                <span key={`${p.id}-student-${sidx}`} className="manage-student">
                  <em>{name}</em>{sidx < students.length - 1 ? " \u00B7 " : ""}
                </span>
              ))
              : "\u2014"}
          </span>
        </div>
        <div className="manage-item-sub manage-meta-line manage-meta-line--semester-chip">
          <span className="manage-meta-icon manage-semester-date-icon" aria-hidden="true">
            <CalendarClockIcon />
          </span>
          <span className="manage-item-semester-chip">{semesterName || "\u2014"}</span>
        </div>
        <div className="manage-item-sub manage-meta-line">
          <LastActivity value={lastActivity} />
        </div>
        <div className="manage-card-actions-bar">
          <Tooltip text="Edit group">
            <button
              className="manage-icon-btn with-label"
              type="button"
              aria-label={`Edit Group ${groupLabel}`}
              onClick={() => onEdit(p, groupLabel)}
            >
              <PencilIcon />
              <span className="manage-icon-btn-label">Edit</span>
            </button>
          </Tooltip>
          <DangerIconButton
            ariaLabel={`Delete Group ${groupLabel}`}
            title="Delete group"
            showLabel={false}
            onClick={() => onDelete(p, groupLabel)}
          />
        </div>
      </div>
    </div>
  );
}
