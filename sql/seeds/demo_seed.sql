-- VERA v1 DB Migration — Premium Demo Seed
-- Generated for targeted cleanup (Phase 4B refinements)
-- Canonical DB Schema
SELECT setseed(0.20260402);
BEGIN;

-- Pre-seed Cleanup
TRUNCATE TABLE 
  audit_logs,
  entry_tokens,
  score_sheet_items,
  score_sheets,
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
INSERT INTO organizations (id, subtitle, name, code, status, settings, updated_at) VALUES ('e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'TED University', 'Electrical-Electronics Engineering', 'TEDU-EE', 'active', '{}', timestamp '2026-05-10 12:00:00') ON CONFLICT DO NOTHING;
INSERT INTO organizations (id, subtitle, name, code, status, settings, updated_at) VALUES ('b94595d6-710c-4302-ad1b-11f4d216e028', 'Carnegie Mellon University', 'Computer Science', 'CMU-CS', 'active', '{}', timestamp '2026-05-10 12:00:00') ON CONFLICT DO NOTHING;
INSERT INTO organizations (id, subtitle, name, code, status, settings, updated_at) VALUES ('d8214e32-d30f-4a0c-aee5-1c6fa0d41336', 'TEKNOFEST', 'Technology Competitions', 'TEKNOFEST', 'active', '{}', timestamp '2026-05-10 12:00:00') ON CONFLICT DO NOTHING;
INSERT INTO organizations (id, subtitle, name, code, status, settings, updated_at) VALUES ('088f5054-c9df-4c7f-a679-c1321524f250', 'TUBITAK', '2204-A Research Projects', 'TUBITAK-2204A', 'active', '{}', timestamp '2026-05-10 12:00:00') ON CONFLICT DO NOTHING;
INSERT INTO organizations (id, subtitle, name, code, status, settings, updated_at) VALUES ('ff81ecf1-13ac-44b2-a331-0a207a8c7184', 'IEEE', 'AP-S Student Design Contest', 'IEEE-APSSDC', 'active', '{}', timestamp '2026-05-10 12:00:00') ON CONFLICT DO NOTHING;
INSERT INTO organizations (id, subtitle, name, code, status, settings, updated_at) VALUES ('b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', 'CanSat Competition', '2025 Season', 'CANSAT-2025', 'active', '{}', timestamp '2026-05-10 12:00:00') ON CONFLICT DO NOTHING;

-- Identities
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '6ea7146f-1331-4828-8b8a-e777c9a35d6a', 'authenticated', 'authenticated', 'admin@vera.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('6ea7146f-1331-4828-8b8a-e777c9a35d6a', 'Demo Admin') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('6ea7146f-1331-4828-8b8a-e777c9a35d6a', NULL, 'super_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '216c64b2-324f-4bfb-ac27-a2d8107cca20', 'authenticated', 'authenticated', 'admin1@tedu-ee.demo.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('216c64b2-324f-4bfb-ac27-a2d8107cca20', 'Koray Yılmazer (TEDU-EE)') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('216c64b2-324f-4bfb-ac27-a2d8107cca20', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'org_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '28a6cb85-d5a2-4f8e-a06a-ad66a2e72b46', 'authenticated', 'authenticated', 'admin2@tedu-ee.demo.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('28a6cb85-d5a2-4f8e-a06a-ad66a2e72b46', 'Bahar Tandoğan (TEDU-EE)') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('28a6cb85-d5a2-4f8e-a06a-ad66a2e72b46', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'org_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '760dd3bc-5709-4e3b-a5e2-7d288da052d7', 'authenticated', 'authenticated', 'admin1@cmu-cs.demo.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('760dd3bc-5709-4e3b-a5e2-7d288da052d7', 'Gavin Pierce (CMU-CS)') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('760dd3bc-5709-4e3b-a5e2-7d288da052d7', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'org_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '33c5f117-e2f4-4233-a762-36527757059d', 'authenticated', 'authenticated', 'admin2@cmu-cs.demo.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('33c5f117-e2f4-4233-a762-36527757059d', 'Chloe Beckett (CMU-CS)') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('33c5f117-e2f4-4233-a762-36527757059d', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'org_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', 'd8ae54ec-5d2f-472a-a348-fd0dd3204ad6', 'authenticated', 'authenticated', 'admin1@teknofest.demo.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('d8ae54ec-5d2f-472a-a348-fd0dd3204ad6', 'Cemil Bozkurt (TEKNOFEST)') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('d8ae54ec-5d2f-472a-a348-fd0dd3204ad6', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', 'org_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '0c3785a7-dc80-44be-ae92-5db23f85227c', 'authenticated', 'authenticated', 'admin2@teknofest.demo.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('0c3785a7-dc80-44be-ae92-5db23f85227c', 'Cemil Bozkurt (TEKNOFEST)') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('0c3785a7-dc80-44be-ae92-5db23f85227c', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', 'org_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '77a855a2-b6b7-49ef-a5f4-1a379c692107', 'authenticated', 'authenticated', 'admin1@tubitak-2204a.demo.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('77a855a2-b6b7-49ef-a5f4-1a379c692107', 'Koray Yılmazer (TUBITAK-2204A)') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('77a855a2-b6b7-49ef-a5f4-1a379c692107', '088f5054-c9df-4c7f-a679-c1321524f250', 'org_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '0289930b-ea4c-47b0-a153-db0c93fad8fe', 'authenticated', 'authenticated', 'admin1@ieee-apssdc.demo.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('0289930b-ea4c-47b0-a153-db0c93fad8fe', 'Chloe Beckett (IEEE-APSSDC)') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('0289930b-ea4c-47b0-a153-db0c93fad8fe', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', 'org_admin') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('00000000-0000-0000-0000-000000000000', '94060df8-6366-460e-a413-7a7c670243d4', 'authenticated', 'authenticated', 'admin1@cansat-2025.demo.app', '', now(), now(), now(), '', '', '', '') ON CONFLICT DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES ('94060df8-6366-460e-a413-7a7c670243d4', 'Chloe Beckett (CANSAT-2025)') ON CONFLICT DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role) VALUES ('94060df8-6366-460e-a413-7a7c670243d4', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', 'org_admin') ON CONFLICT DO NOTHING;

INSERT INTO org_applications (id, organization_id, applicant_name, contact_email, status) VALUES ('41a5cfa5-99ca-4ac7-aac9-27dba37e757e', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'Prof. Halil Çankaya', 'tedu-ee@example.edu', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO org_applications (id, organization_id, applicant_name, contact_email, status) VALUES ('8366aa51-cbc3-451b-aa65-0c44c771212b', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'Dr. Rachel Voss', 'cmu-cs@example.edu', 'approved') ON CONFLICT DO NOTHING;
INSERT INTO org_applications (id, organization_id, applicant_name, contact_email, status) VALUES ('1a875b8c-6394-4e4e-a571-7c5d99e974e1', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', 'Oğuzhan Demirel', 'teknofest@example.edu', 'rejected') ON CONFLICT DO NOTHING;
INSERT INTO org_applications (id, organization_id, applicant_name, contact_email, status) VALUES ('387f08ee-2cf7-4a9e-af48-2d596e99263b', '088f5054-c9df-4c7f-a679-c1321524f250', 'Dr. Ayça Gürkan', 'tubitak-2204a@example.edu', 'cancelled') ON CONFLICT DO NOTHING;
INSERT INTO org_applications (id, organization_id, applicant_name, contact_email, status) VALUES ('316e1e0e-5bf8-4f55-a250-31814acf9240', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', 'Prof. Arthur Finch', 'ieee-apssdc@example.edu', 'pending') ON CONFLICT DO NOTHING;
INSERT INTO org_applications (id, organization_id, applicant_name, contact_email, status) VALUES ('3fa0acfb-535b-419f-a2b2-96f7280a8682', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', 'Celine Moreau', 'cansat-2025@example.edu', 'pending') ON CONFLICT DO NOTHING;

-- Frameworks
INSERT INTO frameworks (id, organization_id, name, version, is_default) VALUES ('0147d901-984d-44c1-a08f-94f919659596', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'MUDEK 2024', '1.0', true) ON CONFLICT DO NOTHING;
INSERT INTO frameworks (id, organization_id, name, version, is_default) VALUES ('efe329b2-0a62-4279-a7d1-627abe557321', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'ABET 2024', '1.0', true) ON CONFLICT DO NOTHING;
INSERT INTO frameworks (id, organization_id, name, version, is_default) VALUES ('824ead2b-7676-4297-a6e1-507869f5f299', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', 'Competition Framework 2026', '2026', true) ON CONFLICT DO NOTHING;
INSERT INTO frameworks (id, organization_id, name, version, is_default) VALUES ('cf0b03e5-576d-4961-a0cc-f86b7852b85f', '088f5054-c9df-4c7f-a679-c1321524f250', 'Research Competition Framework', '2204A', true) ON CONFLICT DO NOTHING;
INSERT INTO frameworks (id, organization_id, name, version, is_default) VALUES ('8df4448a-b223-4569-a92e-4c81b669b065', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', 'Design Contest Framework', '1.0', true) ON CONFLICT DO NOTHING;
INSERT INTO frameworks (id, organization_id, name, version, is_default) VALUES ('80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', 'Mission Framework', '2025', true) ON CONFLICT DO NOTHING;

-- Framework Outcomes
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('af277367-f639-4c4d-a8c5-30a0ecd66e71', '0147d901-984d-44c1-a08f-94f919659596', '1.2', 'Adequate knowledge in mathematics, science and engineering', 1) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('2f2d65ff-1630-4400-a9e7-153e458bec4d', '0147d901-984d-44c1-a08f-94f919659596', '2', 'Ability to formulate and solve complex engineering problems', 2) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('b2051f4f-495a-4917-af9c-4e6dcf36b33c', '0147d901-984d-44c1-a08f-94f919659596', '3.1', 'Ability to design a complex system under realistic constraints', 3) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('7ad8e211-7c0c-4a61-a980-9efc66d6fece', '0147d901-984d-44c1-a08f-94f919659596', '3.2', 'Ability to apply modern design methods', 4) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('7679cc95-f407-424e-a8d0-7f9d6cf70fed', '0147d901-984d-44c1-a08f-94f919659596', '8.1', 'Ability to function effectively in teams', 5) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('f4b7e7da-4550-43eb-a884-0b5d8d9cf1b2', '0147d901-984d-44c1-a08f-94f919659596', '8.2', 'Ability to work in multi-disciplinary teams', 6) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('53b7fb91-c8a8-4fbf-a081-8393b09b260c', '0147d901-984d-44c1-a08f-94f919659596', '9.1', 'Oral communication effectiveness', 7) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('b641718c-6926-409a-a300-d18eabe03877', '0147d901-984d-44c1-a08f-94f919659596', '9.2', 'Written communication effectiveness', 8) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('0c61d3b2-4098-4181-a0a9-af00ccddd55f', 'efe329b2-0a62-4279-a7d1-627abe557321', 'SO-1', 'Complex Problem Solving', 1) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('4ed4e517-5b27-4f61-a16b-6d7b86d2d592', 'efe329b2-0a62-4279-a7d1-627abe557321', 'SO-2', 'Engineering Design', 2) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('cc92ffdb-deee-4b4a-ad3f-ab54b9a16df3', 'efe329b2-0a62-4279-a7d1-627abe557321', 'SO-3', 'Effective Communication', 3) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('f4f08ca1-e5f1-4cc9-aa5f-a308966a9375', 'efe329b2-0a62-4279-a7d1-627abe557321', 'SO-4', 'Ethics and Professional Responsibility', 4) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('f9c945a1-24f5-4ab1-abad-9a35a116c09c', 'efe329b2-0a62-4279-a7d1-627abe557321', 'SO-5', 'Teamwork', 5) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('e55ec114-ecd9-4bbc-acb2-56ddbb255ee3', 'efe329b2-0a62-4279-a7d1-627abe557321', 'SO-6', 'Experimentation and Analysis', 6) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('293b2e58-626c-4a8a-afab-c4827d6888ae', 'efe329b2-0a62-4279-a7d1-627abe557321', 'SO-7', 'Lifelong Learning', 7) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('f21e10be-2829-4161-acf2-6ca56c414d98', '824ead2b-7676-4297-a6e1-507869f5f299', 'TC-1', 'Preliminary Evaluation Report Quality', 1) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('5f1f1555-845b-4498-a005-4878e6f4d692', '824ead2b-7676-4297-a6e1-507869f5f299', 'TC-2', 'Critical Design Maturity', 2) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('daeff078-d457-48cc-af0f-7ebefc99a64f', '824ead2b-7676-4297-a6e1-507869f5f299', 'TC-3', 'Field Performance and Jury Presentation', 3) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('c0f9b501-7d38-4fcc-a565-65ad87f853f4', '824ead2b-7676-4297-a6e1-507869f5f299', 'TC-4', 'General Team Competency', 4) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('927c6ee5-bb03-44b8-afda-2a97f4272add', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', 'RC-1', 'Originality and Creativity', 1) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('8258a7a0-3329-4b87-a2f9-ed57789c5d5f', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', 'RC-2', 'Scientific Method', 2) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('29460c43-c2cc-42dc-a55c-9ae4ac05cb0f', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', 'RC-3', 'Results and Recommendations', 3) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('5971a865-48c8-45c7-a1fe-42276ca9c27c', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', 'RC-4', 'Applicability and Feasibility', 4) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('5994e0a4-3fa2-434e-abab-246d6d0f6cf3', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', 'RC-5', 'Broader Impact', 5) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('d4f70008-8664-4fc1-adca-346d3719c329', '8df4448a-b223-4569-a92e-4c81b669b065', 'DC-1', 'Creativity', 1) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('22c36b11-dbe6-4200-a746-877759e831c7', '8df4448a-b223-4569-a92e-4c81b669b065', 'DC-2', 'Technical Merit', 2) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('c08428e2-0dca-42a4-a982-8f8f34f1a827', '8df4448a-b223-4569-a92e-4c81b669b065', 'DC-3', 'Practical Application', 3) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('208c4237-ddb7-4d8d-ae87-221df0bf5619', '8df4448a-b223-4569-a92e-4c81b669b065', 'DC-4', 'Educational Value', 4) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('a7c6db91-308c-49ba-a91a-172d1e4f00f8', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', 'CS-1', 'Design Constraints Compliance', 1) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('5589d3d4-c99e-4d87-a314-83e41236ca3a', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', 'CS-2', 'Primary Mission Execution', 2) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('8e106aab-5b22-43d8-aa13-3ce02bff7660', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', 'CS-3', 'Descent Control and Recovery', 3) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('7d5079e4-7b9c-4643-ac59-588ae909330f', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', 'CS-4', 'Safety and Restrictions Compliance', 4) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('08691235-b202-4833-a43d-46b4b5383f13', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', 'CS-5', 'Secondary Mission Originality', 5) ON CONFLICT DO NOTHING;
INSERT INTO framework_outcomes (id, framework_id, code, label, sort_order) VALUES ('bce51d2c-50dc-4702-aa43-169b8160e443', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', 'CS-6', 'Data Analysis and Documentation Quality', 6) ON CONFLICT DO NOTHING;

-- Framework Criteria
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('c88501db-537c-448f-a967-fd759b41915b', '0147d901-984d-44c1-a08f-94f919659596', 'technical', 'Technical Content', 'Technical', 30, 30, '#F59E0B', '[{"min":27,"max":30,"label":"Excellent","description":"Problem is clearly defined with strong motivation. Design decisions are well-justified with engineering depth. Originality and mastery of relevant tools or methods are evident."},{"min":21,"max":26,"label":"Good","description":"Design is mostly clear and technically justified. Engineering decisions are largely supported."},{"min":13,"max":20,"label":"Developing","description":"Problem is stated but motivation or technical justification is insufficient."},{"min":0,"max":12,"label":"Insufficient","description":"Vague problem definition and unjustified decisions. Superficial technical content."}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('91d2ee22-2b0f-48eb-ac87-5e1fed001650', '0147d901-984d-44c1-a08f-94f919659596', 'design', 'Written Communication', 'Written', 30, 30, '#22C55E', '[{"min":27,"max":30,"label":"Excellent","description":"Poster layout is intuitive with clear information flow. Visuals are fully labelled and high quality. Technical content is presented in a way that is accessible to both technical and non-technical readers."},{"min":21,"max":26,"label":"Good","description":"Layout is mostly logical. Visuals are readable with minor gaps. Technical content is largely clear with small areas for improvement."},{"min":13,"max":20,"label":"Developing","description":"Occasional gaps in information flow. Some visuals are missing labels or captions. Technical content is only partially communicated."},{"min":0,"max":12,"label":"Insufficient","description":"Confusing layout. Low-quality or unlabelled visuals. Technical content is unclear or missing."}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('3a305bed-e865-444f-a3a3-c92302bd93cf', '0147d901-984d-44c1-a08f-94f919659596', 'delivery', 'Oral Communication', 'Oral', 30, 30, '#3B82F6', '[{"min":27,"max":30,"label":"Excellent","description":"Presentation is consciously adapted for both technical and non-technical jury members. Q&A responses are accurate, clear, and audience-appropriate."},{"min":21,"max":26,"label":"Good","description":"Presentation is mostly clear and well-paced. Most questions answered correctly. Audience adaptation is generally evident."},{"min":13,"max":20,"label":"Developing","description":"Understandable but inconsistent. Limited audience adaptation. Time management or Q&A depth needs improvement."},{"min":0,"max":12,"label":"Insufficient","description":"Unclear or disorganised presentation. Most questions answered incorrectly or not at all."}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('fda374b5-0bbf-41e3-ad46-29fe1491189b', '0147d901-984d-44c1-a08f-94f919659596', 'teamwork', 'Teamwork', 'Teamwork', 10, 10, '#EF4444', '[{"min":9,"max":10,"label":"Excellent","description":"All members participate actively and equally. Professional and ethical conduct observed throughout."},{"min":7,"max":8,"label":"Good","description":"Most members contribute. Minor knowledge gaps. Professionalism mostly observed."},{"min":4,"max":6,"label":"Developing","description":"Uneven participation. Some members are passive or unprepared."},{"min":0,"max":3,"label":"Insufficient","description":"Very low participation or dominated by one person. Lack of professionalism observed."}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('93a2a9b8-de26-4fbb-a805-d7134bc8a55f', 'efe329b2-0a62-4279-a7d1-627abe557321', 'problem_solving', 'Problem Solving & Analysis', 'Problem', 25, 25, '#EF4444', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('7283938c-881e-46e5-a432-793287f19248', 'efe329b2-0a62-4279-a7d1-627abe557321', 'system_design', 'System Design & Architecture', 'Design', 25, 25, '#3B82F6', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('c2a960c2-ec12-409c-a49b-14ac9f66a451', 'efe329b2-0a62-4279-a7d1-627abe557321', 'implementation_quality', 'Implementation Quality', 'Impl', 20, 20, '#F59E0B', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('cba29dca-3ee3-4e5a-a78a-44034a059a9a', 'efe329b2-0a62-4279-a7d1-627abe557321', 'communication', 'Communication & Documentation', 'Comm', 20, 20, '#EC4899', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('a0ce2f65-e11f-427c-ab49-6806b15b6ffe', 'efe329b2-0a62-4279-a7d1-627abe557321', 'teamwork', 'Teamwork & Collaboration', 'Team', 10, 10, '#10B981', '[{"min":9,"max":10,"label":"Excellent","description":"Outstanding"},{"min":7,"max":8,"label":"Good","description":"Above average"},{"min":5,"max":6,"label":"Developing","description":"Meets minimum"},{"min":0,"max":4,"label":"Insufficient","description":"Below standard"}]', 5) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('10f52721-c639-4184-a0c4-1493bd620bfd', '824ead2b-7676-4297-a6e1-507869f5f299', 'preliminary_report', 'Preliminary Design Report (ODR)', 'Report', 25, 25, '#6366F1', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('b58a9de4-d6c7-4143-a851-ed52ef1c7aab', '824ead2b-7676-4297-a6e1-507869f5f299', 'critical_design', 'Critical Design Review (KTR)', 'CDR', 30, 30, '#F59E0B', '[{"min":26,"max":30,"label":"Excellent","description":"Outstanding performance"},{"min":20,"max":25,"label":"Good","description":"Above average, minor gaps"},{"min":14,"max":19,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":13,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('a408685a-ba52-4173-a90f-b5bcf0b39b63', '824ead2b-7676-4297-a6e1-507869f5f299', 'technical_performance', 'Technical Performance & Demo', 'Performance', 30, 30, '#EF4444', '[{"min":26,"max":30,"label":"Excellent","description":"Outstanding performance"},{"min":20,"max":25,"label":"Good","description":"Above average, minor gaps"},{"min":14,"max":19,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":13,"label":"Insufficient","description":"Below acceptable standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('9048c1b4-a5f6-499e-a002-58c2d231a40b', '824ead2b-7676-4297-a6e1-507869f5f299', 'team_execution', 'Team Execution & Presentation', 'Team', 15, 15, '#10B981', '[{"min":9,"max":10,"label":"Excellent","description":"Outstanding"},{"min":7,"max":8,"label":"Good","description":"Above average"},{"min":5,"max":6,"label":"Developing","description":"Meets minimum"},{"min":0,"max":4,"label":"Insufficient","description":"Below standard"}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('9153ef48-d850-40bf-a60b-985c27b85214', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', 'originality', 'Originality & Creativity', 'Originality', 35, 35, '#8B5CF6', '[{"min":30,"max":35,"label":"Excellent","description":"Outstanding performance"},{"min":23,"max":29,"label":"Good","description":"Above average, minor gaps"},{"min":16,"max":22,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":15,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('ed12bef7-680e-44c5-a2c2-eafd7f911f6b', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', 'scientific_method', 'Scientific Method & Rigor', 'Method', 40, 40, '#3B82F6', '[{"min":35,"max":40,"label":"Excellent","description":"Outstanding performance"},{"min":27,"max":34,"label":"Good","description":"Above average, minor gaps"},{"min":19,"max":26,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":18,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('b2079523-b082-451d-afaa-b9f1ae7e5141', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', 'impact_and_presentation', 'Impact & Presentation', 'Impact', 25, 25, '#F59E0B', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('87559029-8bad-47de-afc6-43faaa45230b', '8df4448a-b223-4569-a92e-4c81b669b065', 'creativity', 'Creativity & Innovation', 'Creativity', 30, 30, '#EC4899', '[{"min":26,"max":30,"label":"Excellent","description":"Outstanding performance"},{"min":20,"max":25,"label":"Good","description":"Above average, minor gaps"},{"min":14,"max":19,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":13,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('ee91d9af-bcf4-49a4-a966-cbd063bbb8f5', '8df4448a-b223-4569-a92e-4c81b669b065', 'technical_merit', 'Technical Merit', 'Technical', 40, 40, '#3B82F6', '[{"min":35,"max":40,"label":"Excellent","description":"Outstanding performance"},{"min":27,"max":34,"label":"Good","description":"Above average, minor gaps"},{"min":19,"max":26,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":18,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('03cdba6e-ce74-412d-ab8a-8819efca56ba', '8df4448a-b223-4569-a92e-4c81b669b065', 'application_and_presentation', 'Application & Presentation', 'Presentation', 30, 30, '#F59E0B', '[{"min":26,"max":30,"label":"Excellent","description":"Outstanding performance"},{"min":20,"max":25,"label":"Good","description":"Above average, minor gaps"},{"min":14,"max":19,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":13,"label":"Insufficient","description":"Below acceptable standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('4f8cf9da-b0c7-4a62-ae00-c127f9c6eb8a', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', 'design_compliance', 'Design Constraints Compliance', 'Compliance', 20, 20, '#6366F1', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('2acdc2ab-1710-48df-a764-c1e4b5e8ec4e', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', 'mission_execution', 'Mission Execution & Telemetry', 'Mission', 35, 35, '#EF4444', '[{"min":30,"max":35,"label":"Excellent","description":"Outstanding performance"},{"min":23,"max":29,"label":"Good","description":"Above average, minor gaps"},{"min":16,"max":22,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":15,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('7065e7e2-dffe-49f3-a6bf-2d59c6661b90', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', 'data_and_documentation', 'Data Analysis & Documentation', 'Data', 25, 25, '#3B82F6', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criteria (id, framework_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('089917fe-ade5-4d49-a70d-d9b1f8f6d319', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', 'safety_and_recovery', 'Safety & Recovery', 'Safety', 20, 20, '#10B981', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 4) ON CONFLICT DO NOTHING;

-- Framework Mappings
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('787f5d42-50c5-49bb-afc8-09e0e9df707e', '0147d901-984d-44c1-a08f-94f919659596', 'c88501db-537c-448f-a967-fd759b41915b', 'af277367-f639-4c4d-a8c5-30a0ecd66e71', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('1232e664-977d-47aa-ac4d-b35f55885fda', '0147d901-984d-44c1-a08f-94f919659596', 'c88501db-537c-448f-a967-fd759b41915b', '2f2d65ff-1630-4400-a9e7-153e458bec4d', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('14a78337-1b65-47d3-a310-ada19b17942c', '0147d901-984d-44c1-a08f-94f919659596', 'c88501db-537c-448f-a967-fd759b41915b', 'b2051f4f-495a-4917-af9c-4e6dcf36b33c', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('1f2f948d-29af-4828-a856-b2432617e930', '0147d901-984d-44c1-a08f-94f919659596', 'c88501db-537c-448f-a967-fd759b41915b', '7ad8e211-7c0c-4a61-a980-9efc66d6fece', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('cfb277db-88f8-4249-ab28-3d789fde24e9', '0147d901-984d-44c1-a08f-94f919659596', '91d2ee22-2b0f-48eb-ac87-5e1fed001650', 'b641718c-6926-409a-a300-d18eabe03877', 1) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('99a483d0-a0f2-46a1-af1a-b7246976ba8c', '0147d901-984d-44c1-a08f-94f919659596', '3a305bed-e865-444f-a3a3-c92302bd93cf', '53b7fb91-c8a8-4fbf-a081-8393b09b260c', 1) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('2656c0d3-9b5a-4e21-a879-0edb10a871d4', '0147d901-984d-44c1-a08f-94f919659596', 'fda374b5-0bbf-41e3-ad46-29fe1491189b', '7679cc95-f407-424e-a8d0-7f9d6cf70fed', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('6430d990-7ed1-430b-a368-c249ba934dd2', '0147d901-984d-44c1-a08f-94f919659596', 'fda374b5-0bbf-41e3-ad46-29fe1491189b', 'f4b7e7da-4550-43eb-a884-0b5d8d9cf1b2', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('3695cde8-7f8b-4fc4-af7f-523d452e19f4', 'efe329b2-0a62-4279-a7d1-627abe557321', '93a2a9b8-de26-4fbb-a805-d7134bc8a55f', '0c61d3b2-4098-4181-a0a9-af00ccddd55f', 0.6) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('be64d4fa-2c45-4890-a280-d6a64651b63a', 'efe329b2-0a62-4279-a7d1-627abe557321', '93a2a9b8-de26-4fbb-a805-d7134bc8a55f', 'e55ec114-ecd9-4bbc-acb2-56ddbb255ee3', 0.4) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('a59be2e2-233f-4090-aa9b-15d526b829e0', 'efe329b2-0a62-4279-a7d1-627abe557321', '7283938c-881e-46e5-a432-793287f19248', '4ed4e517-5b27-4f61-a16b-6d7b86d2d592', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('23b6bf8b-5c34-47c6-a09f-cb08ac883a8f', 'efe329b2-0a62-4279-a7d1-627abe557321', '7283938c-881e-46e5-a432-793287f19248', '0c61d3b2-4098-4181-a0a9-af00ccddd55f', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('1bd9933b-fa6f-428c-a830-752cd93c9529', 'efe329b2-0a62-4279-a7d1-627abe557321', 'c2a960c2-ec12-409c-a49b-14ac9f66a451', 'e55ec114-ecd9-4bbc-acb2-56ddbb255ee3', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('b83227f4-e347-46ed-a368-5d61933ed1fb', 'efe329b2-0a62-4279-a7d1-627abe557321', 'c2a960c2-ec12-409c-a49b-14ac9f66a451', '4ed4e517-5b27-4f61-a16b-6d7b86d2d592', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('e53dfb15-71cb-4a85-a6cf-359930112ea8', 'efe329b2-0a62-4279-a7d1-627abe557321', 'c2a960c2-ec12-409c-a49b-14ac9f66a451', '293b2e58-626c-4a8a-afab-c4827d6888ae', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('340ba75e-fb32-42d5-aa8e-21b2a2f6295d', 'efe329b2-0a62-4279-a7d1-627abe557321', 'cba29dca-3ee3-4e5a-a78a-44034a059a9a', 'cc92ffdb-deee-4b4a-ad3f-ab54b9a16df3', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('104bb08d-d213-4656-ad1d-963900f1f6a8', 'efe329b2-0a62-4279-a7d1-627abe557321', 'cba29dca-3ee3-4e5a-a78a-44034a059a9a', 'f4f08ca1-e5f1-4cc9-aa5f-a308966a9375', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('eee7ca6e-5fca-4b3f-a1ee-7754ff4860d6', 'efe329b2-0a62-4279-a7d1-627abe557321', 'a0ce2f65-e11f-427c-ab49-6806b15b6ffe', 'f9c945a1-24f5-4ab1-abad-9a35a116c09c', 1) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('425f56ea-965d-405b-a48a-8bf4729194b3', '824ead2b-7676-4297-a6e1-507869f5f299', '10f52721-c639-4184-a0c4-1493bd620bfd', 'f21e10be-2829-4161-acf2-6ca56c414d98', 1) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('7ab14c5b-e94e-424a-ab2f-6d35030dae98', '824ead2b-7676-4297-a6e1-507869f5f299', 'b58a9de4-d6c7-4143-a851-ed52ef1c7aab', '5f1f1555-845b-4498-a005-4878e6f4d692', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('c03ac120-febe-4e2f-a090-06ae620e031d', '824ead2b-7676-4297-a6e1-507869f5f299', 'b58a9de4-d6c7-4143-a851-ed52ef1c7aab', 'f21e10be-2829-4161-acf2-6ca56c414d98', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('1dc5f4d6-71da-4ec3-a821-87f1b5601438', '824ead2b-7676-4297-a6e1-507869f5f299', 'a408685a-ba52-4173-a90f-b5bcf0b39b63', 'daeff078-d457-48cc-af0f-7ebefc99a64f', 0.8) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('584385a7-38cc-43da-adb4-28951b59ea3c', '824ead2b-7676-4297-a6e1-507869f5f299', 'a408685a-ba52-4173-a90f-b5bcf0b39b63', '5f1f1555-845b-4498-a005-4878e6f4d692', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('5bd81085-6d0d-4fc2-a85d-a3eb876c4188', '824ead2b-7676-4297-a6e1-507869f5f299', '9048c1b4-a5f6-499e-a002-58c2d231a40b', 'c0f9b501-7d38-4fcc-a565-65ad87f853f4', 0.6) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('44299a91-b795-4016-aa18-023d2768b2f7', '824ead2b-7676-4297-a6e1-507869f5f299', '9048c1b4-a5f6-499e-a002-58c2d231a40b', 'daeff078-d457-48cc-af0f-7ebefc99a64f', 0.4) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('fe8155f0-6bc9-41e5-aa58-b3ea4243beb5', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', '9153ef48-d850-40bf-a60b-985c27b85214', '927c6ee5-bb03-44b8-afda-2a97f4272add', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('680822fa-3f3b-407f-a433-052ee08daae2', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', '9153ef48-d850-40bf-a60b-985c27b85214', '5971a865-48c8-45c7-a1fe-42276ca9c27c', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('9ddcc51b-3291-419f-a80a-22ba81e250c2', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', 'ed12bef7-680e-44c5-a2c2-eafd7f911f6b', '8258a7a0-3329-4b87-a2f9-ed57789c5d5f', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('02bb9c22-1cf9-4f4b-a91b-719e3e630a7d', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', 'ed12bef7-680e-44c5-a2c2-eafd7f911f6b', '29460c43-c2cc-42dc-a55c-9ae4ac05cb0f', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('7914fe34-dbcd-4a77-a84a-4e506ff4a7c1', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', 'b2079523-b082-451d-afaa-b9f1ae7e5141', '5994e0a4-3fa2-434e-abab-246d6d0f6cf3', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('160f8ba8-8c34-46f9-a3b6-56c895a41c70', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', 'b2079523-b082-451d-afaa-b9f1ae7e5141', '29460c43-c2cc-42dc-a55c-9ae4ac05cb0f', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('347c3dca-e865-40e5-ae42-d8e41b71fac4', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', 'b2079523-b082-451d-afaa-b9f1ae7e5141', '5971a865-48c8-45c7-a1fe-42276ca9c27c', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('2c18f7ca-83c0-496d-a0de-ae6b6cac113a', '8df4448a-b223-4569-a92e-4c81b669b065', '87559029-8bad-47de-afc6-43faaa45230b', 'd4f70008-8664-4fc1-adca-346d3719c329', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('46da8a67-b906-42e5-a4f6-97ebdcd2c3ff', '8df4448a-b223-4569-a92e-4c81b669b065', '87559029-8bad-47de-afc6-43faaa45230b', '208c4237-ddb7-4d8d-ae87-221df0bf5619', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('5db26161-6967-494d-a939-1eadec359aa0', '8df4448a-b223-4569-a92e-4c81b669b065', 'ee91d9af-bcf4-49a4-a966-cbd063bbb8f5', '22c36b11-dbe6-4200-a746-877759e831c7', 0.8) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('918116ee-d9d7-47d5-a462-6f9ee7e162d6', '8df4448a-b223-4569-a92e-4c81b669b065', 'ee91d9af-bcf4-49a4-a966-cbd063bbb8f5', 'c08428e2-0dca-42a4-a982-8f8f34f1a827', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('41dd727f-a348-480b-ae16-516bf03f6a41', '8df4448a-b223-4569-a92e-4c81b669b065', '03cdba6e-ce74-412d-ab8a-8819efca56ba', 'c08428e2-0dca-42a4-a982-8f8f34f1a827', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('0cec8641-5ba9-46f7-abec-83e29a8fdb93', '8df4448a-b223-4569-a92e-4c81b669b065', '03cdba6e-ce74-412d-ab8a-8819efca56ba', '208c4237-ddb7-4d8d-ae87-221df0bf5619', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('9d413260-6915-4efa-a86d-c1511bc377e1', '8df4448a-b223-4569-a92e-4c81b669b065', '03cdba6e-ce74-412d-ab8a-8819efca56ba', 'd4f70008-8664-4fc1-adca-346d3719c329', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('c405a8ec-cd0d-42fd-a783-91c576f3e4f4', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', '4f8cf9da-b0c7-4a62-ae00-c127f9c6eb8a', 'a7c6db91-308c-49ba-a91a-172d1e4f00f8', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('8d5da354-c77e-413a-ad69-29d8d38edbfe', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', '4f8cf9da-b0c7-4a62-ae00-c127f9c6eb8a', '7d5079e4-7b9c-4643-ac59-588ae909330f', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('8ed69783-a466-4130-ab29-b6e74283af23', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', '2acdc2ab-1710-48df-a764-c1e4b5e8ec4e', '5589d3d4-c99e-4d87-a314-83e41236ca3a', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('6ea0a813-7306-4856-a862-58f2fa42f03a', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', '2acdc2ab-1710-48df-a764-c1e4b5e8ec4e', '08691235-b202-4833-a43d-46b4b5383f13', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('012940c7-e57c-4a9e-af10-bca9ca31da8d', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', '2acdc2ab-1710-48df-a764-c1e4b5e8ec4e', '8e106aab-5b22-43d8-aa13-3ce02bff7660', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('4ad7dd97-2e09-482c-a35d-51bb72a139e9', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', '7065e7e2-dffe-49f3-a6bf-2d59c6661b90', 'bce51d2c-50dc-4702-aa43-169b8160e443', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('fd00892f-5030-4995-a472-547112112cdb', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', '7065e7e2-dffe-49f3-a6bf-2d59c6661b90', '5589d3d4-c99e-4d87-a314-83e41236ca3a', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('162a88db-3542-45ac-a00f-1121e07e8aae', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', '089917fe-ade5-4d49-a70d-d9b1f8f6d319', '7d5079e4-7b9c-4643-ac59-588ae909330f', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO framework_criterion_outcome_maps (id, framework_id, criterion_id, outcome_id, weight) VALUES ('6a1e11c0-4731-452a-a1ea-a6747b611b87', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', '089917fe-ade5-4d49-a70d-d9b1f8f6d319', '8e106aab-5b22-43d8-aa13-3ce02bff7660', 0.5) ON CONFLICT DO NOTHING;

-- Periods and Snapshots
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', '0147d901-984d-44c1-a08f-94f919659596', 'Spring 2026', 'Spring', true, false, true, DATE '2026-06-15' - integer '14', ('2026-02-01'::timestamp + interval '1 day'), timestamp '2026-02-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('787e905a-a2da-431e-af63-00cea2ea7bb5', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'c88501db-537c-448f-a967-fd759b41915b', 'technical', 'Technical Content', 'Technical', 30, 30, '#F59E0B', '[{"min":27,"max":30,"label":"Excellent","description":"Problem is clearly defined with strong motivation. Design decisions are well-justified with engineering depth. Originality and mastery of relevant tools or methods are evident."},{"min":21,"max":26,"label":"Good","description":"Design is mostly clear and technically justified. Engineering decisions are largely supported."},{"min":13,"max":20,"label":"Developing","description":"Problem is stated but motivation or technical justification is insufficient."},{"min":0,"max":12,"label":"Insufficient","description":"Vague problem definition and unjustified decisions. Superficial technical content."}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '91d2ee22-2b0f-48eb-ac87-5e1fed001650', 'design', 'Written Communication', 'Written', 30, 30, '#22C55E', '[{"min":27,"max":30,"label":"Excellent","description":"Poster layout is intuitive with clear information flow. Visuals are fully labelled and high quality. Technical content is presented in a way that is accessible to both technical and non-technical readers."},{"min":21,"max":26,"label":"Good","description":"Layout is mostly logical. Visuals are readable with minor gaps. Technical content is largely clear with small areas for improvement."},{"min":13,"max":20,"label":"Developing","description":"Occasional gaps in information flow. Some visuals are missing labels or captions. Technical content is only partially communicated."},{"min":0,"max":12,"label":"Insufficient","description":"Confusing layout. Low-quality or unlabelled visuals. Technical content is unclear or missing."}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '3a305bed-e865-444f-a3a3-c92302bd93cf', 'delivery', 'Oral Communication', 'Oral', 30, 30, '#3B82F6', '[{"min":27,"max":30,"label":"Excellent","description":"Presentation is consciously adapted for both technical and non-technical jury members. Q&A responses are accurate, clear, and audience-appropriate."},{"min":21,"max":26,"label":"Good","description":"Presentation is mostly clear and well-paced. Most questions answered correctly. Audience adaptation is generally evident."},{"min":13,"max":20,"label":"Developing","description":"Understandable but inconsistent. Limited audience adaptation. Time management or Q&A depth needs improvement."},{"min":0,"max":12,"label":"Insufficient","description":"Unclear or disorganised presentation. Most questions answered incorrectly or not at all."}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'fda374b5-0bbf-41e3-ad46-29fe1491189b', 'teamwork', 'Teamwork', 'Teamwork', 10, 10, '#EF4444', '[{"min":9,"max":10,"label":"Excellent","description":"All members participate actively and equally. Professional and ethical conduct observed throughout."},{"min":7,"max":8,"label":"Good","description":"Most members contribute. Minor knowledge gaps. Professionalism mostly observed."},{"min":4,"max":6,"label":"Developing","description":"Uneven participation. Some members are passive or unprepared."},{"min":0,"max":3,"label":"Insufficient","description":"Very low participation or dominated by one person. Lack of professionalism observed."}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('6986c7eb-0ee6-4eac-acf1-12b863301b77', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'af277367-f639-4c4d-a8c5-30a0ecd66e71', '1.2', 'Adequate knowledge in mathematics, science and engineering', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('be27c992-aa6d-441d-ab85-0c3532d3e2ca', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '2f2d65ff-1630-4400-a9e7-153e458bec4d', '2', 'Ability to formulate and solve complex engineering problems', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('48375d76-5886-42f4-a0a3-a52fa01d8224', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'b2051f4f-495a-4917-af9c-4e6dcf36b33c', '3.1', 'Ability to design a complex system under realistic constraints', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('1a3d9339-2318-46ea-ad17-d79c737d4983', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '7ad8e211-7c0c-4a61-a980-9efc66d6fece', '3.2', 'Ability to apply modern design methods', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('6dd4fe1c-0b01-4c64-a37c-124145568756', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '7679cc95-f407-424e-a8d0-7f9d6cf70fed', '8.1', 'Ability to function effectively in teams', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('b944e980-ba4c-4de7-aa7a-9c5eceaa8753', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'f4b7e7da-4550-43eb-a884-0b5d8d9cf1b2', '8.2', 'Ability to work in multi-disciplinary teams', 6) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('741208a6-eb9b-4253-ac82-f6d2252b6e83', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '53b7fb91-c8a8-4fbf-a081-8393b09b260c', '9.1', 'Oral communication effectiveness', 7) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('6b6a0026-b096-4d03-ad1a-6ba4f07df192', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'b641718c-6926-409a-a300-d18eabe03877', '9.2', 'Written communication effectiveness', 8) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('d8139479-a894-47c3-a91e-8a9b09476c47', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '787e905a-a2da-431e-af63-00cea2ea7bb5', '6986c7eb-0ee6-4eac-acf1-12b863301b77', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('41f0d572-26e3-4927-a17d-6a2d52aebe7c', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '787e905a-a2da-431e-af63-00cea2ea7bb5', 'be27c992-aa6d-441d-ab85-0c3532d3e2ca', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('df4446d1-cef0-4623-a7b6-7cc17e6cb5dc', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '787e905a-a2da-431e-af63-00cea2ea7bb5', '48375d76-5886-42f4-a0a3-a52fa01d8224', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('627ab111-040b-4e6b-a68a-230f3d0d120b', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '787e905a-a2da-431e-af63-00cea2ea7bb5', '1a3d9339-2318-46ea-ad17-d79c737d4983', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('20e90557-f0c7-4848-a121-305a8566a994', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', '6b6a0026-b096-4d03-ad1a-6ba4f07df192', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('574683c1-c261-45d5-a92d-7c07f57831da', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', '741208a6-eb9b-4253-ac82-f6d2252b6e83', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('51b8fea2-79f4-4eab-a8c9-cbfe829017ba', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', '6dd4fe1c-0b01-4c64-a37c-124145568756', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('966763a5-4aba-4b73-a47d-11c94233007f', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 'b944e980-ba4c-4de7-aa7a-9c5eceaa8753', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', '0147d901-984d-44c1-a08f-94f919659596', 'Fall 2025', 'Fall', false, true, true, DATE '2025-12-20' - integer '14', ('2025-09-01'::timestamp), timestamp '2025-09-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('a436fb51-aa71-4afc-a9bf-2232d151fbaa', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'c88501db-537c-448f-a967-fd759b41915b', 'technical', 'Technical Content', 'Technical', 30, 30, '#F59E0B', '[{"min":27,"max":30,"label":"Excellent","description":"Problem is clearly defined with strong motivation. Design decisions are well-justified with engineering depth. Originality and mastery of relevant tools or methods are evident."},{"min":21,"max":26,"label":"Good","description":"Design is mostly clear and technically justified. Engineering decisions are largely supported."},{"min":13,"max":20,"label":"Developing","description":"Problem is stated but motivation or technical justification is insufficient."},{"min":0,"max":12,"label":"Insufficient","description":"Vague problem definition and unjustified decisions. Superficial technical content."}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('8cebf54b-97b4-493c-a837-4707d4828eae', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '91d2ee22-2b0f-48eb-ac87-5e1fed001650', 'design', 'Written Comm.', 'Written', 30, 30, '#22C55E', '[{"min":27,"max":30,"label":"Excellent","description":"Poster layout is intuitive with clear information flow. Visuals are fully labelled and high quality. Technical content is presented in a way that is accessible to both technical and non-technical readers."},{"min":21,"max":26,"label":"Good","description":"Layout is mostly logical. Visuals are readable with minor gaps. Technical content is largely clear with small areas for improvement."},{"min":13,"max":20,"label":"Developing","description":"Occasional gaps in information flow. Some visuals are missing labels or captions. Technical content is only partially communicated."},{"min":0,"max":12,"label":"Insufficient","description":"Confusing layout. Low-quality or unlabelled visuals. Technical content is unclear or missing."}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '3a305bed-e865-444f-a3a3-c92302bd93cf', 'delivery', 'Oral Comm.', 'Oral', 30, 30, '#3B82F6', '[{"min":27,"max":30,"label":"Excellent","description":"Presentation is consciously adapted for both technical and non-technical jury members. Q&A responses are accurate, clear, and audience-appropriate."},{"min":21,"max":26,"label":"Good","description":"Presentation is mostly clear and well-paced. Most questions answered correctly. Audience adaptation is generally evident."},{"min":13,"max":20,"label":"Developing","description":"Understandable but inconsistent. Limited audience adaptation. Time management or Q&A depth needs improvement."},{"min":0,"max":12,"label":"Insufficient","description":"Unclear or disorganised presentation. Most questions answered incorrectly or not at all."}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'fda374b5-0bbf-41e3-ad46-29fe1491189b', 'teamwork', 'Teamwork', 'Teamwork', 10, 10, '#EF4444', '[{"min":9,"max":10,"label":"Excellent","description":"All members participate actively and equally. Professional and ethical conduct observed throughout."},{"min":7,"max":8,"label":"Good","description":"Most members contribute. Minor knowledge gaps. Professionalism mostly observed."},{"min":4,"max":6,"label":"Developing","description":"Uneven participation. Some members are passive or unprepared."},{"min":0,"max":3,"label":"Insufficient","description":"Very low participation or dominated by one person. Lack of professionalism observed."}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('5540859d-dc89-4c3e-a121-c35d99f7e700', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'af277367-f639-4c4d-a8c5-30a0ecd66e71', '1.2', 'Adequate knowledge in mathematics, science and engineering', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('9a22f3d7-aba7-4f71-aca0-b958415dd611', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '2f2d65ff-1630-4400-a9e7-153e458bec4d', '2', 'Ability to formulate and solve complex engineering problems', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('641e5d0b-4e04-4e55-a63b-7b51e55a8e52', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'b2051f4f-495a-4917-af9c-4e6dcf36b33c', '3.1', 'Ability to design a complex system under realistic constraints', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('8e1bcf3b-c58b-40c4-ab4b-7bb8a3e911c7', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '7ad8e211-7c0c-4a61-a980-9efc66d6fece', '3.2', 'Ability to apply modern design methods', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('32a396df-6c49-4eec-aa7a-357963635238', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '7679cc95-f407-424e-a8d0-7f9d6cf70fed', '8.1', 'Ability to function effectively in teams', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('4a738187-c8bb-4391-a198-c8033f1a6a2d', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'f4b7e7da-4550-43eb-a884-0b5d8d9cf1b2', '8.2', 'Ability to work in multi-disciplinary teams', 6) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('56d1f0e3-35e3-41a0-a014-d3a95fdd3cc7', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '53b7fb91-c8a8-4fbf-a081-8393b09b260c', '9.1', 'Oral communication effectiveness', 7) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('43a90683-e96b-4ad5-a020-607e9833903a', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'b641718c-6926-409a-a300-d18eabe03877', '9.2', 'Written communication effectiveness', 8) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('7c907873-b3a4-41f0-aa54-dadd90829b46', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', '5540859d-dc89-4c3e-a121-c35d99f7e700', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('7178f650-9507-41de-afdc-cad8e61a771a', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', '9a22f3d7-aba7-4f71-aca0-b958415dd611', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('4b320aca-cd8d-4c2f-a450-e2fa7a95526d', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', '641e5d0b-4e04-4e55-a63b-7b51e55a8e52', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('629865dc-388e-458d-aba1-e4bc8d453f5f', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', '8e1bcf3b-c58b-40c4-ab4b-7bb8a3e911c7', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('4f7d6fa6-e567-4f79-a92b-b7c451cfaeab', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '8cebf54b-97b4-493c-a837-4707d4828eae', '43a90683-e96b-4ad5-a020-607e9833903a', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('1c28b41a-9b13-473a-ae19-03afc1873291', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', '56d1f0e3-35e3-41a0-a014-d3a95fdd3cc7', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('90a69da3-96fe-495a-a97f-b96d7564588a', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', '32a396df-6c49-4eec-aa7a-357963635238', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('031a018c-8799-4092-abd9-50eeb627f4c4', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', '4a738187-c8bb-4391-a198-c8033f1a6a2d', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('e55e0820-93f2-487f-abaa-4ae64a77e93e', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', '0147d901-984d-44c1-a08f-94f919659596', 'Spring 2025', 'Spring', false, true, true, DATE '2025-06-15' - integer '14', ('2025-02-01'::timestamp), timestamp '2025-02-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('5c1f4f21-151a-4b22-a335-5ef961d9e99f', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'c88501db-537c-448f-a967-fd759b41915b', 'technical', 'Technical Content (Legacy)', 'Technical', 30, 30, '#F59E0B', '[{"min":27,"max":30,"label":"Excellent","description":"Problem is clearly defined with strong motivation. Design decisions are well-justified with engineering depth. Originality and mastery of relevant tools or methods are evident."},{"min":21,"max":26,"label":"Good","description":"Design is mostly clear and technically justified. Engineering decisions are largely supported."},{"min":13,"max":20,"label":"Developing","description":"Problem is stated but motivation or technical justification is insufficient."},{"min":0,"max":12,"label":"Insufficient","description":"Vague problem definition and unjustified decisions. Superficial technical content."}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('15dca296-abd2-4fd9-adb3-ff2d66b91858', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '91d2ee22-2b0f-48eb-ac87-5e1fed001650', 'design', 'Written Communication (Legacy)', 'Written', 30, 30, '#22C55E', '[{"min":27,"max":30,"label":"Excellent","description":"Poster layout is intuitive with clear information flow. Visuals are fully labelled and high quality. Technical content is presented in a way that is accessible to both technical and non-technical readers."},{"min":21,"max":26,"label":"Good","description":"Layout is mostly logical. Visuals are readable with minor gaps. Technical content is largely clear with small areas for improvement."},{"min":13,"max":20,"label":"Developing","description":"Occasional gaps in information flow. Some visuals are missing labels or captions. Technical content is only partially communicated."},{"min":0,"max":12,"label":"Insufficient","description":"Confusing layout. Low-quality or unlabelled visuals. Technical content is unclear or missing."}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('01b94576-b441-4c66-ac35-be4aa17effa3', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '3a305bed-e865-444f-a3a3-c92302bd93cf', 'delivery', 'Oral Communication (Legacy)', 'Oral', 30, 30, '#3B82F6', '[{"min":27,"max":30,"label":"Excellent","description":"Presentation is consciously adapted for both technical and non-technical jury members. Q&A responses are accurate, clear, and audience-appropriate."},{"min":21,"max":26,"label":"Good","description":"Presentation is mostly clear and well-paced. Most questions answered correctly. Audience adaptation is generally evident."},{"min":13,"max":20,"label":"Developing","description":"Understandable but inconsistent. Limited audience adaptation. Time management or Q&A depth needs improvement."},{"min":0,"max":12,"label":"Insufficient","description":"Unclear or disorganised presentation. Most questions answered incorrectly or not at all."}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'fda374b5-0bbf-41e3-ad46-29fe1491189b', 'teamwork', 'Teamwork (Legacy)', 'Teamwork', 10, 10, '#EF4444', '[{"min":9,"max":10,"label":"Excellent","description":"All members participate actively and equally. Professional and ethical conduct observed throughout."},{"min":7,"max":8,"label":"Good","description":"Most members contribute. Minor knowledge gaps. Professionalism mostly observed."},{"min":4,"max":6,"label":"Developing","description":"Uneven participation. Some members are passive or unprepared."},{"min":0,"max":3,"label":"Insufficient","description":"Very low participation or dominated by one person. Lack of professionalism observed."}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('1ddcbde6-b6f1-4d4f-a199-b004b69c6aab', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'af277367-f639-4c4d-a8c5-30a0ecd66e71', '1.2', 'Adequate knowledge in mathematics, science and engineering', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('ab5fd3b2-5ea8-4412-afb4-18055a1b4086', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '2f2d65ff-1630-4400-a9e7-153e458bec4d', '2', 'Ability to formulate and solve complex engineering problems', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('426a0f43-f7ee-4974-a843-0d86b502cdd3', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'b2051f4f-495a-4917-af9c-4e6dcf36b33c', '3.1', 'Ability to design a complex system under realistic constraints', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('d57df3b9-c418-46b1-a8ec-4e97c6d9c65d', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '7ad8e211-7c0c-4a61-a980-9efc66d6fece', '3.2', 'Ability to apply modern design methods', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('7990110c-531a-4a1c-a698-1beb5db0c2e6', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '7679cc95-f407-424e-a8d0-7f9d6cf70fed', '8.1', 'Ability to function effectively in teams', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('effabf50-5ebc-48e3-a15e-55d277014a0d', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'f4b7e7da-4550-43eb-a884-0b5d8d9cf1b2', '8.2', 'Ability to work in multi-disciplinary teams', 6) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('92d66d58-c371-4781-a111-5fefeda53407', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '53b7fb91-c8a8-4fbf-a081-8393b09b260c', '9.1', 'Oral communication effectiveness', 7) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('8d871812-05de-4a0a-a7b3-e7e66c7edf72', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'b641718c-6926-409a-a300-d18eabe03877', '9.2', 'Written communication effectiveness', 8) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('664160d0-a0c6-4eec-ada7-b24b523ca87e', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', '1ddcbde6-b6f1-4d4f-a199-b004b69c6aab', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('1cb53e11-3e3a-4651-af8d-e4d3ad917911', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 'ab5fd3b2-5ea8-4412-afb4-18055a1b4086', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('5e35094d-0220-487f-a975-451902a62dca', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', '426a0f43-f7ee-4974-a843-0d86b502cdd3', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('0c5c5bc1-ebc3-4809-a874-7b8a720a69fb', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 'd57df3b9-c418-46b1-a8ec-4e97c6d9c65d', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('27e08884-365a-46a0-a4ee-f618cdc16298', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '15dca296-abd2-4fd9-adb3-ff2d66b91858', '8d871812-05de-4a0a-a7b3-e7e66c7edf72', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('1ac12e62-b66c-4326-ae04-521651f260e7', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '01b94576-b441-4c66-ac35-be4aa17effa3', '92d66d58-c371-4781-a111-5fefeda53407', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('832bdf70-84e8-4c8a-aeb2-217fb18a8aef', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', '7990110c-531a-4a1c-a698-1beb5db0c2e6', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('9d784bcc-8743-40dc-a59e-868e99f45743', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 'effabf50-5ebc-48e3-a15e-55d277014a0d', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('10078594-2707-4c3f-a212-42add04fbd84', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', '0147d901-984d-44c1-a08f-94f919659596', 'Fall 2024', 'Fall', false, true, true, DATE '2024-01-15' - integer '14', ('2024-09-01'::timestamp), timestamp '2024-09-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('0feebb9e-7f45-4128-a54b-5d8d078d7694', '10078594-2707-4c3f-a212-42add04fbd84', 'c88501db-537c-448f-a967-fd759b41915b', 'technical', 'Technical Content', 'Technical', 30, 30, '#F59E0B', '[{"min":27,"max":30,"label":"Excellent","description":"Problem is clearly defined with strong motivation. Design decisions are well-justified with engineering depth. Originality and mastery of relevant tools or methods are evident."},{"min":21,"max":26,"label":"Good","description":"Design is mostly clear and technically justified. Engineering decisions are largely supported."},{"min":13,"max":20,"label":"Developing","description":"Problem is stated but motivation or technical justification is insufficient."},{"min":0,"max":12,"label":"Insufficient","description":"Vague problem definition and unjustified decisions. Superficial technical content."}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('499fa39c-6170-4adb-a41b-18f3f16b2aff', '10078594-2707-4c3f-a212-42add04fbd84', '91d2ee22-2b0f-48eb-ac87-5e1fed001650', 'design', 'Written Communication', 'Written', 30, 30, '#22C55E', '[{"min":27,"max":30,"label":"Excellent","description":"Poster layout is intuitive with clear information flow. Visuals are fully labelled and high quality. Technical content is presented in a way that is accessible to both technical and non-technical readers."},{"min":21,"max":26,"label":"Good","description":"Layout is mostly logical. Visuals are readable with minor gaps. Technical content is largely clear with small areas for improvement."},{"min":13,"max":20,"label":"Developing","description":"Occasional gaps in information flow. Some visuals are missing labels or captions. Technical content is only partially communicated."},{"min":0,"max":12,"label":"Insufficient","description":"Confusing layout. Low-quality or unlabelled visuals. Technical content is unclear or missing."}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('649147ea-84e0-46dc-ad4d-18d33ed8d7ff', '10078594-2707-4c3f-a212-42add04fbd84', '3a305bed-e865-444f-a3a3-c92302bd93cf', 'delivery', 'Oral Communication', 'Oral', 30, 30, '#3B82F6', '[{"min":27,"max":30,"label":"Excellent","description":"Presentation is consciously adapted for both technical and non-technical jury members. Q&A responses are accurate, clear, and audience-appropriate."},{"min":21,"max":26,"label":"Good","description":"Presentation is mostly clear and well-paced. Most questions answered correctly. Audience adaptation is generally evident."},{"min":13,"max":20,"label":"Developing","description":"Understandable but inconsistent. Limited audience adaptation. Time management or Q&A depth needs improvement."},{"min":0,"max":12,"label":"Insufficient","description":"Unclear or disorganised presentation. Most questions answered incorrectly or not at all."}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('2c2eb619-5709-41d6-a377-8d3b963a6ea3', '10078594-2707-4c3f-a212-42add04fbd84', 'fda374b5-0bbf-41e3-ad46-29fe1491189b', 'teamwork', 'Teamwork', 'Teamwork', 10, 10, '#EF4444', '[{"min":9,"max":10,"label":"Excellent","description":"All members participate actively and equally. Professional and ethical conduct observed throughout."},{"min":7,"max":8,"label":"Good","description":"Most members contribute. Minor knowledge gaps. Professionalism mostly observed."},{"min":4,"max":6,"label":"Developing","description":"Uneven participation. Some members are passive or unprepared."},{"min":0,"max":3,"label":"Insufficient","description":"Very low participation or dominated by one person. Lack of professionalism observed."}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('d1bc9bb5-a616-47cb-a58f-760be6b7b794', '10078594-2707-4c3f-a212-42add04fbd84', 'af277367-f639-4c4d-a8c5-30a0ecd66e71', '1.2', 'Adequate knowledge in mathematics, science and engineering', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('3ac1197e-3525-477b-a063-836d20318368', '10078594-2707-4c3f-a212-42add04fbd84', '2f2d65ff-1630-4400-a9e7-153e458bec4d', '2', 'Ability to formulate and solve complex engineering problems', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('4d11b549-ca87-44a6-a899-b623d823ef99', '10078594-2707-4c3f-a212-42add04fbd84', 'b2051f4f-495a-4917-af9c-4e6dcf36b33c', '3.1', 'Ability to design a complex system under realistic constraints', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('99b23988-8712-433a-a8f0-86b2fd8700e3', '10078594-2707-4c3f-a212-42add04fbd84', '7ad8e211-7c0c-4a61-a980-9efc66d6fece', '3.2', 'Ability to apply modern design methods', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('cfffe57a-fea6-49da-ab48-d820fd7af0b1', '10078594-2707-4c3f-a212-42add04fbd84', '7679cc95-f407-424e-a8d0-7f9d6cf70fed', '8.1', 'Ability to function effectively in teams', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('11357316-3fe8-4dd3-a3eb-99d6fb48b92b', '10078594-2707-4c3f-a212-42add04fbd84', 'f4b7e7da-4550-43eb-a884-0b5d8d9cf1b2', '8.2', 'Ability to work in multi-disciplinary teams', 6) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('efe86548-2e2b-462d-ad1e-ed3b42bbfd33', '10078594-2707-4c3f-a212-42add04fbd84', '53b7fb91-c8a8-4fbf-a081-8393b09b260c', '9.1', 'Oral communication effectiveness', 7) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('419bee53-ae22-42b9-ac48-4e1977e1e719', '10078594-2707-4c3f-a212-42add04fbd84', 'b641718c-6926-409a-a300-d18eabe03877', '9.2', 'Written communication effectiveness', 8) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('f7d80064-f055-4a23-a92f-a1210cf4e16f', '10078594-2707-4c3f-a212-42add04fbd84', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 'd1bc9bb5-a616-47cb-a58f-760be6b7b794', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('81801014-9627-4531-ad7a-292321085ba5', '10078594-2707-4c3f-a212-42add04fbd84', '0feebb9e-7f45-4128-a54b-5d8d078d7694', '3ac1197e-3525-477b-a063-836d20318368', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('4ee97444-cde7-41d7-a592-13bae5407d7b', '10078594-2707-4c3f-a212-42add04fbd84', '0feebb9e-7f45-4128-a54b-5d8d078d7694', '4d11b549-ca87-44a6-a899-b623d823ef99', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('82a90009-0743-4a8b-a027-a2bcde51db43', '10078594-2707-4c3f-a212-42add04fbd84', '0feebb9e-7f45-4128-a54b-5d8d078d7694', '99b23988-8712-433a-a8f0-86b2fd8700e3', 0.25) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('e16ef964-da3a-470c-a8fa-4d7dcdab4880', '10078594-2707-4c3f-a212-42add04fbd84', '499fa39c-6170-4adb-a41b-18f3f16b2aff', '419bee53-ae22-42b9-ac48-4e1977e1e719', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('57584e42-d486-4431-af9a-66803b87ff29', '10078594-2707-4c3f-a212-42add04fbd84', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 'efe86548-2e2b-462d-ad1e-ed3b42bbfd33', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('8be3876a-563a-45f5-a312-a1a844087a52', '10078594-2707-4c3f-a212-42add04fbd84', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 'cfffe57a-fea6-49da-ab48-d820fd7af0b1', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('f018bace-34f7-4791-affd-bb82966ed85a', '10078594-2707-4c3f-a212-42add04fbd84', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', '11357316-3fe8-4dd3-a3eb-99d6fb48b92b', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'efe329b2-0a62-4279-a7d1-627abe557321', 'Spring 2026', 'Spring', true, false, true, DATE '2026-06-15' - integer '14', ('2026-02-01'::timestamp + interval '1 day'), timestamp '2026-02-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('684fe08e-8aeb-4069-a864-a800f0e007aa', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '93a2a9b8-de26-4fbb-a805-d7134bc8a55f', 'problem_solving', 'Problem Solving & Analysis', 'Problem', 25, 25, '#EF4444', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('6ddc3532-8a5c-41f0-a01c-80467a94d895', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '7283938c-881e-46e5-a432-793287f19248', 'system_design', 'System Design & Architecture', 'Design', 25, 25, '#3B82F6', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'c2a960c2-ec12-409c-a49b-14ac9f66a451', 'implementation_quality', 'Implementation Quality', 'Impl', 20, 20, '#F59E0B', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('fb8af623-bf3b-4522-a586-ff6e8bfec072', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'cba29dca-3ee3-4e5a-a78a-44034a059a9a', 'communication', 'Communication & Documentation', 'Comm', 20, 20, '#EC4899', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('d503371e-a85d-4eea-ad83-a91291cf4297', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'a0ce2f65-e11f-427c-ab49-6806b15b6ffe', 'teamwork', 'Teamwork & Collaboration', 'Team', 10, 10, '#10B981', '[{"min":9,"max":10,"label":"Excellent","description":"Outstanding"},{"min":7,"max":8,"label":"Good","description":"Above average"},{"min":5,"max":6,"label":"Developing","description":"Meets minimum"},{"min":0,"max":4,"label":"Insufficient","description":"Below standard"}]', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('a5bea604-8463-4929-a46c-5bb1568d684c', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '0c61d3b2-4098-4181-a0a9-af00ccddd55f', 'SO-1', 'Complex Problem Solving', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('f98bcdd3-1be4-47da-a10c-28fa45161475', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '4ed4e517-5b27-4f61-a16b-6d7b86d2d592', 'SO-2', 'Engineering Design', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('c31f07bb-2e21-4d89-a542-cfc86ca434f1', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'cc92ffdb-deee-4b4a-ad3f-ab54b9a16df3', 'SO-3', 'Effective Communication', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('ee585ca5-4680-4e2f-ab04-4fb5f2dde220', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'f4f08ca1-e5f1-4cc9-aa5f-a308966a9375', 'SO-4', 'Ethics and Professional Responsibility', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('80a7db51-917f-4e0c-a071-af18588c6805', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'f9c945a1-24f5-4ab1-abad-9a35a116c09c', 'SO-5', 'Teamwork', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('0043ad29-4368-4796-aaf9-1a2251ab364e', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'e55ec114-ecd9-4bbc-acb2-56ddbb255ee3', 'SO-6', 'Experimentation and Analysis', 6) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('e22d4bf3-d469-4d5c-a28b-1e5086638c17', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '293b2e58-626c-4a8a-afab-c4827d6888ae', 'SO-7', 'Lifelong Learning', 7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('a4a3055a-f1df-40ba-a295-537bdfd2efc3', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '684fe08e-8aeb-4069-a864-a800f0e007aa', 'a5bea604-8463-4929-a46c-5bb1568d684c', 0.6) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('6393b281-4353-4bb0-a130-0e595bcfd2ca', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '684fe08e-8aeb-4069-a864-a800f0e007aa', '0043ad29-4368-4796-aaf9-1a2251ab364e', 0.4) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('5fd7b930-6a75-4976-a5d6-c7b1f3ec0436', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 'f98bcdd3-1be4-47da-a10c-28fa45161475', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('c3f8ba2d-a90c-4af2-a784-a6a6cf01fd47', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 'a5bea604-8463-4929-a46c-5bb1568d684c', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('356571d0-4713-42f0-a669-e5cb9cf759b4', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', '0043ad29-4368-4796-aaf9-1a2251ab364e', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('b2196754-796c-47fe-a275-4ccf18e9c773', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 'f98bcdd3-1be4-47da-a10c-28fa45161475', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('fe65fc37-eb2f-4428-a93a-25f9ba398d26', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 'e22d4bf3-d469-4d5c-a28b-1e5086638c17', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('e96d1ae7-30c5-4957-ae08-85a641ddfde4', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 'c31f07bb-2e21-4d89-a542-cfc86ca434f1', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('611d58f9-7752-4144-a0db-1a63a7766d98', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 'ee585ca5-4680-4e2f-ab04-4fb5f2dde220', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('fd06fc64-d5b7-44fb-a65f-5184089f5929', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'd503371e-a85d-4eea-ad83-a91291cf4297', '80a7db51-917f-4e0c-a071-af18588c6805', 1) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'efe329b2-0a62-4279-a7d1-627abe557321', 'Fall 2025', 'Fall', false, true, true, DATE '2025-12-20' - integer '14', ('2025-09-01'::timestamp), timestamp '2025-09-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '93a2a9b8-de26-4fbb-a805-d7134bc8a55f', 'problem_solving', 'Problem Solving & Analysis', 'Problem', 25, 25, '#EF4444', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('d3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '7283938c-881e-46e5-a432-793287f19248', 'system_design', 'System Design & Architecture', 'Design', 25, 25, '#3B82F6', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('2a39ada5-da79-4403-aec0-8299b6747419', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'c2a960c2-ec12-409c-a49b-14ac9f66a451', 'implementation_quality', 'Implementation Quality', 'Impl', 20, 20, '#F59E0B', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('26a1a51f-ab67-405d-a737-b184d060edb8', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'cba29dca-3ee3-4e5a-a78a-44034a059a9a', 'communication', 'Comm. & Documentation', 'Comm', 20, 20, '#EC4899', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('5809839f-fbb7-4a4f-a996-72ee4cf60160', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'a0ce2f65-e11f-427c-ab49-6806b15b6ffe', 'teamwork', 'Teamwork & Collaboration', 'Team', 10, 10, '#10B981', '[{"min":9,"max":10,"label":"Excellent","description":"Outstanding"},{"min":7,"max":8,"label":"Good","description":"Above average"},{"min":5,"max":6,"label":"Developing","description":"Meets minimum"},{"min":0,"max":4,"label":"Insufficient","description":"Below standard"}]', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('629b72b7-20f5-432c-a4bd-a435be076266', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '0c61d3b2-4098-4181-a0a9-af00ccddd55f', 'SO-1', 'Complex Problem Solving', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('af501c7a-70a5-4ed2-a337-17c274c4b6a5', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '4ed4e517-5b27-4f61-a16b-6d7b86d2d592', 'SO-2', 'Engineering Design', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('e3b4ea65-16a2-44d9-adfe-32892e251655', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'cc92ffdb-deee-4b4a-ad3f-ab54b9a16df3', 'SO-3', 'Effective Communication', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('62137309-edc6-45d1-a79f-1ecdf287f625', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'f4f08ca1-e5f1-4cc9-aa5f-a308966a9375', 'SO-4', 'Ethics and Professional Responsibility', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('3e12013f-64c8-4bc3-a51b-c703a545a842', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'f9c945a1-24f5-4ab1-abad-9a35a116c09c', 'SO-5', 'Teamwork', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('698f310a-b92e-42d2-a15c-f115ba16abb2', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'e55ec114-ecd9-4bbc-acb2-56ddbb255ee3', 'SO-6', 'Experimentation and Analysis', 6) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('8e47666d-0ca4-44e0-a88e-509816bff370', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '293b2e58-626c-4a8a-afab-c4827d6888ae', 'SO-7', 'Lifelong Learning', 7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('f85c0bf0-0683-46cc-a938-b01bc6143322', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', '629b72b7-20f5-432c-a4bd-a435be076266', 0.6) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('62925ddd-7a94-4574-af01-956691166b10', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', '698f310a-b92e-42d2-a15c-f115ba16abb2', 0.4) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('5cb7fd13-e402-4a68-a2bb-80c3909b9c7d', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 'af501c7a-70a5-4ed2-a337-17c274c4b6a5', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('1ec54ff8-f1e3-45c4-a115-bbc66ad47314', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', '629b72b7-20f5-432c-a4bd-a435be076266', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('837b7408-a6e6-4353-a75a-5b7c1b8d2505', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '2a39ada5-da79-4403-aec0-8299b6747419', '698f310a-b92e-42d2-a15c-f115ba16abb2', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('adced6bb-3539-4a61-ae5b-aee6164a39a8', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '2a39ada5-da79-4403-aec0-8299b6747419', 'af501c7a-70a5-4ed2-a337-17c274c4b6a5', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('87aac54c-3190-45fa-a13e-0d125638130f', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '2a39ada5-da79-4403-aec0-8299b6747419', '8e47666d-0ca4-44e0-a88e-509816bff370', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('913fd8e5-b990-4ce3-a2bd-c8e494c87fe2', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '26a1a51f-ab67-405d-a737-b184d060edb8', 'e3b4ea65-16a2-44d9-adfe-32892e251655', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('d048f33b-406f-4ec2-a709-1f35666c9ab6', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '26a1a51f-ab67-405d-a737-b184d060edb8', '62137309-edc6-45d1-a79f-1ecdf287f625', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('8c5e3db5-c545-45b8-ab25-8d6df117dd7f', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '5809839f-fbb7-4a4f-a996-72ee4cf60160', '3e12013f-64c8-4bc3-a51b-c703a545a842', 1) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('0e963024-a53f-4722-a9e0-5db7a47b4419', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'efe329b2-0a62-4279-a7d1-627abe557321', 'Spring 2025', 'Spring', false, true, true, DATE '2025-06-15' - integer '14', ('2025-02-01'::timestamp), timestamp '2025-02-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('53700e90-0bef-4410-aa0f-3995053ad8a2', '0e963024-a53f-4722-a9e0-5db7a47b4419', '93a2a9b8-de26-4fbb-a805-d7134bc8a55f', 'problem_solving', 'Problem Solving & Analysis (Legacy)', 'Problem', 25, 25, '#EF4444', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', '0e963024-a53f-4722-a9e0-5db7a47b4419', '7283938c-881e-46e5-a432-793287f19248', 'system_design', 'System Design & Architecture (Legacy)', 'Design', 25, 25, '#3B82F6', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'c2a960c2-ec12-409c-a49b-14ac9f66a451', 'implementation_quality', 'Implementation Quality (Legacy)', 'Impl', 20, 20, '#F59E0B', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('770df56c-9bc9-4108-a5a9-1056b29af922', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'cba29dca-3ee3-4e5a-a78a-44034a059a9a', 'communication', 'Communication & Documentation (Legacy)', 'Comm', 20, 20, '#EC4899', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('36146a5d-35be-44c7-af15-a3d586386a27', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'a0ce2f65-e11f-427c-ab49-6806b15b6ffe', 'teamwork', 'Teamwork & Collaboration (Legacy)', 'Team', 10, 10, '#10B981', '[{"min":9,"max":10,"label":"Excellent","description":"Outstanding"},{"min":7,"max":8,"label":"Good","description":"Above average"},{"min":5,"max":6,"label":"Developing","description":"Meets minimum"},{"min":0,"max":4,"label":"Insufficient","description":"Below standard"}]', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('d65e3bd0-a251-4f40-aefb-3c859c11a091', '0e963024-a53f-4722-a9e0-5db7a47b4419', '0c61d3b2-4098-4181-a0a9-af00ccddd55f', 'SO-1', 'Complex Problem Solving', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('ae42b5e9-35b1-4f6e-a030-a6c45859c432', '0e963024-a53f-4722-a9e0-5db7a47b4419', '4ed4e517-5b27-4f61-a16b-6d7b86d2d592', 'SO-2', 'Engineering Design', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('1bb99422-804f-4ac1-a971-a562757a7277', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'cc92ffdb-deee-4b4a-ad3f-ab54b9a16df3', 'SO-3', 'Effective Communication', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('59256dc0-6af7-49e0-a8ef-41077d05a9f9', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'f4f08ca1-e5f1-4cc9-aa5f-a308966a9375', 'SO-4', 'Ethics and Professional Responsibility', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('c6344ba8-78ad-49dc-ab24-134e34c048ea', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'f9c945a1-24f5-4ab1-abad-9a35a116c09c', 'SO-5', 'Teamwork', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('c6e5b442-d0f9-4914-a4b0-3786e829dc0e', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'e55ec114-ecd9-4bbc-acb2-56ddbb255ee3', 'SO-6', 'Experimentation and Analysis', 6) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('0211da54-451d-4fe3-a851-bb2460452d2e', '0e963024-a53f-4722-a9e0-5db7a47b4419', '293b2e58-626c-4a8a-afab-c4827d6888ae', 'SO-7', 'Lifelong Learning', 7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('c92745d9-5ece-42a1-a977-05910fae94c4', '0e963024-a53f-4722-a9e0-5db7a47b4419', '53700e90-0bef-4410-aa0f-3995053ad8a2', 'd65e3bd0-a251-4f40-aefb-3c859c11a091', 0.6) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('6c03a562-2772-4356-abaf-1e6505cb7f86', '0e963024-a53f-4722-a9e0-5db7a47b4419', '53700e90-0bef-4410-aa0f-3995053ad8a2', 'c6e5b442-d0f9-4914-a4b0-3786e829dc0e', 0.4) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('13efaab8-341f-4bbb-a8de-408136a7c508', '0e963024-a53f-4722-a9e0-5db7a47b4419', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 'ae42b5e9-35b1-4f6e-a030-a6c45859c432', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('8bd0731c-a98d-4f59-a1ba-3306fe764099', '0e963024-a53f-4722-a9e0-5db7a47b4419', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 'd65e3bd0-a251-4f40-aefb-3c859c11a091', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('ad7b096d-e4a8-48db-a9f9-8923705c69a0', '0e963024-a53f-4722-a9e0-5db7a47b4419', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 'c6e5b442-d0f9-4914-a4b0-3786e829dc0e', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('2db0633e-f4e7-4ec0-a17e-08db32200a26', '0e963024-a53f-4722-a9e0-5db7a47b4419', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 'ae42b5e9-35b1-4f6e-a030-a6c45859c432', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('1bc8ee16-8324-4e92-ae49-e607c388f35a', '0e963024-a53f-4722-a9e0-5db7a47b4419', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', '0211da54-451d-4fe3-a851-bb2460452d2e', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('4870dab6-6d6e-4bcd-a5c4-98c9cc0b7c48', '0e963024-a53f-4722-a9e0-5db7a47b4419', '770df56c-9bc9-4108-a5a9-1056b29af922', '1bb99422-804f-4ac1-a971-a562757a7277', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('76968d02-9fcf-4383-a456-8f8a5cc0f02c', '0e963024-a53f-4722-a9e0-5db7a47b4419', '770df56c-9bc9-4108-a5a9-1056b29af922', '59256dc0-6af7-49e0-a8ef-41077d05a9f9', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('092fcb8c-7444-496a-a142-18a780c3031d', '0e963024-a53f-4722-a9e0-5db7a47b4419', '36146a5d-35be-44c7-af15-a3d586386a27', 'c6344ba8-78ad-49dc-ab24-134e34c048ea', 1) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('f8c01197-da4a-4646-a42d-8dc74715e3bc', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'efe329b2-0a62-4279-a7d1-627abe557321', 'Fall 2024', 'Fall', false, true, true, DATE '2024-01-15' - integer '14', ('2024-09-01'::timestamp), timestamp '2024-09-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('9ec0420a-7f95-4e3f-ad37-b95948485c65', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '93a2a9b8-de26-4fbb-a805-d7134bc8a55f', 'problem_solving', 'Problem Solving & Analysis', 'Problem', 25, 25, '#EF4444', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('52f96a98-1ac8-4b6e-aa3c-02ab77905c16', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '7283938c-881e-46e5-a432-793287f19248', 'system_design', 'System Design & Architecture', 'Design', 25, 25, '#3B82F6', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('e242e868-2bb7-4869-af4b-7ad480080c56', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'c2a960c2-ec12-409c-a49b-14ac9f66a451', 'implementation_quality', 'Implementation Quality', 'Impl', 20, 20, '#F59E0B', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('e6928c81-092d-4b96-ada3-5dcf9bab3962', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'cba29dca-3ee3-4e5a-a78a-44034a059a9a', 'communication', 'Communication & Documentation', 'Comm', 20, 20, '#EC4899', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('5483798a-76bd-4d78-aca0-0d51ce803849', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'a0ce2f65-e11f-427c-ab49-6806b15b6ffe', 'teamwork', 'Teamwork & Collaboration', 'Team', 10, 10, '#10B981', '[{"min":9,"max":10,"label":"Excellent","description":"Outstanding"},{"min":7,"max":8,"label":"Good","description":"Above average"},{"min":5,"max":6,"label":"Developing","description":"Meets minimum"},{"min":0,"max":4,"label":"Insufficient","description":"Below standard"}]', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('96e33e0e-4746-457f-a58e-4fb303b9b58c', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '0c61d3b2-4098-4181-a0a9-af00ccddd55f', 'SO-1', 'Complex Problem Solving', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('6114bb13-332f-4344-af51-10f39a4ae7d7', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '4ed4e517-5b27-4f61-a16b-6d7b86d2d592', 'SO-2', 'Engineering Design', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('b7a0e539-710f-4c09-a1ff-39a451a05b3d', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'cc92ffdb-deee-4b4a-ad3f-ab54b9a16df3', 'SO-3', 'Effective Communication', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('c403c94b-40d6-4f9f-a5fc-a3dade02b95c', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'f4f08ca1-e5f1-4cc9-aa5f-a308966a9375', 'SO-4', 'Ethics and Professional Responsibility', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('9f7e84de-7078-4f00-af90-2e7538b07bcb', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'f9c945a1-24f5-4ab1-abad-9a35a116c09c', 'SO-5', 'Teamwork', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('ee62c7c7-fee0-46a2-a9aa-ccd572d1a50a', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'e55ec114-ecd9-4bbc-acb2-56ddbb255ee3', 'SO-6', 'Experimentation and Analysis', 6) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('96173993-403a-4b25-ae43-05d469aa735c', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '293b2e58-626c-4a8a-afab-c4827d6888ae', 'SO-7', 'Lifelong Learning', 7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('f7afd006-c062-4c0f-af9d-56eb87f3510e', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '9ec0420a-7f95-4e3f-ad37-b95948485c65', '96e33e0e-4746-457f-a58e-4fb303b9b58c', 0.6) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('a407a652-ec9e-4eae-a426-bb6d0be46f83', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '9ec0420a-7f95-4e3f-ad37-b95948485c65', 'ee62c7c7-fee0-46a2-a9aa-ccd572d1a50a', 0.4) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('e38fea80-8ef8-44ed-a200-b58f0f813891', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '52f96a98-1ac8-4b6e-aa3c-02ab77905c16', '6114bb13-332f-4344-af51-10f39a4ae7d7', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('dfa64409-2b4e-475e-a682-03ac1eb8678d', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '52f96a98-1ac8-4b6e-aa3c-02ab77905c16', '96e33e0e-4746-457f-a58e-4fb303b9b58c', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('67869edb-a79e-4b10-a115-66f98bd6d368', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'e242e868-2bb7-4869-af4b-7ad480080c56', 'ee62c7c7-fee0-46a2-a9aa-ccd572d1a50a', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('9fb0b4b8-e7f5-45db-a753-d302b5ec0927', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'e242e868-2bb7-4869-af4b-7ad480080c56', '6114bb13-332f-4344-af51-10f39a4ae7d7', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('04bc89d9-0b30-4aee-a7fc-47f93bac6b23', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'e242e868-2bb7-4869-af4b-7ad480080c56', '96173993-403a-4b25-ae43-05d469aa735c', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('4916c680-43d7-4b9a-a807-42b04e914e3b', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'e6928c81-092d-4b96-ada3-5dcf9bab3962', 'b7a0e539-710f-4c09-a1ff-39a451a05b3d', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('d54a45c7-e7cb-401e-ad5f-d1cec546fa6f', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'e6928c81-092d-4b96-ada3-5dcf9bab3962', 'c403c94b-40d6-4f9f-a5fc-a3dade02b95c', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('9129092e-6622-4ce4-aaf4-d049e5735566', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '5483798a-76bd-4d78-aca0-0d51ce803849', '9f7e84de-7078-4f00-af90-2e7538b07bcb', 1) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('e77bf882-fc32-461c-acab-6ee1696df0c7', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', '824ead2b-7676-4297-a6e1-507869f5f299', '2026 Season', NULL, true, false, true, DATE '2026-08-15' - integer '14', ('2026-06-01'::timestamp + interval '1 day'), timestamp '2026-06-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '10f52721-c639-4184-a0c4-1493bd620bfd', 'preliminary_report', 'Preliminary Design Report (ODR)', 'Report', 25, 25, '#6366F1', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('c561d84a-3cda-4605-a33c-1ceb37ebed21', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'b58a9de4-d6c7-4143-a851-ed52ef1c7aab', 'critical_design', 'Critical Design Review (KTR)', 'CDR', 30, 30, '#F59E0B', '[{"min":26,"max":30,"label":"Excellent","description":"Outstanding performance"},{"min":20,"max":25,"label":"Good","description":"Above average, minor gaps"},{"min":14,"max":19,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":13,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'a408685a-ba52-4173-a90f-b5bcf0b39b63', 'technical_performance', 'Technical Performance & Demo', 'Performance', 30, 30, '#EF4444', '[{"min":26,"max":30,"label":"Excellent","description":"Outstanding performance"},{"min":20,"max":25,"label":"Good","description":"Above average, minor gaps"},{"min":14,"max":19,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":13,"label":"Insufficient","description":"Below acceptable standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '9048c1b4-a5f6-499e-a002-58c2d231a40b', 'team_execution', 'Team Execution & Presentation', 'Team', 15, 15, '#10B981', '[{"min":9,"max":10,"label":"Excellent","description":"Outstanding"},{"min":7,"max":8,"label":"Good","description":"Above average"},{"min":5,"max":6,"label":"Developing","description":"Meets minimum"},{"min":0,"max":4,"label":"Insufficient","description":"Below standard"}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('57912c95-0503-405e-aef9-4f3bac9dad7b', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'f21e10be-2829-4161-acf2-6ca56c414d98', 'TC-1', 'Preliminary Evaluation Report Quality', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('635cbebd-a119-41ed-a79f-0932f34850ce', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '5f1f1555-845b-4498-a005-4878e6f4d692', 'TC-2', 'Critical Design Maturity', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('f27e8194-271d-461f-a154-9f6e3045a116', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'daeff078-d457-48cc-af0f-7ebefc99a64f', 'TC-3', 'Field Performance and Jury Presentation', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('bf7ccdc7-c5e5-4d63-ac87-c75fb45388ae', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c0f9b501-7d38-4fcc-a565-65ad87f853f4', 'TC-4', 'General Team Competency', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('d0303d1d-f786-46ac-aebd-b00a61a7484f', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', '57912c95-0503-405e-aef9-4f3bac9dad7b', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('fb750a87-35d0-4104-addb-7a6a27e85e09', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', '635cbebd-a119-41ed-a79f-0932f34850ce', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('b14eb707-4eb5-44bc-a05d-6c2a66d05f7c', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', '57912c95-0503-405e-aef9-4f3bac9dad7b', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('4d2087cc-0b83-4018-a05d-692b1ee534ae', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 'f27e8194-271d-461f-a154-9f6e3045a116', 0.8) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('8cb113d7-a8f5-4398-a87b-c662063bbc79', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', '635cbebd-a119-41ed-a79f-0932f34850ce', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('d43d79b8-4837-4bed-a24d-4d287e6934df', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 'bf7ccdc7-c5e5-4d63-ac87-c75fb45388ae', 0.6) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('5c55e38a-8c82-4bc2-a65b-1cc3072c30c3', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 'f27e8194-271d-461f-a154-9f6e3045a116', 0.4) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('308d2708-dbea-41b6-a1c8-da6129445759', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', '824ead2b-7676-4297-a6e1-507869f5f299', '2025 Season', NULL, false, true, true, DATE '2025-08-15' - integer '14', ('2025-06-01'::timestamp), timestamp '2025-06-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('9fc5d438-f3ea-4966-ad57-e9ba3626497e', '308d2708-dbea-41b6-a1c8-da6129445759', '10f52721-c639-4184-a0c4-1493bd620bfd', 'preliminary_report', 'Preliminary Design Report (ODR)', 'Report', 25, 25, '#6366F1', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('9291055e-e458-479e-a0de-bd69595777ff', '308d2708-dbea-41b6-a1c8-da6129445759', 'b58a9de4-d6c7-4143-a851-ed52ef1c7aab', 'critical_design', 'Critical Design Review (KTR)', 'CDR', 30, 30, '#F59E0B', '[{"min":26,"max":30,"label":"Excellent","description":"Outstanding performance"},{"min":20,"max":25,"label":"Good","description":"Above average, minor gaps"},{"min":14,"max":19,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":13,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('d8088c7f-e974-490e-ad55-0b51a4bb2138', '308d2708-dbea-41b6-a1c8-da6129445759', 'a408685a-ba52-4173-a90f-b5bcf0b39b63', 'technical_performance', 'Technical Performance & Demo', 'Performance', 30, 30, '#EF4444', '[{"min":26,"max":30,"label":"Excellent","description":"Outstanding performance"},{"min":20,"max":25,"label":"Good","description":"Above average, minor gaps"},{"min":14,"max":19,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":13,"label":"Insufficient","description":"Below acceptable standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('34e60116-c678-4d43-a5a3-6ed510928812', '308d2708-dbea-41b6-a1c8-da6129445759', '9048c1b4-a5f6-499e-a002-58c2d231a40b', 'team_execution', 'Team Execution & Pres.', 'Team', 15, 15, '#10B981', '[{"min":9,"max":10,"label":"Excellent","description":"Outstanding"},{"min":7,"max":8,"label":"Good","description":"Above average"},{"min":5,"max":6,"label":"Developing","description":"Meets minimum"},{"min":0,"max":4,"label":"Insufficient","description":"Below standard"}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('f2adb727-0543-4fc0-a58f-95c55bb63f97', '308d2708-dbea-41b6-a1c8-da6129445759', 'f21e10be-2829-4161-acf2-6ca56c414d98', 'TC-1', 'Preliminary Evaluation Report Quality', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('ea53f4c9-86da-465c-a6ae-3931722c77cc', '308d2708-dbea-41b6-a1c8-da6129445759', '5f1f1555-845b-4498-a005-4878e6f4d692', 'TC-2', 'Critical Design Maturity', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('f179f825-78e8-4fef-a524-a325459cba00', '308d2708-dbea-41b6-a1c8-da6129445759', 'daeff078-d457-48cc-af0f-7ebefc99a64f', 'TC-3', 'Field Performance and Jury Presentation', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('230e3029-3808-4af5-acec-db11bc254cc0', '308d2708-dbea-41b6-a1c8-da6129445759', 'c0f9b501-7d38-4fcc-a565-65ad87f853f4', 'TC-4', 'General Team Competency', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('890f761f-2c89-468a-acd1-941ccbcfb2e7', '308d2708-dbea-41b6-a1c8-da6129445759', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 'f2adb727-0543-4fc0-a58f-95c55bb63f97', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('c9b6707e-1e49-4c42-ab9d-60c87e86c8f9', '308d2708-dbea-41b6-a1c8-da6129445759', '9291055e-e458-479e-a0de-bd69595777ff', 'ea53f4c9-86da-465c-a6ae-3931722c77cc', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('1b89140f-626b-498a-af0f-48ecad08c2fb', '308d2708-dbea-41b6-a1c8-da6129445759', '9291055e-e458-479e-a0de-bd69595777ff', 'f2adb727-0543-4fc0-a58f-95c55bb63f97', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('9bd8556f-ab11-44ff-ab96-032013da666c', '308d2708-dbea-41b6-a1c8-da6129445759', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 'f179f825-78e8-4fef-a524-a325459cba00', 0.8) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('74bed904-8054-475c-ae30-92f269f0c6ad', '308d2708-dbea-41b6-a1c8-da6129445759', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 'ea53f4c9-86da-465c-a6ae-3931722c77cc', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('019374b3-7bef-4320-a985-bf51a2f391a2', '308d2708-dbea-41b6-a1c8-da6129445759', '34e60116-c678-4d43-a5a3-6ed510928812', '230e3029-3808-4af5-acec-db11bc254cc0', 0.6) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('14270378-3a91-46ea-a67f-c1e1871df5e9', '308d2708-dbea-41b6-a1c8-da6129445759', '34e60116-c678-4d43-a5a3-6ed510928812', 'f179f825-78e8-4fef-a524-a325459cba00', 0.4) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', '824ead2b-7676-4297-a6e1-507869f5f299', '2024 Season', NULL, false, true, true, DATE '2024-08-15' - integer '14', ('2024-06-01'::timestamp), timestamp '2024-06-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '10f52721-c639-4184-a0c4-1493bd620bfd', 'preliminary_report', 'Preliminary Design Report (ODR) (Legacy)', 'Report', 25, 25, '#6366F1', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'b58a9de4-d6c7-4143-a851-ed52ef1c7aab', 'critical_design', 'Critical Design Review (KTR) (Legacy)', 'CDR', 30, 30, '#F59E0B', '[{"min":26,"max":30,"label":"Excellent","description":"Outstanding performance"},{"min":20,"max":25,"label":"Good","description":"Above average, minor gaps"},{"min":14,"max":19,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":13,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('0c95a783-0c54-42d5-a2fe-559d093af7f5', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'a408685a-ba52-4173-a90f-b5bcf0b39b63', 'technical_performance', 'Technical Performance & Demo (Legacy)', 'Performance', 30, 30, '#EF4444', '[{"min":26,"max":30,"label":"Excellent","description":"Outstanding performance"},{"min":20,"max":25,"label":"Good","description":"Above average, minor gaps"},{"min":14,"max":19,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":13,"label":"Insufficient","description":"Below acceptable standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('d4fbf826-3d87-49d5-aa3a-acad4736d44a', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '9048c1b4-a5f6-499e-a002-58c2d231a40b', 'team_execution', 'Team Execution & Presentation (Legacy)', 'Team', 15, 15, '#10B981', '[{"min":9,"max":10,"label":"Excellent","description":"Outstanding"},{"min":7,"max":8,"label":"Good","description":"Above average"},{"min":5,"max":6,"label":"Developing","description":"Meets minimum"},{"min":0,"max":4,"label":"Insufficient","description":"Below standard"}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('b3952270-2a15-49ac-a5f2-ff894d8befd0', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'f21e10be-2829-4161-acf2-6ca56c414d98', 'TC-1', 'Preliminary Evaluation Report Quality', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('2670b517-fd78-450f-a8c4-548ac79c88a4', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '5f1f1555-845b-4498-a005-4878e6f4d692', 'TC-2', 'Critical Design Maturity', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('2f382f10-5c3a-4640-a121-8ecfd0cfc0d0', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'daeff078-d457-48cc-af0f-7ebefc99a64f', 'TC-3', 'Field Performance and Jury Presentation', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('719eb83d-dee3-4f81-a360-3747c2136bbc', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'c0f9b501-7d38-4fcc-a565-65ad87f853f4', 'TC-4', 'General Team Competency', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('74260c8f-9729-4803-a759-397602f63e73', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 'b3952270-2a15-49ac-a5f2-ff894d8befd0', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('850675ed-2128-4b7d-ade0-8fd6e3a50c3a', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', '2670b517-fd78-450f-a8c4-548ac79c88a4', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('20bb4be9-e721-426c-a680-0bf9577d4040', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 'b3952270-2a15-49ac-a5f2-ff894d8befd0', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('d29d03bc-4b61-473e-ac93-42e15a568285', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '0c95a783-0c54-42d5-a2fe-559d093af7f5', '2f382f10-5c3a-4640-a121-8ecfd0cfc0d0', 0.8) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('a0188c96-96f6-43d3-ac6f-a186ff4c4447', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '0c95a783-0c54-42d5-a2fe-559d093af7f5', '2670b517-fd78-450f-a8c4-548ac79c88a4', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('e310069b-b797-4b1c-a1e0-eeb61a950f31', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', '719eb83d-dee3-4f81-a360-3747c2136bbc', 0.6) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('f499815c-e2ae-4b4b-a1a0-04851201f807', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', '2f382f10-5c3a-4640-a121-8ecfd0cfc0d0', 0.4) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '088f5054-c9df-4c7f-a679-c1321524f250', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', '2026 Competition', NULL, true, false, true, DATE '2026-08-15' - integer '14', ('2026-06-01'::timestamp + interval '1 day'), timestamp '2026-06-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '9153ef48-d850-40bf-a60b-985c27b85214', 'originality', 'Originality & Creativity', 'Originality', 35, 35, '#8B5CF6', '[{"min":30,"max":35,"label":"Excellent","description":"Outstanding performance"},{"min":23,"max":29,"label":"Good","description":"Above average, minor gaps"},{"min":16,"max":22,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":15,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('3ceed4da-6045-435f-aaa5-f08cafe18240', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'ed12bef7-680e-44c5-a2c2-eafd7f911f6b', 'scientific_method', 'Scientific Method & Rigor', 'Method', 40, 40, '#3B82F6', '[{"min":35,"max":40,"label":"Excellent","description":"Outstanding performance"},{"min":27,"max":34,"label":"Good","description":"Above average, minor gaps"},{"min":19,"max":26,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":18,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('656fac7d-722f-4b52-aeb7-b36115296682', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'b2079523-b082-451d-afaa-b9f1ae7e5141', 'impact_and_presentation', 'Impact & Presentation', 'Impact', 25, 25, '#F59E0B', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('11b577e8-6d62-4bc1-a320-8ae571bad250', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '927c6ee5-bb03-44b8-afda-2a97f4272add', 'RC-1', 'Originality and Creativity', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('403a9258-b029-4fb5-ab76-73c1b36c4ba2', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '8258a7a0-3329-4b87-a2f9-ed57789c5d5f', 'RC-2', 'Scientific Method', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('5e722d14-e47f-40a5-a895-6ad28a6aedd1', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '29460c43-c2cc-42dc-a55c-9ae4ac05cb0f', 'RC-3', 'Results and Recommendations', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('ddcf601a-6f4c-407d-ad0c-605d9104f4a0', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '5971a865-48c8-45c7-a1fe-42276ca9c27c', 'RC-4', 'Applicability and Feasibility', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('bbe9f6e6-765b-4e46-ac6a-9d88ec48236d', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '5994e0a4-3fa2-434e-abab-246d6d0f6cf3', 'RC-5', 'Broader Impact', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('75e5d6c5-4b27-4b56-ada1-2de4bf9e1807', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', '11b577e8-6d62-4bc1-a320-8ae571bad250', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('1e404fa8-fc55-471f-a769-f1d51d009a6e', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 'ddcf601a-6f4c-407d-ad0c-605d9104f4a0', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('8cdfe19e-3f95-4f39-a8b6-a574dcc88f53', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '3ceed4da-6045-435f-aaa5-f08cafe18240', '403a9258-b029-4fb5-ab76-73c1b36c4ba2', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('f9500dae-cf11-40ce-aff2-9bb3fe1f98e1', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '3ceed4da-6045-435f-aaa5-f08cafe18240', '5e722d14-e47f-40a5-a895-6ad28a6aedd1', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('0def6bc6-5a58-4436-a6b1-598925495c7a', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '656fac7d-722f-4b52-aeb7-b36115296682', 'bbe9f6e6-765b-4e46-ac6a-9d88ec48236d', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('cd6f4379-4946-4b06-a12a-064ec28b6bcf', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '656fac7d-722f-4b52-aeb7-b36115296682', '5e722d14-e47f-40a5-a895-6ad28a6aedd1', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('d69405cc-dd57-4a83-a383-724f195cce7e', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '656fac7d-722f-4b52-aeb7-b36115296682', 'ddcf601a-6f4c-407d-ad0c-605d9104f4a0', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '088f5054-c9df-4c7f-a679-c1321524f250', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', '2025 Competition', NULL, false, true, true, DATE '2025-08-15' - integer '14', ('2025-06-01'::timestamp), timestamp '2025-06-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('f7160a57-742e-4428-ad3a-9ac826e3b2a4', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '9153ef48-d850-40bf-a60b-985c27b85214', 'originality', 'Originality & Creativity', 'Originality', 35, 35, '#8B5CF6', '[{"min":30,"max":35,"label":"Excellent","description":"Outstanding performance"},{"min":23,"max":29,"label":"Good","description":"Above average, minor gaps"},{"min":16,"max":22,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":15,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'ed12bef7-680e-44c5-a2c2-eafd7f911f6b', 'scientific_method', 'Scientific Method & Rigor', 'Method', 40, 40, '#3B82F6', '[{"min":35,"max":40,"label":"Excellent","description":"Outstanding performance"},{"min":27,"max":34,"label":"Good","description":"Above average, minor gaps"},{"min":19,"max":26,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":18,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('e1076839-63e0-4033-aa0d-4dde565034ea', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'b2079523-b082-451d-afaa-b9f1ae7e5141', 'impact_and_presentation', 'Impact & Pres.', 'Impact', 25, 25, '#F59E0B', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('437af770-fc6a-48f1-adb4-a645576f9819', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '927c6ee5-bb03-44b8-afda-2a97f4272add', 'RC-1', 'Originality and Creativity', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('f5ac0f63-963d-4f6d-af5b-ec49bd879a52', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '8258a7a0-3329-4b87-a2f9-ed57789c5d5f', 'RC-2', 'Scientific Method', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('eb67f759-9882-4af1-ab7d-63e9ab951cf9', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '29460c43-c2cc-42dc-a55c-9ae4ac05cb0f', 'RC-3', 'Results and Recommendations', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('4bbdd4f2-f5a1-4e1b-a6c2-f9f52a125626', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '5971a865-48c8-45c7-a1fe-42276ca9c27c', 'RC-4', 'Applicability and Feasibility', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('6e0a31ef-db0f-44a8-a341-9c0fb0e6d600', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '5994e0a4-3fa2-434e-abab-246d6d0f6cf3', 'RC-5', 'Broader Impact', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('9b58ba9f-7e02-4361-a8fb-62fa39d7fea8', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', '437af770-fc6a-48f1-adb4-a645576f9819', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('8dfba0d4-6eb5-495b-a97a-9ef3bd0d19b2', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', '4bbdd4f2-f5a1-4e1b-a6c2-f9f52a125626', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('5709637a-d7cb-4702-a736-35c4bfa7f39d', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 'f5ac0f63-963d-4f6d-af5b-ec49bd879a52', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('8cc7824b-1598-4412-aaaf-59cfe3b9677d', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 'eb67f759-9882-4af1-ab7d-63e9ab951cf9', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('6c59fd4e-8d1f-4f27-a81a-b98e164420f9', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'e1076839-63e0-4033-aa0d-4dde565034ea', '6e0a31ef-db0f-44a8-a341-9c0fb0e6d600', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('1ae4761d-ee51-4317-aa8a-03c3ecf85232', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'e1076839-63e0-4033-aa0d-4dde565034ea', 'eb67f759-9882-4af1-ab7d-63e9ab951cf9', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('9ed70d8c-cb3a-4d69-ae10-60b20433f237', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'e1076839-63e0-4033-aa0d-4dde565034ea', '4bbdd4f2-f5a1-4e1b-a6c2-f9f52a125626', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '088f5054-c9df-4c7f-a679-c1321524f250', 'cf0b03e5-576d-4961-a0cc-f86b7852b85f', '2024 Competition', NULL, false, true, true, DATE '2024-08-15' - integer '14', ('2024-06-01'::timestamp), timestamp '2024-06-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('37ec86c1-bd1d-4155-a442-a1454ef973c5', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '9153ef48-d850-40bf-a60b-985c27b85214', 'originality', 'Originality & Creativity (Legacy)', 'Originality', 35, 35, '#8B5CF6', '[{"min":30,"max":35,"label":"Excellent","description":"Outstanding performance"},{"min":23,"max":29,"label":"Good","description":"Above average, minor gaps"},{"min":16,"max":22,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":15,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('3ac872ec-e845-4aec-a4e4-c27376aa77e8', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'ed12bef7-680e-44c5-a2c2-eafd7f911f6b', 'scientific_method', 'Scientific Method & Rigor (Legacy)', 'Method', 40, 40, '#3B82F6', '[{"min":35,"max":40,"label":"Excellent","description":"Outstanding performance"},{"min":27,"max":34,"label":"Good","description":"Above average, minor gaps"},{"min":19,"max":26,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":18,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('795dd7aa-24c7-44df-acd2-44dbb529189c', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'b2079523-b082-451d-afaa-b9f1ae7e5141', 'impact_and_presentation', 'Impact & Presentation (Legacy)', 'Impact', 25, 25, '#F59E0B', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('3df65d7d-879e-4bff-a891-87fbffe29653', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '927c6ee5-bb03-44b8-afda-2a97f4272add', 'RC-1', 'Originality and Creativity', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('0f33a1de-6900-4758-ae0f-816b2b43a3f3', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '8258a7a0-3329-4b87-a2f9-ed57789c5d5f', 'RC-2', 'Scientific Method', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('e1beba2b-0e40-41e3-a632-91a9155cfd21', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '29460c43-c2cc-42dc-a55c-9ae4ac05cb0f', 'RC-3', 'Results and Recommendations', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('387cfa40-f275-427b-a459-4f12dbec2138', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '5971a865-48c8-45c7-a1fe-42276ca9c27c', 'RC-4', 'Applicability and Feasibility', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('3a3dea08-a9ef-45d4-a6c6-13d1e3fc852d', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '5994e0a4-3fa2-434e-abab-246d6d0f6cf3', 'RC-5', 'Broader Impact', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('c7086037-b29b-4b28-a57c-ce4ebbe51806', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '37ec86c1-bd1d-4155-a442-a1454ef973c5', '3df65d7d-879e-4bff-a891-87fbffe29653', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('86c8baed-f7d7-4599-a1ae-0ca65334878a', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '37ec86c1-bd1d-4155-a442-a1454ef973c5', '387cfa40-f275-427b-a459-4f12dbec2138', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('c55e7c99-3d54-425b-acb5-c0b0efbcaa3e', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '3ac872ec-e845-4aec-a4e4-c27376aa77e8', '0f33a1de-6900-4758-ae0f-816b2b43a3f3', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('67dad2ec-4ffe-4177-a7ce-66e8cb2d8a57', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '3ac872ec-e845-4aec-a4e4-c27376aa77e8', 'e1beba2b-0e40-41e3-a632-91a9155cfd21', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('c5dac49e-d2b8-4b8c-a862-4250f2b10451', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '795dd7aa-24c7-44df-acd2-44dbb529189c', '3a3dea08-a9ef-45d4-a6c6-13d1e3fc852d', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('6f139c54-0ffb-40bd-a59b-df9931deef5e', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '795dd7aa-24c7-44df-acd2-44dbb529189c', 'e1beba2b-0e40-41e3-a632-91a9155cfd21', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('a1ead7c0-bc85-40cb-abf3-a473754aefdf', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '795dd7aa-24c7-44df-acd2-44dbb529189c', '387cfa40-f275-427b-a459-4f12dbec2138', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('6c44b363-4522-4cad-a251-06484b72b164', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', '8df4448a-b223-4569-a92e-4c81b669b065', '2026 Contest', NULL, true, false, true, DATE '2026-08-15' - integer '14', ('2026-06-01'::timestamp + interval '1 day'), timestamp '2026-06-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('bef0ee60-1170-401b-a860-190ae7af1d01', '6c44b363-4522-4cad-a251-06484b72b164', '87559029-8bad-47de-afc6-43faaa45230b', 'creativity', 'Creativity & Innovation', 'Creativity', 30, 30, '#EC4899', '[{"min":26,"max":30,"label":"Excellent","description":"Outstanding performance"},{"min":20,"max":25,"label":"Good","description":"Above average, minor gaps"},{"min":14,"max":19,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":13,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('14b446ba-82d2-4360-a0d5-3d650c766907', '6c44b363-4522-4cad-a251-06484b72b164', 'ee91d9af-bcf4-49a4-a966-cbd063bbb8f5', 'technical_merit', 'Technical Merit', 'Technical', 40, 40, '#3B82F6', '[{"min":35,"max":40,"label":"Excellent","description":"Outstanding performance"},{"min":27,"max":34,"label":"Good","description":"Above average, minor gaps"},{"min":19,"max":26,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":18,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('c7b88d63-b8b9-4151-ae69-d608d9cc4435', '6c44b363-4522-4cad-a251-06484b72b164', '03cdba6e-ce74-412d-ab8a-8819efca56ba', 'application_and_presentation', 'Application & Presentation', 'Presentation', 30, 30, '#F59E0B', '[{"min":26,"max":30,"label":"Excellent","description":"Outstanding performance"},{"min":20,"max":25,"label":"Good","description":"Above average, minor gaps"},{"min":14,"max":19,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":13,"label":"Insufficient","description":"Below acceptable standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('a1d7fcba-4898-43dc-a93c-c694b0363915', '6c44b363-4522-4cad-a251-06484b72b164', 'd4f70008-8664-4fc1-adca-346d3719c329', 'DC-1', 'Creativity', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('a4cfecc0-11f3-42c4-acb0-0f103676c76e', '6c44b363-4522-4cad-a251-06484b72b164', '22c36b11-dbe6-4200-a746-877759e831c7', 'DC-2', 'Technical Merit', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('b9d52774-972a-4cb6-a1e2-0b96ca31f4de', '6c44b363-4522-4cad-a251-06484b72b164', 'c08428e2-0dca-42a4-a982-8f8f34f1a827', 'DC-3', 'Practical Application', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('4b576b1f-7904-48b5-acba-5edad81d49a0', '6c44b363-4522-4cad-a251-06484b72b164', '208c4237-ddb7-4d8d-ae87-221df0bf5619', 'DC-4', 'Educational Value', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('02a5cdbb-384b-4696-abd0-953a9de9ef9a', '6c44b363-4522-4cad-a251-06484b72b164', 'bef0ee60-1170-401b-a860-190ae7af1d01', 'a1d7fcba-4898-43dc-a93c-c694b0363915', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('bd032766-7474-4b5b-a4f0-e85f9fabff3a', '6c44b363-4522-4cad-a251-06484b72b164', 'bef0ee60-1170-401b-a860-190ae7af1d01', '4b576b1f-7904-48b5-acba-5edad81d49a0', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('cce42c77-331b-406b-a106-b49ffad9280c', '6c44b363-4522-4cad-a251-06484b72b164', '14b446ba-82d2-4360-a0d5-3d650c766907', 'a4cfecc0-11f3-42c4-acb0-0f103676c76e', 0.8) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('cf88ba97-8084-4984-abfb-19c873ae45ff', '6c44b363-4522-4cad-a251-06484b72b164', '14b446ba-82d2-4360-a0d5-3d650c766907', 'b9d52774-972a-4cb6-a1e2-0b96ca31f4de', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('752c8c37-b4f9-4546-aa06-b1cf0dbd4752', '6c44b363-4522-4cad-a251-06484b72b164', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 'b9d52774-972a-4cb6-a1e2-0b96ca31f4de', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('aeadf48d-248a-4046-a0df-52596a427df6', '6c44b363-4522-4cad-a251-06484b72b164', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', '4b576b1f-7904-48b5-acba-5edad81d49a0', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('f932d12c-6a5b-459d-a25b-1f7c52d3681a', '6c44b363-4522-4cad-a251-06484b72b164', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 'a1d7fcba-4898-43dc-a93c-c694b0363915', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('318124ea-8614-4355-ad48-2486524dfc13', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', '8df4448a-b223-4569-a92e-4c81b669b065', '2025 Contest', NULL, false, true, true, DATE '2025-08-15' - integer '14', ('2025-06-01'::timestamp), timestamp '2025-06-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('f9fff257-dd3c-402c-a751-be4cd5b12e92', '318124ea-8614-4355-ad48-2486524dfc13', '87559029-8bad-47de-afc6-43faaa45230b', 'creativity', 'Creativity & Innovation', 'Creativity', 30, 30, '#EC4899', '[{"min":26,"max":30,"label":"Excellent","description":"Outstanding performance"},{"min":20,"max":25,"label":"Good","description":"Above average, minor gaps"},{"min":14,"max":19,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":13,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('e64b33e7-ae8d-4c65-a011-618a8d31e2c4', '318124ea-8614-4355-ad48-2486524dfc13', 'ee91d9af-bcf4-49a4-a966-cbd063bbb8f5', 'technical_merit', 'Technical Merit', 'Technical', 40, 40, '#3B82F6', '[{"min":35,"max":40,"label":"Excellent","description":"Outstanding performance"},{"min":27,"max":34,"label":"Good","description":"Above average, minor gaps"},{"min":19,"max":26,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":18,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('364bedf6-a50f-425c-aa45-3567c85d5ff8', '318124ea-8614-4355-ad48-2486524dfc13', '03cdba6e-ce74-412d-ab8a-8819efca56ba', 'application_and_presentation', 'Application & Pres.', 'Presentation', 30, 30, '#F59E0B', '[{"min":26,"max":30,"label":"Excellent","description":"Outstanding performance"},{"min":20,"max":25,"label":"Good","description":"Above average, minor gaps"},{"min":14,"max":19,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":13,"label":"Insufficient","description":"Below acceptable standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('bda43672-8856-400b-aab9-896d99b2db46', '318124ea-8614-4355-ad48-2486524dfc13', 'd4f70008-8664-4fc1-adca-346d3719c329', 'DC-1', 'Creativity', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('db67f25a-34b4-41d2-ab4f-34e3d3f9ac9b', '318124ea-8614-4355-ad48-2486524dfc13', '22c36b11-dbe6-4200-a746-877759e831c7', 'DC-2', 'Technical Merit', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('01bf8ecb-1c02-476c-a436-f1d2b5c08ee7', '318124ea-8614-4355-ad48-2486524dfc13', 'c08428e2-0dca-42a4-a982-8f8f34f1a827', 'DC-3', 'Practical Application', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('7cd29032-d663-4020-a190-6c17db0870ed', '318124ea-8614-4355-ad48-2486524dfc13', '208c4237-ddb7-4d8d-ae87-221df0bf5619', 'DC-4', 'Educational Value', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('cc958a6a-7269-45dd-a8da-15b4ba6348ef', '318124ea-8614-4355-ad48-2486524dfc13', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 'bda43672-8856-400b-aab9-896d99b2db46', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('6ed7d778-df20-4c13-afd3-1c53f25552c6', '318124ea-8614-4355-ad48-2486524dfc13', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', '7cd29032-d663-4020-a190-6c17db0870ed', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('e1cca70c-77ce-4c46-a982-84d201a34f05', '318124ea-8614-4355-ad48-2486524dfc13', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', 'db67f25a-34b4-41d2-ab4f-34e3d3f9ac9b', 0.8) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('ad49446a-54e5-406d-a334-470a800e5ec9', '318124ea-8614-4355-ad48-2486524dfc13', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', '01bf8ecb-1c02-476c-a436-f1d2b5c08ee7', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('98e47a68-eefc-4fa9-af71-be14c399b69d', '318124ea-8614-4355-ad48-2486524dfc13', '364bedf6-a50f-425c-aa45-3567c85d5ff8', '01bf8ecb-1c02-476c-a436-f1d2b5c08ee7', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('740978e9-26e5-4766-a242-da8410c18ef8', '318124ea-8614-4355-ad48-2486524dfc13', '364bedf6-a50f-425c-aa45-3567c85d5ff8', '7cd29032-d663-4020-a190-6c17db0870ed', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('4406cc33-9202-4f20-abbe-ea9e36edf24f', '318124ea-8614-4355-ad48-2486524dfc13', '364bedf6-a50f-425c-aa45-3567c85d5ff8', 'bda43672-8856-400b-aab9-896d99b2db46', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('b7014c23-db5e-4be5-a5d6-d9597e8578cc', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', '8df4448a-b223-4569-a92e-4c81b669b065', '2024 Contest', NULL, false, true, true, DATE '2024-08-15' - integer '14', ('2024-06-01'::timestamp), timestamp '2024-06-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('ba64aea1-ea3d-4194-a943-072cecebe7da', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '87559029-8bad-47de-afc6-43faaa45230b', 'creativity', 'Creativity & Innovation (Legacy)', 'Creativity', 30, 30, '#EC4899', '[{"min":26,"max":30,"label":"Excellent","description":"Outstanding performance"},{"min":20,"max":25,"label":"Good","description":"Above average, minor gaps"},{"min":14,"max":19,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":13,"label":"Insufficient","description":"Below acceptable standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('98470b72-67ab-4567-a032-60878aa519ac', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', 'ee91d9af-bcf4-49a4-a966-cbd063bbb8f5', 'technical_merit', 'Technical Merit (Legacy)', 'Technical', 40, 40, '#3B82F6', '[{"min":35,"max":40,"label":"Excellent","description":"Outstanding performance"},{"min":27,"max":34,"label":"Good","description":"Above average, minor gaps"},{"min":19,"max":26,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":18,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('4ed2d550-6e1d-445e-a788-36a46c491f1a', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '03cdba6e-ce74-412d-ab8a-8819efca56ba', 'application_and_presentation', 'Application & Presentation (Legacy)', 'Presentation', 30, 30, '#F59E0B', '[{"min":26,"max":30,"label":"Excellent","description":"Outstanding performance"},{"min":20,"max":25,"label":"Good","description":"Above average, minor gaps"},{"min":14,"max":19,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":13,"label":"Insufficient","description":"Below acceptable standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('f3a20abf-b2c4-4cc9-a21f-cc58313f3356', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', 'd4f70008-8664-4fc1-adca-346d3719c329', 'DC-1', 'Creativity', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('c431b523-edef-4ce3-aa48-ad23008c703a', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '22c36b11-dbe6-4200-a746-877759e831c7', 'DC-2', 'Technical Merit', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('50629813-93b3-4f8f-a9e5-e6311e7dfb84', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', 'c08428e2-0dca-42a4-a982-8f8f34f1a827', 'DC-3', 'Practical Application', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('33653e1e-a34b-4726-a7a9-156e8e811b41', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '208c4237-ddb7-4d8d-ae87-221df0bf5619', 'DC-4', 'Educational Value', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('e0b51edb-d518-42e1-af3d-f87c92e3f7fe', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', 'ba64aea1-ea3d-4194-a943-072cecebe7da', 'f3a20abf-b2c4-4cc9-a21f-cc58313f3356', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('22b807aa-c507-4e9b-a311-6862b7e01ee9', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', 'ba64aea1-ea3d-4194-a943-072cecebe7da', '33653e1e-a34b-4726-a7a9-156e8e811b41', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('cfa816b1-8a16-4359-a1ea-4d1ddd26a3dd', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '98470b72-67ab-4567-a032-60878aa519ac', 'c431b523-edef-4ce3-aa48-ad23008c703a', 0.8) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('1d976832-d69b-4780-aa19-9deb601adcc2', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '98470b72-67ab-4567-a032-60878aa519ac', '50629813-93b3-4f8f-a9e5-e6311e7dfb84', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('6b6a3773-0a93-42b7-a8c3-5710f4383d28', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '4ed2d550-6e1d-445e-a788-36a46c491f1a', '50629813-93b3-4f8f-a9e5-e6311e7dfb84', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('8b8b190c-9756-4c9b-ae55-59a676cf93f6', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '4ed2d550-6e1d-445e-a788-36a46c491f1a', '33653e1e-a34b-4726-a7a9-156e8e811b41', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('639a35e2-46b2-46f5-aea8-312fb55570b2', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '4ed2d550-6e1d-445e-a788-36a46c491f1a', 'f3a20abf-b2c4-4cc9-a21f-cc58313f3356', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('47979751-163d-48b3-ae56-a65586d18f1b', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', '2026 Season', 'Spring', true, false, true, DATE '2026-08-15' - integer '14', ('2026-06-01'::timestamp + interval '1 day'), timestamp '2026-06-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', '47979751-163d-48b3-ae56-a65586d18f1b', '4f8cf9da-b0c7-4a62-ae00-c127f9c6eb8a', 'design_compliance', 'Design Constraints Compliance', 'Compliance', 20, 20, '#6366F1', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', '47979751-163d-48b3-ae56-a65586d18f1b', '2acdc2ab-1710-48df-a764-c1e4b5e8ec4e', 'mission_execution', 'Mission Execution & Telemetry', 'Mission', 35, 35, '#EF4444', '[{"min":30,"max":35,"label":"Excellent","description":"Outstanding performance"},{"min":23,"max":29,"label":"Good","description":"Above average, minor gaps"},{"min":16,"max":22,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":15,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', '47979751-163d-48b3-ae56-a65586d18f1b', '7065e7e2-dffe-49f3-a6bf-2d59c6661b90', 'data_and_documentation', 'Data Analysis & Documentation', 'Data', 25, 25, '#3B82F6', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('18f89a44-f174-4ac6-a17a-56d22bfbca1c', '47979751-163d-48b3-ae56-a65586d18f1b', '089917fe-ade5-4d49-a70d-d9b1f8f6d319', 'safety_and_recovery', 'Safety & Recovery', 'Safety', 20, 20, '#10B981', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('2509554a-6c30-48a6-a234-69bc6c197b9c', '47979751-163d-48b3-ae56-a65586d18f1b', 'a7c6db91-308c-49ba-a91a-172d1e4f00f8', 'CS-1', 'Design Constraints Compliance', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('7698d6e4-025b-427b-aa70-05e9c84f1d5b', '47979751-163d-48b3-ae56-a65586d18f1b', '5589d3d4-c99e-4d87-a314-83e41236ca3a', 'CS-2', 'Primary Mission Execution', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('4552a456-f3e9-4d16-a606-76a25210e5b2', '47979751-163d-48b3-ae56-a65586d18f1b', '8e106aab-5b22-43d8-aa13-3ce02bff7660', 'CS-3', 'Descent Control and Recovery', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('abc4b9f6-b584-4866-af1c-2f12562a7247', '47979751-163d-48b3-ae56-a65586d18f1b', '7d5079e4-7b9c-4643-ac59-588ae909330f', 'CS-4', 'Safety and Restrictions Compliance', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('95119ea4-1abc-4954-a4c1-5e0f6f4e5f0b', '47979751-163d-48b3-ae56-a65586d18f1b', '08691235-b202-4833-a43d-46b4b5383f13', 'CS-5', 'Secondary Mission Originality', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('90a167c3-1619-4362-a7df-37e8513bdb49', '47979751-163d-48b3-ae56-a65586d18f1b', 'bce51d2c-50dc-4702-aa43-169b8160e443', 'CS-6', 'Data Analysis and Documentation Quality', 6) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('867378c2-68a7-4035-af20-b46d544a3608', '47979751-163d-48b3-ae56-a65586d18f1b', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', '2509554a-6c30-48a6-a234-69bc6c197b9c', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('c38cacb7-8a36-4020-abf2-2a334bf2777b', '47979751-163d-48b3-ae56-a65586d18f1b', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 'abc4b9f6-b584-4866-af1c-2f12562a7247', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('8bedbc17-88b6-43ad-a73a-68c13e0a774c', '47979751-163d-48b3-ae56-a65586d18f1b', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', '7698d6e4-025b-427b-aa70-05e9c84f1d5b', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('1c2714ee-0ec6-4982-af77-b3e78a86544e', '47979751-163d-48b3-ae56-a65586d18f1b', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', '95119ea4-1abc-4954-a4c1-5e0f6f4e5f0b', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('404b1944-9260-46f7-ace1-11a28945e7a5', '47979751-163d-48b3-ae56-a65586d18f1b', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', '4552a456-f3e9-4d16-a606-76a25210e5b2', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('ee0015a4-d2af-4c7c-a70a-6826f13b30f2', '47979751-163d-48b3-ae56-a65586d18f1b', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', '90a167c3-1619-4362-a7df-37e8513bdb49', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('8c71a9cc-7606-4155-aebc-e9a43235e33a', '47979751-163d-48b3-ae56-a65586d18f1b', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', '7698d6e4-025b-427b-aa70-05e9c84f1d5b', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('d41c0731-e110-412d-a6bc-bf68ace09616', '47979751-163d-48b3-ae56-a65586d18f1b', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 'abc4b9f6-b584-4866-af1c-2f12562a7247', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('df629a13-46f8-4262-ac4f-1e355d20a117', '47979751-163d-48b3-ae56-a65586d18f1b', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', '4552a456-f3e9-4d16-a606-76a25210e5b2', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('10abd4e8-0cb9-4853-a17c-ac40da311bff', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', '2025 Season', 'Spring', false, true, true, DATE '2025-08-15' - integer '14', ('2025-06-01'::timestamp), timestamp '2025-06-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('2d275ae4-9bda-42d7-a98b-0c5c22a7346f', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '4f8cf9da-b0c7-4a62-ae00-c127f9c6eb8a', 'design_compliance', 'Design Constraints Compliance', 'Compliance', 20, 20, '#6366F1', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('b5706a3d-f4c5-46a9-a86c-4b4e3082665c', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '2acdc2ab-1710-48df-a764-c1e4b5e8ec4e', 'mission_execution', 'Mission Execution & Telemetry', 'Mission', 35, 35, '#EF4444', '[{"min":30,"max":35,"label":"Excellent","description":"Outstanding performance"},{"min":23,"max":29,"label":"Good","description":"Above average, minor gaps"},{"min":16,"max":22,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":15,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('73155527-14c8-4fff-a5a3-8847cbf901cc', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '7065e7e2-dffe-49f3-a6bf-2d59c6661b90', 'data_and_documentation', 'Data Analysis & Documentation', 'Data', 25, 25, '#3B82F6', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('93da0efc-1f68-4c82-afa8-15b5afd72df7', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '089917fe-ade5-4d49-a70d-d9b1f8f6d319', 'safety_and_recovery', 'Safety & Recovery', 'Safety', 20, 20, '#10B981', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('dfe056ed-24a0-44e8-a432-4ee3c96e6487', '10abd4e8-0cb9-4853-a17c-ac40da311bff', 'a7c6db91-308c-49ba-a91a-172d1e4f00f8', 'CS-1', 'Design Constraints Compliance', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('8883904a-0682-41ec-a6aa-01dac16e3f60', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '5589d3d4-c99e-4d87-a314-83e41236ca3a', 'CS-2', 'Primary Mission Execution', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('5b716032-08de-450e-a6e2-fbbca5b6e3be', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '8e106aab-5b22-43d8-aa13-3ce02bff7660', 'CS-3', 'Descent Control and Recovery', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('bc72e379-f81d-402f-ac1c-96498faeec6c', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '7d5079e4-7b9c-4643-ac59-588ae909330f', 'CS-4', 'Safety and Restrictions Compliance', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('2c47e550-7672-4e01-af37-7f155b61af20', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '08691235-b202-4833-a43d-46b4b5383f13', 'CS-5', 'Secondary Mission Originality', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('010e1973-b107-4c0a-a94a-f321ef6a4c4d', '10abd4e8-0cb9-4853-a17c-ac40da311bff', 'bce51d2c-50dc-4702-aa43-169b8160e443', 'CS-6', 'Data Analysis and Documentation Quality', 6) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('c77ababb-e8f4-4885-a179-2ebcdea65236', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 'dfe056ed-24a0-44e8-a432-4ee3c96e6487', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('31b510a8-fca0-4d6e-af25-998dd572a17a', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 'bc72e379-f81d-402f-ac1c-96498faeec6c', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('564e5364-a6e9-40a8-a259-03a54a0b1e9f', '10abd4e8-0cb9-4853-a17c-ac40da311bff', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', '8883904a-0682-41ec-a6aa-01dac16e3f60', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('6818fa2d-80af-4766-ae98-922cec1b3391', '10abd4e8-0cb9-4853-a17c-ac40da311bff', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', '2c47e550-7672-4e01-af37-7f155b61af20', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('22ebbe72-c8b2-4648-a287-bcc5e07a20b4', '10abd4e8-0cb9-4853-a17c-ac40da311bff', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', '5b716032-08de-450e-a6e2-fbbca5b6e3be', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('c8f4b7b3-3782-489e-a0b2-94d57e89bb51', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '73155527-14c8-4fff-a5a3-8847cbf901cc', '010e1973-b107-4c0a-a94a-f321ef6a4c4d', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('6a7396ec-b8aa-4a02-aec9-043012bbe8b7', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '73155527-14c8-4fff-a5a3-8847cbf901cc', '8883904a-0682-41ec-a6aa-01dac16e3f60', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('e94349dc-388f-4169-a018-4e41995c10a5', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '93da0efc-1f68-4c82-afa8-15b5afd72df7', 'bc72e379-f81d-402f-ac1c-96498faeec6c', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('f90956a5-52f8-42aa-ac85-b51d39523d86', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '93da0efc-1f68-4c82-afa8-15b5afd72df7', '5b716032-08de-450e-a6e2-fbbca5b6e3be', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO periods (id, organization_id, framework_id, name, season, is_current, is_locked, is_visible, poster_date, snapshot_frozen_at, updated_at) VALUES ('9f49cd18-d850-4b1e-ae53-c08253910f4e', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', '80954c7f-86cc-4d85-aa08-2a6c6d59e7ff', '2024 Season', 'Spring', false, true, true, DATE '2024-08-15' - integer '14', ('2024-06-01'::timestamp), timestamp '2024-06-01' + interval '2 days') ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('70699916-5835-4002-a228-fa884a6cef12', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '4f8cf9da-b0c7-4a62-ae00-c127f9c6eb8a', 'design_compliance', 'Design Constraints Compliance (Legacy)', 'Compliance', 20, 20, '#6366F1', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('542366fd-6437-4188-a080-ccf790202f3b', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '2acdc2ab-1710-48df-a764-c1e4b5e8ec4e', 'mission_execution', 'Mission Execution & Telemetry (Legacy)', 'Mission', 35, 35, '#EF4444', '[{"min":30,"max":35,"label":"Excellent","description":"Outstanding performance"},{"min":23,"max":29,"label":"Good","description":"Above average, minor gaps"},{"min":16,"max":22,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":15,"label":"Insufficient","description":"Below acceptable standard"}]', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('bb8a742e-e337-4eb1-a91a-befa45d4e30e', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '7065e7e2-dffe-49f3-a6bf-2d59c6661b90', 'data_and_documentation', 'Data Analysis & Documentation (Legacy)', 'Data', 25, 25, '#3B82F6', '[{"min":22,"max":25,"label":"Excellent","description":"Outstanding performance"},{"min":17,"max":21,"label":"Good","description":"Above average, minor gaps"},{"min":12,"max":16,"label":"Developing","description":"Meets minimum, needs improvement"},{"min":0,"max":11,"label":"Insufficient","description":"Below acceptable standard"}]', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_criteria (id, period_id, source_criterion_id, key, label, short_label, max_score, weight, color, rubric_bands, sort_order) VALUES ('327d79df-1a6a-4e5e-af2d-ece7cff070bd', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '089917fe-ade5-4d49-a70d-d9b1f8f6d319', 'safety_and_recovery', 'Safety & Recovery (Legacy)', 'Safety', 20, 20, '#10B981', '[{"min":18,"max":20,"label":"Excellent","description":"Outstanding performance"},{"min":14,"max":17,"label":"Good","description":"Above average, minor gaps"},{"min":10,"max":13,"label":"Developing","description":"Meets minimum"},{"min":0,"max":9,"label":"Insufficient","description":"Below standard"}]', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('2f10763b-e720-4f9f-a772-13a768c9882a', '9f49cd18-d850-4b1e-ae53-c08253910f4e', 'a7c6db91-308c-49ba-a91a-172d1e4f00f8', 'CS-1', 'Design Constraints Compliance', 1) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('47a44fc4-b8f1-4171-a562-8aba489720d5', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '5589d3d4-c99e-4d87-a314-83e41236ca3a', 'CS-2', 'Primary Mission Execution', 2) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('7eee0293-2d2a-4959-ad93-1e8da0c5b1c2', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '8e106aab-5b22-43d8-aa13-3ce02bff7660', 'CS-3', 'Descent Control and Recovery', 3) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('7a8232d3-e319-4e19-a16b-df10ae7b7cb4', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '7d5079e4-7b9c-4643-ac59-588ae909330f', 'CS-4', 'Safety and Restrictions Compliance', 4) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('94da3bbe-6086-4868-a1d4-466f22287873', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '08691235-b202-4833-a43d-46b4b5383f13', 'CS-5', 'Secondary Mission Originality', 5) ON CONFLICT DO NOTHING;
INSERT INTO period_outcomes (id, period_id, source_outcome_id, code, label, sort_order) VALUES ('e6155dfb-7222-4e6c-a060-7c402afaa931', '9f49cd18-d850-4b1e-ae53-c08253910f4e', 'bce51d2c-50dc-4702-aa43-169b8160e443', 'CS-6', 'Data Analysis and Documentation Quality', 6) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('58065819-a70c-4fbc-aa53-66094885d3c9', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '70699916-5835-4002-a228-fa884a6cef12', '2f10763b-e720-4f9f-a772-13a768c9882a', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('aa137fa4-06af-4db8-ab8b-90da66b38148', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '70699916-5835-4002-a228-fa884a6cef12', '7a8232d3-e319-4e19-a16b-df10ae7b7cb4', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('c4b66519-8b6c-43b8-ad16-66cdf4b47f27', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '542366fd-6437-4188-a080-ccf790202f3b', '47a44fc4-b8f1-4171-a562-8aba489720d5', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('83d744c0-103c-4f83-a018-7ba258c84969', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '542366fd-6437-4188-a080-ccf790202f3b', '94da3bbe-6086-4868-a1d4-466f22287873', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('81b25dd7-5a5c-4841-a882-ae12d555ab6f', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '542366fd-6437-4188-a080-ccf790202f3b', '7eee0293-2d2a-4959-ad93-1e8da0c5b1c2', 0.2) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('eb2ad423-d40e-4475-adba-be4adc583d03', '9f49cd18-d850-4b1e-ae53-c08253910f4e', 'bb8a742e-e337-4eb1-a91a-befa45d4e30e', 'e6155dfb-7222-4e6c-a060-7c402afaa931', 0.7) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('97f8a369-072e-45f6-a10e-3eb9b5788d15', '9f49cd18-d850-4b1e-ae53-c08253910f4e', 'bb8a742e-e337-4eb1-a91a-befa45d4e30e', '47a44fc4-b8f1-4171-a562-8aba489720d5', 0.3) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('e6701d72-130d-48d7-acae-e71e1b055e11', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '327d79df-1a6a-4e5e-af2d-ece7cff070bd', '7a8232d3-e319-4e19-a16b-df10ae7b7cb4', 0.5) ON CONFLICT DO NOTHING;
INSERT INTO period_criterion_outcome_maps (id, period_id, period_criterion_id, period_outcome_id, weight) VALUES ('f7bba372-5478-4998-a0c3-01805ccce937', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '327d79df-1a6a-4e5e-af2d-ece7cff070bd', '7eee0293-2d2a-4959-ad93-1e8da0c5b1c2', 0.5) ON CONFLICT DO NOTHING;

-- Projects
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('93fcb76b-9827-4720-a1a8-9d65fdbc3055', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'FPGA-Based Real-Time Signal Processing for 5G NR', 1, '[{"name":"Baran Tekin","order":1},{"name":"Serkan Taşkın","order":2},{"name":"Alperen Turan","order":3},{"name":"Tuğçe Can","order":4}]', 'Prof. Turgut Ercan', 'TEDU EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('46123b99-4f0a-4d61-a870-6ef0f78e371f', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'Low-Power IoT Sensor Network for Smart Agriculture', 2, '[{"name":"Sinem Uslu","order":1},{"name":"Ezgi Doruk","order":2},{"name":"Kerem Arıcan","order":3},{"name":"Kaan Avcı","order":4}]', 'Dr. Ece Aydoğan', 'TEDU EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('733f9e70-8f7b-47dc-ad72-a604c760696f', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'Autonomous Drone Navigation with LiDAR SLAM', 3, '[{"name":"Mert Çakır","order":1},{"name":"Tuğçe Can","order":2},{"name":"Kübra Şen","order":3},{"name":"Burak Aslan","order":4}]', 'Prof. Cengiz Yalın', 'TEDU EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('339948a9-b977-4c51-a1bd-c3dab5e32936', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'GaN Power Amplifier Design for Sub-6 GHz 5G', 4, '[{"name":"Berk Gündüz","order":1},{"name":"Tolga Erim","order":2},{"name":"Beren Yücel","order":3}]', 'Dr. Aylin Seçkin', 'TEDU EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('2c01817f-5c28-4899-ab4b-fb741b5f8f9b', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'Edge AI Accelerator on RISC-V for Anomaly Detection', 5, '[{"name":"Ozan Çelebi","order":1},{"name":"Deniz Ünal","order":2},{"name":"Sinem Uslu","order":3}]', 'Prof. Tarık Özmen', 'TEDU EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('bdb8459f-49ce-405e-af0f-d35e36fcdcf2', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'Reconfigurable Intelligent Surface for Indoor mmWave', 6, '[{"name":"Caner Turgut","order":1},{"name":"Zeynep Gül","order":2},{"name":"Eren Güler","order":3},{"name":"Gizem Aksoy","order":4}]', 'Dr. Derya Civan', 'TEDU EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('1449ba13-0409-4bd3-abc9-ddf7040c5b76', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'Solar MPPT Controller with Machine Learning Optimization', 7, '[{"name":"Yiğit Polat","order":1},{"name":"Tolga Erim","order":2},{"name":"Burak Aslan","order":3},{"name":"Beren Yücel","order":4}]', 'Prof. Hakan Tekin', 'TEDU EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('9faaa31c-cdf6-4678-a123-2bfe194ce989', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'Bioimpedance Spectroscopy System for Tissue Analysis', 8, '[{"name":"Berk Gündüz","order":1},{"name":"İrem Demirci","order":2},{"name":"Umut Şahin","order":3},{"name":"Ceyda Vural","order":4}]', 'Dr. Zeliha Taşçı', 'TEDU EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('023ddedd-e060-4194-a7c5-8d3d27e6c3f6', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'Visible Light Communication Transceiver Prototype', 9, '[{"name":"Deniz Ünal","order":1},{"name":"Caner Turgut","order":2},{"name":"Elif Yılmaz","order":3}]', 'Prof. Turgut Ercan', 'TEDU EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('8fb336c1-ae87-45fc-a587-53fb3052016f', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'Multi-Robot Coordination via Distributed Consensus', 10, '[{"name":"Berk Gündüz","order":1},{"name":"Arda Keçeci","order":2},{"name":"Aslı Tezcan","order":3},{"name":"Tolga Erim","order":4}]', 'Dr. Ece Aydoğan', 'TEDU EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('00f25636-269c-4d25-abd5-3cdbc12a31f8', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'Computer Vision for Robotics (Group 1)', 1, '[{"name":"Ozan Çelebi","order":1},{"name":"Kerem Arıcan","order":2},{"name":"Ceren Erdoğan","order":3},{"name":"Ezgi Doruk","order":4}]', 'Prof. Beren Yücel', 'TEDU-EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('46c52db6-2cd0-404d-a2bf-23d390c741ad', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'Machine Learning on Microcontrollers (Group 2)', 2, '[{"name":"Gizem Aksoy","order":1},{"name":"Ceyda Vural","order":2},{"name":"Yiğit Polat","order":3}]', 'Prof. Gizem Aksoy', 'TEDU-EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('12cbf2c4-0a16-4574-abb5-b601beec8176', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'Computer Vision for Robotics (Group 3)', 3, '[{"name":"İrem Demirci","order":1},{"name":"Eren Güler","order":2},{"name":"Yiğit Polat","order":3}]', 'Prof. Ceren Erdoğan', 'TEDU-EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('0af988df-e6d9-4ac1-a6ec-56343146a552', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'Wireless Sensor Networks Optimization (Group 4)', 4, '[{"name":"Beren Yücel","order":1},{"name":"Mert Çakır","order":2},{"name":"Büşra Doğan","order":3}]', 'Prof. Ozan Çelebi', 'TEDU-EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('9dbf8fbe-1580-489c-a551-1eda5fb69025', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', 'Wireless Sensor Networks Optimization (Group 5)', 5, '[{"name":"Ezgi Doruk","order":1},{"name":"Gizem Aksoy","order":2},{"name":"Zeynep Gül","order":3},{"name":"Selin Akay","order":4}]', 'Prof. Rüya Işık', 'TEDU-EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('be3a4e6f-a69b-418a-a333-215fbfdf5261', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'Wireless Sensor Networks Optimization (Group 1)', 1, '[{"name":"Sinan Koç","order":1},{"name":"Baran Tekin","order":2},{"name":"Tolga Erim","order":3}]', 'Prof. İrem Demirci', 'TEDU-EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('85cf466e-cb30-49f6-a3ac-58884c85a854', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'Embedded System Design for Wearables (Group 2)', 2, '[{"name":"Büşra Doğan","order":1},{"name":"Caner Turgut","order":2},{"name":"Umut Şahin","order":3}]', 'Prof. Damla Kılıç', 'TEDU-EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('c2fd33b6-8b39-4397-acec-1dd12cdfc62b', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'Embedded System Design for Wearables (Group 3)', 3, '[{"name":"Onur Çelik","order":1},{"name":"Alperen Turan","order":2},{"name":"Ceyda Vural","order":3}]', 'Prof. Kaan Avcı', 'TEDU-EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('49d1f760-f4a0-40f3-a142-a11518c59c92', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'Computer Vision for Robotics (Group 4)', 4, '[{"name":"Aslı Tezcan","order":1},{"name":"Tolga Erim","order":2},{"name":"Melis Kavak","order":3}]', 'Prof. Kübra Şen', 'TEDU-EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('60146fd4-7794-4dd7-a91f-8dad08a9759a', '10078594-2707-4c3f-a212-42add04fbd84', 'Embedded System Design for Wearables (Group 1)', 1, '[{"name":"Büşra Doğan","order":1},{"name":"Ozan Çelebi","order":2},{"name":"Gizem Aksoy","order":3},{"name":"Tuğçe Can","order":4}]', 'Prof. Büşra Doğan', 'TEDU-EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('b89cf1e1-6820-4efb-ad3e-9ab5b4f1bafa', '10078594-2707-4c3f-a212-42add04fbd84', 'Embedded System Design for Wearables (Group 2)', 2, '[{"name":"Tuğçe Can","order":1},{"name":"Aslı Tezcan","order":2},{"name":"Arda Keçeci","order":3},{"name":"Zeynep Gül","order":4}]', 'Prof. Büşra Doğan', 'TEDU-EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('0db79881-0974-4a2d-a8a2-86efdb30bda1', '10078594-2707-4c3f-a212-42add04fbd84', 'Wireless Sensor Networks Optimization (Group 3)', 3, '[{"name":"Büşra Doğan","order":1},{"name":"Berk Gündüz","order":2},{"name":"Rüya Işık","order":3},{"name":"Elif Yılmaz","order":4}]', 'Prof. Melis Kavak', 'TEDU-EE') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('ed333a6e-c080-4a61-a6dc-87a0e3220f22', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'GPU-Accelerated LLM Inference Engine', 1, '[{"name":"Tessa Rowan","order":1},{"name":"Miles Cunningham","order":2},{"name":"Nolan Davies","order":3},{"name":"Ella Brooks","order":4}]', 'Prof. Lily Cooper', 'CMU-CS') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('dd36e1bf-2797-42b4-ac06-cd142c99074f', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'Blockchain-based Identity Verification', 2, '[{"name":"Eva Harding","order":1},{"name":"Chloe Ward","order":2},{"name":"Avery James","order":3},{"name":"Logan Bailey","order":4}]', 'Prof. Elias Boyd', 'CMU-CS') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('b15cefcf-fdfb-4b27-ae31-d743f12c947d', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'Distributed File System with Paxos', 3, '[{"name":"Mason Bell","order":1},{"name":"Maya Jenkins","order":2},{"name":"Mia Howard","order":3}]', 'Prof. Scarlett Wood', 'CMU-CS') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('098590f3-10cc-4859-a45f-f642a593a924', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'Autonomous Traffic Control via Deep RL', 4, '[{"name":"Cole Harrison","order":1},{"name":"Adam Bennett","order":2},{"name":"Nathan Cox","order":3}]', 'Prof. Dylan Reed', 'CMU-CS') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('4c0e22db-7d9f-4312-a1d3-4fed4c7e3316', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'Real-Time Gesture Recognition Pipeline', 5, '[{"name":"Stella Myers","order":1},{"name":"Lily Cooper","order":2},{"name":"Zoe Powell","order":3}]', 'Prof. Zoe Powell', 'CMU-CS') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('1d3379fc-8094-4ff3-a4c7-fea65531bacd', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'Zero-Knowledge Proofs for Smart Contracts', 6, '[{"name":"Miles Cunningham","order":1},{"name":"Logan Bailey","order":2},{"name":"Hazel Foster","order":3}]', 'Prof. Caleb Richardson', 'CMU-CS') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('8bda2f9b-55db-4d33-a40d-f8a111e93a24', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'GPU-Accelerated LLM Inference Engine', 1, '[{"name":"Nolan Davies","order":1},{"name":"Scarlett Wood","order":2},{"name":"Connor Ross","order":3},{"name":"Sophie Clarke","order":4}]', 'Prof. Logan Bailey', 'CMU-CS') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('427540fb-9f60-4bfd-afa2-4db31ec63cd4', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'Blockchain-based Identity Verification', 2, '[{"name":"Grace Kelly","order":1},{"name":"Aurora Price","order":2},{"name":"Scarlett Wood","order":3}]', 'Prof. Emma Peterson', 'CMU-CS') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('22646e69-d22a-4b34-aa2b-f1323161d52d', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'Distributed File System with Paxos', 3, '[{"name":"Lucy Brooks","order":1},{"name":"Julian Hayes","order":2},{"name":"Lucas Sullivan","order":3},{"name":"Ryan Price","order":4}]', 'Prof. Ella Brooks', 'CMU-CS') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('b37a7c3f-91c4-4a63-a51d-2b19f3bc7992', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'Autonomous Traffic Control via Deep RL', 4, '[{"name":"Grace Kelly","order":1},{"name":"Stella Myers","order":2},{"name":"Cole Harrison","order":3},{"name":"Chloe Ward","order":4}]', 'Prof. Mia Howard', 'CMU-CS') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('d9a0ceae-93bf-462a-a366-fa53e1c3ebbf', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'GPU-Accelerated LLM Inference Engine', 1, '[{"name":"Elias Boyd","order":1},{"name":"Hazel Foster","order":2},{"name":"Caleb Richardson","order":3}]', 'Prof. Ryan Price', 'CMU-CS') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('8c80391d-28d5-46b2-acfe-a57c940443b9', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'Blockchain-based Identity Verification', 2, '[{"name":"Miles Cunningham","order":1},{"name":"Hazel Foster","order":2},{"name":"Maya Jenkins","order":3},{"name":"Chloe Ward","order":4}]', 'Prof. Miles Cunningham', 'CMU-CS') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('48f4e97b-1296-4486-a4f5-323d8d9a0e11', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'Distributed File System with Paxos', 3, '[{"name":"Nathan Cox","order":1},{"name":"Caleb Richardson","order":2},{"name":"Lucy Brooks","order":3},{"name":"Nolan Davies","order":4}]', 'Prof. Nolan Davies', 'CMU-CS') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('d716c53c-18e0-4a50-a4b5-37770e2326a3', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'GPU-Accelerated LLM Inference Engine', 1, '[{"name":"Connor Ross","order":1},{"name":"Grace Kelly","order":2},{"name":"Maya Jenkins","order":3}]', 'Prof. Ella Brooks', 'CMU-CS') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('20e1dea2-c044-4eca-a288-e444a3d21226', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'Blockchain-based Identity Verification', 2, '[{"name":"Owen Gray","order":1},{"name":"Mia Howard","order":2},{"name":"Elias Boyd","order":3}]', 'Prof. Wyatt Watson', 'CMU-CS') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('3b8b2e62-bc66-4c8c-ad14-371049c8204e', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'Otonom Sürü İHA (UAV) Takip Sistemi (Takım 1)', 1, '[{"name":"Yiğit Polat","order":1},{"name":"Tolga Erim","order":2},{"name":"Tuğçe Can","order":3},{"name":"Selin Akay","order":4}]', 'Prof. Sinem Uslu', 'TEKNOFEST') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('c23aa93d-d7c4-4b82-aee5-2d857b47638c', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'Yüksek İrtifa Hibrit Roket Motoru (Takım 2)', 2, '[{"name":"Hakan Kurt","order":1},{"name":"Emre Baş","order":2},{"name":"Aslı Tezcan","order":3}]', 'Prof. İrem Demirci', 'TEKNOFEST') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('1b122688-dc8e-467d-aa9d-16a7c8dbd1a8', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'Otonom Sualtı Aracı (AUV) Görüntüleme (Takım 3)', 3, '[{"name":"Beren Yücel","order":1},{"name":"Ozan Çelebi","order":2},{"name":"Umut Şahin","order":3},{"name":"Aslı Tezcan","order":4}]', 'Prof. Berk Gündüz', 'TEKNOFEST') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('c900eb14-5b94-461b-ac3d-f2a9075269b6', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'VTOL Sabit Kanatlı Kargo Dronu (Takım 4)', 4, '[{"name":"Ezgi Doruk","order":1},{"name":"Aslı Tezcan","order":2},{"name":"Sinan Koç","order":3}]', 'Prof. Caner Turgut', 'TEKNOFEST') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('ba5787ab-8196-4453-afd3-2e47c5185fb8', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'Radar Dalga Sönümleyici Gövde Boyası (Takım 5)', 5, '[{"name":"Burak Aslan","order":1},{"name":"Ezgi Doruk","order":2},{"name":"Alperen Turan","order":3}]', 'Prof. Ozan Çelebi', 'TEKNOFEST') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('b6718b6b-02a8-444b-a8ec-ff82aad1b946', '308d2708-dbea-41b6-a1c8-da6129445759', 'Otonom Sürü İHA (UAV) Takip Sistemi (Takım 1)', 1, '[{"name":"Ozan Çelebi","order":1},{"name":"Zeynep Gül","order":2},{"name":"Umut Şahin","order":3}]', 'Prof. Umut Şahin', 'TEKNOFEST') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('75baa7d0-6001-4420-a744-5b46e6483201', '308d2708-dbea-41b6-a1c8-da6129445759', 'Yüksek İrtifa Hibrit Roket Motoru (Takım 2)', 2, '[{"name":"Gizem Aksoy","order":1},{"name":"Rüya Işık","order":2},{"name":"Baran Tekin","order":3},{"name":"Selin Akay","order":4}]', 'Prof. Zeynep Gül', 'TEKNOFEST') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('35607ef7-b333-4b5b-aa1a-e7ebd1a57d32', '308d2708-dbea-41b6-a1c8-da6129445759', 'Otonom Sualtı Aracı (AUV) Görüntüleme (Takım 3)', 3, '[{"name":"Ceyda Vural","order":1},{"name":"Damla Kılıç","order":2},{"name":"Kübra Şen","order":3}]', 'Prof. Korhan Alkan', 'TEKNOFEST') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('accfb911-acf9-481e-a167-d4ba6eaa9aaa', '308d2708-dbea-41b6-a1c8-da6129445759', 'VTOL Sabit Kanatlı Kargo Dronu (Takım 4)', 4, '[{"name":"Ezgi Doruk","order":1},{"name":"Arda Keçeci","order":2},{"name":"Ozan Çelebi","order":3},{"name":"Zeynep Gül","order":4}]', 'Prof. Deniz Ünal', 'TEKNOFEST') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('4edc653f-c0e7-4217-aca1-1c827f8204aa', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'Otonom Sürü İHA (UAV) Takip Sistemi (Takım 1)', 1, '[{"name":"Tolga Erim","order":1},{"name":"Yiğit Polat","order":2},{"name":"Emre Baş","order":3}]', 'Prof. Ezgi Doruk', 'TEKNOFEST') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('fd4bc2a1-e69b-4bf2-aab4-5f2da12927de', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'Yüksek İrtifa Hibrit Roket Motoru (Takım 2)', 2, '[{"name":"Kaan Avcı","order":1},{"name":"Umut Şahin","order":2},{"name":"Ozan Çelebi","order":3},{"name":"Burak Aslan","order":4}]', 'Prof. Tuğçe Can', 'TEKNOFEST') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('649be1eb-a461-4e57-a8b9-29849257408f', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'Otonom Sualtı Aracı (AUV) Görüntüleme (Takım 3)', 3, '[{"name":"İrem Demirci","order":1},{"name":"Burak Aslan","order":2},{"name":"Yiğit Polat","order":3}]', 'Prof. Emre Baş', 'TEKNOFEST') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('f4f0ede3-01c4-46a1-a477-acd42790683e', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'Yapay Zeka Destekli Erken Yangın Tespiti', 1, '[{"name":"Tolga Erim","order":1},{"name":"İrem Demirci","order":2},{"name":"Beren Yücel","order":3}]', 'Prof. Arda Keçeci', 'TUBITAK-2204A') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('f5c97d0e-9bca-4e0b-a17d-a75193ef0082', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'Ağır Metallerin Tarımsal Atıklarla Filtrelenmesi', 2, '[{"name":"Ceyda Vural","order":1},{"name":"Tolga Erim","order":2},{"name":"Eren Güler","order":3},{"name":"Mert Çakır","order":4}]', 'Prof. Umut Şahin', 'TUBITAK-2204A') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('836703c7-94e5-4e9c-a1f4-c9aeca526cd1', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'Giyilebilir Duruş Bozukluğu Uyarı Sensörü', 3, '[{"name":"Ceren Erdoğan","order":1},{"name":"Caner Turgut","order":2},{"name":"Gizem Aksoy","order":3},{"name":"Korhan Alkan","order":4}]', 'Prof. Rüya Işık', 'TUBITAK-2204A') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('202b2597-5a44-4ae0-a6a5-4834870f87d0', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'Mikroalgler ile Karbon Yakalama Sistemi', 4, '[{"name":"Deniz Ünal","order":1},{"name":"Melis Kavak","order":2},{"name":"Elif Yılmaz","order":3},{"name":"Burak Aslan","order":4}]', 'Prof. Zeynep Gül', 'TUBITAK-2204A') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('a426a611-7b78-434d-a881-aa71b5849acb', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'Yapay Zeka Destekli Erken Yangın Tespiti', 1, '[{"name":"Kübra Şen","order":1},{"name":"Baran Tekin","order":2},{"name":"Hakan Kurt","order":3}]', 'Prof. Caner Turgut', 'TUBITAK-2204A') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('399c8138-c254-4cc4-a305-be9db396f5be', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'Ağır Metallerin Tarımsal Atıklarla Filtrelenmesi', 2, '[{"name":"Kaan Avcı","order":1},{"name":"Ceren Erdoğan","order":2},{"name":"Hakan Kurt","order":3}]', 'Prof. Hakan Kurt', 'TUBITAK-2204A') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('f70484ca-9482-441b-a0f1-a51bd61a5693', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'Giyilebilir Duruş Bozukluğu Uyarı Sensörü', 3, '[{"name":"Mert Çakır","order":1},{"name":"Esra Kaya","order":2},{"name":"Rüya Işık","order":3}]', 'Prof. Damla Kılıç', 'TUBITAK-2204A') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('bd7220da-b4dd-4ddc-acbc-cac1d9491475', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'Yapay Zeka Destekli Erken Yangın Tespiti', 1, '[{"name":"Tolga Erim","order":1},{"name":"Ceyda Vural","order":2},{"name":"Kerem Arıcan","order":3}]', 'Prof. İrem Demirci', 'TUBITAK-2204A') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('f5a78224-c079-428b-a9be-b4ab0c8d0f38', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'Ağır Metallerin Tarımsal Atıklarla Filtrelenmesi', 2, '[{"name":"İrem Demirci","order":1},{"name":"Emre Baş","order":2},{"name":"Damla Kılıç","order":3},{"name":"Selin Akay","order":4}]', 'Prof. Emre Baş', 'TUBITAK-2204A') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('7c08441a-9b1c-43b1-ab4b-a6d204c8f90d', '6c44b363-4522-4cad-a251-06484b72b164', 'Phased Array Antenna for mmWave 5G (Team A)', 1, '[{"name":"Logan Bailey","order":1},{"name":"Sophie Clarke","order":2},{"name":"Avery James","order":3},{"name":"Wyatt Watson","order":4}]', 'Prof. Isaac Perez', 'IEEE-APSSDC') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('ca11e01d-82af-4055-aa03-4640780aa91b', '6c44b363-4522-4cad-a251-06484b72b164', 'Wearable RFID Tag Antenna for Healthcare (Team B)', 2, '[{"name":"Clara Dawson","order":1},{"name":"Elias Boyd","order":2},{"name":"Logan Bailey","order":3},{"name":"Nolan Davies","order":4}]', 'Prof. Ethan Ward', 'IEEE-APSSDC') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('f587f2b0-2c8e-40bc-ac05-182f1d07cf58', '6c44b363-4522-4cad-a251-06484b72b164', 'Dual-Band Microstrip Patch Antenna (Team C)', 3, '[{"name":"Chloe Ward","order":1},{"name":"Julian Hayes","order":2},{"name":"Lily Cooper","order":3},{"name":"Connor Ross","order":4}]', 'Prof. Owen Gray', 'IEEE-APSSDC') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('32f1ec66-89dc-49f5-a867-7ec816ff6d07', '6c44b363-4522-4cad-a251-06484b72b164', 'Metamaterial-based Radar Cross Section Reduction (Team D)', 4, '[{"name":"Ruby Murphy","order":1},{"name":"Elias Boyd","order":2},{"name":"Cole Harrison","order":3},{"name":"Mason Bell","order":4}]', 'Prof. Aria Sanders', 'IEEE-APSSDC') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('558f6b14-f11f-4dc3-ad37-c9041ad4e145', '318124ea-8614-4355-ad48-2486524dfc13', 'Phased Array Antenna for mmWave 5G (Team A)', 1, '[{"name":"Tessa Rowan","order":1},{"name":"Leo Gallagher","order":2},{"name":"Connor Ross","order":3},{"name":"Scarlett Wood","order":4}]', 'Prof. Logan Bailey', 'IEEE-APSSDC') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('e970c78e-aaff-43ef-a236-77caf54b07ce', '318124ea-8614-4355-ad48-2486524dfc13', 'Wearable RFID Tag Antenna for Healthcare (Team B)', 2, '[{"name":"Sophie Clarke","order":1},{"name":"Mia Howard","order":2},{"name":"Avery James","order":3}]', 'Prof. Ella Brooks', 'IEEE-APSSDC') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('9c450cf6-cae4-4390-a3ed-12f231962d02', '318124ea-8614-4355-ad48-2486524dfc13', 'Dual-Band Microstrip Patch Antenna (Team C)', 3, '[{"name":"Wyatt Watson","order":1},{"name":"Tessa Rowan","order":2},{"name":"Hazel Foster","order":3}]', 'Prof. Nolan Davies', 'IEEE-APSSDC') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('55964658-c936-45e8-ae7c-bccdb9dcfb20', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', 'Phased Array Antenna for mmWave 5G (Team A)', 1, '[{"name":"Lily Cooper","order":1},{"name":"Mia Howard","order":2},{"name":"Grace Kelly","order":3}]', 'Prof. Sophie Clarke', 'IEEE-APSSDC') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('bc3fe67d-937f-4744-ae90-a19293fc5d5c', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', 'Wearable RFID Tag Antenna for Healthcare (Team B)', 2, '[{"name":"Ryan Price","order":1},{"name":"Julian Hayes","order":2},{"name":"Aurora Price","order":3}]', 'Prof. Julian Hayes', 'IEEE-APSSDC') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('7409c3d5-b62b-487e-aa60-8be8b736f7d9', '47979751-163d-48b3-ae56-a65586d18f1b', 'Autogyro Payload Recovery System - Entry 1', 1, '[{"name":"Elias Boyd","order":1},{"name":"Isaac Perez","order":2},{"name":"Tessa Rowan","order":3}]', 'Prof. Aurora Price', 'CANSAT-2025') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('d812e821-9cf5-4042-ae7b-7b45b9a7b922', '47979751-163d-48b3-ae56-a65586d18f1b', 'Telemetry and Ground Station Integration - Entry 2', 2, '[{"name":"Elias Boyd","order":1},{"name":"Mason Bell","order":2},{"name":"Ryan Price","order":3},{"name":"Ruby Murphy","order":4}]', 'Prof. Hazel Foster', 'CANSAT-2025') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('e3603c93-8069-4824-afa0-10fe733475e3', '47979751-163d-48b3-ae56-a65586d18f1b', 'Atmospheric Sensor Suite Deployment - Entry 3', 3, '[{"name":"Sophie Clarke","order":1},{"name":"Nolan Davies","order":2},{"name":"Hazel Foster","order":3}]', 'Prof. Mia Howard', 'CANSAT-2025') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('851c3941-dfa8-4feb-ae26-c58965626732', '47979751-163d-48b3-ae56-a65586d18f1b', 'Deployable Heat Shield for Reentry Demo - Entry 4', 4, '[{"name":"Lily Cooper","order":1},{"name":"Ethan Ward","order":2},{"name":"Hazel Foster","order":3},{"name":"Ruby Murphy","order":4}]', 'Prof. Lucy Brooks', 'CANSAT-2025') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('bfe219aa-e626-4093-acb4-0a8d92229438', '10abd4e8-0cb9-4853-a17c-ac40da311bff', 'Autogyro Payload Recovery System - Entry 1', 1, '[{"name":"Aurora Price","order":1},{"name":"Lucy Brooks","order":2},{"name":"Ruby Murphy","order":3}]', 'Prof. Owen Gray', 'CANSAT-2025') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('667b7df9-720b-44ea-a5c0-47ee35ca31b7', '10abd4e8-0cb9-4853-a17c-ac40da311bff', 'Telemetry and Ground Station Integration - Entry 2', 2, '[{"name":"Cole Harrison","order":1},{"name":"Chloe Ward","order":2},{"name":"Maya Jenkins","order":3}]', 'Prof. Lucas Sullivan', 'CANSAT-2025') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('77459bde-2dda-4848-a5c5-22decb273d5e', '10abd4e8-0cb9-4853-a17c-ac40da311bff', 'Atmospheric Sensor Suite Deployment - Entry 3', 3, '[{"name":"Maya Jenkins","order":1},{"name":"Stella Myers","order":2},{"name":"Sophie Clarke","order":3}]', 'Prof. Caleb Richardson', 'CANSAT-2025') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('8b01cc7c-13ab-422f-adc9-8a0a796c8dc4', '9f49cd18-d850-4b1e-ae53-c08253910f4e', 'Autogyro Payload Recovery System - Entry 1', 1, '[{"name":"Mason Bell","order":1},{"name":"Jack Kelly","order":2},{"name":"Ethan Ward","order":3}]', 'Prof. Dylan Reed', 'CANSAT-2025') ON CONFLICT DO NOTHING;
INSERT INTO projects (id, period_id, title, project_no, members, advisor_name, advisor_affiliation) VALUES ('15713af0-a06b-43ac-a10b-867a682f2409', '9f49cd18-d850-4b1e-ae53-c08253910f4e', 'Telemetry and Ground Station Integration - Entry 2', 2, '[{"name":"Stella Myers","order":1},{"name":"Mia Howard","order":2},{"name":"Connor Ross","order":3},{"name":"Chloe Ward","order":4}]', 'Prof. Eva Harding', 'CANSAT-2025') ON CONFLICT DO NOTHING;

-- Jurors and Auth
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('aaa0da50-6432-47e0-ab48-b01ca823ef19', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'Prof. Cihan Akpınar', 'Sabanci University, EE', '#F59E0B') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('9a21397b-552a-4b00-a5c4-15a0982436b1', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'Dr. Aslıhan Koçak', 'Ohio State University, ECE', '#3B82F6') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('7d1bbec7-493f-4e1a-aee5-be30df51db49', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'Prof. Ferit Atasoy', 'METU, EE', '#8B5CF6') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'Dr. Pınar Dalkılıç', 'Istanbul Technical University, CS', '#EC4899') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'Engin Boztepe', 'Aselsan, RF Systems Division', '#10B981') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('56948fec-ce3d-493b-afc4-4e281e9b8f58', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'Dr. Serap Gündoğdu', 'TUBITAK BILGEM', '#EF4444') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('ff458a22-0a8c-4701-a835-da94b83a3b0f', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'Prof. Orhan Sezgin', 'Bilkent University, EE', '#6366F1') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'Yasin Erimbaş', 'Turk Telekom, R&D Center', '#14B8A6') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('72184d7d-905d-4a13-a136-8ff90c2cc349', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'Dr. Nihan Ersoy', 'Istanbul Technical University, EE', '#F97316') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('d061174f-dbec-4d68-a56d-ce41cdc205a6', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', 'Dr. Alper Kılıç', 'Hacettepe University, EE', '#A855F7') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('47dcf645-bcf8-407e-a86e-f0e506495726', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'Dr. Thomas Albright', 'CMU', '#F59E0B') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('44e14170-d567-4ad4-a771-cd269d538a2f', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'Prof. Simon Caldwell', 'CMU', '#3B82F6') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('c8a52987-c3a6-4368-a31c-a2f6566399f1', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'Nina Prescott', 'CMU', '#8B5CF6') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'Wesley Dalton', 'CMU', '#EC4899') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('405cb976-b946-4594-a572-1bdaaa5fd5c3', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'Dr. Sofia Lang', 'CMU', '#10B981') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('4880a479-e7ba-47bd-a66d-7b889755d7c0', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'Victor Sutton', 'CMU', '#EF4444') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'b94595d6-710c-4302-ad1b-11f4d216e028', 'Fiona Mercer', 'CMU', '#6366F1') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('cec22180-51e9-4924-a2d0-6bca4aeb0028', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', 'Kemal Aksoy', 'Industry', '#F59E0B') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('27eea0b5-10e7-42eb-a739-4082ace54aa0', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', 'Eda Kılıç', 'Industry', '#3B82F6') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('618aec67-dbed-41bf-ac48-c600f70c9fa5', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', 'Onur Yalın', 'Industry', '#8B5CF6') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('8a98e32c-a076-407a-a0c5-18badfbd546d', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', 'Buse Kar', 'Industry', '#EC4899') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('e4550b83-b849-4977-a7b0-dc011fad64f5', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', 'Cemil Demir', 'Industry', '#10B981') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', 'Aylin Çelik', 'Industry', '#EF4444') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('a49b6b5e-f40d-48f6-a398-87b85bbff743', '088f5054-c9df-4c7f-a679-c1321524f250', 'Dr. Kemal Aksoy', 'Univ', '#F59E0B') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('9ff6ca95-c216-42cd-a63f-1e58b1756cf2', '088f5054-c9df-4c7f-a679-c1321524f250', 'Dr. Eda Kılıç', 'Univ', '#3B82F6') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('9d55d273-9fd8-4365-a294-404246566892', '088f5054-c9df-4c7f-a679-c1321524f250', 'Dr. Onur Yalın', 'Univ', '#8B5CF6') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('3b0ea27c-c7a3-414a-ab47-db50db3ab838', '088f5054-c9df-4c7f-a679-c1321524f250', 'Dr. Buse Kar', 'Univ', '#EC4899') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('15c5c11f-a19f-48f7-aa39-92872d8a1a00', '088f5054-c9df-4c7f-a679-c1321524f250', 'Dr. Cemil Demir', 'Univ', '#10B981') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('f106ca15-dc12-414f-ac41-0b361db08f95', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', 'Oliver Grant (Reviewer)', 'External', '#F59E0B') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', 'Eleanor Cole (Reviewer)', 'External', '#3B82F6') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('79ef4764-8e84-4a18-ad48-dbd780a5a027', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', 'Sebastian Reed (Reviewer)', 'External', '#8B5CF6') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('a206da8b-457b-4842-ae74-911fb4193bfe', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', 'Stella Brooks (Reviewer)', 'External', '#EC4899') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('74499a66-86e7-4d92-ade1-70ba9b770ef0', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', 'Oliver Grant (Reviewer)', 'External', '#F59E0B') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('4f32d322-afb7-4042-a9d1-ce0c17a09a30', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', 'Eleanor Cole (Reviewer)', 'External', '#3B82F6') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('a71bad63-0a65-47a2-a5a5-623ab35c9ba7', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', 'Sebastian Reed (Reviewer)', 'External', '#8B5CF6') ON CONFLICT DO NOTHING;
INSERT INTO jurors (id, organization_id, juror_name, affiliation, avatar_color) VALUES ('25380419-e8ec-4bae-a9e7-eeded88bba8b', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', 'Stella Brooks (Reviewer)', 'External', '#EC4899') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('aaa0da50-6432-47e0-ab48-b01ca823ef19', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2026-05-10 12:00:00' - interval '2 hours') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('9a21397b-552a-4b00-a5c4-15a0982436b1', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('7d1bbec7-493f-4e1a-aee5-be30df51db49', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at, edit_enabled, edit_reason, edit_expires_at) VALUES ('52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2026-05-10 12:00:00' - interval '5 hours', true, 'Late submission due to connectivity issue', timestamp '2026-05-10 12:00:00' + interval '24 hours') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('56948fec-ce3d-493b-afc4-4e281e9b8f58', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('ff458a22-0a8c-4701-a835-da94b83a3b0f', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at, failed_attempts, locked_until, locked_at) VALUES ('72184d7d-905d-4a13-a136-8ff90c2cc349', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2026-05-10 12:00:00' - interval '3 hours', 3, timestamp '2026-05-10 12:00:00' + interval '10 mins', timestamp '2026-05-10 12:00:00' - interval '5 mins') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at, is_blocked) VALUES ('d061174f-dbec-4d68-a56d-ce41cdc205a6', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2026-05-10 12:00:00' - interval '5 hours', true) ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('aaa0da50-6432-47e0-ab48-b01ca823ef19', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2025-09-01' + interval '10 days') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('9a21397b-552a-4b00-a5c4-15a0982436b1', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('aaa0da50-6432-47e0-ab48-b01ca823ef19', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2025-02-01' + interval '10 days') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('47dcf645-bcf8-407e-a86e-f0e506495726', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2026-05-10 12:00:00' - interval '3 hours') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('44e14170-d567-4ad4-a771-cd269d538a2f', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('c8a52987-c3a6-4368-a31c-a2f6566399f1', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at, edit_enabled, edit_reason, edit_expires_at) VALUES ('405cb976-b946-4594-a572-1bdaaa5fd5c3', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2026-05-10 12:00:00' - interval '3 hours', true, 'Late submission due to connectivity issue', timestamp '2026-05-10 12:00:00' + interval '24 hours') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('4880a479-e7ba-47bd-a66d-7b889755d7c0', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2026-05-10 12:00:00' - interval '2 hours') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('47dcf645-bcf8-407e-a86e-f0e506495726', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2025-09-01' + interval '10 days') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('44e14170-d567-4ad4-a771-cd269d538a2f', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('47dcf645-bcf8-407e-a86e-f0e506495726', '0e963024-a53f-4722-a9e0-5db7a47b4419', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2025-02-01' + interval '10 days') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('cec22180-51e9-4924-a2d0-6bca4aeb0028', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2026-05-10 12:00:00' - interval '3 hours') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('27eea0b5-10e7-42eb-a739-4082ace54aa0', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('618aec67-dbed-41bf-ac48-c600f70c9fa5', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('8a98e32c-a076-407a-a0c5-18badfbd546d', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at, edit_enabled, edit_reason, edit_expires_at) VALUES ('e4550b83-b849-4977-a7b0-dc011fad64f5', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2026-05-10 12:00:00' - interval '4 hours', true, 'Late submission due to connectivity issue', timestamp '2026-05-10 12:00:00' + interval '24 hours') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2026-05-10 12:00:00' - interval '3 hours') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('cec22180-51e9-4924-a2d0-6bca4aeb0028', '308d2708-dbea-41b6-a1c8-da6129445759', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2025-06-01' + interval '10 days') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('27eea0b5-10e7-42eb-a739-4082ace54aa0', '308d2708-dbea-41b6-a1c8-da6129445759', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('cec22180-51e9-4924-a2d0-6bca4aeb0028', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2024-06-01' + interval '10 days') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('a49b6b5e-f40d-48f6-a398-87b85bbff743', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2026-05-10 12:00:00' - interval '5 hours') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('9ff6ca95-c216-42cd-a63f-1e58b1756cf2', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('9d55d273-9fd8-4365-a294-404246566892', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('3b0ea27c-c7a3-414a-ab47-db50db3ab838', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at, edit_enabled, edit_reason, edit_expires_at) VALUES ('15c5c11f-a19f-48f7-aa39-92872d8a1a00', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2026-05-10 12:00:00' - interval '2 hours', true, 'Late submission due to connectivity issue', timestamp '2026-05-10 12:00:00' + interval '24 hours') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('a49b6b5e-f40d-48f6-a398-87b85bbff743', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2025-06-01' + interval '10 days') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('9ff6ca95-c216-42cd-a63f-1e58b1756cf2', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('a49b6b5e-f40d-48f6-a398-87b85bbff743', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2024-06-01' + interval '10 days') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('f106ca15-dc12-414f-ac41-0b361db08f95', '6c44b363-4522-4cad-a251-06484b72b164', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2026-05-10 12:00:00' - interval '3 hours') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', '6c44b363-4522-4cad-a251-06484b72b164', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('79ef4764-8e84-4a18-ad48-dbd780a5a027', '6c44b363-4522-4cad-a251-06484b72b164', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('a206da8b-457b-4842-ae74-911fb4193bfe', '6c44b363-4522-4cad-a251-06484b72b164', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('f106ca15-dc12-414f-ac41-0b361db08f95', '318124ea-8614-4355-ad48-2486524dfc13', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2025-06-01' + interval '10 days') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', '318124ea-8614-4355-ad48-2486524dfc13', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('f106ca15-dc12-414f-ac41-0b361db08f95', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2024-06-01' + interval '10 days') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('74499a66-86e7-4d92-ade1-70ba9b770ef0', '47979751-163d-48b3-ae56-a65586d18f1b', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2026-05-10 12:00:00' - interval '3 hours') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('4f32d322-afb7-4042-a9d1-ce0c17a09a30', '47979751-163d-48b3-ae56-a65586d18f1b', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('a71bad63-0a65-47a2-a5a5-623ab35c9ba7', '47979751-163d-48b3-ae56-a65586d18f1b', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('25380419-e8ec-4bae-a9e7-eeded88bba8b', '47979751-163d-48b3-ae56-a65586d18f1b', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('74499a66-86e7-4d92-ade1-70ba9b770ef0', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2025-06-01' + interval '10 days') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash) VALUES ('4f32d322-afb7-4042-a9d1-ce0c17a09a30', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe') ON CONFLICT DO NOTHING;
INSERT INTO juror_period_auth (juror_id, period_id, pin_hash, final_submitted_at) VALUES ('74499a66-86e7-4d92-ade1-70ba9b770ef0', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '$2a$06$D1E3X/QGg9sM4W0.A3vQG.n9v6p0y5NlKJ/K6W9fHq7.HkH9n.AWe', timestamp '2024-06-01' + interval '10 days') ON CONFLICT DO NOTHING;

-- Scoring

BEGIN;


    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('515b34ef-6dab-4a37-af02-37fb06b53a5d', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '93fcb76b-9827-4720-a1a8-9d65fdbc3055', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', 'Outstanding work across all criteria. One of the strongest presentations of the day.', timestamp '2026-05-10 12:00:00' - interval '11 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '11 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('972645ac-4427-4cad-a30e-7f37236bacf5', '515b34ef-6dab-4a37-af02-37fb06b53a5d', '787e905a-a2da-431e-af63-00cea2ea7bb5', 28) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('25b39550-acc5-40c3-a639-1055e6454abf', '515b34ef-6dab-4a37-af02-37fb06b53a5d', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('17b0fa0d-b45b-4844-a3fb-ecc1a5a4e93c', '515b34ef-6dab-4a37-af02-37fb06b53a5d', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('de376d79-db84-402f-a6a8-387708bf98de', '515b34ef-6dab-4a37-af02-37fb06b53a5d', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('a1604130-69aa-4f24-a470-93ed1e55d615', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '46123b99-4f0a-4d61-a870-6ef0f78e371f', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', 'Solid engineering. The team handled the Q&A confidently.', timestamp '2026-05-10 12:00:00' - interval '32 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '32 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('354ab733-aa6e-4d8b-a2cc-14498c8dfef1', 'a1604130-69aa-4f24-a470-93ed1e55d615', '787e905a-a2da-431e-af63-00cea2ea7bb5', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('dfc5ae8a-66d6-406f-a05e-6a07223339f3', 'a1604130-69aa-4f24-a470-93ed1e55d615', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6c4c4114-c971-4488-ac2a-f11a47f03f6b', 'a1604130-69aa-4f24-a470-93ed1e55d615', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d6952404-1cb3-4cda-a82b-6d5062667f03', 'a1604130-69aa-4f24-a470-93ed1e55d615', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('1aa21030-08f2-4950-aeac-f92a7272ae9b', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '733f9e70-8f7b-47dc-ad72-a604c760696f', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', 'Creative approach. Some criteria were handled much better than others.', timestamp '2026-05-10 12:00:00' - interval '17 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '17 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('bf1b3432-ad67-4b28-aeaa-54b4e226f7d0', '1aa21030-08f2-4950-aeac-f92a7272ae9b', '787e905a-a2da-431e-af63-00cea2ea7bb5', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7cde4ea1-cfff-40ec-af49-c75a7acc1575', '1aa21030-08f2-4950-aeac-f92a7272ae9b', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0f5b534e-1f30-4827-ad06-92f6a6d26aac', '1aa21030-08f2-4950-aeac-f92a7272ae9b', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7a1acfdd-7420-4cda-a1f8-fbfa834100a9', '1aa21030-08f2-4950-aeac-f92a7272ae9b', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('254a02f4-c83c-4943-a3a1-270ce85e35e6', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '339948a9-b977-4c51-a1bd-c3dab5e32936', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', 'Technically impressive, but the oral presentation needs improvement.', timestamp '2026-05-10 12:00:00' - interval '22 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '22 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('65d65534-adb8-4f6a-aa8e-53b51798b291', '254a02f4-c83c-4943-a3a1-270ce85e35e6', '787e905a-a2da-431e-af63-00cea2ea7bb5', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('21b22cdf-cfca-42c8-a3fa-87ffaf04ee7a', '254a02f4-c83c-4943-a3a1-270ce85e35e6', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('de2e5349-f804-4adc-ac20-63b5bb7146ab', '254a02f4-c83c-4943-a3a1-270ce85e35e6', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('287e163f-53bf-49c4-a6f7-9f97029b2f2f', '254a02f4-c83c-4943-a3a1-270ce85e35e6', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('1cb69f12-c61c-42f5-a450-bb7129600c12', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '2c01817f-5c28-4899-ab4b-fb741b5f8f9b', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', 'Adequate work overall.', timestamp '2026-05-10 12:00:00' - interval '44 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '44 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('cdb72035-e60f-4253-a98f-c32c49c1db32', '1cb69f12-c61c-42f5-a450-bb7129600c12', '787e905a-a2da-431e-af63-00cea2ea7bb5', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('26003c68-8c86-4f89-a02f-28113a9ea768', '1cb69f12-c61c-42f5-a450-bb7129600c12', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('da6b8e09-f698-47dd-a5ea-4da0792b064d', '1cb69f12-c61c-42f5-a450-bb7129600c12', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('acefd0bc-d1cc-4670-a35d-41db6de24271', '1cb69f12-c61c-42f5-a450-bb7129600c12', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 6) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('9fc288a8-0c39-468f-a8e0-5615de446af8', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'bdb8459f-49ce-405e-af0f-d35e36fcdcf2', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', 'Some promising ideas but both execution and presentation need work.', timestamp '2026-05-10 12:00:00' - interval '35 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '35 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('09b63e84-8bb0-4f98-a0af-c41f9c43a908', '9fc288a8-0c39-468f-a8e0-5615de446af8', '787e905a-a2da-431e-af63-00cea2ea7bb5', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('23228c77-7baa-4d6f-aad9-d378f645ce58', '9fc288a8-0c39-468f-a8e0-5615de446af8', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('42f6ee91-ddd3-452c-a021-6ce921b61b93', '9fc288a8-0c39-468f-a8e0-5615de446af8', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9f4a3863-ae5e-4916-a960-916396543c5e', '9fc288a8-0c39-468f-a8e0-5615de446af8', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 6) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('b6543d5c-85ec-4be9-a5a3-1dbb2db677a4', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '1449ba13-0409-4bd3-abc9-ddf7040c5b76', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', 'Excellent presentation skills. The system itself has room for improvement.', timestamp '2026-05-10 12:00:00' - interval '18 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '18 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('3f980aa7-de1e-4a8c-a116-1bf0f0c9d6ae', 'b6543d5c-85ec-4be9-a5a3-1dbb2db677a4', '787e905a-a2da-431e-af63-00cea2ea7bb5', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e5ba3f97-6d83-4ae5-a40b-4cb87945770c', 'b6543d5c-85ec-4be9-a5a3-1dbb2db677a4', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ad8c62fc-393d-4474-af65-b978f0be956f', 'b6543d5c-85ec-4be9-a5a3-1dbb2db677a4', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9464dcd5-117c-45cd-a217-1070dc4c13d9', 'b6543d5c-85ec-4be9-a5a3-1dbb2db677a4', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('c2d2bc50-d804-4c1c-afbe-457f395fe1be', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '9faaa31c-cdf6-4678-a123-2bfe194ce989', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '8 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '8 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('95d14eb6-07f3-4d1d-abc8-1e1c4ba671e5', 'c2d2bc50-d804-4c1c-afbe-457f395fe1be', '787e905a-a2da-431e-af63-00cea2ea7bb5', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('88648d3a-5f03-4241-adcd-574b406c932f', 'c2d2bc50-d804-4c1c-afbe-457f395fe1be', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('019e49b7-512e-4e8e-a204-f63ec356dddd', 'c2d2bc50-d804-4c1c-afbe-457f395fe1be', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('8c5dfed8-29f8-4fe1-a8da-113c99470eda', 'c2d2bc50-d804-4c1c-afbe-457f395fe1be', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('645d55f6-7a2c-4fd4-ae1e-b8b34a84eb58', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '023ddedd-e060-4194-a7c5-8d3d27e6c3f6', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', 'Reasonable effort. Some areas need more polish.', timestamp '2026-05-10 12:00:00' - interval '13 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '13 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('5485349e-e37e-4d1c-a811-6270d0c2e012', '645d55f6-7a2c-4fd4-ae1e-b8b34a84eb58', '787e905a-a2da-431e-af63-00cea2ea7bb5', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('201d37f8-ce48-49ed-ac8e-2b9aa13470c5', '645d55f6-7a2c-4fd4-ae1e-b8b34a84eb58', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('18ab0ddf-0253-446b-ae18-4a0495032502', '645d55f6-7a2c-4fd4-ae1e-b8b34a84eb58', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4ba1ca11-e584-4183-a3e5-b642430edcd3', '645d55f6-7a2c-4fd4-ae1e-b8b34a84eb58', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('ff8a1c3a-adb9-45ea-acf1-1a6e01a26c80', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '8fb336c1-ae87-45fc-a587-53fb3052016f', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '35 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '35 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d2db69ef-9518-4474-ac28-1f43d863b9c5', 'ff8a1c3a-adb9-45ea-acf1-1a6e01a26c80', '787e905a-a2da-431e-af63-00cea2ea7bb5', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a408dfb8-b164-47a4-a90b-25f455d117fe', 'ff8a1c3a-adb9-45ea-acf1-1a6e01a26c80', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ae969017-9f8c-435d-a946-63f1fa9ae92d', 'ff8a1c3a-adb9-45ea-acf1-1a6e01a26c80', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1855ceeb-368f-4535-ad41-a88fee5ff038', 'ff8a1c3a-adb9-45ea-acf1-1a6e01a26c80', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('8df8ceb7-8d17-4368-ac61-d7bc53ae4ae2', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '93fcb76b-9827-4720-a1a8-9d65fdbc3055', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '6 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '6 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6b44fc54-9082-4c84-af44-449504c80391', '8df8ceb7-8d17-4368-ac61-d7bc53ae4ae2', '787e905a-a2da-431e-af63-00cea2ea7bb5', 29) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0cb51c3e-22fd-4269-aa20-02acc585359b', '8df8ceb7-8d17-4368-ac61-d7bc53ae4ae2', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('40a6f365-7d14-4562-a31d-43722b400310', '8df8ceb7-8d17-4368-ac61-d7bc53ae4ae2', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 28) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f0948851-8492-4d6b-a90b-548eb9bf60d4', '8df8ceb7-8d17-4368-ac61-d7bc53ae4ae2', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('0768bc5c-9525-4add-a4d6-173fdb8e99dc', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '46123b99-4f0a-4d61-a870-6ef0f78e371f', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', 'Good solid work. A few rough edges but a strong submission overall.', timestamp '2026-05-10 12:00:00' - interval '3 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '3 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c2e27765-6d8a-42f0-a09a-4cc83847fdc5', '0768bc5c-9525-4add-a4d6-173fdb8e99dc', '787e905a-a2da-431e-af63-00cea2ea7bb5', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('5823e385-82e1-484d-a5c4-ab3c21aff865', '0768bc5c-9525-4add-a4d6-173fdb8e99dc', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('06fe7cf7-2d22-401d-a935-cbcbb1d0c5f0', '0768bc5c-9525-4add-a4d6-173fdb8e99dc', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('723e1209-3f28-483c-a1d3-a9ce119aeda1', '0768bc5c-9525-4add-a4d6-173fdb8e99dc', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('22999a66-1989-4c6a-a1ef-74e0a873326e', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '733f9e70-8f7b-47dc-ad72-a604c760696f', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', 'The concept is excellent — execution was uneven across team members.', timestamp '2026-05-10 12:00:00' - interval '38 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '38 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('8722e9a8-fcc8-4e72-a30f-1fbdcd5b677b', '22999a66-1989-4c6a-a1ef-74e0a873326e', '787e905a-a2da-431e-af63-00cea2ea7bb5', 26) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0ed87921-644d-4970-ab86-e71698f01787', '22999a66-1989-4c6a-a1ef-74e0a873326e', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('af3de217-11f8-40de-ac3f-bc25e660ef02', '22999a66-1989-4c6a-a1ef-74e0a873326e', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 29) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('93e3b158-70a0-4f06-abbd-6e8058bc00f4', '22999a66-1989-4c6a-a1ef-74e0a873326e', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 5) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('76b3e7c5-f3b1-42ca-add8-eefcd63be694', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '339948a9-b977-4c51-a1bd-c3dab5e32936', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', 'Solid system, but the team struggled to convey the significance of their work.', timestamp '2026-05-10 12:00:00' - interval '8 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '8 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1635d533-c597-4f98-aa0c-e06c36661e81', '76b3e7c5-f3b1-42ca-add8-eefcd63be694', '787e905a-a2da-431e-af63-00cea2ea7bb5', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('53aeeac6-f439-4b69-af60-5833286a12ad', '76b3e7c5-f3b1-42ca-add8-eefcd63be694', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('29f44a23-f588-41b1-a666-22f649adf5fb', '76b3e7c5-f3b1-42ca-add8-eefcd63be694', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('53acec54-4c5f-43f8-add7-a21e0136a3c5', '76b3e7c5-f3b1-42ca-add8-eefcd63be694', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('50352f0e-8273-4b1c-ad64-b823dd5b707b', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '2c01817f-5c28-4899-ab4b-fb741b5f8f9b', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', 'Adequate work overall.', timestamp '2026-05-10 12:00:00' - interval '43 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '43 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('25d29736-ad3f-44d2-a893-d320333eb2df', '50352f0e-8273-4b1c-ad64-b823dd5b707b', '787e905a-a2da-431e-af63-00cea2ea7bb5', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('adc39ee8-b927-419b-af38-832066912eeb', '50352f0e-8273-4b1c-ad64-b823dd5b707b', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0091f2f6-1361-49f7-a19d-41910449c6bb', '50352f0e-8273-4b1c-ad64-b823dd5b707b', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ad5fbaef-efb6-46fa-a10a-38b528d565f1', '50352f0e-8273-4b1c-ad64-b823dd5b707b', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('5f68d116-1809-4d25-ac65-88c4dd6733fb', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'bdb8459f-49ce-405e-af0f-d35e36fcdcf2', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'in_progress', NULL, timestamp '2026-05-10 12:00:00' - interval '28 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '28 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('df25b8e1-ecd1-4bdf-aac4-8c6e9d82b4af', '5f68d116-1809-4d25-ac65-88c4dd6733fb', '787e905a-a2da-431e-af63-00cea2ea7bb5', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9236519d-9fba-4f33-a0a9-9cc2f189f744', '5f68d116-1809-4d25-ac65-88c4dd6733fb', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 20) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('55ae1484-03ce-4102-a89c-61862f3fe7a2', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '93fcb76b-9827-4720-a1a8-9d65fdbc3055', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '8 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '8 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('5326c1fe-ea12-46a9-a0bc-5bb2cee94570', '55ae1484-03ce-4102-a89c-61862f3fe7a2', '787e905a-a2da-431e-af63-00cea2ea7bb5', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('cbda8f32-9d98-43c4-a84f-3bad1fdc9e9d', '55ae1484-03ce-4102-a89c-61862f3fe7a2', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 28) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('00eed6e6-2140-4bc1-a10f-c61cb0f83cde', '55ae1484-03ce-4102-a89c-61862f3fe7a2', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('34e9bbc0-c16f-43a6-ae20-541b8e4736ea', '55ae1484-03ce-4102-a89c-61862f3fe7a2', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('c49878b4-504c-421f-a423-c2eb88b0a229', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '46123b99-4f0a-4d61-a870-6ef0f78e371f', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '10 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '10 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('da104c39-bf88-47e0-ac0d-dbf300820430', 'c49878b4-504c-421f-a423-c2eb88b0a229', '787e905a-a2da-431e-af63-00cea2ea7bb5', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('10d7f969-c7c9-46eb-a112-c58d2f12f7ad', 'c49878b4-504c-421f-a423-c2eb88b0a229', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('44cc7795-94ba-4dd2-a8b2-af20ba34b529', 'c49878b4-504c-421f-a423-c2eb88b0a229', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('59a70a9d-eb1a-4388-aa6c-6a69dfebff4d', 'c49878b4-504c-421f-a423-c2eb88b0a229', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('6edbd506-296a-4b44-a99b-ad3eeb55ec9d', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '733f9e70-8f7b-47dc-ad72-a604c760696f', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '26 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '26 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('edcf181a-da6a-4b5f-a200-f2961d765f98', '6edbd506-296a-4b44-a99b-ad3eeb55ec9d', '787e905a-a2da-431e-af63-00cea2ea7bb5', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d8778b22-1da2-4d5f-a92b-e443d0f8d069', '6edbd506-296a-4b44-a99b-ad3eeb55ec9d', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d90de591-5660-4fff-a068-65e8c3361c28', '6edbd506-296a-4b44-a99b-ad3eeb55ec9d', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('513975c1-f7dc-48b8-aae5-9b62a5e1104f', '6edbd506-296a-4b44-a99b-ad3eeb55ec9d', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 5) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('829a4caf-c1e5-423e-a1ed-c692b3d1a6a9', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '339948a9-b977-4c51-a1bd-c3dab5e32936', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', 'The implementation is solid; the report and slides need more clarity.', timestamp '2026-05-10 12:00:00' - interval '22 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '22 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0d4521c4-de17-486e-aa48-a53f9c852865', '829a4caf-c1e5-423e-a1ed-c692b3d1a6a9', '787e905a-a2da-431e-af63-00cea2ea7bb5', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('376ee1bc-ced6-49f0-ab55-e481eadfa24c', '829a4caf-c1e5-423e-a1ed-c692b3d1a6a9', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c7a97550-12ee-4a1f-a3d6-5aa7a61cfb63', '829a4caf-c1e5-423e-a1ed-c692b3d1a6a9', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d7e3bd52-083d-45a6-a2c0-2206b5e9968c', '829a4caf-c1e5-423e-a1ed-c692b3d1a6a9', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('e70a145f-0e9d-43e5-a519-9dcbfcadc053', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '2c01817f-5c28-4899-ab4b-fb741b5f8f9b', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', 'The project addresses an interesting problem.', timestamp '2026-05-10 12:00:00' - interval '16 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '16 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4e935fee-8035-467e-a69c-5833c3ceb5f9', 'e70a145f-0e9d-43e5-a519-9dcbfcadc053', '787e905a-a2da-431e-af63-00cea2ea7bb5', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c6d80bba-e9ec-42ca-ab12-4525a16df620', 'e70a145f-0e9d-43e5-a519-9dcbfcadc053', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e904a173-c5ce-4be2-af16-327d67ca2418', 'e70a145f-0e9d-43e5-a519-9dcbfcadc053', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a92a3121-7e3f-4f5b-a776-60404770ab62', 'e70a145f-0e9d-43e5-a519-9dcbfcadc053', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('72bc14d8-5a5a-4b3b-a67d-1a8515eb27f1', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'bdb8459f-49ce-405e-af0f-d35e36fcdcf2', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '38 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '38 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d0c4b42f-28a1-45f1-ae8b-b691ed18ee70', '72bc14d8-5a5a-4b3b-a67d-1a8515eb27f1', '787e905a-a2da-431e-af63-00cea2ea7bb5', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('74b82b4f-ea18-4b26-aa39-bb9fcc76fd8c', '72bc14d8-5a5a-4b3b-a67d-1a8515eb27f1', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9e8d9188-288e-400d-a1fa-845d49d5e969', '72bc14d8-5a5a-4b3b-a67d-1a8515eb27f1', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6122db27-6b17-46c8-a8c7-17f6c83d25cd', '72bc14d8-5a5a-4b3b-a67d-1a8515eb27f1', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 5) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('40ec5fee-efe9-4d29-a869-b5334eadaf46', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '1449ba13-0409-4bd3-abc9-ddf7040c5b76', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', 'Well-organized team with clear delivery, but technical depth was limited.', timestamp '2026-05-10 12:00:00' - interval '40 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '40 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c9046951-17bf-472c-a524-7ad37c9d5edc', '40ec5fee-efe9-4d29-a869-b5334eadaf46', '787e905a-a2da-431e-af63-00cea2ea7bb5', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('95cc8cbd-73df-49f9-ac6b-60717819c744', '40ec5fee-efe9-4d29-a869-b5334eadaf46', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('bf029d30-ed97-4588-a2b8-c8679d8dec73', '40ec5fee-efe9-4d29-a869-b5334eadaf46', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('001cbc31-66ef-4c7f-a475-977343baa6d5', '40ec5fee-efe9-4d29-a869-b5334eadaf46', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('e9f1d2b1-eefe-4124-aba7-3047c2ce482c', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '9faaa31c-cdf6-4678-a123-2bfe194ce989', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', 'Adequate work overall.', timestamp '2026-05-10 12:00:00' - interval '1 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '1 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('bb8e8f9c-eaf2-46d1-affd-8f0ba3693713', 'e9f1d2b1-eefe-4124-aba7-3047c2ce482c', '787e905a-a2da-431e-af63-00cea2ea7bb5', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('01920e2b-0be5-4d3e-a15f-395091cb1fcc', 'e9f1d2b1-eefe-4124-aba7-3047c2ce482c', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9cbb14aa-1ea6-4b29-a30c-7e544704eec8', 'e9f1d2b1-eefe-4124-aba7-3047c2ce482c', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1160ab03-e715-46c9-ae99-79486c01bfde', 'e9f1d2b1-eefe-4124-aba7-3047c2ce482c', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('764aa3ab-0d9d-469a-ad65-8fd43469b37d', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '023ddedd-e060-4194-a7c5-8d3d27e6c3f6', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '28 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '28 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('53eb8243-95aa-46cf-ad96-26d87b3f851b', '764aa3ab-0d9d-469a-ad65-8fd43469b37d', '787e905a-a2da-431e-af63-00cea2ea7bb5', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('080e65da-fb18-488d-a4ab-1af4a5f48226', '764aa3ab-0d9d-469a-ad65-8fd43469b37d', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('5f494b3b-e0b7-4c24-a799-b9b5317c86ee', '764aa3ab-0d9d-469a-ad65-8fd43469b37d', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ce946d8d-dca8-4a46-a9a4-394296622e0e', '764aa3ab-0d9d-469a-ad65-8fd43469b37d', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('38aee2e4-74ed-4fc0-af60-7ce703fdbb0d', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '8fb336c1-ae87-45fc-a587-53fb3052016f', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', 'The project addresses an interesting problem.', timestamp '2026-05-10 12:00:00' - interval '24 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '24 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ada95459-825b-4304-a79c-c4d9a1fabbe7', '38aee2e4-74ed-4fc0-af60-7ce703fdbb0d', '787e905a-a2da-431e-af63-00cea2ea7bb5', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('14dd052b-c93a-4720-aab2-019b0bf86aa4', '38aee2e4-74ed-4fc0-af60-7ce703fdbb0d', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('07014078-87ae-47f8-a39a-8d79f51fb33d', '38aee2e4-74ed-4fc0-af60-7ce703fdbb0d', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('2670ffad-4057-4d46-a74e-49c513a5b8f2', '38aee2e4-74ed-4fc0-af60-7ce703fdbb0d', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 6) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('f382a3e7-f77d-4dd5-a8ff-f2127dca667d', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '93fcb76b-9827-4720-a1a8-9d65fdbc3055', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '36 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '36 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7943642e-fcb4-414f-a60d-11b8d48942e1', 'f382a3e7-f77d-4dd5-a8ff-f2127dca667d', '787e905a-a2da-431e-af63-00cea2ea7bb5', 28) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('371471e6-7c92-473a-a664-570cd4294e92', 'f382a3e7-f77d-4dd5-a8ff-f2127dca667d', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 29) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('fe9d8fb6-5514-4b9c-a9d0-9cdeb8a4e581', 'f382a3e7-f77d-4dd5-a8ff-f2127dca667d', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('cd0d574d-c99a-476a-a999-908299fcfc96', 'f382a3e7-f77d-4dd5-a8ff-f2127dca667d', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('3eaf7275-fdcb-4b8b-ab23-3388130f89e5', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '46123b99-4f0a-4d61-a870-6ef0f78e371f', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', 'Well-prepared team. Minor improvements in delivery would push this to the top tier.', timestamp '2026-05-10 12:00:00' - interval '34 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '34 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('28779802-1b85-45da-a437-7f7d457c7501', '3eaf7275-fdcb-4b8b-ab23-3388130f89e5', '787e905a-a2da-431e-af63-00cea2ea7bb5', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a388a3b6-36b0-4ad8-a07e-a4f825f37a7a', '3eaf7275-fdcb-4b8b-ab23-3388130f89e5', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b4743fab-eb12-4bf4-a464-7c96fa7bcf33', '3eaf7275-fdcb-4b8b-ab23-3388130f89e5', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('55895cd1-6608-4738-ab8b-99a3a254be83', '3eaf7275-fdcb-4b8b-ab23-3388130f89e5', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('74fb767d-e349-4e87-a443-40f1e837361d', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '733f9e70-8f7b-47dc-ad72-a604c760696f', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', 'Promising work, but the quality varied significantly between sections.', timestamp '2026-05-10 12:00:00' - interval '37 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '37 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e3d9e978-1baf-42c6-a1a0-14677cdbe92c', '74fb767d-e349-4e87-a443-40f1e837361d', '787e905a-a2da-431e-af63-00cea2ea7bb5', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e65ecb5c-7cf7-4619-a045-2bd78c183a44', '74fb767d-e349-4e87-a443-40f1e837361d', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 26) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1dc55d69-8c62-477b-a4ab-7cddf272f40f', '74fb767d-e349-4e87-a443-40f1e837361d', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('5b4edd0b-80bd-4f54-a763-10d9f470f01c', '74fb767d-e349-4e87-a443-40f1e837361d', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 5) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('9875efdb-b21b-4709-ae29-7bf326bb8a53', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '339948a9-b977-4c51-a1bd-c3dab5e32936', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '2 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '2 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f6cc14e2-83a4-4f83-a9b4-9244fa8134d1', '9875efdb-b21b-4709-ae29-7bf326bb8a53', '787e905a-a2da-431e-af63-00cea2ea7bb5', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c51814ea-68d8-4bd8-a9ae-9eb9ff9d142e', '9875efdb-b21b-4709-ae29-7bf326bb8a53', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('efd586d5-5d39-4d0b-a0b5-c0ef1da22414', '9875efdb-b21b-4709-ae29-7bf326bb8a53', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('77dfc2aa-851f-4e02-a9bd-00493bb8a046', '9875efdb-b21b-4709-ae29-7bf326bb8a53', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('f3128e91-cd66-4e26-a596-cb85deb2d6ac', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '2c01817f-5c28-4899-ab4b-fb741b5f8f9b', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '38 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '38 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1a77bc4e-5cbb-4e48-a7ce-4e033b9e02af', 'f3128e91-cd66-4e26-a596-cb85deb2d6ac', '787e905a-a2da-431e-af63-00cea2ea7bb5', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('bbf0fb3c-eea9-4510-ac4d-f8d3e628406e', 'f3128e91-cd66-4e26-a596-cb85deb2d6ac', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e7996297-44d8-4eae-aab2-515284fe0a0d', 'f3128e91-cd66-4e26-a596-cb85deb2d6ac', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d422c8f9-c960-4543-a279-1946c2dcbf5f', 'f3128e91-cd66-4e26-a596-cb85deb2d6ac', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('419a2b15-c174-45bc-a028-0cafe236af60', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'bdb8459f-49ce-405e-af0f-d35e36fcdcf2', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'in_progress', NULL, timestamp '2026-05-10 12:00:00' - interval '18 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '18 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('45c52087-0304-46c5-aeb0-d3379e9be248', '419a2b15-c174-45bc-a028-0cafe236af60', '787e905a-a2da-431e-af63-00cea2ea7bb5', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7f4b2b1a-cda8-4841-aeb1-8f6e05fa9007', '419a2b15-c174-45bc-a028-0cafe236af60', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 19) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('da432661-c1b6-441b-a8eb-c5011244d73a', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '93fcb76b-9827-4720-a1a8-9d65fdbc3055', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', 'Exceptional overall. The prototype was working flawlessly during the demo.', timestamp '2026-05-10 12:00:00' - interval '20 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '20 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b2108ca2-555b-45bd-aacf-50787de68663', 'da432661-c1b6-441b-a8eb-c5011244d73a', '787e905a-a2da-431e-af63-00cea2ea7bb5', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('25760789-6678-4060-a60c-524ff49f028d', 'da432661-c1b6-441b-a8eb-c5011244d73a', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e5919714-c8d2-46d6-a7fc-241d6a800391', 'da432661-c1b6-441b-a8eb-c5011244d73a', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 29) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9b5321d3-86b8-4f2b-ad6e-c54dabfb6951', 'da432661-c1b6-441b-a8eb-c5011244d73a', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('1e56626e-7875-40fd-a9ea-892cbebca51c', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '46123b99-4f0a-4d61-a870-6ef0f78e371f', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', 'Solid engineering. The team handled the Q&A confidently.', timestamp '2026-05-10 12:00:00' - interval '24 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '24 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d63ce4eb-dfe9-420c-a3dc-2052e7593348', '1e56626e-7875-40fd-a9ea-892cbebca51c', '787e905a-a2da-431e-af63-00cea2ea7bb5', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('3f546881-7999-4615-af14-069b443f98ba', '1e56626e-7875-40fd-a9ea-892cbebca51c', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('23329f7f-f8ce-474b-a79e-89091a05637b', '1e56626e-7875-40fd-a9ea-892cbebca51c', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('748fa0c0-57e2-4863-af5a-0531c9afd5df', '1e56626e-7875-40fd-a9ea-892cbebca51c', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('4f2b8561-423b-415d-a531-c7a7e379f6b0', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '733f9e70-8f7b-47dc-ad72-a604c760696f', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', 'The concept is excellent — execution was uneven across team members.', timestamp '2026-05-10 12:00:00' - interval '30 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '30 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9e149bb4-584d-4abc-ad5d-692cf72ba456', '4f2b8561-423b-415d-a531-c7a7e379f6b0', '787e905a-a2da-431e-af63-00cea2ea7bb5', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('dcdb5919-66f9-4202-a4a6-e90b8cf9f3d7', '4f2b8561-423b-415d-a531-c7a7e379f6b0', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0c30baaa-acbf-4397-a4b9-dcce20b4e6da', '4f2b8561-423b-415d-a531-c7a7e379f6b0', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 15) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('92e6d51e-2a99-4ee2-a4ab-028cb57c51b7', '4f2b8561-423b-415d-a531-c7a7e379f6b0', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('40001c5b-2225-47e7-a454-1f4d93206275', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '339948a9-b977-4c51-a1bd-c3dab5e32936', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '20 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '20 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('bcba5692-4a97-467c-abc0-0d5a32f6bc91', '40001c5b-2225-47e7-a454-1f4d93206275', '787e905a-a2da-431e-af63-00cea2ea7bb5', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('edbe577f-3dbf-4e2b-aed4-0cbfd74e29c2', '40001c5b-2225-47e7-a454-1f4d93206275', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1ae93aee-24a2-4b5f-aee7-c9c0f5928a08', '40001c5b-2225-47e7-a454-1f4d93206275', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('2fb3c0eb-87b7-413c-a42d-eded70ad43ae', '40001c5b-2225-47e7-a454-1f4d93206275', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('b93b9218-fd59-4562-a252-31a4c787c7c3', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '2c01817f-5c28-4899-ab4b-fb741b5f8f9b', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '13 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '13 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9c366c34-c613-4b34-a8c4-8e6ac5f3c929', 'b93b9218-fd59-4562-a252-31a4c787c7c3', '787e905a-a2da-431e-af63-00cea2ea7bb5', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1910810b-ea48-4121-a814-5247f9f754dd', 'b93b9218-fd59-4562-a252-31a4c787c7c3', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('da383f80-7226-446b-a7fd-bee2f61f01d6', 'b93b9218-fd59-4562-a252-31a4c787c7c3', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d6bc0b86-246e-4efe-ade0-d37f2b676a4e', 'b93b9218-fd59-4562-a252-31a4c787c7c3', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 6) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('c3cec0ab-5459-4367-aa12-ac899234b119', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'bdb8459f-49ce-405e-af0f-d35e36fcdcf2', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'in_progress', NULL, timestamp '2026-05-10 12:00:00' - interval '38 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '38 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6f1413c3-0a47-40d8-ac33-9c815e668b31', 'c3cec0ab-5459-4367-aa12-ac899234b119', '787e905a-a2da-431e-af63-00cea2ea7bb5', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('11c4809f-2a0a-473e-a78d-981194966c3d', 'c3cec0ab-5459-4367-aa12-ac899234b119', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 18) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('a54dcd92-57de-4364-a79f-bf1ecfb835f6', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '93fcb76b-9827-4720-a1a8-9d65fdbc3055', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '6 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '6 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('206f632e-777a-4345-ad6d-86f0445fea36', 'a54dcd92-57de-4364-a79f-bf1ecfb835f6', '787e905a-a2da-431e-af63-00cea2ea7bb5', 26) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('27af5fd4-a86c-4d3a-a398-cf24e674b903', 'a54dcd92-57de-4364-a79f-bf1ecfb835f6', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 26) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('2bef62e8-1383-4ee7-af71-ce8c0e896b18', 'a54dcd92-57de-4364-a79f-bf1ecfb835f6', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d028a888-c481-4cf4-a075-9569ad77cce2', 'a54dcd92-57de-4364-a79f-bf1ecfb835f6', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('21c00c80-ccba-4a56-adc3-c4d2c858ee7d', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '46123b99-4f0a-4d61-a870-6ef0f78e371f', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', 'Solid engineering. The team handled the Q&A confidently.', timestamp '2026-05-10 12:00:00' - interval '8 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '8 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('edafcaf2-45d7-43ab-a473-600f41e3171b', '21c00c80-ccba-4a56-adc3-c4d2c858ee7d', '787e905a-a2da-431e-af63-00cea2ea7bb5', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('480fd432-9d47-4611-a588-de47c0a2a0ba', '21c00c80-ccba-4a56-adc3-c4d2c858ee7d', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4fc1b1fb-810f-440f-afa7-91330c71d2f9', '21c00c80-ccba-4a56-adc3-c4d2c858ee7d', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b86cf08a-749b-4e4d-a2a6-cbaef3283806', '21c00c80-ccba-4a56-adc3-c4d2c858ee7d', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('f0aa4c66-da7e-47cd-a160-0f5acfefe798', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '733f9e70-8f7b-47dc-ad72-a604c760696f', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '20 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '20 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1d536794-349d-494f-a906-5fc37c8ce898', 'f0aa4c66-da7e-47cd-a160-0f5acfefe798', '787e905a-a2da-431e-af63-00cea2ea7bb5', 26) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4df996fe-f781-44e4-aba5-cc6cbb7cd9c4', 'f0aa4c66-da7e-47cd-a160-0f5acfefe798', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1811c061-8c13-480b-a0a3-f60176812d7a', 'f0aa4c66-da7e-47cd-a160-0f5acfefe798', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('45f77712-0655-41aa-a5fa-d31fcb2546ef', 'f0aa4c66-da7e-47cd-a160-0f5acfefe798', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 5) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('c0780a7b-a1d6-4447-af81-1d7c2ab84571', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '339948a9-b977-4c51-a1bd-c3dab5e32936', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', 'The implementation is solid; the report and slides need more clarity.', timestamp '2026-05-10 12:00:00' - interval '37 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '37 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a4a73d42-1158-4e67-a753-f25572d5217d', 'c0780a7b-a1d6-4447-af81-1d7c2ab84571', '787e905a-a2da-431e-af63-00cea2ea7bb5', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('13823ed9-d2dd-43dd-a065-50b5dda77c7e', 'c0780a7b-a1d6-4447-af81-1d7c2ab84571', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('db08aff6-7c85-47d1-a750-fe678f882132', 'c0780a7b-a1d6-4447-af81-1d7c2ab84571', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6adc8788-b41b-4a27-a80e-68c5b77ca24c', 'c0780a7b-a1d6-4447-af81-1d7c2ab84571', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('93a3929a-6a7a-4c2b-a074-f78423365cfa', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '2c01817f-5c28-4899-ab4b-fb741b5f8f9b', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', 'The project addresses an interesting problem.', timestamp '2026-05-10 12:00:00' - interval '38 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '38 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('8c3d40bc-213e-48a6-ac6a-0fd8334edb3a', '93a3929a-6a7a-4c2b-a074-f78423365cfa', '787e905a-a2da-431e-af63-00cea2ea7bb5', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d96d3bb3-2091-4fbe-a2a5-898de3a2f72f', '93a3929a-6a7a-4c2b-a074-f78423365cfa', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e33890b3-27e7-44c4-a2f9-b84d62dcdf7e', '93a3929a-6a7a-4c2b-a074-f78423365cfa', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b005d273-31c2-4f79-a7f0-52e78b692ae2', '93a3929a-6a7a-4c2b-a074-f78423365cfa', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('4761ff0b-c0b9-46d2-a24f-d8512ef91ce2', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'bdb8459f-49ce-405e-af0f-d35e36fcdcf2', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'in_progress', NULL, timestamp '2026-05-10 12:00:00' - interval '19 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '19 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('db7347f5-7cc4-4408-a2a8-a717c2ba943f', '4761ff0b-c0b9-46d2-a24f-d8512ef91ce2', '787e905a-a2da-431e-af63-00cea2ea7bb5', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('728788c4-d511-4c1a-ad55-8c5efdf34c8c', '4761ff0b-c0b9-46d2-a24f-d8512ef91ce2', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 17) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('7a753f31-a6d4-4f55-afdc-6f6ed3efa994', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '00f25636-269c-4d25-abd5-3cdbc12a31f8', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', NULL, timestamp '2025-09-01' + interval '5 days' - interval '30 mins', timestamp '2025-09-01' + interval '5 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('88b921b2-46ae-4c3b-ada8-b1262c23befc', '7a753f31-a6d4-4f55-afdc-6f6ed3efa994', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('8089a092-1d18-4cd9-a1ed-7ab3f37c4743', '7a753f31-a6d4-4f55-afdc-6f6ed3efa994', '8cebf54b-97b4-493c-a837-4707d4828eae', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('8986cfd4-ccec-491c-aae0-fbd3c0edc618', '7a753f31-a6d4-4f55-afdc-6f6ed3efa994', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7fa65909-b9f9-47a1-ae6a-40f3185c1788', '7a753f31-a6d4-4f55-afdc-6f6ed3efa994', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('440f9d88-6b20-46bd-a431-5504b3baf172', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '46c52db6-2cd0-404d-a2bf-23d390c741ad', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', NULL, timestamp '2025-09-01' + interval '4 days' - interval '30 mins', timestamp '2025-09-01' + interval '4 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('10247c00-ba25-483d-a4f3-d51cf013cd98', '440f9d88-6b20-46bd-a431-5504b3baf172', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('35acab14-64bc-4948-affd-ec06b5b47e9d', '440f9d88-6b20-46bd-a431-5504b3baf172', '8cebf54b-97b4-493c-a837-4707d4828eae', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('49c0f245-ac80-4e5e-ab79-6e2dd812c9c4', '440f9d88-6b20-46bd-a431-5504b3baf172', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('94a7e31d-6ef1-4278-abfe-7f6886172b12', '440f9d88-6b20-46bd-a431-5504b3baf172', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 6) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('9ecc692c-d88d-46e7-a455-013ed153ba2b', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '12cbf2c4-0a16-4574-abb5-b601beec8176', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', 'The project addresses an interesting problem.', timestamp '2025-09-01' + interval '8 days' - interval '30 mins', timestamp '2025-09-01' + interval '8 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('df167b7f-e82e-4f25-acba-253daabd8efa', '9ecc692c-d88d-46e7-a455-013ed153ba2b', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f13b98b4-9b74-442b-a9d4-e91e29bd0724', '9ecc692c-d88d-46e7-a455-013ed153ba2b', '8cebf54b-97b4-493c-a837-4707d4828eae', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('85ff6f87-1f90-48cc-aec1-0fcdfe2cfe85', '9ecc692c-d88d-46e7-a455-013ed153ba2b', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('313a58ea-d134-4980-aedf-b6b3f24381b8', '9ecc692c-d88d-46e7-a455-013ed153ba2b', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 6) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('c163eb32-daf8-4b33-a22f-d00da75cacfe', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '0af988df-e6d9-4ac1-a6ec-56343146a552', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', 'A fair attempt. Significant improvements needed before this is production-ready.', timestamp '2025-09-01' + interval '7 days' - interval '30 mins', timestamp '2025-09-01' + interval '7 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('444f0d4c-7a77-46a8-a15b-6949ef0f8579', 'c163eb32-daf8-4b33-a22f-d00da75cacfe', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c3d4ff99-40ee-470a-ab03-82683ff5e9cb', 'c163eb32-daf8-4b33-a22f-d00da75cacfe', '8cebf54b-97b4-493c-a837-4707d4828eae', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b8fc4085-220d-489c-a536-5c5e83fe1a66', 'c163eb32-daf8-4b33-a22f-d00da75cacfe', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('75c5bdd7-5d3a-4174-acc6-17197f0d0b45', 'c163eb32-daf8-4b33-a22f-d00da75cacfe', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 7) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('7bde82b3-8ee3-47c4-a404-d6d04c5df9d7', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '9dbf8fbe-1580-489c-a551-1eda5fb69025', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', NULL, timestamp '2025-09-01' + interval '5 days' - interval '30 mins', timestamp '2025-09-01' + interval '5 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('062367d1-5ed8-4aa6-a465-583222380ab0', '7bde82b3-8ee3-47c4-a404-d6d04c5df9d7', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 26) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('969fed81-afc6-4dc0-a3a7-df37f86f03e2', '7bde82b3-8ee3-47c4-a404-d6d04c5df9d7', '8cebf54b-97b4-493c-a837-4707d4828eae', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('19cbadb0-ca99-4b5e-afa0-7173bd355f22', '7bde82b3-8ee3-47c4-a404-d6d04c5df9d7', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('5e289f1e-6fb6-495e-aec5-7aae4a6b5864', '7bde82b3-8ee3-47c4-a404-d6d04c5df9d7', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('f7897313-ebd4-43c7-afad-526e0cf2201e', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '00f25636-269c-4d25-abd5-3cdbc12a31f8', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', NULL, timestamp '2025-09-01' + interval '8 days' - interval '30 mins', timestamp '2025-09-01' + interval '8 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1799b09d-5350-4c64-a48e-4c7e9c2660b4', 'f7897313-ebd4-43c7-afad-526e0cf2201e', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('95ff10fb-e568-4c2a-adce-d6964d39d21d', 'f7897313-ebd4-43c7-afad-526e0cf2201e', '8cebf54b-97b4-493c-a837-4707d4828eae', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('95a68b4a-711c-4294-a489-6ecc60583b1f', 'f7897313-ebd4-43c7-afad-526e0cf2201e', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('98fb672c-caea-4913-a8bf-e7d4b698d2c8', 'f7897313-ebd4-43c7-afad-526e0cf2201e', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('d5337ab2-694f-41e9-a145-45a8ca98777b', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '46c52db6-2cd0-404d-a2bf-23d390c741ad', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', 'The project meets minimum requirements but could use further development.', timestamp '2025-09-01' + interval '3 days' - interval '30 mins', timestamp '2025-09-01' + interval '3 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('39e45dec-3905-43fc-aedf-b2cc81395c40', 'd5337ab2-694f-41e9-a145-45a8ca98777b', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('61428a94-2b73-4456-a4c1-cdf6d4c344e8', 'd5337ab2-694f-41e9-a145-45a8ca98777b', '8cebf54b-97b4-493c-a837-4707d4828eae', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0c386e1f-36d5-43e5-a59f-3368ccec782d', 'd5337ab2-694f-41e9-a145-45a8ca98777b', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('284c9649-ebb3-48ea-a98d-1bc3158c9580', 'd5337ab2-694f-41e9-a145-45a8ca98777b', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 6) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('81449c0f-7207-44e7-a4e2-234e04a761ca', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '12cbf2c4-0a16-4574-abb5-b601beec8176', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'in_progress', NULL, timestamp '2025-09-01' + interval '6 days' - interval '30 mins', timestamp '2025-09-01' + interval '6 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b6a08f55-ffbe-4898-a58c-ec9db4f32d64', '81449c0f-7207-44e7-a4e2-234e04a761ca', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('bf873a44-2982-45d9-a7f1-45cf26344c0a', '81449c0f-7207-44e7-a4e2-234e04a761ca', '8cebf54b-97b4-493c-a837-4707d4828eae', 19) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('1e55b7b3-be51-40f7-a155-6e23fea6d1b4', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'be3a4e6f-a69b-418a-a333-215fbfdf5261', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', NULL, timestamp '2025-02-01' + interval '2 days' - interval '30 mins', timestamp '2025-02-01' + interval '2 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d505b925-5909-4c2a-a1d2-a5007c005172', '1e55b7b3-be51-40f7-a155-6e23fea6d1b4', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 29) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('3b9122bf-1fec-4203-adef-c9c293de6ccc', '1e55b7b3-be51-40f7-a155-6e23fea6d1b4', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 29) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ffd33330-3b02-4053-a960-b04119c48020', '1e55b7b3-be51-40f7-a155-6e23fea6d1b4', '01b94576-b441-4c66-ac35-be4aa17effa3', 26) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e06dad0a-d935-4912-adad-1c983cda9d48', '1e55b7b3-be51-40f7-a155-6e23fea6d1b4', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('37ad38d0-5f96-4af6-a0ee-afacc1243573', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '85cf466e-cb30-49f6-a3ac-58884c85a854', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', 'The team presented confidently but the technical contributions were thin.', timestamp '2025-02-01' + interval '9 days' - interval '30 mins', timestamp '2025-02-01' + interval '9 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('29287b69-7a14-448a-adf6-698a26b6b7b1', '37ad38d0-5f96-4af6-a0ee-afacc1243573', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ac4f4ed3-a999-49c9-aa1f-12697245fe85', '37ad38d0-5f96-4af6-a0ee-afacc1243573', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c8539c5f-d79d-42ee-ae39-cf89970c603b', '37ad38d0-5f96-4af6-a0ee-afacc1243573', '01b94576-b441-4c66-ac35-be4aa17effa3', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('baade0c5-b31b-4103-acc6-04284027f140', '37ad38d0-5f96-4af6-a0ee-afacc1243573', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('2edfa2fd-cdba-41e8-ad38-7a34734393b5', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'c2fd33b6-8b39-4397-acec-1dd12cdfc62b', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', NULL, timestamp '2025-02-01' + interval '9 days' - interval '30 mins', timestamp '2025-02-01' + interval '9 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('2062f022-3ea2-4f86-a802-7b1d953d45c5', '2edfa2fd-cdba-41e8-ad38-7a34734393b5', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a5452929-b98a-4eb5-aa77-51d4fec40d24', '2edfa2fd-cdba-41e8-ad38-7a34734393b5', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('18049b9d-9986-454e-a93f-3cde25b742ce', '2edfa2fd-cdba-41e8-ad38-7a34734393b5', '01b94576-b441-4c66-ac35-be4aa17effa3', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('96f8bc17-3353-4582-a98d-2a7656976261', '2edfa2fd-cdba-41e8-ad38-7a34734393b5', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 7) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('939a1521-f3df-4681-a593-0944713723de', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '49d1f760-f4a0-40f3-a142-a11518c59c92', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', 'The team showed effort but the results were not convincing across all criteria.', timestamp '2025-02-01' + interval '5 days' - interval '30 mins', timestamp '2025-02-01' + interval '5 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ef4b97ef-6f05-42f4-a2ee-ddecf39c3825', '939a1521-f3df-4681-a593-0944713723de', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('289365b1-3a91-483b-abf6-87bd7639eb5c', '939a1521-f3df-4681-a593-0944713723de', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('892c54ae-cc6a-4022-a10c-401a54c071d9', '939a1521-f3df-4681-a593-0944713723de', '01b94576-b441-4c66-ac35-be4aa17effa3', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('44919ec4-d308-489e-a288-db41be15c45e', '939a1521-f3df-4681-a593-0944713723de', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 7) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('9160efa7-3bec-4532-a782-e6ebcad5a216', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'ed333a6e-c080-4a61-a6dc-87a0e3220f22', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '3 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '3 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('acb7e4c0-f9c2-4374-a408-2ec37b716baa', '9160efa7-3bec-4532-a782-e6ebcad5a216', '684fe08e-8aeb-4069-a864-a800f0e007aa', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f194b7ae-ab3c-4236-ac1f-be009ed081c7', '9160efa7-3bec-4532-a782-e6ebcad5a216', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b8e3b105-b196-465d-a607-77586f9078da', '9160efa7-3bec-4532-a782-e6ebcad5a216', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7a03455b-e1bd-4a30-a955-2f4aafa9e61f', '9160efa7-3bec-4532-a782-e6ebcad5a216', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a56aa3e7-3e97-4018-a64c-8b1cafc4837d', '9160efa7-3bec-4532-a782-e6ebcad5a216', 'd503371e-a85d-4eea-ad83-a91291cf4297', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('f876abcd-1829-4b42-a562-bc56d83cccb4', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'dd36e1bf-2797-42b4-ac06-cd142c99074f', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '2 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '2 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d4786d2f-9b1f-4b52-aa38-15459d4fd014', 'f876abcd-1829-4b42-a562-bc56d83cccb4', '684fe08e-8aeb-4069-a864-a800f0e007aa', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ead4cb40-5122-4a73-ab37-d078a805488b', 'f876abcd-1829-4b42-a562-bc56d83cccb4', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('09fcd156-dfbe-46a8-a388-75fd269d893b', 'f876abcd-1829-4b42-a562-bc56d83cccb4', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 15) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('65bd988c-9804-4e54-a4b1-3c1e2bd811d8', 'f876abcd-1829-4b42-a562-bc56d83cccb4', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 15) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('519deae4-7714-4b02-a402-5615f0e3addb', 'f876abcd-1829-4b42-a562-bc56d83cccb4', 'd503371e-a85d-4eea-ad83-a91291cf4297', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('944469e9-296f-44f9-a83d-95bce812cbda', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'b15cefcf-fdfb-4b27-ae31-d743f12c947d', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '14 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '14 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ea6f9704-81d1-4761-a9d5-2cf26ce48896', '944469e9-296f-44f9-a83d-95bce812cbda', '684fe08e-8aeb-4069-a864-a800f0e007aa', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7b4950c4-bc18-48f0-afa7-42eaa3354254', '944469e9-296f-44f9-a83d-95bce812cbda', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f8fc7e30-1627-4032-a3a5-2e670380d2cb', '944469e9-296f-44f9-a83d-95bce812cbda', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a6b9ec4f-618f-4d2e-a374-f3084abc8d02', '944469e9-296f-44f9-a83d-95bce812cbda', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a6412a70-9ee7-4bb0-a165-5def06e48758', '944469e9-296f-44f9-a83d-95bce812cbda', 'd503371e-a85d-4eea-ad83-a91291cf4297', 7) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('36449f54-7250-4c73-a5ec-568e72708f8b', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '098590f3-10cc-4859-a45f-f642a593a924', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '28 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '28 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9b47244b-4652-4ed1-a2db-2e25d3612702', '36449f54-7250-4c73-a5ec-568e72708f8b', '684fe08e-8aeb-4069-a864-a800f0e007aa', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('3f00fbf2-c24c-4bf1-a6bf-a551910753ec', '36449f54-7250-4c73-a5ec-568e72708f8b', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('5dc8f869-4263-4ab4-ae3d-8f74a481b594', '36449f54-7250-4c73-a5ec-568e72708f8b', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d57fce75-00ee-4909-aa08-8b2a65cf7ba2', '36449f54-7250-4c73-a5ec-568e72708f8b', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a24dd774-d2a7-4bb1-a017-5fb74a21757d', '36449f54-7250-4c73-a5ec-568e72708f8b', 'd503371e-a85d-4eea-ad83-a91291cf4297', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('250d5773-a14a-4de3-a89a-ecad08149944', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '4c0e22db-7d9f-4312-a1d3-4fed4c7e3316', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '28 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '28 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('802242e5-5d0a-4f05-a638-4f10bfeb381b', '250d5773-a14a-4de3-a89a-ecad08149944', '684fe08e-8aeb-4069-a864-a800f0e007aa', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('65e5257f-78cb-4d6a-a878-c711f0a7a072', '250d5773-a14a-4de3-a89a-ecad08149944', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f6af95f7-44cc-4fba-a06a-75637af50b46', '250d5773-a14a-4de3-a89a-ecad08149944', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 13) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('290224ac-9394-4396-aa90-4fc9f2b57fce', '250d5773-a14a-4de3-a89a-ecad08149944', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 11) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('2bf4c9ab-6afe-4d35-ab1d-14870276876b', '250d5773-a14a-4de3-a89a-ecad08149944', 'd503371e-a85d-4eea-ad83-a91291cf4297', 7) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('d60e153b-36a9-4deb-a6e2-65cd8e56ac01', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '1d3379fc-8094-4ff3-a4c7-fea65531bacd', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '33 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '33 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e8a8752b-289c-48e3-a37a-784d1eed60a3', 'd60e153b-36a9-4deb-a6e2-65cd8e56ac01', '684fe08e-8aeb-4069-a864-a800f0e007aa', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('09e302e5-7fd3-43f2-a58b-12dd1fbc4c36', 'd60e153b-36a9-4deb-a6e2-65cd8e56ac01', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('8c7ee6d7-6f32-4d3d-a7ad-71cd6e6c570f', 'd60e153b-36a9-4deb-a6e2-65cd8e56ac01', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('58632e2e-7bbf-4a14-ae2d-8029947f43a4', 'd60e153b-36a9-4deb-a6e2-65cd8e56ac01', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1b979a64-da67-43fa-ab5b-e8f63774316e', 'd60e153b-36a9-4deb-a6e2-65cd8e56ac01', 'd503371e-a85d-4eea-ad83-a91291cf4297', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('923c54ed-ac81-460f-a938-1a2850a1d16d', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'ed333a6e-c080-4a61-a6dc-87a0e3220f22', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '43 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '43 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9285b890-7c1b-450b-a2f7-a3e3c5e1fa0d', '923c54ed-ac81-460f-a938-1a2850a1d16d', '684fe08e-8aeb-4069-a864-a800f0e007aa', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('aa4710b5-2b50-4edf-ac04-5e7565c3fa52', '923c54ed-ac81-460f-a938-1a2850a1d16d', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7e47ae55-5d38-4ef7-a11d-6910320362cc', '923c54ed-ac81-460f-a938-1a2850a1d16d', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6f1a1d72-e242-424f-a990-92c2fa75bb4c', '923c54ed-ac81-460f-a938-1a2850a1d16d', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('48568295-48f8-452c-a4fb-c54bddae07b1', '923c54ed-ac81-460f-a938-1a2850a1d16d', 'd503371e-a85d-4eea-ad83-a91291cf4297', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('c4a8c4db-87c4-4d27-aa0d-0bb6d9430eaa', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'dd36e1bf-2797-42b4-ac06-cd142c99074f', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '1 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '1 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0ca81692-fc55-486b-a996-7c484855d72a', 'c4a8c4db-87c4-4d27-aa0d-0bb6d9430eaa', '684fe08e-8aeb-4069-a864-a800f0e007aa', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('69b48156-d572-4882-a74f-a31e8feae549', 'c4a8c4db-87c4-4d27-aa0d-0bb6d9430eaa', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('cb450599-6720-403d-a715-52709446843a', 'c4a8c4db-87c4-4d27-aa0d-0bb6d9430eaa', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9a03b7df-1f4b-474f-a5dd-cf17068ba2bc', 'c4a8c4db-87c4-4d27-aa0d-0bb6d9430eaa', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 15) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4ab5b6b6-efc9-4110-a6e2-1789531401c1', 'c4a8c4db-87c4-4d27-aa0d-0bb6d9430eaa', 'd503371e-a85d-4eea-ad83-a91291cf4297', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('d829f82b-2d97-48e3-a839-6ee43c5717e9', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'b15cefcf-fdfb-4b27-ae31-d743f12c947d', '44e14170-d567-4ad4-a771-cd269d538a2f', 'in_progress', NULL, timestamp '2026-05-10 12:00:00' - interval '41 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '41 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('bb65ff8f-7934-42b0-afc3-6b18f0d40d8c', 'd829f82b-2d97-48e3-a839-6ee43c5717e9', '684fe08e-8aeb-4069-a864-a800f0e007aa', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('8143ef13-2405-4630-acde-46251f865bf3', 'd829f82b-2d97-48e3-a839-6ee43c5717e9', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 21) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('f0b4f6cf-a191-4c00-aa59-c8ec0e34f487', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'ed333a6e-c080-4a61-a6dc-87a0e3220f22', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', 'Outstanding work across all criteria. One of the strongest presentations of the day.', timestamp '2026-05-10 12:00:00' - interval '18 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '18 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7b59c0b9-9d28-437b-a65b-29871f3bd66b', 'f0b4f6cf-a191-4c00-aa59-c8ec0e34f487', '684fe08e-8aeb-4069-a864-a800f0e007aa', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('73459d27-fb96-4962-a5c6-668842ae4345', 'f0b4f6cf-a191-4c00-aa59-c8ec0e34f487', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c6f14275-2265-4043-aca7-45245a9dfed6', 'f0b4f6cf-a191-4c00-aa59-c8ec0e34f487', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('bd379a30-5a45-45ed-ac56-af7cedb11752', 'f0b4f6cf-a191-4c00-aa59-c8ec0e34f487', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a96a0e1c-7d5a-4caa-a522-721130adfebe', 'f0b4f6cf-a191-4c00-aa59-c8ec0e34f487', 'd503371e-a85d-4eea-ad83-a91291cf4297', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('646255e4-bc5f-4d5f-a5a8-b4c7668b76de', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'dd36e1bf-2797-42b4-ac06-cd142c99074f', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', 'Good solid work. A few rough edges but a strong submission overall.', timestamp '2026-05-10 12:00:00' - interval '35 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '35 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('05c5aa6f-1f01-4976-aad3-1dbae8f184c2', '646255e4-bc5f-4d5f-a5a8-b4c7668b76de', '684fe08e-8aeb-4069-a864-a800f0e007aa', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e9914f7d-fb7d-4a8b-a009-4d853fe69573', '646255e4-bc5f-4d5f-a5a8-b4c7668b76de', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e3c4f990-af3b-4066-a1e8-aee176d4fc61', '646255e4-bc5f-4d5f-a5a8-b4c7668b76de', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9103e5dd-4025-4eea-a9b3-2bee2c247b8e', '646255e4-bc5f-4d5f-a5a8-b4c7668b76de', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 14) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('3a64a4c8-3a6c-4a0a-a724-0451d5950b38', '646255e4-bc5f-4d5f-a5a8-b4c7668b76de', 'd503371e-a85d-4eea-ad83-a91291cf4297', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('ab28ff6c-2eca-42f7-a9a5-d6a35a306f15', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'b15cefcf-fdfb-4b27-ae31-d743f12c947d', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', 'Well-prepared team. Minor improvements in delivery would push this to the top tier.', timestamp '2026-05-10 12:00:00' - interval '11 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '11 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('3acd61a4-3cd7-4872-a93f-347b1e5b8a32', 'ab28ff6c-2eca-42f7-a9a5-d6a35a306f15', '684fe08e-8aeb-4069-a864-a800f0e007aa', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e5a9ee2c-9215-4ac6-a3e1-9549437985db', 'ab28ff6c-2eca-42f7-a9a5-d6a35a306f15', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4acfb2f0-5eb8-4f1a-a0dc-b3379e382630', 'ab28ff6c-2eca-42f7-a9a5-d6a35a306f15', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 15) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('67e03467-ec92-4974-a5c5-aff101211c46', 'ab28ff6c-2eca-42f7-a9a5-d6a35a306f15', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 15) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('fd5c4382-e3d5-4b4b-ae1f-9fd5fe3887c2', 'ab28ff6c-2eca-42f7-a9a5-d6a35a306f15', 'd503371e-a85d-4eea-ad83-a91291cf4297', 7) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('fc10ec9c-6534-4889-aee1-0c9fab3a3fc2', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '098590f3-10cc-4859-a45f-f642a593a924', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', 'Very professional delivery; the underlying solution needs further development.', timestamp '2026-05-10 12:00:00' - interval '18 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '18 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ab9bb6a8-097e-49e9-a61e-f5c012f1d97a', 'fc10ec9c-6534-4889-aee1-0c9fab3a3fc2', '684fe08e-8aeb-4069-a864-a800f0e007aa', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('98b03ccf-c68c-49dd-a416-dfb69a99de47', 'fc10ec9c-6534-4889-aee1-0c9fab3a3fc2', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f6eef473-978b-48c5-a272-3d3ce47976ce', 'fc10ec9c-6534-4889-aee1-0c9fab3a3fc2', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c995a1ee-00c9-4e4e-ac8b-b157f31a6196', 'fc10ec9c-6534-4889-aee1-0c9fab3a3fc2', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('5bdd1ac0-3e05-4414-ad5e-6de0424b7b8a', 'fc10ec9c-6534-4889-aee1-0c9fab3a3fc2', 'd503371e-a85d-4eea-ad83-a91291cf4297', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('a1e7ef86-575c-47f7-a414-def3ff079468', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '4c0e22db-7d9f-4312-a1d3-4fed4c7e3316', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', 'The project meets minimum requirements but could use further development.', timestamp '2026-05-10 12:00:00' - interval '41 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '41 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('174ea813-fb35-4619-aa2b-326b2a1e3225', 'a1e7ef86-575c-47f7-a414-def3ff079468', '684fe08e-8aeb-4069-a864-a800f0e007aa', 15) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('8af212bd-54cb-47f8-a7ef-de84f75e26e6', 'a1e7ef86-575c-47f7-a414-def3ff079468', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1b8dc574-b47f-42e6-a341-75d4e05a1886', 'a1e7ef86-575c-47f7-a414-def3ff079468', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 12) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b7273f7c-0805-452b-a7a5-b28722aeea35', 'a1e7ef86-575c-47f7-a414-def3ff079468', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 14) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a70adda3-628c-4e47-a0d6-5cc61f87e433', 'a1e7ef86-575c-47f7-a414-def3ff079468', 'd503371e-a85d-4eea-ad83-a91291cf4297', 6) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('cff20a28-d493-41fa-ad5a-aaf293ce8115', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '1d3379fc-8094-4ff3-a4c7-fea65531bacd', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', 'Exceptional overall. The prototype was working flawlessly during the demo.', timestamp '2026-05-10 12:00:00' - interval '5 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '5 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('22de191c-f40a-4297-ad21-ebb886f47ef8', 'cff20a28-d493-41fa-ad5a-aaf293ce8115', '684fe08e-8aeb-4069-a864-a800f0e007aa', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c8260558-ca8f-4473-ac67-1697793ea18e', 'cff20a28-d493-41fa-ad5a-aaf293ce8115', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('be16c217-e489-48a6-a598-1b6f190e7016', 'cff20a28-d493-41fa-ad5a-aaf293ce8115', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ff01ef06-00de-4c89-af18-db3d1a279db6', 'cff20a28-d493-41fa-ad5a-aaf293ce8115', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7b9cf692-2640-4483-ad24-f2fe7d55868a', 'cff20a28-d493-41fa-ad5a-aaf293ce8115', 'd503371e-a85d-4eea-ad83-a91291cf4297', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('b4a6654a-3a22-46b0-a95d-f37d372e022d', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'ed333a6e-c080-4a61-a6dc-87a0e3220f22', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', 'Exceptional overall. The prototype was working flawlessly during the demo.', timestamp '2026-05-10 12:00:00' - interval '6 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '6 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('3ca9e351-b4e9-4ccb-a5df-6d470195e787', 'b4a6654a-3a22-46b0-a95d-f37d372e022d', '684fe08e-8aeb-4069-a864-a800f0e007aa', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('476fb95e-176e-47b0-a940-a617063c89a8', 'b4a6654a-3a22-46b0-a95d-f37d372e022d', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a5848e30-923e-455b-ae73-79d0b1ce0d5a', 'b4a6654a-3a22-46b0-a95d-f37d372e022d', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e3651750-dd62-4185-a3be-0dfbb8a07263', 'b4a6654a-3a22-46b0-a95d-f37d372e022d', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b22cbc39-1942-4a16-a6f9-74298f5a01b6', 'b4a6654a-3a22-46b0-a95d-f37d372e022d', 'd503371e-a85d-4eea-ad83-a91291cf4297', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('6bc57161-e7fe-4732-aa23-32cc2a0a681c', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'dd36e1bf-2797-42b4-ac06-cd142c99074f', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '18 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '18 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a885b1ba-bb9e-4562-a4d1-4862a410f636', '6bc57161-e7fe-4732-aa23-32cc2a0a681c', '684fe08e-8aeb-4069-a864-a800f0e007aa', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('78b3d270-1acf-4e65-a1f7-1e917ee935a2', '6bc57161-e7fe-4732-aa23-32cc2a0a681c', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('03bf6a84-e1ac-4f51-a150-a0e72250ec5b', '6bc57161-e7fe-4732-aa23-32cc2a0a681c', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a7d9a2ee-50a6-43e8-a580-b925a71011b7', '6bc57161-e7fe-4732-aa23-32cc2a0a681c', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 15) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('3ae4c6eb-5d74-4a9e-a7f0-4a50ef74e8da', '6bc57161-e7fe-4732-aa23-32cc2a0a681c', 'd503371e-a85d-4eea-ad83-a91291cf4297', 7) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('8c6e6faf-2a3d-4d29-a3c6-1fd393ca0570', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'b15cefcf-fdfb-4b27-ae31-d743f12c947d', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'in_progress', NULL, timestamp '2026-05-10 12:00:00' - interval '33 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '33 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4dfe6696-3ce4-40d6-adbb-26a0f903e0e7', '8c6e6faf-2a3d-4d29-a3c6-1fd393ca0570', '684fe08e-8aeb-4069-a864-a800f0e007aa', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('433ef9ba-c44b-4743-ac24-9118ddac8b33', '8c6e6faf-2a3d-4d29-a3c6-1fd393ca0570', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 18) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('9b4e66ac-3b8f-4c01-a8b7-ab2495211490', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'ed333a6e-c080-4a61-a6dc-87a0e3220f22', 'a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '32 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '32 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f98436d9-59c3-4eaf-a7ef-4350114e4194', '9b4e66ac-3b8f-4c01-a8b7-ab2495211490', '684fe08e-8aeb-4069-a864-a800f0e007aa', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('5b29b728-c9e0-4444-a320-94b615212678', '9b4e66ac-3b8f-4c01-a8b7-ab2495211490', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('51a730b8-ca7c-4782-ac62-986a99370616', '9b4e66ac-3b8f-4c01-a8b7-ab2495211490', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d65cb202-9c6d-4c83-a27b-1ea7d5254b82', '9b4e66ac-3b8f-4c01-a8b7-ab2495211490', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d21504d7-7968-4f42-aca1-bf11533dd564', '9b4e66ac-3b8f-4c01-a8b7-ab2495211490', 'd503371e-a85d-4eea-ad83-a91291cf4297', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('4307a28f-00af-45ae-ae8c-975f2c95e51f', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'dd36e1bf-2797-42b4-ac06-cd142c99074f', 'a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '19 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '19 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b296d23d-c101-449f-a63c-3d9d8503561e', '4307a28f-00af-45ae-ae8c-975f2c95e51f', '684fe08e-8aeb-4069-a864-a800f0e007aa', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7df90a10-7715-4c2c-a46c-f67b73d61eeb', '4307a28f-00af-45ae-ae8c-975f2c95e51f', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e60b101e-c979-44e8-a946-b4bc2b4b40ff', '4307a28f-00af-45ae-ae8c-975f2c95e51f', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('51a57758-6956-486c-ad48-4669d177d259', '4307a28f-00af-45ae-ae8c-975f2c95e51f', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b30aacd2-5fd7-40d2-ab14-ee62196e96f9', '4307a28f-00af-45ae-ae8c-975f2c95e51f', 'd503371e-a85d-4eea-ad83-a91291cf4297', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('3b3c0369-cda6-4d6c-a54f-c175812c67df', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'b15cefcf-fdfb-4b27-ae31-d743f12c947d', 'a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'submitted', 'Solid engineering. The team handled the Q&A confidently.', timestamp '2026-05-10 12:00:00' - interval '15 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '15 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('5fc5d592-33b5-48d4-a99a-7308dae2d02c', '3b3c0369-cda6-4d6c-a54f-c175812c67df', '684fe08e-8aeb-4069-a864-a800f0e007aa', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f6e05bc9-a25c-484e-ae51-b7e1456addc8', '3b3c0369-cda6-4d6c-a54f-c175812c67df', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b350fac4-8e04-4d87-a796-c52b7f811f21', '3b3c0369-cda6-4d6c-a54f-c175812c67df', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d326f8fa-c977-421c-ace8-db83b987f81f', '3b3c0369-cda6-4d6c-a54f-c175812c67df', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('21f2685d-a98f-4134-acaf-22713e2b6b78', '3b3c0369-cda6-4d6c-a54f-c175812c67df', 'd503371e-a85d-4eea-ad83-a91291cf4297', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('ca31b249-e623-4c78-ac31-f81c9d30708f', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '098590f3-10cc-4859-a45f-f642a593a924', 'a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '16 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '16 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ba11e08e-2970-4b13-a383-0f93fe4f8c20', 'ca31b249-e623-4c78-ac31-f81c9d30708f', '684fe08e-8aeb-4069-a864-a800f0e007aa', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('563525e0-b2a4-41d1-ac02-3a4a6bae9793', 'ca31b249-e623-4c78-ac31-f81c9d30708f', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('df44b1ed-c930-4683-acfd-b9b3fdd461b7', 'ca31b249-e623-4c78-ac31-f81c9d30708f', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('231272fa-639c-425e-a7cb-08460d842880', 'ca31b249-e623-4c78-ac31-f81c9d30708f', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e684d1e9-192d-4ae2-a000-e28013d75325', 'ca31b249-e623-4c78-ac31-f81c9d30708f', 'd503371e-a85d-4eea-ad83-a91291cf4297', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('98cd7b8c-302a-4020-a0cc-ef89e6538976', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '4c0e22db-7d9f-4312-a1d3-4fed4c7e3316', 'a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'submitted', 'A fair attempt. Significant improvements needed before this is production-ready.', timestamp '2026-05-10 12:00:00' - interval '23 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '23 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4e4677be-06c4-4a1a-a1a9-272e44a6fa3a', '98cd7b8c-302a-4020-a0cc-ef89e6538976', '684fe08e-8aeb-4069-a864-a800f0e007aa', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4ad4720c-b66a-421a-ab00-2807b46cf26e', '98cd7b8c-302a-4020-a0cc-ef89e6538976', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b649c05a-ca5e-4f1c-aa82-56238199bc29', '98cd7b8c-302a-4020-a0cc-ef89e6538976', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 11) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('aafc7c10-4d9e-48ea-a0fb-94d08918e247', '98cd7b8c-302a-4020-a0cc-ef89e6538976', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 11) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('768069ca-cb45-4fe4-a34f-1e4004a65428', '98cd7b8c-302a-4020-a0cc-ef89e6538976', 'd503371e-a85d-4eea-ad83-a91291cf4297', 6) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('fd47b17d-494c-4c20-a3d8-adfce4ab59cf', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '1d3379fc-8094-4ff3-a4c7-fea65531bacd', 'a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '25 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '25 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('bb7bea58-7afd-4a64-abd0-0fe3615799f8', 'fd47b17d-494c-4c20-a3d8-adfce4ab59cf', '684fe08e-8aeb-4069-a864-a800f0e007aa', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9aee84b4-4850-4ec0-add3-fd0a8c0aaba2', 'fd47b17d-494c-4c20-a3d8-adfce4ab59cf', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('cf7e26f2-1678-482a-a1ed-696044e20a58', 'fd47b17d-494c-4c20-a3d8-adfce4ab59cf', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b9a4a546-8386-49b0-acc2-9a2231c88c34', 'fd47b17d-494c-4c20-a3d8-adfce4ab59cf', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1189f3c2-f55a-460f-afdb-a900cfb7a056', 'fd47b17d-494c-4c20-a3d8-adfce4ab59cf', 'd503371e-a85d-4eea-ad83-a91291cf4297', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('f8c1bdb3-a729-4c42-adf7-fed075df7ea4', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '8bda2f9b-55db-4d33-a40d-f8a111e93a24', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', NULL, timestamp '2025-09-01' + interval '3 days' - interval '30 mins', timestamp '2025-09-01' + interval '3 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('33b9814c-9e96-4954-a2ce-fae3ac8c27c6', 'f8c1bdb3-a729-4c42-adf7-fed075df7ea4', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f3d5e527-8e73-4f09-a5b4-25f1a67b6d0e', 'f8c1bdb3-a729-4c42-adf7-fed075df7ea4', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a628ab90-aa0e-481a-a33e-c21b7ac36bde', 'f8c1bdb3-a729-4c42-adf7-fed075df7ea4', '2a39ada5-da79-4403-aec0-8299b6747419', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('581c6c34-1a09-4928-ab5c-f6622b0a6e26', 'f8c1bdb3-a729-4c42-adf7-fed075df7ea4', '26a1a51f-ab67-405d-a737-b184d060edb8', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('059c5a1c-679c-40ce-a2d1-037890110171', 'f8c1bdb3-a729-4c42-adf7-fed075df7ea4', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('7c49d1d0-3e42-4e36-a4c3-446f6ec1eb48', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '427540fb-9f60-4bfd-afa2-4db31ec63cd4', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', NULL, timestamp '2025-09-01' + interval '10 days' - interval '30 mins', timestamp '2025-09-01' + interval '10 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('163e156d-0ef6-48ae-a96c-833ec2b10f31', '7c49d1d0-3e42-4e36-a4c3-446f6ec1eb48', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('8221a116-8d70-4153-a887-b892194a63da', '7c49d1d0-3e42-4e36-a4c3-446f6ec1eb48', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e9b72842-2b07-4590-aa5d-cb2b54e25de7', '7c49d1d0-3e42-4e36-a4c3-446f6ec1eb48', '2a39ada5-da79-4403-aec0-8299b6747419', 14) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c02b80e8-bbcb-4810-a4d0-378490a345fb', '7c49d1d0-3e42-4e36-a4c3-446f6ec1eb48', '26a1a51f-ab67-405d-a737-b184d060edb8', 14) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9196d782-ba26-4954-ad29-063d4e125f92', '7c49d1d0-3e42-4e36-a4c3-446f6ec1eb48', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 7) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('1410b77b-2ac6-4ca7-a217-2fc1d061e108', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '22646e69-d22a-4b34-aa2b-f1323161d52d', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', NULL, timestamp '2025-09-01' + interval '7 days' - interval '30 mins', timestamp '2025-09-01' + interval '7 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('354633f0-21ee-41b9-a58b-5792d068e243', '1410b77b-2ac6-4ca7-a217-2fc1d061e108', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('02744e6e-127b-4034-aa35-978c6af26cba', '1410b77b-2ac6-4ca7-a217-2fc1d061e108', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('706c26b9-ee48-4300-ad33-31347a3a5e91', '1410b77b-2ac6-4ca7-a217-2fc1d061e108', '2a39ada5-da79-4403-aec0-8299b6747419', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('2d7c601e-9ebb-47c8-ad6d-d5c9bed3fc36', '1410b77b-2ac6-4ca7-a217-2fc1d061e108', '26a1a51f-ab67-405d-a737-b184d060edb8', 14) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('267b7db3-b002-468e-a450-8805c3b29093', '1410b77b-2ac6-4ca7-a217-2fc1d061e108', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('bd6dd32b-7b1f-461e-a342-7e96ce84dfcb', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'b37a7c3f-91c4-4a63-a51d-2b19f3bc7992', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', 'The team presented confidently but the technical contributions were thin.', timestamp '2025-09-01' + interval '6 days' - interval '30 mins', timestamp '2025-09-01' + interval '6 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e6582096-e62f-4c25-a99c-23343b9c8c8a', 'bd6dd32b-7b1f-461e-a342-7e96ce84dfcb', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6cab0ef2-74db-49d3-af70-7154a2954ecf', 'bd6dd32b-7b1f-461e-a342-7e96ce84dfcb', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('02530295-c307-4963-a566-a5ea6b494871', 'bd6dd32b-7b1f-461e-a342-7e96ce84dfcb', '2a39ada5-da79-4403-aec0-8299b6747419', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('332665e0-3baf-4f04-aa26-ea111d0f7b58', 'bd6dd32b-7b1f-461e-a342-7e96ce84dfcb', '26a1a51f-ab67-405d-a737-b184d060edb8', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('5a4dd828-6a80-4922-a2de-7d341b141cac', 'bd6dd32b-7b1f-461e-a342-7e96ce84dfcb', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('78cf7454-e8a9-47c8-a751-64faa1347c62', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '8bda2f9b-55db-4d33-a40d-f8a111e93a24', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', 'Outstanding work across all criteria. One of the strongest presentations of the day.', timestamp '2025-09-01' + interval '4 days' - interval '30 mins', timestamp '2025-09-01' + interval '4 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9f5a329d-7ecb-4b88-aaee-89166a5390d9', '78cf7454-e8a9-47c8-a751-64faa1347c62', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('012c25b6-e7cf-4887-ad3b-8a16b1d29bcf', '78cf7454-e8a9-47c8-a751-64faa1347c62', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b17d9b50-cf4b-42ab-a525-5e4afa8ef24c', '78cf7454-e8a9-47c8-a751-64faa1347c62', '2a39ada5-da79-4403-aec0-8299b6747419', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6b2fd300-8c80-45f8-ad81-43f77363872a', '78cf7454-e8a9-47c8-a751-64faa1347c62', '26a1a51f-ab67-405d-a737-b184d060edb8', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7f90189d-9306-465b-a33f-cb0696e639d3', '78cf7454-e8a9-47c8-a751-64faa1347c62', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('c1ceb90b-7815-4c20-a25f-e2e86e3cd609', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '427540fb-9f60-4bfd-afa2-4db31ec63cd4', '44e14170-d567-4ad4-a771-cd269d538a2f', 'in_progress', NULL, timestamp '2025-09-01' + interval '7 days' - interval '30 mins', timestamp '2025-09-01' + interval '7 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0b41af88-0ac0-4429-ab76-120e8e88f54c', 'c1ceb90b-7815-4c20-a25f-e2e86e3cd609', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4a63b43d-6e2d-49f9-a434-7bb812d7f0c9', 'c1ceb90b-7815-4c20-a25f-e2e86e3cd609', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 17) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('a7854549-81d0-407b-a274-bc4fa4360c4e', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'd9a0ceae-93bf-462a-a366-fa53e1c3ebbf', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', 'Excellent project — deep technical understanding and very polished delivery.', timestamp '2025-02-01' + interval '8 days' - interval '30 mins', timestamp '2025-02-01' + interval '8 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4933f303-5f0e-4175-acd6-efb5c1974d20', 'a7854549-81d0-407b-a274-bc4fa4360c4e', '53700e90-0bef-4410-aa0f-3995053ad8a2', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b8047b33-1a0e-4e19-a4fb-b3c00944625e', 'a7854549-81d0-407b-a274-bc4fa4360c4e', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b2df6094-5ee5-4d28-abf4-b818eade25b8', 'a7854549-81d0-407b-a274-bc4fa4360c4e', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('093b40b5-11d4-4053-aff1-f82c781a10f8', 'a7854549-81d0-407b-a274-bc4fa4360c4e', '770df56c-9bc9-4108-a5a9-1056b29af922', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f7784180-4657-4349-a0f3-7c5c7013599b', 'a7854549-81d0-407b-a274-bc4fa4360c4e', '36146a5d-35be-44c7-af15-a3d586386a27', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('c5158b2c-155c-424b-a3f2-d6ecf7cec6d4', '0e963024-a53f-4722-a9e0-5db7a47b4419', '8c80391d-28d5-46b2-acfe-a57c940443b9', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', 'A fair attempt. Significant improvements needed before this is production-ready.', timestamp '2025-02-01' + interval '7 days' - interval '30 mins', timestamp '2025-02-01' + interval '7 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4f7511dc-e474-4471-ab64-1132f500a04c', 'c5158b2c-155c-424b-a3f2-d6ecf7cec6d4', '53700e90-0bef-4410-aa0f-3995053ad8a2', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('12c7a60c-5d28-41c9-ad2e-3e4f29d914ac', 'c5158b2c-155c-424b-a3f2-d6ecf7cec6d4', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('2d5e108d-d281-4768-ad2e-0bb4fbe8f6a0', 'c5158b2c-155c-424b-a3f2-d6ecf7cec6d4', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 12) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4de68935-3b6d-42b3-a77a-121a428ec47f', 'c5158b2c-155c-424b-a3f2-d6ecf7cec6d4', '770df56c-9bc9-4108-a5a9-1056b29af922', 12) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1977008a-8567-464a-a2e6-b90e4d7f58ac', 'c5158b2c-155c-424b-a3f2-d6ecf7cec6d4', '36146a5d-35be-44c7-af15-a3d586386a27', 6) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('c08e3f9e-8589-4bad-a5ec-45956be01ca1', '0e963024-a53f-4722-a9e0-5db7a47b4419', '48f4e97b-1296-4486-a4f5-323d8d9a0e11', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', 'The team presented confidently but the technical contributions were thin.', timestamp '2025-02-01' + interval '9 days' - interval '30 mins', timestamp '2025-02-01' + interval '9 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0b7aa61b-d92d-4ae8-a743-d4fa3456c039', 'c08e3f9e-8589-4bad-a5ec-45956be01ca1', '53700e90-0bef-4410-aa0f-3995053ad8a2', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f46d4f08-9e7c-449f-af59-93a11ce7782b', 'c08e3f9e-8589-4bad-a5ec-45956be01ca1', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('3f15413a-e3e7-4155-a6e6-45be3c04661b', 'c08e3f9e-8589-4bad-a5ec-45956be01ca1', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f56f31e1-5a04-4c4d-adb4-a3640cb0efaf', 'c08e3f9e-8589-4bad-a5ec-45956be01ca1', '770df56c-9bc9-4108-a5a9-1056b29af922', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f7b4335f-d92d-46ff-a4df-92d74f784d46', 'c08e3f9e-8589-4bad-a5ec-45956be01ca1', '36146a5d-35be-44c7-af15-a3d586386a27', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('4880f8c1-c349-45d0-a488-9a687a14c66a', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '3b8b2e62-bc66-4c8c-ad14-371049c8204e', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', 'Well-prepared team. Minor improvements in delivery would push this to the top tier.', timestamp '2026-05-10 12:00:00' - interval '38 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '38 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4044f792-0217-4ffa-a23a-50472564c1d1', '4880f8c1-c349-45d0-a488-9a687a14c66a', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('66f17291-381d-4995-af01-9b26bbd4e244', '4880f8c1-c349-45d0-a488-9a687a14c66a', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0e4981e1-e38f-4f70-a34c-6b7470de6159', '4880f8c1-c349-45d0-a488-9a687a14c66a', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('436eb997-8ca1-4eea-a0b1-a5a782731f8b', '4880f8c1-c349-45d0-a488-9a687a14c66a', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 12) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('4ef8ee68-4295-4f40-a988-da4fa86dfaf6', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c23aa93d-d7c4-4b82-aee5-2d857b47638c', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', 'Some promising ideas but both execution and presentation need work.', timestamp '2026-05-10 12:00:00' - interval '39 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '39 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4f2304b9-778d-46f9-a2e3-a911493d3ec1', '4ef8ee68-4295-4f40-a988-da4fa86dfaf6', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 15) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('39ea118f-80f3-4870-aabc-fa0371936b00', '4ef8ee68-4295-4f40-a988-da4fa86dfaf6', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a05116ee-6cdb-4120-a082-c7bb53d9e3f4', '4ef8ee68-4295-4f40-a988-da4fa86dfaf6', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('078f5f01-3be6-4399-a802-bed37921d711', '4ef8ee68-4295-4f40-a988-da4fa86dfaf6', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 10) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('20c02fd1-af14-41ad-ac9d-be4aa685924e', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '1b122688-dc8e-467d-aa9d-16a7c8dbd1a8', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', 'Some promising ideas but both execution and presentation need work.', timestamp '2026-05-10 12:00:00' - interval '10 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '10 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('729d3d12-313b-41a6-ac58-1550ce4bf8fd', '20c02fd1-af14-41ad-ac9d-be4aa685924e', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e2d95a82-8e39-40bf-abe8-48a91222dcd5', '20c02fd1-af14-41ad-ac9d-be4aa685924e', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7d800fb8-bc78-46f3-ab1f-46f7a346a78f', '20c02fd1-af14-41ad-ac9d-be4aa685924e', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b5d98ce8-b8b7-431a-a977-69339ac7af73', '20c02fd1-af14-41ad-ac9d-be4aa685924e', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 10) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('9b97bb24-e680-496d-af85-df0c55115335', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c900eb14-5b94-461b-ac3d-f2a9075269b6', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '45 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '45 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('cc9def6c-a848-4014-aecd-5060ee797be5', '9b97bb24-e680-496d-af85-df0c55115335', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0bbb63a0-34c9-460d-aff6-597fb6af0f2c', '9b97bb24-e680-496d-af85-df0c55115335', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ce415e9a-fcb6-4014-a94d-04cf24957785', '9b97bb24-e680-496d-af85-df0c55115335', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('85701c80-783c-4bac-aba1-a303b6cdb320', '9b97bb24-e680-496d-af85-df0c55115335', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 12) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('6382882e-e820-431c-a478-ffeb31bb2ea9', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'ba5787ab-8196-4453-afd3-2e47c5185fb8', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', 'The project addresses an interesting problem.', timestamp '2026-05-10 12:00:00' - interval '38 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '38 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('40e19a93-2c08-4987-ae82-857edc6979e1', '6382882e-e820-431c-a478-ffeb31bb2ea9', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('50a00e85-7eb4-4f28-a25a-23fbc29aef86', '6382882e-e820-431c-a478-ffeb31bb2ea9', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('bba340fe-c444-433e-af85-e99412e55f9c', '6382882e-e820-431c-a478-ffeb31bb2ea9', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ea8b2f7b-31f7-4543-a73c-5ad89344d46a', '6382882e-e820-431c-a478-ffeb31bb2ea9', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 10) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('0a4c3f63-e74b-4be6-a505-2ef3533441a5', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '3b8b2e62-bc66-4c8c-ad14-371049c8204e', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '5 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '5 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('acc60c95-09da-4667-a01c-fbf0763ba0d9', '0a4c3f63-e74b-4be6-a505-2ef3533441a5', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('efd0821e-9794-42a6-a56e-5374be9f3a19', '0a4c3f63-e74b-4be6-a505-2ef3533441a5', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a20b49ae-5f01-431f-a892-b6b154969639', '0a4c3f63-e74b-4be6-a505-2ef3533441a5', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('cf1389f1-6e76-4464-a791-81cc550e7c7d', '0a4c3f63-e74b-4be6-a505-2ef3533441a5', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 12) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('c3232e15-4f1b-4491-abee-c218eb2ff50b', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c23aa93d-d7c4-4b82-aee5-2d857b47638c', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '23 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '23 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a030b131-1257-4cee-ab3f-ef98775b3791', 'c3232e15-4f1b-4491-abee-c218eb2ff50b', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('371f7d0a-14e6-4103-a33e-483ca5b6c516', 'c3232e15-4f1b-4491-abee-c218eb2ff50b', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4c0083c8-8cb9-4955-aa8c-fdc41f09a454', 'c3232e15-4f1b-4491-abee-c218eb2ff50b', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d56e79f2-d6a1-4ddb-af64-805c075b4e1e', 'c3232e15-4f1b-4491-abee-c218eb2ff50b', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 10) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('b983d43f-15a3-4b06-af01-16b4c9c67274', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '1b122688-dc8e-467d-aa9d-16a7c8dbd1a8', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'in_progress', NULL, timestamp '2026-05-10 12:00:00' - interval '47 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '47 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('909fbd59-03d2-4901-a52d-85b4666c965c', 'b983d43f-15a3-4b06-af01-16b4c9c67274', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b608d690-86ff-42d8-a948-e0d03b5ca4ed', 'b983d43f-15a3-4b06-af01-16b4c9c67274', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 20) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('037e1111-37fc-44d7-af8e-9e02cec26c83', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '3b8b2e62-bc66-4c8c-ad14-371049c8204e', 'e4550b83-b849-4977-a7b0-dc011fad64f5', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '27 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '27 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d3e8faef-028c-4af1-a744-f8ed5032769b', '037e1111-37fc-44d7-af8e-9e02cec26c83', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b308f162-23b0-42f8-a3a3-1b99deae2483', '037e1111-37fc-44d7-af8e-9e02cec26c83', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('8bc2a492-72c8-4a81-ad8f-d765f7dd25b3', '037e1111-37fc-44d7-af8e-9e02cec26c83', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7015d4d5-4f51-49f0-a99e-96de42a495e1', '037e1111-37fc-44d7-af8e-9e02cec26c83', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 11) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('f992d551-31f8-444a-a438-b1ca79b756b5', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c23aa93d-d7c4-4b82-aee5-2d857b47638c', 'e4550b83-b849-4977-a7b0-dc011fad64f5', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '4 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '4 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9b56db2f-7f26-43ba-a1c4-8746b43114bc', 'f992d551-31f8-444a-a438-b1ca79b756b5', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 15) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d5721ff9-42d0-49a9-a371-dc8a3e4fae1a', 'f992d551-31f8-444a-a438-b1ca79b756b5', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a7ab8e54-8817-407a-ab68-5a09cd5d36dd', 'f992d551-31f8-444a-a438-b1ca79b756b5', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e01d161b-562e-45e2-ac9d-c96ac166eccb', 'f992d551-31f8-444a-a438-b1ca79b756b5', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 10) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('d791f930-a78d-402f-ae89-7e4393742e81', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '1b122688-dc8e-467d-aa9d-16a7c8dbd1a8', 'e4550b83-b849-4977-a7b0-dc011fad64f5', 'submitted', 'A fair attempt. Significant improvements needed before this is production-ready.', timestamp '2026-05-10 12:00:00' - interval '37 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '37 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7bfbe90b-4673-400a-a5dc-f3dc8ed7419a', 'd791f930-a78d-402f-ae89-7e4393742e81', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 15) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('3be6b822-dabc-4dd4-a01d-4d3289da09eb', 'd791f930-a78d-402f-ae89-7e4393742e81', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a16ff2db-3089-4f2d-a2c7-24c6bf943f95', 'd791f930-a78d-402f-ae89-7e4393742e81', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('81f2c5fa-2681-48b2-a62a-43d123add7f3', 'd791f930-a78d-402f-ae89-7e4393742e81', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 10) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('e8e80131-e4fb-4f55-ac59-8467e990d624', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c900eb14-5b94-461b-ac3d-f2a9075269b6', 'e4550b83-b849-4977-a7b0-dc011fad64f5', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '30 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '30 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('74cf7cb6-00df-4c26-a44a-8023f2f4aaa5', 'e8e80131-e4fb-4f55-ac59-8467e990d624', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('77e27b69-a891-413e-abcf-4012381d7421', 'e8e80131-e4fb-4f55-ac59-8467e990d624', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ff9ad243-a758-4866-a783-2c236509eb66', 'e8e80131-e4fb-4f55-ac59-8467e990d624', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('aa62b994-281b-4017-ad18-cefb08cb64f1', 'e8e80131-e4fb-4f55-ac59-8467e990d624', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 12) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('7f2338d3-b9e1-429f-a8e1-dddb3059710c', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'ba5787ab-8196-4453-afd3-2e47c5185fb8', 'e4550b83-b849-4977-a7b0-dc011fad64f5', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '4 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '4 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('952f4fc9-689b-4aa3-a0f4-cf27805667d1', '7f2338d3-b9e1-429f-a8e1-dddb3059710c', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0b295e18-2218-4a8f-a0eb-e47c0e7c92f2', '7f2338d3-b9e1-429f-a8e1-dddb3059710c', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('113139e3-b347-401b-a2b6-ed20668d34d2', '7f2338d3-b9e1-429f-a8e1-dddb3059710c', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('3e12114f-542e-4d9d-afa3-ed3d03aec4af', '7f2338d3-b9e1-429f-a8e1-dddb3059710c', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 12) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('de2d116c-8791-42fb-ac26-0ed815b245b2', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '3b8b2e62-bc66-4c8c-ad14-371049c8204e', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', 'Competent presentation. The technical implementation is well done.', timestamp '2026-05-10 12:00:00' - interval '16 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '16 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0e433ccc-abbe-417e-a0a5-536b9b78d62f', 'de2d116c-8791-42fb-ac26-0ed815b245b2', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('3a3cf5a1-af4e-471b-adfe-345b6fcccd3c', 'de2d116c-8791-42fb-ac26-0ed815b245b2', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f381fcea-93bf-4fd9-aa59-2277202003ce', 'de2d116c-8791-42fb-ac26-0ed815b245b2', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('44fff676-85a8-428e-a4b3-6a3e3c2ce00b', 'de2d116c-8791-42fb-ac26-0ed815b245b2', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 12) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('12e5708d-c926-4dc2-a4d9-8c4b80922539', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c23aa93d-d7c4-4b82-aee5-2d857b47638c', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '15 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '15 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('2e1ceae0-a6da-4686-a642-c53cd73ac10b', '12e5708d-c926-4dc2-a4d9-8c4b80922539', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 15) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ae704dae-913d-4555-a50f-e3903d962372', '12e5708d-c926-4dc2-a4d9-8c4b80922539', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('71e392d1-24c1-42fc-aecb-2022f8cb0f3e', '12e5708d-c926-4dc2-a4d9-8c4b80922539', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('067c995e-d71b-454b-aa26-f9914eafe6fb', '12e5708d-c926-4dc2-a4d9-8c4b80922539', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('c68bbe3e-ff8f-4bb2-a151-235dbc88c1fe', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '1b122688-dc8e-467d-aa9d-16a7c8dbd1a8', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '48 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '48 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a191c8a7-18c0-4503-ad07-962f29d46520', 'c68bbe3e-ff8f-4bb2-a151-235dbc88c1fe', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('bd373892-3e83-4888-a550-1ae3964daaed', 'c68bbe3e-ff8f-4bb2-a151-235dbc88c1fe', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d9e3b330-5aa0-46c5-aca9-f3a1f657837a', 'c68bbe3e-ff8f-4bb2-a151-235dbc88c1fe', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('3960797e-a0b7-4a1a-a835-a46c650167d4', 'c68bbe3e-ff8f-4bb2-a151-235dbc88c1fe', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('c4bed2a2-a879-4389-aab3-7813482c586b', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c900eb14-5b94-461b-ac3d-f2a9075269b6', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', 'Very professional delivery; the underlying solution needs further development.', timestamp '2026-05-10 12:00:00' - interval '14 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '14 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('42108227-6969-436c-abd4-55e676251993', 'c4bed2a2-a879-4389-aab3-7813482c586b', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('cb3cd392-456d-4093-a751-065e0811ce75', 'c4bed2a2-a879-4389-aab3-7813482c586b', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4bfb8947-8074-43e4-a5e3-66e9b1b346a6', 'c4bed2a2-a879-4389-aab3-7813482c586b', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a5ca6d93-50a7-4f0e-a350-9c917b5434ac', 'c4bed2a2-a879-4389-aab3-7813482c586b', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 12) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('4a40d450-2ccd-41ea-a24e-142f7cdab834', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'ba5787ab-8196-4453-afd3-2e47c5185fb8', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', 'Adequate work overall.', timestamp '2026-05-10 12:00:00' - interval '28 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '28 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d8298aeb-2ea2-4fbc-ab25-7d891c8f3df0', '4a40d450-2ccd-41ea-a24e-142f7cdab834', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('2957acbd-e156-43be-ac77-feb088812479', '4a40d450-2ccd-41ea-a24e-142f7cdab834', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('fb2852e2-0326-4a69-a7f2-cc55bdbf5d14', '4a40d450-2ccd-41ea-a24e-142f7cdab834', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4e9c536d-8649-4398-a849-64b37e9d4428', '4a40d450-2ccd-41ea-a24e-142f7cdab834', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 10) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('41d6c0a0-57f1-40e0-afb8-59cd1d7d51fa', '308d2708-dbea-41b6-a1c8-da6129445759', 'b6718b6b-02a8-444b-a8ec-ff82aad1b946', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', 'Competent presentation. The technical implementation is well done.', timestamp '2025-06-01' + interval '8 days' - interval '30 mins', timestamp '2025-06-01' + interval '8 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7d69a1eb-7dc5-4105-aaf3-77a024aeaf09', '41d6c0a0-57f1-40e0-afb8-59cd1d7d51fa', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b4328c91-3679-40f7-a8d3-2fcf57435dbb', '41d6c0a0-57f1-40e0-afb8-59cd1d7d51fa', '9291055e-e458-479e-a0de-bd69595777ff', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('3d41df4b-7ffa-41ec-ac7a-d8c6c5cbd094', '41d6c0a0-57f1-40e0-afb8-59cd1d7d51fa', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f22d4ffa-d689-4bbc-a242-bd3f2cd918be', '41d6c0a0-57f1-40e0-afb8-59cd1d7d51fa', '34e60116-c678-4d43-a5a3-6ed510928812', 12) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('b838556c-b45e-4fbb-a162-083ad73c0fc9', '308d2708-dbea-41b6-a1c8-da6129445759', '75baa7d0-6001-4420-a744-5b46e6483201', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', 'Competent presentation. The technical implementation is well done.', timestamp '2025-06-01' + interval '5 days' - interval '30 mins', timestamp '2025-06-01' + interval '5 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('16488eea-1526-4b6c-aee8-15cf50bde14e', 'b838556c-b45e-4fbb-a162-083ad73c0fc9', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('8a9a6794-4317-4ba2-add7-ce9835292787', 'b838556c-b45e-4fbb-a162-083ad73c0fc9', '9291055e-e458-479e-a0de-bd69595777ff', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('aa166353-aade-4df8-af64-26cb239a4373', 'b838556c-b45e-4fbb-a162-083ad73c0fc9', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c032fc97-fcd2-4388-af9d-b7ab69acecd6', 'b838556c-b45e-4fbb-a162-083ad73c0fc9', '34e60116-c678-4d43-a5a3-6ed510928812', 12) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('780ea508-7646-4d90-ae90-16f9d083e80a', '308d2708-dbea-41b6-a1c8-da6129445759', '35607ef7-b333-4b5b-aa1a-e7ebd1a57d32', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', NULL, timestamp '2025-06-01' + interval '6 days' - interval '30 mins', timestamp '2025-06-01' + interval '6 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('bd3632ca-9d39-40b1-afd0-449af15b29e8', '780ea508-7646-4d90-ae90-16f9d083e80a', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('302370b3-c6f0-4e3b-a558-48d238c44e78', '780ea508-7646-4d90-ae90-16f9d083e80a', '9291055e-e458-479e-a0de-bd69595777ff', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4b367f3b-198a-45dc-aaf7-e764d55c252e', '780ea508-7646-4d90-ae90-16f9d083e80a', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('407ce12f-cbef-4728-a553-b85b91ae2e9c', '780ea508-7646-4d90-ae90-16f9d083e80a', '34e60116-c678-4d43-a5a3-6ed510928812', 11) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('1639fcc1-a9b0-4f27-a42f-d2635d048acf', '308d2708-dbea-41b6-a1c8-da6129445759', 'accfb911-acf9-481e-a167-d4ba6eaa9aaa', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', NULL, timestamp '2025-06-01' + interval '6 days' - interval '30 mins', timestamp '2025-06-01' + interval '6 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ef18de2c-1111-4fef-a537-abc58640fa5c', '1639fcc1-a9b0-4f27-a42f-d2635d048acf', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('050c2972-b1d9-4e0b-a049-6dc147ca36fc', '1639fcc1-a9b0-4f27-a42f-d2635d048acf', '9291055e-e458-479e-a0de-bd69595777ff', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('8c054c63-c0c1-4365-ac38-bdd1cc520693', '1639fcc1-a9b0-4f27-a42f-d2635d048acf', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e757a73b-89f1-4845-ada8-32013a403a18', '1639fcc1-a9b0-4f27-a42f-d2635d048acf', '34e60116-c678-4d43-a5a3-6ed510928812', 11) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('ab7a3f33-f75b-460d-a427-c34e5ef80388', '308d2708-dbea-41b6-a1c8-da6129445759', 'b6718b6b-02a8-444b-a8ec-ff82aad1b946', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'submitted', 'Reliable work. The written report was particularly well organized.', timestamp '2025-06-01' + interval '2 days' - interval '30 mins', timestamp '2025-06-01' + interval '2 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('fadac081-26f4-473d-adae-cc133380ea52', 'ab7a3f33-f75b-460d-a427-c34e5ef80388', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ed2baa65-4a51-4d3d-a475-51e6fa857804', 'ab7a3f33-f75b-460d-a427-c34e5ef80388', '9291055e-e458-479e-a0de-bd69595777ff', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('30349328-5b3d-49b4-a8c5-5869a4e72cac', 'ab7a3f33-f75b-460d-a427-c34e5ef80388', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('907a1f25-1d6c-49d1-a11c-6ec54c2719b8', 'ab7a3f33-f75b-460d-a427-c34e5ef80388', '34e60116-c678-4d43-a5a3-6ed510928812', 11) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('291443d7-0467-4b7a-aa28-51de2df77b0b', '308d2708-dbea-41b6-a1c8-da6129445759', '75baa7d0-6001-4420-a744-5b46e6483201', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'in_progress', NULL, timestamp '2025-06-01' + interval '8 days' - interval '30 mins', timestamp '2025-06-01' + interval '8 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('fb926993-c5f3-4e69-a731-d0a20fbd175b', '291443d7-0467-4b7a-aa28-51de2df77b0b', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0bb49657-13de-424b-afa6-a9378ebdb473', '291443d7-0467-4b7a-aa28-51de2df77b0b', '9291055e-e458-479e-a0de-bd69595777ff', 23) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('27dcd140-0ff2-4ed0-ab07-86e2444505d7', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '4edc653f-c0e7-4217-aca1-1c827f8204aa', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', 'A fair attempt. Significant improvements needed before this is production-ready.', timestamp '2024-06-01' + interval '9 days' - interval '30 mins', timestamp '2024-06-01' + interval '9 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('080da9fd-a182-452d-ac70-9488f1a3378f', '27dcd140-0ff2-4ed0-ab07-86e2444505d7', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('de5c5e93-596e-4205-afb0-75261091dbb0', '27dcd140-0ff2-4ed0-ab07-86e2444505d7', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('d89098af-815a-4e17-ae92-0e630946a7f7', '27dcd140-0ff2-4ed0-ab07-86e2444505d7', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('61be3a3f-2520-43f2-aecd-adb9391e7887', '27dcd140-0ff2-4ed0-ab07-86e2444505d7', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 9) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('5f51874b-fbf7-46f7-a6c2-60b0aa5619f0', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'fd4bc2a1-e69b-4bf2-aab4-5f2da12927de', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', NULL, timestamp '2024-06-01' + interval '7 days' - interval '30 mins', timestamp '2024-06-01' + interval '7 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7c677a1a-cbe2-4d33-a380-c301fc510723', '5f51874b-fbf7-46f7-a6c2-60b0aa5619f0', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9feb7000-5fa6-4ea4-a249-589b8a98df31', '5f51874b-fbf7-46f7-a6c2-60b0aa5619f0', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f29f9a35-6b23-4841-a607-c8c2709f2b5a', '5f51874b-fbf7-46f7-a6c2-60b0aa5619f0', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 23) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a2344dee-a6fd-4121-a597-f5c84a8b7172', '5f51874b-fbf7-46f7-a6c2-60b0aa5619f0', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 12) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('6208ea3b-adc2-41f3-a930-a5da4321ab8b', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '649be1eb-a461-4e57-a8b9-29849257408f', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', 'Average performance overall. Needs stronger technical grounding.', timestamp '2024-06-01' + interval '3 days' - interval '30 mins', timestamp '2024-06-01' + interval '3 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('13680c9f-f953-463f-a3a1-cbb4be8ff409', '6208ea3b-adc2-41f3-a930-a5da4321ab8b', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('2e0aed29-f3f9-49ba-ad6e-afbbb31400fd', '6208ea3b-adc2-41f3-a930-a5da4321ab8b', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b9be90ec-b12a-46ae-ae1c-bf0acb14d6de', '6208ea3b-adc2-41f3-a930-a5da4321ab8b', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6136bdcb-17bf-4df6-ad6d-0b73144f9562', '6208ea3b-adc2-41f3-a930-a5da4321ab8b', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 8) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('277e1343-1de8-4703-a3c0-a51f6062e531', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'f4f0ede3-01c4-46a1-a477-acd42790683e', 'a49b6b5e-f40d-48f6-a398-87b85bbff743', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '31 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '31 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ec03f7c2-8274-49d8-a0d8-74a5fe7f43d6', '277e1343-1de8-4703-a3c0-a51f6062e531', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ae570d90-4410-42a1-aec0-9d9706925a3c', '277e1343-1de8-4703-a3c0-a51f6062e531', '3ceed4da-6045-435f-aaa5-f08cafe18240', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('becee7fb-0e67-45df-a94d-8dd5c403bd11', '277e1343-1de8-4703-a3c0-a51f6062e531', '656fac7d-722f-4b52-aeb7-b36115296682', 16) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('2c3426b2-817b-43e5-ae20-e47fc4ef35a6', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'f5c97d0e-9bca-4e0b-a17d-a75193ef0082', 'a49b6b5e-f40d-48f6-a398-87b85bbff743', 'submitted', 'Excellent project — deep technical understanding and very polished delivery.', timestamp '2026-05-10 12:00:00' - interval '8 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '8 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c6f13bf3-5a7c-4729-acb7-8f84b725eee1', '2c3426b2-817b-43e5-ae20-e47fc4ef35a6', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 32) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('bb3049b9-c419-46f4-af44-fb4f8dbebff6', '2c3426b2-817b-43e5-ae20-e47fc4ef35a6', '3ceed4da-6045-435f-aaa5-f08cafe18240', 36) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7134e4dd-70d2-4365-aab9-3c799d50cf32', '2c3426b2-817b-43e5-ae20-e47fc4ef35a6', '656fac7d-722f-4b52-aeb7-b36115296682', 22) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('03b13f03-f8f7-460c-aaaf-253ba946d8bb', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '836703c7-94e5-4e9c-a1f4-c9aeca526cd1', 'a49b6b5e-f40d-48f6-a398-87b85bbff743', 'submitted', 'Some promising ideas but both execution and presentation need work.', timestamp '2026-05-10 12:00:00' - interval '25 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '25 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('addad4cb-0dfb-4118-af6f-3a38749a891e', '03b13f03-f8f7-460c-aaaf-253ba946d8bb', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('802e4296-51a5-447b-ad55-7dedf186411c', '03b13f03-f8f7-460c-aaaf-253ba946d8bb', '3ceed4da-6045-435f-aaa5-f08cafe18240', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('19ec5f09-63f2-495f-ad95-ca9fa3b2b1a0', '03b13f03-f8f7-460c-aaaf-253ba946d8bb', '656fac7d-722f-4b52-aeb7-b36115296682', 15) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('6da5cb40-a55f-4cc5-a20b-6bec4fd01564', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '202b2597-5a44-4ae0-a6a5-4834870f87d0', 'a49b6b5e-f40d-48f6-a398-87b85bbff743', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '7 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '7 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1520563d-e1a8-45f5-ae0a-5b0a42c916c8', '6da5cb40-a55f-4cc5-a20b-6bec4fd01564', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('296621d8-785a-45b3-a143-4c8bd33962fc', '6da5cb40-a55f-4cc5-a20b-6bec4fd01564', '3ceed4da-6045-435f-aaa5-f08cafe18240', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('bb69932b-51f3-4424-abb1-c71d802e34d4', '6da5cb40-a55f-4cc5-a20b-6bec4fd01564', '656fac7d-722f-4b52-aeb7-b36115296682', 17) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('3eb1d8ec-ddf7-4719-a6b8-e7d9fef7061d', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'f4f0ede3-01c4-46a1-a477-acd42790683e', '9ff6ca95-c216-42cd-a63f-1e58b1756cf2', 'submitted', 'Average performance overall. Needs stronger technical grounding.', timestamp '2026-05-10 12:00:00' - interval '32 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '32 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('bc2f88c5-f891-453c-a87a-464b26f686b0', '3eb1d8ec-ddf7-4719-a6b8-e7d9fef7061d', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('47d63066-0bf1-45bd-a610-c2aa8c8b769a', '3eb1d8ec-ddf7-4719-a6b8-e7d9fef7061d', '3ceed4da-6045-435f-aaa5-f08cafe18240', 26) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('220af788-93c8-4231-a00d-0ef44b2ab9c0', '3eb1d8ec-ddf7-4719-a6b8-e7d9fef7061d', '656fac7d-722f-4b52-aeb7-b36115296682', 17) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('0f7de066-54f6-470d-ad7d-264732d1486d', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'f5c97d0e-9bca-4e0b-a17d-a75193ef0082', '9ff6ca95-c216-42cd-a63f-1e58b1756cf2', 'in_progress', NULL, timestamp '2026-05-10 12:00:00' - interval '8 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '8 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7963f88c-108e-4100-adfd-deaf413e3e1c', '0f7de066-54f6-470d-ad7d-264732d1486d', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 32) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('3f2ff272-b6c3-4189-a47c-95b6c2f45ff4', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'f4f0ede3-01c4-46a1-a477-acd42790683e', '15c5c11f-a19f-48f7-aa39-92872d8a1a00', 'submitted', 'The project meets minimum requirements but could use further development.', timestamp '2026-05-10 12:00:00' - interval '38 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '38 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4760a40f-fbc7-42a8-ae2f-0bf1cf7264c3', '3f2ff272-b6c3-4189-a47c-95b6c2f45ff4', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('45d188bc-408d-46ea-aa00-7de045cd7e0f', '3f2ff272-b6c3-4189-a47c-95b6c2f45ff4', '3ceed4da-6045-435f-aaa5-f08cafe18240', 26) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6c3e7327-964f-4479-ac25-69d1c6b58994', '3f2ff272-b6c3-4189-a47c-95b6c2f45ff4', '656fac7d-722f-4b52-aeb7-b36115296682', 15) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('6e48d713-91f9-4272-af53-0b32bee16253', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'f5c97d0e-9bca-4e0b-a17d-a75193ef0082', '15c5c11f-a19f-48f7-aa39-92872d8a1a00', 'submitted', 'Exceptional overall. The prototype was working flawlessly during the demo.', timestamp '2026-05-10 12:00:00' - interval '41 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '41 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c372ce6f-3991-4cb2-ae6f-bcbf20d92094', '6e48d713-91f9-4272-af53-0b32bee16253', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 30) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('67d29f2d-0928-41b2-acce-3c88261f084f', '6e48d713-91f9-4272-af53-0b32bee16253', '3ceed4da-6045-435f-aaa5-f08cafe18240', 36) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0cf1ea92-9a3c-4778-acd6-94d73a8c51b6', '6e48d713-91f9-4272-af53-0b32bee16253', '656fac7d-722f-4b52-aeb7-b36115296682', 23) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('2de33b49-4883-4048-a59c-ff455feee07c', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '836703c7-94e5-4e9c-a1f4-c9aeca526cd1', '15c5c11f-a19f-48f7-aa39-92872d8a1a00', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '40 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '40 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('31324081-c650-42fc-a623-8941e5ef8715', '2de33b49-4883-4048-a59c-ff455feee07c', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4703e03a-3bb1-425a-a9d1-d21b7ce83982', '2de33b49-4883-4048-a59c-ff455feee07c', '3ceed4da-6045-435f-aaa5-f08cafe18240', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('fa931318-db53-45cc-ac34-0110fa37069d', '2de33b49-4883-4048-a59c-ff455feee07c', '656fac7d-722f-4b52-aeb7-b36115296682', 14) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('29d10c98-5dc6-4e01-a307-f58fde926d19', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '202b2597-5a44-4ae0-a6a5-4834870f87d0', '15c5c11f-a19f-48f7-aa39-92872d8a1a00', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '41 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '41 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a14dbcd4-3a4a-400c-a66a-c2f3decb556a', '29d10c98-5dc6-4e01-a307-f58fde926d19', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0af02eb0-97fa-4aa6-a71e-189293111059', '29d10c98-5dc6-4e01-a307-f58fde926d19', '3ceed4da-6045-435f-aaa5-f08cafe18240', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c4c94fe6-2eaf-4fb1-ad88-1b95c9fb1071', '29d10c98-5dc6-4e01-a307-f58fde926d19', '656fac7d-722f-4b52-aeb7-b36115296682', 15) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('7ecee3ab-15a6-42e3-a36c-e24c603f7eb3', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'a426a611-7b78-434d-a881-aa71b5849acb', 'a49b6b5e-f40d-48f6-a398-87b85bbff743', 'submitted', 'This team stood out. Well-structured, well-presented, and technically sound.', timestamp '2025-06-01' + interval '6 days' - interval '30 mins', timestamp '2025-06-01' + interval '6 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('62545c81-fe49-4db3-a894-8fae726e0fe6', '7ecee3ab-15a6-42e3-a36c-e24c603f7eb3', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 32) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('54d65366-8242-4eae-aa1c-6d2163718e93', '7ecee3ab-15a6-42e3-a36c-e24c603f7eb3', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 38) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b9571ac0-9e19-4db4-affe-9ad9753fd640', '7ecee3ab-15a6-42e3-a36c-e24c603f7eb3', 'e1076839-63e0-4033-aa0d-4dde565034ea', 23) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('e5953413-dcc2-4a7f-a258-3cdc393e6cf1', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '399c8138-c254-4cc4-a305-be9db396f5be', 'a49b6b5e-f40d-48f6-a398-87b85bbff743', 'submitted', NULL, timestamp '2025-06-01' + interval '7 days' - interval '30 mins', timestamp '2025-06-01' + interval '7 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('32bb9c6a-8c30-47b9-ad47-202137f204fd', 'e5953413-dcc2-4a7f-a258-3cdc393e6cf1', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7a636cad-2467-4f84-a560-dc109cbc504a', 'e5953413-dcc2-4a7f-a258-3cdc393e6cf1', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 28) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a683a5e1-ba77-406e-ac34-b6106bd83404', 'e5953413-dcc2-4a7f-a258-3cdc393e6cf1', 'e1076839-63e0-4033-aa0d-4dde565034ea', 17) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('bdd6bfb6-400d-4977-a003-85ed884edcd6', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'f70484ca-9482-441b-a0f1-a51bd61a5693', 'a49b6b5e-f40d-48f6-a398-87b85bbff743', 'submitted', 'This team stood out. Well-structured, well-presented, and technically sound.', timestamp '2025-06-01' + interval '7 days' - interval '30 mins', timestamp '2025-06-01' + interval '7 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('603f6e4e-ecf2-4a2f-abfd-4651e0037d28', 'bdd6bfb6-400d-4977-a003-85ed884edcd6', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 32) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6e4cf1c9-c852-4afa-ae87-3fcf58a32bb3', 'bdd6bfb6-400d-4977-a003-85ed884edcd6', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 38) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('5b0dbfac-e22f-4d47-a1e2-583926431ed7', 'bdd6bfb6-400d-4977-a003-85ed884edcd6', 'e1076839-63e0-4033-aa0d-4dde565034ea', 22) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('c7be3300-240b-4700-adc4-5273f37b559c', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'a426a611-7b78-434d-a881-aa71b5849acb', '9ff6ca95-c216-42cd-a63f-1e58b1756cf2', 'in_progress', NULL, timestamp '2025-06-01' + interval '2 days' - interval '30 mins', timestamp '2025-06-01' + interval '2 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4a22ba07-53c9-4708-a01a-94ae0584c957', 'c7be3300-240b-4700-adc4-5273f37b559c', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 30) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('44c69011-6ce1-4a48-ab10-43c86adc76d7', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'bd7220da-b4dd-4ddc-acbc-cac1d9491475', 'a49b6b5e-f40d-48f6-a398-87b85bbff743', 'submitted', NULL, timestamp '2024-06-01' + interval '5 days' - interval '30 mins', timestamp '2024-06-01' + interval '5 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('2f71da94-41a5-4372-adf1-ccdd7eb8a57e', '44c69011-6ce1-4a48-ab10-43c86adc76d7', '37ec86c1-bd1d-4155-a442-a1454ef973c5', 28) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('9457814b-75be-4922-adc7-6f5ef63593ce', '44c69011-6ce1-4a48-ab10-43c86adc76d7', '3ac872ec-e845-4aec-a4e4-c27376aa77e8', 32) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('35be1ddb-1a7a-4a27-a493-1b8f57528fae', '44c69011-6ce1-4a48-ab10-43c86adc76d7', '795dd7aa-24c7-44df-acd2-44dbb529189c', 18) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('eecb17bb-94ff-46bf-ad58-5e8f4dbcbdb7', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'f5a78224-c079-428b-a9be-b4ab0c8d0f38', 'a49b6b5e-f40d-48f6-a398-87b85bbff743', 'submitted', NULL, timestamp '2024-06-01' + interval '5 days' - interval '30 mins', timestamp '2024-06-01' + interval '5 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('86fa7bee-b29c-4944-a3f0-9b70e7f016fd', 'eecb17bb-94ff-46bf-ad58-5e8f4dbcbdb7', '37ec86c1-bd1d-4155-a442-a1454ef973c5', 28) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6776bf94-64c9-46ae-a34d-fcee4ed618be', 'eecb17bb-94ff-46bf-ad58-5e8f4dbcbdb7', '3ac872ec-e845-4aec-a4e4-c27376aa77e8', 31) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7f3b4a9e-8dce-4c52-a820-7b1a7fa0a140', 'eecb17bb-94ff-46bf-ad58-5e8f4dbcbdb7', '795dd7aa-24c7-44df-acd2-44dbb529189c', 18) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('75cbfe99-9a20-4579-aa9a-fcae2d92f821', '6c44b363-4522-4cad-a251-06484b72b164', '7c08441a-9b1c-43b1-ab4b-a6d204c8f90d', 'f106ca15-dc12-414f-ac41-0b361db08f95', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '6 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '6 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1ca2e6f2-6f3d-454f-afc5-9d96f6d27b3a', '75cbfe99-9a20-4579-aa9a-fcae2d92f821', 'bef0ee60-1170-401b-a860-190ae7af1d01', 28) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('494c7634-30cb-41b8-a933-899fa0e76dae', '75cbfe99-9a20-4579-aa9a-fcae2d92f821', '14b446ba-82d2-4360-a0d5-3d650c766907', 39) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('38f844a1-4f7c-41bc-a716-0783f8f7cc4c', '75cbfe99-9a20-4579-aa9a-fcae2d92f821', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 29) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('bb7bb81d-2c7c-44f5-ab33-1e59e7a4a1c6', '6c44b363-4522-4cad-a251-06484b72b164', 'ca11e01d-82af-4055-aa03-4640780aa91b', 'f106ca15-dc12-414f-ac41-0b361db08f95', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '43 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '43 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('fcd1369b-6a06-4afe-a4d7-3f71952bb2c5', 'bb7bb81d-2c7c-44f5-ab33-1e59e7a4a1c6', 'bef0ee60-1170-401b-a860-190ae7af1d01', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4612e8f3-e9aa-4c24-ab2c-bd468fa094e9', 'bb7bb81d-2c7c-44f5-ab33-1e59e7a4a1c6', '14b446ba-82d2-4360-a0d5-3d650c766907', 22) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('3ae15a1a-c676-4a7a-a2e9-148296939ab7', 'bb7bb81d-2c7c-44f5-ab33-1e59e7a4a1c6', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 25) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('6ff69422-f96c-4e25-a222-22a935c482ca', '6c44b363-4522-4cad-a251-06484b72b164', 'f587f2b0-2c8e-40bc-ac05-182f1d07cf58', 'f106ca15-dc12-414f-ac41-0b361db08f95', 'submitted', 'Solid engineering. The team handled the Q&A confidently.', timestamp '2026-05-10 12:00:00' - interval '16 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '16 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('2c3be67c-850d-4608-ab33-4f6c6c2c152d', '6ff69422-f96c-4e25-a222-22a935c482ca', 'bef0ee60-1170-401b-a860-190ae7af1d01', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('fa1a20e5-adc7-463d-a06f-e5ce4d594312', '6ff69422-f96c-4e25-a222-22a935c482ca', '14b446ba-82d2-4360-a0d5-3d650c766907', 32) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('2e8240a6-46b0-40a3-ae4e-feecc9199954', '6ff69422-f96c-4e25-a222-22a935c482ca', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 22) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('b3c1a82a-a72e-48f8-a579-713decdcfcc2', '6c44b363-4522-4cad-a251-06484b72b164', '32f1ec66-89dc-49f5-a867-7ec816ff6d07', 'f106ca15-dc12-414f-ac41-0b361db08f95', 'submitted', 'Exceptional overall. The prototype was working flawlessly during the demo.', timestamp '2026-05-10 12:00:00' - interval '7 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '7 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('720e00dd-3416-464f-abc3-f284b229ca0d', 'b3c1a82a-a72e-48f8-a579-713decdcfcc2', 'bef0ee60-1170-401b-a860-190ae7af1d01', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6faa7319-3372-4f3a-a589-5903db042d9f', 'b3c1a82a-a72e-48f8-a579-713decdcfcc2', '14b446ba-82d2-4360-a0d5-3d650c766907', 36) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e4f4394c-ec9e-412a-a7ba-6486728ae434', 'b3c1a82a-a72e-48f8-a579-713decdcfcc2', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 27) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('cf8d04ab-1d74-47e7-ae8e-709356777ebd', '6c44b363-4522-4cad-a251-06484b72b164', '7c08441a-9b1c-43b1-ab4b-a6d204c8f90d', '2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', 'submitted', NULL, timestamp '2026-05-10 12:00:00' - interval '5 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '5 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e3e7c8a6-a4be-4358-abcf-cea65195f22c', 'cf8d04ab-1d74-47e7-ae8e-709356777ebd', 'bef0ee60-1170-401b-a860-190ae7af1d01', 26) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a6394905-2fc6-48fa-a075-c34c41264d92', 'cf8d04ab-1d74-47e7-ae8e-709356777ebd', '14b446ba-82d2-4360-a0d5-3d650c766907', 38) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('eb4e84ce-4143-4572-a1ee-431c725c5bc7', 'cf8d04ab-1d74-47e7-ae8e-709356777ebd', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 28) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('37010bdd-58b6-4b0d-a160-b233e2c177d6', '6c44b363-4522-4cad-a251-06484b72b164', 'ca11e01d-82af-4055-aa03-4640780aa91b', '2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', 'in_progress', NULL, timestamp '2026-05-10 12:00:00' - interval '30 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '30 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('2f919106-5835-4832-aab3-6c1643df642f', '37010bdd-58b6-4b0d-a160-b233e2c177d6', 'bef0ee60-1170-401b-a860-190ae7af1d01', 25) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('7979f968-9a86-418f-a23a-7428a654f635', '318124ea-8614-4355-ad48-2486524dfc13', '558f6b14-f11f-4dc3-ad37-c9041ad4e145', 'f106ca15-dc12-414f-ac41-0b361db08f95', 'submitted', 'The project addresses an interesting problem.', timestamp '2025-06-01' + interval '9 days' - interval '30 mins', timestamp '2025-06-01' + interval '9 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e69eb9d0-8d54-4a4a-a70c-82a738ea39f7', '7979f968-9a86-418f-a23a-7428a654f635', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4580ccc7-b361-42c4-ad93-c02803808968', '7979f968-9a86-418f-a23a-7428a654f635', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', 26) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('66a9dd5b-db72-47bc-a5e7-6493605ab7ea', '7979f968-9a86-418f-a23a-7428a654f635', '364bedf6-a50f-425c-aa45-3567c85d5ff8', 22) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('a926c8fa-ca08-49bb-a6d5-d3ade6ce4ca3', '318124ea-8614-4355-ad48-2486524dfc13', 'e970c78e-aaff-43ef-a236-77caf54b07ce', 'f106ca15-dc12-414f-ac41-0b361db08f95', 'submitted', NULL, timestamp '2025-06-01' + interval '2 days' - interval '30 mins', timestamp '2025-06-01' + interval '2 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c27c19e3-2101-45db-a991-2c4ea395dfc7', 'a926c8fa-ca08-49bb-a6d5-d3ade6ce4ca3', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 27) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('63e8fb8d-d793-4195-a218-8122f0922ba0', 'a926c8fa-ca08-49bb-a6d5-d3ade6ce4ca3', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', 39) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('542d83f1-7776-4f68-a409-b74e31a1840a', 'a926c8fa-ca08-49bb-a6d5-d3ade6ce4ca3', '364bedf6-a50f-425c-aa45-3567c85d5ff8', 26) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('5b354c08-e00e-4831-ad92-68588dcb1df5', '318124ea-8614-4355-ad48-2486524dfc13', '9c450cf6-cae4-4390-a3ed-12f231962d02', 'f106ca15-dc12-414f-ac41-0b361db08f95', 'submitted', NULL, timestamp '2025-06-01' + interval '6 days' - interval '30 mins', timestamp '2025-06-01' + interval '6 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('35b6113f-6432-4690-a6aa-2f9965a4288b', '5b354c08-e00e-4831-ad92-68588dcb1df5', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('51618d1b-abd2-4d04-a530-4260de0fa6ec', '5b354c08-e00e-4831-ad92-68588dcb1df5', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', 26) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6fab7807-c9ee-480f-a077-79f872e06744', '5b354c08-e00e-4831-ad92-68588dcb1df5', '364bedf6-a50f-425c-aa45-3567c85d5ff8', 17) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('66d56768-6bed-469b-aa4c-e14bed9e745c', '318124ea-8614-4355-ad48-2486524dfc13', '558f6b14-f11f-4dc3-ad37-c9041ad4e145', '2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', 'in_progress', NULL, timestamp '2025-06-01' + interval '3 days' - interval '30 mins', timestamp '2025-06-01' + interval '3 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c2a83631-5a8a-4e48-a791-12cc60cd8dd8', '66d56768-6bed-469b-aa4c-e14bed9e745c', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 25) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('fc4b0e1c-c967-4e70-a84f-c35b5a11f8a4', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '55964658-c936-45e8-ae7c-bccdb9dcfb20', 'f106ca15-dc12-414f-ac41-0b361db08f95', 'submitted', 'Reasonable effort. Some areas need more polish.', timestamp '2024-06-01' + interval '5 days' - interval '30 mins', timestamp '2024-06-01' + interval '5 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('5c5902bc-55e6-4e22-a2a7-c566ff808bcb', 'fc4b0e1c-c967-4e70-a84f-c35b5a11f8a4', 'ba64aea1-ea3d-4194-a943-072cecebe7da', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6c1d62b3-a4c7-4e45-a7d2-4b85fa2ff9c8', 'fc4b0e1c-c967-4e70-a84f-c35b5a11f8a4', '98470b72-67ab-4567-a032-60878aa519ac', 29) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('18796fa9-0c23-4f4c-ad1e-0790f8860bcc', 'fc4b0e1c-c967-4e70-a84f-c35b5a11f8a4', '4ed2d550-6e1d-445e-a788-36a46c491f1a', 24) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('7d0a4a3e-55ad-496b-ab42-442331ed2cac', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', 'bc3fe67d-937f-4744-ae90-a19293fc5d5c', 'f106ca15-dc12-414f-ac41-0b361db08f95', 'submitted', 'Adequate work overall.', timestamp '2024-06-01' + interval '8 days' - interval '30 mins', timestamp '2024-06-01' + interval '8 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b69b13fe-951d-40cc-a780-10e4401c016c', '7d0a4a3e-55ad-496b-ab42-442331ed2cac', 'ba64aea1-ea3d-4194-a943-072cecebe7da', 20) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c398c107-f8b1-4b2d-ac9e-41ad1d2f7573', '7d0a4a3e-55ad-496b-ab42-442331ed2cac', '98470b72-67ab-4567-a032-60878aa519ac', 29) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('cf103c02-09df-445d-adb3-7747f35537ca', '7d0a4a3e-55ad-496b-ab42-442331ed2cac', '4ed2d550-6e1d-445e-a788-36a46c491f1a', 22) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('15169228-0e59-478c-aeb7-a8712f8d9f17', '47979751-163d-48b3-ae56-a65586d18f1b', '7409c3d5-b62b-487e-aa60-8be8b736f7d9', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', 'Competent presentation. The technical implementation is well done.', timestamp '2026-05-10 12:00:00' - interval '9 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '9 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1e377d5a-c116-46dd-a7e0-2a6139d6aa8a', '15169228-0e59-478c-aeb7-a8712f8d9f17', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 15) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ae571925-c687-4948-a83f-5b1f7492604e', '15169228-0e59-478c-aeb7-a8712f8d9f17', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 28) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a2259566-8a02-47b3-acb8-10d86d6bfdf5', '15169228-0e59-478c-aeb7-a8712f8d9f17', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('32115ebd-b403-4ca8-aa61-b138b04061ce', '15169228-0e59-478c-aeb7-a8712f8d9f17', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 16) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('d3eab466-95e1-4d2d-ada7-79a13d63af95', '47979751-163d-48b3-ae56-a65586d18f1b', 'd812e821-9cf5-4042-ae7b-7b45b9a7b922', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', 'The project addresses an interesting problem.', timestamp '2026-05-10 12:00:00' - interval '37 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '37 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('feef8954-4b82-4c38-afca-9c0c82e9c1b4', 'd3eab466-95e1-4d2d-ada7-79a13d63af95', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 13) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4a41be9a-7def-4c6e-abd1-c61ed047265f', 'd3eab466-95e1-4d2d-ada7-79a13d63af95', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 26) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e497c440-646d-43c8-a9af-e52418eb311a', 'd3eab466-95e1-4d2d-ada7-79a13d63af95', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ea0a8da1-58f8-4f95-a35f-1acdfc1c2dbd', 'd3eab466-95e1-4d2d-ada7-79a13d63af95', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 14) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('e56ae082-eaaa-4871-a16f-6ff4c0738538', '47979751-163d-48b3-ae56-a65586d18f1b', 'e3603c93-8069-4824-afa0-10fe733475e3', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', 'Good solid work. A few rough edges but a strong submission overall.', timestamp '2026-05-10 12:00:00' - interval '10 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '10 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('cb55654d-36d1-49e8-ac11-60653ff58f4c', 'e56ae082-eaaa-4871-a16f-6ff4c0738538', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 15) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a03e7809-d54d-4315-a133-3868b952a2d4', 'e56ae082-eaaa-4871-a16f-6ff4c0738538', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a937c336-c29b-4c8f-a4db-3dc551a703e7', 'e56ae082-eaaa-4871-a16f-6ff4c0738538', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('80073794-443e-4765-a53f-0a2351acaf64', 'e56ae082-eaaa-4871-a16f-6ff4c0738538', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 15) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('1fc8b7d2-e0d4-4fbf-afd4-d8967b11a211', '47979751-163d-48b3-ae56-a65586d18f1b', '851c3941-dfa8-4feb-ae26-c58965626732', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', 'Adequate work overall.', timestamp '2026-05-10 12:00:00' - interval '24 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '24 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4098bfee-61a0-40ae-adc1-188658efe65a', '1fc8b7d2-e0d4-4fbf-afd4-d8967b11a211', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 14) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('06a0feda-bd27-4f21-afcc-af6b484b1750', '1fc8b7d2-e0d4-4fbf-afd4-d8967b11a211', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 26) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('031d368b-8ec7-43fd-aa2e-74065ab83818', '1fc8b7d2-e0d4-4fbf-afd4-d8967b11a211', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('459ac781-ce44-42ca-aa94-92c640be34c0', '1fc8b7d2-e0d4-4fbf-afd4-d8967b11a211', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 13) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('20bcdf28-c581-4565-a13f-7eb39e66faca', '47979751-163d-48b3-ae56-a65586d18f1b', '7409c3d5-b62b-487e-aa60-8be8b736f7d9', '4f32d322-afb7-4042-a9d1-ce0c17a09a30', 'submitted', 'Reliable work. The written report was particularly well organized.', timestamp '2026-05-10 12:00:00' - interval '25 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '25 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1224c3bb-2202-4c44-acbb-1e462d2906c6', '20bcdf28-c581-4565-a13f-7eb39e66faca', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 15) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6b54a77e-a0ae-494b-aed3-e1de3314e66c', '20bcdf28-c581-4565-a13f-7eb39e66faca', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 28) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('922de6c5-ae80-4c5e-ac1a-2d5a99652195', '20bcdf28-c581-4565-a13f-7eb39e66faca', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 18) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6eceec71-ed16-4368-a9bb-ab5c9496e3bb', '20bcdf28-c581-4565-a13f-7eb39e66faca', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 15) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('8d72d442-2fd1-4e34-a01e-883adb3baac0', '47979751-163d-48b3-ae56-a65586d18f1b', 'd812e821-9cf5-4042-ae7b-7b45b9a7b922', '4f32d322-afb7-4042-a9d1-ce0c17a09a30', 'in_progress', NULL, timestamp '2026-05-10 12:00:00' - interval '25 hours' - interval '30 mins', timestamp '2026-05-10 12:00:00' - interval '25 hours')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('58501528-43fd-4b32-a023-8ac571b407d5', '8d72d442-2fd1-4e34-a01e-883adb3baac0', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 15) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('835ed8e4-6cb1-43a8-a6ee-0ed36fcd8050', '8d72d442-2fd1-4e34-a01e-883adb3baac0', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 29) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('4e38b495-1483-4f37-ade4-6b1508512cd3', '10abd4e8-0cb9-4853-a17c-ac40da311bff', 'bfe219aa-e626-4093-acb4-0a8d92229438', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', NULL, timestamp '2025-06-01' + interval '7 days' - interval '30 mins', timestamp '2025-06-01' + interval '7 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c0af5c88-af9f-4c66-ab56-0d14bacba410', '4e38b495-1483-4f37-ade4-6b1508512cd3', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 11) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('0d3ae18e-7a31-4638-a778-276ee5026cd8', '4e38b495-1483-4f37-ade4-6b1508512cd3', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', 25) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('dfc00e67-33ef-432c-a8a1-7f8829f9076b', '4e38b495-1483-4f37-ade4-6b1508512cd3', '73155527-14c8-4fff-a5a3-8847cbf901cc', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('bcc9f349-4610-4cf1-a5d0-606d8feb84b9', '4e38b495-1483-4f37-ade4-6b1508512cd3', '93da0efc-1f68-4c82-afa8-15b5afd72df7', 12) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('fd158ce4-d9fa-458c-a4a1-5650268ab0b0', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '667b7df9-720b-44ea-a5c0-47ee35ca31b7', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', 'Well-organized team with clear delivery, but technical depth was limited.', timestamp '2025-06-01' + interval '8 days' - interval '30 mins', timestamp '2025-06-01' + interval '8 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('3edaa9ae-352f-4ea7-acd5-80fcd492140e', 'fd158ce4-d9fa-458c-a4a1-5650268ab0b0', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c2daa6bc-fbe3-47a8-af17-8ac2d0259628', 'fd158ce4-d9fa-458c-a4a1-5650268ab0b0', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', 29) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('b675433e-7e23-4f56-a5ea-44e5c0b0a87e', 'fd158ce4-d9fa-458c-a4a1-5650268ab0b0', '73155527-14c8-4fff-a5a3-8847cbf901cc', 21) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('5bd6ab01-675e-4f40-ae28-54c1cfb75e65', 'fd158ce4-d9fa-458c-a4a1-5650268ab0b0', '93da0efc-1f68-4c82-afa8-15b5afd72df7', 17) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('c1f43929-34c9-4c92-a83a-43c25833e3d6', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '77459bde-2dda-4848-a5c5-22decb273d5e', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', NULL, timestamp '2025-06-01' + interval '10 days' - interval '30 mins', timestamp '2025-06-01' + interval '10 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('6f59d775-db4d-4191-a204-621471688451', 'c1f43929-34c9-4c92-a83a-43c25833e3d6', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 16) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('c24360c3-a1e4-41dd-aee6-d755ea8c4af2', 'c1f43929-34c9-4c92-a83a-43c25833e3d6', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', 29) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('41b1600d-a2b6-41bb-a9a1-27323807a4fb', 'c1f43929-34c9-4c92-a83a-43c25833e3d6', '73155527-14c8-4fff-a5a3-8847cbf901cc', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('ed84de2a-8552-4687-af57-4af309d03e47', 'c1f43929-34c9-4c92-a83a-43c25833e3d6', '93da0efc-1f68-4c82-afa8-15b5afd72df7', 17) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('e0038701-67bf-468b-a274-97a85487c175', '10abd4e8-0cb9-4853-a17c-ac40da311bff', 'bfe219aa-e626-4093-acb4-0a8d92229438', '4f32d322-afb7-4042-a9d1-ce0c17a09a30', 'in_progress', NULL, timestamp '2025-06-01' + interval '10 days' - interval '30 mins', timestamp '2025-06-01' + interval '10 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a0d3b42c-0352-47bc-a4c9-d9e6e64e80ac', 'e0038701-67bf-468b-a274-97a85487c175', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 11) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('1bb81a47-4e16-4d85-a038-ba1f01c5cc61', 'e0038701-67bf-468b-a274-97a85487c175', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', 24) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('af131002-5d56-4645-afa5-16930300e221', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '8b01cc7c-13ab-422f-adc9-8a0a796c8dc4', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', 'Reasonable effort. Some areas need more polish.', timestamp '2024-06-01' + interval '5 days' - interval '30 mins', timestamp '2024-06-01' + interval '5 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('e4bf84c6-349a-4238-a3c6-4114aa8419e4', 'af131002-5d56-4645-afa5-16930300e221', '70699916-5835-4002-a228-fa884a6cef12', 13) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('17bea45c-cbee-4a58-ad00-c595f3f8b727', 'af131002-5d56-4645-afa5-16930300e221', '542366fd-6437-4188-a080-ccf790202f3b', 26) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('7db03a15-f90b-48f0-af33-f81be92bbe54', 'af131002-5d56-4645-afa5-16930300e221', 'bb8a742e-e337-4eb1-a91a-befa45d4e30e', 17) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('019b753e-d968-4c41-a803-305d3b4647dc', 'af131002-5d56-4645-afa5-16930300e221', '327d79df-1a6a-4e5e-af2d-ece7cff070bd', 13) ON CONFLICT DO NOTHING;
      

    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, comment, started_at, last_activity_at)
    VALUES ('a9f721ac-ba26-45b9-a2ac-272011493b3d', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '15713af0-a06b-43ac-a10b-867a682f2409', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', NULL, timestamp '2024-06-01' + interval '10 days' - interval '30 mins', timestamp '2024-06-01' + interval '10 days')
    ON CONFLICT DO NOTHING;
    

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('a6c38c5c-5ecb-4c71-ad70-2bac073682bd', 'a9f721ac-ba26-45b9-a2ac-272011493b3d', '70699916-5835-4002-a228-fa884a6cef12', 19) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('4306e77f-ce21-4e37-a9c2-e950e6dd488a', 'a9f721ac-ba26-45b9-a2ac-272011493b3d', '542366fd-6437-4188-a080-ccf790202f3b', 34) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f444d410-1011-4b97-a0bb-1f0b002c5e9b', 'a9f721ac-ba26-45b9-a2ac-272011493b3d', 'bb8a742e-e337-4eb1-a91a-befa45d4e30e', 24) ON CONFLICT DO NOTHING;
      

        INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
        VALUES ('f2d006d2-04b5-4252-aaa6-514e1ec53646', 'a9f721ac-ba26-45b9-a2ac-272011493b3d', '327d79df-1a6a-4e5e-af2d-ece7cff070bd', 18) ON CONFLICT DO NOTHING;
      
COMMIT;

-- Entry Tokens (Hashed)
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('65eec217-e3e7-4892-aa86-c2dd89b8f341', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'b2afaa35e6337796a575fe62ed9fb9eff3de54e21cb7a0d704831299ea32e950', false, timestamp '2026-05-10 12:00:00' + interval '20 hours') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('b268f2bc-eec0-48d8-a256-4f38a0cb7c34', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '38f84c84567b17b31649c9846f6830cde7dec9e2517f6cfd80dce220f3d13d0a', false, timestamp '2026-05-10 12:00:00' + interval '20 hours') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at, last_used_at) VALUES ('6e9ef69e-6b4d-400e-ae23-63adf410d6ed', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '01d114adc172f0dbc8d37fd6f454ac7a26ad4159bcb361b965b15bf3c2ae49be', true, timestamp '2026-05-10 12:00:00' - interval '2 days', timestamp '2026-05-10 12:00:00' - interval '2.1 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('658c96e0-1647-4beb-a8d0-f20d7585846a', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '43fa1d57a2cf7f65c6456f3391730537729208257923406cf46134dc2b5f7c6e', false, timestamp '2026-05-10 12:00:00' - interval '30 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('58a0c674-45a2-414e-ab45-eddf431433d2', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'b619ebda45ea943d1831f1d1842f602e480bc65cd1df992c5a9a99ed1cee1a3e', false, timestamp '2026-05-10 12:00:00' - interval '30 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('b3ca01ea-d954-4a7a-a710-17c092e06c89', '10078594-2707-4c3f-a212-42add04fbd84', '5d7abdd19222333aafaf2f0eccec7b372f01618e1e01ad6fb840800c9e52f7ec', false, timestamp '2026-05-10 12:00:00' - interval '30 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('54a0a728-4eb2-4653-a79c-504e5657ed3a', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '428056227ebcca871f6caa0fea0fc04769b9327e5a103dedf1a0b6adf265db5f', false, timestamp '2026-05-10 12:00:00' + interval '20 hours') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('2e49d85f-2f8b-4288-a1a2-3aab74ca691e', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '7ce924e6a965a64b03ada2befd7a74beb8a2d25e61349518297994d0d9e323b7', false, timestamp '2026-05-10 12:00:00' + interval '20 hours') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at, last_used_at) VALUES ('5cb55a07-088a-4520-a0eb-c3dd2916964b', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '08751e279aae7a37ac8ecf160e6ebf53b2b75564c3f1c557753303e412e56862', true, timestamp '2026-05-10 12:00:00' - interval '2 days', timestamp '2026-05-10 12:00:00' - interval '2.1 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('70c49348-0ab2-4942-af66-c6b011c64547', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '70be1c3c44190cd325a104c48065e1a4e802f0336c7d932c1941311607a8a903', false, timestamp '2026-05-10 12:00:00' - interval '30 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('19a73ad7-631f-497c-a0bc-c7370e496673', '0e963024-a53f-4722-a9e0-5db7a47b4419', '30f270dd0730de8750b1418790d7b08bc3818ca350016b783dbb226f53a66c1f', false, timestamp '2026-05-10 12:00:00' - interval '30 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('4c063c6e-066e-49f6-a4b7-42833fbd8d7e', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'f03a2287d64e41167e3e2959ebbbac3f9f30ed380b1a68c1a64c21edf205f361', false, timestamp '2026-05-10 12:00:00' - interval '30 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('68f26126-7793-44ff-aa3b-800ce6ca0313', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '3740a83608396bbbb77af122891171680811fc4cd667595b79abf3c5d2b261be', false, timestamp '2026-05-10 12:00:00' + interval '20 hours') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('ff705ca4-472f-4e50-a7a1-6b000bab05f1', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'e834febb7e7fc1ff8d70099056013611ee0aa7f50ef122572e1d870f0cc008e0', false, timestamp '2026-05-10 12:00:00' + interval '20 hours') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at, last_used_at) VALUES ('6442db4d-610f-452e-a097-36d9b144c783', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'e4f0a04fc81e15fa6f125d39fedbf0cb79e31708b0dc46aaa82b24edfbdce71e', true, timestamp '2026-05-10 12:00:00' - interval '2 days', timestamp '2026-05-10 12:00:00' - interval '2.1 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('f8deef69-63ac-4403-ad26-9d7461f048e9', '308d2708-dbea-41b6-a1c8-da6129445759', '9eb7289350928319c09e4955f44c88fafddf4f00a5750f0c6adfc0365a647203', false, timestamp '2026-05-10 12:00:00' - interval '30 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('d8e19489-d823-46ce-a6fc-4a46a11b3795', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '0176bef4d6b4838a7f7b30e3a94797d603213576dbdd001d00db6ece8e81528f', false, timestamp '2026-05-10 12:00:00' - interval '30 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('9361d106-db6f-4b9e-a13c-21efa2a4e51c', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '17501a10a9e325309b11e0811f734b286f2909698390c8d4f1d8f81f95643e71', false, timestamp '2026-05-10 12:00:00' + interval '20 hours') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('c47937c2-b861-44fa-acb2-ec46f513073c', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'c209a4f292c95b5dce14202caf27954a40c0c68a0240b4edb6b0c73db0233803', false, timestamp '2026-05-10 12:00:00' + interval '20 hours') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at, last_used_at) VALUES ('8ffe87f0-8f58-46a0-a0de-f88681127f78', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '1ada1dd58857751593843514b257a8577325d7003c3ca90fae3a9065267105e6', true, timestamp '2026-05-10 12:00:00' - interval '2 days', timestamp '2026-05-10 12:00:00' - interval '2.1 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('c541af7a-ed7e-488f-a284-9304a6124ad5', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '37af3f2504068494e2146e0b58ba67061773bfe2b516258ad60107038c21aada', false, timestamp '2026-05-10 12:00:00' - interval '30 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('bc5b539b-9977-4af2-ad80-3708ac7b6348', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'dfa5d9cc79ecdac6b7fe09d3f939752a5c244ced13ea129cd7fdb3ce85f50e4b', false, timestamp '2026-05-10 12:00:00' - interval '30 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('eff3c5ba-7e33-4e8c-afb4-ce499beae637', '6c44b363-4522-4cad-a251-06484b72b164', '654362b0c40f53b0a2cee008e61257a7f08b81179073609cbbe998d9c6f5f2b7', false, timestamp '2026-05-10 12:00:00' + interval '20 hours') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('5767ae9d-7d63-49b3-af01-097c093b52f2', '6c44b363-4522-4cad-a251-06484b72b164', '038c274d9c3aace83bad45727721626dc3830c20fa7fb3c43d9f07b9384554a7', false, timestamp '2026-05-10 12:00:00' + interval '20 hours') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at, last_used_at) VALUES ('919b4191-a159-4677-a0f3-7bb1c275d9ae', '6c44b363-4522-4cad-a251-06484b72b164', '5b37822f946fd41600e7c672917421ef9a2ecb971da1acfd506e24cd1c8bf663', true, timestamp '2026-05-10 12:00:00' - interval '2 days', timestamp '2026-05-10 12:00:00' - interval '2.1 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('64b2298c-877c-4a95-a435-5767931c4a0b', '318124ea-8614-4355-ad48-2486524dfc13', 'ebac97afc966625bf1c45d01cd4b6f264a2cd0deb17cfd90c2eaf462b9a523bd', false, timestamp '2026-05-10 12:00:00' - interval '30 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('8948f611-8bd3-4077-a448-e7eeff37ae2f', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '770fdda802381feb7b2fe482f5920ebc811962c9374e5680c2efdc4c8e0ab1b3', false, timestamp '2026-05-10 12:00:00' - interval '30 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('482a41bf-07e7-40cb-a4d4-0e7123616d0f', '47979751-163d-48b3-ae56-a65586d18f1b', 'fbf435428c4a1b336ce775b8178d235d1a3ff4caafc0b0c1f0409df860157f44', false, timestamp '2026-05-10 12:00:00' + interval '20 hours') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('61f58726-c8cf-4ac1-abd4-0f21e2691893', '47979751-163d-48b3-ae56-a65586d18f1b', '2366a9f7af193f830866e5038cea22ebb29a4d21f0e8fabb329fe2b3bdf3f4a5', false, timestamp '2026-05-10 12:00:00' + interval '20 hours') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at, last_used_at) VALUES ('48a019b9-c605-472d-a20f-6366897f9896', '47979751-163d-48b3-ae56-a65586d18f1b', 'af36e029c12a48da3d7955c9edc5b5ded0a5ca9eb1d9de5f87a8e39e4400ad53', true, timestamp '2026-05-10 12:00:00' - interval '2 days', timestamp '2026-05-10 12:00:00' - interval '2.1 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('afce2d5e-0567-491e-a605-4dedeb5f7594', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '4b3498123e4d6352056086b04b253e2e1f9b81e1a7f8cf4418e69f46116cf368', false, timestamp '2026-05-10 12:00:00' - interval '30 days') ON CONFLICT DO NOTHING;
INSERT INTO entry_tokens (id, period_id, token_hash, is_revoked, expires_at) VALUES ('24598621-bfcf-493f-a1aa-57276442e088', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '02d837650ffca0f9c258c7b1cb95ab28797a8847c5507b3d62a570c0a847f495', false, timestamp '2026-05-10 12:00:00' - interval '30 days') ON CONFLICT DO NOTHING;

-- Audit Logs
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('b616a410-f673-46e3-a9d2-2d3a94048745', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'admin.create', 'profile', '216c64b2-324f-4bfb-ac27-a2d8107cca20', '{"role":"org_admin"}', timestamp '2026-05-10 12:00:00' - interval '50 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('3a59b2e2-b25d-42b2-a3ee-7abd2f462c25', 'b94595d6-710c-4302-ad1b-11f4d216e028', NULL, 'admin.create', 'profile', '28a6cb85-d5a2-4f8e-a06a-ad66a2e72b46', '{"role":"org_admin"}', timestamp '2026-05-10 12:00:00' - interval '50 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('4d870700-a069-44df-a818-de37055e2975', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', NULL, 'admin.create', 'profile', '760dd3bc-5709-4e3b-a5e2-7d288da052d7', '{"role":"org_admin"}', timestamp '2026-05-10 12:00:00' - interval '50 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('ab6e69af-b886-4d3d-a50c-ed0adb53747b', '088f5054-c9df-4c7f-a679-c1321524f250', NULL, 'admin.create', 'profile', '33c5f117-e2f4-4233-a762-36527757059d', '{"role":"org_admin"}', timestamp '2026-05-10 12:00:00' - interval '50 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('66e08082-eec5-4a41-a88b-c25d112e444f', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', NULL, 'admin.create', 'profile', 'd8ae54ec-5d2f-472a-a348-fd0dd3204ad6', '{"role":"org_admin"}', timestamp '2026-05-10 12:00:00' - interval '50 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('f19df5ef-382a-400e-a2b6-9c7483e131ba', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', NULL, 'admin.create', 'profile', '0c3785a7-dc80-44be-ae92-5db23f85227c', '{"role":"org_admin"}', timestamp '2026-05-10 12:00:00' - interval '50 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('f77c1758-fe33-460f-a3cf-5ddd701913a0', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'admin.create', 'profile', '77a855a2-b6b7-49ef-a5f4-1a379c692107', '{"role":"org_admin"}', timestamp '2026-05-10 12:00:00' - interval '50 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('2c1f07eb-2878-4eed-a708-16e8822c22ed', 'b94595d6-710c-4302-ad1b-11f4d216e028', NULL, 'admin.create', 'profile', '0289930b-ea4c-47b0-a153-db0c93fad8fe', '{"role":"org_admin"}', timestamp '2026-05-10 12:00:00' - interval '50 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('c5de25c7-2918-4b15-aee8-fa8d44093128', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', NULL, 'admin.create', 'profile', '94060df8-6366-460e-a413-7a7c670243d4', '{"role":"org_admin"}', timestamp '2026-05-10 12:00:00' - interval '50 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('caba7e75-a69f-49ac-a44f-0113aacb33d4', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'application.approved', 'org_application', '41a5cfa5-99ca-4ac7-aac9-27dba37e757e', '{"action":"approved","reviewer":"System admin"}', timestamp '2026-05-10 12:00:00' - interval '247 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('eb166090-12ee-4c61-a036-cf6157a99c7c', 'b94595d6-710c-4302-ad1b-11f4d216e028', NULL, 'application.approved', 'org_application', '8366aa51-cbc3-451b-aa65-0c44c771212b', '{"action":"approved","reviewer":"System admin"}', timestamp '2026-05-10 12:00:00' - interval '141 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('7e291c20-9813-4ac8-aa9f-e9c33c1b5f49', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', NULL, 'application.rejected', 'org_application', '1a875b8c-6394-4e4e-a571-7c5d99e974e1', '{"action":"rejected","reviewer":"System admin"}', timestamp '2026-05-10 12:00:00' - interval '169 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('a2e56a6c-9c8b-4beb-ab8e-449541ad21be', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'period.create', 'period', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '{"name":"Spring 2026","season":"undefined"}', timestamp '2026-02-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('70743be0-d21b-4738-af43-def93d39818f', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'snapshot.freeze', 'period', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '{"action":"frozen"}', timestamp '2026-02-01' + interval '1 day') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('adebe419-df4c-48e4-afc6-4e82542a780d', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'period.create', 'period', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '{"name":"Fall 2025","season":"undefined"}', timestamp '2025-09-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('2df24322-679d-4a75-a88b-93756521ae0f', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'period.lock', 'period', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '{"action":"locked"}', timestamp '2025-09-01' + interval '120 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('415ac470-4937-4108-a5ee-80dfc7198e3d', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'period.create', 'period', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '{"name":"Spring 2025","season":"undefined"}', timestamp '2025-02-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('ad544e82-5054-4435-a4d2-b60676572766', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'period.lock', 'period', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '{"action":"locked"}', timestamp '2025-02-01' + interval '120 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('7f7e57c5-3c8a-46e6-ad7d-99e4a7724cb3', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'period.create', 'period', '10078594-2707-4c3f-a212-42add04fbd84', '{"name":"Fall 2024","season":"undefined"}', timestamp '2024-09-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('7b85f276-7147-461a-a4fc-25ba899e257d', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'period.lock', 'period', '10078594-2707-4c3f-a212-42add04fbd84', '{"action":"locked"}', timestamp '2024-09-01' + interval '120 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('58c38180-4d15-478c-a01f-f305b0e80f2f', 'b94595d6-710c-4302-ad1b-11f4d216e028', NULL, 'period.create', 'period', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '{"name":"Spring 2026","season":"undefined"}', timestamp '2026-02-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('727b7f2f-224c-416b-a9ae-b0d636f343ab', 'b94595d6-710c-4302-ad1b-11f4d216e028', NULL, 'snapshot.freeze', 'period', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '{"action":"frozen"}', timestamp '2026-02-01' + interval '1 day') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('9bede03e-aa76-46eb-a505-cab6c9982560', 'b94595d6-710c-4302-ad1b-11f4d216e028', NULL, 'period.create', 'period', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '{"name":"Fall 2025","season":"undefined"}', timestamp '2025-09-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('0a0931a1-8a8b-47dd-a583-415c007d6649', 'b94595d6-710c-4302-ad1b-11f4d216e028', NULL, 'period.lock', 'period', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '{"action":"locked"}', timestamp '2025-09-01' + interval '120 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('5b3ede6b-8794-40d7-a736-7d003090e7f2', 'b94595d6-710c-4302-ad1b-11f4d216e028', NULL, 'period.create', 'period', '0e963024-a53f-4722-a9e0-5db7a47b4419', '{"name":"Spring 2025","season":"undefined"}', timestamp '2025-02-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('67fb430e-808a-42a7-aefa-77e06ff21213', 'b94595d6-710c-4302-ad1b-11f4d216e028', NULL, 'period.lock', 'period', '0e963024-a53f-4722-a9e0-5db7a47b4419', '{"action":"locked"}', timestamp '2025-02-01' + interval '120 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('96b12833-783f-4625-a20f-9577861e716a', 'b94595d6-710c-4302-ad1b-11f4d216e028', NULL, 'period.create', 'period', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '{"name":"Fall 2024","season":"undefined"}', timestamp '2024-09-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('fa65bf6a-afcc-4f35-a409-5c2e4e958384', 'b94595d6-710c-4302-ad1b-11f4d216e028', NULL, 'period.lock', 'period', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '{"action":"locked"}', timestamp '2024-09-01' + interval '120 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('12958fe3-0dff-4dfd-a27d-1174b76b24d9', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', NULL, 'period.create', 'period', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '{"name":"2026 Season","season":"undefined"}', timestamp '2026-06-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('0f696dbd-b31c-4e85-ab18-b40801620552', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', NULL, 'snapshot.freeze', 'period', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '{"action":"frozen"}', timestamp '2026-06-01' + interval '1 day') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('488c8fe3-54ef-4fe0-aa5e-551322004fb0', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', NULL, 'period.create', 'period', '308d2708-dbea-41b6-a1c8-da6129445759', '{"name":"2025 Season","season":"undefined"}', timestamp '2025-06-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('f28a529c-9a03-4763-a116-40642b7a97ef', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', NULL, 'period.lock', 'period', '308d2708-dbea-41b6-a1c8-da6129445759', '{"action":"locked"}', timestamp '2025-06-01' + interval '120 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('0ae28fb9-02e3-4831-a61a-6f8789338e4b', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', NULL, 'period.create', 'period', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '{"name":"2024 Season","season":"undefined"}', timestamp '2024-06-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('68b0623a-87fb-4da6-a2b6-4cf73f807a86', 'd8214e32-d30f-4a0c-aee5-1c6fa0d41336', NULL, 'period.lock', 'period', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '{"action":"locked"}', timestamp '2024-06-01' + interval '120 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('fea250e5-4896-4fd3-a3bb-5c53a9cbdeb8', '088f5054-c9df-4c7f-a679-c1321524f250', NULL, 'period.create', 'period', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '{"name":"2026 Competition","season":"undefined"}', timestamp '2026-06-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('3cd199a1-c434-4078-a528-bb5017f6eaff', '088f5054-c9df-4c7f-a679-c1321524f250', NULL, 'snapshot.freeze', 'period', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '{"action":"frozen"}', timestamp '2026-06-01' + interval '1 day') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('f0134375-1526-49a1-a778-216cd3b2bb5e', '088f5054-c9df-4c7f-a679-c1321524f250', NULL, 'period.create', 'period', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '{"name":"2025 Competition","season":"undefined"}', timestamp '2025-06-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('69e2eba4-9a7c-4169-a24a-bc9b5b361a51', '088f5054-c9df-4c7f-a679-c1321524f250', NULL, 'period.lock', 'period', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '{"action":"locked"}', timestamp '2025-06-01' + interval '120 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('d1c8e7d7-51e6-4f38-a378-3f71d6bec773', '088f5054-c9df-4c7f-a679-c1321524f250', NULL, 'period.create', 'period', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '{"name":"2024 Competition","season":"undefined"}', timestamp '2024-06-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('1541ec48-ab11-48b5-ae5a-766369d3ea25', '088f5054-c9df-4c7f-a679-c1321524f250', NULL, 'period.lock', 'period', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', '{"action":"locked"}', timestamp '2024-06-01' + interval '120 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('bd26e4ad-cfb5-49e1-afd0-6d577c7b3f09', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', NULL, 'period.create', 'period', '6c44b363-4522-4cad-a251-06484b72b164', '{"name":"2026 Contest","season":"undefined"}', timestamp '2026-06-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('dd9d0679-d6fe-4584-a7a8-52cf3145db3e', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', NULL, 'snapshot.freeze', 'period', '6c44b363-4522-4cad-a251-06484b72b164', '{"action":"frozen"}', timestamp '2026-06-01' + interval '1 day') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('94b472f3-f494-445d-a2a6-018deba71c86', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', NULL, 'period.create', 'period', '318124ea-8614-4355-ad48-2486524dfc13', '{"name":"2025 Contest","season":"undefined"}', timestamp '2025-06-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('5aa180f1-0a80-4702-ac13-8427c559d705', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', NULL, 'period.lock', 'period', '318124ea-8614-4355-ad48-2486524dfc13', '{"action":"locked"}', timestamp '2025-06-01' + interval '120 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('bd20bcff-2a2b-4f54-a6e1-0319bbfe47bc', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', NULL, 'period.create', 'period', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '{"name":"2024 Contest","season":"undefined"}', timestamp '2024-06-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('237b7fab-6dd0-4057-aaad-e98880a6c832', 'ff81ecf1-13ac-44b2-a331-0a207a8c7184', NULL, 'period.lock', 'period', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '{"action":"locked"}', timestamp '2024-06-01' + interval '120 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('1e662218-6798-427a-a452-61bade9112cf', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', NULL, 'period.create', 'period', '47979751-163d-48b3-ae56-a65586d18f1b', '{"name":"2026 Season","season":"undefined"}', timestamp '2026-06-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('f7adf5cb-2767-4c11-a3a2-4df6ead93213', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', NULL, 'snapshot.freeze', 'period', '47979751-163d-48b3-ae56-a65586d18f1b', '{"action":"frozen"}', timestamp '2026-06-01' + interval '1 day') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('33817adf-647d-4129-a5e2-a94ca9dde670', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', NULL, 'period.create', 'period', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '{"name":"2025 Season","season":"undefined"}', timestamp '2025-06-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('a1a83d01-eba6-47af-a500-9f3a177a0a14', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', NULL, 'period.lock', 'period', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '{"action":"locked"}', timestamp '2025-06-01' + interval '120 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('a9502843-d2f8-466f-a55f-316a993f7fda', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', NULL, 'period.create', 'period', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '{"name":"2024 Season","season":"undefined"}', timestamp '2024-06-01' - interval '14 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('1b03a9bc-eab0-42ab-ac9b-9e463f2da5cc', 'b72b74d8-1d2c-4b0d-a982-48bfbed8fb29', NULL, 'period.lock', 'period', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '{"action":"locked"}', timestamp '2024-06-01' + interval '120 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('c8f3fdcf-fcbc-47c0-a298-0abc9a279331', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'project.import', 'period', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '{"imported_count":10,"source":"csv upload"}', timestamp '2026-05-10 12:00:00' - interval '45 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('376fa642-e258-4427-a316-b82cfb96c3d7', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'project.create', 'project', '46123b99-4f0a-4d61-a870-6ef0f78e371f', '{"title":"Low-Power IoT Sensor"}', timestamp '2026-05-10 12:00:00' - interval '40 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('3de49310-fe0a-4b0d-a52e-3aaccfc69e34', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'token.generate', 'entry_token', '65eec217-e3e7-4892-aa86-c2dd89b8f341', '{"reason":"Jury list batch generate"}', timestamp '2026-05-10 12:00:00' - interval '35 days') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('4d40507f-0926-42c4-a84e-b70bc1bc78df', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'juror.pin_locked', 'juror_period_auth', '72184d7d-905d-4a13-a136-8ff90c2cc349', '{"juror":"Dr. Nihan Ersoy","attempts":3,"ip": "192.168.1.10"}', timestamp '2026-05-10 12:00:00' - interval '16 hours') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('237dcc77-2bd7-4e97-a7fd-679f2be07403', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'score.submit', 'score_sheet', 'a17395fd-2023-4d71-a3a3-d5fea9bd921e', '{"action":"submit","juror_activity":"finalized"}', timestamp '2026-05-10 12:00:00' - interval '3 hours') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('d5781dea-d17f-4ccb-ad1b-2e990507321e', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'score.submit', 'score_sheet', '0fa7c53d-57bf-4967-a3a8-e358a3f8050e', '{"action":"submit","juror_activity":"finalized"}', timestamp '2026-05-10 12:00:00' - interval '6 hours') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('ae3f297d-8e16-4336-a45e-32a2be264f42', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'score.submit', 'score_sheet', 'c7143bce-252c-4165-a09c-fe08acc32fc1', '{"action":"submit","juror_activity":"finalized"}', timestamp '2026-05-10 12:00:00' - interval '9 hours') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('2938d2bc-6af9-40c3-a17d-f9996a33f28c', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'score.submit', 'score_sheet', 'ba84380d-8692-4dd0-ada6-53fd6ef95099', '{"action":"submit","juror_activity":"finalized"}', timestamp '2026-05-10 12:00:00' - interval '12 hours') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('4dfe40e2-88aa-43f2-a250-1088df0465be', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'score.submit', 'score_sheet', '57b6150d-2f76-4ead-ae46-52f0d6ab11cd', '{"action":"submit","juror_activity":"finalized"}', timestamp '2026-05-10 12:00:00' - interval '15 hours') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('62aad873-1d78-4694-a217-d81591fd1037', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'score.submit', 'score_sheet', '689496f4-143c-4fe9-a284-597b5779d826', '{"action":"submit","juror_activity":"finalized"}', timestamp '2026-05-10 12:00:00' - interval '18 hours') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('55c4cbf7-2cd7-45f1-acfc-b72608eaad87', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'score.update', 'score_sheet', 'f799f915-8458-4c87-a94f-63d87af787b3', '{"action":"update","corrections":2}', timestamp '2026-05-10 12:00:00' - interval '2 hours') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('fd33bc08-3191-4081-a007-4d55fd5bac4f', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'score.update', 'score_sheet', '3000956c-c3d9-4362-a0cd-2c78fb4b4ae6', '{"action":"update","corrections":2}', timestamp '2026-05-10 12:00:00' - interval '4 hours') ON CONFLICT DO NOTHING;
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES ('40bf0cc7-b876-48b9-aede-6f7961451ec2', 'e802a6cb-6cfa-4a7c-aba6-2038490fb899', NULL, 'token.revoke', 'entry_token', '6e9ef69e-6b4d-400e-ae23-63adf410d6ed', '{"reason":"manual revocation due to email leak"}', timestamp '2026-05-10 12:00:00' - interval '5 days') ON CONFLICT DO NOTHING;

-- Jury Feedback
INSERT INTO jury_feedback (period_id, juror_id, rating, comment, is_public) VALUES
('a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 4, NULL, false),
('6c44b363-4522-4cad-a251-06484b72b164', 'f106ca15-dc12-414f-ac41-0b361db08f95', 5, 'Incredibly smooth experience. Scored 12 projects in under an hour with no hiccups.', true),
('6c44b363-4522-4cad-a251-06484b72b164', '2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', 4, 'Clean interface, very intuitive. Would love a dark mode option on the scoring screen.', true),
('6c44b363-4522-4cad-a251-06484b72b164', '79ef4764-8e84-4a18-ad48-dbd780a5a027', 5, 'Best evaluation tool I have used for conference paper reviews. Simple yet powerful.', true),
('318124ea-8614-4355-ad48-2486524dfc13', 'f106ca15-dc12-414f-ac41-0b361db08f95', 5, NULL, false),
('318124ea-8614-4355-ad48-2486524dfc13', '2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', 4, NULL, false),
('318124ea-8614-4355-ad48-2486524dfc13', '79ef4764-8e84-4a18-ad48-dbd780a5a027', 5, 'Used VERA again for the second time — consistently excellent.', true),
('47979751-163d-48b3-ae56-a65586d18f1b', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 5, 'We evaluated 24 CanSat teams in a single afternoon. Real-time rankings kept the event exciting.', true),
('47979751-163d-48b3-ae56-a65586d18f1b', '4f32d322-afb7-4042-a9d1-ce0c17a09a30', 4, 'Great for competition settings. The rubric sheet was very helpful.', true),
('47979751-163d-48b3-ae56-a65586d18f1b', 'a71bad63-0a65-47a2-a5a5-623ab35c9ba7', 5, NULL, false),
('10abd4e8-0cb9-4853-a17c-ac40da311bff', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 4, NULL, false),
('10abd4e8-0cb9-4853-a17c-ac40da311bff', '4f32d322-afb7-4042-a9d1-ce0c17a09a30', 5, 'Even better than last year. The admin panel gives instant insight into scoring patterns.', true),
('10abd4e8-0cb9-4853-a17c-ac40da311bff', 'a71bad63-0a65-47a2-a5a5-623ab35c9ba7', 4, 'Straightforward and efficient. No training needed — I just started scoring.', true),
('e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '47dcf645-bcf8-407e-a86e-f0e506495726', 5, 'Replaced our old paper-based system entirely. The export feature alone saves hours of work.', true),
('e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '44e14170-d567-4ad4-a771-cd269d538a2f', 4, 'Solid tool. The configurable criteria made it easy to adapt to our CS capstone format.', true),
('b90e1112-88c7-44fa-a275-25bc0ad2d96d', '47dcf645-bcf8-407e-a86e-f0e506495726', 5, NULL, false),
('b90e1112-88c7-44fa-a275-25bc0ad2d96d', '44e14170-d567-4ad4-a771-cd269d538a2f', 3, NULL, false),
('0e963024-a53f-4722-a9e0-5db7a47b4419', '47dcf645-bcf8-407e-a86e-f0e506495726', 4, NULL, false),
('0e963024-a53f-4722-a9e0-5db7a47b4419', '44e14170-d567-4ad4-a771-cd269d538a2f', 5, 'Third semester using VERA. It keeps getting better.', true),
('e77bf882-fc32-461c-acab-6ee1696df0c7', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 5, 'Yüzlerce takımı hızlıca değerlendirdik. Sistem çok stabil ve hızlıydı.', true),
('308d2708-dbea-41b6-a1c8-da6129445759', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 4, NULL, false),
('308d2708-dbea-41b6-a1c8-da6129445759', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 5, 'Kullanımı çok kolay, eğitim bile gerekmedi. Tüm jüri arkadaşlarım memnun kaldı.', true),
('9f49cd18-d850-4b1e-ae53-c08253910f4e', '4f32d322-afb7-4042-a9d1-ce0c17a09a30', 3, NULL, false),
('9f49cd18-d850-4b1e-ae53-c08253910f4e', 'a71bad63-0a65-47a2-a5a5-623ab35c9ba7', 5, NULL, false)
ON CONFLICT (period_id, juror_id) DO NOTHING;

COMMIT;
