-- =============================================================================
-- seed-migration.sql — Add family_id to all existing tables and backfill adam/alim data
-- =============================================================================
-- Execution order: Run schema-v3.sql FIRST, then this file, then rls.sql.
-- =============================================================================
-- This file does two things:
--   Part 1: Adds family_id UUID column (nullable, FK to families) to every
--           existing table. Uses IF NOT EXISTS so it is safe to re-run.
--   Part 2: Creates a bootstrap family for adam/alim and backfills family_id
--           on all rows.
--
-- CRITICAL: child_id TEXT is NOT dropped. All existing TypeScript code still
-- uses child_id = 'adam' or 'alim'. Only add new columns — never remove old.
-- The child_id column will be removed in Phase 1.4 after hardcodes are gone.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- PART 1 — Add family_id UUID column to all existing tables
-- ---------------------------------------------------------------------------

-- Tables from supabase-schema-v2.sql
ALTER TABLE children         ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE settings         ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE days             ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE subject_grades   ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE subjects_cache   ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE home_sports      ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE sports_sections  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE section_attendance ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE goals            ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE goal_log         ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE weeks            ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE streaks          ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE badges           ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE records          ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE challenges       ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);

-- Tables from supabase-migration-flexible.sql
ALTER TABLE subjects         ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE schedule         ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE home_exercises   ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
-- exercise_types: nullable family_id means NULL = global default, non-null = family override
ALTER TABLE exercise_types   ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);

-- Tables from supabase-step3-expenses.sql
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE expenses          ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE sections          ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE section_visits    ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);

-- Wallet tables (created directly in Supabase — no SQL file exists for these)
ALTER TABLE wallet            ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE wallet_settings   ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE rewards           ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE reward_purchases  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE coin_exchanges    ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE cash_withdrawals  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE p2p_transfers     ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);


-- ---------------------------------------------------------------------------
-- Performance indexes for family_id columns (critical for RLS policy speed)
-- Each RLS policy filters by family_id — without indexes this is a table scan
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_children_family_id          ON children(family_id);
CREATE INDEX IF NOT EXISTS idx_settings_family_id          ON settings(family_id);
CREATE INDEX IF NOT EXISTS idx_days_family_id              ON days(family_id);
CREATE INDEX IF NOT EXISTS idx_subject_grades_family_id    ON subject_grades(family_id);
CREATE INDEX IF NOT EXISTS idx_subjects_cache_family_id    ON subjects_cache(family_id);
CREATE INDEX IF NOT EXISTS idx_home_sports_family_id       ON home_sports(family_id);
CREATE INDEX IF NOT EXISTS idx_sports_sections_family_id   ON sports_sections(family_id);
CREATE INDEX IF NOT EXISTS idx_section_attendance_family_id ON section_attendance(family_id);
CREATE INDEX IF NOT EXISTS idx_goals_family_id             ON goals(family_id);
CREATE INDEX IF NOT EXISTS idx_goal_log_family_id          ON goal_log(family_id);
CREATE INDEX IF NOT EXISTS idx_weeks_family_id             ON weeks(family_id);
CREATE INDEX IF NOT EXISTS idx_streaks_family_id           ON streaks(family_id);
CREATE INDEX IF NOT EXISTS idx_badges_family_id            ON badges(family_id);
CREATE INDEX IF NOT EXISTS idx_records_family_id           ON records(family_id);
CREATE INDEX IF NOT EXISTS idx_challenges_family_id        ON challenges(family_id);
CREATE INDEX IF NOT EXISTS idx_subjects_family_id          ON subjects(family_id);
CREATE INDEX IF NOT EXISTS idx_schedule_family_id          ON schedule(family_id);
CREATE INDEX IF NOT EXISTS idx_home_exercises_family_id    ON home_exercises(family_id);
CREATE INDEX IF NOT EXISTS idx_exercise_types_family_id    ON exercise_types(family_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_family_id ON expense_categories(family_id);
CREATE INDEX IF NOT EXISTS idx_expenses_family_id          ON expenses(family_id);
CREATE INDEX IF NOT EXISTS idx_sections_family_id          ON sections(family_id);
CREATE INDEX IF NOT EXISTS idx_section_visits_family_id    ON section_visits(family_id);
CREATE INDEX IF NOT EXISTS idx_wallet_family_id            ON wallet(family_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_family_id ON wallet_transactions(family_id);
CREATE INDEX IF NOT EXISTS idx_wallet_settings_family_id   ON wallet_settings(family_id);
CREATE INDEX IF NOT EXISTS idx_rewards_family_id           ON rewards(family_id);
CREATE INDEX IF NOT EXISTS idx_reward_purchases_family_id  ON reward_purchases(family_id);
CREATE INDEX IF NOT EXISTS idx_coin_exchanges_family_id    ON coin_exchanges(family_id);
CREATE INDEX IF NOT EXISTS idx_cash_withdrawals_family_id  ON cash_withdrawals(family_id);
CREATE INDEX IF NOT EXISTS idx_p2p_transfers_family_id     ON p2p_transfers(family_id);


-- ---------------------------------------------------------------------------
-- PART 2 — Bootstrap family for adam/alim and backfill all existing rows
-- ---------------------------------------------------------------------------
-- Creates a single "legacy" family that owns all existing adam/alim data.
-- After running this block, the NOTICE output will include the bootstrap family_id.
-- SAVE THAT UUID — you will need it to link real auth users to this family.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_family_id UUID;
BEGIN
  -- Create or find the bootstrap family
  -- ON CONFLICT on invite_code ensures idempotency if this block is re-run
  INSERT INTO families (name, invite_code)
  VALUES ('Семья (bootstrap)', 'LEGACY')
  ON CONFLICT (invite_code) DO UPDATE SET name = 'Семья (bootstrap)'
  RETURNING id INTO v_family_id;

  -- Backfill family_id on all existing tables (only rows that don't have it yet)
  UPDATE children          SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE settings          SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE days              SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE subject_grades    SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE subjects_cache    SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE home_sports       SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE sports_sections   SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE section_attendance SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE goals             SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE goal_log          SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE weeks             SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE streaks           SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE badges            SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE records           SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE challenges        SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE subjects          SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE schedule          SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE home_exercises    SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE expense_categories SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE expenses          SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE sections          SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE section_visits    SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE wallet            SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE wallet_transactions SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE wallet_settings   SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE rewards           SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE reward_purchases  SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE coin_exchanges    SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE cash_withdrawals  SET family_id = v_family_id WHERE family_id IS NULL;
  UPDATE p2p_transfers     SET family_id = v_family_id WHERE family_id IS NULL;

  RAISE NOTICE 'Bootstrap complete. Bootstrap family_id: %', v_family_id;
  RAISE NOTICE 'IMPORTANT: Save this UUID. You will need it to link real auth users to this family.';
END;
$$;


-- ---------------------------------------------------------------------------
-- NEXT STEPS (manual — after running this file):
-- ---------------------------------------------------------------------------
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Create auth users for Adam and Alim (email/password or invite)
-- 3. Copy the user UUIDs that Supabase assigns them
-- 4. Run the INSERT below (replace placeholder UUIDs with real values)
-- ---------------------------------------------------------------------------
-- The bootstrap family_id was printed in the NOTICE above.
-- Run this AFTER creating auth users for Adam and Alim in Supabase Dashboard:

/*
INSERT INTO family_members (family_id, user_id, role, display_name)
VALUES
  ('<BOOTSTRAP_FAMILY_ID>', '<ADAM_AUTH_USER_ID>',  'child', 'Адам'),
  ('<BOOTSTRAP_FAMILY_ID>', '<ALIM_AUTH_USER_ID>',  'child', 'Алим');
*/

-- Also consider adding the parent account:
/*
INSERT INTO family_members (family_id, user_id, role, display_name)
VALUES
  ('<BOOTSTRAP_FAMILY_ID>', '<PARENT_AUTH_USER_ID>', 'parent', 'Родитель');
*/
