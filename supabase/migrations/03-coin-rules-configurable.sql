-- Add missing coach rating columns and grade 2/1 penalty columns to wallet_settings
-- Values are stored as actual coin amounts (negative = penalty, positive = reward)

ALTER TABLE wallet_settings
  ADD COLUMN IF NOT EXISTS coins_per_coach_5 INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS coins_per_coach_4 INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS coins_per_coach_3 INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_per_coach_2 INTEGER NOT NULL DEFAULT -3,
  ADD COLUMN IF NOT EXISTS coins_per_coach_1 INTEGER NOT NULL DEFAULT -10,
  ADD COLUMN IF NOT EXISTS coins_per_grade_2 INTEGER NOT NULL DEFAULT -5,
  ADD COLUMN IF NOT EXISTS coins_per_grade_1 INTEGER NOT NULL DEFAULT -10;

-- Migrate existing rows: coins_per_coach_2/1 were stored as positive and negated in code.
-- Flip them to negative to match new semantics.
UPDATE wallet_settings
SET
  coins_per_coach_2 = -ABS(coins_per_coach_2),
  coins_per_coach_1 = -ABS(coins_per_coach_1),
  coins_per_grade_3 = -ABS(coins_per_grade_3)
WHERE id = 'default'
  AND coins_per_coach_2 > 0;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
