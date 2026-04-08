-- Migration 024: Trim tedu-ee Spring 2026 from 10 → 5 projects
-- Removes projects 6–10 and all their score sheets / items from the demo DB.
-- Period: Spring 2026  (a0d6f60d-ece4-40f8-aca2-955b4abc5d88)
-- Org:    TED University EE (e802a6cb-6cfa-4a7c-aba6-2038490fb899)

-- Score sheet items are deleted via CASCADE on score_sheets.

DELETE FROM score_sheets
WHERE project_id IN (
  'bdb8459f-49ce-405e-af0f-d35e36fcdcf2', -- Reconfigurable Intelligent Surface (#6)
  '1449ba13-0409-4bd3-abc9-ddf7040c5b76', -- Solar MPPT Controller (#7)
  '9faaa31c-cdf6-4678-a123-2bfe194ce989', -- Bioimpedance Spectroscopy (#8)
  '023ddedd-e060-4194-a7c5-8d3d27e6c3f6', -- Visible Light Communication (#9)
  '8fb336c1-ae87-45fc-a587-53fb3052016f'  -- Multi-Robot Coordination (#10)
);

DELETE FROM projects
WHERE id IN (
  'bdb8459f-49ce-405e-af0f-d35e36fcdcf2',
  '1449ba13-0409-4bd3-abc9-ddf7040c5b76',
  '9faaa31c-cdf6-4678-a123-2bfe194ce989',
  '023ddedd-e060-4194-a7c5-8d3d27e6c3f6',
  '8fb336c1-ae87-45fc-a587-53fb3052016f'
);
