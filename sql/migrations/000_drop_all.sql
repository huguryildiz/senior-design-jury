-- VERA v1 — Full teardown: drop all v1 objects
-- Run this ONCE before re-applying 001–006 on a fresh or existing DB.
-- Safe to re-run: all statements use IF EXISTS.

BEGIN;

-- ============================================================
-- VIEWS
-- ============================================================
DROP VIEW IF EXISTS scores_compat CASCADE;

-- ============================================================
-- TABLES (dependency order: children before parents)
-- ============================================================

-- Feedback
DROP TABLE IF EXISTS jury_feedback                   CASCADE;

-- Config
DROP TABLE IF EXISTS security_policy                 CASCADE;
DROP TABLE IF EXISTS maintenance_mode                CASCADE;

-- Scoring
DROP TABLE IF EXISTS score_sheet_items               CASCADE;
DROP TABLE IF EXISTS score_sheets                    CASCADE;

-- Snapshot
DROP TABLE IF EXISTS period_criterion_outcome_maps   CASCADE;
DROP TABLE IF EXISTS period_outcomes                 CASCADE;
DROP TABLE IF EXISTS period_criteria                 CASCADE;

-- Execution
DROP TABLE IF EXISTS audit_logs                      CASCADE;
DROP TABLE IF EXISTS entry_tokens                    CASCADE;
DROP TABLE IF EXISTS juror_period_auth               CASCADE;
DROP TABLE IF EXISTS jurors                          CASCADE;
DROP TABLE IF EXISTS projects                        CASCADE;
DROP TABLE IF EXISTS periods                         CASCADE;

-- Framework
DROP TABLE IF EXISTS framework_criterion_outcome_maps CASCADE;
DROP TABLE IF EXISTS framework_criteria               CASCADE;
DROP TABLE IF EXISTS framework_outcomes               CASCADE;
DROP TABLE IF EXISTS frameworks                       CASCADE;

-- v0 legacy names (safe no-ops on fresh DB)
DROP TABLE IF EXISTS criterion_outcome_mappings       CASCADE;
DROP TABLE IF EXISTS outcomes                         CASCADE;
DROP TABLE IF EXISTS tenant_applications              CASCADE;

-- Identity
DROP TABLE IF EXISTS org_applications                CASCADE;
DROP TABLE IF EXISTS memberships                     CASCADE;
DROP TABLE IF EXISTS profiles                        CASCADE;
DROP TABLE IF EXISTS organizations                   CASCADE;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- RPCs: Jury
DROP FUNCTION IF EXISTS public.rpc_jury_authenticate(UUID, TEXT, TEXT, BOOLEAN, TEXT)       CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_authenticate(UUID, TEXT, TEXT, BOOLEAN)             CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_verify_pin(UUID, TEXT, TEXT, TEXT)                  CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_validate_entry_token(TEXT)                          CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_upsert_score(UUID, UUID, UUID, TEXT, JSONB, TEXT)   CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_finalize_submission(UUID, UUID, TEXT)               CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_get_scores(UUID, UUID, TEXT)                        CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_project_rankings(UUID, TEXT)                        CASCADE;
DROP FUNCTION IF EXISTS public.rpc_get_period_impact(UUID, TEXT)                            CASCADE;
DROP FUNCTION IF EXISTS public.rpc_submit_jury_feedback(UUID, TEXT, SMALLINT, TEXT)         CASCADE;
DROP FUNCTION IF EXISTS public.rpc_get_public_feedback()                                    CASCADE;

-- RPCs: Admin
DROP FUNCTION IF EXISTS public.rpc_juror_reset_pin(UUID, UUID)                             CASCADE;
DROP FUNCTION IF EXISTS public.rpc_juror_toggle_edit_mode_v2(UUID, UUID, BOOLEAN, TEXT, INT) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_juror_toggle_edit_mode(UUID, UUID, BOOLEAN, TEXT, INT)   CASCADE;
DROP FUNCTION IF EXISTS public.rpc_juror_unlock_pin(UUID, UUID)                            CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_approve_application(UUID)                          CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_list_organizations()                               CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_generate_entry_token(UUID)                         CASCADE;
DROP FUNCTION IF EXISTS public.rpc_entry_token_generate(UUID)                               CASCADE;
DROP FUNCTION IF EXISTS public.rpc_entry_token_revoke(UUID)                                 CASCADE;

-- RPCs: Public / Stats
DROP FUNCTION IF EXISTS public.rpc_landing_stats()                                          CASCADE;
DROP FUNCTION IF EXISTS public.rpc_platform_metrics()                                       CASCADE;
DROP FUNCTION IF EXISTS public.rpc_period_freeze_snapshot(UUID)                             CASCADE;

-- RPCs: System Config
DROP FUNCTION IF EXISTS public.rpc_public_maintenance_status()                              CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_get_maintenance()                                  CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_set_maintenance(TEXT, TIMESTAMPTZ, INT, TEXT, UUID[], BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_cancel_maintenance()                               CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_get_security_policy()                              CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_set_security_policy(JSONB)                         CASCADE;

-- Helpers & Triggers
DROP FUNCTION IF EXISTS public._assert_super_admin()                                        CASCADE;
DROP FUNCTION IF EXISTS public.current_user_is_super_admin()                                CASCADE;
DROP FUNCTION IF EXISTS public.trigger_set_updated_at()                                     CASCADE;
DROP FUNCTION IF EXISTS public.trigger_audit_log()                                          CASCADE;

-- v0 legacy (safe no-ops)
DROP FUNCTION IF EXISTS public.rpc_jury_upsert_scores(UUID, UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT) CASCADE;

COMMIT;
