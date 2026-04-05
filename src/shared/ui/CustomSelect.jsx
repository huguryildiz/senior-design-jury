import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function CustomSelect({
  id,
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  disabled = false,
  ariaLabel,
  className = "",
  wrapperClassName = "",
  triggerClassName = "",
  menuClassName = "",
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selectedLabel = useMemo(() => {
    const selected = options.find((opt) => String(opt.value) === String(value));
    return selected?.label ?? placeholder;
  }, [options, value, placeholder]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (rootRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function handleEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`custom-select${compact ? " compact" : ""}${disabled ? " disabled" : ""}${wrapperClassName ? ` ${wrapperClassName}` : ""}`}
    >
      <button
        id={id}
        type="button"
        className={`filter-dropdown-trigger custom-select-trigger${open ? " open" : ""}${className ? ` ${className}` : ""}${triggerClassName ? ` ${triggerClassName}` : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="custom-select-label">{selectedLabel}</span>
        <ChevronDown size={16} />
      </button>

      <div
        className={`filter-dropdown-menu custom-select-menu${open ? " show" : ""}${menuClassName ? ` ${menuClassName}` : ""}`}
        role="listbox"
        aria-label={ariaLabel}
      >
        {options.map((opt) => {
          const optValue = String(opt.value);
          const selected = String(value) === optValue;
          return (
            <div
              key={optValue}
              role="option"
              aria-selected={selected}
              className={`filter-dropdown-option${selected ? " selected" : ""}${opt.disabled ? " disabled" : ""}`}
              onClick={() => {
                if (opt.disabled) return;
                onChange?.(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
