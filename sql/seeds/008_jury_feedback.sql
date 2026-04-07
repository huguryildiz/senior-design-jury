-- Seed: jury_feedback — demo ratings and testimonials for landing page
INSERT INTO jury_feedback (period_id, juror_id, rating, comment, is_public) VALUES
-- TEDU EE
('a0d6f60d-ece4-40f8-aca2-955b4abc5d88', 'fa00f97b-961d-41c8-9b0e-f888a2d7e813', 4, NULL, FALSE),

-- IEEE
('318124ea-8614-4355-ad48-2486524dfc13', 'f106ca15-dc12-414f-ac41-0b361db08f95', 5, 'Incredibly smooth experience. Scored 12 projects in under an hour with no hiccups.', TRUE),
('318124ea-8614-4355-ad48-2486524dfc13', '79ef4764-8e84-4a18-ad48-dbd780a5a027', 4, 'Clean interface, very intuitive. Would love a dark mode option on the scoring screen.', TRUE),
('318124ea-8614-4355-ad48-2486524dfc13', 'a206da8b-457b-4842-ae74-911fb4193bfe', 5, 'Best evaluation tool I have used for conference paper reviews. Simple yet powerful.', TRUE),
('b7014c23-db5e-4be5-a5d6-d9597e8578cc', 'f106ca15-dc12-414f-ac41-0b361db08f95', 5, NULL, FALSE),
('b7014c23-db5e-4be5-a5d6-d9597e8578cc', '79ef4764-8e84-4a18-ad48-dbd780a5a027', 4, NULL, FALSE),
('b7014c23-db5e-4be5-a5d6-d9597e8578cc', 'a206da8b-457b-4842-ae74-911fb4193bfe', 5, 'Used VERA again for the second time — consistently excellent.', TRUE),

-- CanSat
('10abd4e8-0cb9-4853-a17c-ac40da311bff', '4f32d322-afb7-4042-a9d1-ce0c17a09a30', 5, 'We evaluated 24 CanSat teams in a single afternoon. Real-time rankings kept the event exciting.', TRUE),
('10abd4e8-0cb9-4853-a17c-ac40da311bff', 'a71bad63-0a65-47a2-a5a5-623ab35c9ba7', 4, 'Great for competition settings. The rubric sheet was very helpful.', TRUE),
('10abd4e8-0cb9-4853-a17c-ac40da311bff', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 5, NULL, FALSE),
('9f49cd18-d850-4b1e-ae53-c08253910f4e', '4f32d322-afb7-4042-a9d1-ce0c17a09a30', 4, NULL, FALSE),
('9f49cd18-d850-4b1e-ae53-c08253910f4e', 'a71bad63-0a65-47a2-a5a5-623ab35c9ba7', 5, 'Even better than last year. The admin panel gives instant insight into scoring patterns.', TRUE),
('9f49cd18-d850-4b1e-ae53-c08253910f4e', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 4, 'Straightforward and efficient. No training needed — I just started scoring.', TRUE),

-- CMU
('b90e1112-88c7-44fa-a275-25bc0ad2d96d', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 5, 'Replaced our old paper-based system entirely. The export feature alone saves hours of work.', TRUE),
('b90e1112-88c7-44fa-a275-25bc0ad2d96d', '47dcf645-bcf8-407e-a86e-f0e506495726', 4, 'Solid tool. The configurable criteria made it easy to adapt to our CS capstone format.', TRUE),
('0e963024-a53f-4722-a9e0-5db7a47b4419', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 5, NULL, FALSE),
('0e963024-a53f-4722-a9e0-5db7a47b4419', '47dcf645-bcf8-407e-a86e-f0e506495726', 3, NULL, FALSE),
('f8c01197-da4a-4646-a42d-8dc74715e3bc', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 4, NULL, FALSE),
('f8c01197-da4a-4646-a42d-8dc74715e3bc', '47dcf645-bcf8-407e-a86e-f0e506495726', 5, 'Third semester using VERA. It keeps getting better.', TRUE),

-- TEKNOFEST
('bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 5, 'Yüzlerce takımı hızlıca değerlendirdik. Sistem çok stabil ve hızlıydı.', TRUE),
('308d2708-dbea-41b6-a1c8-da6129445759', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 4, NULL, FALSE),
('308d2708-dbea-41b6-a1c8-da6129445759', '8a98e32c-a076-407a-a0c5-18badfbd546d', 5, 'Kullanımı çok kolay, eğitim bile gerekmedi. Tüm jüri arkadaşlarım memnun kaldı.', TRUE),

-- CanSat third
('47979751-163d-48b3-ae56-a65586d18f1b', 'a71bad63-0a65-47a2-a5a5-623ab35c9ba7', 3, NULL, FALSE),
('47979751-163d-48b3-ae56-a65586d18f1b', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 5, NULL, FALSE)
ON CONFLICT (period_id, juror_id) DO NOTHING;
