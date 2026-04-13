// src/admin/hooks/useFrameworkOutcomes.js
// Data hook for framework-level outcomes, criteria, and criterion-outcome mappings.
// Powers the OutcomesPage with CRUD operations against framework_outcomes
// and framework_criterion_outcome_maps tables.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listOutcomes,
  createOutcome,
  updateOutcome,
  deleteOutcome,
  listFrameworkCriteria,
  listCriterionOutcomeMappings,
  upsertCriterionOutcomeMapping,
  deleteCriterionOutcomeMapping,
} from "@/shared/api";

export function useFrameworkOutcomes({ frameworkId }) {
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
    if (!frameworkId) {
      setOutcomes([]);
      setCriteria([]);
      setMappings([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [o, c, m] = await Promise.all([
        listOutcomes(frameworkId),
        listFrameworkCriteria(frameworkId),
        listCriterionOutcomeMappings(frameworkId),
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
  }, [frameworkId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Coverage helpers ───────────────────────────────────────

  const getCoverage = useCallback(
    (outcomeId) => {
      const maps = mappings.filter((m) => m.outcome_id === outcomeId);
      if (maps.length === 0) {
        const outcome = outcomes.find((o) => o.id === outcomeId);
        return outcome?.coverage_hint === "indirect" ? "indirect" : "none";
      }
      if (maps.some((m) => m.coverage_type === "direct")) return "direct";
      return "indirect";
    },
    [mappings, outcomes]
  );

  const getMappedCriteria = useCallback(
    (outcomeId) => {
      return mappings
        .filter((m) => m.outcome_id === outcomeId)
        .map((m) => {
          const crit = criteria.find((c) => c.id === m.criterion_id);
          return crit ? { ...crit, mappingId: m.id, coverageType: m.coverage_type } : null;
        })
        .filter(Boolean);
    },
    [mappings, criteria]
  );

  // ── CRUD: Outcomes ─────────────────────────────────────────

  const addOutcome = useCallback(
    async ({ code, shortLabel, description, criterionIds = [] }) => {
      const maxSort = outcomes.reduce((max, o) => Math.max(max, o.sort_order ?? 0), 0);
      const newOutcome = await createOutcome({
        framework_id: frameworkId,
        code,
        label: shortLabel,
        description: description || null,
        sort_order: maxSort + 1,
      });

      // Create direct mappings for selected criteria
      if (criterionIds.length > 0) {
        await Promise.all(
          criterionIds.map((critId) =>
            upsertCriterionOutcomeMapping({
              framework_id: frameworkId,
              criterion_id: critId,
              outcome_id: newOutcome.id,
              coverage_type: "direct",
            })
          )
        );
      }

      await loadAll();
      return newOutcome;
    },
    [frameworkId, outcomes, loadAll]
  );

  const editOutcome = useCallback(
    async (outcomeId, { code, label, description, criterionIds = [], coverageType = "direct" }) => {
      // coverage_hint persists "indirect" for unmapped outcomes; cleared when criteria are selected
      const coverage_hint = criterionIds.length === 0 && coverageType === "indirect" ? "indirect" : null;

      // Update the outcome row
      await updateOutcome(outcomeId, {
        ...(code !== undefined && { code }),
        label,
        description: description || null,
        coverage_hint,
      });

      // Sync mappings: remove old, add new
      const currentMaps = mappings.filter((m) => m.outcome_id === outcomeId);
      const currentCritIds = currentMaps.map((m) => m.criterion_id);

      const toRemove = currentMaps.filter((m) => !criterionIds.includes(m.criterion_id));
      const toAdd = criterionIds.filter((id) => !currentCritIds.includes(id));
      const toUpdate = currentMaps.filter(
        (m) => criterionIds.includes(m.criterion_id) && m.coverage_type !== coverageType
      );

      await Promise.all([
        ...toRemove.map((m) => deleteCriterionOutcomeMapping(m.id)),
        ...toAdd.map((critId) =>
          upsertCriterionOutcomeMapping({
            framework_id: frameworkId,
            criterion_id: critId,
            outcome_id: outcomeId,
            coverage_type: coverageType,
          })
        ),
        ...toUpdate.map((m) =>
          upsertCriterionOutcomeMapping({
            ...m,
            coverage_type: coverageType,
          })
        ),
      ]);

      await loadAll();
    },
    [frameworkId, mappings, loadAll]
  );

  const removeOutcome = useCallback(
    async (outcomeId) => {
      await deleteOutcome(outcomeId);
      await loadAll();
    },
    [loadAll]
  );

  // ── CRUD: Individual mappings ──────────────────────────────

  const addMapping = useCallback(
    async (criterionId, outcomeId, coverageType = "direct") => {
      await upsertCriterionOutcomeMapping({
        framework_id: frameworkId,
        criterion_id: criterionId,
        outcome_id: outcomeId,
        coverage_type: coverageType,
      });
      await loadAll();
    },
    [frameworkId, loadAll]
  );

  const removeMapping = useCallback(
    async (criterionId, outcomeId) => {
      const map = mappings.find(
        (m) => m.criterion_id === criterionId && m.outcome_id === outcomeId
      );
      if (map) {
        await deleteCriterionOutcomeMapping(map.id);
        await loadAll();
      }
    },
    [mappings, loadAll]
  );

  // ── Coverage cycling ───────────────────────────────────────

  const cycleCoverage = useCallback(
    async (outcomeId) => {
      const maps = mappings.filter((m) => m.outcome_id === outcomeId);

      if (maps.length === 0) {
        // No criterion mappings — cycle none ↔ indirect via coverage_hint on the outcome row
        const outcome = outcomes.find((o) => o.id === outcomeId);
        const newHint = outcome?.coverage_hint === "indirect" ? null : "indirect";
        await updateOutcome(outcomeId, { coverage_hint: newHint });
        await loadAll();
        return newHint === "indirect" ? "indirect" : "none";
      }

      // If all mappings are indirect → cycle to none (remove all)
      if (maps.every((m) => m.coverage_type === "indirect")) {
        await Promise.all(maps.map((m) => deleteCriterionOutcomeMapping(m.id)));
        await loadAll();
        return "none";
      }

      // If has direct mappings → cycle all to indirect
      await Promise.all(
        maps
          .filter((m) => m.coverage_type === "direct")
          .map((m) =>
            upsertCriterionOutcomeMapping({
              ...m,
              coverage_type: "indirect",
            })
          )
      );
      await loadAll();
      return "indirect";
    },
    [mappings, outcomes, loadAll]
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
    addOutcome,
    editOutcome,
    removeOutcome,
    addMapping,
    removeMapping,
    cycleCoverage,
  };
}
