// src/jury/hooks/useJuryScoreHandlers.js
// ============================================================
// Score-related handlers extracted from useJuryHandlers.
//
// Handlers:
//   handleScore         — onChange: update scores in state + pending ref
//   handleScoreBlur     — onBlur: normalize value, clamp to criterion max, persist via writeGroup
//   handleCommentChange — onChange: update comment in state + pending ref
//   handleCommentBlur   — onBlur: persist via writeGroup
// ============================================================

import { useCallback } from "react";
import { isAllFilled } from "../utils/scoreState";

export function useJuryScoreHandlers({ scoring, editState, autosave, effectiveCriteria }) {
  const handleScore = useCallback(
    (pid, cid, val) => {
      if (editState.editLockActive) return;
      // Keep only digits and a single optional leading minus.
      // This preserves testable "-5 -> clamp to 0 on blur" semantics while
      // still guarding against arbitrary free-form characters.
      const compact = String(val ?? "").replace(/\s+/g, "");
      const normalized = compact
        .replace(/[^0-9-]/g, "")
        .replace(/(?!^)-/g, "");
      const stored = normalized === "" || normalized === "-" ? null : normalized;
      const newScores = {
        ...scoring.pendingScoresRef.current,
        [pid]: { ...scoring.pendingScoresRef.current[pid], [cid]: stored },
      };
      scoring.pendingScoresRef.current = newScores;
      scoring.setScores(newScores);
      scoring.setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));
      if (!isAllFilled(newScores, pid, effectiveCriteria)) {
        scoring.setGroupSynced((prev) => ({ ...prev, [pid]: false }));
      }
    },
    [editState.editLockActive]
  );

  const handleScoreBlur = useCallback(
    (pid, cid) => {
      if (editState.editLockActive) return;
      const crit = effectiveCriteria.find((c) => c.id === cid);
      scoring.setTouched((prev) => ({ ...prev, [pid]: { ...prev[pid], [cid]: true } }));
      const val = scoring.pendingScoresRef.current[pid]?.[cid];
      let normalized;
      if (val === "" || val === null || val === undefined) {
        normalized = null;
      } else {
        const n = parseInt(String(val), 10);
        normalized = Number.isFinite(n)
          ? Math.min(Math.max(n, 0), crit.max)
          : null;
      }
      const newScores = {
        ...scoring.pendingScoresRef.current,
        [pid]: { ...scoring.pendingScoresRef.current[pid], [cid]: normalized },
      };
      scoring.pendingScoresRef.current = newScores;
      scoring.setScores(newScores);
      autosave.writeGroup(pid);
    },
    [editState.editLockActive, autosave.writeGroup, effectiveCriteria]
  );

  const handleCommentChange = useCallback((pid, val) => {
    if (editState.editLockActive) return;
    scoring.pendingCommentsRef.current = { ...scoring.pendingCommentsRef.current, [pid]: val };
    scoring.setComments((prev) => ({ ...prev, [pid]: val }));
  }, [editState.editLockActive]);

  const handleCommentBlur = useCallback(
    (pid) => {
      if (editState.editLockActive) return;
      autosave.writeGroup(pid);
    },
    [editState.editLockActive, autosave.writeGroup]
  );

  return { handleScore, handleScoreBlur, handleCommentChange, handleCommentBlur };
}
