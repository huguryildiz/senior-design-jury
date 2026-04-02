-- ============================================================
-- VERA — Demo DB Teardown
-- Drops all tables, functions, and triggers in the public schema.
-- Safe to run on Supabase — does NOT touch auth.* or storage.*
-- Run this BEFORE applying fresh migrations.
-- ============================================================

-- Drop all tables (CASCADE handles foreign key order automatically)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- Drop all functions and procedures
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT pg_proc.oid, pg_proc.oid::regprocedure AS full_sig,
           pg_proc.prokind
    FROM pg_proc
    JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
    WHERE pg_namespace.nspname = 'public'
  ) LOOP
    IF r.prokind = 'p' THEN
      EXECUTE 'DROP PROCEDURE IF EXISTS ' || r.full_sig || ' CASCADE';
    ELSE
      EXECUTE 'DROP FUNCTION IF EXISTS ' || r.full_sig || ' CASCADE';
    END IF;
  END LOOP;
END $$;

-- Drop all sequences not owned by a table (cleanup)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  ) LOOP
    EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
  END LOOP;
END $$;

-- Drop all custom types (enums etc.)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT typname
    FROM pg_type
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE pg_namespace.nspname = 'public'
      AND pg_type.typtype = 'e'  -- enums only
  ) LOOP
    EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
  END LOOP;
END $$;
