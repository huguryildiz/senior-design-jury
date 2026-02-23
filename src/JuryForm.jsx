// src/JuryForm.jsx
// ============================================================
// Thin orchestrator for the jury evaluation flow.
// All state and business logic lives in useJuryState.
//
// Step routing:
//   "info"        → InfoStep        (identity entry)
//   "pin"         → PinStep         (PIN entry / first-time PIN display)
//   "cloudChoice" → CloudChoiceStep (cloud vs local draft decision)
//   "eval"        → EvalStep        (scoring form)
//   "done"        → DoneStep        (confirmation + edit option)
// ============================================================

import useJuryState from "./jury/useJuryState";
import InfoStep     from "./jury/InfoStep";
import PinStep      from "./jury/PinStep";
import EvalStep     from "./jury/EvalStep";
import DoneStep     from "./jury/DoneStep";
import { PROJECTS, CRITERIA } from "./config";
import { isAllFilled } from "./jury/useJuryState";
import "./styles/jury.css";

// ── Cloud vs local choice step ────────────────────────────────
// Shown inline (not a separate file) because it's small and only
// rendered from one place.
function CloudChoiceStep({ juryName, cloudDraft, onResume, onFresh }) {
  const completedCount = PROJECTS.filter((p) =>
    isAllFilled(cloudDraft?.scores || {}, p.id)
  ).length;

  return (
    <div className="form-screen">
      <div className="info-card">
        <h3>Resume Progress?</h3>
        <p className="pin-intro">
          We found a more recent save from another device for{" "}
          <strong>{juryName}</strong>.
        </p>
        <div className="cloud-draft-banner banner-draft" style={{ marginTop: "1rem" }}>
          <div className="cloud-draft-title">☁️ Cloud save</div>
          <div className="cloud-draft-sub">
            {completedCount} / {PROJECTS.length} groups completed
          </div>
          <div className="cloud-draft-actions">
            <button className="btn-primary"   onClick={onResume}>Resume from cloud</button>
            <button className="btn-secondary" onClick={onFresh}>Start fresh</button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    cloudDraft, alreadySubmitted,
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

  // ── Cloud vs local choice ─────────────────────────────────
  if (step === "cloudChoice") {
    return (
      <CloudChoiceStep
        juryName={juryName}
        cloudDraft={cloudDraft}
        onResume={handleResumeCloud}
        onFresh={handleStartFresh}
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
      onStart={handleStart}
      onBack={onBack}
    />
  );
}
