-- Phase 5.5 review fix WR-01: restrict family_calendar (and vacation_periods)
-- WRITES to parent/extended members. Since 05.5-02 these tables feed the
-- SERVER-SIDE streak computation (updateStreaks loads them via the admin
-- client), so a PIN-child rewriting weekend_days/year bounds or vacation
-- periods via DevTools/REST could tamper with streak transparency — and,
-- after the CR-02/CR-03 anchored-run fix, freeze a qualifying streak
-- indefinitely to collect the streak bonus daily. Reads stay family-wide
-- (kid UI needs day-type resolution); writes mirror the wallet-settings
-- parent-only pattern.
-- Idempotent: safe to re-run (DROP POLICY IF EXISTS + CREATE).

-- ============================================================================
-- family_calendar: keep family-wide SELECT (from 05.5-01), replace the
-- INSERT/UPDATE/DELETE policies with parent/extended-only versions.
-- ============================================================================

DROP POLICY IF EXISTS "family_calendar_insert_own_family" ON public.family_calendar;
CREATE POLICY "family_calendar_insert_own_family"
  ON public.family_calendar
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid() AND role IN ('parent', 'extended')
    )
  );

DROP POLICY IF EXISTS "family_calendar_update_own_family" ON public.family_calendar;
CREATE POLICY "family_calendar_update_own_family"
  ON public.family_calendar
  FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid() AND role IN ('parent', 'extended')
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid() AND role IN ('parent', 'extended')
    )
  );

DROP POLICY IF EXISTS "family_calendar_delete_own_family" ON public.family_calendar;
CREATE POLICY "family_calendar_delete_own_family"
  ON public.family_calendar
  FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid() AND role IN ('parent', 'extended')
    )
  );

-- ============================================================================
-- vacation_periods: currently covered by a single FOR ALL
-- vacation_periods_family_isolation policy (04.4-05). Split it: family-wide
-- SELECT, parent/extended-only writes. family_id is cast to text on both
-- sides because legacy rows may store family_id as TEXT (see 04.4-05).
-- ============================================================================

DROP POLICY IF EXISTS "vacation_periods_family_isolation" ON public.vacation_periods;

DROP POLICY IF EXISTS "vacation_periods_select_own_family" ON public.vacation_periods;
CREATE POLICY "vacation_periods_select_own_family"
  ON public.vacation_periods
  FOR SELECT TO authenticated
  USING (
    family_id::text IN (
      SELECT family_id::text FROM public.family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "vacation_periods_insert_parent_only" ON public.vacation_periods;
CREATE POLICY "vacation_periods_insert_parent_only"
  ON public.vacation_periods
  FOR INSERT TO authenticated
  WITH CHECK (
    family_id::text IN (
      SELECT family_id::text FROM public.family_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('parent', 'extended')
    )
  );

DROP POLICY IF EXISTS "vacation_periods_update_parent_only" ON public.vacation_periods;
CREATE POLICY "vacation_periods_update_parent_only"
  ON public.vacation_periods
  FOR UPDATE TO authenticated
  USING (
    family_id::text IN (
      SELECT family_id::text FROM public.family_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('parent', 'extended')
    )
  )
  WITH CHECK (
    family_id::text IN (
      SELECT family_id::text FROM public.family_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('parent', 'extended')
    )
  );

DROP POLICY IF EXISTS "vacation_periods_delete_parent_only" ON public.vacation_periods;
CREATE POLICY "vacation_periods_delete_parent_only"
  ON public.vacation_periods
  FOR DELETE TO authenticated
  USING (
    family_id::text IN (
      SELECT family_id::text FROM public.family_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('parent', 'extended')
    )
  );

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
