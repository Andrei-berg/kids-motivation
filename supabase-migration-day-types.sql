-- ============================================================================
-- MIGRATION: Day Types — Vacation Periods, Reading Log, Extra Lessons
-- Run in Supabase SQL Editor
-- ============================================================================

-- 1. Extend days table with sick day and home help fields
ALTER TABLE days ADD COLUMN IF NOT EXISTS is_sick BOOLEAN DEFAULT false;
ALTER TABLE days ADD COLUMN IF NOT EXISTS home_help BOOLEAN DEFAULT false;
ALTER TABLE days ADD COLUMN IF NOT EXISTS home_help_note TEXT;

-- 2. Vacation periods (defined by parents in Settings)
CREATE TABLE IF NOT EXISTS vacation_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id TEXT DEFAULT 'default',
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  emoji TEXT DEFAULT '🌴',
  child_filter TEXT DEFAULT 'all', -- 'all' | specific child_id
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Reading log (one entry per child per day)
CREATE TABLE IF NOT EXISTS reading_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  date DATE NOT NULL,
  book_title TEXT NOT NULL DEFAULT '',
  pages_read INTEGER DEFAULT 0,
  minutes_read INTEGER DEFAULT 0,
  book_finished BOOLEAN DEFAULT false,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(child_id, date)
);

-- 4. Extra lessons (multiple per day — repeating, vacation only)
CREATE TABLE IF NOT EXISTS extra_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT REFERENCES children(id),
  date DATE NOT NULL,
  lesson_type TEXT DEFAULT 'subject', -- 'subject' | 'course'
  name TEXT NOT NULL,
  done BOOLEAN DEFAULT true,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE vacation_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_lessons ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies (permissive — same pattern as rest of app)
DROP POLICY IF EXISTS "vacation_periods_all" ON vacation_periods;
CREATE POLICY "vacation_periods_all" ON vacation_periods FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "reading_log_all" ON reading_log;
CREATE POLICY "reading_log_all" ON reading_log FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "extra_lessons_all" ON extra_lessons;
CREATE POLICY "extra_lessons_all" ON extra_lessons FOR ALL USING (true) WITH CHECK (true);
