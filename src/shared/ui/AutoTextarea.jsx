// src/shared/ui/AutoTextarea.jsx
// Textarea that grows/shrinks with its content — no drag handle.

import { useRef, useEffect, forwardRef } from "react";

const AutoTextarea = forwardRef(function AutoTextarea({ value, onChange, className, ...props }, externalRef) {
  const innerRef = useRef(null);

  // Keep a unified ref so the caller's ref also works
  function setRefs(el) {
    innerRef.current = el;
    if (typeof externalRef === "function") externalRef(el);
    else if (externalRef) externalRef.current = el;
  }

  // Resize on every value change and on mount
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);

  return (
    <textarea
      ref={setRefs}
      value={value}
      onChange={onChange}
      className={className}
      {...props}
    />
  );
});

export default AutoTextarea;
