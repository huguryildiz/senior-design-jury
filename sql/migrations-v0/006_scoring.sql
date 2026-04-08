-- VERA v1 — Scoring
-- Tables: score_sheets, score_sheet_items
-- View:   scores_compat  (backward-compatibility bridge for admin pages)
-- Indexes

-- =============================================================================
-- SCORE_SHEETS
-- =============================================================================
-- One row per (juror, project) pair within a period.

CREATE TABLE score_sheets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id        UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  juror_id         UUID NOT NULL REFERENCES jurors(id) ON DELETE CASCADE,
  comment          TEXT,
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'in_progress', 'submitted')),
  started_at       TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(juror_id, project_id)
);

-- =============================================================================
-- SCORE_SHEET_ITEMS
-- =============================================================================
-- One row per (score_sheet, period_criterion) pair.
-- score_value NULL = not yet scored.

CREATE TABLE score_sheet_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_sheet_id       UUID NOT NULL REFERENCES score_sheets(id) ON DELETE CASCADE,
  period_criterion_id  UUID NOT NULL REFERENCES period_criteria(id),
  score_value          NUMERIC CHECK (score_value >= 0),
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(score_sheet_id, period_criterion_id)
);

-- =============================================================================
-- SCORES_COMPAT VIEW
-- =============================================================================
-- Presents normalized scoring data in the flat wide-row shape that the current
-- admin pages expect. Keeps adminApi.js / fieldMapping.js working without changes.
--
-- Criterion key mapping (matches fieldMapping.js dbScoresToUi):
--   technical  -> technical  (column: technical)
--   design     -> written    (column: written)
--   delivery   -> oral       (column: oral)
--   teamwork   -> teamwork   (column: teamwork)

CREATE OR REPLACE VIEW scores_compat AS
SELECT
  ss.id,
  ss.juror_id,
  ss.project_id,
  ss.period_id,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'technical') AS technical,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'design')    AS written,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'delivery')  AS oral,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'teamwork')  AS teamwork,
  ss.comment AS comments,
  ss.created_at,
  ss.updated_at
FROM score_sheets ss
LEFT JOIN score_sheet_items ssi ON ssi.score_sheet_id = ss.id
LEFT JOIN period_criteria   pc  ON pc.id = ssi.period_criterion_id
GROUP BY ss.id;

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_score_sheets_period  ON score_sheets(period_id);
CREATE INDEX idx_score_sheets_juror   ON score_sheets(juror_id);
CREATE INDEX idx_score_sheet_items_sheet ON score_sheet_items(score_sheet_id);

-- =============================================================================
-- ROLE GRANTS
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON score_sheets      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON score_sheet_items TO authenticated;
GRANT SELECT ON scores_compat                             TO authenticated;

GRANT SELECT ON score_sheets      TO anon;
GRANT SELECT ON score_sheet_items TO anon;
GRANT SELECT ON scores_compat     TO anon;
