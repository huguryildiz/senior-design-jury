// src/JuryForm.jsx
// Step-router. All logic lives in useJuryState.
// Steps: "identity" → "semester" → ("pin" | "pin_reveal") → "progress_check" → "eval" → "done"

import { useEffect }           from "react";
import useJuryState            from "./jury/useJuryState";
import QRShowcaseStep          from "./jury/QRShowcaseStep";
import InfoStep                from "./jury/InfoStep";
import PinStep                 from "./jury/PinStep";
import PinRevealStep           from "./jury/PinRevealStep";
import SheetsProgressDialog    from "./jury/SheetsProgressDialog";
import SemesterStep            from "./jury/SemesterStep";
import EvalStep                from "./jury/EvalStep";
import DoneStep                from "./jury/DoneStep";
import MinimalLoaderOverlay    from "./shared/MinimalLoaderOverlay";
import { ShieldCheckIcon }     from "./shared/Icons";
import "./styles/jury.css";

export default function JuryForm({ onBack }) {
  const {
    step, setStep,
    juryName, juryDept,
    setJuryName, setJuryDept,
    authError,
    issuedPin,
    semesters,
    currentSemesterInfo,
    activeProjectCount,
    progressCheck,
    projects,
    current, handleNavigate,
    scores, comments, touched,
    groupSynced, editMode,
    editAllowed,
    editLockActive,
    progressPct, allComplete,
    doneScores,
    loadingState,
    saveStatus,
    pinError,
    pinErrorCode,
    pinAttemptsLeft,
    pinLockedUntil,
    handleScore, handleScoreBlur,
    handleCommentChange, handleCommentBlur,
    handlePinSubmit,
    handleIdentitySubmit,
    handlePinRevealContinue,
    handleProgressContinue,
    handleSemesterSelect,
    confirmingSubmit,
    handleRequestSubmit, handleConfirmSubmit, handleCancelSubmit,
    handleEditScores,
    handleFinalSubmit,
    resetAll,
    clearLocalSession,
    effectiveCriteria,
    mudekLookup,
  } = useJuryState();

  // Force navy background while JuryForm is mounted.
  useEffect(() => {
    const NAV = "linear-gradient(135deg,#162A66 0%,#0F1B4C 100%)";
    document.documentElement.style.background = NAV;
    document.body.style.background = NAV;
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  const isLoading = loadingState?.stage === "loading";
  const handleExitHome = () => {
    clearLocalSession();
    resetAll();
    onBack();
  };

  // ── QR Showcase (demo only) ───────────────────────────────
  if (step === "qr_showcase") {
    return <QRShowcaseStep onContinue={() => setStep("identity")} />;
  }

  // ── Identity ──────────────────────────────────────────────
  if (step === "identity") {
    return (
      <>
        <InfoStep
          juryName={juryName}
          setJuryName={setJuryName}
          juryDept={juryDept}
          setJuryDept={setJuryDept}
          currentSemester={currentSemesterInfo}
          activeProjectCount={activeProjectCount}
          onStart={handleIdentitySubmit}
          onBack={handleExitHome}
          error={authError}
        />
        <MinimalLoaderOverlay open={isLoading} />
      </>
    );
  }

  // ── PIN ───────────────────────────────────────────────────
  if (step === "pin") {
    return (
      <>
        <PinStep
          pinError={pinError}
          pinErrorCode={pinErrorCode}
          pinAttemptsLeft={pinAttemptsLeft}
          pinLockedUntil={pinLockedUntil}
          onPinSubmit={handlePinSubmit}
          onBack={handleExitHome}
        />
        <MinimalLoaderOverlay open={isLoading} />
      </>
    );
  }

  // ── PIN reveal (new juror) ────────────────────────────────
  if (step === "pin_reveal") {
    return (
      <>
        <PinRevealStep
          pin={issuedPin}
          onContinue={handlePinRevealContinue}
          onBack={handleExitHome}
        />
        <MinimalLoaderOverlay open={isLoading} />
      </>
    );
  }

  // ── Saved progress check ─────────────────────────────────
  if (step === "progress_check") {
    return (
      <SheetsProgressDialog
        progress={progressCheck}
        projects={projects}
        onConfirm={handleProgressContinue}
        onFresh={handleProgressContinue}
      />
    );
  }

  // ── Semester selection ────────────────────────────────────
  if (step === "semester") {
    return (
      <>
        <SemesterStep
          semesters={semesters}
          onSelect={handleSemesterSelect}
          onBack={handleExitHome}
        />
        <MinimalLoaderOverlay open={isLoading} />
      </>
    );
  }

  // ── Done ──────────────────────────────────────────────────
  if (step === "done") {
    return (
      <DoneStep
        juryName={juryName}
        doneScores={doneScores}
        scores={scores}
        projects={projects}
        onBack={handleExitHome}
        onEditScores={editAllowed ? handleEditScores : null}
        criteria={effectiveCriteria}
      />
    );
  }

  // ── Eval (default) ────────────────────────────────────────
  return (
    <>
      <EvalStep
        juryName={juryName}
        juryDept={juryDept}
        projects={projects}
        current={current}
        onNavigate={handleNavigate}
        scores={scores}
        comments={comments}
        touched={touched}
        groupSynced={groupSynced}
        editMode={editMode}
        lockActive={editLockActive}
        progressPct={progressPct}
        allComplete={allComplete}
        saveStatus={saveStatus}
        handleScore={handleScore}
        handleScoreBlur={handleScoreBlur}
        handleCommentChange={handleCommentChange}
        handleCommentBlur={handleCommentBlur}
        handleFinalSubmit={handleFinalSubmit}
        onGoHome={onBack}
        criteria={effectiveCriteria}
        mudekLookup={mudekLookup}
      />

      {confirmingSubmit && (
        <div
          className="premium-overlay submit-confirm-overlay"
          onClick={handleCancelSubmit}
        >
          <div
            className="premium-card compact submit-confirm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="premium-header submit-confirm-header">
              <div className="premium-icon-square" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard-check-icon lucide-clipboard-check" aria-hidden="true">
                  <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <path d="m9 14 2 2 4-4" />
                </svg>
              </div>
              <div className="premium-title" id="submit-confirm-title">Confirm Final Submission</div>
            </div>
            <div className="premium-info-strip submit-confirm-info" role="note">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-triangle-alert submit-confirm-alert-icon" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              <span className="submit-confirm-text">
                You have completed all evaluations. Submitting will finalize your scores.
              </span>
            </div>
            <div className="submit-confirm-actions">
              <button className="premium-btn-primary" onClick={handleConfirmSubmit}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>
                Submit Final Scores
              </button>
              <button className="premium-btn-secondary" onClick={handleCancelSubmit}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}

      <MinimalLoaderOverlay open={isLoading} />
    </>
  );
}
