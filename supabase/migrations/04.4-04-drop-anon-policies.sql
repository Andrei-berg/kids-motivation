-- Migration 04.4-04: remove anonymous full-access RLS policies (CRITICAL)
--
-- 23 tables carried a "<table>_anon_all" policy granting the `anon` role full
-- read/write (USING true / WITH CHECK true). Because the anon key is public
-- (shipped in the browser bundle as NEXT_PUBLIC_SUPABASE_ANON_KEY), anyone could
-- read and modify EVERY family's data without authenticating. These policies are
-- not needed: the only pre-login data access (kid login profile picker) goes
-- through SECURITY DEFINER RPCs (lookup_family_by_invite_code, get_family_children)
-- which bypass RLS; all real access happens after login under the `authenticated`
-- role, where the *_family_isolation policies apply.
--
-- This drops every policy named like '%_anon_all' in the public schema.
-- Idempotent. Run in SQL Editor or via SUPABASE_DB_URL.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND policyname LIKE '%\_anon\_all'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', r.policyname, r.tablename);
  END LOOP;
END $$;
