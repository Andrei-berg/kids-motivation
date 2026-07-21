-- Phase 5.9 Plan 01: widen subject_grades.grade from INTEGER to TEXT.
-- Decision D-06 (see .planning/phases/05.9-rules-presets/05.9-CONTEXT.md): a grade is
-- now a literal string value ("5", "11", "A") so it can express any of the three grade
-- scales (5-point, 12-point, A-F), not just the integer 5-point scale. subject_grades is
-- a non-money table under ordinary family-isolation RLS (confirmed live via pg_policies
-- per 05.9-RESEARCH.md) — this widen needs no RLS template, only the type/constraint
-- change below.
--
-- Live-verified (2026-07-21, via SUPABASE_DB_URL / pg_constraint) against the prod DB:
-- the column is `grade INTEGER NOT NULL`, and its CHECK constraint is named
-- `subject_grades_grade_check`, defined as `CHECK (((grade >= 2) AND (grade <= 5)))`.
-- Note this CHECK excludes grade 1 even though coins_per_grade_1 already exists in
-- wallet_settings and the award route's gradeCoins() switch already handles case 1 —
-- grade 1 has never been storable in prod; dropping this CHECK is what makes it
-- possible for the first time (no behavior change for existing rows, which are all
-- integers 2-5 and widen losslessly to their string literal, e.g. 5 -> '5').
--
-- Idempotent: safe to re-run (USING-cast on an already-TEXT column is a no-op cast;
-- DROP CONSTRAINT IF EXISTS is idempotent).

ALTER TABLE public.subject_grades
  ALTER COLUMN grade TYPE TEXT USING grade::text;

ALTER TABLE public.subject_grades
  DROP CONSTRAINT IF EXISTS subject_grades_grade_check;
