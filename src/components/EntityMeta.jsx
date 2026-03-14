// src/components/EntityMeta.jsx
// ============================================================
// Canonical rendering for Group, Project Title, and Students.
// Use these components EVERYWHERE these three entities appear.
//
// Hierarchy (visual dominance):
//   1. GroupLabel   — FolderKanban icon + bold text
//   2. ProjectTitle — Presentation icon + normal weight text
//   3. StudentNames — Users icon      + italic text
//
// Usage:
//   <GroupLabel text={`Group ${groupNo}`} />
//   <ProjectTitle text={projectTitle} />
//   <StudentNames names={studentNamesArray} />
// ============================================================

import { FolderKanbanIcon, FileTextIcon, UsersRoundIcon } from "../shared/Icons";

export function GroupLabel({ text, shortText }) {
  const resolvedShortText = shortText || text;
  return (
    <span className="entity-group-label">
      <FolderKanbanIcon aria-hidden="true" />
      <span className="entity-group-text">
        <span className="group-label-full swipe-x">{text}</span>
        {resolvedShortText ? <span className="group-label-short">{resolvedShortText}</span> : null}
      </span>
    </span>
  );
}

export function ProjectTitle({ text }) {
  if (!text) return null;
  return (
    <span className="entity-project-title">
      <FileTextIcon aria-hidden="true" />
      <span className="swipe-x">{text}</span>
    </span>
  );
}

export function StudentNames({ names }) {
  if (!names || names.length === 0) return null;
  return (
    <span className="entity-student-names">
      <UsersRoundIcon aria-hidden="true" />
      <span className="swipe-x">{names.join(" · ")}</span>
    </span>
  );
}
