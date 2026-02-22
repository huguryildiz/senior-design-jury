// src/JuryForm.jsx
// ============================================================
// Thin orchestrator for the jury evaluation flow.
// All state lives in useJuryState; rendering is split into:
//   InfoStep  → identity + cloud draft detection + PIN gate
//   PinStep   → PIN entry / first-time PIN display
//   EvalStep  → scoring form per group
//   DoneStep  → thank-you + edit option
// ============================================================

import useJuryState from "./jury/useJuryState";
import InfoStep     from "./jury/InfoStep";
import PinStep      from "./jury/PinStep";
import EvalStep     from "./jury/EvalStep";
import DoneStep     from "./jury/DoneStep";
import { fetchMyScores } from "./shared/api";

export default function JuryForm({ onBack, startAtEval = false }) {
  const state = useJuryState({ startAtEval });

  const {
    step, setStep,
    juryName, setJuryName,
    juryDept, setJuryDept,
    current, setCurrent,
    scores, comments, touched,
    groupSynced, editMode,
    progressPct, allComplete,
    doneScores, doneComments,
    cloudDraft, cloudChecking, alreadySubmitted,
    saveStatus,
    pinStep, pinError, newPin, attemptsLeft,
    handleScore, handleScoreBlur, handleCommentChange,
    handleStart,
    handleResumeCloud,
    handleStartFresh,
    handleResubmit,
    handleEditScores,
    handleFinalSubmit,
    handlePinSubmit,
    saveCloudDraft,
    resetAll,
  } = state;

  // ── Done screen ───────────────────────────────────────────
  if (step === "done") {
    return (
      <DoneStep
        doneScores={doneScores}
        doneComments={doneComments}
        scores={scores}
        comments={comments}
        onEditScores={handleEditScores}
        onBack={() => { resetAll(); onBack(); }}
      />
    );
  }

  // ── PIN screen ────────────────────────────────────────────
  if (step === "pin") {
    return (
      <PinStep
        pinStep={pinStep}
        pinError={pinError}
        newPin={newPin}
        attemptsLeft={attemptsLeft}
        juryName={juryName}
        juryDept={juryDept}
        onPinSubmit={handlePinSubmit}
        // After viewing new PIN, proceed directly to eval
        onPinAcknowledge={() => {
          setStep("eval");
        }}
        onBack={() => setStep("info")}
      />
    );
  }

  // ── Eval screen ───────────────────────────────────────────
  if (step === "eval") {
    return (
      <EvalStep
        juryName={juryName}
        current={current}
        setCurrent={setCurrent}
        scores={scores}
        comments={comments}
        touched={touched}
        groupSynced={groupSynced}
        editMode={editMode}
        progressPct={progressPct}
        allComplete={allComplete}
        saveStatus={saveStatus}
        handleScore={handleScore}
        handleScoreBlur={handleScoreBlur}
        handleCommentChange={handleCommentChange}
        handleFinalSubmit={handleFinalSubmit}
        saveCloudDraft={saveCloudDraft}
        onBack={() => setStep("info")}
        onGoHome={() => { saveCloudDraft(); onBack(); }}
      />
    );
  }

  // ── Info screen (default) ─────────────────────────────────
  return (
    <InfoStep
      juryName={juryName}
      setJuryName={setJuryName}
      juryDept={juryDept}
      setJuryDept={setJuryDept}
      cloudChecking={cloudChecking}
      cloudDraft={cloudDraft}
      alreadySubmitted={alreadySubmitted}
      scores={scores}
      onStart={handleStart}
      onResumeCloud={handleResumeCloud}
      onStartFresh={handleStartFresh}
      onResubmit={handleResubmit}
      onViewScores={async () => {
        const rows = await fetchMyScores(juryName.trim(), juryDept.trim());
        if (rows && rows.length) {
          const { rowsToState } = await import("./jury/useJuryState");
          const st = rowsToState(rows);
          state.setDoneScores(st.scores);
          state.setDoneComments(st.comments);
        }
        setStep("done");
      }}
      onBack={onBack}
    />
  );
}
