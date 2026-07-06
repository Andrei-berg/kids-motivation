-- Phase 5.2 Plan 01: room_tasks / room_checks — family-configurable room checklist.
-- Additive only. Does NOT touch public.days, room_score_trigger, or update_room_score.
-- Idempotent: safe to re-run (CREATE TABLE/INDEX IF NOT EXISTS, DROP+CREATE for
-- policies/trigger, ON CONFLICT DO NOTHING for the seed).

-- ============================================================================
-- TABLE: room_tasks
-- Per-family checklist definition. legacy_key maps the 5 seeded defaults back
-- to the existing days.room_bed/room_floor/room_desk/room_closet/room_trash
-- columns for the dual-write era (Plan 02+). Custom tasks have legacy_key NULL.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.room_tasks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID        NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  icon        TEXT,
  legacy_key  TEXT,
  sort_order  INT         NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT room_tasks_legacy_key_check CHECK (
    legacy_key IS NULL OR legacy_key IN ('bed', 'floor', 'desk', 'closet', 'trash')
  )
);

CREATE INDEX IF NOT EXISTS room_tasks_family_id_idx ON public.room_tasks(family_id);

-- One bed/floor/desk/closet/trash per family (custom tasks with NULL legacy_key
-- are unconstrained by this index).
CREATE UNIQUE INDEX IF NOT EXISTS room_tasks_family_legacy_key_idx
  ON public.room_tasks (family_id, legacy_key)
  WHERE legacy_key IS NOT NULL;

-- ============================================================================
-- TABLE: room_checks
-- Per child+date completion of a room_task. One row per checked task per day.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.room_checks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    TEXT        NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  family_id   UUID        NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  task_id     UUID        NOT NULL REFERENCES public.room_tasks(id) ON DELETE CASCADE,
  done        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT room_checks_child_date_task_unique UNIQUE (child_id, date, task_id)
);

CREATE INDEX IF NOT EXISTS room_checks_child_date_idx ON public.room_checks (child_id, date);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Family-config / day-data tables (NOT money tables) — family members may
-- write them directly. Mirrors the family-isolation body from 04.4-01.
-- ============================================================================

ALTER TABLE public.room_tasks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_checks ENABLE ROW LEVEL SECURITY;

-- room_tasks policies

DROP POLICY IF EXISTS "room_tasks_select_own_family" ON public.room_tasks;
CREATE POLICY "room_tasks_select_own_family"
  ON public.room_tasks
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "room_tasks_insert_own_family" ON public.room_tasks;
CREATE POLICY "room_tasks_insert_own_family"
  ON public.room_tasks
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "room_tasks_update_own_family" ON public.room_tasks;
CREATE POLICY "room_tasks_update_own_family"
  ON public.room_tasks
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

DROP POLICY IF EXISTS "room_tasks_delete_own_family" ON public.room_tasks;
CREATE POLICY "room_tasks_delete_own_family"
  ON public.room_tasks
  FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- room_checks policies

DROP POLICY IF EXISTS "room_checks_select_own_family" ON public.room_checks;
CREATE POLICY "room_checks_select_own_family"
  ON public.room_checks
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "room_checks_insert_own_family" ON public.room_checks;
CREATE POLICY "room_checks_insert_own_family"
  ON public.room_checks
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "room_checks_update_own_family" ON public.room_checks;
CREATE POLICY "room_checks_update_own_family"
  ON public.room_checks
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

DROP POLICY IF EXISTS "room_checks_delete_own_family" ON public.room_checks;
CREATE POLICY "room_checks_delete_own_family"
  ON public.room_checks
  FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTION: seed_default_room_tasks(p_family_id UUID)
-- Inserts the 5 default room checklist tasks for a family (existing or new).
-- Idempotent via ON CONFLICT on the partial unique index (family_id, legacy_key).
-- Mirrors seed_default_categories (01.3-categories-schedule.sql).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.seed_default_room_tasks(p_family_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.room_tasks (family_id, name, icon, legacy_key, sort_order, is_active)
  VALUES
    (p_family_id, 'Кровать', '🛏️', 'bed',    0, true),
    (p_family_id, 'Пол',     '🧹', 'floor',  1, true),
    (p_family_id, 'Стол',    '🪑', 'desk',   2, true),
    (p_family_id, 'Шкаф',    '🚪', 'closet', 3, true),
    (p_family_id, 'Мусор',   '🗑️', 'trash',  4, true)
  ON CONFLICT (family_id, legacy_key) WHERE legacy_key IS NOT NULL DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_room_tasks(UUID) TO authenticated;

-- ============================================================================
-- BACKFILL: seed the 5 defaults for every EXISTING family.
-- Idempotent — safe to re-run (seed_default_room_tasks itself is idempotent).
-- ============================================================================

SELECT public.seed_default_room_tasks(id) FROM public.families;

-- ============================================================================
-- LEGACY-DELETE GUARD
-- A legacy-mapped room_task (legacy_key NOT NULL) can only be deactivated
-- (is_active = false), never hard-deleted — dual-write / analytics depend on
-- the stable legacy_key mapping. Custom tasks (legacy_key NULL) delete freely.
-- ============================================================================

-- Only blocks a DIRECT delete on room_tasks. Inside the currently-executing
-- BEFORE DELETE trigger, pg_trigger_depth() is already 1 for a direct delete
-- statement; a cascade delete originating from a parent FK (e.g. deleting the
-- whole family/child for COPPA account deletion) nests this trigger one level
-- deeper inside the FK's internal RI cascade trigger (depth >= 2) and must be
-- allowed through, or family/child deletion would be permanently blocked
-- whenever a legacy task exists.
CREATE OR REPLACE FUNCTION public.room_tasks_block_legacy_delete_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.legacy_key IS NOT NULL AND pg_trigger_depth() <= 1 THEN
    RAISE EXCEPTION 'legacy room task cannot be deleted; deactivate instead';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS room_tasks_block_legacy_delete ON public.room_tasks;
CREATE TRIGGER room_tasks_block_legacy_delete
  BEFORE DELETE ON public.room_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.room_tasks_block_legacy_delete_fn();
