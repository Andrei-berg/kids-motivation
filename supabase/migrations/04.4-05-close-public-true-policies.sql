-- Migration 04.4-05: close the remaining `public USING true` RLS policies.
--
-- 04.4-04 dropped the *_anon_all policies, but 7 more tables carried
-- "Public ..." / "*_all" policies for the `public` role (which INCLUDES anon)
-- with USING true / WITH CHECK true — same hole: anyone with the public anon key
-- could read/write every family's reading logs, activity logs, extra
-- activities/lessons, monthly potential, vacation periods, and even write the
-- wallet audit log, without authenticating.
--
-- These tables had NO authenticated policy, so we must replace the open policy
-- with a proper family-isolation policy (not just drop it, or authenticated
-- access would break too). Tables without family_id are scoped via child_id →
-- children → family.
--
-- Idempotent. Applied to prod via SUPABASE_DB_URL.

-- Helper expressions:
--   myFamilies = SELECT family_id FROM family_members WHERE user_id = auth.uid()
--   myChildren = SELECT id FROM children WHERE family_id IN (myFamilies)

DO $$
DECLARE
  r record;
  child_tables text[] := ARRAY[
    'activity_logs','extra_lessons','monthly_potential','reading_log','wallet_audit_log'
  ];
  family_tables text[] := ARRAY['vacation_periods'];
  t text;
BEGIN
  -- 1. Drop every public-role policy on the affected tables.
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND 'public' = ANY(roles)
      AND tablename = ANY(child_tables || family_tables || ARRAY['extra_activities'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', r.policyname, r.tablename);
  END LOOP;

  -- 2. child_id-scoped tables (no family_id column).
  FOREACH t IN ARRAY child_tables LOOP
    EXECUTE format($f$
      CREATE POLICY %1$I ON public.%2$I
        FOR ALL TO authenticated
        USING (child_id IN (SELECT id FROM children WHERE family_id IN (
          SELECT family_id FROM family_members WHERE user_id = (SELECT auth.uid()))))
        WITH CHECK (child_id IN (SELECT id FROM children WHERE family_id IN (
          SELECT family_id FROM family_members WHERE user_id = (SELECT auth.uid()))))
    $f$, t || '_family_isolation', t);
  END LOOP;

  -- 3. family_id-scoped tables. Cast to text: some legacy tables store family_id
  --    as TEXT while family_members.family_id is UUID.
  FOREACH t IN ARRAY family_tables LOOP
    EXECUTE format($f$
      CREATE POLICY %1$I ON public.%2$I
        FOR ALL TO authenticated
        USING (family_id::text IN (SELECT family_id::text FROM family_members WHERE user_id = (SELECT auth.uid())))
        WITH CHECK (family_id::text IN (SELECT family_id::text FROM family_members WHERE user_id = (SELECT auth.uid())))
    $f$, t || '_family_isolation', t);
  END LOOP;

  -- 4. extra_activities has BOTH family_id and child_id (family-wide or
  --    per-child rows) — allow either match.
  EXECUTE $f$
    CREATE POLICY extra_activities_family_isolation ON public.extra_activities
      FOR ALL TO authenticated
      USING (
        family_id::text IN (SELECT family_id::text FROM family_members WHERE user_id = (SELECT auth.uid()))
        OR child_id IN (SELECT id FROM children WHERE family_id IN (
          SELECT family_id FROM family_members WHERE user_id = (SELECT auth.uid())))
      )
      WITH CHECK (
        family_id::text IN (SELECT family_id::text FROM family_members WHERE user_id = (SELECT auth.uid()))
        OR child_id IN (SELECT id FROM children WHERE family_id IN (
          SELECT family_id FROM family_members WHERE user_id = (SELECT auth.uid())))
      )
  $f$;
END $$;
