// src/components/EntityMeta.jsx
// ============================================================
// Canonical rendering for Group, Project Title, and Students.
// Use these components EVERYWHERE these three entities appear.
//
// Hierarchy (visual dominance):
//   1. GroupLabel   — FolderKanban icon + bold text
//   2. ProjectTitle — Presentation icon + normal weight text
//   3. StudentNames — avatar + initials + full names
//
// Usage:
//   <GroupLabel text={`Group ${groupNo}`} />
//   <ProjectTitle text={projectTitle} />
//   <StudentNames names={studentNamesArray} />
// ============================================================

import { FolderKanbanIcon, FileTextIcon } from "./Icons";

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

function normalizeNames(names) {
  if (!names) return [];
  if (Array.isArray(names)) {
    return names
      .map((entry) => (entry?.name ?? entry ?? "").toString().trim())
      .filter(Boolean);
  }
  return String(names)
    .split(/[;,\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getInitial(name) {
  return (name || "").trim().charAt(0).toLocaleUpperCase("tr-TR") || "?";
}

export function TeamMembersInline({ names, className = "" }) {
  const list = normalizeNames(names);
  if (list.length === 0) return null;

  return (
    <span className={`team-members-inline ${className}`.trim()}>
      {list.map((name, index) => (
        <span key={`${name}-${index}`} className="team-member-chip">
          <span className="team-member-avatar" aria-hidden="true">{getInitial(name)}</span>
          <span className="team-member-name" title={name}>{name}</span>
        </span>
      ))}
    </span>
  );
}

export function StudentNames({ names }) {
  return <TeamMembersInline names={names} className="entity-student-names" />;
}
