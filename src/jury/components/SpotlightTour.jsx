// src/jury/components/SpotlightTour.jsx
// 3-step guided tour for first-time jurors entering the eval screen.
// Matches prototype djSpotlightSteps exactly.
// Stored in sessionStorage so it only fires once per session.
import { useState, useEffect, useRef } from "react";
import { DEMO_MODE } from "../../shared/lib/demoMode";

const SESSION_KEY = "dj_tour_done";

const STEPS = [
  {
    selector: ".dj-rubric-btn",
    title: "Rubric Guide",
    body: "Click here to open the rubric bottom sheet with detailed scoring criteria and band descriptions.",
    placement: "below",
  },
  {
    selector: ".dj-score-input",
    title: "Enter Your Score",
    body: "Type a score here. The bar animates in real-time and auto-saves after each entry.",
    placement: "above",
  },
  {
    selector: ".dj-group-bar",
    title: "Group Navigation",
    body: "Use the arrows to navigate between groups, or tap the arrows to move forward and backward.",
    placement: "below",
  },
];

const PAD = 8;

export default function SpotlightTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [hole, setHole] = useState(null);
  const [tipPos, setTipPos] = useState({ top: 0, left: 0 });
  const doneRef = useRef(false);

  useEffect(() => {
    if (!DEMO_MODE) {
      try {
        if (sessionStorage.getItem(SESSION_KEY)) return;
      } catch {}
    }
    const timer = setTimeout(() => {
      setActive(true);
      setStep(0);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!active) return;
    const s = STEPS[step];
    if (!s) { skip(); return; }

    const target = document.querySelector(s.selector);
    if (!target) { skip(); return; }

    const rect = target.getBoundingClientRect();
    setHole({
      left: rect.left - PAD,
      top: rect.top - PAD,
      width: rect.width + PAD * 2,
      height: rect.height + PAD * 2,
    });

    const tipLeft = Math.max(12, Math.min(rect.left, window.innerWidth - 260));
    if (s.placement === "below") {
      setTipPos({ top: rect.bottom + PAD + 12, left: tipLeft });
    } else {
      setTipPos({ top: Math.max(12, rect.top - 160), left: tipLeft });
    }
  }, [active, step]); // eslint-disable-line react-hooks/exhaustive-deps

  function next() {
    if (step >= STEPS.length - 1) { skip(); return; }
    setStep((s) => s + 1);
  }

  function skip() {
    if (doneRef.current) return;
    doneRef.current = true;
    setActive(false);
    if (!DEMO_MODE) {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
    }
  }

  if (!active || !hole) return null;

  const isLast = step === STEPS.length - 1;
  const s = STEPS[step];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        pointerEvents: "auto",
      }}
    >
      {/* Dark mask with spotlight hole via box-shadow */}
      <div
        style={{
          position: "absolute",
          left: hole.left,
          top: hole.top,
          width: hole.width,
          height: hole.height,
          borderRadius: 10,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          pointerEvents: "none",
          transition: "all .35s cubic-bezier(0.22,1,0.36,1)",
        }}
      />

      {/* Tooltip */}
      <div
        className="dj-spotlight-tooltip-box"
        style={{
          position: "absolute",
          top: tipPos.top,
          left: tipPos.left,
          transition: "all .35s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div className="dj-spotlight-progress">
          Step {step + 1} of {STEPS.length}
        </div>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>
          {s.title}
        </h4>
        <p style={{ fontSize: "11.5px", color: "#94a3b8", lineHeight: 1.55, marginBottom: 12 }}>
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

      {/* Invisible full-screen click layer to skip */}
      <div style={{ position: "absolute", inset: 0 }} onClick={skip} />
    </div>
  );
}
