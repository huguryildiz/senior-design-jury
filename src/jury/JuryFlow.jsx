// src/jury/JuryFlow.jsx
// ============================================================
// Main jury flow router — orchestrates all jury evaluation steps
// with dark glassmorphism design matching vera-premium-prototype.html
// ============================================================

import { useState } from "react";
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

export default function JuryFlow({ onBack }) {
  const state = useJuryState();
  const [loaderActive, setLoaderActive] = useState(false);

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

  return (
    <div className="dj-screen">
      <StepperBar step={state.step} />
      <div className="dj-step active">
        {CurrentStep ? (
          <CurrentStep
            state={state}
            onBack={onBack}
            setLoaderActive={setLoaderActive}
          />
        ) : (
          <div>Unknown step: {state.step}</div>
        )}
      </div>

      {loaderActive && <MinimalLoaderOverlay />}
    </div>
  );
}
