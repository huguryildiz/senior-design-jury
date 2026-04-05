-- VERA v1 — Full teardown: drop all v0 + v1 objects
-- Run this ONCE before applying 001–009 on a fresh or legacy DB.
-- Safe to re-run: all statements use IF EXISTS.

BEGIN;

-- ============================================================
-- VIEWS
-- ============================================================
DROP VIEW IF EXISTS scores_compat CASCADE;

-- ============================================================
-- TABLES (dependency order: children before parents)
-- ============================================================

-- Scoring (v1)
DROP TABLE IF EXISTS score_sheet_items              CASCADE;
DROP TABLE IF EXISTS score_sheets                   CASCADE;

-- Snapshot (v1)
DROP TABLE IF EXISTS period_criterion_outcome_maps  CASCADE;
DROP TABLE IF EXISTS period_outcomes                CASCADE;
DROP TABLE IF EXISTS period_criteria                CASCADE;

-- Execution
DROP TABLE IF EXISTS audit_logs                     CASCADE;
DROP TABLE IF EXISTS entry_tokens                   CASCADE;
DROP TABLE IF EXISTS juror_period_auth              CASCADE;
DROP TABLE IF EXISTS jurors                         CASCADE;
DROP TABLE IF EXISTS projects                       CASCADE;
DROP TABLE IF EXISTS periods                        CASCADE;

-- Framework
DROP TABLE IF EXISTS framework_criterion_outcome_maps CASCADE;
DROP TABLE IF EXISTS framework_criteria               CASCADE;
DROP TABLE IF EXISTS framework_outcomes               CASCADE;
DROP TABLE IF EXISTS criterion_outcome_mappings       CASCADE; -- v0 name
DROP TABLE IF EXISTS outcomes                         CASCADE; -- v0 name
DROP TABLE IF EXISTS frameworks                       CASCADE;

-- Identity
DROP TABLE IF EXISTS org_applications               CASCADE;
DROP TABLE IF EXISTS tenant_applications            CASCADE; -- v0 name
DROP TABLE IF EXISTS memberships                    CASCADE;
DROP TABLE IF EXISTS profiles                       CASCADE;
DROP TABLE IF EXISTS organizations                  CASCADE;

-- ============================================================
-- FUNCTIONS
-- ============================================================
DROP FUNCTION IF EXISTS public.rpc_jury_authenticate(UUID, TEXT, TEXT, BOOLEAN)         CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_verify_pin(UUID, TEXT, TEXT, TEXT)              CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_validate_entry_token(TEXT)                      CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_upsert_scores(UUID, UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_upsert_score(UUID, UUID, UUID, TEXT, JSONB, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_finalize_submission(UUID, UUID, TEXT)           CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_approve_application(UUID)                      CASCADE;
DROP FUNCTION IF EXISTS public.rpc_juror_reset_pin(UUID, UUID)                          CASCADE;
DROP FUNCTION IF EXISTS public.rpc_juror_toggle_edit_mode(UUID, UUID, BOOLEAN, TEXT, INT) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_juror_toggle_edit_mode_v2(UUID, UUID, BOOLEAN, TEXT, INT) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_juror_unlock_pin(UUID, UUID)                         CASCADE;
DROP FUNCTION IF EXISTS public.rpc_entry_token_generate(UUID)                           CASCADE;
DROP FUNCTION IF EXISTS public.rpc_entry_token_revoke(UUID)                             CASCADE;
DROP FUNCTION IF EXISTS public.rpc_period_freeze_snapshot(UUID)                         CASCADE;
DROP FUNCTION IF EXISTS public.current_user_is_super_admin()                            CASCADE;
DROP FUNCTION IF EXISTS public.trigger_set_updated_at()                                 CASCADE;
DROP FUNCTION IF EXISTS public.trigger_audit_log()                                      CASCADE;

-- ============================================================
-- INDEXES (dropped automatically with tables, listed for clarity)
-- ============================================================
-- idx_organizations_name_lower, idx_periods_organization_is_current,
-- idx_projects_period_id, idx_score_sheets_period, idx_score_sheets_juror,
-- idx_score_sheet_items_sheet, idx_audit_logs_organization_created,
-- idx_entry_tokens_token_hash — all dropped via CASCADE above.

COMMIT;
