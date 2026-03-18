// src/jury/hooks/useJuryWorkflow.js
// ============================================================
// Owns step navigation state, workflow refs, and derived
// progress values.
//
// State:
//   step             — current step name ("identity"|"semester"|"pin"|
//                      "pin_reveal"|"progress_check"|"eval"|"done")
//   current          — index into the projects array (active group)
//   confirmingSubmit — true when the submit confirmation dialog is open
//
// Refs:
//   doneFiredRef     — true after auto-done has fired for this session;
//                      prevents double-triggering the submit confirmation.
//   submitPendingRef — true while a submit sequence is in flight;
//                      prevents concurrent submits.
//   justLoadedRef    — set to true by _loadSemester after seeding state;
//                      cleared on the first auto-done check so a fully-scored
//                      returning juror is not immediately thrown into submit.
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
// The auto-done effect and handleRequestSubmit live in the orchestrator to
// avoid a circular dependency (workflow needs requestSubmit, requestSubmit
// needs writeGroup from autosave, autosave needs editLockActive from editState).
//
// Parameters (from orchestrator):
//   scores      — current scoring state
//   groupSynced — current sync state
//   projects    — current project list
//   editMode    — true when re-editing after finalization
//   setGroupSynced — setter from useJuryScoring
// ============================================================

import { useState, useRef } from "react";
import { CRITERIA } from "../../config";
import { isAllFilled, countFilled } from "../utils/scoreState";

// Parameters (from orchestrator):
//   scores      — current scoring state (for derived allComplete / progressPct)
//   groupSynced — current sync state (for derived allComplete check)
//   projects    — current project list
//
// NOTE: The auto-groupSynced effect lives in the orchestrator (not here) because
// it also needs editMode from useJuryEditState, and useJuryWorkflow is called
// before useJuryEditState in the composition order. Keeping it in the orchestrator
// avoids circular hook dependency.

export function useJuryWorkflow({ scores, groupSynced, projects }) {
  const [step, setStep] = useState("identity");
  const [current, setCurrent] = useState(0);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);

  const doneFiredRef = useRef(false);
  const submitPendingRef = useRef(false);
  // justLoadedRef: set by _loadSemester after seeding scores from DB.
  // Consumed (cleared) on the first auto-done check to prevent a fully-scored
  // returning juror from being immediately thrown into the submit confirmation.
  const justLoadedRef = useRef(false);

  // Derived values
  const project = projects[current] || null;
  const totalFields = projects.length * CRITERIA.length;
  const progressPct =
    totalFields > 0
      ? Math.round((countFilled(scores, projects) / totalFields) * 100)
      : 0;
  const allComplete =
    projects.length > 0 &&
    projects.every((p) => isAllFilled(scores, p.project_id));

  return {
    step, setStep,
    current, setCurrent,
    confirmingSubmit, setConfirmingSubmit,
    doneFiredRef,
    submitPendingRef,
    justLoadedRef,
    project,
    progressPct,
    allComplete,
  };
}
