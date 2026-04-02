-- ============================================================================
-- МИГРАЦИЯ: Новые типы дней, каникулы, чтение, доп.уроки, активности
-- Выполни в Supabase SQL Editor (можно запускать повторно — всё идемпотентно)
-- ============================================================================

-- ─── 1. Новые колонки в таблице days ─────────────────────────────────────────

ALTER TABLE days
  ADD COLUMN IF NOT EXISTS note_child       TEXT,
  ADD COLUMN IF NOT EXISTS is_sick          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS home_help        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS home_help_note   TEXT,
  ADD COLUMN IF NOT EXISTS homework_done    BOOLEAN NOT NULL DEFAULT false;

-- ─── 2. Каникулы / периоды ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vacation_periods (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    TEXT NOT NULL,
  name         TEXT NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  emoji        TEXT NOT NULL DEFAULT '🌸',
  child_filter TEXT NOT NULL DEFAULT 'all',
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vacation_periods_family ON vacation_periods(family_id);

ALTER TABLE vacation_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public vacation periods" ON vacation_periods;
CREATE POLICY "Public vacation periods" ON vacation_periods FOR ALL USING (true);

-- ─── 3. Дневник чтения ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reading_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      TEXT NOT NULL,
  date          DATE NOT NULL,
  book_title    TEXT NOT NULL DEFAULT '',
  pages_read    INT  NOT NULL DEFAULT 0,
  minutes_read  INT  NOT NULL DEFAULT 0,
  book_finished BOOLEAN NOT NULL DEFAULT false,
  note          TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(child_id, date)
);

CREATE INDEX IF NOT EXISTS idx_reading_log_child_date ON reading_log(child_id, date);

ALTER TABLE reading_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public reading log" ON reading_log;
CREATE POLICY "Public reading log" ON reading_log FOR ALL USING (true);

-- ─── 4. Дополнительные уроки ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS extra_lessons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    TEXT NOT NULL,
  date        DATE NOT NULL,
  lesson_type TEXT NOT NULL DEFAULT 'subject',
  name        TEXT NOT NULL,
  done        BOOLEAN NOT NULL DEFAULT false,
  note        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_extra_lessons_child_date ON extra_lessons(child_id, date);

ALTER TABLE extra_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public extra lessons" ON extra_lessons;
CREATE POLICY "Public extra lessons" ON extra_lessons FOR ALL USING (true);

-- ─── 5. Каталог активностей (vacation/weekend) ────────────────────────────────

CREATE TABLE IF NOT EXISTS extra_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    TEXT NOT NULL,
  family_id   TEXT,
  name        TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '📖',
  day_types   TEXT[] NOT NULL DEFAULT '{"vacation","weekend"}',
  coins       INT NOT NULL DEFAULT 3,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_extra_activities_child ON extra_activities(child_id);

ALTER TABLE extra_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public extra activities" ON extra_activities;
CREATE POLICY "Public extra activities" ON extra_activities FOR ALL USING (true);

-- ─── 6. Логи активностей ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    TEXT NOT NULL,
  date        DATE NOT NULL,
  activity_id UUID NOT NULL REFERENCES extra_activities(id) ON DELETE CASCADE,
  done        BOOLEAN NOT NULL DEFAULT false,
  note        TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(child_id, date, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_child_date ON activity_logs(child_id, date);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public activity logs" ON activity_logs;
CREATE POLICY "Public activity logs" ON activity_logs FOR ALL USING (true);
