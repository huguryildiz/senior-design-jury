-- ============================================================
-- 002_multi_tenant_seed.sql
-- Phase C: Multi-tenant demo/dev seed data — full rewrite.
--
-- Database-side only. Does NOT create Supabase Auth users.
-- Auth user creation is a separate step documented in the
-- Phase C rollout guide.
--
-- Deterministic: uses setseed(0.424242) for reproducibility.
-- Workflow-state consistency is the top priority.
-- ============================================================

BEGIN;

SELECT setseed(0.424242);
SET search_path = public, extensions;

-- ── Clean slate: truncate all data tables (idempotent re-run) ──
TRUNCATE
  audit_logs, scores, juror_semester_auth, projects,
  admin_profiles, tenant_admin_applications, tenant_admin_memberships,
  settings, jurors, semesters, tenants
CASCADE;

-- ── Section 1: Tenants ──────────────────────────────────────
-- 3 universities × 2 departments each = 6 tenants
-- All 6 tenants created here (including tedu-ee).

INSERT INTO tenants (id, code, short_label, university, department) VALUES
  ('4b9adf8f-d234-4c46-a93d-d7010616b42a', 'tedu-ee', 'TEDU EE',
   'TED University', 'Electrical & Electronics Engineering'),
  ('3497069f-260e-4b84-afac-4ffff39c18d2', 'tedu-ce', 'TEDU CE',
   'TED University', 'Civil Engineering'),
  ('85b3df4b-b92f-47b7-84b6-b2a0a9b557c7', 'boun-chem', 'Boğaziçi CHEM',
   'Boğaziçi University', 'Chemical Engineering'),
  ('ec880532-9b44-4757-ab48-326b7faa2136', 'boun-cmpe', 'Boğaziçi CMPE',
   'Boğaziçi University', 'Computer Engineering'),
  ('e799be65-bb52-4f8a-9011-e83d28fe0ed0', 'metu-me', 'METU ME',
   'Middle East Technical University', 'Mechanical Engineering'),
  ('6566d9e3-14a1-4cf7-8d23-82195beb03fd', 'metu-ie', 'METU IE',
   'Middle East Technical University', 'Industrial Engineering')
ON CONFLICT ((lower(trim(code)))) DO NOTHING;

-- ── Section 2: Tenant admin memberships (DB side only) ──────
-- IMPORTANT: user_id values below must match the real UUIDs from
-- Supabase Auth (auth.users table). If you recreate auth users,
-- run `SELECT id, email FROM auth.users ORDER BY email;` and
-- update the UUIDs here accordingly.
--
-- Super-admin (global scope, tenant_id = NULL)
INSERT INTO tenant_admin_memberships (id, tenant_id, user_id, role) VALUES
  ('e80b938a-4a87-4b3b-b449-62641a08deed', NULL,
   '2596753a-90f1-42c3-9bd4-d8d239db945f', 'super_admin')
ON CONFLICT DO NOTHING;

-- Tenant admins (one per tenant)
INSERT INTO tenant_admin_memberships (id, tenant_id, user_id, role) VALUES
  ('56fdfc57-f5be-4f40-b8cd-c15c7dfb4e1a',
   '4b9adf8f-d234-4c46-a93d-d7010616b42a',
   'ba34acd9-678b-4a40-bf86-cdf96b773cc7', 'tenant_admin'),
  ('61ae9b03-e943-43d2-abd0-a837cc5acafd',
   '3497069f-260e-4b84-afac-4ffff39c18d2',
   '0ad71a4f-a424-4d68-8f37-d72df1f176a1', 'tenant_admin'),
  ('c1a8ed35-a1de-47e4-b63a-3b283629c137',
   '85b3df4b-b92f-47b7-84b6-b2a0a9b557c7',
   '97741fa5-430e-4421-85c1-8582e299ce97', 'tenant_admin'),
  ('070adbc4-ba91-4307-a96c-a52e6a19eb9f',
   'ec880532-9b44-4757-ab48-326b7faa2136',
   '73d0a0bd-c1c1-4ba8-9e6c-bacc119b20da', 'tenant_admin'),
  ('82396548-ef64-492d-a831-c6e7c08898e7',
   'e799be65-bb52-4f8a-9011-e83d28fe0ed0',
   'bba141f5-49df-486c-b42a-dc7f7dc51263', 'tenant_admin'),
  ('825e878d-9812-4945-85fc-ed6b17dc2c24',
   '6566d9e3-14a1-4cf7-8d23-82195beb03fd',
   'f688fc98-c5a7-4888-b47d-3e4cafc5b5ba', 'tenant_admin')
ON CONFLICT DO NOTHING;

-- Pending application test user (no membership)
INSERT INTO tenant_admin_applications (id, tenant_id, applicant_email, applicant_name, university, department, status) VALUES
  ('c2dcad4f-79c7-4d11-9c16-eeeb7ad98c52',
   '4b9adf8f-d234-4c46-a93d-d7010616b42a',
   'pending@test.dev', 'Pending User', 'Test University', 'Test Department', 'pending')
ON CONFLICT DO NOTHING;

-- ── Section 3: Admin profiles ───────────────────────────────
INSERT INTO admin_profiles (user_id, display_name)
SELECT v.uid, v.dname
FROM (VALUES
  ('2596753a-90f1-42c3-9bd4-d8d239db945f'::uuid, 'Prof. Leyla Keser (Super Admin)'),
  ('ba34acd9-678b-4a40-bf86-cdf96b773cc7'::uuid, 'Dr. Selim Karataş (TEDU EE Admin)'),
  ('0ad71a4f-a424-4d68-8f37-d72df1f176a1'::uuid, 'Assoc. Prof. Dilan Yurt (TEDU CE Admin)'),
  ('97741fa5-430e-4421-85c1-8582e299ce97'::uuid, 'Prof. Cenk Akman (Boğaziçi CHEM Admin)'),
  ('73d0a0bd-c1c1-4ba8-9e6c-bacc119b20da'::uuid, 'Dr. Aslı Korur (Boğaziçi CMPE Admin)'),
  ('bba141f5-49df-486c-b42a-dc7f7dc51263'::uuid, 'Dr. Elif Tunalı (METU ME Admin)'),
  ('f688fc98-c5a7-4888-b47d-3e4cafc5b5ba'::uuid, 'Prof. Gökhan Demirel (METU IE Admin)')
) AS v(uid, dname)
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = v.uid)
ON CONFLICT (user_id) DO NOTHING;

-- ── Section 4: Semesters (3 per tenant) ─────────────────────
-- Poster dates vary per institution. Criteria templates: 4/3/5.
-- Spring 2026 is active for all tenants.

DO $$
DECLARE
  v_t record;
  v_template_4 jsonb := '[
    {"key":"technical","label":"Technical Content","shortLabel":"Technical","max":30,"mudek":["1.2","2","3.1","3.2"],"mudek_outcomes":["po_1_2","po_2","po_3_1","po_3_2"]},
    {"key":"design","label":"Written Communication","shortLabel":"Written","max":30,"mudek":["9.2"],"mudek_outcomes":["po_9_2"]},
    {"key":"delivery","label":"Oral Communication","shortLabel":"Oral","max":30,"mudek":["9.1"],"mudek_outcomes":["po_9_1"]},
    {"key":"teamwork","label":"Teamwork","shortLabel":"Teamwork","max":10,"mudek":["8.1","8.2"],"mudek_outcomes":["po_8_1","po_8_2"]}
  ]'::jsonb;
  v_template_3 jsonb := '[
    {"key":"technical","label":"Technical Design","shortLabel":"Technical","max":40,"mudek":["1.2","2","3.1","3.2","4"],"mudek_outcomes":["po_1_2","po_2","po_3_1","po_3_2","po_4"]},
    {"key":"presentation","label":"Presentation","shortLabel":"Presentation","max":35,"mudek":["9.1","9.2"],"mudek_outcomes":["po_9_1","po_9_2"]},
    {"key":"teamwork","label":"Teamwork","shortLabel":"Teamwork","max":25,"mudek":["8.1","8.2"],"mudek_outcomes":["po_8_1","po_8_2"]}
  ]'::jsonb;
  v_template_5 jsonb := '[
    {"key":"technical","label":"Technical Content","shortLabel":"Technical","max":25,"mudek":["1.2","2"],"mudek_outcomes":["po_1_2","po_2"]},
    {"key":"design","label":"Design Quality","shortLabel":"Design","max":20,"mudek":["3.1","3.2"],"mudek_outcomes":["po_3_1","po_3_2"]},
    {"key":"delivery","label":"Oral Delivery","shortLabel":"Oral","max":20,"mudek":["9.1"],"mudek_outcomes":["po_9_1"]},
    {"key":"report","label":"Written Report","shortLabel":"Report","max":20,"mudek":["9.2","5"],"mudek_outcomes":["po_9_2","po_5"]},
    {"key":"teamwork","label":"Teamwork","shortLabel":"Teamwork","max":15,"mudek":["8.1","8.2"],"mudek_outcomes":["po_8_1","po_8_2"]}
  ]'::jsonb;
  v_template jsonb;
  -- MÜDEK outcome dictionaries per criteria template
  v_mudek_4 jsonb := '[
    {"id":"po_1_2","code":"1.2","desc_en":"Ability to apply knowledge of mathematics, natural sciences, fundamental engineering, computation, and discipline-specific topics to solve complex engineering problems.","desc_tr":"Matematik, fen bilimleri, temel mühendislik, bilgisayarla hesaplama ve ilgili mühendislik disiplinine özgü konulardaki bilgileri, karmaşık mühendislik problemlerinin çözümünde kullanabilme becerisi."},
    {"id":"po_2","code":"2","desc_en":"Ability to identify, formulate, and analyse complex engineering problems using fundamental science, mathematics, and engineering knowledge, with consideration of relevant UN Sustainable Development Goals.","desc_tr":"Karmaşık mühendislik problemlerini, temel bilim, matematik ve mühendislik bilgilerini kullanarak ve ele alınan problemle ilgili BM Sürdürülebilir Kalkınma Amaçlarını gözetarak tanımlama, formüle etme ve analiz becerisi."},
    {"id":"po_3_1","code":"3.1","desc_en":"Ability to design creative solutions to complex engineering problems.","desc_tr":"Karmaşık mühendislik problemlerine yaratıcı çözümler tasarlama becerisi."},
    {"id":"po_3_2","code":"3.2","desc_en":"Ability to design complex systems, processes, devices, or products under realistic constraints and conditions, meeting current and future requirements.","desc_tr":"Karmaşık sistemleri, süreçleri, cihazları veya ürünleri gerçekçi kısıtları ve koşulları gözetarak, mevcut ve gelecekteki gereksinimleri karşılayacak biçimde tasarlama becerisi."},
    {"id":"po_8_1","code":"8.1","desc_en":"Ability to work effectively as a team member or leader in intra-disciplinary teams (in-person, remote, or hybrid).","desc_tr":"Bireysel olarak disiplin içi takım çalışmalarında (yüz yüze, uzaktan veya karma) takım üyesi veya lideri olarak etkin biçimde çalışabilme becerisi."},
    {"id":"po_8_2","code":"8.2","desc_en":"Ability to work effectively as a team member or leader in multidisciplinary teams (in-person, remote, or hybrid).","desc_tr":"Bireysel olarak çok disiplinli takımlarda (yüz yüze, uzaktan veya karma) takım üyesi veya lideri olarak etkin biçimde çalışabilme becerisi."},
    {"id":"po_9_1","code":"9.1","desc_en":"Ability to communicate effectively on technical topics orally, adapting to audience differences (education, language, profession, etc.).","desc_tr":"Hedef kitlenin çeşitli farklılıklarını (eğitim, dil, meslek gibi) dikkate alarak, teknik konularda sözlü etkin iletişim kurma becerisi."},
    {"id":"po_9_2","code":"9.2","desc_en":"Ability to communicate effectively on technical topics in writing, adapting to audience differences (education, language, profession, etc.).","desc_tr":"Hedef kitlenin çeşitli farklılıklarını (eğitim, dil, meslek gibi) dikkate alarak, teknik konularda yazılı etkin iletişim kurma becerisi."}
  ]'::jsonb;
  v_mudek_3 jsonb := '[
    {"id":"po_1_2","code":"1.2","desc_en":"Ability to apply knowledge of mathematics, natural sciences, fundamental engineering, computation, and discipline-specific topics to solve complex engineering problems.","desc_tr":"Matematik, fen bilimleri, temel mühendislik, bilgisayarla hesaplama ve ilgili mühendislik disiplinine özgü konulardaki bilgileri, karmaşık mühendislik problemlerinin çözümünde kullanabilme becerisi."},
    {"id":"po_2","code":"2","desc_en":"Ability to identify, formulate, and analyse complex engineering problems using fundamental science, mathematics, and engineering knowledge, with consideration of relevant UN Sustainable Development Goals.","desc_tr":"Karmaşık mühendislik problemlerini, temel bilim, matematik ve mühendislik bilgilerini kullanarak ve ele alınan problemle ilgili BM Sürdürülebilir Kalkınma Amaçlarını gözetarak tanımlama, formüle etme ve analiz becerisi."},
    {"id":"po_3_1","code":"3.1","desc_en":"Ability to design creative solutions to complex engineering problems.","desc_tr":"Karmaşık mühendislik problemlerine yaratıcı çözümler tasarlama becerisi."},
    {"id":"po_3_2","code":"3.2","desc_en":"Ability to design complex systems, processes, devices, or products under realistic constraints and conditions, meeting current and future requirements.","desc_tr":"Karmaşık sistemleri, süreçleri, cihazları veya ürünleri gerçekçi kısıtları ve koşulları gözetarak, mevcut ve gelecekteki gereksinimleri karşılayacak biçimde tasarlama becerisi."},
    {"id":"po_4","code":"4","desc_en":"Ability to select and use appropriate techniques, resources, and modern engineering and IT tools — including estimation and modelling — for the analysis and solution of complex engineering problems, with awareness of their limitations.","desc_tr":"Karmaşık mühendislik problemlerinin analizi ve çözümüne yönelik, tahmin ve modelleme de dahil olmak üzere, uygun teknikleri, kaynakları ve modern mühendislik ve bilişim araçlarını, sınırlamalarının da farkında olarak seçme ve kullanma becerisi."},
    {"id":"po_8_1","code":"8.1","desc_en":"Ability to work effectively as a team member or leader in intra-disciplinary teams (in-person, remote, or hybrid).","desc_tr":"Bireysel olarak disiplin içi takım çalışmalarında (yüz yüze, uzaktan veya karma) takım üyesi veya lideri olarak etkin biçimde çalışabilme becerisi."},
    {"id":"po_8_2","code":"8.2","desc_en":"Ability to work effectively as a team member or leader in multidisciplinary teams (in-person, remote, or hybrid).","desc_tr":"Bireysel olarak çok disiplinli takımlarda (yüz yüze, uzaktan veya karma) takım üyesi veya lideri olarak etkin biçimde çalışabilme becerisi."},
    {"id":"po_9_1","code":"9.1","desc_en":"Ability to communicate effectively on technical topics orally, adapting to audience differences (education, language, profession, etc.).","desc_tr":"Hedef kitlenin çeşitli farklılıklarını (eğitim, dil, meslek gibi) dikkate alarak, teknik konularda sözlü etkin iletişim kurma becerisi."},
    {"id":"po_9_2","code":"9.2","desc_en":"Ability to communicate effectively on technical topics in writing, adapting to audience differences (education, language, profession, etc.).","desc_tr":"Hedef kitlenin çeşitli farklılıklarını (eğitim, dil, meslek gibi) dikkate alarak, teknik konularda yazılı etkin iletişim kurma becerisi."}
  ]'::jsonb;
  v_mudek_5 jsonb := '[
    {"id":"po_1_2","code":"1.2","desc_en":"Ability to apply knowledge of mathematics, natural sciences, fundamental engineering, computation, and discipline-specific topics to solve complex engineering problems.","desc_tr":"Matematik, fen bilimleri, temel mühendislik, bilgisayarla hesaplama ve ilgili mühendislik disiplinine özgü konulardaki bilgileri, karmaşık mühendislik problemlerinin çözümünde kullanabilme becerisi."},
    {"id":"po_2","code":"2","desc_en":"Ability to identify, formulate, and analyse complex engineering problems using fundamental science, mathematics, and engineering knowledge, with consideration of relevant UN Sustainable Development Goals.","desc_tr":"Karmaşık mühendislik problemlerini, temel bilim, matematik ve mühendislik bilgilerini kullanarak ve ele alınan problemle ilgili BM Sürdürülebilir Kalkınma Amaçlarını gözetarak tanımlama, formüle etme ve analiz becerisi."},
    {"id":"po_3_1","code":"3.1","desc_en":"Ability to design creative solutions to complex engineering problems.","desc_tr":"Karmaşık mühendislik problemlerine yaratıcı çözümler tasarlama becerisi."},
    {"id":"po_3_2","code":"3.2","desc_en":"Ability to design complex systems, processes, devices, or products under realistic constraints and conditions, meeting current and future requirements.","desc_tr":"Karmaşık sistemleri, süreçleri, cihazları veya ürünleri gerçekçi kısıtları ve koşulları gözetarak, mevcut ve gelecekteki gereksinimleri karşılayacak biçimde tasarlama becerisi."},
    {"id":"po_5","code":"5","desc_en":"Ability to use research methods for investigating complex engineering problems, including literature review, experiment design, experimentation, data collection, and analysis and interpretation of results.","desc_tr":"Karmaşık mühendislik problemlerinin incelenmesi için literatür araştırması, deney tasarlama, deney yapma, veri toplama, sonuçları analiz etme ve yorumlama dahil, araştırma yöntemlerini kullanma becerisi."},
    {"id":"po_8_1","code":"8.1","desc_en":"Ability to work effectively as a team member or leader in intra-disciplinary teams (in-person, remote, or hybrid).","desc_tr":"Bireysel olarak disiplin içi takım çalışmalarında (yüz yüze, uzaktan veya karma) takım üyesi veya lideri olarak etkin biçimde çalışabilme becerisi."},
    {"id":"po_8_2","code":"8.2","desc_en":"Ability to work effectively as a team member or leader in multidisciplinary teams (in-person, remote, or hybrid).","desc_tr":"Bireysel olarak çok disiplinli takımlarda (yüz yüze, uzaktan veya karma) takım üyesi veya lideri olarak etkin biçimde çalışabilme becerisi."},
    {"id":"po_9_1","code":"9.1","desc_en":"Ability to communicate effectively on technical topics orally, adapting to audience differences (education, language, profession, etc.).","desc_tr":"Hedef kitlenin çeşitli farklılıklarını (eğitim, dil, meslek gibi) dikkate alarak, teknik konularda sözlü etkin iletişim kurma becerisi."},
    {"id":"po_9_2","code":"9.2","desc_en":"Ability to communicate effectively on technical topics in writing, adapting to audience differences (education, language, profession, etc.).","desc_tr":"Hedef kitlenin çeşitli farklılıklarını (eğitim, dil, meslek gibi) dikkate alarak, teknik konularda yazılı etkin iletişim kurma becerisi."}
  ]'::jsonb;
  v_mudek jsonb;
  v_semesters text[] := ARRAY['Fall 2025', 'Spring 2026', 'Summer 2026'];
  v_dates date[];
  v_idx int;
BEGIN
  FOR v_t IN SELECT id, code FROM tenants ORDER BY code LOOP
    IF v_t.code IN ('tedu-ee', 'tedu-ce') THEN
      v_dates := ARRAY['2025-12-18'::date, '2026-05-22'::date, '2026-08-12'::date];
    ELSIF v_t.code IN ('boun-chem', 'boun-cmpe') THEN
      v_dates := ARRAY['2025-12-15'::date, '2026-05-20'::date, '2026-08-10'::date];
    ELSE
      v_dates := ARRAY['2025-12-20'::date, '2026-05-25'::date, '2026-08-15'::date];
    END IF;

    IF v_t.code = 'metu-me' THEN
      v_template := v_template_3;
      v_mudek := v_mudek_3;
    ELSIF v_t.code = 'metu-ie' THEN
      v_template := v_template_5;
      v_mudek := v_mudek_5;
    ELSE
      v_template := v_template_4;
      v_mudek := v_mudek_4;
    END IF;

    FOR v_idx IN 1..3 LOOP
      INSERT INTO semesters (tenant_id, semester_name, poster_date, is_current, criteria_template, mudek_template)
      SELECT
        v_t.id,
        v_semesters[v_idx],
        v_dates[v_idx],
        (v_idx = 2),
        v_template,
        v_mudek
      WHERE NOT EXISTS (
        SELECT 1 FROM semesters
        WHERE tenant_id = v_t.id
          AND lower(trim(semester_name)) = lower(trim(v_semesters[v_idx]))
      );
    END LOOP;
  END LOOP;
END;
$$;

-- Normalize semester timestamps relative to poster_date
UPDATE semesters s SET
  created_at = s.poster_date::timestamptz - interval '30 days' + (random() * interval '6 hours'),
  updated_at = s.poster_date::timestamptz - interval '10 days' + (random() * interval '6 hours')
WHERE s.tenant_id IN (SELECT id FROM tenants);

-- 4a: Semester state diversity
UPDATE semesters SET is_locked = true
WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'tedu-ce')
  AND lower(trim(semester_name)) = 'spring 2026';

UPDATE semesters SET is_locked = true
WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'boun-chem')
  AND lower(trim(semester_name)) = 'fall 2025';

-- 4b: Entry tokens for active semesters (plain SQL for extensions.digest access)
UPDATE semesters SET
  entry_token_hash = encode(extensions.digest('demo-tedu-ee', 'sha256'), 'hex'),
  entry_token_enabled = true,
  entry_token_created_at = poster_date::timestamptz - interval '5 days'
WHERE tenant_id = '4b9adf8f-d234-4c46-a93d-d7010616b42a'
  AND is_current = true;

UPDATE semesters SET
  entry_token_hash = encode(extensions.digest('demo-boun-cmpe', 'sha256'), 'hex'),
  entry_token_enabled = true,
  entry_token_created_at = poster_date::timestamptz - interval '3 days'
WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'boun-cmpe')
  AND is_current = true;

UPDATE semesters SET
  entry_token_hash = encode(extensions.digest('demo-metu-me', 'sha256'), 'hex'),
  entry_token_enabled = true,
  entry_token_created_at = poster_date::timestamptz - interval '7 days'
WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'metu-me')
  AND is_current = true;

-- metu-ie: token exists but DISABLED (tests revoked state in UI)
UPDATE semesters SET
  entry_token_hash = encode(extensions.digest('demo-metu-ie', 'sha256'), 'hex'),
  entry_token_enabled = false,
  entry_token_created_at = poster_date::timestamptz - interval '6 days'
WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'metu-ie')
  AND is_current = true;

-- ── Section 5: Settings seed data ───────────────────────────
INSERT INTO settings (key, value, tenant_id) VALUES
  ('timezone', 'Europe/Istanbul', '4b9adf8f-d234-4c46-a93d-d7010616b42a'::uuid),
  ('timezone', 'Europe/Istanbul', 'ec880532-9b44-4757-ab48-326b7faa2136'::uuid),
  ('notification_email', 'ie-capstone@metu.edu.tr', '6566d9e3-14a1-4cf7-8d23-82195beb03fd'::uuid),
  ('timezone', 'UTC', NULL)
ON CONFLICT DO NOTHING;

-- ── Section 6: Jurors (20 total) ────────────────────────────
-- Turkish academic titles + 4 industry jurors (17-20).
-- juror_email column removed; email is no longer part of the jurors table.
-- First 4 jurors are cross-tenant (assigned to all tenants).

DO $$
DECLARE
  v_names text[] := ARRAY[
    'Prof. Ayşe Demir',          'Dr. Mehmet Kaya',
    'Prof. Elif Yılmaz',         'Dr. Barış Çelik',
    'Assoc. Prof. Canan Öztürk', 'Prof. Kemal Aksu',
    'Dr. Selin Kara',            'Prof. Tolga Erdoğan',
    'Assoc. Prof. Merve Şahin',  'Dr. Hakan Yıldırım',
    'Prof. Zeynep Acar',         'Dr. Emre Polat',
    'Prof. Deniz Korkmaz',       'Dr. Burcu Aydın',
    'Prof. Serkan Önal',         'Dr. Neslihan Tunç',
    'Oğuz Kaplan, M.Sc.',        'Pınar Güneş',
    'Volkan Yavuz',              'Esra Kılıç'
  ];
  v_insts text[] := ARRAY[
    'TED University / Electrical & Electronics Engineering',           'Boğaziçi University / Computer Engineering',
    'Middle East Technical University / Mechanical Eng.','Bilkent University / Industrial Engineering',
    'Hacettepe University / Physics',                    'İstanbul Technical University / Electronics Eng.',
    'Ankara University / Computer Science',              'Sabancı University / Mechatronics Engineering',
    'Koç University / Electrical & Electronics Engineering',           'Gazi University / Civil Engineering',
    'Yıldız Technical University / Control Engineering', 'TOBB ETU / Software Engineering',
    'Çankaya University / Computer Engineering',         'Başkent University / Biomedical Engineering',
    'Atılım University / Electrical & Electronics Engineering',        'Özyeğin University / Computer Science',
    'Arçelik R&D Center',                                'ASELSAN',
    'Roketsan',                                          'HAVELSAN'
  ];
  v_i int;
BEGIN
  FOR v_i IN 1..20 LOOP
    INSERT INTO jurors (juror_name, juror_inst)
    VALUES (v_names[v_i], v_insts[v_i])
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Normalize juror timestamps
WITH base AS (
  SELECT MIN(poster_date) AS base_date FROM semesters
)
UPDATE jurors j SET
  created_at = base.base_date::timestamptz - interval '40 days' + (random() * interval '20 days'),
  updated_at = base.base_date::timestamptz - interval '35 days' + (random() * interval '15 days')
FROM base;

-- ── Section 7: Projects (domain-specific curated titles) ────
-- 25 curated titles per domain. Project counts vary by tenant.
-- Student names: 30 Turkish + 50 international, discipline-weighted.

DO $$
DECLARE
  v_sem record;
  v_tenant_code text;
  v_project_count int;
  v_group_no int;
  v_is_summer boolean;
  v_is_spring boolean;

  v_titles text[];
  v_title text;
  v_used_titles text[];
  v_retry int;

  v_turkish_names text[];
  v_intl_names text[];
  v_students text;
  v_student_count int;
  v_picked text[];
  v_used_sem_names text[];
  v_candidate text;
  v_i int;
BEGIN
  v_turkish_names := ARRAY[
    'Ahmet Yılmaz','Ayşe Demir','Mehmet Koç','Zeynep Arslan','Kerem Öztürk',
    'Selin Polat','Emre Şahin','Buse Kaya','Onur Eren','Derya Kurt',
    'Büşra Yıldız','Mert Çelik','Seda Kara','Tarık Güneş','Yasemin Aktaş',
    'Cem Yıldırım','Elif Aksoy','Barış Aydın','Nazlı Tunç','Oğuz Kaplan',
    'Gökçe Aras','Yiğit Başaran','Defne Korucu','Kaan Deniz','İrem Turan',
    'Alp Güler','Duygu Sezer','Batuhan Ateş','Eylül Yalçın','Berk Sönmez'
  ];

  v_intl_names := ARRAY[
    'James Miller','Emily Johnson','Noah Williams','Olivia Brown','Ethan Davis',
    'Charlotte Wilson','Henry Taylor','Amelia Anderson','Jack Moore','Grace Thomas',
    'Sophia Clark','Mason Lewis',
    'Camille Dupont','Théo Bernard','Manon Leroy','Hugo Moreau','Léa Petit',
    'Antoine Lefebvre',
    'Lukas Müller','Hannah Schmidt','Felix Wagner','Anna Becker','Jonas Weber',
    'Lena Hoffmann',
    'Marco Rossi','Giulia Ferrari','Luca Esposito','Sofia Ricci','Matteo Romano',
    'Chiara Marino',
    'Carlos García','Sofía Martínez','Alejandro López','Valentina Sánchez','Diego Hernández',
    'Wei Zhang','Li Huang','Fang Liu','Jing Chen','Hao Wang',
    'Min-jun Kim','Seo-yeon Park','Ji-ho Lee','Ye-jin Choi','Do-yun Jung',
    'Haruto Tanaka','Yui Sato','Ren Suzuki','Hana Yamamoto','Sota Nakamura',
    'Omar Hassan','Fatima Al-Rashid','Youssef Khalil','Layla Mansour','Karim Nasser'
  ];

  FOR v_sem IN
    SELECT s.id, s.semester_name, s.poster_date, s.tenant_id, t.code AS tenant_code
    FROM semesters s
    JOIN tenants t ON t.id = s.tenant_id
    ORDER BY t.code, s.poster_date
  LOOP
    v_tenant_code := v_sem.tenant_code;
    v_is_summer := lower(v_sem.semester_name) LIKE '%summer%';
    v_is_spring := lower(v_sem.semester_name) LIKE '%spring%';

    -- Curated domain-specific title pools (25 per domain)
    IF v_tenant_code = 'tedu-ee' THEN
      v_titles := ARRAY[
        'FPGA-Based Real-Time Motor Controller Using Kalman Filtering',
        'Low-Power Wireless Sensor Network for Smart Agriculture',
        'Embedded Signal Processor with LoRa Mesh Communication',
        'Adaptive Power Converter for Residential Solar Panels',
        'High-Speed ADC Interface Design for Radar Applications',
        'Real-Time Fault Detection in Three-Phase Inverters',
        'LoRa-Based Environmental Monitoring Station',
        'Digital Control Unit for Brushless DC Motor Drives',
        'Modular Battery Management System for E-Scooters',
        'Edge Computing Platform for Industrial Vibration Analysis',
        'Wearable ECG Monitor with BLE Data Transmission',
        'Programmable LED Driver with Adaptive Dimming',
        'Capacitive Touch Sensor Array for Interactive Displays',
        'SoC-Based Acoustic Emission Classifier for Structural Health',
        'Open-Source Oscilloscope Shield for Arduino Platforms',
        'Current-Sensing Relay Module with IoT Dashboard',
        'Visible-Light Communication Prototype for Indoor Positioning',
        'EMC-Compliant Switch-Mode Power Supply Design',
        'RISC-V Soft-Core Implementation on Xilinx FPGA',
        'Precision Temperature Logger with NIST-Traceable Calibration',
        'Automated PCB Inspection System Using Computer Vision',
        'Dual-Band Antenna Design for ISM and Sub-GHz Bands',
        'Smart Plug with Energy Monitoring and Usage Analytics',
        'PID Controller Tuning Platform for Educational Labs',
        'Ultrasonic Rangefinder with Kalman-Filtered Measurements'
      ];
    ELSIF v_tenant_code = 'tedu-ce' THEN
      v_titles := ARRAY[
        'Seismic Performance Assessment of Base-Isolated RC Frames',
        'Finite Element Analysis of Steel Truss Bridge Under Dynamic Loads',
        'Sustainable Concrete Mix Design Using Recycled Aggregates',
        'Slope Stability Analysis of Clay Embankments with GeoStudio',
        'Structural Health Monitoring Using Fiber-Optic Sensors',
        'Optimal Design of Reinforced Concrete Shear Walls for High-Rise Buildings',
        'Flood Risk Mapping of Ankara Streams Using HEC-RAS',
        'Performance-Based Earthquake Engineering of a Hospital Building',
        'Experimental Study on Self-Compacting Concrete with Fly Ash',
        'Wind Load Analysis of Tall Buildings Using CFD Simulation',
        'Geotechnical Investigation and Foundation Design for Soft Soils',
        'Life Cycle Assessment of Green Building Materials',
        'Nonlinear Pushover Analysis of Existing Masonry Structures',
        'Design of a Pedestrian Cable-Stayed Bridge with AASHTO Standards',
        'Evaluation of Pavement Distress Using Machine Learning on UAV Images',
        'Retrofitting Strategies for Pre-1998 RC Buildings in Turkey',
        'Stormwater Management System Design for Urban Campus Areas',
        'Comparative Study of Shallow vs Deep Foundations in Alluvial Deposits',
        'Buckling Analysis of Thin-Walled Steel Members Under Compression',
        'Traffic Flow Simulation and Signal Optimization for Campus Intersection',
        'Durability Assessment of Fiber-Reinforced Polymer Rebars in Concrete',
        'Soil Liquefaction Potential Mapping for Central Ankara Region',
        'Thermal Performance of Double-Skin Facades in Continental Climates',
        'Dynamic Response Analysis of a Multi-Story Building with TMD',
        'Water Distribution Network Optimization Using EPANET Modeling'
      ];
    ELSIF v_tenant_code = 'boun-chem' THEN
      v_titles := ARRAY[
        'Optimization of Biodiesel Production from Waste Cooking Oil',
        'Design of a Continuous Distillation Column for Ethanol-Water Separation',
        'CFD Simulation of Fluidized Bed Reactor for Catalytic Cracking',
        'Kinetic Modeling of Fischer-Tropsch Synthesis over Cobalt Catalysts',
        'Membrane Separation Process Design for CO₂ Capture',
        'Heat Exchanger Network Optimization Using Pinch Analysis',
        'Adsorption-Based Water Treatment Using Activated Carbon from Hazelnut Shells',
        'Process Simulation of Ammonia Plant Using Aspen HYSYS',
        'Synthesis of TiO₂ Nanoparticles for Photocatalytic Dye Degradation',
        'PID Controller Design for CSTR Temperature Regulation',
        'Techno-Economic Analysis of Green Hydrogen Production via Electrolysis',
        'Polymer Electrolyte Membrane Fuel Cell Performance Optimization',
        'Packed Bed Reactor Modeling for Methanol Synthesis',
        'Extraction of Essential Oils Using Supercritical CO₂',
        'Design of Wastewater Treatment Plant for Textile Industry Effluent',
        'Rheological Characterization of Polymer Solutions for Enhanced Oil Recovery',
        'Life Cycle Assessment of PET Recycling Processes',
        'Microfluidic Reactor Design for Nanoparticle Synthesis',
        'Batch Reactor Optimization for Polymerization of Styrene',
        'Corrosion Inhibition Study Using Green Inhibitors in Acidic Media',
        'HAZOP Analysis and Safety Review of LPG Storage Facility',
        'Electrochemical Impedance Spectroscopy of Li-Ion Battery Electrodes',
        'Dynamic Simulation of Absorption Column for Natural Gas Sweetening',
        'Sol-Gel Synthesis of Silica Aerogels for Thermal Insulation',
        'Process Intensification of Reactive Distillation for Ester Production'
      ];
    ELSIF v_tenant_code = 'boun-cmpe' THEN
      v_titles := ARRAY[
        'Self-Supervised Contrastive Learning for Medical Image Segmentation',
        'Multi-Modal Transformer for Visual Question Answering',
        'Zero-Shot Text Classification with Prompt Engineering',
        'Explainable Anomaly Detection in Time-Series Sensor Data',
        'Few-Shot Named Entity Recognition for Turkish Clinical Notes',
        'Vision Transformer Fine-Tuning for Satellite Image Classification',
        'Diffusion Model for Architectural Floor Plan Generation',
        'Causal Inference Framework for A/B Test Analysis',
        'Attention-Based Scene Graph Generation from Video Streams',
        'Contrastive Pre-Training for Low-Resource Speech Recognition',
        'Generative Adversarial Network for Data Augmentation in Pathology',
        'Knowledge Distillation Pipeline for On-Device NLP',
        'Reinforcement Learning Agent for Dynamic Traffic Routing',
        'Multi-Task Learning Framework for Document Understanding',
        'Neural Architecture Search for Efficient Object Detectors',
        'Graph Attention Network for Protein Interaction Prediction',
        'Retrieval-Augmented Generation for Legal Document Summarization',
        'Self-Supervised Depth Estimation from Monocular Video',
        'Federated Multi-Task Learning for IoT Anomaly Detection',
        'Hyperparameter Optimization Framework Using Bayesian Methods',
        'Cross-Lingual Sentiment Transfer for Under-Resourced Languages',
        'Active Learning Pipeline for Image Annotation at Scale',
        'Temporal Action Localization in Untrimmed Lecture Videos',
        'Continual Learning Benchmark for Vision Classification Tasks',
        'Sparse Mixture-of-Experts Model for Multilingual Translation'
      ];
    ELSIF v_tenant_code = 'metu-me' THEN
      v_titles := ARRAY[
        'Topology-Optimized Bracket for UAV Landing Gear Assembly',
        'CFD-Validated Heat Exchanger for Data Center Cooling',
        'Lightweight Robotic Gripper Using Compliant Mechanisms',
        'Additive Manufacturing of Lattice Structures for Bone Implants',
        'Vibration Analysis of Composite Wind Turbine Blades',
        'Thermal Management System for Electric Vehicle Battery Packs',
        'Bio-Inspired Robotic Fish for Underwater Survey',
        'Finite Element Analysis of Crash-Resistant Vehicle Frames',
        'Shape Memory Alloy Actuator for Deployable Solar Panels',
        'Ergonomic Hand Tool Design with Force Distribution Analysis',
        'Micro-Channel Cooling System for High-Power LED Modules',
        'Gear Tooth Profile Optimization for Low-Noise Gearboxes',
        'Wind Tunnel Testing Platform for Aerodynamics Courses',
        'Pneumatic Soft Gripper for Delicate Produce Handling',
        'Thermo-Mechanical Fatigue Life Prediction for Turbine Discs',
        'Desktop 3D Printer Calibration and Quality Control Suite',
        'Regenerative Shock Absorber for Energy Harvesting Vehicles',
        'Centrifugal Pump Impeller Redesign with CFD Optimization',
        'Compliant Mechanism Forceps for Minimally Invasive Surgery',
        'Suspension Kinematics Simulator for Formula Student Car',
        'Laser Cutter Fume Extraction and Filtration System Design',
        'Planetary Gear Reducer for Compact Servo Actuators',
        'Thermal Runaway Containment Chamber for Li-Ion Cells',
        'Injection Mold Flow Analysis for Thin-Wall Plastic Parts',
        'Modular Prosthetic Hand with Tendon-Driven Fingers'
      ];
    ELSE -- metu-ie
      v_titles := ARRAY[
        'Multi-Objective Warehouse Layout Using Genetic Algorithms',
        'Stochastic Demand Forecasting for Perishable Goods Supply Chains',
        'Simulation-Based Scheduling for Mixed-Model Assembly Lines',
        'Data-Driven Quality Control Dashboard for Automotive Parts',
        'Digital Twin of a Hospital Emergency Department',
        'Lean Six Sigma Improvement Plan for Campus Dining Operations',
        'Robust Vehicle Routing Under Travel Time Uncertainty',
        'Machine Learning Pipeline for Predictive Maintenance',
        'E-Commerce Last-Mile Delivery Network Optimization',
        'Risk Assessment Matrix Tool for Construction Projects',
        'Ergonomic Workstation Design Using REBA and RULA Analysis',
        'Inventory Policy Comparison Under Non-Stationary Demand',
        'Monte Carlo Simulation of Airport Check-In Queue Dynamics',
        'Integer Programming Model for University Course Timetabling',
        'Sustainable Supplier Selection with Fuzzy AHP Framework',
        'Healthcare Staff Scheduling with Fairness Constraints',
        'Discrete-Event Simulation of a Parcel Sorting Hub',
        'Production Lot Sizing with Setup Time Dependent Costs',
        'Analytical Hierarchy Process for Technology Vendor Evaluation',
        'Capacity Planning Model for Semiconductor Fabrication Line',
        'Kanban System Design for Small-Batch Electronics Assembly',
        'Network Flow Model for Inter-City Cargo Distribution',
        'Statistical Process Control Dashboard with Real-Time Alerts',
        'Workforce Planning Optimization for Seasonal Retail Operations',
        'Revenue Management Model for Boutique Hotel Booking'
      ];
    END IF;

    -- Project count varies by tenant size
    IF v_is_summer THEN
      v_project_count := 3 + floor(random() * 3)::int;
    ELSIF v_is_spring THEN
      IF v_tenant_code IN ('boun-chem', 'boun-cmpe') THEN
        v_project_count := 13 + floor(random() * 4)::int;
      ELSIF v_tenant_code IN ('metu-me', 'metu-ie') THEN
        v_project_count := 10 + floor(random() * 4)::int;
      ELSE
        v_project_count := 12 + floor(random() * 4)::int;
      END IF;
    ELSE -- fall
      IF v_tenant_code IN ('boun-chem', 'boun-cmpe') THEN
        v_project_count := 11 + floor(random() * 3)::int;
      ELSIF v_tenant_code IN ('metu-me', 'metu-ie') THEN
        v_project_count := 9 + floor(random() * 3)::int;
      ELSE
        v_project_count := 10 + floor(random() * 3)::int;
      END IF;
    END IF;

    v_used_titles := ARRAY[]::text[];
    v_used_sem_names := ARRAY[]::text[];

    FOR v_group_no IN 1..v_project_count LOOP
      -- Select unique title from curated pool
      v_retry := 0;
      LOOP
        v_title := v_titles[1 + floor(random() * array_length(v_titles, 1))::int];
        v_retry := v_retry + 1;
        EXIT WHEN NOT (v_title = ANY(v_used_titles));
        IF v_retry > 100 THEN
          v_title := v_title || ' (Group ' || v_group_no || ')';
          EXIT;
        END IF;
      END LOOP;
      v_used_titles := array_append(v_used_titles, v_title);

      -- Generate student group (2-4 students, discipline-weighted draw)
      v_student_count := 2 + floor(random() * 3)::int;
      v_picked := ARRAY[]::text[];
      v_students := '';
      v_i := 0;
      WHILE v_i < v_student_count LOOP
        LOOP
          -- 70% Turkish / 30% international for Turkish universities
          IF random() < 0.70 THEN
            v_candidate := v_turkish_names[1 + floor(random() * array_length(v_turkish_names, 1))::int];
          ELSE
            v_candidate := v_intl_names[1 + floor(random() * array_length(v_intl_names, 1))::int];
          END IF;
          EXIT WHEN NOT (v_candidate = ANY(v_picked))
                AND NOT (v_candidate = ANY(v_used_sem_names));
        END LOOP;
        v_picked := array_append(v_picked, v_candidate);
        v_used_sem_names := array_append(v_used_sem_names, v_candidate);
        IF v_i > 0 THEN v_students := v_students || '; '; END IF;
        v_students := v_students || v_candidate;
        v_i := v_i + 1;
      END LOOP;

      INSERT INTO projects (semester_id, tenant_id, group_no, project_title, group_students)
      VALUES (v_sem.id, v_sem.tenant_id, v_group_no, v_title, v_students)
      ON CONFLICT (semester_id, group_no) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- Normalize project timestamps
UPDATE projects p SET
  created_at = s.poster_date::timestamptz - interval '14 days' + (random() * interval '10 days'),
  updated_at = s.poster_date::timestamptz - interval '7 days' + (random() * interval '5 days')
FROM semesters s
WHERE s.id = p.semester_id;

-- ── Section 8: Juror-semester assignments ───────────────────
-- Juror counts vary by tenant size. First 4 are cross-tenant core.
-- Pre-creates empty score rows (criteria_scores = NULL).

DO $$
DECLARE
  v_tenant record;
  v_sem record;
  v_juror record;
  v_juror_idx int;
  v_pick_count int;
  v_is_summer boolean;
  v_core_ids uuid[];
  v_pin text;
  v_hash text;
BEGIN
  SELECT array_agg(id ORDER BY id) INTO v_core_ids
  FROM (SELECT id FROM jurors ORDER BY id LIMIT 4) core;

  FOR v_tenant IN SELECT id, code FROM tenants ORDER BY code LOOP
    FOR v_sem IN
      SELECT id, semester_name, poster_date, tenant_id FROM semesters
      WHERE tenant_id = v_tenant.id ORDER BY poster_date
    LOOP
      v_is_summer := lower(v_sem.semester_name) LIKE '%summer%';
      IF v_is_summer THEN
        v_pick_count := 4 + floor(random() * 3)::int;
      ELSIF v_tenant.code IN ('boun-chem', 'boun-cmpe') THEN
        v_pick_count := 12 + floor(random() * 3)::int;
      ELSIF v_tenant.code IN ('metu-me', 'metu-ie') THEN
        v_pick_count := 8 + floor(random() * 3)::int;
      ELSE
        v_pick_count := 10 + floor(random() * 3)::int;
      END IF;

      v_juror_idx := 0;

      FOR v_juror IN
        SELECT id FROM jurors
        ORDER BY
          CASE WHEN id = ANY(v_core_ids) THEN 0 ELSE 1 END,
          hashtext(id::text || v_tenant.code),
          id
      LOOP
        v_juror_idx := v_juror_idx + 1;
        EXIT WHEN v_juror_idx > v_pick_count;

        v_pin := lpad(
          abs(hashtext(v_juror.id::text || v_sem.id::text) % 10000)::text,
          4, '0');

        BEGIN
          v_hash := crypt(v_pin, gen_salt('bf'));

          INSERT INTO juror_semester_auth (juror_id, semester_id, tenant_id, pin_hash)
          VALUES (v_juror.id, v_sem.id, v_tenant.id, v_hash)
          ON CONFLICT (juror_id, semester_id) DO NOTHING;

          INSERT INTO scores (semester_id, project_id, juror_id, tenant_id)
          SELECT v_sem.id, p.id, v_juror.id, v_tenant.id
          FROM projects p
          WHERE p.semester_id = v_sem.id
          ON CONFLICT ON CONSTRAINT scores_unique_eval DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;

-- ── Section 9: Score generation (workflow-first realism) ─────
-- Priority: workflow state → row shape → numeric scores.
-- Uses temp table for effective-state tracking across generation
-- and sanity checks.

CREATE TEMP TABLE IF NOT EXISTS _seed_effective_state (
  juror_id uuid,
  semester_id uuid,
  effective_status text,
  PRIMARY KEY (juror_id, semester_id)
);

DO $$
DECLARE
  v_sem record;
  v_juror record;
  v_proj record;

  -- Status
  v_bucket int;
  v_status text;
  v_has_editing boolean;
  v_has_in_progress boolean;
  v_first_submitted_juror uuid;
  v_juror_idx int;

  -- Score generation
  v_template jsonb;
  v_max_total int;
  v_target_min int;
  v_target_max int;
  v_floor float;
  v_eff_floor float;
  v_crit_floor float;
  v_bias float;
  v_juror_offset float;
  v_cs jsonb;
  v_cs_temp jsonb;
  v_sum int;
  v_sum_temp int;
  v_rescale_target int;
  v_val int;
  v_key text;
  v_max int;
  v_crit jsonb;
  v_attempt int;

  -- Partial/untouched scoring
  v_incomplete_proj uuid;
  v_untouched_proj uuid;
  v_coin float;
  v_all_keys text[];
  v_remove_idx1 int;
  v_remove_idx2 int;

  -- Comments
  v_positive_comments text[];
  v_neutral_comments text[];
  v_constructive_comments text[];
  v_domain_comments text[];
  v_comment text;
  v_score_pct float;
  v_comment_roll float;

  -- Timestamps
  v_poster_ts timestamptz;
  v_start_min int;
  v_per_proj_min int;
  v_cumulative_min int;
  v_updated_at timestamptz;
  v_created_at timestamptz;
  v_max_updated_at timestamptz;
  v_final_at timestamptz;
  v_offset_sec int;

  -- Project counting
  v_proj_count int;
BEGIN
  -- Step 1: Disable updated_at trigger
  ALTER TABLE scores DISABLE TRIGGER trg_scores_updated_at;

  -- Step 2: Reset score data for re-runs
  UPDATE scores SET
    criteria_scores = NULL,
    comment = NULL,
    final_submitted_at = NULL
  WHERE semester_id IN (
    SELECT id FROM semesters WHERE tenant_id IN (SELECT id FROM tenants)
  );

  -- Comment pools (tiered by score)
  v_positive_comments := ARRAY[
    'Strong technical foundation, well-structured presentation.',
    'Solid methodology, results clearly presented.',
    'Well-organized poster, excellent Q&A responses.',
    'Outstanding integration of hardware and software components.',
    'Balanced contribution from all team members.',
    'Ambitious scope, well executed within the timeline.'
  ];

  v_neutral_comments := ARRAY[
    'Clear problem definition, practical relevance is evident.',
    'Professional presentation quality, minor formatting issues.',
    'Good effort overall, implementation could be more robust.',
    'Would benefit from deeper literature review.',
    'Interesting approach, some aspects need further development.',
    'Reasonable scope but limited novelty in the solution.'
  ];

  v_constructive_comments := ARRAY[
    'Good teamwork but written communication needs improvement.',
    'Creative approach but needs more rigorous testing.',
    'Impressive demo, some gaps in theoretical justification.',
    'Scope is overly ambitious for the given timeline.',
    'Testing methodology needs more structure and coverage.',
    'Results section is weak; needs more quantitative evidence.'
  ];

  FOR v_sem IN
    SELECT s.id, s.semester_name, s.poster_date, s.criteria_template, s.is_current,
           t.code AS tenant_code, t.id AS tenant_id
    FROM semesters s
    JOIN tenants t ON t.id = s.tenant_id
    ORDER BY t.code, s.poster_date
  LOOP
    v_template := v_sem.criteria_template;
    IF v_template IS NULL OR jsonb_array_length(v_template) = 0 THEN
      CONTINUE;
    END IF;

    -- Compute max total from template
    v_max_total := 0;
    FOR v_crit IN SELECT * FROM jsonb_array_elements(v_template) LOOP
      v_max_total := v_max_total + (v_crit->>'max')::int;
    END LOOP;
    v_target_min := floor(0.70 * v_max_total)::int;
    v_target_max := v_max_total;

    -- Tenant-specific scoring floor
    v_floor := CASE v_sem.tenant_code
      WHEN 'tedu-ee' THEN 0.60
      WHEN 'tedu-ce' THEN 0.65
      WHEN 'boun-chem' THEN 0.68
      WHEN 'boun-cmpe' THEN 0.66
      WHEN 'metu-me' THEN 0.58
      WHEN 'metu-ie' THEN 0.55
      ELSE 0.60
    END;

    -- Domain-specific comments
    IF v_sem.tenant_code IN ('tedu-ee', 'boun-chem') THEN
      v_domain_comments := ARRAY[
        'PCB layout is clean; decoupling could be improved.',
        'Signal integrity looks solid, good use of differential pairs.',
        'Measurement setup was well calibrated, repeatable results.',
        'Power budget analysis is thorough and realistic.',
        'Oscilloscope captures support the claimed performance well.'
      ];
    ELSIF v_sem.tenant_code IN ('tedu-ce', 'boun-cmpe') THEN
      v_domain_comments := ARRAY[
        'Code architecture is modular and well-documented.',
        'Dataset split and evaluation metrics are appropriate.',
        'Latency benchmarks are convincing for the target platform.',
        'Good use of version control and CI/CD pipeline.',
        'Security considerations are addressed but could go deeper.'
      ];
    ELSIF v_sem.tenant_code = 'metu-me' THEN
      v_domain_comments := ARRAY[
        'FEA mesh convergence study adds credibility to results.',
        'Material selection is well justified for the load case.',
        'Manufacturing tolerance analysis shows practical thinking.',
        'Prototype demonstrates good alignment with simulation.',
        'Thermal boundary conditions are realistic and documented.'
      ];
    ELSE -- metu-ie
      v_domain_comments := ARRAY[
        'Sensitivity analysis covers the key decision variables.',
        'Simulation run length and warm-up are statistically justified.',
        'Constraint formulation captures real-world limitations well.',
        'Dashboard visualization makes the model output accessible.',
        'Comparison with baseline heuristic shows clear improvement.'
      ];
    END IF;

    v_poster_ts := v_sem.poster_date::timestamptz;
    v_has_editing := false;
    v_has_in_progress := false;
    v_first_submitted_juror := NULL;
    v_juror_idx := 0;

    -- Step 3: Iterate jurors — determine workflow state
    FOR v_juror IN
      SELECT jsa.juror_id
      FROM juror_semester_auth jsa
      WHERE jsa.semester_id = v_sem.id
      ORDER BY jsa.juror_id
    LOOP
      v_juror_idx := v_juror_idx + 1;

      v_bucket := abs(hashtext(v_juror.juror_id::text || v_sem.id::text)) % 100;
      IF v_bucket <= 2 THEN
        v_status := 'not_started';
      ELSIF v_bucket <= 6 THEN
        v_status := 'in_progress';
        v_has_in_progress := true;
      ELSIF v_bucket = 7 THEN
        v_status := 'editing';
        v_has_editing := true;
      ELSIF v_bucket <= 12 THEN
        v_status := 'submitted';
        IF v_first_submitted_juror IS NULL THEN
          v_first_submitted_juror := v_juror.juror_id;
        END IF;
      ELSE
        v_status := 'completed';
      END IF;

      -- Record raw state in effective-state table
      INSERT INTO _seed_effective_state (juror_id, semester_id, effective_status)
      VALUES (v_juror.juror_id, v_sem.id, v_status)
      ON CONFLICT (juror_id, semester_id) DO UPDATE SET effective_status = EXCLUDED.effective_status;

      -- not_started: leave all score rows untouched
      IF v_status = 'not_started' THEN
        CONTINUE;
      END IF;

      -- Step 4: Determine row completeness pattern
      v_incomplete_proj := NULL;
      v_untouched_proj := NULL;
      IF v_status = 'in_progress' THEN
        -- 50/50 coin flip: partial row vs untouched row
        v_coin := random();
        IF v_coin < 0.50 THEN
          -- Leave one project partial (some keys omitted)
          SELECT id INTO v_incomplete_proj
          FROM projects WHERE semester_id = v_sem.id
          ORDER BY random() LIMIT 1;
        ELSE
          -- Leave one project untouched (NULL criteria_scores)
          SELECT id INTO v_untouched_proj
          FROM projects WHERE semester_id = v_sem.id
          ORDER BY random() LIMIT 1;
        END IF;
        -- Optionally leave a second project untouched if many projects
        SELECT count(*) INTO v_proj_count FROM projects WHERE semester_id = v_sem.id;
        IF v_proj_count > 8 AND random() < 0.40 THEN
          SELECT id INTO v_untouched_proj
          FROM projects WHERE semester_id = v_sem.id
            AND id IS DISTINCT FROM v_incomplete_proj
            AND id IS DISTINCT FROM v_untouched_proj
          ORDER BY random() LIMIT 1;
        END IF;
      END IF;

      -- Juror-level strictness variance
      v_juror_offset := (hashtext(v_juror.juror_id::text) % 9 - 4) * 0.01;

      -- Timestamp distribution
      v_start_min      := floor(random() * 90)::int;
      v_per_proj_min   := 8 + floor(random() * 7)::int;
      v_cumulative_min := 0;
      v_max_updated_at := NULL;

      -- Step 5: Generate scores per project
      FOR v_proj IN
        SELECT id, group_no
        FROM projects
        WHERE semester_id = v_sem.id
        ORDER BY group_no
      LOOP
        -- Skip untouched projects for in_progress jurors
        IF v_status = 'in_progress' AND v_proj.id = v_untouched_proj THEN
          CONTINUE;
        END IF;

        -- Effective floor with outlier adjustments
        v_eff_floor := v_floor + v_juror_offset;
        IF v_sem.is_current AND v_proj.group_no = 1 THEN
          v_eff_floor := LEAST(v_eff_floor + 0.15, 0.90);
        ELSIF v_sem.is_current AND v_proj.group_no = 2 THEN
          IF v_juror_idx % 2 = 0 THEN
            v_eff_floor := GREATEST(v_eff_floor - 0.10, 0.40);
          ELSE
            v_eff_floor := LEAST(v_eff_floor + 0.10, 0.90);
          END IF;
        END IF;

        -- Score generation with retry loop (fully scored rows only target [70%, 100%])
        FOR v_attempt IN 1..15 LOOP
          v_cs := '{}'::jsonb;
          v_sum := 0;
          FOR v_crit IN SELECT * FROM jsonb_array_elements(v_template) LOOP
            v_key := v_crit->>'key';
            v_max := (v_crit->>'max')::int;

            -- Per-tenant criterion-level bias
            v_bias := CASE
              WHEN v_sem.tenant_code = 'tedu-ee' AND v_key = 'design'       THEN -0.06
              WHEN v_sem.tenant_code = 'tedu-ee' AND v_key = 'technical'    THEN  0.05
              WHEN v_sem.tenant_code = 'tedu-ce' AND v_key = 'delivery'     THEN -0.05
              WHEN v_sem.tenant_code = 'tedu-ce' AND v_key = 'teamwork'     THEN  0.04
              WHEN v_sem.tenant_code = 'boun-chem' AND v_key = 'design'       THEN -0.07
              WHEN v_sem.tenant_code = 'boun-chem' AND v_key = 'delivery'     THEN -0.05
              WHEN v_sem.tenant_code = 'boun-chem' AND v_key = 'technical'    THEN  0.06
              WHEN v_sem.tenant_code = 'boun-cmpe' AND v_key = 'teamwork'     THEN  0.03
              WHEN v_sem.tenant_code = 'metu-me' AND v_key = 'technical'    THEN  0.06
              WHEN v_sem.tenant_code = 'metu-me' AND v_key = 'presentation' THEN -0.05
              WHEN v_sem.tenant_code = 'metu-ie' AND v_key = 'report'       THEN  0.05
              WHEN v_sem.tenant_code = 'metu-ie' AND v_key = 'technical'    THEN -0.04
              ELSE 0.0
            END;

            v_crit_floor := GREATEST(0.30, LEAST(0.95, v_eff_floor + v_bias));
            v_val := floor(v_crit_floor * v_max + random() * ((1.0 - v_crit_floor) * v_max))::int;
            IF v_val > v_max THEN v_val := v_max; END IF;
            IF v_val < 0 THEN v_val := 0; END IF;
            v_cs := v_cs || jsonb_build_object(v_key, v_val);
            v_sum := v_sum + v_val;
          END LOOP;

          -- For partial rows, no retry constraint needed
          IF v_status = 'in_progress' AND v_proj.id = v_incomplete_proj THEN
            EXIT;
          END IF;
          EXIT WHEN v_sum >= v_target_min AND v_sum <= v_target_max;
        END LOOP;

        -- Fallback rescaling for fully scored rows still out of range
        IF NOT (v_status = 'in_progress' AND v_proj.id = v_incomplete_proj)
           AND (v_sum < v_target_min OR v_sum > v_target_max)
        THEN
          v_cs_temp := v_cs;
          v_sum_temp := v_sum;
          v_rescale_target := floor(0.85 * v_max_total)::int;
          v_cs := '{}'::jsonb;
          v_sum := 0;
          FOR v_crit IN SELECT * FROM jsonb_array_elements(v_template) LOOP
            v_key := v_crit->>'key';
            v_max := (v_crit->>'max')::int;
            v_val := LEAST(
              round((v_cs_temp->>v_key)::int::float * v_rescale_target::float
                    / GREATEST(v_sum_temp, 1)::float)::int,
              v_max);
            IF v_val < 0 THEN v_val := 0; END IF;
            v_cs := v_cs || jsonb_build_object(v_key, v_val);
            v_sum := v_sum + v_val;
          END LOOP;
        END IF;

        -- Handle partial scoring for in_progress juror's incomplete project
        IF v_status = 'in_progress' AND v_proj.id = v_incomplete_proj THEN
          v_all_keys := ARRAY(SELECT jsonb_object_keys(v_cs));
          IF array_length(v_all_keys, 1) > 2 THEN
            v_remove_idx1 := 1 + floor(random() * array_length(v_all_keys, 1))::int;
            LOOP
              v_remove_idx2 := 1 + floor(random() * array_length(v_all_keys, 1))::int;
              EXIT WHEN v_remove_idx2 <> v_remove_idx1;
            END LOOP;
            v_cs := v_cs - v_all_keys[v_remove_idx1] - v_all_keys[v_remove_idx2];
          ELSIF array_length(v_all_keys, 1) = 2 THEN
            v_remove_idx1 := 1 + floor(random() * 2)::int;
            v_cs := v_cs - v_all_keys[v_remove_idx1];
          END IF;
        END IF;

        -- Step 6: Comment with score consistency
        v_comment := NULL;
        IF random() < 0.30 THEN
          v_score_pct := v_sum::float / GREATEST(v_max_total, 1)::float;
          v_comment_roll := random();
          IF v_score_pct > 0.85 THEN
            -- High score: positive or neutral or domain
            IF v_comment_roll < 0.50 THEN
              v_comment := v_positive_comments[1 + floor(random() * array_length(v_positive_comments, 1))::int];
            ELSIF v_comment_roll < 0.80 THEN
              v_comment := v_neutral_comments[1 + floor(random() * array_length(v_neutral_comments, 1))::int];
            ELSE
              v_comment := v_domain_comments[1 + floor(random() * array_length(v_domain_comments, 1))::int];
            END IF;
          ELSIF v_score_pct < 0.65 THEN
            -- Low score: constructive or neutral or domain
            IF v_comment_roll < 0.50 THEN
              v_comment := v_constructive_comments[1 + floor(random() * array_length(v_constructive_comments, 1))::int];
            ELSIF v_comment_roll < 0.80 THEN
              v_comment := v_neutral_comments[1 + floor(random() * array_length(v_neutral_comments, 1))::int];
            ELSE
              v_comment := v_domain_comments[1 + floor(random() * array_length(v_domain_comments, 1))::int];
            END IF;
          ELSE
            -- Mid score: neutral or domain or positive or constructive
            IF v_comment_roll < 0.40 THEN
              v_comment := v_neutral_comments[1 + floor(random() * array_length(v_neutral_comments, 1))::int];
            ELSIF v_comment_roll < 0.70 THEN
              v_comment := v_domain_comments[1 + floor(random() * array_length(v_domain_comments, 1))::int];
            ELSIF v_comment_roll < 0.85 THEN
              v_comment := v_positive_comments[1 + floor(random() * array_length(v_positive_comments, 1))::int];
            ELSE
              v_comment := v_constructive_comments[1 + floor(random() * array_length(v_constructive_comments, 1))::int];
            END IF;
          END IF;
        END IF;

        -- Step 7: Timestamps (poster-day timeline)
        v_cumulative_min := v_cumulative_min + v_per_proj_min + floor(random() * 6)::int;
        v_offset_sec := floor(random() * 60)::int;
        v_updated_at := v_poster_ts
          + interval '13 hours'
          + make_interval(mins => v_start_min + v_cumulative_min, secs => v_offset_sec);

        IF v_updated_at > v_poster_ts + interval '17 hours 30 minutes' THEN
          v_updated_at := v_poster_ts + interval '17 hours'
            + make_interval(secs => floor(random() * 1800)::int);
        END IF;

        v_created_at := v_updated_at - make_interval(mins => 1 + floor(random() * 10)::int);
        IF v_created_at < v_poster_ts + interval '13 hours' THEN
          v_created_at := v_poster_ts + interval '13 hours';
        END IF;

        IF v_max_updated_at IS NULL OR v_updated_at > v_max_updated_at THEN
          v_max_updated_at := v_updated_at;
        END IF;

        -- Update the pre-created score row
        UPDATE scores SET
          criteria_scores = v_cs,
          comment = v_comment,
          created_at = v_created_at,
          updated_at = v_updated_at,
          final_submitted_at = NULL
        WHERE semester_id = v_sem.id
          AND project_id = v_proj.id
          AND juror_id = v_juror.juror_id;

      END LOOP; -- projects

      -- Step 8: Set workflow markers
      IF v_status = 'completed' AND v_max_updated_at IS NOT NULL THEN
        v_final_at := v_max_updated_at + make_interval(mins => 20 + floor(random() * 21)::int);
        UPDATE scores SET final_submitted_at = v_final_at
        WHERE semester_id = v_sem.id AND juror_id = v_juror.juror_id;
      END IF;

      IF v_max_updated_at IS NOT NULL THEN
        UPDATE juror_semester_auth SET
          last_seen_at = v_max_updated_at + make_interval(mins => 3 + floor(random() * 21)::int)
        WHERE semester_id = v_sem.id AND juror_id = v_juror.juror_id;
      END IF;

      IF v_status = 'editing' THEN
        UPDATE juror_semester_auth SET edit_enabled = true
        WHERE semester_id = v_sem.id AND juror_id = v_juror.juror_id;
      END IF;

    END LOOP; -- jurors

    -- Step 9: Active-semester guarantees
    -- Editing guarantee
    IF v_sem.is_current AND NOT v_has_editing AND v_first_submitted_juror IS NOT NULL THEN
      UPDATE juror_semester_auth SET edit_enabled = true
      WHERE semester_id = v_sem.id AND juror_id = v_first_submitted_juror;
      UPDATE _seed_effective_state SET effective_status = 'editing'
      WHERE semester_id = v_sem.id AND juror_id = v_first_submitted_juror;
      v_has_editing := true;
    END IF;

    -- In-progress guarantee (best-effort)
    IF v_sem.is_current AND NOT v_has_in_progress THEN
      DECLARE
        v_ip_juror uuid;
        v_ip_proj uuid;
        v_ip_keys text[];
      BEGIN
        -- Find a submitted juror to force-promote
        SELECT jsa.juror_id INTO v_ip_juror
        FROM juror_semester_auth jsa
        JOIN _seed_effective_state es ON es.juror_id = jsa.juror_id AND es.semester_id = jsa.semester_id
        WHERE jsa.semester_id = v_sem.id
          AND es.effective_status = 'submitted'
          AND jsa.juror_id IS DISTINCT FROM v_first_submitted_juror
        ORDER BY jsa.juror_id LIMIT 1;

        IF v_ip_juror IS NOT NULL THEN
          -- Pick one of their scored projects and null out 2 keys
          SELECT sc.project_id INTO v_ip_proj
          FROM scores sc
          WHERE sc.semester_id = v_sem.id AND sc.juror_id = v_ip_juror
            AND sc.criteria_scores IS NOT NULL
          ORDER BY random() LIMIT 1;

          IF v_ip_proj IS NOT NULL THEN
            v_ip_keys := ARRAY(
              SELECT jsonb_object_keys(sc.criteria_scores)
              FROM scores sc
              WHERE sc.semester_id = v_sem.id AND sc.juror_id = v_ip_juror AND sc.project_id = v_ip_proj
            );
            IF array_length(v_ip_keys, 1) > 2 THEN
              v_remove_idx1 := 1 + floor(random() * array_length(v_ip_keys, 1))::int;
              LOOP
                v_remove_idx2 := 1 + floor(random() * array_length(v_ip_keys, 1))::int;
                EXIT WHEN v_remove_idx2 <> v_remove_idx1;
              END LOOP;
              UPDATE scores SET
                criteria_scores = criteria_scores - v_ip_keys[v_remove_idx1] - v_ip_keys[v_remove_idx2],
                final_submitted_at = NULL
              WHERE semester_id = v_sem.id AND juror_id = v_ip_juror AND project_id = v_ip_proj;
            END IF;

            -- Clear any final_submitted_at on all their rows
            UPDATE scores SET final_submitted_at = NULL
            WHERE semester_id = v_sem.id AND juror_id = v_ip_juror;

            UPDATE _seed_effective_state SET effective_status = 'in_progress'
            WHERE semester_id = v_sem.id AND juror_id = v_ip_juror;
          END IF;
        END IF;
      END;
    END IF;

  END LOOP; -- semesters

  -- Step 10: Defensive cleanup
  WITH completed_jurors AS (
    SELECT sc.semester_id, sc.juror_id
    FROM scores sc
    WHERE sc.final_submitted_at IS NOT NULL
    GROUP BY sc.semester_id, sc.juror_id
  )
  UPDATE juror_semester_auth a SET edit_enabled = false
  FROM completed_jurors cj
  WHERE a.semester_id = cj.semester_id
    AND a.juror_id = cj.juror_id
    AND a.edit_enabled = true;

  -- Step 11: Re-enable trigger
  ALTER TABLE scores ENABLE TRIGGER trg_scores_updated_at;
END;
$$;

-- ── Section 10: Audit logs (tenant-aware, 4 phases) ─────────

-- Phase 1 — Preparation

-- juror_create: global, use super-admin as actor
INSERT INTO audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata, tenant_id)
SELECT
  (SELECT MIN(poster_date)::timestamptz FROM semesters)
    - interval '30 days'
    + (random() * interval '10 days')
    + (row_number() OVER (ORDER BY j.id) * interval '2 seconds'),
  'admin', '2596753a-90f1-42c3-9bd4-d8d239db945f'::uuid,
  'juror_create', 'juror', j.id,
  format('Admin created juror %s.', j.juror_name),
  NULL,
  NULL
FROM jurors j;

-- semester_create: tenant-scoped, use tenant admin as actor
INSERT INTO audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata, tenant_id)
SELECT
  s.poster_date::timestamptz - interval '45 days' + (random() * interval '6 hours')
    + (row_number() OVER (ORDER BY s.poster_date) * interval '1 second'),
  'admin',
  CASE t.code
    WHEN 'tedu-ee' THEN 'ba34acd9-678b-4a40-bf86-cdf96b773cc7'::uuid
    WHEN 'tedu-ce' THEN '0ad71a4f-a424-4d68-8f37-d72df1f176a1'::uuid
    WHEN 'boun-chem' THEN '97741fa5-430e-4421-85c1-8582e299ce97'::uuid
    WHEN 'boun-cmpe' THEN '73d0a0bd-c1c1-4ba8-9e6c-bacc119b20da'::uuid
    WHEN 'metu-me' THEN 'bba141f5-49df-486c-b42a-dc7f7dc51263'::uuid
    WHEN 'metu-ie' THEN 'f688fc98-c5a7-4888-b47d-3e4cafc5b5ba'::uuid
  END,
  'semester_create', 'semester', s.id,
  format('Admin created semester %s.', s.semester_name),
  jsonb_build_object('poster_date', s.poster_date),
  s.tenant_id
FROM semesters s
JOIN tenants t ON t.id = s.tenant_id;

-- project_create: per project, tenant-scoped
INSERT INTO audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata, tenant_id)
SELECT
  s.poster_date::timestamptz - interval '14 days' + (random() * interval '4 days')
    + (row_number() OVER (PARTITION BY p.semester_id ORDER BY p.group_no) * interval '3 seconds'),
  'admin',
  CASE t.code
    WHEN 'tedu-ee' THEN 'ba34acd9-678b-4a40-bf86-cdf96b773cc7'::uuid
    WHEN 'tedu-ce' THEN '0ad71a4f-a424-4d68-8f37-d72df1f176a1'::uuid
    WHEN 'boun-chem' THEN '97741fa5-430e-4421-85c1-8582e299ce97'::uuid
    WHEN 'boun-cmpe' THEN '73d0a0bd-c1c1-4ba8-9e6c-bacc119b20da'::uuid
    WHEN 'metu-me' THEN 'bba141f5-49df-486c-b42a-dc7f7dc51263'::uuid
    WHEN 'metu-ie' THEN 'f688fc98-c5a7-4888-b47d-3e4cafc5b5ba'::uuid
  END,
  'project_create', 'project', p.id,
  format('Admin created project Group %s — %s.', p.group_no, p.project_title),
  jsonb_build_object('semester_id', p.semester_id, 'group_no', p.group_no),
  s.tenant_id
FROM projects p
JOIN semesters s ON s.id = p.semester_id
JOIN tenants t ON t.id = s.tenant_id;

-- set_active_semester: active semesters only
INSERT INTO audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata, tenant_id)
SELECT
  s.poster_date::timestamptz - interval '10 days' + (random() * interval '3 hours'),
  'admin',
  CASE t.code
    WHEN 'tedu-ee' THEN 'ba34acd9-678b-4a40-bf86-cdf96b773cc7'::uuid
    WHEN 'tedu-ce' THEN '0ad71a4f-a424-4d68-8f37-d72df1f176a1'::uuid
    WHEN 'boun-chem' THEN '97741fa5-430e-4421-85c1-8582e299ce97'::uuid
    WHEN 'boun-cmpe' THEN '73d0a0bd-c1c1-4ba8-9e6c-bacc119b20da'::uuid
    WHEN 'metu-me' THEN 'bba141f5-49df-486c-b42a-dc7f7dc51263'::uuid
    WHEN 'metu-ie' THEN 'f688fc98-c5a7-4888-b47d-3e4cafc5b5ba'::uuid
  END,
  'set_active_semester', 'semester', s.id,
  format('Admin set active semester to %s.', s.semester_name),
  jsonb_build_object('semester_id', s.id, 'semester_name', s.semester_name),
  s.tenant_id
FROM semesters s
JOIN tenants t ON t.id = s.tenant_id
WHERE s.is_current = true;

-- eval_lock_toggle: active semesters
INSERT INTO audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata, tenant_id)
SELECT
  s.poster_date::timestamptz - interval '8 days' + (random() * interval '3 hours'),
  'admin',
  CASE t.code
    WHEN 'tedu-ee' THEN 'ba34acd9-678b-4a40-bf86-cdf96b773cc7'::uuid
    WHEN 'tedu-ce' THEN '0ad71a4f-a424-4d68-8f37-d72df1f176a1'::uuid
    WHEN 'boun-chem' THEN '97741fa5-430e-4421-85c1-8582e299ce97'::uuid
    WHEN 'boun-cmpe' THEN '73d0a0bd-c1c1-4ba8-9e6c-bacc119b20da'::uuid
    WHEN 'metu-me' THEN 'bba141f5-49df-486c-b42a-dc7f7dc51263'::uuid
    WHEN 'metu-ie' THEN 'f688fc98-c5a7-4888-b47d-3e4cafc5b5ba'::uuid
  END,
  'eval_lock_toggle', 'semester', s.id,
  format('Admin turned evaluation lock ON (%s).', s.semester_name),
  jsonb_build_object('semester_id', s.id, 'enabled', true),
  s.tenant_id
FROM semesters s
JOIN tenants t ON t.id = s.tenant_id
WHERE s.is_current = true;

-- entry_token_generate: semesters with tokens
INSERT INTO audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata, tenant_id)
SELECT
  s.entry_token_created_at + interval '1 second',
  'admin',
  CASE t.code
    WHEN 'tedu-ee' THEN 'ba34acd9-678b-4a40-bf86-cdf96b773cc7'::uuid
    WHEN 'tedu-ce' THEN '0ad71a4f-a424-4d68-8f37-d72df1f176a1'::uuid
    WHEN 'boun-chem' THEN '97741fa5-430e-4421-85c1-8582e299ce97'::uuid
    WHEN 'boun-cmpe' THEN '73d0a0bd-c1c1-4ba8-9e6c-bacc119b20da'::uuid
    WHEN 'metu-me' THEN 'bba141f5-49df-486c-b42a-dc7f7dc51263'::uuid
    WHEN 'metu-ie' THEN 'f688fc98-c5a7-4888-b47d-3e4cafc5b5ba'::uuid
  END,
  'entry_token_generate', 'semester', s.id,
  format('Jury entry token generated (%s).', s.semester_name),
  jsonb_build_object('semester_id', s.id),
  s.tenant_id
FROM semesters s
JOIN tenants t ON t.id = s.tenant_id
WHERE s.entry_token_hash IS NOT NULL;

-- Phase 2 — Evaluation (poster day 13:00-17:30)

-- juror_group_started: per scored project
INSERT INTO audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata, tenant_id)
SELECT
  GREATEST(
    sc.created_at - interval '2 minutes' - (random() * interval '3 minutes'),
    sc.poster_date::timestamptz + interval '13 hours'
  ) + (row_number() OVER (ORDER BY sc.created_at) * interval '1 second'),
  'juror', sc.juror_id, 'juror_group_started', 'project', sc.project_id,
  format('Juror %s started evaluating Group %s.', j.juror_name, p.group_no),
  jsonb_build_object('semester_id', sc.semester_id, 'group_no', p.group_no,
                     'project_title', p.project_title),
  s.tenant_id
FROM scores sc
JOIN jurors j ON j.id = sc.juror_id
JOIN projects p ON p.id = sc.project_id
JOIN semesters s ON s.id = sc.semester_id
WHERE sc.criteria_scores IS NOT NULL
  AND sc.criteria_scores <> '{}'::jsonb;

-- juror_group_completed: fully-scored projects only
INSERT INTO audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata, tenant_id)
SELECT
  sc.updated_at - (random() * interval '1 minute')
    + (row_number() OVER (ORDER BY sc.updated_at) * interval '1 second'),
  'juror', sc.juror_id, 'juror_group_completed', 'project', sc.project_id,
  format('Juror %s completed evaluation for Group %s.', j.juror_name, p.group_no),
  jsonb_build_object('semester_id', sc.semester_id, 'group_no', p.group_no,
                     'project_title', p.project_title),
  s.tenant_id
FROM scores sc
JOIN jurors j ON j.id = sc.juror_id
JOIN projects p ON p.id = sc.project_id
JOIN semesters s ON s.id = sc.semester_id
WHERE sc.criteria_scores IS NOT NULL
  AND sc.criteria_scores <> '{}'::jsonb
  AND (SELECT count(*)::int FROM jsonb_object_keys(sc.criteria_scores))
      = jsonb_array_length(s.criteria_template);

-- Phase 3 — Completion

INSERT INTO audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata, tenant_id)
SELECT
  MAX(sc.updated_at) + interval '1 minute'
    + (row_number() OVER (ORDER BY sc.semester_id, sc.juror_id) * interval '1 second'),
  'juror', sc.juror_id, 'juror_all_completed', 'semester', sc.semester_id,
  format('Juror %s completed all project evaluations.', j.juror_name),
  jsonb_build_object('semester_id', sc.semester_id),
  s.tenant_id
FROM scores sc
JOIN jurors j ON j.id = sc.juror_id
JOIN semesters s ON s.id = sc.semester_id
WHERE sc.criteria_scores IS NOT NULL
  AND sc.criteria_scores <> '{}'::jsonb
  AND (SELECT count(*)::int FROM jsonb_object_keys(sc.criteria_scores))
      = jsonb_array_length(s.criteria_template)
GROUP BY sc.semester_id, sc.juror_id, j.juror_name, s.tenant_id
HAVING COUNT(*) = (SELECT COUNT(*) FROM projects WHERE semester_id = sc.semester_id);

-- Phase 4 — Submission

INSERT INTO audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata, tenant_id)
SELECT
  MAX(sc.final_submitted_at) + interval '1 minute'
    + (row_number() OVER (ORDER BY sc.semester_id, sc.juror_id) * interval '1 second'),
  'juror', sc.juror_id, 'juror_finalize_submission', 'semester', sc.semester_id,
  format('Juror %s finalized submission.', j.juror_name),
  jsonb_build_object('semester_id', sc.semester_id),
  s.tenant_id
FROM scores sc
JOIN jurors j ON j.id = sc.juror_id
JOIN semesters s ON s.id = sc.semester_id
WHERE sc.final_submitted_at IS NOT NULL
GROUP BY sc.semester_id, sc.juror_id, j.juror_name, s.tenant_id
HAVING COUNT(*) = (SELECT COUNT(*) FROM projects WHERE semester_id = sc.semester_id);

-- ── Section 11: Sanity checks ───────────────────────────────

DO $$
DECLARE
  v_count int;
BEGIN
  -- 1. No duplicate semester names within a tenant
  SELECT count(*) INTO v_count FROM (
    SELECT tenant_id, lower(trim(semester_name)), count(*)
    FROM semesters GROUP BY 1, 2 HAVING count(*) > 1
  ) x;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 1 failed: % duplicate semester names within tenants', v_count;
  END IF;

  -- 2. No impossible timestamps (updated_at < created_at)
  SELECT count(*) INTO v_count FROM scores
  WHERE criteria_scores IS NOT NULL AND updated_at < created_at;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 2 failed: % score rows with updated_at < created_at', v_count;
  END IF;

  -- 3. No impossible submission timestamps
  SELECT count(*) INTO v_count FROM (
    SELECT semester_id, juror_id
    FROM scores
    WHERE final_submitted_at IS NOT NULL
    GROUP BY semester_id, juror_id
    HAVING MAX(final_submitted_at) < MAX(updated_at)
  ) x;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 3 failed: % juror-semesters with final_submitted_at before last scoring', v_count;
  END IF;

  -- 4. Poster-day clustering (scored activity 13:00-17:30)
  SELECT count(*) INTO v_count FROM scores s
  JOIN semesters sem ON sem.id = s.semester_id
  WHERE s.criteria_scores IS NOT NULL
    AND (s.updated_at < sem.poster_date::timestamptz + interval '13 hours'
      OR s.updated_at > sem.poster_date::timestamptz + interval '17 hours 30 minutes');
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 4 failed: % score rows outside poster-day 13:00-17:30 window', v_count;
  END IF;

  -- 5a. No over-keyed scored rows
  SELECT count(*) INTO v_count FROM scores s
  JOIN semesters sem ON sem.id = s.semester_id
  WHERE s.criteria_scores IS NOT NULL
    AND s.criteria_scores <> '{}'::jsonb
    AND (SELECT count(*)::int FROM jsonb_object_keys(s.criteria_scores))
        > jsonb_array_length(sem.criteria_template);
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 5a failed: % score rows with more keys than template', v_count;
  END IF;

  -- 5b. Under-keyed rows valid only for true in_progress jurors
  SELECT count(*) INTO v_count FROM scores s
  JOIN semesters sem ON sem.id = s.semester_id
  LEFT JOIN juror_semester_auth jsa
    ON jsa.semester_id = s.semester_id AND jsa.juror_id = s.juror_id
  WHERE s.criteria_scores IS NOT NULL
    AND s.criteria_scores <> '{}'::jsonb
    AND (SELECT count(*)::int FROM jsonb_object_keys(s.criteria_scores))
        < jsonb_array_length(sem.criteria_template)
    AND NOT (
      COALESCE(jsa.edit_enabled, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM scores s2
        WHERE s2.semester_id = s.semester_id AND s2.juror_id = s.juror_id
          AND s2.final_submitted_at IS NOT NULL
      )
    );
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 5b failed: % under-keyed rows on non-in_progress jurors', v_count;
  END IF;

  -- 6. Entry token consistency
  SELECT count(*) INTO v_count FROM semesters
  WHERE entry_token_enabled = true
    AND (entry_token_hash IS NULL OR entry_token_created_at IS NULL);
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 6 failed: % enabled tokens missing hash or created_at', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM semesters
  WHERE entry_token_hash IS NOT NULL AND entry_token_created_at IS NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 6b failed: % tokens with hash but no created_at', v_count;
  END IF;

  -- 7. No negative scores
  SELECT count(*) INTO v_count FROM (
    SELECT s.id
    FROM scores s, jsonb_each_text(s.criteria_scores) AS kv
    WHERE s.criteria_scores IS NOT NULL
      AND s.criteria_scores <> '{}'::jsonb
      AND kv.value::int < 0
  ) x;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 7 failed: % score rows with negative criterion values', v_count;
  END IF;

  -- 8. Workflow-state consistency (reads from _seed_effective_state temp table)

  -- 8a. not_started must have no filled score data
  SELECT count(*) INTO v_count
  FROM _seed_effective_state es
  JOIN scores sc ON sc.juror_id = es.juror_id AND sc.semester_id = es.semester_id
  WHERE es.effective_status = 'not_started'
    AND sc.criteria_scores IS NOT NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 8a failed: % not_started rows with non-NULL criteria_scores', v_count;
  END IF;

  -- 8b. in_progress must NOT have all rows fully complete
  SELECT count(*) INTO v_count FROM (
    SELECT es.juror_id, es.semester_id
    FROM _seed_effective_state es
    WHERE es.effective_status = 'in_progress'
      AND NOT EXISTS (
        -- Must have at least one row that is partial or untouched
        SELECT 1 FROM scores sc
        JOIN semesters sem ON sem.id = sc.semester_id
        WHERE sc.juror_id = es.juror_id AND sc.semester_id = es.semester_id
          AND (sc.criteria_scores IS NULL
            OR (SELECT count(*)::int FROM jsonb_object_keys(sc.criteria_scores))
               < jsonb_array_length(sem.criteria_template))
      )
  ) x;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 8b failed: % in_progress jurors with all rows fully complete', v_count;
  END IF;

  -- 8c. in_progress must not have final_submitted_at
  SELECT count(*) INTO v_count
  FROM _seed_effective_state es
  JOIN scores sc ON sc.juror_id = es.juror_id AND sc.semester_id = es.semester_id
  WHERE es.effective_status = 'in_progress'
    AND sc.final_submitted_at IS NOT NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 8c failed: % in_progress rows with final_submitted_at', v_count;
  END IF;

  -- 8d. editing must not have final_submitted_at
  SELECT count(*) INTO v_count
  FROM _seed_effective_state es
  JOIN scores sc ON sc.juror_id = es.juror_id AND sc.semester_id = es.semester_id
  WHERE es.effective_status = 'editing'
    AND sc.final_submitted_at IS NOT NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 8d failed: % editing rows with final_submitted_at', v_count;
  END IF;

  -- 8e. editing must have edit_enabled = true
  SELECT count(*) INTO v_count
  FROM _seed_effective_state es
  JOIN juror_semester_auth jsa ON jsa.juror_id = es.juror_id AND jsa.semester_id = es.semester_id
  WHERE es.effective_status = 'editing'
    AND COALESCE(jsa.edit_enabled, false) = false;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 8e failed: % editing jurors with edit_enabled = false', v_count;
  END IF;

  -- 8f. submitted must have no incomplete or untouched rows
  SELECT count(*) INTO v_count
  FROM _seed_effective_state es
  JOIN scores sc ON sc.juror_id = es.juror_id AND sc.semester_id = es.semester_id
  JOIN semesters sem ON sem.id = sc.semester_id
  WHERE es.effective_status = 'submitted'
    AND (sc.criteria_scores IS NULL
      OR (SELECT count(*)::int FROM jsonb_object_keys(sc.criteria_scores))
         < jsonb_array_length(sem.criteria_template));
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 8f failed: % submitted rows with incomplete criteria', v_count;
  END IF;

  -- 8g. submitted must not have final_submitted_at
  SELECT count(*) INTO v_count
  FROM _seed_effective_state es
  JOIN scores sc ON sc.juror_id = es.juror_id AND sc.semester_id = es.semester_id
  WHERE es.effective_status = 'submitted'
    AND sc.final_submitted_at IS NOT NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 8g failed: % submitted rows with final_submitted_at', v_count;
  END IF;

  -- 8h. completed must have no incomplete or untouched rows
  SELECT count(*) INTO v_count
  FROM _seed_effective_state es
  JOIN scores sc ON sc.juror_id = es.juror_id AND sc.semester_id = es.semester_id
  JOIN semesters sem ON sem.id = sc.semester_id
  WHERE es.effective_status = 'completed'
    AND (sc.criteria_scores IS NULL
      OR (SELECT count(*)::int FROM jsonb_object_keys(sc.criteria_scores))
         < jsonb_array_length(sem.criteria_template));
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 8h failed: % completed rows with incomplete criteria', v_count;
  END IF;

  -- 8i. completed must have final_submitted_at on all rows
  SELECT count(*) INTO v_count
  FROM _seed_effective_state es
  JOIN scores sc ON sc.juror_id = es.juror_id AND sc.semester_id = es.semester_id
  WHERE es.effective_status = 'completed'
    AND sc.final_submitted_at IS NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Sanity check 8i failed: % completed rows missing final_submitted_at', v_count;
  END IF;

  RAISE NOTICE 'All sanity checks passed.';
END;
$$;

-- Clean up temp table
DROP TABLE IF EXISTS _seed_effective_state;

COMMIT;
