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
  writeAuditLog,
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
      if (maps.length === 0) return "none";
      if (maps.some((m) => m.coverage_type === "direct")) return "direct";
      return "indirect";
    },
    [mappings]
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

      writeAuditLog("outcome.create", {
        resourceType: "framework_outcomes",
        resourceId: newOutcome.id,
        details: { code, label: shortLabel, criterionCount: criterionIds.length },
      }).catch(() => {});
      await loadAll();
      return newOutcome;
    },
    [frameworkId, outcomes, loadAll]
  );

  const editOutcome = useCallback(
    async (outcomeId, { label, description, criterionIds = [] }) => {
      // Update the outcome row
      await updateOutcome(outcomeId, {
        label,
        description: description || null,
      });

      // Sync mappings: remove old, add new
      const currentMaps = mappings.filter((m) => m.outcome_id === outcomeId);
      const currentCritIds = currentMaps.map((m) => m.criterion_id);

      const toRemove = currentMaps.filter((m) => !criterionIds.includes(m.criterion_id));
      const toAdd = criterionIds.filter((id) => !currentCritIds.includes(id));

      await Promise.all([
        ...toRemove.map((m) => deleteCriterionOutcomeMapping(m.id)),
        ...toAdd.map((critId) =>
          upsertCriterionOutcomeMapping({
            framework_id: frameworkId,
            criterion_id: critId,
            outcome_id: outcomeId,
            coverage_type: "direct",
          })
        ),
      ]);

      writeAuditLog("outcome.update", {
        resourceType: "framework_outcomes",
        resourceId: outcomeId,
        details: { label, mappingsAdded: toAdd.length, mappingsRemoved: toRemove.length },
      }).catch(() => {});
      await loadAll();
    },
    [frameworkId, mappings, loadAll]
  );

  const removeOutcome = useCallback(
    async (outcomeId) => {
      await deleteOutcome(outcomeId);
      writeAuditLog("outcome.delete", {
        resourceType: "framework_outcomes",
        resourceId: outcomeId,
      }).catch(() => {});
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
        // none → indirect: we need at least one mapping to mark indirect.
        // Since there's no criterion, we can't create a real mapping.
        // Use a special "indirect" marker — pick the first criterion as a placeholder.
        // Actually, the cleaner approach: if the outcome has no mappings,
        // the UI cycles none ↔ indirect purely locally. We'll handle
        // persistence via outcome-level flag if DB supports it.
        // For now, return the target state and let the page handle local state.
        return "indirect";
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
    [mappings, loadAll]
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
