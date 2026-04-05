// src/admin/components/JurorStatusPill.jsx
// Shared status pill for juror workflow states.
// Uses global .pill classes from status-pills.css.

import {
  CheckCircle2Icon,
  SendIcon,
  Clock3Icon,
  PencilIcon,
  CircleIcon,
} from "@/shared/ui/Icons";

export default function JurorStatusPill({ status }) {
  if (status === "completed") {
    return (
      <span className="pill pill-completed">
        <CheckCircle2Icon size={12} />
        Completed
      </span>
    );
  }
  if (status === "ready_to_submit") {
    return (
      <span className="pill pill-ready">
        <SendIcon size={12} />
        Ready to Submit
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="pill pill-progress">
        <Clock3Icon size={12} />
        In Progress
      </span>
    );
  }
  if (status === "editing") {
    return (
      <span className="pill pill-editing">
        <PencilIcon size={12} />
        Editing
      </span>
    );
  }
  return (
    <span className="pill pill-not-started">
      <CircleIcon size={12} />
      Not Started
    </span>
  );
}
