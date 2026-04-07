-- Migration 025: Switch TEDU demo flow to Spring 2026
--
-- Why:
-- - demo-tedu-ee entry token must open Spring 2026 (now trimmed to 5 projects).
-- - Spring 2026 must be current and unlocked for jury demo flow.

-- 1) Demote any other current period in TEDU EE org.
UPDATE periods
SET is_current = false,
    updated_at = now()
WHERE organization_id = 'e802a6cb-6cfa-4a7c-aba6-2038490fb899'
  AND id <> 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88'
  AND is_current = true;

-- 2) Ensure TEDU Spring 2026 is active and open.
UPDATE periods
SET is_current = true,
    is_locked = false,
    updated_at = now()
WHERE id = 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88';

-- 3) Point demo-tedu-ee token hash to TEDU Spring 2026.
UPDATE entry_tokens
SET period_id = 'a0d6f60d-ece4-40f8-aca2-955b4abc5d88'
WHERE token_hash = 'b21753a65d3e039d77e6ae4d95258460f73d6ac3859c8c07d1e8cac85764b524';
