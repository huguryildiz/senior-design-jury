// src/shared/ui/GroupedCombobox.jsx
// Searchable combobox with grouped options, keyboard navigation,
// and outside-click dismiss.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";

/**
 * @param {{ id?: string, value: string|number, onChange: (v: string|number) => void, options: Array<{value: string|number, label: string, group: string, badge?: string}>, placeholder?: string, emptyMessage?: string, disabled?: boolean, ariaLabel?: string }} props
 */
export default function GroupedCombobox({
  id,
  value,
  onChange,
  options = [],
  placeholder = "Search…",
  emptyMessage = "No results found.",
  disabled = false,
  ariaLabel,
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Selected option lookup
  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)),
    [options, value],
  );

  // Filter options by query (match on group + label)
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.group.toLowerCase().includes(q) ||
        (o.badge && o.badge.toLowerCase().includes(q)),
    );
  }, [options, query]);

  // Group filtered options: [ { group, items: [option, …] }, … ]
  const groups = useMemo(() => {
    const map = new Map();
    for (const opt of filtered) {
      const key = opt.group || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(opt);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([group, items]) => ({ group, items }));
  }, [filtered]);

  // Flat list of selectable items (for keyboard nav index)
  const flatItems = useMemo(
    () => groups.flatMap((g) => g.items),
    [groups],
  );

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(-1);
  }, [query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-cb-item]");
    items[highlightIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const handleSelect = useCallback(
    (opt) => {
      onChange(opt.value);
      setQuery("");
      setIsOpen(false);
      setHighlightIndex(-1);
    },
    [onChange],
  );

  const handleClear = useCallback(
    (e) => {
      e.stopPropagation();
      onChange("");
      setQuery("");
      setHighlightIndex(-1);
    },
    [onChange],
  );

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setQuery("");
    setHighlightIndex(-1);
    // Focus the search input after render
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [disabled]);

  function handleKeyDown(e) {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleOpen();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => (i < flatItems.length - 1 ? i + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => (i > 0 ? i - 1 : flatItems.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && flatItems[highlightIndex]) {
          handleSelect(flatItems[highlightIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  }

  // Selected display (when closed with a value)
  if (selected && !isOpen) {
    return (
      <div ref={wrapRef} className="grouped-cb-wrap">
        <button
          id={id}
          type="button"
          className="grouped-cb-selected"
          onClick={handleOpen}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={false}
        >
          <span className="grouped-cb-selected-text">
            {selected.group && `${selected.group} · `}{selected.label}
          </span>
          <button
            type="button"
            className="grouped-cb-clear"
            onClick={handleClear}
            tabIndex={-1}
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        </button>
      </div>
    );
  }

  // Search/open state
  return (
    <div ref={wrapRef} className="grouped-cb-wrap">
      {isOpen ? (
        <>
          <div className="grouped-cb-input-wrap">
            <Search size={14} className="grouped-cb-search-icon" />
            <input
              ref={inputRef}
              id={id}
              type="text"
              className="grouped-cb-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              role="combobox"
              aria-expanded={isOpen}
              aria-label={ariaLabel}
            />
          </div>
          <div ref={listRef} className="grouped-cb-dropdown" role="listbox">
            {groups.length === 0 ? (
              <div className="grouped-cb-empty">{emptyMessage}</div>
            ) : (
              groups.map((g) => (
                <div key={g.group} className="grouped-cb-section">
                  {g.group && (
                    <div className="grouped-cb-group" aria-hidden="true">
                      {g.group}
                    </div>
                  )}
                  {g.items.map((opt) => {
                    const idx = flatItems.indexOf(opt);
                    return (
                      <div
                        key={opt.value}
                        data-cb-item
                        role="option"
                        aria-selected={String(opt.value) === String(value)}
                        className={`grouped-cb-item${idx === highlightIndex ? " grouped-cb-item--highlighted" : ""}`}
                        onClick={() => handleSelect(opt)}
                        onMouseEnter={() => setHighlightIndex(idx)}
                      >
                        <span className="grouped-cb-item-label">{opt.label}</span>
                        {opt.badge && (
                          <span className="grouped-cb-badge">{opt.badge}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <button
          id={id}
          type="button"
          className="grouped-cb-trigger"
          onClick={handleOpen}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={false}
        >
          <Search size={14} className="grouped-cb-search-icon" />
          <span className="grouped-cb-placeholder">{placeholder}</span>
          <ChevronDown size={14} className="grouped-cb-chevron" />
        </button>
      )}
    </div>
  );
}
