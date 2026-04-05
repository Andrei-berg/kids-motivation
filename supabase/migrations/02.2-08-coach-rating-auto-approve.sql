-- Phase 02.2 gap closure: add coach rating coin rule columns to wallet_settings
-- and auto_approve column to rewards table

-- Coach rating coin rules (configurable values for awardCoinsForSport)
ALTER TABLE wallet_settings
  ADD COLUMN IF NOT EXISTS coins_per_coach_5 INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS coins_per_coach_4 INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS coins_per_coach_3 INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_per_coach_2 INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS coins_per_coach_1 INTEGER NOT NULL DEFAULT 10;

-- Note: coins_per_coach_2 and coins_per_coach_1 are stored as positive numbers.
-- awardCoinsForSport negates them when rating <= 2.

-- Auto-approve for shop items (UI toggle already exists, column was missing)
ALTER TABLE rewards
  ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN NOT NULL DEFAULT false;
