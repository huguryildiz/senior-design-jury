import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function WeightBudgetBar({ criteria, onDistribute, onAutoFill }) {
  const [autoFillOpen, setAutoFillOpen] = useState(false);
  const popoverRef = useRef(null);

  const total = criteria.reduce((s, c) => s + (c.max || 0), 0);
  const remaining = 100 - total;
  const isValid = total === 100;
  const isOver = total > 100;
  const isUnder = total < 100;

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setAutoFillOpen(false);
      }
    }
    if (autoFillOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [autoFillOpen]);

  const handleAutoFill = (criterion) => {
    if (onAutoFill) {
      onAutoFill(criterion);
    }
    setAutoFillOpen(false);
  };

  return (
    <div className={`crt-budget-card ${isOver ? "crt-budget-over" : ""}`}>
      <div className="crt-budget-header">
        <div className="crt-budget-left">
          <div className="crt-budget-label">WEIGHT BUDGET</div>
          <div className={`crt-budget-value ${isOver ? "crt-budget-value-over" : isValid ? "crt-budget-value-valid" : ""}`}>
            {total} / 100
          </div>
          <div className={`crt-budget-status ${isOver ? "crt-budget-status-over" : isUnder ? "crt-budget-status-under" : "crt-budget-status-valid"}`}>
            {isValid && "✓ Valid"}
            {isUnder && `${remaining} pts remaining`}
            {isOver && `Over by ${Math.abs(remaining)} pts`}
          </div>
        </div>
        <div className="crt-budget-actions">
          <button
            className="crt-budget-pill"
            onClick={onDistribute}
            type="button"
          >
            Distribute equally
          </button>
          <div className="crt-budget-auto-container" ref={popoverRef}>
            <button
              className="crt-budget-pill"
              onClick={() => setAutoFillOpen(!autoFillOpen)}
              type="button"
            >
              Auto-fill remaining
              <ChevronDown size={14} strokeWidth={2} />
            </button>
            {autoFillOpen && isUnder && (
              <div className="crt-budget-dropdown">
                {criteria.map((crit) => {
                  const current = crit.max || 0;
                  const newVal = current + remaining;
                  return (
                    <button
                      key={crit.id || crit.key}
                      className="crt-budget-dropdown-item"
                      onClick={() => handleAutoFill(crit)}
                      type="button"
                    >
                      <span className="crt-budget-dropdown-label">{crit.label || crit.shortLabel}</span>
                      <span className="crt-budget-dropdown-values">
                        {current} → {newVal}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="crt-budget-bar-container">
        <div className="crt-budget-bar">
          {criteria.map((crit, idx) => {
            const percentage = (crit.max / 100) * 100;
            const colors = [
              "var(--accent)",
              "#8b5cf6",
              "#ec4899",
              "#f59e0b",
              "#10b981",
              "#06b6d4",
              "#6366f1",
            ];
            const color = colors[idx % colors.length];
            return (
              <div
                key={crit.id || crit.key || idx}
                className="crt-budget-segment"
                style={{
                  flex: `${percentage}%`,
                  backgroundColor: color,
                }}
              />
            );
          })}
          {isUnder && (
            <div
              className="crt-budget-segment crt-budget-segment-remaining"
              style={{ flex: `${remaining}%` }}
            />
          )}
        </div>
      </div>

      <div className="crt-budget-legend">
        {criteria.map((crit, idx) => {
          const colors = [
            "var(--accent)",
            "#8b5cf6",
            "#ec4899",
            "#f59e0b",
            "#10b981",
            "#06b6d4",
            "#6366f1",
          ];
          const color = colors[idx % colors.length];
          return (
            <div key={crit.id || crit.key || idx} className="crt-budget-legend-item">
              <div className="crt-budget-legend-dot" style={{ backgroundColor: color }} />
              <span className="crt-budget-legend-label">{crit.shortLabel || crit.label}</span>
              <span className="crt-budget-legend-weight">{crit.max || 0} pts</span>
            </div>
          );
        })}
        {isUnder && (
          <div className="crt-budget-legend-item">
            <div className="crt-budget-legend-dot crt-budget-legend-dot-remaining" />
            <span className="crt-budget-legend-label">Remaining</span>
            <span className="crt-budget-legend-weight">{remaining} pts</span>
          </div>
        )}
      </div>
    </div>
  );
}
