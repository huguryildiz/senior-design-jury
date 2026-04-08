-- 018: Store plain entry token for admin email QR generation
-- The token_hash is used for jury-side verification (security).
-- token_plain is only readable via authenticated admin context,
-- allowing admins to build QR URLs without relying on localStorage.

ALTER TABLE entry_tokens ADD COLUMN IF NOT EXISTS token_plain TEXT;
