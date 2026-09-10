-- Weekly boost + one-time milestone tiers (Adam's "буст от алгоритма" +
-- "вся неделя пятёрки → до +500"). Per-family, parent-tunable amounts.
--
-- Computed server-side in app/api/wallet/award/route.ts block 7 via the pure
-- rules in lib/kid/boost-rules.ts, credited through creditAwards so it is
-- idempotent per (child_id, source_type, source_id):
--   • weekly boost    — source_type='weekly_boost',   source_id=<ISO week start>
--   • milestone tiers — source_type='boost_milestone', source_id=<tier key>
--
-- Defaults mirror DEFAULT_BOOST_SETTINGS in lib/kid/boost-rules.ts,
-- SETTINGS_DEFAULTS in app/api/wallet/_lib.ts, and the getWalletSettings
-- fallback in lib/repositories/wallet.repo.ts — keep all four in sync.

ALTER TABLE public.wallet_settings
  ADD COLUMN IF NOT EXISTS boost_grades_t1            INTEGER NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS boost_grades_t2            INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS boost_grades_t3            INTEGER NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS boost_grades_t1_count      INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS boost_grades_t2_count      INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS boost_grades_perfect_days  INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS boost_full_week            INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS boost_streaks_2            INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS boost_streaks_3            INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS boost_milestone_7d         INTEGER NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS boost_milestone_30d        INTEGER NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS boost_milestone_100d       INTEGER NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS boost_milestone_streak30   INTEGER NOT NULL DEFAULT 300;
