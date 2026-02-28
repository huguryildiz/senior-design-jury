// src/JuryForm.jsx
// Step-router. All logic lives in useJuryState.

import useJuryState         from "./jury/useJuryState";
import InfoStep             from "./jury/InfoStep";
import PinStep              from "./jury/PinStep";
import EvalStep             from "./jury/EvalStep";
import DoneStep             from "./jury/DoneStep";
import SheetsProgressDialog from "./jury/SheetsProgressDialog";
import { LockIcon } from "./shared/Icons";
import "./styles/jury.css";

export default function JuryForm({ onBack }) {
  const {
    step,
    juryName, setJuryName,
    juryDept, setJuryDept,
    current, handleNavigate,
    scores, comments, touched,
    groupSynced, editMode,
    progressPct, allComplete,
    doneScores, doneComments,
    sheetProgress,
    saveStatus,
    pinStep, pinError, newPin, attemptsLeft,
    handleScore, handleScoreBlur,
    handleCommentChange, handleCommentBlur,
    handleStart,
    handleConfirmFromSheet,
    handleStartFresh,
    handleResubmit,
    handleEditScores,
    handleFinalSubmit,
    handlePinSubmit,
    handlePinAcknowledge,
    sessionKicked, kickedMsg, handleKickedAcknowledge,
    resetAll,
  } = useJuryState();

  if (sessionKicked) {
    return (
      <div className="premium-overlay">
        <div className="premium-card compact">
          <div className="premium-header">
            <div className="premium-icon-square" aria-hidden="true"><LockIcon /></div>
            <div className="premium-title">Session Ended</div>
            <div className="premium-subtitle">{kickedMsg}</div>
          </div>
          <button className="premium-btn-primary" onClick={handleKickedAcknowledge}>
            Sign in again
          </button>
        </div>
      </div>
    );
  }

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
        <SheetsProgressDialog
          progress={sheetProgress}
          onConfirm={handleConfirmFromSheet}
          onFresh={handleStartFresh}
        />
      </>
    );
  }

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

  if (step === "eval") {
    return (
      <>
        <EvalStep
          juryName={juryName}
          juryDept={juryDept}
          current={current}
          onNavigate={handleNavigate}
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
          handleCommentBlur={handleCommentBlur}
          handleFinalSubmit={handleFinalSubmit}
          onGoHome={onBack}
        />
        <SheetsProgressDialog
          progress={sheetProgress}
          onConfirm={handleConfirmFromSheet}
          onFresh={handleStartFresh}
        />
      </>
    );
  }

  // Info (default)
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
