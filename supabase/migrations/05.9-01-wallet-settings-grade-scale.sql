-- Phase 5.9 Plan 01: wallet_settings.grade_scale / grade_coin_map columns.
-- Decision D-05 (see .planning/phases/05.9-rules-presets/05.9-CONTEXT.md): a family
-- picks one of three grade scales; the per-grade coin values for whichever scale is
-- active live in a single JSONB map, keyed by the literal grade value (e.g. "5", "11",
-- "A"). This avoids a combinatorial column explosion across 3 scales (5-point,
-- 12-point, A-F) and matches the existing JSONB-for-variable-length-config pattern
-- already used by day_blocks.multipliers (Phase 5.6).
--
-- wallet_settings is a MONEY table, already locked to RLS SELECT-only for clients by
-- migration 04.4-03-wallet-rls-readonly.sql. These two new columns inherit that lock
-- automatically — adding a column to an existing table does NOT require re-installing
-- or altering any RLS policy. Per the resolved Open Question 4, grade_coin_map is left
-- NULL here (no backfill UPDATE): the read-time fallback in app/api/wallet/_lib.ts
-- (loadSettings, plan 04) derives a default map from the existing coins_per_grade_1..5
-- columns when grade_coin_map is NULL, so every existing family's award computation is
-- unaffected until they explicitly opt into presets/grade_coin_map.
--
-- Idempotent: safe to re-run (both statements below use the IF NOT EXISTS guard).

ALTER TABLE public.wallet_settings
  ADD COLUMN IF NOT EXISTS grade_scale TEXT NOT NULL DEFAULT 'five_point'
    CHECK (grade_scale IN ('five_point','twelve_point','a_f'));

ALTER TABLE public.wallet_settings
  ADD COLUMN IF NOT EXISTS grade_coin_map JSONB;
