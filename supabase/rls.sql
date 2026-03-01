-- =============================================================================
-- rls.sql — Drop public access policies, enable RLS, install family-scoped policies
-- =============================================================================
-- IMPORTANT: This file must be run AFTER schema-v3.sql and seed-migration.sql.
-- Running it BEFORE seed-migration.sql will make all existing data invisible
-- because RLS is deny-all by default and family_id is still NULL on all rows.
-- Correct execution order: schema-v3.sql → seed-migration.sql → THIS FILE
-- =============================================================================
-- All data-table policies use the family_isolation pattern:
--   family_id IN (SELECT family_id FROM family_members WHERE user_id = (SELECT auth.uid()))
-- The (SELECT auth.uid()) wrapper avoids re-evaluating auth.uid() per row.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- SECTION 1 — Drop all existing public access policies
-- ---------------------------------------------------------------------------
-- These policies were created when the app was single-tenant / public read.
-- They must all be removed before installing the new authenticated policies.
-- ---------------------------------------------------------------------------

-- children
DROP POLICY IF EXISTS "Public read access"  ON children;
DROP POLICY IF EXISTS "Public write access" ON children;
DROP POLICY IF EXISTS "Allow public read"   ON children;
DROP POLICY IF EXISTS "Allow public write"  ON children;
DROP POLICY IF EXISTS "Enable read access for all users" ON children;
DROP POLICY IF EXISTS "Enable write access for all users" ON children;

-- settings
DROP POLICY IF EXISTS "Public read access"  ON settings;
DROP POLICY IF EXISTS "Public write access" ON settings;
DROP POLICY IF EXISTS "Allow public read"   ON settings;
DROP POLICY IF EXISTS "Allow public write"  ON settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON settings;
DROP POLICY IF EXISTS "Enable write access for all users" ON settings;

-- days
DROP POLICY IF EXISTS "Public read access"  ON days;
DROP POLICY IF EXISTS "Public write access" ON days;
DROP POLICY IF EXISTS "Allow public read"   ON days;
DROP POLICY IF EXISTS "Allow public write"  ON days;
DROP POLICY IF EXISTS "Enable read access for all users" ON days;
DROP POLICY IF EXISTS "Enable write access for all users" ON days;

-- subject_grades
DROP POLICY IF EXISTS "Public read access"  ON subject_grades;
DROP POLICY IF EXISTS "Public write access" ON subject_grades;
DROP POLICY IF EXISTS "Allow public read"   ON subject_grades;
DROP POLICY IF EXISTS "Allow public write"  ON subject_grades;
DROP POLICY IF EXISTS "Enable read access for all users" ON subject_grades;
DROP POLICY IF EXISTS "Enable write access for all users" ON subject_grades;

-- subjects_cache
DROP POLICY IF EXISTS "Public read access"  ON subjects_cache;
DROP POLICY IF EXISTS "Public write access" ON subjects_cache;
DROP POLICY IF EXISTS "Allow public read"   ON subjects_cache;
DROP POLICY IF EXISTS "Allow public write"  ON subjects_cache;
DROP POLICY IF EXISTS "Enable read access for all users" ON subjects_cache;
DROP POLICY IF EXISTS "Enable write access for all users" ON subjects_cache;

-- home_sports
DROP POLICY IF EXISTS "Public read access"  ON home_sports;
DROP POLICY IF EXISTS "Public write access" ON home_sports;
DROP POLICY IF EXISTS "Allow public read"   ON home_sports;
DROP POLICY IF EXISTS "Allow public write"  ON home_sports;
DROP POLICY IF EXISTS "Enable read access for all users" ON home_sports;
DROP POLICY IF EXISTS "Enable write access for all users" ON home_sports;

-- sports_sections
DROP POLICY IF EXISTS "Public read access"  ON sports_sections;
DROP POLICY IF EXISTS "Public write access" ON sports_sections;
DROP POLICY IF EXISTS "Allow public read"   ON sports_sections;
DROP POLICY IF EXISTS "Allow public write"  ON sports_sections;
DROP POLICY IF EXISTS "Enable read access for all users" ON sports_sections;
DROP POLICY IF EXISTS "Enable write access for all users" ON sports_sections;

-- section_attendance
DROP POLICY IF EXISTS "Public read access"  ON section_attendance;
DROP POLICY IF EXISTS "Public write access" ON section_attendance;
DROP POLICY IF EXISTS "Allow public read"   ON section_attendance;
DROP POLICY IF EXISTS "Allow public write"  ON section_attendance;
DROP POLICY IF EXISTS "Enable read access for all users" ON section_attendance;
DROP POLICY IF EXISTS "Enable write access for all users" ON section_attendance;

-- goals
DROP POLICY IF EXISTS "Public read access"  ON goals;
DROP POLICY IF EXISTS "Public write access" ON goals;
DROP POLICY IF EXISTS "Allow public read"   ON goals;
DROP POLICY IF EXISTS "Allow public write"  ON goals;
DROP POLICY IF EXISTS "Enable read access for all users" ON goals;
DROP POLICY IF EXISTS "Enable write access for all users" ON goals;

-- goal_log
DROP POLICY IF EXISTS "Public read access"  ON goal_log;
DROP POLICY IF EXISTS "Public write access" ON goal_log;
DROP POLICY IF EXISTS "Allow public read"   ON goal_log;
DROP POLICY IF EXISTS "Allow public write"  ON goal_log;
DROP POLICY IF EXISTS "Enable read access for all users" ON goal_log;
DROP POLICY IF EXISTS "Enable write access for all users" ON goal_log;

-- weeks
DROP POLICY IF EXISTS "Public read access"  ON weeks;
DROP POLICY IF EXISTS "Public write access" ON weeks;
DROP POLICY IF EXISTS "Allow public read"   ON weeks;
DROP POLICY IF EXISTS "Allow public write"  ON weeks;
DROP POLICY IF EXISTS "Enable read access for all users" ON weeks;
DROP POLICY IF EXISTS "Enable write access for all users" ON weeks;

-- streaks
DROP POLICY IF EXISTS "Public read access"  ON streaks;
DROP POLICY IF EXISTS "Public write access" ON streaks;
DROP POLICY IF EXISTS "Allow public read"   ON streaks;
DROP POLICY IF EXISTS "Allow public write"  ON streaks;
DROP POLICY IF EXISTS "Enable read access for all users" ON streaks;
DROP POLICY IF EXISTS "Enable write access for all users" ON streaks;

-- badges
DROP POLICY IF EXISTS "Public read access"  ON badges;
DROP POLICY IF EXISTS "Public write access" ON badges;
DROP POLICY IF EXISTS "Allow public read"   ON badges;
DROP POLICY IF EXISTS "Allow public write"  ON badges;
DROP POLICY IF EXISTS "Enable read access for all users" ON badges;
DROP POLICY IF EXISTS "Enable write access for all users" ON badges;

-- records
DROP POLICY IF EXISTS "Public read access"  ON records;
DROP POLICY IF EXISTS "Public write access" ON records;
DROP POLICY IF EXISTS "Allow public read"   ON records;
DROP POLICY IF EXISTS "Allow public write"  ON records;
DROP POLICY IF EXISTS "Enable read access for all users" ON records;
DROP POLICY IF EXISTS "Enable write access for all users" ON records;

-- challenges
DROP POLICY IF EXISTS "Public read access"  ON challenges;
DROP POLICY IF EXISTS "Public write access" ON challenges;
DROP POLICY IF EXISTS "Allow public read"   ON challenges;
DROP POLICY IF EXISTS "Allow public write"  ON challenges;
DROP POLICY IF EXISTS "Enable read access for all users" ON challenges;
DROP POLICY IF EXISTS "Enable write access for all users" ON challenges;

-- subjects (from supabase-migration-flexible.sql)
DROP POLICY IF EXISTS "Public read access"  ON subjects;
DROP POLICY IF EXISTS "Public write access" ON subjects;
DROP POLICY IF EXISTS "Allow public read"   ON subjects;
DROP POLICY IF EXISTS "Allow public write"  ON subjects;
DROP POLICY IF EXISTS "Enable read access for all users" ON subjects;
DROP POLICY IF EXISTS "Enable write access for all users" ON subjects;

-- schedule
DROP POLICY IF EXISTS "Public read access"  ON schedule;
DROP POLICY IF EXISTS "Public write access" ON schedule;
DROP POLICY IF EXISTS "Allow public read"   ON schedule;
DROP POLICY IF EXISTS "Allow public write"  ON schedule;
DROP POLICY IF EXISTS "Enable read access for all users" ON schedule;
DROP POLICY IF EXISTS "Enable write access for all users" ON schedule;

-- exercise_types
DROP POLICY IF EXISTS "Public read access"  ON exercise_types;
DROP POLICY IF EXISTS "Public write access" ON exercise_types;
DROP POLICY IF EXISTS "Allow public read"   ON exercise_types;
DROP POLICY IF EXISTS "Allow public write"  ON exercise_types;
DROP POLICY IF EXISTS "Enable read access for all users" ON exercise_types;
DROP POLICY IF EXISTS "Enable write access for all users" ON exercise_types;

-- home_exercises
DROP POLICY IF EXISTS "Public read access"  ON home_exercises;
DROP POLICY IF EXISTS "Public write access" ON home_exercises;
DROP POLICY IF EXISTS "Allow public read"   ON home_exercises;
DROP POLICY IF EXISTS "Allow public write"  ON home_exercises;
DROP POLICY IF EXISTS "Enable read access for all users" ON home_exercises;
DROP POLICY IF EXISTS "Enable write access for all users" ON home_exercises;

-- expense_categories (from supabase-step3-expenses.sql)
DROP POLICY IF EXISTS "Public read access"  ON expense_categories;
DROP POLICY IF EXISTS "Public write access" ON expense_categories;
DROP POLICY IF EXISTS "Allow public read"   ON expense_categories;
DROP POLICY IF EXISTS "Allow public write"  ON expense_categories;
DROP POLICY IF EXISTS "Enable read access for all users" ON expense_categories;
DROP POLICY IF EXISTS "Enable write access for all users" ON expense_categories;

-- expenses
DROP POLICY IF EXISTS "Public read access"  ON expenses;
DROP POLICY IF EXISTS "Public write access" ON expenses;
DROP POLICY IF EXISTS "Allow public read"   ON expenses;
DROP POLICY IF EXISTS "Allow public write"  ON expenses;
DROP POLICY IF EXISTS "Enable read access for all users" ON expenses;
DROP POLICY IF EXISTS "Enable write access for all users" ON expenses;

-- sections
DROP POLICY IF EXISTS "Public read access"  ON sections;
DROP POLICY IF EXISTS "Public write access" ON sections;
DROP POLICY IF EXISTS "Allow public read"   ON sections;
DROP POLICY IF EXISTS "Allow public write"  ON sections;
DROP POLICY IF EXISTS "Enable read access for all users" ON sections;
DROP POLICY IF EXISTS "Enable write access for all users" ON sections;

-- section_visits
DROP POLICY IF EXISTS "Public read access"  ON section_visits;
DROP POLICY IF EXISTS "Public write access" ON section_visits;
DROP POLICY IF EXISTS "Allow public read"   ON section_visits;
DROP POLICY IF EXISTS "Allow public write"  ON section_visits;
DROP POLICY IF EXISTS "Enable read access for all users" ON section_visits;
DROP POLICY IF EXISTS "Enable write access for all users" ON section_visits;

-- wallet tables (created directly in Supabase)
DROP POLICY IF EXISTS "Public read access"  ON wallet;
DROP POLICY IF EXISTS "Public write access" ON wallet;
DROP POLICY IF EXISTS "Allow public read"   ON wallet;
DROP POLICY IF EXISTS "Allow public write"  ON wallet;
DROP POLICY IF EXISTS "Enable read access for all users" ON wallet;
DROP POLICY IF EXISTS "Enable write access for all users" ON wallet;

DROP POLICY IF EXISTS "Public read access"  ON wallet_transactions;
DROP POLICY IF EXISTS "Public write access" ON wallet_transactions;
DROP POLICY IF EXISTS "Allow public read"   ON wallet_transactions;
DROP POLICY IF EXISTS "Allow public write"  ON wallet_transactions;
DROP POLICY IF EXISTS "Enable read access for all users" ON wallet_transactions;
DROP POLICY IF EXISTS "Enable write access for all users" ON wallet_transactions;

DROP POLICY IF EXISTS "Public read access"  ON wallet_settings;
DROP POLICY IF EXISTS "Public write access" ON wallet_settings;
DROP POLICY IF EXISTS "Allow public read"   ON wallet_settings;
DROP POLICY IF EXISTS "Allow public write"  ON wallet_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON wallet_settings;
DROP POLICY IF EXISTS "Enable write access for all users" ON wallet_settings;

DROP POLICY IF EXISTS "Public read access"  ON rewards;
DROP POLICY IF EXISTS "Public write access" ON rewards;
DROP POLICY IF EXISTS "Allow public read"   ON rewards;
DROP POLICY IF EXISTS "Allow public write"  ON rewards;
DROP POLICY IF EXISTS "Enable read access for all users" ON rewards;
DROP POLICY IF EXISTS "Enable write access for all users" ON rewards;

DROP POLICY IF EXISTS "Public read access"  ON reward_purchases;
DROP POLICY IF EXISTS "Public write access" ON reward_purchases;
DROP POLICY IF EXISTS "Allow public read"   ON reward_purchases;
DROP POLICY IF EXISTS "Allow public write"  ON reward_purchases;
DROP POLICY IF EXISTS "Enable read access for all users" ON reward_purchases;
DROP POLICY IF EXISTS "Enable write access for all users" ON reward_purchases;

DROP POLICY IF EXISTS "Public read access"  ON coin_exchanges;
DROP POLICY IF EXISTS "Public write access" ON coin_exchanges;
DROP POLICY IF EXISTS "Allow public read"   ON coin_exchanges;
DROP POLICY IF EXISTS "Allow public write"  ON coin_exchanges;
DROP POLICY IF EXISTS "Enable read access for all users" ON coin_exchanges;
DROP POLICY IF EXISTS "Enable write access for all users" ON coin_exchanges;

DROP POLICY IF EXISTS "Public read access"  ON cash_withdrawals;
DROP POLICY IF EXISTS "Public write access" ON cash_withdrawals;
DROP POLICY IF EXISTS "Allow public read"   ON cash_withdrawals;
DROP POLICY IF EXISTS "Allow public write"  ON cash_withdrawals;
DROP POLICY IF EXISTS "Enable read access for all users" ON cash_withdrawals;
DROP POLICY IF EXISTS "Enable write access for all users" ON cash_withdrawals;

DROP POLICY IF EXISTS "Public read access"  ON p2p_transfers;
DROP POLICY IF EXISTS "Public write access" ON p2p_transfers;
DROP POLICY IF EXISTS "Allow public read"   ON p2p_transfers;
DROP POLICY IF EXISTS "Allow public write"  ON p2p_transfers;
DROP POLICY IF EXISTS "Enable read access for all users" ON p2p_transfers;
DROP POLICY IF EXISTS "Enable write access for all users" ON p2p_transfers;


-- ---------------------------------------------------------------------------
-- SECTION 2 — Enable RLS on new tables and any migration tables missing it
-- ---------------------------------------------------------------------------
-- Note: tables from supabase-schema-v2.sql already have RLS enabled.
-- We enable it here for tables from migration files and new tables from schema-v3.sql.
-- FORCE ROW LEVEL SECURITY also applies to table owners (safer default).
-- ---------------------------------------------------------------------------

-- New tables from schema-v3.sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE families      ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Tables from supabase-migration-flexible.sql
ALTER TABLE subjects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule       ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_exercises ENABLE ROW LEVEL SECURITY;

-- Tables from supabase-step3-expenses.sql
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections           ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_visits     ENABLE ROW LEVEL SECURITY;

-- Wallet tables (created directly in Supabase)
ALTER TABLE wallet              ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_purchases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_exchanges      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_withdrawals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_transfers       ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- SECTION 3 — user_profiles: each user can only read and update their own row
-- ---------------------------------------------------------------------------
CREATE POLICY "user_profiles_own" ON user_profiles
  FOR ALL TO authenticated
  USING     (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));


-- ---------------------------------------------------------------------------
-- SECTION 4 — families: members can read; parents can update; anyone can create
-- ---------------------------------------------------------------------------

-- Members of a family can read that family's row
CREATE POLICY "families_member_read" ON families
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Only parents can update family settings
CREATE POLICY "families_member_write" ON families
  FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
        AND role = 'parent'
    )
  );

-- Allow any authenticated user to INSERT a new family (new family has no members yet,
-- so the member-read policy above cannot be used for bootstrap)
CREATE POLICY "families_insert" ON families
  FOR INSERT TO authenticated
  WITH CHECK (true);


-- ---------------------------------------------------------------------------
-- SECTION 5 — family_members: members can read roster; controlled insert/update
-- ---------------------------------------------------------------------------
-- NOTE: Direct self-referential subqueries on family_members cause infinite
-- recursion in RLS policy evaluation. Use SECURITY DEFINER helper functions
-- that bypass RLS to safely query the table.
-- ---------------------------------------------------------------------------

-- Helper: returns family_ids the current user belongs to (bypasses RLS)
CREATE OR REPLACE FUNCTION get_my_family_ids()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT family_id FROM public.family_members WHERE user_id = auth.uid();
$$;

-- Helper: returns family_ids where current user is a parent (bypasses RLS)
CREATE OR REPLACE FUNCTION get_my_parent_family_ids()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT family_id FROM public.family_members
  WHERE user_id = auth.uid() AND role = 'parent';
$$;

-- Any member of a family can see the full roster of that family
CREATE POLICY "family_members_read" ON family_members
  FOR SELECT TO authenticated
  USING (family_id IN (SELECT get_my_family_ids()));

-- A user can add themselves to any family (joining by invite code),
-- OR a parent can add members to their own family
CREATE POLICY "family_members_insert" ON family_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR family_id IN (SELECT get_my_family_ids())
  );

-- Only parents can update or delete family membership records
CREATE POLICY "family_members_update_delete" ON family_members
  FOR ALL TO authenticated
  USING (family_id IN (SELECT get_my_parent_family_ids()));


-- ---------------------------------------------------------------------------
-- SECTION 6 — All existing data tables: standard family_isolation policy
-- ---------------------------------------------------------------------------
-- Pattern: FOR ALL TO authenticated
--   USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = (SELECT auth.uid())))
--   WITH CHECK (same subquery)
--
-- This ensures users only ever see and write data belonging to their family.
-- ---------------------------------------------------------------------------

CREATE POLICY "children_family_isolation" ON children
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "settings_family_isolation" ON settings
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "days_family_isolation" ON days
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "subject_grades_family_isolation" ON subject_grades
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "subjects_cache_family_isolation" ON subjects_cache
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "home_sports_family_isolation" ON home_sports
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "sports_sections_family_isolation" ON sports_sections
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "section_attendance_family_isolation" ON section_attendance
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "goals_family_isolation" ON goals
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "goal_log_family_isolation" ON goal_log
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "weeks_family_isolation" ON weeks
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "streaks_family_isolation" ON streaks
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "badges_family_isolation" ON badges
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "records_family_isolation" ON records
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "challenges_family_isolation" ON challenges
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "subjects_family_isolation" ON subjects
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "schedule_family_isolation" ON schedule
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "home_exercises_family_isolation" ON home_exercises
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- exercise_types: family_id IS nullable — NULL means global default accessible to all authenticated users
-- Non-null family_id means family-specific override, visible only to that family
CREATE POLICY "exercise_types_family_isolation" ON exercise_types
  FOR ALL TO authenticated
  USING (
    family_id IS NULL
    OR family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IS NULL
    OR family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "expense_categories_family_isolation" ON expense_categories
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "expenses_family_isolation" ON expenses
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "sections_family_isolation" ON sections
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "section_visits_family_isolation" ON section_visits
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "wallet_family_isolation" ON wallet
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "wallet_transactions_family_isolation" ON wallet_transactions
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "wallet_settings_family_isolation" ON wallet_settings
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "rewards_family_isolation" ON rewards
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "reward_purchases_family_isolation" ON reward_purchases
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "coin_exchanges_family_isolation" ON coin_exchanges
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "cash_withdrawals_family_isolation" ON cash_withdrawals
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "p2p_transfers_family_isolation" ON p2p_transfers
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );
