-- Phase 5.6 Plan 01: day_blocks / day_block_entries — the config model that
-- de-hardcodes a child's day into data (built-in specializations + first-class
-- custom blocks, incl. the 3 seeded "previously-free" activities from D-03).
-- Additive only. Does NOT touch public.days, wallet_settings, or the existing
-- award route (that's Plan 03) — this plan only lays the schema + seed + repo.
-- Idempotent: safe to re-run (CREATE TABLE/INDEX IF NOT EXISTS, DROP+CREATE
-- for policies/trigger, ON CONFLICT DO NOTHING for the seed).

-- ============================================================================
-- TABLE: day_blocks
-- Per-family (or per-child override, reserved for Phase 5.8/D-04) config row
-- describing one block of a child's day: a built-in specialization
-- (legacy_key NOT NULL, one of the 7 hardcoded sources) or a first-class
-- custom block (legacy_key NULL — either user-created or one of the 3 seeded
-- "previously-free" defaults identified by seed_key).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.day_blocks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID        NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  -- NULL = family-wide default row; non-null = per-child override (D-04, reserved for Phase 5.8).
  child_id     TEXT        NULL REFERENCES public.children(id) ON DELETE CASCADE,
  -- One of the 7 built-in keys, NULL for custom blocks.
  legacy_key   TEXT        NULL,
  -- Stable identifier for the 3 auto-seeded "previously-free" custom default
  -- blocks so their seed is idempotent. NULL for built-ins and user-created
  -- custom blocks.
  seed_key     TEXT        NULL,
  name         TEXT        NOT NULL,
  icon         TEXT,
  -- NULL = fall back to wallet_settings per D-04.
  price        INT         NULL,
  -- Empty = all day types, else subset of school/weekend/vacation/sick plus
  -- the 'always' sentinel, matching getActivitiesForDay's convention.
  day_types    TEXT[]      NOT NULL DEFAULT '{}',
  -- 0=Mon..6=Sun, empty = every day; drives schedule-day visibility (D-08).
  days_of_week INT[]       NOT NULL DEFAULT '{}',
  -- RESERVED for Phase 5.8 Day Constructor; NOT read in 5.6. Do not treat as functional.
  schedule_link TEXT       NULL,
  who_fills    TEXT        NOT NULL DEFAULT 'both',
  -- Day-type -> multiplier map (D-05), e.g. {"vacation": 2, "weekend": 1.5}.
  -- Missing key means x1.
  multipliers  JSONB       NOT NULL DEFAULT '{}',
  sort_order   INT         NOT NULL DEFAULT 0,
  -- The SC1 enabled flag.
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT day_blocks_legacy_key_check CHECK (
    legacy_key IS NULL OR legacy_key IN ('room', 'behavior', 'grade', 'sport', 'activity', 'book', 'exercise')
  ),
  CONSTRAINT day_blocks_who_fills_check CHECK (
    who_fills IN ('kid', 'parent', 'both')
  )
);

CREATE INDEX IF NOT EXISTS day_blocks_family_id_idx ON public.day_blocks(family_id);

-- CRITICAL — the default-row uniqueness must be scoped to child_id IS NULL and
-- must NOT carry the nullable child_id in the key. seed_default_day_blocks only
-- ever inserts family-DEFAULT rows (child_id NULL); Postgres treats NULL != NULL
-- in a unique index (no NULLS NOT DISTINCT), so any key that includes a NULL
-- child_id never matches ON CONFLICT and the seed would insert more built-ins
-- + custom rows on every re-invocation.

-- One built-in DEFAULT row per family (custom blocks with NULL legacy_key are
-- unconstrained by this index).
CREATE UNIQUE INDEX IF NOT EXISTS day_blocks_family_legacy_key_default_idx
  ON public.day_blocks (family_id, legacy_key)
  WHERE legacy_key IS NOT NULL AND child_id IS NULL;

-- Idempotent seeding of the 3 built-in custom "previously-free" defaults.
CREATE UNIQUE INDEX IF NOT EXISTS day_blocks_family_seed_key_default_idx
  ON public.day_blocks (family_id, seed_key)
  WHERE seed_key IS NOT NULL AND child_id IS NULL;

-- Separate partial unique index reserved for future per-child OVERRIDE rows so
-- the two never overlap (Phase 5.8 per-child pricing per D-04); default rows
-- are excluded by its child_id IS NOT NULL predicate. Do NOT create a legacy
-- (family_id, child_id, legacy_key)/(family_id, child_id, seed_key) index on
-- the default seed path — that was the bug.
CREATE UNIQUE INDEX IF NOT EXISTS day_blocks_family_child_legacy_key_override_idx
  ON public.day_blocks (family_id, child_id, legacy_key)
  WHERE legacy_key IS NOT NULL AND child_id IS NOT NULL;

-- ============================================================================
-- TABLE: day_block_entries (mirror room_checks)
-- Per child+date completion of a custom day_block. One row per checked block
-- per day, feeding the award path (D-02, D-03, D-09).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.day_block_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    TEXT        NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  family_id   UUID        NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  block_id    UUID        NOT NULL REFERENCES public.day_blocks(id) ON DELETE CASCADE,
  done        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT day_block_entries_child_date_block_unique UNIQUE (child_id, date, block_id)
);

CREATE INDEX IF NOT EXISTS day_block_entries_child_date_idx ON public.day_block_entries (child_id, date);

-- ============================================================================
-- FEATURE FLAG
-- Default false preserves D-07/D-09 flag-off-by-default byte-parity for every
-- existing family; mirrors the children.require_reading_check per-row boolean
-- precedent.
-- ============================================================================

ALTER TABLE public.families ADD COLUMN IF NOT EXISTS day_blocks_enabled BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.day_blocks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_block_entries ENABLE ROW LEVEL SECURITY;

-- day_blocks (CONFIG table): SELECT stays family-wide (children need to read
-- block config to render their day); INSERT/UPDATE/DELETE are parent/extended
-- -only (block config feeds money, so config writes are parent/extended-only
-- from day one per PATTERNS "parent-only writes on money-adjacent config
-- tables"), mirroring 05.5-04-calendar-writes-parent-only.sql.

DROP POLICY IF EXISTS "day_blocks_select_own_family" ON public.day_blocks;
CREATE POLICY "day_blocks_select_own_family"
  ON public.day_blocks
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "day_blocks_insert_own_family" ON public.day_blocks;
CREATE POLICY "day_blocks_insert_own_family"
  ON public.day_blocks
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid() AND role IN ('parent', 'extended')
    )
  );

DROP POLICY IF EXISTS "day_blocks_update_own_family" ON public.day_blocks;
CREATE POLICY "day_blocks_update_own_family"
  ON public.day_blocks
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

DROP POLICY IF EXISTS "day_blocks_delete_own_family" ON public.day_blocks;
CREATE POLICY "day_blocks_delete_own_family"
  ON public.day_blocks
  FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid() AND role IN ('parent', 'extended')
    )
  );

-- day_block_entries (per-day COMPLETION table): family-wide writes, NO role
-- clause — byte-copy of the room_checks policy bodies from 05.2-01. This lets
-- a kid record their own completions from the kid day form (D-06 both forms
-- fill; D-02 kid-fillable custom blocks). who_fills is NOT an RLS boundary
-- here — it is enforced in the UI (Plan 04, kid form greys parent-only
-- blocks) and authoritatively in the award route (Plan 03, which skips
-- who_fills='parent' blocks for a child caller).

DROP POLICY IF EXISTS "day_block_entries_select_own_family" ON public.day_block_entries;
CREATE POLICY "day_block_entries_select_own_family"
  ON public.day_block_entries
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "day_block_entries_insert_own_family" ON public.day_block_entries;
CREATE POLICY "day_block_entries_insert_own_family"
  ON public.day_block_entries
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "day_block_entries_update_own_family" ON public.day_block_entries;
CREATE POLICY "day_block_entries_update_own_family"
  ON public.day_block_entries
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

DROP POLICY IF EXISTS "day_block_entries_delete_own_family" ON public.day_block_entries;
CREATE POLICY "day_block_entries_delete_own_family"
  ON public.day_block_entries
  FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTION: seed_default_day_blocks(p_family_id UUID)
-- Inserts the 7 built-in family-default blocks + the 3 seeded "previously-free"
-- custom defaults for a family (existing or new). Idempotent via ON CONFLICT
-- on the partial unique indexes (both scoped to child_id IS NULL default rows).
-- Mirrors seed_default_room_tasks (05.2-01-room-tasks.sql).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.seed_default_day_blocks(p_family_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- (1) The 7 built-in family-default rows (child_id NULL, price NULL, seed_key NULL).
  INSERT INTO public.day_blocks (family_id, legacy_key, seed_key, name, icon, price, day_types, sort_order, who_fills, is_active)
  VALUES
    (p_family_id, 'room',     NULL, 'Комната',   '🏠', NULL, '{}',       0, 'both', true),
    (p_family_id, 'behavior', NULL, 'Поведение', '😊', NULL, '{}',       1, 'both', true),
    (p_family_id, 'grade',    NULL, 'Оценки',    '📚', NULL, '{school}', 2, 'both', true),
    (p_family_id, 'sport',    NULL, 'Спорт',     '💪', NULL, '{}',       3, 'both', true),
    (p_family_id, 'activity', NULL, 'Активности','⭐', NULL, '{}',       4, 'both', true),
    (p_family_id, 'book',     NULL, 'Чтение',    '📖', NULL, '{}',       5, 'both', true),
    (p_family_id, 'exercise', NULL, 'Зарядка',   '✏️', NULL, '{school}', 6, 'both', true)
  ON CONFLICT (family_id, legacy_key) WHERE legacy_key IS NOT NULL AND child_id IS NULL DO NOTHING;

  -- (2) The 3 seeded "previously-free" CUSTOM defaults (legacy_key NULL,
  -- seed_key set, explicit modest default price the server actually credits)
  -- — closes the D-03 / WR-05 false-coin-promise gap by making these ordinary
  -- configurable custom blocks rather than special-cased code paths.
  INSERT INTO public.day_blocks (family_id, legacy_key, seed_key, name, icon, price, day_types, sort_order, who_fills, is_active)
  VALUES
    (p_family_id, NULL, 'home_help',        'Помощь по дому',        '🧺', 3, '{}',        7, 'both', true),
    (p_family_id, NULL, 'weekend_homework', 'Домашка на выходных',   '📝', 5, '{weekend}', 8, 'both', true),
    (p_family_id, NULL, 'reading_extra',    'Доп. чтение',           '📗', 2, '{}',        9, 'both', true)
  ON CONFLICT (family_id, seed_key) WHERE seed_key IS NOT NULL AND child_id IS NULL DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_day_blocks(UUID) TO authenticated;

-- ============================================================================
-- BACKFILL: seed the 7 built-ins + 3 custom defaults for every EXISTING family.
-- Idempotent — safe to re-run (seed_default_day_blocks itself is idempotent
-- because both ON CONFLICT arbiters match their partial indexes on the
-- child_id IS NULL default rows).
-- ============================================================================

SELECT public.seed_default_day_blocks(id) FROM public.families;

-- ============================================================================
-- LEGACY-DELETE GUARD
-- A legacy_key-mapped block can only be deactivated, never hard-deleted —
-- custom blocks (NULL legacy_key, including the 3 seed_key defaults) delete
-- freely.
-- ============================================================================

-- Only blocks a DIRECT delete on day_blocks. Inside the currently-executing
-- BEFORE DELETE trigger, pg_trigger_depth() is already 1 for a direct delete
-- statement; a cascade delete originating from a parent FK (e.g. deleting the
-- whole family/child for COPPA account deletion) nests this trigger one level
-- deeper inside the FK's internal RI cascade trigger (depth >= 2) and must be
-- allowed through, or family/child deletion would be permanently blocked
-- whenever a legacy block exists.
CREATE OR REPLACE FUNCTION public.day_blocks_block_legacy_delete_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.legacy_key IS NOT NULL AND pg_trigger_depth() <= 1 THEN
    RAISE EXCEPTION 'legacy day block cannot be deleted; deactivate instead';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS day_blocks_block_legacy_delete ON public.day_blocks;
CREATE TRIGGER day_blocks_block_legacy_delete
  BEFORE DELETE ON public.day_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.day_blocks_block_legacy_delete_fn();

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
