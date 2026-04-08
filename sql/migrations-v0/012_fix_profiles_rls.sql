-- VERA — Fix profiles RLS: allow super admins to read all profiles
-- Needed so super-admin can see org member names/emails in PostgREST joins
-- (e.g. memberships(*, profiles(*)) in listOrganizations)

DROP POLICY IF EXISTS "profiles_select" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  id = auth.uid() OR current_user_is_super_admin()
);
