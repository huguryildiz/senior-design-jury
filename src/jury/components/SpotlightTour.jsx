// src/jury/components/SpotlightTour.jsx
// Reusable guided tour overlay — renders a spotlight hole + tooltip per step.
// Stored in sessionStorage so it only fires once per session per sessionKey.
import { useState, useEffect, useRef } from "react";
import { DEMO_MODE } from "../../shared/lib/demoMode";

const PAD = 8;

/**
 * @param {{ steps: Array<{selector:string, title:string, body:string, placement:"above"|"below"}>, sessionKey?: string, delay?: number }} props
 */
export default function SpotlightTour({ steps, sessionKey = "dj_tour_done", delay = 700 }) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [hole, setHole] = useState(null);
  const [tipPos, setTipPos] = useState({ top: 0, left: 0 });
  const doneRef = useRef(false);

  useEffect(() => {
    if (!steps || steps.length === 0) return;
    try {
      if (sessionStorage.getItem(sessionKey)) return;
    } catch {}
    const timer = setTimeout(() => {
      setActive(true);
      setStep(0);
    }, delay);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active) return;
    const s = steps[step];
    if (!s) { skip(); return; }

    const target = document.querySelector(s.selector);
    if (!target) {
      if (step < steps.length - 1) { setStep((s) => s + 1); } else { skip(); }
      return;
    }

    const rect = target.getBoundingClientRect();
    setHole({
      left: rect.left - PAD,
      top: rect.top - PAD,
      width: rect.width + PAD * 2,
      height: rect.height + PAD * 2,
    });

    const TIP_W = 248;
    const TIP_H = 170;
    const tipLeft = Math.max(12, Math.min(rect.left, window.innerWidth - TIP_W - 12));
    let tipTop;
    if (s.placement === "below") {
      tipTop = rect.bottom + PAD + 12;
    } else {
      tipTop = rect.top - TIP_H - PAD - 12;
    }
    // clamp vertically so tooltip never leaves the viewport
    tipTop = Math.max(12, Math.min(tipTop, window.innerHeight - TIP_H - 12));
    setTipPos({ top: tipTop, left: tipLeft });
  }, [active, step]); // eslint-disable-line react-hooks/exhaustive-deps

  function next() {
    if (step >= steps.length - 1) { skip(); return; }
    setStep((s) => s + 1);
  }

  function skip() {
    if (doneRef.current) return;
    doneRef.current = true;
    setActive(false);
    try { sessionStorage.setItem(sessionKey, "1"); } catch {}
  }

  if (!active || !hole) return null;

  const isLast = step === steps.length - 1;
  const s = steps[step];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        pointerEvents: "auto",
      }}
      onClick={(e) => { e.stopPropagation(); skip(); }}
    >
      {/* Dark mask with spotlight hole via box-shadow */}
      <div
        className="dj-spotlight-mask-hole"
        style={{
          position: "absolute",
          left: hole.left,
          top: hole.top,
          width: hole.width,
          height: hole.height,
          borderRadius: 10,
          pointerEvents: "none",
          transition: "all .35s cubic-bezier(0.22,1,0.36,1)",
        }}
      />

      {/* Tooltip — stopPropagation prevents root onClick (skip) from firing */}
      <div
        className="dj-spotlight-tooltip-box"
        style={{
          position: "absolute",
          top: tipPos.top,
          left: tipPos.left,
          transition: "all .35s cubic-bezier(0.22,1,0.36,1)",
          zIndex: 1,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dj-spotlight-progress">
          Step {step + 1} of {steps.length}
        </div>
        <h4 className="dj-spotlight-title">
          {s.title}
        </h4>
        <p className="dj-spotlight-body">
          {s.body}
        </p>
        <div className="dj-spotlight-actions">
          <button className="dj-spotlight-skip-btn" onClick={skip}>
            Skip tour
          </button>
          <button className="dj-spotlight-next-btn" onClick={next}>
            {isLast ? "Got it ✓" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
