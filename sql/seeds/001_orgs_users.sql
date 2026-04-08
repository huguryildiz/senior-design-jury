-- VERA v1 DB Migration — Premium Demo Seed
-- Regenerated with corrected juror/score status semantics
-- Canonical DB Schema
SELECT setseed(0.20260402);
BEGIN;

-- Pre-seed Cleanup
TRUNCATE TABLE
  audit_logs,
  entry_tokens,
  score_sheet_items,
  score_sheets,
  juror_period_auth,
  jurors,
  projects,
  period_criterion_outcome_maps,
  period_criteria,
  period_outcomes,
  periods,
  framework_criterion_outcome_maps,
  framework_criteria,
  framework_outcomes,
  frameworks,
  memberships,
  org_applications,
  organizations,
  profiles
CASCADE;

-- Organizations
INSERT INTO organizations (id, subtitle, name, code, status, settings, contact_email, updated_at) VALUES ('e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'Electrical-Electronics Engineering', 'TED University', 'TEDU-EE', 'active', '{}', 'halil.cankaya@vera-eval.app', timestamp '2026-05-10 12:00:00') ON CONFLICT DO NOTHING;
INSERT INTO organizations (id, subtitle, name, code, status, settings, contact_email, updated_at) VALUES ('b94595d6-710c-4302-ad1b-11f4d216e028', 'Computer Science', 'Carnegie Mellon University', 'CMU-CS', 'active', '{}', 'rachel.voss@vera-eval.app', timestamp '2026-05-10 12:00:00') ON CONFLICT DO NOTHING;
INSERT INTO organizations (id, subtitle, name, code, status, settings, contact_email, updated_at) VALUES ('d8214e32-d30f-4a0c-aee5-1c6fa0d41336', 'Technology Competitions', 'TEKNOFEST', 'TEKNOFEST', 'active', '{}', 'oguzhan.demirel@vera-eval.app', timestamp '2026-05-10 12:00:00') ON CONFLICT DO NOTHING;
INSERT INTO organizations (id, subtitle, name, code, status, settings, contact_email, updated_at) VALUES ('088f5054-c9df-4c7f-a679-c1321524f250', '2204-A Research Projects', 'TÜBİTAK', 'TUBITAK-2204A', 'active', '{}', 'ayca.gurkan@vera-eval.app', timestamp '2026-05-10 12:00:00') ON CONFLICT DO NOTHING;
INSERT INTO organizations (id, subtitle, name, code, status, settings, contact_email, updated_at) VALUES ('ff81ecf1-13ac-44b2-a331-0a207a8c7184', 'AP-S Student Design Contest', 'IEEE', 'IEEE-APSSDC', 'active', '{}', 'arthur.finch@vera-eval.app', timestamp '2026-05-10 12:00:00') ON CONFLICT DO NOTHING;
INSERT INTO organizations (id, subtitle, name, code, status, settings, contact_email, updated_at) VALUES ('b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', '2025 Season', 'CanSat Competition', 'CANSAT-2025', 'active', '{}', 'celine.moreau@vera-eval.app', timestamp '2026-05-10 12:00:00') ON CONFLICT DO NOTHING;

-- Identities
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '6ea7146f-1331-4828-8b8a-e777c9a35d6a', 'authenticated', 'authenticated', 'demo.admin@vera-eval.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('6ea7146f-1331-4828-8b8a-e777c9a35d6a', 'Demo Admin') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('6ea7146f-1331-4828-8b8a-e777c9a35d6a', NULL, 'super_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '216c64b2-324f-4bfb-ac27-a2d8107cca20', 'authenticated', 'authenticated', 'koray.yilmazer@vera-eval.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('216c64b2-324f-4bfb-ac27-a2d8107cca20', 'Koray Yılmazer') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('216c64b2-324f-4bfb-ac27-a2d8107cca20', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'org_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '28a6cb85-d5a2-4f8e-a06a-ad66a2e72b46', 'authenticated', 'authenticated', 'bahar.tandogan@vera-eval.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('28a6cb85-d5a2-4f8e-a06a-ad66a2e72b46', 'Bahar Tandoğan') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('28a6cb85-d5a2-4f8e-a06a-ad66a2e72b46', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'org_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '760dd3bc-5709-4e3b-a5e2-7d288da052d7', 'authenticated', 'authenticated', 'gavin.pierce@vera-eval.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('760dd3bc-5709-4e3b-a5e2-7d288da052d7', 'Gavin Pierce') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('760dd3bc-5709-4e3b-a5e2-7d288da052d7', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'org_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '33c5f117-e2f4-4233-a762-36527757059d', 'authenticated', 'authenticated', 'chloe.beckett@vera-eval.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('33c5f117-e2f4-4233-a762-36527757059d', 'Chloe Beckett') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('33c5f117-e2f4-4233-a762-36527757059d', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'org_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', 'd8ae54ec-5d2f-472a-a348-fd0dd3204ad6', 'authenticated', 'authenticated', 'cemil.bozkurt@vera-eval.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('d8ae54ec-5d2f-472a-a348-fd0dd3204ad6', 'Cemil Bozkurt') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('d8ae54ec-5d2f-472a-a348-fd0dd3204ad6', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', 'org_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '0c3785a7-dc80-44be-ae92-5db23f85227c', 'authenticated', 'authenticated', 'selin.arslan@vera-eval.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('0c3785a7-dc80-44be-ae92-5db23f85227c', 'Selin Arslan') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('0c3785a7-dc80-44be-ae92-5db23f85227c', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', 'org_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '77a855a2-b6b7-49ef-a5f4-1a379c692107', 'authenticated', 'authenticated', 'mert.ozturk@vera-eval.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('77a855a2-b6b7-49ef-a5f4-1a379c692107', 'Mert Öztürk') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('77a855a2-b6b7-49ef-a5f4-1a379c692107', '088f5054-c9df-4c7f-a679-c1321524f250', 'org_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '0289930b-ea4c-47b0-a153-db0c93fad8fe', 'authenticated', 'authenticated', 'marcus.webb@vera-eval.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('0289930b-ea4c-47b0-a153-db0c93fad8fe', 'Marcus Webb') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('0289930b-ea4c-47b0-a153-db0c93fad8fe', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', 'org_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '94060df8-6366-460e-a413-7a7c670243d4', 'authenticated', 'authenticated', 'lena.fischer@vera-eval.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('94060df8-6366-460e-a413-7a7c670243d4', 'Lena Fischer') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('94060df8-6366-460e-a413-7a7c670243d4', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', 'org_admin') ON CONFLICT DO NOTHING;

INSERT INTO org_applications (id, organization_id, applicant_name, contact_email, status) VALUES ('41a5cfa5-99ca-4ac7-aac9-27dba37e757e', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'Prof. Halil Çankaya', 'halil.cankaya@vera-eval.app', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO org_applications (id, organization_id, applicant_name, contact_email, status) VALUES ('8366aa51-cbc3-451b-aa65-0c44c771212b', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'Dr. Rachel Voss', 'rachel.voss@vera-eval.app', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO org_applications (id, organization_id, applicant_name, contact_email, status) VALUES ('1a875b8c-6394-4e4e-a571-7c5d99e974e1', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', 'Oğuzhan Demirel', 'oguzhan.demirel@vera-eval.app', 'rejected') ON CONFLICT DO NOTHING;
INSERT INTO org_applications (id, organization_id, applicant_name, contact_email, status) VALUES ('387f08ee-2cf7-4a9e-af48-2d596e99263b', '088f5054-c9df-4c7f-a679-c1321524f250', 'Dr. Ayça Gürkan', 'ayca.gurkan@vera-eval.app', 'cancelled') ON CONFLICT DO NOTHING;
INSERT INTO org_applications (id, organization_id, applicant_name, contact_email, status) VALUES ('316e1e0e-5bf8-4f55-a250-31814acf9240', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', 'Prof. Arthur Finch', 'arthur.finch@vera-eval.app', 'pending') ON CONFLICT DO NOTHING;
INSERT INTO org_applications (id, organization_id, applicant_name, contact_email, status) VALUES ('3fa0acfb-535b-419f-a2b2-96f7280a8682', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', 'Celine Moreau', 'celine.moreau@vera-eval.app', 'pending') ON CONFLICT DO NOTHING;
