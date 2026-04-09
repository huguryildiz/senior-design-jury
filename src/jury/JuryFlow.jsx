// src/jury/JuryFlow.jsx
// ============================================================
// Main jury flow router — orchestrates all jury evaluation steps
// with dark glassmorphism design matching vera-premium-prototype.html
// ============================================================

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useJuryState from "./useJuryState";
import IdentityStep from "./steps/IdentityStep";
import SemesterStep from "./steps/SemesterStep";
import PinStep from "./steps/PinStep";
import PinRevealStep from "./steps/PinRevealStep";
import LockedStep from "./steps/LockedStep";
import ProgressStep from "./steps/ProgressStep";
import EvalStep from "./steps/EvalStep";
import DoneStep from "./steps/DoneStep";
import MinimalLoaderOverlay from "@/shared/ui/MinimalLoaderOverlay";
import StepperBar from "./components/StepperBar";

// Step name → URL path segment
const STEP_TO_PATH = {
  identity: "identity",
  period: "period",
  semester: "period",
  pin: "pin",
  pin_reveal: "pin-reveal",
  locked: "locked",
  progress_check: "progress",
  eval: "evaluate",
  done: "complete",
};

export default function JuryFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = useJuryState();
  const [loaderActive, setLoaderActive] = useState(false);

  // Keep URL in sync with current step
  useEffect(() => {
    const seg = STEP_TO_PATH[state.step];
    const juryBase = location.pathname.startsWith("/demo/jury") ? "/demo/jury" : "/jury";
    if (seg && location.pathname !== `${juryBase}/${seg}`) {
      navigate(`${juryBase}/${seg}`, { replace: true });
    }
  }, [state.step]); // eslint-disable-line react-hooks/exhaustive-deps

  const onBack = () => navigate("/", { replace: true });

  // Map step names to components
  // "period" is the hook-internal name for semester selection
  // "qr_showcase" (demo only) redirects to identity — step deleted per Phase 13 spec
  const stepComponents = {
    identity: IdentityStep,
    period: SemesterStep,      // hook sets "period", not "semester"
    semester: SemesterStep,    // kept as alias
    qr_showcase: IdentityStep, // demo-mode init; QRShowcaseStep deleted, fall through to identity
    pin: PinStep,
    pin_reveal: PinRevealStep,
    locked: LockedStep,
    progress_check: ProgressStep,
    eval: EvalStep,
    done: DoneStep,
  };

  const CurrentStep = stepComponents[state.step];

  // During session hydration (page refresh with active session), loadingState is non-null
  // while step is still "identity" — show loader to avoid a flash of the identity form.
  const isHydrating = state.loadingState && state.step === "identity";

  return (
    <div className="dj-screen">
      <StepperBar step={state.step} />
      <div className="dj-step active">
        {!isHydrating && CurrentStep ? (
          <CurrentStep
            state={state}
            onBack={onBack}
            setLoaderActive={setLoaderActive}
          />
        ) : !isHydrating ? (
          <div>Unknown step: {state.step}</div>
        ) : null}
      </div>

      {(loaderActive || isHydrating) && <MinimalLoaderOverlay />}
    </div>
  );
}
