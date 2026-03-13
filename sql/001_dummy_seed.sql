-- ============================================================
-- 001_dummy_seed.sql
-- Seed realistic dummy data for Jury Portal (run AFTER 000_bootstrap.sql)
-- Includes:
--   - No default admin password (first-time setup required in-app)
--   - 6 semesters with poster_date (2025 Fall active)
--   - 18 jurors (globally diverse) with "University / Department"
--   - group_students as "Name Surname; Name Surname; ..."
--   - juror_semester_auth (12–16 per Spring/Fall semester, 3–4 per Summer)
--   - Full matrix: every juror evaluates every project in their semester
--   - Scores with status distribution (juror-semester level):
--       completed 92% (all projects scored + final_submitted_at)
--       submitted  5% (all projects scored, no finalization)
--       in_progress 3% (all but one project complete, one partial)
--   - updated_at: poster_date 13:00–17:30, sequential per juror
--   - final_submitted_at: max(updated_at) + 20–40 min, completed jurors only
-- ============================================================

BEGIN;

SELECT setseed(0.424242);
SET search_path = public, extensions;

-- ------------------------------------------------------------
-- DEV RESET (safe order)
-- ------------------------------------------------------------
TRUNCATE TABLE
  public.audit_logs,
  public.scores,
  public.juror_semester_auth,
  public.projects,
  public.jurors,
  public.semesters
RESTART IDENTITY CASCADE;

-- ------------------------------------------------------------
-- 1) Semesters — 6 total, poster_date only, 2025 Fall active
-- ------------------------------------------------------------
INSERT INTO public.semesters (name, is_active, poster_date)
VALUES
  ('2024 Spring', false, DATE '2024-05-22'),
  ('2024 Summer', false, DATE '2024-07-15'),
  ('2024 Fall',   false, DATE '2024-11-20'),
  ('2025 Spring', false, DATE '2025-05-22'),
  ('2025 Summer', false, DATE '2025-07-14'),
  ('2025 Fall',   true,  DATE '2025-11-20');

-- enforce exactly one active (defensive)
UPDATE public.semesters
SET is_active = (name = '2025 Fall');

-- normalize semester timestamps relative to poster_date
WITH base AS (
  SELECT MIN(poster_date) AS base_date FROM public.semesters
)
UPDATE public.semesters s
SET created_at = (base.base_date::timestamptz + ((s.poster_date - base.base_date) * interval '1 day'))
  - interval '30 days' + (random() * interval '6 hours'),
    updated_at = (base.base_date::timestamptz + ((s.poster_date - base.base_date) * interval '1 day'))
  - interval '10 days' + (random() * interval '6 hours')
FROM base;

-- ------------------------------------------------------------
-- 2) Jurors (18 total) — globally diverse
-- ------------------------------------------------------------
INSERT INTO public.jurors (juror_name, juror_inst)
SELECT * FROM (VALUES
  -- International
  ('Emma Thompson',        'University of Oxford / Computer Science'),
  ('Liam O''Connor',       'University of Cambridge / Engineering'),
  ('Sofia Rossi',          'ETH Zürich / Robotics'),
  ('Noah Müller',          'EPFL / Electrical Engineering'),
  ('Isabella García',      'Imperial College London / Aeronautics'),
  ('Lucas Martin',         'UC Berkeley / Electrical Engineering'),
  ('Chloé Dubois',         'Carnegie Mellon University / Machine Learning'),
  ('Oliver Smith',         'Stanford University / AI Lab'),
  ('Ava Johnson',          'Harvard University / Applied Physics'),
  ('Mateo Fernández',      'MIT / Aerospace Engineering'),
  -- Turkish
  ('Elif Yılmaz',          'Hacettepe University / EE'),
  ('Mehmet Kaya',          'Bilkent University / Computer Engineering'),
  ('Ayşe Demir',           'Middle East Technical University / Electrical Engineering'),
  ('Caner Şahin',          'Istanbul Technical University / Aeronautics'),
  ('Zeynep Arslan',        'Boğaziçi University / Computer Engineering'),
  ('Kerem Öztürk',         'Koç University / Robotics'),
  ('Ece Kılıç',            'Sabancı University / Data Science'),
  ('Deniz Aydın',          'Ankara University / Software Engineering')
) AS v(juror_name, juror_inst);

-- normalize juror timestamps
WITH base AS (
  SELECT MIN(poster_date) AS base_date FROM public.semesters
),
computed AS (
  SELECT j.id,
    base.base_date::timestamptz - interval '40 days'
      + (random() * interval '20 days') AS new_created_at
  FROM public.jurors j
  CROSS JOIN base
)
UPDATE public.jurors j
SET created_at = c.new_created_at,
    updated_at = c.new_created_at + (random() * interval '5 days')
FROM computed c
WHERE j.id = c.id;

-- ------------------------------------------------------------
-- 3) Projects
--    - Spring/Fall:  10–15 projects
--    - Summer:        2–5  projects
--    - 2–4 students per project (globally diverse names)
--    - Globally unique creative titles
-- ------------------------------------------------------------
DO $$
DECLARE
  v_sem record;
  v_project_count int;
  v_group_no int;
  v_is_summer boolean;

  v_students text;
  v_student_count int;

  -- globally diverse name pool
  v_student_pool text[];
  v_pool_len int;
  v_picked text[];
  v_candidate text;
  v_i int;
  v_used_sem_names text[];  -- names already used in this semester (reset per semester)

  -- creative title pools
  v_domain text[];
  v_artifact text[];
  v_method text[];
  v_signature text[];
  v_niche text[];
  v_template int;
  v_title text;
  v_used_titles text[] := ARRAY[]::text[];
BEGIN
  -- Globally diverse student name pool (60 names across 11 regions)
  v_student_pool := ARRAY[
    -- Turkish
    'Ahmet Yılmaz','Ayşe Demir','Mehmet Demir','Zeynep Arslan','Kerem Öztürk',
    'Selin Öztürk','Emre Koç','Buse Polat','Onur Eren','Derya Kurt',
    -- English
    'James Miller','Emily Johnson','Noah Williams','Olivia Brown','Ethan Davis',
    'Charlotte Wilson','Henry Taylor','Amelia Anderson','Jack Moore','Grace Thomas',
    -- French
    'Camille Dupont','Théo Bernard','Manon Leroy','Hugo Moreau','Léa Petit',
    -- German
    'Lukas Müller','Hannah Schmidt','Felix Wagner','Anna Becker','Jonas Weber',
    -- Italian
    'Marco Rossi','Giulia Ferrari','Luca Esposito','Sofia Ricci','Matteo Romano',
    -- Spanish
    'Carlos García','Sofía Martínez','Alejandro López','Valentina Sánchez','Diego Hernández',
    -- Chinese
    'Wei Zhang','Li Huang','Fang Liu','Jing Chen','Hao Wang',
    -- Korean
    'Min-jun Kim','Seo-yeon Park','Ji-ho Lee','Ye-jin Choi','Do-yun Jung',
    -- Japanese
    'Haruto Tanaka','Yui Sato','Ren Suzuki','Hana Yamamoto','Sota Nakamura',
    -- Arabic
    'Omar Hassan','Fatima Al-Rashid','Youssef Khalil','Layla Mansour','Karim Nasser',
    -- Indian
    'Aryan Sharma','Priya Patel','Rohan Mehta','Ananya Singh','Vikram Nair',
    -- Turkish (extended)
    'Büşra Yıldız','Mert Çelik','Seda Kara','Tarık Güneş','Yasemin Aktaş',
    -- English (extended)
    'Sophia Clark','Mason Lewis','Ella Walker','Avery Hall','Logan Young',
    -- French (extended)
    'Antoine Lefebvre','Inès Garnier','Louis Rousseau','Chloé Fontaine','Maxime Girard',
    -- German (extended)
    'Lena Hoffmann','Maximilian Koch','Clara Richter','Philipp Schäfer','Nina Braun',
    -- Italian (extended)
    'Chiara Marino','Lorenzo Conti','Alessia Costa',
    -- Spanish (extended)
    'Lucía Torres','Pablo Ramírez','Camila Flores',
    -- Chinese (extended)
    'Xiao Lin','Jun Wu','Mei Yang',
    -- Korean (extended)
    'Jae-won Oh','Ha-eun Shin','Sung-min Bae',
    -- Japanese (extended)
    'Kaito Kobayashi','Sakura Ito','Ryota Hayashi',
    -- Arabic (extended)
    'Amina Al-Amin','Tariq Haddad','Nour Saleh',
    -- Indian (extended)
    'Aditya Kumar','Sneha Iyer','Kiran Reddy','Riya Kapoor','Siddharth Mehta'
  ];
  v_pool_len := array_length(v_student_pool, 1);

  v_domain := ARRAY[
    'AUV Fleet Operations','Mine Countermeasure Field Trials','Harbor Surveillance','Port Logistics',
    'Smart Campus Energy','Smart Grid Reliability','Wildfire Early Warning','Flood Forecasting',
    'Medical Triage Workflow','Wearable Health Monitoring','Drone Corridor Safety','Autonomous Inspection',
    'Indoor Positioning','Real-Time SLAM','Underwater Localization','Acoustic Telemetry',
    'Satellite Backhaul','HAPS Relay Networking','Industrial Vision QA','Micro-Mobility Safety'
  ];
  v_artifact := ARRAY[
    'Digital Twin','Anomaly Radar','Routing Fabric','Decision Engine','Copilot','Orchestrator',
    'Benchmark Suite','Reliability Layer','Knowledge Graph','Risk Ledger','Service Mesh',
    'Diagnostics Toolkit','Navigation Stack','Optimization Pipeline','Consensus Engine',
    'Edge Gateway','Simulation Workbench','Audit Trail','Model Registry','Incident Console'
  ];
  v_method := ARRAY[
    'Self-Healing','Privacy-Preserving','Fault-Tolerant','Human-Centered','Context-Aware','Bio-Inspired',
    'Federated','Carbon-Aware','Adversarial-Resistant','Multi-Modal','Explainable','Event-Driven',
    'Resource-Frugal','Latency-Sensitive','Uncertainty-Aware','Swarm-Enabled','Zero-Trust',
    'Topology-Adaptive','Spectrum-Aware','Energy-Proportional'
  ];
  v_signature := ARRAY[
    'with Drift Monitoring','under Intermittent Connectivity','for Low-SNR Acoustic Channels',
    'with Human-in-the-Loop Review','with Safety Guarantees','via Lightweight Cryptography',
    'using Self-Supervised Signals','with Fairness Constraints','with On-Device Personalization',
    'with Digital Twin Feedback','with Robustness Audits','using Incremental Updates'
  ];
  v_niche := ARRAY[
    'in Harsh Marine Environments','for Rapid Prototyping','at the Edge','in Resource-Constrained Nodes',
    'for Real-Time Decisions','for Transparent Reporting','for Cross-Team Collaboration',
    'for Long-Term Autonomy','for Secure Data Sharing','for High-Noise Sensors'
  ];

  FOR v_sem IN
    SELECT id, name, poster_date FROM public.semesters ORDER BY poster_date
  LOOP
    -- project count: Summer → 2..5, Spring/Fall → 10..15
    v_is_summer := lower(v_sem.name) LIKE '%summer%';
    IF v_is_summer THEN
      v_project_count := 2 + floor(random() * 4)::int; -- 2..5
    ELSE
      v_project_count := 10 + floor(random() * 6)::int; -- 10..15
    END IF;

    v_group_no := 1;
    v_used_sem_names := ARRAY[]::text[];  -- reset per semester

    WHILE v_group_no <= v_project_count LOOP
      -- students: 2..4, sampled without repetition from pool
      v_student_count := 2 + floor(random() * 3)::int;
      v_picked := ARRAY[]::text[];
      v_students := '';
      v_i := 0;
      WHILE v_i < v_student_count LOOP
        LOOP
          v_candidate := v_student_pool[1 + floor(random() * v_pool_len)::int];
          EXIT WHEN NOT (v_candidate = ANY(v_picked))
                AND NOT (v_candidate = ANY(v_used_sem_names));
        END LOOP;
        v_picked := array_append(v_picked, v_candidate);
        v_used_sem_names := array_append(v_used_sem_names, v_candidate);
        IF v_i > 0 THEN v_students := v_students || '; '; END IF;
        v_students := v_students || v_candidate;
        v_i := v_i + 1;
      END LOOP;

      -- unique creative title
      LOOP
        v_template := 1 + floor(random() * 4)::int;
        IF v_template = 1 THEN
          v_title :=
            v_domain[1 + floor(random()*array_length(v_domain,1))::int] || ': ' ||
            v_method[1 + floor(random()*array_length(v_method,1))::int] || ' ' ||
            v_artifact[1 + floor(random()*array_length(v_artifact,1))::int] || ' ' ||
            v_signature[1 + floor(random()*array_length(v_signature,1))::int];
        ELSIF v_template = 2 THEN
          v_title :=
            v_method[1 + floor(random()*array_length(v_method,1))::int] || ' ' ||
            v_artifact[1 + floor(random()*array_length(v_artifact,1))::int] || ' for ' ||
            v_domain[1 + floor(random()*array_length(v_domain,1))::int] || ' ' ||
            v_niche[1 + floor(random()*array_length(v_niche,1))::int];
        ELSIF v_template = 3 THEN
          v_title :=
            'From Sensors to Decisions: ' ||
            v_artifact[1 + floor(random()*array_length(v_artifact,1))::int] || ' ' ||
            v_signature[1 + floor(random()*array_length(v_signature,1))::int] || ' in ' ||
            v_domain[1 + floor(random()*array_length(v_domain,1))::int];
        ELSE
          v_title :=
            v_domain[1 + floor(random()*array_length(v_domain,1))::int] || ' — ' ||
            v_artifact[1 + floor(random()*array_length(v_artifact,1))::int] || ' (' ||
            v_method[1 + floor(random()*array_length(v_method,1))::int] || ', ' ||
            v_signature[1 + floor(random()*array_length(v_signature,1))::int] || ')';
        END IF;
        EXIT WHEN NOT (v_title = ANY(v_used_titles));
      END LOOP;
      v_used_titles := array_append(v_used_titles, v_title);

      INSERT INTO public.projects (semester_id, group_no, project_title, group_students)
      VALUES (v_sem.id, v_group_no, v_title, v_students);

      v_group_no := v_group_no + 1;
    END LOOP;
  END LOOP;
END $$;

-- normalize project timestamps within semester window
WITH base AS (
  SELECT MIN(poster_date) AS base_date FROM public.semesters
),
computed AS (
  SELECT p.id,
    (base.base_date::timestamptz + ((s.poster_date - base.base_date) * interval '1 day'))
      - interval '14 days' + (random() * interval '10 days') AS new_created_at
  FROM public.projects p
  JOIN public.semesters s ON s.id = p.semester_id
  CROSS JOIN base
)
UPDATE public.projects p
SET created_at = c.new_created_at,
    updated_at = c.new_created_at + (random() * interval '3 days')
FROM computed c
WHERE p.id = c.id;

-- ------------------------------------------------------------
-- 4) juror_semester_auth
--    - Spring/Fall: 12–16 jurors
--    - Summer:       3–4  jurors
--    - Core overlap (first 6 jurors) ensures continuity
-- ------------------------------------------------------------
DO $$
DECLARE
  v_sem record;
  v_pick_count int;
  v_core_count int;
  v_pin text;
  v_hash text;
  v_jid uuid;
  v_is_summer boolean;
  v_core_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_core_ids
  FROM (
    SELECT id FROM public.jurors ORDER BY id LIMIT 6
  ) core;

  FOR v_sem IN SELECT id, name FROM public.semesters ORDER BY poster_date LOOP
    v_is_summer := lower(v_sem.name) LIKE '%summer%';
    IF v_is_summer THEN
      v_pick_count := 3 + floor(random() * 2)::int; -- 3..4
      v_core_count := LEAST(4, v_pick_count);
    ELSE
      v_pick_count := 12 + floor(random() * 5)::int; -- 12..16
      v_core_count := LEAST(6, v_pick_count);
    END IF;

    -- core overlap first
    FOR v_jid IN
      SELECT unnest(v_core_ids) LIMIT v_core_count
    LOOP
      v_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
      v_hash := crypt(v_pin, gen_salt('bf'));

      INSERT INTO public.juror_semester_auth
        (juror_id, semester_id, pin_hash, failed_attempts, locked_until, last_seen_at)
      VALUES
        (v_jid, v_sem.id, v_hash, 0, NULL, NULL)
      ON CONFLICT (juror_id, semester_id) DO UPDATE
        SET pin_hash = EXCLUDED.pin_hash,
            failed_attempts = 0,
            locked_until = NULL,
            last_seen_at = NULL;
    END LOOP;

    -- fill remaining slots
    IF v_pick_count > v_core_count THEN
      FOR v_jid IN
        SELECT id FROM public.jurors
        WHERE NOT (id = ANY(v_core_ids))
        ORDER BY random()
        LIMIT (v_pick_count - v_core_count)
      LOOP
        v_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
        v_hash := crypt(v_pin, gen_salt('bf'));

        INSERT INTO public.juror_semester_auth
          (juror_id, semester_id, pin_hash, failed_attempts, locked_until, last_seen_at)
        VALUES
          (v_jid, v_sem.id, v_hash, 0, NULL, NULL)
        ON CONFLICT (juror_id, semester_id) DO UPDATE
          SET pin_hash = EXCLUDED.pin_hash,
              failed_attempts = 0,
              locked_until = NULL,
              last_seen_at = NULL;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- normalize auth timestamps near poster_date
WITH base AS (
  SELECT MIN(poster_date) AS base_date FROM public.semesters
)
UPDATE public.juror_semester_auth a
SET created_at = (base.base_date::timestamptz + ((s.poster_date - base.base_date) * interval '1 day'))
  - interval '7 days' + (random() * interval '5 days')
FROM public.semesters s, base
WHERE s.id = a.semester_id;

-- ------------------------------------------------------------
-- 5) Scores — full matrix (every juror × every project)
--
--    Status is decided at juror-semester level:
--      in_progress  3%  → all projects scored except exactly one (partial)
--      submitted    5%  → all projects fully scored, final_submitted_at NULL
--      completed   92%  → all projects fully scored + final_submitted_at set
--
--    updated_at   : poster_date 13:00–17:30, spread sequentially per juror
--    score range  : technical 20–30, written 18–30, oral 18–30, teamwork 7–10
--                   (total 70–100 via retry loop)
--    final_submitted_at : computed once per completed juror as
--                         max(updated_at) + 20..40 minutes
-- ------------------------------------------------------------
DO $$
DECLARE
  v_sem              record;
  v_juror            record;
  v_proj             record;

  v_juror_status     text;
  v_rand             float;
  v_incomplete_proj  uuid;   -- project_id left partial for in_progress jurors
  v_is_incomplete    boolean;

  v_tech int; v_writ int; v_oral int; v_team int;
  v_comment          text;
  v_comments         text[];
  v_attempts         int;
  v_null_field       text;
  v_null_field2      text;

  v_poster_ts        timestamptz;
  v_updated_at       timestamptz;
  v_created_at       timestamptz;
  v_final_at         timestamptz;
  v_max_updated_at   timestamptz;   -- tracks latest updated_at for this juror

  -- per-juror timestamp distribution
  v_start_min        int;    -- juror starts X minutes after 13:00
  v_per_proj_min     int;    -- base minutes spent per project
  v_cumulative_min   int;    -- running total of minutes used
  v_offset_sec       int;

  v_final_min        int;
BEGIN
  v_comments := ARRAY[
    'Strong implementation; consider expanding the evaluation section.',
    'Excellent presentation and clear methodology.',
    'Promising prototype; scalability discussion would help.',
    'Well-structured report and convincing demo.',
    'Good technical depth; results could be compared to baselines.',
    'Nice idea and clean execution; add more ablation studies.',
    'Clear motivation and solid engineering trade-offs.',
    'Good progress; improve failure-case analysis.'
  ];

  FOR v_sem IN
    SELECT id, name, poster_date FROM public.semesters ORDER BY poster_date
  LOOP
    v_poster_ts := v_sem.poster_date::timestamptz;

    -- ── iterate each juror assigned to this semester ─────────
    FOR v_juror IN
      SELECT juror_id
      FROM public.juror_semester_auth
      WHERE semester_id = v_sem.id
      ORDER BY juror_id
    LOOP

      -- juror-level status (decided once per juror-semester)
      v_rand := random();
      v_juror_status :=
        CASE
          WHEN v_rand < 0.03 THEN 'in_progress'  --  3%
          WHEN v_rand < 0.08 THEN 'submitted'     --  5%
          ELSE                    'completed'     -- 92%
        END;

      -- for in_progress: choose one project to leave partial
      v_incomplete_proj := NULL;
      IF v_juror_status = 'in_progress' THEN
        SELECT id INTO v_incomplete_proj
        FROM public.projects
        WHERE semester_id = v_sem.id
        ORDER BY random()
        LIMIT 1;
      END IF;

      -- timestamp distribution: juror starts at a random offset
      v_start_min      := floor(random() * 90)::int;        -- 0..89 → 13:00–14:29
      v_per_proj_min   := 8  + floor(random() * 7)::int;   -- 8..14 min per project
      v_cumulative_min := 0;
      v_max_updated_at := NULL;

      -- ── iterate every project in the semester ────────────
      FOR v_proj IN
        SELECT id AS project_id, group_no
        FROM public.projects
        WHERE semester_id = v_sem.id
        ORDER BY group_no
      LOOP
        v_is_incomplete := (v_juror_status = 'in_progress'
                            AND v_proj.project_id = v_incomplete_proj);

        -- score generation with retry to keep total 70–100
        v_attempts := 0;
        LOOP
          v_attempts := v_attempts + 1;
          v_tech := 20 + floor(random() * 11)::int; -- 20..30
          v_writ := 18 + floor(random() * 13)::int; -- 18..30
          v_oral := 18 + floor(random() * 13)::int; -- 18..30
          v_team :=  7 + floor(random() * 4)::int;  --  7..10
          EXIT WHEN (v_tech + v_writ + v_oral + v_team) BETWEEN 70 AND 100
                 OR v_attempts > 10;
        END LOOP;

        -- null out 2 distinct fields for the single incomplete project
        IF v_is_incomplete THEN
          v_null_field := (ARRAY['technical','written','oral','teamwork'])
                          [1 + floor(random()*4)::int];
          LOOP
            v_null_field2 := (ARRAY['technical','written','oral','teamwork'])
                              [1 + floor(random()*4)::int];
            EXIT WHEN v_null_field2 <> v_null_field;
          END LOOP;
          IF v_null_field = 'technical' OR v_null_field2 = 'technical' THEN v_tech := NULL; END IF;
          IF v_null_field = 'written'   OR v_null_field2 = 'written'   THEN v_writ := NULL; END IF;
          IF v_null_field = 'oral'      OR v_null_field2 = 'oral'      THEN v_oral := NULL; END IF;
          IF v_null_field = 'teamwork'  OR v_null_field2 = 'teamwork'  THEN v_team := NULL; END IF;
        END IF;

        -- sequential timestamp: each project adds a slot
        v_cumulative_min := v_cumulative_min
                            + v_per_proj_min
                            + floor(random() * 5)::int;  -- small jitter
        v_offset_sec     := floor(random() * 60)::int;
        v_updated_at     := v_poster_ts
          + interval '13 hours'
          + make_interval(mins => v_start_min + v_cumulative_min,
                          secs => v_offset_sec);

        -- clamp: never beyond 17:30
        IF v_updated_at > v_poster_ts + interval '17 hours 30 minutes' THEN
          v_updated_at := v_poster_ts + interval '17 hours'
            + make_interval(secs => floor(random() * 1800)::int);
        END IF;

        v_created_at := v_updated_at
          - make_interval(mins => 1 + floor(random() * 10)::int);
        IF v_created_at < v_poster_ts + interval '13 hours' THEN
          v_created_at := v_poster_ts + interval '13 hours';
        END IF;

        -- track latest updated_at for final_submitted_at calculation
        IF v_max_updated_at IS NULL OR v_updated_at > v_max_updated_at THEN
          v_max_updated_at := v_updated_at;
        END IF;

        -- optional comment (~30%)
        IF random() < 0.30 THEN
          v_comment := v_comments[1 + floor(random()*array_length(v_comments,1))::int];
        ELSE
          v_comment := NULL;
        END IF;

        INSERT INTO public.scores
          (semester_id, project_id, juror_id, poster_date,
           technical, written, oral, teamwork,
           comment, final_submitted_at, created_at, updated_at)
        VALUES
          (v_sem.id, v_proj.project_id, v_juror.juror_id, v_sem.poster_date,
           v_tech, v_writ, v_oral, v_team,
           v_comment, NULL, v_created_at, v_updated_at)
        ON CONFLICT (semester_id, project_id, juror_id) DO UPDATE
          SET poster_date        = EXCLUDED.poster_date,
              technical          = EXCLUDED.technical,
              written            = EXCLUDED.written,
              oral               = EXCLUDED.oral,
              teamwork           = EXCLUDED.teamwork,
              comment            = EXCLUDED.comment,
              final_submitted_at = NULL,
              updated_at         = EXCLUDED.updated_at;

      END LOOP; -- projects

      -- set final_submitted_at for completed jurors after all rows are inserted
      IF v_juror_status = 'completed' THEN
        v_final_min := 20 + floor(random() * 21)::int; -- 20..40
        v_final_at  := v_max_updated_at + make_interval(mins => v_final_min);

        UPDATE public.scores
        SET final_submitted_at = v_final_at
        WHERE semester_id = v_sem.id
          AND juror_id    = v_juror.juror_id;
      END IF;

    END LOOP; -- jurors
  END LOOP; -- semesters
END $$;

-- last_seen_at from latest score updated_at per juror-semester
WITH latest AS (
  SELECT semester_id, juror_id, MAX(updated_at) AS max_updated_at
  FROM public.scores
  GROUP BY semester_id, juror_id
)
UPDATE public.juror_semester_auth a
SET last_seen_at = l.max_updated_at + interval '3 minutes' + (random() * interval '20 minutes')
FROM latest l
WHERE a.semester_id = l.semester_id
  AND a.juror_id = l.juror_id;

-- mark edit_enabled = false for jurors who fully submitted
WITH totals AS (
  SELECT p.semester_id, COUNT(*)::int AS total_projects
  FROM public.projects p GROUP BY p.semester_id
),
per_juror AS (
  SELECT sc.semester_id, sc.juror_id,
    COUNT(*) FILTER (
      WHERE sc.final_submitted_at IS NOT NULL
    )::int AS submitted_projects
  FROM public.scores sc GROUP BY sc.semester_id, sc.juror_id
)
UPDATE public.juror_semester_auth a
SET edit_enabled = false
FROM per_juror pj JOIN totals t ON t.semester_id = pj.semester_id
WHERE a.semester_id = pj.semester_id
  AND a.juror_id = pj.juror_id
  AND pj.submitted_projects = t.total_projects;

-- ------------------------------------------------------------
-- 7) Audit logs
-- ------------------------------------------------------------
CREATE TEMP TABLE tmp_semester_phase AS
SELECT
  s.id AS semester_id,
  s.name AS semester_name,
  s.poster_date,
  (s.poster_date::timestamptz + interval '13 hours') AS eval_start,
  (s.poster_date::timestamptz + interval '16 hours 30 minutes') AS eval_end,
  (s.poster_date::timestamptz + interval '17 hours 30 minutes') AS submit_start,
  (s.poster_date::timestamptz + interval '20 hours 40 minutes') AS submit_end
FROM public.semesters s;

-- Phase 1 — Admin preparation
INSERT INTO public.audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata)
SELECT
  (p.poster_date::timestamptz - interval '45 days') + (random() * interval '6 hours')
    + (row_number() over (ORDER BY p.semester_id) * interval '1 second'),
  'admin', null, 'semester_create', 'semester', p.semester_id,
  format('Admin created semester %s.', p.semester_name),
  jsonb_build_object('semester_id', p.semester_id, 'semester_name', p.semester_name, 'poster_date', p.poster_date)
FROM tmp_semester_phase p;

INSERT INTO public.audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata)
SELECT
  (p.poster_date::timestamptz - interval '21 days') + (random() * interval '5 hours')
    + (row_number() over (ORDER BY p.semester_id) * interval '1 second'),
  'admin', null, 'semester_update', 'semester', p.semester_id,
  format('Admin updated semester %s.', p.semester_name),
  jsonb_build_object('semester_id', p.semester_id, 'semester_name', p.semester_name)
FROM tmp_semester_phase p
WHERE p.semester_name IN ('2025 Fall', '2025 Spring');

INSERT INTO public.audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata)
SELECT
  (p.poster_date::timestamptz - interval '10 days') + (random() * interval '3 hours'),
  'admin', null, 'set_active_semester', 'semester', p.semester_id,
  format('Admin set active semester to %s.', p.semester_name),
  jsonb_build_object('semester_id', p.semester_id, 'semester_name', p.semester_name)
FROM tmp_semester_phase p
WHERE p.semester_id IN (SELECT id FROM public.semesters WHERE is_active = true)
LIMIT 1;

INSERT INTO public.audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata)
SELECT
  (x.poster_date::timestamptz - interval '7 days') + (random() * interval '6 hours')
    + (row_number() over (PARTITION BY x.semester_id ORDER BY x.group_no) * interval '1 second'),
  'admin', null, 'project_update', 'project', x.id,
  format('Admin updated project Group %s — %s (%s).', x.group_no, x.project_title, x.semester_name),
  jsonb_build_object('semester_id', x.semester_id, 'semester_name', x.semester_name, 'group_no', x.group_no)
FROM (
  SELECT
    pr.id,
    pr.semester_id,
    pr.group_no,
    pr.project_title,
    p.semester_name,
    p.poster_date,
    row_number() OVER (PARTITION BY pr.semester_id ORDER BY random()) AS rn
  FROM public.projects pr
  JOIN tmp_semester_phase p ON p.semester_id = pr.semester_id
) x
WHERE x.rn <= 2;

INSERT INTO public.audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata)
SELECT
  (x.poster_date::timestamptz - interval '4 days') + (random() * interval '5 hours')
    + (row_number() over (PARTITION BY x.semester_id ORDER BY x.juror_id) * interval '1 second'),
  'admin', null, 'juror_pin_reset', 'juror', x.juror_id,
  format('Admin reset PIN for juror %s (%s).', x.juror_name, x.semester_name),
  jsonb_build_object('semester_id', x.semester_id, 'semester_name', x.semester_name)
FROM (
  SELECT a.semester_id, a.juror_id, j.juror_name, p.semester_name, p.poster_date,
         row_number() OVER (PARTITION BY a.semester_id ORDER BY random()) AS rn
  FROM public.juror_semester_auth a
  JOIN public.jurors j ON j.id = a.juror_id
  JOIN tmp_semester_phase p ON p.semester_id = a.semester_id
) x
WHERE x.rn <= CASE WHEN lower(x.semester_name) LIKE '%summer%' THEN 1 ELSE 2 END;

INSERT INTO public.audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata)
SELECT
  (p.poster_date::timestamptz - interval '9 days') + (random() * interval '2 hours')
    + (row_number() over (ORDER BY p.semester_id) * interval '1 second'),
  'system', null, 'admin_login_success', 'settings', null,
  'Admin login succeeded.',
  null
FROM tmp_semester_phase p
LIMIT 2;

INSERT INTO public.audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata)
SELECT
  (p.poster_date::timestamptz - interval '9 days') + (random() * interval '2 hours')
    + (row_number() over (ORDER BY p.semester_id) * interval '1 second'),
  'system', null, 'admin_login_failed', 'settings', null,
  'Admin login failed.',
  null
FROM tmp_semester_phase p
LIMIT 1;

INSERT INTO public.audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata)
SELECT
  (p.poster_date::timestamptz - interval '8 days') + (random() * interval '3 hours')
    + (row_number() over (ORDER BY p.semester_id) * interval '1 second'),
  'admin', null, 'setting_change', 'settings', null,
  'Admin changed setting eval_edit_lock.',
  jsonb_build_object('key', 'eval_edit_lock')
FROM tmp_semester_phase p
LIMIT 1;

INSERT INTO public.audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata)
SELECT
  (p.poster_date::timestamptz - interval '6 days') + (random() * interval '2 hours'),
  'admin', null, 'db_export', 'settings', null,
  'Admin exported database backup.',
  null
FROM tmp_semester_phase p
WHERE p.semester_id IN (SELECT id FROM public.semesters WHERE is_active = true)
LIMIT 1;

-- Phase 2 — Evaluation session (poster_date 13:00–16:30)
INSERT INTO public.audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata)
SELECT
  GREATEST(
    sc.updated_at - interval '35 minutes' - (random() * interval '20 minutes'),
    sc.poster_date::timestamptz + interval '13 hours'
  ) + (row_number() over (ORDER BY sc.updated_at) * interval '1 second'),
  'juror', sc.juror_id, 'juror_group_started', 'project', sc.project_id,
  format('Juror %s started evaluating Group %s (%s).', j.juror_name, p.group_no, s.name),
  jsonb_build_object('semester_id', sc.semester_id, 'semester_name', s.name,
                     'group_no', p.group_no, 'project_title', p.project_title)
FROM public.scores sc
JOIN public.jurors j ON j.id = sc.juror_id
JOIN public.projects p ON p.id = sc.project_id
JOIN public.semesters s ON s.id = sc.semester_id
WHERE sc.technical IS NOT NULL
   OR sc.written IS NOT NULL
   OR sc.oral IS NOT NULL
   OR sc.teamwork IS NOT NULL
   OR NULLIF(trim(coalesce(sc.comment, '')), '') IS NOT NULL;

INSERT INTO public.audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata)
SELECT
  sc.updated_at - (random() * interval '8 minutes')
    + (row_number() over (ORDER BY sc.updated_at) * interval '1 second'),
  'juror', sc.juror_id, 'juror_group_completed', 'project', sc.project_id,
  format('Juror %s completed evaluation for Group %s (%s).', j.juror_name, p.group_no, s.name),
  jsonb_build_object('semester_id', sc.semester_id, 'semester_name', s.name,
                     'group_no', p.group_no, 'project_title', p.project_title)
FROM public.scores sc
JOIN public.jurors j ON j.id = sc.juror_id
JOIN public.projects p ON p.id = sc.project_id
JOIN public.semesters s ON s.id = sc.semester_id
WHERE sc.technical IS NOT NULL AND sc.written IS NOT NULL
  AND sc.oral IS NOT NULL AND sc.teamwork IS NOT NULL;

-- Phase 3 — Final submissions (poster_date evening)
INSERT INTO public.audit_logs
  (created_at, actor_type, actor_id, action, entity_type, entity_id, message, metadata)
SELECT
  MAX(sc.final_submitted_at) + (row_number() over (ORDER BY sc.semester_id, sc.juror_id) * interval '1 second'),
  'juror', sc.juror_id, 'juror_finalize_submission', 'semester', sc.semester_id,
  format('Juror %s finalized submission (%s).', j.juror_name, s.name),
  jsonb_build_object('semester_id', sc.semester_id, 'semester_name', s.name)
FROM public.scores sc
JOIN public.jurors j ON j.id = sc.juror_id
JOIN public.semesters s ON s.id = sc.semester_id
JOIN (
  SELECT semester_id, juror_id,
         COUNT(*) AS total_projects,
         COUNT(*) FILTER (WHERE final_submitted_at IS NOT NULL) AS completed_projects
  FROM public.scores
  GROUP BY semester_id, juror_id
) pj ON pj.semester_id = sc.semester_id AND pj.juror_id = sc.juror_id
WHERE sc.final_submitted_at IS NOT NULL
  AND pj.total_projects > 0
  AND pj.completed_projects = pj.total_projects
GROUP BY sc.semester_id, sc.juror_id, j.juror_name, s.name;

-- ------------------------------------------------------------
-- 8) Sanity check
-- ------------------------------------------------------------
DO $$
DECLARE
  v_missing int;
BEGIN
  SELECT COUNT(*) INTO v_missing
  FROM public.v_active_scores
  WHERE semester_name IS NULL
     OR project_title IS NULL
     OR group_students IS NULL
     OR juror_name IS NULL
     OR juror_inst IS NULL
     OR group_no IS NULL;

  IF v_missing > 0 THEN
    RAISE EXCEPTION 'v_active_scores join mismatch: % rows missing metadata', v_missing;
  END IF;
END;
$$;

COMMIT;
