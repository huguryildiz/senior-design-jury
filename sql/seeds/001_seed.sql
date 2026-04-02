-- VERA: Demo seed data

-- ============================================================================
-- Organizations (3)
-- ============================================================================
INSERT INTO organizations (id, name, short_name, status) VALUES
  ('11111111-1111-1111-1111-111111111101', 'TED University EE', 'TEDU-EE', 'active'),
  ('11111111-1111-1111-1111-111111111102', 'Demo University CS', 'DEMO-CS', 'active'),
  ('11111111-1111-1111-1111-111111111103', 'METU Mechanical Engineering', 'METU-ME', 'active')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Frameworks (3 total: 2 built-in + 1 custom)
-- ============================================================================
INSERT INTO frameworks (id, organization_id, name, description, is_default) VALUES
  -- Built-in frameworks (global, no org_id)
  ('22222222-2222-2222-2222-222222222201', NULL, 'MUDEK', 'Turkish MUDEK (Mühendislik Dersleri Akreditasyonu) outcomes framework', true),
  ('22222222-2222-2222-2222-222222222202', NULL, 'ABET', 'ABET (Accreditation Board for Engineering and Technology) outcomes framework', false),
  -- Organization-specific custom framework
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111101', 'TEDU Custom Framework', 'Custom evaluation framework for TEDU EE department', false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Outcomes
-- ============================================================================
-- MUDEK outcomes (PÇ-1 through PÇ-11)
INSERT INTO outcomes (id, framework_id, code, label, description, sort_order) VALUES
  ('33333333-3333-3333-3333-333333330101', '22222222-2222-2222-2222-222222222201', 'PÇ-1', 'Mühendislik Problemlerini Tanımlamak, Formüle Etmek ve Çözmek', 'Engineering problem solving ability', 1),
  ('33333333-3333-3333-3333-333333330102', '22222222-2222-2222-2222-222222222201', 'PÇ-2', 'Modern Araç, Teknik ve Yöntemleri Kullanmak', 'Use of modern tools and techniques', 2),
  ('33333333-3333-3333-3333-333333330103', '22222222-2222-2222-2222-222222222201', 'PÇ-3', 'Karmaşık Problemleri Çözmek İçin Bilgi Edinmek ve Kullanmak', 'Lifelong learning and information gathering', 3),
  ('33333333-3333-3333-3333-333333330104', '22222222-2222-2222-2222-222222222201', 'PÇ-4', 'İşletme Pratiği ve Teknoloji Alanında Bilmek', 'Professional practice and technology knowledge', 4),
  ('33333333-3333-3333-3333-333333330105', '22222222-2222-2222-2222-222222222201', 'PÇ-5', 'Sosyal, Çevresel ve Etik Etkiyi Anlamak', 'Understanding social, environmental and ethical impacts', 5),
  ('33333333-3333-3333-3333-333333330106', '22222222-2222-2222-2222-222222222201', 'PÇ-6', 'İletişim Becerilerini Göstermek', 'Communication skills', 6),
  ('33333333-3333-3333-3333-333333330107', '22222222-2222-2222-2222-222222222201', 'PÇ-7', 'Takım Çalışması Yapabilmek', 'Teamwork and collaboration', 7),
  ('33333333-3333-3333-3333-333333330108', '22222222-2222-2222-2222-222222222201', 'PÇ-8', 'Proje Yönetimi Becerilerini Göstermek', 'Project management skills', 8),
  ('33333333-3333-3333-3333-333333330109', '22222222-2222-2222-2222-222222222201', 'PÇ-9', 'Yaşam Boyu Öğrenmeye Yatkın Olmak', 'Commitment to lifelong learning', 9),
  ('33333333-3333-3333-3333-333333330110', '22222222-2222-2222-2222-222222222201', 'PÇ-10', 'Girişimcilik Bilinci', 'Entrepreneurship awareness', 10),
  ('33333333-3333-3333-3333-333333330111', '22222222-2222-2222-2222-222222222201', 'PÇ-11', 'Bilim ve Teknolojiye Katkı Sağlamak', 'Contribution to science and technology', 11)
ON CONFLICT DO NOTHING;

-- ABET outcomes (SO 1 through SO 7)
INSERT INTO outcomes (id, framework_id, code, label, description, sort_order) VALUES
  ('33333333-3333-3333-3333-333333330201', '22222222-2222-2222-2222-222222222202', 'SO-1', 'Identify, formulate, and solve complex engineering problems', 'Problem solving', 1),
  ('33333333-3333-3333-3333-333333330202', '22222222-2222-2222-2222-222222222202', 'SO-2', 'Apply engineering design to produce solutions', 'Design skills', 2),
  ('33333333-3333-3333-3333-333333330203', '22222222-2222-2222-2222-222222222202', 'SO-3', 'Communicate effectively with a range of audiences', 'Communication', 3),
  ('33333333-3333-3333-3333-333333330204', '22222222-2222-2222-2222-222222222202', 'SO-4', 'Recognize ethical and professional responsibilities', 'Ethics and professional practice', 4),
  ('33333333-3333-3333-3333-333333330205', '22222222-2222-2222-2222-222222222202', 'SO-5', 'Function on multidisciplinary teams', 'Teamwork', 5),
  ('33333333-3333-3333-3333-333333330206', '22222222-2222-2222-2222-222222222202', 'SO-6', 'Develop and conduct appropriate experimentation', 'Experimentation', 6),
  ('33333333-3333-3333-3333-333333330207', '22222222-2222-2222-2222-222222222202', 'SO-7', 'Acquire and apply new knowledge', 'Lifelong learning', 7)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Periods (4)
-- ============================================================================
INSERT INTO periods (id, organization_id, name, season, framework_id, is_current, is_locked, criteria_config) VALUES
  (
    '44444444-4444-4444-4444-444444444401',
    '11111111-1111-1111-1111-111111111101',
    '2024-25 Fall',
    'Fall',
    '22222222-2222-2222-2222-222222222201',
    false,
    false,
    '{"criteria": [{"key": "technical", "label": "Technical", "max": 30, "weight": 1}, {"key": "written", "label": "Design Report", "max": 30, "weight": 1}, {"key": "oral", "label": "Presentation", "max": 30, "weight": 1}, {"key": "teamwork", "label": "Teamwork", "max": 10, "weight": 1}]}'
  ),
  (
    '44444444-4444-4444-4444-444444444402',
    '11111111-1111-1111-1111-111111111101',
    '2024-25 Spring',
    'Spring',
    '22222222-2222-2222-2222-222222222201',
    true,
    false,
    '{"criteria": [{"key": "technical", "label": "Technical", "max": 30, "weight": 1}, {"key": "written", "label": "Design Report", "max": 30, "weight": 1}, {"key": "oral", "label": "Presentation", "max": 30, "weight": 1}, {"key": "teamwork", "label": "Teamwork", "max": 10, "weight": 1}]}'
  ),
  (
    '44444444-4444-4444-4444-444444444403',
    '11111111-1111-1111-1111-111111111102',
    '2024-25 Spring',
    'Spring',
    '22222222-2222-2222-2222-222222222202',
    true,
    false,
    '{"criteria": [{"key": "technical", "label": "Technical", "max": 30, "weight": 1}, {"key": "written", "label": "Design Report", "max": 30, "weight": 1}, {"key": "oral", "label": "Presentation", "max": 30, "weight": 1}, {"key": "teamwork", "label": "Teamwork", "max": 10, "weight": 1}]}'
  ),
  (
    '44444444-4444-4444-4444-444444444404',
    '11111111-1111-1111-1111-111111111103',
    '2024-25 Fall',
    'Fall',
    '22222222-2222-2222-2222-222222222201',
    true,
    false,
    '{"criteria": [{"key": "technical", "label": "Technical", "max": 30, "weight": 1}, {"key": "written", "label": "Design Report", "max": 30, "weight": 1}, {"key": "oral", "label": "Presentation", "max": 30, "weight": 1}, {"key": "teamwork", "label": "Teamwork", "max": 10, "weight": 1}]}'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Jurors (12 total: 4 per organization)
-- ============================================================================
-- TEDU-EE Jurors (Turkish academic names)
INSERT INTO jurors (id, organization_id, juror_name, affiliation, email) VALUES
  ('55555555-5555-5555-5555-555555550101', '11111111-1111-1111-1111-111111111101', 'Prof. Dr. Ahmet Kaya', 'Istanbul Technical University', 'a.kaya@itu.edu.tr'),
  ('55555555-5555-5555-5555-555555550102', '11111111-1111-1111-1111-111111111101', 'Assoc. Prof. Elif Şahin', 'Middle East Technical University', 'e.sahin@metu.edu.tr'),
  ('55555555-5555-5555-5555-555555550103', '11111111-1111-1111-1111-111111111101', 'Dr. Mehmet Yılmaz', 'Bogazici University', 'm.yilmaz@boun.edu.tr'),
  ('55555555-5555-5555-5555-555555550104', '11111111-1111-1111-1111-111111111101', 'Prof. Dr. Süreyya Demir', 'TED University', 's.demir@tedu.edu.tr')
ON CONFLICT DO NOTHING;

-- DEMO-CS Jurors (English academic names)
INSERT INTO jurors (id, organization_id, juror_name, affiliation, email) VALUES
  ('55555555-5555-5555-5555-555555550201', '11111111-1111-1111-1111-111111111102', 'Prof. James Anderson', 'UC Berkeley Computer Science', 'janderson@berkeley.edu'),
  ('55555555-5555-5555-5555-555555550202', '11111111-1111-1111-1111-111111111102', 'Dr. Sarah Chen', 'Carnegie Mellon University', 'schen@cmu.edu'),
  ('55555555-5555-5555-5555-555555550203', '11111111-1111-1111-1111-111111111102', 'Assoc. Prof. Michael Brown', 'Stanford University', 'mbrown@stanford.edu'),
  ('55555555-5555-5555-5555-555555550204', '11111111-1111-1111-1111-111111111102', 'Dr. Emily White', 'MIT CSAIL', 'ewhite@mit.edu')
ON CONFLICT DO NOTHING;

-- METU-ME Jurors (Turkish academic names)
INSERT INTO jurors (id, organization_id, juror_name, affiliation, email) VALUES
  ('55555555-5555-5555-5555-555555550301', '11111111-1111-1111-1111-111111111103', 'Prof. Dr. Cem Sözen', 'METU Mechanical Engineering', 'c.sozen@metu.edu.tr'),
  ('55555555-5555-5555-5555-555555550302', '11111111-1111-1111-1111-111111111103', 'Assoc. Prof. Ayşe Koçak', 'Ankara University', 'a.kocak@ankara.edu.tr'),
  ('55555555-5555-5555-5555-555555550303', '11111111-1111-1111-1111-111111111103', 'Dr. Levent Turhan', 'Gazi University', 'l.turhan@gazi.edu.tr'),
  ('55555555-5555-5555-5555-555555550304', '11111111-1111-1111-1111-111111111103', 'Prof. Dr. Volkan Öner', 'METU Mechanical Engineering', 'v.oner@metu.edu.tr')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Projects (12 total: 4 per period)
-- ============================================================================
-- TEDU-EE Spring Projects (EE capstone)
INSERT INTO projects (id, period_id, title, members, advisor, description) VALUES
  ('66666666-6666-6666-6666-666666660101', '44444444-4444-4444-4444-444444444402', 'Smart Building Automation System', 'Emre Çapar, Merve Kaya, Mustafa Şenol', 'Prof. Dr. Hakan Keleş', 'IoT-based building control system with real-time monitoring and energy optimization'),
  ('66666666-6666-6666-6666-666666660102', '44444444-4444-4444-4444-444444444402', 'Drone-Based Power Line Inspection', 'Fatih Aydın, Gül Demir, Okan Yurt', 'Assoc. Prof. Dr. Özge Meriç', 'Autonomous drone system for high-voltage power line assessment and defect detection'),
  ('66666666-6666-6666-6666-666666660103', '44444444-4444-4444-4444-444444444402', 'Real-Time EMG Signal Processing', 'Zeynep Koşar, Ahmet Güzel, Cansu Uysal', 'Dr. İsmail Sarı', 'Wearable EMG analysis device for physiotherapy and rehabilitation monitoring'),
  ('66666666-6666-6666-6666-666666660104', '44444444-4444-4444-4444-444444444402', 'Solar Panel Tracking System', 'Ali Sevinç, Büşra Köse, Derya Taş', 'Prof. Dr. Nedim Karaca', 'Dual-axis solar panel tracker with automated positioning for maximum efficiency')
ON CONFLICT DO NOTHING;

-- DEMO-CS Spring Projects
INSERT INTO projects (id, period_id, title, members, advisor, description) VALUES
  ('66666666-6666-6666-6666-666666660201', '44444444-4444-4444-4444-444444444403', 'Machine Learning Text Classifier', 'Alice Johnson, Bob Smith, Carol White', 'Dr. Sandra Martinez', 'NLP model for sentiment analysis on social media with 95% accuracy'),
  ('66666666-6666-6666-6666-666666660202', '44444444-4444-4444-4444-444444444403', 'Distributed Database System', 'David Lee, Emma Taylor, Frank Chen', 'Prof. James Wilson', 'Horizontally-scalable NoSQL database with ACID guarantees and replication'),
  ('66666666-6666-6666-6666-666666660203', '44444444-4444-4444-4444-444444444403', 'Kubernetes Monitoring Platform', 'Grace Park, Henry Garcia, Iris Patel', 'Dr. Monica Rodriguez', 'Real-time cluster monitoring and alerting system for container orchestration'),
  ('66666666-6666-6666-6666-666666660204', '44444444-4444-4444-4444-444444444403', 'Web-Based Code Editor', 'Jack Thompson, Karen Williams, Leo Martinez', 'Prof. Richard Anderson', 'Multi-language code editor with real-time collaboration and cloud synchronization')
ON CONFLICT DO NOTHING;

-- METU-ME Fall Projects
INSERT INTO projects (id, period_id, title, members, advisor, description) VALUES
  ('66666666-6666-6666-6666-666666660301', '44444444-4444-4444-4444-444444444404', 'Composite Material Testing Device', 'Hasan Güldü, Didem Özdemir, Erkan Çetin', 'Prof. Dr. Serdar Yılmaz', 'Automated material testing apparatus for composite properties evaluation'),
  ('66666666-6666-6666-6666-666666660302', '44444444-4444-4444-4444-444444444404', 'Fluid Dynamics Simulation Framework', 'İbrahim Kaya, Jale Eroğlu, Kaan Polat', 'Assoc. Prof. Dr. Uğur Güneş', 'CFD software for turbulent flow analysis with parallelized computation'),
  ('66666666-6666-6666-6666-666666660303', '44444444-4444-4444-4444-444444444404', 'Robotic Arm Gripper Design', 'Levent Arslan, Melis Bayrak, Nedim Duran', 'Dr. Fatih Kara', 'Adaptive gripper mechanism for soft and fragile object manipulation'),
  ('66666666-6666-6666-6666-666666660304', '44444444-4444-4444-4444-444444444404', 'Heat Exchanger Optimization', 'Oğuz Kılıç, Pınar Çalışkan, Rıza Tekten', 'Prof. Dr. Mete Kaya', 'Thermal analysis and optimization of plate-fin heat exchanger design')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Juror-Period Auth (assign jurors to periods with PIN)
-- ============================================================================
INSERT INTO juror_period_auth (juror_id, period_id, pin) VALUES
  -- TEDU-EE Spring jurors
  ('55555555-5555-5555-5555-555555550101', '44444444-4444-4444-4444-444444444402', '1234'),
  ('55555555-5555-5555-5555-555555550102', '44444444-4444-4444-4444-444444444402', '5678'),
  ('55555555-5555-5555-5555-555555550103', '44444444-4444-4444-4444-444444444402', '9012'),
  ('55555555-5555-5555-5555-555555550104', '44444444-4444-4444-4444-444444444402', '3456'),
  -- DEMO-CS Spring jurors
  ('55555555-5555-5555-5555-555555550201', '44444444-4444-4444-4444-444444444403', '1357'),
  ('55555555-5555-5555-5555-555555550202', '44444444-4444-4444-4444-444444444403', '2468'),
  ('55555555-5555-5555-5555-555555550203', '44444444-4444-4444-4444-444444444403', '1111'),
  ('55555555-5555-5555-5555-555555550204', '44444444-4444-4444-4444-444444444403', '2222'),
  -- METU-ME Fall jurors
  ('55555555-5555-5555-5555-555555550301', '44444444-4444-4444-4444-444444444404', '4321'),
  ('55555555-5555-5555-5555-555555550302', '44444444-4444-4444-4444-444444444404', '8765'),
  ('55555555-5555-5555-5555-555555550303', '44444444-4444-4444-4444-444444444404', '4444'),
  ('55555555-5555-5555-5555-555555550304', '44444444-4444-4444-4444-444444444404', '5555')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Scores (mix of complete, partial, and missing)
-- ============================================================================
-- Complete scores for TEDU-EE Spring (60% coverage: 10 out of 16 combinations)
INSERT INTO scores (id, juror_id, project_id, period_id, technical, written, oral, teamwork, comments) VALUES
  ('77777777-7777-7777-7777-777777770101', '55555555-5555-5555-5555-555555550101', '66666666-6666-6666-6666-666666660101', '44444444-4444-4444-4444-444444444402', 28, 26, 29, 9, 'Excellent technical implementation and presentation'),
  ('77777777-7777-7777-7777-777777770102', '55555555-5555-5555-5555-555555550101', '66666666-6666-6666-6666-666666660102', '44444444-4444-4444-4444-444444444402', 25, 24, 26, 8, 'Good overall project, minor areas for improvement'),
  ('77777777-7777-7777-7777-777777770103', '55555555-5555-5555-5555-555555550102', '66666666-6666-6666-6666-666666660101', '44444444-4444-4444-4444-444444444402', 27, 27, 28, 9, 'Outstanding design and teamwork'),
  ('77777777-7777-7777-7777-777777770104', '55555555-5555-5555-5555-555555550102', '66666666-6666-6666-6666-666666660103', '44444444-4444-4444-4444-444444444402', 24, 23, 25, 7, 'Solid work with good technical foundation'),
  ('77777777-7777-7777-7777-777777770105', '55555555-5555-5555-5555-555555550103', '66666666-6666-6666-6666-666666660102', '44444444-4444-4444-4444-444444444402', 26, 25, 27, 8, 'Well-executed project with clear documentation'),
  ('77777777-7777-7777-7777-777777770106', '55555555-5555-5555-5555-555555550103', '66666666-6666-6666-6666-666666660104', '44444444-4444-4444-4444-444444444402', 29, 28, 29, 10, 'Exceptional work across all criteria'),
  ('77777777-7777-7777-7777-777777770107', '55555555-5555-5555-5555-555555550104', '66666666-6666-6666-6666-666666660103', '44444444-4444-4444-4444-444444444402', 22, 21, 23, 6, 'Good foundation, could benefit from polish'),
  ('77777777-7777-7777-7777-777777770108', '55555555-5555-5555-5555-555555550104', '66666666-6666-6666-6666-666666660104', '44444444-4444-4444-4444-444444444402', 28, 27, 28, 9, 'Very strong technical execution'),
  ('77777777-7777-7777-7777-777777770109', '55555555-5555-5555-5555-555555550101', '66666666-6666-6666-6666-666666660103', '44444444-4444-4444-4444-444444444402', 25, 24, 26, 8, 'Professional presentation and implementation'),
  ('77777777-7777-7777-7777-777777770110', '55555555-5555-5555-5555-555555550102', '66666666-6666-6666-6666-666666660104', '44444444-4444-4444-4444-444444444402', 27, 26, 27, 9, 'Strong all-around project')
ON CONFLICT DO NOTHING;

-- Partial scores for TEDU-EE Spring (20% coverage: 3 with some NULL fields)
INSERT INTO scores (id, juror_id, project_id, period_id, technical, written, oral, teamwork, comments) VALUES
  ('77777777-7777-7777-7777-777777770111', '55555555-5555-5555-5555-555555550103', '66666666-6666-6666-6666-666666660101', '44444444-4444-4444-4444-444444444402', 26, 25, NULL, 8, 'Partial evaluation - oral pending'),
  ('77777777-7777-7777-7777-777777770112', '55555555-5555-5555-5555-555555550104', '66666666-6666-6666-6666-666666660101', '44444444-4444-4444-4444-444444444402', NULL, 22, 24, NULL, 'In progress'),
  ('77777777-7777-7777-7777-777777770113', '55555555-5555-5555-5555-555555550101', '66666666-6666-6666-6666-666666660104', '44444444-4444-4444-4444-444444444402', 26, NULL, 25, 7, 'Report still being reviewed')
ON CONFLICT DO NOTHING;

-- Complete scores for DEMO-CS Spring (60% coverage)
INSERT INTO scores (id, juror_id, project_id, period_id, technical, written, oral, teamwork, comments) VALUES
  ('77777777-7777-7777-7777-777777770201', '55555555-5555-5555-5555-555555550201', '66666666-6666-6666-6666-666666660201', '44444444-4444-4444-4444-444444444403', 30, 29, 30, 10, 'Outstanding ML implementation and results'),
  ('77777777-7777-7777-7777-777777770202', '55555555-5555-5555-5555-555555550201', '66666666-6666-6666-6666-666666660202', '44444444-4444-4444-4444-444444444403', 28, 27, 28, 9, 'Well-designed distributed system'),
  ('77777777-7777-7777-7777-777777770203', '55555555-5555-5555-5555-555555550202', '66666666-6666-6666-6666-666666660201', '44444444-4444-4444-4444-444444444403', 27, 26, 27, 9, 'Solid ML model with good accuracy'),
  ('77777777-7777-7777-7777-777777770204', '55555555-5555-5555-5555-555555550202', '66666666-6666-6666-6666-666666660203', '44444444-4444-4444-4444-444444444403', 26, 25, 26, 8, 'Good monitoring platform'),
  ('77777777-7777-7777-7777-777777770205', '55555555-5555-5555-5555-555555550203', '66666666-6666-6666-6666-666666660202', '44444444-4444-4444-4444-444444444403', 29, 28, 29, 10, 'Excellent distributed database design'),
  ('77777777-7777-7777-7777-777777770206', '55555555-5555-5555-5555-555555550203', '66666666-6666-6666-6666-666666660204', '44444444-4444-4444-4444-444444444403', 25, 24, 25, 8, 'Functional code editor with good UX'),
  ('77777777-7777-7777-7777-777777770207', '55555555-5555-5555-5555-555555550204', '66666666-6666-6666-6666-666666660203', '44444444-4444-4444-4444-444444444403', 27, 26, 28, 9, 'Comprehensive monitoring solution'),
  ('77777777-7777-7777-7777-777777770208', '55555555-5555-5555-5555-555555550204', '66666666-6666-6666-6666-666666660204', '44444444-4444-4444-4444-444444444403', 28, 27, 27, 9, 'Professional code editor implementation'),
  ('77777777-7777-7777-7777-777777770209', '55555555-5555-5555-5555-555555550201', '66666666-6666-6666-6666-666666660204', '44444444-4444-4444-4444-444444444403', 26, 25, 26, 8, 'Good collaborative features'),
  ('77777777-7777-7777-7777-777777770210', '55555555-5555-5555-5555-555555550202', '66666666-6666-6666-6666-666666660204', '44444444-4444-4444-4444-444444444403', 25, 24, 25, 7, 'Solid editor implementation')
ON CONFLICT DO NOTHING;

-- Partial scores for DEMO-CS Spring
INSERT INTO scores (id, juror_id, project_id, period_id, technical, written, oral, teamwork, comments) VALUES
  ('77777777-7777-7777-7777-777777770211', '55555555-5555-5555-5555-555555550203', '66666666-6666-6666-6666-666666660201', '44444444-4444-4444-4444-444444444403', 28, NULL, 27, 9, 'Documentation pending'),
  ('77777777-7777-7777-7777-777777770212', '55555555-5555-5555-5555-555555550204', '66666666-6666-6666-6666-666666660201', '44444444-4444-4444-4444-444444444403', NULL, 26, NULL, 8, 'Partial evaluation'),
  ('77777777-7777-7777-7777-777777770213', '55555555-5555-5555-5555-555555550204', '66666666-6666-6666-6666-666666660202', '44444444-4444-4444-4444-444444444403', 27, 26, 28, NULL, 'Awaiting final teamwork assessment')
ON CONFLICT DO NOTHING;

-- Complete scores for METU-ME Fall (60% coverage)
INSERT INTO scores (id, juror_id, project_id, period_id, technical, written, oral, teamwork, comments) VALUES
  ('77777777-7777-7777-7777-777777770301', '55555555-5555-5555-5555-555555550301', '66666666-6666-6666-6666-666666660301', '44444444-4444-4444-4444-444444444404', 29, 28, 29, 10, 'Excellent material testing apparatus'),
  ('77777777-7777-7777-7777-777777770302', '55555555-5555-5555-5555-555555550301', '66666666-6666-6666-6666-666666660302', '44444444-4444-4444-4444-444444444404', 27, 26, 27, 9, 'Strong CFD implementation'),
  ('77777777-7777-7777-7777-777777770303', '55555555-5555-5555-5555-555555550302', '66666666-6666-6666-6666-666666660301', '44444444-4444-4444-4444-444444444404', 26, 25, 26, 8, 'Good experimental design'),
  ('77777777-7777-7777-7777-777777770304', '55555555-5555-5555-5555-555555550302', '66666666-6666-6666-6666-666666660303', '44444444-4444-4444-4444-444444444404', 28, 27, 28, 9, 'Outstanding gripper design'),
  ('77777777-7777-7777-7777-777777770305', '55555555-5555-5555-5555-555555550303', '66666666-6666-6666-6666-666666660302', '44444444-4444-4444-4444-444444444404', 30, 29, 30, 10, 'Exceptional CFD work'),
  ('77777777-7777-7777-7777-777777770306', '55555555-5555-5555-5555-555555550303', '66666666-6666-6666-6666-666666660304', '44444444-4444-4444-4444-444444444404', 25, 24, 25, 7, 'Solid heat exchanger optimization'),
  ('77777777-7777-7777-7777-777777770307', '55555555-5555-5555-5555-555555550304', '66666666-6666-6666-6666-666666660303', '44444444-4444-4444-4444-444444444404', 27, 26, 27, 9, 'Well-engineered gripper solution'),
  ('77777777-7777-7777-7777-777777770308', '55555555-5555-5555-5555-555555550304', '66666666-6666-6666-6666-666666660304', '44444444-4444-4444-4444-444444444404', 28, 27, 28, 9, 'Strong optimization results'),
  ('77777777-7777-7777-7777-777777770309', '55555555-5555-5555-5555-555555550301', '66666666-6666-6666-6666-666666660304', '44444444-4444-4444-4444-444444444404', 26, 25, 26, 8, 'Professional analysis'),
  ('77777777-7777-7777-7777-777777770310', '55555555-5555-5555-5555-555555550302', '66666666-6666-6666-6666-666666660304', '44444444-4444-4444-4444-444444444404', 27, 26, 27, 9, 'Good thermal design work')
ON CONFLICT DO NOTHING;

-- Partial scores for METU-ME Fall
INSERT INTO scores (id, juror_id, project_id, period_id, technical, written, oral, teamwork, comments) VALUES
  ('77777777-7777-7777-7777-777777770311', '55555555-5555-5555-5555-555555550303', '66666666-6666-6666-6666-666666660301', '44444444-4444-4444-4444-444444444404', 26, 25, NULL, 8, 'Oral presentation pending'),
  ('77777777-7777-7777-7777-777777770312', '55555555-5555-5555-5555-555555550304', '66666666-6666-6666-6666-666666660301', '44444444-4444-4444-4444-444444444404', NULL, 26, 25, NULL, 'Incomplete evaluation'),
  ('77777777-7777-7777-7777-777777770313', '55555555-5555-5555-5555-555555550301', '66666666-6666-6666-6666-666666660303', '44444444-4444-4444-4444-444444444404', 25, NULL, 26, 8, 'Report review in progress')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Demo Admin User (profiles + super_admin membership)
-- Auth user: demo-admin@vera-eval.app (UID: 6ea7146f-1331-4828-8b8a-e777c9a35d6a)
-- ============================================================================
INSERT INTO profiles (id, display_name)
VALUES ('6ea7146f-1331-4828-8b8a-e777c9a35d6a', 'Demo Admin')
ON CONFLICT DO NOTHING;

INSERT INTO memberships (user_id, organization_id, role)
VALUES ('6ea7146f-1331-4828-8b8a-e777c9a35d6a', NULL, 'super_admin')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Entry Tokens (2 active)
-- ============================================================================
INSERT INTO entry_tokens (id, period_id, token, is_revoked, expires_at) VALUES
  ('88888888-8888-8888-8888-888888880101', '44444444-4444-4444-4444-444444444402', 'TEDU-EE-2024-SPRING-001', false, now() + interval '7 days'),
  ('88888888-8888-8888-8888-888888880102', '44444444-4444-4444-4444-444444444403', 'DEMO-CS-2024-SPRING-001', false, now() + interval '7 days')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Audit Logs (4 sample entries)
-- ============================================================================
INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details) VALUES
  ('99999999-9999-9999-9999-999999990101', '11111111-1111-1111-1111-111111111101', NULL, 'period_created', 'period', '44444444-4444-4444-4444-444444444402', '{"period_name": "2024-25 Spring", "framework": "MUDEK"}'),
  ('99999999-9999-9999-9999-999999990102', '11111111-1111-1111-1111-111111111101', NULL, 'juror_added', 'juror', '55555555-5555-5555-5555-555555550101', '{"juror_name": "Prof. Dr. Ahmet Kaya", "affiliation": "Istanbul Technical University"}'),
  ('99999999-9999-9999-9999-999999990103', '11111111-1111-1111-1111-111111111101', NULL, 'project_created', 'project', '66666666-6666-6666-6666-666666660101', '{"project_title": "Smart Building Automation System", "team_members": 3}'),
  ('99999999-9999-9999-9999-999999990104', '11111111-1111-1111-1111-111111111101', NULL, 'score_submitted', 'score', '77777777-7777-7777-7777-777777770101', '{"juror_id": "55555555-5555-5555-5555-555555550101", "technical": 28, "total": 92}')
ON CONFLICT DO NOTHING;
