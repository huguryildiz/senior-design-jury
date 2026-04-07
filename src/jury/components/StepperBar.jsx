// src/jury/components/StepperBar.jsx
// Jury flow stepper header — matches vera-premium-prototype.html dj-stepper-bar.

import { Fragment } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { useTheme } from "@/shared/theme/ThemeProvider";

const STEPS = [
  { label: "Identity" },
  { label: "PIN" },
  { label: "Loading" },
  { label: "Scoring" },
  { label: "Summary" },
  { label: "Impact" },
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
  admin_impact: 5,
};

export default function StepperBar({ step }) {
  const activeIdx = STEP_INDEX[step] ?? 0;
  const isEvalStep = step === "eval";
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <>
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
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div className="dj-stepper-label">{s.label}</div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Theme toggle — always fixed at bottom-right, never inside the stepper grid */}
      <button
        type="button"
        className={`dj-theme-fab${isEvalStep ? " is-eval" : ""}`}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Light Mode" : "Dark Mode"}
      >
        {isDark ? <Sun strokeWidth={2} /> : <Moon strokeWidth={2} />}
      </button>
    </>
  );
}
