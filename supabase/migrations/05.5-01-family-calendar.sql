-- Phase 5.5 Plan 01: family_calendar — one row per family with the school-year
-- boundaries, term mode, weekend days, and selected region preset (D-05, D-06).
-- Family-config table (NOT a money table) — family members may write it
-- directly under family-isolation RLS, mirroring 05.2-01-room-tasks.sql.
-- Idempotent: safe to re-run (CREATE TABLE/INDEX IF NOT EXISTS, DROP+CREATE
-- for policies).

-- ============================================================================
-- TABLE: family_calendar
-- One row per family (UNIQUE family_id). Absent row = legacy defaults
-- (hardcoded sat+sun weekend, no school-year concept) — D-08.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.family_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  year_start DATE,
  year_end DATE,
  term_mode TEXT CHECK (term_mode IN ('quarters', 'trimesters')),
  weekend_days INT[] NOT NULL DEFAULT '{0,6}',
  region_preset TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT family_calendar_family_unique UNIQUE (family_id)
);

CREATE INDEX IF NOT EXISTS family_calendar_family_id_idx ON public.family_calendar(family_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Family-config table (NOT money) — family members may write it directly.
-- Mirrors the family-isolation body from 05.2-01-room-tasks.sql.
-- ============================================================================

ALTER TABLE public.family_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_calendar_select_own_family" ON public.family_calendar;
CREATE POLICY "family_calendar_select_own_family"
  ON public.family_calendar
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "family_calendar_insert_own_family" ON public.family_calendar;
CREATE POLICY "family_calendar_insert_own_family"
  ON public.family_calendar
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "family_calendar_update_own_family" ON public.family_calendar;
CREATE POLICY "family_calendar_update_own_family"
  ON public.family_calendar
  FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "family_calendar_delete_own_family" ON public.family_calendar;
CREATE POLICY "family_calendar_delete_own_family"
  ON public.family_calendar
  FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
