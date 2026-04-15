// src/admin/hooks/usePeriodOutcomes.js
// Data hook for period-scoped outcomes, criteria, and criterion-outcome mappings.
//
// period_criterion_outcome_maps is the single source of truth for which
// criteria map to which outcomes. Each period owns independent mappings;
// changes here do not leak to other periods even if they share a framework.
//
// Powers OutcomesPage CRUD and the Edit Criterion drawer's Mapping tab.

import { useCallback, useEffect, useRef, useState } from "react";
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

export function usePeriodOutcomes({ periodId }) {
  const [outcomes, setOutcomes] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Load all data ──────────────────────────────────────────

  const loadAll = useCallback(async () => {
    if (!periodId) {
      setOutcomes([]);
      setCriteria([]);
      setMappings([]);
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
      setOutcomes(o);
      setCriteria(c);
      setMappings(m);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err?.message || "Failed to load outcomes data");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [periodId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Coverage helpers ───────────────────────────────────────

  const getCoverage = useCallback(
    (outcomeId) => {
      const maps = mappings.filter((m) => m.period_outcome_id === outcomeId);
      if (maps.length === 0) {
        const outcome = outcomes.find((o) => o.id === outcomeId);
        return outcome?.coverage_type ?? "none";
      }
      if (maps.some((m) => m.coverage_type === "direct")) return "direct";
      return "indirect";
    },
    [mappings, outcomes]
  );

  const getMappedCriteria = useCallback(
    (outcomeId) => {
      return mappings
        .filter((m) => m.period_outcome_id === outcomeId)
        .map((m) => {
          const crit = criteria.find((c) => c.id === m.period_criterion_id);
          return crit ? { ...crit, mappingId: m.id, coverageType: m.coverage_type } : null;
        })
        .filter(Boolean);
    },
    [mappings, criteria]
  );

  const getMappedOutcomes = useCallback(
    (criterionId) => {
      return mappings
        .filter((m) => m.period_criterion_id === criterionId)
        .map((m) => {
          const out = outcomes.find((o) => o.id === m.period_outcome_id);
          return out ? { ...out, mappingId: m.id, coverageType: m.coverage_type } : null;
        })
        .filter(Boolean);
    },
    [mappings, outcomes]
  );

  // ── CRUD: Outcomes ─────────────────────────────────────────

  const addOutcome = useCallback(
    async ({ code, shortLabel, description, criterionIds = [], coverageType = "direct" }) => {
      const maxSort = outcomes.reduce((max, o) => Math.max(max, o.sort_order ?? 0), 0);
      const newOutcome = await createPeriodOutcome({
        period_id: periodId,
        code,
        label: shortLabel,
        description: description || null,
        sort_order: maxSort + 1,
      });

      if (criterionIds.length > 0) {
        await Promise.all(
          criterionIds.map((critId) =>
            upsertPeriodCriterionOutcomeMap({
              period_id: periodId,
              period_criterion_id: critId,
              period_outcome_id: newOutcome.id,
              coverage_type: coverageType,
            })
          )
        );
      }

      await loadAll();
      return newOutcome;
    },
    [periodId, outcomes, loadAll]
  );

  const editOutcome = useCallback(
    async (outcomeId, { code, label, description, criterionIds = [], coverageType = "direct" }) => {
      await updatePeriodOutcome(outcomeId, {
        ...(code !== undefined && { code }),
        label,
        description: description || null,
        // Persist "indirect" on the outcome row when no criteria are mapped so
        // getCoverage can distinguish "indirect (no criteria)" from "not mapped".
        // Clearing to null when criteria exist (mappings govern) or when direct+no-criteria
        // (still "not mapped" semantically).
        coverage_type: (criterionIds.length === 0 && coverageType === "indirect") ? "indirect" : null,
      });

      const currentMaps = mappings.filter((m) => m.period_outcome_id === outcomeId);
      const currentCritIds = currentMaps.map((m) => m.period_criterion_id);

      const toRemove = currentMaps.filter((m) => !criterionIds.includes(m.period_criterion_id));
      const toAdd = criterionIds.filter((id) => !currentCritIds.includes(id));
      const toUpdate = currentMaps.filter(
        (m) => criterionIds.includes(m.period_criterion_id) && m.coverage_type !== coverageType
      );

      await Promise.all([
        ...toRemove.map((m) => deletePeriodCriterionOutcomeMap(m.id)),
        ...toAdd.map((critId) =>
          upsertPeriodCriterionOutcomeMap({
            period_id: periodId,
            period_criterion_id: critId,
            period_outcome_id: outcomeId,
            coverage_type: coverageType,
          })
        ),
        ...toUpdate.map((m) =>
          upsertPeriodCriterionOutcomeMap({
            period_id: periodId,
            period_criterion_id: m.period_criterion_id,
            period_outcome_id: m.period_outcome_id,
            coverage_type: coverageType,
          })
        ),
      ]);

      await loadAll();
    },
    [periodId, mappings, loadAll]
  );

  const removeOutcome = useCallback(
    async (outcomeId) => {
      await deletePeriodOutcome(outcomeId);
      await loadAll();
    },
    [loadAll]
  );

  // ── CRUD: Individual mappings ──────────────────────────────

  const addMapping = useCallback(
    async (criterionId, outcomeId, coverageType = "direct") => {
      await upsertPeriodCriterionOutcomeMap({
        period_id: periodId,
        period_criterion_id: criterionId,
        period_outcome_id: outcomeId,
        coverage_type: coverageType,
      });
      await loadAll();
    },
    [periodId, loadAll]
  );

  const removeMapping = useCallback(
    async (criterionId, outcomeId) => {
      const map = mappings.find(
        (m) => m.period_criterion_id === criterionId && m.period_outcome_id === outcomeId
      );
      if (map) {
        await deletePeriodCriterionOutcomeMap(map.id);
        await loadAll();
      }
    },
    [mappings, loadAll]
  );

  // ── Coverage cycling ───────────────────────────────────────

  const cycleCoverage = useCallback(
    async (outcomeId) => {
      const maps = mappings.filter((m) => m.period_outcome_id === outcomeId);

      if (maps.length === 0) return "none";

      if (maps.every((m) => m.coverage_type === "indirect")) {
        await Promise.all(maps.map((m) => deletePeriodCriterionOutcomeMap(m.id)));
        await loadAll();
        return "none";
      }

      await Promise.all(
        maps
          .filter((m) => m.coverage_type === "direct")
          .map((m) =>
            upsertPeriodCriterionOutcomeMap({
              period_id: periodId,
              period_criterion_id: m.period_criterion_id,
              period_outcome_id: m.period_outcome_id,
              coverage_type: "indirect",
            })
          )
      );
      await loadAll();
      return "indirect";
    },
    [periodId, mappings, loadAll]
  );

  return {
    outcomes,
    criteria,
    mappings,
    loading,
    error,
    loadAll,
    getCoverage,
    getMappedCriteria,
    getMappedOutcomes,
    addOutcome,
    editOutcome,
    removeOutcome,
    addMapping,
    removeMapping,
    cycleCoverage,
  };
}
