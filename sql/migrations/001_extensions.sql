-- VERA v1 — Required PostgreSQL extensions
-- Run first, before any other migrations.

-- Extensions schema: pgcrypto functions (digest, gen_salt, crypt) live here.
-- All SECURITY DEFINER RPCs include "extensions" in their search_path.
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp"  SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto"   SCHEMA extensions;
