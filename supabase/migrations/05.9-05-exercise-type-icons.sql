-- Phase 5.9 Plan 05: per-exercise icon.
-- The home-exercises UI (KidDayFillForm, DailyModal) hardcoded a single 💪 for
-- every exercise row, which also collided visually with the Спорт/секции block.
-- This adds an editable per-row icon to exercise_types and backfills a distinct
-- emoji for each of the seeded global exercises.
--
-- Additive only. Idempotent: ADD COLUMN IF NOT EXISTS + guarded backfill
-- (only fills rows where icon IS NULL), safe to re-run.

ALTER TABLE public.exercise_types
  ADD COLUMN IF NOT EXISTS icon TEXT;

-- Per-name backfill for the seeded global set (family_id IS NULL). Only touches
-- rows that have no icon yet, so a later parent edit is never overwritten.
UPDATE public.exercise_types SET icon = v.icon
FROM (VALUES
  ('Отжимания',              '💪'),
  ('Турник (подтягивания)',  '🧗'),
  ('Пресс',                  '🔥'),
  ('Растяжка',               '🧘'),
  ('Приседания',             '🦵'),
  ('Планка',                 '🪵'),
  ('Скакалка',               '🪢'),
  ('Крабики',                '🦀')
) AS v(name, icon)
WHERE public.exercise_types.name = v.name
  AND public.exercise_types.icon IS NULL;

-- Anything still without an icon (custom family exercises, unmatched names) gets a
-- neutral "workout" default that is distinct from the Спорт block's 💪.
UPDATE public.exercise_types SET icon = '🤸' WHERE icon IS NULL;
