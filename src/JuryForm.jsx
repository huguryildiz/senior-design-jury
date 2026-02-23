// src/JuryForm.jsx
// ============================================================
// Thin orchestrator for the jury evaluation flow.
// All state and business logic lives in useJuryState.
//
// Step routing:
//   "info"  → InfoStep  (identity entry + cloud draft detection)
//   "pin"   → PinStep   (PIN entry / first-time PIN display)
//   "eval"  → EvalStep  (scoring form)
//   "done"  → DoneStep  (confirmation + edit option)
// ============================================================

import useJuryState  from "./jury/useJuryState";
import InfoStep      from "./jury/InfoStep";
import PinStep       from "./jury/PinStep";
import EvalStep      from "./jury/EvalStep";
import DoneStep      from "./jury/DoneStep";
import "./styles/jury.css";

export default function JuryForm({ onBack }) {
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
    handlePinAcknowledge,
    saveCloudDraft,
    resetAll,
  } = useJuryState();

  // ── Done ──────────────────────────────────────────────────
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

  // ── PIN ───────────────────────────────────────────────────
  if (step === "pin") {
    return (
      <PinStep
        pinStep={pinStep}
        pinError={pinError}
        newPin={newPin}
        attemptsLeft={attemptsLeft}
        juryName={juryName}
        onPinSubmit={handlePinSubmit}
        onPinAcknowledge={handlePinAcknowledge}
      />
    );
  }

  // ── Eval ──────────────────────────────────────────────────
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
        onGoHome={() => { saveCloudDraft(); onBack(); }}
      />
    );
  }

  // ── Info (default) ────────────────────────────────────────
  return (
    <InfoStep
      juryName={juryName}
      setJuryName={setJuryName}
      juryDept={juryDept}
      setJuryDept={setJuryDept}
      cloudChecking={cloudChecking}
      cloudDraft={cloudDraft}
      alreadySubmitted={alreadySubmitted}
      onStart={handleStart}
      onResumeCloud={handleResumeCloud}
      onStartFresh={handleStartFresh}
      onBack={onBack}
    />
  );
}
