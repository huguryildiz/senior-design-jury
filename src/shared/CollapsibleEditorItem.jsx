// src/shared/CollapsibleEditorItem.jsx
// ============================================================
// Shared collapsible shell for dense admin editor rows/cards.
// Keeps the toggle separate from any drag or delete actions.
// ============================================================

import { useId } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "./Icons";

export default function CollapsibleEditorItem({
  open,
  onToggle,
  summaryLabel,
  summary,
  children,
  className = "",
  toolbar = null,
  toolbarClassName = "",
  summaryClassName = "",
  bodyClassName = "",
}) {
  const bodyId = useId();

  return (
    <div className={`manage-collapsible${open ? " is-open" : " is-collapsed"}${className ? ` ${className}` : ""}`}>
      {toolbar && (
        <div className={`manage-collapsible-toolbar${toolbarClassName ? ` ${toolbarClassName}` : ""}`}>
          {toolbar}
        </div>
      )}
      <button
        type="button"
        className={`manage-collapsible-summary${summaryClassName ? ` ${summaryClassName}` : ""}`}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        aria-label={summaryLabel}
      >
        <div className="manage-collapsible-summary-content">
          {summary}
        </div>
        <span className="manage-collapsible-summary-toggle" aria-hidden="true">
          {open ? (
            <ChevronUpIcon className="manage-collapsible-toggle-icon" />
          ) : (
            <ChevronDownIcon className="manage-collapsible-toggle-icon" />
          )}
        </span>
      </button>
      {open && (
        <div
          id={bodyId}
          className={`manage-collapsible-body${bodyClassName ? ` ${bodyClassName}` : ""}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
