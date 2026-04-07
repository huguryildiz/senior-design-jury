-- Migration 023: Jury Feedback
-- Table for juror ratings + optional comments after submission.
-- RPCs: submit (session-token auth), public read (anon, for landing page).

-- =============================================================================
-- TABLE
-- =============================================================================

CREATE TABLE jury_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id   UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  juror_id    UUID NOT NULL REFERENCES jurors(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One feedback per juror per period
CREATE UNIQUE INDEX uq_jury_feedback_juror_period
  ON jury_feedback(period_id, juror_id);

-- RLS: block direct access, all reads/writes go through SECURITY DEFINER RPCs
ALTER TABLE jury_feedback ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RPC: submit feedback (jury session token auth)
-- =============================================================================

CREATE OR REPLACE FUNCTION rpc_submit_jury_feedback(
  p_period_id     UUID,
  p_session_token TEXT,
  p_rating        SMALLINT,
  p_comment       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_juror_id UUID;
BEGIN
  -- Validate session token
  SELECT juror_id INTO v_juror_id
  FROM juror_period_auth
  WHERE period_id = p_period_id
    AND session_token_hash = encode(digest(p_session_token, 'sha256'), 'hex')
    AND (is_blocked IS NULL OR is_blocked = FALSE);

  IF v_juror_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'invalid_session');
  END IF;

  -- Validate rating
  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'invalid_rating');
  END IF;

  -- Upsert: juror can update their feedback within the same period
  INSERT INTO jury_feedback (period_id, juror_id, rating, comment)
  VALUES (p_period_id, v_juror_id, p_rating, NULLIF(TRIM(p_comment), ''))
  ON CONFLICT (period_id, juror_id)
  DO UPDATE SET
    rating     = EXCLUDED.rating,
    comment    = EXCLUDED.comment,
    created_at = now();

  RETURN jsonb_build_object('ok', TRUE);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_submit_jury_feedback(UUID, TEXT, SMALLINT, TEXT) TO anon, authenticated;

-- =============================================================================
-- RPC: public feedback for landing page (anon)
-- =============================================================================
-- Returns aggregate rating + approved testimonials with juror name/affiliation.

CREATE OR REPLACE FUNCTION rpc_get_public_feedback()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT jsonb_build_object(
    -- Aggregate stats (all feedback, regardless of is_public)
    'avg_rating',    COALESCE(ROUND(AVG(jf.rating)::NUMERIC, 1), 0),
    'total_count',   COUNT(*)::INT,

    -- Approved testimonials (is_public = true, has comment, rating >= 4)
    'testimonials', COALESCE(
      (SELECT jsonb_agg(t ORDER BY t.created_at DESC)
       FROM (
         SELECT
           jf2.rating,
           jf2.comment,
           j.juror_name,
           j.affiliation,
           jf2.created_at
         FROM jury_feedback jf2
         JOIN jurors j ON j.id = jf2.juror_id
         WHERE jf2.is_public = TRUE
           AND jf2.comment IS NOT NULL
           AND jf2.rating >= 4
         ORDER BY jf2.created_at DESC
         LIMIT 10
       ) t
      ),
      '[]'::jsonb
    )
  )
  FROM jury_feedback jf;
$$;

GRANT EXECUTE ON FUNCTION rpc_get_public_feedback() TO anon, authenticated;
