// src/jury/hooks/useJuryScoring.js
// ============================================================
// Owns scoring state and the pending refs that allow writeGroup
// to read always-fresh values outside the React render cycle.
//
// State:
//   scores       — { [project_id]: { [criterionId]: value|null } }
//   comments     — { [project_id]: string }
//   touched      — { [project_id]: { [criterionId]: boolean } }
//   groupSynced  — { [project_id]: boolean } — true when all criteria written
//   doneScores   — snapshot at finalization (shown on DoneStep)
//   doneComments — snapshot at finalization (shown on DoneStep)
//
// Refs:
//   pendingScoresRef   — mirrors scores; updated synchronously in onChange so
//                        writeGroup always sees the latest value regardless
//                        of when React flushes state.
//   pendingCommentsRef — mirrors comments; same pattern.
//
// Handlers that mutate these (handleScore, handleCommentChange, etc.) live in
// the orchestrator because they also call writeGroup (from useJuryAutosave)
// and check editLockActive (from useJuryEditState).
// ============================================================

import { useState, useRef } from "react";

export function useJuryScoring() {
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState({});
  const [touched, setTouched] = useState({});
  const [groupSynced, setGroupSynced] = useState({});
  const [doneScores, setDoneScores] = useState(null);
  const [doneComments, setDoneComments] = useState(null);

  // Always-fresh mirrors of scores/comments.
  // Read by writeGroup to avoid stale closure captures.
  const pendingScoresRef = useRef({});
  const pendingCommentsRef = useRef({});

  return {
    scores, setScores,
    comments, setComments,
    touched, setTouched,
    groupSynced, setGroupSynced,
    doneScores, setDoneScores,
    doneComments, setDoneComments,
    pendingScoresRef,
    pendingCommentsRef,
  };
}
