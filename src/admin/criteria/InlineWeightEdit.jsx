import { useState, useRef, useEffect } from "react";

export default function InlineWeightEdit({ value, color, otherTotal, onChange, disabled }) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));
  const inputRef = useRef(null);

  const remaining = 100 - otherTotal - value;

  const handleBadgeClick = () => {
    if (disabled) return;
    setEditing(true);
    setInputValue(String(value));
  };

  const handleConfirm = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
      onChange?.(parsed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      setInputValue(String(value));
      setEditing(false);
    }
  };

  const handleBlur = () => {
    handleConfirm();
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (editing) {
    const bgColor = color || "var(--accent)";
    return (
      <div className="crt-inline-weight">
        <input
          ref={inputRef}
          type="number"
          min="1"
          max="100"
          className="crt-inline-weight-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{
            borderColor: bgColor,
            boxShadow: `0 0 0 3px ${bgColor}20`,
          }}
        />
        <div className="crt-inline-weight-hint">
          {remaining > 0 ? `${remaining} pts remaining` : remaining === 0 ? "Complete" : `${Math.abs(remaining)} pts over`}
        </div>
      </div>
    );
  }

  const bgColor = color || "var(--accent)";
  const bgColorLight = `${bgColor}10`;

  return (
    <div className="crt-inline-weight">
      <div
        className="crt-inline-weight-badge"
        onClick={handleBadgeClick}
        style={{
          backgroundColor: bgColorLight,
          color: bgColor,
        }}
      >
        {value} pts
      </div>
    </div>
  );
}
