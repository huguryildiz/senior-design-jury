// src/shared/AutoGrow.jsx
import { useEffect, useRef } from "react";

/**
 * A multiline textarea that automatically grows in height as content is added.
 * Also supports manual vertical resizing by the user.
 */
export default function AutoGrow({
  value,
  onChange,
  onBlur,
  disabled,
  placeholder,
  ariaLabel,
  hasError,
  className = "",
  rows = 3
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    // Reset height to auto to correctly calculate scrollHeight
    ref.current.style.height = "auto";
    // Set height to scrollHeight to wrap content
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`manage-textarea${hasError ? " is-danger" : ""}${className ? " " + className : ""}`}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel}
      style={{ resize: "vertical" }}
    />
  );
}
