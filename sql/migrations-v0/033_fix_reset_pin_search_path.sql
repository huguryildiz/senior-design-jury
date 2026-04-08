-- 033: Fix rpc_juror_reset_pin search_path missing extensions schema.
--
-- Why:
-- Migration 032 redefined rpc_juror_reset_pin with
--   SET search_path = public, auth
-- which omits the `extensions` schema where pgcrypto is installed (migration 020).
-- This causes "function gen_salt(unknown) does not exist" at runtime.
--
-- Fix: add `extensions` to the function's search_path.

ALTER FUNCTION public.rpc_juror_reset_pin(UUID, UUID)
  SET search_path = public, auth, extensions;
