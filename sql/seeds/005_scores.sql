-- Scoring
-- Score status: Scored = all criteria filled, Partial = some criteria, Empty = no sheet
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('05cae445-62fe-4a99-ab16-eb24593462bf', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '93fcb76b-9827-4720-a1a8-9d65fdbc3055', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2026-06-15 12:00:00' - interval '51 hours' - interval '36 mins', timestamp '2026-06-15 12:00:00' - interval '51 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2d9fb356-47d1-4361-84f3-d1e247f0f6d4', '05cae445-62fe-4a99-ab16-eb24593462bf', '787e905a-a2da-431e-af63-00cea2ea7bb5', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f31815d9-5f43-4b3f-9e8c-ae392b3ff5ce', '05cae445-62fe-4a99-ab16-eb24593462bf', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b5f804a7-fc86-4af0-a4af-9514b1d7821d', '05cae445-62fe-4a99-ab16-eb24593462bf', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0805d9ca-5a5b-4d68-a436-be620e66567a', '05cae445-62fe-4a99-ab16-eb24593462bf', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('af785014-7464-45af-9866-622a1901ab43', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '46123b99-4f0a-4d61-a870-6ef0f78e371f', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2026-06-15 12:00:00' - interval '25 hours' - interval '31 mins', timestamp '2026-06-15 12:00:00' - interval '25 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e3e3881f-797b-4242-9603-fa45c1e4df61', 'af785014-7464-45af-9866-622a1901ab43', '787e905a-a2da-431e-af63-00cea2ea7bb5', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('95b61a9f-a040-4ae5-9a89-f2b9ec9aa483', 'af785014-7464-45af-9866-622a1901ab43', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dfeb5c0c-b467-42e2-88e7-55f8b09c7677', 'af785014-7464-45af-9866-622a1901ab43', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('58007484-eae3-4777-b42a-40cf1007b456', 'af785014-7464-45af-9866-622a1901ab43', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d0b0023e-b056-43b1-ae19-1f9190f20e58', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '733f9e70-8f7b-47dc-ad72-a604c760696f', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2026-06-15 12:00:00' - interval '30 hours' - interval '44 mins', timestamp '2026-06-15 12:00:00' - interval '30 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('de1aa710-ec8a-4892-97a4-1b8371ffcb81', 'd0b0023e-b056-43b1-ae19-1f9190f20e58', '787e905a-a2da-431e-af63-00cea2ea7bb5', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('675023b9-73ef-4798-a0d3-20e8c68cf4d1', 'd0b0023e-b056-43b1-ae19-1f9190f20e58', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5feb04b1-1b4e-4675-910e-a86ecbcce481', 'd0b0023e-b056-43b1-ae19-1f9190f20e58', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0390d330-0e69-4745-93db-e9391e4c386c', 'd0b0023e-b056-43b1-ae19-1f9190f20e58', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7e99d0c1-2a76-409f-a628-f22b50408264', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '339948a9-b977-4c51-a1bd-c3dab5e32936', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2026-06-15 12:00:00' - interval '1 hours' - interval '20 mins', timestamp '2026-06-15 12:00:00' - interval '1 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('44c59bca-3c19-4e7b-b2f4-33062e9122ec', '7e99d0c1-2a76-409f-a628-f22b50408264', '787e905a-a2da-431e-af63-00cea2ea7bb5', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('52caa224-9d17-47e2-8a9e-24a443165b1d', '7e99d0c1-2a76-409f-a628-f22b50408264', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('053ae9a6-6c42-4694-8c09-1547c9b62314', '7e99d0c1-2a76-409f-a628-f22b50408264', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c0a48c04-1381-4ebb-b303-e68ce39979ad', '7e99d0c1-2a76-409f-a628-f22b50408264', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('cea44c54-f663-4cb1-999f-ad54f6f51829', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '2c01817f-5c28-4899-ab4b-fb741b5f8f9b', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2026-06-15 12:00:00' - interval '3 hours' - interval '27 mins', timestamp '2026-06-15 12:00:00' - interval '3 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f38a6cd4-fb8d-4c14-b3f7-4ae802a06e14', 'cea44c54-f663-4cb1-999f-ad54f6f51829', '787e905a-a2da-431e-af63-00cea2ea7bb5', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3259ca34-6673-4d2d-bd11-f2cd8a7f209c', 'cea44c54-f663-4cb1-999f-ad54f6f51829', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b08ed0f2-2307-43f2-b2dc-a5f4064049c1', 'cea44c54-f663-4cb1-999f-ad54f6f51829', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3ef9050f-8595-4f28-91c9-eb84da5ad564', 'cea44c54-f663-4cb1-999f-ad54f6f51829', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 6) ON CONFLICT DO NOTHING;
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d0cb88cb-45d9-4775-9f53-2095857e6994', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '93fcb76b-9827-4720-a1a8-9d65fdbc3055', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2026-06-15 12:00:00' - interval '2 hours' - interval '36 mins', timestamp '2026-06-15 12:00:00' - interval '2 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('60626ed4-4661-471d-946f-05cb363c7420', 'd0cb88cb-45d9-4775-9f53-2095857e6994', '787e905a-a2da-431e-af63-00cea2ea7bb5', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6cd6cae7-453b-46dc-93f7-c54dcd275eb5', 'd0cb88cb-45d9-4775-9f53-2095857e6994', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8331bf85-b6d6-44d6-9312-3abb645d54c2', 'd0cb88cb-45d9-4775-9f53-2095857e6994', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8da34f96-5e3d-4f80-af9d-5d2248a810de', 'd0cb88cb-45d9-4775-9f53-2095857e6994', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('9a02fc65-cd48-45a0-98e2-4e1ecaccd375', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '46123b99-4f0a-4d61-a870-6ef0f78e371f', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2026-06-15 12:00:00' - interval '49 hours' - interval '45 mins', timestamp '2026-06-15 12:00:00' - interval '49 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('30a873be-f5bf-49d7-b094-18a9d2715132', '9a02fc65-cd48-45a0-98e2-4e1ecaccd375', '787e905a-a2da-431e-af63-00cea2ea7bb5', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2605775b-8fd6-43d2-82d3-1ff89aed84cf', '9a02fc65-cd48-45a0-98e2-4e1ecaccd375', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8bbb33fa-89a2-4b45-8c45-27d9d53fd8b6', '9a02fc65-cd48-45a0-98e2-4e1ecaccd375', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5d6955a6-1c8f-478b-ae28-d9b4df863da4', '9a02fc65-cd48-45a0-98e2-4e1ecaccd375', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('1a084351-7d2a-48cb-84b8-7b66926a0cdb', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '733f9e70-8f7b-47dc-ad72-a604c760696f', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2026-06-15 12:00:00' - interval '65 hours' - interval '29 mins', timestamp '2026-06-15 12:00:00' - interval '65 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('929552c9-08e4-4efc-b613-54f895eea2c8', '1a084351-7d2a-48cb-84b8-7b66926a0cdb', '787e905a-a2da-431e-af63-00cea2ea7bb5', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('adf596a8-5383-4c27-8464-1269d849b7ff', '1a084351-7d2a-48cb-84b8-7b66926a0cdb', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('09e7a472-a4a0-475e-9ae1-a332c8f63997', '1a084351-7d2a-48cb-84b8-7b66926a0cdb', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('66649dd3-a443-40b9-9955-a1333404adc6', '1a084351-7d2a-48cb-84b8-7b66926a0cdb', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('3a335e86-17f3-4ad3-80e5-e1dd33b72986', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '339948a9-b977-4c51-a1bd-c3dab5e32936', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2026-06-15 12:00:00' - interval '13 hours' - interval '39 mins', timestamp '2026-06-15 12:00:00' - interval '13 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8d9ad92c-68ca-4290-8471-dfef9bf958e2', '3a335e86-17f3-4ad3-80e5-e1dd33b72986', '787e905a-a2da-431e-af63-00cea2ea7bb5', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0c66a6dc-1a1b-4c94-b7d2-9cf4a0639c6e', '3a335e86-17f3-4ad3-80e5-e1dd33b72986', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ad5255e8-e8fa-4e5d-a46e-8fd92d52fc59', '3a335e86-17f3-4ad3-80e5-e1dd33b72986', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('52d4aef8-e66c-492c-8fc4-e32a6edb934d', '3a335e86-17f3-4ad3-80e5-e1dd33b72986', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('062af4a6-b427-4348-80bd-3eac32fb10bc', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '2c01817f-5c28-4899-ab4b-fb741b5f8f9b', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2026-06-15 12:00:00' - interval '72 hours' - interval '34 mins', timestamp '2026-06-15 12:00:00' - interval '72 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('593ddfd6-d66e-447d-adb0-bf129dcb5393', '062af4a6-b427-4348-80bd-3eac32fb10bc', '787e905a-a2da-431e-af63-00cea2ea7bb5', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('742258a6-6633-4065-b129-05bf066bbe26', '062af4a6-b427-4348-80bd-3eac32fb10bc', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a5614e4f-0995-4c5f-bf70-47dfe6b50e83', '062af4a6-b427-4348-80bd-3eac32fb10bc', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f2d396b2-908b-4fb7-b3dc-19dcff3c9098', '062af4a6-b427-4348-80bd-3eac32fb10bc', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 6) ON CONFLICT DO NOTHING;
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7fd3cb69-2b69-4911-8a2e-d87720162d59', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '93fcb76b-9827-4720-a1a8-9d65fdbc3055', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2026-06-15 12:00:00' - interval '43 hours' - interval '26 mins', timestamp '2026-06-15 12:00:00' - interval '43 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('de9bd538-1fbc-4def-adb8-40c364970762', '7fd3cb69-2b69-4911-8a2e-d87720162d59', '787e905a-a2da-431e-af63-00cea2ea7bb5', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ce88c87e-e5d7-497d-8cf2-3aa93e976532', '7fd3cb69-2b69-4911-8a2e-d87720162d59', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7547205d-b318-4a7b-a383-d259e50e7029', '7fd3cb69-2b69-4911-8a2e-d87720162d59', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f082840b-2f95-46f4-8eca-dd4775f3c28a', '7fd3cb69-2b69-4911-8a2e-d87720162d59', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('bab10c8e-6348-477a-9083-058cc8c0f42c', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '46123b99-4f0a-4d61-a870-6ef0f78e371f', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2026-06-15 12:00:00' - interval '59 hours' - interval '28 mins', timestamp '2026-06-15 12:00:00' - interval '59 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a12d9c68-6d8f-43f0-b26a-be0640f5c204', 'bab10c8e-6348-477a-9083-058cc8c0f42c', '787e905a-a2da-431e-af63-00cea2ea7bb5', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('46e4dca4-3a49-477c-8884-f8089ba453bf', 'bab10c8e-6348-477a-9083-058cc8c0f42c', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d3b659aa-64f2-47b7-baba-eea47430298a', 'bab10c8e-6348-477a-9083-058cc8c0f42c', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0de09a83-1786-4e46-a9cd-b1714f9663c2', 'bab10c8e-6348-477a-9083-058cc8c0f42c', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('057d2f0f-5e33-4532-b9b6-56558d57dbd0', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '733f9e70-8f7b-47dc-ad72-a604c760696f', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2026-06-15 12:00:00' - interval '13 hours' - interval '41 mins', timestamp '2026-06-15 12:00:00' - interval '13 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fa656a73-bcb3-4803-926a-285414840297', '057d2f0f-5e33-4532-b9b6-56558d57dbd0', '787e905a-a2da-431e-af63-00cea2ea7bb5', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f5d8a6d6-0d31-46cd-9b34-999820935f7d', '057d2f0f-5e33-4532-b9b6-56558d57dbd0', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5e62cec3-3eb4-4f18-b145-f9934e932998', '057d2f0f-5e33-4532-b9b6-56558d57dbd0', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1cd92d2f-042d-4aa8-84e3-ae5c95837e7c', '057d2f0f-5e33-4532-b9b6-56558d57dbd0', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('c37e663f-2ab0-46fa-8689-03a45eaaec39', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '339948a9-b977-4c51-a1bd-c3dab5e32936', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2026-06-15 12:00:00' - interval '66 hours' - interval '38 mins', timestamp '2026-06-15 12:00:00' - interval '66 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('16641476-3f3f-439f-8eec-30fe14784762', 'c37e663f-2ab0-46fa-8689-03a45eaaec39', '787e905a-a2da-431e-af63-00cea2ea7bb5', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dcc4b798-a991-4dc9-813e-e3676e8037b4', 'c37e663f-2ab0-46fa-8689-03a45eaaec39', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('78de05d2-76f4-45db-a343-66a4daceddca', 'c37e663f-2ab0-46fa-8689-03a45eaaec39', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2d52e037-7b15-4064-ae65-9c5df374dc00', 'c37e663f-2ab0-46fa-8689-03a45eaaec39', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('3d645ca0-0116-4bd7-910d-b74ee4cb0783', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '2c01817f-5c28-4899-ab4b-fb741b5f8f9b', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2026-06-15 12:00:00' - interval '4 hours' - interval '22 mins', timestamp '2026-06-15 12:00:00' - interval '4 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e2e825ea-61f8-4626-ae17-08c6922f7f13', '3d645ca0-0116-4bd7-910d-b74ee4cb0783', '787e905a-a2da-431e-af63-00cea2ea7bb5', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5ba70f24-ab8c-495c-845c-fb24a2558a72', '3d645ca0-0116-4bd7-910d-b74ee4cb0783', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4034e657-aea7-4bea-b7af-2f1693f66a01', '3d645ca0-0116-4bd7-910d-b74ee4cb0783', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a83e70cf-00ee-4c45-a113-8d54eb177d8c', '3d645ca0-0116-4bd7-910d-b74ee4cb0783', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 6) ON CONFLICT DO NOTHING;
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('57f352ff-02be-4558-aa8c-f35f0804b64d', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '93fcb76b-9827-4720-a1a8-9d65fdbc3055', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2026-06-15 12:00:00' - interval '54 hours' - interval '22 mins', timestamp '2026-06-15 12:00:00' - interval '54 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3350f3f5-1582-4a9c-a72f-4f2a58161257', '57f352ff-02be-4558-aa8c-f35f0804b64d', '787e905a-a2da-431e-af63-00cea2ea7bb5', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b120026d-f962-4f77-99f4-65dc9d266ea4', '57f352ff-02be-4558-aa8c-f35f0804b64d', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f3c3031c-2009-4925-8e47-63f48827d4a4', '57f352ff-02be-4558-aa8c-f35f0804b64d', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('785177c7-fb7a-4cee-ae89-d1a8e611b015', '57f352ff-02be-4558-aa8c-f35f0804b64d', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('c55bcff4-90ed-482e-9c0c-b91108fc2661', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '46123b99-4f0a-4d61-a870-6ef0f78e371f', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2026-06-15 12:00:00' - interval '50 hours' - interval '34 mins', timestamp '2026-06-15 12:00:00' - interval '50 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ab202778-fe93-42a0-b63d-4f3d8089178b', 'c55bcff4-90ed-482e-9c0c-b91108fc2661', '787e905a-a2da-431e-af63-00cea2ea7bb5', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8b61a901-afff-43a7-a198-3d9c2bcd4cdd', 'c55bcff4-90ed-482e-9c0c-b91108fc2661', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fcd57270-f114-4045-acd4-e55bbced653c', 'c55bcff4-90ed-482e-9c0c-b91108fc2661', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fdf9c939-a31b-475e-bbea-64fd502937a8', 'c55bcff4-90ed-482e-9c0c-b91108fc2661', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e72f7974-d177-48b1-a700-990249dcd5a9', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '733f9e70-8f7b-47dc-ad72-a604c760696f', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2026-06-15 12:00:00' - interval '63 hours' - interval '28 mins', timestamp '2026-06-15 12:00:00' - interval '63 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f51a3bdd-15a1-45bf-a8ac-19e09cc43a95', 'e72f7974-d177-48b1-a700-990249dcd5a9', '787e905a-a2da-431e-af63-00cea2ea7bb5', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ade00e77-dcc5-42b9-aa58-0a150c827053', 'e72f7974-d177-48b1-a700-990249dcd5a9', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b8280923-5395-4839-b997-5ea4462aea4e', 'e72f7974-d177-48b1-a700-990249dcd5a9', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cc6ce195-0c60-451b-8d8f-32b3967cd815', 'e72f7974-d177-48b1-a700-990249dcd5a9', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7e49cc65-9b63-431b-87b5-59a25bb299bc', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '339948a9-b977-4c51-a1bd-c3dab5e32936', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2026-06-15 12:00:00' - interval '67 hours' - interval '31 mins', timestamp '2026-06-15 12:00:00' - interval '67 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2a3c892a-95e5-4775-8e08-4a790435a317', '7e49cc65-9b63-431b-87b5-59a25bb299bc', '787e905a-a2da-431e-af63-00cea2ea7bb5', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a801e748-c56a-4199-a768-48d2661ae3ad', '7e49cc65-9b63-431b-87b5-59a25bb299bc', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e721a3bc-fb7f-4538-bceb-35636de78363', '7e49cc65-9b63-431b-87b5-59a25bb299bc', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bb3c5613-968c-4591-b43b-486c1a256ab2', '7e49cc65-9b63-431b-87b5-59a25bb299bc', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('02670499-35b2-4a81-913d-3b16bda8e21e', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '2c01817f-5c28-4899-ab4b-fb741b5f8f9b', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2026-06-15 12:00:00' - interval '41 hours' - interval '44 mins', timestamp '2026-06-15 12:00:00' - interval '41 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ec739932-aa95-4c10-be00-ba6c0f181b8a', '02670499-35b2-4a81-913d-3b16bda8e21e', '787e905a-a2da-431e-af63-00cea2ea7bb5', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2c67577d-7615-4a38-bb32-640f4fb43195', '02670499-35b2-4a81-913d-3b16bda8e21e', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('186fbab2-57c6-4367-9100-f930af15bf0c', '02670499-35b2-4a81-913d-3b16bda8e21e', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ccaf2901-f3e1-4810-9052-7eda5b42185d', '02670499-35b2-4a81-913d-3b16bda8e21e', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7898c42e-2cc9-4a48-84d5-4ceda96865f3', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '93fcb76b-9827-4720-a1a8-9d65fdbc3055', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2026-06-15 12:00:00' - interval '37 hours' - interval '26 mins', timestamp '2026-06-15 12:00:00' - interval '37 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('583c7af0-1b96-4bfa-bd29-21a8338d86e5', '7898c42e-2cc9-4a48-84d5-4ceda96865f3', '787e905a-a2da-431e-af63-00cea2ea7bb5', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('65ac8244-e3e4-4d82-abe6-d3adf1a3e6ee', '7898c42e-2cc9-4a48-84d5-4ceda96865f3', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('28849d84-36bb-43aa-bb5e-3512caf3a738', '7898c42e-2cc9-4a48-84d5-4ceda96865f3', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('993cda0d-4bf1-4400-be89-0a39c8deaf92', '7898c42e-2cc9-4a48-84d5-4ceda96865f3', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('db1ccdc3-4739-4495-ad39-5831d8f491bb', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '46123b99-4f0a-4d61-a870-6ef0f78e371f', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2026-06-15 12:00:00' - interval '41 hours' - interval '27 mins', timestamp '2026-06-15 12:00:00' - interval '41 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1a31363e-8926-444e-aba2-7517bf8510e3', 'db1ccdc3-4739-4495-ad39-5831d8f491bb', '787e905a-a2da-431e-af63-00cea2ea7bb5', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f427fb61-ef35-483d-8b48-dbf391b1f8ff', 'db1ccdc3-4739-4495-ad39-5831d8f491bb', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0fdd93ea-b699-4eec-81db-821aa3808421', 'db1ccdc3-4739-4495-ad39-5831d8f491bb', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b310e1c4-fb9a-4dc4-8d70-ebc55e7ddafc', 'db1ccdc3-4739-4495-ad39-5831d8f491bb', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d5dba043-a464-4e69-9355-927abdef80e5', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '733f9e70-8f7b-47dc-ad72-a604c760696f', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2026-06-15 12:00:00' - interval '64 hours' - interval '36 mins', timestamp '2026-06-15 12:00:00' - interval '64 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('00719bd9-be36-41ba-946f-8372fd25e828', 'd5dba043-a464-4e69-9355-927abdef80e5', '787e905a-a2da-431e-af63-00cea2ea7bb5', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0284a5fd-08b1-4be2-a0d0-e28f35d323a2', 'd5dba043-a464-4e69-9355-927abdef80e5', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2a208402-38b9-4a69-9ede-246a7b77682e', 'd5dba043-a464-4e69-9355-927abdef80e5', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d4cd3d11-9b3f-48e4-8e48-bd3ceac177c5', 'd5dba043-a464-4e69-9355-927abdef80e5', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('6d8a12fe-161f-4ec2-97a6-4e87ca47307b', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '339948a9-b977-4c51-a1bd-c3dab5e32936', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2026-06-15 12:00:00' - interval '66 hours' - interval '29 mins', timestamp '2026-06-15 12:00:00' - interval '66 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('76837c4d-2734-49c5-8e11-8b5176a98597', '6d8a12fe-161f-4ec2-97a6-4e87ca47307b', '787e905a-a2da-431e-af63-00cea2ea7bb5', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('de26547b-a293-4ea5-be8a-76cc1c9a9f8a', '6d8a12fe-161f-4ec2-97a6-4e87ca47307b', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f3b73943-a45a-4c8a-8584-0a182421a566', '6d8a12fe-161f-4ec2-97a6-4e87ca47307b', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b76ce20a-a5e6-49da-bf12-a967536e4fd6', '6d8a12fe-161f-4ec2-97a6-4e87ca47307b', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('06881638-4b36-442e-b5b6-c44e3e241f30', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '2c01817f-5c28-4899-ab4b-fb741b5f8f9b', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2026-06-15 12:00:00' - interval '67 hours' - interval '28 mins', timestamp '2026-06-15 12:00:00' - interval '67 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('de9dec8d-a271-40b0-8e42-2cf63df9cd17', '06881638-4b36-442e-b5b6-c44e3e241f30', '787e905a-a2da-431e-af63-00cea2ea7bb5', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d7f0ab5d-1af7-4180-92f6-0678e010ee1c', '06881638-4b36-442e-b5b6-c44e3e241f30', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dd9ca5f6-36c7-432f-80d6-246d358ca36f', '06881638-4b36-442e-b5b6-c44e3e241f30', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0bbe085f-0675-49e5-a0cb-3f11f083ce95', '06881638-4b36-442e-b5b6-c44e3e241f30', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('3176cc06-79f6-485d-8434-2a2e81ea05a2', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '339948a9-b977-4c51-a1bd-c3dab5e32936', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', timestamp '2026-06-15 12:00:00' - interval '72 hours' - interval '35 mins', timestamp '2026-06-15 12:00:00' - interval '72 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fc2afc25-fdd7-4a1e-bf8a-d1520b58205f', '3176cc06-79f6-485d-8434-2a2e81ea05a2', '787e905a-a2da-431e-af63-00cea2ea7bb5', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('44ca44b7-7f7b-4018-bd72-f02d99d501c3', '3176cc06-79f6-485d-8434-2a2e81ea05a2', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('266ffcae-7bbd-470a-90dd-cde31936d169', '3176cc06-79f6-485d-8434-2a2e81ea05a2', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('688a92f0-4f58-43ca-a2f5-9020e8db30b2', '3176cc06-79f6-485d-8434-2a2e81ea05a2', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 6) ON CONFLICT DO NOTHING;
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7a0c7d55-c36b-459f-b4c0-6f05f9fe6c5e', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '733f9e70-8f7b-47dc-ad72-a604c760696f', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', timestamp '2026-06-15 12:00:00' - interval '19 hours' - interval '38 mins', timestamp '2026-06-15 12:00:00' - interval '19 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('22ebe417-eaad-4564-9f9f-a208ebcc8af1', '7a0c7d55-c36b-459f-b4c0-6f05f9fe6c5e', '787e905a-a2da-431e-af63-00cea2ea7bb5', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a6a0eba1-1983-4a91-8be7-e684a0777574', '7a0c7d55-c36b-459f-b4c0-6f05f9fe6c5e', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bfa102e4-07fa-4787-baf8-df8434a995db', '7a0c7d55-c36b-459f-b4c0-6f05f9fe6c5e', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d7e764ba-16b5-4815-985f-27edbf5f0be1', '7a0c7d55-c36b-459f-b4c0-6f05f9fe6c5e', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('9dc32254-206b-4868-9fd4-248dd98a833e', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '93fcb76b-9827-4720-a1a8-9d65fdbc3055', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2026-06-15 12:00:00' - interval '18 hours' - interval '35 mins', timestamp '2026-06-15 12:00:00' - interval '18 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a99842ae-124f-41a8-901b-1a38d5b0a4fa', '9dc32254-206b-4868-9fd4-248dd98a833e', '787e905a-a2da-431e-af63-00cea2ea7bb5', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ebad6ade-56a8-496d-9acc-9114d10a8ec7', '9dc32254-206b-4868-9fd4-248dd98a833e', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1bef37aa-1f21-41b9-bba0-f4398d8bffb4', '9dc32254-206b-4868-9fd4-248dd98a833e', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e2ca27c2-88c0-472a-bcfc-a3806cea085e', '9dc32254-206b-4868-9fd4-248dd98a833e', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('bdfe5062-4401-488e-b55f-34dc3e1aa7b2', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '46123b99-4f0a-4d61-a870-6ef0f78e371f', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2026-06-15 12:00:00' - interval '55 hours' - interval '27 mins', timestamp '2026-06-15 12:00:00' - interval '55 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c06a7a38-3c25-472a-876d-84b6142d42d2', 'bdfe5062-4401-488e-b55f-34dc3e1aa7b2', '787e905a-a2da-431e-af63-00cea2ea7bb5', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('428e3045-b700-4eb0-8866-3c5220d5f6cb', 'bdfe5062-4401-488e-b55f-34dc3e1aa7b2', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('688678b8-785e-44d3-beca-21d3b073030e', 'bdfe5062-4401-488e-b55f-34dc3e1aa7b2', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('181b4e28-0804-474b-a413-08665c683d9b', 'bdfe5062-4401-488e-b55f-34dc3e1aa7b2', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('8878dc42-0b25-4d48-8d48-fd32fc2eb4f4', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '733f9e70-8f7b-47dc-ad72-a604c760696f', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2026-06-15 12:00:00' - interval '14 hours' - interval '24 mins', timestamp '2026-06-15 12:00:00' - interval '14 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('db24b9b5-8297-4b41-8500-6fd3e6023251', '8878dc42-0b25-4d48-8d48-fd32fc2eb4f4', '787e905a-a2da-431e-af63-00cea2ea7bb5', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0d91dc51-4c57-44d1-bf4a-1981990c23b1', '8878dc42-0b25-4d48-8d48-fd32fc2eb4f4', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6f0b920a-0a0f-45db-82ca-8c0dd4c01a0d', '8878dc42-0b25-4d48-8d48-fd32fc2eb4f4', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8508f55e-9116-4768-8b26-f7698914d2ae', '8878dc42-0b25-4d48-8d48-fd32fc2eb4f4', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a1c2ced3-8256-4aa3-939d-e911bae5a93d', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '339948a9-b977-4c51-a1bd-c3dab5e32936', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2026-06-15 12:00:00' - interval '5 hours' - interval '27 mins', timestamp '2026-06-15 12:00:00' - interval '5 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('142915b7-640d-4fe7-9e38-758a42b381e5', 'a1c2ced3-8256-4aa3-939d-e911bae5a93d', '787e905a-a2da-431e-af63-00cea2ea7bb5', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('920602fe-9134-4e67-bfc6-9d51950b1d66', 'a1c2ced3-8256-4aa3-939d-e911bae5a93d', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('73e8b339-b9db-4eef-a1fa-375bf7db320f', 'a1c2ced3-8256-4aa3-939d-e911bae5a93d', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('caa36bd5-0588-4433-99cc-09ce3feeff54', 'a1c2ced3-8256-4aa3-939d-e911bae5a93d', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a0587704-9e18-4e9a-b992-a4cf82a03115', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '2c01817f-5c28-4899-ab4b-fb741b5f8f9b', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2026-06-15 12:00:00' - interval '42 hours' - interval '36 mins', timestamp '2026-06-15 12:00:00' - interval '42 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3e7fe504-55f2-4c29-8bfd-ba6443032489', 'a0587704-9e18-4e9a-b992-a4cf82a03115', '787e905a-a2da-431e-af63-00cea2ea7bb5', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ecbecbf7-8160-4a4f-aea1-b811d43b2723', 'a0587704-9e18-4e9a-b992-a4cf82a03115', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4c72f857-a0b0-4e96-9238-de83bca103e4', 'a0587704-9e18-4e9a-b992-a4cf82a03115', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('31c299f2-5cbf-4437-8e91-3d142991a76f', 'a0587704-9e18-4e9a-b992-a4cf82a03115', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d69bcb61-5350-4e02-98b7-5cab8082ca5a', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '93fcb76b-9827-4720-a1a8-9d65fdbc3055', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2026-06-15 12:00:00' - interval '9 hours' - interval '24 mins', timestamp '2026-06-15 12:00:00' - interval '9 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fc7fdb96-d91e-46e9-81f5-748533b0086a', 'd69bcb61-5350-4e02-98b7-5cab8082ca5a', '787e905a-a2da-431e-af63-00cea2ea7bb5', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('40eaa4a2-b907-454c-874e-397128c8f019', 'd69bcb61-5350-4e02-98b7-5cab8082ca5a', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('41aebf09-ff03-4300-b700-1955cf2a4a6f', 'd69bcb61-5350-4e02-98b7-5cab8082ca5a', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('88587c78-8cba-4f36-a841-b0cad320a617', 'd69bcb61-5350-4e02-98b7-5cab8082ca5a', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('3445d527-97e8-4fb9-8158-3d9ebc3b7ca0', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '46123b99-4f0a-4d61-a870-6ef0f78e371f', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2026-06-15 12:00:00' - interval '70 hours' - interval '21 mins', timestamp '2026-06-15 12:00:00' - interval '70 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('60bf8dbb-2a2a-4320-81e3-803b5e37d141', '3445d527-97e8-4fb9-8158-3d9ebc3b7ca0', '787e905a-a2da-431e-af63-00cea2ea7bb5', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6b2edbee-9c38-4e8c-acf5-b380885ebe6d', '3445d527-97e8-4fb9-8158-3d9ebc3b7ca0', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c2802d29-d711-41db-9007-3a3fbafabbdb', '3445d527-97e8-4fb9-8158-3d9ebc3b7ca0', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dda908fb-e30e-41ab-8c57-a873f4cbd098', '3445d527-97e8-4fb9-8158-3d9ebc3b7ca0', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('2cf9f1af-e3f4-4faf-a5e8-ce975de5848c', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '733f9e70-8f7b-47dc-ad72-a604c760696f', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2026-06-15 12:00:00' - interval '65 hours' - interval '26 mins', timestamp '2026-06-15 12:00:00' - interval '65 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fff55115-ef04-4502-be2a-55317f05f24c', '2cf9f1af-e3f4-4faf-a5e8-ce975de5848c', '787e905a-a2da-431e-af63-00cea2ea7bb5', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8384d8ff-428c-40e2-afe7-3ddb61191f7c', '2cf9f1af-e3f4-4faf-a5e8-ce975de5848c', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d65c8d19-d8ba-4066-bae6-312583dcb638', '2cf9f1af-e3f4-4faf-a5e8-ce975de5848c', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('75f601c9-e472-49a8-865c-bfda084811ef', '2cf9f1af-e3f4-4faf-a5e8-ce975de5848c', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7cb2aa34-c60f-4eef-bfc0-9803a829f471', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '339948a9-b977-4c51-a1bd-c3dab5e32936', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2026-06-15 12:00:00' - interval '63 hours' - interval '39 mins', timestamp '2026-06-15 12:00:00' - interval '63 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1a8bc80c-f319-488c-8e1a-56955d137e5c', '7cb2aa34-c60f-4eef-bfc0-9803a829f471', '787e905a-a2da-431e-af63-00cea2ea7bb5', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('863c0a57-ac08-4c15-bb61-1caf0f7bd347', '7cb2aa34-c60f-4eef-bfc0-9803a829f471', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5f7e6c3e-11ce-4bab-86b2-401f030ce076', '7cb2aa34-c60f-4eef-bfc0-9803a829f471', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ebe3a599-ac31-4abf-bd60-1598ea38d54a', '7cb2aa34-c60f-4eef-bfc0-9803a829f471', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('33641aef-7cc9-4ad2-bc47-63eba5102a82', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '2c01817f-5c28-4899-ab4b-fb741b5f8f9b', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2026-06-15 12:00:00' - interval '67 hours' - interval '45 mins', timestamp '2026-06-15 12:00:00' - interval '67 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4d5e4fb3-5cb3-45b5-94b5-be1ff1dec00e', '33641aef-7cc9-4ad2-bc47-63eba5102a82', '787e905a-a2da-431e-af63-00cea2ea7bb5', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f3326376-a16b-4650-9aa5-d7b892ff1772', '33641aef-7cc9-4ad2-bc47-63eba5102a82', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('489f793d-6004-4e77-8be0-b71574d612f4', '33641aef-7cc9-4ad2-bc47-63eba5102a82', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e30410ac-0398-4a64-a883-9740a713443f', '33641aef-7cc9-4ad2-bc47-63eba5102a82', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 6) ON CONFLICT DO NOTHING;
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('af6b0d8a-3af2-443c-8c60-f9138e433a00', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '93fcb76b-9827-4720-a1a8-9d65fdbc3055', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2026-06-15 12:00:00' - interval '48 hours' - interval '33 mins', timestamp '2026-06-15 12:00:00' - interval '48 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6e59e616-b5eb-4a09-81a7-42ab2262dded', 'af6b0d8a-3af2-443c-8c60-f9138e433a00', '787e905a-a2da-431e-af63-00cea2ea7bb5', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('395a2314-c905-44d1-a1ac-4472f3758158', 'af6b0d8a-3af2-443c-8c60-f9138e433a00', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('daf715fd-79b4-4552-b131-8f549d436526', 'af6b0d8a-3af2-443c-8c60-f9138e433a00', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('773542b1-7c06-4caf-8581-91f902cb1019', 'af6b0d8a-3af2-443c-8c60-f9138e433a00', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('f422dfc2-d3ec-4101-9a93-978a9829c28b', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '46123b99-4f0a-4d61-a870-6ef0f78e371f', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2026-06-15 12:00:00' - interval '16 hours' - interval '38 mins', timestamp '2026-06-15 12:00:00' - interval '16 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('767a6bf3-5ee6-4bab-b967-a689f3cd01b6', 'f422dfc2-d3ec-4101-9a93-978a9829c28b', '787e905a-a2da-431e-af63-00cea2ea7bb5', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('83911ed6-0450-42e3-8533-2b773068c844', 'f422dfc2-d3ec-4101-9a93-978a9829c28b', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('146b272e-fa3e-4623-b002-1a73806f3512', 'f422dfc2-d3ec-4101-9a93-978a9829c28b', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cbeb2649-7de5-4b33-9142-3df254016df8', 'f422dfc2-d3ec-4101-9a93-978a9829c28b', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a456f41f-610f-4d1e-8f40-5ca22b7ca5ad', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '733f9e70-8f7b-47dc-ad72-a604c760696f', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2026-06-15 12:00:00' - interval '67 hours' - interval '36 mins', timestamp '2026-06-15 12:00:00' - interval '67 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b066de2d-4ba0-42fe-af42-ee2e3c327922', 'a456f41f-610f-4d1e-8f40-5ca22b7ca5ad', '787e905a-a2da-431e-af63-00cea2ea7bb5', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('db75dd01-b2b3-4777-884b-abdf220ba58e', 'a456f41f-610f-4d1e-8f40-5ca22b7ca5ad', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b09e8cd5-ce39-4ba3-9c5b-cb7bc7ede194', 'a456f41f-610f-4d1e-8f40-5ca22b7ca5ad', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('aaee6df0-d5e2-4185-9a31-53aad8cc23dc', 'a456f41f-610f-4d1e-8f40-5ca22b7ca5ad', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('3be633cd-6f54-4375-936a-6bfd3bfe3435', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '339948a9-b977-4c51-a1bd-c3dab5e32936', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2026-06-15 12:00:00' - interval '38 hours' - interval '21 mins', timestamp '2026-06-15 12:00:00' - interval '38 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d91e1b02-f65b-435d-9aef-f32e7f380ca2', '3be633cd-6f54-4375-936a-6bfd3bfe3435', '787e905a-a2da-431e-af63-00cea2ea7bb5', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1b380f50-215d-4696-bea1-b22819476ce6', '3be633cd-6f54-4375-936a-6bfd3bfe3435', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('92a8fe6b-81ed-4374-a433-09d6ee2881e1', '3be633cd-6f54-4375-936a-6bfd3bfe3435', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1b156034-33c8-430c-a478-47e5c5a1655b', '3be633cd-6f54-4375-936a-6bfd3bfe3435', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('f3245eb5-2daa-491c-9e70-16d3d9c244f1', 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88', '2c01817f-5c28-4899-ab4b-fb741b5f8f9b', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2026-06-15 12:00:00' - interval '15 hours' - interval '38 mins', timestamp '2026-06-15 12:00:00' - interval '15 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9f40aaae-9cc9-432a-a954-b9926d2501c6', 'f3245eb5-2daa-491c-9e70-16d3d9c244f1', '787e905a-a2da-431e-af63-00cea2ea7bb5', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7108b86c-ca18-4921-91bb-3ab7dd25b667', 'f3245eb5-2daa-491c-9e70-16d3d9c244f1', '25fdf203-ff5f-4c31-ab09-3ac8bd726e65', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('35b8a7f1-3cbe-49bc-819f-a989f7d2d580', 'f3245eb5-2daa-491c-9e70-16d3d9c244f1', 'ecc8c71e-2fca-4ab8-aaa9-9efbe29700c6', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e52053ad-6d97-43e8-b889-0cc1d4b997fa', 'f3245eb5-2daa-491c-9e70-16d3d9c244f1', 'dc46db4d-fa3a-4c22-a64a-b5c07a94ebe6', 7) ON CONFLICT DO NOTHING;
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('3620264c-c766-4445-8fb2-7e8bcee6220e', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '00f25636-269c-4d25-abd5-3cdbc12a31f8', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2025-12-20 12:00:00' - interval '26 hours' - interval '23 mins', timestamp '2025-12-20 12:00:00' - interval '26 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d51934a0-be4b-488e-a876-87929c7197aa', '3620264c-c766-4445-8fb2-7e8bcee6220e', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('78eedc58-d559-4c8b-973a-450b8e59a1f2', '3620264c-c766-4445-8fb2-7e8bcee6220e', '8cebf54b-97b4-493c-a837-4707d4828eae', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('af1cd93c-5cfd-4b8b-9804-fdae892e12f6', '3620264c-c766-4445-8fb2-7e8bcee6220e', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d643dbb2-1f32-4bb8-a294-6fbf80c2924b', '3620264c-c766-4445-8fb2-7e8bcee6220e', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('baa6feca-421b-4168-afd0-4623527c182c', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '46c52db6-2cd0-404d-a2bf-23d390c741ad', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2025-12-20 12:00:00' - interval '13 hours' - interval '37 mins', timestamp '2025-12-20 12:00:00' - interval '13 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('06ea2996-2cee-47f7-898d-5c8b0aa67a2c', 'baa6feca-421b-4168-afd0-4623527c182c', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ca03ccad-2b59-4c70-88c1-6d339345f5ba', 'baa6feca-421b-4168-afd0-4623527c182c', '8cebf54b-97b4-493c-a837-4707d4828eae', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5ef435fe-57e9-4017-af3f-57bf77452be2', 'baa6feca-421b-4168-afd0-4623527c182c', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5ce0928c-8aed-489c-b36d-7e67dff31f78', 'baa6feca-421b-4168-afd0-4623527c182c', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('62103fcd-a938-4fda-b156-f3cd2d5908ba', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '12cbf2c4-0a16-4574-abb5-b601beec8176', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2025-12-20 12:00:00' - interval '38 hours' - interval '32 mins', timestamp '2025-12-20 12:00:00' - interval '38 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ba74be7e-072b-4b33-ac78-7ad65defea61', '62103fcd-a938-4fda-b156-f3cd2d5908ba', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f3bb3180-ec2e-4f27-b4d4-977881e5df72', '62103fcd-a938-4fda-b156-f3cd2d5908ba', '8cebf54b-97b4-493c-a837-4707d4828eae', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('aefdcca2-6a0e-44cb-a1be-3715692994b9', '62103fcd-a938-4fda-b156-f3cd2d5908ba', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5b79b559-d19a-4fc4-b210-8d7fcf4d73c1', '62103fcd-a938-4fda-b156-f3cd2d5908ba', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('74cc02c4-95bb-460b-aa21-3582b80dbe06', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '0af988df-e6d9-4ac1-a6ec-56343146a552', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2025-12-20 12:00:00' - interval '61 hours' - interval '43 mins', timestamp '2025-12-20 12:00:00' - interval '61 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('464b5e79-2c77-47ba-bbb3-744f7c012ff2', '74cc02c4-95bb-460b-aa21-3582b80dbe06', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0e2dc110-d87b-48ec-86e3-e53ddcee513e', '74cc02c4-95bb-460b-aa21-3582b80dbe06', '8cebf54b-97b4-493c-a837-4707d4828eae', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4cff7817-c6f2-4f26-a00a-01eb6adacf08', '74cc02c4-95bb-460b-aa21-3582b80dbe06', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a7802b63-62a9-469b-9d75-99fe998f76f8', '74cc02c4-95bb-460b-aa21-3582b80dbe06', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('b95b53b7-02c9-421f-9067-cb3bba22ede8', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '9dbf8fbe-1580-489c-a551-1eda5fb69025', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2025-12-20 12:00:00' - interval '11 hours' - interval '32 mins', timestamp '2025-12-20 12:00:00' - interval '11 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d9810eb7-1dfd-4ec0-b665-56133d55cc8c', 'b95b53b7-02c9-421f-9067-cb3bba22ede8', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('12448098-ceac-48ab-aed7-ca78e384dffc', 'b95b53b7-02c9-421f-9067-cb3bba22ede8', '8cebf54b-97b4-493c-a837-4707d4828eae', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('176358a7-ed7a-4a0b-bc0c-c98012ad47b2', 'b95b53b7-02c9-421f-9067-cb3bba22ede8', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('58445424-61c4-4146-9763-f092fd1f2af5', 'b95b53b7-02c9-421f-9067-cb3bba22ede8', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('bc4a466b-62d6-4b83-ab5e-b568aab78d5c', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '00f25636-269c-4d25-abd5-3cdbc12a31f8', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2025-12-20 12:00:00' - interval '34 hours' - interval '36 mins', timestamp '2025-12-20 12:00:00' - interval '34 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f7bdb348-3fe9-4e60-959e-f5b03303701b', 'bc4a466b-62d6-4b83-ab5e-b568aab78d5c', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1cfaa87d-a4da-4af6-9e34-47a5188e6fa3', 'bc4a466b-62d6-4b83-ab5e-b568aab78d5c', '8cebf54b-97b4-493c-a837-4707d4828eae', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8cea1723-9295-4cdf-8009-e01c23c0f23f', 'bc4a466b-62d6-4b83-ab5e-b568aab78d5c', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e62af979-5703-4630-b25d-7ded89a771ff', 'bc4a466b-62d6-4b83-ab5e-b568aab78d5c', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('95c8b9a4-5a8e-4723-9d5e-480ddbc2f4a7', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '46c52db6-2cd0-404d-a2bf-23d390c741ad', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2025-12-20 12:00:00' - interval '26 hours' - interval '29 mins', timestamp '2025-12-20 12:00:00' - interval '26 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d1de4726-1836-47cc-93af-f1bd2c006c1d', '95c8b9a4-5a8e-4723-9d5e-480ddbc2f4a7', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('892e6f39-7155-406d-a50f-0a97a67de186', '95c8b9a4-5a8e-4723-9d5e-480ddbc2f4a7', '8cebf54b-97b4-493c-a837-4707d4828eae', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('78a2e936-c220-4d89-b197-7a51ba3f8b29', '95c8b9a4-5a8e-4723-9d5e-480ddbc2f4a7', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2ec42c1a-0f61-48d9-bcd2-b7d0dcd984e9', '95c8b9a4-5a8e-4723-9d5e-480ddbc2f4a7', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('bba14262-c034-4e7d-85f4-103802ea3e98', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '12cbf2c4-0a16-4574-abb5-b601beec8176', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2025-12-20 12:00:00' - interval '21 hours' - interval '27 mins', timestamp '2025-12-20 12:00:00' - interval '21 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('10eb0ac5-9ae4-4075-b524-8d403fb4e6dd', 'bba14262-c034-4e7d-85f4-103802ea3e98', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('aafa7927-61b3-4186-b49d-f3c1e79a33c6', 'bba14262-c034-4e7d-85f4-103802ea3e98', '8cebf54b-97b4-493c-a837-4707d4828eae', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5386c470-7a43-44de-9e22-b83c8a58cf07', 'bba14262-c034-4e7d-85f4-103802ea3e98', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('36244c2a-3235-4fda-bc1c-67f02d9946a7', 'bba14262-c034-4e7d-85f4-103802ea3e98', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7c91e88f-014e-4609-b023-71f9cd0e4cf9', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '0af988df-e6d9-4ac1-a6ec-56343146a552', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2025-12-20 12:00:00' - interval '11 hours' - interval '26 mins', timestamp '2025-12-20 12:00:00' - interval '11 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c0def94b-9f44-4bd9-be54-aace37c63d13', '7c91e88f-014e-4609-b023-71f9cd0e4cf9', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('09662c5c-114f-439a-901b-9c71b4098b8b', '7c91e88f-014e-4609-b023-71f9cd0e4cf9', '8cebf54b-97b4-493c-a837-4707d4828eae', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('97c181cc-6db0-4397-98e6-b04b7b86a508', '7c91e88f-014e-4609-b023-71f9cd0e4cf9', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7e847fd6-6857-4b75-8042-938305087c7e', '7c91e88f-014e-4609-b023-71f9cd0e4cf9', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('0071243f-1ca1-4f4f-903d-696cf26fc9fd', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '9dbf8fbe-1580-489c-a551-1eda5fb69025', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2025-12-20 12:00:00' - interval '25 hours' - interval '37 mins', timestamp '2025-12-20 12:00:00' - interval '25 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9ba73413-d4de-428f-81ea-bdc6b72a1a2b', '0071243f-1ca1-4f4f-903d-696cf26fc9fd', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('91e6c093-023e-4660-b40f-80d2ce662f48', '0071243f-1ca1-4f4f-903d-696cf26fc9fd', '8cebf54b-97b4-493c-a837-4707d4828eae', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e198089b-ff49-43f0-8beb-2a5cda77c95c', '0071243f-1ca1-4f4f-903d-696cf26fc9fd', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4e9f594b-a6a8-4e9c-9c58-c0fdd5b5b41d', '0071243f-1ca1-4f4f-903d-696cf26fc9fd', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('69f37b50-42a5-4f6f-bd3b-5eb6e3356b29', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '00f25636-269c-4d25-abd5-3cdbc12a31f8', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2025-12-20 12:00:00' - interval '11 hours' - interval '29 mins', timestamp '2025-12-20 12:00:00' - interval '11 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('00935162-b596-41f9-b926-8ed095bdf367', '69f37b50-42a5-4f6f-bd3b-5eb6e3356b29', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a6b62ef6-f958-435c-83ef-4f8e9eeeaaa8', '69f37b50-42a5-4f6f-bd3b-5eb6e3356b29', '8cebf54b-97b4-493c-a837-4707d4828eae', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d0fca57a-fdf9-495a-a6e1-a4f05b320fc7', '69f37b50-42a5-4f6f-bd3b-5eb6e3356b29', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e01c8a40-fa2a-4b10-93ea-5991af21144f', '69f37b50-42a5-4f6f-bd3b-5eb6e3356b29', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('0a6f32b1-d396-462b-9897-a4eae64fc428', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '46c52db6-2cd0-404d-a2bf-23d390c741ad', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2025-12-20 12:00:00' - interval '43 hours' - interval '34 mins', timestamp '2025-12-20 12:00:00' - interval '43 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('aff9f48e-a804-46e7-bc0a-dab9c4e2d047', '0a6f32b1-d396-462b-9897-a4eae64fc428', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('44ad0356-1e95-4dd7-a0c9-8b7b5a09cd7d', '0a6f32b1-d396-462b-9897-a4eae64fc428', '8cebf54b-97b4-493c-a837-4707d4828eae', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('08d8b69e-232a-4f7b-a78a-9672d3b89850', '0a6f32b1-d396-462b-9897-a4eae64fc428', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b3654fc9-a62a-4f70-8842-2eefe6a0a5d7', '0a6f32b1-d396-462b-9897-a4eae64fc428', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7aaa18f2-9626-4174-95c1-aee390be8dc0', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '12cbf2c4-0a16-4574-abb5-b601beec8176', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2025-12-20 12:00:00' - interval '52 hours' - interval '30 mins', timestamp '2025-12-20 12:00:00' - interval '52 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7fd73f02-947b-440b-8dea-26ecf94f8f3e', '7aaa18f2-9626-4174-95c1-aee390be8dc0', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6afe953b-0e4a-443d-ad52-66d2edb834fb', '7aaa18f2-9626-4174-95c1-aee390be8dc0', '8cebf54b-97b4-493c-a837-4707d4828eae', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a0158f9e-953c-47ca-b14d-dc9c0a67cc98', '7aaa18f2-9626-4174-95c1-aee390be8dc0', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e11e5642-fa9a-4b83-845b-0f649001d225', '7aaa18f2-9626-4174-95c1-aee390be8dc0', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('dc1e999e-0252-4762-bb24-19b3e851d086', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '0af988df-e6d9-4ac1-a6ec-56343146a552', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2025-12-20 12:00:00' - interval '56 hours' - interval '31 mins', timestamp '2025-12-20 12:00:00' - interval '56 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('38bb9013-898d-48b3-a0d0-40226b9619f0', 'dc1e999e-0252-4762-bb24-19b3e851d086', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('816f4920-2e80-4e0c-bc42-46b3db27446f', 'dc1e999e-0252-4762-bb24-19b3e851d086', '8cebf54b-97b4-493c-a837-4707d4828eae', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('99cab7e1-f910-4a86-8cef-788f2e94a897', 'dc1e999e-0252-4762-bb24-19b3e851d086', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('05f511af-1e1c-4236-90d7-b4a8e6fa6ee3', 'dc1e999e-0252-4762-bb24-19b3e851d086', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d2654344-33fe-4882-9297-9daa4f15c46c', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '9dbf8fbe-1580-489c-a551-1eda5fb69025', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2025-12-20 12:00:00' - interval '66 hours' - interval '24 mins', timestamp '2025-12-20 12:00:00' - interval '66 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c724e9c9-d031-4824-bfc4-1bce9ebfa2eb', 'd2654344-33fe-4882-9297-9daa4f15c46c', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('afe9ccef-e209-4879-ae9b-bf9ef722e494', 'd2654344-33fe-4882-9297-9daa4f15c46c', '8cebf54b-97b4-493c-a837-4707d4828eae', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e6d7d349-fef6-4a37-87d5-ff5ba73eecdb', 'd2654344-33fe-4882-9297-9daa4f15c46c', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7659a5f7-9c52-4289-9a92-36331cefeea5', 'd2654344-33fe-4882-9297-9daa4f15c46c', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7071bc34-5163-427f-8eaf-873ffc2e8171', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '00f25636-269c-4d25-abd5-3cdbc12a31f8', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2025-12-20 12:00:00' - interval '17 hours' - interval '36 mins', timestamp '2025-12-20 12:00:00' - interval '17 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8900409b-bd57-4f35-9fb1-e00a6d06a164', '7071bc34-5163-427f-8eaf-873ffc2e8171', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5c62368b-9092-4b97-bf98-ac20a185f333', '7071bc34-5163-427f-8eaf-873ffc2e8171', '8cebf54b-97b4-493c-a837-4707d4828eae', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e7451d2a-6977-445c-b757-ec3970a0ff9e', '7071bc34-5163-427f-8eaf-873ffc2e8171', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fd95bfe7-5193-4fb9-9d4a-f1aecd99759b', '7071bc34-5163-427f-8eaf-873ffc2e8171', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('398652c4-0e38-4a78-a98e-66c7f698a4b5', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '46c52db6-2cd0-404d-a2bf-23d390c741ad', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2025-12-20 12:00:00' - interval '41 hours' - interval '33 mins', timestamp '2025-12-20 12:00:00' - interval '41 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('856271fe-0c75-47e8-a8f5-3c5caf35c4fc', '398652c4-0e38-4a78-a98e-66c7f698a4b5', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c541abb5-c782-4b9b-b846-9518b0570560', '398652c4-0e38-4a78-a98e-66c7f698a4b5', '8cebf54b-97b4-493c-a837-4707d4828eae', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7b705424-470c-4528-8783-da6181ea7d5f', '398652c4-0e38-4a78-a98e-66c7f698a4b5', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('098bb355-00f7-4098-a269-1de85c526ff7', '398652c4-0e38-4a78-a98e-66c7f698a4b5', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('74782033-685a-4f7c-a9d0-14cfe29c653a', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '12cbf2c4-0a16-4574-abb5-b601beec8176', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2025-12-20 12:00:00' - interval '52 hours' - interval '28 mins', timestamp '2025-12-20 12:00:00' - interval '52 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('225aaed1-ed71-430c-b4b3-f5a4e5b4acb7', '74782033-685a-4f7c-a9d0-14cfe29c653a', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0477e168-81d5-4dba-8379-d3939785d47d', '74782033-685a-4f7c-a9d0-14cfe29c653a', '8cebf54b-97b4-493c-a837-4707d4828eae', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('227d98e1-ccef-41fc-a789-5c3ef78b04c4', '74782033-685a-4f7c-a9d0-14cfe29c653a', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('275475a6-8362-49c4-a7c0-1dfd5590275d', '74782033-685a-4f7c-a9d0-14cfe29c653a', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e5e64d01-0f99-4b4a-95c9-62dee38d3020', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '0af988df-e6d9-4ac1-a6ec-56343146a552', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2025-12-20 12:00:00' - interval '13 hours' - interval '42 mins', timestamp '2025-12-20 12:00:00' - interval '13 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ccf2e3be-e63e-428a-8a8f-1138d72bb93c', 'e5e64d01-0f99-4b4a-95c9-62dee38d3020', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9246f1a4-c449-4010-9159-276c546c2064', 'e5e64d01-0f99-4b4a-95c9-62dee38d3020', '8cebf54b-97b4-493c-a837-4707d4828eae', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2d5aa1af-d3f6-4620-94cc-1e3add1fac6a', 'e5e64d01-0f99-4b4a-95c9-62dee38d3020', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('57938926-1233-4b68-bb5b-75aaf9ddfafc', 'e5e64d01-0f99-4b4a-95c9-62dee38d3020', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('f581e425-2702-4fd0-9f6a-8e5cc45f8acb', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '9dbf8fbe-1580-489c-a551-1eda5fb69025', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2025-12-20 12:00:00' - interval '37 hours' - interval '21 mins', timestamp '2025-12-20 12:00:00' - interval '37 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('977ffffd-43aa-438f-b5cc-acfa35f5e057', 'f581e425-2702-4fd0-9f6a-8e5cc45f8acb', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4e9eedd8-3061-492b-abcd-f83d7b845bd7', 'f581e425-2702-4fd0-9f6a-8e5cc45f8acb', '8cebf54b-97b4-493c-a837-4707d4828eae', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ccff1938-aa31-4cb7-ac73-36baf2c5b08e', 'f581e425-2702-4fd0-9f6a-8e5cc45f8acb', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('18ef0252-5134-4d8e-acd9-add687bf3bfe', 'f581e425-2702-4fd0-9f6a-8e5cc45f8acb', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('8b9b0277-1a45-471a-9a28-d6a5e672389b', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '00f25636-269c-4d25-abd5-3cdbc12a31f8', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', timestamp '2025-12-20 12:00:00' - interval '8 hours' - interval '26 mins', timestamp '2025-12-20 12:00:00' - interval '8 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('436ef79d-c7ca-49b8-8d98-40fe2c658cae', '8b9b0277-1a45-471a-9a28-d6a5e672389b', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('307c361a-3238-4754-b789-24df322055e2', '8b9b0277-1a45-471a-9a28-d6a5e672389b', '8cebf54b-97b4-493c-a837-4707d4828eae', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5c890a7e-e60b-4bff-b1cc-dbb04a7cbd36', '8b9b0277-1a45-471a-9a28-d6a5e672389b', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d260e379-3640-48d1-ba6a-20cfa6f6247a', '8b9b0277-1a45-471a-9a28-d6a5e672389b', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d5e8d842-4b66-40ec-8844-7f8a35a83e55', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '46c52db6-2cd0-404d-a2bf-23d390c741ad', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', timestamp '2025-12-20 12:00:00' - interval '3 hours' - interval '45 mins', timestamp '2025-12-20 12:00:00' - interval '3 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('df893d51-e48d-421a-b068-a0e5175cbddd', 'd5e8d842-4b66-40ec-8844-7f8a35a83e55', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('22bfb9df-66b3-4248-9aa0-05a3ffe0a5b0', 'd5e8d842-4b66-40ec-8844-7f8a35a83e55', '8cebf54b-97b4-493c-a837-4707d4828eae', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ce51ef9b-58e3-4af5-9921-30c059f30268', 'd5e8d842-4b66-40ec-8844-7f8a35a83e55', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('940581ee-38f9-4574-ada5-f06a13e128d3', 'd5e8d842-4b66-40ec-8844-7f8a35a83e55', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('c3b3260f-fb2c-4796-a5ff-73468fe437fa', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '12cbf2c4-0a16-4574-abb5-b601beec8176', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', timestamp '2025-12-20 12:00:00' - interval '45 hours' - interval '37 mins', timestamp '2025-12-20 12:00:00' - interval '45 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4f5c5379-72ec-419b-8e6b-f8166bfb9c76', 'c3b3260f-fb2c-4796-a5ff-73468fe437fa', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3d19a620-48bf-4090-80c4-e248239f6d93', 'c3b3260f-fb2c-4796-a5ff-73468fe437fa', '8cebf54b-97b4-493c-a837-4707d4828eae', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b2ddfbaf-c69e-4f4e-86d7-40e1d0d3db17', 'c3b3260f-fb2c-4796-a5ff-73468fe437fa', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e210049a-6643-4647-9568-7834d6c8c428', 'c3b3260f-fb2c-4796-a5ff-73468fe437fa', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a744ca53-ca22-42bf-8a2a-093a72f60a63', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '0af988df-e6d9-4ac1-a6ec-56343146a552', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', timestamp '2025-12-20 12:00:00' - interval '7 hours' - interval '41 mins', timestamp '2025-12-20 12:00:00' - interval '7 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c116d1af-24cb-4b38-acbc-8484834933bd', 'a744ca53-ca22-42bf-8a2a-093a72f60a63', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0303b6df-29ab-4184-bd9a-57baef520fc9', 'a744ca53-ca22-42bf-8a2a-093a72f60a63', '8cebf54b-97b4-493c-a837-4707d4828eae', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bcbaf00d-e576-4a7c-9de1-754fc5b8fe77', 'a744ca53-ca22-42bf-8a2a-093a72f60a63', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('79894c95-10ea-4be7-aced-c323dad64fa0', 'a744ca53-ca22-42bf-8a2a-093a72f60a63', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('160da8c2-6713-46a4-9c54-457035a9bfa1', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '9dbf8fbe-1580-489c-a551-1eda5fb69025', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', timestamp '2025-12-20 12:00:00' - interval '29 hours' - interval '35 mins', timestamp '2025-12-20 12:00:00' - interval '29 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('04a01451-d6f2-457b-b64b-34f833eac791', '160da8c2-6713-46a4-9c54-457035a9bfa1', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e03e00db-2b44-4820-b0f4-db0299df3a2b', '160da8c2-6713-46a4-9c54-457035a9bfa1', '8cebf54b-97b4-493c-a837-4707d4828eae', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('77c116c5-c5a0-4d09-a9a1-cd465c4f1508', '160da8c2-6713-46a4-9c54-457035a9bfa1', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('09216a39-b290-4aff-8f96-29f2ee83215a', '160da8c2-6713-46a4-9c54-457035a9bfa1', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('f164d866-3542-419b-ae25-ec02afb869f8', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '00f25636-269c-4d25-abd5-3cdbc12a31f8', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2025-12-20 12:00:00' - interval '40 hours' - interval '24 mins', timestamp '2025-12-20 12:00:00' - interval '40 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('523e1f52-36d0-4041-8fda-15f5bf355c98', 'f164d866-3542-419b-ae25-ec02afb869f8', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3c3b7cc2-dcd3-45e3-b896-b9340bb2e964', 'f164d866-3542-419b-ae25-ec02afb869f8', '8cebf54b-97b4-493c-a837-4707d4828eae', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6eec6c21-b1cb-4c5b-99cb-643a12be9aaf', 'f164d866-3542-419b-ae25-ec02afb869f8', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8ff35b20-de89-4465-999a-d882321dc02c', 'f164d866-3542-419b-ae25-ec02afb869f8', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('0524cf84-9f94-441b-9c90-0aa5f098ce53', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '46c52db6-2cd0-404d-a2bf-23d390c741ad', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2025-12-20 12:00:00' - interval '23 hours' - interval '22 mins', timestamp '2025-12-20 12:00:00' - interval '23 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('67d13d90-9478-431a-baf8-64178872d9a2', '0524cf84-9f94-441b-9c90-0aa5f098ce53', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dd443f96-0676-43c6-b213-ce2c8984c421', '0524cf84-9f94-441b-9c90-0aa5f098ce53', '8cebf54b-97b4-493c-a837-4707d4828eae', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5f5ee91b-2c1c-433c-90eb-43f787d23718', '0524cf84-9f94-441b-9c90-0aa5f098ce53', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c06a1ac9-d0f2-472a-b9b5-4e1b7dd384b6', '0524cf84-9f94-441b-9c90-0aa5f098ce53', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('2017a0aa-925e-4d0a-abf6-746c1ee635b2', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '12cbf2c4-0a16-4574-abb5-b601beec8176', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2025-12-20 12:00:00' - interval '69 hours' - interval '22 mins', timestamp '2025-12-20 12:00:00' - interval '69 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4d5c2bfb-b794-47db-96c1-f3e8ee14e02b', '2017a0aa-925e-4d0a-abf6-746c1ee635b2', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6b4bdd80-fb3f-40ee-b59b-cce933c4e0d3', '2017a0aa-925e-4d0a-abf6-746c1ee635b2', '8cebf54b-97b4-493c-a837-4707d4828eae', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a676236b-6b82-426e-af58-ab763309d340', '2017a0aa-925e-4d0a-abf6-746c1ee635b2', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('12dc1e37-9e05-49bb-89e7-115b2c51bab8', '2017a0aa-925e-4d0a-abf6-746c1ee635b2', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('63e0fb62-2d64-42d5-b2d5-48695f86f4eb', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '0af988df-e6d9-4ac1-a6ec-56343146a552', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2025-12-20 12:00:00' - interval '19 hours' - interval '35 mins', timestamp '2025-12-20 12:00:00' - interval '19 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6fe2535d-d785-4a79-af52-1fff7b3d2f2c', '63e0fb62-2d64-42d5-b2d5-48695f86f4eb', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1f57fbc6-19b7-4d20-a8fb-4233ed6d101c', '63e0fb62-2d64-42d5-b2d5-48695f86f4eb', '8cebf54b-97b4-493c-a837-4707d4828eae', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a9d56113-fb97-4987-9f44-ce5404d7a757', '63e0fb62-2d64-42d5-b2d5-48695f86f4eb', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('33c3e819-b7d9-4843-8875-d326a7a34c75', '63e0fb62-2d64-42d5-b2d5-48695f86f4eb', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a83b4b2c-3d71-4e71-8510-d85776d6e1bc', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '9dbf8fbe-1580-489c-a551-1eda5fb69025', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2025-12-20 12:00:00' - interval '2 hours' - interval '25 mins', timestamp '2025-12-20 12:00:00' - interval '2 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e0a430a6-d9fc-4ae6-8621-bc307de4459e', 'a83b4b2c-3d71-4e71-8510-d85776d6e1bc', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('af19b99b-93c0-4a42-bf52-492c50403e88', 'a83b4b2c-3d71-4e71-8510-d85776d6e1bc', '8cebf54b-97b4-493c-a837-4707d4828eae', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3c725829-d339-4fc7-b460-0f076f7edd5e', 'a83b4b2c-3d71-4e71-8510-d85776d6e1bc', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('74419bd9-16b9-48d1-aa69-523ccca7936c', 'a83b4b2c-3d71-4e71-8510-d85776d6e1bc', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('de21b334-abee-487d-a02d-8dde04be04fc', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '00f25636-269c-4d25-abd5-3cdbc12a31f8', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', timestamp '2025-12-20 12:00:00' - interval '54 hours' - interval '38 mins', timestamp '2025-12-20 12:00:00' - interval '54 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('58416eca-3b64-432a-b4a4-3257d74a4dab', 'de21b334-abee-487d-a02d-8dde04be04fc', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fcd59451-50a9-4cdf-bb57-5a91d9ad5701', 'de21b334-abee-487d-a02d-8dde04be04fc', '8cebf54b-97b4-493c-a837-4707d4828eae', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6b1fc99d-7f80-4805-83a2-1bad78afdb2d', 'de21b334-abee-487d-a02d-8dde04be04fc', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6aa4f63a-b4be-42f9-b9e6-16f15602010b', 'de21b334-abee-487d-a02d-8dde04be04fc', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('3622f7f7-5924-428f-87b7-eec252abbed8', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '46c52db6-2cd0-404d-a2bf-23d390c741ad', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', timestamp '2025-12-20 12:00:00' - interval '6 hours' - interval '33 mins', timestamp '2025-12-20 12:00:00' - interval '6 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('745c85c4-d359-4d42-adf5-9673f969819b', '3622f7f7-5924-428f-87b7-eec252abbed8', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('63b2947d-f426-4bbd-bbb1-1444f8cbcd74', '3622f7f7-5924-428f-87b7-eec252abbed8', '8cebf54b-97b4-493c-a837-4707d4828eae', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2644c393-b67c-4373-ad1e-f5ef539f39f9', '3622f7f7-5924-428f-87b7-eec252abbed8', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d797a963-8ace-4f95-98ef-ca30bd1296b7', '3622f7f7-5924-428f-87b7-eec252abbed8', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('969c16b4-dfae-4b76-a590-aa2c787cab29', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '12cbf2c4-0a16-4574-abb5-b601beec8176', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', timestamp '2025-12-20 12:00:00' - interval '44 hours' - interval '29 mins', timestamp '2025-12-20 12:00:00' - interval '44 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('730a7381-d42b-4d01-aad9-364573894b38', '969c16b4-dfae-4b76-a590-aa2c787cab29', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1a15eb7c-8647-4932-999c-87cc0e02b825', '969c16b4-dfae-4b76-a590-aa2c787cab29', '8cebf54b-97b4-493c-a837-4707d4828eae', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c0f27462-6c69-454a-9934-594073ec4b90', '969c16b4-dfae-4b76-a590-aa2c787cab29', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('38c6bf26-8ec8-4a4f-b71a-95a0a7011822', '969c16b4-dfae-4b76-a590-aa2c787cab29', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('9ded6158-2629-4517-bbd1-3b569f34b6e8', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '0af988df-e6d9-4ac1-a6ec-56343146a552', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', timestamp '2025-12-20 12:00:00' - interval '47 hours' - interval '22 mins', timestamp '2025-12-20 12:00:00' - interval '47 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('16218d6a-141c-45d6-a187-ea0daa3a1a65', '9ded6158-2629-4517-bbd1-3b569f34b6e8', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('36b8c879-8cf0-4f56-92e8-517b5105afc8', '9ded6158-2629-4517-bbd1-3b569f34b6e8', '8cebf54b-97b4-493c-a837-4707d4828eae', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('35ad66ef-be2a-4f3d-9e00-adcfb1185545', '9ded6158-2629-4517-bbd1-3b569f34b6e8', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1bf0664f-213d-4ebe-a263-b08ce6fae558', '9ded6158-2629-4517-bbd1-3b569f34b6e8', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('f38e6980-ba12-4a3b-a4af-9d20aa7c9d89', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '9dbf8fbe-1580-489c-a551-1eda5fb69025', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', timestamp '2025-12-20 12:00:00' - interval '19 hours' - interval '29 mins', timestamp '2025-12-20 12:00:00' - interval '19 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('59aad5a1-e404-4810-95c8-92d71c08d68b', 'f38e6980-ba12-4a3b-a4af-9d20aa7c9d89', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('650c3b60-de87-488e-89d9-68a693457381', 'f38e6980-ba12-4a3b-a4af-9d20aa7c9d89', '8cebf54b-97b4-493c-a837-4707d4828eae', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5856f82f-0633-4433-8666-5a17ee8f8b32', 'f38e6980-ba12-4a3b-a4af-9d20aa7c9d89', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('136c8cd9-7a50-47fa-8939-4515aaeba51a', 'f38e6980-ba12-4a3b-a4af-9d20aa7c9d89', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d6061042-4cba-4f48-9f75-0c1e9971c0fb', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '00f25636-269c-4d25-abd5-3cdbc12a31f8', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2025-12-20 12:00:00' - interval '29 hours' - interval '39 mins', timestamp '2025-12-20 12:00:00' - interval '29 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d2f19800-e6b9-4a80-bd0e-c778e30ec47d', 'd6061042-4cba-4f48-9f75-0c1e9971c0fb', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0da08390-4bb4-43e9-b8c7-74eedd380fda', 'd6061042-4cba-4f48-9f75-0c1e9971c0fb', '8cebf54b-97b4-493c-a837-4707d4828eae', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('88231efb-89f9-4006-be51-e250723928ea', 'd6061042-4cba-4f48-9f75-0c1e9971c0fb', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a5389091-d754-488e-a76a-dc26704c40ca', 'd6061042-4cba-4f48-9f75-0c1e9971c0fb', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('431ad42a-d7de-484e-9844-0d97764eb44c', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '46c52db6-2cd0-404d-a2bf-23d390c741ad', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2025-12-20 12:00:00' - interval '38 hours' - interval '20 mins', timestamp '2025-12-20 12:00:00' - interval '38 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f5f90711-52f3-4da5-98bc-a558ef1b50bd', '431ad42a-d7de-484e-9844-0d97764eb44c', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e60ff86e-ec42-4119-be7d-cb780f329f77', '431ad42a-d7de-484e-9844-0d97764eb44c', '8cebf54b-97b4-493c-a837-4707d4828eae', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6906c4a0-bc96-4118-b272-d35618d3213f', '431ad42a-d7de-484e-9844-0d97764eb44c', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1f7dac04-202c-4679-a9e3-bc6191a499e9', '431ad42a-d7de-484e-9844-0d97764eb44c', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('ab34ff91-f7ec-485a-b71b-c807c9d51d57', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '12cbf2c4-0a16-4574-abb5-b601beec8176', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2025-12-20 12:00:00' - interval '51 hours' - interval '38 mins', timestamp '2025-12-20 12:00:00' - interval '51 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b7f11790-05d7-44de-8763-d3992ababfe6', 'ab34ff91-f7ec-485a-b71b-c807c9d51d57', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('33f9d9e5-d4ea-4c6d-a681-bf5b1df43601', 'ab34ff91-f7ec-485a-b71b-c807c9d51d57', '8cebf54b-97b4-493c-a837-4707d4828eae', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('417e6119-63ec-44be-8235-230fa6595256', 'ab34ff91-f7ec-485a-b71b-c807c9d51d57', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('77eb88fc-669d-4a2a-bbfe-e8a74c576b4a', 'ab34ff91-f7ec-485a-b71b-c807c9d51d57', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('53c0fab5-9ff2-495b-bb4d-4ea644dc8a1a', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '0af988df-e6d9-4ac1-a6ec-56343146a552', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2025-12-20 12:00:00' - interval '61 hours' - interval '27 mins', timestamp '2025-12-20 12:00:00' - interval '61 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5515f383-8a0e-4233-a1d5-7a0d50189421', '53c0fab5-9ff2-495b-bb4d-4ea644dc8a1a', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ad01948f-993a-4ca8-8e0b-2b38dc9e1ea2', '53c0fab5-9ff2-495b-bb4d-4ea644dc8a1a', '8cebf54b-97b4-493c-a837-4707d4828eae', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5d2bad66-27d0-412f-bc92-af778bd4b2b0', '53c0fab5-9ff2-495b-bb4d-4ea644dc8a1a', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b506c2cc-3158-4fcd-aec8-276a8285f20c', '53c0fab5-9ff2-495b-bb4d-4ea644dc8a1a', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e1732e7a-843d-4dba-b774-d433c3ed28c5', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '9dbf8fbe-1580-489c-a551-1eda5fb69025', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2025-12-20 12:00:00' - interval '63 hours' - interval '31 mins', timestamp '2025-12-20 12:00:00' - interval '63 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3df69692-0eed-4b22-8957-11a90f6adbe0', 'e1732e7a-843d-4dba-b774-d433c3ed28c5', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('74d503c4-372c-425b-9d4c-6f98a4840a30', 'e1732e7a-843d-4dba-b774-d433c3ed28c5', '8cebf54b-97b4-493c-a837-4707d4828eae', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cade8365-e207-48e6-a2a7-c69fd26d39f9', 'e1732e7a-843d-4dba-b774-d433c3ed28c5', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4801b473-42ae-4803-b0c7-eceec50d04cf', 'e1732e7a-843d-4dba-b774-d433c3ed28c5', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('cffe7a67-6219-403b-8de0-7dcce5c64ac6', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '00f25636-269c-4d25-abd5-3cdbc12a31f8', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2025-12-20 12:00:00' - interval '37 hours' - interval '43 mins', timestamp '2025-12-20 12:00:00' - interval '37 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6dc8d9b9-a458-4365-b7e3-dbe5d0f08c88', 'cffe7a67-6219-403b-8de0-7dcce5c64ac6', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ace7cc55-6be9-4931-861d-f8549944e5a3', 'cffe7a67-6219-403b-8de0-7dcce5c64ac6', '8cebf54b-97b4-493c-a837-4707d4828eae', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('34c2d736-2319-4c37-861e-45dd03578cf2', 'cffe7a67-6219-403b-8de0-7dcce5c64ac6', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0fc8cc5f-9160-4f97-b149-94cfdae671c7', 'cffe7a67-6219-403b-8de0-7dcce5c64ac6', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('83947a5f-e161-457e-9212-ad4ad6cb9e98', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '46c52db6-2cd0-404d-a2bf-23d390c741ad', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2025-12-20 12:00:00' - interval '32 hours' - interval '40 mins', timestamp '2025-12-20 12:00:00' - interval '32 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bb047a42-d103-417a-9e1a-0174446fae3b', '83947a5f-e161-457e-9212-ad4ad6cb9e98', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e0479ba9-9e71-4987-9848-88f4e6884bb4', '83947a5f-e161-457e-9212-ad4ad6cb9e98', '8cebf54b-97b4-493c-a837-4707d4828eae', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c621aa25-1f02-4f4a-8c8f-ded6e41ae8a9', '83947a5f-e161-457e-9212-ad4ad6cb9e98', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('370050ac-f83c-4069-bd47-b5a4beb70793', '83947a5f-e161-457e-9212-ad4ad6cb9e98', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e628c99d-3eec-4119-ad7e-922a0dd43429', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '12cbf2c4-0a16-4574-abb5-b601beec8176', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2025-12-20 12:00:00' - interval '33 hours' - interval '22 mins', timestamp '2025-12-20 12:00:00' - interval '33 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5d103c40-ad40-488c-9662-efeed2fa06ca', 'e628c99d-3eec-4119-ad7e-922a0dd43429', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('456b32e9-dc91-409a-81dc-7ffcc9654158', 'e628c99d-3eec-4119-ad7e-922a0dd43429', '8cebf54b-97b4-493c-a837-4707d4828eae', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c8c4a323-561e-43a6-bf30-6275d70d5068', 'e628c99d-3eec-4119-ad7e-922a0dd43429', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3d0d3813-0a6c-474a-8a16-387abc5697bd', 'e628c99d-3eec-4119-ad7e-922a0dd43429', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('ef1c102d-7163-4cd3-90fd-56092fb77617', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '0af988df-e6d9-4ac1-a6ec-56343146a552', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2025-12-20 12:00:00' - interval '9 hours' - interval '42 mins', timestamp '2025-12-20 12:00:00' - interval '9 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('47f35bf3-48b6-436b-91b5-84a1c3558c61', 'ef1c102d-7163-4cd3-90fd-56092fb77617', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('58609a67-4f2a-45b1-8ed4-45f2f877b3a9', 'ef1c102d-7163-4cd3-90fd-56092fb77617', '8cebf54b-97b4-493c-a837-4707d4828eae', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('590904a7-0031-42ae-a8bf-d89596923a24', 'ef1c102d-7163-4cd3-90fd-56092fb77617', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('12da13ff-2f50-48eb-815d-dcd357317acd', 'ef1c102d-7163-4cd3-90fd-56092fb77617', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('5dbb92c8-5649-4319-b063-552ab86098a2', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '9dbf8fbe-1580-489c-a551-1eda5fb69025', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2025-12-20 12:00:00' - interval '18 hours' - interval '36 mins', timestamp '2025-12-20 12:00:00' - interval '18 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5986abf3-9086-4ee6-b5ef-935c126f375b', '5dbb92c8-5649-4319-b063-552ab86098a2', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6cdc8790-b1ab-461d-bc6a-313863b33797', '5dbb92c8-5649-4319-b063-552ab86098a2', '8cebf54b-97b4-493c-a837-4707d4828eae', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('86086a56-f312-4a11-957f-d67a8cb84185', '5dbb92c8-5649-4319-b063-552ab86098a2', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3f0c3f33-1e47-4619-83d2-8b4f8a8a4001', '5dbb92c8-5649-4319-b063-552ab86098a2', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7ef71978-27ad-40a8-9644-e848ae58ad57', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '00f25636-269c-4d25-abd5-3cdbc12a31f8', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2025-12-20 12:00:00' - interval '1 hours' - interval '31 mins', timestamp '2025-12-20 12:00:00' - interval '1 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('28297f11-02d9-4322-bafb-cf309fcda403', '7ef71978-27ad-40a8-9644-e848ae58ad57', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5af416f8-6b49-4463-9905-54574fe263cd', '7ef71978-27ad-40a8-9644-e848ae58ad57', '8cebf54b-97b4-493c-a837-4707d4828eae', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1981274e-470f-4118-9828-0d964962455e', '7ef71978-27ad-40a8-9644-e848ae58ad57', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dd84b872-fe91-4c8c-9470-6463736537b9', '7ef71978-27ad-40a8-9644-e848ae58ad57', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('546f7548-e453-4a15-a1e0-adeae53fc67a', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '46c52db6-2cd0-404d-a2bf-23d390c741ad', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2025-12-20 12:00:00' - interval '37 hours' - interval '21 mins', timestamp '2025-12-20 12:00:00' - interval '37 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0a99bebb-0a9d-40ad-b752-5f05c4582f38', '546f7548-e453-4a15-a1e0-adeae53fc67a', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('eab32a0d-491a-4b6f-bbc0-81c35850b8c0', '546f7548-e453-4a15-a1e0-adeae53fc67a', '8cebf54b-97b4-493c-a837-4707d4828eae', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fec94214-86f6-44f6-89b5-ea91fcdb6f69', '546f7548-e453-4a15-a1e0-adeae53fc67a', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('22325033-ce15-4552-a9bd-73f9b7e9f973', '546f7548-e453-4a15-a1e0-adeae53fc67a', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('8e4af635-4442-40cf-965e-01ebcdebd2d8', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '12cbf2c4-0a16-4574-abb5-b601beec8176', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2025-12-20 12:00:00' - interval '12 hours' - interval '43 mins', timestamp '2025-12-20 12:00:00' - interval '12 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('85c8bb88-0250-446f-9cc7-456820f844cc', '8e4af635-4442-40cf-965e-01ebcdebd2d8', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5abe808d-1c7e-41ef-8e3f-69d4cfc97f36', '8e4af635-4442-40cf-965e-01ebcdebd2d8', '8cebf54b-97b4-493c-a837-4707d4828eae', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2144983a-97a7-4b77-a698-817cc447f0c4', '8e4af635-4442-40cf-965e-01ebcdebd2d8', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('471185f3-0032-459a-bf3f-94b001fd935e', '8e4af635-4442-40cf-965e-01ebcdebd2d8', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('1c01ac46-fb98-4312-b31f-4f1731e4449b', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '0af988df-e6d9-4ac1-a6ec-56343146a552', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2025-12-20 12:00:00' - interval '35 hours' - interval '45 mins', timestamp '2025-12-20 12:00:00' - interval '35 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('351d2cf4-b795-494f-9a98-eeb34bc904b5', '1c01ac46-fb98-4312-b31f-4f1731e4449b', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('eab4e48e-44ea-43da-86bb-01d269d4dc5a', '1c01ac46-fb98-4312-b31f-4f1731e4449b', '8cebf54b-97b4-493c-a837-4707d4828eae', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4140c41c-19d8-4d7a-80f9-142451815b9a', '1c01ac46-fb98-4312-b31f-4f1731e4449b', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('84b36abb-9c89-495d-8d7c-2ab9d9098a5e', '1c01ac46-fb98-4312-b31f-4f1731e4449b', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('1965c000-5260-486b-80d9-4d6686c904a4', '952dd05e-8ff2-44a7-a13b-9a22958f57fb', '9dbf8fbe-1580-489c-a551-1eda5fb69025', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2025-12-20 12:00:00' - interval '24 hours' - interval '20 mins', timestamp '2025-12-20 12:00:00' - interval '24 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('167f8384-3694-449f-99fb-02a69b234762', '1965c000-5260-486b-80d9-4d6686c904a4', 'a436fb51-aa71-4afc-a9bf-2232d151fbaa', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d129dc63-e01b-4d12-9a6b-360d50afeff6', '1965c000-5260-486b-80d9-4d6686c904a4', '8cebf54b-97b4-493c-a837-4707d4828eae', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('63e61353-9494-4aa0-a3c0-8d1797ca46f7', '1965c000-5260-486b-80d9-4d6686c904a4', 'bb41dca1-a7d3-4fa8-a819-cd1d0c92bdf2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ba564245-9f51-4eef-bcdd-6d12c9931e45', '1965c000-5260-486b-80d9-4d6686c904a4', 'ae079c87-3d0a-4aa9-ae5b-8966b4f38a57', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('78a8af66-5ada-415a-b8f6-390b205a5ec9', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'be3a4e6f-a69b-418a-a333-215fbfdf5261', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2025-06-15 12:00:00' - interval '6 hours' - interval '28 mins', timestamp '2025-06-15 12:00:00' - interval '6 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('edbbea61-675d-4c99-a356-e3c1b2c8f1c6', '78a8af66-5ada-415a-b8f6-390b205a5ec9', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('681e9d73-1b69-4834-8976-31c443c1140d', '78a8af66-5ada-415a-b8f6-390b205a5ec9', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5ea257a6-5cbb-4530-914c-b7c643d4c608', '78a8af66-5ada-415a-b8f6-390b205a5ec9', '01b94576-b441-4c66-ac35-be4aa17effa3', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e9063dce-e19e-4eb2-be38-bcf8c982cdd2', '78a8af66-5ada-415a-b8f6-390b205a5ec9', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('6cab3226-ef88-43fd-a137-9fdc74e0096e', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '85cf466e-cb30-49f6-a3ac-58884c85a854', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2025-06-15 12:00:00' - interval '1 hours' - interval '33 mins', timestamp '2025-06-15 12:00:00' - interval '1 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('86d72bbe-871d-476c-a5bb-caedf950199f', '6cab3226-ef88-43fd-a137-9fdc74e0096e', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c6c60695-e106-451c-ae31-b54e81864e5c', '6cab3226-ef88-43fd-a137-9fdc74e0096e', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('293bbae6-eb38-4d89-b8d0-3b262f81fd57', '6cab3226-ef88-43fd-a137-9fdc74e0096e', '01b94576-b441-4c66-ac35-be4aa17effa3', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('06fe1e97-02d4-48f1-b03f-acda179b0fa7', '6cab3226-ef88-43fd-a137-9fdc74e0096e', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('03c7e474-ccd9-4f4e-bb80-9ae83f4f0736', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'c2fd33b6-8b39-4397-acec-1dd12cdfc62b', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2025-06-15 12:00:00' - interval '30 hours' - interval '26 mins', timestamp '2025-06-15 12:00:00' - interval '30 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2aa7b22f-b57d-46ce-829b-999e29ae70d6', '03c7e474-ccd9-4f4e-bb80-9ae83f4f0736', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('872785b7-8ed9-49aa-b950-a0ae570586cf', '03c7e474-ccd9-4f4e-bb80-9ae83f4f0736', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fd4dcfdd-cff9-43c1-9b41-bfb3236a645f', '03c7e474-ccd9-4f4e-bb80-9ae83f4f0736', '01b94576-b441-4c66-ac35-be4aa17effa3', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('def058ea-a10e-43e8-97db-206d4f88b9cc', '03c7e474-ccd9-4f4e-bb80-9ae83f4f0736', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('2d255dc4-909c-4624-a79a-514435410f4d', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '49d1f760-f4a0-40f3-a142-a11518c59c92', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2025-06-15 12:00:00' - interval '50 hours' - interval '35 mins', timestamp '2025-06-15 12:00:00' - interval '50 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('64d61165-8dbf-4e60-91d3-afd2845dd567', '2d255dc4-909c-4624-a79a-514435410f4d', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2cbd9521-6d41-4de4-ad7b-f1bef5b4bf94', '2d255dc4-909c-4624-a79a-514435410f4d', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('76d5e938-5971-4046-962d-63ee491b8884', '2d255dc4-909c-4624-a79a-514435410f4d', '01b94576-b441-4c66-ac35-be4aa17effa3', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1f3667e2-60fc-40bf-b74e-fd01ac2c3ae8', '2d255dc4-909c-4624-a79a-514435410f4d', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('5074ce26-16ea-443b-8e14-860627ce90ee', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'be3a4e6f-a69b-418a-a333-215fbfdf5261', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2025-06-15 12:00:00' - interval '44 hours' - interval '23 mins', timestamp '2025-06-15 12:00:00' - interval '44 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('40bbba5d-89cd-4f7a-b8d6-a688e5316fa9', '5074ce26-16ea-443b-8e14-860627ce90ee', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('918849b2-4a7a-4feb-92d8-a5664a5e7a62', '5074ce26-16ea-443b-8e14-860627ce90ee', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('13e9dd2c-72d8-4d74-945c-c46a1f211941', '5074ce26-16ea-443b-8e14-860627ce90ee', '01b94576-b441-4c66-ac35-be4aa17effa3', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f8377475-5839-4d30-b774-84250c221c39', '5074ce26-16ea-443b-8e14-860627ce90ee', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('baf7cbed-3503-40c4-8584-b8fc144a7d1b', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '85cf466e-cb30-49f6-a3ac-58884c85a854', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2025-06-15 12:00:00' - interval '38 hours' - interval '27 mins', timestamp '2025-06-15 12:00:00' - interval '38 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d7cd1a0a-3f22-4642-9b8e-1d2264e98e45', 'baf7cbed-3503-40c4-8584-b8fc144a7d1b', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('057a0678-b73a-48bb-988e-2777ee63f4d6', 'baf7cbed-3503-40c4-8584-b8fc144a7d1b', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1e81437a-6a87-4ef1-b35a-897904fbd663', 'baf7cbed-3503-40c4-8584-b8fc144a7d1b', '01b94576-b441-4c66-ac35-be4aa17effa3', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0c3135e9-a006-4b12-9590-6b632f6b0620', 'baf7cbed-3503-40c4-8584-b8fc144a7d1b', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('5184aae0-2966-45ca-aed3-2001a261cf97', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'c2fd33b6-8b39-4397-acec-1dd12cdfc62b', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2025-06-15 12:00:00' - interval '45 hours' - interval '30 mins', timestamp '2025-06-15 12:00:00' - interval '45 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b7919679-2094-453e-ba55-42afc19ca030', '5184aae0-2966-45ca-aed3-2001a261cf97', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('044ebe17-3fa8-443a-af35-66de7221d951', '5184aae0-2966-45ca-aed3-2001a261cf97', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bc863609-64a6-4c03-9f2a-1fc022b30132', '5184aae0-2966-45ca-aed3-2001a261cf97', '01b94576-b441-4c66-ac35-be4aa17effa3', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a8f2078a-a7d6-4c3f-aa08-c966127361f7', '5184aae0-2966-45ca-aed3-2001a261cf97', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('fdade93a-92b1-4a2e-87b0-5b83bec9f898', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '49d1f760-f4a0-40f3-a142-a11518c59c92', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2025-06-15 12:00:00' - interval '50 hours' - interval '41 mins', timestamp '2025-06-15 12:00:00' - interval '50 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7d397881-f5d1-4053-a7d9-11f8d645c9c0', 'fdade93a-92b1-4a2e-87b0-5b83bec9f898', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8ec8ab51-c0be-499d-9764-f3757fe33ead', 'fdade93a-92b1-4a2e-87b0-5b83bec9f898', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('572d4f4a-3891-4f67-b334-bfba0b1bcc5b', 'fdade93a-92b1-4a2e-87b0-5b83bec9f898', '01b94576-b441-4c66-ac35-be4aa17effa3', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fd0401b8-4e0b-4b29-993b-b94bcc80bf21', 'fdade93a-92b1-4a2e-87b0-5b83bec9f898', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('3125ea3d-6c51-4195-89a4-c77e3b770454', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'be3a4e6f-a69b-418a-a333-215fbfdf5261', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2025-06-15 12:00:00' - interval '19 hours' - interval '29 mins', timestamp '2025-06-15 12:00:00' - interval '19 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('01aca448-ee32-47b8-89bc-c348f6a1887e', '3125ea3d-6c51-4195-89a4-c77e3b770454', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b1f91906-7332-4608-9e89-6d35a5dc7712', '3125ea3d-6c51-4195-89a4-c77e3b770454', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2bdfd016-91a1-4b5c-8476-12b8288aa3be', '3125ea3d-6c51-4195-89a4-c77e3b770454', '01b94576-b441-4c66-ac35-be4aa17effa3', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fdfc903c-076f-4504-9fae-8dac8f64d12f', '3125ea3d-6c51-4195-89a4-c77e3b770454', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('4b4cb369-466c-453c-917a-7880b0781d99', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '85cf466e-cb30-49f6-a3ac-58884c85a854', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2025-06-15 12:00:00' - interval '68 hours' - interval '20 mins', timestamp '2025-06-15 12:00:00' - interval '68 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('184ee97f-45ea-4b6f-9e9c-0f933f3fdf22', '4b4cb369-466c-453c-917a-7880b0781d99', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dc4d1037-57e2-4b18-8a8a-530f6dd61aa5', '4b4cb369-466c-453c-917a-7880b0781d99', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('696d7bfc-c3c2-428b-9a1a-80fb32350396', '4b4cb369-466c-453c-917a-7880b0781d99', '01b94576-b441-4c66-ac35-be4aa17effa3', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fad6734e-4062-47dc-866f-8f869e501c24', '4b4cb369-466c-453c-917a-7880b0781d99', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('c451ccde-7192-4aa8-a40b-4d995af00280', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'c2fd33b6-8b39-4397-acec-1dd12cdfc62b', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2025-06-15 12:00:00' - interval '64 hours' - interval '26 mins', timestamp '2025-06-15 12:00:00' - interval '64 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('89e5d67b-1fd7-435d-93b4-79af832efccc', 'c451ccde-7192-4aa8-a40b-4d995af00280', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('454707ab-9691-47a3-a417-ecd7c0a83000', 'c451ccde-7192-4aa8-a40b-4d995af00280', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1e06894c-afe1-48a6-88d4-301048f2e85a', 'c451ccde-7192-4aa8-a40b-4d995af00280', '01b94576-b441-4c66-ac35-be4aa17effa3', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('81f49e91-dbdb-4fd6-b7ca-c4878e66417f', 'c451ccde-7192-4aa8-a40b-4d995af00280', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e463f593-4b9e-40e4-9e9f-0bd1dfff0bdd', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '49d1f760-f4a0-40f3-a142-a11518c59c92', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2025-06-15 12:00:00' - interval '28 hours' - interval '44 mins', timestamp '2025-06-15 12:00:00' - interval '28 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('71d97645-e91a-4d3c-b48f-9b8af3250372', 'e463f593-4b9e-40e4-9e9f-0bd1dfff0bdd', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7acf1d58-b061-470c-8dc0-8222c8409fc9', 'e463f593-4b9e-40e4-9e9f-0bd1dfff0bdd', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d1a0aed7-1c76-493f-a17c-47e058369d86', 'e463f593-4b9e-40e4-9e9f-0bd1dfff0bdd', '01b94576-b441-4c66-ac35-be4aa17effa3', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d1daddf3-3747-4dad-98f6-eab1b6a2302d', 'e463f593-4b9e-40e4-9e9f-0bd1dfff0bdd', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('9c5930a1-bf35-4c98-9b0f-51ce9e776378', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'be3a4e6f-a69b-418a-a333-215fbfdf5261', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2025-06-15 12:00:00' - interval '64 hours' - interval '20 mins', timestamp '2025-06-15 12:00:00' - interval '64 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2a5d5fcd-13ba-4cd2-ab9d-a50aea50312f', '9c5930a1-bf35-4c98-9b0f-51ce9e776378', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('48f8b061-7bfa-485b-9165-2cd81c2de3e8', '9c5930a1-bf35-4c98-9b0f-51ce9e776378', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fb469d60-9738-4cfd-81cf-d75e86d22813', '9c5930a1-bf35-4c98-9b0f-51ce9e776378', '01b94576-b441-4c66-ac35-be4aa17effa3', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ac5525b7-ec99-4123-8a16-9feefacd4086', '9c5930a1-bf35-4c98-9b0f-51ce9e776378', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('87d1234c-c935-4e99-936d-193e510f1eff', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '85cf466e-cb30-49f6-a3ac-58884c85a854', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2025-06-15 12:00:00' - interval '3 hours' - interval '22 mins', timestamp '2025-06-15 12:00:00' - interval '3 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c9d736bf-4d1a-4a57-854d-4fd80df3aae3', '87d1234c-c935-4e99-936d-193e510f1eff', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('18d241b2-2323-40cd-af02-da1fd3cb1860', '87d1234c-c935-4e99-936d-193e510f1eff', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('55e8a002-2e0b-4b78-b311-cf4ec988eafe', '87d1234c-c935-4e99-936d-193e510f1eff', '01b94576-b441-4c66-ac35-be4aa17effa3', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4776bd91-b1b6-47de-9230-5ab1ed277fee', '87d1234c-c935-4e99-936d-193e510f1eff', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('113cb0ce-6cc8-4ff7-9244-b54e157c07f4', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'c2fd33b6-8b39-4397-acec-1dd12cdfc62b', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2025-06-15 12:00:00' - interval '68 hours' - interval '40 mins', timestamp '2025-06-15 12:00:00' - interval '68 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('39d55ce4-d1f2-4aee-a635-74f936ed3a6b', '113cb0ce-6cc8-4ff7-9244-b54e157c07f4', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1c75ed22-a19a-4cd6-aba2-d08b5f302f12', '113cb0ce-6cc8-4ff7-9244-b54e157c07f4', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e76a6653-b7fc-4141-bc66-5c922a178808', '113cb0ce-6cc8-4ff7-9244-b54e157c07f4', '01b94576-b441-4c66-ac35-be4aa17effa3', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3fd57f6f-12c4-4106-aa2d-49f0dc7fa6f7', '113cb0ce-6cc8-4ff7-9244-b54e157c07f4', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('67cf4151-98a7-427e-b9af-0b1c52a5fa37', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '49d1f760-f4a0-40f3-a142-a11518c59c92', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2025-06-15 12:00:00' - interval '45 hours' - interval '37 mins', timestamp '2025-06-15 12:00:00' - interval '45 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e7627117-cd51-4753-bcb6-e5f37d461e76', '67cf4151-98a7-427e-b9af-0b1c52a5fa37', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0b99cce6-cbcc-481f-aef1-340c42b017b3', '67cf4151-98a7-427e-b9af-0b1c52a5fa37', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2dc18dc0-3631-46d3-98a0-e63864bed552', '67cf4151-98a7-427e-b9af-0b1c52a5fa37', '01b94576-b441-4c66-ac35-be4aa17effa3', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('93867114-047a-4f3f-b8cc-f68eba1f1156', '67cf4151-98a7-427e-b9af-0b1c52a5fa37', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('5bca4846-31d3-43cf-bee0-cad684be4ff9', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'be3a4e6f-a69b-418a-a333-215fbfdf5261', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', timestamp '2025-06-15 12:00:00' - interval '46 hours' - interval '35 mins', timestamp '2025-06-15 12:00:00' - interval '46 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('aa82054c-72a7-4557-bbfd-09ba0edb6968', '5bca4846-31d3-43cf-bee0-cad684be4ff9', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d582adc3-c0ea-442d-b9d7-8298902cf1f9', '5bca4846-31d3-43cf-bee0-cad684be4ff9', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1db6d994-2af7-42f6-bb5f-0f673a64dba5', '5bca4846-31d3-43cf-bee0-cad684be4ff9', '01b94576-b441-4c66-ac35-be4aa17effa3', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6826603a-be86-41f5-9f8b-452b4be17b52', '5bca4846-31d3-43cf-bee0-cad684be4ff9', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('5300d68c-6ded-4100-9c81-941714726d4a', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '85cf466e-cb30-49f6-a3ac-58884c85a854', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', timestamp '2025-06-15 12:00:00' - interval '4 hours' - interval '26 mins', timestamp '2025-06-15 12:00:00' - interval '4 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9209702e-c76f-42b6-87de-691447a2f554', '5300d68c-6ded-4100-9c81-941714726d4a', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('90b94594-41e6-4787-812c-b72c9cb0397c', '5300d68c-6ded-4100-9c81-941714726d4a', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e08d49df-9b18-4527-b730-51200e36c401', '5300d68c-6ded-4100-9c81-941714726d4a', '01b94576-b441-4c66-ac35-be4aa17effa3', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c0db232c-59a7-4663-81b5-cea8a6063bc1', '5300d68c-6ded-4100-9c81-941714726d4a', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('95fd8af3-7646-4123-81e8-07e5329a22cb', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'c2fd33b6-8b39-4397-acec-1dd12cdfc62b', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', timestamp '2025-06-15 12:00:00' - interval '3 hours' - interval '39 mins', timestamp '2025-06-15 12:00:00' - interval '3 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f806fde7-34e7-489c-bba7-daaedd84e02d', '95fd8af3-7646-4123-81e8-07e5329a22cb', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1cc7172f-19f8-49a8-90c9-b80f200a4b29', '95fd8af3-7646-4123-81e8-07e5329a22cb', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e1583330-6c76-4864-baa7-231ba21c4551', '95fd8af3-7646-4123-81e8-07e5329a22cb', '01b94576-b441-4c66-ac35-be4aa17effa3', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('706d6cad-3dd2-4dfc-9d86-5a14f286621a', '95fd8af3-7646-4123-81e8-07e5329a22cb', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7a567753-19e4-4146-9cfe-cb51947a5baa', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '49d1f760-f4a0-40f3-a142-a11518c59c92', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', timestamp '2025-06-15 12:00:00' - interval '8 hours' - interval '31 mins', timestamp '2025-06-15 12:00:00' - interval '8 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('20537ffa-1907-4272-9e61-c202fdf166fe', '7a567753-19e4-4146-9cfe-cb51947a5baa', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('317f7cc2-0c1c-4346-8b8d-31f7a9ac6200', '7a567753-19e4-4146-9cfe-cb51947a5baa', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1f7efb0a-7aca-41bf-8605-a14862aa2858', '7a567753-19e4-4146-9cfe-cb51947a5baa', '01b94576-b441-4c66-ac35-be4aa17effa3', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6390ee37-d10f-4884-8e08-c3cbeea8793c', '7a567753-19e4-4146-9cfe-cb51947a5baa', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('95e4f09f-26bd-4ed0-985a-8d0b174b0993', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'be3a4e6f-a69b-418a-a333-215fbfdf5261', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2025-06-15 12:00:00' - interval '44 hours' - interval '43 mins', timestamp '2025-06-15 12:00:00' - interval '44 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1093a0af-3616-4d56-84b3-1322207adbed', '95e4f09f-26bd-4ed0-985a-8d0b174b0993', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('586e5519-0ba9-43c9-af74-4b5549a29cd7', '95e4f09f-26bd-4ed0-985a-8d0b174b0993', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5cac4d1c-2c1c-4bf6-87d1-ee4dee0a5c68', '95e4f09f-26bd-4ed0-985a-8d0b174b0993', '01b94576-b441-4c66-ac35-be4aa17effa3', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('47f2c8d6-c497-4a87-98e5-d6cfb928bdef', '95e4f09f-26bd-4ed0-985a-8d0b174b0993', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('524f2243-8e43-466d-9168-421b3d2acabd', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '85cf466e-cb30-49f6-a3ac-58884c85a854', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2025-06-15 12:00:00' - interval '17 hours' - interval '23 mins', timestamp '2025-06-15 12:00:00' - interval '17 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('45193183-a618-44d3-9597-120246fe36b2', '524f2243-8e43-466d-9168-421b3d2acabd', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('df4f91bf-b65c-4ed7-9787-2762042966c4', '524f2243-8e43-466d-9168-421b3d2acabd', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('521c9542-84aa-42bb-a346-db89f094d961', '524f2243-8e43-466d-9168-421b3d2acabd', '01b94576-b441-4c66-ac35-be4aa17effa3', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9b4ea42f-35f3-45dc-b92e-d72bf48139d2', '524f2243-8e43-466d-9168-421b3d2acabd', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('4e04e676-5dbb-4fa1-9e65-97d7d80d652d', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'c2fd33b6-8b39-4397-acec-1dd12cdfc62b', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2025-06-15 12:00:00' - interval '36 hours' - interval '31 mins', timestamp '2025-06-15 12:00:00' - interval '36 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e47d53e2-c087-46de-9e69-e2510c2cdb9d', '4e04e676-5dbb-4fa1-9e65-97d7d80d652d', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4af33868-403a-4045-a39e-758fa3410a5f', '4e04e676-5dbb-4fa1-9e65-97d7d80d652d', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('418c7960-6f21-4b8b-b232-e9a48b8593c3', '4e04e676-5dbb-4fa1-9e65-97d7d80d652d', '01b94576-b441-4c66-ac35-be4aa17effa3', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3180eb7c-248b-4e45-b3b9-c16d574af14e', '4e04e676-5dbb-4fa1-9e65-97d7d80d652d', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('6a7dec5a-567e-4ed9-9a35-ff3af122f69f', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '49d1f760-f4a0-40f3-a142-a11518c59c92', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2025-06-15 12:00:00' - interval '13 hours' - interval '44 mins', timestamp '2025-06-15 12:00:00' - interval '13 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('428f8596-bb3c-4104-a137-8ad1546e0d61', '6a7dec5a-567e-4ed9-9a35-ff3af122f69f', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f45751d1-e5a1-4a78-be3d-2e7ddd30e1b7', '6a7dec5a-567e-4ed9-9a35-ff3af122f69f', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bb4b239b-44cd-472a-8c4c-9f0de6fc6472', '6a7dec5a-567e-4ed9-9a35-ff3af122f69f', '01b94576-b441-4c66-ac35-be4aa17effa3', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('92a3de41-a274-4ed6-b6cb-9e9141018636', '6a7dec5a-567e-4ed9-9a35-ff3af122f69f', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('8e9b4373-0def-4bbd-ac22-41f363b965d4', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'be3a4e6f-a69b-418a-a333-215fbfdf5261', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', timestamp '2025-06-15 12:00:00' - interval '3 hours' - interval '45 mins', timestamp '2025-06-15 12:00:00' - interval '3 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7f9a9edb-3277-44d5-9302-686614176649', '8e9b4373-0def-4bbd-ac22-41f363b965d4', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3065e735-790c-44d3-8e00-46d18aedb582', '8e9b4373-0def-4bbd-ac22-41f363b965d4', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ba268295-b005-4b50-ac77-b2c72709282b', '8e9b4373-0def-4bbd-ac22-41f363b965d4', '01b94576-b441-4c66-ac35-be4aa17effa3', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8f5ff979-96c9-49e1-aafc-e04acfa8bccc', '8e9b4373-0def-4bbd-ac22-41f363b965d4', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('46c2423d-4bd5-49e2-8f02-69208cfa0c5b', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '85cf466e-cb30-49f6-a3ac-58884c85a854', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', timestamp '2025-06-15 12:00:00' - interval '72 hours' - interval '31 mins', timestamp '2025-06-15 12:00:00' - interval '72 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e006a3ca-04d4-4d22-876c-89a822b9ebb8', '46c2423d-4bd5-49e2-8f02-69208cfa0c5b', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('16e49287-b9f7-44be-b136-d4b85c7aa1b9', '46c2423d-4bd5-49e2-8f02-69208cfa0c5b', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('65a23c00-f37a-4fe0-8fdf-7a0ba302de9e', '46c2423d-4bd5-49e2-8f02-69208cfa0c5b', '01b94576-b441-4c66-ac35-be4aa17effa3', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6573ba4f-6f15-4237-ba1e-48d30c5e0f32', '46c2423d-4bd5-49e2-8f02-69208cfa0c5b', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('287f9b7d-ede1-4a25-8167-8720395d0ea9', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'c2fd33b6-8b39-4397-acec-1dd12cdfc62b', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', timestamp '2025-06-15 12:00:00' - interval '15 hours' - interval '36 mins', timestamp '2025-06-15 12:00:00' - interval '15 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('94caffb5-6bfd-444d-950f-2085cb5c7572', '287f9b7d-ede1-4a25-8167-8720395d0ea9', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('973ae9ca-6d2a-4c60-bf83-dc33166de9d7', '287f9b7d-ede1-4a25-8167-8720395d0ea9', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1b0ba009-4bd5-41d6-be5b-ecce7b0361cb', '287f9b7d-ede1-4a25-8167-8720395d0ea9', '01b94576-b441-4c66-ac35-be4aa17effa3', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('41338051-66d0-456e-80dd-50a1fb2e2aa3', '287f9b7d-ede1-4a25-8167-8720395d0ea9', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('71fcb241-5ab2-4ce9-bb3f-71fe2c4b7224', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '49d1f760-f4a0-40f3-a142-a11518c59c92', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', timestamp '2025-06-15 12:00:00' - interval '48 hours' - interval '26 mins', timestamp '2025-06-15 12:00:00' - interval '48 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('137ef60e-8257-44fb-9d60-c928ee7b98a5', '71fcb241-5ab2-4ce9-bb3f-71fe2c4b7224', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('979ab10b-9e56-4562-8f04-37a0aa866d23', '71fcb241-5ab2-4ce9-bb3f-71fe2c4b7224', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8ad1aad1-961b-4df3-96ee-d50274eb73d3', '71fcb241-5ab2-4ce9-bb3f-71fe2c4b7224', '01b94576-b441-4c66-ac35-be4aa17effa3', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('efbf6790-9b82-484c-9f2b-5519c6a32908', '71fcb241-5ab2-4ce9-bb3f-71fe2c4b7224', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('0bc4a298-100d-4ba7-be9a-f0b6fbb4f9ea', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'be3a4e6f-a69b-418a-a333-215fbfdf5261', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2025-06-15 12:00:00' - interval '40 hours' - interval '43 mins', timestamp '2025-06-15 12:00:00' - interval '40 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('715ce11d-2a37-4373-9666-05ec66b98485', '0bc4a298-100d-4ba7-be9a-f0b6fbb4f9ea', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1cb50e19-2e8d-41e3-9de9-72eff7eab94d', '0bc4a298-100d-4ba7-be9a-f0b6fbb4f9ea', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3be5bd8d-0f53-40fc-8819-afdb2236b80c', '0bc4a298-100d-4ba7-be9a-f0b6fbb4f9ea', '01b94576-b441-4c66-ac35-be4aa17effa3', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b7e1d968-8179-491c-acb2-0a9fde9e834d', '0bc4a298-100d-4ba7-be9a-f0b6fbb4f9ea', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('2fc23400-558c-4a24-a24b-ed09181a5ff7', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '85cf466e-cb30-49f6-a3ac-58884c85a854', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2025-06-15 12:00:00' - interval '32 hours' - interval '37 mins', timestamp '2025-06-15 12:00:00' - interval '32 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e19d5153-bfb8-4776-897b-065db3e57933', '2fc23400-558c-4a24-a24b-ed09181a5ff7', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('81fd4c54-2658-4a6b-9a5c-80975a23a939', '2fc23400-558c-4a24-a24b-ed09181a5ff7', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('77f734d0-0642-4bac-91a7-3a60ab2498ac', '2fc23400-558c-4a24-a24b-ed09181a5ff7', '01b94576-b441-4c66-ac35-be4aa17effa3', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4f069c86-4297-4e49-b1bc-8b3a430c493c', '2fc23400-558c-4a24-a24b-ed09181a5ff7', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('48a60e43-02d2-4ad7-983c-3f88b5eeec30', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'c2fd33b6-8b39-4397-acec-1dd12cdfc62b', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2025-06-15 12:00:00' - interval '13 hours' - interval '43 mins', timestamp '2025-06-15 12:00:00' - interval '13 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a6e610b0-ca48-49fe-8708-2c778a424494', '48a60e43-02d2-4ad7-983c-3f88b5eeec30', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8ff7328f-0ea5-4a17-bf23-0b073ac0a47c', '48a60e43-02d2-4ad7-983c-3f88b5eeec30', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b692515d-b109-456e-88b0-052fbc5459fc', '48a60e43-02d2-4ad7-983c-3f88b5eeec30', '01b94576-b441-4c66-ac35-be4aa17effa3', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a0767ac0-25fc-4b66-9051-ac3fbb4142a9', '48a60e43-02d2-4ad7-983c-3f88b5eeec30', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('be09606e-2244-4748-a4a6-af48b17089b3', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '49d1f760-f4a0-40f3-a142-a11518c59c92', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2025-06-15 12:00:00' - interval '5 hours' - interval '23 mins', timestamp '2025-06-15 12:00:00' - interval '5 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('03892d59-9c19-40ec-bb4d-bf537ac8efc5', 'be09606e-2244-4748-a4a6-af48b17089b3', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c9536c55-ef49-490b-808c-88758e15c059', 'be09606e-2244-4748-a4a6-af48b17089b3', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ce6a3abb-84da-4fd2-a5f3-1f50df7e23ca', 'be09606e-2244-4748-a4a6-af48b17089b3', '01b94576-b441-4c66-ac35-be4aa17effa3', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3140ade5-0a64-4636-a0e8-1479a79d1583', 'be09606e-2244-4748-a4a6-af48b17089b3', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('84c1efaa-f2ed-4a75-abfb-e00d7f29f3ff', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'be3a4e6f-a69b-418a-a333-215fbfdf5261', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2025-06-15 12:00:00' - interval '32 hours' - interval '34 mins', timestamp '2025-06-15 12:00:00' - interval '32 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6dc224d1-f66f-46fc-bf9a-31f63db8ccdc', '84c1efaa-f2ed-4a75-abfb-e00d7f29f3ff', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d5ac4a29-557e-494b-93be-42f9c77dc45b', '84c1efaa-f2ed-4a75-abfb-e00d7f29f3ff', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c7696200-b962-450f-a027-0402994c0f7a', '84c1efaa-f2ed-4a75-abfb-e00d7f29f3ff', '01b94576-b441-4c66-ac35-be4aa17effa3', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8051c6fa-47fb-4c0f-8e36-550184d66bfa', '84c1efaa-f2ed-4a75-abfb-e00d7f29f3ff', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('fe57e972-b932-4a3b-9095-003a5771fd16', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '85cf466e-cb30-49f6-a3ac-58884c85a854', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2025-06-15 12:00:00' - interval '56 hours' - interval '23 mins', timestamp '2025-06-15 12:00:00' - interval '56 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dd892e42-f133-48a0-965c-fd69b1552058', 'fe57e972-b932-4a3b-9095-003a5771fd16', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2a51474e-32fa-44f0-9698-f25c6af48e7c', 'fe57e972-b932-4a3b-9095-003a5771fd16', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('579794ef-c5bf-4375-8323-2ec062b2dbdd', 'fe57e972-b932-4a3b-9095-003a5771fd16', '01b94576-b441-4c66-ac35-be4aa17effa3', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0107398e-6bb3-45f0-b469-199940f864df', 'fe57e972-b932-4a3b-9095-003a5771fd16', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('791ea7be-9486-4629-8448-11541cb1b4c5', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'c2fd33b6-8b39-4397-acec-1dd12cdfc62b', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2025-06-15 12:00:00' - interval '9 hours' - interval '29 mins', timestamp '2025-06-15 12:00:00' - interval '9 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bb981ea9-ad80-4296-b53e-71f6f9741012', '791ea7be-9486-4629-8448-11541cb1b4c5', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4a62a873-39fb-49b4-934c-b1c5c9c94470', '791ea7be-9486-4629-8448-11541cb1b4c5', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d261ff58-faa2-4d75-a126-d752f1c7c3e5', '791ea7be-9486-4629-8448-11541cb1b4c5', '01b94576-b441-4c66-ac35-be4aa17effa3', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6da02e6d-6a1f-41ca-9166-deaee7f6bec1', '791ea7be-9486-4629-8448-11541cb1b4c5', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('eb0b1894-2359-4f9f-87d4-9e06ae9eb744', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '49d1f760-f4a0-40f3-a142-a11518c59c92', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2025-06-15 12:00:00' - interval '42 hours' - interval '25 mins', timestamp '2025-06-15 12:00:00' - interval '42 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('83c103df-f04e-4779-86cb-2c438d953c59', 'eb0b1894-2359-4f9f-87d4-9e06ae9eb744', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('111e446b-fcb8-4b26-8216-5849956f50d0', 'eb0b1894-2359-4f9f-87d4-9e06ae9eb744', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('de6c77c5-2611-4e88-b6ec-37dc31fc4246', 'eb0b1894-2359-4f9f-87d4-9e06ae9eb744', '01b94576-b441-4c66-ac35-be4aa17effa3', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0eabf6ae-0521-43c8-b501-feff4144baba', 'eb0b1894-2359-4f9f-87d4-9e06ae9eb744', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('adf461e4-c8c2-4de7-9319-7a29afc6233d', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'be3a4e6f-a69b-418a-a333-215fbfdf5261', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2025-06-15 12:00:00' - interval '33 hours' - interval '25 mins', timestamp '2025-06-15 12:00:00' - interval '33 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('acfd8ffa-8454-4741-b61f-035f23af8a61', 'adf461e4-c8c2-4de7-9319-7a29afc6233d', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7e9fe4a4-4c3c-48a4-aa35-b22b4da42e03', 'adf461e4-c8c2-4de7-9319-7a29afc6233d', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5e8541e3-748b-4b0d-b6fb-356201c11d2a', 'adf461e4-c8c2-4de7-9319-7a29afc6233d', '01b94576-b441-4c66-ac35-be4aa17effa3', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('151fe180-3ecc-416f-a21c-e1a7d6829d98', 'adf461e4-c8c2-4de7-9319-7a29afc6233d', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('88a897d3-441c-477b-bbfe-37ddb78be157', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '85cf466e-cb30-49f6-a3ac-58884c85a854', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2025-06-15 12:00:00' - interval '36 hours' - interval '38 mins', timestamp '2025-06-15 12:00:00' - interval '36 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ee67550c-0c2d-4508-85c3-aebb404455f1', '88a897d3-441c-477b-bbfe-37ddb78be157', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('26f48fee-0c5a-4b66-9a3a-ac517b07cf8c', '88a897d3-441c-477b-bbfe-37ddb78be157', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8ae8ac7a-abc4-45a8-b3e0-6e17d04c6fd6', '88a897d3-441c-477b-bbfe-37ddb78be157', '01b94576-b441-4c66-ac35-be4aa17effa3', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('224ae30a-abf4-473c-bbe8-ae477b9bf112', '88a897d3-441c-477b-bbfe-37ddb78be157', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a690aa1d-5bcb-4122-af86-4c96a3bd37fd', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', 'c2fd33b6-8b39-4397-acec-1dd12cdfc62b', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2025-06-15 12:00:00' - interval '7 hours' - interval '39 mins', timestamp '2025-06-15 12:00:00' - interval '7 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('eb327bc3-372f-48d7-a73e-0bbbeeb4e94c', 'a690aa1d-5bcb-4122-af86-4c96a3bd37fd', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b3eb5fdf-0ad8-445c-a57d-071acb1c84e0', 'a690aa1d-5bcb-4122-af86-4c96a3bd37fd', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0e18e156-64db-4fe9-8dc8-efacc709ded1', 'a690aa1d-5bcb-4122-af86-4c96a3bd37fd', '01b94576-b441-4c66-ac35-be4aa17effa3', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a7e8f06d-ab85-4c80-8fbf-b3810dbe21f6', 'a690aa1d-5bcb-4122-af86-4c96a3bd37fd', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('664f3d94-f674-4567-9522-3af1144be048', 'e55e0820-93f2-487f-abaa-4ae64a77e93e', '49d1f760-f4a0-40f3-a142-a11518c59c92', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2025-06-15 12:00:00' - interval '33 hours' - interval '34 mins', timestamp '2025-06-15 12:00:00' - interval '33 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4dde875b-78f9-4c0f-9b85-3695597e7e26', '664f3d94-f674-4567-9522-3af1144be048', '5c1f4f21-151a-4b22-a335-5ef961d9e99f', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('142f5c01-b193-4740-a4b6-b1a53985ad33', '664f3d94-f674-4567-9522-3af1144be048', '15dca296-abd2-4fd9-adb3-ff2d66b91858', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f74c8c06-23ff-4d94-9912-2d466a9dd857', '664f3d94-f674-4567-9522-3af1144be048', '01b94576-b441-4c66-ac35-be4aa17effa3', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('add3293f-ae7f-4df9-a935-9c3dd8a731df', '664f3d94-f674-4567-9522-3af1144be048', '7a7a05a9-ac9c-402d-aa04-6a07b69dccde', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('00c4c7b2-ff96-4d2c-b918-a1ae5334bae2', '10078594-2707-4c3f-a212-42add04fbd84', '60146fd4-7794-4dd7-a91f-8dad08a9759a', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2025-01-15 12:00:00' - interval '19 hours' - interval '44 mins', timestamp '2025-01-15 12:00:00' - interval '19 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b42b447d-a25a-4a69-87de-44f8b34c36b3', '00c4c7b2-ff96-4d2c-b918-a1ae5334bae2', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('72c7b44f-8873-4bdf-b897-e6334ee9568b', '00c4c7b2-ff96-4d2c-b918-a1ae5334bae2', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d20df9ec-8085-4b7c-bc1f-a6ec07d4956b', '00c4c7b2-ff96-4d2c-b918-a1ae5334bae2', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b9c08de4-47c2-4d9c-85ba-e01c3b0dd698', '00c4c7b2-ff96-4d2c-b918-a1ae5334bae2', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('0d9a372f-cd47-4a5c-9c79-38d74aca6875', '10078594-2707-4c3f-a212-42add04fbd84', 'b89cf1e1-6820-4efb-ad3e-9ab5b4f1bafa', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2025-01-15 12:00:00' - interval '72 hours' - interval '32 mins', timestamp '2025-01-15 12:00:00' - interval '72 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4fc57ae5-9998-4ea0-862e-45f787ed526a', '0d9a372f-cd47-4a5c-9c79-38d74aca6875', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e03223e5-c34e-4314-8cd0-1bcd378b9020', '0d9a372f-cd47-4a5c-9c79-38d74aca6875', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('253c9584-5d30-4cf2-84d6-6e204153ac59', '0d9a372f-cd47-4a5c-9c79-38d74aca6875', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e0f45a6f-03a3-4ab4-8d0f-9ddbc673b7ec', '0d9a372f-cd47-4a5c-9c79-38d74aca6875', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('dfab8de4-05ff-4481-911f-c8c0c27caa0a', '10078594-2707-4c3f-a212-42add04fbd84', '0db79881-0974-4a2d-a8a2-86efdb30bda1', 'aaa0da50-6432-47e0-ab48-b01ca823ef19', 'submitted', timestamp '2025-01-15 12:00:00' - interval '29 hours' - interval '44 mins', timestamp '2025-01-15 12:00:00' - interval '29 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('205884a4-c81f-4ef7-815b-f5191410c515', 'dfab8de4-05ff-4481-911f-c8c0c27caa0a', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8ee065f3-0399-40b1-99b6-eed43a4d22a0', 'dfab8de4-05ff-4481-911f-c8c0c27caa0a', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fc34f677-73ec-44c3-a39c-f629b80918c3', 'dfab8de4-05ff-4481-911f-c8c0c27caa0a', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0498a2c9-70da-434a-a85a-2bd90e5d162e', 'dfab8de4-05ff-4481-911f-c8c0c27caa0a', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('db841cb6-430b-4443-b454-0eceb193e42c', '10078594-2707-4c3f-a212-42add04fbd84', '60146fd4-7794-4dd7-a91f-8dad08a9759a', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2025-01-15 12:00:00' - interval '52 hours' - interval '32 mins', timestamp '2025-01-15 12:00:00' - interval '52 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('02f172e4-2607-4db7-96a2-aae2f38509f9', 'db841cb6-430b-4443-b454-0eceb193e42c', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8db5d56c-97c4-42ac-8688-0e1b983ba581', 'db841cb6-430b-4443-b454-0eceb193e42c', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('50c9a9cc-b66a-4b0b-9eb6-a6f2d1f3f40f', 'db841cb6-430b-4443-b454-0eceb193e42c', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('aee15962-c6f5-4f5a-8033-67578c0fed65', 'db841cb6-430b-4443-b454-0eceb193e42c', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('8872f659-1004-4316-ae58-1296ef74c325', '10078594-2707-4c3f-a212-42add04fbd84', 'b89cf1e1-6820-4efb-ad3e-9ab5b4f1bafa', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2025-01-15 12:00:00' - interval '51 hours' - interval '27 mins', timestamp '2025-01-15 12:00:00' - interval '51 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c76b8aed-19a0-42ba-b2e0-e94ffcc26e44', '8872f659-1004-4316-ae58-1296ef74c325', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0e104110-5999-4c15-acc3-cef176224677', '8872f659-1004-4316-ae58-1296ef74c325', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8f64f356-17e4-46d1-80d9-eb20c5e5d4ff', '8872f659-1004-4316-ae58-1296ef74c325', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ad07ad3f-b129-494d-a545-550f03f30702', '8872f659-1004-4316-ae58-1296ef74c325', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('38da6010-98ad-4990-9055-76abba018f61', '10078594-2707-4c3f-a212-42add04fbd84', '0db79881-0974-4a2d-a8a2-86efdb30bda1', '9a21397b-552a-4b00-a5c4-15a0982436b1', 'submitted', timestamp '2025-01-15 12:00:00' - interval '36 hours' - interval '20 mins', timestamp '2025-01-15 12:00:00' - interval '36 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8a4cf097-11a3-40c7-b768-82197fbfbf9d', '38da6010-98ad-4990-9055-76abba018f61', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dd532a87-8271-40d2-9926-b22aae2dcbf8', '38da6010-98ad-4990-9055-76abba018f61', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cc970626-474c-47f6-92a8-f241692fb9e2', '38da6010-98ad-4990-9055-76abba018f61', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('986dd52a-271f-41a5-94a0-a87f8a335ab0', '38da6010-98ad-4990-9055-76abba018f61', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7c3a8d98-1701-4400-a7cc-11a4c222ee90', '10078594-2707-4c3f-a212-42add04fbd84', '60146fd4-7794-4dd7-a91f-8dad08a9759a', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2025-01-15 12:00:00' - interval '54 hours' - interval '32 mins', timestamp '2025-01-15 12:00:00' - interval '54 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5cb60ddb-bc45-416c-9d02-cd38a75c4925', '7c3a8d98-1701-4400-a7cc-11a4c222ee90', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5dc8d0d7-ad43-4979-8c46-888613a728a3', '7c3a8d98-1701-4400-a7cc-11a4c222ee90', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ea2102f0-2e04-4fa5-b8e7-79a6a85cf5f6', '7c3a8d98-1701-4400-a7cc-11a4c222ee90', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('22a1d1f5-c4d4-408f-98cf-27b4ea5e1525', '7c3a8d98-1701-4400-a7cc-11a4c222ee90', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('5e637f50-8fca-47f3-a03e-607780c4276d', '10078594-2707-4c3f-a212-42add04fbd84', 'b89cf1e1-6820-4efb-ad3e-9ab5b4f1bafa', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2025-01-15 12:00:00' - interval '70 hours' - interval '26 mins', timestamp '2025-01-15 12:00:00' - interval '70 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('27571305-fe79-453d-ac40-76845a83b46f', '5e637f50-8fca-47f3-a03e-607780c4276d', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2e35793d-6f3b-43a1-9c3e-5f21ee520c41', '5e637f50-8fca-47f3-a03e-607780c4276d', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('30099b2a-f03e-4cc6-847a-41f8806e2c5a', '5e637f50-8fca-47f3-a03e-607780c4276d', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a9e5642e-2d1d-4abf-b88e-8f298196362c', '5e637f50-8fca-47f3-a03e-607780c4276d', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('79c2fe6d-0390-4d39-aed8-e6705f792b64', '10078594-2707-4c3f-a212-42add04fbd84', '0db79881-0974-4a2d-a8a2-86efdb30bda1', '7d1bbec7-493f-4e1a-aee5-be30df51db49', 'submitted', timestamp '2025-01-15 12:00:00' - interval '23 hours' - interval '42 mins', timestamp '2025-01-15 12:00:00' - interval '23 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('61a76753-7325-490d-80d6-ef3b2fd9d310', '79c2fe6d-0390-4d39-aed8-e6705f792b64', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b86374b6-62b2-4b34-b6a7-520ccdc3d89d', '79c2fe6d-0390-4d39-aed8-e6705f792b64', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9e558be5-06fd-4415-8d89-fe617d6b65a8', '79c2fe6d-0390-4d39-aed8-e6705f792b64', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a9af14be-bc54-4311-8c2c-0c8ed31cc2cb', '79c2fe6d-0390-4d39-aed8-e6705f792b64', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7be9203b-4992-44d8-9162-8bd55b31c08d', '10078594-2707-4c3f-a212-42add04fbd84', '60146fd4-7794-4dd7-a91f-8dad08a9759a', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2025-01-15 12:00:00' - interval '3 hours' - interval '39 mins', timestamp '2025-01-15 12:00:00' - interval '3 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('af0ca14c-b9ad-4155-ab91-f5f8f02b373e', '7be9203b-4992-44d8-9162-8bd55b31c08d', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('da99c8da-d4b8-4cd8-aa99-934676c2b923', '7be9203b-4992-44d8-9162-8bd55b31c08d', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('28c05318-6fb8-4ae1-8ac4-e1becb06cbb5', '7be9203b-4992-44d8-9162-8bd55b31c08d', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5218cbc8-a183-4780-ab84-dc6432d57295', '7be9203b-4992-44d8-9162-8bd55b31c08d', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('acbb633c-540a-4e1a-bccc-474df6f2aa03', '10078594-2707-4c3f-a212-42add04fbd84', 'b89cf1e1-6820-4efb-ad3e-9ab5b4f1bafa', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2025-01-15 12:00:00' - interval '16 hours' - interval '23 mins', timestamp '2025-01-15 12:00:00' - interval '16 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1eb8f7f0-2f39-43ff-a889-a68c7d8495ed', 'acbb633c-540a-4e1a-bccc-474df6f2aa03', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('64e1dee3-d20b-4afe-b36e-8c1a48ea1263', 'acbb633c-540a-4e1a-bccc-474df6f2aa03', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('42edbaf7-b4e7-400e-ab88-8c29bcde998d', 'acbb633c-540a-4e1a-bccc-474df6f2aa03', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3bc0495e-ece7-4781-b0d9-47a175821c59', 'acbb633c-540a-4e1a-bccc-474df6f2aa03', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('c7d4f1a4-86ae-4d50-9ea9-a6a86c5641e2', '10078594-2707-4c3f-a212-42add04fbd84', '0db79881-0974-4a2d-a8a2-86efdb30bda1', '868057b9-f2e0-4db1-a4e9-e258d25f84e1', 'submitted', timestamp '2025-01-15 12:00:00' - interval '39 hours' - interval '29 mins', timestamp '2025-01-15 12:00:00' - interval '39 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('73a73e5e-fc1f-462f-8485-f31d0b0c2de8', 'c7d4f1a4-86ae-4d50-9ea9-a6a86c5641e2', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a5fa9cb1-7f6f-44a3-bcf1-7c2e09a7a282', 'c7d4f1a4-86ae-4d50-9ea9-a6a86c5641e2', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('86728cd0-8eea-454f-a1bb-55dd8322ae49', 'c7d4f1a4-86ae-4d50-9ea9-a6a86c5641e2', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f76ac237-ea68-499b-b16f-3a6cb04be6d2', 'c7d4f1a4-86ae-4d50-9ea9-a6a86c5641e2', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('46c25a85-06e5-42d8-b67c-d117be430eeb', '10078594-2707-4c3f-a212-42add04fbd84', '60146fd4-7794-4dd7-a91f-8dad08a9759a', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', timestamp '2025-01-15 12:00:00' - interval '5 hours' - interval '40 mins', timestamp '2025-01-15 12:00:00' - interval '5 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ccc9cbb6-26b0-471a-870c-5ecd396e6c73', '46c25a85-06e5-42d8-b67c-d117be430eeb', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('73a8f77a-6c04-45f9-a457-859f072dff8b', '46c25a85-06e5-42d8-b67c-d117be430eeb', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f49b7325-75b5-473f-9b0d-3541ca037d52', '46c25a85-06e5-42d8-b67c-d117be430eeb', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f3cfa1b8-0ce2-49ad-8047-d94840f00d6f', '46c25a85-06e5-42d8-b67c-d117be430eeb', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('392e65ea-df11-4417-9bbe-935db5c67698', '10078594-2707-4c3f-a212-42add04fbd84', 'b89cf1e1-6820-4efb-ad3e-9ab5b4f1bafa', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', timestamp '2025-01-15 12:00:00' - interval '63 hours' - interval '24 mins', timestamp '2025-01-15 12:00:00' - interval '63 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a7e751a0-1389-467d-83b9-a15bf7ee80fc', '392e65ea-df11-4417-9bbe-935db5c67698', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('85388b38-7bc1-4710-9d41-1cb56bbbf114', '392e65ea-df11-4417-9bbe-935db5c67698', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ee1345fd-ff85-48ed-83cb-623a05fcfe4a', '392e65ea-df11-4417-9bbe-935db5c67698', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b7a348f9-237b-4fa5-9a2b-221fa1f7405e', '392e65ea-df11-4417-9bbe-935db5c67698', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('baccbe12-558f-4cea-a6eb-768fc5ed9d44', '10078594-2707-4c3f-a212-42add04fbd84', '0db79881-0974-4a2d-a8a2-86efdb30bda1', '52a3f7a0-46fb-4596-ac3c-1db9f7ec0db2', 'submitted', timestamp '2025-01-15 12:00:00' - interval '3 hours' - interval '34 mins', timestamp '2025-01-15 12:00:00' - interval '3 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('72d6b82c-1655-4a88-adb4-6b051c649e6b', 'baccbe12-558f-4cea-a6eb-768fc5ed9d44', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0309c877-7d82-48a0-97c2-77c353e43cbb', 'baccbe12-558f-4cea-a6eb-768fc5ed9d44', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1ceb973f-5b6a-4916-9889-ab0c8e2bf8e4', 'baccbe12-558f-4cea-a6eb-768fc5ed9d44', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('69d2c7a7-8455-47d0-98e3-82292c082a18', 'baccbe12-558f-4cea-a6eb-768fc5ed9d44', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('c434dd06-0519-4e6c-b0df-b6cdbf9b4a47', '10078594-2707-4c3f-a212-42add04fbd84', '60146fd4-7794-4dd7-a91f-8dad08a9759a', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2025-01-15 12:00:00' - interval '68 hours' - interval '24 mins', timestamp '2025-01-15 12:00:00' - interval '68 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('16204252-4ab8-440e-b0d7-6c0b63f54633', 'c434dd06-0519-4e6c-b0df-b6cdbf9b4a47', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('311a3aaa-09e4-47a6-a329-7e39a92d2936', 'c434dd06-0519-4e6c-b0df-b6cdbf9b4a47', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('db73e55e-8f79-4d5f-abf3-c776e6e79ce8', 'c434dd06-0519-4e6c-b0df-b6cdbf9b4a47', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('63b2a1c6-bcaa-4ba5-985f-46fcaaab91c5', 'c434dd06-0519-4e6c-b0df-b6cdbf9b4a47', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('f2420094-7765-4326-94db-03f82f089ed7', '10078594-2707-4c3f-a212-42add04fbd84', 'b89cf1e1-6820-4efb-ad3e-9ab5b4f1bafa', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2025-01-15 12:00:00' - interval '50 hours' - interval '42 mins', timestamp '2025-01-15 12:00:00' - interval '50 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('65296ed9-b740-4e8e-ae59-98ce63ae3b3e', 'f2420094-7765-4326-94db-03f82f089ed7', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b4d766fa-e488-42c0-be9d-ba192ab63ba0', 'f2420094-7765-4326-94db-03f82f089ed7', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('84888e47-5a52-49b6-b84c-53fa98212ab5', 'f2420094-7765-4326-94db-03f82f089ed7', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('31d4eec6-daf9-4d73-b9c7-573451d27d7d', 'f2420094-7765-4326-94db-03f82f089ed7', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('07a344c9-066d-4712-9ce3-a9d967084e7b', '10078594-2707-4c3f-a212-42add04fbd84', '0db79881-0974-4a2d-a8a2-86efdb30bda1', '56948fec-ce3d-493b-afc4-4e281e9b8f58', 'submitted', timestamp '2025-01-15 12:00:00' - interval '7 hours' - interval '41 mins', timestamp '2025-01-15 12:00:00' - interval '7 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a3cfcecf-7656-4dbc-a67b-d258d3184206', '07a344c9-066d-4712-9ce3-a9d967084e7b', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9004e773-689f-4dcc-a5b3-14625ff6c583', '07a344c9-066d-4712-9ce3-a9d967084e7b', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('80bf8292-4be7-4493-8a6b-3dbe4e2ac3a4', '07a344c9-066d-4712-9ce3-a9d967084e7b', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0c28900b-f537-414b-a60a-94c904338c2e', '07a344c9-066d-4712-9ce3-a9d967084e7b', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('47dc0e56-5659-49b7-8cf9-b67aec06373c', '10078594-2707-4c3f-a212-42add04fbd84', '60146fd4-7794-4dd7-a91f-8dad08a9759a', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', timestamp '2025-01-15 12:00:00' - interval '56 hours' - interval '21 mins', timestamp '2025-01-15 12:00:00' - interval '56 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('749f197f-e5a9-41fb-9667-9a0658306584', '47dc0e56-5659-49b7-8cf9-b67aec06373c', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('762ce0f5-68db-43de-8daa-d6bde711e72b', '47dc0e56-5659-49b7-8cf9-b67aec06373c', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d692bf1c-588a-421a-a907-7698be45795a', '47dc0e56-5659-49b7-8cf9-b67aec06373c', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8c730117-3383-4df0-8a1e-f204b2467fde', '47dc0e56-5659-49b7-8cf9-b67aec06373c', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d79606d4-c92e-4642-b03b-f74207435cb2', '10078594-2707-4c3f-a212-42add04fbd84', 'b89cf1e1-6820-4efb-ad3e-9ab5b4f1bafa', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', timestamp '2025-01-15 12:00:00' - interval '54 hours' - interval '32 mins', timestamp '2025-01-15 12:00:00' - interval '54 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f74a5746-f0e4-4c31-8165-416846464690', 'd79606d4-c92e-4642-b03b-f74207435cb2', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0fcf86f0-4d42-4eb8-8fde-27995f3b933d', 'd79606d4-c92e-4642-b03b-f74207435cb2', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('610c27c7-3385-4284-b81f-c2c4a7c6ba44', 'd79606d4-c92e-4642-b03b-f74207435cb2', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('928de39f-662b-49b9-86d2-674679744fac', 'd79606d4-c92e-4642-b03b-f74207435cb2', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('06cb180b-af2b-4e70-a7c1-c875c618b5bf', '10078594-2707-4c3f-a212-42add04fbd84', '0db79881-0974-4a2d-a8a2-86efdb30bda1', 'ff458a22-0a8c-4701-a835-da94b83a3b0f', 'submitted', timestamp '2025-01-15 12:00:00' - interval '29 hours' - interval '32 mins', timestamp '2025-01-15 12:00:00' - interval '29 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('60787acf-018a-42a5-9873-ce0f66ee5504', '06cb180b-af2b-4e70-a7c1-c875c618b5bf', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c64cbdc0-7817-4524-9065-6ad10b93ccc7', '06cb180b-af2b-4e70-a7c1-c875c618b5bf', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('58b29549-a4ed-44e1-a2d1-507d7d34bcc2', '06cb180b-af2b-4e70-a7c1-c875c618b5bf', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('49b17977-c3eb-4a0b-88cc-38c1734aa74b', '06cb180b-af2b-4e70-a7c1-c875c618b5bf', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('29bb1eb7-0529-4fca-b551-e8677ed0eb72', '10078594-2707-4c3f-a212-42add04fbd84', '60146fd4-7794-4dd7-a91f-8dad08a9759a', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2025-01-15 12:00:00' - interval '14 hours' - interval '34 mins', timestamp '2025-01-15 12:00:00' - interval '14 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5fe147cb-666d-40a6-9c85-bfe126cb8888', '29bb1eb7-0529-4fca-b551-e8677ed0eb72', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b315c887-e914-4021-a189-3ba55b987a5d', '29bb1eb7-0529-4fca-b551-e8677ed0eb72', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a32bce81-f640-4cf0-a4d4-f1bef4d9d8f2', '29bb1eb7-0529-4fca-b551-e8677ed0eb72', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ecce0946-4913-43b7-acd6-765cf1d9e3c7', '29bb1eb7-0529-4fca-b551-e8677ed0eb72', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('eb2917db-15fc-438c-9d26-2636bf19711d', '10078594-2707-4c3f-a212-42add04fbd84', 'b89cf1e1-6820-4efb-ad3e-9ab5b4f1bafa', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2025-01-15 12:00:00' - interval '30 hours' - interval '31 mins', timestamp '2025-01-15 12:00:00' - interval '30 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('04d1ce39-43a9-4570-a417-241b5a5454dd', 'eb2917db-15fc-438c-9d26-2636bf19711d', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1b1e36e4-9237-47d0-be6e-56dff8e60278', 'eb2917db-15fc-438c-9d26-2636bf19711d', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4204c633-ddf0-4409-8e6b-5af4e352f3e9', 'eb2917db-15fc-438c-9d26-2636bf19711d', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9422e3f4-8180-47f1-8ccb-3402d9442083', 'eb2917db-15fc-438c-9d26-2636bf19711d', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a8050298-4322-4e60-a41e-09ccad9c5178', '10078594-2707-4c3f-a212-42add04fbd84', '0db79881-0974-4a2d-a8a2-86efdb30bda1', 'b43a5dc5-d587-4940-a4ab-7d8a7ed44387', 'submitted', timestamp '2025-01-15 12:00:00' - interval '40 hours' - interval '27 mins', timestamp '2025-01-15 12:00:00' - interval '40 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2395084c-9f9d-4346-88ad-88aa360e50d0', 'a8050298-4322-4e60-a41e-09ccad9c5178', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2b58aee3-b97a-484d-a81e-7c45ca631c94', 'a8050298-4322-4e60-a41e-09ccad9c5178', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0328383d-45c5-4aef-94f4-bf20369623d6', 'a8050298-4322-4e60-a41e-09ccad9c5178', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2c2424b1-e9cc-48f0-b8d0-95219be79f63', 'a8050298-4322-4e60-a41e-09ccad9c5178', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('1353c657-342f-4dab-9821-263948530fc1', '10078594-2707-4c3f-a212-42add04fbd84', '60146fd4-7794-4dd7-a91f-8dad08a9759a', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2025-01-15 12:00:00' - interval '37 hours' - interval '42 mins', timestamp '2025-01-15 12:00:00' - interval '37 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('708bcaff-11bc-4949-9768-2a5383f88a18', '1353c657-342f-4dab-9821-263948530fc1', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7c2f5217-16c4-4c16-aba0-76129f1528ad', '1353c657-342f-4dab-9821-263948530fc1', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9194b5c9-52fc-411e-be10-e76ff162d640', '1353c657-342f-4dab-9821-263948530fc1', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9d729964-270a-45f6-9395-dd9911e04807', '1353c657-342f-4dab-9821-263948530fc1', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('33eca34f-d914-4c12-8af9-70a3d3dd6aae', '10078594-2707-4c3f-a212-42add04fbd84', 'b89cf1e1-6820-4efb-ad3e-9ab5b4f1bafa', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2025-01-15 12:00:00' - interval '15 hours' - interval '25 mins', timestamp '2025-01-15 12:00:00' - interval '15 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cc8741f2-834d-46e6-8c51-df6767d4db6c', '33eca34f-d914-4c12-8af9-70a3d3dd6aae', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2bc73aba-d8bc-450e-883e-6c5da15dea66', '33eca34f-d914-4c12-8af9-70a3d3dd6aae', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cd659ad8-f37b-400b-8693-dabe5f8ec3ff', '33eca34f-d914-4c12-8af9-70a3d3dd6aae', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('06dfa35d-525d-4163-9189-0417c28058f9', '33eca34f-d914-4c12-8af9-70a3d3dd6aae', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('f07e34e0-52b0-44eb-b017-8aade0bb633c', '10078594-2707-4c3f-a212-42add04fbd84', '0db79881-0974-4a2d-a8a2-86efdb30bda1', '72184d7d-905d-4a13-a136-8ff90c2cc349', 'submitted', timestamp '2025-01-15 12:00:00' - interval '54 hours' - interval '35 mins', timestamp '2025-01-15 12:00:00' - interval '54 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('80009d3b-78e6-48d6-b447-44d14ad45cc7', 'f07e34e0-52b0-44eb-b017-8aade0bb633c', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9d4583c9-abda-44ef-ae8b-9efa7210b303', 'f07e34e0-52b0-44eb-b017-8aade0bb633c', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('80800563-c98f-4c89-8a66-fdea1656b767', 'f07e34e0-52b0-44eb-b017-8aade0bb633c', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ad232b9a-e03d-416d-82d0-93008cdad7b7', 'f07e34e0-52b0-44eb-b017-8aade0bb633c', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('b29e7490-f332-4491-836e-9344bed8ad11', '10078594-2707-4c3f-a212-42add04fbd84', '60146fd4-7794-4dd7-a91f-8dad08a9759a', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2025-01-15 12:00:00' - interval '6 hours' - interval '37 mins', timestamp '2025-01-15 12:00:00' - interval '6 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('46b5399d-462e-43cc-b81a-2028b2f8725e', 'b29e7490-f332-4491-836e-9344bed8ad11', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('19ced39e-5429-420f-a5f0-d6a8a3fa6fe2', 'b29e7490-f332-4491-836e-9344bed8ad11', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('10cdd1a7-3889-4ccb-9b1e-c5519a74d8eb', 'b29e7490-f332-4491-836e-9344bed8ad11', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ac7f6cc0-a9c0-495e-931c-c7b311016349', 'b29e7490-f332-4491-836e-9344bed8ad11', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('5d967ed7-9e9e-4def-9fc7-5101c20fc0c5', '10078594-2707-4c3f-a212-42add04fbd84', 'b89cf1e1-6820-4efb-ad3e-9ab5b4f1bafa', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2025-01-15 12:00:00' - interval '8 hours' - interval '33 mins', timestamp '2025-01-15 12:00:00' - interval '8 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a196374c-bf11-455d-834f-603d3b0e112c', '5d967ed7-9e9e-4def-9fc7-5101c20fc0c5', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8a1e3258-11d2-450d-89b4-974d95a86431', '5d967ed7-9e9e-4def-9fc7-5101c20fc0c5', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4128a3a5-85e3-4f74-b9b1-b7f50875eb55', '5d967ed7-9e9e-4def-9fc7-5101c20fc0c5', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('981b5861-b28e-4bb0-aa9c-620cd851f718', '5d967ed7-9e9e-4def-9fc7-5101c20fc0c5', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('de3ded11-183a-4dff-b798-f95736de6b21', '10078594-2707-4c3f-a212-42add04fbd84', '0db79881-0974-4a2d-a8a2-86efdb30bda1', 'd061174f-dbec-4d68-a56d-ce41cdc205a6', 'submitted', timestamp '2025-01-15 12:00:00' - interval '66 hours' - interval '33 mins', timestamp '2025-01-15 12:00:00' - interval '66 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d0a49469-c8b7-4c41-9831-5949a893c1b6', 'de3ded11-183a-4dff-b798-f95736de6b21', '0feebb9e-7f45-4128-a54b-5d8d078d7694', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2c67ee3b-3e7c-4e11-9b16-45389c22f031', 'de3ded11-183a-4dff-b798-f95736de6b21', '499fa39c-6170-4adb-a41b-18f3f16b2aff', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0f883651-a7a2-403b-949f-db1f3926455d', 'de3ded11-183a-4dff-b798-f95736de6b21', '649147ea-84e0-46dc-ad4d-18d33ed8d7ff', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('be1cf0c1-9810-4687-a495-a4346ab4e01a', 'de3ded11-183a-4dff-b798-f95736de6b21', '2c2eb619-5709-41d6-a377-8d3b963a6ea3', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('ec4cba12-eda0-410d-b4f4-9580f4b81a82', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'ed333a6e-c080-4a61-a6dc-87a0e3220f22', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', timestamp '2026-06-15 12:00:00' - interval '7 hours' - interval '20 mins', timestamp '2026-06-15 12:00:00' - interval '7 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ce97334c-52bc-48e9-b335-31c799f27e07', 'ec4cba12-eda0-410d-b4f4-9580f4b81a82', '684fe08e-8aeb-4069-a864-a800f0e007aa', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('aec5c6fe-7fbd-424e-8baa-5d70551830dd', 'ec4cba12-eda0-410d-b4f4-9580f4b81a82', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1010953d-7f68-46d7-9edb-bbf2b8558986', 'ec4cba12-eda0-410d-b4f4-9580f4b81a82', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('35bae13a-6d1e-470a-b099-b13df6e3cc25', 'ec4cba12-eda0-410d-b4f4-9580f4b81a82', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bcac7b4b-b215-46c8-99e1-ffbc72cc6239', 'ec4cba12-eda0-410d-b4f4-9580f4b81a82', 'd503371e-a85d-4eea-ad83-a91291cf4297', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('6c6efc28-2cc7-4a74-b153-fac8432265c6', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'dd36e1bf-2797-42b4-ac06-cd142c99074f', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', timestamp '2026-06-15 12:00:00' - interval '55 hours' - interval '33 mins', timestamp '2026-06-15 12:00:00' - interval '55 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d0e0fb88-6839-479d-82fe-15a2847c6e7e', '6c6efc28-2cc7-4a74-b153-fac8432265c6', '684fe08e-8aeb-4069-a864-a800f0e007aa', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8f601c5e-f1f8-4cc4-b994-bc1a86313b83', '6c6efc28-2cc7-4a74-b153-fac8432265c6', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ece5db8a-7e91-4211-8efc-84b626b1584a', '6c6efc28-2cc7-4a74-b153-fac8432265c6', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('01d7f00b-d0ba-4bce-9e4d-219f45fd1e9a', '6c6efc28-2cc7-4a74-b153-fac8432265c6', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ff0c8339-68cc-4f38-85bd-0ae45e2654ed', '6c6efc28-2cc7-4a74-b153-fac8432265c6', 'd503371e-a85d-4eea-ad83-a91291cf4297', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('35a86ed8-8efd-4316-ba0e-700d0dbc7faa', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'b15cefcf-fdfb-4b27-ae31-d743f12c947d', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', timestamp '2026-06-15 12:00:00' - interval '23 hours' - interval '27 mins', timestamp '2026-06-15 12:00:00' - interval '23 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('16b19cae-67b1-45c2-a808-023d7f1c9b7e', '35a86ed8-8efd-4316-ba0e-700d0dbc7faa', '684fe08e-8aeb-4069-a864-a800f0e007aa', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cc9f6e5a-bfa3-4bbd-b3d8-eea431beace4', '35a86ed8-8efd-4316-ba0e-700d0dbc7faa', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d88cd6f3-6dbf-4b68-97e4-497a1120f637', '35a86ed8-8efd-4316-ba0e-700d0dbc7faa', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('89acefd5-647b-4283-b7ae-da57aa4f37fa', '35a86ed8-8efd-4316-ba0e-700d0dbc7faa', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0a2427b0-03ce-47c9-a835-fd75a31fceba', '35a86ed8-8efd-4316-ba0e-700d0dbc7faa', 'd503371e-a85d-4eea-ad83-a91291cf4297', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('6cc217ab-c496-433a-ba46-62e6856f15f8', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '098590f3-10cc-4859-a45f-f642a593a924', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', timestamp '2026-06-15 12:00:00' - interval '34 hours' - interval '25 mins', timestamp '2026-06-15 12:00:00' - interval '34 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8251ddf1-6e8f-476b-be53-4de211fdfa2f', '6cc217ab-c496-433a-ba46-62e6856f15f8', '684fe08e-8aeb-4069-a864-a800f0e007aa', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0df5363f-5000-4fc6-8dde-cbc3f92dc0e4', '6cc217ab-c496-433a-ba46-62e6856f15f8', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a17f1811-039b-4729-809d-a61c8812e563', '6cc217ab-c496-433a-ba46-62e6856f15f8', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('327c8518-6575-40f7-a353-cbea21f80cba', '6cc217ab-c496-433a-ba46-62e6856f15f8', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0573071b-0239-431e-b222-c77405d39b88', '6cc217ab-c496-433a-ba46-62e6856f15f8', 'd503371e-a85d-4eea-ad83-a91291cf4297', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('f71a9ca1-b6f6-4627-98e0-64d1ee839313', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '4c0e22db-7d9f-4312-a1d3-4fed4c7e3316', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', timestamp '2026-06-15 12:00:00' - interval '9 hours' - interval '43 mins', timestamp '2026-06-15 12:00:00' - interval '9 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3dedbbee-d10b-4cac-943a-e6504c15f9ff', 'f71a9ca1-b6f6-4627-98e0-64d1ee839313', '684fe08e-8aeb-4069-a864-a800f0e007aa', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c9ee26ba-ae4e-483f-a557-2e7f25880ff8', 'f71a9ca1-b6f6-4627-98e0-64d1ee839313', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d4e571a5-1474-4a69-87f4-234497775c71', 'f71a9ca1-b6f6-4627-98e0-64d1ee839313', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6264dbe8-3ebc-4d7e-aad5-156f915033dd', 'f71a9ca1-b6f6-4627-98e0-64d1ee839313', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a2480a8a-2af6-4e91-aee3-700ee4984631', 'f71a9ca1-b6f6-4627-98e0-64d1ee839313', 'd503371e-a85d-4eea-ad83-a91291cf4297', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d953757e-2682-4741-afb8-085f2242d6a1', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '1d3379fc-8094-4ff3-a4c7-fea65531bacd', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', timestamp '2026-06-15 12:00:00' - interval '72 hours' - interval '30 mins', timestamp '2026-06-15 12:00:00' - interval '72 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d16e7726-f072-46a1-9e01-e69bc1c0ad8c', 'd953757e-2682-4741-afb8-085f2242d6a1', '684fe08e-8aeb-4069-a864-a800f0e007aa', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d59e0f9f-12f2-4ba4-8e47-753f1a9d56e8', 'd953757e-2682-4741-afb8-085f2242d6a1', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('09b0c883-fe38-40bc-bca8-194b968319c1', 'd953757e-2682-4741-afb8-085f2242d6a1', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f1ef8cbd-92a1-4ba7-aee6-e263b2d4910b', 'd953757e-2682-4741-afb8-085f2242d6a1', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7abab7bc-1be7-474c-ba76-1d607f722461', 'd953757e-2682-4741-afb8-085f2242d6a1', 'd503371e-a85d-4eea-ad83-a91291cf4297', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7d999b59-41a4-4672-951b-961d70e60a08', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'ed333a6e-c080-4a61-a6dc-87a0e3220f22', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', timestamp '2026-06-15 12:00:00' - interval '38 hours' - interval '44 mins', timestamp '2026-06-15 12:00:00' - interval '38 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('909d7ad0-98d5-4096-936e-6768d611b485', '7d999b59-41a4-4672-951b-961d70e60a08', '684fe08e-8aeb-4069-a864-a800f0e007aa', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('10b0dc55-88db-43b5-b00d-bd9e29168992', '7d999b59-41a4-4672-951b-961d70e60a08', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1acf34db-77a8-49c9-a5e4-5d2dd2b05937', '7d999b59-41a4-4672-951b-961d70e60a08', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b130d2a7-0b36-44ad-acc6-1f73588220ad', '7d999b59-41a4-4672-951b-961d70e60a08', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5ec52883-16dd-4369-89af-f7b3ec0f4543', '7d999b59-41a4-4672-951b-961d70e60a08', 'd503371e-a85d-4eea-ad83-a91291cf4297', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('4784c0c8-191f-4e43-a51e-44bd9863e3c4', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'dd36e1bf-2797-42b4-ac06-cd142c99074f', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', timestamp '2026-06-15 12:00:00' - interval '64 hours' - interval '42 mins', timestamp '2026-06-15 12:00:00' - interval '64 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a69e6ae3-f08a-4292-8d57-a5938a5a9a48', '4784c0c8-191f-4e43-a51e-44bd9863e3c4', '684fe08e-8aeb-4069-a864-a800f0e007aa', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('481c1d00-bbac-486f-9364-5c6e280d4a77', '4784c0c8-191f-4e43-a51e-44bd9863e3c4', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2e0a9402-8823-48d0-b30c-da271147f228', '4784c0c8-191f-4e43-a51e-44bd9863e3c4', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('00f7b0ba-2d4d-4b3d-a011-42ce0d8bf1ab', '4784c0c8-191f-4e43-a51e-44bd9863e3c4', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('303d277c-95ba-40ba-ba61-329544dda58a', '4784c0c8-191f-4e43-a51e-44bd9863e3c4', 'd503371e-a85d-4eea-ad83-a91291cf4297', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('9a3de0bf-41e6-4a45-b0bf-a56e863644ef', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'b15cefcf-fdfb-4b27-ae31-d743f12c947d', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', timestamp '2026-06-15 12:00:00' - interval '54 hours' - interval '35 mins', timestamp '2026-06-15 12:00:00' - interval '54 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6f2b7676-73f3-49b5-aa9c-6d44562d454c', '9a3de0bf-41e6-4a45-b0bf-a56e863644ef', '684fe08e-8aeb-4069-a864-a800f0e007aa', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0d9fa003-7c09-4de2-9fc4-2e48df3b8673', '9a3de0bf-41e6-4a45-b0bf-a56e863644ef', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('baff03f2-6f89-4153-9249-831c211fc05e', '9a3de0bf-41e6-4a45-b0bf-a56e863644ef', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1e4fd044-c053-4fc6-be11-9b55e9467ab4', '9a3de0bf-41e6-4a45-b0bf-a56e863644ef', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('aa17624c-843e-4dc2-98ab-bbe6681935e7', '9a3de0bf-41e6-4a45-b0bf-a56e863644ef', 'd503371e-a85d-4eea-ad83-a91291cf4297', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d2b92db3-e334-410e-9aa1-8b6d1303dae7', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '098590f3-10cc-4859-a45f-f642a593a924', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', timestamp '2026-06-15 12:00:00' - interval '57 hours' - interval '39 mins', timestamp '2026-06-15 12:00:00' - interval '57 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ec6a0db2-c31e-4e85-8610-ab33232afb6f', 'd2b92db3-e334-410e-9aa1-8b6d1303dae7', '684fe08e-8aeb-4069-a864-a800f0e007aa', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0c8f2b1c-1b64-460d-8cc0-314898dd89f9', 'd2b92db3-e334-410e-9aa1-8b6d1303dae7', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9e7525de-2cb4-4133-ae9e-358a8264579d', 'd2b92db3-e334-410e-9aa1-8b6d1303dae7', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2b2ad2b1-10f5-4db5-8583-cc58cac39fd4', 'd2b92db3-e334-410e-9aa1-8b6d1303dae7', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('94cebcb9-5167-49d5-a4c2-e6ec3fc2512a', 'd2b92db3-e334-410e-9aa1-8b6d1303dae7', 'd503371e-a85d-4eea-ad83-a91291cf4297', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('4c2b6b3f-f5ba-4ef9-a6e0-300d29f341f4', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '4c0e22db-7d9f-4312-a1d3-4fed4c7e3316', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', timestamp '2026-06-15 12:00:00' - interval '9 hours' - interval '38 mins', timestamp '2026-06-15 12:00:00' - interval '9 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bc350dcb-b46d-4d2c-8690-691a96f48c00', '4c2b6b3f-f5ba-4ef9-a6e0-300d29f341f4', '684fe08e-8aeb-4069-a864-a800f0e007aa', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8205eb53-2c5b-4b2a-8038-38525495921d', '4c2b6b3f-f5ba-4ef9-a6e0-300d29f341f4', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('249a4888-1207-48a3-9e04-6d513757f342', '4c2b6b3f-f5ba-4ef9-a6e0-300d29f341f4', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f062ebe2-a1a6-466e-b5df-3ae753ce1c0b', '4c2b6b3f-f5ba-4ef9-a6e0-300d29f341f4', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bd22c74a-0651-44b2-891f-1ebcd1a1bca3', '4c2b6b3f-f5ba-4ef9-a6e0-300d29f341f4', 'd503371e-a85d-4eea-ad83-a91291cf4297', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('3c613fef-5ba0-451f-86d2-d99fba38f33a', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '1d3379fc-8094-4ff3-a4c7-fea65531bacd', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', timestamp '2026-06-15 12:00:00' - interval '9 hours' - interval '45 mins', timestamp '2026-06-15 12:00:00' - interval '9 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4c493ac4-7e01-4f50-986a-339f5f38e7ba', '3c613fef-5ba0-451f-86d2-d99fba38f33a', '684fe08e-8aeb-4069-a864-a800f0e007aa', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0772b0fb-ae03-49d1-9074-ae9b57d2c0cc', '3c613fef-5ba0-451f-86d2-d99fba38f33a', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('88f1b856-c676-47f2-b8d2-832f0a7d10fb', '3c613fef-5ba0-451f-86d2-d99fba38f33a', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fb5efe32-defa-4659-92e8-d7033b4b3635', '3c613fef-5ba0-451f-86d2-d99fba38f33a', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('17822a1e-abee-473a-90fb-6fbbd3cbd417', '3c613fef-5ba0-451f-86d2-d99fba38f33a', 'd503371e-a85d-4eea-ad83-a91291cf4297', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a98d863b-3ad6-4d23-8792-5fe8b3384930', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'ed333a6e-c080-4a61-a6dc-87a0e3220f22', 'c8a52987-c3a6-4368-a31c-a2f6566399f1', 'submitted', timestamp '2026-06-15 12:00:00' - interval '52 hours' - interval '21 mins', timestamp '2026-06-15 12:00:00' - interval '52 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('df5dfb61-9705-44d6-bfdc-2f33f74b4934', 'a98d863b-3ad6-4d23-8792-5fe8b3384930', '684fe08e-8aeb-4069-a864-a800f0e007aa', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e6a9d785-e40c-4e76-aadb-29fa3deea028', 'a98d863b-3ad6-4d23-8792-5fe8b3384930', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b75b6498-2497-4870-893e-7df0e3096dcf', 'a98d863b-3ad6-4d23-8792-5fe8b3384930', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('06436784-885a-410a-af16-4bf96d5e10de', 'a98d863b-3ad6-4d23-8792-5fe8b3384930', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ac21a58e-a13e-4e6b-afbe-8bad9f8927c6', 'a98d863b-3ad6-4d23-8792-5fe8b3384930', 'd503371e-a85d-4eea-ad83-a91291cf4297', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('9b877186-0cad-4dc9-ac31-a142133e86c0', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'dd36e1bf-2797-42b4-ac06-cd142c99074f', 'c8a52987-c3a6-4368-a31c-a2f6566399f1', 'submitted', timestamp '2026-06-15 12:00:00' - interval '51 hours' - interval '39 mins', timestamp '2026-06-15 12:00:00' - interval '51 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('74a35c40-157d-4c6e-929f-ff0a371fbae1', '9b877186-0cad-4dc9-ac31-a142133e86c0', '684fe08e-8aeb-4069-a864-a800f0e007aa', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f1ace979-932e-4b29-9097-831d34184ad7', '9b877186-0cad-4dc9-ac31-a142133e86c0', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c7de33b4-2a10-4948-aaf8-3c61091c57bc', '9b877186-0cad-4dc9-ac31-a142133e86c0', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0af6a783-b97d-4518-980b-7a1239593610', '9b877186-0cad-4dc9-ac31-a142133e86c0', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('04cc502b-e7dc-4465-bad1-50cae28c7ae7', '9b877186-0cad-4dc9-ac31-a142133e86c0', 'd503371e-a85d-4eea-ad83-a91291cf4297', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('90156dd8-cb0f-441c-a4e9-539c9b9b2c22', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'b15cefcf-fdfb-4b27-ae31-d743f12c947d', 'c8a52987-c3a6-4368-a31c-a2f6566399f1', 'submitted', timestamp '2026-06-15 12:00:00' - interval '53 hours' - interval '33 mins', timestamp '2026-06-15 12:00:00' - interval '53 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b2e2af25-ae30-43f1-a6a0-2b77bd91b761', '90156dd8-cb0f-441c-a4e9-539c9b9b2c22', '684fe08e-8aeb-4069-a864-a800f0e007aa', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2c861bba-99ab-4198-b3ee-a1a3a6f7f8f2', '90156dd8-cb0f-441c-a4e9-539c9b9b2c22', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3d325ddf-d16a-4f49-9127-47480a62e17e', '90156dd8-cb0f-441c-a4e9-539c9b9b2c22', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e192c3b1-3b0c-47fc-8884-17b2c49d5bad', '90156dd8-cb0f-441c-a4e9-539c9b9b2c22', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1fd4adf8-85e8-4fd9-9ded-06f86035cad0', '90156dd8-cb0f-441c-a4e9-539c9b9b2c22', 'd503371e-a85d-4eea-ad83-a91291cf4297', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('3dd6f624-1897-4321-a3ec-0849e53925c0', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '098590f3-10cc-4859-a45f-f642a593a924', 'c8a52987-c3a6-4368-a31c-a2f6566399f1', 'submitted', timestamp '2026-06-15 12:00:00' - interval '58 hours' - interval '40 mins', timestamp '2026-06-15 12:00:00' - interval '58 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b63c94cb-822e-46dc-ae96-7b93464e4e01', '3dd6f624-1897-4321-a3ec-0849e53925c0', '684fe08e-8aeb-4069-a864-a800f0e007aa', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b6a4a53f-4a10-4082-9a10-046b90d8b2a8', '3dd6f624-1897-4321-a3ec-0849e53925c0', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('274ae00c-4b50-498e-b9b8-f38abae64b53', '3dd6f624-1897-4321-a3ec-0849e53925c0', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d6f34a19-cbb9-4072-abec-3a905b733b38', '3dd6f624-1897-4321-a3ec-0849e53925c0', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ea19351c-dd4a-4cc5-b8a0-840f1b2182b2', '3dd6f624-1897-4321-a3ec-0849e53925c0', 'd503371e-a85d-4eea-ad83-a91291cf4297', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('4a026a23-37ad-42e0-9f79-4ea0b78b0eb8', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '4c0e22db-7d9f-4312-a1d3-4fed4c7e3316', 'c8a52987-c3a6-4368-a31c-a2f6566399f1', 'submitted', timestamp '2026-06-15 12:00:00' - interval '70 hours' - interval '38 mins', timestamp '2026-06-15 12:00:00' - interval '70 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e9391ddb-98bc-4812-a56c-b44f289d18fa', '4a026a23-37ad-42e0-9f79-4ea0b78b0eb8', '684fe08e-8aeb-4069-a864-a800f0e007aa', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4d9f8f1e-2ee2-43e4-9cf0-b1a79b9d8a75', '4a026a23-37ad-42e0-9f79-4ea0b78b0eb8', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('74898591-e4c0-4912-b467-9a056f3eb6fa', '4a026a23-37ad-42e0-9f79-4ea0b78b0eb8', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ad25f9b2-5481-473c-bb73-6add246b19f6', '4a026a23-37ad-42e0-9f79-4ea0b78b0eb8', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4c288212-68a8-412d-9209-1c239e9ea5db', '4a026a23-37ad-42e0-9f79-4ea0b78b0eb8', 'd503371e-a85d-4eea-ad83-a91291cf4297', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('9680634a-1df9-45c5-b47f-a7df3b3202e5', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '1d3379fc-8094-4ff3-a4c7-fea65531bacd', 'c8a52987-c3a6-4368-a31c-a2f6566399f1', 'submitted', timestamp '2026-06-15 12:00:00' - interval '22 hours' - interval '43 mins', timestamp '2026-06-15 12:00:00' - interval '22 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d0f58e37-8a51-4945-8c1d-b71669c3055f', '9680634a-1df9-45c5-b47f-a7df3b3202e5', '684fe08e-8aeb-4069-a864-a800f0e007aa', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('24997790-bb88-4f84-865b-1e7ce970bab9', '9680634a-1df9-45c5-b47f-a7df3b3202e5', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('49102a42-b07a-4bdd-9f1f-334ca90f3377', '9680634a-1df9-45c5-b47f-a7df3b3202e5', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7cf7dfe4-a3f0-423a-9889-f2a780ceacbe', '9680634a-1df9-45c5-b47f-a7df3b3202e5', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('809964d3-70f6-4ffa-83e8-66390cc9e91c', '9680634a-1df9-45c5-b47f-a7df3b3202e5', 'd503371e-a85d-4eea-ad83-a91291cf4297', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('6653964b-621b-4c2d-9cb2-1130815bb293', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'ed333a6e-c080-4a61-a6dc-87a0e3220f22', 'cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'submitted', timestamp '2026-06-15 12:00:00' - interval '8 hours' - interval '40 mins', timestamp '2026-06-15 12:00:00' - interval '8 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fe308930-3597-4b81-9c9c-fa6aa21c854a', '6653964b-621b-4c2d-9cb2-1130815bb293', '684fe08e-8aeb-4069-a864-a800f0e007aa', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('562f9be8-99e4-4368-b2d2-01ea42f7ae9b', '6653964b-621b-4c2d-9cb2-1130815bb293', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e3b185ee-e88f-4974-8224-6d3146095068', '6653964b-621b-4c2d-9cb2-1130815bb293', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('217aba9b-415f-4bf0-aa9e-9984e2983b5b', '6653964b-621b-4c2d-9cb2-1130815bb293', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c259e35c-ce7a-4da6-819b-8ee850e59b04', '6653964b-621b-4c2d-9cb2-1130815bb293', 'd503371e-a85d-4eea-ad83-a91291cf4297', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('1ef28b07-4940-42bf-b83e-382c7a4bee34', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'dd36e1bf-2797-42b4-ac06-cd142c99074f', 'cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'submitted', timestamp '2026-06-15 12:00:00' - interval '60 hours' - interval '45 mins', timestamp '2026-06-15 12:00:00' - interval '60 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('de0e3eb4-b96c-4489-ae68-8646ca0678c1', '1ef28b07-4940-42bf-b83e-382c7a4bee34', '684fe08e-8aeb-4069-a864-a800f0e007aa', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a324c83b-e056-4042-912f-95a5cc0e725b', '1ef28b07-4940-42bf-b83e-382c7a4bee34', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('409eaa53-d0b4-4f55-8048-b09bb0187f5f', '1ef28b07-4940-42bf-b83e-382c7a4bee34', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9cca8c19-7cb0-4344-a246-da4dffd5f103', '1ef28b07-4940-42bf-b83e-382c7a4bee34', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d3206b95-0fbc-4877-beb8-ef3c4244d4e5', '1ef28b07-4940-42bf-b83e-382c7a4bee34', 'd503371e-a85d-4eea-ad83-a91291cf4297', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('4b072618-0101-4313-9bb3-ceedaab7990c', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'b15cefcf-fdfb-4b27-ae31-d743f12c947d', 'cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'submitted', timestamp '2026-06-15 12:00:00' - interval '26 hours' - interval '22 mins', timestamp '2026-06-15 12:00:00' - interval '26 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fb6da3b6-01e9-4257-9f6c-2823e5ca14da', '4b072618-0101-4313-9bb3-ceedaab7990c', '684fe08e-8aeb-4069-a864-a800f0e007aa', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e3de2261-3307-4445-96e6-ff68b5fc9d4f', '4b072618-0101-4313-9bb3-ceedaab7990c', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d408178b-4074-4692-96c9-561ce6c93361', '4b072618-0101-4313-9bb3-ceedaab7990c', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d33c520a-6270-407d-9b3d-f3c8ff84c161', '4b072618-0101-4313-9bb3-ceedaab7990c', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9a0dbb60-da6e-4c66-a516-20ddb3eaf3f2', '4b072618-0101-4313-9bb3-ceedaab7990c', 'd503371e-a85d-4eea-ad83-a91291cf4297', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('ef9bd2ef-7a7a-4ffb-a013-37bac7ab36bd', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '098590f3-10cc-4859-a45f-f642a593a924', 'cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'submitted', timestamp '2026-06-15 12:00:00' - interval '65 hours' - interval '22 mins', timestamp '2026-06-15 12:00:00' - interval '65 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4e487e1a-59b0-4830-a6c1-81fdf78ce503', 'ef9bd2ef-7a7a-4ffb-a013-37bac7ab36bd', '684fe08e-8aeb-4069-a864-a800f0e007aa', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('43fe53ef-fcf6-4333-8912-544623fe4c23', 'ef9bd2ef-7a7a-4ffb-a013-37bac7ab36bd', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a25e241d-cebb-4be8-b510-eb6fd1a5c9f6', 'ef9bd2ef-7a7a-4ffb-a013-37bac7ab36bd', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c3df6876-e04f-4877-92bb-ca573690c7ef', 'ef9bd2ef-7a7a-4ffb-a013-37bac7ab36bd', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d7d44844-825a-4f0f-b4e3-1a9612bfb840', 'ef9bd2ef-7a7a-4ffb-a013-37bac7ab36bd', 'd503371e-a85d-4eea-ad83-a91291cf4297', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('984c8413-bad8-412f-af1d-1e6a43c0ec21', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '4c0e22db-7d9f-4312-a1d3-4fed4c7e3316', 'cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'submitted', timestamp '2026-06-15 12:00:00' - interval '69 hours' - interval '37 mins', timestamp '2026-06-15 12:00:00' - interval '69 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ff990312-c24f-4abb-a521-9267077161ba', '984c8413-bad8-412f-af1d-1e6a43c0ec21', '684fe08e-8aeb-4069-a864-a800f0e007aa', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('75adbe74-b68b-4ab6-b06e-4abf05a3b9e1', '984c8413-bad8-412f-af1d-1e6a43c0ec21', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a56e7904-24f8-4030-a017-c6c32cfd0b8f', '984c8413-bad8-412f-af1d-1e6a43c0ec21', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4f7f3111-f14f-4cd7-a85c-24ab597c2239', '984c8413-bad8-412f-af1d-1e6a43c0ec21', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cad03e13-3cb9-4391-8dc4-9b274c29b725', '984c8413-bad8-412f-af1d-1e6a43c0ec21', 'd503371e-a85d-4eea-ad83-a91291cf4297', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7d16fcba-0a5f-4f07-a926-37b2612fa797', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '1d3379fc-8094-4ff3-a4c7-fea65531bacd', 'cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'submitted', timestamp '2026-06-15 12:00:00' - interval '31 hours' - interval '32 mins', timestamp '2026-06-15 12:00:00' - interval '31 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('81f82234-bc78-410e-a8d0-88dade87cbd1', '7d16fcba-0a5f-4f07-a926-37b2612fa797', '684fe08e-8aeb-4069-a864-a800f0e007aa', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fe868170-f79a-42e2-88a6-68211a9c2097', '7d16fcba-0a5f-4f07-a926-37b2612fa797', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f44ab358-1cde-4d0e-8283-fdafddab84d1', '7d16fcba-0a5f-4f07-a926-37b2612fa797', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('75b76d43-704f-43b6-9fc1-3ea64843b18d', '7d16fcba-0a5f-4f07-a926-37b2612fa797', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('50e69508-11e5-4c6d-8291-cb9587b278ae', '7d16fcba-0a5f-4f07-a926-37b2612fa797', 'd503371e-a85d-4eea-ad83-a91291cf4297', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('c938652c-0469-428a-8628-218971b3e831', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'ed333a6e-c080-4a61-a6dc-87a0e3220f22', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', timestamp '2026-06-15 12:00:00' - interval '60 hours' - interval '45 mins', timestamp '2026-06-15 12:00:00' - interval '60 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ffaf1a1c-61c5-4634-ac05-956f7f217a39', 'c938652c-0469-428a-8628-218971b3e831', '684fe08e-8aeb-4069-a864-a800f0e007aa', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a051f929-b7dd-4958-856b-55b53142e43c', 'c938652c-0469-428a-8628-218971b3e831', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a9e75fcc-fa5f-402d-a882-be93f3bd7dab', 'c938652c-0469-428a-8628-218971b3e831', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b18097d5-f657-4be4-8bed-3458d09aeacf', 'c938652c-0469-428a-8628-218971b3e831', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('91abbdbd-1144-43e1-97b2-e91cb1555a6a', 'c938652c-0469-428a-8628-218971b3e831', 'd503371e-a85d-4eea-ad83-a91291cf4297', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a472ff51-ca9c-4a61-98d7-47adcfc293d5', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '098590f3-10cc-4859-a45f-f642a593a924', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', timestamp '2026-06-15 12:00:00' - interval '20 hours' - interval '27 mins', timestamp '2026-06-15 12:00:00' - interval '20 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3bdfd242-c207-4c3e-a622-37684b7a9cab', 'a472ff51-ca9c-4a61-98d7-47adcfc293d5', '684fe08e-8aeb-4069-a864-a800f0e007aa', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c37d2ead-f8c0-4fcb-89a1-8a53435485f2', 'a472ff51-ca9c-4a61-98d7-47adcfc293d5', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('88c8950c-d98a-4399-bc40-2977840ca5bd', 'a472ff51-ca9c-4a61-98d7-47adcfc293d5', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c40fe204-cd6b-4608-b25b-a8a420ed41e3', 'a472ff51-ca9c-4a61-98d7-47adcfc293d5', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('512d08d7-bbe5-413c-ba83-9aa5bddd221e', 'a472ff51-ca9c-4a61-98d7-47adcfc293d5', 'd503371e-a85d-4eea-ad83-a91291cf4297', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('53e9962f-a593-4578-9510-0720c7637008', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'dd36e1bf-2797-42b4-ac06-cd142c99074f', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'in_progress', timestamp '2026-06-15 12:00:00' - interval '66 hours' - interval '38 mins', timestamp '2026-06-15 12:00:00' - interval '66 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2279fa32-0a4b-4db2-9e95-6790115120ab', '53e9962f-a593-4578-9510-0720c7637008', '684fe08e-8aeb-4069-a864-a800f0e007aa', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e3535224-0448-4ffb-8a0f-74692a676be4', '53e9962f-a593-4578-9510-0720c7637008', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('35c7c8df-2deb-4644-aefb-aaabf12e9ef2', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'ed333a6e-c080-4a61-a6dc-87a0e3220f22', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', timestamp '2026-06-15 12:00:00' - interval '7 hours' - interval '41 mins', timestamp '2026-06-15 12:00:00' - interval '7 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('89d4cace-715d-4e77-95eb-1ae3a4d1f217', '35c7c8df-2deb-4644-aefb-aaabf12e9ef2', '684fe08e-8aeb-4069-a864-a800f0e007aa', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6686a518-9ede-4d0c-ade7-6702574704ee', '35c7c8df-2deb-4644-aefb-aaabf12e9ef2', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('86aadebf-9db8-4221-8931-2c71c29ae399', '35c7c8df-2deb-4644-aefb-aaabf12e9ef2', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('95a9ff51-6c7a-4421-a802-bfda8096edc3', '35c7c8df-2deb-4644-aefb-aaabf12e9ef2', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('65488fc2-0276-4f84-812c-58e908a858b2', '35c7c8df-2deb-4644-aefb-aaabf12e9ef2', 'd503371e-a85d-4eea-ad83-a91291cf4297', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('83add782-31d3-48c5-85af-2e2adbf6f337', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'dd36e1bf-2797-42b4-ac06-cd142c99074f', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', timestamp '2026-06-15 12:00:00' - interval '61 hours' - interval '30 mins', timestamp '2026-06-15 12:00:00' - interval '61 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b1d20912-7419-45e7-af05-fe7c9678535f', '83add782-31d3-48c5-85af-2e2adbf6f337', '684fe08e-8aeb-4069-a864-a800f0e007aa', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c8631586-07b4-428f-b248-64d00ccb266c', '83add782-31d3-48c5-85af-2e2adbf6f337', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2d619979-6786-4792-a24e-8e82c8549d91', '83add782-31d3-48c5-85af-2e2adbf6f337', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4c66abfb-9629-47c8-8894-95ccda7bd083', '83add782-31d3-48c5-85af-2e2adbf6f337', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bde4c862-c75d-435a-82ec-b1b5f132050b', '83add782-31d3-48c5-85af-2e2adbf6f337', 'd503371e-a85d-4eea-ad83-a91291cf4297', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a6e51282-c91d-4ecb-ac43-b9ea81421815', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', 'b15cefcf-fdfb-4b27-ae31-d743f12c947d', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', timestamp '2026-06-15 12:00:00' - interval '23 hours' - interval '43 mins', timestamp '2026-06-15 12:00:00' - interval '23 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a1bd02ab-2b7f-47ef-89f6-9aabd397d2df', 'a6e51282-c91d-4ecb-ac43-b9ea81421815', '684fe08e-8aeb-4069-a864-a800f0e007aa', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1817df90-c88f-493f-a80a-5a8312ccfd87', 'a6e51282-c91d-4ecb-ac43-b9ea81421815', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('99ec47aa-589b-4938-9191-b07821555a27', 'a6e51282-c91d-4ecb-ac43-b9ea81421815', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('df24c737-6377-46d1-b1ac-ae67751a2aba', 'a6e51282-c91d-4ecb-ac43-b9ea81421815', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d27eb276-1c3c-4a8f-a0bd-4531e366e39f', 'a6e51282-c91d-4ecb-ac43-b9ea81421815', 'd503371e-a85d-4eea-ad83-a91291cf4297', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('b86177ee-0486-4126-9b8a-3bf0b7351be3', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '098590f3-10cc-4859-a45f-f642a593a924', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', timestamp '2026-06-15 12:00:00' - interval '64 hours' - interval '24 mins', timestamp '2026-06-15 12:00:00' - interval '64 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('87c53601-304d-43da-9fa4-1f8db8f0885b', 'b86177ee-0486-4126-9b8a-3bf0b7351be3', '684fe08e-8aeb-4069-a864-a800f0e007aa', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a6721f5a-c716-4d55-8862-2d0993e6d696', 'b86177ee-0486-4126-9b8a-3bf0b7351be3', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ddc219b1-8079-4492-9950-57cc9be67ec6', 'b86177ee-0486-4126-9b8a-3bf0b7351be3', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c170f637-689d-45e9-83fe-989407c3deaa', 'b86177ee-0486-4126-9b8a-3bf0b7351be3', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5ff11273-8776-4492-871c-87d10c0cfaa1', 'b86177ee-0486-4126-9b8a-3bf0b7351be3', 'd503371e-a85d-4eea-ad83-a91291cf4297', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('551094e5-2b95-4f82-b21a-fee3539e43fd', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '4c0e22db-7d9f-4312-a1d3-4fed4c7e3316', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', timestamp '2026-06-15 12:00:00' - interval '20 hours' - interval '30 mins', timestamp '2026-06-15 12:00:00' - interval '20 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9228bad0-b73e-4056-9426-82d26c085d2f', '551094e5-2b95-4f82-b21a-fee3539e43fd', '684fe08e-8aeb-4069-a864-a800f0e007aa', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b38da8d6-a35e-4b7b-a79b-1fdeed08bdbd', '551094e5-2b95-4f82-b21a-fee3539e43fd', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d6bb7125-dc11-444b-b687-518f33d69e77', '551094e5-2b95-4f82-b21a-fee3539e43fd', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c751606d-61b5-4b22-b7fb-39f64dfe4057', '551094e5-2b95-4f82-b21a-fee3539e43fd', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c087e3f4-9e84-4bc0-9e9e-58dc781464f3', '551094e5-2b95-4f82-b21a-fee3539e43fd', 'd503371e-a85d-4eea-ad83-a91291cf4297', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('6525ecbf-daf1-4e33-bd9c-4dd488eb1b32', 'e14683dc-6ac1-4c73-a2cb-da24e9e4f45f', '1d3379fc-8094-4ff3-a4c7-fea65531bacd', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', timestamp '2026-06-15 12:00:00' - interval '25 hours' - interval '35 mins', timestamp '2026-06-15 12:00:00' - interval '25 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('55629d13-cbd8-48eb-98c7-261d490c686a', '6525ecbf-daf1-4e33-bd9c-4dd488eb1b32', '684fe08e-8aeb-4069-a864-a800f0e007aa', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c16a0f3a-3adf-4cff-ba8d-0df835623f8b', '6525ecbf-daf1-4e33-bd9c-4dd488eb1b32', '6ddc3532-8a5c-41f0-a01c-80467a94d895', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d923da38-9a1a-411a-ae1f-3ba311d63c91', '6525ecbf-daf1-4e33-bd9c-4dd488eb1b32', 'df2ffbe9-f3d9-4636-aa1a-2208d49f12d6', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('eb66773a-87fa-4212-add8-fbf51928a748', '6525ecbf-daf1-4e33-bd9c-4dd488eb1b32', 'fb8af623-bf3b-4522-a586-ff6e8bfec072', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('414b6929-d2af-4daa-903d-9795fb18c638', '6525ecbf-daf1-4e33-bd9c-4dd488eb1b32', 'd503371e-a85d-4eea-ad83-a91291cf4297', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('6d1f5b4c-5b0a-45cb-b42a-f3fc611dc74d', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '8bda2f9b-55db-4d33-a40d-f8a111e93a24', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', timestamp '2025-12-20 12:00:00' - interval '61 hours' - interval '27 mins', timestamp '2025-12-20 12:00:00' - interval '61 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0c574444-9572-46c8-880e-2672c7d3c867', '6d1f5b4c-5b0a-45cb-b42a-f3fc611dc74d', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8bba81c5-da63-4555-a26f-cc9abeebc73b', '6d1f5b4c-5b0a-45cb-b42a-f3fc611dc74d', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('31baa83b-75c0-4feb-a619-7ab3bcb215ca', '6d1f5b4c-5b0a-45cb-b42a-f3fc611dc74d', '2a39ada5-da79-4403-aec0-8299b6747419', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('833360db-b02d-424b-b9ec-090259efd409', '6d1f5b4c-5b0a-45cb-b42a-f3fc611dc74d', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ea4fcf0b-3979-4301-b0d5-77b4b0ff8371', '6d1f5b4c-5b0a-45cb-b42a-f3fc611dc74d', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('aaa475aa-28d6-4b59-b279-9f79504b554c', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '427540fb-9f60-4bfd-afa2-4db31ec63cd4', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', timestamp '2025-12-20 12:00:00' - interval '46 hours' - interval '31 mins', timestamp '2025-12-20 12:00:00' - interval '46 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7ecd5e0a-2c0c-4030-ac45-d84b1b597aae', 'aaa475aa-28d6-4b59-b279-9f79504b554c', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4d62a935-37d8-4b99-8d33-1cda8fdf3543', 'aaa475aa-28d6-4b59-b279-9f79504b554c', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('76be6407-d1c6-435f-a6b3-1b2f7e7984e2', 'aaa475aa-28d6-4b59-b279-9f79504b554c', '2a39ada5-da79-4403-aec0-8299b6747419', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cf6b35c6-2311-4801-a883-32699ea563dc', 'aaa475aa-28d6-4b59-b279-9f79504b554c', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f5c2c325-931e-461b-9c05-d7599fb2cc87', 'aaa475aa-28d6-4b59-b279-9f79504b554c', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d02950c8-c791-42ab-8ad7-38fdfcb98e3a', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '22646e69-d22a-4b34-aa2b-f1323161d52d', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', timestamp '2025-12-20 12:00:00' - interval '4 hours' - interval '43 mins', timestamp '2025-12-20 12:00:00' - interval '4 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3896fa2d-a808-4c03-9238-cd5b0b53af96', 'd02950c8-c791-42ab-8ad7-38fdfcb98e3a', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e5456caf-f731-44fa-b00b-a705f1e115c7', 'd02950c8-c791-42ab-8ad7-38fdfcb98e3a', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0c2fa158-f231-4b66-9569-fdf1a5c80b15', 'd02950c8-c791-42ab-8ad7-38fdfcb98e3a', '2a39ada5-da79-4403-aec0-8299b6747419', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('60288ae3-d144-4d10-9a4b-3bb63d052691', 'd02950c8-c791-42ab-8ad7-38fdfcb98e3a', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c518b4b8-b939-43cb-a514-6635091b00fa', 'd02950c8-c791-42ab-8ad7-38fdfcb98e3a', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('8caf2fe8-a381-4ba3-bae8-aa82ef3644bf', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'b37a7c3f-91c4-4a63-a51d-2b19f3bc7992', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', timestamp '2025-12-20 12:00:00' - interval '60 hours' - interval '33 mins', timestamp '2025-12-20 12:00:00' - interval '60 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2cff5d3e-f486-4756-8a1a-53b2b00e7a1f', '8caf2fe8-a381-4ba3-bae8-aa82ef3644bf', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('74e6defa-ce75-4578-b5dd-0a42307a6c07', '8caf2fe8-a381-4ba3-bae8-aa82ef3644bf', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bad6ea4b-e949-4498-8b4e-6f5d2c3dc6f7', '8caf2fe8-a381-4ba3-bae8-aa82ef3644bf', '2a39ada5-da79-4403-aec0-8299b6747419', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('823c07e1-da80-4c6b-80ab-f977ac109dba', '8caf2fe8-a381-4ba3-bae8-aa82ef3644bf', '26a1a51f-ab67-405d-a737-b184d060edb8', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1bfbf0f5-4687-462f-9759-ca298d251392', '8caf2fe8-a381-4ba3-bae8-aa82ef3644bf', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('6fc8c876-cc92-497f-a3cd-590baef73368', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '8bda2f9b-55db-4d33-a40d-f8a111e93a24', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', timestamp '2025-12-20 12:00:00' - interval '12 hours' - interval '21 mins', timestamp '2025-12-20 12:00:00' - interval '12 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d9720b0a-8f8e-4bc6-895c-a4cb4ed07df3', '6fc8c876-cc92-497f-a3cd-590baef73368', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('37d4927b-7e22-4852-9640-2d0761a569f9', '6fc8c876-cc92-497f-a3cd-590baef73368', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b560550a-a3c0-4f4a-ac57-16bd874be9f6', '6fc8c876-cc92-497f-a3cd-590baef73368', '2a39ada5-da79-4403-aec0-8299b6747419', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3d9ca575-f176-490f-b69a-e14e20253e95', '6fc8c876-cc92-497f-a3cd-590baef73368', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('57ae293c-dc5d-40bb-8826-3912eb48167c', '6fc8c876-cc92-497f-a3cd-590baef73368', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('0b4a4d54-dc7a-45c5-be4e-fe39f1680a13', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '427540fb-9f60-4bfd-afa2-4db31ec63cd4', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', timestamp '2025-12-20 12:00:00' - interval '71 hours' - interval '20 mins', timestamp '2025-12-20 12:00:00' - interval '71 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('591d5fbc-d72f-4889-b7dc-dfb7e8ab7a79', '0b4a4d54-dc7a-45c5-be4e-fe39f1680a13', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ce6a3aa9-af91-492b-824b-22165a32b84a', '0b4a4d54-dc7a-45c5-be4e-fe39f1680a13', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fc7cc672-f651-4d63-b1ee-4e1e3b5e23db', '0b4a4d54-dc7a-45c5-be4e-fe39f1680a13', '2a39ada5-da79-4403-aec0-8299b6747419', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a182a802-dfbd-44e8-b9c5-fe5711c720cd', '0b4a4d54-dc7a-45c5-be4e-fe39f1680a13', '26a1a51f-ab67-405d-a737-b184d060edb8', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('260e52cc-4240-4757-93dc-2f4e27d60fff', '0b4a4d54-dc7a-45c5-be4e-fe39f1680a13', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('995747df-2155-4c45-ae1f-2dd78921f2da', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '22646e69-d22a-4b34-aa2b-f1323161d52d', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', timestamp '2025-12-20 12:00:00' - interval '28 hours' - interval '30 mins', timestamp '2025-12-20 12:00:00' - interval '28 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1347c261-e77d-46ab-b6f8-dfd68eae67ec', '995747df-2155-4c45-ae1f-2dd78921f2da', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6d241e99-6817-4911-8a88-34047b45d429', '995747df-2155-4c45-ae1f-2dd78921f2da', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a04d19f3-7a1c-43c3-9b1e-db484e468c38', '995747df-2155-4c45-ae1f-2dd78921f2da', '2a39ada5-da79-4403-aec0-8299b6747419', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8a711dda-407c-4ef0-940d-ca71b5ce1347', '995747df-2155-4c45-ae1f-2dd78921f2da', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d1d51946-f7f5-40a4-af0d-667e8c43d656', '995747df-2155-4c45-ae1f-2dd78921f2da', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7028e660-e637-4cb6-8027-bd15283c2f7c', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'b37a7c3f-91c4-4a63-a51d-2b19f3bc7992', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', timestamp '2025-12-20 12:00:00' - interval '12 hours' - interval '23 mins', timestamp '2025-12-20 12:00:00' - interval '12 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e88a4306-843d-4606-895f-f0b3f6d9d090', '7028e660-e637-4cb6-8027-bd15283c2f7c', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7b630f22-e94b-48a3-b513-4a10dced5391', '7028e660-e637-4cb6-8027-bd15283c2f7c', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3952f1e2-e820-4a0e-b204-14fe18d9f317', '7028e660-e637-4cb6-8027-bd15283c2f7c', '2a39ada5-da79-4403-aec0-8299b6747419', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('828a45f3-7745-4b70-9080-16d58970abc2', '7028e660-e637-4cb6-8027-bd15283c2f7c', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3450959f-cbce-4078-abd4-cc434c584a44', '7028e660-e637-4cb6-8027-bd15283c2f7c', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('6dfa6a53-cf57-4c4a-b8c7-ffe8141e388f', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '8bda2f9b-55db-4d33-a40d-f8a111e93a24', 'c8a52987-c3a6-4368-a31c-a2f6566399f1', 'submitted', timestamp '2025-12-20 12:00:00' - interval '26 hours' - interval '24 mins', timestamp '2025-12-20 12:00:00' - interval '26 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('89004ff5-b4d6-419a-bdcd-eda6b12280ad', '6dfa6a53-cf57-4c4a-b8c7-ffe8141e388f', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('75ef98fb-18fe-468c-9244-02d199654344', '6dfa6a53-cf57-4c4a-b8c7-ffe8141e388f', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3727a1d0-cced-49b8-9bc7-a61473d17204', '6dfa6a53-cf57-4c4a-b8c7-ffe8141e388f', '2a39ada5-da79-4403-aec0-8299b6747419', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('93e4d6a1-d798-447e-a6b3-28e1024b050a', '6dfa6a53-cf57-4c4a-b8c7-ffe8141e388f', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cb3c7b78-9eae-4cc6-9366-47455d982824', '6dfa6a53-cf57-4c4a-b8c7-ffe8141e388f', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('782f3573-ea1d-4499-b22a-f6b01b8c4cd3', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '427540fb-9f60-4bfd-afa2-4db31ec63cd4', 'c8a52987-c3a6-4368-a31c-a2f6566399f1', 'submitted', timestamp '2025-12-20 12:00:00' - interval '32 hours' - interval '35 mins', timestamp '2025-12-20 12:00:00' - interval '32 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('80e91ab7-3e46-422a-a887-03222a4ab383', '782f3573-ea1d-4499-b22a-f6b01b8c4cd3', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6ee5e9a7-c502-49e8-bf3c-9bdfd9a590b0', '782f3573-ea1d-4499-b22a-f6b01b8c4cd3', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2b7705b8-99e3-44f3-865b-0566e8f24ae8', '782f3573-ea1d-4499-b22a-f6b01b8c4cd3', '2a39ada5-da79-4403-aec0-8299b6747419', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('feda232f-2682-4047-b5e0-d4f0c1dfdb90', '782f3573-ea1d-4499-b22a-f6b01b8c4cd3', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a148c173-9bc1-417c-b2e7-1496f3b942b3', '782f3573-ea1d-4499-b22a-f6b01b8c4cd3', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('f2802cf4-9e86-4fa2-baa9-fe286e0a6770', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '22646e69-d22a-4b34-aa2b-f1323161d52d', 'c8a52987-c3a6-4368-a31c-a2f6566399f1', 'submitted', timestamp '2025-12-20 12:00:00' - interval '40 hours' - interval '44 mins', timestamp '2025-12-20 12:00:00' - interval '40 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5871d01c-9774-46a3-8534-aba3a3f530fe', 'f2802cf4-9e86-4fa2-baa9-fe286e0a6770', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('30a9c771-3952-40d1-aee9-62554a87c090', 'f2802cf4-9e86-4fa2-baa9-fe286e0a6770', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bcbfb530-44c5-4e28-b8e7-633c9abb3eac', 'f2802cf4-9e86-4fa2-baa9-fe286e0a6770', '2a39ada5-da79-4403-aec0-8299b6747419', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c42a1a59-3cba-401b-9ec9-58444c4911f0', 'f2802cf4-9e86-4fa2-baa9-fe286e0a6770', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5ce73b1e-85b3-4655-9b0d-7f29bfa555e8', 'f2802cf4-9e86-4fa2-baa9-fe286e0a6770', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d3affbab-80df-42d4-b422-406cd1ed5b9c', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'b37a7c3f-91c4-4a63-a51d-2b19f3bc7992', 'c8a52987-c3a6-4368-a31c-a2f6566399f1', 'submitted', timestamp '2025-12-20 12:00:00' - interval '24 hours' - interval '26 mins', timestamp '2025-12-20 12:00:00' - interval '24 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('923146f3-a3ef-4d9e-8207-7a0663f7bf2d', 'd3affbab-80df-42d4-b422-406cd1ed5b9c', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1288c191-7a4a-4d23-9e7d-e2c5af57fdbd', 'd3affbab-80df-42d4-b422-406cd1ed5b9c', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bb36f4d1-14f3-445b-9f14-979a58e0fa15', 'd3affbab-80df-42d4-b422-406cd1ed5b9c', '2a39ada5-da79-4403-aec0-8299b6747419', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e051c55c-74c2-4a1f-97ca-02666f31c17c', 'd3affbab-80df-42d4-b422-406cd1ed5b9c', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8a569e64-6f12-40b5-a0e3-d23a83057379', 'd3affbab-80df-42d4-b422-406cd1ed5b9c', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('3db2905e-b623-4064-9b1e-2471fdcf5d90', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '8bda2f9b-55db-4d33-a40d-f8a111e93a24', 'cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'submitted', timestamp '2025-12-20 12:00:00' - interval '26 hours' - interval '28 mins', timestamp '2025-12-20 12:00:00' - interval '26 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d317fd16-08e5-4c0f-8bff-adfb6773c671', '3db2905e-b623-4064-9b1e-2471fdcf5d90', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6a6fcb7a-37f7-4bbd-a86f-373649a70654', '3db2905e-b623-4064-9b1e-2471fdcf5d90', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6ea014aa-5341-4243-9a08-24577f3573c7', '3db2905e-b623-4064-9b1e-2471fdcf5d90', '2a39ada5-da79-4403-aec0-8299b6747419', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('761fa249-deed-4a99-a185-e16962eb4d31', '3db2905e-b623-4064-9b1e-2471fdcf5d90', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5a391dc5-f366-47cb-af6d-3e6b56f158be', '3db2905e-b623-4064-9b1e-2471fdcf5d90', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('45820025-20e4-4454-8dd6-1aa36250a15b', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '427540fb-9f60-4bfd-afa2-4db31ec63cd4', 'cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'submitted', timestamp '2025-12-20 12:00:00' - interval '69 hours' - interval '41 mins', timestamp '2025-12-20 12:00:00' - interval '69 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cb19dbcf-bc3c-4846-a6be-6408634c31bc', '45820025-20e4-4454-8dd6-1aa36250a15b', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5aa23f61-85a5-4ff7-9cc8-5ca2ee8587cd', '45820025-20e4-4454-8dd6-1aa36250a15b', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0991dd16-9865-4424-a44a-3f359c95e54c', '45820025-20e4-4454-8dd6-1aa36250a15b', '2a39ada5-da79-4403-aec0-8299b6747419', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f6c2c5f0-6359-4700-96b8-9a017535254e', '45820025-20e4-4454-8dd6-1aa36250a15b', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4ca9c59e-89d7-49fe-b1b1-7d2fe0d7a8b1', '45820025-20e4-4454-8dd6-1aa36250a15b', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a0b98e54-ffed-4305-a2b8-b4a69dd88f04', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '22646e69-d22a-4b34-aa2b-f1323161d52d', 'cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'submitted', timestamp '2025-12-20 12:00:00' - interval '70 hours' - interval '25 mins', timestamp '2025-12-20 12:00:00' - interval '70 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('94cef6ff-cf9e-4ac3-ac89-9202d464331b', 'a0b98e54-ffed-4305-a2b8-b4a69dd88f04', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c6df1ee4-bd73-4b82-931a-0cc9030cc702', 'a0b98e54-ffed-4305-a2b8-b4a69dd88f04', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('31022b2e-a5b5-4459-a08b-ad1a3db47460', 'a0b98e54-ffed-4305-a2b8-b4a69dd88f04', '2a39ada5-da79-4403-aec0-8299b6747419', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('781cb6de-d017-4e21-8f56-b3bb3c4f0f78', 'a0b98e54-ffed-4305-a2b8-b4a69dd88f04', '26a1a51f-ab67-405d-a737-b184d060edb8', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5de34bd7-719e-4289-a4bf-556d99a79d0a', 'a0b98e54-ffed-4305-a2b8-b4a69dd88f04', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('88ec5b85-9f15-4f0a-8fa6-93ea510703eb', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'b37a7c3f-91c4-4a63-a51d-2b19f3bc7992', 'cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'submitted', timestamp '2025-12-20 12:00:00' - interval '45 hours' - interval '36 mins', timestamp '2025-12-20 12:00:00' - interval '45 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0be6f474-9792-4514-bc5a-ee4bd2257b75', '88ec5b85-9f15-4f0a-8fa6-93ea510703eb', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('43fae216-54ac-41a5-9727-fd5c7c4297fc', '88ec5b85-9f15-4f0a-8fa6-93ea510703eb', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3a441cbc-8dae-44a5-a1db-8d81947c7164', '88ec5b85-9f15-4f0a-8fa6-93ea510703eb', '2a39ada5-da79-4403-aec0-8299b6747419', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('54c3b671-68bb-40c6-85d9-4b4dbe4949b2', '88ec5b85-9f15-4f0a-8fa6-93ea510703eb', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f9770140-9cfc-47a7-90fe-1be5e936f53f', '88ec5b85-9f15-4f0a-8fa6-93ea510703eb', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('4f60dc33-c156-453d-9ea7-7ff1d628a4cc', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '8bda2f9b-55db-4d33-a40d-f8a111e93a24', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', timestamp '2025-12-20 12:00:00' - interval '37 hours' - interval '44 mins', timestamp '2025-12-20 12:00:00' - interval '37 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5dceb1eb-dba3-4dc5-9d10-25c9a6b5d199', '4f60dc33-c156-453d-9ea7-7ff1d628a4cc', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d8b17b3f-a62e-4bb0-8a62-c86ab6040a9d', '4f60dc33-c156-453d-9ea7-7ff1d628a4cc', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e1a45889-2649-4239-93f1-0d6ca9d15746', '4f60dc33-c156-453d-9ea7-7ff1d628a4cc', '2a39ada5-da79-4403-aec0-8299b6747419', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fb1c61c2-5215-4fc0-aaa8-09b6976e74fd', '4f60dc33-c156-453d-9ea7-7ff1d628a4cc', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('289a8cc5-d395-48fd-82f0-795026e91d99', '4f60dc33-c156-453d-9ea7-7ff1d628a4cc', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('94a4604b-ddab-437b-8086-7ef2c5d8c647', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '427540fb-9f60-4bfd-afa2-4db31ec63cd4', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', timestamp '2025-12-20 12:00:00' - interval '48 hours' - interval '41 mins', timestamp '2025-12-20 12:00:00' - interval '48 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6e42f09a-6949-4065-b41d-acb03751300e', '94a4604b-ddab-437b-8086-7ef2c5d8c647', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1e9fc680-45d7-4702-af6d-741ad96d5405', '94a4604b-ddab-437b-8086-7ef2c5d8c647', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('08ce40c4-31f9-4470-b77f-5e4e94a39d1d', '94a4604b-ddab-437b-8086-7ef2c5d8c647', '2a39ada5-da79-4403-aec0-8299b6747419', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c3902249-f76d-44a7-a9d5-5ab33ef89f0e', '94a4604b-ddab-437b-8086-7ef2c5d8c647', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fe42b16b-bf71-41ad-b53f-824feaeaee86', '94a4604b-ddab-437b-8086-7ef2c5d8c647', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('c081578d-e372-4296-a57a-de417cfbf171', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '22646e69-d22a-4b34-aa2b-f1323161d52d', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', timestamp '2025-12-20 12:00:00' - interval '45 hours' - interval '20 mins', timestamp '2025-12-20 12:00:00' - interval '45 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('32456c03-3ffd-49ca-9920-3246bfb902dd', 'c081578d-e372-4296-a57a-de417cfbf171', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8fe0de3e-7186-4a72-896a-047e73bdb458', 'c081578d-e372-4296-a57a-de417cfbf171', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a95800dd-a32b-4545-b134-28c0d2227033', 'c081578d-e372-4296-a57a-de417cfbf171', '2a39ada5-da79-4403-aec0-8299b6747419', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('70cde72b-b2b4-49b9-8e42-a3c62df15de9', 'c081578d-e372-4296-a57a-de417cfbf171', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e79cee6b-34fd-47b1-a628-215b22595280', 'c081578d-e372-4296-a57a-de417cfbf171', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('eb46e8fa-eb57-4e46-b99a-8ceb030fec27', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'b37a7c3f-91c4-4a63-a51d-2b19f3bc7992', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', timestamp '2025-12-20 12:00:00' - interval '59 hours' - interval '26 mins', timestamp '2025-12-20 12:00:00' - interval '59 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6582503e-db69-4806-b0ec-4708803537be', 'eb46e8fa-eb57-4e46-b99a-8ceb030fec27', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('72369878-5fed-49f2-8181-f1653483dd53', 'eb46e8fa-eb57-4e46-b99a-8ceb030fec27', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7120d6d0-b574-48b0-8c82-4060b800d5c5', 'eb46e8fa-eb57-4e46-b99a-8ceb030fec27', '2a39ada5-da79-4403-aec0-8299b6747419', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5b25aeb6-745e-43fc-8e57-95b3a9c3ec9b', 'eb46e8fa-eb57-4e46-b99a-8ceb030fec27', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2df7ea56-81cf-4da1-97c9-519bf9c191f3', 'eb46e8fa-eb57-4e46-b99a-8ceb030fec27', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('66bab02e-de0c-4162-8e7c-b4d8140e7814', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '8bda2f9b-55db-4d33-a40d-f8a111e93a24', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', timestamp '2025-12-20 12:00:00' - interval '33 hours' - interval '26 mins', timestamp '2025-12-20 12:00:00' - interval '33 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('de3a2e60-2f11-45bb-a080-bf43134e5e73', '66bab02e-de0c-4162-8e7c-b4d8140e7814', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e19b290b-91ab-4134-af29-10bc488144ae', '66bab02e-de0c-4162-8e7c-b4d8140e7814', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bc728e7a-2ca1-4f9b-9dfc-562aa0205779', '66bab02e-de0c-4162-8e7c-b4d8140e7814', '2a39ada5-da79-4403-aec0-8299b6747419', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8d131870-5116-45a7-8f84-931373201fc1', '66bab02e-de0c-4162-8e7c-b4d8140e7814', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('63b22422-d4ce-47ce-b25a-a36e04fdbc6d', '66bab02e-de0c-4162-8e7c-b4d8140e7814', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('baa58bcf-7cf0-4f10-87d5-96381d87ffdc', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '427540fb-9f60-4bfd-afa2-4db31ec63cd4', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', timestamp '2025-12-20 12:00:00' - interval '64 hours' - interval '32 mins', timestamp '2025-12-20 12:00:00' - interval '64 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cbb1894a-7192-4fb9-9cdf-76fc4a2e2953', 'baa58bcf-7cf0-4f10-87d5-96381d87ffdc', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('aabe5505-9c83-49bc-bbf9-a6eca122b661', 'baa58bcf-7cf0-4f10-87d5-96381d87ffdc', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f49d47c3-b33f-4f5a-bf89-c5c4b59936aa', 'baa58bcf-7cf0-4f10-87d5-96381d87ffdc', '2a39ada5-da79-4403-aec0-8299b6747419', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a0a9f0a6-7357-4897-b5fc-b749811a9863', 'baa58bcf-7cf0-4f10-87d5-96381d87ffdc', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e1b72927-69d8-420f-bbd4-f62edac19669', 'baa58bcf-7cf0-4f10-87d5-96381d87ffdc', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('909549cb-80e4-4904-a45f-de58bf348fab', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '22646e69-d22a-4b34-aa2b-f1323161d52d', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', timestamp '2025-12-20 12:00:00' - interval '59 hours' - interval '32 mins', timestamp '2025-12-20 12:00:00' - interval '59 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5a616323-1d88-4abd-8db0-8a3c35b9c9e8', '909549cb-80e4-4904-a45f-de58bf348fab', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c94298da-8d68-465b-9f0a-35c07db4e944', '909549cb-80e4-4904-a45f-de58bf348fab', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5d739a81-60cd-4305-b1c8-94feff8651d6', '909549cb-80e4-4904-a45f-de58bf348fab', '2a39ada5-da79-4403-aec0-8299b6747419', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c80c3b1f-c15e-435e-a3c3-e20ff0120fee', '909549cb-80e4-4904-a45f-de58bf348fab', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d0296336-c300-4c98-bc4d-3fe5ee610139', '909549cb-80e4-4904-a45f-de58bf348fab', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('c0c3add3-8b33-4586-bb08-7bb934130a55', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'b37a7c3f-91c4-4a63-a51d-2b19f3bc7992', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', timestamp '2025-12-20 12:00:00' - interval '32 hours' - interval '29 mins', timestamp '2025-12-20 12:00:00' - interval '32 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ddfc2f5c-9492-4cf6-b17f-dfd586ebbea5', 'c0c3add3-8b33-4586-bb08-7bb934130a55', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d943c9ab-2175-48b6-9e0a-2481f9f9e0f5', 'c0c3add3-8b33-4586-bb08-7bb934130a55', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('214473df-d50b-4808-8e00-2ff530c11272', 'c0c3add3-8b33-4586-bb08-7bb934130a55', '2a39ada5-da79-4403-aec0-8299b6747419', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4057afea-107f-4884-b8b7-f64e6e2f91e2', 'c0c3add3-8b33-4586-bb08-7bb934130a55', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('891a901e-9786-4432-8913-9f3928f66360', 'c0c3add3-8b33-4586-bb08-7bb934130a55', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('dd259a7a-5789-4075-aed8-fd1c0a8b8880', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '8bda2f9b-55db-4d33-a40d-f8a111e93a24', 'a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'submitted', timestamp '2025-12-20 12:00:00' - interval '12 hours' - interval '20 mins', timestamp '2025-12-20 12:00:00' - interval '12 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9db389b2-ddef-47f5-8d30-a44133db73df', 'dd259a7a-5789-4075-aed8-fd1c0a8b8880', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('25e0cacc-3740-47a4-8885-189475ab3b47', 'dd259a7a-5789-4075-aed8-fd1c0a8b8880', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b1cc1ba7-6eef-40ac-9f68-70dcd26e0af9', 'dd259a7a-5789-4075-aed8-fd1c0a8b8880', '2a39ada5-da79-4403-aec0-8299b6747419', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8bfd2dff-c248-4127-9e6c-fb21777f6635', 'dd259a7a-5789-4075-aed8-fd1c0a8b8880', '26a1a51f-ab67-405d-a737-b184d060edb8', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c0f123df-2cf9-4533-902d-d98215fb154e', 'dd259a7a-5789-4075-aed8-fd1c0a8b8880', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('da13bfd8-67e7-4791-8ebd-f9650d8b6305', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '427540fb-9f60-4bfd-afa2-4db31ec63cd4', 'a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'submitted', timestamp '2025-12-20 12:00:00' - interval '11 hours' - interval '43 mins', timestamp '2025-12-20 12:00:00' - interval '11 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dd961428-0142-4300-ae71-10aebd8f5dcf', 'da13bfd8-67e7-4791-8ebd-f9650d8b6305', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('248a5e6a-0d7f-4c5e-a63e-9069e5a4f5da', 'da13bfd8-67e7-4791-8ebd-f9650d8b6305', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bfb4c693-fbcf-406a-9c3a-c19ceae776c6', 'da13bfd8-67e7-4791-8ebd-f9650d8b6305', '2a39ada5-da79-4403-aec0-8299b6747419', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a2de70a4-98e0-47cc-97e0-925ac16313dc', 'da13bfd8-67e7-4791-8ebd-f9650d8b6305', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2c805b02-e7d1-4090-9d9d-b10ad58b79a2', 'da13bfd8-67e7-4791-8ebd-f9650d8b6305', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('20186f85-62ff-424a-816c-0f46063330fd', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', '22646e69-d22a-4b34-aa2b-f1323161d52d', 'a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'submitted', timestamp '2025-12-20 12:00:00' - interval '28 hours' - interval '41 mins', timestamp '2025-12-20 12:00:00' - interval '28 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('85afb3ce-d675-4f46-a697-e1573a767cd9', '20186f85-62ff-424a-816c-0f46063330fd', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4d3cd69a-a3d4-4968-a550-e59fe5996867', '20186f85-62ff-424a-816c-0f46063330fd', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9d378490-09b0-4e75-b27b-52397c732ac7', '20186f85-62ff-424a-816c-0f46063330fd', '2a39ada5-da79-4403-aec0-8299b6747419', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('35891f40-2278-4b8b-9962-761dfdd886e8', '20186f85-62ff-424a-816c-0f46063330fd', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7196b39a-3de4-4a57-872d-02b55ee08587', '20186f85-62ff-424a-816c-0f46063330fd', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('f1b3a5bf-c0fe-4647-a736-93deb12ffd2b', 'b90e1112-88c7-44fa-a275-25bc0ad2d96d', 'b37a7c3f-91c4-4a63-a51d-2b19f3bc7992', 'a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'submitted', timestamp '2025-12-20 12:00:00' - interval '48 hours' - interval '28 mins', timestamp '2025-12-20 12:00:00' - interval '48 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7cf5d7ca-fc4f-4ded-b1e4-f0250152802b', 'f1b3a5bf-c0fe-4647-a736-93deb12ffd2b', 'b9f1f35c-7929-412b-a2c3-63e14ab7e9d0', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('592fab6b-b4f3-42ab-9433-6306287576b7', 'f1b3a5bf-c0fe-4647-a736-93deb12ffd2b', 'd3dd5fe2-d521-4a2a-ae2b-bb11b6fa0902', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c6699f58-b383-4f42-9e48-62ec840527b6', 'f1b3a5bf-c0fe-4647-a736-93deb12ffd2b', '2a39ada5-da79-4403-aec0-8299b6747419', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5298a555-5c56-48a0-b9c5-2467923cf7b5', 'f1b3a5bf-c0fe-4647-a736-93deb12ffd2b', '26a1a51f-ab67-405d-a737-b184d060edb8', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0a7eef6f-9dd1-4d38-8e67-d467b0772527', 'f1b3a5bf-c0fe-4647-a736-93deb12ffd2b', '5809839f-fbb7-4a4f-a996-72ee4cf60160', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('c807e589-b18a-4680-b04f-dd3405edf59f', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'd9a0ceae-93bf-462a-a366-fa53e1c3ebbf', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', timestamp '2025-06-15 12:00:00' - interval '52 hours' - interval '27 mins', timestamp '2025-06-15 12:00:00' - interval '52 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f7cb9a28-b998-4f1f-926a-a57cde8c7695', 'c807e589-b18a-4680-b04f-dd3405edf59f', '53700e90-0bef-4410-aa0f-3995053ad8a2', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ab3d7df7-5a40-4ad4-8cd5-981ffcee7bb9', 'c807e589-b18a-4680-b04f-dd3405edf59f', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e9ca42fd-b1c5-45e4-a31c-8a24d1ce2e48', 'c807e589-b18a-4680-b04f-dd3405edf59f', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('08a77002-3cf9-43fc-8072-9d71462c5005', 'c807e589-b18a-4680-b04f-dd3405edf59f', '770df56c-9bc9-4108-a5a9-1056b29af922', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e7a3a359-97b3-4db5-adb4-eb03536bb93a', 'c807e589-b18a-4680-b04f-dd3405edf59f', '36146a5d-35be-44c7-af15-a3d586386a27', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('deb5abfd-aa17-4a00-9f5e-f417ce0a925e', '0e963024-a53f-4722-a9e0-5db7a47b4419', '8c80391d-28d5-46b2-acfe-a57c940443b9', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', timestamp '2025-06-15 12:00:00' - interval '49 hours' - interval '22 mins', timestamp '2025-06-15 12:00:00' - interval '49 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c29974ae-5620-4564-8f0f-59f05ef62111', 'deb5abfd-aa17-4a00-9f5e-f417ce0a925e', '53700e90-0bef-4410-aa0f-3995053ad8a2', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f5d1721a-4ca3-4c6c-9a6d-3afe4f117c2b', 'deb5abfd-aa17-4a00-9f5e-f417ce0a925e', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2f48f161-1248-4c13-925b-7b41ab81876c', 'deb5abfd-aa17-4a00-9f5e-f417ce0a925e', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('13d7a622-48f3-41dc-9105-68b6f67bcd13', 'deb5abfd-aa17-4a00-9f5e-f417ce0a925e', '770df56c-9bc9-4108-a5a9-1056b29af922', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('db731daa-fae3-4c3e-af5e-8fdd055085bc', 'deb5abfd-aa17-4a00-9f5e-f417ce0a925e', '36146a5d-35be-44c7-af15-a3d586386a27', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('ce0d012e-4648-4029-a080-69adfb9e7d05', '0e963024-a53f-4722-a9e0-5db7a47b4419', '48f4e97b-1296-4486-a4f5-323d8d9a0e11', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', timestamp '2025-06-15 12:00:00' - interval '8 hours' - interval '30 mins', timestamp '2025-06-15 12:00:00' - interval '8 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d523bdd9-dff4-4e4c-bc9a-85e3b77b6c88', 'ce0d012e-4648-4029-a080-69adfb9e7d05', '53700e90-0bef-4410-aa0f-3995053ad8a2', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('89b6be39-96f6-421a-b4ac-b030c938d1c5', 'ce0d012e-4648-4029-a080-69adfb9e7d05', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a5183187-8245-4b4f-b3c2-f0891245fd31', 'ce0d012e-4648-4029-a080-69adfb9e7d05', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('25c0c9eb-4bb2-4062-b563-8e205caa69a1', 'ce0d012e-4648-4029-a080-69adfb9e7d05', '770df56c-9bc9-4108-a5a9-1056b29af922', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a0870541-aa35-4b0f-8e32-fd2a58786d18', 'ce0d012e-4648-4029-a080-69adfb9e7d05', '36146a5d-35be-44c7-af15-a3d586386a27', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('cdf36ddc-6542-4d9c-8992-06d39a239d8c', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'd9a0ceae-93bf-462a-a366-fa53e1c3ebbf', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', timestamp '2025-06-15 12:00:00' - interval '6 hours' - interval '30 mins', timestamp '2025-06-15 12:00:00' - interval '6 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c66e4949-c121-48c4-a477-e99737c63811', 'cdf36ddc-6542-4d9c-8992-06d39a239d8c', '53700e90-0bef-4410-aa0f-3995053ad8a2', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('10265fd2-4efe-421f-94c8-d41020eecb7c', 'cdf36ddc-6542-4d9c-8992-06d39a239d8c', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3308ed6c-b3ca-45b8-8d96-cdc426f29d8d', 'cdf36ddc-6542-4d9c-8992-06d39a239d8c', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2490c11c-c8eb-4a38-99de-ee27616a4958', 'cdf36ddc-6542-4d9c-8992-06d39a239d8c', '770df56c-9bc9-4108-a5a9-1056b29af922', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fbf2a4cd-b07a-477c-8738-2327cf6c1ade', 'cdf36ddc-6542-4d9c-8992-06d39a239d8c', '36146a5d-35be-44c7-af15-a3d586386a27', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('8bc87d4b-7506-4fc6-be47-f92e2e660d36', '0e963024-a53f-4722-a9e0-5db7a47b4419', '8c80391d-28d5-46b2-acfe-a57c940443b9', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', timestamp '2025-06-15 12:00:00' - interval '27 hours' - interval '35 mins', timestamp '2025-06-15 12:00:00' - interval '27 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('913b9216-8fcb-4937-b0d9-1c5b7b0dba1a', '8bc87d4b-7506-4fc6-be47-f92e2e660d36', '53700e90-0bef-4410-aa0f-3995053ad8a2', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('11358b67-8c31-4d98-9992-076944a8a5fe', '8bc87d4b-7506-4fc6-be47-f92e2e660d36', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1fdd3cbe-79ca-478d-9947-3e8973497d4d', '8bc87d4b-7506-4fc6-be47-f92e2e660d36', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d7ea4b54-854e-4d66-add3-a27e5d7f4d70', '8bc87d4b-7506-4fc6-be47-f92e2e660d36', '770df56c-9bc9-4108-a5a9-1056b29af922', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1c32e9ed-1d20-4be7-a642-3ca0367a9728', '8bc87d4b-7506-4fc6-be47-f92e2e660d36', '36146a5d-35be-44c7-af15-a3d586386a27', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('5e503d32-e2de-4954-9e44-19294e561865', '0e963024-a53f-4722-a9e0-5db7a47b4419', '48f4e97b-1296-4486-a4f5-323d8d9a0e11', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', timestamp '2025-06-15 12:00:00' - interval '35 hours' - interval '24 mins', timestamp '2025-06-15 12:00:00' - interval '35 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('379fa4e0-1a5d-4a6b-94b4-655f6fe9ce3f', '5e503d32-e2de-4954-9e44-19294e561865', '53700e90-0bef-4410-aa0f-3995053ad8a2', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b1fcf19e-8719-46ec-b006-894e801bc24d', '5e503d32-e2de-4954-9e44-19294e561865', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8b42d160-4769-4731-aebb-def4b4294de9', '5e503d32-e2de-4954-9e44-19294e561865', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fcc2671b-3491-4165-b74a-969263f501f3', '5e503d32-e2de-4954-9e44-19294e561865', '770df56c-9bc9-4108-a5a9-1056b29af922', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8a925793-b203-4ed5-969c-918dd00bc72a', '5e503d32-e2de-4954-9e44-19294e561865', '36146a5d-35be-44c7-af15-a3d586386a27', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('061bf7d4-a43b-4cdd-8621-9df6c15baba5', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'd9a0ceae-93bf-462a-a366-fa53e1c3ebbf', 'c8a52987-c3a6-4368-a31c-a2f6566399f1', 'submitted', timestamp '2025-06-15 12:00:00' - interval '20 hours' - interval '26 mins', timestamp '2025-06-15 12:00:00' - interval '20 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('704eeace-5483-4922-80a5-75e1580633b6', '061bf7d4-a43b-4cdd-8621-9df6c15baba5', '53700e90-0bef-4410-aa0f-3995053ad8a2', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c3665e4f-8da8-4dc0-9a26-b2c2b7f60a36', '061bf7d4-a43b-4cdd-8621-9df6c15baba5', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('03f126d7-098b-41f3-9742-ea3f515fc8b0', '061bf7d4-a43b-4cdd-8621-9df6c15baba5', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ae683d06-6bd7-4bc5-af2b-f134f3259204', '061bf7d4-a43b-4cdd-8621-9df6c15baba5', '770df56c-9bc9-4108-a5a9-1056b29af922', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e6ba1636-faf3-45bb-938e-1dbd146979c1', '061bf7d4-a43b-4cdd-8621-9df6c15baba5', '36146a5d-35be-44c7-af15-a3d586386a27', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d59c98cd-11c4-47dd-bddf-93ca2cc4f6f8', '0e963024-a53f-4722-a9e0-5db7a47b4419', '8c80391d-28d5-46b2-acfe-a57c940443b9', 'c8a52987-c3a6-4368-a31c-a2f6566399f1', 'submitted', timestamp '2025-06-15 12:00:00' - interval '26 hours' - interval '45 mins', timestamp '2025-06-15 12:00:00' - interval '26 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6afe9179-b447-4189-8d42-08f4fa714181', 'd59c98cd-11c4-47dd-bddf-93ca2cc4f6f8', '53700e90-0bef-4410-aa0f-3995053ad8a2', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5bfbaf43-d894-43c4-b868-e4159d0dc819', 'd59c98cd-11c4-47dd-bddf-93ca2cc4f6f8', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('53f1e0f4-a3ec-4604-9b00-7ce2c46c5562', 'd59c98cd-11c4-47dd-bddf-93ca2cc4f6f8', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e6e2e4dd-2c2f-401b-be01-68117dd785ae', 'd59c98cd-11c4-47dd-bddf-93ca2cc4f6f8', '770df56c-9bc9-4108-a5a9-1056b29af922', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('72a58e83-6294-4bac-ad34-20a126df0817', 'd59c98cd-11c4-47dd-bddf-93ca2cc4f6f8', '36146a5d-35be-44c7-af15-a3d586386a27', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('37bc045e-709f-409e-9e14-4202045b7512', '0e963024-a53f-4722-a9e0-5db7a47b4419', '48f4e97b-1296-4486-a4f5-323d8d9a0e11', 'c8a52987-c3a6-4368-a31c-a2f6566399f1', 'submitted', timestamp '2025-06-15 12:00:00' - interval '63 hours' - interval '22 mins', timestamp '2025-06-15 12:00:00' - interval '63 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2efabf22-53e6-4398-8e7f-8ceabb2a53de', '37bc045e-709f-409e-9e14-4202045b7512', '53700e90-0bef-4410-aa0f-3995053ad8a2', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bf0441fd-9012-4657-909b-f856ea11ac1d', '37bc045e-709f-409e-9e14-4202045b7512', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('52ea3e36-ca60-48c2-a51e-1b3429067320', '37bc045e-709f-409e-9e14-4202045b7512', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e36388e5-7dd0-4f0f-9409-69002bcdf74c', '37bc045e-709f-409e-9e14-4202045b7512', '770df56c-9bc9-4108-a5a9-1056b29af922', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('479b622e-f7cd-4dc2-80ba-af3df4e2e86e', '37bc045e-709f-409e-9e14-4202045b7512', '36146a5d-35be-44c7-af15-a3d586386a27', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('bf848af2-6264-4cff-a133-4e1a6b11b0ad', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'd9a0ceae-93bf-462a-a366-fa53e1c3ebbf', 'cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'submitted', timestamp '2025-06-15 12:00:00' - interval '31 hours' - interval '23 mins', timestamp '2025-06-15 12:00:00' - interval '31 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('047f21f8-bd98-47e5-8014-10ea903a893c', 'bf848af2-6264-4cff-a133-4e1a6b11b0ad', '53700e90-0bef-4410-aa0f-3995053ad8a2', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('effc0627-0b04-48b5-9d27-80f6abb6e0d4', 'bf848af2-6264-4cff-a133-4e1a6b11b0ad', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9e1454c3-bd76-46e9-810c-22a4f5f74e09', 'bf848af2-6264-4cff-a133-4e1a6b11b0ad', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f50f8e45-5e3c-4726-95cd-1c9c417d9d50', 'bf848af2-6264-4cff-a133-4e1a6b11b0ad', '770df56c-9bc9-4108-a5a9-1056b29af922', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('31ca93c0-00ce-4b19-8a1d-acc2bf8ff01b', 'bf848af2-6264-4cff-a133-4e1a6b11b0ad', '36146a5d-35be-44c7-af15-a3d586386a27', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e0b4c8a7-4bf6-47c0-a2f9-57b4c9513219', '0e963024-a53f-4722-a9e0-5db7a47b4419', '8c80391d-28d5-46b2-acfe-a57c940443b9', 'cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'submitted', timestamp '2025-06-15 12:00:00' - interval '36 hours' - interval '37 mins', timestamp '2025-06-15 12:00:00' - interval '36 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('14d0e4d7-4871-4548-8922-6f1c8d3c3788', 'e0b4c8a7-4bf6-47c0-a2f9-57b4c9513219', '53700e90-0bef-4410-aa0f-3995053ad8a2', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e7423732-6626-46fd-b4e3-534ef2ad88fe', 'e0b4c8a7-4bf6-47c0-a2f9-57b4c9513219', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2c25205c-9ba4-4934-b4c2-de7e7510a767', 'e0b4c8a7-4bf6-47c0-a2f9-57b4c9513219', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('282f0214-62bf-411e-ad92-0812251dd8f2', 'e0b4c8a7-4bf6-47c0-a2f9-57b4c9513219', '770df56c-9bc9-4108-a5a9-1056b29af922', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('283efc7a-9a88-4eb5-8c51-05c17a0b618a', 'e0b4c8a7-4bf6-47c0-a2f9-57b4c9513219', '36146a5d-35be-44c7-af15-a3d586386a27', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('436752ca-76ba-4be7-a249-c7e3a021e72d', '0e963024-a53f-4722-a9e0-5db7a47b4419', '48f4e97b-1296-4486-a4f5-323d8d9a0e11', 'cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'submitted', timestamp '2025-06-15 12:00:00' - interval '45 hours' - interval '31 mins', timestamp '2025-06-15 12:00:00' - interval '45 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b918fbd0-3d3b-4718-aab9-b598acd888b8', '436752ca-76ba-4be7-a249-c7e3a021e72d', '53700e90-0bef-4410-aa0f-3995053ad8a2', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('368860d8-aa45-49d3-8bc3-f4ac6bd3c628', '436752ca-76ba-4be7-a249-c7e3a021e72d', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('56422669-a44e-49c4-956f-a8c45b8b065e', '436752ca-76ba-4be7-a249-c7e3a021e72d', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ebc4968b-1440-460a-8779-1d5a3396b6b2', '436752ca-76ba-4be7-a249-c7e3a021e72d', '770df56c-9bc9-4108-a5a9-1056b29af922', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('73350b7e-ce81-426e-80c6-98ba7a14e773', '436752ca-76ba-4be7-a249-c7e3a021e72d', '36146a5d-35be-44c7-af15-a3d586386a27', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('1e4e7d21-7e03-4cb1-bcdc-97b9dfcac820', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'd9a0ceae-93bf-462a-a366-fa53e1c3ebbf', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', timestamp '2025-06-15 12:00:00' - interval '51 hours' - interval '23 mins', timestamp '2025-06-15 12:00:00' - interval '51 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b0a53a56-90e9-4bac-881b-8db6f443ffdd', '1e4e7d21-7e03-4cb1-bcdc-97b9dfcac820', '53700e90-0bef-4410-aa0f-3995053ad8a2', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bd37eb94-5421-4a76-ae99-337a8559a92f', '1e4e7d21-7e03-4cb1-bcdc-97b9dfcac820', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ba4c3801-c04c-46c0-8ee7-ed4721952be9', '1e4e7d21-7e03-4cb1-bcdc-97b9dfcac820', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('aa413096-00c7-4917-9b34-f5a996260bfd', '1e4e7d21-7e03-4cb1-bcdc-97b9dfcac820', '770df56c-9bc9-4108-a5a9-1056b29af922', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('475db8e3-c4f5-4d0e-b492-bdd0d3ea8b3a', '1e4e7d21-7e03-4cb1-bcdc-97b9dfcac820', '36146a5d-35be-44c7-af15-a3d586386a27', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7f27226d-191f-40eb-b0b2-bf2834c0a1b4', '0e963024-a53f-4722-a9e0-5db7a47b4419', '8c80391d-28d5-46b2-acfe-a57c940443b9', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', timestamp '2025-06-15 12:00:00' - interval '4 hours' - interval '26 mins', timestamp '2025-06-15 12:00:00' - interval '4 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a66a3b76-1000-4455-8068-b602524cebf6', '7f27226d-191f-40eb-b0b2-bf2834c0a1b4', '53700e90-0bef-4410-aa0f-3995053ad8a2', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('77028f9d-bb17-4b94-a3ed-9e6212c5f648', '7f27226d-191f-40eb-b0b2-bf2834c0a1b4', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3ed62888-3d36-4b5a-a244-f75416b76fff', '7f27226d-191f-40eb-b0b2-bf2834c0a1b4', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e4559c9e-b053-4989-ac26-684281d832e9', '7f27226d-191f-40eb-b0b2-bf2834c0a1b4', '770df56c-9bc9-4108-a5a9-1056b29af922', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('817c5c09-8367-41cf-a189-abdeea87325f', '7f27226d-191f-40eb-b0b2-bf2834c0a1b4', '36146a5d-35be-44c7-af15-a3d586386a27', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('75b2dc8e-f73c-422c-83a9-e4f046b5d8ea', '0e963024-a53f-4722-a9e0-5db7a47b4419', '48f4e97b-1296-4486-a4f5-323d8d9a0e11', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', timestamp '2025-06-15 12:00:00' - interval '3 hours' - interval '39 mins', timestamp '2025-06-15 12:00:00' - interval '3 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('be4bdef1-939b-465f-b918-90fd5f27bb70', '75b2dc8e-f73c-422c-83a9-e4f046b5d8ea', '53700e90-0bef-4410-aa0f-3995053ad8a2', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5ed33c46-15ad-456e-8b3d-b427bb766988', '75b2dc8e-f73c-422c-83a9-e4f046b5d8ea', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9ab3a9d5-964d-4f87-bc6a-59c58fb177cd', '75b2dc8e-f73c-422c-83a9-e4f046b5d8ea', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e5531441-3ae5-4f81-bd42-34a158c884a6', '75b2dc8e-f73c-422c-83a9-e4f046b5d8ea', '770df56c-9bc9-4108-a5a9-1056b29af922', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0a94333a-1ef9-48c5-99d7-78b3095cbce2', '75b2dc8e-f73c-422c-83a9-e4f046b5d8ea', '36146a5d-35be-44c7-af15-a3d586386a27', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('f99d5b9b-c6fe-45be-ab0a-e21dcfeb33ef', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'd9a0ceae-93bf-462a-a366-fa53e1c3ebbf', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', timestamp '2025-06-15 12:00:00' - interval '34 hours' - interval '23 mins', timestamp '2025-06-15 12:00:00' - interval '34 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('28c78bfb-0b7d-4171-818c-37dfd060ad3e', 'f99d5b9b-c6fe-45be-ab0a-e21dcfeb33ef', '53700e90-0bef-4410-aa0f-3995053ad8a2', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5247a30b-725d-4fb2-8acb-1971775dbddc', 'f99d5b9b-c6fe-45be-ab0a-e21dcfeb33ef', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8d3359f9-16bf-4588-83ac-ab59c1964424', 'f99d5b9b-c6fe-45be-ab0a-e21dcfeb33ef', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cd06e107-a587-464e-b3c3-b47eaafdb65d', 'f99d5b9b-c6fe-45be-ab0a-e21dcfeb33ef', '770df56c-9bc9-4108-a5a9-1056b29af922', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('36eb17fd-d2b0-4828-aa76-e074be573fcb', 'f99d5b9b-c6fe-45be-ab0a-e21dcfeb33ef', '36146a5d-35be-44c7-af15-a3d586386a27', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e154f19e-9ed2-4b68-8d48-ccce48b69e17', '0e963024-a53f-4722-a9e0-5db7a47b4419', '8c80391d-28d5-46b2-acfe-a57c940443b9', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', timestamp '2025-06-15 12:00:00' - interval '67 hours' - interval '36 mins', timestamp '2025-06-15 12:00:00' - interval '67 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e022a09b-10e1-4fc1-9900-a1b5737b1f0a', 'e154f19e-9ed2-4b68-8d48-ccce48b69e17', '53700e90-0bef-4410-aa0f-3995053ad8a2', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3b1fdc62-65fa-4f40-9fa8-86122c364df3', 'e154f19e-9ed2-4b68-8d48-ccce48b69e17', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f84434a7-ad87-4e19-95f2-f3fac441509a', 'e154f19e-9ed2-4b68-8d48-ccce48b69e17', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('adf5c737-caa3-4e14-9457-e2583ddcbb1f', 'e154f19e-9ed2-4b68-8d48-ccce48b69e17', '770df56c-9bc9-4108-a5a9-1056b29af922', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('31903a27-1b6e-40e5-a8b9-e7ea7be7b9d6', 'e154f19e-9ed2-4b68-8d48-ccce48b69e17', '36146a5d-35be-44c7-af15-a3d586386a27', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('10adcc3d-a5b8-4b40-a23c-074d777a1208', '0e963024-a53f-4722-a9e0-5db7a47b4419', '48f4e97b-1296-4486-a4f5-323d8d9a0e11', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', timestamp '2025-06-15 12:00:00' - interval '44 hours' - interval '20 mins', timestamp '2025-06-15 12:00:00' - interval '44 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c56e30e5-5384-44bf-a3a3-27f288c8dea9', '10adcc3d-a5b8-4b40-a23c-074d777a1208', '53700e90-0bef-4410-aa0f-3995053ad8a2', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('52a7ffa3-6310-4c8f-8302-d8031e535d2f', '10adcc3d-a5b8-4b40-a23c-074d777a1208', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c639b6fe-7b00-462b-80b4-6f98346c4dff', '10adcc3d-a5b8-4b40-a23c-074d777a1208', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('603e43b6-22d4-4709-86df-f212b158ac54', '10adcc3d-a5b8-4b40-a23c-074d777a1208', '770df56c-9bc9-4108-a5a9-1056b29af922', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7f051cfd-8187-4713-a0fd-57a53bcfc886', '10adcc3d-a5b8-4b40-a23c-074d777a1208', '36146a5d-35be-44c7-af15-a3d586386a27', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('43c4a198-598b-47a6-8cdf-2a9a9ee764d0', '0e963024-a53f-4722-a9e0-5db7a47b4419', 'd9a0ceae-93bf-462a-a366-fa53e1c3ebbf', 'a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'submitted', timestamp '2025-06-15 12:00:00' - interval '69 hours' - interval '40 mins', timestamp '2025-06-15 12:00:00' - interval '69 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('50c4c9eb-624d-440d-a95d-7f0a06c26e4a', '43c4a198-598b-47a6-8cdf-2a9a9ee764d0', '53700e90-0bef-4410-aa0f-3995053ad8a2', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5ceee065-0681-4ee1-b6ae-156664042c66', '43c4a198-598b-47a6-8cdf-2a9a9ee764d0', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d867f810-41ac-4fdc-b2d0-ae2b358ef183', '43c4a198-598b-47a6-8cdf-2a9a9ee764d0', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9c188896-22b5-4734-86b8-20156152239b', '43c4a198-598b-47a6-8cdf-2a9a9ee764d0', '770df56c-9bc9-4108-a5a9-1056b29af922', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d3e6b81c-448b-4d99-9e05-88a6c9bbd0d8', '43c4a198-598b-47a6-8cdf-2a9a9ee764d0', '36146a5d-35be-44c7-af15-a3d586386a27', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('40ac825b-60ff-40fa-a018-fcf05753f6f1', '0e963024-a53f-4722-a9e0-5db7a47b4419', '8c80391d-28d5-46b2-acfe-a57c940443b9', 'a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'submitted', timestamp '2025-06-15 12:00:00' - interval '28 hours' - interval '30 mins', timestamp '2025-06-15 12:00:00' - interval '28 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ae9ec0c5-4bef-4222-a7b1-36e0249d1817', '40ac825b-60ff-40fa-a018-fcf05753f6f1', '53700e90-0bef-4410-aa0f-3995053ad8a2', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('622a229a-862f-4e6e-b8cd-75d0ba47d829', '40ac825b-60ff-40fa-a018-fcf05753f6f1', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a8c02437-4f90-4b50-8c33-085a60ebe1c8', '40ac825b-60ff-40fa-a018-fcf05753f6f1', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f5e3edad-47c4-431b-8cc5-32467384dbf1', '40ac825b-60ff-40fa-a018-fcf05753f6f1', '770df56c-9bc9-4108-a5a9-1056b29af922', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c7abc5bf-7f1e-4739-8b03-8d03b3fb5499', '40ac825b-60ff-40fa-a018-fcf05753f6f1', '36146a5d-35be-44c7-af15-a3d586386a27', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('ae7f1a8d-0462-47db-a20e-006fd1945397', '0e963024-a53f-4722-a9e0-5db7a47b4419', '48f4e97b-1296-4486-a4f5-323d8d9a0e11', 'a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'submitted', timestamp '2025-06-15 12:00:00' - interval '1 hours' - interval '20 mins', timestamp '2025-06-15 12:00:00' - interval '1 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b1f1ae11-66f2-4d57-94e2-4f686a978eaa', 'ae7f1a8d-0462-47db-a20e-006fd1945397', '53700e90-0bef-4410-aa0f-3995053ad8a2', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a1549daf-ca3c-4ed8-8f88-85b550fa6833', 'ae7f1a8d-0462-47db-a20e-006fd1945397', '7e8b2e8b-4a9a-4d2c-a87b-955d58d51b03', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('399b02b1-6817-4f01-af88-5065f7a6cd0d', 'ae7f1a8d-0462-47db-a20e-006fd1945397', '5bab7e88-65ad-43a7-a14f-8b9bbcb9c9af', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f8eeb125-0385-46b0-a9b2-d3b4a54ddf2b', 'ae7f1a8d-0462-47db-a20e-006fd1945397', '770df56c-9bc9-4108-a5a9-1056b29af922', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8dcb871d-9343-4432-9bad-f0974d51abe6', 'ae7f1a8d-0462-47db-a20e-006fd1945397', '36146a5d-35be-44c7-af15-a3d586386a27', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('2a0c0659-2773-473e-9772-926dd5a5ebf3', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'd716c53c-18e0-4a50-a4b5-37770e2326a3', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', timestamp '2025-01-15 12:00:00' - interval '38 hours' - interval '35 mins', timestamp '2025-01-15 12:00:00' - interval '38 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7714d157-8613-4df0-8732-11db5d1144b6', '2a0c0659-2773-473e-9772-926dd5a5ebf3', '9ec0420a-7f95-4e3f-ad37-b95948485c65', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('91c59197-0bac-48f1-8934-958967fffaf1', '2a0c0659-2773-473e-9772-926dd5a5ebf3', '52f96a98-1ac8-4b6e-aa3c-02ab77905c16', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e8bdf456-6254-4280-be17-6a6242ce363a', '2a0c0659-2773-473e-9772-926dd5a5ebf3', 'e242e868-2bb7-4869-af4b-7ad480080c56', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5773760b-b5ae-462a-9bd8-005023a10d08', '2a0c0659-2773-473e-9772-926dd5a5ebf3', 'e6928c81-092d-4b96-ada3-5dcf9bab3962', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cca82207-3aab-4e01-8041-08b4e86cc67a', '2a0c0659-2773-473e-9772-926dd5a5ebf3', '5483798a-76bd-4d78-aca0-0d51ce803849', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a1d59652-a9dd-4596-ba83-bea74eef5b2e', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '20e1dea2-c044-4eca-a288-e444a3d21226', '47dcf645-bcf8-407e-a86e-f0e506495726', 'submitted', timestamp '2025-01-15 12:00:00' - interval '8 hours' - interval '23 mins', timestamp '2025-01-15 12:00:00' - interval '8 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3185d62a-7548-4473-b1ce-7281f0146389', 'a1d59652-a9dd-4596-ba83-bea74eef5b2e', '9ec0420a-7f95-4e3f-ad37-b95948485c65', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6278aa8d-63c6-4d21-b823-c59e793534a8', 'a1d59652-a9dd-4596-ba83-bea74eef5b2e', '52f96a98-1ac8-4b6e-aa3c-02ab77905c16', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c28d1149-65d3-490e-b2cf-e159210a5c4c', 'a1d59652-a9dd-4596-ba83-bea74eef5b2e', 'e242e868-2bb7-4869-af4b-7ad480080c56', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('eb31c9f5-47dc-4825-9504-003a72771790', 'a1d59652-a9dd-4596-ba83-bea74eef5b2e', 'e6928c81-092d-4b96-ada3-5dcf9bab3962', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('898361dc-718a-4752-965a-12a52b6cf714', 'a1d59652-a9dd-4596-ba83-bea74eef5b2e', '5483798a-76bd-4d78-aca0-0d51ce803849', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('5ae5d8d5-fe73-4303-945c-e7434633831f', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'd716c53c-18e0-4a50-a4b5-37770e2326a3', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', timestamp '2025-01-15 12:00:00' - interval '59 hours' - interval '36 mins', timestamp '2025-01-15 12:00:00' - interval '59 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('074c50a6-0cb0-4a87-a1f1-9e97ecd86543', '5ae5d8d5-fe73-4303-945c-e7434633831f', '9ec0420a-7f95-4e3f-ad37-b95948485c65', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0a146f73-5c67-41cd-8c44-80e5995f1459', '5ae5d8d5-fe73-4303-945c-e7434633831f', '52f96a98-1ac8-4b6e-aa3c-02ab77905c16', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('72e3842a-626b-4203-bc24-35f4b025569a', '5ae5d8d5-fe73-4303-945c-e7434633831f', 'e242e868-2bb7-4869-af4b-7ad480080c56', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c84e4cc6-c0c8-4d02-ae63-f2304cfb77a4', '5ae5d8d5-fe73-4303-945c-e7434633831f', 'e6928c81-092d-4b96-ada3-5dcf9bab3962', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('84220fd2-b906-4288-9cd5-058daccfac4c', '5ae5d8d5-fe73-4303-945c-e7434633831f', '5483798a-76bd-4d78-aca0-0d51ce803849', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('5564f82a-bdec-4181-9ffb-a066cc7e4529', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '20e1dea2-c044-4eca-a288-e444a3d21226', '44e14170-d567-4ad4-a771-cd269d538a2f', 'submitted', timestamp '2025-01-15 12:00:00' - interval '47 hours' - interval '40 mins', timestamp '2025-01-15 12:00:00' - interval '47 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dade2585-6e0b-449e-ab2a-66cdf5d5c6ae', '5564f82a-bdec-4181-9ffb-a066cc7e4529', '9ec0420a-7f95-4e3f-ad37-b95948485c65', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e534bd1f-6f15-47c6-9137-84b0f1a2a45f', '5564f82a-bdec-4181-9ffb-a066cc7e4529', '52f96a98-1ac8-4b6e-aa3c-02ab77905c16', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('39b8e419-c8b5-4eae-a281-bf28109843ea', '5564f82a-bdec-4181-9ffb-a066cc7e4529', 'e242e868-2bb7-4869-af4b-7ad480080c56', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('838289ad-9cfb-4514-8e66-24674995c6fa', '5564f82a-bdec-4181-9ffb-a066cc7e4529', 'e6928c81-092d-4b96-ada3-5dcf9bab3962', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5c4b3f17-3775-4552-83fd-eef5b0d52165', '5564f82a-bdec-4181-9ffb-a066cc7e4529', '5483798a-76bd-4d78-aca0-0d51ce803849', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('964fb45a-eed1-48ef-b109-9ed34eac6e0c', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'd716c53c-18e0-4a50-a4b5-37770e2326a3', 'c8a52987-c3a6-4368-a31c-a2f6566399f1', 'submitted', timestamp '2025-01-15 12:00:00' - interval '40 hours' - interval '34 mins', timestamp '2025-01-15 12:00:00' - interval '40 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('24fb7709-69c2-4838-a31e-d5323a969f8a', '964fb45a-eed1-48ef-b109-9ed34eac6e0c', '9ec0420a-7f95-4e3f-ad37-b95948485c65', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('625cc207-da0d-4fad-b032-87ac901626ce', '964fb45a-eed1-48ef-b109-9ed34eac6e0c', '52f96a98-1ac8-4b6e-aa3c-02ab77905c16', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a09a239e-efaa-4985-b478-101838587edf', '964fb45a-eed1-48ef-b109-9ed34eac6e0c', 'e242e868-2bb7-4869-af4b-7ad480080c56', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f37c29fe-45ca-4bb5-a031-102dde1ad84f', '964fb45a-eed1-48ef-b109-9ed34eac6e0c', 'e6928c81-092d-4b96-ada3-5dcf9bab3962', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('759fb230-31b7-4f87-998f-8956fb738a63', '964fb45a-eed1-48ef-b109-9ed34eac6e0c', '5483798a-76bd-4d78-aca0-0d51ce803849', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('48a517e3-dbfb-4455-94cb-73145b845d84', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '20e1dea2-c044-4eca-a288-e444a3d21226', 'c8a52987-c3a6-4368-a31c-a2f6566399f1', 'submitted', timestamp '2025-01-15 12:00:00' - interval '24 hours' - interval '33 mins', timestamp '2025-01-15 12:00:00' - interval '24 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f6cf87f2-b77c-4db6-9871-964a24552d30', '48a517e3-dbfb-4455-94cb-73145b845d84', '9ec0420a-7f95-4e3f-ad37-b95948485c65', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0095d27e-aaf7-4ad8-be64-48af4e903142', '48a517e3-dbfb-4455-94cb-73145b845d84', '52f96a98-1ac8-4b6e-aa3c-02ab77905c16', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8e03ed88-8316-46c7-bf97-e707e57213b9', '48a517e3-dbfb-4455-94cb-73145b845d84', 'e242e868-2bb7-4869-af4b-7ad480080c56', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('53a2325c-49d2-468d-85b0-4dfa1d91b34e', '48a517e3-dbfb-4455-94cb-73145b845d84', 'e6928c81-092d-4b96-ada3-5dcf9bab3962', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cfc4de11-780a-42a2-8af4-e7a540a517da', '48a517e3-dbfb-4455-94cb-73145b845d84', '5483798a-76bd-4d78-aca0-0d51ce803849', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('2162fe20-559b-4599-8a06-47dc67272014', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'd716c53c-18e0-4a50-a4b5-37770e2326a3', 'cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'submitted', timestamp '2025-01-15 12:00:00' - interval '47 hours' - interval '21 mins', timestamp '2025-01-15 12:00:00' - interval '47 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('adb2a0af-d2c4-4beb-a714-b16186f0cf6c', '2162fe20-559b-4599-8a06-47dc67272014', '9ec0420a-7f95-4e3f-ad37-b95948485c65', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4b064eb3-d81e-4295-a4db-db9504cabca3', '2162fe20-559b-4599-8a06-47dc67272014', '52f96a98-1ac8-4b6e-aa3c-02ab77905c16', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('83907bba-7d26-416f-a30a-ca9067860577', '2162fe20-559b-4599-8a06-47dc67272014', 'e242e868-2bb7-4869-af4b-7ad480080c56', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('15d23949-2783-4124-918a-2496f06b4f82', '2162fe20-559b-4599-8a06-47dc67272014', 'e6928c81-092d-4b96-ada3-5dcf9bab3962', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c4d49be8-3eff-425c-ac43-87e7d7b5323b', '2162fe20-559b-4599-8a06-47dc67272014', '5483798a-76bd-4d78-aca0-0d51ce803849', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e46560b1-e049-49ae-8234-dd8fbc08964b', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '20e1dea2-c044-4eca-a288-e444a3d21226', 'cdfec676-c0dc-4c35-a5d8-79ba609e397d', 'submitted', timestamp '2025-01-15 12:00:00' - interval '19 hours' - interval '45 mins', timestamp '2025-01-15 12:00:00' - interval '19 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f80656c4-1365-42d7-a5ab-bfeda3cbd9c7', 'e46560b1-e049-49ae-8234-dd8fbc08964b', '9ec0420a-7f95-4e3f-ad37-b95948485c65', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b843978c-078e-41f7-83b5-2c724f37ba04', 'e46560b1-e049-49ae-8234-dd8fbc08964b', '52f96a98-1ac8-4b6e-aa3c-02ab77905c16', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cc948c4d-1a0e-4758-a3ae-db8e5ffb4187', 'e46560b1-e049-49ae-8234-dd8fbc08964b', 'e242e868-2bb7-4869-af4b-7ad480080c56', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fbc9e255-2273-427b-b648-864435ee79f7', 'e46560b1-e049-49ae-8234-dd8fbc08964b', 'e6928c81-092d-4b96-ada3-5dcf9bab3962', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8e4e4030-849a-425b-9e51-f4d7e0891491', 'e46560b1-e049-49ae-8234-dd8fbc08964b', '5483798a-76bd-4d78-aca0-0d51ce803849', 6) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('b64a60ef-99cb-42b0-8346-90c328f0b18f', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'd716c53c-18e0-4a50-a4b5-37770e2326a3', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', timestamp '2025-01-15 12:00:00' - interval '67 hours' - interval '24 mins', timestamp '2025-01-15 12:00:00' - interval '67 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2e14c64b-1820-48d9-9ab8-aaa45a1416d2', 'b64a60ef-99cb-42b0-8346-90c328f0b18f', '9ec0420a-7f95-4e3f-ad37-b95948485c65', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d139841a-4f13-4cb9-b6a6-4916ab09be12', 'b64a60ef-99cb-42b0-8346-90c328f0b18f', '52f96a98-1ac8-4b6e-aa3c-02ab77905c16', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('70ba33dc-1f0f-46ad-903e-8c10056575ab', 'b64a60ef-99cb-42b0-8346-90c328f0b18f', 'e242e868-2bb7-4869-af4b-7ad480080c56', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3290aab5-fda5-451a-8484-6f5a910d8162', 'b64a60ef-99cb-42b0-8346-90c328f0b18f', 'e6928c81-092d-4b96-ada3-5dcf9bab3962', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ee093a12-e8fd-43e6-8823-3745f5530e7b', 'b64a60ef-99cb-42b0-8346-90c328f0b18f', '5483798a-76bd-4d78-aca0-0d51ce803849', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('296e19b5-4ec9-4a62-8ae7-421cf66a8e16', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '20e1dea2-c044-4eca-a288-e444a3d21226', '405cb976-b946-4594-a572-1bdaaa5fd5c3', 'submitted', timestamp '2025-01-15 12:00:00' - interval '59 hours' - interval '31 mins', timestamp '2025-01-15 12:00:00' - interval '59 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c73a79be-16ab-4a5e-8bb6-848742ac8d8b', '296e19b5-4ec9-4a62-8ae7-421cf66a8e16', '9ec0420a-7f95-4e3f-ad37-b95948485c65', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('45c81bb2-80b9-47e0-8c5e-4524699403f6', '296e19b5-4ec9-4a62-8ae7-421cf66a8e16', '52f96a98-1ac8-4b6e-aa3c-02ab77905c16', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7b033a33-3f0a-45da-ae92-872e021aa5c9', '296e19b5-4ec9-4a62-8ae7-421cf66a8e16', 'e242e868-2bb7-4869-af4b-7ad480080c56', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('237e579a-afd6-4fe5-89bf-fa1256cb8fa6', '296e19b5-4ec9-4a62-8ae7-421cf66a8e16', 'e6928c81-092d-4b96-ada3-5dcf9bab3962', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f6b6bdb0-1f62-43a5-b046-75126818a8c4', '296e19b5-4ec9-4a62-8ae7-421cf66a8e16', '5483798a-76bd-4d78-aca0-0d51ce803849', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('1a48e1f3-7898-473b-b919-7169c30e56ca', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'd716c53c-18e0-4a50-a4b5-37770e2326a3', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', timestamp '2025-01-15 12:00:00' - interval '67 hours' - interval '24 mins', timestamp '2025-01-15 12:00:00' - interval '67 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4075d234-897d-465d-810c-2e9f8fdc593a', '1a48e1f3-7898-473b-b919-7169c30e56ca', '9ec0420a-7f95-4e3f-ad37-b95948485c65', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('263c1922-d87a-426a-a779-7c35bc960c40', '1a48e1f3-7898-473b-b919-7169c30e56ca', '52f96a98-1ac8-4b6e-aa3c-02ab77905c16', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4168fd59-b514-4004-8edc-ceab7a1a4144', '1a48e1f3-7898-473b-b919-7169c30e56ca', 'e242e868-2bb7-4869-af4b-7ad480080c56', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('701aaf00-8a3d-479d-b0fa-01e1b87298d2', '1a48e1f3-7898-473b-b919-7169c30e56ca', 'e6928c81-092d-4b96-ada3-5dcf9bab3962', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('63ba8ec4-6d89-4100-b517-206570eb656e', '1a48e1f3-7898-473b-b919-7169c30e56ca', '5483798a-76bd-4d78-aca0-0d51ce803849', 7) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('c16cf60f-8831-4267-8cc7-b788aae168b8', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '20e1dea2-c044-4eca-a288-e444a3d21226', '4880a479-e7ba-47bd-a66d-7b889755d7c0', 'submitted', timestamp '2025-01-15 12:00:00' - interval '69 hours' - interval '37 mins', timestamp '2025-01-15 12:00:00' - interval '69 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8eaaeeec-5a3f-4a36-89b6-83626223a393', 'c16cf60f-8831-4267-8cc7-b788aae168b8', '9ec0420a-7f95-4e3f-ad37-b95948485c65', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('395e33fe-b5e2-4099-bf27-6a1f024983f4', 'c16cf60f-8831-4267-8cc7-b788aae168b8', '52f96a98-1ac8-4b6e-aa3c-02ab77905c16', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('975f0a58-beec-4785-8d40-f7b3f7593976', 'c16cf60f-8831-4267-8cc7-b788aae168b8', 'e242e868-2bb7-4869-af4b-7ad480080c56', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4d9df49e-f189-483e-8309-7e54b2430766', 'c16cf60f-8831-4267-8cc7-b788aae168b8', 'e6928c81-092d-4b96-ada3-5dcf9bab3962', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b7f70fba-fe94-4788-b8c6-b8ae7e90bcc6', 'c16cf60f-8831-4267-8cc7-b788aae168b8', '5483798a-76bd-4d78-aca0-0d51ce803849', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7f226519-ec27-4491-9d8d-5f9ade146df5', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', 'd716c53c-18e0-4a50-a4b5-37770e2326a3', 'a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'submitted', timestamp '2025-01-15 12:00:00' - interval '27 hours' - interval '35 mins', timestamp '2025-01-15 12:00:00' - interval '27 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9aeca177-e4cd-481c-8cf0-84751f213f45', '7f226519-ec27-4491-9d8d-5f9ade146df5', '9ec0420a-7f95-4e3f-ad37-b95948485c65', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('063c13e4-ac7a-42ab-82a7-2a7b75e9be5e', '7f226519-ec27-4491-9d8d-5f9ade146df5', '52f96a98-1ac8-4b6e-aa3c-02ab77905c16', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d52ccf3e-1ec2-4b13-9735-2e73f289247e', '7f226519-ec27-4491-9d8d-5f9ade146df5', 'e242e868-2bb7-4869-af4b-7ad480080c56', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('35297d5c-71ca-437d-9de3-1eba3b863ade', '7f226519-ec27-4491-9d8d-5f9ade146df5', 'e6928c81-092d-4b96-ada3-5dcf9bab3962', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cd3c82e2-13ec-4967-bcf0-78711bef27f1', '7f226519-ec27-4491-9d8d-5f9ade146df5', '5483798a-76bd-4d78-aca0-0d51ce803849', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('83e020b3-c301-47e0-a431-d3f141af958e', 'f8c01197-da4a-4646-a42d-8dc74715e3bc', '20e1dea2-c044-4eca-a288-e444a3d21226', 'a6f1a5dd-ae98-4726-adf3-512181d2e08f', 'submitted', timestamp '2025-01-15 12:00:00' - interval '23 hours' - interval '30 mins', timestamp '2025-01-15 12:00:00' - interval '23 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9a939275-caa1-4f59-91b8-7fe6eebc4399', '83e020b3-c301-47e0-a431-d3f141af958e', '9ec0420a-7f95-4e3f-ad37-b95948485c65', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a315b764-b3df-4b34-bdaa-8f934826ae62', '83e020b3-c301-47e0-a431-d3f141af958e', '52f96a98-1ac8-4b6e-aa3c-02ab77905c16', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dc7a1f16-7703-4974-8a5c-0188129b0fb2', '83e020b3-c301-47e0-a431-d3f141af958e', 'e242e868-2bb7-4869-af4b-7ad480080c56', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b59faa51-6293-4bbf-9565-231a1c731fa9', '83e020b3-c301-47e0-a431-d3f141af958e', 'e6928c81-092d-4b96-ada3-5dcf9bab3962', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9d03e4b0-05eb-43bb-8d04-2bceaacf8335', '83e020b3-c301-47e0-a431-d3f141af958e', '5483798a-76bd-4d78-aca0-0d51ce803849', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('43fda337-0de3-40d5-9df6-4bae1a1ecd48', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '3b8b2e62-bc66-4c8c-ad14-371049c8204e', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'submitted', timestamp '2026-08-15 12:00:00' - interval '16 hours' - interval '40 mins', timestamp '2026-08-15 12:00:00' - interval '16 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3f6c6da5-7cb6-4a04-9e2b-73dfbe72ffee', '43fda337-0de3-40d5-9df6-4bae1a1ecd48', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7dbb919d-dddf-4426-b97b-071095192a06', '43fda337-0de3-40d5-9df6-4bae1a1ecd48', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('02b83bb2-0d07-4337-887e-0c49aa3a1a3a', '43fda337-0de3-40d5-9df6-4bae1a1ecd48', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f5c9438a-aa57-416a-a79e-457d7d889e3e', '43fda337-0de3-40d5-9df6-4bae1a1ecd48', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e767cbb9-be32-46f5-ad32-6e35ca4d97fc', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c23aa93d-d7c4-4b82-aee5-2d857b47638c', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'submitted', timestamp '2026-08-15 12:00:00' - interval '64 hours' - interval '25 mins', timestamp '2026-08-15 12:00:00' - interval '64 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1ba3abb1-92f4-4cbe-ab3d-6f375acd72e2', 'e767cbb9-be32-46f5-ad32-6e35ca4d97fc', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('46fa0197-0030-4e6f-80cd-f46edd2323e9', 'e767cbb9-be32-46f5-ad32-6e35ca4d97fc', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2146fcb6-56d9-44f7-bcd8-171136e84cb2', 'e767cbb9-be32-46f5-ad32-6e35ca4d97fc', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('def4160a-4f45-4276-9b24-badd439bdb15', 'e767cbb9-be32-46f5-ad32-6e35ca4d97fc', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a7589b66-fb50-49d5-a0c9-bfa1fc42d474', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '1b122688-dc8e-467d-aa9d-16a7c8dbd1a8', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'submitted', timestamp '2026-08-15 12:00:00' - interval '64 hours' - interval '37 mins', timestamp '2026-08-15 12:00:00' - interval '64 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5fddef53-d419-4340-92d0-7f3a29e32bcd', 'a7589b66-fb50-49d5-a0c9-bfa1fc42d474', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('12d07296-9390-424e-ad89-2f8ad8c22942', 'a7589b66-fb50-49d5-a0c9-bfa1fc42d474', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6ac0b1c3-30bf-4dc5-a430-f13d8b9f81a3', 'a7589b66-fb50-49d5-a0c9-bfa1fc42d474', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('72108c1d-f5ab-4fa0-8b47-e3a62a9e56fc', 'a7589b66-fb50-49d5-a0c9-bfa1fc42d474', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('06a5f21f-fe20-42e3-bedb-34d2e0218147', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c900eb14-5b94-461b-ac3d-f2a9075269b6', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'submitted', timestamp '2026-08-15 12:00:00' - interval '40 hours' - interval '34 mins', timestamp '2026-08-15 12:00:00' - interval '40 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c43fe768-1049-4da4-8241-0be8c044cb6a', '06a5f21f-fe20-42e3-bedb-34d2e0218147', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('361c061f-389f-4cdb-bd8a-3d1083e5c5d9', '06a5f21f-fe20-42e3-bedb-34d2e0218147', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('96d8ea67-f897-4655-b63e-23ff2591b8bc', '06a5f21f-fe20-42e3-bedb-34d2e0218147', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('94082d84-e98e-4bba-9e82-b351a9b332b8', '06a5f21f-fe20-42e3-bedb-34d2e0218147', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('ee51c6bb-5067-48ba-bfcb-e4eaf9aca750', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'ba5787ab-8196-4453-afd3-2e47c5185fb8', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'submitted', timestamp '2026-08-15 12:00:00' - interval '54 hours' - interval '32 mins', timestamp '2026-08-15 12:00:00' - interval '54 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9a6c2030-e154-4a90-9842-66bbcbbdc175', 'ee51c6bb-5067-48ba-bfcb-e4eaf9aca750', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c79ad153-3974-4623-9c00-823366f5bb86', 'ee51c6bb-5067-48ba-bfcb-e4eaf9aca750', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b46abcac-f05b-4560-aaf8-8f5587b2d9e5', 'ee51c6bb-5067-48ba-bfcb-e4eaf9aca750', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('87c191ac-4089-4168-afbe-4254612271c7', 'ee51c6bb-5067-48ba-bfcb-e4eaf9aca750', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('2375ebbf-d128-45f4-a570-4afcd968a611', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '3b8b2e62-bc66-4c8c-ad14-371049c8204e', '618aec67-dbed-41bf-ac48-c600f70c9fa5', 'submitted', timestamp '2026-08-15 12:00:00' - interval '25 hours' - interval '44 mins', timestamp '2026-08-15 12:00:00' - interval '25 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7191d82a-f434-4b49-8574-40020b0c96cf', '2375ebbf-d128-45f4-a570-4afcd968a611', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('64c9e2e4-c97f-496d-b855-577a1212c600', '2375ebbf-d128-45f4-a570-4afcd968a611', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('22513ad4-9fc3-4f8d-a103-7d61026f74cc', '2375ebbf-d128-45f4-a570-4afcd968a611', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c4e61031-a970-4317-bae0-0ae4403ad9d3', '2375ebbf-d128-45f4-a570-4afcd968a611', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('29b26479-94a8-4008-9374-e44db6d95117', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c23aa93d-d7c4-4b82-aee5-2d857b47638c', '618aec67-dbed-41bf-ac48-c600f70c9fa5', 'submitted', timestamp '2026-08-15 12:00:00' - interval '54 hours' - interval '39 mins', timestamp '2026-08-15 12:00:00' - interval '54 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b103f0a9-ac1c-49ce-bb1d-422e570c4b57', '29b26479-94a8-4008-9374-e44db6d95117', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dbd05d04-01f0-4a56-b0d5-0aa4fc074da9', '29b26479-94a8-4008-9374-e44db6d95117', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f2858e45-db61-4f3c-bf6a-8759deab438a', '29b26479-94a8-4008-9374-e44db6d95117', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fa915497-f8fc-4dc1-939d-537f5af7e3c0', '29b26479-94a8-4008-9374-e44db6d95117', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('44d8bb52-e01b-4e2e-bf01-8f8f5e904f7e', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '1b122688-dc8e-467d-aa9d-16a7c8dbd1a8', '618aec67-dbed-41bf-ac48-c600f70c9fa5', 'submitted', timestamp '2026-08-15 12:00:00' - interval '40 hours' - interval '27 mins', timestamp '2026-08-15 12:00:00' - interval '40 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c20626f2-7e0c-4195-9db7-e65738c106fb', '44d8bb52-e01b-4e2e-bf01-8f8f5e904f7e', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9f67b926-4acb-4ce0-9f2b-2bd01ce5214b', '44d8bb52-e01b-4e2e-bf01-8f8f5e904f7e', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dac8d819-ffd5-406d-b636-f82ae658f50c', '44d8bb52-e01b-4e2e-bf01-8f8f5e904f7e', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4f531fe3-b620-4087-ab0c-514f43e05302', '44d8bb52-e01b-4e2e-bf01-8f8f5e904f7e', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('40e67e95-ab1a-4718-99a8-21482b781509', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c900eb14-5b94-461b-ac3d-f2a9075269b6', '618aec67-dbed-41bf-ac48-c600f70c9fa5', 'submitted', timestamp '2026-08-15 12:00:00' - interval '45 hours' - interval '42 mins', timestamp '2026-08-15 12:00:00' - interval '45 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3a3233ac-4e20-45e9-afe5-dfdcc4f824b4', '40e67e95-ab1a-4718-99a8-21482b781509', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d5787184-b03f-4e8a-a53e-7a874dbb2fcb', '40e67e95-ab1a-4718-99a8-21482b781509', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('94a1b27b-9fb2-448d-9634-7bf1ef390591', '40e67e95-ab1a-4718-99a8-21482b781509', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0819cea7-1deb-4d5b-94d7-7c90d08d5ab2', '40e67e95-ab1a-4718-99a8-21482b781509', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('5a2df511-8fdb-4b8e-a232-1289b646b03c', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'ba5787ab-8196-4453-afd3-2e47c5185fb8', '618aec67-dbed-41bf-ac48-c600f70c9fa5', 'submitted', timestamp '2026-08-15 12:00:00' - interval '11 hours' - interval '24 mins', timestamp '2026-08-15 12:00:00' - interval '11 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f757d71e-99b8-4833-a95e-c8470192af43', '5a2df511-8fdb-4b8e-a232-1289b646b03c', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2111b625-1ab3-43e8-849e-570882e6e526', '5a2df511-8fdb-4b8e-a232-1289b646b03c', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4337301f-5580-43d4-b982-1895ae7d0b73', '5a2df511-8fdb-4b8e-a232-1289b646b03c', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('60d3fbd0-8bdd-440e-9a97-1fcf68069dc8', '5a2df511-8fdb-4b8e-a232-1289b646b03c', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('86357d69-fdb0-46a1-ad78-3b1fe3710fe8', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '3b8b2e62-bc66-4c8c-ad14-371049c8204e', '8a98e32c-a076-407a-a0c5-18badfbd546d', 'submitted', timestamp '2026-08-15 12:00:00' - interval '63 hours' - interval '24 mins', timestamp '2026-08-15 12:00:00' - interval '63 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7722191d-f909-417a-8ae0-b72af9687d1a', '86357d69-fdb0-46a1-ad78-3b1fe3710fe8', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('894fdc54-322a-45cc-ada1-e5e49fd557d6', '86357d69-fdb0-46a1-ad78-3b1fe3710fe8', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5668d56b-35d0-46c0-8951-8da2699a63d1', '86357d69-fdb0-46a1-ad78-3b1fe3710fe8', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('46b8ca1d-2593-4370-ad63-bf73a8486991', '86357d69-fdb0-46a1-ad78-3b1fe3710fe8', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('aa27c95b-3664-47b3-971b-18fb2a99a465', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c23aa93d-d7c4-4b82-aee5-2d857b47638c', '8a98e32c-a076-407a-a0c5-18badfbd546d', 'submitted', timestamp '2026-08-15 12:00:00' - interval '12 hours' - interval '44 mins', timestamp '2026-08-15 12:00:00' - interval '12 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c77645e9-6405-4474-843d-e4b8c4c5553f', 'aa27c95b-3664-47b3-971b-18fb2a99a465', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fbe4100e-ba3b-4d4c-8f38-c873ef1f6b09', 'aa27c95b-3664-47b3-971b-18fb2a99a465', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('32c6b997-3d84-4fe2-be4a-4c7ca6ebd9c8', 'aa27c95b-3664-47b3-971b-18fb2a99a465', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0c125e4e-e733-4445-89f9-cef4bcfeaad4', 'aa27c95b-3664-47b3-971b-18fb2a99a465', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e746ac6e-40ff-44c9-a4a7-4a5f7f9658e8', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '1b122688-dc8e-467d-aa9d-16a7c8dbd1a8', '8a98e32c-a076-407a-a0c5-18badfbd546d', 'submitted', timestamp '2026-08-15 12:00:00' - interval '49 hours' - interval '43 mins', timestamp '2026-08-15 12:00:00' - interval '49 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ec94b07a-da3b-4d92-a65f-968277c554d2', 'e746ac6e-40ff-44c9-a4a7-4a5f7f9658e8', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7fd7524c-7f94-4ef0-874e-9ab4a12771f9', 'e746ac6e-40ff-44c9-a4a7-4a5f7f9658e8', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('92cd964f-a107-4b8d-a96d-388c0a0a2dfc', 'e746ac6e-40ff-44c9-a4a7-4a5f7f9658e8', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9d0dea02-0dcf-45a6-b41f-4bb8315704fb', 'e746ac6e-40ff-44c9-a4a7-4a5f7f9658e8', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e798d063-ee3b-4721-a3c0-cc94e309b32b', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c900eb14-5b94-461b-ac3d-f2a9075269b6', '8a98e32c-a076-407a-a0c5-18badfbd546d', 'submitted', timestamp '2026-08-15 12:00:00' - interval '47 hours' - interval '44 mins', timestamp '2026-08-15 12:00:00' - interval '47 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4cfb0e9a-d9a4-4ad7-a70f-03ced519ae32', 'e798d063-ee3b-4721-a3c0-cc94e309b32b', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fe8ebdee-c2fa-4399-94ec-1b1aea604788', 'e798d063-ee3b-4721-a3c0-cc94e309b32b', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1f740c34-8d19-4748-9114-c4c38a31abcb', 'e798d063-ee3b-4721-a3c0-cc94e309b32b', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e17f0237-ab52-4b48-8a7a-67699d4a8a06', 'e798d063-ee3b-4721-a3c0-cc94e309b32b', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('2268b54c-9d5b-4323-a5a5-fc02de32429a', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'ba5787ab-8196-4453-afd3-2e47c5185fb8', '8a98e32c-a076-407a-a0c5-18badfbd546d', 'submitted', timestamp '2026-08-15 12:00:00' - interval '2 hours' - interval '26 mins', timestamp '2026-08-15 12:00:00' - interval '2 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('68761e41-6e6c-47b9-949f-c8611398c499', '2268b54c-9d5b-4323-a5a5-fc02de32429a', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fc2e0af3-024a-4e93-a441-3745b6abcc9c', '2268b54c-9d5b-4323-a5a5-fc02de32429a', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('da1507ee-274a-46b7-bde7-c484a9072434', '2268b54c-9d5b-4323-a5a5-fc02de32429a', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a93140fa-1e2d-4a76-b338-7b6d7b359e60', '2268b54c-9d5b-4323-a5a5-fc02de32429a', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('2eaa10a8-36b9-4e40-9bd0-e4b9dc6f8b31', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '3b8b2e62-bc66-4c8c-ad14-371049c8204e', 'e4550b83-b849-4977-a7b0-dc011fad64f5', 'submitted', timestamp '2026-08-15 12:00:00' - interval '52 hours' - interval '43 mins', timestamp '2026-08-15 12:00:00' - interval '52 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b18c0957-c9eb-4e08-8209-5f666009175f', '2eaa10a8-36b9-4e40-9bd0-e4b9dc6f8b31', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ab97ce56-3c1e-4e15-81d4-d8eea9c2dfd5', '2eaa10a8-36b9-4e40-9bd0-e4b9dc6f8b31', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c6877873-8429-477f-8236-fc650b12179e', '2eaa10a8-36b9-4e40-9bd0-e4b9dc6f8b31', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('719eb944-0461-41e4-b425-948c19845149', '2eaa10a8-36b9-4e40-9bd0-e4b9dc6f8b31', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('79f35830-6577-4a01-beb9-7d4fe0ac4e1e', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'ba5787ab-8196-4453-afd3-2e47c5185fb8', 'e4550b83-b849-4977-a7b0-dc011fad64f5', 'in_progress', timestamp '2026-08-15 12:00:00' - interval '71 hours' - interval '38 mins', timestamp '2026-08-15 12:00:00' - interval '71 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b8c32164-b759-4395-a044-883859820d22', '79f35830-6577-4a01-beb9-7d4fe0ac4e1e', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('0c53147d-6537-43fc-9f51-ded81ada72c7', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '3b8b2e62-bc66-4c8c-ad14-371049c8204e', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', timestamp '2026-08-15 12:00:00' - interval '71 hours' - interval '20 mins', timestamp '2026-08-15 12:00:00' - interval '71 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b5803fb0-8bf7-44e8-baa4-7c0c163ec13a', '0c53147d-6537-43fc-9f51-ded81ada72c7', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2d957139-87a3-458f-907a-560efee75d5d', '0c53147d-6537-43fc-9f51-ded81ada72c7', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3a6c0f66-0fde-449a-92f3-8e5f21312bfb', '0c53147d-6537-43fc-9f51-ded81ada72c7', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e443d284-6c16-4497-a0b8-cd9e31660522', '0c53147d-6537-43fc-9f51-ded81ada72c7', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('46ac868b-ede5-4f79-ba37-2aa74f56d703', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c23aa93d-d7c4-4b82-aee5-2d857b47638c', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', timestamp '2026-08-15 12:00:00' - interval '2 hours' - interval '42 mins', timestamp '2026-08-15 12:00:00' - interval '2 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e523c18a-55f4-4af7-a8e2-80de357044b5', '46ac868b-ede5-4f79-ba37-2aa74f56d703', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('da73cc48-ab88-44a6-b029-f174d9ef3e96', '46ac868b-ede5-4f79-ba37-2aa74f56d703', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dc3332d6-bf9a-4a6f-9908-35b3a44b51d8', '46ac868b-ede5-4f79-ba37-2aa74f56d703', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('502af159-e373-4e8d-a486-eb49967ab5e3', '46ac868b-ede5-4f79-ba37-2aa74f56d703', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e2df381e-1ea4-49a2-9e80-551259b53220', 'e77bf882-fc32-461c-acab-6ee1696df0c7', '1b122688-dc8e-467d-aa9d-16a7c8dbd1a8', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', timestamp '2026-08-15 12:00:00' - interval '48 hours' - interval '30 mins', timestamp '2026-08-15 12:00:00' - interval '48 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7288a16d-7cce-4954-b041-8e6695ed5df2', 'e2df381e-1ea4-49a2-9e80-551259b53220', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f85b346f-40b1-4645-9ba3-50440fde0a31', 'e2df381e-1ea4-49a2-9e80-551259b53220', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('591ac475-65aa-4fd2-adc6-4598c5af1476', 'e2df381e-1ea4-49a2-9e80-551259b53220', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e1c9edb8-0cdc-42ab-8b80-bac4b9ddd359', 'e2df381e-1ea4-49a2-9e80-551259b53220', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('508ab1d0-da32-4b52-be00-288c0ad57bd7', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'c900eb14-5b94-461b-ac3d-f2a9075269b6', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', timestamp '2026-08-15 12:00:00' - interval '4 hours' - interval '24 mins', timestamp '2026-08-15 12:00:00' - interval '4 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2254ee67-9894-471f-8d45-4afc9f340fe3', '508ab1d0-da32-4b52-be00-288c0ad57bd7', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('afc4076f-9b8f-40b1-ac5b-9c7c7319dcde', '508ab1d0-da32-4b52-be00-288c0ad57bd7', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7102e582-6265-4926-9398-3b715ef39704', '508ab1d0-da32-4b52-be00-288c0ad57bd7', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ba1474ad-5b39-4aa9-9c46-1e945e3997ac', '508ab1d0-da32-4b52-be00-288c0ad57bd7', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('ba1ff403-6fc0-4eac-9e62-a65f5d5a84aa', 'e77bf882-fc32-461c-acab-6ee1696df0c7', 'ba5787ab-8196-4453-afd3-2e47c5185fb8', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', timestamp '2026-08-15 12:00:00' - interval '48 hours' - interval '37 mins', timestamp '2026-08-15 12:00:00' - interval '48 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('63bd983f-92ba-448d-8b9b-f674fc8d0965', 'ba1ff403-6fc0-4eac-9e62-a65f5d5a84aa', '3827321e-25d3-4ec5-ab6a-d8fb8d5f65fd', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b575fe20-ff69-4960-86ad-e45d8d183ffb', 'ba1ff403-6fc0-4eac-9e62-a65f5d5a84aa', 'c561d84a-3cda-4605-a33c-1ceb37ebed21', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('60c4ccc6-8102-4b61-a700-709e2f380db7', 'ba1ff403-6fc0-4eac-9e62-a65f5d5a84aa', 'e10f1abe-f5f6-4530-ac12-708e65ef8c8f', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a6b0a4e0-c73b-47fb-bd24-20931bd00204', 'ba1ff403-6fc0-4eac-9e62-a65f5d5a84aa', 'cf788ee1-eb7f-4aad-a0f7-4b6a6fcb8164', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('bc5d7653-6808-400c-9ba9-db536769b49a', '308d2708-dbea-41b6-a1c8-da6129445759', 'b6718b6b-02a8-444b-a8ec-ff82aad1b946', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', timestamp '2025-08-15 12:00:00' - interval '56 hours' - interval '20 mins', timestamp '2025-08-15 12:00:00' - interval '56 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bf016d7a-51bd-4e97-8d15-38746b15992a', 'bc5d7653-6808-400c-9ba9-db536769b49a', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('40c51961-609e-4715-abbd-ecdc19fe3779', 'bc5d7653-6808-400c-9ba9-db536769b49a', '9291055e-e458-479e-a0de-bd69595777ff', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1295edfa-1153-4c15-8e67-3284c134d1e1', 'bc5d7653-6808-400c-9ba9-db536769b49a', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('81bbc5e8-9607-4a6a-8a15-c5d887457184', 'bc5d7653-6808-400c-9ba9-db536769b49a', '34e60116-c678-4d43-a5a3-6ed510928812', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('2d2bc14a-dd69-49df-a27a-ab632da23d33', '308d2708-dbea-41b6-a1c8-da6129445759', '75baa7d0-6001-4420-a744-5b46e6483201', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', timestamp '2025-08-15 12:00:00' - interval '48 hours' - interval '39 mins', timestamp '2025-08-15 12:00:00' - interval '48 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1a4da597-2d2a-469e-82d4-b67932428fd5', '2d2bc14a-dd69-49df-a27a-ab632da23d33', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('496aef77-758b-40d3-896a-2ffb93547b0d', '2d2bc14a-dd69-49df-a27a-ab632da23d33', '9291055e-e458-479e-a0de-bd69595777ff', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('64eb11f4-4fbb-4d28-a839-268ba9831fb0', '2d2bc14a-dd69-49df-a27a-ab632da23d33', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e4c3563c-d8d9-4454-915c-66e8c1e0f14a', '2d2bc14a-dd69-49df-a27a-ab632da23d33', '34e60116-c678-4d43-a5a3-6ed510928812', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('55661d51-9adf-4c00-bb68-19888aca09ed', '308d2708-dbea-41b6-a1c8-da6129445759', '35607ef7-b333-4b5b-aa1a-e7ebd1a57d32', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', timestamp '2025-08-15 12:00:00' - interval '21 hours' - interval '42 mins', timestamp '2025-08-15 12:00:00' - interval '21 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e0ecb5ba-b818-41ac-9901-b0df16628bfe', '55661d51-9adf-4c00-bb68-19888aca09ed', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('852abc5d-ba87-496d-b6d8-30fbce74cf0d', '55661d51-9adf-4c00-bb68-19888aca09ed', '9291055e-e458-479e-a0de-bd69595777ff', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c89f9e5d-293a-4198-b9d5-38bc74280031', '55661d51-9adf-4c00-bb68-19888aca09ed', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8687f344-5b5b-4e96-8acd-37531293206b', '55661d51-9adf-4c00-bb68-19888aca09ed', '34e60116-c678-4d43-a5a3-6ed510928812', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a967bb15-3e0a-4180-b8a4-fe4d433de1ab', '308d2708-dbea-41b6-a1c8-da6129445759', 'accfb911-acf9-481e-a167-d4ba6eaa9aaa', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', timestamp '2025-08-15 12:00:00' - interval '14 hours' - interval '36 mins', timestamp '2025-08-15 12:00:00' - interval '14 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5acf28a1-e7c7-454e-ab1b-a0a01e09248e', 'a967bb15-3e0a-4180-b8a4-fe4d433de1ab', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('db80c596-f781-4133-9538-96036424ffc3', 'a967bb15-3e0a-4180-b8a4-fe4d433de1ab', '9291055e-e458-479e-a0de-bd69595777ff', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('093defec-55ba-4597-8aa8-c5b4f2afcd05', 'a967bb15-3e0a-4180-b8a4-fe4d433de1ab', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d87af120-df53-4cbc-a7a9-54af2e2ba695', 'a967bb15-3e0a-4180-b8a4-fe4d433de1ab', '34e60116-c678-4d43-a5a3-6ed510928812', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('591a9311-24c3-43b0-aa35-7db0f793d718', '308d2708-dbea-41b6-a1c8-da6129445759', 'b6718b6b-02a8-444b-a8ec-ff82aad1b946', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'submitted', timestamp '2025-08-15 12:00:00' - interval '11 hours' - interval '39 mins', timestamp '2025-08-15 12:00:00' - interval '11 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dd98ebf0-a407-478c-a6ed-e02f347272c8', '591a9311-24c3-43b0-aa35-7db0f793d718', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e83990f1-5d1a-49c6-af5d-35dac92cd8af', '591a9311-24c3-43b0-aa35-7db0f793d718', '9291055e-e458-479e-a0de-bd69595777ff', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3187f0a3-46b1-4841-8f52-43cd115629f3', '591a9311-24c3-43b0-aa35-7db0f793d718', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c958bd3f-500d-4b6a-9b33-eb165299fca5', '591a9311-24c3-43b0-aa35-7db0f793d718', '34e60116-c678-4d43-a5a3-6ed510928812', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('0e3d1485-4d44-4302-b143-de7d407d42c0', '308d2708-dbea-41b6-a1c8-da6129445759', '75baa7d0-6001-4420-a744-5b46e6483201', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'submitted', timestamp '2025-08-15 12:00:00' - interval '7 hours' - interval '42 mins', timestamp '2025-08-15 12:00:00' - interval '7 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('450a674b-b22a-4e66-b341-a218456c623d', '0e3d1485-4d44-4302-b143-de7d407d42c0', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f0a2d551-b2bf-4064-a6d1-e2b14403b5d5', '0e3d1485-4d44-4302-b143-de7d407d42c0', '9291055e-e458-479e-a0de-bd69595777ff', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e6589d7b-5433-4dca-b0ec-e49614b90542', '0e3d1485-4d44-4302-b143-de7d407d42c0', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f72f02df-f29d-4d0f-8691-6ec6d7eedb57', '0e3d1485-4d44-4302-b143-de7d407d42c0', '34e60116-c678-4d43-a5a3-6ed510928812', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('94c53760-a52d-4bbc-96e5-68630235b3eb', '308d2708-dbea-41b6-a1c8-da6129445759', '35607ef7-b333-4b5b-aa1a-e7ebd1a57d32', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'submitted', timestamp '2025-08-15 12:00:00' - interval '52 hours' - interval '21 mins', timestamp '2025-08-15 12:00:00' - interval '52 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('acb37eaf-4a83-452a-902c-30cfa407f2f8', '94c53760-a52d-4bbc-96e5-68630235b3eb', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e9f738ac-0ee9-408a-9852-1337e8f492bb', '94c53760-a52d-4bbc-96e5-68630235b3eb', '9291055e-e458-479e-a0de-bd69595777ff', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ebffcde0-c6f7-4498-819c-d371eab901c6', '94c53760-a52d-4bbc-96e5-68630235b3eb', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1f942c03-5720-4683-9d6b-49d4713d6b41', '94c53760-a52d-4bbc-96e5-68630235b3eb', '34e60116-c678-4d43-a5a3-6ed510928812', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('da09ad4d-52d9-474a-96aa-b1b0afcaba76', '308d2708-dbea-41b6-a1c8-da6129445759', 'accfb911-acf9-481e-a167-d4ba6eaa9aaa', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'submitted', timestamp '2025-08-15 12:00:00' - interval '46 hours' - interval '28 mins', timestamp '2025-08-15 12:00:00' - interval '46 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c16e7716-44eb-499e-bf87-73e6036af3dd', 'da09ad4d-52d9-474a-96aa-b1b0afcaba76', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4aafa924-6c6f-4544-b55b-69f172d7db55', 'da09ad4d-52d9-474a-96aa-b1b0afcaba76', '9291055e-e458-479e-a0de-bd69595777ff', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('69676420-382b-46d5-a223-f505efd7ef38', 'da09ad4d-52d9-474a-96aa-b1b0afcaba76', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('56b29d49-484e-41eb-94da-ce881ed5f207', 'da09ad4d-52d9-474a-96aa-b1b0afcaba76', '34e60116-c678-4d43-a5a3-6ed510928812', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('622009c1-1635-424e-a04c-ee4b5a1944e7', '308d2708-dbea-41b6-a1c8-da6129445759', 'b6718b6b-02a8-444b-a8ec-ff82aad1b946', '618aec67-dbed-41bf-ac48-c600f70c9fa5', 'submitted', timestamp '2025-08-15 12:00:00' - interval '66 hours' - interval '24 mins', timestamp '2025-08-15 12:00:00' - interval '66 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a3bf3009-12d4-406c-ae06-13a6fda24e8c', '622009c1-1635-424e-a04c-ee4b5a1944e7', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('89689c93-0574-4bf8-a651-a8d7f986661a', '622009c1-1635-424e-a04c-ee4b5a1944e7', '9291055e-e458-479e-a0de-bd69595777ff', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2c6eeb61-9a1a-45a5-b481-c950cc998075', '622009c1-1635-424e-a04c-ee4b5a1944e7', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cf4059fa-756b-4cc5-bb90-4b9d2fcd75ae', '622009c1-1635-424e-a04c-ee4b5a1944e7', '34e60116-c678-4d43-a5a3-6ed510928812', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('32ebeef4-e9d8-433a-b861-8530497ba1b9', '308d2708-dbea-41b6-a1c8-da6129445759', '75baa7d0-6001-4420-a744-5b46e6483201', '618aec67-dbed-41bf-ac48-c600f70c9fa5', 'submitted', timestamp '2025-08-15 12:00:00' - interval '5 hours' - interval '43 mins', timestamp '2025-08-15 12:00:00' - interval '5 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c662ed87-75f0-4c55-912a-0f1212fa485d', '32ebeef4-e9d8-433a-b861-8530497ba1b9', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fc93a958-62ba-43e9-a10e-f49c602cf8d0', '32ebeef4-e9d8-433a-b861-8530497ba1b9', '9291055e-e458-479e-a0de-bd69595777ff', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('576a1147-a5d1-41e7-89d0-aeec3fd4271c', '32ebeef4-e9d8-433a-b861-8530497ba1b9', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0e3fec36-650d-4c74-91f0-c29ac2857434', '32ebeef4-e9d8-433a-b861-8530497ba1b9', '34e60116-c678-4d43-a5a3-6ed510928812', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('f371cb84-7951-48e9-9690-a0b2b74e802a', '308d2708-dbea-41b6-a1c8-da6129445759', '35607ef7-b333-4b5b-aa1a-e7ebd1a57d32', '618aec67-dbed-41bf-ac48-c600f70c9fa5', 'submitted', timestamp '2025-08-15 12:00:00' - interval '17 hours' - interval '41 mins', timestamp '2025-08-15 12:00:00' - interval '17 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('91e4f10d-eae3-4053-902a-9b66aa9badcd', 'f371cb84-7951-48e9-9690-a0b2b74e802a', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f2460ff0-1004-4f58-afa7-5acf9926796d', 'f371cb84-7951-48e9-9690-a0b2b74e802a', '9291055e-e458-479e-a0de-bd69595777ff', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1f901b6e-0c77-406a-9c01-6ab048dac4a7', 'f371cb84-7951-48e9-9690-a0b2b74e802a', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0efd5df7-2b7e-44aa-8268-9edcbd622c53', 'f371cb84-7951-48e9-9690-a0b2b74e802a', '34e60116-c678-4d43-a5a3-6ed510928812', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7b9028cb-a9e6-4872-88fc-0f5db79c8e03', '308d2708-dbea-41b6-a1c8-da6129445759', 'accfb911-acf9-481e-a167-d4ba6eaa9aaa', '618aec67-dbed-41bf-ac48-c600f70c9fa5', 'submitted', timestamp '2025-08-15 12:00:00' - interval '2 hours' - interval '20 mins', timestamp '2025-08-15 12:00:00' - interval '2 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e25cc0e5-23fa-4135-ab1b-d5ea2a3a832e', '7b9028cb-a9e6-4872-88fc-0f5db79c8e03', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1467553f-21d2-40c6-84c1-00e51e01f5e6', '7b9028cb-a9e6-4872-88fc-0f5db79c8e03', '9291055e-e458-479e-a0de-bd69595777ff', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cd8c5b4d-05c0-4c01-9cb1-17997c8aaf06', '7b9028cb-a9e6-4872-88fc-0f5db79c8e03', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7bf4d86b-df92-449d-a5e4-8853c80aedb0', '7b9028cb-a9e6-4872-88fc-0f5db79c8e03', '34e60116-c678-4d43-a5a3-6ed510928812', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('4bf3834c-b082-4580-b39c-76a30663e24f', '308d2708-dbea-41b6-a1c8-da6129445759', 'b6718b6b-02a8-444b-a8ec-ff82aad1b946', '8a98e32c-a076-407a-a0c5-18badfbd546d', 'submitted', timestamp '2025-08-15 12:00:00' - interval '71 hours' - interval '44 mins', timestamp '2025-08-15 12:00:00' - interval '71 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e9506e54-dd47-40e3-8231-5374c4290298', '4bf3834c-b082-4580-b39c-76a30663e24f', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3a64a308-aff5-4845-bd78-81761d8d612f', '4bf3834c-b082-4580-b39c-76a30663e24f', '9291055e-e458-479e-a0de-bd69595777ff', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('add77aef-9fa1-4969-8d22-260c749c15fd', '4bf3834c-b082-4580-b39c-76a30663e24f', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c6339799-b346-4fa4-8f81-aedf84c0c338', '4bf3834c-b082-4580-b39c-76a30663e24f', '34e60116-c678-4d43-a5a3-6ed510928812', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('854b4902-6bd2-439e-87ef-770d7b6e6ac7', '308d2708-dbea-41b6-a1c8-da6129445759', '75baa7d0-6001-4420-a744-5b46e6483201', '8a98e32c-a076-407a-a0c5-18badfbd546d', 'submitted', timestamp '2025-08-15 12:00:00' - interval '26 hours' - interval '40 mins', timestamp '2025-08-15 12:00:00' - interval '26 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b9c1720b-3223-4da2-8445-ecd1f472dad4', '854b4902-6bd2-439e-87ef-770d7b6e6ac7', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0ab7ede7-82aa-475e-bfb5-53d9cea8d5a4', '854b4902-6bd2-439e-87ef-770d7b6e6ac7', '9291055e-e458-479e-a0de-bd69595777ff', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9c50285e-bdae-4e3b-afb0-6d36198ddada', '854b4902-6bd2-439e-87ef-770d7b6e6ac7', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e0650844-6435-402e-893c-cb7fe37f8c0d', '854b4902-6bd2-439e-87ef-770d7b6e6ac7', '34e60116-c678-4d43-a5a3-6ed510928812', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('5dafc6ee-4ce7-4c0a-9d66-bb72c1b6cb26', '308d2708-dbea-41b6-a1c8-da6129445759', '35607ef7-b333-4b5b-aa1a-e7ebd1a57d32', '8a98e32c-a076-407a-a0c5-18badfbd546d', 'submitted', timestamp '2025-08-15 12:00:00' - interval '25 hours' - interval '33 mins', timestamp '2025-08-15 12:00:00' - interval '25 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3255a0c3-efeb-4e34-9079-2275ac0ced1a', '5dafc6ee-4ce7-4c0a-9d66-bb72c1b6cb26', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('41bc7790-b803-4671-8c63-1ae53a9b8dda', '5dafc6ee-4ce7-4c0a-9d66-bb72c1b6cb26', '9291055e-e458-479e-a0de-bd69595777ff', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('124e5444-5828-4664-b7e3-ba0afa780359', '5dafc6ee-4ce7-4c0a-9d66-bb72c1b6cb26', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('157fd126-d4e8-45e1-8693-5bea037d2b6b', '5dafc6ee-4ce7-4c0a-9d66-bb72c1b6cb26', '34e60116-c678-4d43-a5a3-6ed510928812', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('469ae87e-d84e-4822-b6b3-63d52798f18b', '308d2708-dbea-41b6-a1c8-da6129445759', 'accfb911-acf9-481e-a167-d4ba6eaa9aaa', '8a98e32c-a076-407a-a0c5-18badfbd546d', 'submitted', timestamp '2025-08-15 12:00:00' - interval '61 hours' - interval '29 mins', timestamp '2025-08-15 12:00:00' - interval '61 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('73891473-4ced-4645-a516-4278d9657f33', '469ae87e-d84e-4822-b6b3-63d52798f18b', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('248d771a-59f9-44c3-a564-30702c518ce5', '469ae87e-d84e-4822-b6b3-63d52798f18b', '9291055e-e458-479e-a0de-bd69595777ff', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7b88b743-43cf-4641-b90a-063f920fde9f', '469ae87e-d84e-4822-b6b3-63d52798f18b', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('756fafff-1b45-4d47-9334-fd4b2724e283', '469ae87e-d84e-4822-b6b3-63d52798f18b', '34e60116-c678-4d43-a5a3-6ed510928812', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('cceba75e-ce3b-4e8f-8670-897edc704d66', '308d2708-dbea-41b6-a1c8-da6129445759', 'b6718b6b-02a8-444b-a8ec-ff82aad1b946', 'e4550b83-b849-4977-a7b0-dc011fad64f5', 'submitted', timestamp '2025-08-15 12:00:00' - interval '27 hours' - interval '37 mins', timestamp '2025-08-15 12:00:00' - interval '27 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('996bb13a-2542-4c03-8de8-99416fdbeb33', 'cceba75e-ce3b-4e8f-8670-897edc704d66', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('66989a39-0e05-4137-bd11-e2ce6bb7b5a1', 'cceba75e-ce3b-4e8f-8670-897edc704d66', '9291055e-e458-479e-a0de-bd69595777ff', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a696be5c-41a7-4498-a4f5-c706d33d741c', 'cceba75e-ce3b-4e8f-8670-897edc704d66', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('452cf199-7a88-4783-a416-37a805a55df2', 'cceba75e-ce3b-4e8f-8670-897edc704d66', '34e60116-c678-4d43-a5a3-6ed510928812', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('99d0a6e0-bbf8-4574-942a-645c384195a9', '308d2708-dbea-41b6-a1c8-da6129445759', '75baa7d0-6001-4420-a744-5b46e6483201', 'e4550b83-b849-4977-a7b0-dc011fad64f5', 'submitted', timestamp '2025-08-15 12:00:00' - interval '62 hours' - interval '41 mins', timestamp '2025-08-15 12:00:00' - interval '62 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('87822264-20b8-4361-b9b9-efd91a39bbe0', '99d0a6e0-bbf8-4574-942a-645c384195a9', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a27ced5f-c085-45dc-8107-49e7818bd272', '99d0a6e0-bbf8-4574-942a-645c384195a9', '9291055e-e458-479e-a0de-bd69595777ff', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cb80b9b1-8784-48d1-b23c-6806f6ee9827', '99d0a6e0-bbf8-4574-942a-645c384195a9', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b4604c5e-f70b-4f8a-904d-daa2be1fd085', '99d0a6e0-bbf8-4574-942a-645c384195a9', '34e60116-c678-4d43-a5a3-6ed510928812', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('09728065-cd64-42c7-8d93-505651523f05', '308d2708-dbea-41b6-a1c8-da6129445759', '35607ef7-b333-4b5b-aa1a-e7ebd1a57d32', 'e4550b83-b849-4977-a7b0-dc011fad64f5', 'submitted', timestamp '2025-08-15 12:00:00' - interval '6 hours' - interval '33 mins', timestamp '2025-08-15 12:00:00' - interval '6 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('42791a30-f105-413a-8420-ff4926101375', '09728065-cd64-42c7-8d93-505651523f05', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9ef26273-3615-493e-a532-c9a84dc1d3a4', '09728065-cd64-42c7-8d93-505651523f05', '9291055e-e458-479e-a0de-bd69595777ff', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a8c0701e-bc72-47d4-9a46-71095dd646ab', '09728065-cd64-42c7-8d93-505651523f05', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e64a8238-7650-4968-bf28-8acf7b1472c8', '09728065-cd64-42c7-8d93-505651523f05', '34e60116-c678-4d43-a5a3-6ed510928812', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('6a8f481c-c4f8-44d7-a4ef-1a681fac0a8f', '308d2708-dbea-41b6-a1c8-da6129445759', 'accfb911-acf9-481e-a167-d4ba6eaa9aaa', 'e4550b83-b849-4977-a7b0-dc011fad64f5', 'submitted', timestamp '2025-08-15 12:00:00' - interval '65 hours' - interval '21 mins', timestamp '2025-08-15 12:00:00' - interval '65 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('33b8a924-17a3-4856-b6a4-6370869dea9d', '6a8f481c-c4f8-44d7-a4ef-1a681fac0a8f', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bb4d0972-8e6f-435f-b14c-513a1f4c4dcb', '6a8f481c-c4f8-44d7-a4ef-1a681fac0a8f', '9291055e-e458-479e-a0de-bd69595777ff', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cbaeb8c2-d2bd-427d-a7f0-dca5d30eacbc', '6a8f481c-c4f8-44d7-a4ef-1a681fac0a8f', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cd2ec43f-9432-4433-836b-aaf8ba4f95bf', '6a8f481c-c4f8-44d7-a4ef-1a681fac0a8f', '34e60116-c678-4d43-a5a3-6ed510928812', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7092d019-f16f-4f2d-9eab-7d65144a2aed', '308d2708-dbea-41b6-a1c8-da6129445759', 'b6718b6b-02a8-444b-a8ec-ff82aad1b946', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', timestamp '2025-08-15 12:00:00' - interval '53 hours' - interval '39 mins', timestamp '2025-08-15 12:00:00' - interval '53 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5d03e9e5-0ed8-4036-ba42-a5038e7f533e', '7092d019-f16f-4f2d-9eab-7d65144a2aed', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9af8df18-98af-4f3e-bd92-a944ee2e8e0a', '7092d019-f16f-4f2d-9eab-7d65144a2aed', '9291055e-e458-479e-a0de-bd69595777ff', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('452a338f-8172-422d-81cf-9bc31968d578', '7092d019-f16f-4f2d-9eab-7d65144a2aed', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1ed1a189-45d4-4752-96e5-bc71bef47cda', '7092d019-f16f-4f2d-9eab-7d65144a2aed', '34e60116-c678-4d43-a5a3-6ed510928812', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('91f5d9a6-dbfe-43df-b184-11ac4de689a7', '308d2708-dbea-41b6-a1c8-da6129445759', '75baa7d0-6001-4420-a744-5b46e6483201', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', timestamp '2025-08-15 12:00:00' - interval '16 hours' - interval '24 mins', timestamp '2025-08-15 12:00:00' - interval '16 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3491e0d6-d6b2-4c60-9564-3bf1edcba1ca', '91f5d9a6-dbfe-43df-b184-11ac4de689a7', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4b049c51-f4a7-46da-aea3-775055fee565', '91f5d9a6-dbfe-43df-b184-11ac4de689a7', '9291055e-e458-479e-a0de-bd69595777ff', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('eb3e4cd4-3de7-455b-adb2-3d9334130aca', '91f5d9a6-dbfe-43df-b184-11ac4de689a7', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('440ea4c7-c17c-4436-abe6-178a4689bde8', '91f5d9a6-dbfe-43df-b184-11ac4de689a7', '34e60116-c678-4d43-a5a3-6ed510928812', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('4347585a-8f8f-48a3-9ac9-452366daa72f', '308d2708-dbea-41b6-a1c8-da6129445759', '35607ef7-b333-4b5b-aa1a-e7ebd1a57d32', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', timestamp '2025-08-15 12:00:00' - interval '57 hours' - interval '41 mins', timestamp '2025-08-15 12:00:00' - interval '57 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e1c61b63-3a6d-4686-ad09-5c7d933db5c5', '4347585a-8f8f-48a3-9ac9-452366daa72f', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9af46d66-5b61-4c96-9c57-91de966c6e21', '4347585a-8f8f-48a3-9ac9-452366daa72f', '9291055e-e458-479e-a0de-bd69595777ff', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('60cb4db9-c5d2-4508-881e-6467334ef040', '4347585a-8f8f-48a3-9ac9-452366daa72f', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('236b4cdd-3366-4bc6-bc99-5a8c60bced9e', '4347585a-8f8f-48a3-9ac9-452366daa72f', '34e60116-c678-4d43-a5a3-6ed510928812', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('82089ba1-1fc9-4e86-920d-381665d79f38', '308d2708-dbea-41b6-a1c8-da6129445759', 'accfb911-acf9-481e-a167-d4ba6eaa9aaa', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', timestamp '2025-08-15 12:00:00' - interval '8 hours' - interval '35 mins', timestamp '2025-08-15 12:00:00' - interval '8 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7e183c10-d025-4ccd-8e8d-4ddbd33cafe7', '82089ba1-1fc9-4e86-920d-381665d79f38', '9fc5d438-f3ea-4966-ad57-e9ba3626497e', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0e379f96-861c-45d4-940c-9afb42912aea', '82089ba1-1fc9-4e86-920d-381665d79f38', '9291055e-e458-479e-a0de-bd69595777ff', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9012105c-3a2a-43be-8297-54fcf3c534d9', '82089ba1-1fc9-4e86-920d-381665d79f38', 'd8088c7f-e974-490e-ad55-0b51a4bb2138', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e84ec4f5-018e-4f35-add8-6d8090fca9d5', '82089ba1-1fc9-4e86-920d-381665d79f38', '34e60116-c678-4d43-a5a3-6ed510928812', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('9b986ac7-4a3c-43e4-b28c-0c93eceb1ef8', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '4edc653f-c0e7-4217-aca1-1c827f8204aa', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', timestamp '2024-08-15 12:00:00' - interval '24 hours' - interval '26 mins', timestamp '2024-08-15 12:00:00' - interval '24 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a6a2d9ce-dbea-4471-bca8-efe58f3b7998', '9b986ac7-4a3c-43e4-b28c-0c93eceb1ef8', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('90e0e5ab-43e9-41d2-a899-a901cbc35838', '9b986ac7-4a3c-43e4-b28c-0c93eceb1ef8', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d9937d34-2700-4741-a40d-0d97a92fda06', '9b986ac7-4a3c-43e4-b28c-0c93eceb1ef8', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('85f8e862-f2e3-4000-aa42-b44ff28642d8', '9b986ac7-4a3c-43e4-b28c-0c93eceb1ef8', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('4dffe11b-07f0-4e04-be12-b14d10a9a8bd', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'fd4bc2a1-e69b-4bf2-aab4-5f2da12927de', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', timestamp '2024-08-15 12:00:00' - interval '3 hours' - interval '20 mins', timestamp '2024-08-15 12:00:00' - interval '3 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8f3af5ab-91f2-48d9-833a-159be3f4516b', '4dffe11b-07f0-4e04-be12-b14d10a9a8bd', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('baadf703-0e7e-4f7e-9bca-6357f833ed33', '4dffe11b-07f0-4e04-be12-b14d10a9a8bd', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('39a6e771-b3a6-4af9-a85a-75eb4fa3638b', '4dffe11b-07f0-4e04-be12-b14d10a9a8bd', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('073fe07f-dc3c-4ac9-9c47-de2b4c3cf3d4', '4dffe11b-07f0-4e04-be12-b14d10a9a8bd', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('b95ac3c1-b5ed-4dfe-a921-57b84e3191b4', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '649be1eb-a461-4e57-a8b9-29849257408f', 'cec22180-51e9-4924-a2d0-6bca4aeb0028', 'submitted', timestamp '2024-08-15 12:00:00' - interval '50 hours' - interval '24 mins', timestamp '2024-08-15 12:00:00' - interval '50 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a2018cf7-1e34-4b02-b401-c4ce408629cb', 'b95ac3c1-b5ed-4dfe-a921-57b84e3191b4', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d5d9b365-fa5c-494a-b3d8-b69904d41515', 'b95ac3c1-b5ed-4dfe-a921-57b84e3191b4', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('709f77fd-f1cf-419f-9c60-58d6a5ea83a9', 'b95ac3c1-b5ed-4dfe-a921-57b84e3191b4', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fe92b885-803f-436c-9e86-6c6a20de221b', 'b95ac3c1-b5ed-4dfe-a921-57b84e3191b4', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7dd372e9-5238-41ec-b03e-30b27df5995a', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '4edc653f-c0e7-4217-aca1-1c827f8204aa', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'submitted', timestamp '2024-08-15 12:00:00' - interval '32 hours' - interval '42 mins', timestamp '2024-08-15 12:00:00' - interval '32 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ea58b123-b23e-4ff4-b90f-d6e76c4687d9', '7dd372e9-5238-41ec-b03e-30b27df5995a', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d085bd0e-c0e2-4263-ae11-13ddeca784f3', '7dd372e9-5238-41ec-b03e-30b27df5995a', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fd63947e-8536-4221-aba0-f7e57b835ea3', '7dd372e9-5238-41ec-b03e-30b27df5995a', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7de69e4c-4b05-42ad-b319-4d7b25e3a370', '7dd372e9-5238-41ec-b03e-30b27df5995a', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('59e3e17d-af32-4ec6-89e6-ff523d86ff8b', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'fd4bc2a1-e69b-4bf2-aab4-5f2da12927de', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'submitted', timestamp '2024-08-15 12:00:00' - interval '2 hours' - interval '30 mins', timestamp '2024-08-15 12:00:00' - interval '2 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6eacaee2-1cc3-4191-806f-165dba267921', '59e3e17d-af32-4ec6-89e6-ff523d86ff8b', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b61014fb-4bbd-4ffb-872a-0ef79f161356', '59e3e17d-af32-4ec6-89e6-ff523d86ff8b', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1ff1c8a2-6724-482b-9a99-ba37720195aa', '59e3e17d-af32-4ec6-89e6-ff523d86ff8b', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0922e867-226e-4886-be99-d2d2f168ea33', '59e3e17d-af32-4ec6-89e6-ff523d86ff8b', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('2ca3dd2d-c1e2-48f3-a7c5-0a6916bcaf3c', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '649be1eb-a461-4e57-a8b9-29849257408f', '27eea0b5-10e7-42eb-a739-4082ace54aa0', 'submitted', timestamp '2024-08-15 12:00:00' - interval '59 hours' - interval '29 mins', timestamp '2024-08-15 12:00:00' - interval '59 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('99d34965-41a3-4f7f-930e-527fc4567b61', '2ca3dd2d-c1e2-48f3-a7c5-0a6916bcaf3c', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('454b1e44-3b4d-4138-8bb2-3931f93b86e4', '2ca3dd2d-c1e2-48f3-a7c5-0a6916bcaf3c', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('843288e1-c383-4728-a278-5afcd3bc4d8d', '2ca3dd2d-c1e2-48f3-a7c5-0a6916bcaf3c', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f3ee9827-61db-469c-a185-503753100d17', '2ca3dd2d-c1e2-48f3-a7c5-0a6916bcaf3c', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d2fae02d-4c57-4a5c-9278-6324e4808706', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '4edc653f-c0e7-4217-aca1-1c827f8204aa', '618aec67-dbed-41bf-ac48-c600f70c9fa5', 'submitted', timestamp '2024-08-15 12:00:00' - interval '44 hours' - interval '25 mins', timestamp '2024-08-15 12:00:00' - interval '44 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('510b1994-c08c-44b3-ac25-dfc8a5c8954e', 'd2fae02d-4c57-4a5c-9278-6324e4808706', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8c0a9be1-aeeb-4267-b34c-969e0408e66c', 'd2fae02d-4c57-4a5c-9278-6324e4808706', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c1fb39d6-a9de-48c2-ae58-061a2212379a', 'd2fae02d-4c57-4a5c-9278-6324e4808706', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('200229d9-140b-43b8-8466-9dcca09d2d6f', 'd2fae02d-4c57-4a5c-9278-6324e4808706', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('94bb86f1-0e2f-40fd-9b8f-3ad090805321', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'fd4bc2a1-e69b-4bf2-aab4-5f2da12927de', '618aec67-dbed-41bf-ac48-c600f70c9fa5', 'submitted', timestamp '2024-08-15 12:00:00' - interval '26 hours' - interval '34 mins', timestamp '2024-08-15 12:00:00' - interval '26 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ef93a1ee-2dc5-4f4e-acb6-782ef84d4467', '94bb86f1-0e2f-40fd-9b8f-3ad090805321', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('92d0d905-9dc2-4c4a-8e98-8742c77dc31c', '94bb86f1-0e2f-40fd-9b8f-3ad090805321', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1e745a04-00e9-4d8c-8249-eae0e4709fb9', '94bb86f1-0e2f-40fd-9b8f-3ad090805321', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('25691fdf-b44a-4c69-8f11-09341293cc91', '94bb86f1-0e2f-40fd-9b8f-3ad090805321', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 8) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('5b6309ab-6796-450f-af7b-13d017557b7a', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '649be1eb-a461-4e57-a8b9-29849257408f', '618aec67-dbed-41bf-ac48-c600f70c9fa5', 'submitted', timestamp '2024-08-15 12:00:00' - interval '21 hours' - interval '43 mins', timestamp '2024-08-15 12:00:00' - interval '21 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('93aa107e-3140-4d9d-97c4-8c64c1bca860', '5b6309ab-6796-450f-af7b-13d017557b7a', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3f10530e-9b01-4899-b6d1-ddfb588a9032', '5b6309ab-6796-450f-af7b-13d017557b7a', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('98e5a207-e258-46d8-802b-c0b5f69199b9', '5b6309ab-6796-450f-af7b-13d017557b7a', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ba67de22-2c12-4490-845e-ddfcee524065', '5b6309ab-6796-450f-af7b-13d017557b7a', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('fea2456c-d9d4-469d-a172-b7dc02d017be', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '4edc653f-c0e7-4217-aca1-1c827f8204aa', '8a98e32c-a076-407a-a0c5-18badfbd546d', 'submitted', timestamp '2024-08-15 12:00:00' - interval '33 hours' - interval '43 mins', timestamp '2024-08-15 12:00:00' - interval '33 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d94b652d-49af-4895-82ff-9ee5ff24276b', 'fea2456c-d9d4-469d-a172-b7dc02d017be', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('aeefa9e3-684b-4f5f-91f2-f71a0b57ac25', 'fea2456c-d9d4-469d-a172-b7dc02d017be', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('789ed2cd-447d-42e2-bf3b-48b3de1a44c0', 'fea2456c-d9d4-469d-a172-b7dc02d017be', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('085eb9dc-36af-4e93-b608-737874b02d2d', 'fea2456c-d9d4-469d-a172-b7dc02d017be', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('58aa9849-985d-4819-8322-179bf412f1c4', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'fd4bc2a1-e69b-4bf2-aab4-5f2da12927de', '8a98e32c-a076-407a-a0c5-18badfbd546d', 'submitted', timestamp '2024-08-15 12:00:00' - interval '40 hours' - interval '28 mins', timestamp '2024-08-15 12:00:00' - interval '40 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d8efbb42-e8f2-4b70-baf0-83e34b5f3f8a', '58aa9849-985d-4819-8322-179bf412f1c4', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bc7bd54f-5e06-4be6-b6cf-adf2b7e24e94', '58aa9849-985d-4819-8322-179bf412f1c4', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6236b991-44e8-40ce-82db-0399027dde79', '58aa9849-985d-4819-8322-179bf412f1c4', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2cd038f6-d7eb-4115-93aa-6b0911df6696', '58aa9849-985d-4819-8322-179bf412f1c4', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('51b4aa8c-62d2-44a6-8920-4200b336b5bd', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '649be1eb-a461-4e57-a8b9-29849257408f', '8a98e32c-a076-407a-a0c5-18badfbd546d', 'submitted', timestamp '2024-08-15 12:00:00' - interval '40 hours' - interval '30 mins', timestamp '2024-08-15 12:00:00' - interval '40 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3905fdc3-64f5-4d3f-925f-ef3f35d73f1e', '51b4aa8c-62d2-44a6-8920-4200b336b5bd', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cd50b47d-429b-4104-8e63-0e57a10a65cf', '51b4aa8c-62d2-44a6-8920-4200b336b5bd', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f71f4b2d-7d34-4e21-8111-104058a6a5d5', '51b4aa8c-62d2-44a6-8920-4200b336b5bd', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c7663a00-5f35-417d-bd9b-da4b32122ffc', '51b4aa8c-62d2-44a6-8920-4200b336b5bd', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('ba8791cb-ccc5-40e2-a489-cddac1ab72a9', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '4edc653f-c0e7-4217-aca1-1c827f8204aa', 'e4550b83-b849-4977-a7b0-dc011fad64f5', 'submitted', timestamp '2024-08-15 12:00:00' - interval '53 hours' - interval '21 mins', timestamp '2024-08-15 12:00:00' - interval '53 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fad26ecb-2ca4-4c9f-b986-39082974abba', 'ba8791cb-ccc5-40e2-a489-cddac1ab72a9', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('39bf3e2f-44d7-478d-92e3-14c7dbfdff28', 'ba8791cb-ccc5-40e2-a489-cddac1ab72a9', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('32f70825-e4df-493b-add3-0872bc6dd24d', 'ba8791cb-ccc5-40e2-a489-cddac1ab72a9', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0d988c93-01fc-4056-af09-42f0a37dad69', 'ba8791cb-ccc5-40e2-a489-cddac1ab72a9', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('896e5722-b020-4524-822b-9c3aa909fdd2', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'fd4bc2a1-e69b-4bf2-aab4-5f2da12927de', 'e4550b83-b849-4977-a7b0-dc011fad64f5', 'submitted', timestamp '2024-08-15 12:00:00' - interval '68 hours' - interval '29 mins', timestamp '2024-08-15 12:00:00' - interval '68 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c8bceb22-8236-4381-9883-3dde24b6f89c', '896e5722-b020-4524-822b-9c3aa909fdd2', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('59e6d867-b4df-4348-b7ae-88f21e3c559e', '896e5722-b020-4524-822b-9c3aa909fdd2', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ca45d231-7be6-4da2-8210-9b3af6b6fd91', '896e5722-b020-4524-822b-9c3aa909fdd2', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('73d64059-1f3c-429b-99ef-9ae83a6f93c9', '896e5722-b020-4524-822b-9c3aa909fdd2', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('829dfd5f-641a-4c2a-ba8f-3bd4ff7ab7a5', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '649be1eb-a461-4e57-a8b9-29849257408f', 'e4550b83-b849-4977-a7b0-dc011fad64f5', 'submitted', timestamp '2024-08-15 12:00:00' - interval '52 hours' - interval '28 mins', timestamp '2024-08-15 12:00:00' - interval '52 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e11147ac-84c4-4c55-9f14-0caff9a950bf', '829dfd5f-641a-4c2a-ba8f-3bd4ff7ab7a5', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f1dab855-ffaf-472a-9192-3e8bc8a6d133', '829dfd5f-641a-4c2a-ba8f-3bd4ff7ab7a5', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('195aebb9-1ff3-450e-848d-e4579e6b33b7', '829dfd5f-641a-4c2a-ba8f-3bd4ff7ab7a5', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c8cfcd0b-8689-40ca-a065-5ad345d9c371', '829dfd5f-641a-4c2a-ba8f-3bd4ff7ab7a5', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('bd800651-92a0-4108-8b7d-6cbcb9b1a106', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '4edc653f-c0e7-4217-aca1-1c827f8204aa', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', timestamp '2024-08-15 12:00:00' - interval '47 hours' - interval '22 mins', timestamp '2024-08-15 12:00:00' - interval '47 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('55d93453-3fa6-4b83-b68c-9c645d6a90bc', 'bd800651-92a0-4108-8b7d-6cbcb9b1a106', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('879298b3-70a7-41d9-a7bb-daac50f85187', 'bd800651-92a0-4108-8b7d-6cbcb9b1a106', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0e61b3d4-5530-4fc5-801b-5c815d091e31', 'bd800651-92a0-4108-8b7d-6cbcb9b1a106', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('97c46b47-adc3-4721-8d2b-f06d6187943f', 'bd800651-92a0-4108-8b7d-6cbcb9b1a106', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 10) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('056fd2cc-a45a-4303-adb7-c6ee2ad6859a', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', 'fd4bc2a1-e69b-4bf2-aab4-5f2da12927de', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', timestamp '2024-08-15 12:00:00' - interval '63 hours' - interval '40 mins', timestamp '2024-08-15 12:00:00' - interval '63 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e3810ba3-495a-453a-90ef-c52b7ba31dfa', '056fd2cc-a45a-4303-adb7-c6ee2ad6859a', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('231a6b5e-801c-4ddf-89d9-77b271c93b74', '056fd2cc-a45a-4303-adb7-c6ee2ad6859a', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ced2a450-35df-4e7f-b785-8fcdacfca38f', '056fd2cc-a45a-4303-adb7-c6ee2ad6859a', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6f45ba84-2ac0-47c0-bdc4-a985494d6700', '056fd2cc-a45a-4303-adb7-c6ee2ad6859a', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('bf2ce035-9e19-4c3b-99ce-c1cdf45888ef', 'bf4ee98f-1fd2-418d-a62d-8cb5b585f293', '649be1eb-a461-4e57-a8b9-29849257408f', '5da6e3f5-d18d-4b7d-a22f-0a5f380c0775', 'submitted', timestamp '2024-08-15 12:00:00' - interval '17 hours' - interval '24 mins', timestamp '2024-08-15 12:00:00' - interval '17 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7a9074fe-46ce-4165-837a-b74d5160ee00', 'bf2ce035-9e19-4c3b-99ce-c1cdf45888ef', '24809e2d-ea6f-4306-a60b-8c9b5ba230e1', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('38bead60-46d9-41e4-9327-bc0c6db6ca7d', 'bf2ce035-9e19-4c3b-99ce-c1cdf45888ef', 'c37d84a0-f0d9-4386-a75f-6ecaff196a1d', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0c6633a3-e62a-45f1-8b13-1511a3f738b0', 'bf2ce035-9e19-4c3b-99ce-c1cdf45888ef', '0c95a783-0c54-42d5-a2fe-559d093af7f5', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cd10f302-6d06-4f32-9560-25c19e3677bb', 'bf2ce035-9e19-4c3b-99ce-c1cdf45888ef', 'd4fbf826-3d87-49d5-aa3a-acad4736d44a', 9) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('fa16223f-8599-42ff-b9cf-0335169c4f2f', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '836703c7-94e5-4e9c-a1f4-c9aeca526cd1', 'a49b6b5e-f40d-48f6-a398-87b85bbff743', 'submitted', timestamp '2026-08-15 12:00:00' - interval '33 hours' - interval '45 mins', timestamp '2026-08-15 12:00:00' - interval '33 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c8f1b97b-c42b-4c01-8d20-d8b926ad21d0', 'fa16223f-8599-42ff-b9cf-0335169c4f2f', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 35) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8fb7a132-40dd-440f-af20-1a4dc7c646c9', 'fa16223f-8599-42ff-b9cf-0335169c4f2f', '3ceed4da-6045-435f-aaa5-f08cafe18240', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dde81bc3-b469-4451-991e-3da51a128222', 'fa16223f-8599-42ff-b9cf-0335169c4f2f', '656fac7d-722f-4b52-aeb7-b36115296682', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('b606c50f-2deb-41b5-97e2-6ecd0beb0ac4', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'f4f0ede3-01c4-46a1-a477-acd42790683e', 'a49b6b5e-f40d-48f6-a398-87b85bbff743', 'submitted', timestamp '2026-08-15 12:00:00' - interval '2 hours' - interval '35 mins', timestamp '2026-08-15 12:00:00' - interval '2 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4f030033-b096-4987-9341-149b399d20c6', 'b606c50f-2deb-41b5-97e2-6ecd0beb0ac4', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('43751bb6-f460-4459-a5db-c2aba18e9c85', 'b606c50f-2deb-41b5-97e2-6ecd0beb0ac4', '3ceed4da-6045-435f-aaa5-f08cafe18240', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('01af6e90-ab3f-4204-8d3f-a8b157f1dfcf', 'b606c50f-2deb-41b5-97e2-6ecd0beb0ac4', '656fac7d-722f-4b52-aeb7-b36115296682', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('c6cfa019-2a37-4d06-9216-7f81caf96a30', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'f4f0ede3-01c4-46a1-a477-acd42790683e', '9ff6ca95-c216-42cd-a63f-1e58b1756cf2', 'submitted', timestamp '2026-08-15 12:00:00' - interval '54 hours' - interval '36 mins', timestamp '2026-08-15 12:00:00' - interval '54 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5be28401-e543-46c6-a1a0-c28de0d5b680', 'c6cfa019-2a37-4d06-9216-7f81caf96a30', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('22281773-e574-4c24-9fbc-87cbf06db433', 'c6cfa019-2a37-4d06-9216-7f81caf96a30', '3ceed4da-6045-435f-aaa5-f08cafe18240', 35) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4fb558fe-d706-44ff-845a-0fa0af0d04b2', 'c6cfa019-2a37-4d06-9216-7f81caf96a30', '656fac7d-722f-4b52-aeb7-b36115296682', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('f4ecb4ae-13fe-4bab-8794-b50f0fbfe2db', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'f5c97d0e-9bca-4e0b-a17d-a75193ef0082', '9ff6ca95-c216-42cd-a63f-1e58b1756cf2', 'submitted', timestamp '2026-08-15 12:00:00' - interval '18 hours' - interval '33 mins', timestamp '2026-08-15 12:00:00' - interval '18 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a93b34f1-c784-43c6-9f25-9610a975b8d2', 'f4ecb4ae-13fe-4bab-8794-b50f0fbfe2db', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f1a9c303-3298-4950-971d-7dd96d6a8f65', 'f4ecb4ae-13fe-4bab-8794-b50f0fbfe2db', '3ceed4da-6045-435f-aaa5-f08cafe18240', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('752c5077-7785-43d0-89fa-569cdaa00799', 'f4ecb4ae-13fe-4bab-8794-b50f0fbfe2db', '656fac7d-722f-4b52-aeb7-b36115296682', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a6628f9c-b631-4288-a5be-3d06e0ea258e', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '836703c7-94e5-4e9c-a1f4-c9aeca526cd1', '9ff6ca95-c216-42cd-a63f-1e58b1756cf2', 'submitted', timestamp '2026-08-15 12:00:00' - interval '9 hours' - interval '42 mins', timestamp '2026-08-15 12:00:00' - interval '9 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4014559b-2179-4327-8155-cf4f1b1fc3d1', 'a6628f9c-b631-4288-a5be-3d06e0ea258e', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2afee0d9-6a22-4aab-b006-e8d684a5f8c5', 'a6628f9c-b631-4288-a5be-3d06e0ea258e', '3ceed4da-6045-435f-aaa5-f08cafe18240', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6f120e60-dcdc-4163-9e84-748476b74557', 'a6628f9c-b631-4288-a5be-3d06e0ea258e', '656fac7d-722f-4b52-aeb7-b36115296682', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('82032cc6-5687-44ed-a032-915f7bd416b2', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '202b2597-5a44-4ae0-a6a5-4834870f87d0', '9ff6ca95-c216-42cd-a63f-1e58b1756cf2', 'submitted', timestamp '2026-08-15 12:00:00' - interval '49 hours' - interval '39 mins', timestamp '2026-08-15 12:00:00' - interval '49 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6b6831a2-b833-4d72-9bad-4390248dfcec', '82032cc6-5687-44ed-a032-915f7bd416b2', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 34) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('02b0bf97-9291-46bf-b49c-ce74ba9a0c7d', '82032cc6-5687-44ed-a032-915f7bd416b2', '3ceed4da-6045-435f-aaa5-f08cafe18240', 35) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3e5d0117-16a2-4cd6-bab7-8a9d44acd886', '82032cc6-5687-44ed-a032-915f7bd416b2', '656fac7d-722f-4b52-aeb7-b36115296682', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('f9d1de20-10ce-44ec-beab-05c65b5d4aa0', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'f4f0ede3-01c4-46a1-a477-acd42790683e', '9d55d273-9fd8-4365-a294-404246566892', 'submitted', timestamp '2026-08-15 12:00:00' - interval '1 hours' - interval '40 mins', timestamp '2026-08-15 12:00:00' - interval '1 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e52a48f1-0257-484c-b145-4e344a92635f', 'f9d1de20-10ce-44ec-beab-05c65b5d4aa0', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('41c0bc7d-8a9a-4bc4-8c14-478f59b3d41d', 'f9d1de20-10ce-44ec-beab-05c65b5d4aa0', '3ceed4da-6045-435f-aaa5-f08cafe18240', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('67505d82-5b4f-4165-8445-baec05609a2a', 'f9d1de20-10ce-44ec-beab-05c65b5d4aa0', '656fac7d-722f-4b52-aeb7-b36115296682', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e439549c-94e2-4918-981c-bab3804a9e1c', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'f5c97d0e-9bca-4e0b-a17d-a75193ef0082', '9d55d273-9fd8-4365-a294-404246566892', 'submitted', timestamp '2026-08-15 12:00:00' - interval '45 hours' - interval '23 mins', timestamp '2026-08-15 12:00:00' - interval '45 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a4c4ab03-27c5-43c8-938f-cc9dadcb8c79', 'e439549c-94e2-4918-981c-bab3804a9e1c', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('eb6fccfa-a4eb-47a2-ada9-888f794a5122', 'e439549c-94e2-4918-981c-bab3804a9e1c', '3ceed4da-6045-435f-aaa5-f08cafe18240', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3609205c-f3f8-47b5-b6f0-32113a44e036', 'e439549c-94e2-4918-981c-bab3804a9e1c', '656fac7d-722f-4b52-aeb7-b36115296682', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('9dea7010-4df9-4381-8dea-d526faa601f7', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '836703c7-94e5-4e9c-a1f4-c9aeca526cd1', '9d55d273-9fd8-4365-a294-404246566892', 'submitted', timestamp '2026-08-15 12:00:00' - interval '27 hours' - interval '37 mins', timestamp '2026-08-15 12:00:00' - interval '27 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('71b21121-b35a-4a19-b9a4-5cdb04cd2104', '9dea7010-4df9-4381-8dea-d526faa601f7', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1de834a1-4445-4e33-ac9a-6ae57c7ac38a', '9dea7010-4df9-4381-8dea-d526faa601f7', '3ceed4da-6045-435f-aaa5-f08cafe18240', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d9b3e176-3746-457a-8896-42d7962dcc91', '9dea7010-4df9-4381-8dea-d526faa601f7', '656fac7d-722f-4b52-aeb7-b36115296682', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('11076602-ec66-4cac-8d2a-63287b0e930c', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '202b2597-5a44-4ae0-a6a5-4834870f87d0', '9d55d273-9fd8-4365-a294-404246566892', 'submitted', timestamp '2026-08-15 12:00:00' - interval '46 hours' - interval '35 mins', timestamp '2026-08-15 12:00:00' - interval '46 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f57b2066-2ef9-4186-8361-44ca86478659', '11076602-ec66-4cac-8d2a-63287b0e930c', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('420840f8-b40e-4fc1-957b-6ddb4bf528b3', '11076602-ec66-4cac-8d2a-63287b0e930c', '3ceed4da-6045-435f-aaa5-f08cafe18240', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4c6a5e7a-7df9-4ef0-9083-ad17966dcc18', '11076602-ec66-4cac-8d2a-63287b0e930c', '656fac7d-722f-4b52-aeb7-b36115296682', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('434a7ead-9cb1-45fa-999a-69cb21fb2c4f', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'f4f0ede3-01c4-46a1-a477-acd42790683e', '3b0ea27c-c7a3-414a-ab47-db50db3ab838', 'submitted', timestamp '2026-08-15 12:00:00' - interval '24 hours' - interval '24 mins', timestamp '2026-08-15 12:00:00' - interval '24 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fd7558d9-3a63-48c9-a762-9f314936fcad', '434a7ead-9cb1-45fa-999a-69cb21fb2c4f', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 34) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('430b005f-00ef-48fe-b45f-060cfef2ddec', '434a7ead-9cb1-45fa-999a-69cb21fb2c4f', '3ceed4da-6045-435f-aaa5-f08cafe18240', 36) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('be945959-49b4-4538-b9a3-d58b1853739c', '434a7ead-9cb1-45fa-999a-69cb21fb2c4f', '656fac7d-722f-4b52-aeb7-b36115296682', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a6a1dab8-50ee-4958-a4d9-02809a5f9614', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', 'f5c97d0e-9bca-4e0b-a17d-a75193ef0082', '3b0ea27c-c7a3-414a-ab47-db50db3ab838', 'submitted', timestamp '2026-08-15 12:00:00' - interval '48 hours' - interval '40 mins', timestamp '2026-08-15 12:00:00' - interval '48 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6537484e-bff3-4840-a342-4dff8009d871', 'a6a1dab8-50ee-4958-a4d9-02809a5f9614', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7570accd-b3c4-4962-af10-331733006032', 'a6a1dab8-50ee-4958-a4d9-02809a5f9614', '3ceed4da-6045-435f-aaa5-f08cafe18240', 33) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('adc85197-6516-43c2-9e97-c9e07bae0514', 'a6a1dab8-50ee-4958-a4d9-02809a5f9614', '656fac7d-722f-4b52-aeb7-b36115296682', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a904f404-fb9e-4459-9275-0e0e25c529d0', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '836703c7-94e5-4e9c-a1f4-c9aeca526cd1', '3b0ea27c-c7a3-414a-ab47-db50db3ab838', 'submitted', timestamp '2026-08-15 12:00:00' - interval '59 hours' - interval '20 mins', timestamp '2026-08-15 12:00:00' - interval '59 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('745ff995-6c7a-4ad4-a24d-803dd3155980', 'a904f404-fb9e-4459-9275-0e0e25c529d0', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d367a049-c56c-4c61-acdd-edb102ceb61b', 'a904f404-fb9e-4459-9275-0e0e25c529d0', '3ceed4da-6045-435f-aaa5-f08cafe18240', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('32f1f96e-688c-454a-9b79-0a7b3a605769', 'a904f404-fb9e-4459-9275-0e0e25c529d0', '656fac7d-722f-4b52-aeb7-b36115296682', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('6b1b457f-d346-4691-a9f9-0fcc1a3e48c8', '05a1eb4a-d4cf-478b-a52d-578c3d9c22ad', '202b2597-5a44-4ae0-a6a5-4834870f87d0', '3b0ea27c-c7a3-414a-ab47-db50db3ab838', 'submitted', timestamp '2026-08-15 12:00:00' - interval '20 hours' - interval '20 mins', timestamp '2026-08-15 12:00:00' - interval '20 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9eff6b7e-78f5-45ae-9b7e-57f2467cc38f', '6b1b457f-d346-4691-a9f9-0fcc1a3e48c8', 'ace7bb79-4e9e-4b7f-a049-4b2684bb67d7', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6c8f6c28-8a53-44f2-9469-6429cddabb42', '6b1b457f-d346-4691-a9f9-0fcc1a3e48c8', '3ceed4da-6045-435f-aaa5-f08cafe18240', 33) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c1851b36-8568-4d3e-bb0b-6d111da1d11c', '6b1b457f-d346-4691-a9f9-0fcc1a3e48c8', '656fac7d-722f-4b52-aeb7-b36115296682', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('c706fda8-dcf8-4e53-99ef-be776ac64dbd', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'a426a611-7b78-434d-a881-aa71b5849acb', 'a49b6b5e-f40d-48f6-a398-87b85bbff743', 'submitted', timestamp '2025-08-15 12:00:00' - interval '27 hours' - interval '37 mins', timestamp '2025-08-15 12:00:00' - interval '27 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('61a62cc7-3571-46c0-a88e-eebd39ed7a12', 'c706fda8-dcf8-4e53-99ef-be776ac64dbd', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cf77a08a-0c13-4d58-805e-bae34812eff5', 'c706fda8-dcf8-4e53-99ef-be776ac64dbd', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('34d69a18-60ff-4b13-9e8f-937e594c51b6', 'c706fda8-dcf8-4e53-99ef-be776ac64dbd', 'e1076839-63e0-4033-aa0d-4dde565034ea', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('2041b073-fd5e-412e-8ac7-245abcd58ff0', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '399c8138-c254-4cc4-a305-be9db396f5be', 'a49b6b5e-f40d-48f6-a398-87b85bbff743', 'submitted', timestamp '2025-08-15 12:00:00' - interval '19 hours' - interval '22 mins', timestamp '2025-08-15 12:00:00' - interval '19 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8b11002a-5c94-4f73-a606-7caee2a96f75', '2041b073-fd5e-412e-8ac7-245abcd58ff0', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d3ffc636-075f-49fc-880c-c26f762ca941', '2041b073-fd5e-412e-8ac7-245abcd58ff0', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 39) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e278e82c-171a-4acf-802d-4a91ab439975', '2041b073-fd5e-412e-8ac7-245abcd58ff0', 'e1076839-63e0-4033-aa0d-4dde565034ea', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('185ebe68-6eab-4406-9417-359f8fbd597c', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'f70484ca-9482-441b-a0f1-a51bd61a5693', 'a49b6b5e-f40d-48f6-a398-87b85bbff743', 'submitted', timestamp '2025-08-15 12:00:00' - interval '49 hours' - interval '39 mins', timestamp '2025-08-15 12:00:00' - interval '49 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2d4743fe-d9f1-40d8-8adb-948b60031e12', '185ebe68-6eab-4406-9417-359f8fbd597c', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cc33a0d6-ead1-4c91-bb4a-6665f2b8a3ad', '185ebe68-6eab-4406-9417-359f8fbd597c', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 34) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('13073f21-a4f8-45cf-8d43-bb4c9d780061', '185ebe68-6eab-4406-9417-359f8fbd597c', 'e1076839-63e0-4033-aa0d-4dde565034ea', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('6e92bdb7-b73f-4d65-95de-e0c4f705689a', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'a426a611-7b78-434d-a881-aa71b5849acb', '9ff6ca95-c216-42cd-a63f-1e58b1756cf2', 'submitted', timestamp '2025-08-15 12:00:00' - interval '50 hours' - interval '23 mins', timestamp '2025-08-15 12:00:00' - interval '50 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8f2be44d-b579-460d-8d46-dc7591666196', '6e92bdb7-b73f-4d65-95de-e0c4f705689a', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e76a8b68-0817-4001-8c0e-e476936f5988', '6e92bdb7-b73f-4d65-95de-e0c4f705689a', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 35) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8846e1df-7329-4777-94eb-03e613bed19d', '6e92bdb7-b73f-4d65-95de-e0c4f705689a', 'e1076839-63e0-4033-aa0d-4dde565034ea', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('817b1fe1-70cb-4131-938a-2b3234204470', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '399c8138-c254-4cc4-a305-be9db396f5be', '9ff6ca95-c216-42cd-a63f-1e58b1756cf2', 'submitted', timestamp '2025-08-15 12:00:00' - interval '35 hours' - interval '35 mins', timestamp '2025-08-15 12:00:00' - interval '35 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('aa73b75b-0a43-4f09-be0c-199bbf10950e', '817b1fe1-70cb-4131-938a-2b3234204470', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('700a5a46-e263-4121-9405-9517af45ffba', '817b1fe1-70cb-4131-938a-2b3234204470', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 36) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3566ed19-adbc-4d92-8194-5689617f25f8', '817b1fe1-70cb-4131-938a-2b3234204470', 'e1076839-63e0-4033-aa0d-4dde565034ea', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e087a2de-dd21-4ab9-a7d1-756a2a962a21', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'f70484ca-9482-441b-a0f1-a51bd61a5693', '9ff6ca95-c216-42cd-a63f-1e58b1756cf2', 'submitted', timestamp '2025-08-15 12:00:00' - interval '59 hours' - interval '26 mins', timestamp '2025-08-15 12:00:00' - interval '59 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5e1cd88a-71e1-4d13-9ecd-56ceb85a2a95', 'e087a2de-dd21-4ab9-a7d1-756a2a962a21', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('53f7abb9-2201-4e77-a0b0-395a00c6f07e', 'e087a2de-dd21-4ab9-a7d1-756a2a962a21', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('48193019-d3d4-4a74-86a4-175b79a3db30', 'e087a2de-dd21-4ab9-a7d1-756a2a962a21', 'e1076839-63e0-4033-aa0d-4dde565034ea', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('bdbc7157-01d9-4e21-bc41-1a5bacae1bc2', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'a426a611-7b78-434d-a881-aa71b5849acb', '9d55d273-9fd8-4365-a294-404246566892', 'submitted', timestamp '2025-08-15 12:00:00' - interval '16 hours' - interval '39 mins', timestamp '2025-08-15 12:00:00' - interval '16 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b3297075-eb81-4e69-a965-7d2880e188c4', 'bdbc7157-01d9-4e21-bc41-1a5bacae1bc2', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2fd29649-8b6f-47da-946b-3b75ce1438d5', 'bdbc7157-01d9-4e21-bc41-1a5bacae1bc2', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('60918b89-c53e-4306-bba8-8ab5c0ebabbf', 'bdbc7157-01d9-4e21-bc41-1a5bacae1bc2', 'e1076839-63e0-4033-aa0d-4dde565034ea', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('03593811-b8cf-484c-bd8f-818c441a43cc', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '399c8138-c254-4cc4-a305-be9db396f5be', '9d55d273-9fd8-4365-a294-404246566892', 'submitted', timestamp '2025-08-15 12:00:00' - interval '23 hours' - interval '40 mins', timestamp '2025-08-15 12:00:00' - interval '23 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('16d75057-21a4-46b2-97a2-d742c18feb97', '03593811-b8cf-484c-bd8f-818c441a43cc', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('83e32036-4d96-40ba-b4d6-7d202808cb07', '03593811-b8cf-484c-bd8f-818c441a43cc', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 36) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0b3a8bcf-d91c-44f7-bec5-0f90dd78b783', '03593811-b8cf-484c-bd8f-818c441a43cc', 'e1076839-63e0-4033-aa0d-4dde565034ea', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a109e12c-8773-4fb1-95ad-a5632b55c58a', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'f70484ca-9482-441b-a0f1-a51bd61a5693', '9d55d273-9fd8-4365-a294-404246566892', 'submitted', timestamp '2025-08-15 12:00:00' - interval '70 hours' - interval '24 mins', timestamp '2025-08-15 12:00:00' - interval '70 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e66054a8-95ba-490f-915b-0dcc4a7684a5', 'a109e12c-8773-4fb1-95ad-a5632b55c58a', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1d6c51f3-fb27-41ab-b1c4-e06f024fd08d', 'a109e12c-8773-4fb1-95ad-a5632b55c58a', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 35) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9bded61f-be62-4639-b1e2-83bc564a0adc', 'a109e12c-8773-4fb1-95ad-a5632b55c58a', 'e1076839-63e0-4033-aa0d-4dde565034ea', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('36840252-11f6-45ed-a88c-8771b99b283b', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'a426a611-7b78-434d-a881-aa71b5849acb', '3b0ea27c-c7a3-414a-ab47-db50db3ab838', 'submitted', timestamp '2025-08-15 12:00:00' - interval '70 hours' - interval '34 mins', timestamp '2025-08-15 12:00:00' - interval '70 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('65dd4803-a9cd-463c-8f6b-1d76f634c2cc', '36840252-11f6-45ed-a88c-8771b99b283b', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d8eb8765-4f69-441a-8e05-41b516dc0dfd', '36840252-11f6-45ed-a88c-8771b99b283b', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 37) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('31ef9b35-0970-4ed6-be6d-1e67603138ef', '36840252-11f6-45ed-a88c-8771b99b283b', 'e1076839-63e0-4033-aa0d-4dde565034ea', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e0e0e740-756f-4149-a078-98b28640e15b', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '399c8138-c254-4cc4-a305-be9db396f5be', '3b0ea27c-c7a3-414a-ab47-db50db3ab838', 'submitted', timestamp '2025-08-15 12:00:00' - interval '13 hours' - interval '28 mins', timestamp '2025-08-15 12:00:00' - interval '13 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('72ecc0b5-1231-403d-8235-d2724040a053', 'e0e0e740-756f-4149-a078-98b28640e15b', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('56188439-a396-4e47-865c-c70553be55a3', 'e0e0e740-756f-4149-a078-98b28640e15b', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('089de213-3ed7-4d2b-bb2c-618a8ab0bf27', 'e0e0e740-756f-4149-a078-98b28640e15b', 'e1076839-63e0-4033-aa0d-4dde565034ea', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('68ff9d8e-2d38-46b7-8e42-e235f655b00f', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'f70484ca-9482-441b-a0f1-a51bd61a5693', '3b0ea27c-c7a3-414a-ab47-db50db3ab838', 'submitted', timestamp '2025-08-15 12:00:00' - interval '41 hours' - interval '20 mins', timestamp '2025-08-15 12:00:00' - interval '41 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('701a16c2-cfa9-4493-a5e9-6ae0d4db59cf', '68ff9d8e-2d38-46b7-8e42-e235f655b00f', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a014a592-ee88-4459-9111-5623dccfd962', '68ff9d8e-2d38-46b7-8e42-e235f655b00f', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('60e79d77-05ec-42cf-9402-a88441fbc52f', '68ff9d8e-2d38-46b7-8e42-e235f655b00f', 'e1076839-63e0-4033-aa0d-4dde565034ea', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a65e664d-e319-46c1-bb5d-d9124621939c', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'a426a611-7b78-434d-a881-aa71b5849acb', '15c5c11f-a19f-48f7-aa39-92872d8a1a00', 'submitted', timestamp '2025-08-15 12:00:00' - interval '12 hours' - interval '28 mins', timestamp '2025-08-15 12:00:00' - interval '12 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('43a267c3-1480-4e97-8082-3a902e2b2421', 'a65e664d-e319-46c1-bb5d-d9124621939c', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('eb41da34-8494-4ae0-8578-46ee28084914', 'a65e664d-e319-46c1-bb5d-d9124621939c', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('46bf224b-cbf4-45a0-add1-c54bc3f55376', 'a65e664d-e319-46c1-bb5d-d9124621939c', 'e1076839-63e0-4033-aa0d-4dde565034ea', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a38e82ec-b123-4700-8c69-faf7b5d333c6', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', '399c8138-c254-4cc4-a305-be9db396f5be', '15c5c11f-a19f-48f7-aa39-92872d8a1a00', 'submitted', timestamp '2025-08-15 12:00:00' - interval '18 hours' - interval '43 mins', timestamp '2025-08-15 12:00:00' - interval '18 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c70ba408-9cbe-4ef6-9d5a-0eb3dd0aaa1f', 'a38e82ec-b123-4700-8c69-faf7b5d333c6', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('94845705-a1a9-4031-be0f-08aa0be0fc49', 'a38e82ec-b123-4700-8c69-faf7b5d333c6', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 38) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('05998824-3cb8-42e3-bd85-39d8cfefe1bd', 'a38e82ec-b123-4700-8c69-faf7b5d333c6', 'e1076839-63e0-4033-aa0d-4dde565034ea', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('20603c44-9417-40cb-b0e3-191c70d624ee', 'bb63166c-d38c-4278-a1e9-5c8b7b081a6c', 'f70484ca-9482-441b-a0f1-a51bd61a5693', '15c5c11f-a19f-48f7-aa39-92872d8a1a00', 'submitted', timestamp '2025-08-15 12:00:00' - interval '18 hours' - interval '34 mins', timestamp '2025-08-15 12:00:00' - interval '18 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('08aa285f-fffb-4882-bd69-ce321fd03e7e', '20603c44-9417-40cb-b0e3-191c70d624ee', 'f7160a57-742e-4428-ad3a-9ac826e3b2a4', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c7a3db79-77dd-44ad-8003-8925a7603d68', '20603c44-9417-40cb-b0e3-191c70d624ee', 'c1ab6f6b-5e43-4f4f-aa87-bc0e498e5bf3', 37) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d03e2bac-af91-4844-b962-30b058b15fdd', '20603c44-9417-40cb-b0e3-191c70d624ee', 'e1076839-63e0-4033-aa0d-4dde565034ea', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('eef7db1f-8018-442b-9f52-a70f827506ab', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'bd7220da-b4dd-4ddc-acbc-cac1d9491475', 'a49b6b5e-f40d-48f6-a398-87b85bbff743', 'submitted', timestamp '2024-08-15 12:00:00' - interval '45 hours' - interval '23 mins', timestamp '2024-08-15 12:00:00' - interval '45 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ab7a636b-52e9-4ac9-aea1-afe142dbfa5c', 'eef7db1f-8018-442b-9f52-a70f827506ab', '37ec86c1-bd1d-4155-a442-a1454ef973c5', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c501c0b2-9c9f-445d-b52c-4b580e1c52e1', 'eef7db1f-8018-442b-9f52-a70f827506ab', '3ac872ec-e845-4aec-a4e4-c27376aa77e8', 34) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fb17a324-c3bb-4594-a7b5-cbd1529eebb5', 'eef7db1f-8018-442b-9f52-a70f827506ab', '795dd7aa-24c7-44df-acd2-44dbb529189c', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e88c9894-fbbe-4b84-82fb-dc1f866cd3ac', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'f5a78224-c079-428b-a9be-b4ab0c8d0f38', 'a49b6b5e-f40d-48f6-a398-87b85bbff743', 'submitted', timestamp '2024-08-15 12:00:00' - interval '58 hours' - interval '23 mins', timestamp '2024-08-15 12:00:00' - interval '58 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f4b7e85d-c83d-41bc-9020-ea664358d48c', 'e88c9894-fbbe-4b84-82fb-dc1f866cd3ac', '37ec86c1-bd1d-4155-a442-a1454ef973c5', 34) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('78aa7428-5759-4a7e-a6d8-b9b40177843d', 'e88c9894-fbbe-4b84-82fb-dc1f866cd3ac', '3ac872ec-e845-4aec-a4e4-c27376aa77e8', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('00e58284-6708-4513-bd5e-35a8c1e76d82', 'e88c9894-fbbe-4b84-82fb-dc1f866cd3ac', '795dd7aa-24c7-44df-acd2-44dbb529189c', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('1f936503-a6f4-463d-a0d8-7bc39c70e66f', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'bd7220da-b4dd-4ddc-acbc-cac1d9491475', '9ff6ca95-c216-42cd-a63f-1e58b1756cf2', 'submitted', timestamp '2024-08-15 12:00:00' - interval '60 hours' - interval '39 mins', timestamp '2024-08-15 12:00:00' - interval '60 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a9f116e0-4ce8-410b-a9b7-b79093b2e067', '1f936503-a6f4-463d-a0d8-7bc39c70e66f', '37ec86c1-bd1d-4155-a442-a1454ef973c5', 34) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('578c47a0-2601-4c31-a939-54ec64ed9556', '1f936503-a6f4-463d-a0d8-7bc39c70e66f', '3ac872ec-e845-4aec-a4e4-c27376aa77e8', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('762e616f-5f0b-42f3-86f4-05222e87e788', '1f936503-a6f4-463d-a0d8-7bc39c70e66f', '795dd7aa-24c7-44df-acd2-44dbb529189c', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('041bc449-3a45-46fe-a444-b799be59e35b', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'f5a78224-c079-428b-a9be-b4ab0c8d0f38', '9ff6ca95-c216-42cd-a63f-1e58b1756cf2', 'submitted', timestamp '2024-08-15 12:00:00' - interval '41 hours' - interval '25 mins', timestamp '2024-08-15 12:00:00' - interval '41 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('52ebf015-a1bb-4231-9a35-d5559905fbfe', '041bc449-3a45-46fe-a444-b799be59e35b', '37ec86c1-bd1d-4155-a442-a1454ef973c5', 34) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2ec9305b-b440-4aa2-abdc-07c75af37bda', '041bc449-3a45-46fe-a444-b799be59e35b', '3ac872ec-e845-4aec-a4e4-c27376aa77e8', 35) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('47482955-8b32-4070-b898-002c5c86abd8', '041bc449-3a45-46fe-a444-b799be59e35b', '795dd7aa-24c7-44df-acd2-44dbb529189c', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('b93f527c-3f90-4db6-a3e7-60f58ff6b276', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'bd7220da-b4dd-4ddc-acbc-cac1d9491475', '9d55d273-9fd8-4365-a294-404246566892', 'submitted', timestamp '2024-08-15 12:00:00' - interval '31 hours' - interval '42 mins', timestamp '2024-08-15 12:00:00' - interval '31 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('879f08ed-7564-473e-900d-975275e02e76', 'b93f527c-3f90-4db6-a3e7-60f58ff6b276', '37ec86c1-bd1d-4155-a442-a1454ef973c5', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('94df47f9-11bd-4d67-9237-4a091576927e', 'b93f527c-3f90-4db6-a3e7-60f58ff6b276', '3ac872ec-e845-4aec-a4e4-c27376aa77e8', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('483e4f26-0bc2-4428-bd08-33d146ef9734', 'b93f527c-3f90-4db6-a3e7-60f58ff6b276', '795dd7aa-24c7-44df-acd2-44dbb529189c', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d6dffbd3-5968-40fe-819a-b444ec207064', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'f5a78224-c079-428b-a9be-b4ab0c8d0f38', '9d55d273-9fd8-4365-a294-404246566892', 'submitted', timestamp '2024-08-15 12:00:00' - interval '6 hours' - interval '34 mins', timestamp '2024-08-15 12:00:00' - interval '6 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b2c60258-087a-4abc-8766-4c3611a757b9', 'd6dffbd3-5968-40fe-819a-b444ec207064', '37ec86c1-bd1d-4155-a442-a1454ef973c5', 34) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('25825192-7ba1-4d02-ad19-965a5b3b1562', 'd6dffbd3-5968-40fe-819a-b444ec207064', '3ac872ec-e845-4aec-a4e4-c27376aa77e8', 32) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7bc21b61-d574-4667-9edf-894ef89ac53a', 'd6dffbd3-5968-40fe-819a-b444ec207064', '795dd7aa-24c7-44df-acd2-44dbb529189c', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('2b2d9e8c-f533-4fa1-9da0-9e00ed1a96ea', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'bd7220da-b4dd-4ddc-acbc-cac1d9491475', '3b0ea27c-c7a3-414a-ab47-db50db3ab838', 'submitted', timestamp '2024-08-15 12:00:00' - interval '64 hours' - interval '22 mins', timestamp '2024-08-15 12:00:00' - interval '64 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('428264e0-a6f5-4c05-b95d-c424565afa78', '2b2d9e8c-f533-4fa1-9da0-9e00ed1a96ea', '37ec86c1-bd1d-4155-a442-a1454ef973c5', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1c9c100b-525c-46e6-a839-0530703195c3', '2b2d9e8c-f533-4fa1-9da0-9e00ed1a96ea', '3ac872ec-e845-4aec-a4e4-c27376aa77e8', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a5e123d5-12ac-4b26-8ee1-764931c0e25f', '2b2d9e8c-f533-4fa1-9da0-9e00ed1a96ea', '795dd7aa-24c7-44df-acd2-44dbb529189c', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('c0cbc5e6-eba6-46d4-8f84-e4a2d916cfd6', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'f5a78224-c079-428b-a9be-b4ab0c8d0f38', '3b0ea27c-c7a3-414a-ab47-db50db3ab838', 'submitted', timestamp '2024-08-15 12:00:00' - interval '66 hours' - interval '22 mins', timestamp '2024-08-15 12:00:00' - interval '66 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d4a4e8ae-fb7e-4c6b-961b-1fa69e733f4d', 'c0cbc5e6-eba6-46d4-8f84-e4a2d916cfd6', '37ec86c1-bd1d-4155-a442-a1454ef973c5', 33) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('79393beb-beb9-4731-b1b8-904a97a115b4', 'c0cbc5e6-eba6-46d4-8f84-e4a2d916cfd6', '3ac872ec-e845-4aec-a4e4-c27376aa77e8', 35) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fd781824-c1f5-44e0-adb6-2c4d10090e6d', 'c0cbc5e6-eba6-46d4-8f84-e4a2d916cfd6', '795dd7aa-24c7-44df-acd2-44dbb529189c', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('22699213-f2c3-4bee-b158-3400d0a93561', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'bd7220da-b4dd-4ddc-acbc-cac1d9491475', '15c5c11f-a19f-48f7-aa39-92872d8a1a00', 'submitted', timestamp '2024-08-15 12:00:00' - interval '31 hours' - interval '22 mins', timestamp '2024-08-15 12:00:00' - interval '31 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e4532a09-56c0-4300-9774-19315268278a', '22699213-f2c3-4bee-b158-3400d0a93561', '37ec86c1-bd1d-4155-a442-a1454ef973c5', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e3be4d3d-8594-4670-b9c7-96e6b3292a95', '22699213-f2c3-4bee-b158-3400d0a93561', '3ac872ec-e845-4aec-a4e4-c27376aa77e8', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0cb341ff-6cf6-45e1-9bdc-bef2e5fcb3d2', '22699213-f2c3-4bee-b158-3400d0a93561', '795dd7aa-24c7-44df-acd2-44dbb529189c', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('bb0fc21d-072f-4410-8ebf-02bb3128b7a2', '3f9cabdb-61dc-45da-afa5-dbb1747cd8c8', 'f5a78224-c079-428b-a9be-b4ab0c8d0f38', '15c5c11f-a19f-48f7-aa39-92872d8a1a00', 'submitted', timestamp '2024-08-15 12:00:00' - interval '37 hours' - interval '34 mins', timestamp '2024-08-15 12:00:00' - interval '37 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('32b830e9-477f-4abd-a11d-1fd9b7413386', 'bb0fc21d-072f-4410-8ebf-02bb3128b7a2', '37ec86c1-bd1d-4155-a442-a1454ef973c5', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('059efd52-57d0-456b-a2a8-8f951af8a313', 'bb0fc21d-072f-4410-8ebf-02bb3128b7a2', '3ac872ec-e845-4aec-a4e4-c27376aa77e8', 32) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('25b7ffce-c93b-4390-b4ff-b945078cca0a', 'bb0fc21d-072f-4410-8ebf-02bb3128b7a2', '795dd7aa-24c7-44df-acd2-44dbb529189c', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('87b47b35-eab9-4680-8b19-fd37439d8c9e', '6c44b363-4522-4cad-a251-06484b72b164', '7c08441a-9b1c-43b1-ab4b-a6d204c8f90d', '2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', 'submitted', timestamp '2026-08-15 12:00:00' - interval '24 hours' - interval '42 mins', timestamp '2026-08-15 12:00:00' - interval '24 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c19f6649-f29f-47d6-bb3c-ba4e624ce3e9', '87b47b35-eab9-4680-8b19-fd37439d8c9e', 'bef0ee60-1170-401b-a860-190ae7af1d01', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bf59be50-ed00-4d1e-a9fb-226a51677d9b', '87b47b35-eab9-4680-8b19-fd37439d8c9e', '14b446ba-82d2-4360-a0d5-3d650c766907', 33) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0e7bc8cf-4a52-4052-acd2-c6952738892a', '87b47b35-eab9-4680-8b19-fd37439d8c9e', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('77eaec74-626f-4156-a850-843680b727c5', '6c44b363-4522-4cad-a251-06484b72b164', 'ca11e01d-82af-4055-aa03-4640780aa91b', '2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', 'submitted', timestamp '2026-08-15 12:00:00' - interval '33 hours' - interval '27 mins', timestamp '2026-08-15 12:00:00' - interval '33 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6d16f234-a701-4f29-ac89-03ae85b978c4', '77eaec74-626f-4156-a850-843680b727c5', 'bef0ee60-1170-401b-a860-190ae7af1d01', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2b8c37dc-c2e0-4dcc-9691-5fc237a1df09', '77eaec74-626f-4156-a850-843680b727c5', '14b446ba-82d2-4360-a0d5-3d650c766907', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b0ac83dc-aa68-4105-8d2b-466a52fec828', '77eaec74-626f-4156-a850-843680b727c5', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('ff36c269-a4c1-42b2-ad1c-29b4bc484d59', '6c44b363-4522-4cad-a251-06484b72b164', 'f587f2b0-2c8e-40bc-ac05-182f1d07cf58', '2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', 'submitted', timestamp '2026-08-15 12:00:00' - interval '3 hours' - interval '40 mins', timestamp '2026-08-15 12:00:00' - interval '3 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8e2513b3-12a1-4511-8ae2-eb5b0a9f0ffe', 'ff36c269-a4c1-42b2-ad1c-29b4bc484d59', 'bef0ee60-1170-401b-a860-190ae7af1d01', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c1928faa-0f80-4859-b4d4-0c50e9b36075', 'ff36c269-a4c1-42b2-ad1c-29b4bc484d59', '14b446ba-82d2-4360-a0d5-3d650c766907', 36) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('10c4b03e-3aaa-4c94-8eb7-bd01c287e16b', 'ff36c269-a4c1-42b2-ad1c-29b4bc484d59', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('b5544a4f-077a-423f-9407-6863d93bc51a', '6c44b363-4522-4cad-a251-06484b72b164', '32f1ec66-89dc-49f5-a867-7ec816ff6d07', '2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', 'submitted', timestamp '2026-08-15 12:00:00' - interval '15 hours' - interval '24 mins', timestamp '2026-08-15 12:00:00' - interval '15 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1bb3fbcd-03e0-43a6-9d68-c1a928f5f365', 'b5544a4f-077a-423f-9407-6863d93bc51a', 'bef0ee60-1170-401b-a860-190ae7af1d01', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a97df9b2-146e-418b-bc15-2511b231727e', 'b5544a4f-077a-423f-9407-6863d93bc51a', '14b446ba-82d2-4360-a0d5-3d650c766907', 32) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('490ff9c3-811f-4376-bacd-4e2aded09b55', 'b5544a4f-077a-423f-9407-6863d93bc51a', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('659353ee-95a0-455a-9039-d091b51fd1fc', '6c44b363-4522-4cad-a251-06484b72b164', '7c08441a-9b1c-43b1-ab4b-a6d204c8f90d', '79ef4764-8e84-4a18-ad48-dbd780a5a027', 'submitted', timestamp '2026-08-15 12:00:00' - interval '10 hours' - interval '22 mins', timestamp '2026-08-15 12:00:00' - interval '10 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1509ceb9-6e39-41ae-ad2a-7f4fcf1d8137', '659353ee-95a0-455a-9039-d091b51fd1fc', 'bef0ee60-1170-401b-a860-190ae7af1d01', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('149268cd-6522-48ba-8a6a-044532da5acd', '659353ee-95a0-455a-9039-d091b51fd1fc', '14b446ba-82d2-4360-a0d5-3d650c766907', 35) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3d88895c-fb8b-483c-9655-483428296540', '659353ee-95a0-455a-9039-d091b51fd1fc', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('0b13f3f9-e5d9-4349-8b3a-d859b146a66e', '6c44b363-4522-4cad-a251-06484b72b164', 'ca11e01d-82af-4055-aa03-4640780aa91b', '79ef4764-8e84-4a18-ad48-dbd780a5a027', 'submitted', timestamp '2026-08-15 12:00:00' - interval '27 hours' - interval '42 mins', timestamp '2026-08-15 12:00:00' - interval '27 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('90e75410-93fc-48c8-923f-279c6b533783', '0b13f3f9-e5d9-4349-8b3a-d859b146a66e', 'bef0ee60-1170-401b-a860-190ae7af1d01', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fc9bd2a8-cfe9-448b-9e20-434b875481a9', '0b13f3f9-e5d9-4349-8b3a-d859b146a66e', '14b446ba-82d2-4360-a0d5-3d650c766907', 38) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1bb4d5f9-a357-462c-b454-cc479e3a269a', '0b13f3f9-e5d9-4349-8b3a-d859b146a66e', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('06defdbf-4b51-484a-bbf7-ac7bd0d27887', '6c44b363-4522-4cad-a251-06484b72b164', 'f587f2b0-2c8e-40bc-ac05-182f1d07cf58', '79ef4764-8e84-4a18-ad48-dbd780a5a027', 'submitted', timestamp '2026-08-15 12:00:00' - interval '72 hours' - interval '22 mins', timestamp '2026-08-15 12:00:00' - interval '72 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7b0afcd3-7f34-42a8-9cf4-ba9453e47e36', '06defdbf-4b51-484a-bbf7-ac7bd0d27887', 'bef0ee60-1170-401b-a860-190ae7af1d01', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1a80e7ea-0fd5-4d8c-8275-e87d92635ae2', '06defdbf-4b51-484a-bbf7-ac7bd0d27887', '14b446ba-82d2-4360-a0d5-3d650c766907', 33) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('91d1bd85-c434-4880-a284-06ee5b8afa6f', '06defdbf-4b51-484a-bbf7-ac7bd0d27887', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a7c2dcbc-a3d7-4344-a099-055ccfee69a0', '6c44b363-4522-4cad-a251-06484b72b164', '32f1ec66-89dc-49f5-a867-7ec816ff6d07', '79ef4764-8e84-4a18-ad48-dbd780a5a027', 'submitted', timestamp '2026-08-15 12:00:00' - interval '36 hours' - interval '30 mins', timestamp '2026-08-15 12:00:00' - interval '36 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fc6286fa-32f1-4bdc-ae13-c99f50c3d46f', 'a7c2dcbc-a3d7-4344-a099-055ccfee69a0', 'bef0ee60-1170-401b-a860-190ae7af1d01', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('77588eb8-9d90-46ef-a8db-d9e29ec5050e', 'a7c2dcbc-a3d7-4344-a099-055ccfee69a0', '14b446ba-82d2-4360-a0d5-3d650c766907', 35) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('416c05a6-6d5e-46f6-bf50-411eac5ff1db', 'a7c2dcbc-a3d7-4344-a099-055ccfee69a0', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('93d4a716-84bc-4651-a995-0dff0a4023ac', '6c44b363-4522-4cad-a251-06484b72b164', '7c08441a-9b1c-43b1-ab4b-a6d204c8f90d', 'a206da8b-457b-4842-ae74-911fb4193bfe', 'submitted', timestamp '2026-08-15 12:00:00' - interval '28 hours' - interval '34 mins', timestamp '2026-08-15 12:00:00' - interval '28 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9625d3cf-a159-4a53-b335-1149ef9ea880', '93d4a716-84bc-4651-a995-0dff0a4023ac', 'bef0ee60-1170-401b-a860-190ae7af1d01', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('66cf80e9-3105-4689-9a11-0ca3866ae75b', '93d4a716-84bc-4651-a995-0dff0a4023ac', '14b446ba-82d2-4360-a0d5-3d650c766907', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bcf674e0-e2c5-434d-9ea6-420f03b02879', '93d4a716-84bc-4651-a995-0dff0a4023ac', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('b7821570-055b-46d1-81c9-0eb3acf4fe9b', '6c44b363-4522-4cad-a251-06484b72b164', 'ca11e01d-82af-4055-aa03-4640780aa91b', 'a206da8b-457b-4842-ae74-911fb4193bfe', 'submitted', timestamp '2026-08-15 12:00:00' - interval '64 hours' - interval '41 mins', timestamp '2026-08-15 12:00:00' - interval '64 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4a5aed04-02eb-4f78-b2c1-9eada24ab3bc', 'b7821570-055b-46d1-81c9-0eb3acf4fe9b', 'bef0ee60-1170-401b-a860-190ae7af1d01', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0c5cfbab-4040-4087-81bc-da1ec6074cb5', 'b7821570-055b-46d1-81c9-0eb3acf4fe9b', '14b446ba-82d2-4360-a0d5-3d650c766907', 35) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('955eff91-d4c8-4ccf-87e6-1497faec5b04', 'b7821570-055b-46d1-81c9-0eb3acf4fe9b', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('ba07bb87-5d3b-4fc0-8b1f-4aa9857d32df', '6c44b363-4522-4cad-a251-06484b72b164', 'f587f2b0-2c8e-40bc-ac05-182f1d07cf58', 'a206da8b-457b-4842-ae74-911fb4193bfe', 'submitted', timestamp '2026-08-15 12:00:00' - interval '26 hours' - interval '35 mins', timestamp '2026-08-15 12:00:00' - interval '26 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4fba42ca-7a94-4375-9405-de3620f91ae8', 'ba07bb87-5d3b-4fc0-8b1f-4aa9857d32df', 'bef0ee60-1170-401b-a860-190ae7af1d01', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f7e816c7-4723-475b-8b62-9cac4e343bb3', 'ba07bb87-5d3b-4fc0-8b1f-4aa9857d32df', '14b446ba-82d2-4360-a0d5-3d650c766907', 35) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f45d8b1c-036d-4511-843a-11cffe32ff12', 'ba07bb87-5d3b-4fc0-8b1f-4aa9857d32df', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('b9705a03-600b-4b37-aab9-5325c85dad41', '6c44b363-4522-4cad-a251-06484b72b164', '32f1ec66-89dc-49f5-a867-7ec816ff6d07', 'a206da8b-457b-4842-ae74-911fb4193bfe', 'submitted', timestamp '2026-08-15 12:00:00' - interval '66 hours' - interval '43 mins', timestamp '2026-08-15 12:00:00' - interval '66 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('58f64b79-9762-4635-9db0-03eaeaf86668', 'b9705a03-600b-4b37-aab9-5325c85dad41', 'bef0ee60-1170-401b-a860-190ae7af1d01', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('44fc4605-a558-45a7-a67e-ec40ae90d9c6', 'b9705a03-600b-4b37-aab9-5325c85dad41', '14b446ba-82d2-4360-a0d5-3d650c766907', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e1fafb90-cfe0-4550-a0da-85c3b571a469', 'b9705a03-600b-4b37-aab9-5325c85dad41', 'c7b88d63-b8b9-4151-ae69-d608d9cc4435', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('3953afde-a6cc-4f3f-a9f3-de1774ffe826', '318124ea-8614-4355-ad48-2486524dfc13', '558f6b14-f11f-4dc3-ad37-c9041ad4e145', 'f106ca15-dc12-414f-ac41-0b361db08f95', 'submitted', timestamp '2025-08-15 12:00:00' - interval '28 hours' - interval '35 mins', timestamp '2025-08-15 12:00:00' - interval '28 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('03eae452-12a2-4496-b0e8-749ce89d1dcf', '3953afde-a6cc-4f3f-a9f3-de1774ffe826', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c73a2b43-ed0b-4726-8505-beabfd1e83fc', '3953afde-a6cc-4f3f-a9f3-de1774ffe826', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', 37) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bbecc02e-c2ca-4eaf-9c4a-ea3a4ae9e180', '3953afde-a6cc-4f3f-a9f3-de1774ffe826', '364bedf6-a50f-425c-aa45-3567c85d5ff8', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('271b557c-acdc-40a1-8cff-8cef73fa7a7a', '318124ea-8614-4355-ad48-2486524dfc13', 'e970c78e-aaff-43ef-a236-77caf54b07ce', 'f106ca15-dc12-414f-ac41-0b361db08f95', 'submitted', timestamp '2025-08-15 12:00:00' - interval '71 hours' - interval '33 mins', timestamp '2025-08-15 12:00:00' - interval '71 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0050e3ed-98c7-421c-8de6-9fe113e2653c', '271b557c-acdc-40a1-8cff-8cef73fa7a7a', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('768b1085-ec6d-4ae0-a472-361cda002e78', '271b557c-acdc-40a1-8cff-8cef73fa7a7a', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', 34) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('865398c8-df15-4696-b0e7-1ec404019c59', '271b557c-acdc-40a1-8cff-8cef73fa7a7a', '364bedf6-a50f-425c-aa45-3567c85d5ff8', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('08990d9a-9883-4a46-bb00-ca3c9fd1758a', '318124ea-8614-4355-ad48-2486524dfc13', '9c450cf6-cae4-4390-a3ed-12f231962d02', 'f106ca15-dc12-414f-ac41-0b361db08f95', 'submitted', timestamp '2025-08-15 12:00:00' - interval '36 hours' - interval '24 mins', timestamp '2025-08-15 12:00:00' - interval '36 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('26f218f3-2e9b-40b3-960e-6e38fae2abd5', '08990d9a-9883-4a46-bb00-ca3c9fd1758a', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6539330c-ab9d-4001-b811-4abeb8537424', '08990d9a-9883-4a46-bb00-ca3c9fd1758a', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('70913a62-773f-4d89-ad7d-52b7cd2cf5d9', '08990d9a-9883-4a46-bb00-ca3c9fd1758a', '364bedf6-a50f-425c-aa45-3567c85d5ff8', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('c6a62959-a7e2-4713-8161-3d97a8dc7f08', '318124ea-8614-4355-ad48-2486524dfc13', '558f6b14-f11f-4dc3-ad37-c9041ad4e145', '2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', 'submitted', timestamp '2025-08-15 12:00:00' - interval '53 hours' - interval '42 mins', timestamp '2025-08-15 12:00:00' - interval '53 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6080384d-4ca7-4c44-a37a-c7be750331b7', 'c6a62959-a7e2-4713-8161-3d97a8dc7f08', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5781ccfe-2053-4aa5-9da0-a6cc5988bec6', 'c6a62959-a7e2-4713-8161-3d97a8dc7f08', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', 37) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('458fb8a3-6ab4-4e84-b294-14eb842a84e0', 'c6a62959-a7e2-4713-8161-3d97a8dc7f08', '364bedf6-a50f-425c-aa45-3567c85d5ff8', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('ccc6f7b8-d172-4ba1-808e-c4faaf342605', '318124ea-8614-4355-ad48-2486524dfc13', 'e970c78e-aaff-43ef-a236-77caf54b07ce', '2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', 'submitted', timestamp '2025-08-15 12:00:00' - interval '38 hours' - interval '34 mins', timestamp '2025-08-15 12:00:00' - interval '38 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('22d3dbf6-f52e-4dd7-ba9c-975494603e04', 'ccc6f7b8-d172-4ba1-808e-c4faaf342605', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('31fd0238-dd81-41b2-985d-4e75d2f558d2', 'ccc6f7b8-d172-4ba1-808e-c4faaf342605', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('725185f7-975d-4ef0-8a48-72bb8ed468db', 'ccc6f7b8-d172-4ba1-808e-c4faaf342605', '364bedf6-a50f-425c-aa45-3567c85d5ff8', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('5e61cced-ed71-4eb3-ac9d-4cae92b7f53f', '318124ea-8614-4355-ad48-2486524dfc13', '9c450cf6-cae4-4390-a3ed-12f231962d02', '2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', 'submitted', timestamp '2025-08-15 12:00:00' - interval '44 hours' - interval '26 mins', timestamp '2025-08-15 12:00:00' - interval '44 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8f6e2b56-e1b0-4ffe-a080-9cf9ee7ff679', '5e61cced-ed71-4eb3-ac9d-4cae92b7f53f', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c54daf61-5ccd-4226-b814-17dda918e70a', '5e61cced-ed71-4eb3-ac9d-4cae92b7f53f', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', 32) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c86ea269-0b00-4e93-9154-0b695f4c090c', '5e61cced-ed71-4eb3-ac9d-4cae92b7f53f', '364bedf6-a50f-425c-aa45-3567c85d5ff8', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a293f5c3-9802-46f6-b3f4-0cd0172c2aaf', '318124ea-8614-4355-ad48-2486524dfc13', '558f6b14-f11f-4dc3-ad37-c9041ad4e145', '79ef4764-8e84-4a18-ad48-dbd780a5a027', 'submitted', timestamp '2025-08-15 12:00:00' - interval '39 hours' - interval '40 mins', timestamp '2025-08-15 12:00:00' - interval '39 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8cfa6f5f-4181-40b5-b522-9789d217d552', 'a293f5c3-9802-46f6-b3f4-0cd0172c2aaf', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dc0ceda0-4c64-4d2b-805e-fd55d9598f41', 'a293f5c3-9802-46f6-b3f4-0cd0172c2aaf', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', 34) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5b2a8376-817b-4c6a-be3c-a3bfe9fdfdcf', 'a293f5c3-9802-46f6-b3f4-0cd0172c2aaf', '364bedf6-a50f-425c-aa45-3567c85d5ff8', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('6c38e536-7358-4124-bdf8-d2f037a19ca4', '318124ea-8614-4355-ad48-2486524dfc13', 'e970c78e-aaff-43ef-a236-77caf54b07ce', '79ef4764-8e84-4a18-ad48-dbd780a5a027', 'submitted', timestamp '2025-08-15 12:00:00' - interval '69 hours' - interval '40 mins', timestamp '2025-08-15 12:00:00' - interval '69 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7868915d-2cc3-4566-aebe-5f76bf16345c', '6c38e536-7358-4124-bdf8-d2f037a19ca4', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('23848dfb-3801-4849-a35f-de1a87d57fb7', '6c38e536-7358-4124-bdf8-d2f037a19ca4', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', 36) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7a1b2a2b-3ddf-46c0-9fc6-658e40b1c3a9', '6c38e536-7358-4124-bdf8-d2f037a19ca4', '364bedf6-a50f-425c-aa45-3567c85d5ff8', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('810c49c0-ebec-45a0-9e70-efaf71ff001b', '318124ea-8614-4355-ad48-2486524dfc13', '9c450cf6-cae4-4390-a3ed-12f231962d02', '79ef4764-8e84-4a18-ad48-dbd780a5a027', 'submitted', timestamp '2025-08-15 12:00:00' - interval '10 hours' - interval '25 mins', timestamp '2025-08-15 12:00:00' - interval '10 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ae98198c-db36-4d4a-9d02-31db56af7ffa', '810c49c0-ebec-45a0-9e70-efaf71ff001b', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2eabe0aa-9bac-4ed7-9c5a-feabcd5c6ec4', '810c49c0-ebec-45a0-9e70-efaf71ff001b', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7116a964-9842-4411-820b-2c901a445662', '810c49c0-ebec-45a0-9e70-efaf71ff001b', '364bedf6-a50f-425c-aa45-3567c85d5ff8', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('25cdf1fd-9f4b-4fbe-b776-7c211c828a05', '318124ea-8614-4355-ad48-2486524dfc13', '558f6b14-f11f-4dc3-ad37-c9041ad4e145', 'a206da8b-457b-4842-ae74-911fb4193bfe', 'submitted', timestamp '2025-08-15 12:00:00' - interval '7 hours' - interval '43 mins', timestamp '2025-08-15 12:00:00' - interval '7 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8604ceeb-cb45-47e7-aee1-ec038951be46', '25cdf1fd-9f4b-4fbe-b776-7c211c828a05', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8209954e-9d95-4432-9d63-ecfab0880cf9', '25cdf1fd-9f4b-4fbe-b776-7c211c828a05', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3706a499-3dd1-4308-afd0-70f815ea81cb', '25cdf1fd-9f4b-4fbe-b776-7c211c828a05', '364bedf6-a50f-425c-aa45-3567c85d5ff8', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('ec60435b-0063-4b27-9154-9b9cf9c65d1a', '318124ea-8614-4355-ad48-2486524dfc13', 'e970c78e-aaff-43ef-a236-77caf54b07ce', 'a206da8b-457b-4842-ae74-911fb4193bfe', 'submitted', timestamp '2025-08-15 12:00:00' - interval '25 hours' - interval '35 mins', timestamp '2025-08-15 12:00:00' - interval '25 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('37cb88ab-f9ff-49fb-a3cf-dc83e4bc5ee7', 'ec60435b-0063-4b27-9154-9b9cf9c65d1a', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('17fa7608-9aa4-4ef8-8561-bc181490c274', 'ec60435b-0063-4b27-9154-9b9cf9c65d1a', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', 37) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('da517274-5200-4c30-bf2b-cd677149eebb', 'ec60435b-0063-4b27-9154-9b9cf9c65d1a', '364bedf6-a50f-425c-aa45-3567c85d5ff8', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('19790cb3-a637-4064-aac9-395908e675ee', '318124ea-8614-4355-ad48-2486524dfc13', '9c450cf6-cae4-4390-a3ed-12f231962d02', 'a206da8b-457b-4842-ae74-911fb4193bfe', 'submitted', timestamp '2025-08-15 12:00:00' - interval '68 hours' - interval '44 mins', timestamp '2025-08-15 12:00:00' - interval '68 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c96cfae0-7084-4098-9f97-e4f125519a0d', '19790cb3-a637-4064-aac9-395908e675ee', 'f9fff257-dd3c-402c-a751-be4cd5b12e92', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c32bb21f-06db-4458-82da-2e16fc6d94ef', '19790cb3-a637-4064-aac9-395908e675ee', 'e64b33e7-ae8d-4c65-a011-618a8d31e2c4', 38) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7a3800dc-0404-43c4-a375-bfe95ac27da2', '19790cb3-a637-4064-aac9-395908e675ee', '364bedf6-a50f-425c-aa45-3567c85d5ff8', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('676e2f86-0117-4e60-bb62-b3ea8a73145f', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '55964658-c936-45e8-ae7c-bccdb9dcfb20', 'f106ca15-dc12-414f-ac41-0b361db08f95', 'submitted', timestamp '2024-08-15 12:00:00' - interval '29 hours' - interval '25 mins', timestamp '2024-08-15 12:00:00' - interval '29 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('207f3caf-61a8-406b-91e8-39d5de320f37', '676e2f86-0117-4e60-bb62-b3ea8a73145f', 'ba64aea1-ea3d-4194-a943-072cecebe7da', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ca65cb69-0c5d-4e10-aac9-3774b212b35a', '676e2f86-0117-4e60-bb62-b3ea8a73145f', '98470b72-67ab-4567-a032-60878aa519ac', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c03dac7a-eb0f-4f1b-aca9-ed336ad4ff9c', '676e2f86-0117-4e60-bb62-b3ea8a73145f', '4ed2d550-6e1d-445e-a788-36a46c491f1a', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('249fb03a-d06b-422d-aa2e-2170c442555c', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', 'bc3fe67d-937f-4744-ae90-a19293fc5d5c', 'f106ca15-dc12-414f-ac41-0b361db08f95', 'submitted', timestamp '2024-08-15 12:00:00' - interval '11 hours' - interval '35 mins', timestamp '2024-08-15 12:00:00' - interval '11 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e028a2ab-73e5-4fe4-9210-70a87ce9a9dd', '249fb03a-d06b-422d-aa2e-2170c442555c', 'ba64aea1-ea3d-4194-a943-072cecebe7da', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('1a73f1eb-7d2f-4e2b-9321-2ba5d273bf01', '249fb03a-d06b-422d-aa2e-2170c442555c', '98470b72-67ab-4567-a032-60878aa519ac', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('04561fa9-9739-443a-a5bc-93b7d259716c', '249fb03a-d06b-422d-aa2e-2170c442555c', '4ed2d550-6e1d-445e-a788-36a46c491f1a', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('ba5a3071-f2a2-4ba7-a791-2046098795f8', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '55964658-c936-45e8-ae7c-bccdb9dcfb20', '2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', 'submitted', timestamp '2024-08-15 12:00:00' - interval '62 hours' - interval '27 mins', timestamp '2024-08-15 12:00:00' - interval '62 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('45ca82db-0a43-4ec8-bea4-55d09e722f05', 'ba5a3071-f2a2-4ba7-a791-2046098795f8', 'ba64aea1-ea3d-4194-a943-072cecebe7da', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8e69a483-afa4-4266-9fd6-7c56894b08a3', 'ba5a3071-f2a2-4ba7-a791-2046098795f8', '98470b72-67ab-4567-a032-60878aa519ac', 32) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a2ae9328-06c6-49af-9fbc-af285541143d', 'ba5a3071-f2a2-4ba7-a791-2046098795f8', '4ed2d550-6e1d-445e-a788-36a46c491f1a', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('58f6bfef-e18b-486d-8fb0-e4f2d8fb40a4', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', 'bc3fe67d-937f-4744-ae90-a19293fc5d5c', '2d3b2caa-0358-45c2-a122-c1c17cb9fbc5', 'submitted', timestamp '2024-08-15 12:00:00' - interval '13 hours' - interval '33 mins', timestamp '2024-08-15 12:00:00' - interval '13 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a419dae3-7ff5-4b1a-ba8e-a5bc1d3d89e7', '58f6bfef-e18b-486d-8fb0-e4f2d8fb40a4', 'ba64aea1-ea3d-4194-a943-072cecebe7da', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fdb708c1-7a54-4c77-899f-89aa58ab0907', '58f6bfef-e18b-486d-8fb0-e4f2d8fb40a4', '98470b72-67ab-4567-a032-60878aa519ac', 35) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('74ff960c-fc04-4413-908b-ad2f3add7ac9', '58f6bfef-e18b-486d-8fb0-e4f2d8fb40a4', '4ed2d550-6e1d-445e-a788-36a46c491f1a', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('b16c5c30-15a5-4072-8e5d-26dc602c2de5', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '55964658-c936-45e8-ae7c-bccdb9dcfb20', '79ef4764-8e84-4a18-ad48-dbd780a5a027', 'submitted', timestamp '2024-08-15 12:00:00' - interval '33 hours' - interval '24 mins', timestamp '2024-08-15 12:00:00' - interval '33 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('72c14a43-f213-40aa-9b92-6169ea5d3bc9', 'b16c5c30-15a5-4072-8e5d-26dc602c2de5', 'ba64aea1-ea3d-4194-a943-072cecebe7da', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('55b44a61-4008-411d-8ccd-79b8a8509c0f', 'b16c5c30-15a5-4072-8e5d-26dc602c2de5', '98470b72-67ab-4567-a032-60878aa519ac', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b608ac9b-e87b-49e7-b6ed-9cf03dfd83f9', 'b16c5c30-15a5-4072-8e5d-26dc602c2de5', '4ed2d550-6e1d-445e-a788-36a46c491f1a', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('42a29733-a511-49d6-8aa7-4e9f8e56e1a3', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', 'bc3fe67d-937f-4744-ae90-a19293fc5d5c', '79ef4764-8e84-4a18-ad48-dbd780a5a027', 'submitted', timestamp '2024-08-15 12:00:00' - interval '27 hours' - interval '27 mins', timestamp '2024-08-15 12:00:00' - interval '27 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f684eb89-b2b8-4ac3-bf90-fa301cd99523', '42a29733-a511-49d6-8aa7-4e9f8e56e1a3', 'ba64aea1-ea3d-4194-a943-072cecebe7da', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dec902b3-f51d-4843-bc2a-db6404fdd540', '42a29733-a511-49d6-8aa7-4e9f8e56e1a3', '98470b72-67ab-4567-a032-60878aa519ac', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('51af1831-c94e-4fca-b4d6-ac05270cfd77', '42a29733-a511-49d6-8aa7-4e9f8e56e1a3', '4ed2d550-6e1d-445e-a788-36a46c491f1a', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('6c4cba54-f1d6-4d99-9e68-6e60f6882148', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', '55964658-c936-45e8-ae7c-bccdb9dcfb20', 'a206da8b-457b-4842-ae74-911fb4193bfe', 'submitted', timestamp '2024-08-15 12:00:00' - interval '58 hours' - interval '39 mins', timestamp '2024-08-15 12:00:00' - interval '58 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bd772962-200a-4bf0-bbba-0abe1d548436', '6c4cba54-f1d6-4d99-9e68-6e60f6882148', 'ba64aea1-ea3d-4194-a943-072cecebe7da', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('da5fdd87-d35a-49b6-92d6-4a5f8c6e9f59', '6c4cba54-f1d6-4d99-9e68-6e60f6882148', '98470b72-67ab-4567-a032-60878aa519ac', 33) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('52920f18-5a1c-4b45-b56b-6289fd684d0a', '6c4cba54-f1d6-4d99-9e68-6e60f6882148', '4ed2d550-6e1d-445e-a788-36a46c491f1a', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d38c233d-01a1-4982-abab-b38c6ab2b70b', 'b7014c23-db5e-4be5-a5d6-d9597e8578cc', 'bc3fe67d-937f-4744-ae90-a19293fc5d5c', 'a206da8b-457b-4842-ae74-911fb4193bfe', 'submitted', timestamp '2024-08-15 12:00:00' - interval '44 hours' - interval '28 mins', timestamp '2024-08-15 12:00:00' - interval '44 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7eea8377-5a82-46cf-a355-8f62c31cfcfe', 'd38c233d-01a1-4982-abab-b38c6ab2b70b', 'ba64aea1-ea3d-4194-a943-072cecebe7da', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6c8508ee-8dd7-4970-94a5-452090b14868', 'd38c233d-01a1-4982-abab-b38c6ab2b70b', '98470b72-67ab-4567-a032-60878aa519ac', 35) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cec10591-11b9-482e-a8cc-4d4c66787470', 'd38c233d-01a1-4982-abab-b38c6ab2b70b', '4ed2d550-6e1d-445e-a788-36a46c491f1a', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e177daad-1d7c-4267-9d3e-c7ae86af113c', '47979751-163d-48b3-ae56-a65586d18f1b', '7409c3d5-b62b-487e-aa60-8be8b736f7d9', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', timestamp '2026-08-15 12:00:00' - interval '3 hours' - interval '32 mins', timestamp '2026-08-15 12:00:00' - interval '3 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f4697a6a-6a41-41e8-a1ef-cd671afe070f', 'e177daad-1d7c-4267-9d3e-c7ae86af113c', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e47af3e7-1220-49dc-b685-ed4315880fe4', 'e177daad-1d7c-4267-9d3e-c7ae86af113c', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e17889db-da91-4eb8-b2e8-b13b02170c38', 'e177daad-1d7c-4267-9d3e-c7ae86af113c', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('478d0d1f-8cf5-49ed-9cfc-39205361924a', 'e177daad-1d7c-4267-9d3e-c7ae86af113c', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('4df8ffcf-5e36-45a3-9f58-e653813a5f5f', '47979751-163d-48b3-ae56-a65586d18f1b', 'd812e821-9cf5-4042-ae7b-7b45b9a7b922', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', timestamp '2026-08-15 12:00:00' - interval '50 hours' - interval '20 mins', timestamp '2026-08-15 12:00:00' - interval '50 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('284ba785-4e79-4c15-93dc-8e87c00ca449', '4df8ffcf-5e36-45a3-9f58-e653813a5f5f', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('70192db7-1634-4d0b-8779-310038cd1bf8', '4df8ffcf-5e36-45a3-9f58-e653813a5f5f', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('31a429c6-6eca-47ef-8803-0c4b6a92c752', '4df8ffcf-5e36-45a3-9f58-e653813a5f5f', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('82dd4640-7274-4a53-8136-c0337921705a', '4df8ffcf-5e36-45a3-9f58-e653813a5f5f', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('cc20b5e5-76b2-4316-a5fc-51e4d54c2fe6', '47979751-163d-48b3-ae56-a65586d18f1b', 'e3603c93-8069-4824-afa0-10fe733475e3', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', timestamp '2026-08-15 12:00:00' - interval '8 hours' - interval '29 mins', timestamp '2026-08-15 12:00:00' - interval '8 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fa27bdc1-a099-479e-9441-a6949ed0119c', 'cc20b5e5-76b2-4316-a5fc-51e4d54c2fe6', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4a6e5552-1ec2-4880-ab85-292f8d7f4977', 'cc20b5e5-76b2-4316-a5fc-51e4d54c2fe6', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cf71f2af-9683-48d2-a4f8-da9fbd73cbea', 'cc20b5e5-76b2-4316-a5fc-51e4d54c2fe6', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6b21f48d-d34f-4707-ab72-0a12dc4ac384', 'cc20b5e5-76b2-4316-a5fc-51e4d54c2fe6', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('aa03d646-4a78-4c93-87af-ba1cf677ec9d', '47979751-163d-48b3-ae56-a65586d18f1b', '851c3941-dfa8-4feb-ae26-c58965626732', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', timestamp '2026-08-15 12:00:00' - interval '26 hours' - interval '33 mins', timestamp '2026-08-15 12:00:00' - interval '26 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e2fc6eba-d7fa-4686-baec-1527c22e6b21', 'aa03d646-4a78-4c93-87af-ba1cf677ec9d', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9c0299b3-ddae-4bb9-a3c0-38a465c0e060', 'aa03d646-4a78-4c93-87af-ba1cf677ec9d', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 32) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('55085a5b-dda2-463a-8ee8-cc209761df2b', 'aa03d646-4a78-4c93-87af-ba1cf677ec9d', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('be9d6163-ef7e-4ccd-9c3e-771b85af6c9f', 'aa03d646-4a78-4c93-87af-ba1cf677ec9d', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('4dc03947-041f-4986-908b-3bffdfc3494f', '47979751-163d-48b3-ae56-a65586d18f1b', '7409c3d5-b62b-487e-aa60-8be8b736f7d9', 'a71bad63-0a65-47a2-a5a5-623ab35c9ba7', 'submitted', timestamp '2026-08-15 12:00:00' - interval '51 hours' - interval '38 mins', timestamp '2026-08-15 12:00:00' - interval '51 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8581796b-9e8e-4aef-8c26-595ca92558a6', '4dc03947-041f-4986-908b-3bffdfc3494f', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f039578b-d49e-4f89-9e1d-4e014c3c25a1', '4dc03947-041f-4986-908b-3bffdfc3494f', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('761040a7-cd84-4527-9194-2dc4ce30595d', '4dc03947-041f-4986-908b-3bffdfc3494f', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ccab19ca-73a0-42d7-9596-17a4d495d371', '4dc03947-041f-4986-908b-3bffdfc3494f', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('43d35d41-ea1f-4c0a-af32-5d9608c61218', '47979751-163d-48b3-ae56-a65586d18f1b', 'd812e821-9cf5-4042-ae7b-7b45b9a7b922', 'a71bad63-0a65-47a2-a5a5-623ab35c9ba7', 'submitted', timestamp '2026-08-15 12:00:00' - interval '41 hours' - interval '32 mins', timestamp '2026-08-15 12:00:00' - interval '41 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9a2d5680-19cc-40f9-9288-a7a4714b4958', '43d35d41-ea1f-4c0a-af32-5d9608c61218', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9efe2ca3-6052-46e7-894e-830ea0773577', '43d35d41-ea1f-4c0a-af32-5d9608c61218', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('803905cb-114a-46b8-9f81-35b3ed8e9a9b', '43d35d41-ea1f-4c0a-af32-5d9608c61218', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6e295aff-1779-47ad-aaf0-2037d6b375fc', '43d35d41-ea1f-4c0a-af32-5d9608c61218', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('3fdf175f-98fe-41f8-9c43-2a069d007afd', '47979751-163d-48b3-ae56-a65586d18f1b', 'e3603c93-8069-4824-afa0-10fe733475e3', 'a71bad63-0a65-47a2-a5a5-623ab35c9ba7', 'submitted', timestamp '2026-08-15 12:00:00' - interval '13 hours' - interval '40 mins', timestamp '2026-08-15 12:00:00' - interval '13 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('116704a5-c379-4add-a080-c6f5f6429cbe', '3fdf175f-98fe-41f8-9c43-2a069d007afd', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2887c16f-f3be-456d-bb52-ff2ac2d6ae43', '3fdf175f-98fe-41f8-9c43-2a069d007afd', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ca2f78f6-cda9-4649-967a-f3f281eacca1', '3fdf175f-98fe-41f8-9c43-2a069d007afd', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e1266eeb-131c-4851-a33b-de184177fd7d', '3fdf175f-98fe-41f8-9c43-2a069d007afd', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('0ed670be-b839-4a85-a1f7-cc293c8face2', '47979751-163d-48b3-ae56-a65586d18f1b', '851c3941-dfa8-4feb-ae26-c58965626732', 'a71bad63-0a65-47a2-a5a5-623ab35c9ba7', 'submitted', timestamp '2026-08-15 12:00:00' - interval '63 hours' - interval '45 mins', timestamp '2026-08-15 12:00:00' - interval '63 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8bd59802-00f4-450e-98a9-e31cf84c4772', '0ed670be-b839-4a85-a1f7-cc293c8face2', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b5fb2f44-9e61-412d-b039-8b89c08ac5d1', '0ed670be-b839-4a85-a1f7-cc293c8face2', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('69cd51cf-4729-44ba-927c-2a0b23f7f5c5', '0ed670be-b839-4a85-a1f7-cc293c8face2', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8dbb3a92-ed7b-4d57-a392-489ad6cc551f', '0ed670be-b839-4a85-a1f7-cc293c8face2', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('90e11116-ef08-4a84-8247-21d1d051e6e0', '47979751-163d-48b3-ae56-a65586d18f1b', '7409c3d5-b62b-487e-aa60-8be8b736f7d9', '25380419-e8ec-4bae-a9e7-eeded88bba8b', 'submitted', timestamp '2026-08-15 12:00:00' - interval '22 hours' - interval '37 mins', timestamp '2026-08-15 12:00:00' - interval '22 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c68961f6-ef28-44be-b4c9-0fefd86041ba', '90e11116-ef08-4a84-8247-21d1d051e6e0', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5e7a4de0-2804-4cde-aef4-b1450334b60a', '90e11116-ef08-4a84-8247-21d1d051e6e0', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 33) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('433b7afe-d792-4c2d-93e3-5cee6f94af19', '90e11116-ef08-4a84-8247-21d1d051e6e0', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('89caa7b8-cbf0-4883-9635-5c47bb898e7f', '90e11116-ef08-4a84-8247-21d1d051e6e0', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('e6c32575-2723-40fe-8ac9-d42e2fb2d2ab', '47979751-163d-48b3-ae56-a65586d18f1b', 'd812e821-9cf5-4042-ae7b-7b45b9a7b922', '25380419-e8ec-4bae-a9e7-eeded88bba8b', 'submitted', timestamp '2026-08-15 12:00:00' - interval '62 hours' - interval '33 mins', timestamp '2026-08-15 12:00:00' - interval '62 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('78edfc37-ae74-40f5-96b3-055559c5999b', 'e6c32575-2723-40fe-8ac9-d42e2fb2d2ab', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2e034284-1f55-4b41-8472-87f60a32e6c7', 'e6c32575-2723-40fe-8ac9-d42e2fb2d2ab', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('553abf23-b883-4547-b476-1be2e38e8ec4', 'e6c32575-2723-40fe-8ac9-d42e2fb2d2ab', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7ce69b80-431b-4bf5-a0b9-303e8d7c1d0d', 'e6c32575-2723-40fe-8ac9-d42e2fb2d2ab', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('ee760bb9-9c6c-49f7-b89e-4f71cd6888f6', '47979751-163d-48b3-ae56-a65586d18f1b', 'e3603c93-8069-4824-afa0-10fe733475e3', '25380419-e8ec-4bae-a9e7-eeded88bba8b', 'submitted', timestamp '2026-08-15 12:00:00' - interval '39 hours' - interval '21 mins', timestamp '2026-08-15 12:00:00' - interval '39 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('eb9f5ea2-2c1e-4856-849d-41280071f49d', 'ee760bb9-9c6c-49f7-b89e-4f71cd6888f6', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('732c5027-0318-487b-9e2c-e6543a94f73c', 'ee760bb9-9c6c-49f7-b89e-4f71cd6888f6', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8b7a44b7-fdf1-4378-bc46-92957088b58a', 'ee760bb9-9c6c-49f7-b89e-4f71cd6888f6', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('eae165d2-dff5-41b9-bde2-f09b11f3458a', 'ee760bb9-9c6c-49f7-b89e-4f71cd6888f6', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('c7909bd4-571d-4d02-9150-324dfeb1d338', '47979751-163d-48b3-ae56-a65586d18f1b', '851c3941-dfa8-4feb-ae26-c58965626732', '25380419-e8ec-4bae-a9e7-eeded88bba8b', 'submitted', timestamp '2026-08-15 12:00:00' - interval '1 hours' - interval '41 mins', timestamp '2026-08-15 12:00:00' - interval '1 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('969827df-0a8e-4c69-92d3-bb6ad4ee0c9d', 'c7909bd4-571d-4d02-9150-324dfeb1d338', 'c33e7c6c-d2a0-4a2a-a56d-61625346ba0d', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('56fc76b8-eecd-4000-8d18-49709303cfa0', 'c7909bd4-571d-4d02-9150-324dfeb1d338', '02116bcb-cbfa-4011-ad98-97f3cf2c7f2d', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d2c6dcbe-2988-4217-99a1-4c7328d7fbba', 'c7909bd4-571d-4d02-9150-324dfeb1d338', '9ade7fa5-71bd-49c2-ab3b-54b92cad1f11', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('fc2d4eb2-6a58-4efa-b69f-09dcf0211079', 'c7909bd4-571d-4d02-9150-324dfeb1d338', '18f89a44-f174-4ac6-a17a-56d22bfbca1c', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('a992095b-f646-438b-a2f7-0b31e67b6654', '10abd4e8-0cb9-4853-a17c-ac40da311bff', 'bfe219aa-e626-4093-acb4-0a8d92229438', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', timestamp '2025-08-15 12:00:00' - interval '70 hours' - interval '24 mins', timestamp '2025-08-15 12:00:00' - interval '70 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('d85bc7d7-de86-463e-9dd1-d52ddd6f69de', 'a992095b-f646-438b-a2f7-0b31e67b6654', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('099db6bd-4d12-40f5-bbb0-7335cc476e71', 'a992095b-f646-438b-a2f7-0b31e67b6654', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2e175beb-37de-402a-8db1-14088f063427', 'a992095b-f646-438b-a2f7-0b31e67b6654', '73155527-14c8-4fff-a5a3-8847cbf901cc', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9ad44ebe-060e-4b65-b6e7-a034d42d8625', 'a992095b-f646-438b-a2f7-0b31e67b6654', '93da0efc-1f68-4c82-afa8-15b5afd72df7', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('51d5533a-598f-4be4-a623-edfed80aa0f0', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '667b7df9-720b-44ea-a5c0-47ee35ca31b7', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', timestamp '2025-08-15 12:00:00' - interval '56 hours' - interval '21 mins', timestamp '2025-08-15 12:00:00' - interval '56 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('702a3948-d63a-46ac-a381-74911a06cae9', '51d5533a-598f-4be4-a623-edfed80aa0f0', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('63e82540-f4d9-48fe-9c94-c56fc508a931', '51d5533a-598f-4be4-a623-edfed80aa0f0', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', 26) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dbf72c72-5bc5-490d-b3ce-e279feb04526', '51d5533a-598f-4be4-a623-edfed80aa0f0', '73155527-14c8-4fff-a5a3-8847cbf901cc', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('63739c23-f178-4491-b9c4-d92724937b84', '51d5533a-598f-4be4-a623-edfed80aa0f0', '93da0efc-1f68-4c82-afa8-15b5afd72df7', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('5814a35a-66e8-4d83-8cef-cc749daffcbf', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '77459bde-2dda-4848-a5c5-22decb273d5e', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', timestamp '2025-08-15 12:00:00' - interval '3 hours' - interval '24 mins', timestamp '2025-08-15 12:00:00' - interval '3 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3bcc2183-b91f-4346-b349-1aade3dd6c52', '5814a35a-66e8-4d83-8cef-cc749daffcbf', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9a77a91a-dfe5-4c68-86eb-e3a8db4bb6c5', '5814a35a-66e8-4d83-8cef-cc749daffcbf', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('134cf018-3309-4a77-b99b-ddeea65bcdfc', '5814a35a-66e8-4d83-8cef-cc749daffcbf', '73155527-14c8-4fff-a5a3-8847cbf901cc', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('81be34df-cd93-4e86-a4f3-925d8bb22ee0', '5814a35a-66e8-4d83-8cef-cc749daffcbf', '93da0efc-1f68-4c82-afa8-15b5afd72df7', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('0d6f331b-36a6-4a18-b659-61dc2b2bcc07', '10abd4e8-0cb9-4853-a17c-ac40da311bff', 'bfe219aa-e626-4093-acb4-0a8d92229438', '4f32d322-afb7-4042-a9d1-ce0c17a09a30', 'submitted', timestamp '2025-08-15 12:00:00' - interval '5 hours' - interval '34 mins', timestamp '2025-08-15 12:00:00' - interval '5 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bdc97a0d-346f-48ba-8f6f-0bef1127233a', '0d6f331b-36a6-4a18-b659-61dc2b2bcc07', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('47d2a468-1aa7-4d5a-9350-1fae69d95485', '0d6f331b-36a6-4a18-b659-61dc2b2bcc07', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', 31) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c541b07f-0e01-4fbb-8047-6e44045cce85', '0d6f331b-36a6-4a18-b659-61dc2b2bcc07', '73155527-14c8-4fff-a5a3-8847cbf901cc', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('cbabd645-ff8b-437e-9c3a-ef67737764ec', '0d6f331b-36a6-4a18-b659-61dc2b2bcc07', '93da0efc-1f68-4c82-afa8-15b5afd72df7', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('eebc72c5-8490-418b-8072-49b1b808fc81', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '667b7df9-720b-44ea-a5c0-47ee35ca31b7', '4f32d322-afb7-4042-a9d1-ce0c17a09a30', 'submitted', timestamp '2025-08-15 12:00:00' - interval '7 hours' - interval '23 mins', timestamp '2025-08-15 12:00:00' - interval '7 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('dbf45b03-215e-49d4-83a0-1ce32c3fc6e9', 'eebc72c5-8490-418b-8072-49b1b808fc81', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 11) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('eea08abc-1811-4c3e-91c6-a22f48c1f550', 'eebc72c5-8490-418b-8072-49b1b808fc81', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('70f49a5f-f0fa-4a26-99a0-86ba916d60af', 'eebc72c5-8490-418b-8072-49b1b808fc81', '73155527-14c8-4fff-a5a3-8847cbf901cc', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2132bc31-d05b-407c-b69e-eab795b4fdba', 'eebc72c5-8490-418b-8072-49b1b808fc81', '93da0efc-1f68-4c82-afa8-15b5afd72df7', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('f7b44b42-6029-4d65-b0a5-039bdceb8c12', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '77459bde-2dda-4848-a5c5-22decb273d5e', '4f32d322-afb7-4042-a9d1-ce0c17a09a30', 'submitted', timestamp '2025-08-15 12:00:00' - interval '48 hours' - interval '20 mins', timestamp '2025-08-15 12:00:00' - interval '48 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e7894b7a-282d-4bb9-b88c-1c3805f77a22', 'f7b44b42-6029-4d65-b0a5-039bdceb8c12', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('345e1363-8d50-423f-85a2-45853eec2f0e', 'f7b44b42-6029-4d65-b0a5-039bdceb8c12', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', 35) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4382ffb7-60ae-44a9-b96f-e95a84c5f36a', 'f7b44b42-6029-4d65-b0a5-039bdceb8c12', '73155527-14c8-4fff-a5a3-8847cbf901cc', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('534ac59d-2b85-4c47-9289-3bbbd8da53e7', 'f7b44b42-6029-4d65-b0a5-039bdceb8c12', '93da0efc-1f68-4c82-afa8-15b5afd72df7', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('210d8d6e-6309-40a4-9477-5b24cd8fff41', '10abd4e8-0cb9-4853-a17c-ac40da311bff', 'bfe219aa-e626-4093-acb4-0a8d92229438', 'a71bad63-0a65-47a2-a5a5-623ab35c9ba7', 'submitted', timestamp '2025-08-15 12:00:00' - interval '29 hours' - interval '25 mins', timestamp '2025-08-15 12:00:00' - interval '29 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6edf58bc-0495-40e9-82a6-76a3626b066c', '210d8d6e-6309-40a4-9477-5b24cd8fff41', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8252f0da-80e5-4610-b3c0-2ebc0ee29fa9', '210d8d6e-6309-40a4-9477-5b24cd8fff41', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9fc501b9-c2e7-4586-a5ee-413d4530eeb4', '210d8d6e-6309-40a4-9477-5b24cd8fff41', '73155527-14c8-4fff-a5a3-8847cbf901cc', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a947a6a4-5fa6-4264-94ee-cf1c976cdcbc', '210d8d6e-6309-40a4-9477-5b24cd8fff41', '93da0efc-1f68-4c82-afa8-15b5afd72df7', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('5ecf65c6-47c8-4394-8a87-b08f49bea997', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '667b7df9-720b-44ea-a5c0-47ee35ca31b7', 'a71bad63-0a65-47a2-a5a5-623ab35c9ba7', 'submitted', timestamp '2025-08-15 12:00:00' - interval '68 hours' - interval '41 mins', timestamp '2025-08-15 12:00:00' - interval '68 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('aca5d256-ee47-4e30-be6a-d1b6d62ca156', '5ecf65c6-47c8-4394-8a87-b08f49bea997', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2469f68a-c74d-4e90-98eb-43d1bea3ebba', '5ecf65c6-47c8-4394-8a87-b08f49bea997', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('69d49f63-53be-436c-8018-7989270034b0', '5ecf65c6-47c8-4394-8a87-b08f49bea997', '73155527-14c8-4fff-a5a3-8847cbf901cc', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('942bce28-7d12-4081-87c4-401072a66b5f', '5ecf65c6-47c8-4394-8a87-b08f49bea997', '93da0efc-1f68-4c82-afa8-15b5afd72df7', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('7d0e9e1a-6b51-47fe-b54d-7e0b3d997246', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '77459bde-2dda-4848-a5c5-22decb273d5e', 'a71bad63-0a65-47a2-a5a5-623ab35c9ba7', 'submitted', timestamp '2025-08-15 12:00:00' - interval '44 hours' - interval '26 mins', timestamp '2025-08-15 12:00:00' - interval '44 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('514cc1e7-212b-47b0-b90d-290478a2e091', '7d0e9e1a-6b51-47fe-b54d-7e0b3d997246', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c7b8a983-49ca-45fb-bc6a-77aee7ef6489', '7d0e9e1a-6b51-47fe-b54d-7e0b3d997246', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', 32) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('eb1729d0-35ed-494c-9d98-5106e6b88f11', '7d0e9e1a-6b51-47fe-b54d-7e0b3d997246', '73155527-14c8-4fff-a5a3-8847cbf901cc', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b393dc49-9645-4571-abcc-407ffbaeee2b', '7d0e9e1a-6b51-47fe-b54d-7e0b3d997246', '93da0efc-1f68-4c82-afa8-15b5afd72df7', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('48d5ce3e-f2f6-46d4-a2df-cb6d49b520b3', '10abd4e8-0cb9-4853-a17c-ac40da311bff', 'bfe219aa-e626-4093-acb4-0a8d92229438', '25380419-e8ec-4bae-a9e7-eeded88bba8b', 'submitted', timestamp '2025-08-15 12:00:00' - interval '5 hours' - interval '41 mins', timestamp '2025-08-15 12:00:00' - interval '5 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e81f9ed8-5b4a-4239-8560-dd5a4904011f', '48d5ce3e-f2f6-46d4-a2df-cb6d49b520b3', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6a1fe59f-65f8-41c6-a0a4-17b77cc4567e', '48d5ce3e-f2f6-46d4-a2df-cb6d49b520b3', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7da58430-e390-468b-82b3-d5623b4c9414', '48d5ce3e-f2f6-46d4-a2df-cb6d49b520b3', '73155527-14c8-4fff-a5a3-8847cbf901cc', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ef4181e4-d844-4ef5-9294-31b702621482', '48d5ce3e-f2f6-46d4-a2df-cb6d49b520b3', '93da0efc-1f68-4c82-afa8-15b5afd72df7', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('0d2cc43d-f30e-4d19-a6a0-59f49fb816cf', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '667b7df9-720b-44ea-a5c0-47ee35ca31b7', '25380419-e8ec-4bae-a9e7-eeded88bba8b', 'submitted', timestamp '2025-08-15 12:00:00' - interval '24 hours' - interval '39 mins', timestamp '2025-08-15 12:00:00' - interval '24 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('63408f21-fe8e-4090-ad53-c1a00020b8df', '0d2cc43d-f30e-4d19-a6a0-59f49fb816cf', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('e04cc053-05f9-4ddf-8459-ab458b2e45f1', '0d2cc43d-f30e-4d19-a6a0-59f49fb816cf', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', 31) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('22086a93-eefb-46b9-8e56-ab4616ab01f2', '0d2cc43d-f30e-4d19-a6a0-59f49fb816cf', '73155527-14c8-4fff-a5a3-8847cbf901cc', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a6029258-79a5-4ebb-85dd-926cbe174767', '0d2cc43d-f30e-4d19-a6a0-59f49fb816cf', '93da0efc-1f68-4c82-afa8-15b5afd72df7', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('2c41698e-0d8d-48f7-806d-45de2556a51e', '10abd4e8-0cb9-4853-a17c-ac40da311bff', '77459bde-2dda-4848-a5c5-22decb273d5e', '25380419-e8ec-4bae-a9e7-eeded88bba8b', 'submitted', timestamp '2025-08-15 12:00:00' - interval '44 hours' - interval '30 mins', timestamp '2025-08-15 12:00:00' - interval '44 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('b2af004c-317e-4312-91ec-cafdb3f7aaea', '2c41698e-0d8d-48f7-806d-45de2556a51e', '2d275ae4-9bda-42d7-a98b-0c5c22a7346f', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('29aebe99-b505-4a04-8fb3-388694525ab4', '2c41698e-0d8d-48f7-806d-45de2556a51e', 'b5706a3d-f4c5-46a9-a86c-4b4e3082665c', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('4cc3cab2-4218-41c7-8195-441b3793d289', '2c41698e-0d8d-48f7-806d-45de2556a51e', '73155527-14c8-4fff-a5a3-8847cbf901cc', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8f3e8a10-5859-4219-af5b-d55d66915332', '2c41698e-0d8d-48f7-806d-45de2556a51e', '93da0efc-1f68-4c82-afa8-15b5afd72df7', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('ccb194bc-c53a-43e5-9b5f-677336fbf3ff', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '8b01cc7c-13ab-422f-adc9-8a0a796c8dc4', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', timestamp '2024-08-15 12:00:00' - interval '51 hours' - interval '41 mins', timestamp '2024-08-15 12:00:00' - interval '51 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('ba69fcc6-3059-4669-b280-503148970701', 'ccb194bc-c53a-43e5-9b5f-677336fbf3ff', '70699916-5835-4002-a228-fa884a6cef12', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5098baf4-d785-4769-aa9a-70df7a00d9be', 'ccb194bc-c53a-43e5-9b5f-677336fbf3ff', '542366fd-6437-4188-a080-ccf790202f3b', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('710286fa-2d7d-434a-ab65-605a7636c363', 'ccb194bc-c53a-43e5-9b5f-677336fbf3ff', 'bb8a742e-e337-4eb1-a91a-befa45d4e30e', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('3b37a525-5457-4308-b587-fd6d82a3cb35', 'ccb194bc-c53a-43e5-9b5f-677336fbf3ff', '327d79df-1a6a-4e5e-af2d-ece7cff070bd', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('9680a33a-22f7-42b8-bed8-e7e244931a4b', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '15713af0-a06b-43ac-a10b-867a682f2409', '74499a66-86e7-4d92-ade1-70ba9b770ef0', 'submitted', timestamp '2024-08-15 12:00:00' - interval '70 hours' - interval '21 mins', timestamp '2024-08-15 12:00:00' - interval '70 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('badc7817-1d86-434b-b165-241ecf443ecf', '9680a33a-22f7-42b8-bed8-e7e244931a4b', '70699916-5835-4002-a228-fa884a6cef12', 17) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('50f7bdd3-9a83-479e-b94d-d195a897fa9a', '9680a33a-22f7-42b8-bed8-e7e244931a4b', '542366fd-6437-4188-a080-ccf790202f3b', 29) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('af11dc3f-d796-4470-92e2-88dd8cecf337', '9680a33a-22f7-42b8-bed8-e7e244931a4b', 'bb8a742e-e337-4eb1-a91a-befa45d4e30e', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('6a587989-fd7b-463f-89a2-0feee525bd9a', '9680a33a-22f7-42b8-bed8-e7e244931a4b', '327d79df-1a6a-4e5e-af2d-ece7cff070bd', 12) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('f7f527f0-ab15-4da0-acaa-9ba47e78bd34', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '8b01cc7c-13ab-422f-adc9-8a0a796c8dc4', '4f32d322-afb7-4042-a9d1-ce0c17a09a30', 'submitted', timestamp '2024-08-15 12:00:00' - interval '57 hours' - interval '24 mins', timestamp '2024-08-15 12:00:00' - interval '57 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('665f4ffa-4cd4-4f98-92f3-d0458344763e', 'f7f527f0-ab15-4da0-acaa-9ba47e78bd34', '70699916-5835-4002-a228-fa884a6cef12', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('5db50041-878d-4874-8fb6-b72995be1999', 'f7f527f0-ab15-4da0-acaa-9ba47e78bd34', '542366fd-6437-4188-a080-ccf790202f3b', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('aeddf4a5-3f62-4de3-bd80-1cfebe680644', 'f7f527f0-ab15-4da0-acaa-9ba47e78bd34', 'bb8a742e-e337-4eb1-a91a-befa45d4e30e', 23) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('8a76f84d-e1d4-4bdb-af64-37860dcd05fa', 'f7f527f0-ab15-4da0-acaa-9ba47e78bd34', '327d79df-1a6a-4e5e-af2d-ece7cff070bd', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('556a8be1-eed8-499e-8f80-4c1d73a97356', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '15713af0-a06b-43ac-a10b-867a682f2409', '4f32d322-afb7-4042-a9d1-ce0c17a09a30', 'submitted', timestamp '2024-08-15 12:00:00' - interval '13 hours' - interval '27 mins', timestamp '2024-08-15 12:00:00' - interval '13 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9aac149f-e853-4752-91c2-aae39ad05d10', '556a8be1-eed8-499e-8f80-4c1d73a97356', '70699916-5835-4002-a228-fa884a6cef12', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('de098fb8-f670-4f73-8157-20e7cd7d23c9', '556a8be1-eed8-499e-8f80-4c1d73a97356', '542366fd-6437-4188-a080-ccf790202f3b', 27) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9770e6e1-d472-4845-82f1-8819277821f0', '556a8be1-eed8-499e-8f80-4c1d73a97356', 'bb8a742e-e337-4eb1-a91a-befa45d4e30e', 22) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2634b1b8-67c5-45dd-ad5a-3e12b778d2da', '556a8be1-eed8-499e-8f80-4c1d73a97356', '327d79df-1a6a-4e5e-af2d-ece7cff070bd', 19) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('dc524b47-09bb-4bf5-8608-54f2a1771fa7', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '8b01cc7c-13ab-422f-adc9-8a0a796c8dc4', 'a71bad63-0a65-47a2-a5a5-623ab35c9ba7', 'submitted', timestamp '2024-08-15 12:00:00' - interval '19 hours' - interval '32 mins', timestamp '2024-08-15 12:00:00' - interval '19 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('0c42d936-5c50-44d0-b2e5-f42845de7134', 'dc524b47-09bb-4bf5-8608-54f2a1771fa7', '70699916-5835-4002-a228-fa884a6cef12', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f8d53f49-ed34-4574-b8c2-76eaa92b3af9', 'dc524b47-09bb-4bf5-8608-54f2a1771fa7', '542366fd-6437-4188-a080-ccf790202f3b', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a2e8a195-b1b5-4c1c-9092-fce6066e64c6', 'dc524b47-09bb-4bf5-8608-54f2a1771fa7', 'bb8a742e-e337-4eb1-a91a-befa45d4e30e', 24) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('bca29c5d-21e2-4263-85f0-b10ff29b359b', 'dc524b47-09bb-4bf5-8608-54f2a1771fa7', '327d79df-1a6a-4e5e-af2d-ece7cff070bd', 18) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('3dda0a90-1b90-42d5-850e-8cfddea489be', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '15713af0-a06b-43ac-a10b-867a682f2409', 'a71bad63-0a65-47a2-a5a5-623ab35c9ba7', 'submitted', timestamp '2024-08-15 12:00:00' - interval '25 hours' - interval '31 mins', timestamp '2024-08-15 12:00:00' - interval '25 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('64814ac2-a2ed-4b50-8e3e-2b0680ffe6d9', '3dda0a90-1b90-42d5-850e-8cfddea489be', '70699916-5835-4002-a228-fa884a6cef12', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('39737dc9-33f9-43e4-b922-074ad3b022e4', '3dda0a90-1b90-42d5-850e-8cfddea489be', '542366fd-6437-4188-a080-ccf790202f3b', 28) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('7f395616-7953-4a26-800d-43f1e4babb6c', '3dda0a90-1b90-42d5-850e-8cfddea489be', 'bb8a742e-e337-4eb1-a91a-befa45d4e30e', 15) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('a0c17375-03a2-4cf1-9c52-816abcf551f6', '3dda0a90-1b90-42d5-850e-8cfddea489be', '327d79df-1a6a-4e5e-af2d-ece7cff070bd', 16) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('b0b2cca8-0fc1-4bce-ac01-818f5e708811', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '8b01cc7c-13ab-422f-adc9-8a0a796c8dc4', '25380419-e8ec-4bae-a9e7-eeded88bba8b', 'submitted', timestamp '2024-08-15 12:00:00' - interval '7 hours' - interval '26 mins', timestamp '2024-08-15 12:00:00' - interval '7 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2a22b89c-522c-4456-aa2e-c0a9e5669683', 'b0b2cca8-0fc1-4bce-ac01-818f5e708811', '70699916-5835-4002-a228-fa884a6cef12', 14) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('45e9459f-6946-4ade-b7ba-a7568108f2b4', 'b0b2cca8-0fc1-4bce-ac01-818f5e708811', '542366fd-6437-4188-a080-ccf790202f3b', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('2e0d77dc-c35f-4bad-959a-3f0b3b965670', 'b0b2cca8-0fc1-4bce-ac01-818f5e708811', 'bb8a742e-e337-4eb1-a91a-befa45d4e30e', 25) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('f2ac9e15-c824-4f56-b6dc-63f1a342d7fa', 'b0b2cca8-0fc1-4bce-ac01-818f5e708811', '327d79df-1a6a-4e5e-af2d-ece7cff070bd', 13) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheets (id, period_id, project_id, juror_id, status, started_at, last_activity_at)
    VALUES ('d0fd9b5e-fcdf-4690-bcd7-841067f1528f', '9f49cd18-d850-4b1e-ae53-c08253910f4e', '15713af0-a06b-43ac-a10b-867a682f2409', '25380419-e8ec-4bae-a9e7-eeded88bba8b', 'submitted', timestamp '2024-08-15 12:00:00' - interval '61 hours' - interval '42 mins', timestamp '2024-08-15 12:00:00' - interval '61 hours')
    ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('16834870-5038-4a09-bfbe-1c7136a916cb', 'd0fd9b5e-fcdf-4690-bcd7-841067f1528f', '70699916-5835-4002-a228-fa884a6cef12', 20) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('9d4a3914-c9c1-47de-bb09-41287106f3ad', 'd0fd9b5e-fcdf-4690-bcd7-841067f1528f', '542366fd-6437-4188-a080-ccf790202f3b', 30) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('c9321745-a2ed-41a8-96d0-1de5822679ad', 'd0fd9b5e-fcdf-4690-bcd7-841067f1528f', 'bb8a742e-e337-4eb1-a91a-befa45d4e30e', 21) ON CONFLICT DO NOTHING;
    INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
    VALUES ('aca268ed-a5e4-4f24-a4b6-32bd736f9191', 'd0fd9b5e-fcdf-4690-bcd7-841067f1528f', '327d79df-1a6a-4e5e-af2d-ece7cff070bd', 16) ON CONFLICT DO NOTHING;

