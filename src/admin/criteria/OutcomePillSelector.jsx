// src/admin/criteria/OutcomePillSelector.jsx

import Tooltip from "@/shared/ui/Tooltip";

import { Icon } from "lucide-react";

function getOutcomeTooltipContent(code, outcome) {
  const descEn = String(outcome?.desc_en ?? "").trim();
  const descTr = String(outcome?.desc_tr ?? "").trim();
  return (
    <span className="criteria-tooltip-content">
      <span className="criteria-tooltip-line criteria-tooltip-line--title">{code}</span>
      {descEn && (
        <span className="criteria-tooltip-line criteria-tooltip-line--desc">
          {"\uD83C\uDDEC\uD83C\uDDE7"} {descEn}
        </span>
      )}
      {descTr && (
        <span className="criteria-tooltip-line criteria-tooltip-line--desc">
          {"\uD83C\uDDF9\uD83C\uDDF7"} {descTr}
        </span>
      )}
    </span>
  );
}

function getOutcomeTooltipLabel(code, outcome) {
  const descEn = String(outcome?.desc_en ?? "").trim();
  const descTr = String(outcome?.desc_tr ?? "").trim();
  const parts = [code];
  if (descEn) parts.push(`\uD83C\uDDEC\uD83C\uDDE7 ${descEn}`);
  if (descTr) parts.push(`\uD83C\uDDF9\uD83C\uDDF7 ${descTr}`);
  return parts.join(" \u2014 ");
}

export { getOutcomeTooltipContent, getOutcomeTooltipLabel };

export default function OutcomePillSelector({ selected, outcomeConfig, onChange, disabled }) {
  const options = outcomeConfig || [];
  const outcomeByCode = new Map(options.map((o) => [o.code, o]));

  const validSelected = selected.filter((code) => outcomeByCode.has(code));

  if (options.length === 0) {
    return (
      <span className="crt-outcome-empty">
        No outcomes defined yet.
      </span>
    );
  }

  const toggle = (code) => {
    if (disabled) return;
    const next = selected.includes(code)
      ? selected.filter((c) => c !== code)
      : [...selected, code];
    onChange(next);
  };

  return (
    <div className="crt-outcome-selector">
      <div className="crt-outcome-selector-label">Select outcomes to map</div>
      <div className="crt-outcome-pills">
        {options.map((o) => {
          const isSelected = selected.includes(o.code);
          return (
            <Tooltip
              key={o.code}
              text={getOutcomeTooltipContent(o.code, outcomeByCode.get(o.code))}
            >
              <span
                className={`crt-outcome-pill ${isSelected ? "pill-selected" : "pill-available"}`}
                onClick={() => toggle(o.code)}
                tabIndex={disabled ? -1 : 0}
                role="checkbox"
                aria-checked={isSelected}
                aria-label={getOutcomeTooltipLabel(o.code, outcomeByCode.get(o.code))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(o.code);
                  }
                }}
              >
                {isSelected && (
                  <Icon
                    iconNode={[]}
                    className="pill-check"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true">
                    <polyline points="2,6.5 5,9.5 10,3" />
                  </Icon>
                )}
                <span className="pill-code">{o.code}</span>
              </span>
            </Tooltip>
          );
        })}
      </div>
      {validSelected.length > 0 && (
        <>
          <div className="crt-outcome-selector-label">Mapped ({validSelected.length})</div>
          <div className="crt-outcome-selected-detail">
            {validSelected.map((code) => (
              <div className="crt-outcome-selected-row" key={code}>
                <span className="sel-code">{code}</span>
                <span className="sel-text">{outcomeByCode.get(code)?.desc_en || ""}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
