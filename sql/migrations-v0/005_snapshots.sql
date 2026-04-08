-- VERA v1 — Period Snapshot Tables + Freeze RPC
-- Tables: period_criteria, period_outcomes, period_criterion_outcome_maps
-- RPC: rpc_period_freeze_snapshot

-- =============================================================================
-- PERIOD_CRITERIA  (snapshot)
-- =============================================================================
-- Immutable copy of framework_criteria taken when period is frozen.
-- score_sheet_items reference these, never the live framework_criteria.

CREATE TABLE period_criteria (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id           UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  source_criterion_id UUID,
  key                 TEXT NOT NULL,
  label               TEXT NOT NULL,
  short_label         TEXT,
  description         TEXT,
  max_score           NUMERIC NOT NULL,
  weight              NUMERIC NOT NULL,
  color               TEXT,
  rubric_bands        JSONB,
  sort_order          INT DEFAULT 0,
  UNIQUE(period_id, key)
);

-- =============================================================================
-- PERIOD_OUTCOMES  (snapshot)
-- =============================================================================

CREATE TABLE period_outcomes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id         UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  source_outcome_id UUID,
  code              TEXT NOT NULL,
  label             TEXT NOT NULL,
  description       TEXT,
  sort_order        INT DEFAULT 0,
  UNIQUE(period_id, code)
);

-- =============================================================================
-- PERIOD_CRITERION_OUTCOME_MAPS  (snapshot)
-- =============================================================================

CREATE TABLE period_criterion_outcome_maps (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id            UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  period_criterion_id  UUID NOT NULL REFERENCES period_criteria(id) ON DELETE CASCADE,
  period_outcome_id    UUID NOT NULL REFERENCES period_outcomes(id) ON DELETE CASCADE,
  coverage_type        TEXT CHECK (coverage_type IN ('direct', 'indirect')),
  weight               NUMERIC,
  UNIQUE(period_criterion_id, period_outcome_id)
);

-- =============================================================================
-- RPC: rpc_period_freeze_snapshot
-- =============================================================================
-- Copies framework criteria/outcomes/maps into period snapshot tables.
-- Idempotent: if snapshot already exists, returns ok with no changes.

CREATE OR REPLACE FUNCTION rpc_period_freeze_snapshot(p_period_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period          periods%ROWTYPE;
  v_criteria_count  INT;
  v_outcomes_count  INT;
BEGIN
  -- Validate period exists and has a framework
  SELECT * INTO v_period FROM periods WHERE id = p_period_id;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'period_not_found');
  END IF;

  IF v_period.framework_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'period_has_no_framework');
  END IF;

  -- Idempotent: already frozen → return ok immediately
  IF v_period.snapshot_frozen_at IS NOT NULL THEN
    SELECT COUNT(*) INTO v_criteria_count FROM period_criteria WHERE period_id = p_period_id;
    SELECT COUNT(*) INTO v_outcomes_count FROM period_outcomes WHERE period_id = p_period_id;
    RETURN json_build_object(
      'ok',              true,
      'already_frozen',  true,
      'criteria_count',  v_criteria_count,
      'outcomes_count',  v_outcomes_count
    );
  END IF;

  -- Snapshot: framework_criteria -> period_criteria
  INSERT INTO period_criteria (
    period_id, source_criterion_id, key, label, short_label,
    description, max_score, weight, color, rubric_bands, sort_order
  )
  SELECT
    p_period_id, fc.id, fc.key, fc.label, fc.short_label,
    fc.description, fc.max_score, fc.weight, fc.color, fc.rubric_bands, fc.sort_order
  FROM framework_criteria fc
  WHERE fc.framework_id = v_period.framework_id;

  GET DIAGNOSTICS v_criteria_count = ROW_COUNT;

  -- Snapshot: framework_outcomes -> period_outcomes
  INSERT INTO period_outcomes (
    period_id, source_outcome_id, code, label, description, sort_order
  )
  SELECT
    p_period_id, fo.id, fo.code, fo.label, fo.description, fo.sort_order
  FROM framework_outcomes fo
  WHERE fo.framework_id = v_period.framework_id;

  GET DIAGNOSTICS v_outcomes_count = ROW_COUNT;

  -- Snapshot: framework_criterion_outcome_maps -> period_criterion_outcome_maps
  INSERT INTO period_criterion_outcome_maps (
    period_id, period_criterion_id, period_outcome_id, coverage_type, weight
  )
  SELECT
    p_period_id,
    pc.id,
    po.id,
    fcom.coverage_type,
    fcom.weight
  FROM framework_criterion_outcome_maps fcom
  JOIN period_criteria pc ON pc.source_criterion_id = fcom.criterion_id
                          AND pc.period_id = p_period_id
  JOIN period_outcomes po ON po.source_outcome_id = fcom.outcome_id
                          AND po.period_id = p_period_id
  WHERE fcom.framework_id = v_period.framework_id;

  -- Mark period as frozen
  UPDATE periods
  SET snapshot_frozen_at = now()
  WHERE id = p_period_id;

  RETURN json_build_object(
    'ok',              true,
    'already_frozen',  false,
    'criteria_count',  v_criteria_count,
    'outcomes_count',  v_outcomes_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_period_freeze_snapshot(UUID) TO authenticated;

-- =============================================================================
-- ROLE GRANTS
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON period_criteria              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON period_outcomes              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON period_criterion_outcome_maps TO authenticated;

GRANT SELECT ON period_criteria               TO anon;
GRANT SELECT ON period_outcomes               TO anon;
GRANT SELECT ON period_criterion_outcome_maps TO anon;
