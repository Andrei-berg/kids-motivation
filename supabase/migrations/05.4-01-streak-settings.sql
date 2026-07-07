-- Phase 5.4 Plan 01: per-family streak configuration on wallet_settings.
-- Adds a "days" threshold and "bonus" amount for each of the three
-- bonus-eligible streak types (room, study, sport). Defaults reproduce the
-- constants currently hardcoded in app/api/wallet/award/route.ts
-- (computeStreakBonus): room >= 7 days -> +100, study >= 14 days -> +100,
-- sport >= 7 days -> +100. Idempotent: safe to re-run.

ALTER TABLE wallet_settings
  ADD COLUMN IF NOT EXISTS streak_room_days    INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS streak_room_bonus   INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS streak_study_days   INTEGER NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS streak_study_bonus  INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS streak_sport_days   INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS streak_sport_bonus  INTEGER NOT NULL DEFAULT 100;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
