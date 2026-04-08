-- 020: Ensure pgcrypto is available and digest() is resolvable in jury RPCs.
--
-- Why:
-- Demo runtime showed:
--   function digest(text, unknown) does not exist
-- in rpc_jury_upsert_score / rpc_jury_finalize_submission.
--
-- Fix strategy:
-- 1) Ensure pgcrypto extension exists (idempotent).
-- 2) Add `extensions` to function search_path so unqualified digest() resolves
--    regardless of where pgcrypto is installed.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER FUNCTION public.rpc_jury_upsert_score(UUID, UUID, UUID, TEXT, JSONB, TEXT)
  SET search_path = public, extensions;

ALTER FUNCTION public.rpc_jury_finalize_submission(UUID, UUID, TEXT)
  SET search_path = public, extensions;
