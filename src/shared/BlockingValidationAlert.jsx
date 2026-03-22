// src/shared/BlockingValidationAlert.jsx
import { TriangleAlertIcon } from "./Icons";

export default function BlockingValidationAlert({
  children,
  message,
  className = "",
  role = "alert",
}) {
  const content = children ?? message;
  if (!content) return null;

  return (
    <div
      className={`manage-delete-warning manage-delete-warning--danger${className ? ` ${className}` : ""}`}
      role={role}
    >
      <span className="manage-delete-warning-icon" aria-hidden="true">
        <TriangleAlertIcon />
      </span>
      <div className="manage-delete-warning-text">{content}</div>
    </div>
  );
}
