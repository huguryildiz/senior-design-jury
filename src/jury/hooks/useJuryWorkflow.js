// src/jury/hooks/useJuryWorkflow.js
// ============================================================
// Owns step navigation state, workflow refs, and derived
// progress values.
//
// State:
//   step             — current step name ("identity"|"period"|"pin"|
//                      "pin_reveal"|"progress_check"|"eval"|"done")
//   current          — index into the projects array (active group)
//   confirmingSubmit — true when the submit confirmation dialog is open
//
// Refs:
//   submitPendingRef — true while a submit sequence is in flight;
//                      prevents concurrent submits.
//
// Derived (computed on every render):
//   project     — projects[current] || null
//   progressPct — % of total criteria filled (0–100)
//   allComplete — true when every project has all criteria filled
//
// Effects:
//   Auto-groupSynced upgrade: marks a project as synced if all criteria are
//   filled but the write hasn't landed yet (covers the case where a user
//   fills all fields without blurring, then navigates away).
//
// handleRequestSubmit lives in lifecycle handlers.
//
// Parameters (from orchestrator):
//   scores      — current scoring state
//   projects    — current project list
// ============================================================

import { useState, useRef } from "react";
import { isAllFilled, countFilled } from "../utils/scoreState";

// Parameters (from orchestrator):
//   scores      — current scoring state (for derived allComplete / progressPct)
//   projects    — current project list
//
// NOTE: The auto-groupSynced effect lives in the orchestrator (not here) because
// it also needs editMode from useJuryEditState, and useJuryWorkflow is called
// before useJuryEditState in the composition order. Keeping it in the orchestrator
// avoids circular hook dependency.

import { DEMO_MODE } from "@/shared/lib/demoMode";

export function useJuryWorkflow({ scores, projects, effectiveCriteria }) {
  const [step, setStep] = useState(DEMO_MODE ? "qr_showcase" : "identity");
  const [current, setCurrent] = useState(0);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);

  const submitPendingRef = useRef(false);
  // Derived values
  const criteria = effectiveCriteria || [];
  const project = projects[current] || null;
  const totalFields = projects.length * criteria.length;
  const progressPct =
    totalFields > 0
      ? Math.round((countFilled(scores, projects, criteria) / totalFields) * 100)
      : 0;
  const allComplete =
    projects.length > 0 &&
    projects.every((p) => isAllFilled(scores, p.project_id, criteria));

  return {
    step, setStep,
    current, setCurrent,
    confirmingSubmit, setConfirmingSubmit,
    submitPendingRef,
    project,
    progressPct,
    allComplete,
  };
}
