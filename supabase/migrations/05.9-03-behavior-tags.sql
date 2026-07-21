-- Phase 5.9 Plan 01: behavior_tags / behavior_marks — family-configurable behavior
-- tag set with a propose/approve flow. Structural clone of
-- supabase/migrations/05.2-01-room-tasks.sql (room_tasks/room_checks), adapted per
-- .planning/phases/05.9-rules-presets/05.9-CONTEXT.md decisions D-09/D-10/D-12 and
-- 05.9-RESEARCH.md's Security Domain / Pattern 3.
--
-- Deltas from the room_tasks/room_checks analog:
--  1. behavior_tags.price is a SIGNED INTEGER (positive or negative, per D-10) — unlike
--     room_tasks, which has no price column at all.
--  2. behavior_marks replaces room_checks' bare `done BOOLEAN` with a propose/approve
--     `status` column (D-12) plus proposed_by/decided_by/decided_at, mirroring the
--     reward_purchases request-approve-credit pattern.
--  3. DELIBERATE DIVERGENCE (resolved Open Question 2): behavior_marks has NO
--     same-tag-per-day uniqueness constraint (unlike room_checks'
--     room_checks_child_date_task_unique, a UNIQUE(child_id, date, task_id) index).
--     Behavior marks are event-like/repeatable —
--     the same tag may legitimately apply more than once in a single day (e.g. "Helped
--     a sibling" twice). Each mark is therefore its own row with its own id, which
--     becomes its own idempotency slot in creditAwards (keyed on
--     (child_id, source_type, source_id) — the mark's id, not the day's id).
--  4. RLS deviation (resolved threat T-059-03): the behavior_marks INSERT policy adds a
--     `WITH CHECK (... AND status = 'pending')` clause beyond straight family-isolation,
--     so a non-service-role insert (i.e. any authenticated client, including a child)
--     can only ever create a PENDING mark. It can never self-approve. The service-role
--     client (used by the approval action, plan 07) bypasses RLS entirely, so the
--     parent-approval status transition is unaffected by this constraint.
--
-- Additive only. Idempotent: safe to re-run (CREATE TABLE/INDEX IF NOT EXISTS,
-- DROP+CREATE for policies/trigger, ON CONFLICT DO NOTHING for the seed).

-- ============================================================================
-- TABLE: behavior_tags
-- Per-family behavior tag definition. legacy_key maps the single seeded default
-- ('good_behavior') back to the existing days.good_behavior boolean for the
-- dual-write/fallback era. Custom tags have legacy_key NULL.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.behavior_tags (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID        NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  icon        TEXT,
  price       INTEGER     NOT NULL,
  legacy_key  TEXT,
  sort_order  INT         NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT behavior_tags_legacy_key_check CHECK (
    legacy_key IS NULL OR legacy_key = 'good_behavior'
  )
);

CREATE INDEX IF NOT EXISTS behavior_tags_family_id_idx ON public.behavior_tags(family_id);

-- One 'good_behavior' per family (custom tags with NULL legacy_key are unconstrained
-- by this index).
CREATE UNIQUE INDEX IF NOT EXISTS behavior_tags_family_legacy_key_idx
  ON public.behavior_tags (family_id, legacy_key)
  WHERE legacy_key IS NOT NULL;

-- ============================================================================
-- TABLE: behavior_marks
-- Per child+date instance of a behavior_tags row. Unlike room_checks, this is
-- event-like/repeatable (no same-tag-per-day uniqueness — see deviation #3 above)
-- and carries a propose/approve status instead of a bare boolean.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.behavior_marks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    TEXT        NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  family_id   UUID        NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  tag_id      UUID        NOT NULL REFERENCES public.behavior_tags(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  proposed_by TEXT,
  decided_by  TEXT,
  decided_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS behavior_marks_child_id_date_idx ON public.behavior_marks (child_id, date);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Family-config / day-data tables (NOT money tables) — family members may write
-- them directly. Mirrors the family-isolation body from 04.4-01 / 05.2-01.
-- ============================================================================

ALTER TABLE public.behavior_tags  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_marks ENABLE ROW LEVEL SECURITY;

-- behavior_tags policies

DROP POLICY IF EXISTS "behavior_tags_select_own_family" ON public.behavior_tags;
CREATE POLICY "behavior_tags_select_own_family"
  ON public.behavior_tags
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "behavior_tags_insert_own_family" ON public.behavior_tags;
CREATE POLICY "behavior_tags_insert_own_family"
  ON public.behavior_tags
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "behavior_tags_update_own_family" ON public.behavior_tags;
CREATE POLICY "behavior_tags_update_own_family"
  ON public.behavior_tags
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

DROP POLICY IF EXISTS "behavior_tags_delete_own_family" ON public.behavior_tags;
CREATE POLICY "behavior_tags_delete_own_family"
  ON public.behavior_tags
  FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- behavior_marks policies

DROP POLICY IF EXISTS "behavior_marks_select_own_family" ON public.behavior_marks;
CREATE POLICY "behavior_marks_select_own_family"
  ON public.behavior_marks
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- T-059-03: a non-service-role insert (any authenticated client, including a child)
-- can only ever create a PENDING mark. This is the actual security boundary — not
-- app-layer discipline. The service-role client used by the approval action bypasses
-- RLS entirely, so the parent-approval status transition is unaffected.
DROP POLICY IF EXISTS "behavior_marks_insert_own_family" ON public.behavior_marks;
CREATE POLICY "behavior_marks_insert_own_family"
  ON public.behavior_marks
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "behavior_marks_update_own_family" ON public.behavior_marks;
CREATE POLICY "behavior_marks_update_own_family"
  ON public.behavior_marks
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

DROP POLICY IF EXISTS "behavior_marks_delete_own_family" ON public.behavior_marks;
CREATE POLICY "behavior_marks_delete_own_family"
  ON public.behavior_marks
  FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTION: seed_default_behavior_tags(p_family_id UUID)
-- Inserts the single default "Good behavior" tag for a family (existing or new).
-- Idempotent via ON CONFLICT on the partial unique index (family_id, legacy_key).
-- Mirrors seed_default_room_tasks (05.2-01-room-tasks.sql).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.seed_default_behavior_tags(p_family_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.behavior_tags (family_id, name, icon, price, legacy_key, sort_order, is_active)
  VALUES
    (p_family_id, 'Good behavior', '😊', 5, 'good_behavior', 0, true)
  ON CONFLICT (family_id, legacy_key) WHERE legacy_key IS NOT NULL DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_behavior_tags(UUID) TO authenticated;

-- ============================================================================
-- BACKFILL: seed the default for every EXISTING family.
-- Idempotent — safe to re-run (seed_default_behavior_tags itself is idempotent).
-- ============================================================================

SELECT public.seed_default_behavior_tags(id) FROM public.families;

-- ============================================================================
-- LEGACY-DELETE GUARD
-- A legacy-mapped behavior_tags row (legacy_key NOT NULL) can only be deactivated
-- (is_active = false), never hard-deleted — dual-write / analytics depend on the
-- stable legacy_key mapping. Custom tags (legacy_key NULL) delete freely.
-- ============================================================================

-- Only blocks a DIRECT delete on behavior_tags. Inside the currently-executing
-- BEFORE DELETE trigger, pg_trigger_depth() is already 1 for a direct delete
-- statement; a cascade delete originating from a parent FK (e.g. deleting the whole
-- family/child for COPPA account deletion) nests this trigger one level deeper inside
-- the FK's internal RI cascade trigger (depth >= 2) and must be allowed through, or
-- family/child deletion would be permanently blocked whenever a legacy tag exists.
CREATE OR REPLACE FUNCTION public.behavior_tags_block_legacy_delete_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.legacy_key IS NOT NULL AND pg_trigger_depth() <= 1 THEN
    RAISE EXCEPTION 'legacy behavior tag cannot be deleted; deactivate instead';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS behavior_tags_block_legacy_delete ON public.behavior_tags;
CREATE TRIGGER behavior_tags_block_legacy_delete
  BEFORE DELETE ON public.behavior_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.behavior_tags_block_legacy_delete_fn();
