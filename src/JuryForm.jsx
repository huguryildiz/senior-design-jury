// src/JuryForm.jsx
// ============================================================
// Thin step-router for the jury evaluation flow.
// All state and business logic lives in useJuryState.
//
// Step routing:
//   "info"  → InfoStep           (identity entry)
//   "pin"   → PinStep            (PIN entry / first-time display)
//   "eval"  → EvalStep           (scoring form)
//   "done"  → DoneStep           (confirmation + edit option)
//
// SheetsProgressDialog is rendered as an overlay on top of the
// current step whenever sheetProgress is non-null. It is always
// shown after PIN verification so the juror sees the server-side
// state before proceeding.
// ============================================================

import useJuryState       from "./jury/useJuryState";
import InfoStep           from "./jury/InfoStep";
import PinStep            from "./jury/PinStep";
import EvalStep           from "./jury/EvalStep";
import DoneStep           from "./jury/DoneStep";
import SheetsProgressDialog from "./jury/SheetsProgressDialog";
import "./styles/jury.css";

export default function JuryForm({ onBack }) {
  const {
    step,
    juryName, setJuryName,
    juryDept, setJuryDept,
    current, setCurrent,
    scores, comments, touched,
    groupSynced, editMode,
    progressPct, allComplete,
    doneScores, doneComments,
    sheetProgress,
    saveStatus,
    pinStep, pinError, newPin, attemptsLeft,
    handleScore, handleScoreBlur, handleCommentChange,
    handleStart,
    handleConfirmFromSheet,
    handleStartFresh,
    handleResubmit,
    handleEditScores,
    handleFinalSubmit,
    handlePinSubmit,
    handlePinAcknowledge,
    saveCloudDraft,
    resetAll,
  } = useJuryState();

  // ── Done ────────────────────────────────────────────────
  if (step === "done") {
    return (
      <>
        <DoneStep
          doneScores={doneScores}
          doneComments={doneComments}
          scores={scores}
          comments={comments}
          onEditScores={handleEditScores}
          onBack={() => { resetAll(); onBack(); }}
        />
        {/* Dialog may appear over the done screen too (e.g. on reload) */}
        <SheetsProgressDialog
          progress={sheetProgress}
          onConfirm={handleConfirmFromSheet}
          onFresh={handleStartFresh}
        />
      </>
    );
  }

  // ── PIN ──────────────────────────────────────────────────
  if (step === "pin") {
    return (
      <>
        <PinStep
          pinStep={pinStep}
          pinError={pinError}
          newPin={newPin}
          attemptsLeft={attemptsLeft}
          juryName={juryName}
          onPinSubmit={handlePinSubmit}
          onPinAcknowledge={handlePinAcknowledge}
        />
        <SheetsProgressDialog
          progress={sheetProgress}
          onConfirm={handleConfirmFromSheet}
          onFresh={handleStartFresh}
        />
      </>
    );
  }

  // ── Eval ─────────────────────────────────────────────────
  if (step === "eval") {
    return (
      <>
        <EvalStep
          juryName={juryName}
          juryDept={juryDept}
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
        <SheetsProgressDialog
          progress={sheetProgress}
          onConfirm={handleConfirmFromSheet}
          onFresh={handleStartFresh}
        />
      </>
    );
  }

  // ── Info (default) ────────────────────────────────────────
  return (
    <>
      <InfoStep
        juryName={juryName}
        setJuryName={setJuryName}
        juryDept={juryDept}
        setJuryDept={setJuryDept}
        onStart={handleStart}
        onBack={onBack}
      />
      <SheetsProgressDialog
        progress={sheetProgress}
        onConfirm={handleConfirmFromSheet}
        onFresh={handleStartFresh}
      />
    </>
  );
}
