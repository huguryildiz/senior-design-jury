-- 032_rpc_accept_invite.sql
-- Promotes all 'invited' memberships for the currently authenticated user
-- to 'active'. Called from InviteAcceptScreen after the user sets their
-- password. Uses SECURITY DEFINER to bypass the super-admin-only UPDATE
-- RLS policy on the memberships table.
-- The function is intentionally narrow: it can only promote the caller's own
-- memberships, and only from 'invited' → 'active'.

CREATE OR REPLACE FUNCTION public.rpc_accept_invite()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE memberships
  SET status = 'active'
  WHERE user_id = auth.uid()
    AND status = 'invited';
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_accept_invite() TO authenticated;
