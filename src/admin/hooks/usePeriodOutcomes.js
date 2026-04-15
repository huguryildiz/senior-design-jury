// src/admin/hooks/usePeriodOutcomes.js
// Data hook for period-scoped outcomes, criteria, and criterion-outcome mappings.
//
// Uses a draft buffer (same pattern as criteria): CRUD ops mutate local state
// only; commitDraft applies the full diff to the DB in one shot.
//
// period_criterion_outcome_maps is the single source of truth for which
// criteria map to which outcomes. Each period owns independent mappings;
// changes here do not leak to other periods even if they share a framework.
//
// Powers OutcomesPage CRUD and the Edit Criterion drawer's Mapping tab.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  listPeriodOutcomes,
  listPeriodCriteriaForMapping,
  listPeriodCriterionOutcomeMaps,
  createPeriodOutcome,
  updatePeriodOutcome,
  deletePeriodOutcome,
  upsertPeriodCriterionOutcomeMap,
  deletePeriodCriterionOutcomeMap,
} from "@/shared/api";
import {
  getOutcomesScratch,
  setOutcomesScratch,
  clearOutcomesScratch,
} from "@/shared/storage/adminStorage";

// ── Temp ID helpers ───────────────────────────────────────────

const isTempId = (id) => typeof id === "string" && id.startsWith("tmp_");

function makeTempId(prefix = "out") {
  return `tmp_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function isValidScratch(scratch, loadedOutcomes) {
  if (!scratch?.outcomes || !Array.isArray(scratch.outcomes)) return false;
  if (!scratch?.mappings || !Array.isArray(scratch.mappings)) return false;
  const loadedIds = new Set(loadedOutcomes.map((o) => o.id));
  // Every non-temp outcome in the scratch must still exist in the DB
  return scratch.outcomes.filter((o) => !isTempId(o.id)).every((o) => loadedIds.has(o.id));
}

export function usePeriodOutcomes({ periodId }) {
  // ── Saved state (DB truth) ────────────────────────────────
  const [savedOutcomes, setSavedOutcomes] = useState([]);
  const [savedMappings, setSavedMappings] = useState([]);

  // ── Draft state (working copy) ────────────────────────────
  const [draftOutcomes, setDraftOutcomes] = useState([]);
  const [draftMappings, setDraftMappings] = useState([]);

  // ── Draft meta (framework-level ops queued for next save) ─
  // `pendingFrameworkName` undefined means no rename queued.
  // `pendingUnassign` true means "on commit, unassign the framework".
  const [pendingFrameworkName, setPendingFrameworkNameState] = useState(undefined);
  const [pendingUnassign, setPendingUnassignState] = useState(false);

  // ── Shared state ──────────────────────────────────────────
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Period change: fetch DB + try scratch restore ──────────

  useEffect(() => {
    if (!periodId) {
      setSavedOutcomes([]);
      setSavedMappings([]);
      setDraftOutcomes([]);
      setDraftMappings([]);
      setCriteria([]);
      setPendingFrameworkNameState(undefined);
      setPendingUnassignState(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [o, c, m] = await Promise.all([
          listPeriodOutcomes(periodId),
          listPeriodCriteriaForMapping(periodId),
          listPeriodCriterionOutcomeMaps(periodId),
        ]);
        if (!alive) return;
        setSavedOutcomes(o);
        setSavedMappings(m);
        setCriteria(c);
        const scratch = getOutcomesScratch(periodId);
        if (scratch && isValidScratch(scratch, o)) {
          setDraftOutcomes(scratch.outcomes);
          setDraftMappings(scratch.mappings);
          setPendingFrameworkNameState(
            Object.prototype.hasOwnProperty.call(scratch, "pendingFrameworkName")
              ? scratch.pendingFrameworkName
              : undefined
          );
          setPendingUnassignState(!!scratch.pendingUnassign);
        } else {
          clearOutcomesScratch(periodId);
          setDraftOutcomes(o);
          setDraftMappings(m);
          setPendingFrameworkNameState(undefined);
          setPendingUnassignState(false);
        }
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "Failed to load outcomes data");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [periodId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── loadAll: forced fresh reset (used after commit and by clone handlers) ──

  const loadAll = useCallback(async () => {
    if (!periodId) {
      setSavedOutcomes([]);
      setSavedMappings([]);
      setDraftOutcomes([]);
      setDraftMappings([]);
      setCriteria([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [o, c, m] = await Promise.all([
        listPeriodOutcomes(periodId),
        listPeriodCriteriaForMapping(periodId),
        listPeriodCriterionOutcomeMaps(periodId),
      ]);
      if (!mountedRef.current) return;
      setSavedOutcomes(o);
      setSavedMappings(m);
      setCriteria(c);
      clearOutcomesScratch(periodId);
      setDraftOutcomes(o);
      setDraftMappings(m);
      setPendingFrameworkNameState(undefined);
      setPendingUnassignState(false);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err?.message || "Failed to load outcomes data");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [periodId]);

  // ── isDirty ───────────────────────────────────────────────

  const itemsDirty = useMemo(() => {
    if (draftOutcomes.length !== savedOutcomes.length) return true;
    if (draftMappings.length !== savedMappings.length) return true;
    if (draftOutcomes.some((o) => isTempId(o.id))) return true;
    for (const draft of draftOutcomes) {
      const saved = savedOutcomes.find((s) => s.id === draft.id);
      if (!saved) return true;
      if (
        saved.code !== draft.code ||
        saved.label !== draft.label ||
        (saved.description || null) !== (draft.description || null) ||
        (saved.coverage_type ?? null) !== (draft.coverage_type ?? null)
      ) return true;
    }
    if (draftMappings.some((m) => isTempId(m.period_outcome_id))) return true;
    for (const dm of draftMappings) {
      const sm = savedMappings.find(
        (s) =>
          s.period_criterion_id === dm.period_criterion_id &&
          s.period_outcome_id === dm.period_outcome_id
      );
      if (!sm) return true;
      if (sm.coverage_type !== dm.coverage_type) return true;
    }
    return false;
  }, [draftOutcomes, savedOutcomes, draftMappings, savedMappings]);

  const isDirty = useMemo(
    () => itemsDirty || pendingFrameworkName !== undefined || pendingUnassign,
    [itemsDirty, pendingFrameworkName, pendingUnassign]
  );

  // ── SessionStorage sync ───────────────────────────────────

  useEffect(() => {
    if (!periodId) return;
    if (isDirty) {
      const payload = { outcomes: draftOutcomes, mappings: draftMappings };
      if (pendingFrameworkName !== undefined) payload.pendingFrameworkName = pendingFrameworkName;
      if (pendingUnassign) payload.pendingUnassign = true;
      setOutcomesScratch(periodId, payload);
    } else if (savedOutcomes.length > 0 || savedMappings.length > 0) {
      clearOutcomesScratch(periodId);
    }
  }, [periodId, isDirty, draftOutcomes, draftMappings, savedOutcomes, savedMappings, pendingFrameworkName, pendingUnassign]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Coverage helpers ───────────────────────────────────────

  const getCoverage = useCallback(
    (outcomeId) => {
      const maps = draftMappings.filter((m) => m.period_outcome_id === outcomeId);
      if (maps.length === 0) {
        const outcome = draftOutcomes.find((o) => o.id === outcomeId);
        return outcome?.coverage_type ?? "none";
      }
      if (maps.some((m) => m.coverage_type === "direct")) return "direct";
      return "indirect";
    },
    [draftMappings, draftOutcomes]
  );

  const getMappedCriteria = useCallback(
    (outcomeId) => {
      return draftMappings
        .filter((m) => m.period_outcome_id === outcomeId)
        .map((m) => {
          const crit = criteria.find((c) => c.id === m.period_criterion_id);
          return crit ? { ...crit, mappingId: m.id, coverageType: m.coverage_type } : null;
        })
        .filter(Boolean);
    },
    [draftMappings, criteria]
  );

  const getMappedOutcomes = useCallback(
    (criterionId) => {
      return draftMappings
        .filter((m) => m.period_criterion_id === criterionId)
        .map((m) => {
          const out = draftOutcomes.find((o) => o.id === m.period_outcome_id);
          return out ? { ...out, mappingId: m.id, coverageType: m.coverage_type } : null;
        })
        .filter(Boolean);
    },
    [draftMappings, draftOutcomes]
  );

  // ── CRUD: Outcomes (draft mutations) ──────────────────────

  const addOutcome = useCallback(
    ({ code, shortLabel, description, criterionIds = [], coverageType = "direct" }) => {
      const newId = makeTempId("out");
      setDraftOutcomes((prev) => {
        const maxSort = prev.reduce((max, o) => Math.max(max, o.sort_order ?? 0), 0);
        return [
          ...prev,
          {
            id: newId,
            code,
            label: shortLabel,
            description: description || null,
            sort_order: maxSort + 1,
            coverage_type:
              criterionIds.length === 0 && coverageType === "indirect" ? "indirect" : null,
          },
        ];
      });
      if (criterionIds.length > 0) {
        setDraftMappings((prev) => [
          ...prev,
          ...criterionIds.map((critId) => ({
            id: null,
            period_criterion_id: critId,
            period_outcome_id: newId,
            coverage_type: coverageType,
          })),
        ]);
      }
    },
    []
  );

  const editOutcome = useCallback(
    (outcomeId, { code, label, description, criterionIds = [], coverageType = "direct" }) => {
      setDraftOutcomes((prev) =>
        prev.map((o) =>
          o.id === outcomeId
            ? {
                ...o,
                code: code !== undefined ? code : o.code,
                label: label !== undefined ? label : o.label,
                description: description || null,
                coverage_type:
                  criterionIds.length === 0 && coverageType === "indirect" ? "indirect" : null,
              }
            : o
        )
      );
      setDraftMappings((prev) => {
        const withoutThisOutcome = prev.filter((m) => m.period_outcome_id !== outcomeId);
        return [
          ...withoutThisOutcome,
          ...criterionIds.map((critId) => {
            const existing = prev.find(
              (m) => m.period_outcome_id === outcomeId && m.period_criterion_id === critId
            );
            return {
              id: existing?.id ?? null,
              period_criterion_id: critId,
              period_outcome_id: outcomeId,
              coverage_type: coverageType,
            };
          }),
        ];
      });
    },
    []
  );

  const removeOutcome = useCallback((outcomeId) => {
    setDraftOutcomes((prev) => prev.filter((o) => o.id !== outcomeId));
    setDraftMappings((prev) => prev.filter((m) => m.period_outcome_id !== outcomeId));
  }, []);

  // ── CRUD: Individual mappings (draft mutations) ────────────

  const addMapping = useCallback((criterionId, outcomeId, coverageType = "direct") => {
    setDraftMappings((prev) => {
      const existing = prev.find(
        (m) => m.period_criterion_id === criterionId && m.period_outcome_id === outcomeId
      );
      if (existing) {
        return prev.map((m) =>
          m.period_criterion_id === criterionId && m.period_outcome_id === outcomeId
            ? { ...m, coverage_type: coverageType }
            : m
        );
      }
      return [
        ...prev,
        { id: null, period_criterion_id: criterionId, period_outcome_id: outcomeId, coverage_type: coverageType },
      ];
    });
  }, []);

  const removeMapping = useCallback((criterionId, outcomeId) => {
    setDraftMappings((prev) =>
      prev.filter(
        (m) =>
          !(m.period_criterion_id === criterionId && m.period_outcome_id === outcomeId)
      )
    );
  }, []);

  // ── Coverage cycling (draft mutation) ─────────────────────

  const cycleCoverage = useCallback(
    (outcomeId) => {
      const maps = draftMappings.filter((m) => m.period_outcome_id === outcomeId);
      if (maps.length === 0) return "none";
      if (maps.every((m) => m.coverage_type === "indirect")) {
        setDraftMappings((prev) => prev.filter((m) => m.period_outcome_id !== outcomeId));
        setDraftOutcomes((prev) =>
          prev.map((o) => (o.id === outcomeId ? { ...o, coverage_type: null } : o))
        );
        return "none";
      }
      setDraftMappings((prev) =>
        prev.map((m) =>
          m.period_outcome_id === outcomeId && m.coverage_type === "direct"
            ? { ...m, coverage_type: "indirect" }
            : m
        )
      );
      return "indirect";
    },
    [draftMappings]
  );

  // ── discardDraft ──────────────────────────────────────────

  const discardDraft = useCallback(() => {
    clearOutcomesScratch(periodId);
    setDraftOutcomes(savedOutcomes);
    setDraftMappings(savedMappings);
    setPendingFrameworkNameState(undefined);
    setPendingUnassignState(false);
  }, [savedOutcomes, savedMappings, periodId]);

  // ── Framework-level draft setters (no RPC — deferred to Save) ──

  const setPendingFrameworkName = useCallback((name) => {
    setPendingFrameworkNameState(name);
    if (name !== undefined && name !== null) setPendingUnassignState(false);
  }, []);

  const markUnassign = useCallback(() => {
    setPendingUnassignState(true);
    // Clear local outcome/mapping draft — on save the whole framework will be
    // dropped. Rename intent is also void once the framework goes away.
    setDraftOutcomes([]);
    setDraftMappings([]);
    setPendingFrameworkNameState(undefined);
  }, []);

  // ── commitDraft ───────────────────────────────────────────

  const commitDraft = useCallback(async () => {
    if (!periodId) return;
    setSaving(true);
    try {
      // If the user queued an unassign, skip outcome/mapping diffs entirely —
      // the page layer will invoke the unassign RPC and reload, which
      // supersedes any pending edits.
      if (pendingUnassign) {
        clearOutcomesScratch(periodId);
        return;
      }
      const tempIdMap = {};

      // 1. Create new outcomes (those with temp IDs)
      const newDraftOutcomes = draftOutcomes.filter((o) => isTempId(o.id));
      await Promise.all(
        newDraftOutcomes.map(async (o) => {
          const created = await createPeriodOutcome({
            period_id: periodId,
            code: o.code,
            label: o.label,
            description: o.description || null,
            sort_order: o.sort_order,
          });
          if (o.coverage_type) {
            await updatePeriodOutcome(created.id, { coverage_type: o.coverage_type });
          }
          tempIdMap[o.id] = created.id;
        })
      );

      // 2. Delete removed outcomes (cascade removes their mappings in DB)
      const removedOutcomes = savedOutcomes.filter(
        (s) => !draftOutcomes.find((d) => d.id === s.id)
      );
      await Promise.all(removedOutcomes.map((o) => deletePeriodOutcome(o.id)));

      // 3. Update changed outcomes (real IDs only)
      const updatedOutcomes = draftOutcomes.filter((d) => {
        if (isTempId(d.id)) return false;
        const saved = savedOutcomes.find((s) => s.id === d.id);
        if (!saved) return false;
        return (
          saved.code !== d.code ||
          saved.label !== d.label ||
          (saved.description || null) !== (d.description || null) ||
          (saved.coverage_type ?? null) !== (d.coverage_type ?? null)
        );
      });
      await Promise.all(
        updatedOutcomes.map((d) =>
          updatePeriodOutcome(d.id, {
            code: d.code,
            label: d.label,
            description: d.description || null,
            coverage_type: d.coverage_type ?? null,
          })
        )
      );

      // 4. Resolve draft mappings: replace temp outcome IDs with real IDs
      const resolvedDraftMappings = draftMappings.map((m) => ({
        ...m,
        period_outcome_id: tempIdMap[m.period_outcome_id] ?? m.period_outcome_id,
      }));

      // 5. Mapping diff
      const newMappings = resolvedDraftMappings.filter(
        (dm) =>
          !savedMappings.find(
            (sm) =>
              sm.period_criterion_id === dm.period_criterion_id &&
              sm.period_outcome_id === dm.period_outcome_id
          )
      );
      const removedOutcomeIds = new Set(removedOutcomes.map((o) => o.id));
      const deletedMappings = savedMappings.filter(
        (sm) =>
          !removedOutcomeIds.has(sm.period_outcome_id) && // cascade already handles these
          !resolvedDraftMappings.find(
            (dm) =>
              dm.period_criterion_id === sm.period_criterion_id &&
              dm.period_outcome_id === sm.period_outcome_id
          )
      );
      const changedCovMappings = resolvedDraftMappings.filter((dm) => {
        const sm = savedMappings.find(
          (s) =>
            s.period_criterion_id === dm.period_criterion_id &&
            s.period_outcome_id === dm.period_outcome_id
        );
        return sm && sm.coverage_type !== dm.coverage_type;
      });

      await Promise.all([
        ...newMappings.map((m) =>
          upsertPeriodCriterionOutcomeMap({
            period_id: periodId,
            period_criterion_id: m.period_criterion_id,
            period_outcome_id: m.period_outcome_id,
            coverage_type: m.coverage_type,
          })
        ),
        ...deletedMappings.map((m) => deletePeriodCriterionOutcomeMap(m.id)),
        ...changedCovMappings.map((m) =>
          upsertPeriodCriterionOutcomeMap({
            period_id: periodId,
            period_criterion_id: m.period_criterion_id,
            period_outcome_id: m.period_outcome_id,
            coverage_type: m.coverage_type,
          })
        ),
      ]);

      clearOutcomesScratch(periodId);
      await loadAll();
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [periodId, draftOutcomes, savedOutcomes, draftMappings, savedMappings, loadAll, pendingUnassign]);

  return {
    outcomes: draftOutcomes,
    criteria,
    mappings: draftMappings,
    loading,
    error,
    saving,
    isDirty,
    itemsDirty,
    pendingFrameworkName,
    pendingUnassign,
    loadAll,
    commitDraft,
    discardDraft,
    getCoverage,
    getMappedCriteria,
    getMappedOutcomes,
    addOutcome,
    editOutcome,
    removeOutcome,
    addMapping,
    removeMapping,
    cycleCoverage,
    setPendingFrameworkName,
    markUnassign,
  };
}
