-- Add ALL potentially missing columns to wallet_settings with IF NOT EXISTS guards.
-- Safe to run multiple times. Covers columns added across multiple prior migrations
-- that may not have been applied.

ALTER TABLE wallet_settings
  ADD COLUMN IF NOT EXISTS coins_per_exercise       INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS coins_per_coach_5        INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS coins_per_coach_4        INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS coins_per_coach_3        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_per_coach_2        INTEGER NOT NULL DEFAULT -3,
  ADD COLUMN IF NOT EXISTS coins_per_coach_1        INTEGER NOT NULL DEFAULT -10,
  ADD COLUMN IF NOT EXISTS coins_per_grade_2        INTEGER NOT NULL DEFAULT -5,
  ADD COLUMN IF NOT EXISTS coins_per_grade_1        INTEGER NOT NULL DEFAULT -10,
  ADD COLUMN IF NOT EXISTS p2p_max_per_transfer     INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS p2p_max_per_day          INTEGER NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS p2p_max_per_month        INTEGER NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS p2p_max_debt             INTEGER NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS bonus_100_coins          INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS bonus_500_coins          INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS bonus_1000_coins         INTEGER NOT NULL DEFAULT 50;

-- Fix semantics: coins_per_grade_3 was historically stored as positive and negated in code.
-- Convert to negative (actual deduction) if still positive.
UPDATE wallet_settings
SET coins_per_grade_3 = -ABS(coins_per_grade_3)
WHERE coins_per_grade_3 > 0;

-- Fix old coach penalty columns if they were stored as positive (old convention).
UPDATE wallet_settings
SET
  coins_per_coach_2 = -ABS(coins_per_coach_2),
  coins_per_coach_1 = -ABS(coins_per_coach_1)
WHERE coins_per_coach_2 > 0 OR coins_per_coach_1 > 0;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
