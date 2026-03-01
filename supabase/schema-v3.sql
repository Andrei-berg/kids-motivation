-- =============================================================================
-- schema-v3.sql — New identity tables and auth trigger for multi-tenant architecture
-- =============================================================================
-- Execution order: Run this file FIRST. Then seed-migration.sql. Then rls.sql.
-- =============================================================================
-- This file creates three new tables (user_profiles, families, family_members)
-- and an auth trigger that auto-creates user_profiles on every new signup.
-- It does NOT modify existing tables — that is handled by seed-migration.sql.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. user_profiles — one row per auth user, auto-created by trigger on signup
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url   TEXT,
  timezone     TEXT DEFAULT 'UTC',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- 2. families — one row per family (the top-level multi-tenant unit)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast invite-code lookups (used during join-family flow)
CREATE INDEX IF NOT EXISTS idx_families_invite_code ON families(invite_code);


-- ---------------------------------------------------------------------------
-- 3. family_members — links auth users to families with roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.family_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('parent', 'child', 'extended')),
  display_name TEXT,
  avatar_url   TEXT,
  birth_year   INT,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Indexes for fast RLS policy lookups
CREATE INDEX IF NOT EXISTS idx_family_members_user_id   ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);


-- ---------------------------------------------------------------------------
-- 4. Auth trigger — fires after every new auth.users insert
--    Auto-creates user_profiles row so every user always has a profile.
--    SECURITY DEFINER + empty search_path: prevents search_path injection.
--    EXCEPTION block: prevents trigger errors from blocking signup.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'User'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;  -- Never block signup even if profile creation fails
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
