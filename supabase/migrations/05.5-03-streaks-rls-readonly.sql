-- Phase 5.5 Plan 01: lock the streaks table to SELECT-only for clients (CR-01 D-12.3).
-- This closes the same "child edits streaks via DevTools" hole that 04.4-03
-- closed for the money tables, mirroring its SELECT-only lock pattern.
--
-- MUST be applied AFTER the server-side updateStreaks code (plan 05.5-02) is
-- deployed — until then, streaks is still written via the anon/cookie client
-- and applying this migration first would break streak updates in production.
-- (Same deploy-order caveat as 04.4-03's own header note.)
--
-- Effect: authenticated family members may READ their family's streaks rows,
-- but INSERT/UPDATE/DELETE are no longer granted to them (no write policy =
-- deny). All writes must go through the service-role updateStreaks path,
-- which bypasses RLS entirely.
--
-- Idempotent: safe to re-run. Drops all existing policies on streaks and
-- installs a single SELECT policy. streaks.family_id is confirmed present
-- (see fix-family-id-and-streaks.sql, which backfills and auto-fills it).

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'streaks' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.streaks;', p);
  END LOOP;
END $$;

CREATE POLICY "streaks_select_own_family" ON public.streaks
  FOR SELECT TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = (SELECT auth.uid())
    )
  );

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
