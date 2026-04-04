// src/jury/components/StepperBar.jsx
// Jury flow stepper header — matches vera-premium-prototype.html dj-stepper-bar.

import { Fragment } from "react";

const STEPS = [
  { label: "Identity" },
  { label: "PIN" },
  { label: "Loading" },
  { label: "Scoring" },
  { label: "Summary" },
  { label: "Admin Impact" },
];

// Map hook step names → stepper index
const STEP_INDEX = {
  identity: 0,
  qr_showcase: 0,
  period: 0,
  semester: 0,
  pin: 1,
  pin_reveal: 1,
  locked: 1,
  progress_check: 2,
  eval: 3,
  done: 4,
};

export default function StepperBar({ step }) {
  const activeIdx = STEP_INDEX[step] ?? 0;

  return (
    <div className="dj-stepper-bar">
      {/* 1fr slot filled by CSS ::before — no React element needed */}
      <div className="dj-stepper-inner">
        {STEPS.map((s, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          const cls = isDone ? "done" : isActive ? "active" : "";
          return (
            <Fragment key={i}>
              {i > 0 && (
                <div className={`dj-stepper-connector${isDone ? " filled" : ""}`} />
              )}
              <div className={`dj-stepper-step ${cls}`}>
                <div className="dj-stepper-dot">
                  <span className="dj-step-num">{i + 1}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="dj-stepper-label">{s.label}</div>
              </div>
            </Fragment>
          );
        })}
      </div>
      <div className="dj-stepper-util-zone" />
    </div>
  );
}
