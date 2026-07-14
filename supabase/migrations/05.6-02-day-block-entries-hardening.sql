-- Phase 5.6 Plan 08: day_block_entries DB-layer hardening (gap closure).
-- Closes CR-02 (defense-in-depth), WR-01 (RLS half), WR-07, and backfills
-- idempotency continuity across Plan 07's key-format switch. Idempotent and
-- safe to re-run: DROP POLICY IF EXISTS / CREATE OR REPLACE FUNCTION / a
-- collision-guarded UPDATE that naturally becomes a no-op once applied.
--
-- (a) CR-02 defense-in-depth: drop the day_block_entries DELETE policy and do
--     NOT recreate one. Forms only ever upsert entries; the award route reads
--     via the service role (bypasses RLS). With RLS enabled and no DELETE
--     policy, no client role (kid/parent/extended) can delete entry rows —
--     removing the UUID-rotation primitive behind CR-02 even beyond Plan 07's
--     deterministic (date + block_id) award key.
-- (b) WR-01 (RLS half): tie day_block_entries INSERT/UPDATE child_id to a
--     child of the row's family_id via WITH CHECK, so a caller cannot insert
--     an entry naming a child from a different family under their own
--     family_id.
-- (c) WR-07: seed_default_day_blocks(p_family_id) is SECURITY DEFINER +
--     GRANT EXECUTE TO authenticated with no caller-membership check today —
--     any logged-in user could seed (write) another family's day-blocks
--     config. Add a parent/extended membership guard that RAISEs otherwise.
-- (d) Idempotency continuity: Plan 07 switched the award route's custom_block
--     source_id from the entry row's UUID to the natural key
--     `${date}:${block_id}`. Existing already-awarded custom_block
--     wallet_transactions rows are still keyed to the old entry UUID; without
--     a backfill they would look un-credited under the new key and could be
--     re-awarded once. Rewrite them, guarded against unique-index collisions.

-- ============================================================================
-- (a) DROP the day_block_entries DELETE policy — CR-02 defense-in-depth.
-- Deletes are intentionally denied to every client role from this point on;
-- do not recreate a DELETE policy on this table without re-opening CR-02.
-- ============================================================================

DROP POLICY IF EXISTS "day_block_entries_delete_own_family" ON public.day_block_entries;

-- ============================================================================
-- (b) Tie child_id to family_id in INSERT/UPDATE WITH CHECK — WR-01 RLS half.
-- SELECT policy is unchanged. UPDATE USING clause is unchanged (existing
-- family-membership check); only its WITH CHECK gains the child_id tie.
-- ============================================================================

DROP POLICY IF EXISTS "day_block_entries_insert_own_family" ON public.day_block_entries;
CREATE POLICY "day_block_entries_insert_own_family"
  ON public.day_block_entries
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
    AND child_id IN (
      SELECT id FROM public.children WHERE family_id = day_block_entries.family_id
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
    AND child_id IN (
      SELECT id FROM public.children WHERE family_id = day_block_entries.family_id
    )
  );

-- ============================================================================
-- (c) Guard seed_default_day_blocks — WR-07.
-- Identical body to 05.6-01 (built-in + seeded-custom INSERTs copied
-- verbatim) plus a membership guard at the top. SECURITY DEFINER and the
-- GRANT EXECUTE TO authenticated are both retained.
--
-- Executor note: verified lib/onboarding-api.ts `createFamily()` upserts the
-- creator's family_members row (Step 3, role='parent') BEFORE the
-- seed_default_day_blocks RPC call (Step 5c) — the caller is already a
-- 'parent' member of p_family_id by the time the seed runs, so this guard
-- does not break onboarding. No re-ordering needed.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.seed_default_day_blocks(p_family_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- WR-07 guard: only a parent/extended member of the target family may seed
  -- its day-blocks config (money-adjacent, mirrors day_blocks write policies).
  IF NOT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = auth.uid() AND family_id = p_family_id AND role IN ('parent', 'extended')
  ) THEN
    RAISE EXCEPTION 'not authorized to seed day blocks for this family';
  END IF;

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
-- (d) Backfill: rewrite already-awarded custom_block source_ids from the old
-- entry-UUID key to the new natural key `${date}:${block_id}` (Plan 07 format),
-- so the key-format switch cannot re-award an already-credited day/block.
-- Guarded against unique-index collisions with a NOT EXISTS check — if a row
-- already holds the target natural key for that child, the older UUID-keyed
-- row is left alone (harmless historical duplicate, not a double-credit risk
-- since the target key already carries a credit). Only source_type =
-- 'custom_block' rows are touched; no other source_type is altered. Rows
-- whose entry was already deleted (no join match on source_id = entry id)
-- keep their UUID source_id and are harmless historical credits — given the
-- flag is currently enabled only for the operator's own family, the
-- practical volume of both cases is near zero.
-- ============================================================================

UPDATE public.wallet_transactions wt
SET source_id = dbe.date::text || ':' || dbe.block_id::text
FROM public.day_block_entries dbe
WHERE wt.source_type = 'custom_block'
  AND wt.source_id = dbe.id::text
  AND NOT EXISTS (
    SELECT 1 FROM public.wallet_transactions wt2
    WHERE wt2.child_id = wt.child_id
      AND wt2.source_type = 'custom_block'
      AND wt2.source_id = dbe.date::text || ':' || dbe.block_id::text
  );

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
